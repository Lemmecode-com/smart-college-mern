const Student = require("../models/student.model");
const Course = require("../models/course.model");
const FeeStructure = require ("../models/feeStructure.model");
const StudentFee = require("../models/user.model")

exports.approveStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1️⃣ Find pending student
    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "PENDING",
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found or already processed",
      });
    }

    // 2️⃣ Validate course
    const course = await Course.findOne({
      _id: student.course_id,
      college_id: req.college_id,
    });

    if (!course) {
      return res.status(400).json({
        message: "Invalid course",
      });
    }

    // 3️⃣ Admission capacity check
    const approvedCount = await Student.countDocuments({
      course_id: student.course_id,
      college_id: req.college_id,
      status: "APPROVED",
    });

    if (approvedCount >= course.maxStudents) {
      return res.status(400).json({
        message: "Admission capacity reached for this course",
      });
    }

    // 4️⃣ Prevent duplicate fee record
    const existingFee = await StudentFee.findOne({
      student_id: student._id,
    });

    if (existingFee) {
      return res.status(400).json({
        message: "Student fee record already exists",
      });
    }

    // 1️⃣ Find fee structure
const feeStructure = await FeeStructure.findOne({
  college_id: student.college_id,
  course_id: student.course_id,
  category: student.category,
});

if (!feeStructure) {
  console.error("❌ FeeStructure not found", {
    college_id: student.college_id,
    course_id: student.course_id,
    category: student.category,
  });

  return res.status(400).json({
    message: "Fee structure not configured for this course & category",
  });
}

    // 7️⃣ Approve student
    student.status = "APPROVED";
    student.approvedBy = req.user.id;
    student.approvedAt = new Date();

    await student.save();

    res.json({
      message: "Student approved successfully",
    });

  } catch (error) {
    console.error("Approve student error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};


/**
 * REJECT STUDENT
 */
exports.rejectStudent = async (req, res) => {
  const { studentId } = req.params;
  const { reason } = req.body;

  const student = await Student.findOne({
    _id: studentId,
    college_id: req.college_id,
    status: "PENDING",
  });

  if (!student) {
    return res
      .status(404)
      .json({ message: "Student not found or already processed" });
  }

  student.status = "REJECTED";
  student.rejectionReason = reason || "Not specified";

  await student.save();

  res.json({ message: "Student rejected successfully" });
};
