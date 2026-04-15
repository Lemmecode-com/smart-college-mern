const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

exports.generateCollegeQR = async (collegeCode) => {
  const baseUrl = process.env.FRONTEND_URL;
  if (!baseUrl) {
    throw new Error(
      "FRONTEND_URL environment variable is required for QR code generation",
    );
  }
  const registrationUrl = `${baseUrl}/register/${collegeCode}`;

  const qrDir = path.join(__dirname, "../../uploads/college-qrs");

  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const qrFilePath = path.join(qrDir, `${collegeCode}.png`);

  await QRCode.toFile(qrFilePath, registrationUrl);

  return {
    registrationUrl,
    registrationQr: `uploads/college-qrs/${collegeCode}.png`,
  };
};
