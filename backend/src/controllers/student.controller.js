const bcrypt = require("bcryptjs");
const College = require("../models/college.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Student = require("../models/student.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");

exports.registerStudent = async (req, res) => {
  try {
    const { collegeCode } = req.params;

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
    } = req.body;

    // 1️⃣ Resolve college
    const college = await College.findOne({ code: collegeCode });
    if (!college) {
      return res
        .status(404)
        .json({ message: "Invalid college registration link" });
    }

    // 2️⃣ Validate department & course (same as before)

    // Validate Department
    const department = await Department.findOne({
      _id: department_id,
      college_id: college._id,
    });
    if (!department) {
      return res.status(400).json({ message: "Invalid department" });
    }

    // Validate course
    const course = await Course.findOne({
      _id: course_id,
      department_id,
      college_id: college._id,
    });
    if (!course) {
      return res.status(400).json({ message: "Invalid course" });
    }

    // 3️⃣ Prevent duplicate
    const exists = await Student.findOne({
      email,
      college_id: college._id,
    });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Student already registered with this email" });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create student
    const registeredStud = await Student.create({
      fullName,
      email,
      password: hashedPassword,
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
      status: "PENDING",
    });

    res.status(201).json({
      message: "Registration successful. Await college approval.",
      registeredStud,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      "name code email contactNumber address",
    );

    // 2️⃣ Department & Course
    const department = await Department.findById(student.department_id).select(
      "name code",
    );
    const course = await Course.findById(student.course_id).select("name code");

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

    // 5️⃣ Final Response
    res.json({
      student: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        mobileNumber: student.mobileNumber,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        nationality: student.nationality,
        admissionYear: student.admissionYear,
        currentSemester: student.currentSemester,
        status: student.status,
        createdAt: student.createdAt,
      },
      college,
      department,
      course,
      attendance: attendanceSummary,
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


// GET APPROVED STUDENTS FOR COLLEGE ADMIN
exports.getApprovedStudents = async (req, res) => {
  const students = await Student.find({
    college_id: req.college_id,
    status: "APPROVED"
  })
    .populate("department_id", "name code")
    .populate("course_id", "name");

  res.json(students);
};


//GET INDIVIDUAL APPROVED STUDENT FOR COLLEGE ADMIN 
exports.getStudentById = async (req, res) => {
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

  res.json(student);
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