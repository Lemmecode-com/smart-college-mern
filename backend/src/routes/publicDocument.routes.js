const express = require("express");
const router = express.Router();
const {
  getReuploadDocumentInfo,
  submitReuploadDocument,
} = require("../controllers/publicDocument.controller");
const { uploadDocument } = require("../middlewares/upload.middleware");

// 🌍 PUBLIC: View document rejection details by secure token
router.get("/reupload/:token", getReuploadDocumentInfo);

// 🌍 PUBLIC: Submit replacement document by secure token
router.post("/reupload/:token", uploadDocument, submitReuploadDocument);

module.exports = router;
