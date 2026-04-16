# New Features — Planned Phases

All planned new features from the MASTER_PLAN. Ordered by dependency.

---

## Phase 1A — Billing & Subscription Model

**Priority:** Critical — platform has zero revenue mechanism today
**Blocked by:** Leadership decisions on pricing tiers and billing cycle
**Can start partially:** College model additions and Invoice model have no blockers

### What to build
- Add `subscription`, `billingContact`, `gstDetails` fields to College model
- Create `Invoice` model (sequential invoice numbers, GST fields, payment proof upload)
- Fix `collegeIsolation.middleware.js` to actually check `subscriptionExpiry` (currently the field doesn't exist — every college has free indefinite access)
- Access states: ACTIVE → WARNING (7 days) → GRACE_PERIOD → SOFT_BLOCKED → SUSPENDED
- Invoice CRUD endpoints (create, list, send, verify payment, extend subscription)
- GST-compliant invoice PDF generation using pdfkit
- Billing cron jobs (due-soon reminders, overdue checks, weekly summary)
- `BILLING_MANAGER` role (platform-level, for LemmeCode finance team)
- Frontend: invoice management for Super Admin
- Frontend: billing section for College Admin (view invoices, upload payment proof)
- Frontend: subscription warning banner on College Admin dashboard

---

## Phase 1B — Credential Delivery & First Login

**Priority:** High — needed before Phase 4 (staff account creation)
**No blockers — can start immediately after Sprint 0**

### What to build
- Add to User model: `mustChangePassword`, `tempPasswordExpiresAt`, `onboardingCompleted`, `onboardingStep`, `createdBy`
- `mustChangePassword` middleware — blocks all routes except change-password if flag is true
- `changePassword` endpoint — clears flag, blacklists current token
- Temp password expiry check on login — block login if expired
- Show credentials once modal on college creation (Super Admin UI)
- Reset credentials endpoint for Super Admin
- Frontend: Change Password page
- Frontend: axios interceptor — redirect to change-password on `PASSWORD_CHANGE_REQUIRED`
- Frontend: Onboarding wizard (Add dept → Add course → Set fee structure → Done)

---

## Phase 1C — Per-College Email Configuration

**Priority:** High — currently all emails come from one platform Gmail account
**Blocked by:** Sprint 0 Gmail App Password fix (must work first)

### What to build
- `CollegeEmailConfig` model (SMTP host, port, secure, encrypted credentials, fromName, fromEmail)
- `collegeEmail.service.js` — `getCollegeTransporter(collegeId)`, cached, falls back to platform SMTP
- Update all 8 email send functions to accept `collegeId` and use college transporter
- Config endpoints: GET, POST, DELETE, POST verify (sends test email)
- Frontend: Email Configuration page in System Settings

---

## Phase 2 — Admission Workflow Redesign

**Priority:** Critical
**Blocked by:** Phase 1B (credential delivery must exist — credentials sent at SEAT_CONFIRMED)
**Blocks:** Phase 4 (new roles), Phase 5 (promotion)

### The problem
Current flow creates a User account and fee record the moment admin clicks "Approve" — even if the student never actually joins. In Indian colleges, approval means "we are offering a seat", not "you are enrolled."

### New flow
```
PENDING → OFFER_MADE → SEAT_CONFIRMED → ENROLLED
                                      ↘ WITHDRAWN
```

### What to build
- New student statuses: `OFFER_MADE`, `SEAT_CONFIRMED`, `ENROLLED` (replaces `APPROVED`), `WITHDRAWN`
- New Student model fields: `offerMadeAt`, `seatConfirmedAt`, `downpaymentAmount`, `enrolledAt`
- New controller actions: `makeOffer`, `confirmSeat`, `enrollStudent`, `withdrawOffer`
- Fix orphaned User bug: User only created at `enrollStudent`, never at registration
- Implement enrollment number generation at `enrollStudent`
- Update all `status === "APPROVED"` references across codebase → `ENROLLED`
- New routes: `make-offer`, `confirm-seat`, `enroll`, `withdraw`
- Migration script: all existing `APPROVED` students → `ENROLLED` (run before code deploy)
- Frontend: replace single Approve button with 4 state-aware buttons
- Frontend: admission funnel view (counts at each stage)
- Frontend: update all student list filters from APPROVED → ENROLLED

---

## Phase 3 — Year Labels + Teacher Classroom Assignment

**Priority:** High
**Blocked by:** Sprint 0 (server sync)
**Blocks:** Phase 6 (HOD timetable + ID card)

### Year Labels
- Add `yearLabels` array to Course model (e.g., `["FY", "SY", "TY"]`)
- `getYearLabel(course, semester)` utility function
- Migration script: auto-generate default labels for existing courses
- Replace hardcoded year calculations in promotion, student, timetable, attendance controllers
- Frontend: year label input fields in AddCourse/EditCourse
- Frontend: show "TY — Semester 5" format across student profile, timetable, attendance

### Teacher Classroom Assignment
- Replace `courses: [ObjectId]` with `courseAssignments: [{ course_id, year, yearLabel, classroom, division }]` on Teacher model
- Update teacher controller to accept `courseAssignments`
- Timetable slot: auto-fill room from teacher's `courseAssignments`
- Timetable slot: conflict detection (teacher double-booking, room double-booking, course-year double-booking)
- Migration script: convert existing `courses[]` to `courseAssignments[]`
- Frontend: replace course multi-select with courseAssignments form in AddTeacher/EditTeacher
- Frontend: timetable builder room auto-fill after teacher + course + year selected

---

## Phase 4 — New Roles

**Priority:** High
**Blocked by:** Phase 2 (ADMISSION_OFFICER needs new status states), Phase 1B (staff account creation needs credential delivery)

### New roles to add

**ACCOUNTANT** — Fee collection, payment tracking, receipts, financial reports. No academic data.

**ADMISSION_OFFICER** — View and process PENDING applications only. No access to enrolled students.

**PRINCIPAL** — Read everything, write nothing (except notifications). Oversight role.

**EXAM_COORDINATOR** — View students and teachers for exam planning. Full exam module is V1.1.

**PARENT_GUARDIAN** — View own child's attendance, fees, profile. Read-only. Scoped to linked students.
- Requires new `ParentGuardian` model: `{ user_id, college_id, student_ids, name, email, phone, relationship }`

**PLATFORM_SUPPORT** — LemmeCode internal. View college list and system health only.

### Foundation tasks (do once before any role work)
- Add all new roles to `constants.js` ROLE enum
- Add all new roles to User model role enum
- Fix HOD middleware: change role check from `TEACHER` to `HOD`
- Staff account management endpoints: create, list, update, link-parent

### Login routing
Add redirect cases for all new roles in `Login.jsx`:
```
ACCOUNTANT        → /accountant/dashboard
ADMISSION_OFFICER → /admission/dashboard
PRINCIPAL         → /principal/dashboard
HOD               → /hod/dashboard
EXAM_COORDINATOR  → /exam/dashboard
PARENT_GUARDIAN   → /parent/dashboard
PLATFORM_SUPPORT  → /support/dashboard
BILLING_MANAGER   → /billing/dashboard
```

---

## Phase 5 — Promotion with Academic Status

**Priority:** High
**Blocked by:** Phase 2 (uses ENROLLED status)

### The problem
Currently the only gate for promotion is fee payment. No academic result tracking exists. A student who failed every exam can be promoted as long as fees are paid.

### What to build
- Add `promotionEligibility` to Student model: `{ academicStatus, atktCount, setBy, setAt, remarks }`
- Academic status enum: `PASS`, `FAIL`, `ATKT`, `PENDING_RESULT`
- New promotion gate: PASS or (ATKT + count ≤ max) AND fee paid
- New endpoint: `PUT /api/students/:studentId/academic-status`
- Fix hardcoded year label in promotion response — use `getYearLabel()` from Phase 3
- Frontend: academic status column in promotion screen
- Frontend: set-status UI (PASS/FAIL/ATKT/PENDING_RESULT) before promoting

---

## Phase 6 — HOD Timetable Self-Management + Student ID Card

**Priority:** Medium
**Blocked by:** Phase 3 (year labels + teacher classroom assignment)

### HOD Timetable
- HOD-scoped endpoints: teachers in HOD's dept, subjects for teacher, room from courseAssignments
- Frontend: timetable builder teacher dropdown filtered to HOD's department
- Frontend: subject dropdown filtered by selected teacher
- Frontend: room auto-fill from teacher's courseAssignments
- Frontend: "My Teaching Schedule" tab in HOD dashboard
- Frontend: "Add My Slot" shortcut (pre-fills teacher field with HOD's own profile)

### Student ID Card
All required data already exists: name, photo, enrollment number, course, year label, department, college logo, QR code.
- ID card generator utility using pdfkit
- Endpoints: `GET /api/students/:id/id-card` (single PDF), `POST /api/students/id-cards/bulk` (bulk ZIP)
- Access: COLLEGE_ADMIN (single + bulk), ADMISSION_OFFICER (single only), STUDENT (own card only)
- Frontend: Download ID Card button in ViewStudent and StudentProfile
- Frontend: bulk ID card generation in student list

---

## V1.1 — Deferred (Plan Only)

These require features that don't exist yet:

- **Full exam module** — marks entry, ATKT tracking, re-evaluation workflow, hall tickets
- **Hall ticket generation** — requires exam schedules and seat numbers
- **Full result module** — `StudentResult` model, marks entry UI
- **SMS integration** — SMS alerts as fallback when email fails
- **Mobile app** — limited accessibility on mobile currently
- **Bulk student operations** — mass import, bulk approval
- **Leave management** — student leave workflow
- **Export functionality** — Excel/PDF export for reports
