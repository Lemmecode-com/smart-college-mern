const Student = require("../models/student.model");
const Course = require("../models/course.model");

/**
 * APPROVE STUDENT
 */
exports.approveStudent = async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findOne({
    _id: studentId,
    college_id: req.college_id,
    status: "PENDING"
  });

  if (!student) {
    return res.status(404).json({ message: "Student not found or already processed" });
  }

  // 🔢 Count approved students in course
  const approvedCount = await Student.countDocuments({
    course_id: student.course_id,
    college_id: req.college_id,
    status: "APPROVED"
  });

  const course = await Course.findById(student.course_id);

  if (approvedCount >= course.maxStudents) {
    return res.status(400).json({
      message: "Admission capacity reached for this course"
    });
  }

  // ✅ Approve
  student.status = "APPROVED";
  student.approvedBy = req.user.id;
  student.approvedAt = new Date();

  await student.save();

  res.json({ message: "Student approved successfully" });
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
    status: "PENDING"
  });

  if (!student) {
    return res.status(404).json({ message: "Student not found or already processed" });
  }

  student.status = "REJECTED";
  student.rejectionReason = reason || "Not specified";

  await student.save();

  res.json({ message: "Student rejected successfully" });
};
