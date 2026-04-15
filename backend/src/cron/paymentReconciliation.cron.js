const cron = require("node-cron");
const StudentFee = require("../models/studentFee.model");
const AppError = require("../utils/AppError");

/**
 * PAYMENT RECONCILIATION CRON JOB
 * 
 * Purpose:
 * - Detect payments stuck in PENDING state
 * - Flag discrepancies for admin review
 * - Prevent revenue loss from failed payment processing
 * 
 * FIX: Edge Case 4 - Payment During System Maintenance
 * 
 * Schedule: Every hour
 */

/**
 * Check for stuck payments
 * Payments in PENDING state for more than 1 hour are flagged
 */
const checkStuckPayments = async () => {
  try {
    console.log('🔍 [Payment Reconciliation] Starting stuck payment check...');
    
    // Find payments pending for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const stuckPayments = await StudentFee.find({
      "installments.status": "PENDING",
      "installments.paymentAttemptAt": { $lt: oneHourAgo },
      "installments.reconciliationStatus": { $ne: "RECONCILED" }
    }).populate("student_id", "fullName email");
    
    if (stuckPayments.length === 0) {
      console.log('✅ [Payment Reconciliation] No stuck payments found');
      return { found: 0, flagged: 0 };
    }
    
    console.log(`⚠️  [Payment Reconciliation] Found ${stuckPayments.length} stuck payments`);
    
    let flaggedCount = 0;
    
    // Flag each stuck payment
    for (const fee of stuckPayments) {
      for (const installment of fee.installments) {
        if (installment.status === "PENDING" && 
            installment.paymentAttemptAt && 
            installment.paymentAttemptAt < oneHourAgo &&
            installment.reconciliationStatus !== "RECONCILED") {
          
          // Mark for reconciliation
          installment.reconciliationStatus = "FLAGGED";
          installment.reconciliationFlag = "Payment attempt made but status still PENDING for >1 hour";
          installment.reconciliationCheckedAt = new Date();
        }
      }
      await fee.save();
      flaggedCount++;
    }
    
    console.log(`✅ [Payment Reconciliation] Flagged ${flaggedCount} payments for review`);
    
    return { found: stuckPayments.length, flagged: flaggedCount };
    
  } catch (error) {
    console.error('❌ [Payment Reconciliation] Error:', error.message);
    throw error;
  }
};

/**
 * Get reconciliation report for admin
 */
exports.getReconciliationReport = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const stuckPayments = await StudentFee.find({
      "installments.status": "PENDING",
      "installments.paymentAttemptAt": { $lt: oneHourAgo },
      "installments.reconciliationStatus": { $in: ["FLAGGED", "REQUIRES_ACTION"] }
    })
      .populate("student_id", "fullName email mobileNumber")
      .populate("course_id", "name code");
    
    const report = {
      totalStuckPayments: stuckPayments.length,
      totalAmount: 0,
      payments: []
    };
    
    for (const fee of stuckPayments) {
      for (const installment of fee.installments) {
        if (installment.reconciliationStatus === "FLAGGED" || 
            installment.reconciliationStatus === "REQUIRES_ACTION") {
          report.payments.push({
            feeId: fee._id,
            student: fee.student_id,
            course: fee.course_id,
            installment: {
              name: installment.name,
              amount: installment.amount,
              dueDate: installment.dueDate,
              attemptAt: installment.paymentAttemptAt,
              failureReason: installment.paymentFailureReason,
              status: installment.reconciliationStatus,
              flag: installment.reconciliationFlag
            }
          });
          report.totalAmount += installment.amount;
        }
      }
    }
    
    return report;
  } catch (error) {
    throw error;
  }
};

/**
 * Manual reconciliation by admin
 */
exports.reconcilePayment = async (feeId, installmentIndex, action, notes) => {
  try {
    const fee = await StudentFee.findById(feeId);
    
    if (!fee) {
      throw new AppError("Fee record not found", 404, "FEE_NOT_FOUND");
    }
    
    if (!fee.installments[installmentIndex]) {
      throw new AppError("Installment not found", 404, "INSTALLMENT_NOT_FOUND");
    }
    
    const installment = fee.installments[installmentIndex];
    
    // Apply action
    switch (action) {
      case "MARK_PAID":
        installment.status = "PAID";
        installment.paidAt = new Date();
        installment.reconciliationStatus = "RECONCILED";
        installment.reconciliationNotes = notes || "Manually reconciled as paid by admin";
        break;
        
      case "CANCEL":
        installment.status = "CANCELLED";
        installment.reconciliationStatus = "RECONCILED";
        installment.reconciliationNotes = notes || "Cancelled by admin after reconciliation";
        break;
        
      case "RESET":
        installment.status = "PENDING";
        installment.paymentAttemptAt = null;
        installment.paymentFailureReason = null;
        installment.reconciliationStatus = null;
        installment.reconciliationFlag = null;
        installment.reconciliationNotes = notes || "Reset for retry by admin";
        break;
        
      default:
        throw new AppError("Invalid action", 400, "INVALID_ACTION");
    }
    
    await fee.save();
    
    return {
      success: true,
      message: `Payment ${action.toLowerCase()} successfully`,
      installment
    };
    
  } catch (error) {
    throw error;
  }
};

// Schedule cron job to run every hour
cron.schedule("0 * * * *", async () => {
  console.log('\n' + '='.repeat(50));
  console.log('🕐 [Payment Reconciliation] Scheduled job started');
  console.log('='.repeat(50));
  
  try {
    const result = await checkStuckPayments();
    console.log(`📊 Result: Found ${result.found}, Flagged ${result.flagged}`);
  } catch (error) {
    console.error('❌ Job failed:', error.message);
  }
  
  console.log('🕐 [Payment Reconciliation] Job completed\n');
});

console.log('✅ [Payment Reconciliation] Cron job scheduled (every hour)');
