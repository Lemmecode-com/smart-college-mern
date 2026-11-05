/**
 * Regression tests – fee-assignment behavior inside promotionExecution.service.js
 *
 * AUTHORITATIVE BUSINESS RULE:
 * A fee structure is created by college admin per course (+ category).
 * Once assigned (at admission approval), that fee and installments apply for the
 * ENTIRE duration of the course. Promotion (semester change, year change, any)
 * must NEVER create a new StudentFee or new installments.
 *
 * Tests cover:
 *  1. Promotion across academic years never creates a new StudentFee (newFeeAssigned: false)
 *  2. Promotion within the same academic year never creates a new StudentFee (newFeeAssigned: false)
 *  3. PromotionHistory records newFeeAssigned: false and newStudentFeeId: null
 *  4. Transaction rollback when student update throws
 *  5. Idempotent second execution preserves single StudentFee invariant
 */

const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

jest.mock("../../src/services/attendance.service", () => ({
  getAttendanceDataForStudents: jest.fn(),
}));

const {
  getAttendanceDataForStudents,
} = require("../../src/services/attendance.service");

const FeeStructure = require("../../src/models/feeStructure.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const {
  executePromotion,
} = require("../../src/services/promotionExecution.service");

describe("Phase 1 – Authoritative course fee rule inside executePromotion()", () => {
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

  /**
   * Creates a minimal approved PromotionDecision + Student + fully-paid
   * course StudentFee ready for executePromotion().
   */
  const createApprovedCase = async ({ category = "GEN", semester = 2 } = {}) => {
    const collegeId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    const student = await Student.create({
      college_id: collegeId,
      department_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      fullName: "Fee Test Student",
      email: `fee-test-${Date.now()}-${Math.random()}@example.com`,
      mobileNumber: "9876543210",
      gender: "Other",
      dateOfBirth: new Date("2000-01-01"),
      addressLine: "Campus",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      admissionYear: 2024,
      currentSemester: semester,
      currentAcademicYear: "2026-2027",
      category,
      status: "APPROVED",
    });

    const result = await SemesterResult.create({
      college_id: collegeId,
      student_id: student._id,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      semester,
      academicYear: "2026-2027",
      subjects: [
        {
          subject: new mongoose.Types.ObjectId(),
          subjectName: "Fee Subject",
          subjectCode: "FEE-101",
          passed: true,
          status: "PASS",
          marksRecorded: true,
        },
      ],
      totalSubjects: 1,
      passedSubjects: 1,
      failedSubjects: 0,
      incompleteSubjects: 0,
      overallResult: "PASS",
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });

    const decision = await PromotionDecision.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      semester,
      academicYear: "2026-2027",
      source_result_id: result._id,
      source_exam_id: result.exam_id,
      result_status: "PUBLISHED",
      failed_subject_ids: [],
      failed_subject_count: 0,
      kt_count: 0,
      promotion_outcome: "PASS",
      decision_reason: "ELIGIBLE",
      workflow_status: "APPROVED",
      attendance_snapshot: {
        percentage: 80,
        requiredPercentage: 75,
        totalSessions: 10,
        status: "ELIGIBLE",
        passed: true,
      },
      fee_clearance_snapshot: {
        status: "FULLY_PAID",
        totalFee: 10000,
        paidAmount: 10000,
        pendingAmount: 0,
        requiredClearance: true,
        cleared: true,
        passed: true,
      },
      policy_version: "DEFAULT-v1",
      policy_snapshot: {
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
      },
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Course fee created at admission approval
    await StudentFee.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      totalFee: 10000,
      paidAmount: 10000,
      paymentStatus: "PAID",
      installments: [
        { name: "Term 1", amount: 10000, status: "PAID", paidAmount: 10000, dueDate: new Date("2026-12-31") },
      ],
    });

    return { collegeId, courseId, student, result, decision };
  };

  const execInput = (tc, overrides = {}) => ({
    decisionId: tc.decision._id,
    collegeId: tc.collegeId,
    actorId: new mongoose.Types.ObjectId(),
    actorRole: "COLLEGE_ADMIN",
    actorName: "Fee Test Admin",
    ...overrides,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1 – Promotion across academic years (Sem 2 -> Sem 3) never creates a fee
  // ─────────────────────────────────────────────────────────────────────────
  it("never creates a StudentFee when promoting across academic years (Sem 2 -> Sem 3)", async () => {
    const tc = await createApprovedCase({ semester: 2 });

    const feeCountBefore = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });
    expect(feeCountBefore).toBe(1);

    const executed = await executePromotion(execInput(tc));

    expect(executed.executionStatus).toBe("PROMOTED");
    expect(executed.newFeeAssigned).toBe(false);
    expect(executed.newStudentFeeId).toBeNull();
    expect(executed.newFeeStructureId).toBeNull();

    // Still exactly 1 StudentFee exists
    const feeCountAfter = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });
    expect(feeCountAfter).toBe(1);

    // PromotionHistory has null fee references
    const history = await PromotionHistory.findOne({
      promotion_decision_id: tc.decision._id,
    });
    expect(history.newFeeAssigned).toBe(false);
    expect(history.newStudentFeeId).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2 – Promotion within same academic year (Sem 1 -> Sem 2) never creates a fee
  // ─────────────────────────────────────────────────────────────────────────
  it("never creates a StudentFee when promoting within same academic year (Sem 1 -> Sem 2)", async () => {
    const tc = await createApprovedCase({ semester: 1 });

    const executed = await executePromotion(execInput(tc));

    expect(executed.executionStatus).toBe("PROMOTED");
    expect(executed.newFeeAssigned).toBe(false);
    expect(executed.newStudentFeeId).toBeNull();

    const feeCount = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });
    expect(feeCount).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3 – Transaction rollback when Student.findByIdAndUpdate throws
  // ─────────────────────────────────────────────────────────────────────────
  it("rolls back the full promotion when student update fails", async () => {
    const tc = await createApprovedCase({ semester: 2 });

    const updateSpy = jest
      .spyOn(Student, "updateOne")
      .mockRejectedValueOnce(new Error("Student update failed"));

    await expect(executePromotion(execInput(tc))).rejects.toThrow(
      "Student update failed",
    );

    updateSpy.mockRestore();

    // Semester must NOT have changed
    const student = await Student.findById(tc.student._id);
    expect(student.currentSemester).toBe(2);

    // No PromotionHistory should have been created
    const historyCount = await PromotionHistory.countDocuments({
      student_id: tc.student._id,
    });
    expect(historyCount).toBe(0);

    // Decision must remain APPROVED (not PROMOTED)
    const decision = await PromotionDecision.findById(tc.decision._id);
    expect(decision.workflow_status).toBe("APPROVED");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4 – Idempotent second execution does not create duplicate StudentFee
  // ─────────────────────────────────────────────────────────────────────────
  it("does not create duplicate StudentFee on idempotent second execution", async () => {
    const tc = await createApprovedCase({ semester: 2 });

    const first = await executePromotion(execInput(tc));
    expect(first.executionStatus).toBe("PROMOTED");
    expect(first.newFeeAssigned).toBe(false);

    const feeCountAfterFirst = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });
    expect(feeCountAfterFirst).toBe(1);

    const second = await executePromotion(execInput(tc));
    expect(second.executionStatus).toBe("ALREADY_PROMOTED");

    const feeCountAfterSecond = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });
    expect(feeCountAfterSecond).toBe(1);
  });
});
