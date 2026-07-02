const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");

const {
  getPromotionPolicy,
  updatePromotionPolicy,
} = require("../controllers/promotionPolicy.controller");

router.use(auth);
router.use(role(ROLE.COLLEGE_ADMIN, ROLE.ADMISSION_OFFICER));
router.use(collegeMiddleware);

router.get("/", getPromotionPolicy);
router.put("/", updatePromotionPolicy);

module.exports = router;
