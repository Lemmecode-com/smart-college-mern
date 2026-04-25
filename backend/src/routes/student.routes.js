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
  getDeactivatedStudents,
} = require("../controllers/student.controller");
const {
  approveStudent,
  rejectStudent,
  bulkApproveStudents,
} = require("../controllers/studentApproval.controller");
const studentMiddleware = require("../middlewares/student.middleware");
const { uploadStudentDocuments } = require("../middlewares/upload.middleware");
const { ROLE } = require("../utils/constants");

// 🌍 PUBLIC STUDENT REGISTRATION
router.post(
  "/register/:collegeCode",
  validateCollegeCode,
  uploadStudentDocuments,
  validateStudentRegistration,
  registerStudent,
);

// 🔐 COLLEGE ADMIN / ADMISSION_OFFICER / PRINCIPAL → LIST REGISTERED STUDENTS (PENDING)
router.get(
  "/registered",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER, ROLE.PRINCIPAL),
  collegeMiddleware,
  getRegisteredStudents,
);

// 🔐 COLLEGE ADMIN / ADMISSION_OFFICER → APPROVAL WORKFLOW
router.put(
  "/:studentId/approve",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER),
  collegeMiddleware,
  validateStudentId,
  approveStudent,
);

router.put(
  "/:studentId/reject",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER),
  collegeMiddleware,
  validateStudentId,
  rejectStudent,
);

// 🔐 COLLEGE ADMIN / ADMISSION_OFFICER → BULK APPROVE STUDENTS
router.post(
  "/bulk-approve",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER),
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

// 🔒 SECURE DOCUMENT ACCESS (prevents cross-student access)
const { getStudentDocument } = require("../controllers/student.controller");
router.get("/documents/:filename", auth, getStudentDocument);

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

//ADMIN / PRINCIPAL / EXAM_COORDINATOR: GETS approved students
router.get(
  "/approved-students",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  getApprovedStudents,
);

//ADMIN / PRINCIPAL / EXAM_COORDINATOR: GET individual approved student
router.get(
  "/approved-stud/:id",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL, ROLE.EXAM_COORDINATOR),
  collegeMiddleware,
  getStudentById,
);

//ADMIN / ADMISSION_OFFICER / PRINCIPAL: GETS registered students
router.get(
  "/registered",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER, ROLE.PRINCIPAL),
  collegeMiddleware,
  getRegisteredStudents,
);

//ADMIN / ADMISSION_OFFICER / PRINCIPAL: GET individual registered student
router.get(
  "/registered/:id",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER, ROLE.PRINCIPAL),
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

// 🎓 ADMIN: Move student to Alumni
router.post(
  "/:studentId/to-alumni",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  moveToAlumni,
);

// 🎓 ADMIN/PRINCIPAL: Get all Alumni
router.get(
  "/alumni",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL),
  collegeMiddleware,
  getAlumni,
);

// 🚫 ADMIN/PRINCIPAL: Get deactivated students (for reactivation)
router.get(
  "/deactivated",
  auth,
  role(ROLE.COLLEGE_ADMIN, ROLE.PRINCIPAL),
  collegeMiddleware,
  getDeactivatedStudents,
);

// 🚫 ADMIN: Get deactivated students
router.get(
  "/deactivated",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getDeactivatedStudents,
);

module.exports = router;
