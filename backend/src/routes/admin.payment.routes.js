const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getCollegePaymentReport,
  getPaymentOverdueStats,
  triggerPaymentReminders,
} = require("../controllers/admin.payment.controller");

const {
  getReconciliationReport,
  reconcilePayment,
} = require("../cron/paymentReconciliation.cron");

const { getAdminReceipt } = require("../controllers/admin.receipt.controller");

// 🏛️ ADMIN: Payment report
router.get(
  "/report",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getCollegePaymentReport,
);

// 🏛️ ADMIN: Get payment overdue stats with escalation levels (FIX: Issue #10)
router.get(
  "/overdue-stats",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getPaymentOverdueStats,
);

// 🏛️ ADMIN: Manually trigger payment reminders (FIX: Issue #10)
router.post(
  "/trigger-reminders",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  triggerPaymentReminders,
);

// 🏛️ ADMIN: Get payment reconciliation report (FIX: Edge Case 4)
router.get(
  "/reconciliation-report",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  async (req, res, next) => {
    try {
      const report = await getReconciliationReport();
      res.json({ success: true, ...report });
    } catch (error) {
      next(error);
    }
  },
);

// 🏛️ ADMIN: Reconcile stuck payment (FIX: Edge Case 4)
router.post(
  "/reconcile",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  async (req, res, next) => {
    try {
      const { feeId, installmentIndex, action, notes } = req.body;
      const result = await reconcilePayment(
        feeId,
        installmentIndex,
        action,
        notes,
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },
);

// 🧾 ADMIN: Get student payment receipt
router.get(
  "/receipt/:installmentId",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getAdminReceipt,
);

module.exports = router;
