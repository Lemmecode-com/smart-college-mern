const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateGeneralSettingsUpdate,
} = require("../middlewares/validators/generalSettings.validator");
const {
  getGeneralSettings,
  updateGeneralSettings,
} = require("../controllers/generalSettings.controller");

router.use(auth);

router.get(
  "/",
  collegeMiddleware,
  role("COLLEGE_ADMIN"),
  asyncHandler(getGeneralSettings),
);

router.put(
  "/",
  collegeMiddleware,
  role("COLLEGE_ADMIN"),
  validateGeneralSettingsUpdate,
  asyncHandler(updateGeneralSettings),
);

module.exports = router;
