const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const DocumentConfig = require("../../src/models/documentConfig.model");
const Document = require("../../src/models/document.model");
const documentConfigController = require("../../src/controllers/documentConfig.controller");

describe("DocumentConfig - resetToEmpty Controller", () => {
  let mongod;
  let collegeId;
  let userId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    // Ensure unique indexes are created
    await DocumentConfig.init();
    await Document.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await DocumentConfig.deleteMany({});
    await Document.deleteMany({});
    collegeId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  const mockResponse = () => {
    const res = {};
    res.statusCode = 200;
    res.status = jest.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn().mockImplementation((data) => {
      res.data = data;
      return res;
    });
    return res;
  };

  it("should reset existing active config to empty array in-place", async () => {
    // 1. Seed an active config with documents
    await DocumentConfig.create({
      college_id: collegeId,
      collegeCode: "testcode",
      isActive: true,
      documents: [
        { type: "10th_marksheet", label: "10th Marksheet", enabled: true, mandatory: true },
        { type: "aadhar_card", label: "Aadhar Card", enabled: true, mandatory: false },
      ],
      updatedBy: userId,
    });

    const req = {
      college_id: collegeId,
      collegeCode: "testcode",
      user: { id: userId },
    };
    const res = mockResponse();

    await documentConfigController.resetToEmpty(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
    expect(res.data.config.documents).toEqual([]);
    expect(res.data.config.isActive).toBe(true);

    // Verify DB count: exactly 1 config exists
    const configs = await DocumentConfig.find({ college_id: collegeId });
    expect(configs).toHaveLength(1);
    expect(configs[0].documents).toHaveLength(0);
    expect(configs[0].isActive).toBe(true);
  });

  it("should succeed twice in a row without E11000 duplicate key error", async () => {
    // 1. Seed an existing active config
    await DocumentConfig.create({
      college_id: collegeId,
      collegeCode: "testcode",
      isActive: true,
      documents: [
        { type: "10th_marksheet", label: "10th Marksheet", enabled: true },
      ],
      updatedBy: userId,
    });

    const req = {
      college_id: collegeId,
      collegeCode: "testcode",
      user: { id: userId },
    };

    // First reset
    const res1 = mockResponse();
    await documentConfigController.resetToEmpty(req, res1);
    expect(res1.status).not.toHaveBeenCalledWith(500);
    expect(res1.data.config.documents).toHaveLength(0);

    // Second reset in a row
    const res2 = mockResponse();
    await documentConfigController.resetToEmpty(req, res2);
    expect(res2.status).not.toHaveBeenCalledWith(500);
    expect(res2.data.config.documents).toHaveLength(0);

    // Verify DB state
    const configs = await DocumentConfig.find({ college_id: collegeId });
    expect(configs).toHaveLength(1);
    expect(configs[0].isActive).toBe(true);
    expect(configs[0].documents).toHaveLength(0);
  });

  it("should reactivate an inactive config and leave exactly one active empty config", async () => {
    // Seed an inactive config (like the one left by previous failed reset)
    await DocumentConfig.create({
      college_id: collegeId,
      collegeCode: "testcode",
      isActive: false,
      documents: [
        { type: "aadhar_card", label: "Aadhar Card", enabled: true },
      ],
      updatedBy: userId,
    });

    const req = {
      college_id: collegeId,
      collegeCode: "testcode",
      user: { id: userId },
    };
    const res = mockResponse();

    await documentConfigController.resetToEmpty(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.data.config.isActive).toBe(true);
    expect(res.data.config.documents).toEqual([]);

    const configs = await DocumentConfig.find({ college_id: collegeId });
    expect(configs).toHaveLength(1);
    expect(configs[0].isActive).toBe(true);
    expect(configs[0].documents).toEqual([]);
  });

  it("should not delete, modify or orphan uploaded student documents", async () => {
    // 1. Create a student uploaded document in the Document collection
    const studentOwnerId = new mongoose.Types.ObjectId();
    const studentDoc = await Document.create({
      ownerType: "Student",
      ownerId: studentOwnerId,
      documentType: "10th_marksheet",
      storageKey: "gridfs-file-abc-123",
      provider: "gridfs",
      originalFileName: "10th_marksheet.pdf",
      mimeType: "application/pdf",
      size: 2048,
      uploadedBy: studentOwnerId,
      status: "ACTIVE",
    });

    // 2. DocumentConfig exists with 10th marksheet
    await DocumentConfig.create({
      college_id: collegeId,
      collegeCode: "testcode",
      isActive: true,
      documents: [
        { type: "10th_marksheet", label: "10th Marksheet", enabled: true, mandatory: true },
      ],
      updatedBy: userId,
    });

    // 3. Reset config to empty
    const req = {
      college_id: collegeId,
      collegeCode: "testcode",
      user: { id: userId },
    };
    const res = mockResponse();
    await documentConfigController.resetToEmpty(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);

    // 4. Verify student uploaded document is completely untouched
    const retrievedDoc = await Document.findById(studentDoc._id);
    expect(retrievedDoc).not.toBeNull();
    expect(retrievedDoc.status).toBe("ACTIVE");
    expect(retrievedDoc.storageKey).toBe("gridfs-file-abc-123");
    expect(retrievedDoc.originalFileName).toBe("10th_marksheet.pdf");
  });
});

