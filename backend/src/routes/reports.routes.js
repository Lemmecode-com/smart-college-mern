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

const { ROLE } = require("../utils/constants");

/* ===============================
   COMBINED DASHBOARD REPORTS
================================ */
router.get(
  "/dashboard/all",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL),
  collegeMiddleware,
  allDashboardReports,
);

/* ===============================
   ADMISSIONS
================================ */
router.get(
  "/admissions/super-summary",
  auth,
  role(ROLE.SUPER_ADMIN),
  admissionSummary,
);
router.get(
  "/admissions/college-admin-summary",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL),
  collegeMiddleware,
  admissionSummary,
);

router.get(
  "/admissions/course-wise",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL),
  collegeMiddleware,
  courseWiseAdmissions,
);

// /* ===============================
//    PAYMENTS
// ================================ */
router.get(
  "/payments/summary",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT, ROLE.PRINCIPAL),
  collegeMiddleware,
  paymentSummary
);

router.get(
  "/payments/students",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT, ROLE.PRINCIPAL),
  collegeMiddleware,
  studentPaymentStatus
);

// /* ===============================
//    ATTENDANCE
// ================================ */
router.get(
  "/attendance/summary",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  attendanceSummary
);

router.get(
  "/attendance/low-attendance",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  lowAttendanceStudents
);

module.exports = router;
