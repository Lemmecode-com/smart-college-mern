# P0 CRITICAL Issues — Production Blockers

**Generated:** 11 April 2026  
**Severity:** High
**Total Issues:** 13

---

## TABLE OF CONTENTS

1. [Hardcoded Localhost URLs (13 Issues)](#1-hardcoded-localhost-urls)

---

## 1. HARDCODED LOCALHOST URLs

### Issue #1: Frontend Axios Instance — All API Calls Break

- **File:** `frontend/src/api/axios.js`
- **Line:** 4
- **Current Code:**
  ```js
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  ```
- **Risk:** If `VITE_API_BASE_URL` is not set in production, **every single API call** in the entire frontend goes to `localhost:5000` — the entire app breaks silently.
- **Fix:**
  ```js
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  if (!baseURL) {
    throw new Error(
      "VITE_API_BASE_URL is not defined. Please set it in your .env file."
    );
  }

  const api = axios.create({
    baseURL,
    withCredentials: true
  });
  ```

---

### Issue #2: StudentProfile — Document Links Break

- **File:** `frontend/src/pages/dashboard/Student/StudentProfile.jsx`
- **Lines:** 1890-1891
- **Current Code:**
  ```js
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  ```
- **Risk:** Student cannot download their documents (certificates, receipts) in production.
- **Fix:**
  ```js
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL environment variable is required");
  }
  ```

---

### Issue #3: ViewApproveStudent — Admin Cannot View Documents

- **File:** `frontend/src/pages/dashboard/College-Admin/ViewApproveStudent.jsx`
- **Lines:** 261-262
- **Current Code:**
  ```js
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  ```
- **Risk:** Admin cannot review student documents during approval process.
- **Fix:** Same as Issue #2 — remove fallback, throw error if env var missing.

---

### Issue #4: RazorpayConfiguration — Localhost URL EXPOSED in UI

- **File:** `frontend/src/pages/dashboard/College-Admin/SystemSetting/RazorpayConfiguration.jsx`
- **Lines:** 29-30, 548
- **Current Code:**
  ```js
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  ```
  And at line 548 this is displayed to the admin:
  ```jsx
  {API_BASE_URL}/api/razorpay/webhook
  ```
- **Risk:** In production, the admin literally sees `http://localhost:5000/api/api/razorpay/webhook` displayed on the screen. Also note the **double `/api`** path issue.
- **Fix:**
  ```js
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is required for payment gateway configuration");
  }
  ```
  And fix the displayed webhook URL to not double the `/api`:
  ```jsx
  {API_BASE_URL}/razorpay/webhook
  ```

---

### Issue #5: StripeConfiguration — Same Fallback Issue

- **File:** `frontend/src/pages/dashboard/College-Admin/SystemSetting/StripeConfiguration.jsx`
- **Lines:** 29-30
- **Current Code:**
  ```js
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  ```
- **Risk:** Stripe configuration page breaks in production.
- **Fix:** Same as Issue #4 — remove fallback, throw error.

---

### Issue #6: Backend urlBuilder — Email Links Point to Localhost

- **File:** `backend/src/utils/urlBuilder.js`
- **Lines:** 8, 24
- **Current Code:**
  ```js
  const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  ```
- **Risk:** **All emails sent by the system** (password reset, approval links, registration links) contain `http://localhost:5173` links. Users click them and get nothing.
- **Fix:**
  ```js
  function getFrontendBaseUrl() {
    const url = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    if (!url) {
      throw new Error(
        "FRONTEND_URL or CLIENT_URL environment variable is required. " +
        "Set it to your production domain (e.g., https://yourdomain.com)"
      );
    }
    return url;
  }
  ```

---

### Issue #7: QR Code Generator — QR Codes Point to Localhost

- **File:** `backend/src/utils/qrGenerator.js`
- **Line:** 6
- **Current Code:**
  ```js
  const baseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
  ```
- **Risk:** **QR codes generated for colleges contain localhost URLs.** Students scanning QR codes cannot access registration pages. Also uses a **different env var name** (`FRONTEND_BASE_URL`) than everywhere else.
- **Fix:**
  1. Change `FRONTEND_BASE_URL` → `FRONTEND_URL` to consolidate
  2. Remove fallback, throw error:
  ```js
  const baseUrl = process.env.FRONTEND_URL;
  if (!baseUrl) {
    throw new Error(
      "FRONTEND_URL environment variable is required for QR code generation"
    );
  }
  ```

---

### Issue #8: Stripe Payment Controller — Payment Redirects Break Silently

- **File:** `backend/src/controllers/stripe.payment.controller.js`
- **Lines:** 151-152
- **Current Code:**
  ```js
  success_url: `${process.env.FRONTEND_URL}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.FRONTEND_URL}/student/payment-cancel`,
  ```
- **Risk:** If `FRONTEND_URL` is not set, Stripe redirects users to `undefined/student/payment-success` — **payment flow breaks with no error message.** User pays money but gets lost.
- **Fix:**
  ```js
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    throw new Error(
      "FRONTEND_URL is required for Stripe payment redirects. " +
      "Set it in your .env file before processing payments."
    );
  }

  // Later in the function:
  success_url: `${frontendUrl}/student/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${frontendUrl}/student/payment-cancel`,
  ```

---

## 2. RUNTIME CRASH BUGS

### Issue #9: date.utils.js — `this` is Undefined (All Date Functions Crash)

- **File:** `backend/src/utils/date.utils.js`
- **Lines:** 28, 39, 138
- **Current Code:**
  ```js
  // Line 28
  exports.isDateMatchesDay = (date, dayName) => {
    const actualDay = this.getDayName(date);  // this is undefined
    return actualDay === dayName;
  };

  // Line 39
  exports.getAllDatesForDay = (dayName, startDate, endDate) => {
    // ...
    if (this.getDayName(current) === dayName) {  // this is undefined
    // ...
  };

  // Line 138
  exports.getValidDatesForSlot = (dayName, academicYear, semester) => {
    const { start, end } = this.getSemesterDateRange(academicYear, semester);  // this is undefined
    return this.getAllDatesForDay(dayName, start, end);
  };
  ```
- **Risk:** In CommonJS, `this` at module level is NOT the exports object. **Every call to these functions throws `TypeError: Cannot read properties of undefined`.** Any feature using these functions (timetable creation, attendance sessions, scheduling) crashes.
- **Fix:** Replace `this.` with `exports.`:
  ```js
  exports.isDateMatchesDay = (date, dayName) => {
    const actualDay = exports.getDayName(date);
    return actualDay === dayName;
  };

  exports.getAllDatesForDay = (dayName, startDate, endDate) => {
    // ...
    if (exports.getDayName(current) === dayName) {
    // ...
  };

  exports.getValidDatesForSlot = (dayName, academicYear, semester) => {
    const { start, end } = exports.getSemesterDateRange(academicYear, semester);
    return exports.getAllDatesForDay(dayName, start, end);
  };
  ```

---

### Issue #10: reports.service.js — `mongoose` Used Before Import (Runtime Crash)

- **File:** `backend/src/services/reports.service.js`
- **Lines:** 224-230 (usage), 276 (import)
- **Current Code:**
  ```js
  // Line 227 — USED BEFORE IMPORT
  const paymentSummary = async (college_id) => {
    // ...
    college_id: new mongoose.Types.ObjectId(college_id),  // mongoose is not defined here!
    // ...
  };

  // Line 276 — IMPORT IS AT THE BOTTOM
  const mongoose = require("mongoose");
  ```
- **Risk:** **`ReferenceError: mongoose is not defined`** — Payment summary reports crash every time.
- **Fix:** Move `mongoose` import to the top of the file:
  ```js
  const mongoose = require("mongoose");
  // ... rest of imports
  ```

---

### Issue #11: reports.service.js — Duplicate Function Names Override Each Other

- **File:** `backend/src/services/reports.service.js`
- **Lines:** 78 & 224, 98 & 238, 120 & 278
- **Current Code:**
  ```js
  // First definition (line 78)
  exports.paymentSummary = async () => { /* version 1 */ };

  // Second definition (line 224) — OVERRIDES the first!
  exports.paymentSummary = async (college_id) => { /* version 2 */ };

  // Same for studentPaymentStatus (lines 98 & 238)
  // Same for attendanceSummary (lines 120 & 278)
  ```
- **Risk:** The **first versions of these 3 functions are completely inaccessible.** Any code calling them gets the second version with a different signature. This causes incorrect data in reports or crashes.
- **Fix:** Rename the functions to have unique names, or merge them into a single function:
  ```js
  // Option 1: Rename
  exports.paymentSummary = async () => { /* ... */ };
  exports.paymentSummaryByCollege = async (college_id) => { /* ... */ };

  // Option 2: Merge into one function with optional parameter
  exports.paymentSummary = async (college_id = null) => {
    if (college_id) {
      // version 2 logic
    } else {
      // version 1 logic
    }
  };
  ```

---

### Issue #12: timetable.controller.js — No College Isolation on Publish

- **File:** `backend/src/controllers/timetable.controller.js`
- **Line:** 76
- **Current Code:**
  ```js
  exports.publishTimetable = async (req, res) => {
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { status: "PUBLISHED" },
      { new: true }
    );
    // NO college_id filter!
    // NO role check!
    // NO try-catch!
  ```
- **Risk:** **Any authenticated user** (even a student) can publish ANY timetable in ANY college. No authorization, no college isolation, no error handling.
- **Fix:**
  ```js
  exports.publishTimetable = async (req, res, next) => {
    try {
      // Add college isolation
      const timetable = await Timetable.findOne({
        _id: req.params.id,
        college_id: req.college_id,
      });

      if (!timetable) {
        return next(new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND"));
      }

      // Add role check (only COLLEGE_ADMIN or HOD can publish)
      if (!["COLLEGE_ADMIN", "HOD"].includes(req.user.role)) {
        return next(new AppError("Not authorized to publish timetable", 403, "UNAUTHORIZED"));
      }

      timetable.status = "PUBLISHED";
      await timetable.save();

      return new ApiResponse.success(res, { timetable }, "Timetable published successfully");
    } catch (error) {
      next(error);
    }
  };
  ```

---

### Issue #13: admin.receipt.controller.js — Cross-College Data Leak

- **File:** `backend/src/controllers/admin.receipt.controller.js`
- **Line:** 11
- **Current Code:**
  ```js
  const studentFee = await StudentFee.findOne({
    "installments._id": installmentId,
  })
  // NO college_id filter!
  ```
- **Risk:** **Any college admin can access receipts from ANY other college.** Complete multi-tenant data isolation breach.
- **Fix:**
  ```js
  const studentFee = await StudentFee.findOne({
    _id: installmentId,  // or use the parent document's _id
    college_id: req.college_id,  // ADD THIS
  }).populate("student_id", "fullName email");
  ```

---