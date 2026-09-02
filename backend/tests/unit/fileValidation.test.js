const {
  normalizeExtension,
  expandAllowedFormats,
  getAllowedMimeTypes,
  validateFileExtension,
  validateMimeType,
  validateFile,
  validateFilesAgainstConfig,
} = require("../../src/utils/fileValidation");

describe("File Validation Utility", () => {
  describe("normalizeExtension", () => {
    it("should lowercase and strip leading dot", () => {
      expect(normalizeExtension(".JPG")).toBe("jpg");
      expect(normalizeExtension(".JPEG")).toBe("jpeg");
      expect(normalizeExtension("PDF")).toBe("pdf");
      expect(normalizeExtension(".pdf")).toBe("pdf");
      expect(normalizeExtension("")).toBe("");
      expect(normalizeExtension(null)).toBe("");
    });
  });

  describe("expandAllowedFormats", () => {
    it("should expand jpg to include jpeg", () => {
      const result = expandAllowedFormats(["pdf", "jpg"]);
      expect(result).toContain("jpg");
      expect(result).toContain("jpeg");
      expect(result).toContain("pdf");
    });

    it("should expand jpeg to include jpg", () => {
      const result = expandAllowedFormats(["pdf", "jpeg"]);
      expect(result).toContain("jpg");
      expect(result).toContain("jpeg");
      expect(result).toContain("pdf");
    });

    it("should not duplicate jpg/jpeg when both are present", () => {
      const result = expandAllowedFormats(["pdf", "jpg", "jpeg"]);
      expect(result.filter((f) => f === "jpg")).toHaveLength(1);
      expect(result.filter((f) => f === "jpeg")).toHaveLength(1);
    });

    it("should not add jpg/jpeg when neither is present", () => {
      const result = expandAllowedFormats(["pdf", "png"]);
      expect(result).not.toContain("jpg");
      expect(result).not.toContain("jpeg");
      expect(result).toContain("pdf");
      expect(result).toContain("png");
    });

    it("should handle empty array", () => {
      expect(expandAllowedFormats([])).toEqual([]);
    });

    it("should handle non-array input", () => {
      expect(expandAllowedFormats(null)).toEqual([]);
      expect(expandAllowedFormats(undefined)).toEqual([]);
    });
  });

  describe("getAllowedMimeTypes", () => {
    it("should return image/jpeg for jpg format", () => {
      const mimes = getAllowedMimeTypes(["jpg"]);
      expect(mimes).toContain("image/jpeg");
    });

    it("should return image/jpeg for jpeg format", () => {
      const mimes = getAllowedMimeTypes(["jpeg"]);
      expect(mimes).toContain("image/jpeg");
    });

    it("should return application/pdf for pdf format", () => {
      const mimes = getAllowedMimeTypes(["pdf"]);
      expect(mimes).toContain("application/pdf");
    });

    it("should return image/png for png format", () => {
      const mimes = getAllowedMimeTypes(["png"]);
      expect(mimes).toContain("image/png");
    });
  });

  describe("validateFileExtension", () => {
    it("should accept .jpg when jpg is configured", () => {
      const result = validateFileExtension("photo.jpg", ["pdf", "jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept .jpeg when jpg is configured (equivalence)", () => {
      const result = validateFileExtension("photo.jpeg", ["pdf", "jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept .jpg when jpeg is configured (equivalence)", () => {
      const result = validateFileExtension("photo.jpg", ["pdf", "jpeg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept .jpeg when jpeg is configured", () => {
      const result = validateFileExtension("photo.jpeg", ["pdf", "jpeg"]);
      expect(result.valid).toBe(true);
    });

    it("should reject .png when only pdf and jpg are configured", () => {
      const result = validateFileExtension("image.png", ["pdf", "jpg"]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should reject .doc when only pdf and jpg are configured", () => {
      const result = validateFileExtension("file.doc", ["pdf", "jpg"]);
      expect(result.valid).toBe(false);
    });

    it("should normalize uppercase extensions", () => {
      const result = validateFileExtension("photo.JPG", ["pdf", "jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should reject files with no extension", () => {
      const result = validateFileExtension("noextension", ["pdf", "jpg"]);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateMimeType", () => {
    it("should accept image/jpeg for jpg format", () => {
      const result = validateMimeType("image/jpeg", ["jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept image/jpeg for jpeg format", () => {
      const result = validateMimeType("image/jpeg", ["jpeg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept image/jpg for jpg format", () => {
      const result = validateMimeType("image/jpg", ["jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should reject image/png when only jpg is configured", () => {
      const result = validateMimeType("image/png", ["jpg"]);
      expect(result.valid).toBe(false);
    });

    it("should reject application/pdf when only jpg is configured", () => {
      const result = validateMimeType("application/pdf", ["jpg"]);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateFile", () => {
    it("should accept report.pdf when pdf is configured", () => {
      const result = validateFile("report.pdf", "application/pdf", ["pdf", "jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept marksheet.jpg when jpg is configured", () => {
      const result = validateFile("marksheet.jpg", "image/jpeg", ["pdf", "jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept marksheet.jpeg when jpg is configured (equivalence)", () => {
      const result = validateFile("marksheet.jpeg", "image/jpeg", ["pdf", "jpg"]);
      expect(result.valid).toBe(true);
    });

    it("should accept marksheet.jpg when jpeg is configured (equivalence)", () => {
      const result = validateFile("marksheet.jpg", "image/jpeg", ["pdf", "jpeg"]);
      expect(result.valid).toBe(true);
    });

    it("should reject image.png when only pdf and jpg are configured", () => {
      const result = validateFile("image.png", "image/png", ["pdf", "jpg"]);
      expect(result.valid).toBe(false);
    });

    it("should reject file.doc when only pdf and jpg are configured", () => {
      const result = validateFile("file.doc", "application/msword", ["pdf", "jpg"]);
      expect(result.valid).toBe(false);
    });

    it("should reject file with valid extension but wrong MIME type", () => {
      const result = validateFile("report.pdf", "image/jpeg", ["pdf"]);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateFilesAgainstConfig", () => {
    const documentFieldMap = {
      "10th_marksheet": "sscMarksheet",
      "12th_marksheet": "hscMarksheet",
      passport_photo: "passportPhoto",
      category_certificate: "categoryCertificate",
      income_certificate: "incomeCertificate",
      character_certificate: "characterCertificate",
      transfer_certificate: "transferCertificate",
      aadhar_card: "aadharCard",
      physically_challenged_certificate: "physicallyChallengedCertificate",
    };

    const docConfigs = [
      {
        type: "10th_marksheet",
        label: "10th Marksheet",
        enabled: true,
        allowedFormats: ["pdf", "jpg"],
        maxFileSize: 5,
      },
      {
        type: "passport_photo",
        label: "Passport Photo",
        enabled: true,
        allowedFormats: ["jpg", "jpeg", "png"],
        maxFileSize: 2,
      },
    ];

    it("should accept .jpg when jpg is configured", () => {
      const files = [
        { fieldname: "sscMarksheet", originalname: "marksheet.jpg", mimetype: "image/jpeg" },
      ];
      const result = validateFilesAgainstConfig(files, docConfigs, documentFieldMap);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept .jpeg when jpg is configured (equivalence)", () => {
      const files = [
        { fieldname: "sscMarksheet", originalname: "marksheet.jpeg", mimetype: "image/jpeg" },
      ];
      const result = validateFilesAgainstConfig(files, docConfigs, documentFieldMap);
      expect(result.valid).toBe(true);
    });

    it("should accept .jpg when jpeg is configured (equivalence)", () => {
      const files = [
        { fieldname: "passportPhoto", originalname: "photo.jpg", mimetype: "image/jpeg" },
      ];
      const result = validateFilesAgainstConfig(files, docConfigs, documentFieldMap);
      expect(result.valid).toBe(true);
    });

    it("should reject .png when only jpg is configured for 10th_marksheet", () => {
      const files = [
        { fieldname: "sscMarksheet", originalname: "marksheet.png", mimetype: "image/png" },
      ];
      const result = validateFilesAgainstConfig(files, docConfigs, documentFieldMap);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("sscMarksheet");
    });

    it("should reject .doc when only jpg and pdf are configured", () => {
      const files = [
        { fieldname: "sscMarksheet", originalname: "marksheet.doc", mimetype: "application/msword" },
      ];
      const result = validateFilesAgainstConfig(files, docConfigs, documentFieldMap);
      expect(result.valid).toBe(false);
    });

    it("should reject mismatched extension and MIME type", () => {
      const files = [
        { fieldname: "sscMarksheet", originalname: "marksheet.pdf", mimetype: "image/jpeg" },
      ];
      const result = validateFilesAgainstConfig(files, docConfigs, documentFieldMap);
      expect(result.valid).toBe(false);
    });

    it("should allow files with no matching config (backward compatibility)", () => {
      const files = [
        { fieldname: "unknownField", originalname: "file.pdf", mimetype: "application/pdf" },
      ];
      const result = validateFilesAgainstConfig(files, docConfigs, documentFieldMap);
      expect(result.valid).toBe(true);
    });

    it("should handle empty file list", () => {
      const result = validateFilesAgainstConfig([], docConfigs, documentFieldMap);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
