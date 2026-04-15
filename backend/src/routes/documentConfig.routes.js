const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getDocumentConfig,
  getDocumentConfigForAdmin,
  upsertDocumentConfig,
  resetToEmpty,
  validateDocuments
} = require("../controllers/documentConfig.controller");

// ================= PUBLIC ROUTES =================

// Get document config for a college (used during student registration)
router.get("/:collegeCode", getDocumentConfig);

// Validate documents before submission
router.post("/validate", validateDocuments);

// ================= COLLEGE ADMIN ROUTES =================

// Get document config for logged-in college admin
router.get(
  "/admin/college",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  getDocumentConfigForAdmin
);  

// Create or update document configuration
router.put(
  "/admin/college",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  upsertDocumentConfig
);

// Reset to empty configuration (remove all documents)
router.post(
  "/admin/college/reset",
  auth,
  role("COLLEGE_ADMIN"),
  collegeMiddleware,
  resetToEmpty
);

module.exports = router;