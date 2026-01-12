const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/student.controller");

// Admin only: create student
router.post("/", auth, role("admin"), ctrl.createStudent);

// Admin & Teacher: view students (secure)
router.get("/", auth, role("admin", "teacher"), ctrl.getStudents);

// Get student by ID
router.get("/:id", auth, ctrl.getStudentById);

module.exports = router;
