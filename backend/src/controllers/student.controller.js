const bcrypt = require("bcryptjs");

const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const College = require("../models/college.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const StudentFee = require("../models/studentFee.model");
const DocumentConfig = require("../models/documentConfig.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const { sendRegistrationSuccessEmail } = require("../services/email.service");
const collegeService = require("../services/college.service");
const logger = require("../utils/logger");
const auditLogService = require("../services/auditLog.service");
const { getStorageProvider } = require("../services/storage");

const {
  processUploadsWithStorage,
  validateFilesAgainstConfig,
} = require("../middlewares/upload.middleware");
const { expandAllowedFormats } = require("../utils/fileValidation");
const DocumentService = require("../services/document.service");
const Document = require("../models/document.model");

const resolveDocumentRef = async (student, fieldPath) => {
  if (!fieldPath) return null;

  const doc = await Document.findOne({
    storageKey: fieldPath,
    status: { $ne: "DELETED" },
  }).select("documentId documentType originalFileName mimeType size uploadedAt status");

  if (doc) {
    return {
      documentId: doc.documentId,
      documentType: doc.documentType,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      status: doc.status,
      downloadUrl: `/api/documents/${doc.documentId}/download`,
    };
  }

  return null;
};

// Resolve student's active documents from Document collection
const resolveActiveStudentDocuments = async (student) => {
  if (!student || !student.documentRefs || student.documentRefs.length === 0) {
    return {};
  }

  const documentIds = student.documentRefs
    .map((dr) => dr.documentId)
    .filter(Boolean);

  const docs = await Document.find({
    documentId: { $in: documentIds },
    status: "ACTIVE",
  })
    .select("documentId documentType originalFileName mimeType size uploadedAt storageKey verificationStatus verifiedAt verifiedBy rejectedAt rejectedBy rejectionReason")
    .populate("verifiedBy", "name")
    .populate("rejectedBy", "name");

  return docs.reduce((acc, doc) => {
    acc[doc.documentType] = {
      documentId: doc.documentId,
      documentType: doc.documentType,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      downloadUrl: `/api/documents/${doc.documentId}/download`,
      verificationStatus: doc.verificationStatus || "PENDING",
      verifiedAt: doc.verifiedAt || null,
      verifiedBy: doc.verifiedBy ? { id: doc.verifiedBy._id, name: doc.verifiedBy.name } : null,
      rejectedAt: doc.rejectedAt || null,
      rejectedBy: doc.rejectedBy ? { id: doc.rejectedBy._id, name: doc.rejectedBy.name } : null,
      rejectionReason: doc.rejectionReason || null,
    };
    return acc;
  }, {});
};

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

    // Upload all files through Storage Service
    const storageResults = await processUploadsWithStorage(files, "student");

    // Build document paths object dynamically
    const documentPaths = {};

    if (docConfig && docConfig.documents) {
      // Validate uploaded files against Document Configuration (extension + MIME type)
      const allFiles = [];
      for (const [fieldName, fileList] of Object.entries(storageResults)) {
        const filesArray = Array.isArray(fileList) ? fileList : [fileList];
        for (const file of filesArray) {
          allFiles.push({
            fieldname: fieldName,
            originalname: file.originalname,
            mimetype: file.mimetype,
          });
        }
      }

      if (allFiles.length > 0) {
        const validation = validateFilesAgainstConfig(
          allFiles,
          docConfig.documents,
          documentFieldMap,
        );

        if (!validation.valid) {
          const errorMessages = validation.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join("; ");
          return res.status(400).json({
            message: `File validation failed: ${errorMessages}`,
          });
        }
      }

      // First pass: Check mandatory documents and validate
      for (const doc of docConfig.documents) {
        // Map document type to backend field name
        const backendFieldName = documentFieldMap[doc.type] || doc.type;
        const fieldFiles = storageResults[backendFieldName];

        // Check mandatory documents (only if enabled)
        if (doc.enabled && doc.mandatory && !(fieldFiles && fieldFiles.length && fieldFiles[0]?.storagePath)) {
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

      for (const [fieldName, fieldFiles] of Object.entries(storageResults)) {
        // Map backend field name to document type
        let docType = fieldName;

        if (reverseFieldMap[fieldName]) {
          docType = reverseFieldMap[fieldName];
        }

        // Save the file if it exists
        if (fieldFiles && fieldFiles[0]?.storagePath) {
          documentPaths[docType] = fieldFiles[0].storagePath;
        }
      }
    } else {
      // Use default document fields (backward compatibility)
      // Also handle ALL uploaded files dynamically
      const sscMarksheetPath = storageResults.sscMarksheet?.[0]?.storagePath
        ? storageResults.sscMarksheet[0].storagePath
        : "";
      const hscMarksheetPath = storageResults.hscMarksheet?.[0]?.storagePath
        ? storageResults.hscMarksheet[0].storagePath
        : "";
      const passportPhotoPath = storageResults.passportPhoto?.[0]?.storagePath
        ? storageResults.passportPhoto[0].storagePath
        : "";
      const categoryCertificatePath = storageResults.categoryCertificate?.[0]?.storagePath
        ? storageResults.categoryCertificate[0].storagePath
        : "";

      documentPaths["10th_marksheet"] = sscMarksheetPath;
      documentPaths["12th_marksheet"] = hscMarksheetPath;
      documentPaths["passport_photo"] = passportPhotoPath;
      documentPaths["category_certificate"] = categoryCertificatePath;

      // Also save any other uploaded files (aadhar, etc.)
      for (const [fieldName, fieldFiles] of Object.entries(storageResults)) {
        if (fieldFiles && fieldFiles[0]?.storagePath) {
          const filePath = fieldFiles[0].storagePath;
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
       religion,
       hasDisability,
       disabilityType,
       pwdDisability,
       alternateMobile,
       // Parent/Guardian Details
       fatherName,
       fatherMobile,
       fatherEmail,
       motherName,
       motherMobile,
       motherEmail,
       // 10th (SSC) Academic Details
      sscSchoolName,
      sscBoard,
      sscPassingYear,
      sscPercentage,
      sscRollNumber,
      // 12th (HSC) Academic Details
      hscSchoolName,
      hscBoard,
      hscStream: hscStreamRaw,
      hscPassingYear,
      hscPercentage,
      hscRollNumber,
    } = req.body;
    
    // Convert empty strings to undefined for enum fields to prevent validation errors
    let hscStream = hscStreamRaw === '' ? undefined : hscStreamRaw;

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
    const existingUser = await User.findOne({ email });
    const exists = await Student.findOne({
      email,
      college_id: college._id,
    });
    if (exists || existingUser) {
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
     // Rollback User if Student creation fails to prevent orphaned accounts
     let registeredStud;
     try {
       registeredStud = await Student.create({
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
         religion,
         hasDisability: hasDisability === "true" || hasDisability === true,
         disabilityType: hasDisability === "true" || hasDisability === true ? disabilityType : undefined,
         pwdDisability: hasDisability === "true" || hasDisability === true ? pwdDisability : undefined,
         alternateMobile,
         // Parent/Guardian Details
         fatherName,
         fatherMobile,
         fatherEmail,
         motherName,
         motherMobile,
         motherEmail,
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
          // Document records created below — no legacy path fields written
          status: "PENDING",
       });
      } catch (studentError) {
        // 🧹 Rollback: Delete orphaned User if Student creation fails
        await User.deleteOne({ _id: user._id });
        throw studentError; // Re-throw to outer catch
      }

      // Create Document records for uploaded files
      if (storageResults && Object.keys(storageResults).length > 0) {
        try {
          const DocumentModel = require("../models/document.model");
           const documentRefs = [];
           const reverseFieldMap = Object.entries(documentFieldMap).reduce(
             (acc, [key, value]) => {
               acc[value] = key;
               return acc;
             },
             {},
           );

           for (const [fieldName, fieldFiles] of Object.entries(storageResults)) {
             if (!fieldFiles || !fieldFiles[0]?.storagePath) continue;

             const docType = reverseFieldMap[fieldName]
               ? reverseFieldMap[fieldName]
               : fieldName.replace(/([A-Z])/g, "_$1").toLowerCase();
            
            const existingDoc = await DocumentModel.findOne({
              storageKey: fieldFiles[0].storagePath,
              status: { $ne: "DELETED" },
            });

            if (existingDoc) {
              documentRefs.push({
                documentId: existingDoc.documentId,
                documentType: docType,
              });
              continue;
            }

            const document = await DocumentService.createDocument({
              ownerType: "Student",
              ownerId: registeredStud._id,
              documentType: docType,
              fileBuffer: fieldFiles[0].buffer,
              originalFileName: fieldFiles[0].originalname,
              mimeType: fieldFiles[0].mimetype,
              size: fieldFiles[0].size,
              uploadedBy: user._id,
              category: "student",
              storageKey: fieldFiles[0].storagePath,
              });

            documentRefs.push({
              documentId: document.documentId,
              documentType: docType,
            });
          }

          if (documentRefs.length > 0) {
            await Student.findByIdAndUpdate(registeredStud._id, { documentRefs });
          }
        } catch (error) {
          console.error("Failed to create Document records:", error.message);
        }
      }

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
           collegeId: registeredStud.college_id,
         });
       } catch (emailError) {
         logger.logError("Failed to send registration success email", {
           controller: "student.controller",
           action: "registerStudent",
           error: emailError.message,
           stack: emailError.stack,
           studentEmail: registeredStud.email,
           collegeId: registeredStud.college_id,
         });
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

    // Resolve documents from Document collection when available
    const resolvedDocuments = await resolveActiveStudentDocuments(student);

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

    // 5️⃣ Today's Timetable (filtered by student's semester via timetable relationship)
    const today = new Date();
    const dayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][today.getDay()];

    let todaysTimetable = [];
    try {
      const semester = Number(student.currentSemester);

      const timetableFilters = {
        college_id: student.college_id,
        status: { $in: ["PUBLISHED", "DRAFT"] },
        semester,
      };

      if (student.course_id) {
        timetableFilters.course_id = student.course_id;
      }

      const timetables = await Timetable.find(timetableFilters)
        .select("_id semester")
        .limit(20);

      const timetableIds = timetables.map((t) => t._id);

      if (timetableIds.length > 0) {
        todaysTimetable = await TimetableSlot.find({
          college_id: student.college_id,
          day: dayName,
          timetable_id: { $in: timetableIds },
        })
          .populate("subject_id", "name code")
          .populate("teacher_id", "name")
          .sort({ startTime: 1 })
          .limit(10);
      }
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
      currentAcademicYear: student.currentAcademicYear,
      enrollmentNumber: student.enrollmentNumber,
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
       // Document file paths removed — files are served via GridFS through Document collection
        // ERP Document References - populated from Document collection
        documentRefs: student.documentRefs || [],
        // Resolved documents from Document collection (download URLs)
        documents: resolvedDocuments,
        // Additional profile fields
       addressLine2: student.addressLine2 || null,
       country: student.country || "India",
       religion: student.religion || null,
       hasDisability: student.hasDisability || false,
       disabilityType: student.disabilityType || null,
       pwdDisability: student.pwdDisability || null,
       emergencyContactName: student.emergencyContactName || null,
      emergencyContactNumber: student.emergencyContactNumber || null,
      parentGuardianOccupation: student.parentGuardianOccupation || null,
      parentGuardianIncome: student.parentGuardianIncome || null,
      minorityType: student.minorityType || null,
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
        documentConfig: (docConfig?.documents || []).map((doc) => {
          const docObj = doc.toObject ? doc.toObject() : doc;
          return {
            ...docObj,
            allowedFormats: docObj.allowedFormats
              ? expandAllowedFormats(docObj.allowedFormats)
              : docObj.allowedFormats,
          };
        }),
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
      "bloodGroup",
      "religion",
      "nationality",
      "hasDisability",
      "disabilityType",
      "pwdDisability",
      "fatherName",
      "fatherMobile",
      "fatherEmail",
      "motherName",
      "motherMobile",
      "motherEmail",
      "dateOfBirth",
    ];

    const updatedFields = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "hasDisability") {
          updatedFields[field] =
            req.body[field] === "true" ||
            req.body[field] === true ||
            req.body[field] === "yes";
        } else {
          updatedFields[field] = req.body[field];
        }
      }
    });

    if (
      req.body.hasDisability === "false" ||
      req.body.hasDisability === false ||
      req.body.hasDisability === "no"
    ) {
      updatedFields.disabilityType = undefined;
      updatedFields.pwdDisability = undefined;
    }

    Object.assign(student, updatedFields);

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

    // 🔐 Email cannot be updated via this endpoint
    // Email changes must go through the centralized secure email-change flow
    if (req.body.email) {
      return res.status(400).json({
        message:
          "Email cannot be updated here. Use the secure email-change flow.",
        code: "EMAIL_CHANGE_NOT_ALLOWED",
      });
    }

    // 🔐 SCOPE: Validate academic fields belong to the admin's college
    if (req.body.department_id) {
      const dept = await Department.findOne({
        _id: req.body.department_id,
        college_id: req.college_id,
      });
      if (!dept) {
        return res.status(400).json({
          message: "Invalid department. Department must belong to your college.",
          code: "INVALID_DEPARTMENT",
        });
      }
    }

    if (req.body.course_id) {
      const effectiveDeptId = req.body.department_id || student.department_id;
      const course = await Course.findOne({
        _id: req.body.course_id,
        department_id: effectiveDeptId,
        college_id: req.college_id,
      });
      if (!course) {
        return res.status(400).json({
          message:
            "Invalid course. Course must belong to your college and the selected department.",
          code: "INVALID_COURSE",
        });
      }
    }

    // 🔐 SCOPE: Validate division is valid for student's academic context
    if (req.body.division !== undefined) {
      const divisionValue = req.body.division?.toString().trim().toUpperCase() || null;

      if (divisionValue) {
        // Skip validation if division is not being changed (preserve existing assignments)
        if (divisionValue === (student.division?.toString().trim().toUpperCase() || null)) {
          // No change — keep existing value, no validation needed
        } else {
          // Use effective values (new or existing) for context lookup
          const effectiveDeptId = req.body.department_id || student.department_id;
          const effectiveCourseId = req.body.course_id || student.course_id;
          const effectiveSemester = req.body.currentSemester || student.currentSemester;
          const effectiveAcademicYear =
            req.body.currentAcademicYear || student.currentAcademicYear;

          const validTimetable = await Timetable.findOne({
            college_id: student.college_id,
            department_id: effectiveDeptId,
            course_id: effectiveCourseId,
            semester: effectiveSemester,
            academicYear: effectiveAcademicYear,
            division: divisionValue,
            status: { $ne: "ARCHIVED" },
          });

          if (!validTimetable) {
            return res.status(400).json({
              message: `Invalid division "${divisionValue}". Division must be valid for the student's College, Department, Course, Semester, and Academic Year.`,
              code: "INVALID_DIVISION",
            });
          }
        }
      } else {
        // Normalize empty string to null
        req.body.division = null;
      }
    }

    // Store old values before update
    const oldStudent = student.toObject();

    // Track which fields are being updated
    const updatedFields = Object.keys(req.body).filter(
      (key) => student[key] !== req.body[key],
    );

    // Update remaining fields safely
    Object.assign(student, req.body);

    await student.save();

    // 📝 Audit log - Student update by admin
    auditLogService
      .logStudentUpdate(oldStudent, student, req.user, req, updatedFields)
      .catch((err) => console.error("Audit log failed:", err));

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
 * COLLEGE ADMIN: Get valid divisions for a student's academic context
 * GET /api/students/:id/valid-divisions
 */
exports.getValidDivisionsForStudent = async (req, res, next) => {
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

    // Get distinct non-null, non-empty divisions from timetables
    // matching the student's exact academic context
    const divisions = await Timetable.find({
      college_id: student.college_id,
      department_id: student.department_id,
      course_id: student.course_id,
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      division: { $ne: null, $ne: "" },
      status: { $ne: "ARCHIVED" },
    })
      .distinct("division")
      .sort();

    // Include student's current division if set (even if no matching timetable exists)
    // so the admin can preserve an existing assignment
    const currentDivision = student.division?.toString().trim().toUpperCase() || null;
    if (currentDivision && !divisions.includes(currentDivision)) {
      divisions.push(currentDivision);
      divisions.sort();
    }

    ApiResponse.success(
      res,
      { divisions },
      "Valid divisions fetched successfully",
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
      status: { $in: ["APPROVED", "ENROLLED", "OFFER_MADE"] },
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
exports.getStudentById = async (req, res, next) => {
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

    // 🔧 OPTIMIZATION: Use Promise.race to prevent hanging on fee query
    const feePromise = StudentFee.findOne({
      student_id: student._id,
    }).select("totalFee paidAmount installments");

    // Timeout after 5 seconds to prevent hanging
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), 5000);
    });

    const fee = await Promise.race([feePromise, timeoutPromise]);

    const resolvedDocuments = await resolveActiveStudentDocuments(student);

    ApiResponse.success(
      res,
      {
        student: {
          ...student.toObject(),
          documents: resolvedDocuments,
        },
        fee: fee || {
          totalFee: 0,
          paidAmount: 0,
          installments: [],
        },
      },
      "Student details fetched successfully"
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

// Format student data — legacy file path fields removed (now GridFS-based)
    const studentData = {
        ...student.toObject(),
        sscMarksheetPath: null,
        hscMarksheetPath: null,
        passportPhotoPath: null,
        categoryCertificatePath: null,
        incomeCertificatePath: null,
        characterCertificatePath: null,
        transferCertificatePath: null,
        aadharCardPath: null,
        entranceExamScorePath: null,
        migrationCertificatePath: null,
        domicileCertificatePath: null,
        casteCertificatePath: null,
        nonCreamyLayerCertificatePath: null,
        physicallyChallengedCertificatePath: null,
        sportsQuotaCertificatePath: null,
        nriSponsorCertificatePath: null,
        gapCertificatePath: null,
        affidavitPath: null,
documentRefs: student.documentRefs || [],
        documents: await resolveActiveStudentDocuments(student),
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
      status: { $in: ["APPROVED", "ENROLLED"] },
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
    const { graduationYear } = req.body || {};

    // Find student
    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "APPROVED",
    }).populate("course_id", "name code durationSemesters");

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

/**
 * GET DEACTIVATED STUDENTS — For history and reactivation
 * GET /students/deactivated
 */
exports.getDeactivatedStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { department_id, course_id, search } = req.query;

    const filter = {
      college_id: req.college_id,
      status: "DEACTIVATED",
    };

    if (department_id) filter.department_id = department_id;
    if (course_id) filter.course_id = course_id;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Student.countDocuments(filter);

    const students = await Student.find(filter)
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .select(
        "fullName email mobileNumber admissionYear status user_id department_id course_id",
      )
      .limit(limit)
      .skip(skip)
      .sort({ updatedAt: -1 });

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
      "Deactivated students fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET STUDENT DOCUMENT (SECURE - prevents cross-student access)
 * Uses documentId-based lookup via Document collection + GridFS.
 */
exports.getStudentDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const user = req.user;

    if (!user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const document = await Document.findOne({
      documentId,
      ownerType: "Student",
      status: "ACTIVE",
    }).select("documentId ownerId storageKey originalFileName mimeType size");

    if (!document) {
      return next(new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"));
    }

    const ownerStudent = await Student.findById(document.ownerId).select(
      "_id user_id college_id",
    );

    if (!ownerStudent) {
      return next(new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND"));
    }

    // 🔒 Authorization check
    const isOwner =
      ownerStudent.user_id &&
      ownerStudent.user_id.toString() === user.id.toString();
    const isCollegeStaff =
      ["COLLEGE_ADMIN", "ADMISSION_OFFICER", "PRINCIPAL"].includes(
        user.role,
      ) &&
      user.college_id &&
      ownerStudent.college_id &&
      user.college_id.toString() === ownerStudent.college_id.toString();

    if (!isOwner && !isCollegeStaff) {
      return next(
        new AppError(
          "Not authorized to access this document",
          403,
          "UNAUTHORIZED",
        ),
      );
    }

    // Verify access through DocumentService
    const hasAccess = await DocumentService._hasAccess(document, user);
    if (!hasAccess) {
      return next(
        new AppError(
          "Not authorized to access this document",
          403,
          "UNAUTHORIZED",
        ),
      );
    }

    const storageService = getStorageProvider().getAdapter();
    const fileData = await storageService.downloadFile(document.storageKey);

    const ext = require("path").extname(document.originalFileName).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.originalFileName}"`,
    );
    if (fileData.size) {
      res.setHeader("Content-Length", fileData.size);
    }

    const { pipeline } = require("stream");
    const stream = fileData.buffer;

    if (stream && typeof stream.pipe === "function") {
      pipeline(stream, res, (err) => {
        if (err) return next(err);
      });
    } else {
      res.send(stream);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * SEARCH STUDENTS (ACCOUNTANT/COLLEGE_ADMIN/PRINCIPAL)
 * GET /api/students/search?q=searchTerm
 */
exports.searchStudents = async (req, res) => {
  try {
    const { role, college_id } = req.user;
    const { q: searchQuery } = req.query;

    if (!["COLLEGE_ADMIN", "ACCOUNTANT", "PRINCIPAL"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admin, accountant, or principal can search students."
      });
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long"
      });
    }

    // Search for students by name or email in the college
    const students = await Student.find({
      college_id,
      $or: [
        { fullName: { $regex: searchQuery.trim(), $options: 'i' } },
        { email: { $regex: searchQuery.trim(), $options: 'i' } }
      ]
    })
    .populate('course_id', 'name')
    .select('fullName email course_id admissionYear status')
    .limit(20) // Limit results to prevent overwhelming the UI
    .sort({ fullName: 1 });

    res.json({
      success: true,
      students,
      count: students.length
    });

  } catch (error) {
    console.error("Student search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search students"
    });
  }
};
