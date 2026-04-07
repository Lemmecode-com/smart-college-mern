const StudentFee = require("../models/studentFee.model");
const AppError = require("../utils/AppError");

/**
 * Get receipt for admin (view any student's receipt)
 * Admin version - doesn't require the admin to be the student
 */
exports.getAdminReceipt = async (req, res, next) => {
  try {
    const { installmentId } = req.params;

    // Find the StudentFee containing this installment
    const studentFee = await StudentFee.findOne({
      "installments._id": installmentId,
    })
      .populate("student_id")
      .populate({
        path: "course_id",
        populate: {
          path: "department_id",
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

      student: {
        name: studentFee.student_id?.fullName || "N/A",
        email: studentFee.student_id?.email || "N/A",
        enrollment: studentFee.student_id?.enrollmentNumber || "N/A",
        department: studentFee.course_id?.department_id?.name || "N/A",
        course: studentFee.course_id?.name || "N/A",
        academicYear: "2025-2026",
      },

      college: {
        name: studentFee.college_id?.name || "N/A",
        address: studentFee.college_id?.address || "N/A",
        email: studentFee.college_id?.email || "N/A",
        contact: studentFee.college_id?.contactNumber || "N/A",
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
