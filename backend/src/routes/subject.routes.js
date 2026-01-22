const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  createSubject,
  getSubjectsByCourse,
  updateSubject,
  deleteSubject
} = require("../controllers/subject.controller");

router.use(auth, role("COLLEGE_ADMIN"), collegeMiddleware);

router.post("/", createSubject);
router.get("/course/:courseId", getSubjectsByCourse);
router.put("/:id", updateSubject);
router.delete("/:id", deleteSubject);

module.exports = router;
