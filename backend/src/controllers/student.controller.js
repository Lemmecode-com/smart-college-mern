const bcrypt = require("bcryptjs");

const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const College = require("../models/college.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const TimetableSlot = require("../models/timetableSlot.model");
const StudentFee = require("../models/studentFee.model");
const DocumentConfig = require("../models/documentConfig.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const { sendRegistrationSuccessEmail } = require("../services/email.service");
const collegeService = require("../services/college.service");
const logger = require("../utils/logger");

exports.registerStudent = async (req, res, next) => {
  try {
    const { collegeCode } = req.params;

    // Extract category early from req.body for validation
    const { category } = req.body;

    // Get uploaded files
    const files = req.files || {};

    // Load document configuration for this college
    const docConfig = await DocumentConfig.findOne({
      collegeCode,
      isActive: true,
    });
    if (docConfig) {
      // Document config loaded successfully
    }

    // Map document type to field name (backward compatibility)
    const documentFieldMap = {
      "10th_marksheet": "sscMarksheet",
      "12th_marksheet": "hscMarksheet",
      passport_photo: "passportPhoto",
      category_certificate: "categoryCertificate",
      income_certificate: "incomeCertificate",
      character_certificate: "characterCertificate",
      transfer_certificate: "transferCertificate",
      aadhar_card: "aadharCard",
      entrance_exam_score: "entranceExamScore",
      migration_certificate: "migrationCertificate",
      domicile_certificate: "domicileCertificate",
      caste_certificate: "casteCertificate",
      non_creamy_layer_certificate: "nonCreamyLayerCertificate",
      physically_challenged_certificate: "physicallyChallengedCertificate",
      sports_quota_certificate: "sportsQuotaCertificate",
      nri_sponsor_certificate: "nriSponsorCertificate",
      gap_certificate: "gapCertificate",
      affidavit: "affidavit",
    };

    // Build document paths object dynamically
    const documentPaths = {};

    if (docConfig && docConfig.documents) {
      // First pass: Check mandatory documents and validate
      for (const doc of docConfig.documents) {
        // Map document type to backend field name
        const backendFieldName = documentFieldMap[doc.type] || doc.type;

        // Check mandatory documents (only if enabled)
        if (doc.enabled && doc.mandatory && !files[backendFieldName]) {
          // Skip category certificate if category is GEN
          if (doc.type === "category_certificate" && category === "GEN") {
            continue;
          }
          return res.status(400).json({
            message: `${doc.label} is mandatory`,
          });
        }
      }

      // Second pass: Save ALL uploaded files (regardless of config)
      // This ensures every uploaded document is saved to database
      const reverseFieldMap = Object.entries(documentFieldMap).reduce(
        (acc, [key, value]) => {
          acc[value] = key;
          return acc;
        },
        {},
      );

      for (const [fieldName, fieldFiles] of Object.entries(files)) {
        // Map backend field name to document type
        let docType = fieldName;

        if (reverseFieldMap[fieldName]) {
          docType = reverseFieldMap[fieldName];
        }

        // Save the file if it exists
        if (fieldFiles && fieldFiles[0]?.path) {
          const filePath = fieldFiles[0].path;
          documentPaths[docType] = filePath.replace(
            /^.*?[\\\/]uploads[\\\/]/,
            "uploads/",
          );
        }
      }
    } else {
      // Use default document fields (backward compatibility)
      // Also handle ALL uploaded files dynamically
      const sscMarksheetPath = files.sscMarksheet?.[0]?.path
        ? files.sscMarksheet[0].path.replace(
            /^.*?[\\\/]uploads[\\\/]/,
            "uploads/",
          )
        : "";
      const hscMarksheetPath = files.hscMarksheet?.[0]?.path
        ? files.hscMarksheet[0].path.replace(
            /^.*?[\\\/]uploads[\\\/]/,
            "uploads/",
          )
        : "";
      const passportPhotoPath = files.passportPhoto?.[0]?.path
        ? files.passportPhoto[0].path.replace(
            /^.*?[\\\/]uploads[\\\/]/,
            "uploads/",
          )
        : "";
      const categoryCertificatePath = files.categoryCertificate?.[0]?.path
        ? files.categoryCertificate[0].path.replace(
            /^.*?[\\\/]uploads[\\\/]/,
            "uploads/",
          )
        : "";

      documentPaths["10th_marksheet"] = sscMarksheetPath;
      documentPaths["12th_marksheet"] = hscMarksheetPath;
      documentPaths["passport_photo"] = passportPhotoPath;
      documentPaths["category_certificate"] = categoryCertificatePath;

      // Also save any other uploaded files (aadhar, etc.)
      for (const [fieldName, fieldFiles] of Object.entries(files)) {
        if (
          fieldFiles &&
          Array.isArray(fieldFiles) &&
          fieldFiles[0] &&
          fieldFiles[0].path
        ) {
          const filePath = fieldFiles[0].path.replace(
            /^.*?[\\\/]uploads[\\\/]/,
            "uploads/",
          );
          // Convert fieldName to docType (e.g., aadharCard -> aadhar_card)
          const docType = fieldName.replace(/([A-Z])/g, "_$1").toLowerCase();
          documentPaths[docType] = filePath;
        }
      }
    }

    const {
      fullName,
      email,
      password,
      mobileNumber,
      gender,
      dateOfBirth,
      addressLine,
      city,
      state,
      pincode,
      department_id,
      course_id,
      admissionYear,
      currentSemester,
      previousQualification,
      previousInstitute,
      // category is extracted earlier for validation
      nationality,
      bloodGroup,
      alternateMobile,
      // Parent/Guardian Details
      fatherName,
      fatherMobile,
      motherName,
      motherMobile,
      // 10th (SSC) Academic Details
      sscSchoolName,
      sscBoard,
      sscPassingYear,
      sscPercentage,
      sscRollNumber,
      // 12th (HSC) Academic Details
      hscSchoolName,
      hscBoard,
      hscStream,
      hscPassingYear,
      hscPercentage,
      hscRollNumber,
    } = req.body;

    // 1️⃣ Resolve college (using service)
    const college = await collegeService.findCollegeByCode(collegeCode);

    // 2️⃣ Validate department & course (same as before)

    // Validate Department
    const department = await Department.findOne({
      _id: department_id,
      college_id: college._id,
    });
    if (!department) {
      throw new AppError("Invalid department", 404, "DEPARTMENT_NOT_FOUND");
    }

    // Validate course
    const course = await Course.findOne({
      _id: course_id,
      department_id,
      college_id: college._id,
    });
    if (!course) {
      throw new AppError("Invalid course", 404, "COURSE_NOT_FOUND");
    }

    // 3️⃣ Prevent duplicate
    const exists = await Student.findOne({
      email,
      college_id: college._id,
    });
    if (exists) {
      throw new AppError(
        "Student already registered with this email",
        409,
        "DUPLICATE_EMAIL",
      );
    }

    // ✅ 4️⃣ Create User FIRST (with password hashing)
    const user = await User.create({
      name: fullName,
      email,
      password, // User model will hash this automatically
      role: "STUDENT",
      college_id: college._id,
    });

    // ✅ 5️⃣ Create Student WITH user_id reference (NO password field)
    const registeredStud = await Student.create({
      user_id: user._id, // ← Link to User
      fullName,
      email,
      mobileNumber,
      gender,
      dateOfBirth,
      addressLine,
      city,
      state,
      pincode,
      college_id: college._id,
      department_id,
      course_id,
      admissionYear,
      currentSemester,
      previousQualification,
      previousInstitute,
      category,
      nationality,
      bloodGroup,
      alternateMobile,
      // Parent/Guardian Details
      fatherName,
      fatherMobile,
      motherName,
      motherMobile,
      // 10th (SSC) Academic Details
      sscSchoolName,
      sscBoard,
      sscPassingYear,
      sscPercentage,
      sscRollNumber,
      // 12th (HSC) Academic Details
      hscSchoolName,
      hscBoard,
      hscStream,
      hscPassingYear,
      hscPercentage,
      hscRollNumber,
      // Document Upload Paths - Map all document types to their respective fields
      sscMarksheetPath: documentPaths["10th_marksheet"] || "",
      hscMarksheetPath: documentPaths["12th_marksheet"] || "",
      passportPhotoPath: documentPaths["passport_photo"] || "",
      categoryCertificatePath: documentPaths["category_certificate"] || "",
      incomeCertificatePath: documentPaths["income_certificate"] || "",
      characterCertificatePath: documentPaths["character_certificate"] || "",
      transferCertificatePath: documentPaths["transfer_certificate"] || "",
      aadharCardPath: documentPaths["aadhar_card"] || "",
      entranceExamScorePath: documentPaths["entrance_exam_score"] || "",
      migrationCertificatePath: documentPaths["migration_certificate"] || "",
      domicileCertificatePath: documentPaths["domicile_certificate"] || "",
      casteCertificatePath: documentPaths["caste_certificate"] || "",
      nonCreamyLayerCertificatePath:
        documentPaths["non_creamy_layer_certificate"] || "",
      physicallyChallengedCertificatePath:
        documentPaths["physically_challenged_certificate"] || "",
      sportsQuotaCertificatePath:
        documentPaths["sports_quota_certificate"] || "",
      nriSponsorCertificatePath: documentPaths["nri_sponsor_certificate"] || "",
      gapCertificatePath: documentPaths["gap_certificate"] || "",
      affidavitPath: documentPaths["affidavit"] || "",
      // Store all documents in a flexible field
      documents: documentPaths,
      status: "PENDING",
    });

    // 📧 Send registration success email (non-blocking)
    (async () => {
      try {
        const college = await College.findById(
          registeredStud.college_id,
        ).select("name");
        const course = await Course.findById(registeredStud.course_id).select(
          "name",
        );

        await sendRegistrationSuccessEmail({
          to: registeredStud.email,
          studentName: registeredStud.fullName,
          collegeName: college?.name || "Our College",
          courseName: course?.name,
          admissionYear: registeredStud.admissionYear,
        });
      } catch (emailError) {
        // Non-critical - continue
      }
    })();

    logger.logInfo("Student registration successful", {
      controller: "student.controller",
      action: "registerStudent",
      collegeCode,
    });

    ApiResponse.created(
      res,
      {
        student: registeredStud,
      },
      "Registration successful. Await college approval.",
    );
  } catch (error) {
    logger.logError("Student registration failed", {
      controller: "student.controller",
      action: "registerStudent",
      error: error.message,
    });
    next(error);
  }
};

/**
 * GET FULL STUDENT PROFILE (360 VIEW)
 * FIX: Risk 3 - Large Array Operations in Memory
 * - Use MongoDB aggregation for attendance calculation
 * - Limit data to current semester (optional date range)
 * - Add error handling for graceful degradation
 */
exports.getMyFullProfile = async (req, res, next) => {
  try {
    const student = req.student;
    const { startDate, endDate } = req.query;

    // Validate student exists
    if (!student) {
      throw new AppError("Student profile not found", 404, "STUDENT_NOT_FOUND");
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // 1️⃣ College Info
    const college = await College.findById(student.college_id).select(
      "name code email contactNumber address establishedYear",
    );

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    // 2️⃣ Department & Course
    const department = await Department.findById(student.department_id).select(
      "name code",
    );
    const course = await Course.findById(student.course_id).select("name code");

    // 3️⃣ Document Config (to determine which fields to show)
    const docConfig = await DocumentConfig.findOne({
      collegeCode: college.code,
      isActive: true,
    }).select("documents");

    // 4️⃣ Attendance Summary - Using MongoDB Aggregation (FIX: Risk 3)
    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        lectureDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      // Default: Last 6 months to reduce data load
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      dateFilter = {
        lectureDate: { $gte: sixMonthsAgo },
      };
    }

    // Use aggregation pipeline for efficient calculation
    let attendanceSummary = [];
    try {
      const attendancePipeline = [
        {
          $match: {
            course_id: student.course_id,
            college_id: student.college_id,
            ...dateFilter,
          },
        },
        {
          $lookup: {
            from: "attendancerecords",
            let: { sessionId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$session_id", "$$sessionId"] },
                  student_id: student._id,
                },
              },
            ],
            as: "attendanceRecord",
          },
        },
        {
          $lookup: {
            from: "subjects",
            localField: "subject_id",
            foreignField: "_id",
            as: "subject",
          },
        },
        {
          $unwind: {
            path: "$subject",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$subject.name",
            totalLectures: { $sum: 1 },
            attended: {
              $sum: {
                $cond: [{ $gt: [{ $size: "$attendanceRecord" }, 0] }, 1, 0],
              },
            },
            present: {
              $sum: {
                $cond: [
                  { $eq: [{ $first: "$attendanceRecord.status" }, "PRESENT"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            subject: "$_id",
            totalLectures: 1,
            attended: 1,
            present: 1,
            percentage: {
              $cond: [
                { $gt: ["$totalLectures", 0] },
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$present", "$totalLectures"] },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                0,
              ],
            },
            status: {
              $cond: [
                {
                  $lt: [
                    {
                      $cond: [
                        { $gt: ["$totalLectures", 0] },
                        {
                          $multiply: [
                            { $divide: ["$present", "$totalLectures"] },
                            100,
                          ],
                        },
                        0,
                      ],
                    },
                    75,
                  ],
                },
                "AT_RISK",
                "SAFE",
              ],
            },
          },
        },
        { $sort: { subject: 1 } },
      ];

      attendanceSummary = await AttendanceSession.aggregate(attendancePipeline);
    } catch (aggError) {
      attendanceSummary = [];
    }

    // 5️⃣ Today's Timetable (separate query, limited data)
    const today = new Date();
    const dayName = today
      .toLocaleDateString("en-US", { weekday: "short" })
      .toUpperCase();

    let todaysTimetable = [];
    try {
      todaysTimetable = await TimetableSlot.find({
        course_id: student.course_id,
        department_id: student.department_id,
        college_id: student.college_id,
        day: dayName,
      })
        .populate("subject_id", "name code")
        .populate("teacher_id", "name")
        .sort({ startTime: 1 })
        .limit(10);
    } catch (timetableError) {
      todaysTimetable = [];
    }

    // 6️⃣ Final Response - Include ALL student fields from model
    const studentData = {
      id: student._id,
      fullName: student.fullName,
      email: student.email,
      mobileNumber: student.mobileNumber,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      nationality: student.nationality,
      category: student.category,
      bloodGroup: student.bloodGroup,
      admissionYear: student.admissionYear,
      currentSemester: student.currentSemester,
      status: student.status,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      // Address fields
      addressLine: student.addressLine,
      city: student.city,
      state: student.state,
      pincode: student.pincode,
      // Contact fields
      alternateMobileNumber: student.alternateMobile,
      // Parent/Guardian fields
      fatherName: student.fatherName,
      fatherMobile: student.fatherMobile,
      motherName: student.motherName,
      motherMobile: student.motherMobile,
      // 10th (SSC) fields
      sscSchoolName: student.sscSchoolName,
      sscBoard: student.sscBoard,
      sscPassingYear: student.sscPassingYear,
      sscPercentage: student.sscPercentage,
      sscRollNumber: student.sscRollNumber,
      // 12th (HSC) fields
      hscSchoolName: student.hscSchoolName,
      hscBoard: student.hscBoard,
      hscStream: student.hscStream,
      hscPassingYear: student.hscPassingYear,
      hscPercentage: student.hscPercentage,
      hscRollNumber: student.hscRollNumber,
      // Document file paths (normalize path separators for URL and extract relative path)
      sscMarksheetPath: student.sscMarksheetPath
        ? student.sscMarksheetPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      hscMarksheetPath: student.hscMarksheetPath
        ? student.hscMarksheetPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      passportPhotoPath: student.passportPhotoPath
        ? student.passportPhotoPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      categoryCertificatePath: student.categoryCertificatePath
        ? student.categoryCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      // All other document paths
      incomeCertificatePath: student.incomeCertificatePath
        ? student.incomeCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      characterCertificatePath: student.characterCertificatePath
        ? student.characterCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      transferCertificatePath: student.transferCertificatePath
        ? student.transferCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      aadharCardPath: student.aadharCardPath
        ? student.aadharCardPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      entranceExamScorePath: student.entranceExamScorePath
        ? student.entranceExamScorePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      migrationCertificatePath: student.migrationCertificatePath
        ? student.migrationCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      domicileCertificatePath: student.domicileCertificatePath
        ? student.domicileCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      casteCertificatePath: student.casteCertificatePath
        ? student.casteCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      nonCreamyLayerCertificatePath: student.nonCreamyLayerCertificatePath
        ? student.nonCreamyLayerCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      physicallyChallengedCertificatePath:
        student.physicallyChallengedCertificatePath
          ? student.physicallyChallengedCertificatePath
              .replace(/\\/g, "/")
              .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
          : null,
      sportsQuotaCertificatePath: student.sportsQuotaCertificatePath
        ? student.sportsQuotaCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      nriSponsorCertificatePath: student.nriSponsorCertificatePath
        ? student.nriSponsorCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      gapCertificatePath: student.gapCertificatePath
        ? student.gapCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      affidavitPath: student.affidavitPath
        ? student.affidavitPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      // Additional profile fields
      addressLine2: student.addressLine2 || null,
      country: student.country || "India",
      religion: student.religion || null,
      alternateMobileNumber: student.alternateMobileNumber || null,
      emergencyContactName: student.emergencyContactName || null,
      emergencyContactNumber: student.emergencyContactNumber || null,
      parentGuardianOccupation: student.parentGuardianOccupation || null,
      parentGuardianIncome: student.parentGuardianIncome || null,
      minorityType: student.minorityType || null,
      pwdDisability: student.pwdDisability || null,
      hostelRequired: student.hostelRequired || false,
      libraryRequired:
        student.libraryRequired !== undefined ? student.libraryRequired : true,
    };

    ApiResponse.success(
      res,
      {
        student: studentData,
        college,
        department,
        course,
        attendance: attendanceSummary,
        documentConfig: docConfig?.documents || [],
      },
      "Profile fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * STUDENT: Update own profile
 */
exports.updateMyProfile = async (req, res, next) => {
  try {
    const student = req.student;

    const allowedFields = [
      "mobileNumber",
      "addressLine",
      "city",
      "state",
      "pincode",
      "alternateMobile",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    await student.save();

    ApiResponse.success(
      res,
      {
        student,
      },
      "Profile updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * COLLEGE ADMIN: Update student profile (SAFE)
 */
exports.updateStudentByAdmin = async (req, res, next) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: { $ne: "DELETED" },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 🔐 Password cannot be updated via this endpoint
    // Student passwords are stored in the User model, not Student model
    // Admins should use the password reset feature to update passwords
    if (req.body.password) {
      return res.status(400).json({
        message:
          "Password cannot be updated here. Use the password reset feature.",
      });
    }

    // Update remaining fields safely
    Object.assign(student, req.body);

    await student.save();

    ApiResponse.success(
      res,
      {
        student,
      },
      "Student updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * COLLEGE ADMIN: Delete student (soft delete)
 */
exports.deleteStudent = async (req, res, next) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    student.status = "DELETED";
    await student.save();

    ApiResponse.success(res, null, "Student deleted successfully");
  } catch (error) {
    next(error);
  }
};

// GET APPROVED STUDENTS FOR COLLEGE ADMIN (WITH FEES) - WITH PAGINATION
exports.getApprovedStudents = async (req, res) => {
  try {
    // 📄 Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 🔍 Filter options
    const { department_id, course_id, semester, search } = req.query;

    // Build filter
    const filter = {
      college_id: req.college_id,
      status: "APPROVED",
    };

    if (department_id) filter.department_id = department_id;
    if (course_id) filter.course_id = course_id;
    if (semester) filter.currentSemester = parseInt(semester);
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search } },
      ];
    }

    // Get total count
    const total = await Student.countDocuments(filter);

    // Get paginated students
    const students = await Student.find(filter)
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    // Attach fee info for each student (optimized)
    const studentIds = students.map((s) => s._id);
    const fees = await StudentFee.find({
      student_id: { $in: studentIds },
      college_id: req.college_id,
    });

    const feeMap = new Map(fees.map((f) => [f.student_id.toString(), f]));

    const studentsWithFee = students.map((student) => ({
      ...student.toObject(),
      fee: feeMap.get(student._id.toString()) || null,
    }));

    ApiResponse.paginate(
      res,
      studentsWithFee,
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      "Students fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

// GET INDIVIDUAL APPROVED STUDENT FOR COLLEGE ADMIN (WITH FEES)
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      college_id: req.college_id,
    })
      .populate("college_id", "name code")
      .populate("department_id", "name")
      .populate("course_id", "name");

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    const fee = await StudentFee.findOne({
      student_id: student._id,
    }).select("totalFee paidAmount installments");

    ApiResponse.success(
      res,
      {
        student: student.toObject(),
        fee: fee || {
          totalFee: 0,
          paidAmount: 0,
          installments: [],
        },
      },
      "Student fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

// REGISTERED (PENDING) STUDENTS - WITH PAGINATION
exports.getRegisteredStudents = async (req, res) => {
  try {
    // 📄 Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 🔍 Filter options
    const { department_id, course_id, search } = req.query;

    // Build filter
    const filter = {
      college_id: req.college_id,
      status: "PENDING",
    };

    if (department_id) filter.department_id = department_id;
    if (course_id) filter.course_id = course_id;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await Student.countDocuments(filter);

    // Get paginated students
    const students = await Student.find(filter)
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    ApiResponse.paginate(
      res,
      students,
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      "Pending students fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

// ADMIN GETS REGISTERED (PENDING) INDIVUDUAL STUDENT
exports.getRegisteredStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      college_id: req.college_id,
      status: "PENDING",
    })
      .populate("college_id", "name code")
      .populate("department_id", "name")
      .populate("course_id", "name");

    if (!student) {
      return res.status(404).json({
        message: "Registered student not found",
      });
    }

    // Format document paths properly for frontend
    const studentData = {
      ...student.toObject(),
      // Normalize all document paths
      sscMarksheetPath: student.sscMarksheetPath
        ? student.sscMarksheetPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      hscMarksheetPath: student.hscMarksheetPath
        ? student.hscMarksheetPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      passportPhotoPath: student.passportPhotoPath
        ? student.passportPhotoPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      categoryCertificatePath: student.categoryCertificatePath
        ? student.categoryCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      incomeCertificatePath: student.incomeCertificatePath
        ? student.incomeCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      characterCertificatePath: student.characterCertificatePath
        ? student.characterCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      transferCertificatePath: student.transferCertificatePath
        ? student.transferCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      aadharCardPath: student.aadharCardPath
        ? student.aadharCardPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      entranceExamScorePath: student.entranceExamScorePath
        ? student.entranceExamScorePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      migrationCertificatePath: student.migrationCertificatePath
        ? student.migrationCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      domicileCertificatePath: student.domicileCertificatePath
        ? student.domicileCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      casteCertificatePath: student.casteCertificatePath
        ? student.casteCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      nonCreamyLayerCertificatePath: student.nonCreamyLayerCertificatePath
        ? student.nonCreamyLayerCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      physicallyChallengedCertificatePath:
        student.physicallyChallengedCertificatePath
          ? student.physicallyChallengedCertificatePath
              .replace(/\\/g, "/")
              .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
          : null,
      sportsQuotaCertificatePath: student.sportsQuotaCertificatePath
        ? student.sportsQuotaCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      nriSponsorCertificatePath: student.nriSponsorCertificatePath
        ? student.nriSponsorCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      gapCertificatePath: student.gapCertificatePath
        ? student.gapCertificatePath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
      affidavitPath: student.affidavitPath
        ? student.affidavitPath
            .replace(/\\/g, "/")
            .replace(/^.*?[\\\/]uploads[\\\/]/, "uploads/")
        : null,
    };

    ApiResponse.success(
      res,
      {
        student: studentData,
      },
      "Pending student fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * TEACHER: Get students for the logged-in teacher
 * GET /students/teacher
 */
exports.getStudentsForTeacher = async (req, res) => {
  try {
    // 📄 Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // First, get the teacher's profile to find their assigned subjects
    const teacher = await require("../models/teacher.model").findOne({
      user_id: req.user.id,
      college_id: req.college_id,
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    // Get subjects taught by this teacher
    const subjects = await require("../models/subject.model")
      .find({
        teacher_id: teacher._id,
        college_id: req.college_id,
      })
      .select("course_id");

    if (!subjects || subjects.length === 0) {
      return res.json({
        students: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          pages: 0,
          hasMore: false,
        },
      });
    }

    // Extract course IDs from subjects
    const courseIds = subjects.map((subject) => subject.course_id);

    // Build filter for students
    const filter = {
      course_id: { $in: courseIds },
      college_id: req.college_id,
      status: "APPROVED",
    };

    // Get total count
    const total = await require("../models/student.model").countDocuments(
      filter,
    );

    // Get paginated students
    const students = await require("../models/student.model")
      .find(filter)
      .select("fullName email course_id status")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    // Populate course names
    const populatedStudents = await require("../models/student.model").populate(
      students,
      {
        path: "course_id",
        select: "name",
      },
    );

    ApiResponse.paginate(
      res,
      { students: populatedStudents },
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      "Students fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 🎓 MOVE STUDENT TO ALUMNI
 * Only accessible by COLLEGE_ADMIN
 * Moves a student who has completed their course to Alumni status
 */
exports.moveToAlumni = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { graduationYear } = req.body;

    // Find student
    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "APPROVED",
    }).populate("course_id", "name code semester");

    if (!student) {
      throw new AppError(
        "Student not found or not approved",
        404,
        "STUDENT_NOT_FOUND",
      );
    }

    // Check if student is in final semester (based on course duration)
    const maxSemester = student.course_id?.durationSemesters || 8;
    if (student.currentSemester < maxSemester) {
      throw new AppError(
        "Student has not completed the course yet. Cannot move to Alumni.",
        400,
        "NOT_ELIGIBLE_FOR_ALUMNI",
      );
    }

    // Move to Alumni status
    student.status = "ALUMNI";
    student.alumniStatus = true;
    student.alumniDate = new Date();
    student.graduationYear = graduationYear || new Date().getFullYear();

    await student.save();

    ApiResponse.success(
      res,
      {
        student: {
          fullName: student.fullName,
          email: student.email,
          status: student.status,
          alumniStatus: student.alumniStatus,
          alumniDate: student.alumniDate,
          graduationYear: student.graduationYear,
          course_id: student.course_id,
        },
      },
      `${student.fullName} has been moved to Alumni successfully`,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 🎓 GET ALL ALUMNI
 * Only accessible by COLLEGE_ADMIN
 */
exports.getAlumni = async (req, res, next) => {
  try {
    const { graduationYear, course_id } = req.query;

    const filter = {
      college_id: req.college_id,
      status: "ALUMNI",
    };

    if (graduationYear) {
      filter.graduationYear = parseInt(graduationYear);
    }

    if (course_id) {
      filter.course_id = course_id;
    }

    const alumni = await Student.find(filter)
      .populate("course_id", "name code")
      .populate("department_id", "name code")
      .sort({ alumniDate: -1 });

    ApiResponse.success(
      res,
      {
        count: alumni.length,
        alumni,
      },
      "Alumni fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};
