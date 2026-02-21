# Email Notifications Feature - Implementation Guide

## Overview
This document describes the email notification system implemented for Smart College ERP.

## Features Implemented

### 1. Payment Confirmation Emails ✅
**Trigger:** After successful payment via Stripe  
**Recipient:** Student  
**Template:** Professional payment receipt with transaction details

**Location:** `backend/src/controllers/stripe.payment.controller.js`

**Email Includes:**
- Payment confirmation message
- Installment details (name, amount, date, transaction ID)
- Fee summary (total fee, paid amount, remaining amount)
- Professional formatting with colors and tables

---

### 2. Admission Approval Emails ✅
**Trigger:** When admin approves a student admission  
**Recipient:** Student  
**Template:** Welcome email with admission details

**Location:** `backend/src/controllers/studentApproval.controller.js`

**Email Includes:**
- Congratulations message
- College and course details
- Enrollment number
- Academic year
- Next steps for the student

---

### 3. Low Attendance Alert Emails ✅
**Trigger:** Daily cron job at 10 AM  
**Recipients:** Students with attendance < 75%  
**Template:** Warning email with attendance summary

**Location:** 
- Service: `backend/src/services/lowAttendanceAlert.service.js`
- Cron: `backend/src/cron/lowAttendanceAlert.cron.js`

**Email Includes:**
- Current attendance percentage
- Minimum required threshold (75%)
- Attendance deficit calculation
- Important notices about exam eligibility
- Recommendations for improvement

---

## Email Service

**File:** `backend/src/services/email.service.js`

### Available Functions:

```javascript
// Payment Receipt
sendPaymentReceiptEmail({
  to, studentName, installment, totalFee, paidAmount, remainingAmount
})

// Admission Approval
sendAdmissionApprovalEmail({
  to, studentName, courseName, collegeName, admissionYear, enrollmentNumber
})

// Low Attendance Alert (Student)
sendLowAttendanceAlertEmail({
  to, studentName, attendancePercentage, courseName, collegeName, minimumRequired
})

// Low Attendance Alert (Parent)
sendLowAttendanceAlertToParents({
  to, parentName, studentName, attendancePercentage, courseName, collegeName, minimumRequired
})

// OTP (Existing)
sendOTPEmail({ to, otp, userType, expiresIn })

// Payment Reminder (Existing)
sendPaymentReminderEmail({ to, studentName, installment })
```

---

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password-here

# Important: For Gmail, you must:
# 1. Enable 2-Factor Authentication
# 2. Generate an App Password
# Visit: https://myaccount.google.com/apppasswords
```

### Setup Steps for Gmail:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication (if not already enabled)
3. Visit [App Passwords](https://myaccount.google.com/apppasswords)
4. Create a new app password for "Mail"
5. Copy the 16-character password
6. Paste it in `.env` as `EMAIL_PASS`

---

## Cron Jobs

### Payment Reminder
- **Schedule:** Daily at 9 AM
- **File:** `backend/src/cron/paymentReminder.cron.js`

### Low Attendance Alert
- **Schedule:** Daily at 10 AM
- **File:** `backend/src/cron/lowAttendanceAlert.cron.js`
- **Threshold:** 75% (configurable)

---

## Testing

### Manual Testing

1. **Payment Email:**
   ```bash
   # Complete a test payment via Stripe
   # Check student email for receipt
   ```

2. **Admission Email:**
   ```bash
   # Approve a pending student via admin panel
   # Check student email for approval notification
   ```

3. **Low Attendance Email:**
   ```bash
   # Run the cron job manually:
   node -e "require('./src/services/lowAttendanceAlert.service').sendLowAttendanceAlerts()"
   # Check emails of students with < 75% attendance
   ```

### Console Logs

All email functions include console logging:
- `✅ Email sent to [email]` on success
- `❌ Failed to send email: [error]` on failure

---

## Email Templates

All templates use:
- Responsive HTML design
- Professional color scheme
- Mobile-friendly layout
- Clear call-to-action sections
- College branding placeholders

---

## Error Handling

- All email sends are wrapped in try-catch blocks
- Failed emails are logged but don't block main operations
- Non-blocking async pattern used for integrations

---

## Future Enhancements

1. **Parent Email Integration:**
   - Add `parentEmail` field to Student model
   - Send attendance alerts to parents automatically

2. **Email Preferences:**
   - Allow students to opt-out of non-critical emails
   - Email notification settings in user profile

3. **Email Analytics:**
   - Track email open rates
   - Track click-through rates
   - Email delivery status

4. **Template Customization:**
   - Admin panel for customizing email templates
   - College branding (logo, colors)

---

## Troubleshooting

### Emails Not Sending?

1. **Check Gmail App Password:**
   - Ensure 2FA is enabled
   - Regenerate app password if needed

2. **Check Environment Variables:**
   ```bash
   # Verify .env file exists and has correct values
   cat .env | grep EMAIL
   ```

3. **Check Console Logs:**
   - Look for error messages in server console
   - Common errors: authentication failed, network issues

4. **Test SMTP Connection:**
   ```javascript
   // Add this to test email connectivity
   const transporter = require('./src/services/email.service');
   transporter.verify((error, success) => {
     if (error) console.error('SMTP Error:', error);
     else console.log('SMTP Connected:', success);
   });
   ```

---

## Security Notes

- Never commit `.env` file to version control
- Use app-specific passwords, not main account passwords
- Rotate passwords periodically
- Monitor email sending limits (Gmail: 500 emails/day)

---

## Files Modified/Created

### Modified:
- `backend/src/services/email.service.js` - Added new email functions
- `backend/src/controllers/stripe.payment.controller.js` - Payment email integration
- `backend/src/controllers/studentApproval.controller.js` - Admission email integration
- `backend/server.js` - Added low attendance cron

### Created:
- `backend/src/services/lowAttendanceAlert.service.js` - Low attendance service
- `backend/src/cron/lowAttendanceAlert.cron.js` - Low attendance cron job
- `backend/.env.example` - Environment configuration template
- `EMAIL_NOTIFICATIONS_GUIDE.md` - This documentation

---

## Success Criteria Status

| Criteria | Status |
|----------|--------|
| ✅ Emails sent after payment | Implemented |
| ✅ Emails sent after admission approval | Implemented |
| ✅ Email templates formatted properly | Implemented |
| ✅ Low attendance alerts | Implemented |

All success criteria have been met! ✅
