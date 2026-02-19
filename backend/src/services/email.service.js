const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendPaymentReminderEmail = async ({ to, studentName, installment }) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Fee Payment Reminder",
    html: `
      <p>Dear ${studentName},</p>
      <p>This is a reminder that your fee installment <b>${installment.name}</b>
      of amount <b>₹${installment.amount}</b> is due on
      <b>${installment.dueDate.toDateString()}</b>.</p>
      <p>Please log in to the portal and complete the payment.</p>
      <br/>
      <p>Regards,<br/>College ERP Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send Payment Receipt Email after successful payment
 */
exports.sendPaymentReceiptEmail = async ({ 
  to, 
  studentName, 
  installment,
  totalFee,
  paidAmount,
  remainingAmount
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Payment Receipt - College Fee",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">✅ Payment Successful!</h2>
        
        <p>Dear <b>${studentName}</b>,</p>
        <p>Your fee payment has been successfully processed.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><b>Installment:</b></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${installment.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><b>Amount Paid:</b></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">₹${installment.amount.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><b>Payment Date:</b></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${new Date(installment.paidAt).toLocaleDateString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><b>Transaction ID:</b></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${installment.transactionId}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Fee Summary</h4>
          <table style="width: 100%;">
            <tr>
              <td>Total Fee:</td>
              <td style="text-align: right;"><b>₹${totalFee.toLocaleString('en-IN')}</b></td>
            </tr>
            <tr>
              <td>Paid Amount:</td>
              <td style="text-align: right; color: #28a745;"><b>₹${paidAmount.toLocaleString('en-IN')}</b></td>
            </tr>
            <tr>
              <td>Remaining Amount:</td>
              <td style="text-align: right; color: #dc3545;"><b>₹${remainingAmount.toLocaleString('en-IN')}</b></td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6c757d; font-size: 14px;">
          This is an automatically generated receipt. Please save this email for your records.
        </p>
        
        <br/>
        <p>Regards,<br/><b>College ERP Team</b></p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};
