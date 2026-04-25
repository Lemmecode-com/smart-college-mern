const express = require("express");
const router = express.Router();

const {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  deleteFeeStructure,
  updateFeeStructure,
} = require("../controllers/feeStructure.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const { ROLE } = require("../utils/constants");

// CREATE — COLLEGE_ADMIN, ACCOUNTANT
router.post(
  "/",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  createFeeStructure
);

// GET ALL — COLLEGE_ADMIN, ACCOUNTANT, PRINCIPAL
router.get(
  "/",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT, ROLE.PRINCIPAL),
  collegeMiddleware,
  getFeeStructures
);

// GET BY ID — COLLEGE_ADMIN, ACCOUNTANT, PRINCIPAL
router.get(
  "/:feeStructureId",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT, ROLE.PRINCIPAL),
  collegeMiddleware,
  getFeeStructureById
);

// UPDATE — COLLEGE_ADMIN, ACCOUNTANT
router.put(
  "/:feeStructureId",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  updateFeeStructure
);

// DELETE — COLLEGE_ADMIN, ACCOUNTANT
router.delete(
  "/:feeStructureId",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ACCOUNTANT),
  collegeMiddleware,
  deleteFeeStructure
);

module.exports = router;