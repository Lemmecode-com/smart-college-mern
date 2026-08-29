User Management System — Complete Audit Report

1. User Roles (All Roles in System)
Source: backend/src/utils/constants.js:148-160
Role Definitions
#
Role
Value
1
SUPER_ADMIN
"SUPER_ADMIN"
2
COLLEGE_ADMIN
"COLLEGE_ADMIN"
3
PRINCIPAL
"PRINCIPAL"
4
HOD
"HOD"
5
ACCOUNTANT
"ACCOUNTANT"
6
ADMISSION_OFFICER
"ADMISSION_OFFICER"
7
EXAM_COORDINATOR
"EXAM_COORDINATOR"
8
PARENT_GUARDIAN
"PARENT_GUARDIAN"
9
PLATFORM_SUPPORT
"PLATFORM_SUPPORT"
10
TEACHER
"TEACHER"
11
STUDENT
"STUDENT"


Per-Role Details
SUPER_ADMIN
Purpose
Platform-level owner. Creates colleges, suspends/restores colleges, views cross-college audit logs, manages platform settings.
Where Used
Backend
auth.controller.js login (found via User.findOne({ email }))
college.routes.js /list
securityAudit.routes.js
Super Admin dashboard routes
Frontend
App.jsx:327 → redirect to /super-admin/dashboard
Routes at:
/super-admin/dashboard
/super-admin/create-college
/super-admin/colleges-list
User Model
college_id is not required
required: function(){ return this.role !== "SUPER_ADMIN" }
JWT
college_id is null for SUPER_ADMIN

COLLEGE_ADMIN
Purpose
Owner/manager of a single college. Manages all staff, students, courses, departments, fees, reports, and college settings.
Where Used
Backend
staff.routes.js (only role allowed)
department.routes.js (create/update/delete/assign-hod)
student.routes.js (approve/reject/update/delete)
college.routes.js (edit own college)
user.routes.js (deactivate/reactivate)
feeStructure.routes.js
reports.routes.js
reportDashboard.routes.js
notification.routes.js
exam.routes.js
promotion.routes.js
auditLog.routes.js
Frontend
App.jsx:330 → redirect to /dashboard
Routes for:
College Admin Dashboard
Staff Management
Department Management
Student Management
Reports
Fees
System Settings
Audit Logs

PRINCIPAL
Purpose
Academic head of the entire college. Oversees all departments, students, teachers, and academic operations.
Where Used
Backend
course.routes.js (read)
timetable.routes.js (read)
department.routes.js (read — in base router.use)
student.routes.js (view approved/registered/alumni/search)
reports.routes.js (read)
reportDashboard.routes.js
feeStructure.routes.js (read)
college.routes.js (read own college)
user.routes.js (deactivate/reactivate)
Frontend
App.jsx:332 → /dashboard/principal
PrincipalDashboard.jsx
ProtectedRoute with ["COLLEGE_ADMIN", "PRINCIPAL"] for many shared pages

HOD
Purpose
Head of a single department. Manages timetable, views department teachers, oversees academic compliance within their department.
Where Used
Backend
hod.routes.js
dashboard
profile
department
teachers
timetable.routes.js
slot CRUD
publish
staff.routes.js
/staff/profile/:id (view/edit allowed)
college.routes.js
view own college
Frontend
App.jsx:334 → /hod/dashboard
4 HOD pages
ProtectedRoute allowedRoles={["HOD"]}
AllowedRoles includes HOD in:
staff profile view/edit
timetable
related modules
Creation Logic
Created via staff.controller.js createStaff with role: "HOD"
Automatically:
Creates Teacher record
Sets department.hod_id

ACCOUNTANT
Purpose
Manages fee structures, payment tracking, and financial reports.
Where Used
Backend
feeStructure.routes.js (CRUD)
reports.routes.js (payment reports)
student.routes.js (view approved students, search)
course.routes.js (read)
college.routes.js (read own college)
timetable.routes.js (read)
Frontend
App.jsx:336 → /dashboard/accountant
AccountantDashboard.jsx
ProtectedRoute with ["ACCOUNTANT"]
Staff Creation
Allowed in CreateStaff.jsx allowedRoles list

ADMISSION_OFFICER
Purpose
Manages student admissions lifecycle — registration, approval, rejection, alumni conversion.
Where Used
Backend
student.routes.js
promotion.routes.js
college.routes.js (read own college)
Frontend
App.jsx:338 → /dashboard/admission
AdmissionDashboard.jsx
ProtectedRoute with ["ADMISSION_OFFICER"]
Staff Creation
Allowed in CreateStaff.jsx allowedRoles list

EXAM_COORDINATOR
Purpose
Manages exam scheduling and related operations.
Where Used
Backend
exam.routes.js
student.routes.js
reports.routes.js
feeStructure.routes.js
timetable.routes.js
course.routes.js
college.routes.js
Frontend
App.jsx:340 → /dashboard/exam
ExamDashboard.jsx
ProtectedRoute with ["EXAM_COORDINATOR"]
Staff Creation
Allowed in CreateStaff.jsx allowedRoles list

PARENT_GUARDIAN
Purpose
View their linked children's attendance, fees, and profile.
Auto-created during student approval (not manually created).
Where Used
Backend
parent.routes.js
college.routes.js
Frontend
App.jsx:342 → /dashboard/parent
ParentDashboard.jsx
ChildrenList.jsx
ChildDetail.jsx
ChildProfile.jsx
ChildAttendance.jsx
ChildFees.jsx
Access
ProtectedRoute with ["PARENT_GUARDIAN"]
Note
Cannot be manually created via CreateStaff.
Code comment explicitly states:
"ROLE.PARENT_GUARDIAN removed - parents are created automatically during student approval"


PLATFORM_SUPPORT
Purpose
Platform-level technical support. Views system health, logs, errors, integration status, and audit data.
Where Used
Backend
platformSupport.routes.js
college.routes.js /list
securityAudit.routes.js
Frontend
App.jsx:344 → /dashboard/support
PlatformSupportDashboard.jsx
SystemHealth.jsx
AuditLogsViewer.jsx
SystemLogs.jsx
IntegrationMonitoring.jsx
SupportTickets.jsx
ErrorAnalytics.jsx
CollegeHealthOverview.jsx
DatabaseDiagnostics.jsx
ConfigurationViewer.jsx
Staff Creation
Allowed in CreateStaff.jsx allowedRoles list

TEACHER
Purpose
Teaches assigned subjects, marks attendance, manages timetable slots, and views schedules.
Where Used
Backend
timetable.routes.js
teacher.routes.js
attendance.routes.js
student.routes.js GET /teacher
course.routes.js
college.routes.js
Frontend
App.jsx:346 → /teacher/dashboard
TeacherDashboard.jsx
MyProfile.jsx
MySchedule.jsx
TimetableList.jsx
WeeklyTimetable.jsx
CreateTimetable.jsx
Attendance Pages
Session Pages

STUDENT
Purpose
Views their own profile, timetable, attendance, fees, and makes payments.
Where Used
Backend
student.routes.js
timetable.routes.js
student.payment.routes.js
college.routes.js
Frontend
App.jsx:348 → /student/dashboard
StudentDashboard.jsx
StudentProfile.jsx
EditStudentProfile.jsx
StudentTimetable.jsx
StudentFees.jsx
MakePayments.jsx
FeeReceipt.jsx
MyAttendance.jsx

2. Permissions & Access Control
SUPER_ADMIN
CAN
CANNOT
Create, view, edit, suspend/restore colleges
View/edit any college's internal data without going through college middleware
View all colleges list
Create staff/students directly (creates colleges first)
Access /super-admin/dashboard
—
Access Security Audit logs
—
Access UserManagementSett (stub page)
—
Bypasses collegeMiddleware entirely
—

Data Scope
Cross-college. Bypasses college_id filter universally.

COLLEGE_ADMIN
CAN
CANNOT
Create staff (ACCOUNTANT, ADMISSION_OFFICER, PRINCIPAL, HOD, EXAM_COORDINATOR, PLATFORM_SUPPORT)
Create TEACHER or STUDENT directly via staff form
List all staff in their college
View staff from other colleges
View/edit any staff profile (own college)
Change SUPER_ADMIN accounts
Create/edit/delete departments
Delete departments with references
Assign HOD to department
—
Create/edit/delete courses
—
Create/edit/delete subjects
—
Approve/reject/bulk-approve students
View other colleges' students
Move students to alumni
—
View/reactivate deactivated students
—
Update college profile
Edit other colleges
Deactivate/reactivate any user (except self)
Deactivate self
Create/edit fee structures
—
View all reports
—
View/access college audit logs
View platform-level audit logs
Create notifications
—
View dashboard
—

Data Scope
College-wide. All queries scoped by req.college_id.
Excludes SUPER_ADMIN and STUDENT roles from staff list.
3. Functional Capabilities (Implemented Features)

Authentication
Feature
Status
Details
Login
✅ Completed
POST /api/auth/login — email+password. Three paths: SUPER/ADMIN via User collection, TEACHER via Teacher collection, STUDENT via Student+User collection. bcrypt comparison.
Access Token (JWT)
✅ Completed
15-minute expiry. Stored in httpOnly cookie. Contains id, role, college_id.
Refresh Token
✅ Completed
7-day expiry. SHA-256 hashed in DB. Separate JWT secret (JWT_SECRET + "_REFRESH"). Stored in DB.
Logout
✅ Completed
Clears both cookies. Blacklists access token. Revokes refresh token.
Token Refresh
✅ Completed
POST /api/auth/refresh-token — issues new access token from valid refresh token.
Verify OTP
✅ Completed
POST /api/auth/verify-otp — validates OTP.
Reset Password
✅ Completed
POST /api/auth/reset-password — sets new password via OTP. Blacklists all tokens, revokes all refresh tokens.
Change Password
✅ Completed
POST /api/auth/change-password — authenticated users + first-login users. Min 8 chars. Validates current password.
OTP Service
✅ Completed
otp.service.js with rate limiting, expiration, mark-as-used
Student Registration
✅ Completed
POST /api/students/register/:collegeCode — public. Uses express-validator.
Account Deactivation
✅ Completed
PUT /api/users/:id/deactivate — sets isActive: false. Cascades to Teacher/Student models.
Account Reactivation
✅ Completed
PUT /api/users/:id/reactivate — reverses deactivation.
Force Password Change
✅ Completed
mustChangePassword flag on first login. Blocks token issuance until changed.
SSO / Social Login
❌ Not Implemented
No Google, Microsoft, or other OAuth providers.




Authorization
Feature
Status
Details
JWT Auth Middleware
✅ Completed
auth.middleware.js. Verifies token, checks blacklist, fetches user, checks isActive, attaches req.user.
Role Middleware
✅ Completed
role.middleware.js — simple array check: if (!allowedRoles.includes(req.user.role)).
College Middleware
✅ Completed
college.middleware.js — resolves college_id, validates college exists and isActive. SUPER_ADMIN bypasses. Has DB fallback if JWT lacks college_id.
HOD Middleware
✅ Completed
hod.middleware.js — resolves teacher, verifies HOD status, attaches req.teacher, req.department. Used on HOD routes and timetable slot routes.
Student Middleware
✅ Completed
student.middleware.js — resolves student by user_id, checks APPROVED status.
Security Headers
✅ Completed
Helmet.js with frameguard, noSniff, xssFilter, referrerPolicy, permissionsPolicy. CSP disabled for dev.
MongoDB Sanitization
⚠️ Partial
express-mongo-sanitize is not used (comment says "incompatible with Express 5"). sanitizeMongo is a no-op pass-through. Actual sanitization delegated to express-validator (which only exists on student routes).
Input Validation (express-validator)
⚠️ Partial
Only implemented on student.routes.js via student.validator.js. Zero express-validator on staff routes, staff profile routes, HOD routes, auth routes, college routes, teacher routes, user routes, department routes, timetable routes, notification routes, fee routes, exam routes, principal routes.
Security Audit Service
✅ Completed
securityAudit.service.js — logs login success/failure, logout, password changes, brute force detection, unauthorized access, token blacklist attempts. Uses SecurityAudit model.


Profile Management
Feature
Status
Details
Self profile (Teacher)
✅ Completed
GET /api/teachers/my-profile
Edit own profile (Teacher)
✅ Completed
EditTeacherProfile.jsx
Self profile (Student)
✅ Completed
GET /api/students/my-profile
Edit own profile (Student)
✅ Completed
PUT /api/students/update-my-profile with express-validator
View staff profile
✅ Completed
GET /api/staff/profile/:id — accessible to 8 roles
Edit staff profile
✅ Completed
PUT /api/staff/profile/:id — accessible to same 8 roles
HOD profile
✅ Completed
GET /api/hod/profile
View college profile
✅ Completed
GET /api/college/my-college — accessible to 9 roles
Edit college profile
✅ Completed
PUT /api/college/edit/my-college — COLLEGE_ADMIN only. Has field whitelist.
My college (all roles)
✅ Completed
All non-SUPER_ADMIN roles can view their own college






User Creation & Management
Feature
Status
Details
Create staff (COLLEGE_ADMIN)
✅ Completed
POST /api/college/staff — creates User + StaffProfile + (for HOD) Teacher + assigns department HOD in transaction
List staff
✅ Completed
GET /api/college/staff
View staff profile
✅ Completed
8 roles allowed
Edit staff profile
✅ Completed
8 roles allowed
Deactivate user
✅ Completed
PUT /api/users/:id/deactivate
Reactivate user
✅ Completed
PUT /api/users/:id/reactivate
Assign HOD
✅ Completed
PUT /api/departments/:id/assign-hod
Create student
✅ Completed
Self-registration via POST /api/students/register/:collegeCode (public)
Approve student
✅ Completed
PUT /api/students/:studentId/approve
Reject student
✅ Completed
PUT /api/students/:studentId/reject
Bulk approve
✅ Completed
POST /api/students/bulk-approve
Move to alumni
✅ Completed
POST /api/students/:studentId/to-alumni
Delete student
✅ Completed
DELETE /api/students/:id
Delete staff
❌ Not Implemented
No DELETE endpoint for staff. Only deactivation.
Reset staff password
❌ Not Implemented
No password reset for staff by COLLEGE_ADMIN
Super Admin user management
❌ Not Implemented
UserManagementSett.jsx is a blank stub





Multi-Tenant Handling
Feature
Status
Details
College isolation middleware
✅ Completed
college.middleware.js — sets req.college_id. SUPER_ADMIN bypasses.
College-scoped queries
✅ Mostly
Most controllers filter by req.college_id. Verified in staff.controller.js, student.controller.js, user.controller.js, timetable.controller, etc.
Database fallback for college_id
✅ Completed
If JWT lacks college_id, falls back to DB lookup on User collection
College suspension
✅ Completed
Checks college.isActive. Rejects suspended colleges.
Cascade deactivate
✅ Completed
college.model.js pre-hook: deactivates 14 related models when college is deactivated
Cascade restore
✅ Completed
Same pre-hook restores all on reactivation
Cascade hard delete
✅ Completed
Deletes all related data when college is removed
HOD middleware college scoping
❌ Breaks
hod.middleware.js queries omit college_id — multi-tenant isolation fails for HOD routes
Staff profile college scoping
✅ Completed
getStaffProfile filters by college_id

Critical Gap in Multi-Tenant
The HOD middleware is the only verified path where college_id is missing from queries.
Other middleware (college.middleware.js) provides the isolation layer, but hod.middleware.js queries bypass it.









Activity Logs / Audit Trails
Feature
Status
Details
Security Audit (auth events)
✅ Completed
securityAudit.service.js — logs login success/failure, logout, password change, brute force, unauthorized access, token blacklist. SecurityAudit model.
Security Audit API
✅ Completed
GET /api/security-audit, GET /api/security-audit/:id, GET /api/security-audit/dashboard
Admin Audit Log
✅ Completed
auditLog.service.js + auditLog.controller.js — logs admin actions. GET /api/audit-logs, GET /api/audit-logs/:id, GET /api/audit-logs/stats
Audit on deactivation
✅ Completed
user.controller.js calls auditLogService.logUserDeactivate
Audit on reactivation
✅ Completed
user.controller.js calls auditLogService.logUserReactivate
Audit on login
✅ Completed
auth.controller.js calls securityAuditService.logLoginSuccess/Failed
Audit on password change
✅ Completed
Both success and failure logged
Audit on staff creation
❌ Not Implemented
staff.controller.js createStaff does NOT call auditLogService
Audit on role change
❌ Not Implemented
updateStaffProfile allows role changes with no audit trail
Audit on HOD assignment
❌ Not Implemented
department.controller.js assignHOD does NOT audit
Audit on student approval
❌ Not Implemented
studentApproval.controller.js — no audit logging
Audit on staff deletion
❌ Not Implemented
No deletion endpoint exists
Audit on college deactivation
❌ Not Implemented
Cascade deactivation has no audit entries
Security Alert Emails
❌ Not Implemented
sendSecurityAlert is a TODO — logs to console only




Integrations Related to Users
Feature
Status
Details
Email service (college-level)
✅ Completed
email.service.js + collegeEmail.service.js. Uses Nodemailer. Per-college SMTP config (CollegeEmailConfig model). Sends fee reminders, payment receipts, deactivation/reactivation notices.
OTP service
✅ Completed
otp.service.js — email-based OTP with rate limiting, expiration, reuse prevention
QR code generation
✅ Completed
College registration QR stored in college.registrationQr
Document uploads
✅ Completed
multer.js upload middleware. Image/PDF only with double validation. Student documents upload during registration.
Payment gateway (Stripe)
✅ Completed
stripe.routes.js, stripe.payment.controller.js, collegeStripeConfig.routes.js
Payment gateway (Razorpay)
✅ Completed
razorpay.routes.js, razorpay.payment.controller.js, collegeRazorpayConfig.routes.js
Role-based notifications
⚠️ Partial
NotificationForm.jsx and NotificationListPage.jsx exist but only allow TEACHER and COLLEGE_ADMIN roles. HOD cannot send notifications.
SMS integration
❌ Not Implemented
No SMS provider found in the codebase




4. System Architecture (User Management Side)
Data Model Relationships
User (auth credentials + role + college_id)
├── StaffProfile (1:1 extended personal/professional data)
├── Student === Student (1:1, linked by user_id)
├── ParentGuardian === Student (1:many, by student_ids)
├── Teacher === User (1:1, by user_id)
├── Department === Teacher (hod_id references Teacher._id)
├── College (root tenant)
├── RefreshToken === User (many:1)
├── TokenBlacklist === User (many:1)
├── PasswordReset (email-based OTP store)
├── SecurityAudit (authentication/authorization events)
└── AuditLog (admin action events -- separate from SecurityAudit)
Key Schema Notes
User (user.model.js)
7 fields
email unique
role enum of 11 values
college_id required for all except SUPER_ADMIN
No name validation
No email format validation at schema level
Password hashed via pre-save hook
StaffProfile (staffProfile.model.js)
14 fields
No validation on mobile, pincode, dates
Enum on employmentType and gender/bloodGroup
Teacher (teacher.model.js)
18 fields
Has email validation
Has mobile validation
Experience bounds (0-50)
employmentType enum
college_id+employeeId unique compound index
Student (student.model.js)
60+ fields
Most thorough validation
Uses validators:
email
mobile
pincode
age
admission year
percentage
college_id+email unique
enrollmentNumber unique+sparse
Pre-save calculates currentYear from semester
Department (department.model.js)
8 fields
college_id+code unique compound index
hod_id is plain ObjectId with no uniqueness constraint
 
 
 
 
6. Edge Cases & Known Issues
Bugs and Inconsistencies
Issue
Severity
Detail
ApiError undefined in assignHOD
Critical
HOD assignment endpoint always fails with HTTP 500 because ApiError is referenced but not defined.
ViewStaffProfile page commented out
High
Staff profile viewing functionality is completely broken and displays a blank page.
UserManagement page is
High
Super Admin user management module has no implementation.
Student middleware status check disabled
Medium
Non-approved students can pass middleware checks despite login restrictions.
HOD middleware missing college filtering
Critical
Multi-tenant isolation is broken, allowing possible cross-college access.
Duplicate HOD authorization checks
Medium
Middleware and controllers perform the same validation, causing inconsistency.
Timetable publishing allows TEACHER role
Medium
Teachers may publish timetables although only HOD/Admin should be allowed.
Staff creation race condition
Medium
Concurrent requests can cause duplicate email conflicts and database errors.
College profile response inconsistent
Low
Endpoint returns raw document instead of standardized API response.
Access token returned in response body
Low
Token exposure risk despite using httpOnly cookies.
Employee ID uniqueness only within college
Low
Cross-college duplicate employee IDs are possible by design.
Student currentYear may become stale
Low
Updates bypass pre-save hook causing data inconsistency.
Staff profile editing allows admin-to-admin modification
Low
Role filtering permits editing of other COLLEGE_ADMIN accounts.
ParentGuardian lacks college isolation
Medium
Parent records are not scoped to a specific college.
HOD middleware returns first teacher match
High
Data corruption scenarios may cause incorrect teacher resolution.
TimetableSlot missing isActive field
Low
College cascade operations behave inconsistently.
Login performs multiple sequential queries
Low
Authentication is slower than necessary.

Permission Leaks
Permission Leak
Severity
Detail
Frontend and backend role mismatch
Medium
Frontend allows access to staff profiles for multiple roles but backend rejects them.
HOD access to Teacher routes
Medium
HOD users can access routes intended only for teachers.
Student search lacks validation
Medium
Search endpoint accepts unvalidated input.
Excessive college profile visibility
Low
Multiple roles can access full college information.
Platform Support bypasses college isolation
Low
Platform Support has access across all colleges by design.
ParentGuardian cross-college access
Medium
Parents can potentially access students from multiple colleges.
Self-reactivation possible
Low
Users cannot self-deactivate but may self-reactivate.
Staff role list inconsistency
Low
Backend and frontend allowed role lists are not synchronized.





Role Logic Breaks
Issue
Severity
Detail
HOD without Teacher record
High
User receives confusing "Teacher profile not found" error.
HOD without Department
High
User receives "Department not found" error despite having HOD role.
Teacher accessing HOD routes
Medium
Returns misleading 404 instead of authorization error.
Multi-department HOD ambiguity
Medium
Only first department is resolved.
Admission Officer privilege escalation
Medium
Can deactivate/reactivate senior roles.
Bulk student approval lacks validation
Medium
Invalid IDs may trigger unexpected behavior.
Password reset ambiguity
Medium
Duplicate emails across collections may reset wrong account.
College reactivation corrupts student statuses
High
PENDING and REJECTED students become APPROVED.
Staff role updates lack authorization checks
High
Potential privilege escalation risk.
HOD routes accept TEACHER role
Low
Incorrect role enforcement and misleading errors.





Performance Concerns
Concern
Impact
No pagination on staff listing
Large datasets can cause slow responses and memory issues.
No pagination on HOD teacher listing
Large departments return excessive data.
Login uses multiple database queries
Increased authentication latency.
HOD middleware performs multiple lookups
Additional database load on every request.
College cascade operations update multiple collections
Heavy database workload during activation/deactivation.
Security audit logs lack default date filtering
Full collection scans possible.
No caching layer
Repeated database hits for frequently accessed data.
Email processing not queued
SMTP delays may impact application performance.










7. Pending Work / Gaps
Not Implemented Features
Feature
Impact
ApiError utility
assignHOD endpoint remains broken.
Validation on non-student routes
Invalid data can reach controllers.
Super Admin user management
Platform users cannot be managed.
Staff deletion
No permanent removal mechanism exists.
Admin password reset for staff
Locked-out staff require manual intervention.
ObjectId validation
Invalid IDs can generate server errors.
HOD notification management
HOD cannot send departmental announcements.
Parent Guardian manual onboarding
Parent accounts cannot be created independently.
College enforcement in HOD middleware
Cross-college data leak risk remains.
Teacher email/mobile uniqueness
Duplicate contact information possible.
Comprehensive audit logging
Many administrative actions are not tracked.
Security alert emails
Critical security events are not communicated.
Password policy enforcement
Weak passwords may be generated.
Session management controls
Unlimited concurrent sessions allowed.
Multi-Factor Authentication (MFA)
Authentication relies solely on passwords.
Dedicated auth rate limiting
Brute-force protection is insufficient.
Student status enforcement
Middleware remains inconsistent with login flow.
ParentGuardian college isolation
Cross-college visibility risk.
Correct student status restoration
College reactivation corrupts student states.
ViewStaffProfile implementation
Staff profile UI remains broken.
Automated testing
No unit or integration tests exist.
API documentation
No Swagger/OpenAPI or Postman collection available.

Planned but Incomplete Features
Feature
Current State
Missing Functionality
Super Admin User Management
Placeholder page exists
Full CRUD, search, role management, bulk operations
Permission Matrix
Static permission service exists
Route and controller integration
HOD Notification System
Notification module exists
HOD role support
HOD Exam Management
Exam module exists
HOD access and controls
HOD Fee & Report Access
Reporting modules exist
Department-level reporting access
HOD Student Management
Student module exists
Department student views and actions
Staff Profile Viewing
Component exists but disabled
Complete implementation
Profile Edit Permission Granularity
Frontend and backend differ
Unified authorization model
Staff Password Reset
Not implemented
Admin-initiated reset workflow
Bulk Staff Operations
Not implemented
Batch activation, deactivation and role assignment

Overall Assessment
Area
Status
Authentication
Mostly Complete
Authorization
Functional with Critical Gaps
Multi-Tenant Isolation
Partially Complete
Audit Logging
Partially Complete
User Management
Mostly Complete
Security Hardening
Incomplete
HOD Functionality
Partially Complete
Performance Optimization
Incomplete
Testing
Not Implemented
Documentation
Not Implemented

Critical Issues Requiring Immediate Attention
1.      Fix ApiError implementation in HOD assignment.
2.      Add college_id filtering to HOD middleware.
3.      Restore ViewStaffProfile functionality.
4.      Re-enable student approval checks.
5.      Prevent role escalation through profile editing.
6.      Fix student status restoration during college reactivation.
7.      Implement validation on all routes.
8.      Add audit logging for all administrative actions.
Project Readiness
Metric
Status
Feature Completion
~80%
Security Readiness
~65%
Production Readiness
~70%
Documentation Readiness
~40%
Test Coverage
0%

 





8. Required but Not Yet Designed
Feature
Why Required
Proper RBAC Framework
Current role checks (allowedRoles.includes) are boolean-or gates. No resource-action matrix. Adding a new role requires hunting through every route file.
Permission Audit on Role Change
updateStaffProfile allows role changes with zero audit trail. Compliance risk.
Input Validation Layer on All Routes
Student module has express-validator. Everything else relies on Mongoose schema validation, which throws 500s on bad input. Need validation middleware per route group.
College-Scoped HOD Middleware
hod.middleware.js queries must include college_id: req.college_id. Without this, multi-tenant isolation is broken for the entire HOD feature.
Consistent Error Utility
ApiError is referenced but undefined. Need either a proper ApiError class or replace all references with AppError/ApiResponse.
ObjectId Validation on All Route Params
Need a generic validateId middleware for :id, :timetableId, :slotId, :studentId, etc.
Token Revocation on Deactivation
auth.middleware.js:57-64 checks user.isActive on every request, but stored refresh tokens are not revoked on deactivation and remain valid until expiry (7 days).
Concurrent Session Limits
No cap on simultaneous sessions per user.
Student Status Restoration Logic
College cascade restore needs to preserve original student statuses (PENDING, REJECTED) rather than blanket-setting to APPROVED.
ParentGuardian College Scoping
Add college_id to ParentGuardian schema and enforce in parent routes.





9. Testing Report
AI Audit Findings
Category
Finding
Files Affected
Severity
Security
HOD middleware omits college_id from all queries
hod.middleware.js
Critical
Security
ViewStaffProfile.jsx commented out — frontend shows broken page but backend still serves data
ViewStaffProfile.jsx, App.jsx
High
Security
ApiError is undefined in department.controller.js — assignHOD always returns 500
department.controller.js
Critical
Security
No ObjectId validation on 20+ routes with :id params
All route files except student.routes.js
Medium
Security
updateStaffProfile allows role changes without permission or audit
staff.controller.js:376-391
High
Security
auth.controller.js:login does sequential 3-query lookup — not atomic
auth.controller.js:25-160
Low
Security
college.model.js cascade restore overwrites student statuses
college.model.js:207
High
Data Integrity
user.controller.js:deactivateUser does not revoke refresh tokens
user.controller.js:20-115
Medium
Data Integrity
parentGuardian.model.js has no college_id
parentGuardian.model.js
Medium
Data Integrity
staff.controller.js:createStaff email uniqueness check is non-atomic
staff.controller.js:85-88
Medium
Data Integrity
student.middleware.js status check commented out
student.middleware.js:24
Medium
Consistency
getMyCollege uses raw res.json instead of ApiResponse.success
college.controller.js:36
Low
Consistency
UserManagementSett.jsx remains a stub
UserManagementSett.jsx
Low
Consistency
publishTimetable allows TEACHER in controller but route requires HOD
timetable.controller.js:110
Medium
Performance
No pagination on staff list or HOD teachers list
staff.controller.js, hod.controller.js
Medium
Performance
Login performs 3 sequential DB queries
auth.controller.js
Low
Completeness
No express-validator on 30+ route files
backend/src/routes/*.js
High
Completeness
No audit logging on staff creation, role changes, HOD assignment, student approval, college deactivation
Multiple controllers
Medium
Completeness
No security alert emails for HIGH/CRITICAL events
securityAudit.service.js
Medium



Manual Testing Findings
Authentication Flows
Test Case
Expected
Actual (From Code)
Status
Login with valid SUPER_ADMIN credentials
JWT issued with college_id: null
Code supports this via User.findOne({ email }) path
Needs Verification
Login with valid COLLEGE_ADMIN credentials
JWT issued with correct college_id
Supported. Must verify cookie is httpOnly
Needs Verification
Login with valid TEACHER credentials
JWT issued, role = TEACHER
Uses Teacher.findOne({ email, status: "ACTIVE" })
Verified in Code
Login with valid STUDENT credentials (APPROVED)
JWT issued, role = STUDENT
Requires both Student and User records
Verified in Code
Login with PENDING student
403 awaiting approval
Implemented
Verified in Code
Login with REJECTED student
403 with rejection reason
Implemented
Verified in Code
Login with DEACTIVATED student
403 deactivated
Implemented
Verified in Code
First Login with mustChangePassword
403 MUST_CHANGE_PASSWORD
Implemented
Verified in Code
Refresh Token (Valid)
New access token issued
Implemented
Needs Verification
Refresh Token (Revoked)
401 Invalid token
Implemented
Verified in Code
Logout
Cookies cleared and token revoked
Implemented
Needs Verification
Forgot Password (Invalid Email)
404 Email not found
Implemented
Verified in Code
Password Reset (Invalid OTP)
400 Invalid OTP
Implemented
Needs Verification
Password Reset (Valid OTP)
Password updated
Implemented
Needs Verification
Change Password (Wrong Password)
401 Current password incorrect
Implemented
Needs Verification
Change Password (<8 chars)
400 Validation error
Implemented
Verified in Code




Role-Based Access
Test Case
Expected
Actual (From Code)
Status
COLLEGE_ADMIN accesses Create Staff
200
Allowed
Needs Verification
TEACHER accesses Create Staff
403
Blocked
Verified in Code
HOD without Teacher Record
Clear authorization error
Returns 404 Teacher profile not found
Verified in Code
Regular Teacher accesses HOD Dashboard
403
Returns misleading 404
Verified in Code
HOD accesses Teacher List
Allowed
Works
Verified in Code
ACCOUNTANT accesses Staff Profile
Backend blocks
Frontend allows
Verified in Code
PARENT_GUARDIAN accesses Staff Profile
Backend blocks
Frontend allows
Verified in Code
PLATFORM_SUPPORT accesses platform routes
Allowed
Works
Verified in Code
SUPER_ADMIN accesses my-college










Should work
Returns 403 due to null college_id
Bug

Data Isolation
Test Case
Expected
Actual (From Code)
Status
Staff List
Only own college staff
Implemented
Verified
Create Staff for Another College
Blocked
Always assigns own college
Verified
HOD views another department
Blocked
Missing college filter
Needs Verification
Student views another student profile
Blocked
Implemented
Verified
Platform Support cross-college access
Allowed
Implemented
Verified


Edge Cases
Test Case
Expected
Actual (From Code)
Status
Duplicate Staff Email
409 Conflict
Race condition possible
Verified
Create HOD without Department
400 Error
Implemented
Verified
Existing Teacher promoted to HOD
Guided workflow
Implemented
Verified
Assign HOD when one already exists
Confirmation required
Silent overwrite
Verified
Self Deactivation
Blocked
Implemented
Verified
Self Reactivation
Should be blocked
Not blocked
Verified
Simultaneous Staff Creation
One success, one failure
DuplicateKeyError possible
Verified




Mismatches Between Expected and Actual Behavior
Mismatch
Expected
Actual
Staff Profile View
HOD should view profile
Backend restricts to COLLEGE_ADMIN
ViewStaffProfile Page
Should render profile
Component is commented out
HOD Dashboard Approvals
Real approval count
Hardcoded placeholder
assignHOD Endpoint
Successful assignment
Always returns 500
College Reactivation
Restore previous statuses
Sets all INACTIVE students to APPROVED
sendTokens Response
Cookie only
Cookie + accessToken in response body
Change Password
Force re-login
Old access token remains valid
Student Middleware
APPROVED students only
All statuses allowed














10. Summary
Completion Estimate
Module
Completion
Notes
Authentication
95%
Missing 2FA and session limits
Authorization
70%
Missing RBAC and validation
Profile Management
75%
Staff profile view broken
User Management
65%
HOD assignment broken, no deletion
Multi-Tenant Isolation
80%
HOD middleware issue
Audit Trails
60%
Missing admin action logs
Integrations
70%
No SMS support
HOD Module
50%
Limited functionality
Testing
0%
No tests found
API Documentation
0%
No Swagger/Postman








Overall User Management System Completion: ~65%
Major Risks
Risk
Impact
Likelihood
HOD middleware cross-college access
Data exposure
Medium
No audit trail
No accountability
Certain
Frontend/backend permission mismatch
User confusion
Certain
Student status corruption
Data integrity issue
Certain
No staff deletion
Orphaned accounts
Certain
Brute-force login attacks
Security risk
High
Refresh tokens not revoked
Continued unauthorized access
Certain

Priority Next Steps
P0 (Immediate Production Blockers)
Fix ApiError → ApiResponse in department.controller.js:assignHOD.
Restore ViewStaffProfile.jsx.
Add college_id filtering in hod.middleware.js.
Preserve original student statuses during college reactivation.
Revoke all refresh tokens when users are deactivated.
P1 (Security & Data Integrity)
Add express-validator to all remaining route groups.
Add generic ObjectId validation middleware.
Add audit logging to:
createStaff
updateStaffProfile
role changes
assignHOD
student approvals/rejections
college activation/deactivation
Implement security alert emails.
Add dedicated authentication rate limiting.
Add MFA support.
Add concurrent session controls.
 




AUDIT VERIFICATION RESULTS — 2026-06-01

### ✅ CONFIRMED BUGS (Require Fix)

#### 1. ApiError undefined in assignHOD
- File: `backend/src/controllers/department.controller.js`
- Lines: 115, 140
- Issue: References `ApiError.error()` and `ApiError.success()` but only `ApiResponse` is imported
- Impact: HOD assignment always returns HTTP 500

#### 2. HOD middleware missing college_id filtering
- File: `backend/src/middlewares/hod.middleware.js`
- Lines: 10, 34, 40-43, 61-63, 77
- Issue: All queries lack `college_id` filter
- Impact: Multi-tenant data isolation broken

#### 3. ViewStaffProfile.jsx partially commented out
- File: `frontend/src/pages/dashboard/College-Admin/ViewStaffProfile.jsx`
- Lines: 1-287
- Issue: Original implementation fully commented out
- Impact: Codebase instability, dead code present

#### 4. UserManagementSett.jsx is stub
- File: `frontend/src/pages/dashboard/Super-Admin/System-Settings/UserManagementSett.jsx`
- Issue: Returns `<div>UserManagementSett</div>` only
- Impact: No Super Admin user management functionality

#### 5. College cascade restore corrupts student status
- File: `backend/src/models/college.model.js`
- Lines: 206-207
- Issue: Resets all `status: "INACTIVE"` students to `"APPROVED"`
- Impact: PENDING/REJECTED students become APPROVED on college reactivation

#### 6. No express-validator on non-student routes
- Files: All routes except `student.routes.js`
- Issue: No input validation middleware
- Impact: Invalid data can reach controllers, causing 500 errors

#### 7. Missing audit logging on staff/HOD operations
- File: `backend/src/controllers/staff.controller.js`
- File: `backend/src/controllers/department.controller.js`
- Issue: No audit log calls in `createStaff` or `assignHOD`
- Impact: No trail for critical admin actions

#### 8. Access token in response body
- File: `backend/src/controllers/auth.controller.js`
- Lines: 610-617
- Issue: Returns `accessToken` in JSON body alongside httpOnly cookie
- Impact: Increased XSS token exposure risk

#### 9. ParentGuardian model lacks college_id
- File: `backend/src/models/parentGuardian.model.js`
- Issue: No `college_id` field in schema
- Impact: Cross-college parent visibility possible

#### 10. HOD middleware non-deterministic query
- File: `backend/src/middlewares/hod.middleware.js`
- Line: 10
- Issue: `Teacher.findOne({ user_id })` without sorting
- Impact: Wrong teacher could be returned if multiple exist

### ⚠️ PARTIALLY VERIFIED / MISMATCHED

#### 1. Student middleware status check
- Audit claimed: "Disabled"
- Actual: Status check EXISTS at lines 34-37
- Status: FALSE POSITIVE - working correctly

#### 2. Student approval audit logging
- Audit claimed: "Not implemented"
- Actual: `logStudentApproval`, `logStudentRejection`, `logBulkStudentApproval` ALL exist
- Status: FALSE POSITIVE - fully implemented

#### 3. Publish timetable role check
- Audit claimed: "Allows TEACHER incorrectly"
- Actual: Line 110 checks `["COLLEGE_ADMIN", "TEACHER"]` but HOD is missing
- Status: PARTIAL - inconsistent with route middleware design

#### 4. Refresh token revocation on deactivation
- Audit claimed: "Not revoked"
- Actual: No revocation in user deactivation; only in password reset
- Status: CONFIRMED MISSING for deactivation flow

