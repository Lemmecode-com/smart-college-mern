const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  assignHOD,
} = require("../controllers/department.controller");

// Apply middlewares to ALL department routes — PRINCIPAL, EXAM_COORDINATOR, ACCOUNTANT read-only, COLLEGE_ADMIN write
router.use(auth, role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR, ROLE.ACCOUNTANT), collegeMiddleware);

// Create Department — COLLEGE_ADMIN only
router.post("/", role(ROLE.COLLEGE_ADMIN), createDepartment);

// Get All Departments (college-wise)
router.get("/", getDepartments);

// Get Single Department
router.get("/:id", getDepartmentById);

// Update Department — COLLEGE_ADMIN only
router.put("/:id", role(ROLE.COLLEGE_ADMIN), updateDepartment);

// Delete Department — COLLEGE_ADMIN only
router.delete("/:id", role(ROLE.COLLEGE_ADMIN), deleteDepartment);

// Assign HOD — COLLEGE_ADMIN only
router.put("/:id/assign-hod", role(ROLE.COLLEGE_ADMIN), assignHOD);

module.exports = router;