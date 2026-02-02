const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { admissionSummaryAll, courseWiseAdmissionsAll, paymentSummaryAll, studentPaymentStatusAll, attendanceSummaryAll, } = require("../services/reports.service");


/**
 * PROTECTED ROUTES
 * Allowed Roles:
 * - SUPER_ADMIN
 * - COLLEGE_ADMIN
 * - TEACHER
 */

/* ===============================
   ADMISSIONS
================================ */
router.get("/admissions/super-summary", auth, role("SUPER_ADMIN"), admissionSummaryAll);
router.get("/admissions/college-admin-summary", auth, role("COLLEGE_ADMIN"), collegeMiddleware, admissionSummaryAll);


router.get("/admissions/course-wise", auth,role("COLLEGE_ADMIN"),collegeMiddleware,courseWiseAdmissionsAll);

// /* ===============================
//    PAYMENTS
// ================================ */
router.get("/payments/summary", auth,role("COLLEGE_ADMIN"),collegeMiddleware,paymentSummaryAll);
router.get("/payments/students",  auth,role("COLLEGE_ADMIN"),collegeMiddleware,studentPaymentStatusAll);

// /* ===============================
//    ATTENDANCE
// ================================ */
router.get("/attendance/summary", auth,role("COLLEGE_ADMIN"),collegeMiddleware,attendanceSummaryAll);

module.exports = router;
