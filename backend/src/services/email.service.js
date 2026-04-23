const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === "465", // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
});

// ✅ Test email connection on startup
transporter.verify((error, success) => {
  if (error) {
    logger.logError("❌ Email transporter verification failed", {
      error: error.message,
    });
    logger.logError("❌ Check EMAIL_USER and EMAIL_PASS in .env file");
  } else {
    logger.logInfo("✅ Email transporter ready and connected");
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
    `,
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
  remainingAmount,
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
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">₹${installment.amount.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;"><b>Payment Date:</b></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${new Date(installment.paidAt).toLocaleDateString("en-IN")}</td>
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
              <td style="text-align: right;"><b>₹${totalFee.toLocaleString("en-IN")}</b></td>
            </tr>
            <tr>
              <td>Paid Amount:</td>
              <td style="text-align: right; color: #28a745;"><b>₹${paidAmount.toLocaleString("en-IN")}</b></td>
            </tr>
            <tr>
              <td>Remaining Amount:</td>
              <td style="text-align: right; color: #dc3545;"><b>₹${remainingAmount.toLocaleString("en-IN")}</b></td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6c757d; font-size: 14px;">
          This is an automatically generated receipt. Please save this email for your records.
        </p>
        
        <br/>
        <p>Regards,<br/><b>College ERP Team</b></p>
      </div>
    `,
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
  admissionYear,
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
              <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${courseName || "To be allocated"}</td>
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
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.logInfo("✅ Registration success email sent", {
      recipient: to.split("@")[0] + "@***",
    });
  } catch (error) {
    logger.logError("❌ Failed to send registration email", {
      error: error.message,
    });
  }
};

/**
 * Send Admission Approval Email with Login Credentials
 */
exports.sendAdmissionApprovalEmail = async ({
  to,
  studentName,
  courseName,
  collegeName,
  admissionYear,
  enrollmentNumber,
  loginUrl,
  email,
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `🎉 Admission Approved - ${collegeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1f6f8b 0%, #134952 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Admission Has Been Approved</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px; background: #ffffff; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px; color: #333;">Dear <strong>${studentName}</strong>,</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            We are pleased to inform you that your admission has been <strong style="color: #1f6f8b;">approved</strong> 
            for the academic year <strong>${admissionYear}</strong>.
          </p>

          <!-- Admission Details -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #1f6f8b; font-size: 18px;">📋 Admission Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>College:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${collegeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Course:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${courseName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6;"><strong>Enrollment Number:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #dee2e6; text-align: right;">${enrollmentNumber || "Will be assigned shortly"}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0;"><strong>Academic Year:</strong></td>
                <td style="padding: 10px 0; text-align: right;">${admissionYear}</td>
              </tr>
            </table>
          </div>

          <!-- Login Credentials -->
          <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #4caf50;">
            <h3 style="margin-top: 0; color: #2e7d32; font-size: 18px;">🔐 Your Login Credentials</h3>

            <p style="color: #555; font-size: 14px; margin-bottom: 15px;">
              You can now access your student portal to view your progress, attendance, and reports.
            </p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${loginUrl}"
                 style="background: linear-gradient(135deg, #1f6f8b 0%, #134952 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(31, 111, 139, 0.3);">
                🚀 Login to Student Portal
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin: 15px 0 0 0; text-align: center;">
              Login using your registered email: <br/>
              <strong style="color: #1f6f8b; font-size: 16px;">${email || to}</strong>
            </p>

            <p style="color: #999; font-size: 13px; margin: 10px 0 0 0; text-align: center; font-style: italic;">
              Use the password you created during registration
            </p>
          </div>

          <!-- Next Steps -->
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin-top: 0; color: #1565c0; font-size: 16px;">📌 Next Steps</h4>
            <ol style="margin: 10px 0; padding-left: 20px; color: #555; line-height: 1.8;">
              <li>Login to your student portal using your credentials</li>
              <li>Complete your profile information</li>
              <li>View your fee structure and make payments</li>
              <li>Download your admission letter from documents section</li>
              <li>Check your course timetable and subject allocation</li>
            </ol>
          </div>

          <!-- Support -->
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff9800;">
            <p style="margin: 0; color: #e65100; font-size: 14px;">
              <strong>💡 Need Help?</strong> If you face any issues, contact the admission office at 
              <a href="mailto:${process.env.SUPPORT_EMAIL || "support@college.edu"}" style="color: #e65100;">
                ${process.env.SUPPORT_EMAIL || "support@college.edu"}
              </a>
            </p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 25px;">
            Welcome to our college community! We look forward to seeing you thrive academically.
          </p>

          <p style="color: #333; margin-top: 30px;">
            Regards,<br/>
            <strong>Admissions Team</strong><br/>
            ${collegeName}
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated message. Please do not reply to this email.<br/>
            © ${new Date().getFullYear()} ${collegeName}. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.logInfo("✅ Admission approval email sent", {
      recipient: to.split("@")[0] + "@***",
    });
    return true;
  } catch (error) {
    logger.logError("❌ Failed to send admission approval email", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Send Admission Rejection Email
 */
exports.sendAdmissionRejectionEmail = async ({
  to,
  studentName,
  collegeName,
  reason,
}) => {
  logger.logInfo("📧 [EMAIL SERVICE] sendAdmissionRejectionEmail called", {
    recipient: to.split("@")[0] + "@***",
  });
  logger.logInfo("📧 [EMAIL SERVICE] Email config", {
    EMAIL_USER: process.env.EMAIL_USER ? "SET" : "NOT SET",
    EMAIL_PASS: process.env.EMAIL_PASS ? "SET" : "NOT SET",
    studentName,
    collegeName,
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

        ${
          reason
            ? `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="margin-top: 0; color: #856404;">Reason for Rejection</h4>
          <p style="color: #856404; margin-bottom: 0;">${reason}</p>
        </div>
        `
            : ""
        }

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
    `,
  };

  try {
    logger.logInfo("📧 [EMAIL SERVICE] Sending email via transporter...");
    const info = await transporter.sendMail(mailOptions);
    logger.logInfo("📧 [EMAIL SERVICE] Email sent successfully", {
      messageId: info.messageId,
    });
    logger.logInfo("✅ Admission rejection email sent", {
      recipient: to.split("@")[0] + "@***",
    });
  } catch (error) {
    logger.logError("❌ [EMAIL SERVICE] Failed to send email", {
      error: error.message,
    });
    logger.logError("❌ [EMAIL SERVICE] Error stack", { error: error.stack });
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
  minimumRequired = 75,
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
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.logInfo("✅ Low attendance alert sent", {
      recipient: to.split("@")[0] + "@***",
    });
  } catch (error) {
    logger.logError("❌ Failed to send low attendance alert", {
      error: error.message,
    });
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
  minimumRequired = 75,
}) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `⚠️ Low Attendance Alert - ${studentName} - ${collegeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">⚠️ Low Attendance Alert</h2>

        <p>Dear <b>${parentName || "Parent/Guardian"}</b>,</p>
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
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.logInfo("✅ Low attendance alert sent to parent", {
      recipient: to.split("@")[0] + "@***",
    });
  } catch (error) {
    logger.logError("❌ Failed to send low attendance alert to parent", {
      error: error.message,
    });
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

/**
 * Send Email to College Admin from Super Admin
 */
exports.sendEmailToCollegeAdmin = async ({
  to,
  collegeName,
  subject,
  message,
}) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: subject || `Regarding ${collegeName} - Smart College Management`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📧 Message from Super Admin</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Smart College Management System</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px; background: #ffffff; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear College Admin,</p>

          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            You have received the following message regarding <strong>${collegeName}</strong>:
          </p>

          <!-- Message Box -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1a4b6d;">
            <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <!-- Action Required -->
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin-top: 0; color: #1565c0; font-size: 16px;">📌 Action Required</h4>
            <p style="color: #555; font-size: 14px; margin-bottom: 0;">
              Please review the message above and take appropriate action. If you need any assistance, 
              feel free to reach out to the support team.
            </p>
          </div>

          <!-- Support -->
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff9800;">
            <p style="margin: 0; color: #e65100; font-size: 14px;">
              <strong>💡 Need Help?</strong> Contact support at 
              <a href="mailto:${process.env.SUPPORT_EMAIL || "support@smartcollege.com"}" style="color: #e65100;">
                ${process.env.SUPPORT_EMAIL || "support@smartcollege.com"}
              </a>
            </p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 25px;">
            Best regards,<br/>
            <strong>Super Admin Team</strong><br/>
            Smart College Management System
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated message from Smart College Management System.<br/>
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.logInfo("✅ Email sent to college admin", {
      recipient: to.split("@")[0] + "@***",
      messageId: info.messageId,
    });
    return true;
  } catch (error) {
    logger.logError("❌ Failed to send email to college admin", {
      error: error.message,
    });
    throw error;
  }
};
