const express = require("express");
const router = express.Router();

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} = require("../controllers/department.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 🔐 Admin / CollegeAdmin only
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  createDepartment
);

// 🔓 Any logged-in user can view
router.get(
  "/",
  authMiddleware,
  getDepartments
);

router.get(
  "/:id",
  authMiddleware,
  getDepartmentById
);

// 🔐 Admin / CollegeAdmin only
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  updateDepartment
);

// 🔐 Admin / CollegeAdmin only (soft delete)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  deleteDepartment
);

module.exports = router;
