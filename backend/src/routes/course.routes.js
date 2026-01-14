// const express = require("express");
// const router = express.Router();

// const {
//   createCourse,
//   getCourses,
//   updateCourse,
//   deleteCourse
// } = require("../controllers/course.controller");

// const auth = require("../middleware/auth.middleware");
// const authorize = require("../middleware/role.middleware");
// const authMiddleware = require("../middleware/auth.middleware");
// const roleMiddleware = require("../middleware/role.middleware");

// // 🔐 Admin / CollegeAdmin
// router.post(
//   "/",
//   authMiddleware,
//   roleMiddleware("admin", "collegeAdmin"),
//   createCourse
// );

// // 🔓 Any logged-in user
// router.get(
//   "/",
//   authMiddleware,
//   getCourses
// );

// // 🔐 Admin / CollegeAdmin
// router.put(
//   "/:id",
//   authMiddleware,
//   roleMiddleware("admin", "collegeAdmin"),
//   updateCourse
// );

// // 🔐 Admin / CollegeAdmin
// router.delete(
//   "/:id",
//   authMiddleware,
//   roleMiddleware("admin", "collegeAdmin"),
//   deleteCourse
// );


// // Teacher only
// router.get(
//   "/my",
//   authMiddleware,
//   roleMiddleware("teacher"),
//   getMyCourses
// );


// module.exports = router;





const express = require("express");
const router = express.Router();

const {
  createCourse,
  getCourses,
  updateCourse,
  deleteCourse
} = require("../controllers/course.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 🔐 Admin / CollegeAdmin
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  createCourse
);

// 🔓 Any logged-in user
router.get(
  "/",
  authMiddleware,
  getCourses
);

// 🔐 Admin / CollegeAdmin
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  updateCourse
);

// 🔐 Admin / CollegeAdmin
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  deleteCourse
);

module.exports = router;