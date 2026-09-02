const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");

const {
  getDocument,
  getDocumentDownload,
  updateDocument,
  deleteDocument,
  listDocuments,
  uploadDocumentCtrl,
} = require("../controllers/document.controller");

const { uploadDocument } = require("../middlewares/upload.middleware");

router.get(
  "/:documentId",
  auth,
  collegeMiddleware,
  getDocument,
);

router.get(
  "/:documentId/download",
  auth,
  collegeMiddleware,
  getDocumentDownload,
);

router.post(
  "/upload",
  auth,
  collegeMiddleware,
  uploadDocument,
  uploadDocumentCtrl,
);

router.put(
  "/:documentId",
  auth,
  collegeMiddleware,
  uploadDocument,
  updateDocument,
);

router.delete(
  "/:documentId",
  auth,
  collegeMiddleware,
  deleteDocument,
);

router.get(
  "/",
  auth,
  collegeMiddleware,
  listDocuments,
);

module.exports = router;
