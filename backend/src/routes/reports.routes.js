  const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const {
  admissionSummary,
  paymentSummary,
  studentPaymentStatus,
  attendanceSummary,
  courseWiseAdmissions,
  allDashboardReports,
  lowAttendanceStudents,
} = require("../controllers/reports.controller");


/* ===============================
   COMBINED DASHBOARD REPORTS
================================ */
router.get(
  "/dashboard/all",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  allDashboardReports,
);

/* ===============================
   ADMISSIONS
================================ */
router.get(
  "/admissions/super-summary",
  auth,
  role("SUPER_ADMIN"),
  admissionSummary,
);
router.get(
  "/admissions/college-admin-summary",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  admissionSummary,
);

router.get(
  "/admissions/course-wise",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  courseWiseAdmissions,
);

// /* ===============================
//    PAYMENTS
// ================================ */
router.get(
  "/payments/summary",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  paymentSummary,
);
router.get(
  "/payments/students",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  studentPaymentStatus,
);

// /* ===============================
//    ATTENDANCE
// ================================ */
router.get(
  "/attendance/summary",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  attendanceSummary,
);

router.get(
  "/attendance/low-attendance",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  lowAttendanceStudents,
);

module.exports = router;
