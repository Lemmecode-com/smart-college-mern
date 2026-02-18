const Student = require("../models/student.model");
const Course = require("../models/course.model");
const FeeStructure = require("../models/feeStructure.model");
const StudentFee = require("../models/studentFee.model");
const AppError = require("../utils/AppError");

exports.approveStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // 1️⃣ Find pending student
    const student = await Student.findOne({
      _id: studentId,
      college_id: req.college_id,
      status: "PENDING",
    });

    if (!student) {
      throw new AppError("Student not found or already processed", 404, "STUDENT_NOT_FOUND");
    }

    // 2️⃣ Validate course
    const course = await Course.findOne({
      _id: student.course_id,
      college_id: req.college_id,
    });

    if (!course) {
      throw new AppError("Invalid course", 404, "COURSE_NOT_FOUND");
    }

    // 3️⃣ Admission capacity check
    const approvedCount = await Student.countDocuments({
      course_id: student.course_id,
      college_id: req.college_id,
      status: "APPROVED",
    });

    if (approvedCount >= course.maxStudents) {
      throw new AppError("Admission capacity reached for this course", 409, "CAPACITY_REACHED");
    }

    // 4️⃣ Prevent duplicate fee record
    const existingFee = await StudentFee.findOne({
      student_id: student._id,
    });

    if (existingFee) {
      throw new AppError("Student fee record already exists", 409, "DUPLICATE_FEE_RECORD");
    }

    // 5️⃣ Find fee structure (correct)
    const feeStructure = await FeeStructure.findOne({
      college_id: student.college_id,
      course_id: student.course_id,
      category: student.category,
    });

    if (!feeStructure) {
      throw new AppError("Fee structure not configured for this course & category", 404, "FEE_STRUCTURE_NOT_FOUND");
    }

    // ✅ Create student fee
    const installments = feeStructure.installments.map((inst) => ({
      name: inst.name,
      amount: inst.amount,
      dueDate: inst.dueDate,
      status: "PENDING",
    }));

    const studentFee = await StudentFee.create({
      student_id: student._id,
      college_id: student.college_id,
      course_id: student.course_id,
      totalFee: feeStructure.totalFee,
      paidAmount: 0,
      installments,
    });

    // 7️⃣ Approve student (AFTER fee allocation)
    student.status = "APPROVED";
    student.approvedBy = req.user.id;
    student.approvedAt = new Date();
    await student.save();

    res.json({
      message: "Student approved and fee allocated successfully",

      student: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        category: student.category,
        admissionYear: student.admissionYear,
        status: student.status,
        course: student.course_id,
        department: student.department_id,
        approvedAt: student.approvedAt,
      },

      fee: {
        totalFee: studentFee.totalFee,
        paidAmount: studentFee.paidAmount,
        installments: studentFee.installments,
      },
    });
  } catch (error) {
    next(error);
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