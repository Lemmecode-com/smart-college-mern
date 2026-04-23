# Smart College Email Workflow Documentation

## Table of Contents
1. [Overview](#overview)
2. [College Email Configuration](#college-email-configuration)
3. [Email Flow Architecture](#email-flow-architecture)
4. [Email Types & Triggers](#email-types--triggers)
5. [Test Cases](#test-cases)
6. [API Endpoints](#api-endpoints)
7. [Cache Management](#cache-management)

---

## Overview

The Smart College system supports per-college custom email configuration. Each college must configure their own SMTP server to send emails from their domain. There is **no fallback** - emails will fail if SMTP is not configured.

### Key Features
- Custom SMTP configuration per college
- Encrypted credential storage
- Transporter caching (5-minute TTL)
- Email verification before activation
- **No fallback** - emails will fail if SMTP is not configured

---

## College Email Configuration

### Configuration Fields

| Field              | Required | Description                                                |
|--------------------|----------|------------------------------------------------------------|
| `smtp.host`        | Yes      | SMTP server hostname (e.g., `smtp.gmail.com`)              |
| `smtp.port`        | Yes      | SMTP port (typically 587 for TLS, 465 for SSL)             |
| `smtp.secure`      | No       | `true` for port 465 (SSL), `false` for port 587 (TLS)      |
| `credentials.user` | Yes      | SMTP username/email                                        |
| `credentials.pass` | Yes      | SMTP password (encrypted before storage)                   |
| `fromName`         | Yes      | Display name for sender (e.g., "XYZ College - Admissions") |
| `fromEmail`        | Yes      | Sender email address (e.g., `admissions@college.edu`)      |

### Database Model

**Collection:** `collegeemailconfigs`

```javascript
{
  collegeId: ObjectId,        // Reference to College
  smtp: {
    host: String,              // SMTP server host
    port: Number,             // SMTP port
    secure: Boolean          // SSL/TLS flag
  },
  credentials: {
    user: String,             // SMTP username
    pass: String             // Encrypted password
  },
  fromName: String,           // Sender display name
  fromEmail: String,         // Sender email
  isActive: Boolean,        // Configuration active status
  lastVerifiedAt: Date,     // Last successful verification
  verifiedBy: ObjectId,     // User who verified
  createdAt: Date,
  updatedAt: Date
}
```

### Frontend Configuration Page

**Path:** `/system-settings/email-configuration`

College admins can:
1. Enter SMTP server details
2. Provide credentials
3. Set sender name and email
4. Test configuration with a verification email
5. Save or delete configuration

---

## Email Flow Architecture

### Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  College Admin   │────▶│  Frontend UI    │────▶│  Backend API      │
│  Configures      │     │  (EmailConfig) │     │  (Express)        │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                                                         │
                                                         ▼
                              ┌──────────────────────────────────┐
                              │  collegeEmailConfig.controller  │
                              └──────────────────────────────────┘
                                                         │
                                                         ▼
                              ┌──────────────────────────────────┐
                              │  collegeEmail.service.js         │
                              │  - saveCollegeEmailConfig()       │
                              │  - verifyCollegeEmailConfig()    │
                              │  - getCollegeEmailConfig()      │
                              └──────────────────────────────────┘
                                                         │
                                                         ▼
                              ┌──────────────────────────────────┐
                              │  MongoDB                         │
                              │  (CollegeEmailConfig Model)      │
                              └──────────────────────────────────┘
```

### Email Sending Flow

```
┌─────────────────────┐     ┌─────────────────────┐     ┌────────────────────┐
│  Trigger Event     │────▶│  Email Service      │────▶│  Transporter       │
│  (Payment, etc.)  │     │  (email.service)    │     │  (getCollegeTrans) │
└─────────────────────┘     └─────────────────────┘     └────────────────────┘
                                                                  │
                                                                  ▼
                              ┌──────────────────────────────────────────────┐
                              │  Cache Check (5-min TTL)                      │
                              │  - If cached & valid: use cached transporter    │
                              │  - If not cached: create new transporter       │
                              └──────────────────────────────────────────────┘
                                                                  │
                                                                  ▼
                              ┌──────────────────────────────────────────────┐
                              │  Nodemailer Transporter                       │
                              │  - Connects to SMTP server                    │
                              │  - Authenticates with credentials           │
                              └──────────────────────────────────────────────┘
                                                                  │
                                                                  ▼
                              ┌──────────────────────────────────────────────┐
                              │  SMTP Server                                  │
                              │  - Sends email to recipient                   │
                              └──────────────────────────────────────────────┘
```

---

## Email Types & Triggers

### 1. Payment Reminder Email
- **Function:** `sendPaymentReminderEmail()`
- **Trigger:** Scheduled job in `paymentReminder.service.js`
- **When:** Before fee installment due date
- **To:** Student
- **Fields:** student email, installment name, amount, due date

### 2. Payment Receipt Email
- **Function:** `sendPaymentReceiptEmail()`
- **Trigger:** 
  - Stripe webhook (`webhooks/stripe.webhook.js`)
  - Razorpay webhook (`webhooks/razorpay.webhook.js`)
  - Payment controllers
- **When:** Successful payment via Stripe/Razorpay
- **To:** Student
- **Fields:** student email, installment details, transaction ID, fee summary

### 3. Registration Success Email
- **Function:** `sendRegistrationSuccessEmail()`
- **Trigger:** `student.controller.js`
- **When:** New student registration submitted
- **To:** Student
- **Fields:** student name, college name, course, admission year

### 4. Admission Approval Email
- **Function:** `sendAdmissionApprovalEmail()`
- **Trigger:** `studentApproval.controller.js`
- **When:** College admin approves student admission
- **To:** Student
- **Fields:** login credentials, enrollment number, login URL

### 5. Admission Rejection Email
- **Function:** `sendAdmissionRejectionEmail()`
- **Trigger:** `studentApproval.controller.js`
- **When:** College admin rejects student admission
- **To:** Student
- **Fields:** rejection reason

### 6. Low Attendance Alert Email
- **Function:** `sendLowAttendanceAlertEmail()`
- **Trigger:** `lowAttendanceAlert.service.js`
- **When:** Student attendance falls below threshold (75%)
- **To:** Student

### 7. Low Attendance Alert to Parents
- **Function:** `sendLowAttendanceAlertToParents()`
- **Trigger:** `lowAttendanceAlert.service.js`
- **When:** Student attendance falls below threshold
- **To:** Parent/Guardian

### 8. Password Reset OTP Email
- **Function:** `sendOTPEmail()`
- **Trigger:** `otp.service.js`
- **When:** User requests password reset
- **To:** User (student/admin)
- **Fields:** OTP, user type, expiry time

### 9. Email to College Admin
- **Function:** `sendEmailToCollegeAdmin()`
- **Trigger:** Super admin sends message
- **When:** Super admin communicates with college
- **To:** College Admin

### 10. Account Status Email
- **Function:** `sendAccountStatusEmail()`
- **Trigger:** Account activation/deactivation
- **When:** Admin enables or disables student account
- **To:** Student

---

## Test Cases

### Test Case 1: Email Configuration Saved Successfully

**Preconditions:**
- College admin is logged in
- No existing email configuration

**Test Steps:**
1. Navigate to `/system-settings/email-configuration`
2. Enter SMTP host (e.g., `smtp.gmail.com`)
3. Enter SMTP port (e.g., `587`)
4. Enter username (e.g., `college@gmail.com`)
5. Enter password (app password)
6. Enter From Name (e.g., "ABC College - Admissions")
7. Enter From Email (e.g., `admissions@abccollege.edu`)
8. Click "Save Configuration"

**Expected Results:**
- Configuration saved successfully
- Status shows "Configured"
- Transporter cache cleared for this college

**Verification:**
```bash
GET /api/admin/email/config
Response: {
  "success": true,
  "configured": true,
  "isActive": true,
  "config": {
    "fromName": "ABC College - Admissions",
    "fromEmail": "admissions@abccollege.edu",
    "isActive": true
  }
}
```

---

### Test Case 2: Verification Email Sent Successfully

**Preconditions:**
- Email configuration saved
- Test email address available

**Test Steps:**
1. Navigate to email configuration page
2. Enter test email address (e.g., `test@example.com`)
3. Click "Verify & Send Test"

**Expected Results:**
- Test email sent to `test@example.com`
- Email appears to be from college's configured email
- Verification marked as successful
- `lastVerifiedAt` timestamp updated

**Verification:**
- Check test email inbox for email from `admissions@abccollege.edu`
- Call API: GET /api/admin/email/config
- Verify `lastVerifiedAt` is set to recent timestamp

---

### Test Case 3: Payment Receipt Email Sent on Successful Payment

**Preconditions:**
- College email configured and verified
- Student exists with registered email
- Fee installment configured

**Test Steps:**
1. Student makes payment via Stripe/Razorpay
2. Payment webhook triggered

**Expected Results:**
- Payment receipt email sent to student
- Email sent from college's configured email

**Email Details:**
- **From:** "ABC College - Admissions" <admissions@abccollege.edu>
- **To:** studentemail@college.edu
- **Subject:** "Payment Receipt - College Fee"
- **Content:** Payment details, transaction ID, amount paid

**Verification:**
```javascript
// In payment webhook handler
await sendPaymentReceiptEmail({
  to: student.email,
  studentName: student.firstName,
  installment: {
    name: "First Installment",
    amount: 25000,
    paidAt: new Date(),
    transactionId: "txn_123456"
  },
  totalFee: 100000,
  paidAmount: 25000,
  remainingAmount: 75000,
  collegeId: college._id
});
```

---

### Test Case 4: Admission Approval EmailSent to Student

**Preconditions:**
- College email configured
- Student application pending approval
- College admin logged in

**Test Steps:**
1. College admin approves student admission
2. System triggers sendAdmissionApprovalEmail()

**Expected Results:**
- Approval email sent to student
- Email contains login credentials

**Email Details:**
- **From:** "ABC College - Admissions" <admissions@abccollege.edu>
- **To:** student@email.com
- **Subject:** "Admission Approved - ABC College"
- **Content:** Congratulations message, login URL, credentials

**Verification:**
```javascript
await sendAdmissionApprovalEmail({
  to: student.email,
  studentName: student.firstName,
  courseName: "Computer Science",
  collegeName: "ABC College",
  admissionYear: "2024-25",
  enrollmentNumber: "ENR/2024/001",
  loginUrl: "https://portal.college.edu/login",
  email: student.email,
  collegeId: college._id
});
```

---

### Test Case 5: Low Attendance Alert Email Triggered

**Preconditions:**
- College email configured
- Student with attendance below 75%

**Test Steps:**
1. Low attendance job runs (lowAttendanceAlert.service.js)
2. System checks student attendance percentage

**Expected Results:**
- Alert email sent to student
- Alert email sent to parent/guardian

**Email Details:**
- **From:** "ABC College - Academic Office" <admissions@abccollege.edu>
- **To:** student@email.com, parent@email.com
- **Subject:** "Low Attendance Alert - ABC College"
- **Content:** Current attendance %, minimum required %, deficit

**Verification:**
```javascript
await sendLowAttendanceAlertEmail({
  to: student.email,
  studentName: student.firstName,
  attendancePercentage: 65,
  courseName: "Computer Science",
  collegeName: "ABC College",
  minimumRequired: 75,
  collegeId: college._id
});
```

---

### Test Case 6: Password Reset OTP Email Sent

**Preconditions:**
- College email configured
- User requests password reset

**Test Steps:**
1. User clicks "Forgot Password"
2. Enters email address
3. OTP sent to email

**Expected Results:**
- OTP email sent to user's registered email

**Email Details:**
- **From:** "ABC College ERP" <admissions@abccollege.edu>
- **To:** user@email.com
- **Subject:** "Password Reset OTP - College ERP"
- **Content:** OTP code, expiry time (e.g., 5 minutes)

---

### Test Case 7: Error When No Email Configuration Exists

**Preconditions:**
- No college email configuration exists

**Test Steps:**
1. Any email-triggering event occurs
2. System calls getCollegeTransporter()

**Expected Results:**
- Error thrown: "No email configuration found for this college. Please configure SMTP settings in System Settings."
- Email will NOT be sent

**Verification:**
```javascript
// Expected behavior when no config
try {
  await getCollegeTransporter(collegeId);
} catch (error) {
  // Error: "No email configuration found for this college"
}
```

---

### Test Case 8: Delete Email Configuration

**Preconditions:**
- College email configured

**Test Steps:**
1. Navigate to email configuration
2. Click "Delete Configuration"
3. Confirm deletion

**Expected Results:**
- Configuration deleted from database
- Transporter cache cleared
- Status shows "Not Configured"
- Any email triggers will fail until reconfigured

**Verification:**
```bash
DELETE /api/admin/email/config
Response: {
  "success": true,
  "message": "Email configuration deleted successfully"
}
```

---

### Test Case 9: Email Transporter Cache Behavior

**Preconditions:**
- College email configured

**Test Steps:**
1. Send multiple emails in quick succession (within 5 minutes)
2. Observe transporter creation

**Expected Results:**
- First email: Creates new transporter
- Subsequent emails: Uses cached transporter (no new connection)
- After 5 minutes: Cache expires, new transporter created

**Verification:**
Check logs for:
- "Created college-specific transporter" (first email)
- "Using cached college transporter" (subsequent emails)

---

### Test Case 10: Multiple Config Update

**Preconditions:**
- Existing active email configuration

**Test Steps:**
1. Save new SMTP configuration
2. Previous config exists and is active

**Expected Results:**
- Old configuration set to inactive
- New configuration set to active
- Only one active config per college

**Verification:**
```javascript
// Database behavior:
// Before: { collegeId: X, isActive: true }
// After: { collegeId: X, isActive: false }
// New: { collegeId: X, isActive: true }
```

---

## API Endpoints

### Base Path: `/api/admin/email`

| Method | Endpoint | Description | Access |
|--------|----------|------------|--------|
| GET | `/config` | Get current email configuration | College Admin |
| POST | `/config` | Save/update email configuration | College Admin |
| POST | `/verify` | Verify configuration and send test email | College Admin |
| DELETE | `/config` | Delete email configuration | College Admin |

### Request/Response Examples

#### GET /api/admin/email/config
```bash
GET /api/admin/email/config
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "configured": true,
  "isActive": true,
  "config": {
    "id": "507f1f77bcf86cd799439011",
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false
    },
    "fromName": "ABC College - Admissions",
    "fromEmail": "admissions@abccollege.edu",
    "isActive": true,
    "lastVerifiedAt": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "hasPassword": true
  }
}
```

#### POST /api/admin/email/config
```bash
POST /api/admin/email/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false
  },
  "credentials": {
    "user": "college@gmail.com",
    "pass": "app-specific-password"
  },
  "fromName": "ABC College - Admissions",
  "fromEmail": "admissions@abccollege.edu"
}

Response (201):
{
  "success": true,
  "message": "Email configuration saved successfully",
  "config": {
    "id": "507f1f77bcf86cd799439011",
    "smtp": {
      "host": "smtp.gmail.com",
      "port": 587,
      "secure": false
    },
    "fromName": "ABC College - Admissions",
    "fromEmail": "admissions@abccollege.edu",
    "isActive": true,
    "hasPassword": true
  }
}
```

#### POST /api/admin/email/verify
```bash
POST /api/admin/email/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false
  },
  "credentials": {
    "user": "college@gmail.com",
    "pass": "app-specific-password"
  },
  "fromName": "ABC College - Admissions",
  "fromEmail": "admissions@abccollege.edu",
  "testEmail": "test@example.com"
}

Response (200):
{
  "success": true,
  "message": "Configuration verified and test email sent successfully",
  "verified": true
}
```

#### DELETE /api/admin/email/config
```bash
DELETE /api/admin/email/config
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Email configuration deleted successfully"
}
```

---

## Cache Management

### Transporter Cache

- **Cache TTL:** 5 minutes
- **Storage:** In-memory Map
- **Key Format:** `email_transporter_<collegeId>`
- **Auto-clear:** Every 10 minutes (expired entries)

### Cache Functions

```javascript
// Get transporter (with cache)
const { transporter, fromName, fromEmail } = await getCollegeTransporter(collegeId);

// Clear specific college cache
clearTransporterCache(collegeId);

// Clear all caches
clearAllTransporterCaches();
```

### Cache Flow
1. Check cache for college transporter
2. If cached and not expired (5 min), return cached
3. If not cached or expired:
   - Fetch active config from database
   - Create nodemailer transporter
   - Cache with timestamp
4. Return transporter

---

## Security Considerations

### Password Encryption
- Passwords encrypted using AES-256 encryption
- Master key stored in environment variable
- Passwords never exposed in API responses

### SMTP Security
- Supports TLS (port 587) and SSL (port 465)
- `rejectUnauthorized: false` for self-signed certs
- App passwords recommended (not account passwords)

---