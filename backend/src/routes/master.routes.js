const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const upload = require("../config/multer");

const { createCollege } = require("../controllers/master.controller");

/* create college */
router.post(
  "/colleges",
  auth,
  role("SUPER_ADMIN"),
  upload.single("logo"),
  createCollege
);

// view all colleges ONLY SUPER ADMIN
router.get(
  "/colleges",
  auth,
  role("SUPER_ADMIN"),
  getAllColleges
);


module.exports = router;
