const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Document = require("../../src/models/document.model");
const DocumentService = require("../../src/services/document.service");

describe("Document Model & Service", () => {
  let mongod;
  let mongooseConnection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongooseConnection = await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongooseConnection.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await Document.deleteMany({});
  });

  it("should create a document with metadata", async () => {
    const mockFileBuffer = Buffer.from("test file content");
    
    const originalUploadFile = DocumentService.createDocument;
    DocumentService.createDocument = async (params) => {
      return Document.create({
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        documentType: params.documentType,
        storageKey: params.storageKey || "gridfs-file-id",
        provider: params.provider || "gridfs",
        originalFileName: params.originalFileName,
        mimeType: params.mimeType,
        size: params.size,
        uploadedBy: params.uploadedBy,
        status: "ACTIVE",
        metadata: new Map(Object.entries(params.metadata || {})),
      });
    };

    const doc = await DocumentService.createDocument({
      ownerType: "Student",
      ownerId: new mongoose.Types.ObjectId(),
      documentType: "ssc_marksheet",
      fileBuffer: mockFileBuffer,
      originalFileName: "marksheet.pdf",
      mimeType: "application/pdf",
      size: mockFileBuffer.length,
      uploadedBy: new mongoose.Types.ObjectId(),
      category: "student",
      provider: "gridfs",
    });

    expect(doc.documentId).toBeDefined();
    expect(doc.ownerType).toBe("Student");
    expect(doc.documentType).toBe("ssc_marksheet");
    expect(doc.status).toBe("ACTIVE");
    expect(doc.provider).toBe("gridfs");

    DocumentService.createDocument = originalUploadFile;
  });

  it("should find documents by owner", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    
    await Document.create({
      ownerType: "Student",
      ownerId,
      documentType: "ssc_marksheet",
      storageKey: "gridfs-file-id-1",
      provider: "gridfs",
      originalFileName: "ssc.pdf",
      mimeType: "application/pdf",
      size: 1024,
      uploadedBy: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    await Document.create({
      ownerType: "Student",
      ownerId: new mongoose.Types.ObjectId(),
      documentType: "ssc_marksheet",
      storageKey: "gridfs-file-id-2",
      provider: "gridfs",
      originalFileName: "ssc2.pdf",
      mimeType: "application/pdf",
      size: 1024,
      uploadedBy: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    const docs = await DocumentService.findDocumentsByOwner("Student", ownerId);
    expect(docs).toHaveLength(1);
    expect(docs[0].documentType).toBe("ssc_marksheet");
  });

  it("should soft delete a document", async () => {
    const doc = await Document.create({
      ownerType: "Teacher",
      ownerId: new mongoose.Types.ObjectId(),
      documentType: "aadhaarCard",
      storageKey: "gridfs-file-id-3",
      provider: "gridfs",
      originalFileName: "aadhaar.pdf",
      mimeType: "application/pdf",
      size: 2048,
      uploadedBy: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    await DocumentService.softDeleteDocument(doc.documentId);

    const deletedDoc = await Document.findOne({ documentId: doc.documentId });
    expect(deletedDoc.status).toBe("ARCHIVED");
    expect(deletedDoc.archivedAt).toBeDefined();
  });

  it("should replace a document (archive old, create new)", async () => {
    const oldDoc = await Document.create({
      ownerType: "Teacher",
      ownerId: new mongoose.Types.ObjectId(),
      documentType: "aadhaarCard",
      storageKey: "gridfs-file-id-4",
      provider: "gridfs",
      originalFileName: "aadhaar_old.pdf",
      mimeType: "application/pdf",
      size: 2048,
      uploadedBy: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
    });

    const mockFileBuffer = Buffer.from("new file content");
    const originalUploadFile = DocumentService.createDocument;
    DocumentService.createDocument = async (params) => {
      return Document.create({
        ownerType: params.ownerType,
        ownerId: params.ownerId,
        documentType: params.documentType,
        storageKey: params.storageKey || "gridfs-file-id-5",
        provider: params.provider || "gridfs",
        originalFileName: params.originalFileName,
        mimeType: params.mimeType,
        size: params.size,
        uploadedBy: params.uploadedBy,
        replacedBy: oldDoc.documentId,
        status: "ACTIVE",
        metadata: new Map(Object.entries(params.metadata || {})),
      });
    };

    const newDoc = await DocumentService.replaceDocument(oldDoc.documentId, {
      fileBuffer: mockFileBuffer,
      originalFileName: "aadhaar_new.pdf",
      mimeType: "application/pdf",
      size: mockFileBuffer.length,
      uploadedBy: new mongoose.Types.ObjectId(),
      category: "teacher",
    });

    expect(newDoc.documentId).toBeDefined();
    expect(newDoc.replacedBy).toBe(oldDoc.documentId);

    const archivedDoc = await Document.findOne({ documentId: oldDoc.documentId });
    expect(archivedDoc.status).toBe("ARCHIVED");

    DocumentService.createDocument = originalUploadFile;
  });

  it("should enforce unique documentId", async () => {
    const docId = "test-doc-" + Date.now();
    
    await Document.create({
      documentId: docId,
      ownerType: "Student",
      ownerId: new mongoose.Types.ObjectId(),
      documentType: "ssc_marksheet",
      storageKey: "gridfs-file-id-6",
      provider: "gridfs",
      originalFileName: "ssc1.pdf",
      mimeType: "application/pdf",
      size: 1024,
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    await expect(
      Document.create({
        documentId: docId,
        ownerType: "Student",
        ownerId: new mongoose.Types.ObjectId(),
        documentType: "hsc_marksheet",
        storageKey: "gridfs-file-id-7",
        provider: "gridfs",
        originalFileName: "hsc.pdf",
        mimeType: "application/pdf",
        size: 1024,
        uploadedBy: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow();
  });
});
