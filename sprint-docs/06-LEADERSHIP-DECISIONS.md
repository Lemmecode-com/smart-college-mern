# NOVAA — Decisions Needed from Leadership

**What this document is:**
Plain-language explanation of every open decision blocking the development team.
No code. No jargon.

**Who needs to read this:**
Product owner, investors, and anyone with authority to make product and business decisions.

**How to use it:**
Read each section, pick an answer, communicate it to the development team.
The faster these are answered, the faster the product ships.

---

## The Big Picture

Two tracks of work are running in parallel:

**Track 1 — Things that are broken right now.**
Bugs and configuration issues. These need to be fixed regardless of any business decision.
The development team can fix these immediately.

**Track 2 — Things that need to be built.**
The product roadmap has six phases of new features.
Several phases cannot start until leadership answers the questions in this document.

---

## Section 1 — Revenue: The Platform Currently Has No Way to Charge Colleges

### What is happening right now
Every college on NOVAA has free, unlimited access. There is no billing system, no subscription, no invoice, and no way to cut off a college that has not paid. The code has a check that is supposed to block expired colleges — but the field it checks does not exist in the database. The check never fires.

### Decisions needed

**1-A: What are the pricing tiers?**
The billing system needs plan names, annual prices, and what each plan includes or limits.
Without this, the invoice creation screen cannot be built.

**1-B: What is the billing cycle?**
- Academic year (June to May) — aligns with how Indian colleges think about their budget
- Calendar year (January to December) — simpler for accounting

**1-C: Does LemmeCode have a GST registration number (GSTIN)?**
Indian B2B invoices above ₹20,000 require GST. If yes, invoices must show CGST/SGST/IGST breakdown.

**1-D: Who handles billing internally?**
- Option A: Super Admin handles all billing directly
- Option B: A separate BILLING_MANAGER role for a finance team member

**1-E: What happens to a college's data after they stop paying?**
Recommended: 7-day warning → 15-day grace → read-only → 30-day suspension → deletion.
How long after suspension before data is permanently deleted?

**1-F: Do trial colleges get a time limit?**
Should new colleges get a 30-day free trial that expires automatically, or unlimited access until billing is set up manually?

---

## Section 2 — Emails Are Not Being Sent

### What is happening right now
Every email the platform is supposed to send is silently failing. Password reset OTPs, approval notifications, payment receipts, attendance alerts — all failing.

The error: Gmail requires a special "App Password" for third-party apps. The platform is using a regular Gmail password.

### The immediate fix (15 minutes)
Generate a Gmail App Password and update one line in the server configuration.
**This requires access to the Gmail account configured as the platform's email sender.**
**Who has access to that account?**

---

## Section 3 — The Admission Process Is Broken by Design

### What is happening right now
When admin clicks "Approve", the system immediately creates a login account, a fee record, and sends credentials — even if the student never actually joins. In India, students apply to multiple colleges simultaneously. This creates orphaned accounts and fee records for students who never enrolled.

### The fix
Replace the single "Approve" button with a four-step process:
1. **Make Offer** — no account created, email sent to student
2. **Confirm Seat** — student visits college, pays downpayment
3. **Enroll** — account created, fee record created, credentials sent
4. **Withdraw** — student declined, no data left behind

### Decisions needed

**3-A: Should the offer email be sent automatically, or should the college call the student manually?**

**3-B: Is the downpayment amount required at Seat Confirmation, or optional?**

**3-C: Can a student be re-offered after withdrawing?**

**3-D: Should offers expire automatically after X days?**

**3-E: When can the platform go offline for 30–60 minutes for the data migration?**
This change requires migrating all existing "approved" students to "enrolled" status. Cannot be done while the platform is live.

---

## Section 4 — New Staff Roles

### What is happening right now
The College Admin role is doing the work of five different people: Principal, Accountant, Admission Officer, Exam Coordinator, and HOD. This does not scale.

### Six new roles planned

**PRINCIPAL** — Can see everything. Cannot change anything (except announcements). Oversight only.

**ACCOUNTANT** — Can see and manage fees, payments, receipts. Cannot see academic data.

**ADMISSION OFFICER** — Can process pending applications. Cannot see enrolled students' records.

**EXAM COORDINATOR** — Can view student and teacher data for exam planning. Full exam module is a later version.

**PARENT / GUARDIAN** — Can view their own child's attendance, fees, and profile. Read-only.

**PLATFORM SUPPORT** — LemmeCode internal. Can view college list and system health only.

### Decisions needed

**4-A: Can the Accountant create fee structures, or only record payments?**

**4-B: Can the Admission Officer reject students, or only process approvals?**

**4-C: Who creates Accountant and Admission Officer accounts — College Admin or Super Admin?**

**4-D: Should the Exam Coordinator role be built now (limited) or later (with the full exam module)?**

---

## Section 5 — Student Promotion Cannot Track Pass or Fail

### What is happening right now
The only thing blocking a student from being promoted is whether they paid their fees. A student who failed every exam can be promoted as long as fees are paid.

### The fix
A simple academic status flag per student: PASS, FAIL, ATKT (backlog), or PENDING RESULT.
The promotion screen will require the admin to set this status before promoting.

### Decisions needed

**5-A: What is the maximum number of backlogs (ATKT) allowed for promotion?**
Should this be a fixed platform rule, or configurable per college?

**5-B: Who enters the academic status — College Admin or Exam Coordinator?**

---

## Section 6 — Year Labels

### What is happening right now
Every screen shows "Semester 5" or "3rd Year." Indian colleges say FY, SY, TY.

### Decisions needed

**6-A: Should fee structures be defined per year-label or per semester?**
If fees differ by year (FY students pay different than TY), the fee structure model needs redesign.
If fees are the same across all years, no change needed.

**6-B: Can a course have an odd number of semesters (e.g., 3 semesters for a diploma)?**

---

## Section 7 — Student ID Cards

### Decisions needed

**7-A: ID card size — credit card (85.6×54mm) or A4 with 4 cards per page?**

**7-B: Should the ID card include a QR code?**

**7-C: Bulk output — one PDF with all cards, or a ZIP file with one PDF per student?**

**7-D: Should students be able to download their own ID card from their dashboard?**

---

## Section 8 — HOD Timetable

### Decisions needed

**8-A: Should a room conflict be a hard block or a soft warning?**

**8-B: Can the HOD assign a teacher from another department (visiting lecturer)?**

---

## Summary — Decisions Ranked by Urgency

### Must answer immediately (blocking current work)

| # | Decision | Why it cannot wait |
|---|---|---|
| Email access | Who has the Gmail account password? | Emails broken for weeks |
| 1-A | Pricing tiers | Platform has zero revenue mechanism |
| 1-B | Billing cycle | Affects every invoice and expiry calculation |
| 3-E | Migration window | Phase 2 cannot deploy without it |

### Answer before Phase 2 starts

| # | Decision | Impact if delayed |
|---|---|---|
| 3-A | Offer email — automatic or manual? | Affects Make Offer button |
| 3-B | Downpayment — required or optional? | Affects form validation |
| 3-C | Can withdrawn students be re-offered? | Affects status rules |
| 4-B | Can Admission Officer reject students? | Affects admission screen buttons |

### Answer before Phase 4 starts

| # | Decision | Impact if delayed |
|---|---|---|
| 4-A | Accountant fee structure access | Affects which screens Accountant sees |
| 4-C | Who creates staff accounts? | Affects staff creation flow |
| 4-D | Build Exam Coordinator now or later? | Affects Phase 4 scope |
| 5-A | Maximum ATKT count | Affects promotion gate logic |

### Answer before Phase 6 starts

| # | Decision |
|---|---|
| 7-A | ID card size |
| 7-B | QR code on ID card |
| 7-C | Bulk output format |
| 7-D | Student self-download |
| 8-A | Room conflict — hard block or warning |
| 8-B | Cross-department teacher assignment |
