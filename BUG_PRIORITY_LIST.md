# Bug Priority List - Smart College MERN

**Document Created:** February 23, 2026  
**Total Issues Identified:** 50+  
**Classification:** Critical, High, Medium, Low Priority

---

## Priority Classification Legend

| Priority | Description | Timeline | Impact |
|----------|-------------|----------|--------|
| **P0 - CRITICAL** | System-breaking, security vulnerabilities, data loss risk | Fix Immediately (0-3 days) | Blocks production deployment |
| **P1 - HIGH** | Major functional gaps, core features broken | Fix Soon (1-2 weeks) | Significantly impacts usability |
| **P2 - MEDIUM** | Important but workarounds exist | Fix in Sprint (2-4 weeks) | Affects user experience |
| **P3 - LOW** | Minor issues, enhancements, polish | Fix When Possible (1-3 months) | Nice to have |

---

## P0 - CRITICAL PRIORITY (Fix Immediately)

### 0.1 Security Vulnerabilities

**Issue ID:** SEC-001  
**Title:** Insufficient Authorization Checks - College Isolation Bypass  
**Location:** Multiple controllers (teacher, attendance, timetable)  
**Description:** Some APIs check user role but don't verify college_id isolation. A malicious user from College A could potentially access data from College B by manipulating college_id in requests.  
**Risk:** Data breach, multi-tenant security violation  
**Affected Files:** `backend/src/controllers/*.controller.js`  
**Fix Required:** Add college_id verification in every query, create middleware for college isolation

---

**Issue ID:** SEC-002  
**Title:** File Upload Security - No Validation or Scanning  
**Location:** `backend/src/controllers/student.controller.js`  
**Description:** Uploaded documents have no file type validation beyond multer, no file size limits at API level, no virus scanning. Potential for malicious file upload attacks.  
**Risk:** Malware upload, path traversal attacks, server compromise  
**Affected Files:** `backend/src/controllers/student.controller.js`, `backend/src/middlewares/upload.middleware.js`  
**Fix Required:** Add file type whitelist, file size validation, rename files securely, add virus scanning

---

**Issue ID:** SEC-003  
**Title:** JWT Token Security - No Refresh Token Mechanism  
**Location:** `backend/src/controllers/auth.controller.js`  
**Description:** Tokens expire after 1 day but there's no refresh token mechanism. Users must re-login daily. Also no token blacklisting on logout.  
**Risk:** Poor UX, tokens remain valid after logout until expiry  
**Affected Files:** `backend/src/controllers/auth.controller.js`, `backend/src/middlewares/auth.middleware.js`  
**Fix Required:** Implement refresh token pattern, add token blacklisting

---

**Issue ID:** SEC-004  
**Title:** Password Reset OTP Exposure in Development  
**Location:** `backend/src/services/otp.service.js`  
**Description:** OTP is returned in API response when NODE_ENV=development. If environment variable is misconfigured in production, OTP could leak.  
**Risk:** OTP exposure, account takeover  
**Affected Files:** `backend/src/services/otp.service.js`  
**Fix Required:** Never return OTP in API response, use email-only delivery

---

### 0.2 Data Integrity Critical Issues

**Issue ID:** DATA-001  
**Title:** No Cascade Delete - Orphaned Records on College Deletion  
**Location:** All models  
**Description:** When a college is deleted, all related departments, courses, students, teachers remain as orphaned records referencing non-existent college.  
**Risk:** Data corruption, broken queries, storage waste  
**Affected Files:** `backend/src/models/*.model.js`  
**Fix Required:** Add cascade delete hooks or soft-delete with archival

---

**Issue ID:** DATA-002  
**Title:** Inconsistent User-Student Relationship  
**Location:** `backend/src/models/student.model.js`, `backend/src/controllers/auth.controller.js`  
**Description:** Student model has optional user_id with sparse index. Login uses `student.user_id || student._id` causing inconsistent authentication tokens.  
**Risk:** Authentication failures, security gaps, data relationship confusion  
**Affected Files:** `backend/src/models/student.model.js`, `backend/src/controllers/auth.controller.js`  
**Fix Required:** Make user_id required, remove sparse index, standardize on user_id for all student references

---

**Issue ID:** DATA-003  
**Title:** Duplicate Attendance Record Race Condition  
**Location:** `backend/src/controllers/attendance.controller.js`  
**Description:** markAttendance uses upsert:true but concurrent requests can create duplicate records before unique index prevents it.  
**Risk:** Duplicate attendance records, incorrect attendance calculation  
**Affected Files:** `backend/src/controllers/attendance.controller.js`  
**Fix Required:** Add transaction-based atomic operations, handle duplicate key errors gracefully

---

### 0.3 Core Functionality Broken

**Issue ID:** FUNC-001  
**Title:** NO STUDENT PROMOTION LOGIC - System Cannot Handle Promotions  
**Location:** Entire codebase (missing feature)  
**Description:** System has ZERO promotion logic. Student promotion is done by manually updating currentSemester field. No ATKT support, no backlog tracking, no eligibility checking. This is essential for any college ERP.  
**Risk:** System unusable for real college operations  
**Affected Files:** N/A (missing feature)  
**Fix Required:** Implement complete promotion engine with ATKT, backlog tracking, condonation, approval workflow

---

**Issue ID:** FUNC-002  
**Title:** Course-Semester Ambiguity - Structural Design Flaw  
**Location:** `backend/src/models/course.model.js`, `backend/src/models/student.model.js`  
**Description:** Course model has both programLevel and semester fields. Unclear if Course is a complete program (B.Sc CS - 6 semesters) or a single subject (Data Structures - Sem 3). Causes confusion in fee structure, subject allocation, timetable creation.  
**Risk:** Academic data inconsistency, cannot properly track student progress  
**Affected Files:** `backend/src/models/course.model.js`, `backend/src/models/subject.model.js`  
**Fix Required:** Introduce Program entity, clarify Course as subject within program

---

**Issue ID:** FUNC-003  
**Title:** Attendance Session Creation - Only Today Allowed  
**Location:** `backend/src/controllers/attendance.controller.js`  
**Description:** Teachers can only create attendance sessions for today (isToday validation). Cannot create sessions for past dates (make-up classes) or future dates (planned classes).  
**Risk:** Inflexible attendance marking, cannot handle real-world scenarios  
**Affected Files:** `backend/src/controllers/attendance.controller.js`, `backend/src/utils/date.utils.js`  
**Fix Required:** Allow retrospective attendance with approval, allow future session scheduling

---

## P1 - HIGH PRIORITY (Fix Within 1-2 Weeks)

### 1.1 Missing Core Features

**Issue ID:** FEAT-001  
**Title:** HOD Role Not Implemented as Proper Role  
**Location:** `backend/src/models/user.model.js`, `backend/src/models/department.model.js`  
**Description:** HOD is not a role in User model. HOD status determined by department.hod_id reference. Teachers don't know they're HOD until they try to create timetable. No HOD dashboard.  
**Impact:** Role confusion, cannot implement HOD-specific features  
**Affected Files:** `backend/src/models/user.model.js`, `backend/src/middlewares/role.middleware.js`  
**Fix Required:** Add HOD as explicit role or permission set, create HOD dashboard

---

**Issue ID:** FEAT-002  
**Title:** No Pagination for List APIs  
**Location:** All list endpoints  
**Description:** Student list, teacher list, attendance sessions APIs return all records. For colleges with 1000+ students, this causes timeout and browser crashes.  
**Impact:** System unusable for large colleges  
**Affected Files:** `backend/src/controllers/student.controller.js`, `backend/src/controllers/teacher.controller.js`  
**Fix Required:** Add pagination (page, limit, sort) to all list endpoints

---

**Issue ID:** FEAT-003  
**Title:** Fee Structure - No Support for Special Cases  
**Location:** `backend/src/controllers/studentApproval.controller.js`, `backend/src/models/feeStructure.model.js`  
**Description:** Fee structure is per course and category only. No support for scholarships, discounts, fee concessions, or individual student fee adjustments.  
**Impact:** Cannot handle real-world fee scenarios  
**Affected Files:** `backend/src/models/feeStructure.model.js`, `backend/src/controllers/studentApproval.controller.js`  
**Fix Required:** Add student-specific fee override, scholarship/discount fields

---

**Issue ID:** FEAT-004  
**Title:** Missing Email/Mobile/Pincode Validation  
**Location:** All input forms  
**Description:** No regex validation for email format, Indian mobile number (10 digits, 6-9 start), Indian pincode (6 digits), percentage range (0-100).  
**Impact:** Invalid data entry, data quality issues  
**Affected Files:** `backend/src/controllers/*.controller.js`, `backend/src/middlewares/*.middleware.js`  
**Fix Required:** Add validation middleware with regex patterns

---

### 1.2 Performance Issues

**Issue ID:** PERF-001  
**Title:** N+1 Query Problem in Dashboard APIs  
**Location:** `backend/src/controllers/dashboard.controller.js`  
**Description:** Student dashboard makes sequential queries: student profile, attendance records, subject-wise calculation, timetable, fee summary. Each subject requires separate query.  
**Impact:** Slow dashboard loading (5-10 seconds for students with many subjects)  
**Affected Files:** `backend/src/controllers/dashboard.controller.js`  
**Fix Required:** Use aggregation pipelines, populate with projections, batch queries

---

**Issue ID:** PERF-002  
**Title:** Missing Database Indexes  
**Location:** Multiple models  
**Description:** AttendanceRecord queried by student_id without index. StudentFee queried by student_id without index. Notification queried by college_id+target without compound index.  
**Impact:** Query performance degrades exponentially with data growth  
**Affected Files:** `backend/src/models/attendanceRecord.model.js`, `backend/src/models/studentFee.model.js`  
**Fix Required:** Add indexes on frequently queried fields

---

**Issue ID:** PERF-003  
**Title:** Large Array Operations in Memory  
**Location:** `backend/src/controllers/student.controller.js` (getMyFullProfile)  
**Description:** Loads all attendance sessions and records into memory before processing. For 2 years of attendance, this could be thousands of records causing timeout.  
**Impact:** API timeout for students with long attendance history  
**Affected Files:** `backend/src/controllers/student.controller.js`  
**Fix Required:** Use database aggregation, limit date range, add pagination

---

### 1.3 Workflow Gaps

**Issue ID:** WORK-001  
**Title:** Student Rejection - No Notification or Reapply Option  
**Location:** `backend/src/controllers/studentApproval.controller.js`  
**Description:** When admin rejects student, no notification sent. Student cannot reapply or correct issues.  
**Impact:** Poor user experience, lost admissions  
**Affected Files:** `backend/src/controllers/studentApproval.controller.js`, `backend/src/services/email.service.js`  
**Fix Required:** Send rejection email with reason, allow reapplication

---

**Issue ID:** WORK-002  
**Title:** Payment Failure - No Recovery Mechanism  
**Location:** `backend/src/controllers/student.payment.controller.js`  
**Description:** If payment fails mid-way, no pending payment state. Student must restart entire payment process.  
**Impact:** Lost payments, frustrated users  
**Affected Files:** `backend/src/controllers/student.payment.controller.js`, `backend/src/services/stripe.service.js`  
**Fix Required:** Add pending payment state, payment retry mechanism

---

**Issue ID:** WORK-003  
**Title:** Teacher Deactivation - Subjects Become Orphaned  
**Location:** `backend/src/controllers/teacher.controller.js`  
**Description:** When teacher is deactivated, their subjects become unassigned. No mechanism to reassign subjects to another teacher.  
**Impact:** Attendance marking breaks, timetable invalid  
**Affected Files:** `backend/src/controllers/teacher.controller.js`, `backend/src/models/subject.model.js`  
**Fix Required:** Add subject reassignment on teacher deactivation

---

## P2 - MEDIUM PRIORITY (Fix Within 2-4 Weeks)

### 2.1 Functional Improvements

**Issue ID:** IMPRV-001  
**Title:** Notification Target Audience Too Limited  
**Location:** `backend/src/models/notification.model.js`  
**Description:** Notification target only supports "ALL" or "STUDENTS". Cannot target specific departments, courses, semesters, teachers, or individuals.  
**Impact:** Limited communication flexibility, information overload  
**Affected Files:** `backend/src/models/notification.model.js`, `backend/src/controllers/notification.controller.js`  
**Fix Required:** Add target_department, target_course, target_users arrays

---

**Issue ID:** IMPRV-002  
**Title:** Payment Reminder - No Recurring or Escalation Logic  
**Location:** `backend/src/services/paymentReminder.service.js`  
**Description:** Reminder sent only once when due date arrives. No recurring reminders for overdue payments. No escalation for long-overdue (30+ days) payments.  
**Impact:** Ineffective payment collection  
**Affected Files:** `backend/src/services/paymentReminder.service.js`  
**Fix Required:** Add recurring reminders, escalation levels, SMS integration

---

**Issue ID:** IMPRV-003  
**Title:** Attendance Auto-Close - No Teacher Notification  
**Location:** `backend/src/cron/lowAttendanceAlert.cron.js`, `backend/src/services/autoCloseSession.service.js`  
**Description:** Cron job auto-closes sessions but teacher is not notified. Teacher might think session is still open.  
**Impact:** Confusion about attendance status  
**Affected Files:** `backend/src/services/autoCloseSession.service.js`  
**Fix Required:** Send notification to teacher when session auto-closed

---

**Issue ID:** IMPRV-004  
**Title:** Subject-Teacher Assignment - No Qualification Validation  
**Location:** `backend/src/controllers/subject.controller.js`  
**Description:** Any teacher can be assigned to any subject. No validation of teacher qualifications, department alignment, or course expertise.  
**Impact:** Teachers may be assigned to subjects they're not qualified to teach  
**Affected Files:** `backend/src/controllers/subject.controller.js`, `backend/src/models/teacher.model.js`  
**Fix Required:** Add teacher qualification fields, validate during assignment

---

**Issue ID:** IMPRV-005  
**Title:** No Audit Trail for Critical Changes  
**Location:** All models  
**Description:** No tracking of who modified fee structures, student records, teacher assignments. Only createdBy exists on some models.  
**Impact:** Cannot trace data changes, compliance issues  
**Affected Files:** `backend/src/models/*.model.js`  
**Fix Required:** Add updatedAt, updatedBy fields, create audit log collection

---

### 2.2 User Experience

**Issue ID:** UX-001  
**Title:** Inconsistent API Response Formats  
**Location:** All controllers  
**Description:** Some APIs return {success: true, data: ...}, others return just data, some return {message: "...", student: ...}. Frontend must handle multiple formats.  
**Impact:** Frontend complexity, inconsistent error handling  
**Affected Files:** `backend/src/controllers/*.controller.js`  
**Fix Required:** Standardize response format across all endpoints

---

**Issue ID:** UX-002  
**Title:** No Loading States for Async Operations  
**Location:** Frontend pages  
**Description:** Many operations (payment, attendance marking) don't show loading state. Users might click multiple times causing duplicate submissions.  
**Impact:** Duplicate payments, duplicate attendance records  
**Affected Files:** `frontend/src/pages/**/*.jsx`  
**Fix Required:** Add loading states, disable buttons during async operations

---

**Issue ID:** UX-003  
**Title:** Error Messages Not User-Friendly  
**Location:** Backend error middleware  
**Description:** Technical error messages shown to users (e.g., "E11000 duplicate key error").  
**Impact:** User confusion, poor experience  
**Affected Files:** `backend/src/middlewares/error.middleware.js`  
**Fix Required:** Map error codes to user-friendly messages

---

### 2.3 Data Quality

**Issue ID:** DATA-004  
**Title:** Inconsistent Status Enums Across Models  
**Location:** All models  
**Description:** Student uses PENDING/APPROVED/REJECTED/DELETED. Teacher uses ACTIVE/INACTIVE. Course uses ACTIVE/INACTIVE. No standardization.  
**Impact:** Complex filtering, reporting difficulties  
**Affected Files:** `backend/src/models/*.model.js`  
**Fix Required:** Standardize status enums or add status type field

---

**Issue ID:** DATA-005  
**Title:** Data Redundancy in AttendanceSession Snapshot  
**Location:** `backend/src/models/attendanceSession.model.js`  
**Description:** slotSnapshot duplicates TimetableSlot data. If original data was wrong, snapshot preserves wrong data with no sync mechanism.  
**Impact:** Data inconsistency, confusion about source of truth  
**Affected Files:** `backend/src/models/attendanceSession.model.js`  
**Fix Required:** Document snapshot purpose, add version tracking

---

## P3 - LOW PRIORITY (Fix Within 1-3 Months)

### 3.1 Code Quality

**Issue ID:** CODE-001  
**Title:** Inconsistent Naming Conventions  
**Location:** Throughout codebase  
**Description:** File names: attendanceRecord.model.js vs AttendanceSession.model.js (camelCase vs PascalCase). Field names: college_id (snake_case) vs fullName (camelCase).  
**Impact:** Code maintainability, developer confusion  
**Affected Files:** Multiple files  
**Fix Required:** Establish and follow naming convention document

---

**Issue ID:** CODE-002  
**Title:** Duplicate Logic Across Controllers  
**Location:** Multiple controllers  
**Description:** College resolution, teacher resolution, status checks repeated in multiple controllers. Should be in reusable services.  
**Impact:** Code duplication, maintenance burden  
**Affected Files:** `backend/src/controllers/*.controller.js`  
**Fix Required:** Extract common logic into services/utils

---

**Issue ID:** CODE-003  
**Title:** Magic Strings and Numbers  
**Location:** Throughout codebase  
**Description:** Hardcoded values like "APPROVED", 75 (attendance threshold), 100 (percentage max).  
**Impact:** Difficult to configure, error-prone  
**Affected Files:** Multiple files  
**Fix Required:** Create constants file with all magic values

---

### 3.2 Edge Cases

**Issue ID:** EDGE-001  
**Title:** Zero Students in Course - No Validation  
**Location:** `backend/src/controllers/attendance.controller.js`  
**Description:** Can create attendance session for course with 0 students. totalStudents shows 0.  
**Impact:** Confusing UI, potential errors  
**Affected Files:** `backend/src/controllers/attendance.controller.js`  
**Fix Required:** Warn or prevent session creation for empty courses

---

**Issue ID:** EDGE-002  
**Title:** Concurrent Session Creation - Race Condition  
**Location:** `backend/src/controllers/attendance.controller.js`  
**Description:** Two teachers creating sessions for same slot simultaneously could cause race condition.  
**Impact:** Duplicate sessions, error messages  
**Affected Files:** `backend/src/controllers/attendance.controller.js`  
**Fix Required:** Add database transaction, handle duplicate key gracefully

---

**Issue ID:** EDGE-003  
**Title:** Timezone Issues - Date Comparisons Use Local Time  
**Location:** `backend/src/utils/date.utils.js`  
**Description:** Server might be in different timezone than users. Cron jobs run in Asia/Kolkata but college might be elsewhere.  
**Impact:** Sessions created on wrong day, attendance date mismatches  
**Affected Files:** `backend/src/utils/date.utils.js`, `backend/src/cron/*.cron.js`  
**Fix Required:** Store timezone per college, use UTC internally

---

**Issue ID:** EDGE-004  
**Title:** Payment During System Maintenance - No Reconciliation  
**Location:** `backend/src/controllers/student.payment.controller.js`  
**Description:** If system goes down during payment, payment might be processed but not recorded.  
**Impact:** Lost revenue, student complaints  
**Affected Files:** `backend/src/controllers/student.payment.controller.js`  
**Fix Required:** Add payment reconciliation job, webhook retry logic

---

### 3.3 Documentation

**Issue ID:** DOC-001  
**Title:** No API Documentation  
**Location:** N/A  
**Description:** No Swagger/OpenAPI documentation for backend endpoints. Frontend developers must read code to understand API.  
**Impact:** Slower development, integration errors  
**Fix Required:** Add Swagger documentation

---

**Issue ID:** DOC-002  
**Title:** No Deployment Guide  
**Location:** N/A  
**Description:** No documentation for production deployment, environment setup, database migration.  
**Impact:** Deployment errors, configuration issues  
**Fix Required:** Create deployment guide, Docker setup

---

## Quick Reference by File

### Backend Files with Most Critical Issues

| File | Issue Count | Priority |
|------|-------------|----------|
| backend/src/controllers/attendance.controller.js | 5 | P0, P1 |
| backend/src/controllers/student.controller.js | 4 | P0, P1 |
| backend/src/controllers/auth.controller.js | 3 | P0 |
| backend/src/controllers/dashboard.controller.js | 2 | P1 |
| backend/src/controllers/studentApproval.controller.js | 2 | P1 |
| backend/src/models/*.model.js | 6 | P0, P2 |
| backend/src/services/*.service.js | 3 | P1, P2 |
| backend/src/middlewares/auth.middleware.js | 2 | P0 |

### Frontend Files Needing Attention

| File | Issue Count | Priority |
|------|-------------|----------|
| frontend/src/pages/**/*.jsx | 3 | P2, P3 |
| frontend/src/auth/AuthContext.jsx | 1 | P0 |
| frontend/src/components/ProtectedRoute.jsx | 0 | - |

---

## Recommended Fix Order

### Week 1 (Critical Security & Data Integrity)
1. SEC-001: College Isolation Bypass
2. SEC-002: File Upload Security
3. DATA-001: Cascade Delete
4. DATA-002: User-Student Relationship
5. FUNC-001: Promotion Logic (start design)

### Week 2 (Core Functionality)
1. FUNC-002: Course-Semester Structure
2. FUNC-003: Attendance Session Flexibility
3. FEAT-001: HOD Role Implementation
4. FEAT-002: Pagination Implementation
5. SEC-003: Refresh Token Mechanism

### Week 3-4 (Performance & Features)
1. PERF-001: N+1 Query Optimization
2. PERF-002: Database Indexes
3. FEAT-003: Fee Structure Special Cases
4. FEAT-004: Input Validation
5. WORK-001, WORK-002, WORK-003: Workflow Fixes

### Month 2 (Improvements)
1. IMPRV-001 to IMPRV-005: Functional Improvements
2. UX-001 to UX-003: User Experience
3. DATA-004, DATA-005: Data Quality

### Month 3 (Polish)
1. CODE-001 to CODE-003: Code Quality
2. EDGE-001 to EDGE-004: Edge Cases
3. DOC-001, DOC-002: Documentation

---

## Summary Statistics

| Priority | Count | Percentage |
|----------|-------|------------|
| P0 - Critical | 10 | 20% |
| P1 - High | 13 | 26% |
| P2 - Medium | 13 | 26% |
| P3 - Low | 14 | 28% |
| **Total** | **50** | **100%** |

---

**Note:** This priority list is based on impact to production readiness, security risk, and user experience. Priorities may be adjusted based on specific business requirements and deployment timelines.

---

*End of Bug Priority List*
