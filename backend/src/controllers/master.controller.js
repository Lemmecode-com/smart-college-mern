const mongoose = require("mongoose");

const College = require("../models/college.model");
const User = require("../models/user.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const Timetable = require("../models/timetable.model");
const AttendanceSession = require("../models/attendanceSession.model");
const { generateCollegeQR } = require("../utils/qrGenerator");
const AppError = require("../utils/AppError");
const { sendEmailToCollegeAdmin } = require("../services/email.service");

exports.createCollege = async (req, res, next) => {
  try {
    const {
      collegeName,
      collegeCode,
      collegeEmail,
      contactNumber,
      address,
      establishedYear,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    // 1️⃣ Check college code uniqueness
    const exists = await College.findOne({ code: collegeCode });
    if (exists) {
      throw new AppError("College code already exists", 409, "DUPLICATE_CODE");
    }

    // 2️⃣ Generate Registration URL + QR FIRST
    const { registrationUrl, registrationQr } =
      await generateCollegeQR(collegeCode);

    // 3️⃣ Handle logo
    const logoPath = req.file ? req.file.path : null;

    // 4️⃣ Create College WITH required fields
    const college = await College.create({
      name: collegeName,
      code: collegeCode,
      email: collegeEmail,
      contactNumber,
      address,
      establishedYear,
      logo: logoPath,
      registrationUrl,
      registrationQr
    });

    // 5️⃣ Create College Admin (plain password — hashed in User schema)
    const collegeAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "COLLEGE_ADMIN",
      college_id: college._id,
    });

    res.status(201).json({
      message: "College and College Admin created successfully",
      college: {
        id: college._id,
        name: college.name,
        registrationUrl,
        registrationQr
      },
      collegeAdmin: {
        id: collegeAdmin._id,
        email: collegeAdmin.email
      }
    });

  } catch (error) {
    next(error);
  }
};

// SUPER ADMIN: View all colleges (optionally filter inactive)
exports.getAllColleges = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    
    // By default, only show active colleges
    const query = includeInactive === 'true' ? {} : { isActive: true };
    
    const colleges = await College.find(query).sort({ createdAt: -1 });
    
    res.json({
      count: colleges.length,
      colleges
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Soft Delete College (Deactivate with Cascade)
========================================================= */
exports.deleteCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Find college
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Check if already inactive
    if (!college.isActive) {
      throw new AppError("College is already deactivated", 400, "ALREADY_INACTIVE");
    }

    // 4️⃣ Soft delete (this triggers the pre('findOneAndUpdate') hook for cascade)
    await College.findOneAndUpdate(
      { _id: collegeId },
      { $set: { isActive: false } }
    );

    res.json({
      message: "College deactivated successfully. All related departments, courses, students, and staff have been deactivated.",
      college: {
        id: college._id,
        name: college.name,
        code: college.code,
        isActive: false
      }
    });

  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Restore College (Reactivate with Cascade)
========================================================= */
exports.restoreCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Find college
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Check if already active
    if (college.isActive) {
      throw new AppError("College is already active", 400, "ALREADY_ACTIVE");
    }

    // 4️⃣ Restore (this triggers the pre('findOneAndUpdate') hook for cascade restore)
    await College.findOneAndUpdate(
      { _id: collegeId },
      { $set: { isActive: true } }
    );

    res.json({
      message: "College restored successfully. All related departments, courses, students, and staff have been reactivated.",
      college: {
        id: college._id,
        name: college.name,
        code: college.code,
        isActive: true
      }
    });

  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Hard Delete College (PERMANENT - Use with Caution)
========================================================= */
exports.hardDeleteCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { confirmPermanentDelete } = req.body;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Find college
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Require explicit confirmation for permanent delete
    if (confirmPermanentDelete !== true) {
      throw new AppError(
        "Permanent deletion requires explicit confirmation. Set 'confirmPermanentDelete: true' in request body.",
        400,
        "CONFIRMATION_REQUIRED"
      );
    }

    // 4️⃣ Hard delete (this triggers the pre('findOneAndDelete') hook for cascade hard delete)
    await College.findOneAndDelete({ _id: collegeId });

    res.json({
      message: "College and ALL related data PERMANENTLY deleted. This action cannot be undone.",
      deletedCollege: {
        id: college._id,
        name: college.name,
        code: college.code
      }
    });

  } catch (error) {
    next(error);
  }
};

/* =========================================================
   SUPER ADMIN: Get Single College with Full Stats
========================================================= */
exports.getCollegeById = async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Get College
    const college = await College.findById(collegeId);

    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Collect Stats (Parallel for performance)
    const [
      totalDepartments,
      totalCourses,
      totalTeachers,
      totalStudents,
      approvedStudents,
      totalTimetables,
      totalAttendanceSessions,
    ] = await Promise.all([
      Department.countDocuments({ college_id: collegeId }),
      Course.countDocuments({ college_id: collegeId }),
      Teacher.countDocuments({ college_id: collegeId }),
      Student.countDocuments({ college_id: collegeId }),
      Student.countDocuments({
        college_id: collegeId,
        status: "APPROVED",
      }),
      Timetable.countDocuments({ college_id: collegeId }),
      AttendanceSession.countDocuments({ college_id: collegeId }),
    ]);

    // 4️⃣ Response
    res.json({
      message: "College details fetched successfully",
      college: {
        id: college._id,
        name: college.name,
        code: college.code,
        email: college.email,
        contactNumber: college.contactNumber,
        address: college.address,
        establishedYear: college.establishedYear,
        logo: college.logo,
        registrationUrl: college.registrationUrl,
        registrationQr: college.registrationQr,
        createdAt: college.createdAt,
      },
      stats: {
        totalDepartments,
        totalCourses,
        totalTeachers,
        totalStudents,
        approvedStudents,
        totalTimetables,
        totalAttendanceSessions,
      },
    });

  } catch (error) {
    next(error);
  }
};

/**
 * SUPER ADMIN: Send Email to College Admin
 */
exports.sendEmailToCollegeAdmin = async (req, res, next) => {
  try {
    const { collegeId, subject, message } = req.body;

    // 1️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      throw new AppError("Invalid college ID", 400, "INVALID_ID");
    }

    // 2️⃣ Get college details
    const college = await College.findById(collegeId);
    if (!college) {
      throw new AppError("College not found", 404, "COLLEGE_NOT_FOUND");
    }

    // 3️⃣ Get college admin email
    const adminUser = await User.findOne({
      college_id: collegeId,
      role: "COLLEGE_ADMIN"
    });

    if (!adminUser || !adminUser.email) {
      throw new AppError("College admin email not found", 404, "ADMIN_EMAIL_NOT_FOUND");
    }

    // 4️⃣ Send email
    await sendEmailToCollegeAdmin({
      to: adminUser.email,
      collegeName: college.name,
      subject: subject || `Regarding ${college.name} - Smart College Management`,
      message: message || "No message provided"
    });

    res.json({
      success: true,
      message: `Email sent successfully to college admin at ${adminUser.email}`,
      data: {
        collegeName: college.name,
        adminEmail: adminUser.email,
        subject: subject || `Regarding ${college.name} - Smart College Management`
      }
    });

  } catch (error) {
    next(error);
  }
};