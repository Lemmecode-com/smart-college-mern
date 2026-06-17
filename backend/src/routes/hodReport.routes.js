const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const hodMiddleware = require("../middlewares/hod.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const { getHodReportsOverview } = require("../controllers/hodReport.controller");

router.use(auth, role(ROLE.TEACHER, ROLE.HOD), hodMiddleware, collegeMiddleware);

router.get("/overview", getHodReportsOverview);

module.exports = router;
