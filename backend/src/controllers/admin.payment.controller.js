const StudentFee = require("../models/studentFee.model");
const { getPaymentOverdueReport } = require("../services/paymentReminder.service");

/**
 * COLLEGE ADMIN: Payment report
 */
exports.getCollegePaymentReport = async (req, res) => {
  try {
    const collegeId = req.college_id;

    const fees = await StudentFee.find({
      college_id: collegeId
    })
      .populate("student_id", "fullName email")
      .populate("course_id", "name");

    let totalCollected = 0;

    const report = fees.map(fee => {
      totalCollected += fee.paidAmount;

      return {
        student: fee.student_id,
        course: fee.course_id,
        totalFee: fee.totalFee,
        paidAmount: fee.paidAmount,
        pendingAmount: fee.totalFee - fee.paidAmount,
        installments: fee.installments
      };
    });

    res.json({
      totalCollected,
      totalStudents: report.length,
      report
    });

  } catch (error) {
    console.error("Admin payment report error:", error);
    res.status(500).json({
      message: "Failed to fetch payment report"
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
      ...report
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
    const { sendPaymentDueReminders } = require("../services/paymentReminder.service");
    const result = await sendPaymentDueReminders();
    
    res.json({
      success: true,
      message: "Payment reminders processed successfully",
      ...result
    });
  } catch (error) {
    next(error);
  }
};