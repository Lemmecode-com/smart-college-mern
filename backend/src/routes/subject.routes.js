const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const {
  createSubject,
  getSubjectsByCourse,
  updateSubject,
  getSubjectById,
  deleteSubject
} = require("../controllers/subject.controller");

router.post("/", auth, role(ROLE.COLLEGE_ADMIN), collegeMiddleware, createSubject);
router.get(
  "/course/:courseId",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  getSubjectsByCourse
);
router.put("/:id", auth, role(ROLE.COLLEGE_ADMIN), collegeMiddleware, updateSubject);
router.delete("/:id", auth, role(ROLE.COLLEGE_ADMIN), collegeMiddleware, deleteSubject);
router.get(
  "/:id",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.TEACHER, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  getSubjectById
);

module.exports = router;
