const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  registerStudent,
  getMyFullProfile,
  updateMyProfile,
  updateStudentByAdmin,
  deleteStudent,
  getApprovedStudents,
  getStudentById,
  getRegisteredStudents,
  getRegisteredStudentById,
} = require("../controllers/student.controller");
const {
  approveStudent,
  rejectStudent,
} = require("../controllers/studentApproval.controller");
const studentMiddleware = require("../middlewares/student.middleware");


// 🌍 PUBLIC STUDENT REGISTRATION
router.post("/register/:collegeCode", registerStudent);

// 🔐 COLLEGE ADMIN → LIST REGISTERED STUDENTS
router.get(
  "/registered",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getRegisteredStudents
);

// 🔐 COLLEGE ADMIN → APPROVAL WORKFLOW
router.put(
  "/:studentId/approve",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  approveStudent,
);

router.put(
  "/:studentId/reject",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  rejectStudent,
);

// 🎓 GET STUDENT'S FULL PROFILE (COLLEGE + FEES + ATTENDANCE)
router.get(
  "/my-profile",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  getMyFullProfile,
);

// 🎓 STUDENT: Update own profile
router.put(
  "/update-my-profile",
  auth,
  role("STUDENT"),
  collegeMiddleware,
  studentMiddleware,
  updateMyProfile,
);

// 🏛️ ADMIN: Update student
router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  updateStudentByAdmin,
);

// 🏛️ ADMIN: Delete student
router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  deleteStudent,
);

//ADMIN : GETS approved students
router.get(
  "/approved-students",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getApprovedStudents,
);

//ADMIN : GET individual approved student
router.get(
  "/approved-stud/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getStudentById,
);

//ADMIN : GETS registered students
router.get(
  "/registered",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getRegisteredStudents,
);

//ADMIN : GET individual registered student
router.get(
  "/registered/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getRegisteredStudentById,
);
module.exports = router;
