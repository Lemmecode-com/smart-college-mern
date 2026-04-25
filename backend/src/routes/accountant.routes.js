const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const accountantController = require("../controllers/accountant.controller");

// All accountant routes require authentication and ACCOUNTANT role
router.use(auth, role(ROLE.ACCOUNTANT), collegeMiddleware);

// Dashboard
router.get("/dashboard", accountantController.getDashboard);

module.exports = router;
