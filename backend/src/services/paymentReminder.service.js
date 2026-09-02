const StudentFee = require("../models/studentFee.model");
const Student = require("../models/student.model");
const { sendPaymentReminderEmail } = require("./email.service");
const Notification = require("../models/notification.model");
const CollegeEmailConfig = require("../models/collegeEmailConfig.model");

/**
 * Calculate days overdue
 * @param {Date} dueDate - The due date
 * @returns {number} Number of days overdue (0 if not overdue)
 */
const calculateDaysOverdue = (dueDate) => {
  const today = new Date();
  const diffMs = today - new Date(dueDate);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Get escalation level based on days overdue
 * @param {number} daysOverdue - Number of days overdue
 * @returns {string} Escalation level
 */
const getEscalationLevel = (daysOverdue) => {
  if (daysOverdue === 0) return "DUE_TODAY";
  if (daysOverdue <= 7) return "SLIGHTLY_OVERDUE";
  if (daysOverdue <= 15) return "MODERATELY_OVERDUE";
  if (daysOverdue <= 30) return "SEVERELY_OVERDUE";
  return "CRITICALLY_OVERDUE";
};

/**
 * Get reminder message based on escalation level
 * @param {string} level - Escalation level
 * @param {number} daysOverdue - Number of days overdue
 * @param {number} amount - Amount due
 * @returns {object} Title and message for the reminder
 */
const getReminderMessage = (level, daysOverdue, amount) => {
  const messages = {
    DUE_TODAY: {
      title: "Payment Due Today",
      message: `Your fee payment of ₹${amount} is due today. Please pay before end of day to avoid late fees.`
    },
    SLIGHTLY_OVERDUE: {
      title: "Payment Overdue - Immediate Action Required",
      message: `Your fee payment of ₹${amount} is ${daysOverdue} days overdue. Please pay immediately to avoid penalties.`
    },
    MODERATELY_OVERDUE: {
      title: "URGENT: Payment Overdue",
      message: `Your fee payment of ₹${amount} is ${daysOverdue} days overdue. Late fees may apply. Please pay immediately.`
    },
    SEVERELY_OVERDUE: {
      title: "FINAL NOTICE: Payment Overdue",
      message: `Your fee payment of ₹${amount} is ${daysOverdue} days overdue. Your admission may be at risk. Contact accounts office immediately.`
    },
    CRITICALLY_OVERDUE: {
      title: "CRITICAL: Account Suspension Warning",
      message: `Your fee payment of ₹${amount} is ${daysOverdue} days overdue. Your student account may be suspended. Contact accounts office URGENTLY.`
    }
  };
  return messages[level] || messages.SLIGHTLY_OVERDUE;
};

/**
 * Send Payment Reminder with Escalation (FIX: Issue #10)
 * - Sends recurring reminders for overdue payments
 * - Differentiates between "due today" and various overdue levels
 * - Implements escalation mechanism for long-overdue payments
 */
exports.sendPaymentDueReminders = async () => {
  const today = new Date();
  let reminderCount = 0;
  let escalationCount = 0;

  try {
    // Find all students with pending installments
    const fees = await StudentFee.find({
      "installments.status": "PENDING"
    }).populate("student_id");

    const emailConfigCache = {};

    for (const fee of fees) {
      const student = fee.student_id;

      if (!student || student.status === "DELETED") continue;

      for (const installment of fee.installments) {
        if (installment.status === "PENDING") {
          const daysOverdue = calculateDaysOverdue(installment.dueDate);
          const escalationLevel = getEscalationLevel(daysOverdue);
          
          // Determine if we should send a reminder
          let shouldSendReminder = false;
          
          // Check if reminder was already sent for this escalation level
          const currentEscalation = installment.escalationLevel || "NONE";
          const shouldEscalate = escalationLevel !== currentEscalation;
          
          // Send reminder if:
          // 1. No reminder sent yet AND payment is due today or overdue
          // 2. OR escalation level has changed (e.g., from SLIGHTLY to MODERATELY overdue)
          // 3. OR it's been 7+ days since last reminder for critically overdue
          if (!installment.reminderSent && daysOverdue >= 0) {
            shouldSendReminder = true;
          } else if (shouldEscalate && daysOverdue > 0) {
            shouldSendReminder = true;
          } else if (daysOverdue >= 30 && !installment.finalNoticeSent) {
            shouldSendReminder = true;
          }

          if (shouldSendReminder) {
            const { title, message } = getReminderMessage(
              escalationLevel,
              daysOverdue,
              installment.amount
            );

            // Create in-app notification (always)
            await Notification.create({
              college_id: student.college_id,
              createdBy: student._id,
              createdByRole: "COLLEGE_ADMIN",
              target: "INDIVIDUAL",
              target_users: [student.user_id],
              title,
              message,
              type: "FEE",
              actionUrl: `/student/fees`,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });

            // Check SMTP config for this college (cached per college)
            const collegeKey = student.college_id.toString();
            if (!(collegeKey in emailConfigCache)) {
              emailConfigCache[collegeKey] = await CollegeEmailConfig.getActiveConfig(student.college_id);
            }

            // Attempt email only if SMTP is configured
            if (emailConfigCache[collegeKey]) {
              try {
                await sendPaymentReminderEmail({
                  to: student.email,
                  studentName: student.fullName,
                  installment,
                  daysOverdue,
                  escalationLevel,
                  subject: title,
                  collegeId: student.college_id
                });
              } catch (emailErr) {
                console.warn(`Failed to send payment reminder email for ${student.email}: ${emailErr.message}`);
              }
            } else {
              console.log(`Skipping email for college ${collegeKey} — SMTP not configured`);
            }

            // Update installment tracking (always)
            installment.reminderSent = true;
            installment.lastReminderDate = today;
            installment.escalationLevel = escalationLevel;
            installment.reminderCount = (installment.reminderCount || 0) + 1;

            if (escalationLevel === "CRITICALLY_OVERDUE") {
              installment.finalNoticeSent = true;
              escalationCount++;
            }

            reminderCount++;
          }
        }
      }

      await fee.save();
    }

    console.log(`Payment reminders sent: ${reminderCount}, Escalations: ${escalationCount}`);
    return { success: true, reminderCount, escalationCount };
  } catch (error) {
    console.error("Error sending payment reminders:", error);
    throw error;
  }
};

/**
 * Get Payment Overdue Report
 * Returns summary of overdue payments by escalation level
 */
exports.getPaymentOverdueReport = async () => {
  try {
    const fees = await StudentFee.find({
      "installments.status": "PENDING"
    }).populate("student_id");

    const report = {
      DUE_TODAY: [],
      SLIGHTLY_OVERDUE: [],
      MODERATELY_OVERDUE: [],
      SEVERELY_OVERDUE: [],
      CRITICALLY_OVERDUE: [],
      summary: {
        total: 0,
        totalAmount: 0
      }
    };

    for (const fee of fees) {
      const student = fee.student_id;
      if (!student || student.status === "DELETED") continue;

      for (const installment of fee.installments) {
        if (installment.status === "PENDING") {
          const daysOverdue = calculateDaysOverdue(installment.dueDate);
          if (daysOverdue >= 0) {
            const escalationLevel = getEscalationLevel(daysOverdue);
            report[escalationLevel].push({
              student: {
                id: student._id,
                name: student.fullName,
                email: student.email
              },
              installment: {
                amount: installment.amount,
                dueDate: installment.dueDate,
                daysOverdue
              }
            });
            report.summary.total++;
            report.summary.totalAmount += installment.amount;
          }
        }
      }
    }

    return report;
  } catch (error) {
    console.error("Error generating payment overdue report:", error);
    throw error;
  }
};
