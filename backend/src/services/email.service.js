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
