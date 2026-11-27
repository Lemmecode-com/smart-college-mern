const express = require("express");
const router = express.Router();
const {
  getReuploadDocumentInfo,
  submitReuploadDocument,
} = require("../controllers/publicDocument.controller");
const { uploadDocument } = require("../middlewares/upload.middleware");
const { documentReuploadLimiter } = require("../middlewares/rateLimit.middleware");

// 🌍 PUBLIC: View document rejection details by secure token (Rate-limited)
router.get("/reupload/:token", documentReuploadLimiter, getReuploadDocumentInfo);

// 🌍 PUBLIC: Submit replacement document by secure token (Rate-limited BEFORE multer parser)
router.post(
  "/reupload/:token",
  documentReuploadLimiter,
  uploadDocument,
  submitReuploadDocument
);

module.exports = router;
