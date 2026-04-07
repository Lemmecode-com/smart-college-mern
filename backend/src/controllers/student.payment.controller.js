const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const AppError = require("../utils/AppError");

exports.getStudentFeeDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id; // This is User._id
    const collegeId = req.college_id;

    // ✅ First find the student by user_id
    const student = await Student.findOne({
      user_id: userId,
      college_id: collegeId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // 1️⃣ Fetch student fee record using student._id
    const studentFee = await StudentFee.findOne({
      student_id: student._id, // ✅ Use student._id (not user_id)
    })
      .populate("college_id", "name code")
      .populate("course_id", "name code");

    if (!studentFee) {
      throw new AppError("Fee details not found", 404, "FEE_RECORD_NOT_FOUND");
    }

    // 2️⃣ Calculate totals
    let totalPaid = 0;

    studentFee.installments.forEach((inst) => {
      if (inst.status === "PAID") {
        totalPaid += inst.amount;
      }
    });

    const totalFee = studentFee.totalFee;
    const totalDue = totalFee - totalPaid;

    // 3️⃣ Prepare dashboard response
    res.json({
      studentId: student._id,
      college: studentFee.college_id,
      course: studentFee.course_id,
      totalFee,
      totalPaid,
      totalDue,
      installments: studentFee.installments,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentReceipt = async (req, res, next) => {
  try {
    const userId = req.user.id; // This is User._id
    const collegeId = req.college_id;
    const { installmentId } = req.params;

    // ✅ First find the student by user_id
    const student = await Student.findOne({
      user_id: userId,
      college_id: collegeId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    const studentFee = await StudentFee.findOne({
      student_id: student._id, // ✅ Use student._id
      "installments._id": installmentId,
    })
      .populate("student_id")
      .populate({
        path: "course_id",
        populate: {
          path: "department_id", // 🔥 IMPORTANT
          model: "Department",
        },
      })
      .populate("college_id");

    if (!studentFee) {
      throw new AppError("Receipt not found", 404, "RECEIPT_NOT_FOUND");
    }

    const installment = studentFee.installments.id(installmentId);

    if (!installment || installment.status !== "PAID") {
      throw new AppError(
        "Installment not paid or invalid receipt",
        404,
        "INSTALLMENT_NOT_PAID",
      );
    }

    const receiptNumber = `RCPT-${installment._id
      .toString()
      .slice(-6)
      .toUpperCase()}-${new Date().getFullYear()}`;

    return res.json({
      receiptNumber,
      transactionId: installment.transactionId,
      installmentName: installment.name,
      amount: installment.amount,
      paidAt: installment.paidAt,
      status: "SUCCESS",
      paymentGateway: installment.paymentGateway || "STRIPE",

      // 🏦 OFFLINE PAYMENT: Additional details for offline payments
      paymentMode: installment.paymentMode || "ONLINE",
      referenceNumber: installment.referenceNumber || null,
      remarks: installment.remarks || null,

      student: {
        name: studentFee.student_id.fullName,
        email: studentFee.student_id.email,
        enrollment: studentFee.student_id.enrollmentNumber,
        department: studentFee.course_id?.department_id?.name || "N/A", // ✅ FIXED
        course: studentFee.course_id.name,
        academicYear: "2025-2026",
      },

      college: {
        name: studentFee.college_id.name,
        address: studentFee.college_id.address,
        email: studentFee.college_id.email,
        contact: studentFee.college_id.contactNumber,
      },

      summary: {
        totalFee: studentFee.totalFee,
        totalPaid: studentFee.paidAmount,
        remaining: studentFee.totalFee - studentFee.paidAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment status by Stripe session ID (for webhook polling)
 * @route GET /api/student/payments/status?sessionId=xxx
 * @access Private (Student)
 */
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400, "SESSION_ID_REQUIRED");
    }

    const userId = req.user.id;
    const collegeId = req.college_id;

    // Find student
    const student = await Student.findOne({
      user_id: userId,
      college_id: collegeId,
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    // Find student fee with matching session ID
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
      "installments.stripeSessionId": sessionId,
    });

    if (!studentFee) {
      throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    // Find the specific installment
    const installment = studentFee.installments.find(
      (i) => i.stripeSessionId === sessionId,
    );

    if (!installment) {
      throw new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND");
    }

    res.json({
      status: installment.status,
      paidAt: installment.paidAt,
      transactionId: installment.transactionId,
      paymentGateway: installment.paymentGateway,
      amount: installment.amount,
      installmentName: installment.name,
      totalFee: studentFee.totalFee,
      paidAmount: studentFee.paidAmount,
      remainingAmount: studentFee.totalFee - studentFee.paidAmount,
    });
  } catch (error) {
    next(error);
  }
};
