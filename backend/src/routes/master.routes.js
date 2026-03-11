const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const upload = require("../config/multer");

const {
  createCollege,
  getAllColleges,
  getCollegeById,
  deleteCollege,
  restoreCollege,
  hardDeleteCollege,
  sendEmailToCollegeAdmin
} = require("../controllers/master.controller");

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

// 🔴 SOFT DELETE: Deactivate college with cascade (RECOMMENDED)
router.delete(
  "/:collegeId",
  auth,
  role("SUPER_ADMIN"),
  deleteCollege
);

// 🟢 RESTORE: Reactivate college with cascade
router.patch(
  "/:collegeId/restore",
  auth,
  role("SUPER_ADMIN"),
  restoreCollege
);

// ⚠️ HARD DELETE: Permanent deletion (requires confirmation)
router.post(
  "/:collegeId/hard-delete",
  auth,
  role("SUPER_ADMIN"),
  hardDeleteCollege
);

// 📧 SEND EMAIL TO COLLEGE ADMIN
router.post(
  "/:collegeId/send-email",
  auth,
  role("SUPER_ADMIN"),
  sendEmailToCollegeAdmin
);


module.exports = router;