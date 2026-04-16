# Open Questions — Needs Leadership / Product Owner Answer

All questions that are currently blocking development. No dev should start a blocked task until its question is answered.

**Status key:** 🔴 Blocks current work · 🟡 Blocks upcoming phase · ✅ Answered

---

## Must Answer Before Any Sprint Starts

| ID | Question | Blocks |
|---|---|---|
| Q-AUTH-1 | Cookie-based auth vs Bearer token — which is the system going forward? | Everything |
| Q-AUTH-2 | `VITE_API_BASE_URL` value for production — `/api` or `https://novaa.lemmecode.com/api`? | Every frontend build |
| Q-STU-3 | Canonical student category list — `GEN, OBC, SC, ST, EWS, OTHER` or subset? | Issue #233 Bug 2 fix |
| Q-FEE-1 | Fee route path — `/api/fees/structure` (current remote) or `/api/fee-structures` (correct REST)? | All fee frontend work |
| Q-EMAIL-1 | Who has access to the Gmail account used as platform email sender? | Email fix (broken for weeks) |

---

## Phase 1 — Billing

| ID | Question | Options | Blocks |
|---|---|---|---|
| Q-BILL-1 🔴 | What are the pricing tiers and amounts? | TBD | Invoice creation UI |
| Q-BILL-2 🔴 | Billing cycle — academic year (Jun–May) or calendar year (Jan–Dec)? | Academic / Calendar | Invoice date logic, cron jobs |
| Q-BILL-3 🟡 | Does LemmeCode have a GSTIN? | Yes / No / In progress | Invoice PDF generation |
| Q-BILL-4 🟡 | Is BILLING_MANAGER a separate person or does SUPER_ADMIN handle billing? | Separate / Same | Role creation priority |
| Q-BILL-5 🟡 | What happens to college data after 30-day suspension — retained 90 days or deleted? | 90 days / Deleted | Data retention policy |
| Q-BILL-6 🟡 | Should trial colleges have 30-day expiry or no expiry? | 30 days / No expiry | College creation flow |

---

## Phase 1 — Credential Delivery

| ID | Question | Options | Blocks |
|---|---|---|---|
| Q-CRED-1 🟡 | Temp password expiry — 24 hours or 48 hours? | 24h / 48h | `tempPasswordExpiresAt` |
| Q-CRED-2 🟡 | Should onboarding wizard be mandatory or optional? | Mandatory / Optional | Wizard UX |
| Q-CRED-3 🟡 | Should teacher accounts also have `mustChangePassword` enforced, or only College Admin? | All / Admin only | Middleware scope |
| Q-CRED-4 🟡 | Should the system send SMS as fallback when email fails? | Yes / No | SMS integration priority |

---

## Phase 2 — Admission Workflow

| ID | Question | Options | Blocks |
|---|---|---|---|
| Q-ADM-1 🟡 | Should OFFER_MADE trigger automatic email to student, or is it manual (college calls)? | Auto email / Manual | Email send logic |
| Q-ADM-2 🟡 | Is downpayment amount mandatory at SEAT_CONFIRMED, or optional? | Mandatory / Optional | Form validation |
| Q-ADM-3 🟡 | Can a student be re-offered after being WITHDRAWN? Or is WITHDRAWN permanent? | Yes / No | Status transition rules |
| Q-ADM-4 🟡 | Should the system track offer expiry (e.g., offer expires in 7 days)? | Yes / No | Cron job needed |
| Q-ADM-5 🔴 | When can the platform go offline for 30–60 minutes for the APPROVED → ENROLLED migration? | Date/time | Phase 2 deploy |

---

## Phase 3 — Year Labels & Teacher Classroom

| ID | Question | Options | Blocks |
|---|---|---|---|
| Q-YR-1 🟡 | Should fee structures be defined per year-label or per semester? | Per year / Per semester | FeeStructure model |
| Q-YR-2 🟡 | Can a course have an odd number of semesters (e.g., 3 semesters for a diploma)? | Yes / No | Year label calculation |
| Q-TCH-1 🟡 | Who assigns classrooms — College Admin at teacher creation, or HOD at timetable creation? | Admin / HOD / Both | UI location |
| Q-TCH-2 🟡 | Should room conflict be a hard block or soft warning? | Hard block / Soft warning | Timetable validation |
| Q-TCH-3 🟡 | Should classroom assignments reset every academic year or carry forward? | Reset / Carry forward | Academic year rollover |

---

## Phase 4 — New Roles

| ID | Question | Options | Blocks |
|---|---|---|---|
| Q-ROLE-1 🟡 | Can ACCOUNTANT create fee structures or only record payments? | View only / Create too | Route guards |
| Q-ROLE-2 🟡 | Can ADMISSION_OFFICER reject students or only approve/offer? | Approve only / Both | Approval controller |
| Q-ROLE-3 🟡 | Should PRINCIPAL be able to override College Admin decisions? | Yes / No | Approval workflow |
| Q-ROLE-4 🟡 | Who creates ACCOUNTANT and ADMISSION_OFFICER accounts — College Admin or Super Admin? | College Admin / Super Admin | Staff creation flow |
| Q-ROLE-5 🟡 | Should EXAM_COORDINATOR be built in Phase 4 (limited) or deferred to V1.1? | Phase 4 limited / V1.1 full | Sprint scope |

---

## Phase 5 — Promotion

| ID | Question | Options | Blocks |
|---|---|---|---|
| Q-PROM-1 🟡 | What is the maximum ATKT count allowed? Is it configurable per college? | Fixed / Configurable | Promotion gate logic |
| Q-PROM-2 🟡 | Who enters student results in V1.1 — Admin, Exam Coordinator, or Teacher? | Admin / Exam Coordinator / Teacher | Role permissions |
| Q-PROM-3 🟡 | Should system send notification to student when academic status is set? | Yes / No | Notification service |

---

## Phase 6 — HOD Timetable & ID Card

| ID | Question | Options | Blocks |
|---|---|---|---|
| Q-HOD-1 🟡 | Room conflict — hard block or soft warning? | Hard block / Soft warning | UX |
| Q-HOD-2 🟡 | Can HOD assign a teacher from another department (visiting lecturer)? | Yes / No | Teacher dropdown scope |
| Q-HOD-3 🟡 | Can HOD see other departments' timetables (read-only)? | Yes / No | HOD dashboard scope |
| Q-ID-1 🟡 | ID card size — credit card (85.6×54mm) or A4 with 4 cards per page? | Credit card / A4 | PDF layout |
| Q-ID-2 🟡 | Should the ID card include a QR code? | Yes / No | QR code type |
| Q-ID-3 🟡 | Bulk output — ZIP of individual PDFs or single multi-page PDF? | ZIP / Multi-page | Bulk generation |
| Q-ID-4 🟡 | Should students be able to download their own ID card? | Yes / No | Student dashboard |
