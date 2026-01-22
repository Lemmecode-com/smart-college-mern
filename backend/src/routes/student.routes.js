const express = require("express");
const router = express.Router();

const {
  registerStudent
} = require("../controllers/student.controller");

// 🌍 PUBLIC STUDENT REGISTRATION
router.post("/register/:collegeCode", registerStudent);

module.exports = router;
