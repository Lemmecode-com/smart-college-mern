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
  deactivateDepartment,
  reactivateDepartment,
  assignHOD,
  removeHOD,
  reassignHODSubjects,
} = require("../controllers/department.controller");

// Apply middlewares to ALL department routes — TEACHER & HOD read-only, PRINCIPAL/EXAM_COORDINATOR/ACCOUNTANT read-only, COLLEGE_ADMIN full access
router.use(auth, role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.HOD, ROLE.TEACHER, ROLE.EXAM_COORDINATOR, ROLE.ACCOUNTANT), collegeMiddleware);

// Create Department — COLLEGE_ADMIN only
router.post("/", role(ROLE.COLLEGE_ADMIN), createDepartment);

// Get All Departments (college-wise)
router.get("/", getDepartments);

// Get Single Department
router.get("/:id", getDepartmentById);

// Update Department — COLLEGE_ADMIN only
router.put("/:id", role(ROLE.COLLEGE_ADMIN), updateDepartment);

// Delete Department — COLLEGE_ADMIN only (kept for API compatibility, not exposed in Department List UI)
router.delete("/:id", role(ROLE.COLLEGE_ADMIN), deleteDepartment);

// Deactivate Department — COLLEGE_ADMIN only
router.put("/:id/deactivate", role(ROLE.COLLEGE_ADMIN), deactivateDepartment);

// Reactivate Department — COLLEGE_ADMIN only
router.put("/:id/reactivate", role(ROLE.COLLEGE_ADMIN), reactivateDepartment);

// Assign HOD — COLLEGE_ADMIN only
router.put("/:id/assign-hod", role(ROLE.COLLEGE_ADMIN), assignHOD);

// Remove HOD — COLLEGE_ADMIN only
router.delete("/:id/hod", role(ROLE.COLLEGE_ADMIN), removeHOD);

// Reassign HOD Subjects (before removal) — COLLEGE_ADMIN only
router.put("/:id/hod/reassign-subjects", role(ROLE.COLLEGE_ADMIN), reassignHODSubjects);

module.exports = router;