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

router.post("/",auth, role("COLLEGE_ADMIN"), collegeMiddleware, createSubject);
router.get("/course/:courseId",auth, role("COLLEGE_ADMIN", "TEACHER"), collegeMiddleware, getSubjectsByCourse);
router.put("/:id",auth, role("COLLEGE_ADMIN"), collegeMiddleware, updateSubject);
router.delete("/:id",auth, role("COLLEGE_ADMIN"), collegeMiddleware, deleteSubject);

module.exports = router;
