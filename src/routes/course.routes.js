const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/course.controller");

// Admin only
router.post("/", auth, role("admin"), ctrl.createCourse);

// Any authenticated user
router.get("/", auth, ctrl.getCourses);
router.get("/:id", auth, ctrl.getCourseById);

module.exports = router;