const cron = require('node-cron');
const StudentFee = require('../models/studentFee.model');
const stripe = require('../services/stripe.service');

/**
 * PAYMENT SESSION CLEANUP CRON
 * 
 * Purpose:
 * - Clean up expired/abandoned Stripe checkout sessions
 * - Reset installment status for failed payments
 * - Send notifications for long-overdue payments
 * 
 * Runs every hour
 */

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
  console.log('🕐 [CRON] Payment Session Cleanup - Starting...');
  
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    /* =====================================================
       1. CLEANUP: Expired checkout sessions (older than 1 hour)
    ===================================================== */
    console.log('🔍 Checking for expired checkout sessions...');
    
    const expiredSessions = await StudentFee.find({
      'installments': {
        $elemMatch: {
          status: 'PENDING',
          stripeSessionId: { $exists: true },
          paymentAttemptAt: { $lt: oneHourAgo }
        }
      }
    });

    let cleanedCount = 0;
    
    for (const feeRecord of expiredSessions) {
      let needsSave = false;
      
      for (const installment of feeRecord.installments) {
        if (installment.status === 'PENDING' && 
            installment.stripeSessionId && 
            installment.paymentAttemptAt < oneHourAgo) {
          
          try {
            // Check Stripe session status
            const session = await stripe.checkout.sessions.retrieve(installment.stripeSessionId);
            
            if (session.status === 'expired' || session.status === 'open') {
              // Mark as failed/cancelled
              installment.status = 'CANCELLED';
              installment.paymentFailureReason = 'Session expired - customer did not complete payment';
              needsSave = true;
              cleanedCount++;
              
              console.log(`✅ Marked installment ${installment.name} as CANCELLED for student ${feeRecord.student_id}`);
            }
          } catch (error) {
            // Session not found or other error - mark as cancelled
            installment.status = 'CANCELLED';
            installment.paymentFailureReason = 'Payment session error: ' + error.message;
            needsSave = true;
            cleanedCount++;
          }
        }
      }
      
      if (needsSave) {
        await feeRecord.save();
      }
    }
    
    console.log(`✅ Cleaned up ${cleanedCount} expired payment sessions`);

    /* =====================================================
       2. RECOVERY: Reset FAILED payments older than 24 hours
       (Allow students to retry payment)
    ===================================================== */
    console.log('🔄 Checking for failed payments to reset...');
    
    const failedPayments = await StudentFee.find({
      'installments': {
        $elemMatch: {
          status: 'FAILED',
          paymentAttemptAt: { $lt: twentyFourHoursAgo }
        }
      }
    });
    
    let resetCount = 0;
    
    for (const feeRecord of failedPayments) {
      let needsSave = false;
      
      for (const installment of feeRecord.installments) {
        if (installment.status === 'FAILED' && installment.paymentAttemptAt < twentyFourHoursAgo) {
          // Reset to PENDING so student can retry
          installment.status = 'PENDING';
          installment.paymentFailureReason = undefined;
          needsSave = true;
          resetCount++;
          
          console.log(`🔄 Reset failed installment ${installment.name} to PENDING for student ${feeRecord.student_id}`);
        }
      }
      
      if (needsSave) {
        await feeRecord.save();
      }
    }
    
    console.log(`🔄 Reset ${resetCount} failed payments to PENDING status`);

    /* =====================================================
       3. ALERT: Long-overdue payments (7+ days past due date)
    ===================================================== */
    console.log('⚠️ Checking for long-overdue payments...');
    
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const overduePayments = await StudentFee.find({
      'installments': {
        $elemMatch: {
          status: 'PENDING',
          dueDate: { $lt: sevenDaysAgo },
          reminderSent: false
        }
      }
    }).populate('student_id');
    
    let alertCount = 0;
    
    for (const feeRecord of overduePayments) {
      for (const installment of feeRecord.installments) {
        if (installment.status === 'PENDING' && 
            installment.dueDate < sevenDaysAgo && 
            !installment.reminderSent) {
          
          // Mark reminder as sent
          installment.reminderSent = true;
          await feeRecord.save();
          
          // TODO: Send escalation email to student and admin
          console.log(`⚠️ Long-overdue payment alert for installment ${installment.name} - student ${feeRecord.student_id?.email}`);
          
          alertCount++;
        }
      }
    }
    
    console.log(`⚠️ Sent ${alertCount} overdue payment alerts`);

    console.log('✅ [CRON] Payment Session Cleanup - Completed');
    
  } catch (error) {
    console.error('❌ [CRON] Payment Session Cleanup Error:', error.message);
  }
});

console.log('✅ Payment Session Cleanup cron job registered');
