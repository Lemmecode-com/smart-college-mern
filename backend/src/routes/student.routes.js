const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const { registerStudent, getMyFullProfile, updateMyProfile, updateStudentByAdmin, deleteStudent } = require("../controllers/student.controller");
const {
  approveStudent,
  rejectStudent
} = require("../controllers/studentApproval.controller");
const studentMiddleware = require("../middlewares/student.middleware");

// 🌍 PUBLIC STUDENT REGISTRATION
router.post("/register/:collegeCode", registerStudent);

// 🔐 COLLEGE ADMIN → APPROVAL WORKFLOW
router.put(
  "/:studentId/approve",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  approveStudent
);

router.put(
  "/:studentId/reject",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  rejectStudent
);


// 🎓 GET STUDENT'S FULL PROFILE (COLLEGE + FEES + ATTENDANCE)
router.get(
  "/my-profile",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getMyFullProfile
);


// 🎓 STUDENT: Update own profile
router.put(
  "/update-my-profile",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  updateMyProfile
);


// 🏛️ ADMIN: Update student
router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateStudentByAdmin
);


// 🏛️ ADMIN: Delete student
router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteStudent
);


module.exports = router;
