const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const {
  getPaymentOverdueReport,
} = require("../services/paymentReminder.service");
const AppError = require("../utils/AppError");

/**
 * COLLEGE ADMIN: Payment report
 */
exports.getCollegePaymentReport = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const fees = await StudentFee.find({
      college_id: collegeId,
    })
      .populate("student_id", "fullName email")
      .populate("course_id", "name");

    let totalCollected = 0;

    const report = fees.map((fee) => {
      totalCollected += fee.paidAmount;

      return {
        student: fee.student_id,
        course: fee.course_id,
        totalFee: fee.totalFee,
        paidAmount: fee.paidAmount,
        pendingAmount: fee.totalFee - fee.paidAmount,
        installments: fee.installments,
      };
    });

    res.json({
      totalCollected,
      totalStudents: report.length,
      report,
    });
  } catch (error) {
    console.error("Admin payment report error:", error);
    res.status(500).json({
      message: "Failed to fetch payment report",
    });
  }
};

/**
 * COLLEGE ADMIN: Get Payment Overdue Report with Escalation Levels (FIX: Issue #10)
 * Returns summary of overdue payments categorized by escalation level
 */
exports.getPaymentOverdueStats = async (req, res, next) => {
  try {
    const report = await getPaymentOverdueReport();

    res.json({
      success: true,
      ...report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * COLLEGE ADMIN: Manually trigger payment reminders (FIX: Issue #10)
 * Allows admin to send reminders on-demand
 */
exports.triggerPaymentReminders = async (req, res, next) => {
  try {
    const {
      sendPaymentDueReminders,
    } = require("../services/paymentReminder.service");
    const result = await sendPaymentDueReminders();

    res.json({
      success: true,
      message: "Payment reminders processed successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * COLLEGE ADMIN: Mark installment as PAID for offline payments
 * POST /api/admin/payments/mark-paid
 *
 * Accepts: studentId, installmentId, paymentMode (CASH/CHEQUE/DD), referenceNumber, remarks
 * Marks installment as PAID with paymentGateway: "OFFLINE"
 *
 * Validation:
 * - Reference number required for CHEQUE/DD
 * - Only PENDING installments can be marked
 * - College isolation enforced
 */
exports.markInstallmentAsPaid = async (req, res, next) => {
  try {
    const { studentId, installmentId, paymentMode, referenceNumber, remarks } =
      req.body;
    const adminUserId = req.user.id;
    const collegeId = req.college_id;

    // Validate required fields
    if (!studentId || !installmentId || !paymentMode) {
      throw new AppError(
        "studentId, installmentId, and paymentMode are required",
        400,
        "MISSING_REQUIRED_FIELDS",
      );
    }

    // Validate payment mode
    const validPaymentModes = ["CASH", "CHEQUE", "DD"];
    if (!validPaymentModes.includes(paymentMode)) {
      throw new AppError(
        "Invalid payment mode. Must be CASH, CHEQUE, or DD",
        400,
        "INVALID_PAYMENT_MODE",
      );
    }

    // Validate reference number required for CHEQUE/DD
    if (
      (paymentMode === "CHEQUE" || paymentMode === "DD") &&
      !referenceNumber
    ) {
      throw new AppError(
        `Reference number is required for ${paymentMode} payments`,
        400,
        "REFERENCE_NUMBER_REQUIRED",
      );
    }

    // Find student with college isolation
    const student = await Student.findOne({
      _id: studentId,
      college_id: collegeId,
    });

    if (!student) {
      throw new AppError(
        "Student not found or does not belong to your college",
        404,
        "STUDENT_NOT_FOUND",
      );
    }

    // Find student fee record
    const studentFee = await StudentFee.findOne({
      student_id: student._id,
      college_id: collegeId,
    });

    if (!studentFee) {
      throw new AppError(
        "Fee record not found for this student",
        404,
        "FEE_RECORD_NOT_FOUND",
      );
    }

    // Find the specific installment
    const installment = studentFee.installments.id(installmentId);

    if (!installment) {
      throw new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND");
    }

    // Idempotency check: Only PENDING installments can be marked
    if (installment.status !== "PENDING") {
      throw new AppError(
        `Cannot mark as paid. Installment status is ${installment.status} (must be PENDING)`,
        400,
        "INSTALLMENT_NOT_PENDING",
      );
    }

    // Generate transaction ID for offline payment
    const transactionId = `OFF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Update installment as PAID
    installment.status = "PAID";
    installment.paymentGateway = "OFFLINE";
    installment.paymentMode = paymentMode;
    installment.referenceNumber = referenceNumber || null;
    installment.remarks = remarks || null;
    installment.transactionId = transactionId;
    installment.paidAt = new Date();
    installment.markedByAdmin = adminUserId;

    // Update total paid amount
    studentFee.paidAmount += installment.amount;

    await studentFee.save();

    res.json({
      success: true,
      message: `Installment marked as PAID successfully via ${paymentMode}`,
      data: {
        studentId: student._id,
        studentName: student.fullName,
        installmentName: installment.name,
        amount: installment.amount,
        paymentMode: installment.paymentMode,
        paymentGateway: installment.paymentGateway,
        transactionId: installment.transactionId,
        referenceNumber: installment.referenceNumber,
        paidAt: installment.paidAt,
        remarks: installment.remarks,
        totalPaid: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};
