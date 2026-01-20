const bcrypt = require("bcryptjs");
const College = require("../models/college.model");
const Department = require("../models/department.model");
const Course = require("../models/course.model");
const Student = require("../models/student.model");

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
      alternateMobile
    } = req.body;

    // 1️⃣ Resolve college
    const college = await College.findOne({ code: collegeCode });
    if (!college) {
      return res.status(404).json({ message: "Invalid college registration link" });
    }

    // 2️⃣ Validate department & course (same as before)


    // Validate Department
    const department = await Department.findOne({
      _id: department_id,
      college_id: college._id
    });
    if (!department) {
      return res.status(400).json({ message: "Invalid department" });
    }

    // Validate course
    const course = await Course.findOne({
      _id: course_id,
      department_id,
      college_id: college._id
    });
    if (!course) {
      return res.status(400).json({ message: "Invalid course" });
    }

    // 3️⃣ Prevent duplicate
    const exists = await Student.findOne({
      email,
      college_id: college._id
    });
    if (exists) {
      return res.status(400).json({ message: "Student already registered with this email" });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create student
    await Student.create({
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
      status: "PENDING"
    });

    res.status(201).json({
      message: "Registration successful. Await college approval."
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
