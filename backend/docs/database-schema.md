# Database Schema

Generated from `backend/src/models/*.model.js`.

- Database type: MongoDB
- ORM: Mongoose
- Total model files: 38
- Total collections: 38
- Most collections use MongoDB `_id` and Mongoose `__v` unless otherwise noted.
- Several collections use `createdAt` and `updatedAt` through `{ timestamps: true }`.

## Collection Summary

| # | Mongoose model | MongoDB collection | Domain |
|---:|---|---|---|
| 1 | Attendance | `attendances` | Academic / Attendance |
| 2 | AttendanceRecord | `attendancerecords` | Academic / Attendance |
| 3 | AttendanceSession | `attendancesessions` | Academic / Attendance |
| 4 | AuditLog | `auditlogs` | System / Audit |
| 5 | Backup | `backups` | System / Backup |
| 6 | College | `colleges` | Core |
| 7 | CollegeEmailConfig | `collegeemailconfigs` | College Configuration |
| 8 | CollegePaymentConfig | `collegepaymentconfigs` | College Configuration |
| 9 | Course | `courses` | Academic |
| 10 | Department | `departments` | Academic |
| 11 | DocumentConfig | `documentconfigs` | Documents |
| 12 | FeatureFlag | `featureflags` | Platform |
| 13 | FeeStructure | `feestructures` | Finance |
| 14 | IntegrationHealth | `integration_health` | System / Health |
| 15 | Invoice | `invoices` | Finance |
| 16 | Leave | `leaves` | HR / Leave |
| 17 | Notification | `notifications` | Communication |
| 18 | NotificationRead | `notificationreads` | Communication |
| 19 | ParentGuardian | `parentguardians` | Core |
| 20 | PasswordReset | `passwordresets` | Auth |
| 21 | Permission | `permissions` | Auth / RBAC |
| 22 | PromotionHistory | `promotionhistorys` | Academic |
| 23 | PromotionPolicy | `promotionpolicys` | Academic |
| 24 | RefreshToken | `refreshtokens` | Auth |
| 25 | SecurityAudit | `securityaudits` | System / Security |
| 26 | StaffProfile | `staffprofiles` | Staff |
| 27 | Student | `students` | Student |
| 28 | StudentFee | `studentfees` | Finance |
| 29 | Subject | `subjects` | Academic |
| 30 | SupportTicket | `support_tickets` | Platform Support |
| 31 | SystemHealth | `system_health` | System / Health |
| 32 | SystemLog | `system_logs` | System / Logs |
| 33 | Teacher | `teachers` | Staff |
| 34 | Timetable | `timetables` | Academic |
| 35 | TimetableException | `timetableexceptions` | Academic |
| 36 | TimetableSlot | `timetableslots` | Academic |
| 37 | TokenBlacklist | `tokenblacklists` | Auth |
| 38 | User | `users` | Auth / Core |

## Domain Groups

### Core and Auth
`College`, `User`, `RefreshToken`, `TokenBlacklist`, `PasswordReset`, `Permission`, `FeatureFlag`

### College and People
`Department`, `Course`, `Subject`, `Student`, `Teacher`, `StaffProfile`, `ParentGuardian`

### Academic Operations
`Timetable`, `TimetableSlot`, `TimetableException`, `Attendance`, `AttendanceSession`, `AttendanceRecord`, `Leave`, `PromotionPolicy`, `PromotionHistory`

### Finance and Documents
`FeeStructure`, `StudentFee`, `Invoice`, `DocumentConfig`

### Communication and Support
`Notification`, `NotificationRead`, `SupportTicket`

### System, Audit, and Health
`AuditLog`, `SecurityAudit`, `SystemLog`, `SystemHealth`, `IntegrationHealth`, `Backup`

### College Integrations
`CollegeEmailConfig`, `CollegePaymentConfig`

## Common Field Types

| Type | Meaning |
|---|---|
| `ObjectId` | MongoDB document reference |
| `ObjectId ref=Model` | Mongoose reference to another collection |
| `String` | Text value |
| `Number` | Numeric value |
| `Boolean` | True/false value |
| `Date` | Date/time value |
| `Array` | List of values or subdocuments |
| `Map` | Key/value object |
| `Mixed` | Flexible JSON-like value |

## Key Relationships

| From collection | Field | References |
|---|---|---|
| `users` | `college_id` | `colleges` |
| `students` | `college_id` | `colleges` |
| `students` | `department_id` | `departments` |
| `students` | `course_id` | `courses` |
| `students` | `user_id` | `users` |
| `students` | `promotionHistory` | `promotionhistorys` |
| `teachers` | `college_id` | `colleges` |
| `teachers` | `department_id` | `departments` |
| `teachers` | `user_id` | `users` |
| `teachers` | `courses` | `courses` |
| `teachers` | `subjects` | `subjects` |
| `departments` | `college_id` | `colleges` |
| `departments` | `hod_id` | `teachers` |
| `courses` | `college_id` | `colleges` |
| `courses` | `department_id` | `departments` |
| `subjects` | `college_id` | `colleges` |
| `subjects` | `department_id` | `departments` |
| `subjects` | `course_id` | `courses` |
| `subjects` | `teacher_id` | `teachers` |
| `timetables` | `college_id` | `colleges` |
| `timetables` | `department_id` | `departments` |
| `timetables` | `course_id` | `courses` |
| `timetables` | `createdBy` | `teachers` |
| `timetableslots` | `timetable_id` | `timetables` |
| `timetableslots` | `subject_id` | `subjects` |
| `timetableslots` | `teacher_id` | `teachers` |
| `attendance_sessions` | `slot_id` | `timetableslots` |
| `attendance_sessions` | `subject_id` | `subjects` |
| `attendance_sessions` | `teacher_id` | `teachers` |
| `attendance_records` | `session_id` | `attendance_sessions` |
| `attendance_records` | `student_id` | `students` |
| `feestructures` | `college_id` | `colleges` |
| `feestructures` | `course_id` | `courses` |
| `studentfees` | `student_id` | `students` |
| `studentfees` | `college_id` | `colleges` |
| `studentfees` | `course_id` | `courses` |
| `promotionhistorys` | `student_id` | `students` |
| `promotionhistorys` | `newFeeStructureId` | `feestructures` |
| `promotionhistorys` | `newStudentFeeId` | `studentfees` |
| `notifications` | `target_department` | `departments` |
| `notifications` | `target_course` | `courses` |
| `notificationreads` | `notification_id` | `notifications` |
| `leaves` | `teacher_id` | `teachers` |
| `leaves` | `department_id` | `departments` |
| `parentguardians` | `student_ids` | `students` |

## Collection Details

### 1. User

Collection: `users`

Stores authentication accounts and platform roles.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto | MongoDB document id |
| `college_id` | ObjectId ref=`College` | Conditional |  | Required when `role != SUPER_ADMIN` |
| `name` | String | No |  |  |
| `email` | String | No |  | Unique |
| `password` | String | No |  | Hashed with bcrypt before save |
| `role` | String | Yes |  | `SUPER_ADMIN`, `COLLEGE_ADMIN`, `PRINCIPAL`, `HOD`, `ACCOUNTANT`, `ADMISSION_OFFICER`, `EXAM_COORDINATOR`, `PARENT_GUARDIAN`, `PLATFORM_SUPPORT`, `TEACHER`, `STUDENT` |
| `isActive` | Boolean | No | `true` | Indexed |
| `mustChangePassword` | Boolean | No | `false` |  |
| `loginAttempts` | Number | No | `0` |  |
| `lockedUntil` | Date | No |  |  |

Indexes / constraints:

- Unique `email`
- Index on `isActive`
- Pre-save hook hashes `password` when modified.

### 2. College

Collection: `colleges`

Stores tenant college profile, subscription, registration QR, and setup state.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `name` | String | Yes |  |  |
| `code` | String | Yes |  | Unique, lowercase |
| `email` | String | Yes |  | Unique, validated email |
| `admin_id` | ObjectId ref=`User` | No |  | Indexed |
| `adminEmail` | String | No |  |  |
| `adminName` | String | No |  |  |
| `contactNumber` | String | Yes |  | Validated Indian mobile |
| `address` | String | Yes |  |  |
| `establishedYear` | Number | Yes |  | Min `1900`, max current year |
| `logo` | String | No |  | File path or URL |
| `isActive` | Boolean | No | `true` |  |
| `createdAt` | Date | No | `Date.now` |  |
| `registrationUrl` | String | Yes |  |  |
| `registrationQr` | String | Yes |  | QR image path |
| `setupCompleted` | Boolean | No | `false` |  |
| `subscription.plan` | String | No | `TRIAL` | `TRIAL`, `BASIC`, `PRO`, `ENTERPRISE` |
| `subscription.status` | String | No | `ACTIVE` | `ACTIVE`, `EXPIRED`, `CANCELLED`, `PAST_DUE` |
| `subscription.currentPeriodStart` | Date | No |  |  |
| `subscription.currentPeriodEnd` | Date | No |  |  |
| `subscription.trialEndsAt` | Date | No |  |  |
| `subscription.cancelAtPeriodEnd` | Boolean | No | `false` |  |

Indexes / constraints:

- Unique `code`
- Unique `email`
- Index on `admin_id`
- `findOneAndUpdate` middleware cascades `isActive=false` or `isActive=true` to related departments, courses, students, teachers, subjects, fee structures, student fees, notifications, timetables, timetable slots, attendance sessions, attendance records, document configs, and users.
- `findOneAndDelete` middleware hard-deletes related college data.

### 3. Department

Collection: `departments`

Stores college departments.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `name` | String | Yes |  | Trimmed |
| `code` | String | Yes |  | Uppercase |
| `type` | String | Yes |  | `ACADEMIC`, `ADMINISTRATIVE` |
| `status` | String | No | `ACTIVE` | `ACTIVE`, `INACTIVE` |
| `hod_id` | ObjectId ref=`Teacher` | No | `null` | Assigned later |
| `programsOffered` | Array<String> | Yes |  | Example: `UG`, `PG` |
| `startYear` | Number | Yes |  |  |
| `sanctionedFacultyCount` | Number | Yes |  |  |
| `sanctionedStudentIntake` | Number | Yes |  |  |
| `createdBy` | ObjectId ref=`User` | Yes |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique composite index: `{ college_id, code }`

### 4. Course

Collection: `courses`

Stores academic courses/programs.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `department_id` | ObjectId ref=`Department` | Yes |  |  |
| `name` | String | Yes |  |  |
| `code` | String | Yes |  | Uppercase |
| `type` | String | Yes |  | `THEORY`, `PRACTICAL`, `BOTH` |
| `status` | String | No | `ACTIVE` | `ACTIVE`, `INACTIVE` |
| `programLevel` | String | Yes |  | `UG`, `PG`, `DIPLOMA`, `PHD` |
| `durationSemesters` | Number | Yes |  | Min `1`, max `8` |
| `durationYears` | Number | No |  | Auto-calculated from `durationSemesters` |
| `credits` | Number | Yes |  | Min `0` |
| `maxStudents` | Number | Yes |  |  |
| `yearLabels` | Array<String> | No |  |  |
| `createdBy` | ObjectId ref=`User` | Yes |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique composite index: `{ college_id, department_id, code }`
- Indexes on `{ college_id, durationSemesters }` and `{ college_id, durationYears }`
- Pre-save hook sets `durationYears = ceil(durationSemesters / 2)`.

### 5. Subject

Collection: `subjects`

Stores subjects mapped to departments and courses.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `department_id` | ObjectId ref=`Department` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `name` | String | Yes |  |  |
| `code` | String | Yes |  | Uppercase |
| `semester` | Number | Yes |  | Min `1`, max `8` |
| `credits` | Number | Yes |  | Min `0` |
| `teacher_id` | ObjectId ref=`Teacher` | No |  |  |
| `status` | String | No | `ACTIVE` | `ACTIVE`, `INACTIVE` |
| `createdBy` | ObjectId ref=`User` | Yes |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique composite index: `{ college_id, course_id, code }`
- Index: `{ department_id, teacher_id, status }`

### 6. Student

Collection: `students`

Stores student profile, admission status, academic details, documents, promotion data, and parent/guardian fields.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `user_id` | ObjectId ref=`User` | No |  | Unique, sparse |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `department_id` | ObjectId ref=`Department` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `fullName` | String | Yes |  |  |
| `email` | String | Yes |  | Validated email |
| `mobileNumber` | String | Yes |  | Validated Indian mobile |
| `gender` | String | Yes |  | `Male`, `Female`, `Other` |
| `dateOfBirth` | Date | Yes |  | Age between 14 and 100 |
| `addressLine` | String | Yes |  |  |
| `city` | String | Yes |  |  |
| `state` | String | Yes |  |  |
| `pincode` | String | Yes |  | Validated Indian pincode |
| `admissionYear` | Number | Yes |  | Validated admission year |
| `currentSemester` | Number | Yes |  | Min `1`, max `8` |
| `currentYear` | Number | No | `1` | Auto-calculated from `currentSemester` |
| `division` | String | No | `null` | Trimmed |
| `previousQualification` | String | No |  |  |
| `previousInstitute` | String | No |  |  |
| `category` | String | Yes |  | `GEN`, `OBC`, `SC`, `ST`, `OTHER` |
| `nationality` | String | No | `Indian` |  |
| `bloodGroup` | String | No |  |  |
| `alternateMobile` | String | No |  |  |
| `fatherName` | String | No |  |  |
| `fatherMobile` | String | No |  |  |
| `fatherEmail` | String | No |  |  |
| `motherName` | String | No |  |  |
| `motherMobile` | String | No |  |  |
| `motherEmail` | String | No |  |  |
| `sscSchoolName` | String | No |  |  |
| `sscBoard` | String | No |  |  |
| `sscPassingYear` | Number | No |  | Validated year |
| `sscPercentage` | Number | No |  | Validated percentage |
| `sscRollNumber` | String | No |  |  |
| `hscSchoolName` | String | No |  |  |
| `hscBoard` | String | No |  |  |
| `hscStream` | String | No |  | `Science`, `Commerce`, `Arts`, `Vocational`, `Other` |
| `hscPassingYear` | Number | No |  | Validated year |
| `hscPercentage` | Number | No |  | Validated percentage |
| `hscRollNumber` | String | No |  |  |
| `sscMarksheetPath` | String | No |  |  |
| `hscMarksheetPath` | String | No |  |  |
| `passportPhotoPath` | String | No |  |  |
| `categoryCertificatePath` | String | No |  |  |
| `incomeCertificatePath` | String | No |  |  |
| `characterCertificatePath` | String | No |  |  |
| `transferCertificatePath` | String | No |  |  |
| `aadharCardPath` | String | No |  |  |
| `entranceExamScorePath` | String | No |  |  |
| `migrationCertificatePath` | String | No |  |  |
| `domicileCertificatePath` | String | No |  |  |
| `casteCertificatePath` | String | No |  |  |
| `nonCreamyLayerCertificatePath` | String | No |  |  |
| `physicallyChallengedCertificatePath` | String | No |  |  |
| `sportsQuotaCertificatePath` | String | No |  |  |
| `nriSponsorCertificatePath` | String | No |  |  |
| `gapCertificatePath` | String | No |  |  |
| `affidavitPath` | String | No |  |  |
| `documents` | Map<String> | No |  | Generic document path storage |
| `addressLine2` | String | No |  |  |
| `country` | String | No | `India` |  |
| `religion` | String | No |  |  |
| `alternateMobileNumber` | String | No |  |  |
| `emergencyContactName` | String | No |  |  |
| `emergencyContactNumber` | String | No |  |  |
| `parentGuardianOccupation` | String | No |  |  |
| `parentGuardianIncome` | String | No |  |  |
| `minorityType` | String | No |  |  |
| `pwdDisability` | String | No |  |  |
| `hostelRequired` | Boolean | No | `false` |  |
| `libraryRequired` | Boolean | No | `true` |  |
| `status` | String | No | `PENDING` | `PENDING`, `OFFER_MADE`, `SEAT_CONFIRMED`, `ENROLLED`, `APPROVED`, `REJECTED`, `DELETED`, `ALUMNI`, `DEACTIVATED`, `INACTIVE` |
| `suspendedFromStatus` | String | No | `null` | Tracks status before suspension |
| `alumniStatus` | Boolean | No | `false` |  |
| `alumniDate` | Date | No |  |  |
| `graduationYear` | Number | No |  |  |
| `registeredVia` | String | No | `SELF` | Only `SELF` |
| `enrollmentNumber` | String | No |  | Unique, sparse |
| `approvedBy` | ObjectId ref=`User` | No |  |  |
| `approvedAt` | Date | No |  |  |
| `offerMadeAt` | Date | No |  |  |
| `offerMadeBy` | ObjectId ref=`User` | No |  |  |
| `seatConfirmedAt` | Date | No |  |  |
| `enrollmentConfirmedAt` | Date | No |  |  |
| `enrollmentDate` | Date | No |  |  |
| `rejectionReason` | String | No |  |  |
| `rejectedBy` | ObjectId ref=`User` | No |  |  |
| `rejectedAt` | Date | No |  |  |
| `canReapply` | Boolean | No | `true` |  |
| `currentAcademicYear` | String | Yes | Function | Format: `YYYY-YYYY` |
| `isPromotionEligible` | Boolean | No | `true` |  |
| `promotionHistory` | Array<ObjectId ref=`PromotionHistory`> | No |  |  |
| `lastPromotionDate` | Date | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique sparse `user_id`
- Unique `college_id + email`
- Unique sparse `enrollmentNumber`
- Indexes on `{ college_id, status }`, `{ college_id, department_id }`, `{ college_id, course_id }`, `{ user_id }`, `{ college_id, currentSemester }`, `{ college_id, currentYear }`, `{ status, admissionYear }`, and `{ college_id, course_id, currentSemester, division }`
- Pre-save hook sets `currentYear = ceil(currentSemester / 2)`.

### 7. Teacher

Collection: `teachers`

Stores teacher profile, employee details, assigned courses/subjects, and login lock metadata.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `user_id` | ObjectId ref=`User` | Yes |  | Unique |
| `department_id` | ObjectId ref=`Department` | Yes |  |  |
| `courses` | Array<ObjectId ref=`Course`> | No |  |  |
| `name` | String | Yes |  |  |
| `email` | String | Yes |  | Unique, validated email |
| `mobileNumber` | String | No |  | Validated Indian mobile when present |
| `gender` | String | No |  | `Male`, `Female`, `Other`, `Prefer not to say` |
| `bloodGroup` | String | No |  | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `N/A` |
| `dateOfBirth` | Date | No |  |  |
| `address` | String | No |  |  |
| `city` | String | No |  |  |
| `state` | String | No |  |  |
| `pincode` | String | No |  |  |
| `employeeId` | String | Yes |  |  |
| `designation` | String | Yes |  |  |
| `qualification` | String | Yes |  |  |
| `experienceYears` | Number | Yes |  | Min `0`, max `50` |
| `employmentType` | String | No | `FULL_TIME` | `FULL_TIME`, `PART_TIME`, `CONTRACT`, `ADJUNCT`, `VISITING` |
| `joiningDate` | Date | No |  |  |
| `subjects` | Array<ObjectId ref=`Subject`> | No |  |  |
| `status` | String | No | `ACTIVE` | `ACTIVE`, `INACTIVE` |
| `createdBy` | ObjectId ref=`User` | Yes |  |  |
| `loginAttempts` | Number | No | `0` |  |
| `lockedUntil` | Date | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique `{ college_id, employeeId }`
- Indexes on `{ college_id, status }`, `{ college_id, department_id }`, `{ user_id }`, `{ email }`, and `{ mobileNumber }`

### 8. StaffProfile

Collection: `staffprofiles`

Stores optional/common staff profile fields for non-teacher staff roles.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `user_id` | ObjectId ref=`User` | Yes |  | Unique |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `designation` | String | No | `""` |  |
| `mobileNumber` | String | No | `""` |  |
| `employmentType` | String | No | `FULL_TIME` | `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN` |
| `joiningDate` | Date | No |  |  |
| `gender` | String | No | `""` | `""`, `Male`, `Female`, `Other` |
| `dateOfBirth` | Date | No |  |  |
| `bloodGroup` | String | No | `""` | `""`, `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `address` | String | No | `""` |  |
| `city` | String | No | `""` |  |
| `state` | String | No | `""` |  |
| `pincode` | String | No | `""` |  |
| `emergencyContactName` | String | No | `""` |  |
| `emergencyContactPhone` | String | No | `""` |  |
| `emergencyRelation` | String | No | `""` |  |
| `qualification` | String | No | `""` |  |
| `experienceYears` | Number | No | `0` |  |
| `createdAt` | Date | No | `Date.now` |  |
| `updatedAt` | Date | No | `Date.now` |  |

Indexes / constraints:

- Unique `user_id`
- Indexes on `{ college_id }` and `{ user_id }`

### 9. ParentGuardian

Collection: `parentguardians`

Stores parent/guardian mapping to users, college, and students.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `user_id` | ObjectId ref=`User` | Yes |  |  |
| `college_id` | ObjectId ref=`College` | Yes |  | Indexed |
| `student_ids` | Array<ObjectId ref=`Student`> | No |  |  |
| `relation` | String | No | `guardian` | `father`, `mother`, `guardian` |
| `createdAt` | Date | No | `Date.now` |  |

Indexes / constraints:

- Sparse index on `{ college_id }`
- Query middleware restricts `find`, `findOne`, and `findOneAndUpdate` to the provided `college_id`.

### 10. Timetable

Collection: `timetables`

Stores timetable header/metadata for a department/course/semester/division/year.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `department_id` | ObjectId ref=`Department` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `semester` | Number | Yes |  |  |
| `division` | String | No | `null` | Trimmed |
| `academicYear` | String | Yes |  | Must match `YYYY-YYYY` |
| `name` | String | Yes |  | Human-readable name |
| `status` | String | No | `DRAFT` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `createdBy` | ObjectId ref=`Teacher` | No |  | Usually HOD |
| `startDate` | Date | No |  | Must be before `endDate` |
| `endDate` | Date | No |  | Must be after `startDate` |
| `workingDays` | Array<String> | No | `["MON","TUE","WED","THU","FRI","SAT"]` | Days: `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN` |
| `timezone` | String | No | `Asia/Kolkata` | Trimmed |
| `metadata` | Object | No | `{}` | Flexible metadata |
| `isActive` | Boolean | No | `true` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique sparse index: `{ college_id, department_id, course_id, semester, academicYear, division }`
- Unique partial index for null division: `{ college_id, department_id, course_id, semester, academicYear }`
- Indexes on `{ college_id, course_id, semester, division, status }`, `{ college_id, startDate, endDate, status }`, `{ startDate, endDate, status }`, `{ department_id, status, createdAt }`, and `{ course_id, status }`
- Pre-save validation rejects timetable date ranges over 2 years and trims string metadata values.

### 11. TimetableSlot

Collection: `timetableslots`

Stores individual scheduled classes/labs for a timetable.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `department_id` | ObjectId ref=`Department` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `timetable_id` | ObjectId ref=`Timetable` | Yes |  |  |
| `day` | String | Yes |  | `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN` |
| `startTime` | String | Yes |  | Example: `09:00` |
| `endTime` | String | Yes |  | Example: `10:00` |
| `subject_id` | ObjectId ref=`Subject` | Yes |  |  |
| `teacher_id` | ObjectId ref=`Teacher` | Yes |  |  |
| `room` | String | No |  |  |
| `division` | String | No | `null` | Trimmed |
| `slotType` | String | No | `LECTURE` | `LECTURE`, `LAB` |
| `lectureDate` | Date | No |  | Indexed |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ college_id, department_id, lectureDate, startTime }`
- `{ teacher_id, timetable_id }`
- `{ timetable_id, day, startTime, endTime, teacher_id }`
- `{ timetable_id, day, startTime, endTime, division }`

### 12. TimetableException

Collection: `timetableexceptions`

Stores timetable exceptions such as holidays, cancellations, extra classes, reschedules, room changes, teacher changes, special events, and exams.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  | Indexed |
| `timetable_id` | ObjectId ref=`Timetable` | Yes |  | Indexed |
| `slot_id` | ObjectId ref=`TimetableSlot` | No |  | Indexed; null can mean all slots on date |
| `exceptionDate` | Date | Yes |  | Indexed |
| `type` | String | Yes |  | `HOLIDAY`, `CANCELLED`, `EXTRA`, `RESCHEDULED`, `ROOM_CHANGE`, `TEACHER_CHANGE`, `SPECIAL_EVENT`, `EXAM` |
| `status` | String | Yes | `PENDING` | `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `WITHDRAWN` |
| `reason` | String | Yes |  | Trimmed, max 500 chars |
| `rescheduledTo` | Date | No |  | Required for `RESCHEDULED` |
| `rescheduledSlotId` | ObjectId ref=`TimetableSlot` | No |  |  |
| `extraSlot.startTime` | String | No |  | Required for `EXTRA` |
| `extraSlot.endTime` | String | No |  | Required for `EXTRA` |
| `extraSlot.subject_id` | ObjectId ref=`Subject` | No |  | Required for `EXTRA` |
| `extraSlot.teacher_id` | ObjectId ref=`Teacher` | No |  | Required for `EXTRA` |
| `extraSlot.room` | String | No |  |  |
| `newRoom` | String | No |  | Required for `ROOM_CHANGE` |
| `substituteTeacher` | ObjectId ref=`Teacher` | No |  | Required for `TEACHER_CHANGE` |
| `createdBy` | ObjectId ref=`User` | Yes |  |  |
| `approvedBy` | ObjectId ref=`User` | No |  | Required when approved |
| `approvedAt` | Date | No |  |  |
| `rejectionReason` | String | No |  | Required when rejected |
| `rejectedBy` | ObjectId ref=`User` | No |  | Required when rejected |
| `rejectedAt` | Date | No |  |  |
| `withdrawnBy` | ObjectId ref=`User` | No |  | Required when withdrawn |
| `withdrawnAt` | Date | No |  | Required when withdrawn |
| `withdrawalReason` | String | No |  | Required when withdrawn, max 500 chars |
| `notifyAffected` | Boolean | No | `true` |  |
| `notificationsSent` | Boolean | No | `false` |  |
| `notes` | String | No |  |  |
| `attachments` | Array<String> | No |  | File paths |
| `isRecurring` | Boolean | No | `false` |  |
| `recurringPattern.frequency` | String | No |  | `WEEKLY`, `MONTHLY`, `CUSTOM` |
| `recurringPattern.interval` | Number | No | `1` |  |
| `recurringPattern.days` | Array<String> | No |  | Example: `MON`, `WED`, `FRI` |
| `recurringPattern.endDate` | Date | No |  |  |
| `isActive` | Boolean | No | `true` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ timetable_id, exceptionDate, type }`
- `{ college_id, exceptionDate }`
- `{ college_id, status, exceptionDate }`
- `{ extraSlot.teacher_id, exceptionDate }`
- `{ substituteTeacher, exceptionDate }`
- `{ college_id, createdBy, status, exceptionDate }`
- `{ college_id, status, withdrawnAt }`
- `{ slot_id, exceptionDate }`
- Unique partial index for active pending/approved exceptions: `{ college_id, timetable_id, slot_id, exceptionDate, type }` where `status` is `PENDING` or `APPROVED` and `isActive=true`
- Instance methods: `approve`, `reject`, `withdraw`, `markCompleted`
- Static methods: `findByDateRange`, `findPendingApprovals`

### 13. Attendance

Collection: `attendances`

Stores legacy/simple attendance entries.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `studentId` | ObjectId ref=`Student` | Yes |  |  |
| `courseId` | ObjectId ref=`Course` | Yes |  |  |
| `markedBy` | ObjectId ref=`User` | Yes |  | Teacher |
| `date` | String | Yes |  | Format: `YYYY-MM-DD` |
| `status` | String | Yes |  | `Present`, `Absent` |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique composite index: `{ studentId, courseId, date, markedBy }`

### 14. AttendanceSession

Collection: `attendancesessions`

Stores attendance sessions created from timetable slots.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `department_id` | ObjectId ref=`Department` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `subject_id` | ObjectId ref=`Subject` | Yes |  |  |
| `teacher_id` | ObjectId ref=`Teacher` | Yes |  |  |
| `slot_id` | ObjectId ref=`TimetableSlot` | Yes |  |  |
| `lectureDate` | Date | Yes |  |  |
| `lectureNumber` | Number | Yes |  |  |
| `totalStudents` | Number | Yes |  |  |
| `presentCount` | Number | No | `0` |  |
| `absentCount` | Number | No | `0` |  |
| `status` | String | No | `OPEN` | `OPEN`, `CLOSED` |
| `autoClosed` | Boolean | No | `false` |  |
| `autoClosedAt` | Date | No |  |  |
| `snapshotVersion` | Number | No | `1` |  |
| `syncedAt` | Date | No |  |  |
| `snapshotVerified` | Boolean | No | `false` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Nested `slotSnapshot`:

| Field | Type | Required | Constraints / Notes |
|---|---|---:|---|---|
| `slotSnapshot.subject_id` | ObjectId | Yes |  |
| `slotSnapshot.subject_name` | String | Yes |  |
| `slotSnapshot.subject_code` | String | Yes |  |
| `slotSnapshot.teacher_id` | ObjectId | Yes |  |
| `slotSnapshot.teacher_name` | String | Yes |  |
| `slotSnapshot.day` | String | Yes | `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN` |
| `slotSnapshot.startTime` | String | Yes |  |
| `slotSnapshot.endTime` | String | Yes |  |
| `slotSnapshot.room` | String | No |  |
| `slotSnapshot.slotType` | String | Yes | `LECTURE`, `LAB` |

Indexes / constraints:

- Unique `{ slot_id, lectureDate, lectureNumber }`
- `{ teacher_id, college_id }`
- `{ teacher_id, status, college_id }`
- `{ lectureDate }` descending
- `{ college_id, lectureDate }` descending
- `{ college_id, department_id, lectureDate }` descending
- `{ college_id, status }`
- `{ college_id, course_id, lectureDate }` descending

### 15. AttendanceRecord

Collection: `attendancerecords`

Stores per-student attendance records for an attendance session.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `session_id` | ObjectId ref=`AttendanceSession` | Yes |  |  |
| `student_id` | ObjectId ref=`Student` | Yes |  |  |
| `status` | String | Yes |  | `PRESENT`, `ABSENT` |
| `markedBy` | ObjectId ref=`Teacher` | Yes |  |  |
| `lastModified` | Date | No | `Date.now` |  |
| `lastModifiedBy` | ObjectId ref=`Teacher` | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique `{ session_id, student_id }`
- `{ student_id, college_id }`
- `{ college_id, session_id }`
- `{ status }`
- `{ session_id }`
- `{ college_id, createdAt }` descending

### 16. Leave

Collection: `leaves`

Stores teacher leave requests and approval workflow.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  | Indexed |
| `createdBy` | ObjectId ref=`User` | Yes |  | Indexed |
| `teacher_id` | ObjectId ref=`Teacher` | Yes |  | Indexed |
| `department_id` | ObjectId ref=`Department` | Yes |  | Indexed |
| `leaveType` | String | Yes |  | `SICK`, `CASUAL`, `EMERGENCY`, `OFFICIAL` |
| `academicYear` | String | Yes |  | Must match `YYYY-YYYY` |
| `startDate` | Date | Yes |  | Indexed |
| `endDate` | Date | Yes |  | Indexed |
| `durationType` | String | No | `FULL_DAY` | `FULL_DAY`, `HALF_DAY_MORNING`, `HALF_DAY_AFTERNOON` |
| `daysCount` | Number | Yes |  | Min `0.5`, max `365` |
| `reason` | String | Yes |  | Trimmed, max 500 chars |
| `attachments` | Array<String> | No | `[]` | Max 5 attachments |
| `status` | String | Yes | `PENDING` | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `approvedBy` | ObjectId ref=`User` | No | `null` |  |
| `approvedAt` | Date | No | `null` |  |
| `rejectedBy` | ObjectId ref=`User` | No | `null` |  |
| `rejectedAt` | Date | No | `null` |  |
| `rejectionReason` | String | No | `null` | Max 500 chars |
| `cancelledBy` | ObjectId ref=`User` | No | `null` |  |
| `cancelledAt` | Date | No | `null` |  |
| `cancellationReason` | String | No | `null` | Max 500 chars |
| `notes` | String | No | `null` | Max 1000 chars |
| `deletedBy` | ObjectId ref=`User` | No | `null` |  |
| `deletedAt` | Date | No | `null` | Indexed |
| `isActive` | Boolean | No | `true` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Named `idx_teacher_history`: `{ college_id, teacher_id, startDate }`
- Named `idx_hod_pending`: `{ college_id, department_id, status, startDate }`
- Named `idx_dept_reporting`: `{ college_id, department_id, leaveType, startDate }`
- Named `idx_overlap_check`: `{ college_id, teacher_id, status, startDate, endDate }`
- Named `idx_college_wide_filter`: `{ college_id, status, startDate }`
- Named `idx_status_timeline`: `{ status, createdAt }`
- Pre-save validation ensures `startDate <= endDate`, required reason, required rejection reason for rejected leaves, required cancellation metadata for cancelled leaves, required approval metadata for approved leaves, and no status changes after terminal states.
- Instance methods: `approve`, `reject`, `cancel`, `softDelete`
- Static methods: `findTeacherHistory`, `findPendingForDepartment`, `findApprovedInRange`

### 17. PromotionPolicy

Collection: `promotionpolicys`

Stores active promotion policy per college.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `collegeId` | ObjectId ref=`College` | Yes |  | Indexed |
| `minAttendancePercentage` | Number | Yes | `75` | Min `0`, max `100` |
| `scopedSemesters` | Array<Number> | No |  |  |
| `effectiveFrom` | Date | No | `Date.now` |  |
| `isActive` | Boolean | No | `true` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique partial index `{ collegeId, isActive }` where `isActive=true`
- Pre-save hook deactivates other active policies for the same college.
- Static method: `getActivePolicy`

### 18. PromotionHistory

Collection: `promotionhistorys`

Stores historical student promotion decisions and fee/attendance status at promotion time.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `student_id` | ObjectId ref=`Student` | Yes |  |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `fromSemester` | Number | Yes |  |  |
| `toSemester` | Number | Yes |  |  |
| `fromAcademicYear` | String | Yes |  |  |
| `toAcademicYear` | String | Yes |  |  |
| `feeStatus` | String | Yes |  | `FULLY_PAID`, `PARTIALLY_PAID`, `PENDING` |
| `totalFee` | Number | Yes |  |  |
| `paidAmount` | Number | Yes |  |  |
| `pendingAmount` | Number | No | `0` |  |
| `attendancePercentage` | Number | No | `0` |  |
| `attendanceStatus` | String | Yes | `ATTENDANCE_NOT_AVAILABLE` | `ELIGIBLE`, `NOT_ELIGIBLE`, `ATTENDANCE_NOT_AVAILABLE` |
| `attendanceCheckedAt` | Date | No | `Date.now` |  |
| `attendanceOverridden` | Boolean | No | `false` |  |
| `attendanceOverrideReason` | String | No | `null` |  |
| `promotedBy` | ObjectId ref=`User` | Yes |  |  |
| `promotedByName` | String | Yes |  |  |
| `promotionDate` | Date | No | `Date.now` |  |
| `remarks` | String | No |  |  |
| `status` | String | No | `ACTIVE` | `ACTIVE`, `REVERSED` |
| `isFinalSemesterPromotion` | Boolean | No | `false` |  |
| `newFeeAssigned` | Boolean | No | `false` |  |
| `newFeeStructureId` | ObjectId ref=`FeeStructure` | No | `null` |  |
| `newStudentFeeId` | ObjectId ref=`StudentFee` | No | `null` |  |
| `feeAssignmentWarning` | String | No | `null` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ student_id, promotionDate }`
- `{ college_id, promotionDate }`

### 19. FeeStructure

Collection: `feestructures`

Stores fee configuration by college, course, category, and optional academic year.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `category` | String | Yes |  | `GEN`, `OBC`, `SC`, `ST`, `EWS` |
| `academicYear` | String | No | `null` | Optional year-specific fee structure |
| `totalFee` | Number | Yes |  |  |
| `installments` | Array<Subdocument> | No |  | See nested schema below |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Nested `installments[]`:

| Field | Type | Required | Constraints / Notes |
|---|---|---:|---|---|
| `name` | String | Yes |  |
| `amount` | Number | Yes |  |
| `dueDate` | Date | Yes |  |
| `order` | Number | Yes | Sequential payment order |

### 20. StudentFee

Collection: `studentfees`

Stores student-level fee totals and installment payment state.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `student_id` | ObjectId ref=`Student` | Yes |  |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `course_id` | ObjectId ref=`Course` | Yes |  |  |
| `totalFee` | Number | Yes |  |  |
| `paidAmount` | Number | No | `0` |  |
| `installments` | Array<Subdocument> | No |  | See nested schema below |

Nested `installments[]`:

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `name` | String | No |  |  |
| `amount` | Number | No |  |  |
| `order` | Number | No | `0` |  |
| `dueDate` | Date | Yes |  |  |
| `status` | String | No | `PENDING` | `PENDING`, `PAID`, `FAILED`, `CANCELLED` |
| `transactionId` | String | No |  | Trimmed |
| `paymentGateway` | String | No | `STRIPE` |  |
| `paymentMode` | String | No | `ONLINE` | `ONLINE`, `CASH`, `CHEQUE`, `DD` |
| `referenceNumber` | String | No |  | Trimmed |
| `remarks` | String | No |  | Trimmed |
| `markedByAdmin` | ObjectId ref=`User` | No |  |  |
| `stripeSessionId` | String | No |  | Trimmed |
| `paidAt` | Date | No |  |  |
| `paymentAttemptAt` | Date | No |  |  |
| `paymentFailureReason` | String | No |  |  |
| `razorpayOrderId` | String | No |  | Trimmed |
| `razorpayPaymentId` | String | No |  | Trimmed |
| `reminderSent` | Boolean | No | `false` |  |
| `lastReminderDate` | Date | No |  |  |
| `escalationLevel` | String | No | `NONE` | `NONE`, `DUE_TODAY`, `SLIGHTLY_OVERDUE`, `MODERATELY_OVERDUE`, `SEVERELY_OVERDUE`, `CRITICALLY_OVERDUE` |
| `reminderCount` | Number | No | `0` |  |
| `finalNoticeSent` | Boolean | No | `false` |  |
| `reconciliationStatus` | String | No | `null` | `FLAGGED`, `REQUIRES_ACTION`, `RECONCILED` |
| `reconciliationFlag` | String | No |  |  |
| `reconciliationCheckedAt` | Date | No |  |  |
| `reconciliationNotes` | String | No |  |  |

Indexes / constraints:

- `{ student_id, college_id }`
- `{ college_id, course_id }`
- `{ college_id }`
- `{ installments.dueDate }`
- `{ installments.status }`
- `{ installments.escalationLevel }`
- `{ installments.finalNoticeSent }`
- `{ installments.razorpayOrderId }`
- `{ installments.razorpayPaymentId }`
- `{ installments.transactionId }`
- `{ installments.stripeSessionId }`

### 21. Invoice

Collection: `invoices`

Stores invoice records.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `invoiceNumber` | String | Yes |  | Unique |
| `status` | String | No | `DRAFT` | `DRAFT`, `OPEN`, `PAID`, `VOID`, `UNCOLLECTIBLE` |
| `currency` | String | No | `INR` |  |
| `amountDue` | Number | Yes |  |  |
| `amountPaid` | Number | No | `0` |  |
| `total` | Number | Yes |  |  |
| `dueDate` | Date | Yes |  |  |
| `paidAt` | Date | No |  |  |
| `periodStart` | Date | No |  |  |
| `periodEnd` | Date | No |  |  |
| `metadata` | Map<String> | No | `{}` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique `invoiceNumber`
- Index: `{ college_id, createdAt }`

### 22. DocumentConfig

Collection: `documentconfigs`

Stores per-college document upload configuration.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  | Unique |
| `collegeCode` | String | Yes |  |  |
| `documents` | Array<Subdocument> | No |  | Empty by default; admin configures documents |
| `isActive` | Boolean | No | `true` |  |
| `updatedBy` | ObjectId ref=`User` | No |  |  |
| `updatedAt` | Date | No | `Date.now` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Nested `documents[]`:

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `type` | String | Yes |  | Trimmed |
| `label` | String | Yes |  | Trimmed |
| `enabled` | Boolean | No | `true` |  |
| `mandatory` | Boolean | No | `false` |  |
| `allowedFormats` | Array<String> | No | `["pdf","jpg","jpeg","png"]` |  |
| `maxFileSize` | Number | No | `5` | MB, min `1`, max `20` |
| `description` | String | No | `""` |  |
| `order` | Number | No | `0` |  |

Indexes / constraints:

- Unique `college_id`
- Index: `{ college_id, isActive }`
- Static method `getAvailableDocumentTemplates` returns template list.
- Static method `createEmptyConfig` creates an empty document config with `documents: []`.

### 23. Notification

Collection: `notifications`

Stores college notifications with targeting options.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | Yes |  |  |
| `createdByRole` | String | Yes |  | `COLLEGE_ADMIN`, `TEACHER`, `HOD` |
| `createdBy` | ObjectId | Yes |  |  |
| `title` | String | Yes |  | Trimmed |
| `message` | String | Yes |  |  |
| `type` | String | No | `GENERAL` | `GENERAL`, `ACADEMIC`, `EXAM`, `FEE`, `ATTENDANCE`, `EVENT`, `ASSIGNMENT`, `URGENT` |
| `priority` | String | No | `NORMAL` | `LOW`, `NORMAL`, `MEDIUM`, `HIGH`, `URGENT` |
| `target` | String | Yes | `ALL` | `ALL`, `STUDENTS`, `TEACHERS`, `DEPARTMENT`, `COURSE`, `SEMESTER`, `INDIVIDUAL` |
| `target_department` | ObjectId ref=`Department` | No | `null` |  |
| `target_course` | ObjectId ref=`Course` | No | `null` |  |
| `target_semester` | Number | No | `null` | Min `1`, max `8` |
| `target_users` | Array<ObjectId ref=`User`> | No |  |  |
| `actionUrl` | String | No |  | Frontend redirect |
| `expiresAt` | Date | No |  |  |
| `isActive` | Boolean | No | `true` |  |
| `isRead` | Boolean | No | `false` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ college_id, target }`
- `{ college_id, createdAt }`
- `{ college_id, isActive }`
- `{ target, type }`
- `{ college_id, target_department }`
- `{ college_id, target_course }`
- `{ college_id, target_semester }`
- `{ college_id, target, isActive }`
- `{ college_id, isActive, createdAt }`
- `{ college_id, target_users }`
- Unique partial index `idx_notification_dedupe` on `{ college_id, createdByRole, target, target_users, title, createdAt }` where `target=INDIVIDUAL` and `isActive=true`

### 24. NotificationRead

Collection: `notificationreads`

Stores per-user notification read state.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `notification_id` | ObjectId ref=`Notification` | Yes |  |  |
| `user_id` | ObjectId | Yes |  |  |
| `role` | String | Yes |  | `COLLEGE_ADMIN`, `TEACHER`, `STUDENT` |
| `readAt` | Date | No | `Date.now` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique `{ notification_id, user_id }`

### 25. RefreshToken

Collection: `refreshtokens`

Stores hashed refresh tokens and device metadata.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `user_id` | ObjectId | Yes |  |  |
| `token` | String | Yes |  | Indexed |
| `expiresAt` | Date | Yes |  | TTL expires documents |
| `userAgent` | String | No |  |  |
| `ipAddress` | String | No |  |  |
| `isRevoked` | Boolean | No | `false` |  |
| `createdAt` | Date | No | `Date.now` | Expires after 7 days via schema path option |

Indexes / constraints:

- `{ user_id, isRevoked }`
- TTL `{ expiresAt }` with `expireAfterSeconds: 0`
- `createdAt` path has `expires: 604800`

### 26. TokenBlacklist

Collection: `tokenblacklists`

Stores blacklisted access/refresh tokens.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `token` | String | Yes |  | Unique, indexed |
| `tokenType` | String | Yes |  | `access`, `refresh` |
| `user_id` | ObjectId ref=`User` | Yes |  |  |
| `expiresAt` | Date | Yes |  | TTL expires documents |
| `blacklistedAt` | Date | No | `Date.now` |  |
| `reason` | String | No | `LOGOUT` | `LOGOUT`, `PASSWORD_CHANGE`, `SECURITY`, `USER_REQUEST` |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique `token`
- TTL `{ expiresAt }` with `expireAfterSeconds: 0`
- `{ token, tokenType }`

### 27. PasswordReset

Collection: `passwordresets`

Stores password reset OTP hashes.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `email` | String | Yes |  | Lowercase, trimmed, indexed |
| `otpHash` | String | Yes |  | Bcrypt hash |
| `expiresAt` | Date | Yes |  | Indexed, TTL expires documents |
| `isUsed` | Boolean | No | `false` |  |
| `userId` | ObjectId ref=`User` | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ email, expiresAt }`
- TTL `{ expiresAt }` with `expireAfterSeconds: 0`
- Pre-save hook hashes `otpHash` when modified.
- Instance methods: `compareOTP`, `isValid`, `markAsUsed`

### 28. Permission

Collection: `permissions`

Stores role/resource/action permissions.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `role` | String | Yes |  | `SUPER_ADMIN`, `COLLEGE_ADMIN`, `PRINCIPAL`, `HOD`, `ACCOUNTANT`, `ADMISSION_OFFICER`, `EXAM_COORDINATOR`, `PARENT_GUARDIAN`, `PLATFORM_SUPPORT`, `TEACHER`, `STUDENT` |
| `resource` | String | Yes |  |  |
| `action` | String | Yes |  | `CREATE`, `READ`, `UPDATE`, `DELETE`, `MANAGE` |
| `college_id` | ObjectId ref=`College` | No | `null` | Null means system-wide permission |
| `isActive` | Boolean | No | `true` | Indexed |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Composite `{ role, resource, action, college_id }`
- Indexes on `role`, `resource`, and `isActive`

### 29. FeatureFlag

Collection: `featureflags`

Stores platform feature flags.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `name` | String | Yes |  | Unique, indexed |
| `description` | String | No | `""` |  |
| `enabled` | Boolean | No | `false` | Indexed |
| `enabledForColleges` | Array<ObjectId ref=`College`> | No |  |  |
| `enabledForUsers` | Array<ObjectId ref=`User`> | No |  |  |
| `rolloutPercentage` | Number | No | `0` | Min `0`, max `100` |
| `conditions` | Mixed | No | `{}` | Flexible conditions |
| `metadata` | Mixed | No | `{}` | Flexible metadata |
| `createdBy` | ObjectId ref=`User` | Yes |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- Unique `name`
- `{ enabled, name }`

### 30. CollegeEmailConfig

Collection: `collegeemailconfigs`

Stores per-college SMTP email configuration.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `collegeId` | ObjectId ref=`College` | Yes |  | Indexed |
| `smtp.host` | String | Yes |  | Trimmed |
| `smtp.port` | Number | Yes |  | Min `1`, max `65535` |
| `smtp.secure` | Boolean | No | `false` | True for SSL, false for TLS |
| `credentials.user` | String | Yes |  |  |
| `credentials.pass` | String | Yes |  | Encrypted |
| `fromName` | String | Yes |  | Trimmed |
| `fromEmail` | String | Yes |  | Trimmed, lowercase |
| `isActive` | Boolean | No | `true` |  |
| `lastVerifiedAt` | Date | No |  |  |
| `verifiedBy` | ObjectId ref=`User` | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ collegeId, isActive }`
- Pre-save hook deactivates other active configs for the same college.
- Instance method: `isValid`
- Static method: `getActiveConfig`

### 31. CollegePaymentConfig

Collection: `collegepaymentconfigs`

Stores per-college payment gateway configuration.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `collegeId` | ObjectId ref=`College` | Yes |  | Indexed |
| `gatewayCode` | String | Yes |  | `stripe`, `razorpay` |
| `credentials.keyId` | String | Yes |  |  |
| `credentials.keySecret` | String | Yes |  |  |
| `credentials.webhookSecret` | String | No |  |  |
| `configuration.currency` | String | No | `INR` |  |
| `configuration.enabled` | Boolean | No | `true` |  |
| `configuration.testMode` | Boolean | No | `true` |  |
| `isActive` | Boolean | No | `true` |  |
| `lastVerifiedAt` | Date | No |  |  |
| `verifiedBy` | ObjectId ref=`User` | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ collegeId, gatewayCode, isActive }`
- Pre-save hook deactivates other active configs for the same college and gateway.
- Instance method: `isValid`
- Static method: `getActiveConfig`

### 32. Backup

Collection: `backups`

Stores backup job metadata.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `college_id` | ObjectId ref=`College` | No | `null` | Null for system-wide backups |
| `type` | String | Yes |  | `FULL`, `INCREMENTAL`, `COLLEGE_SPECIFIC` |
| `filename` | String | Yes |  |  |
| `path` | String | Yes |  |  |
| `size` | Number | Yes |  | Bytes |
| `success` | Boolean | No | `true` |  |
| `error` | String | No | `null` |  |
| `duration` | Number | No | `null` | Milliseconds |
| `initiatedBy` | ObjectId ref=`User` | Yes |  |  |
| `metadata` | Mixed | No | `{}` |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ college_id, createdAt }`
- `{ success, createdAt }`
- `{ type, createdAt }`

### 33. SupportTicket

Collection: `support_tickets`

Stores platform support tickets.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `ticketId` | String | Yes |  | Unique, generated as `SPT-<year>-<random>` |
| `userId` | ObjectId ref=`User` | Yes |  |  |
| `college_id` | ObjectId ref=`College` | No |  | Can be null for general system issue |
| `subject` | String | Yes |  | Trimmed, max 200 chars |
| `category` | String | No | `OTHER` | `BUG`, `FEATURE`, `ACCESS`, `BILLING`, `OTHER` |
| `priority` | String | No | `MEDIUM` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `status` | String | No | `OPEN` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `description` | String | Yes |  | Trimmed |
| `attachments` | Array<String> | No |  | File URLs or paths |
| `assignedTo` | ObjectId ref=`User` | No |  |  |
| `comments` | Array<Subdocument> | No |  | See nested schema below |
| `resolvedAt` | Date | No |  |  |
| `resolution` | String | No |  | Trimmed |
| `feedback.rating` | Number | No |  | Min `1`, max `5` |
| `feedback.comment` | String | No |  | Trimmed |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Nested `comments[]`:

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `user` | ObjectId ref=`User` | Yes |  |  |
| `message` | String | Yes |  | Trimmed |
| `createdAt` | Date | No | `Date.now` |  |

Indexes / constraints:

- Unique `ticketId`
- `{ ticketId }`
- `{ college_id }`
- `{ status }`
- `{ priority }`
- `{ createdAt }`
- `{ assignedTo }`
- Pre-save hook generates `ticketId` if missing.

### 34. AuditLog

Collection: `auditlogs`

Stores user action audit events.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `collegeId` | ObjectId ref=`College` | Yes |  | Indexed |
| `userId` | ObjectId ref=`User` | Yes |  | Indexed |
| `userEmail` | String | No |  | Lowercase, trimmed, indexed |
| `userRole` | String | Yes |  | `SUPER_ADMIN`, `COLLEGE_ADMIN`, `HOD`, `TEACHER`, `STUDENT` |
| `action` | String | Yes |  | See action enum below |
| `resourceType` | String | Yes |  | See resource enum below |
| `resourceId` | ObjectId | Yes |  | Indexed |
| `oldValues` | Mixed | No | `null` | Previous values for updates |
| `newValues` | Mixed | No | `null` | New values for updates |
| `ipAddress` | String | Yes |  | Indexed |
| `userAgent` | String | No |  |  |
| `endpoint` | String | No |  |  |
| `method` | String | No |  | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` |
| `metadata` | Map<Mixed> | No |  | Flexible metadata |
| `statusCode` | Number | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Action enum:

`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `BULK_APPROVE`, `BULK_DELETE`, `EXPORT`, `IMPORT`, `DEACTIVATE`, `REACTIVATE`, `STAFF_CREATED`, `STAFF_UPDATED`, `STAFF_ROLE_CHANGED`, `STAFF_DEACTIVATED`, `STAFF_REACTIVATED`, `DEPARTMENT_CREATED`, `DEPARTMENT_UPDATED`, `DEPARTMENT_DELETED`, `HOD_ASSIGNED`, `TIMETABLE_DELETED`, `TIMETABLE_ARCHIVED`, `TIMETABLE_PUBLISHED`, `TIMETABLE_EXCEPTION_CREATED`, `TIMETABLE_EXCEPTION_UPDATED`, `TIMETABLE_EXCEPTION_DELETED`, `TIMETABLE_EXCEPTION_APPROVED`, `TIMETABLE_EXCEPTION_REJECTED`, `TIMETABLE_EXCEPTION_WITHDRAWN`

Resource type enum:

`Student`, `StudentApproval`, `FeeStructure`, `Course`, `Subject`, `Teacher`, `User`, `Department`, `Payment`, `Document`, `Timetable`, `TimetableException`

Indexes / constraints:

- `{ collegeId, resourceType, createdAt }`
- `{ collegeId, userId, createdAt }`
- `{ collegeId, action, createdAt }`
- `{ createdAt }`
- Static method: `logAudit`

### 35. SecurityAudit

Collection: `securityaudits`

Stores security events and auth/system audit events.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `eventType` | String | Yes |  | See event enum below |
| `category` | String | Yes | `AUTHENTICATION` | `AUTHENTICATION`, `AUTHORIZATION`, `DATA_ACCESS`, `SYSTEM` |
| `severity` | String | Yes | `LOW` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `userId` | ObjectId ref=`User` | No |  | Indexed |
| `userEmail` | String | No |  | Lowercase, trimmed, indexed |
| `userRole` | String | No |  | Same role enum as `User` |
| `collegeId` | ObjectId ref=`College` | No | `null` | Null for super admin/system events |
| `ipAddress` | String | Yes |  | Indexed |
| `userAgent` | String | No |  |  |
| `endpoint` | String | No |  |  |
| `method` | String | No |  | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` |
| `statusCode` | Number | No |  |  |
| `metadata` | Map<Mixed> | No |  |  |
| `reviewed` | Boolean | No | `false` |  |
| `reviewedBy` | ObjectId ref=`User` | No |  |  |
| `reviewedAt` | Date | No |  |  |
| `notes` | String | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Event type enum:

`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_SUCCESS`, `PASSWORD_CHANGE`, `TOKEN_REFRESH`, `TOKEN_BLACKLISTED`, `PERMISSION_DENIED`, `UNAUTHORIZED_ACCESS`, `ROLE_CHANGE`, `ADMIN_ACTION`, `BULK_DATA_EXPORT`, `SENSITIVE_DATA_ACCESS`, `DATA_MODIFICATION`, `DATA_DELETION`, `RATE_LIMIT_HIT`, `SUSPICIOUS_IP`, `BRUTE_FORCE_DETECTED`, `SECURITY_POLICY_VIOLATION`

Indexes / constraints:

- `{ createdAt }`
- `{ userEmail, createdAt }`
- `{ collegeId, eventType, createdAt }`
- `{ severity, reviewed }`
- TTL `{ createdAt }` with `expireAfterSeconds: 90 * 24 * 60 * 60`
- Static methods: `logEvent`, `getFailedLoginsByIP`, `isBruteForceAttack`

### 36. SystemLog

Collection: `system_logs`

Stores application-level logs.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `level` | String | Yes |  | `ERROR`, `WARN`, `INFO`, `DEBUG` |
| `message` | String | Yes |  | Trimmed |
| `module` | String | Yes |  | Trimmed |
| `userId` | ObjectId ref=`User` | No |  | Indexed |
| `college_id` | ObjectId ref=`College` | No |  | Indexed |
| `ip` | String | No |  | Trimmed |
| `userAgent` | String | No |  | Trimmed |
| `stack` | String | No |  | Error stack trace |
| `metadata` | Mixed | No | `{}` |  |
| `request.method` | String | No |  |  |
| `request.url` | String | No |  |  |
| `request.query` | Mixed | No |  |  |
| `request.body` | Mixed | No |  | Be careful with sensitive data |
| `response.statusCode` | Number | No |  |  |
| `response.latencyMs` | Number | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Indexes / constraints:

- `{ createdAt }`
- `{ level, createdAt }`
- `{ module, createdAt }`
- `{ college_id, createdAt }`
- `{ userId, createdAt }`
- Retention is handled by cron job, not TTL.

### 37. SystemHealth

Collection: `system_health`

Stores periodic system health snapshots.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `timestamp` | Date | No | `Date.now` | Indexed |
| `status` | String | No | `HEALTHY` | `HEALTHY`, `DEGRADED`, `DOWN` |
| `metrics.cpuUsage` | Number | No |  | 0-100 |
| `metrics.memoryUsage` | Number | No |  | 0-100 |
| `metrics.diskUsage` | Number | No |  | 0-100 |
| `metrics.responseTimeMs` | Number | No |  |  |
| `metrics.errorRate` | Number | No |  | 0-100 |
| `services` | Array<Subdocument> | No |  | See nested schema below |
| `errors` | Array<Subdocument> | No |  | See nested schema below |
| `notes` | String | No |  | Trimmed |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Nested `services[]`:

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `name` | String | Yes |  | `MONGODB`, `REDIS`, `EMAIL_SMTP`, `SMS_TWILIO`, `PAYMENT_STRIPE`, `PAYMENT_RAZORPAY`, `CLOUD_STORAGE`, `CACHE`, `QUEUE` |
| `status` | String | No | `ACTIVE` | `ACTIVE`, `INACTIVE`, `ERROR` |
| `latencyMs` | Number | No |  | Min `0` |
| `lastChecked` | Date | No | `Date.now` |  |
| `errorMessage` | String | No |  | Trimmed |

Nested `errors[]`:

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `type` | String | Yes |  | `DATABASE`, `API`, `AUTH`, `PAYMENT`, `EMAIL`, `SMS`, `STORAGE`, `NETWORK`, `UNKNOWN` |
| `message` | String | Yes |  | Trimmed |
| `count` | Number | No | `1` | Min `0` |
| `lastOccurred` | Date | No | `Date.now` |  |

Indexes / constraints:

- `{ timestamp }`
- `{ status }`

### 38. IntegrationHealth

Collection: `integration_health`

Stores third-party integration health.

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---:|---|---|
| `_id` | ObjectId | No | Auto |  |
| `service` | String | Yes |  | Unique; `STRIPE`, `RAZORPAY`, `EMAIL_SMTP`, `SMS_TWILIO`, `SMS_NODEJS`, `CLOUD_STORAGE`, `REDIS`, `QUEUE`, `PDF_GENERATOR`, `QR_CODE` |
| `status` | String | No | `UNKNOWN` | `ACTIVE`, `INACTIVE`, `ERROR`, `UNKNOWN` |
| `lastCheck` | Date | No | `Date.now` |  |
| `responseTimeMs` | Number | No | `null` | Min `0` |
| `errorMessage` | String | No | `null` | Trimmed |
| `healthScore` | Number | No | `100` | Min `0`, max `100` |
| `configSnapshot` | Mixed | No | `{}` | Encrypted config snapshot without secrets |
| `checks` | Array<Subdocument> | No |  | Last 1000 checks retained |
| `consecutiveFailures` | Number | No | `0` | Min `0` |
| `lastSuccess` | Date | No |  |  |
| `lastFailure` | Date | No |  |  |
| `createdAt` | Date | No | Auto | Timestamp |
| `updatedAt` | Date | No | Auto | Timestamp |
| `__v` | Number | No | Auto |  |

Nested `checks[]`:

| Field | Type | Required | Constraints / Notes |
|---|---|---:|---|---|
| `timestamp` | Date | No |  |
| `status` | String | No |  |
| `responseTimeMs` | Number | No |  |
| `errorMessage` | String | No |  |

Indexes / constraints:

- Unique `service`
- `{ service }`
- `{ status }`
- `{ lastCheck }`
- Pre-save hook keeps only the last 1000 `checks`.

## Important Validations and Middleware

| Area | Rule |
|---|---|
| User password | `User.password` is bcrypt-hashed before save when modified. |
| Password reset OTP | `PasswordReset.otpHash` is bcrypt-hashed before save when modified. |
| College soft delete | Setting `College.isActive=false` cascades deactivation to related college data. |
| College restore | Setting `College.isActive=true` restores related college data. |
| College hard delete | `findOneAndDelete` deletes related departments, courses, students, teachers, subjects, fee structures, student fees, notifications, notification reads, timetables, timetable slots, attendance sessions, attendance records, document configs, promotion history, and users. |
| Course duration | `Course.durationYears` is auto-calculated from `durationSemesters`. |
| Student year | `Student.currentYear` is auto-calculated from `currentSemester`. |
| Timetable date range | Timetable date range cannot exceed 2 years. |
| Timetable exception | `RESCHEDULED` requires `rescheduledTo`; `EXTRA` requires `extraSlot`; `TEACHER_CHANGE` requires `substituteTeacher`; `ROOM_CHANGE` requires `newRoom`; approved/rejected/withdrawn states require corresponding metadata. |
| Leave request | `startDate` must be on or before `endDate`; rejected/cancelled/approved leaves require corresponding metadata; terminal leave states cannot be changed again. |
| Document config | Empty config is created with `documents: []`; admins must explicitly enable documents. |
| Promotion policy | Only one active policy is allowed per college. |
| College email config | Only one active config is allowed per college. |
| College payment config | Only one active config is allowed per college per gateway. |
| Integration health checks | `IntegrationHealth.checks` is capped at the last 1000 entries. |
| Token expiry | `RefreshToken`, `TokenBlacklist`, and `PasswordReset` use TTL indexes on `expiresAt`. |

## Notes

- Collection names are the Mongoose-resolved collection names observed from the schema definitions.
- Some Mongoose collection names are pluralized automatically, for example `promotionhistorys` and `promotionpolicys`.
- Fields with `collection` option override default pluralization, for example `leaves`, `system_logs`, `system_health`, `integration_health`, and `support_tickets`.
- `createdAt`, `updatedAt`, and `__v` are included only where Mongoose exposes them in the schema.
