const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const AuditLog = require("../../src/models/auditLog.model");
const auditLogService = require("../../src/services/auditLog.service");

const buildBaseAudit = (overrides = {}) => ({
  collegeId: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(),
  userEmail: "audit.test@test.com",
  userRole: "EXAM_COORDINATOR",
  action: "EXAM_CREATED",
  resourceType: "Exam",
  resourceId: new mongoose.Types.ObjectId(),
  ipAddress: "127.0.0.1",
  method: "POST",
  ...overrides,
});

describe("AUD-TC-001 — AuditLog Exam module enum foundation", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("accepts pre-existing enum values (action CREATE / resourceType Student / userRole HOD)", async () => {
    const log = await AuditLog.create(
      buildBaseAudit({
        action: "CREATE",
        resourceType: "Student",
        userRole: "HOD",
      }),
    );
    expect(log._id).toBeDefined();
    expect(log.action).toBe("CREATE");
    expect(log.resourceType).toBe("Student");
    expect(log.userRole).toBe("HOD");
  });

  it("accepts all new Exam action enum values", async () => {
    const actions = [
      "EXAM_CREATED",
      "MARKS_ENTERED",
      "MARKS_UPDATED",
      "RESULT_LOCKED",
      "RESULT_UNLOCKED",
      "RESULT_PUBLISHED",
    ];

    for (const action of actions) {
      const log = await AuditLog.create(buildBaseAudit({ action }));
      expect(log.action).toBe(action);
    }

    const count = await AuditLog.countDocuments({
      action: { $in: actions },
    });
    expect(count).toBe(actions.length);
  });

  it("accepts all new Exam resourceType enum values", async () => {
    const resourceTypes = ["Exam", "StudentMarks", "SemesterResult"];

    for (const resourceType of resourceTypes) {
      const log = await AuditLog.create(buildBaseAudit({ resourceType }));
      expect(log.resourceType).toBe(resourceType);
    }

    const count = await AuditLog.countDocuments({
      resourceType: { $in: resourceTypes },
    });
    expect(count).toBe(resourceTypes.length);
  });

  it("accepts EXAM_COORDINATOR as a userRole value", async () => {
    const log = await AuditLog.create(
      buildBaseAudit({ userRole: "EXAM_COORDINATOR" }),
    );
    expect(log.userRole).toBe("EXAM_COORDINATOR");
  });

  it("persists new Exam enums through the existing AuditLog service", async () => {
    const req = {
      ip: "127.0.0.1",
      get: () => "agent",
      originalUrl: "/api/exam/setup",
      method: "POST",
    };

    const saved = await auditLogService.logAudit(
      buildBaseAudit({
        action: "MARKS_ENTERED",
        resourceType: "StudentMarks",
        userRole: "EXAM_COORDINATOR",
      }),
      req,
    );

    expect(saved).not.toBeNull();
    const found = await AuditLog.findById(saved._id).lean();
    expect(found.action).toBe("MARKS_ENTERED");
    expect(found.resourceType).toBe("StudentMarks");
    expect(found.userRole).toBe("EXAM_COORDINATOR");
  });

  it("rejects an unsupported action value (validation still enforced)", async () => {
    let error;
    try {
      await AuditLog.create(buildBaseAudit({ action: "NOT_A_REAL_ACTION" }));
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe("ValidationError");
  });
});
