const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

// ✅ Test email connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error.message);
    console.error('❌ Check EMAIL_USER and EMAIL_PASS in .env file');
  } else {
    console.log('✅ Email transporter ready and connected');
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

/**
 * Send Student Registration Success Email
 */
exports.sendRegistrationSuccessEmail = async ({
  to,
  studentName,
  collegeName,
  courseName,
  admissionYear
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `📝 Registration Successful - ${collegeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #17a2b8;">📝 Registration Successful!</h2>

        <p>Dear <b>${studentName}</b>,</p>
        <p>Thank you for registering with <b>${collegeName}</b>.</p>
        <p>Your registration has been successfully submitted and is currently <b style="color: #ffc107;">pending approval</b> by the admission office.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a4b6d;">Registration Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>College:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${collegeName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Course:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${courseName || 'To be allocated'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Academic Year:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${admissionYear}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Status:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;"><span style="color: #ffc107; font-weight: bold;">⏳ Pending Approval</span></td>
            </tr>
          </table>
        </div>

        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1a4b6d;">📋 What Happens Next?</h4>
          <ul style="margin: 10px 0; padding-left: 20px; color: #495057;">
            <li>The admission office will review your application</li>
            <li>You will receive an email once your application is approved</li>
            <li>After approval, you can log in to the student portal</li>
            <li>Complete the fee payment process to confirm your admission</li>
          </ul>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="margin-top: 0; color: #856404;">⏱️ Expected Timeline</h4>
          <p style="color: #856404; margin-bottom: 0;">
            Your application will be reviewed within <b>3-5 working days</b>. 
            Please keep checking your email for updates.
          </p>
        </div>

        <p style="color: #6c757d; font-size: 14px;">
          If you have any questions, please contact the admission office.
        </p>

        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;"/>
        <p style="color: #6c757d; font-size: 12px; text-align: center;">This is an automated message. Please do not reply.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Registration success email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send registration email to ${to}:`, error.message);
  }
};

/**
 * Send Admission Approval Email
 */
exports.sendAdmissionApprovalEmail = async ({
  to,
  studentName,
  courseName,
  collegeName,
  admissionYear,
  enrollmentNumber
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `🎉 Admission Approved - ${collegeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">🎉 Congratulations! Admission Approved</h2>

        <p>Dear <b>${studentName}</b>,</p>
        <p>We are pleased to inform you that your admission has been <b style="color: #28a745;">approved</b> for the academic year <b>${admissionYear}</b>.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a4b6d;">Admission Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>College:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${collegeName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Course:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${courseName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Enrollment Number:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${enrollmentNumber || 'Will be assigned shortly'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Academic Year:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${admissionYear}</td>
            </tr>
          </table>
        </div>

        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1a4b6d;">📋 Next Steps</h4>
          <ul style="margin: 10px 0; padding-left: 20px; color: #495057;">
            <li>Log in to your student portal to view your fee structure</li>
            <li>Complete the fee payment process</li>
            <li>Download your admission letter from the documents section</li>
            <li>Check your course timetable and subject allocation</li>
          </ul>
        </div>

        <p style="color: #6c757d; font-size: 14px;">
          Welcome to our college community! We look forward to seeing you thrive academically.
        </p>

        <br/>
        <p>Regards,<br/><b>Admissions Team</b><br/>${collegeName}</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Admission approval email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send admission approval email to ${to}:`, error.message);
  }
};

/**
 * Send Admission Rejection Email
 */
exports.sendAdmissionRejectionEmail = async ({
  to,
  studentName,
  collegeName,
  reason
}) => {
  console.log('📧 [EMAIL SERVICE] sendAdmissionRejectionEmail called');
  console.log('📧 [EMAIL SERVICE] Email config:', {
    EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
    EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
    to,
    studentName,
    collegeName,
    reason
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Admission Application Status - ${collegeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6c757d;">Admission Application Update</h2>

        <p>Dear <b>${studentName}</b>,</p>
        <p>Thank you for applying to ${collegeName}.</p>
        <p>After careful review, we regret to inform you that your admission application has been <b style="color: #dc3545;">not approved</b> at this time.</p>

        ${reason ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="margin-top: 0; color: #856404;">Reason for Rejection</h4>
          <p style="color: #856404; margin-bottom: 0;">${reason}</p>
        </div>
        ` : ''}

        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1a4b6d;">📝 What's Next?</h4>
          <ul style="margin: 10px 0; padding-left: 20px; color: #495057;">
            <li>You can reapply with corrected/updated information if applicable</li>
            <li>Contact the admission office for clarification</li>
            <li>Check if you meet all eligibility criteria for your chosen course</li>
          </ul>
        </div>

        <p style="color: #6c757d; font-size: 14px;">If you have any questions, please contact our admission office.</p>

        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;"/>
        <p style="color: #6c757d; font-size: 12px; text-align: center;">This is an automated message. Please do not reply.</p>
      </div>
    `
  };

  try {
    console.log('📧 [EMAIL SERVICE] Sending email via transporter...');
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 [EMAIL SERVICE] Email sent successfully! Message ID:', info.messageId);
    console.log(`✅ Admission rejection email sent to ${to}`);
  } catch (error) {
    console.error('❌ [EMAIL SERVICE] Failed to send email:', error.message);
    console.error('❌ [EMAIL SERVICE] Error stack:', error.stack);
    throw error; // Re-throw so the caller knows it failed
  }
};

/**
 * Send Low Attendance Alert Email to Student
 */
exports.sendLowAttendanceAlertEmail = async ({
  to,
  studentName,
  attendancePercentage,
  courseName,
  collegeName,
  minimumRequired = 75
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `⚠️ Low Attendance Alert - ${collegeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">⚠️ Low Attendance Alert</h2>

        <p>Dear <b>${studentName}</b>,</p>
        <p>This is to inform you that your current attendance is <b style="color: #dc3545;">below the minimum required threshold</b>.</p>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">Attendance Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Course:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${courseName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Current Attendance:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; color: #dc3545; font-weight: bold;">${attendancePercentage}%</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Minimum Required:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${minimumRequired}%</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><b>Deficit:</b></td>
              <td style="padding: 10px 0; text-align: right; color: #dc3545; font-weight: bold;">${minimumRequired - attendancePercentage}%</td>
            </tr>
          </table>
        </div>

        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h4 style="margin-top: 0; color: #721c24;">⚠️ Important Notice</h4>
          <p style="margin: 10px 0; color: #721c24;">
            Students with attendance below ${minimumRequired}% may not be eligible to appear for examinations.
          </p>
        </div>

        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h4 style="margin-top: 0; color: #155724;">💡 Recommendations</h4>
          <ul style="margin: 10px 0; padding-left: 20px; color: #155724;">
            <li>Attend all upcoming classes regularly</li>
            <li>Meet with your course coordinator for guidance</li>
            <li>Submit medical certificates if absence was due to illness</li>
            <li>Request condonation if eligible (subject to college policies)</li>
          </ul>
        </div>

        <p style="color: #6c757d; font-size: 14px;">
          Please take this matter seriously and improve your attendance to avoid academic penalties.
        </p>

        <br/>
        <p>Regards,<br/><b>Academic Office</b><br/>${collegeName}</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Low attendance alert sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send low attendance alert to ${to}:`, error.message);
  }
};

/**
 * Send Low Attendance Alert Email to Parents
 */
exports.sendLowAttendanceAlertToParents = async ({
  to,
  parentName,
  studentName,
  attendancePercentage,
  courseName,
  collegeName,
  minimumRequired = 75
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `⚠️ Low Attendance Alert - ${studentName} - ${collegeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">⚠️ Low Attendance Alert</h2>

        <p>Dear <b>${parentName || 'Parent/Guardian'}</b>,</p>
        <p>This is to bring to your kind attention that your ward's attendance is currently <b style="color: #dc3545;">below the minimum required threshold</b> at ${collegeName}.</p>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">Student Attendance Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Student Name:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${studentName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Course:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${courseName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Current Attendance:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right; color: #dc3545; font-weight: bold;">${attendancePercentage}%</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><b>Minimum Required:</b></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${minimumRequired}%</td>
            </tr>
          </table>
        </div>

        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h4 style="margin-top: 0; color: #721c24;">⚠️ Academic Impact</h4>
          <p style="margin: 10px 0; color: #721c24;">
            As per college regulations, students with attendance below ${minimumRequired}% may not be permitted to appear for semester examinations.
          </p>
        </div>

        <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1a4b6d;">📞 Action Required</h4>
          <p style="margin: 10px 0; color: #495057;">
            We request you to discuss this matter with your ward and ensure regular class attendance henceforth. 
            For any queries or clarifications, please contact the academic office.
          </p>
        </div>

        <br/>
        <p>Regards,<br/><b>Academic Office</b><br/>${collegeName}</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Low attendance alert sent to parent ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send low attendance alert to parent ${to}:`, error.message);
  }
};

/**
 * Send OTP Email for Password Reset
 */
exports.sendOTPEmail = async ({ to, otp, userType, expiresIn }) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Password Reset OTP - College ERP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a4b6d;">🔐 Password Reset Request</h2>

        <p>Hello,</p>
        <p>We received a request to reset your password for your <b>${userType}</b> account.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6c757d;">Your One-Time Password (OTP) is:</p>
          <h1 style="color: #1a4b6d; margin: 10px 0; font-size: 2.5rem; letter-spacing: 5px;">
            ${otp}
          </h1>
          <p style="color: #dc3545; font-weight: 600;">
            ⏰ Valid for ${expiresIn} minutes only
          </p>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 14px;">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Do not share this OTP with anyone</li>
              <li>This OTP is valid for ${expiresIn} minutes only</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </p>
        </div>

        <p style="color: #6c757d; font-size: 14px;">
          For security reasons, never share your password or OTP with anyone, including College ERP staff.
        </p>

        <br/>
        <p>Regards,<br/><b>College ERP Team</b></p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
