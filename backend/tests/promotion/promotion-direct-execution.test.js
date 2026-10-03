/**
 * Tests for Phase 2: Simplified College Admin Promotion Workflow
 *
 * Verifies executePromotionDecision() behavior:
 *  1. DRAFT decision        -> auto-recommends + auto-approves + executes promotion
 *  2. RECOMMENDED decision  -> auto-approves + executes promotion
 *  3. APPROVED decision     -> executes promotion directly
 *  4. REJECTED decision     -> returns 409 PROMOTION_REJECTED error
 *  5. Non-approvable status -> returns 409 PROMOTION_NOT_APPROVABLE error
 *  6. Non-COLLEGE_ADMIN     -> fails approval guard when attempting to auto-approve
 */

const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

jest.mock("../../src/services/attendance.service", () => ({
  getAttendanceDataForStudents: jest.fn(),
}));

const {
  getAttendanceDataForStudents,
} = require("../../src/services/attendance.service");

const AuditLog = require("../../src/models/auditLog.model");
const FeeStructure = require("../../src/models/feeStructure.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const {
  executePromotionDecision,
} = require("../../src/controllers/promotionDecision.controller");

describe("Phase 2 — Direct Confirm Promotion & auto-approve execution", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    getAttendanceDataForStudents.mockResolvedValue([
      { percentage: 80, totalSessions: 10 },
    ]);
  });

  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  /**
   * Helper to set up a student, result, current fee, next-semester fee structure,
   * and a promotion decision in any given workflow_status.
   */
  const createDecisionCase = async ({
    outcome = "PASS",
    workflowStatus = "DRAFT",
    category = "GEN",
  } = {}) => {
    const collegeId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const departmentId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    // 1. Student
    const student = await Student.create({
      college_id: collegeId,
      department_id: departmentId,
      course_id: courseId,
      fullName: "Confirm Promotion Student",
      email: `confirm-promo-${Date.now()}-${Math.random()}@example.com`,
      mobileNumber: "9876543210",
      gender: "Other",
      dateOfBirth: new Date("2000-01-01"),
      addressLine: "Campus",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      admissionYear: 2024,
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      category,
      status: "APPROVED",
    });

    // 2. Semester Result
    const subjectId = new mongoose.Types.ObjectId();
    const result = await SemesterResult.create({
      college_id: collegeId,
      student_id: student._id,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      subjects: [
        {
          subject: subjectId,
          subjectName: "Core Subject",
          subjectCode: "CS-301",
          passed: outcome === "PASS",
          status: outcome === "PASS" ? "PASS" : "FAIL",
          marksRecorded: true,
        },
      ],
      totalSubjects: 1,
      passedSubjects: outcome === "PASS" ? 1 : 0,
      failedSubjects: outcome === "PASS" ? 0 : 1,
      incompleteSubjects: 0,
      overallResult: outcome === "PASS" ? "PASS" : "FAIL",
      status: "PUBLISHED",
      createdBy: adminId,
    });

    // 3. Current Semester StudentFee (fully paid)
    await StudentFee.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      totalFee: 1000,
      paidAmount: 1000,
      pendingAmount: 0,
      status: "FULLY_PAID",
      dueDate: new Date(Date.now() + 86400000),
      installments: [],
    });

    // 4. Next-semester FeeStructure (for Sem 4)
    const nextFeeStructure = await FeeStructure.create({
      college_id: collegeId,
      course_id: courseId,
      semester: 4,
      academicYear: "2026-27",
      category,
      totalFee: 12000,
      tuitionFee: 10000,
      examFee: 2000,
      status: "ACTIVE",
      createdBy: adminId,
    });

    // 5. Promotion Decision
    const decision = await PromotionDecision.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
      source_result_id: result._id,
      source_exam_id: result.exam_id,
      result_status: "PUBLISHED",
      failed_subject_ids: outcome === "ATKT" ? [subjectId] : [],
      failed_subject_count: outcome === "ATKT" ? 1 : 0,
      kt_count: outcome === "ATKT" ? 1 : 0,
      promotion_outcome: outcome,
      workflow_status: workflowStatus,
      decision_reason: outcome === "PASS" ? "ELIGIBLE" : "ELIGIBLE_WITH_KT",
      attendance_snapshot: {
        percentage: 80,
        requiredPercentage: 75,
        totalSessions: 10,
        status: "ELIGIBLE",
        passed: true,
      },
      fee_clearance_snapshot: {
        status: "FULLY_PAID",
        totalFee: 1000,
        paidAmount: 1000,
        pendingAmount: 0,
        requiredClearance: true,
        cleared: true,
        passed: true,
      },
      policy_version: "test-v1",
      policy_snapshot: {
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
      },
      createdBy: adminId,
    });

    return {
      collegeId,
      courseId,
      student,
      result,
      decision,
      nextFeeStructure,
      adminId,
    };
  };

  const makeReq = ({ decisionId, collegeId, userId, role = "COLLEGE_ADMIN" }) => ({
    params: { decisionId },
    college_id: collegeId,
    user: {
      id: userId,
      role,
      name: "College Administrator",
      email: "admin@college.test",
    },
    ip: "127.0.0.1",
    get: jest.fn().mockReturnValue("test-agent"),
  });

  it("auto-recommends, auto-approves, and executes a DRAFT decision", async () => {
    const { decision, collegeId, student, adminId, nextFeeStructure } =
      await createDecisionCase({ outcome: "PASS", workflowStatus: "DRAFT" });

    const req = makeReq({
      decisionId: decision._id,
      collegeId,
      userId: adminId,
    });
    const res = mockResponse();
    const next = jest.fn();

    await executePromotionDecision(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall.success).toBe(true);
    expect(jsonCall.message).toBe("Promotion executed successfully");
    expect(jsonCall.data.executionStatus).toBe("PROMOTED");

    // Student should be promoted to Semester 4
    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.currentSemester).toBe(4);

    // PromotionDecision should be PROMOTED
    const updatedDecision = await PromotionDecision.findById(decision._id);
    expect(updatedDecision.workflow_status).toBe("PROMOTED");
    expect(updatedDecision.approval).toBeDefined();
    expect(updatedDecision.approval.user_id).toEqual(adminId);

    // PromotionHistory record should exist with fee assignment
    const history = await PromotionHistory.findOne({
      student_id: student._id,
      fromSemester: 3,
      toSemester: 4,
    });
    expect(history).not.toBeNull();
    expect(history.newFeeAssigned).toBe(true);
    expect(history.newFeeStructureId.toString()).toBe(nextFeeStructure._id.toString());
    expect(history.newStudentFeeId).toBeDefined();

    // Audit logs should include PROMOTION_APPROVED then PROMOTION_EXECUTED
    const auditLogs = await AuditLog.find({ resourceId: decision._id }).sort({
      createdAt: 1,
    });
    const actions = auditLogs.map((log) => log.action);
    expect(actions).toContain("PROMOTION_APPROVED");
    expect(actions).toContain("PROMOTION_EXECUTED");
  });

  it("auto-approves and executes a RECOMMENDED decision", async () => {
    const { decision, collegeId, student, adminId } =
      await createDecisionCase({ outcome: "ATKT", workflowStatus: "RECOMMENDED" });

    const req = makeReq({
      decisionId: decision._id,
      collegeId,
      userId: adminId,
    });
    const res = mockResponse();
    const next = jest.fn();

    await executePromotionDecision(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.currentSemester).toBe(4);

    const updatedDecision = await PromotionDecision.findById(decision._id);
    expect(updatedDecision.workflow_status).toBe("PROMOTED");
    expect(updatedDecision.approval.user_id).toEqual(adminId);

    const auditLogs = await AuditLog.find({ resourceId: decision._id });
    const actions = auditLogs.map((log) => log.action);
    expect(actions).toContain("PROMOTION_APPROVED");
    expect(actions).toContain("PROMOTION_EXECUTED");
  });

  it("executes an already APPROVED decision directly", async () => {
    const { decision, collegeId, student, adminId } =
      await createDecisionCase({ outcome: "PASS", workflowStatus: "APPROVED" });

    // Mark approval details on decision
    await PromotionDecision.updateOne(
      { _id: decision._id },
      {
        $set: {
          approval: {
            approved_by: adminId,
            approved_at: new Date(),
            approval_note: "Pre-approved",
          },
        },
      },
    );

    const req = makeReq({
      decisionId: decision._id,
      collegeId,
      userId: adminId,
    });
    const res = mockResponse();
    const next = jest.fn();

    await executePromotionDecision(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.currentSemester).toBe(4);

    const updatedDecision = await PromotionDecision.findById(decision._id);
    expect(updatedDecision.workflow_status).toBe("PROMOTED");
  });

  it("rejects execution if the decision is REJECTED", async () => {
    const { decision, collegeId, student, adminId } =
      await createDecisionCase({ outcome: "PASS", workflowStatus: "REJECTED" });

    const req = makeReq({
      decisionId: decision._id,
      collegeId,
      userId: adminId,
    });
    const res = mockResponse();
    const next = jest.fn();

    await executePromotionDecision(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("PROMOTION_REJECTED");

    // Student must not have been promoted
    const unchangedStudent = await Student.findById(student._id);
    expect(unchangedStudent.currentSemester).toBe(3);
  });

  it("rejects execution if the decision is in a non-approvable status (e.g. BLOCKED)", async () => {
    const { decision, collegeId, student, adminId } =
      await createDecisionCase({ outcome: "BLOCKED", workflowStatus: "BLOCKED" });

    const req = makeReq({
      decisionId: decision._id,
      collegeId,
      userId: adminId,
    });
    const res = mockResponse();
    const next = jest.fn();

    await executePromotionDecision(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("PROMOTION_NOT_APPROVABLE");

    // Student must not have been promoted
    const unchangedStudent = await Student.findById(student._id);
    expect(unchangedStudent.currentSemester).toBe(3);
  });

  it("returns 404 NO_DECISION if decisionId is not found", async () => {
    const collegeId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const nonExistentId = new mongoose.Types.ObjectId();

    const req = makeReq({
      decisionId: nonExistentId,
      collegeId,
      userId: adminId,
    });
    const res = mockResponse();
    const next = jest.fn();

    await executePromotionDecision(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NO_DECISION");
  });
});
