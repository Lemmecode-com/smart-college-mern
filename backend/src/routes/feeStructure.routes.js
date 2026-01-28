const express = require("express");
const router = express.Router();

const {
  createFeeStructure,
  getFeeStructures,
  deleteFeeStructure,
  updateFeeStructure
} = require("../controllers/feeStructure.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

// 🔐 COLLEGE ADMIN ONLY
router.post(
  "/",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  createFeeStructure
);

router.get(
  "/",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getFeeStructures
);

// UPDATE
router.put(
  "/:feeStructureId",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateFeeStructure
);

// DELETE
router.delete(
  "/:feeStructureId",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteFeeStructure
);

module.exports = router;
