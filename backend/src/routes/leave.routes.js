const express = require("express");
const router = express.Router();
const {
  ROLE,
} = require("../utils/constants");
const auth = require("../middlewares/auth.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const role = require("../middlewares/role.middleware");
const leaveController = require("../controllers/leave.controller");
const leaveMiddleware = require("../middlewares/leave.middleware");

// Teacher: apply for leave
router.post(
  "/",
  auth,
  role(ROLE.TEACHER),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.applyLeave,
);

// Teacher: my leave history
router.get(
  "/my",
  auth,
  role(ROLE.TEACHER),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.getMyLeaves,
);

// Teacher: quota summary
router.get(
  "/summary/quota",
  auth,
  role(ROLE.TEACHER),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.getQuotaSummary,
);

// HOD: pending approvals
router.get(
  "/pending",
  auth,
  role(ROLE.HOD),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.getPendingLeaves,
);

// HOD: approval/rejection history
router.get(
  "/history",
  auth,
  role(ROLE.HOD),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.getLeaveHistory,
);

// HOD: approve leave
router.put(
  "/:leaveId/approve",
  auth,
  role(ROLE.HOD),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.approveLeave,
);

// HOD: reject leave
router.put(
  "/:leaveId/reject",
  auth,
  role(ROLE.HOD),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.rejectLeave,
);

// Teacher: cancel own pending leave
router.put(
  "/:leaveId/cancel",
  auth,
  role(ROLE.TEACHER),
  collegeMiddleware,
  leaveMiddleware,
  leaveController.cancelLeave,
);

module.exports = router;
