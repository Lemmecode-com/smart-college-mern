const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getCollegePaymentReport,
  getPaymentOverdueStats,
  triggerPaymentReminders,
  markInstallmentAsPaid,
} = require("../controllers/admin.payment.controller");

const {
  getReconciliationReport,
  reconcilePayment,
} = require("../cron/paymentReconciliation.cron");

const { getAdminReceipt } = require("../controllers/admin.receipt.controller");

const { ROLE } = require("../utils/constants");

// 🏛️ ADMIN/ACCOUNTANT/PRINCIPAL: Payment report
router.get(
  "/report",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT, ROLE.PRINCIPAL),
  collegeMiddleware,
  getCollegePaymentReport,
);

// 🏛️ ADMIN/ACCOUNTANT/PRINCIPAL: Get payment overdue stats
router.get(
  "/overdue-stats",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT, ROLE.PRINCIPAL),
  collegeMiddleware,
  getPaymentOverdueStats,
);

// 🏛️ ADMIN/ACCOUNTANT: Trigger payment reminders (write) — no PRINCIPAL
router.post(
  "/trigger-reminders",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  triggerPaymentReminders,
);

// 🏛️ ADMIN/ACCOUNTANT: Get payment reconciliation report
router.get(
  "/reconciliation-report",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
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

// 🏛️ ADMIN/ACCOUNTANT: Reconcile stuck payment
router.post(
  "/reconcile",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  async (req, res, next) => {
    try {
      const { feeId, installmentIndex, action, notes } = req.body;
      const result = await reconcilePayment(
        feeId,
        installmentIndex,
        action,
        notes
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },
);

// 🧾 ADMIN/ACCOUNTANT/PRINCIPAL: Get student payment receipt
router.get(
  "/receipt/:installmentId",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT, ROLE.PRINCIPAL),
  collegeMiddleware,
  getAdminReceipt,
);

// 🏦 ADMIN/ACCOUNTANT: Mark installment as PAID for offline payments
router.post(
  "/mark-paid",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  markInstallmentAsPaid,
);

// 🏛️ ADMIN/ACCOUNTANT: Get payment overdue stats
router.get(
  "/overdue-stats",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  getPaymentOverdueStats,
);

// 🏛️ ADMIN/ACCOUNTANT: Trigger payment reminders
router.post(
  "/trigger-reminders",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  triggerPaymentReminders,
);

// 🏛️ ADMIN/ACCOUNTANT: Get payment reconciliation report
router.get(
  "/reconciliation-report",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
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

// 🏛️ ADMIN/ACCOUNTANT: Reconcile stuck payment
router.post(
  "/reconcile",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  async (req, res, next) => {
    try {
      const { feeId, installmentIndex, action, notes } = req.body;
      const result = await reconcilePayment(
        feeId,
        installmentIndex,
        action,
        notes
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },
);

// 🧾 ADMIN/ACCOUNTANT: Get student payment receipt
router.get(
  "/receipt/:installmentId",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  getAdminReceipt,
);

// 🏦 ADMIN/ACCOUNTANT: Mark installment as PAID for offline payments
router.post(
  "/mark-paid",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  markInstallmentAsPaid,
);

module.exports = router;
