# Production Debt — Known Issues in the Running System

Problems confirmed in the live production environment at https://novaa.lemmecode.com

---

## 🔴 Broken Right Now

### Email is completely broken
**Error:** `534 Application-specific password required`
Gmail requires an App Password for third-party apps. The `.env` has a regular Gmail password.
**Fix:** Generate Gmail App Password → update `EMAIL_PASS` in `.env` → restart server.
**Impact:** Every email the platform sends is silently failing:
- Password reset OTPs
- Student registration confirmations
- Approval/rejection notifications
- Payment receipts
- Low attendance alerts
- Payment reminders

---

### QR codes point to localhost
**Cause:** `FRONTEND_URL` not set in production `.env`
**Impact:** QR codes generated for college registration point to `http://localhost:5173` — useless for end users.
**Fix:** Add `FRONTEND_URL=https://novaa.lemmecode.com` to production `.env`.

---

### Stripe payments silently fail
**Cause:** `STRIPE_SECRET_KEY=sk_test_dummy_key_for_presentation` in production `.env`
**Impact:** Any student attempting to pay via Stripe gets a silent failure.
**Fix:** Replace with real Stripe secret key from Stripe dashboard.

---

### Enrollment number never assigned
**Cause:** `enrollmentNumber` is referenced in approval email but never generated or saved.
**Impact:** Every approved student's email says "Enrollment number: Will be assigned shortly" — forever.
**Fix:** Implement enrollment number generation. Planned in Phase 2 (`enrollStudent` step).

---

## 🟡 Partially Working

### Razorpay — test keys in production
Both Razorpay and Stripe are on test/sandbox keys. Real payments cannot be processed.
**Fix:** Switch to live keys after testing is complete (Issue #214).

### File uploads on local disk
All student documents and college QR codes stored on server disk at `backend/uploads/`.
No backup. If server is migrated or disk fails, all files are lost.
**Fix:** Migrate to S3 or equivalent cloud storage (Issue #213).

### HOD role is a permission overlay, not a real role
HOD is determined by `department.hod_id` reference, not by `user.role`.
Teachers don't know they're HOD until they try to create a timetable.
No HOD dashboard exists.
**Fix:** Phase 4 — HOD as standalone role.

---

## 🔵 Configuration Gaps

### Missing environment variables in production `.env`
These are either missing or set to wrong values:

| Variable | Status | Impact |
|---|---|---|
| `FRONTEND_URL` | Missing | QR codes broken |
| `FRONTEND_BASE_URL` | Missing | URL builder returns localhost |
| `CORS_ORIGINS` | Missing | CORS may reject production requests |
| `EMAIL_PASS` | Wrong value | All emails failing |
| `JWT_SECRET` | Weak value | Security risk |
| `STRIPE_SECRET_KEY` | Dummy value | Payments fail |
| `JWT_ACCESS_EXPIRY` | Possibly missing | Tokens may never expire |
| `JWT_REFRESH_EXPIRY` | Possibly missing | Refresh tokens may never expire |

---

## 🔵 Code Gaps Found During Review

### `PRINCIPAL` and `HOD` not in User model enum
Both roles exist in `constants.js` but are missing from the `role` enum in `user.model.js`.
Creating a user with these roles fails silently (Mongoose ignores unknown enum values).
**Fix:** Add to User model enum before Phase 4 starts.

### `sparse: true` on `student.user_id` contradicts `required: true`
The field is marked required but also has a sparse index (which allows null values).
This is contradictory and can allow null `user_id` documents to exist.
**Fix:** Remove `sparse: true` after confirming all students have a `user_id`.

### Academic year hardcoded as `"2025-2026"` in receipt responses
Fee receipts always show academic year as `"2025-2026"` regardless of actual date.
**Fix:** Calculate dynamically from current date.

### Stripe fully built backend-side but students cannot use it
The Stripe payment backend is complete and working. But the student payment UI only shows Razorpay.
Stripe is dead code in production.
**Fix:** Wire up Stripe option in student payment UI (frontend only, ~3 hours).

### College restore cascade sets students back to `APPROVED`
When a college is restored from soft-delete, students are set back to `status: "APPROVED"`.
After Phase 2 migration (`APPROVED` → `ENROLLED`), this will break.
**Fix:** Update cascade to use `ENROLLED` before Phase 2 deploys.

### Login has no routing for new roles
After login, the system only redirects to `/home`. No routing exists for PRINCIPAL, HOD, ACCOUNTANT, or any new role.
**Fix:** Phase 4 — add redirect cases in `Login.jsx`.

### `EWS` in FeeStructure enum but not in student category constants
`EWS` (Economically Weaker Section) exists as a fee structure category but students cannot register with it.
Dead fee structures possible.
**Fix:** Align both enums. Blocked by leadership decision on canonical category list.

### No `.env.example` file
New developers have no reference for what environment variables are required.
**Fix:** Create `backend/.env.example` listing all required variables with placeholder values.

### 36+ `console.log` statements in frontend source
Performance and security concern — sensitive data may be logged in browser console.
**Fix:** Remove all console statements from production frontend code.
