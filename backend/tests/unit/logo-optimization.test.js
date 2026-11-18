const sharp = require("sharp");
const { processCollegeLogo } = require("../../src/utils/logoProcessor");
const DocumentService = require("../../src/services/document.service");
const Document = require("../../src/models/document.model");
const documentController = require("../../src/controllers/document.controller");
const AppError = require("../../src/utils/AppError");

describe("College Logo Optimization & Caching", () => {
  describe("processCollegeLogo", () => {
    it("should resize large image to <= 256x256 and convert to WebP under 100 KB", async () => {
      // Create a 600x600 test PNG
      const testBuffer = await sharp({
        create: {
          width: 600,
          height: 600,
          channels: 4,
          background: { r: 50, g: 100, b: 200, alpha: 0.8 },
        },
      })
        .png()
        .toBuffer();

      const result = await processCollegeLogo(testBuffer, "test-large-logo.png", "image/png");

      expect(result).toBeDefined();
      expect(result.mimeType).toBe("image/webp");
      expect(result.originalName).toBe("test-large-logo.webp");
      expect(result.size).toBeLessThan(100 * 1024); // Under 100 KB
      expect(result.buffer.length).toBe(result.size);

      // Verify dimensions
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBeLessThanOrEqual(256);
      expect(metadata.height).toBeLessThanOrEqual(256);
      expect(metadata.format).toBe("webp");
    });

    it("should reject corrupted or invalid image buffer with 422 error", async () => {
      const corruptBuffer = Buffer.from("this is definitely not a real image");

      await expect(
        processCollegeLogo(corruptBuffer, "bad-logo.png", "image/png")
      ).rejects.toThrow(AppError);

      try {
        await processCollegeLogo(corruptBuffer, "bad-logo.png", "image/png");
      } catch (err) {
        expect(err.statusCode).toBe(422);
      }
    });

    it("should reject invalid mime type with 400 error", async () => {
      const textBuffer = Buffer.from("hello world");

      await expect(
        processCollegeLogo(textBuffer, "document.pdf", "application/pdf")
      ).rejects.toThrow(AppError);

      try {
        await processCollegeLogo(textBuffer, "document.pdf", "application/pdf");
      } catch (err) {
        expect(err.statusCode).toBe(400);
      }
    });
  });

  describe("DocumentService.downloadDocument - duplicate query check", () => {
    it("should reuse pre-fetched document without querying Document.findOne", async () => {
      const mockDoc = {
        documentId: "doc-12345",
        storageKey: "storage-key-123",
        originalFileName: "logo.webp",
        mimeType: "image/webp",
        size: 5000,
      };

      const findOneSpy = jest.spyOn(Document, "findOne");

      // Mock storage provider
      const { StorageProvider } = require("../../src/services/storage");
      const mockStorageAdapter = {
        downloadFile: jest.fn().mockResolvedValue({
          buffer: Buffer.from("fake-file-data"),
        }),
      };
      const getAdapterSpy = jest.spyOn(StorageProvider.prototype, "getAdapter").mockReturnValue(mockStorageAdapter);

      const result = await DocumentService.downloadDocument("doc-12345", mockDoc);

      expect(findOneSpy).not.toHaveBeenCalled();
      expect(mockStorageAdapter.downloadFile).toHaveBeenCalledWith("storage-key-123");
      expect(result.documentId).toBe("doc-12345");
      expect(result.size).toBe(5000);

      findOneSpy.mockRestore();
      getAdapterSpy.mockRestore();
    });
  });

  describe("documentController.getDocument - Cache headers & 304 behavior", () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        params: { documentId: "doc-logo-001" },
        user: { id: "user-123", role: "COLLEGE_ADMIN" },
        headers: {},
      };
      res = {
        headers: {},
        setHeader: jest.fn((k, v) => {
          res.headers[k.toLowerCase()] = v;
        }),
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
        send: jest.fn(),
      };
      next = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should set Cache-Control and ETag for logo documents and return 304 when If-None-Match matches", async () => {
      const mockLogoDoc = {
        documentId: "doc-logo-001",
        ownerType: "College",
        documentType: "logo",
        category: "college-logo",
        checksum: "sha256-abcdef123456",
        size: 25000,
        originalFileName: "college-logo.webp",
        mimeType: "image/webp",
      };

      jest.spyOn(Document, "findOne").mockResolvedValue(mockLogoDoc);
      jest.spyOn(DocumentService, "_isOwner").mockResolvedValue(false);
      jest.spyOn(DocumentService, "_hasAccess").mockResolvedValue(true);
      const downloadSpy = jest.spyOn(DocumentService, "downloadDocument");

      // Client sends matching ETag
      req.headers["if-none-match"] = '"sha256-abcdef123456"';

      await documentController.getDocument(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "private, max-age=86400, stale-while-revalidate=604800"
      );
      expect(res.setHeader).toHaveBeenCalledWith("ETag", '"sha256-abcdef123456"');
      expect(res.status).toHaveBeenCalledWith(304);
      expect(res.end).toHaveBeenCalled();
      // downloadDocument stream is skipped on 304
      expect(downloadSpy).not.toHaveBeenCalled();
    });

    it("should enforce authorization BEFORE returning 304 (never leak 304 to unauthorized user)", async () => {
      const mockLogoDoc = {
        documentId: "doc-logo-001",
        ownerType: "College",
        documentType: "logo",
        category: "college-logo",
        checksum: "sha256-abcdef123456",
      };

      jest.spyOn(Document, "findOne").mockResolvedValue(mockLogoDoc);
      jest.spyOn(DocumentService, "_isOwner").mockResolvedValue(false);
      // Unauthorized user
      jest.spyOn(DocumentService, "_hasAccess").mockResolvedValue(false);

      req.headers["if-none-match"] = '"sha256-abcdef123456"';

      await documentController.getDocument(req, res, next);

      // Must call next with 403 UNAUTHORIZED, NOT 304!
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: "UNAUTHORIZED",
        })
      );
      expect(res.status).not.toHaveBeenCalledWith(304);
    });

    it("should set private, no-store on confidential non-logo documents", async () => {
      const mockStudentDoc = {
        documentId: "doc-student-aadhaar",
        ownerType: "Student",
        documentType: "aadhaar_card",
        category: "student",
        size: 500000,
        originalFileName: "aadhaar.pdf",
        mimeType: "application/pdf",
      };

      jest.spyOn(Document, "findOne").mockResolvedValue(mockStudentDoc);
      jest.spyOn(DocumentService, "_isOwner").mockResolvedValue(true);
      jest.spyOn(DocumentService, "_hasAccess").mockResolvedValue(true);
      jest.spyOn(DocumentService, "downloadDocument").mockResolvedValue({
        buffer: Buffer.from("pdf-data"),
        originalName: "aadhaar.pdf",
        size: 500000,
        contentType: "application/pdf",
      });

      await documentController.getDocument(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
      expect(res.setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
      expect(res.status).not.toHaveBeenCalledWith(304);
    });
  });
});
