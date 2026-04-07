const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const {
  validateStudentRegistration,
  validateStudentUpdateByAdmin,
  validateStudentProfileUpdate,
  validateStudentId,
  validateCollegeCode,
} = require("../middlewares/validators/student.validator");

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
  getStudentsForTeacher,
  moveToAlumni,
  getAlumni,
} = require("../controllers/student.controller");
const {
  approveStudent,
  rejectStudent,
  bulkApproveStudents,
} = require("../controllers/studentApproval.controller");
const studentMiddleware = require("../middlewares/student.middleware");
const { uploadStudentDocuments } = require("../middlewares/upload.middleware");

// 🌍 PUBLIC STUDENT REGISTRATION
router.post(
  "/register/:collegeCode",
  validateCollegeCode,
  uploadStudentDocuments,
  validateStudentRegistration,
  registerStudent,
);

// 🔐 COLLEGE ADMIN → LIST REGISTERED STUDENTS
router.get(
  "/registered",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getRegisteredStudents,
);

// 🔐 COLLEGE ADMIN → APPROVAL WORKFLOW
router.put(
  "/:studentId/approve",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  validateStudentId,
  approveStudent,
);

router.put(
  "/:studentId/reject",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  validateStudentId,
  rejectStudent,
);

// 🔐 COLLEGE ADMIN → BULK APPROVE STUDENTS
router.post(
  "/bulk-approve",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  bulkApproveStudents,
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
  validateStudentProfileUpdate,
  updateMyProfile,
);

// 🏛️ ADMIN: Update student
router.put(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  validateStudentId,
  validateStudentUpdateByAdmin,
  updateStudentByAdmin,
);

// 🏛️ ADMIN: Delete student
router.delete(
  "/:id",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  validateStudentId,
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

// TEACHER: Get students for the logged-in teacher
router.get(
  "/teacher",
  auth,
  role("TEACHER"),
  collegeMiddleware,
  getStudentsForTeacher,
);

// 🎓 ADMIN: Move student to Alumni (for students who completed course)
router.post(
  "/:studentId/to-alumni",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  moveToAlumni,
);

// 🎓 ADMIN: Get all Alumni
router.get(
  "/alumni",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getAlumni,
);

module.exports = router;
