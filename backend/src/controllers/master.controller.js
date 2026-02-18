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

// SUPER ADMIN: View all colleges
exports.getAllColleges = async (req, res) => {
  const colleges = await College.find();
  res.json(colleges);
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