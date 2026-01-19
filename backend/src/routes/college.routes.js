const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const { getMyCollege } = require("../controllers/master.controller");

// 🏫 get single college by ONLY COLLEGE ADMIN
router.get(
  "/me",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getMyCollege
);

module.exports = router;
