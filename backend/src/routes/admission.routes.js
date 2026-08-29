const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const admissionController = require("../controllers/admission.controller");

// All admission officer routes
router.use(auth, role(ROLE.ADMISSION_OFFICER), collegeMiddleware);

// Dashboard
router.get("/dashboard", admissionController.getDashboard);

module.exports = router;
