const crypto = require("crypto");
const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const {
  getPaymentOverdueReport,
} = require("../services/paymentReminder.service");
const { sendPaymentReceiptEmail } = require("../services/email.service");
const { generatePaymentReceiptPdf } = require("../utils/pdfReceipt");
const AppError = require("../utils/AppError");

/**
 * COLLEGE ADMIN: Payment report with date filtering support
 */
exports.getCollegePaymentReport = async (req, res) => {
   try {
     const collegeId = req.college_id;
     const { startDate, endDate, studentId, search } = req.query;

     let matchConditions = { college_id: collegeId };

     if (studentId) {
       matchConditions.student_id = studentId;
     }

     // Add date filtering if provided
     if (startDate || endDate) {
       matchConditions.installments = {};

       if (startDate) {
         matchConditions.installments.$elemMatch = {
           ...matchConditions.installments.$elemMatch,
           paidAt: { $gte: new Date(startDate) }
         };
       }

       if (endDate) {
         matchConditions.installments.$elemMatch = {
           ...matchConditions.installments.$elemMatch,
           paidAt: { $lte: new Date(endDate) }
         };
       }
     }

     const fees = await StudentFee.find(matchConditions)
       .populate("student_id", "fullName email enrollment_number")
       .populate("course_id", "name code")
       .lean();

     let totalCollected = 0;

const report = fees
       .filter(fee => fee.student_id && fee.course_id)
       .map((fee) => {
         totalCollected += fee.paidAmount;

         // Filter installments by date if date range provided
         let filteredInstallments = fee.installments;
         if (startDate || endDate) {
           filteredInstallments = fee.installments.filter(inst => {
             if (!inst.paidAt) return false;
             const paidDate = new Date(inst.paidAt);
             if (startDate && paidDate < new Date(startDate)) return false;
             if (endDate && paidDate > new Date(endDate)) return false;
             return true;
           });
         }

         return {
           student: fee.student_id,
           course: fee.course_id,
           totalFee: fee.totalFee,
           paidAmount: fee.paidAmount,
           pendingAmount: fee.totalFee - fee.paidAmount,
           installments: filteredInstallments,
         };
       });

    res.json({
      totalCollected,
      totalStudents: report.length,
      report,
      dateRange: startDate || endDate ? { startDate, endDate } : null,
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

    // Validate installment order: Previous installments must be paid
    const installmentOrder = installment.order || 0;
    if (installmentOrder > 1) {
      const unpaidPrevious = studentFee.installments.some(
        (i) => i.order < installmentOrder && i.status !== "PAID",
      );
      if (unpaidPrevious) {
        throw new AppError(
          "Cannot pay this installment. Previous installments are still pending.",
          400,
          "PREVIOUS_INSTALLMENTS_PENDING",
        );
      }
    }

    // Generate transaction ID for offline payment
    const transactionId = `OFF-${Date.now()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

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

    // Send receipt email (non-blocking, don't fail if email fails)
    try {
      const pdfBuffer = await generatePaymentReceiptPdf({
        studentName: student.fullName,
        enrollmentNumber: student.enrollmentNumber,
        installment,
        totalFee: studentFee.totalFee,
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
        collegeName: "",
        transactionId: installment.transactionId,
        paymentMode: installment.paymentMode,
        paidAt: installment.paidAt,
      });

      await sendPaymentReceiptEmail({
        to: student.email,
        studentName: student.fullName,
        installment: {
          name: installment.name,
          amount: installment.amount,
          paidAt: installment.paidAt,
          transactionId: installment.transactionId,
        },
        totalFee: studentFee.totalFee,
        paidAmount: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
        collegeId: collegeId,
        attachments: [
          {
            filename: `receipt-${installment.transactionId}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
    } catch (emailErr) {
      console.error("Failed to send receipt email:", emailErr.message);
    }

    res.json({
      success: true,
      message: `Installment marked as PAID successfully via ${paymentMode}`,
      data: {
        installmentId: installment._id,
        studentId: student._id,
        studentName: student.fullName,
        installmentName: installment.name,
        amount: installment.amount,
        paymentMode: installment.paymentMode,
        referenceNumber: installment.referenceNumber,
        remarks: installment.remarks,
        markedByAdmin: installment.markedByAdmin,
        paymentGateway: installment.paymentGateway,
        transactionId: installment.transactionId,
        paidAt: installment.paidAt,
        totalPaid: studentFee.paidAmount,
        remainingAmount: studentFee.totalFee - studentFee.paidAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate days overdue
 */
const calculateDaysOverdue = (dueDate) => {
  const today = new Date();
  const diffMs = today - new Date(dueDate);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Get Escalation Level based on days overdue
 */
const getEscalationLevel = (daysOverdue) => {
  if (daysOverdue === 0) return "DUE_TODAY";
  if (daysOverdue <= 7) return "SLIGHTLY_OVERDUE";
  if (daysOverdue <= 15) return "MODERATELY_OVERDUE";
  if (daysOverdue <= 30) return "SEVERELY_OVERDUE";
  return "CRITICALLY_OVERDUE";
};

/**
 * COLLEGE ADMIN/ACCOUNTANT/PRINCIPAL: Get defaulters list with filters
 * GET /api/admin/payments/defaulters
 *
 * Includes:
 * - Student details (name, email, enrollment)
 * - Installment details (name, amount, due date, days overdue)
 * - Escalation level
 * - Pending amount
 * - Filters: courseId, escalationLevel, search term
 * - Summary totals
 */
exports.getDefaulters = async (req, res, next) => {
  try {
    const collegeId = req.college_id;
    const { courseId, escalationLevel, search } = req.query;

    const matchConditions = {
      college_id: collegeId,
      "installments.status": "PENDING",
      "installments.dueDate": { $lt: new Date() },
    };

    if (escalationLevel) {
      matchConditions["installments.escalationLevel"] = escalationLevel;
    }

    if (courseId) {
      matchConditions.course_id = courseId;
    }

    let fees = await StudentFee.find(matchConditions)
      .populate("student_id", "fullName email enrollment_number")
      .populate("course_id", "name code")
      .lean();

    let defaulters = [];

    fees.forEach((fee) => {
      if (!fee.student_id || !fee.course_id) return;

      fee.installments.forEach((installment) => {
        if (!installment.dueDate || !installment._id) return;

        const daysOverdue = calculateDaysOverdue(installment.dueDate);
        const escalation = installment.escalationLevel || getEscalationLevel(daysOverdue);

        if (escalationLevel && escalation !== escalationLevel) return;

        if (search && fee.student_id) {
          const searchLower = search.toLowerCase();
          const matchesName = (fee.student_id.fullName || "").toLowerCase().includes(searchLower);
          const matchesEnrollment = (fee.student_id.enrollment_number || "").toLowerCase().includes(searchLower);
          const matchesEmail = (fee.student_id.email || "").toLowerCase().includes(searchLower);
          if (!matchesName && !matchesEnrollment && !matchesEmail) return;
        }

        defaulters.push({
          student: {
            id: fee.student_id._id,
            name: fee.student_id.fullName,
            email: fee.student_id.email,
            enrollmentNumber: fee.student_id.enrollment_number,
          },
          course: {
            id: fee.course_id._id,
            name: fee.course_id.name,
            code: fee.course_id.code,
          },
          installment: {
            id: installment._id,
            name: installment.name,
            amount: installment.amount,
            dueDate: installment.dueDate,
            daysOverdue,
            escalationLevel: escalation,
          },
          pendingAmount: installment.amount,
        });
      });
    });

    const summary = {
      totalDefaulters: [...new Set(defaulters.map(d => d.student.id))].length,
      totalPendingAmount: defaulters.reduce((sum, d) => sum + d.pendingAmount, 0),
      byEscalation: {
        DUE_TODAY: defaulters.filter(d => d.installment.escalationLevel === "DUE_TODAY").length,
        SLIGHTLY_OVERDUE: defaulters.filter(d => d.installment.escalationLevel === "SLIGHTLY_OVERDUE").length,
        MODERATELY_OVERDUE: defaulters.filter(d => d.installment.escalationLevel === "MODERATELY_OVERDUE").length,
        SEVERELY_OVERDUE: defaulters.filter(d => d.installment.escalationLevel === "SEVERELY_OVERDUE").length,
        CRITICALLY_OVERDUE: defaulters.filter(d => d.installment.escalationLevel === "CRITICALLY_OVERDUE").length,
      },
    };

    res.json({
      success: true,
      defaulters,
      summary,
    });
  } catch (error) {
    next(error);
  }
};
