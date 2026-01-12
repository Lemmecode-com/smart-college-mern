const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { getTeachers } = require("../controllers/user.controller");

router.get(
  "/teachers",
  authMiddleware,
  roleMiddleware("admin"),
  getTeachers
);

module.exports = router;
