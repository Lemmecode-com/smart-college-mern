# NOVAA — Master Task List (Chronological)

**How to use:** Tasks ordered by when they can and must be done. Work top to bottom. Do not skip ahead — dependencies are real.

**Owner types:** `DevOps` · `Backend` · `Frontend` · `Both` · `Leadership`
**Status:** `[ ]` not started · `[x]` done · `[~]` in progress · `[!]` blocked

---

## Stage 0 — Decisions Needed Before Any Code Work

| # | Task | Owner | Blocks |
|---|---|---|---|
| [ ] | **S0-1** Decide: cookie-based auth vs Bearer token going forward (Q-AUTH-1) | Leadership | Everything |
| [ ] | **S0-2** Decide: `VITE_API_BASE_URL` value for production (Q-AUTH-2) | Leadership | Every frontend build |
| [ ] | **S0-3** Decide: canonical student category list — include EWS? OTHER? (Q-STU-3) | Leadership | Issue #233 Bug 2 fix |
| [ ] | **S0-4** Decide: fee route path — `/api/fees/structure` or `/api/fee-structures`? (Q-FEE-1) | Leadership | All fee frontend work |
| [ ] | **S0-5** Get access to Gmail account used as platform email sender | Leadership | Email fix |

---

## Stage 1 — Security & Legal (No Feature Dependencies)

| # | Task | Owner | Time | Issue | Unblocks |
|---|---|---|---|---|---|
| [ ] | **1-1** Remove student PDFs from GitHub repo using BFG history rewrite | Backend | 1 hr | #182 | Legal compliance |
| [ ] | **1-2** Add `uploads/` to `.gitignore` and commit | Backend | 10 min | #182 | — |
| [ ] | **1-3** Rotate `JWT_SECRET` using `openssl rand -hex 64`, update `.env`, restart | DevOps | 20 min | #225 | — |
| [ ] | **1-4** Replace `SUPER_ADMIN_PASSWORD=admin123` with strong password in `.env` | DevOps | 10 min | #225 | — |
| [ ] | **1-5** Replace dummy Stripe key with real key in `.env` | DevOps | 10 min | #225 | — |
| [ ] | **1-6** Add `FRONTEND_URL` and `CORS_ORIGINS` to production `.env` | DevOps | 15 min | #223 | QR codes, CORS |
| [ ] | **1-7** Fix Gmail App Password in `.env` (`EMAIL_PASS`) | DevOps | 15 min | — | All emails |
| [ ] | **1-8** Fix localhost fallback in `ViewApproveStudent.jsx` | Frontend | 15 min | #224 | — |
| [ ] | **1-9** Fix localhost fallback in `StripeConfiguration.jsx` | Frontend | 15 min | #224 | — |
| [ ] | **1-10** Fix localhost fallback in `RazorpayConfiguration.jsx` | Frontend | 15 min | #224 | — |
| [ ] | **1-11** Fix localhost fallback in `StudentProfile.jsx` | Frontend | 15 min | #224 | — |
| [ ] | **1-12** Create `backend/.env.example` listing all required env vars with placeholder values | Backend | 30 min | — | New developer onboarding |

---

## Stage 2 — Server Sync & Code Cleanup

| # | Task | Owner | Time | Unblocks |
|---|---|---|---|---|
| [ ] | **2-1** Pull remote `origin/main` to server | DevOps | 30 min | All subsequent work |
| [ ] | **2-2** Rebuild frontend after pull and deploy to `/htdocs/novaa.lemmecode.com/public/` | DevOps | 20 min | Staging reflects latest code |
| [ ] | **2-3** Verify production `app.js` matches repo `app.js` — reconcile manual patches | Backend | 30 min | Prevents next deploy breaking things |
| [ ] | **2-4** Remove 36+ `console.log` statements from frontend source | Frontend | 2 hr | Performance, security |
| [ ] | **2-5** Verify `JWT_ACCESS_EXPIRY` and `JWT_REFRESH_EXPIRY` are set in `.env` | DevOps | 10 min | Auth security |

---

## Stage 3 — Immediate Bug Fixes (Issue #233)

Bugs 1, 4, 5 are safe to fix now. Bugs 2, 3, 6 overlap with Phase 2 — fix there instead.

| # | Task | Owner | Time | Issue | Note |
|---|---|---|---|---|---|
| [ ] | **3-1** Remove duplicate `GET /registered` route in `student.routes.js` | Backend | 10 min | #233 Bug 1 | Safe to do now |
| [ ] | **3-2** Fix `validateStudentId` to check `param('id')` not `param('studentId')` | Backend | 15 min | #233 Bug 4 | Safe to do now |
| [ ] | **3-3** Add missing `next` parameter to `updateMyProfile` and `updateStudentByAdmin` | Backend | 15 min | #233 Bug 5 | Safe to do now |
| [!] | **3-4** Fix category `OTHER`/`EWS` mismatch between student validator and FeeStructure model | Backend | 30 min | #233 Bug 2 | Blocked by S0-3 |
| [!] | **3-5** Fix orphaned User account on failed student registration | Backend | 1 hr | #233 Bug 3 | Do in Phase 2 instead |
| [!] | **3-6** Implement enrollment number generation on student approval | Backend | 2 hr | #233 Bug 6 | Do in Phase 2 instead |

---

## Stage 4 — Pre-Phase Fixes (Model & Auth Consistency)

| # | Task | Owner | Time | Blocks |
|---|---|---|---|---|
| [ ] | **4-1** Add `HOD` and `PRINCIPAL` to User model role enum | Backend | 15 min | Phase 4 |
| [ ] | **4-2** Fix HOD middleware: change `role !== "TEACHER"` to also allow `HOD` | Backend | 10 min | Phase 4 |
| [ ] | **4-3** Remove `sparse: true` from `student.user_id` field | Backend | 10 min | Data integrity |
| [ ] | **4-4** Fix hardcoded `"2025-2026"` academic year in receipt responses | Backend | 30 min | Receipt accuracy |
| [ ] | **4-5** Audit Razorpay webhook for idempotency — verify duplicate payment protection | Backend | 2 hr | #194 |
| [ ] | **4-6** Wire up Stripe payment option in student UI (backend already built) | Frontend | 3 hr | Student payment options |

---

## Stage 5 — Phase 1A: Billing Model

**Blocked by:** Leadership answers on pricing tiers and billing cycle
**Can start partially:** Tasks 5-1, 5-2, 5-3 have no blockers

| # | Task | Owner | Time | Blocked by |
|---|---|---|---|---|
| [ ] | **5-1** Add `subscription`, `billingContact`, `gstDetails` fields to College model | Backend | 1 hr | Nothing |
| [ ] | **5-2** Create `Invoice` model | Backend | 2 hr | Nothing |
| [ ] | **5-3** Fix `collegeIsolation.middleware.js` to check `subscription.subscriptionExpiry` | Backend | 1 hr | 5-1 |
| [ ] | **5-4** Implement access states: ACTIVE → WARNING → GRACE_PERIOD → SOFT_BLOCKED → SUSPENDED | Backend | 3 hr | 5-3 |
| [!] | **5-5** Invoice CRUD endpoints | Backend | 4 hr | Q-BILL-1 (pricing tiers) |
| [!] | **5-6** GST-compliant invoice PDF generation using pdfkit | Backend | 4 hr | Q-BILL-3 (GSTIN) |
| [!] | **5-7** Billing cron jobs | Backend | 3 hr | Q-BILL-2 (billing cycle) |
| [!] | **5-8** Frontend: invoice management pages for Super Admin | Frontend | 4 hr | 5-5 |
| [!] | **5-9** Frontend: billing section for College Admin | Frontend | 3 hr | 5-5 |
| [ ] | **5-10** Frontend: subscription warning banner on College Admin dashboard | Frontend | 1 hr | 5-3 |
| [ ] | **5-11** Update college creation: set `subscription.plan = 'TRIAL'` and `trialEndsAt` | Backend | 30 min | 5-1 |

---

## Stage 6 — Phase 1B: Credential Delivery & First Login

**No blockers — can run in parallel with Stage 5**

| # | Task | Owner | Time | Blocked by |
|---|---|---|---|---|
| [ ] | **6-1** Add `mustChangePassword`, `tempPasswordExpiresAt`, `onboardingCompleted`, `createdBy` to User model | Backend | 30 min | Nothing |
| [ ] | **6-2** `mustChangePassword` middleware | Backend | 1 hr | 6-1 |
| [ ] | **6-3** `changePassword` endpoint | Backend | 1 hr | 6-1 |
| [ ] | **6-4** Temp password expiry check on login | Backend | 30 min | 6-1 |
| [ ] | **6-5** Show credentials once modal on college creation (Super Admin UI) | Frontend | 2 hr | 6-1 |
| [ ] | **6-6** Reset credentials endpoint for Super Admin | Backend | 1 hr | 6-1 |
| [ ] | **6-7** Frontend: Change Password page | Frontend | 2 hr | 6-2 |
| [ ] | **6-8** Frontend: axios interceptor — redirect to change-password on `PASSWORD_CHANGE_REQUIRED` | Frontend | 30 min | 6-2 |
| [!] | **6-9** Frontend: Onboarding wizard | Frontend | 4 hr | Q-CRED-2 (mandatory or optional?) |

---

## Stage 7 — Phase 1C: Per-College Email Configuration

**Blocked by:** Stage 1 Task 1-7 (Gmail App Password fix must be done first)
**Can run in parallel with Stages 5 and 6**

| # | Task | Owner | Time |
|---|---|---|---|
| [ ] | **7-1** Create `CollegeEmailConfig` model | Backend | 1 hr |
| [ ] | **7-2** `collegeEmail.service.js` with transporter caching + platform SMTP fallback | Backend | 2 hr |
| [ ] | **7-3** Update all 8 email send functions to accept `collegeId` | Backend | 2 hr |
| [ ] | **7-4** Config endpoints: GET, POST, DELETE, POST verify | Backend | 2 hr |
| [ ] | **7-5** Frontend: Email Configuration page in System Settings | Frontend | 2 hr |

---

## Stage 8 — Phase 2: Admission Workflow Redesign

**Blocked by:** Stage 6 complete + Q-ADM answers + maintenance window

| # | Task | Owner | Time | Blocked by |
|---|---|---|---|---|
| [ ] | **8-1** Run migration: all `APPROVED` students → `ENROLLED` (run on server BEFORE code change) | DevOps | 30 min | Maintenance window |
| [ ] | **8-2** Add new statuses to `STUDENT_STATUS` constants | Backend | 20 min | 8-1 |
| [ ] | **8-3** Update Student model: new status enum + new date fields | Backend | 1 hr | 8-2 |
| [ ] | **8-4** New controller actions: `makeOffer`, `confirmSeat`, `enrollStudent`, `withdrawOffer` | Backend | 4 hr | 8-3 |
| [ ] | **8-5** Fix orphaned User bug: User created only at `enrollStudent` | Backend | 1 hr | 8-4 |
| [ ] | **8-6** Implement enrollment number generation at `enrollStudent` | Backend | 1 hr | 8-4 |
| [ ] | **8-7** Update all `status === "APPROVED"` references → `ENROLLED` across codebase | Backend | 2 hr | 8-2 |
| [ ] | **8-8** Update college restore cascade: `APPROVED` → `ENROLLED` | Backend | 30 min | 8-2 |
| [ ] | **8-9** Update login check in `auth.controller.js`: `APPROVED` → `ENROLLED` | Backend | 15 min | 8-2 |
| [ ] | **8-10** Update promotion controller: `APPROVED` → `ENROLLED` | Backend | 15 min | 8-2 |
| [ ] | **8-11** New routes: `make-offer`, `confirm-seat`, `enroll`, `withdraw` | Backend | 30 min | 8-4 |
| [ ] | **8-12** Frontend: replace single Approve button with 4 state-aware buttons | Frontend | 3 hr | 8-11 |
| [ ] | **8-13** Frontend: admission funnel view | Frontend | 2 hr | 8-11 |
| [ ] | **8-14** Frontend: update all student list filters APPROVED → ENROLLED | Frontend | 1 hr | 8-2 |

---

## Stage 9 — Phase 3: Year Labels + Teacher Classroom

**Can run in parallel with Stages 5, 6, 7 — only needs Stage 1 complete**

| # | Task | Owner | Time | Blocked by |
|---|---|---|---|---|
| [ ] | **9-1** Add `yearLabels` array to Course model | Backend | 30 min | Nothing |
| [ ] | **9-2** Create `getYearLabel(course, semester)` utility function | Backend | 1 hr | 9-1 |
| [ ] | **9-3** Run migration: auto-generate default FY/SY/TY labels for existing courses | DevOps | 20 min | 9-1 |
| [ ] | **9-4** Replace hardcoded year calculations in promotion, student, timetable, attendance controllers | Backend | 2 hr | 9-2 |
| [ ] | **9-5** Frontend: year label input fields in AddCourse and EditCourse | Frontend | 2 hr | 9-1 |
| [ ] | **9-6** Frontend: show "TY — Semester 5" format across student profile, timetable, attendance | Frontend | 2 hr | 9-2 |
| [ ] | **9-7** Replace `courses: [ObjectId]` with `courseAssignments` on Teacher model | Backend | 1 hr | 9-1 |
| [ ] | **9-8** Update teacher controller to accept `courseAssignments` | Backend | 1 hr | 9-7 |
| [ ] | **9-9** Timetable slot: auto-fill room from teacher's `courseAssignments` | Backend | 1 hr | 9-7 |
| [ ] | **9-10** Timetable slot: conflict detection (teacher, room, course-year double-booking) | Backend | 3 hr | 9-9 |
| [ ] | **9-11** Run migration: convert existing `courses[]` to `courseAssignments[]` | DevOps | 20 min | 9-7 |
| [ ] | **9-12** Frontend: replace course multi-select with courseAssignments form in AddTeacher/EditTeacher | Frontend | 3 hr | 9-7 |
| [ ] | **9-13** Frontend: timetable builder room auto-fill | Frontend | 2 hr | 9-9 |

---

## Stage 10 — Phase 4: New Roles

**Blocked by:** Stage 8 + Stage 6 complete + Q-ROLE answers

| # | Task | Owner | Time | Blocked by |
|---|---|---|---|---|
| [ ] | **10-1** Add all new roles to `constants.js` ROLE enum | Backend | 20 min | Nothing |
| [ ] | **10-2** Add all new roles to User model role enum | Backend | 15 min | 10-1 |
| [ ] | **10-3** Fix HOD middleware: change role check from `TEACHER` to `HOD` | Backend | 10 min | 10-2 |
| [ ] | **10-4** Staff account management endpoints: create, list, update, link-parent | Backend | 3 hr | 10-2 |
| [ ] | **10-5** ACCOUNTANT — add to payment, receipt, fee structure GET, financial report routes | Backend | 2 hr | 10-2 |
| [ ] | **10-6** ACCOUNTANT — `GET /api/accountant/dashboard` endpoint | Backend | 1 hr | 10-5 |
| [ ] | **10-7** ACCOUNTANT — frontend pages: dashboard, fee collection, payment history, receipts | Frontend | 4 hr | 10-6 |
| [ ] | **10-8** ADMISSION_OFFICER — add to registered students + Phase 2 admission routes | Backend | 1 hr | 10-2, Stage 8 |
| [ ] | **10-9** ADMISSION_OFFICER — `GET /api/admission/dashboard` endpoint | Backend | 1 hr | 10-8 |
| [ ] | **10-10** ADMISSION_OFFICER — frontend pages: dashboard, pending applications, detail | Frontend | 3 hr | 10-9 |
| [ ] | **10-11** PRINCIPAL — add to all GET routes across student, teacher, dept, course, reports, dashboard, attendance, fee, audit log | Backend | 3 hr | 10-2 |
| [ ] | **10-12** PRINCIPAL — frontend pages: read-only dashboard, reports, student list, teacher list | Frontend | 4 hr | 10-11 |
| [ ] | **10-13** EXAM_COORDINATOR — add to approved students GET, teacher GET, timetable GET, attendance GET | Backend | 1 hr | 10-2 |
| [ ] | **10-14** EXAM_COORDINATOR — placeholder dashboard endpoint + frontend page | Both | 1.5 hr | 10-13 |
| [ ] | **10-15** PARENT_GUARDIAN — new `ParentGuardian` model | Backend | 1 hr | 10-2 |
| [ ] | **10-16** PARENT_GUARDIAN — new middleware attaching `req.linkedStudentIds` | Backend | 1 hr | 10-15 |
| [ ] | **10-17** PARENT_GUARDIAN — new routes: children list, child profile/attendance/fees (scoped) | Backend | 2 hr | 10-16 |
| [ ] | **10-18** PARENT_GUARDIAN — frontend pages: dashboard, child attendance, child fees, child profile | Frontend | 4 hr | 10-17 |
| [ ] | **10-19** PLATFORM_SUPPORT — add to college list GET, health check, audit log GET | Backend | 30 min | 10-2 |
| [ ] | **10-20** Login routing: add redirect cases for all new roles in `Login.jsx` | Frontend | 1 hr | 10-2 |

---

## Stage 11 — Phase 5: Promotion with Academic Status

**Blocked by:** Stage 8 complete + Q-PROM-1 answer
**Can run in parallel with Stage 10**

| # | Task | Owner | Time | Blocked by |
|---|---|---|---|---|
| [ ] | **11-1** Add `promotionEligibility` to Student model | Backend | 30 min | Stage 8 |
| [ ] | **11-2** Update promotion gate: PASS or (ATKT + count ≤ max) AND fee paid | Backend | 1 hr | 11-1 |
| [ ] | **11-3** New endpoint: `PUT /api/students/:studentId/academic-status` | Backend | 1 hr | 11-1 |
| [ ] | **11-4** Fix hardcoded year label in promotion response — use `getYearLabel()` from Stage 9 | Backend | 30 min | Stage 9 Task 9-2 |
| [ ] | **11-5** Frontend: academic status column in promotion screen | Frontend | 1 hr | 11-3 |
| [ ] | **11-6** Frontend: set-status UI (PASS/FAIL/ATKT/PENDING_RESULT) before promoting | Frontend | 2 hr | 11-3 |

---

## Stage 12 — Phase 6: HOD Timetable + ID Card

**Blocked by:** Stage 9 complete + Q-HOD and Q-ID answers

| # | Task | Owner | Time | Blocked by |
|---|---|---|---|---|
| [ ] | **12-1** HOD-scoped endpoints: teachers in dept, subjects for teacher, room from courseAssignments | Backend | 2 hr | Stage 9 |
| [ ] | **12-2** Frontend: timetable builder teacher dropdown filtered to HOD's department | Frontend | 1 hr | 12-1 |
| [ ] | **12-3** Frontend: subject dropdown filtered by selected teacher | Frontend | 1 hr | 12-1 |
| [ ] | **12-4** Frontend: room auto-fill from teacher's courseAssignments | Frontend | 1 hr | 12-1 |
| [ ] | **12-5** Frontend: "My Teaching Schedule" tab in HOD dashboard | Frontend | 2 hr | 12-1 |
| [ ] | **12-6** Frontend: "Add My Slot" shortcut | Frontend | 1 hr | 12-1 |
| [!] | **12-7** ID card generator utility using pdfkit | Backend | 3 hr | Q-ID-1, Q-ID-2 |
| [!] | **12-8** ID card endpoints: single student PDF, bulk ZIP | Backend | 2 hr | 12-7 |
| [!] | **12-9** Frontend: Download ID Card button in ViewStudent and StudentProfile | Frontend | 1 hr | 12-8 |
| [!] | **12-10** Frontend: bulk ID card generation in student list | Frontend | 2 hr | 12-8 |

---

## Stage 13 — Compliance & Medium Priority Issues

Can be done at any point after Stage 2. Do not block any phase.

| # | Task | Owner | Time | Issue |
|---|---|---|---|---|
| [ ] | **13-1** Add GST calculation to fee receipts | Both | 3 hr | #212 |
| [ ] | **13-2** Migrate file uploads from local disk to S3 | Backend | 1 day | #213 |
| [ ] | **13-3** Switch Razorpay and Stripe from test keys to live keys | DevOps | 30 min | #214 |
| [ ] | **13-4** Implement data retention policy | Backend | 2 hr | #217 |

---

## What Can Be Done Right Now (Zero Blockers)

**Under 30 min each:**
- 1-1 through 1-12 (security and legal fixes)
- 3-1, 3-2, 3-3 (safe bug fixes from #233)
- 4-1, 4-2, 4-3, 4-4 (model consistency fixes)

**This week (1–3 hours each):**
- 2-1 through 2-5 (server cleanup)
- 4-5 (Razorpay webhook audit)
- 5-1, 5-2 (billing model — start before pricing is decided)
- 6-1 through 6-8 (credential delivery — all except onboarding wizard)
- 7-1 through 7-5 (email config)
- 9-1 through 9-6 (year labels backend + frontend)
