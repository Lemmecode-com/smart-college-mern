const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const StudentFee = require('../models/studentFee.model');
const Student = require('../models/student.model');
const { sendPaymentReceiptEmail } = require('../services/email.service');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * STRIPE WEBHOOK HANDLER
 * 
 * Purpose:
 * - Automatically update database when payment is completed
 * - More reliable than frontend-based confirmation
 * - Works even if student closes browser
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  console.log('📍 Webhook received');
  console.log('  - Signature:', sig ? 'Present' : 'Missing');
  console.log('  - Endpoint Secret:', endpointSecret ? 'Configured' : 'NOT CONFIGURED');

  // ✅ Step 1: Verify webhook signature (security)
  if (endpointSecret) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log('✅ Webhook signature verified');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // No signature verification (for testing without secret)
    console.log('⚠️  Skipping signature verification (no secret configured)');
    event = req.body;
  }

  // ✅ Step 2: Handle the event
  console.log(`📍 Event received: ${event.type}`);

  try {
    switch (event.type) {
      /* ========================================
         CHECKOUT SESSION COMPLETED
         Student completed payment on Stripe
      ======================================== */
      case 'checkout.session.completed': {
        console.log('💰 Processing checkout.session.completed');
        
        const session = event.data.object;
        console.log('  - Session ID:', session.id);
        console.log('  - Payment Status:', session.payment_status);
        console.log('  - Amount:', session.amount_total / 100);
        console.log('  - Currency:', session.currency);
        
        // Extract metadata (we sent this when creating session)
        const { studentId, installmentName } = session.metadata;
        console.log('  - Student ID:', studentId);
        console.log('  - Installment:', installmentName);

        if (!studentId || !installmentName) {
          console.error('❌ Missing metadata in session');
          return res.status(400).send('Missing metadata');
        }

        // Find student fee record
        const studentFee = await StudentFee.findOne({
          student_id: studentId
        });

        if (!studentFee) {
          console.error('❌ Fee record not found for student:', studentId);
          return res.status(404).send('Fee record not found');
        }

        console.log('✅ Fee record found');

        // Find the specific installment
        const installment = studentFee.installments.find(
          (i) => i.name === installmentName
        );

        if (!installment) {
          console.error('❌ Installment not found:', installmentName);
          return res.status(404).send('Installment not found');
        }

        console.log('✅ Installment found:', installment.name);

        // Check if already paid
        if (installment.status === 'PAID') {
          console.log('⏭️  Installment already paid');
          return res.send('Already paid');
        }

        // ✅ Mark installment as PAID
        installment.status = 'PAID';
        installment.paidAt = new Date();
        installment.transactionId = session.payment_intent;
        installment.paymentGateway = 'STRIPE';
        installment.stripeSessionId = session.id;

        // Recalculate total paid amount
        studentFee.paidAmount = studentFee.installments
          .filter((i) => i.status === 'PAID')
          .reduce((sum, i) => sum + i.amount, 0);

        await studentFee.save();

        console.log('✅ Payment recorded in database');
        console.log('  - Paid Amount:', studentFee.paidAmount);
        console.log('  - Remaining:', studentFee.totalFee - studentFee.paidAmount);

        // ✅ Send receipt email to student
        try {
          const student = await Student.findById(studentId);
          if (student) {
            await sendPaymentReceiptEmail({
              to: student.email,
              studentName: student.fullName,
              installment,
              totalFee: studentFee.totalFee,
              paidAmount: studentFee.paidAmount,
              remainingAmount: studentFee.totalFee - studentFee.paidAmount
            });
            console.log('✅ Receipt email sent to:', student.email);
          }
        } catch (emailErr) {
          console.error('⚠️  Failed to send receipt email:', emailErr.message);
          // Don't fail the webhook if email fails
        }

        break;
      }

      /* ========================================
         PAYMENT INTENT SUCCEEDED
         Payment confirmed by Stripe
      ======================================== */
      case 'payment_intent.succeeded': {
        console.log('💰 Processing payment_intent.succeeded');
        
        const paymentIntent = event.data.object;
        console.log('  - Payment Intent ID:', paymentIntent.id);
        console.log('  - Amount:', paymentIntent.amount / 100);
        
        // Optional: Additional handling if needed
        // Usually checkout.session.completed is enough
        
        break;
      }

      /* ========================================
         PAYMENT INTENT PAYMENT FAILED
         Payment failed
      ======================================== */
      case 'payment_intent.payment_failed': {
        console.log('❌ Processing payment_intent.payment_failed');
        
        const paymentIntent = event.data.object;
        console.log('  - Payment Intent ID:', paymentIntent.id);
        console.log('  - Failure Message:', paymentIntent.last_payment_error?.message);
        
        // Optional: Notify student about failed payment
        // You could add logic here to send failure notification
        
        break;
      }

      /* ========================================
         OTHER EVENTS
         Add more handlers as needed
      ======================================== */
      default:
        console.log(`⏭️  Unhandled event type: ${event.type}`);
    }

    // ✅ Step 3: Acknowledge receipt
    console.log('✅ Webhook processed successfully');
    res.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook handler error:', error.message);
    console.error(error.stack);
    
    // Return 500 to Stripe so they retry
    return res.status(500).send('Webhook handler failed');
  }
};
