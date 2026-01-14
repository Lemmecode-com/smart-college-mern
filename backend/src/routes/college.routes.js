// const express = require("express");
// const router = express.Router();

// const {
//   upsertCollege,
//   getCollege
// } = require("../controllers/college.controller");

// const authMiddleware = require("../middleware/auth.middleware");
// const roleMiddleware = require("../middleware/role.middleware");

// // 🔐 Only Admin / CollegeAdmin
// router.post(
//   "/",
//   authMiddleware,
//   roleMiddleware("admin", "collegeAdmin"),
//   upsertCollege
// );

// // 🔓 Any logged-in user
// router.get(
//   "/",
//   authMiddleware,
//   getCollege
// );

// module.exports = router;


const express = require("express");
const router = express.Router();

const {
  upsertCollege,
  getCollege
} = require("../controllers/college.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

// 🔐 Only Admin / CollegeAdmin
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "collegeAdmin"),
  upsertCollege
);

// 🔓 Any logged-in user
router.get(
  "/",
  authMiddleware,
  getCollege
);

module.exports = router;
