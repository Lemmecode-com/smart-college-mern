const bcrypt = require("bcryptjs");
const College = require("../models/college.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const StudentFee = require("../models/studentFee.model");
const DocumentConfig = require("../models/documentConfig.model");
const AppError = require("../utils/AppError");

exports.registerStudent = async (req, res, next) => {
  try {
    const { collegeCode } = req.params;

    // Load document configuration for this college
    const docConfig = await DocumentConfig.findOne({ collegeCode, isActive: true });
    
    // Get uploaded files
    const files = req.files || {};
    
    // Map document type to field name (backward compatibility)
    const documentFieldMap = {
      "10th_marksheet": "sscMarksheet",
      "12th_marksheet": "hscMarksheet",
      "passport_photo": "passportPhoto",
      "category_certificate": "categoryCertificate",
      "income_certificate": "incomeCertificate",
      "character_certificate": "characterCertificate",
      "transfer_certificate": "transferCertificate",
      "aadhar_card": "aadharCard",
      "entrance_exam_score": "entranceExamScore",
      "migration_certificate": "migrationCertificate",
      "domicile_certificate": "domicileCertificate",
      "caste_certificate": "casteCertificate",
      "non_creamy_layer_certificate": "nonCreamyLayerCertificate",
      "physically_challenged_certificate": "physicallyChallengedCertificate",
      "sports_quota_certificate": "sportsQuotaCertificate",
      "nri_sponsor_certificate": "nriSponsorCertificate",
      "gap_certificate": "gapCertificate",
      "affidavit": "affidavit"
    };

    // Build document paths object dynamically
    const documentPaths = {};

    if (docConfig && docConfig.documents) {
      // Use college-specific document config
      console.log("📋 Processing document config for college:", collegeCode);
      
      // First pass: Check mandatory documents and validate
      for (const doc of docConfig.documents) {
        console.log("📄 Checking document:", doc.type, "Enabled:", doc.enabled, "Mandatory:", doc.mandatory);

        // Check mandatory documents (only if enabled)
        if (doc.enabled && doc.mandatory && !files[doc.type]) {
          // Skip category certificate if category is GEN
          if (doc.type === 'category_certificate' && category === 'GEN') {
            console.log("⏭️ Skipping category certificate (GEN category)");
            continue;
          }
          console.log("❌ Missing mandatory document:", doc.label);
          return res.status(400).json({
            message: `${doc.label} is mandatory`
          });
        }
      }
      
      // Second pass: Save ALL uploaded files (regardless of config)
      // This ensures every uploaded document is saved to database
      const reverseFieldMap = Object.entries(documentFieldMap).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
      }, {});
      
      for (const [fieldName, fieldFiles] of Object.entries(files)) {
        // Map backend field name to document type
        let docType = fieldName;
        
        if (reverseFieldMap[fieldName]) {
          docType = reverseFieldMap[fieldName];
        }
        
        // Save the file if it exists
        if (fieldFiles && fieldFiles[0]?.path) {
          const filePath = fieldFiles[0].path;
          documentPaths[docType] = filePath.replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/');
          console.log("💾 Saved uploaded document:", docType, documentPaths[docType]);
        }
      }
    } else {
      // Use default document fields (backward compatibility)
      const sscMarksheetPath = files.sscMarksheet?.[0]?.path ?
        files.sscMarksheet[0].path.replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : "";
      const hscMarksheetPath = files.hscMarksheet?.[0]?.path ?
        files.hscMarksheet[0].path.replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : "";
      const passportPhotoPath = files.passportPhoto?.[0]?.path ?
        files.passportPhoto[0].path.replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : "";
      const categoryCertificatePath = files.categoryCertificate?.[0]?.path ?
        files.categoryCertificate[0].path.replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : "";

      documentPaths["10th_marksheet"] = sscMarksheetPath;
      documentPaths["12th_marksheet"] = hscMarksheetPath;
      documentPaths["passport_photo"] = passportPhotoPath;
      documentPaths["category_certificate"] = categoryCertificatePath;
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
    } = req.body;

    // 1️⃣ Resolve college
    const college = await College.findOne({ code: collegeCode });
    if (!college) {
      throw new AppError("Invalid college registration link", 404, "COLLEGE_NOT_FOUND");
    }

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
      throw new AppError("Student already registered with this email", 409, "DUPLICATE_EMAIL");
    }

    // ✅ 4️⃣ Create User FIRST (with password hashing)
    const user = await User.create({
      name: fullName,
      email,
      password,  // User model will hash this automatically
      role: "STUDENT",
      college_id: college._id,
    });

    // ✅ 5️⃣ Create Student WITH user_id reference (NO password field)
    const registeredStud = await Student.create({
      user_id: user._id,  // ← Link to User
      fullName,
      email,
      // ❌ NO password field (authentication via User collection only)
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
      nonCreamyLayerCertificatePath: documentPaths["non_creamy_layer_certificate"] || "",
      physicallyChallengedCertificatePath: documentPaths["physically_challenged_certificate"] || "",
      sportsQuotaCertificatePath: documentPaths["sports_quota_certificate"] || "",
      nriSponsorCertificatePath: documentPaths["nri_sponsor_certificate"] || "",
      gapCertificatePath: documentPaths["gap_certificate"] || "",
      affidavitPath: documentPaths["affidavit"] || "",
      // Store all documents in a flexible field
      documents: documentPaths,
      status: "PENDING",
    });

    res.status(201).json({
      message: "Registration successful. Await college approval.",
      registeredStud,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET FULL STUDENT PROFILE (360 VIEW)
 */
exports.getMyFullProfile = async (req, res) => {
  try {
    const student = req.student;

    // 1️⃣ College Info
    const college = await College.findById(student.college_id).select(
      "name code email contactNumber address establishedYear",
    );

    // 2️⃣ Department & Course
    const department = await Department.findById(student.department_id).select(
      "name code",
    );
    const course = await Course.findById(student.course_id).select("name code");

    // 3️⃣ Document Config (to determine which fields to show)
    const docConfig = await DocumentConfig.findOne({
      collegeCode: college.code,
      isActive: true
    }).select("documents");

    // 4️⃣ Attendance Summary
    const sessions = await AttendanceSession.find({
      course_id: student.course_id,
      college_id: student.college_id,
    });

    const sessionIds = sessions.map((s) => s._id);

    const records = await AttendanceRecord.find({
      student_id: student._id,
    }).populate({
      path: "session_id",
      populate: {
        path: "subject_id",
        select: "name",
      },
    });

    const attendanceMap = {};

    records.forEach((r) => {
      const subjectName = r.session_id.subject_id.name;

      if (!attendanceMap[subjectName]) {
        attendanceMap[subjectName] = { total: 0, present: 0 };
      }

      attendanceMap[subjectName].total += 1;

      if (r.status === "PRESENT") {
        attendanceMap[subjectName].present += 1;
      }
    });

    const attendanceSummary = Object.keys(attendanceMap).map((subject) => {
      const total = attendanceMap[subject].total;
      const present = attendanceMap[subject].present;
      const percentage = ((present / total) * 100).toFixed(2);

      return {
        subject,
        totalLectures: total,
        attended: present,
        percentage,
        status: percentage < 75 ? "AT_RISK" : "SAFE",
      };
    });

    // 5️⃣ Final Response - Include ALL student fields from model
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
      sscMarksheetPath: student.sscMarksheetPath ?
        student.sscMarksheetPath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      hscMarksheetPath: student.hscMarksheetPath ?
        student.hscMarksheetPath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      passportPhotoPath: student.passportPhotoPath ?
        student.passportPhotoPath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      categoryCertificatePath: student.categoryCertificatePath ?
        student.categoryCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      // All other document paths
      incomeCertificatePath: student.incomeCertificatePath ?
        student.incomeCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      characterCertificatePath: student.characterCertificatePath ?
        student.characterCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      transferCertificatePath: student.transferCertificatePath ?
        student.transferCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      aadharCardPath: student.aadharCardPath ?
        student.aadharCardPath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      entranceExamScorePath: student.entranceExamScorePath ?
        student.entranceExamScorePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      migrationCertificatePath: student.migrationCertificatePath ?
        student.migrationCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      domicileCertificatePath: student.domicileCertificatePath ?
        student.domicileCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      casteCertificatePath: student.casteCertificatePath ?
        student.casteCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      nonCreamyLayerCertificatePath: student.nonCreamyLayerCertificatePath ?
        student.nonCreamyLayerCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      physicallyChallengedCertificatePath: student.physicallyChallengedCertificatePath ?
        student.physicallyChallengedCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      sportsQuotaCertificatePath: student.sportsQuotaCertificatePath ?
        student.sportsQuotaCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      nriSponsorCertificatePath: student.nriSponsorCertificatePath ?
        student.nriSponsorCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      gapCertificatePath: student.gapCertificatePath ?
        student.gapCertificatePath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
      affidavitPath: student.affidavitPath ?
        student.affidavitPath.replace(/\\/g, "/").replace(/^.*?[\\\/]uploads[\\\/]/, 'uploads/') : null,
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
      libraryRequired: student.libraryRequired !== undefined ? student.libraryRequired : true,
    };

    res.json({
      student: studentData,
      college,
      department,
      course,
      attendance: attendanceSummary,
      documentConfig: docConfig?.documents || [] // Return document config for conditional rendering
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * STUDENT: Update own profile
 */
exports.updateMyProfile = async (req, res) => {
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

    res.json({
      message: "Profile updated successfully",
      student,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * COLLEGE ADMIN: Update student profile (SAFE)
 */
exports.updateStudentByAdmin = async (req, res) => {
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

    // 🔐 Handle password update separately
    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      student.password = hashedPassword;
      delete req.body.password; // prevent overwrite
    }

    // Update remaining fields safely
    Object.assign(student, req.body);

    await student.save();

    res.json({
      message: "Student updated successfully",
      student,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * COLLEGE ADMIN: Delete student (soft delete)
 */
exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.status = "DELETED";
    await student.save();

    res.json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET APPROVED STUDENTS FOR COLLEGE ADMIN (WITH FEES)
exports.getApprovedStudents = async (req, res) => {
  try {
    const students = await Student.find({
      college_id: req.college_id,
      status: "APPROVED"
    })
      .populate("department_id", "name code")
      .populate("course_id", "name");

    // Attach fee info for each student
    const studentsWithFee = await Promise.all(
      students.map(async (student) => {
        const fee = await StudentFee.findOne({
          student_id: student._id
        }).select("totalFee paidAmount installments");

        return {
          ...student.toObject(),
          fee: fee || null
        };
      })
    );

    res.json(studentsWithFee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET INDIVIDUAL APPROVED STUDENT FOR COLLEGE ADMIN (WITH FEES)
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      college_id: req.college_id
    })
      .populate("college_id", "name code")
      .populate("department_id", "name")
      .populate("course_id", "name");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const fee = await StudentFee.findOne({
      student_id: student._id
    }).select("totalFee paidAmount installments");

    res.json({
      ...student.toObject(),
      fee: fee || {
        totalFee: 0,
        paidAmount: 0,
        installments: []
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// REGISTERED (PENDING) STUDENTS
exports.getRegisteredStudents = async (req, res) => {
  const students = await Student.find({
    college_id: req.college_id,
    status: "PENDING"
  })
    .populate("department_id", "name code")
    .populate("course_id", "name");

  res.json(students);
};

// ADMIN GETS REGISTERED (PENDING) INDIVUDUAL STUDENT
exports.getRegisteredStudentById = async (req, res) => {
  const student = await Student.findOne({
    _id: req.params.id,
    college_id: req.college_id,
    status: "PENDING"
  })
    .populate("college_id", "name code")
    .populate("department_id", "name")
    .populate("course_id", "name");

  if (!student) {
    return res.status(404).json({
      message: "Registered student not found"
    });
  }

  res.json(student);
};

/**
 * TEACHER: Get students for the logged-in teacher
 * GET /students/teacher
 */
exports.getStudentsForTeacher = async (req, res) => {
  try {
    // First, get the teacher's profile to find their assigned subjects
    const teacher = await require("../models/teacher.model").findOne({
      user_id: req.user.id,
      college_id: req.college_id
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    // Get subjects taught by this teacher
    const subjects = await require("../models/subject.model").find({
      teacher_id: teacher._id,
      college_id: req.college_id
    }).select("course_id");

    if (!subjects || subjects.length === 0) {
      return res.json({ students: [] });
    }

    // Extract course IDs from subjects
    const courseIds = subjects.map(subject => subject.course_id);

    // Get students enrolled in those courses
    const students = await Student.find({
      course_id: { $in: courseIds },
      college_id: req.college_id,
      status: "APPROVED"
    }).select("fullName email course_id status");

    // Populate course names
    const populatedStudents = await Student.populate(students, {
      path: "course_id",
      select: "name"
    });

    res.json({ students: populatedStudents });
  } catch (error) {
    console.error("Get Students For Teacher Error:", error);
    res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
};
