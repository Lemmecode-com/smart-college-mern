const express = require("express");
const router = express.Router();

const {
  createSubject,
  getSubjects,
  deleteSubject
} = require("../controllers/subject.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 🔐 Admin / CollegeAdmin
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  createSubject
);

// 🔓 Any logged-in user
router.get(
  "/",
  authMiddleware,
  getSubjects
);

// 🔐 Admin / CollegeAdmin
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  deleteSubject
);

module.exports = router;
