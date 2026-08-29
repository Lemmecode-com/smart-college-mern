const QRCode = require("qrcode");
const path = require("path");
const { getStorageProvider } = require("../services/storage");
const DocumentService = require("../services/document.service");

exports.generateCollegeQR = async (collegeCode, collegeId = null) => {
  const baseUrl = process.env.FRONTEND_URL;
  if (!baseUrl) {
    throw new Error(
      "FRONTEND_URL environment variable is required for QR code generation",
    );
  }
  const registrationUrl = `${baseUrl}/register/${collegeCode}`;

  const qrBuffer = await QRCode.toBuffer(registrationUrl);

  const storageService = getStorageProvider().getAdapter();
  const uploadResult = await storageService.uploadFile(
    qrBuffer,
    `${collegeCode}.png`,
    "college-qr",
    {
      originalName: `${collegeCode}.png`,
      mimetype: "image/png",
      size: qrBuffer.length,
    }
  );

  let qrDocumentId = null;
  if (collegeId) {
    try {
      const doc = await DocumentService.createDocument({
        ownerType: "College",
        ownerId: collegeId,
        documentType: "registration_qr",
        fileBuffer: qrBuffer,
        originalFileName: `${collegeCode}.png`,
        mimeType: "image/png",
        size: qrBuffer.length,
        uploadedBy: null,
        category: "college-qr",
        storageKey: uploadResult.storagePath,
      });
      qrDocumentId = doc.documentId;
    } catch (error) {
      console.error("Failed to create QR Document record:", error.message);
    }
  }

  return {
    registrationUrl,
    registrationQr: uploadResult.storagePath,
    qrDocumentId,
  };
};
