
const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/student.controller");

router.post("/", auth, role("admin"), ctrl.createStudent);
router.get("/", auth, ctrl.getStudents);
router.get("/:id", auth, ctrl.getStudentById);
router.put("/:id", auth, role("admin"), ctrl.updateStudent);
router.delete("/:id", auth, role("admin"), ctrl.deleteStudent);

module.exports = router;
