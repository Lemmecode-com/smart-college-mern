const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const upload = require("../config/multer");

const { createCollege, getAllColleges, getCollegeById } = require("../controllers/master.controller");

/* create college super admin only */
router.post(
  "/create/college",
  auth,
  role("SUPER_ADMIN"),
  upload.single("logo"),
  createCollege
);

// view all colleges ONLY SUPER ADMIN
router.get(
  "/get/colleges",
  auth,
  role("SUPER_ADMIN"),
  getAllColleges
);

// view a single colleges ONLY SUPER ADMIN
router.get(
  "/:collegeId",
  auth,
  role("SUPER_ADMIN"),
  getCollegeById
);


module.exports = router;
