const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
  getDepartmentById,
  assignHOD,
} = require("../controllers/department.controller");

// Apply middlewares to ALL department routes
router.use(auth, role("COLLEGE_ADMIN"), collegeMiddleware);

// Create Department
router.post("/", createDepartment);

// Get All Departments (college-wise)
router.get("/", getDepartments);

// Get Single Department
router.get("/:id", getDepartmentById);

// Update Department
router.put("/:id", updateDepartment);

// Delete Department
router.delete("/:id", deleteDepartment);

// Assign HOD
router.put("/:id/assign-hod", assignHOD);

module.exports = router;
