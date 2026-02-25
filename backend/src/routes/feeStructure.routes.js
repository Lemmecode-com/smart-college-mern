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

// CREATE
router.post(
  "/",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  createFeeStructure
);

// GET ALL
router.get(
  "/",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getFeeStructures
);

// ✅ GET BY ID (FIX)
router.get(
  "/:feeStructureId",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getFeeStructureById
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