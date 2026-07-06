# MERN Stack ERP - Manual Test Case Document for QA Testing

**Generated:** July 2, 2026  
**Application:** Smart College Portal

---

## 1. USER ROLES AND PERMISSIONS

| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Full system access, all colleges, all features |
| **COLLEGE_ADMIN** | Full college-level access (CRUD for all entities, approvals) |
| **PRINCIPAL** | Read access to all college data, reports, limited write access |
| **HOD** | Department-level management, teacher subjects, leave approvals, timetable exceptions |
| **ACCOUNTANT** | Fee structure management, payment processing, defaulters, reports |
| **ADMISSION_OFFICER** | Student registration, approval workflow, reports |
| **EXAM_COORDINATOR** | Exam-related features, read access to students/courses |
| **TEACHER** | Attendance marking, timetable views, leave applications, profile management |
| **STUDENT** | View own attendance, fees, profile; limited access |
| **PARENT_GUARDIAN** | View linked children's data (attendance, fees, profile) |

---

## 2. TEST CASES BY MODULE

### MODULE 1: AUTHENTICATION

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| AUTH-TC-001 | Valid User Login | User account exists with credentials | 1. Navigate to /login<br>2. Enter valid email<br>3. Enter valid password<br>4. Click Sign In | Email: admin@college.edu<br>Password: ValidPass123 | Login successful, redirected to dashboard, tokens set as httpOnly cookies | High | Positive |
| AUTH-TC-002 | Invalid Login - Wrong Password | User account exists | 1. Navigate to /login<br>2. Enter valid email<br>3. Enter wrong password<br>4. Click Sign In | Email: admin@college.edu<br>Password: WrongPass | Error message "Invalid credentials", login fails | High | Negative |
| AUTH-TC-003 | Invalid Login - Non-existent Email | None | 1. Navigate to /login<br>2. Enter non-existent email<br>3. Enter any password<br>4. Click Sign In | Email: nonexistent@email.com<br>Password: AnyPass123 | Error message "User not found or not approved" | High | Negative |
| AUTH-TC-004 | Account Locked After Failed Attempts | User account exists | 1. Attempt login with wrong password 5+ times<br>2. Wait 1 minute between attempts | Email: test@college.edu<br>Password: wrong | Account locked for 15 minutes, shows lockout message | High | Negative |
| AUTH-TC-005 | Pending Student Login | Student registered, status=PENDING | 1. Navigate to /login<br>2. Enter student email<br>3. Enter password | Student email from pending list<br>Password: Valid | Error "account is awaiting admin approval" | High | Negative |
| AUTH-TC-006 | Rejected Student Login | Student exists, status=REJECTED | 1. Navigate to /login<br>2. Enter rejected student email<br>3. Enter password | Rejected student email<br>Password: Valid | Error "account has been rejected" with reason | High | Negative |
| AUTH-TC-007 | Deactivated Account Login | Account deactivated by admin | 1. Navigate to /login<br>2. Enter deactivated email<br>3. Enter password | Deactivated user email<br>Password: Valid | Error "account has been deactivated" | High | Negative |
| AUTH-TC-008 | Must Change Password Flow | User mustChangePassword=true | 1. Login with temp password<br>2. System redirects to /change-password | Valid email with temp password flag | Redirect to change password page | High | Positive |
| AUTH-TC-009 | Password Reset Request | Email exists in database | 1. Navigate to /forgot-password<br>2. Enter email<br>3. Click Send Reset Link | Valid email in system | OTP sent to email, rate limit enforced | High | Positive |
| AUTH-TC-010 | Invalid Password Reset Email | Email not in database | 1. Navigate to /forgot-password<br>2. Enter invalid email<br>3. Click Send | nonexistent@email.com | Error "Email not found in database" | Medium | Negative |
| AUTH-TC-011 | Verify OTP and Reset Password | OTP generated in DB | 1. Enter email<br>2. Enter valid OTP<br>3. Enter new password meeting policy<br>4. Submit | Valid OTP from email<br>New password: StrongPass@123 | Password reset, tokens invalidated | High | Positive |
| AUTH-TC-012 | Invalid OTP Reset | OTP expired or wrong | 1. Enter email<br>2. Enter wrong/expired OTP<br>3. Enter new password | Wrong OTP: 999999 | Error "Invalid or expired OTP" | Medium | Negative |
| AUTH-TC-013 | Weak Password Rejection | Password policy defined | 1. Enter password "< 8 chars"<br>2. Or no special chars<br>3. Submit | Weak: "pass123" | Error "Password must be at least 8 characters with..." | High | Boundary |
| AUTH-TC-014 | Token Refresh | Valid refresh token cookie | 1. Access protected route after token expiry | Existing session | New access token issued via refresh token | High | Positive |
| AUTH-TC-015 | Logout and Token Invalidation | User logged in | 1. Click logout<br>2. Check cookies cleared<br>3. Try accessing protected route | Any logged-in session | Tokens blacklisted, cookies cleared, access denied | High | Positive |

---

### MODULE 2: STUDENT MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| STU-TC-001 | Student Self-Registration | College code valid | 1. Navigate to /register/{collegeCode}<br>2. Fill all required fields<br>3. Upload required documents<br>4. Submit | fullName, email, mobile, DOB, address, courses, SSC/HSC details | Student created with PENDING status, documents uploaded | High | Positive |
| STU-TC-002 | Duplicate Email Registration | Email already registered | 1. Attempt registration with existing email | Existing student email | Error "duplicate email" | High | Negative |
| STU-TC-003 | Invalid Mobile Number | Mobile validation rules | 1. Enter invalid mobile (10 digits, not starting with 6-9) | Mobile: 1234567890 | Validation error for mobile format | Medium | Boundary |
| STU-TC-004 | Invalid Email Format | Email validation | 1. Enter email without @ or domain | Email: "invalidemail" | Email validation error | Medium | Boundary |
| STU-TC-005 | Invalid Percentage | Percentage > 100% or < 0% | 1. Enter SSC/HSC percentage "150"<br>2. Submit form | SSC%: 150 | Validation error for percentage range | Medium | Boundary |
| STU-TC-006 | Invalid Pincode | Pincode not 6 digits | 1. Enter pincode "12345"<br>2. Submit | Pincode: 12345 | Validation error for pincode | Medium | Boundary |
| STU-TC-007 | Admin - View Pending Students | Admin logged in, students pending | 1. Navigate to /students/registered<br>2. View list | Admin credentials | List of PENDING students displayed | High | Positive |
| STU-TC-008 | Admin - Approve Student | Student in PENDING status | 1. Select student<br>2. Click Approve<br>3. Confirm | Pending student ID | Student status changes to APPROVED, enrollment number assigned | High | Positive |
| STU-TC-009 | Admin - Reject Student | Student in PENDING status | 1. Select student<br>2. Click Reject<br>3. Enter reason<br>4. Confirm | Student ID<br>Reason: "Documents incomplete" | Student status changes to REJECTED | High | Positive |
| STU-TC-010 | Admin - Bulk Approve Students | Multiple students pending | 1. Select multiple students<br>2. Click Bulk Approve<br>3. Confirm | Multiple student IDs | All selected students approved | High | Positive |
| STU-TC-011 | Admin - Move to Alumni | Student APPROVED exists | 1. Select student<br>2. Click "Move to Alumni"<br>3. Confirm | Student ID | Student status changes to ALUMNI, alumniDate set | High | Positive |
| STU-TC-012 | Admin - Deactivate Student | Student is active | 1. Select active student<br>2. Click Deactivate<br>3. Confirm | Active student ID | Student status changes to DEACTIVATED | High | Positive |
| STU-TC-013 | Unauthorized Student Deletion | Non-admin user | 1. Login as teacher/principal<br>2. Attempt DELETE /students/{id} | Teacher credentials | 403 Forbidden error | High | Role-based |
| STU-TC-014 | Student - Update Own Profile | Student logged in | 1. Navigate to profile<br>2. Edit allowed fields<br>3. Save changes | Address, emergency contact updates | Profile updated (limited fields) | Medium | Positive |
| STU-TC-015 | Parent - View Child Details | Parent linked to student | 1. Parent logs in<br>2. Navigate to /parent/children<br>3. View child profile | Parent credentials | Child details displayed | High | Positive |

---

### MODULE 3: TEACHER MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| TCH-TC-001 | Admin - Create Teacher | Admin logged in | 1. Navigate to Add Teacher<br>2. Fill teacher details<br>3. Assign department/courses<br>4. Submit | name: "John Doe"<br>employeeId: "TCH001"<br>qualification: "M.Tech"<br>experience: 5 | Teacher created, linked User created | High | Positive |
| TCH-TC-002 | Duplicate Employee ID | Employee ID exists | 1. Create teacher with existing ID | employeeId: Existing ID | Error "duplicate employee ID" | High | Negative |
| TCH-TC-003 | Admin - Update Teacher | Teacher exists | 1. Edit teacher profile<br>2. Modify fields<br>3. Save | Teacher ID<br>New mobile number | Teacher profile updated | High | Positive |
| TCH-TC-004 | Admin - Deactivate Teacher | Teacher is active | 1. Select teacher<br>2. Click Deactivate<br>3. Handle reassignment | Teacher ID<br>Reassign to: other teacher | Teacher deactivated, courses reassigned | High | Positive |
| TCH-TC-005 | Teacher - View My Profile | Teacher logged in | 1. Navigate to /teacher/my-profile<br>2. View details | Teacher credentials | Own profile displayed | High | Positive |
| TCH-TC-006 | Teacher - Update My Profile | Teacher logged in | 1. Edit profile fields<br>2. Save changes | Teacher, address update | Profile updated | Medium | Positive |
| TCH-TC-007 | Unauthorized Teacher Creation | Non-admin user | 1. Login as teacher/HOD<br>2. Attempt POST /teachers | Teacher credentials | 403 Forbidden error | High | Role-based |
| TCH-TC-008 | Invalid Experience Years | Experience > 50 | 1. Create teacher with exp: 60 | experienceYears: 60 | Validation error: max 50 years | Medium | Boundary |
| TCH-TC-009 | HOD - View Department Teachers | HOD of department exists | 1. HOD logs in<br>2. Navigate to /hod/teachers | HOD credentials | Teachers in same department listed | High | Positive |

---

### MODULE 4: DEPARTMENT MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| DEP-TC-001 | Admin - Create Department | Admin logged in | 1. Navigate to Add Department<br>2. Fill details<br>3. Select type<br>4. Save | name: "Computer Science"<br>code: "CS"<br>type: "ACADEMIC" | Department created successfully | High | Positive |
| DEP-TC-002 | Duplicate Department Code | Code already exists | 1. Create department with existing code | code: Existing code | Error "duplicate department code" | High | Negative |
| DEP-TC-003 | Admin - Assign HOD | Teacher exists | 1. Open department<br>2. Assign teacher as HOD<br>3. Save | Teacher ID | HOD assigned, teacher.role updated to HOD | High | Positive |
| DEP-TC-004 | Admin - Remove HOD | Department has HOD | 1. Open department<br>2. Click Remove HOD<br>3. Confirm | Department ID | HOD removed from department | High | Positive |
| DEP-TC-005 | Unauthorized Department Delete | Non-admin user | 1. Login as teacher<br>2. Attempt DELETE /departments/{id} | Teacher credentials | 403 Forbidden error | High | Role-based |

---

### MODULE 5: COURSE MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| CRS-TC-001 | Admin - Create Course | Department exists | 1. Navigate to Add Course<br>2. Fill details<br>3. Link department<br>4. Save | name: "B.Tech CSE"<br>code: "CSE001"<br>durationSemesters: 8 | Course created, durationYears auto-calculated as 4 | High | Positive |
| CRS-TC-002 | Duplicate Course Code | Code exists in department | 1. Create course with existing code/semester | Same code, same department | Error "duplicate course code" | High | Negative |
| CRS-TC-003 | Invalid Duration Semesters | Semester < 1 or > 8 | 1. Create course with semesters: 10 | durationSemesters: 10 | Validation error: max 8 semesters | Medium | Boundary |
| CRS-TC-004 | Negative Credits | Credits < 0 | 1. Create course with credits: -5 | credits: -5 | Validation error: cannot be negative | Medium | Boundary |
| CRS-TC-005 | Unauthorized Course Update | Non-admin user | 1. Login as teacher<br>2. Attempt PUT /courses/{id} | Teacher credentials | 403 Forbidden error | High | Role-based |

---

### MODULE 6: FEE MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| FEE-TC-001 | Admin/Accountant - Create Fee Structure | Course exists | 1. Navigate to Create Fee Structure<br>2. Select course<br>3. Add installments<br>4. Save | totalFee: 50000<br>installments: 3 with due dates | Fee structure created | High | Positive |
| FEE-TC-002 | Fee Installment Validation | Due date past | 1. Create fee with past due date<br>2. Submit | dueDate: past date | Warning/validation for past dates | Medium | Boundary |
| FEE-TC-003 | Student - Pay Online Fee | Student logged in, fee exists | 1. Navigate to fee dashboard<br>2. Select installment<br>3. Complete Stripe payment flow<br>4. Return to portal | Student credentials | Payment processed, installment marked PAID | High | Positive |
| FEE-TC-004 | Offline Payment - Cash Mode | Admin logged in | 1. Navigate to Record Offline Payment<br>2. Select student/installment<br>3. Choose CASH mode<br>4. Save | Student ID<br>Mode: CASH<br>No reference required | Installment marked PAID, transaction ID generated | High | Positive |
| FEE-TC-005 | Offline Payment - Cheque/DD Requires Reference | Admin logged in | 1. Select CHEQUE/DD mode<br>2. Leave reference empty<br>3. Submit | Mode: CHEQUE<br>Reference: (empty) | Error "Reference number required for CHEQUE/DD" | High | Negative |
| FEE-TC-006 | Sequential Installment Payment | Previous installment unpaid | 1. Try paying installment 2<br>2. Without paying installment 1 | Installment 2 payment | Error "Previous installments are still pending" | High | Negative |
| FEE-TC-007 | Admin - View Defaulters List | Pending overdue installments exist | 1. Navigate to /accountant/defaulters<br>2. View list | Admin credentials | Defaulters listed with escalation levels | High | Positive |
| FEE-TC-008 | Payment Status Auto-Calculation | Installment paid | 1. Pay full installment amount<br>2. Check paidAmount field | Payment amount equals totalFee | paidAmount updated, status changes to PAID | High | Positive |
| FEE-TC-009 | Overdue Payment Escalation | Payment overdue > 0 days | 1. Wait for cron job/due date pass<br>2. Check escalation level | Days overdue: 1, 8, 16, 31+ | Escalation: DUE_TODAY, SLIGHTLY, MODERATELY, CRITICALLY_OVERDUE | High | Positive |
| FEE-TC-010 | Unauthorized Fee Access - HOD | HOD tries to access fee | 1. Login as HOD<br>2. Attempt /admin/payments/report | HOD credentials | 403 Forbidden error | High | Role-based |

---

### MODULE 7: ATTENDANCE MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| ATT-TC-001 | Teacher - Create Attendance Session | Teacher logged in, timetable exists | 1. Click Create Session<br>2. Select date<br>3. Select lecture number<br>4. Create | Session date<br>Lecture: 1 | Session created with OPEN status | High | Positive |
| ATT-TC-002 | Teacher - Mark Attendance | Session OPEN exists | 1. Select session<br>2. Mark students PRESENT/ABSENT<br>3. Click Save | Student attendance data | Attendance saved, cannot re-save | High | Positive |
| ATT-TC-003 | Attendance Already Saved Prevention | Attendance already marked | 1. Try marking same session again<br>2. Submit | Same session ID | Error "Attendance already saved. Use Edit option" | High | Negative |
| ATT-TC-004 | Teacher - Close Session | Session OPEN exists | 1. Mark all attendance<br>2. Click Close Session<br>3. Confirm | Session ID | Session status changes to CLOSED, no further edits allowed | High | Positive |
| ATT-TC-005 | HOD - Edit Closed Session Attendance | Session exists | 1. HOD navigates to session<br>2. Click Edit<br>3. Modify attendance<br>4. Save | Session ID | Attendance updated successfully | High | Positive |
| ATT-TC-006 | Mark All Students Feature | Students loaded in session | 1. Click "Mark All Present"<br>2. Click "Mark All Absent"<br>3. Use Undo | Any session with students | All students marked, undo available for 5 seconds | Medium | Positive |
| ATT-TC-007 | Student - View Own Attendance | Student logged in | 1. Navigate to /attendance/my<br>2. View report | Student credentials | Attendance report displayed | High | Positive |
| ATT-TC-008 | Unauthorized Attendance Mark | Wrong teacher | 1. Teacher from different dept tries to mark<br>2. Submit attendance | Teacher from other dept | 403 Forbidden error | High | Role-based |
| ATT-TC-009 | Principal - View All Attendance | Principal logged in | 1. Navigate to reports<br>2. View all sessions<br>3. Filter by date | Principal credentials | All attendance sessions visible | High | Positive |

---

### MODULE 8: LEAVE MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| LEA-TC-001 | Teacher - Apply for Leave | Teacher logged in | 1. Navigate to apply leave<br>2. Fill form with dates/type/reason<br>3. Submit | leaveType: "CASUAL"<br>startDate, endDate<br>reason: "Family function" | Leave created with PENDING status | High | Positive |
| LEA-TC-002 | Invalid Date Range | End date before start | 1. Apply leave with endDate < startDate<br>2. Submit | startDate: 2026-07-10<br>endDate: 2026-07-05 | Error "startDate must be on or before endDate" | High | Negative |
| LEA-TC-003 | Leave Overlapping Validation | Existing approved leave | 1. Apply leave overlapping date range<br>2. Submit for same teacher | Overlapping dates | Leave should be flagged/checked for overlap | High | Negative |
| LEA-TC-004 | HOD - Approve Leave | Leave PENDING in dept | 1. HOD views pending leaves<br>2. Click Approve<br>3. Confirm | Leave ID | Leave status changes to APPROVED, approvedBy/date set | High | Positive |
| LEA-TC-005 | HOD - Reject Leave | Leave PENDING exists | 1. HOD views pending leaves<br>2. Click Reject<br>3. Enter reason<br>4. Confirm | Leave ID<br>Reason: "Not enough quota" | Leave status changes to REJECTED | High | Positive |
| LEA-TC-006 | Teacher - Cancel Pending Leave | Leave in PENDING status | 1. Teacher views own leave<br>2. Click Cancel<br>3. Confirm | Leave ID | Leave status changes to CANCELLED | High | Positive |
| LEA-TC-007 | Cannot Modify Approved Leave | Leave APPROVED exists | 1. Try to edit/approve/reject APPROVED leave<br>2. Submit | Approved leave ID | Error "Cannot change status of APPROVED leave" | High | Negative |
| LEA-TC-008 | Maximum Attachments Validation | > 5 attachments | 1. Attach 6 files<br>2. Submit leave | 6 files | Error "Maximum 5 attachments allowed" | Medium | Boundary |

---

### MODULE 9: TIMETABLE MANAGEMENT

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| TTB-TC-001 | Teacher - Create Timetable | Teacher logged in | 1. Navigate to Create Timetable<br>2. Fill details<br>3. Save | Timetable data | Timetable created in DRAFT status | High | Positive |
| TTB-TC-002 | Teacher - Publish Timetable | Timetable in DRAFT | 1. Open timetable<br>2. Click Publish<br>3. Confirm | Timetable ID | Status changes to PUBLISHED | High | Positive |
| TTB-TC-003 | Teacher - Archive Timetable | Timetable PUBLISHED | 1. Open timetable<br>2. Click Archive<br>3. Confirm | Timetable ID | Timetable archived, no longer editable | High | Positive |
| TTB-TC-004 | Teacher - Add Timetable Slot | Timetable exists | 1. Navigate to Add Slot<br>2. Fill day/time/subject<br>3. Save | Slot data | Slot added to timetable | High | Positive |
| TTB-TC-005 | Teacher - Create Timetable Exception | Teacher has class | 1. Create exception request<br>2. Select date<br>3. Enter reason<br>4. Submit | Date, reason | Exception created, pending HOD approval | High | Positive |
| TTB-TC-006 | HOD - Approve Exception | Exception PENDING | 1. HOD views pending exceptions<br>2. Click Approve<br>3. Confirm | Exception ID | Exception approved, timetable updated | High | Positive |
| TTB-TC-007 | HOD - Reject Exception | Exception PENDING | 1. HOD views pending exceptions<br>2. Click Reject<br>3. Enter reason<br>4. Confirm | Exception ID<br>Reason | Exception rejected | High | Positive |
| TTB-TC-008 | Student - View Timetable | Student logged in | 1. Navigate to timetable<br>2. View schedule | Student credentials | Student timetable displayed | High | Positive |
| TTB-TC-009 | Unauthorized Timetable Delete | Non-creator user | 1. Login as HOD<br>2. Try to delete teacher's timetable<br>3. Submit | HOD credentials | 403 Forbidden error | High | Role-based |

---

### MODULE 10: NOTIFICATION SYSTEM

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| NOT-TC-001 | Admin - Create Notification | Admin logged in | 1. Navigate to Create Notification<br>2. Fill title/content/target<br>3. Send | title: "Exam Schedule"<br>target: "STUDENTS" | Notification created and sent | High | Positive |
| NOT-TC-002 | Student - View Notifications | Student logged in | 1. Navigate to notifications<br>2. View list | Student credentials | Student notifications listed | High | Positive |
| NOT-TC-003 | Mark Single Notification Read | Unread notification | 1. Click notification<br>2. Click Mark Read | Notification ID | Status changes to READ | Medium | Positive |
| NOT-TC-004 | Mark All Notifications Read | Multiple unread | 1. Click "Mark All Read"<br>2. Confirm | Any user with unread | All notifications marked READ | Medium | Positive |
| NOT-TC-005 | Teacher - Create Notification | Teacher logged in | 1. Navigate to create<br>2. Fill form<br>3. Send to students | Teacher credentials | Notification sent to students | Medium | Positive |

---

### MODULE 11: REPORTS & ANALYTICS

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| RPT-TC-001 | Admin - Payment Summary Report | Payments exist | 1. Navigate to /admin/reports/payment-summary<br>2. View report | Admin credentials | Payment report with totals displayed | High | Positive |
| RPT-TC-002 | Admin - Admission Summary | Students exist | 1. Navigate to /admin/reports/admissions<br>2. View summary | Admin credentials | Admission stats by department/course | High | Positive |
| RPT-TC-003 | Admin - Attendance Summary | Attendance records exist | 1. Navigate to attendance report<br>2. Filter by date<br>3. View | Date range | Attendance summary with present/absent counts | High | Positive |
| RPT-TC-004 | Admin - Low Attendance Students | Low attendance records | 1. Navigate to low attendance report<br>2. View students | Admin credentials | Students below threshold listed | High | Positive |
| RPT-TC-005 | Principal - View All Reports | Principal logged in | 1. Access reports section<br>2. View all college data | Principal credentials | All reports accessible | High | Positive |
| RPT-TC-006 | Unauthorized Report Access - Teacher | Teacher tries to view admin report | 1. Login as teacher<br>2. Attempt /admin/reports/payment-summary | Teacher credentials | 403 Forbidden error | High | Role-based |

---

### MODULE 12: PARENT PORTAL

| Test Case ID | Test Case Title | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------------|-----------------|---------------|------------|-----------|-----------------|----------|-----------|
| PAR-TC-001 | Parent - View Linked Children | Parent linked to students | 1. Parent logs in<br>2. Navigate to /parent/children<br>3. View list | Parent credentials | List of linked children displayed | High | Positive |
| PAR-TC-002 | Parent - View Child Fees | Parent has children | 1. Select child<br>2. Navigate to Fees tab<br>3. View | Child ID | Child's fee details and payment history | High | Positive |
| PAR-TC-003 | Parent - View Child Attendance | Parent has children | 1. Select child<br>2. Navigate to Attendance tab<br>3. View | Child ID | Child's attendance report displayed | High | Positive |
| PAR-TC-004 | Unauthorized Child Access | Parent tries to view non-linked child | 1. Parent tries child not linked<br>2. Access via URL | Non-linked child ID | 403 Forbidden error | High | Role-based |

---

## 3. API ENDPOINTS REFERENCE

### Authentication Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/auth/login` | POST | All | User authentication, returns JWT tokens |
| `/api/auth/logout` | POST | Authenticated | Invalidate tokens, blacklist access token |
| `/api/auth/refresh` | POST | Authenticated | Refresh access token using refresh cookie |
| `/api/auth/forgot-password` | POST | All | Request password reset OTP |
| `/api/auth/verify-otp-reset` | POST | All | Verify OTP and reset password |
| `/api/auth/change-password` | POST | Authenticated | Change password (first login or any time) |
| `/api/auth/me` | GET | Authenticated | Get current user info |

### Student Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/students/register/:collegeCode` | POST | Public | Student self-registration |
| `/api/students/registered` | GET | Admin/Admission Officer | View pending students |
| `/api/students/approved-students` | GET | Admin/Principal/Accountant | View approved students |
| `/api/students/:studentId/approve` | PUT | Admin/Admission Officer | Approve student application |
| `/api/students/:studentId/reject` | PUT | Admin/Admission Officer | Reject student application |
| `/api/students/:studentId/confirm-enrollment` | PUT | Admin/Admission Officer | Confirm seat enrollment |
| `/api/students/bulk-approve` | POST | Admin/Admission Officer | Bulk approve students |
| `/api/students/:studentId/to-alumni` | POST | Admin/Admission Officer | Move student to alumni |
| `/api/students/deactivated` | GET | Admin/Admission Officer/Principal | View deactivated students |
| `/api/students/alumni` | GET | Admin/Admission Officer/Principal | View alumni list |
| `/api/students/search` | GET | Admin/Accountant/Principal | Search students by name/email |

### Teacher Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/teachers` | POST | Admin | Create teacher |
| `/api/teachers` | GET | Admin/HOD/Teacher/Principal | List teachers |
| `/api/teachers/:id` | GET | Admin/HOD/Principal/Exam Coordinator | Get teacher by ID |
| `/api/teachers/:id` | PUT | Admin | Update teacher |
| `/api/teachers/:id/deactivate` | PUT | Admin | Deactivate teacher with reassignment |
| `/api/teachers/:id/delete` | DELETE | Admin | Delete teacher |
| `/api/teachers/my-profile` | GET/PUT | Teacher | View/Edit own profile |

### Department Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/departments` | POST | Admin | Create department |
| `/api/departments` | GET | Admin/Principal/Exam Coordinator/Accountant | List departments |
| `/api/departments/:id` | GET | Admin/Principal/Exam Coordinator/Accountant | Get department |
| `/api/departments/:id` | PUT/DELETE | Admin | Update/Delete department |
| `/api/departments/:id/assign-hod` | PUT | Admin | Assign HOD to department |
| `/api/departments/:id/hod` | DELETE | Admin | Remove HOD from department |

### Course Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/courses` | POST | Admin | Create course |
| `/api/courses` | GET | Admin/Teacher/Principal/Accountant | List all courses |
| `/api/courses/department/:deptId` | GET | Admin/Teacher/HOD/Principal/Accountant | Courses by department |
| `/api/courses/:id` | GET | Admin/Principal/Exam Coordinator/Accountant | Get course by ID |
| `/api/courses/:id` | PUT/DELETE | Admin | Update/Delete course |

### Fee Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/fees` | POST | Admin/Accountant | Create fee structure |
| `/api/fees` | GET | Admin/Accountant/Principal | List fee structures |
| `/api/fees/:feeStructureId` | GET | Admin/Accountant/Principal | Get fee structure |
| `/api/fees/:feeStructureId` | PUT/DELETE | Admin/Accountant | Update/Delete fee structure |
| `/api/admin/payments` | GET/POST | Admin/Accountant/Principal | Payment reports and recording |

### Student Payment Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/student-payments/create-order` | POST | Student | Create Stripe checkout session |
| `/api/student-payments/my-fee-dashboard` | GET | Student | View own fee dashboard |
| `/api/student-payments/status` | GET | Student | Check payment status |
| `/api/student-payments/receipt/:id` | GET | Student | Download receipt |

### Attendance Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/attendance/sessions` | POST/GET | Teacher/HOD/Principal | Create/List sessions |
| `/api/attendance/sessions/:id` | GET/PUT/DELETE | Teacher/HOD/Principal | Session operations |
| `/api/attendance/sessions/:id/close` | PUT | Teacher/HOD | Close session |
| `/api/attendance/sessions/:id/mark` | POST | Teacher/HOD | Mark attendance |
| `/api/attendance/report` | GET | Teacher/HOD/Principal | Attendance reports |

### Leave Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/leave` | POST | Teacher | Apply for leave |
| `/api/leave/my` | GET | Teacher | View own leaves |
| `/api/leave/pending` | GET | HOD | View pending approvals |
| `/api/leave/history` | GET | HOD | View approval history |
| `/api/leave/:id/approve` | PUT | HOD | Approve leave |
| `/api/leave/:id/reject` | PUT | HOD | Reject leave |
| `/api/leave/:id/cancel` | PUT | Teacher | Cancel own leave |

### Timetable Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/timetables` | POST | Teacher/HOD | Create timetable |
| `/api/timetables` | GET | Teacher/Principal/HOD/Exam Coordinator | List timetables |
| `/api/timetables/:id/publish` | PUT | Teacher/HOD | Publish timetable |
| `/api/timetables/:id/archive` | PUT | Teacher/HOD | Archive timetable |
| `/api/timetables/:id` | DELETE | Teacher/HOD | Delete timetable |

### Notification Endpoints
| Endpoint | Method | Role Access | Description |
|----------|--------|-------------|-------------|
| `/api/notifications/admin/create` | POST | Admin | Create admin notification |
| `/api/notifications/teacher/create` | POST | Teacher | Create teacher notification |
| `/api/notifications/admin/read` | GET | Admin/Principal | Admin notifications |
| `/api/notifications/teacher/read` | GET | Teacher | Teacher notifications |
| `/api/notifications/hod/read` | GET | HOD | HOD notifications |
| `/api/notifications/student/read` | GET | Student | Student notifications |

---

## 4. INCOMPLETE OR IN-PROGRESS FEATURES

| Feature | Status | Notes |
|---------|--------|-------|
| Exam Coordinator Dashboard | Partial | Only GET /dashboard route exists, functionality limited |
| Bulk Student Actions | Missing | No bulk actions UI component found |
| Bulk Approve Students | Complete | Backend implemented, frontend partial |
| Student Export/Import | Not Found | Feature not implemented |
| Document Verification Workflow | Partial | Upload exists, no verification flow |
| Payment Gateway Webhook Testing | Partial | Scripts exist but require integration testing |

---

## 5. INTEGRATION TEST SCENARIOS

| Integration Point | Description | Test Coverage |
|-------------------|-------------|---------------|
| Student → Fee Creation | Student approval triggers fee record creation | Verify fee record exists after student approval |
| Payment → Email Receipt | Offline payment triggers email with PDF receipt | Verify email sent and receipt downloadable |
| Timetable → Attendance | Sessions linked to timetable slots | Verify session shows correct time/course data |
| Teacher Deactivation → Course Reassignment | Deactivating teacher requires course reassignment | Verify courses reassigned before deactivation |
| Leave Approval → Notification | Leave approval sends notification to teacher | Verify teacher receives approval notification |
| Payment Overdue → Escalation | Cron job updates escalation levels | Verify escalation levels update correctly |

---

*End of Test Case Document*