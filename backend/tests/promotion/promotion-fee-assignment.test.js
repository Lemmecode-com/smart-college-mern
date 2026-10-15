/**
 * Regression tests – Phase 1: fee-assignment inside promotionExecution.service.js
 *
 * Tests cover:
 *  1. FeeStructure found (generic)          → StudentFee created, PromotionHistory populated
 *  2. FeeStructure found (year-specific)    → year-specific record preferred
 *  3. FeeStructure not found                → promotion succeeds with warning, no StudentFee created
 *  4. Transaction rollback                  → if StudentFee.create() throws, full txn rolls back
 *  5. Wrong college FeeStructure            → not matched
 *  6. Wrong category FeeStructure           → not matched
 *  7. FeeStructure with no installments     → StudentFee created with empty array
 *  8. Idempotent second execution           → no duplicate StudentFee created
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
  calculateNextAcademicYear,
} = require("../../src/services/promotionExecution.service");

describe("Phase 1 – fee assignment inside executePromotion()", () => {
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
   * current-semester StudentFee ready for executePromotion().
   */
  const createApprovedCase = async ({ category = "GEN" } = {}) => {
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
      currentSemester: 3,
      currentAcademicYear: "2026-27",
      category,
      status: "APPROVED",
    });

    const result = await SemesterResult.create({
      college_id: collegeId,
      student_id: student._id,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: courseId,
      semester: 3,
      academicYear: "2026-27",
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
      semester: 3,
      academicYear: "2026-27",
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

    // Current-semester fee (already fully paid – satisfies revalidateDecision)
    await StudentFee.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: courseId,
      totalFee: 10000,
      paidAmount: 10000,
      installments: [],
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
  // Test 1 – generic FeeStructure found → StudentFee created
  // ─────────────────────────────────────────────────────────────────────────
  it("creates a new StudentFee when a generic FeeStructure is found", async () => {
    const tc = await createApprovedCase();

    const feeStructure = await FeeStructure.create({
      college_id: tc.collegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: null,
      totalFee: 12000,
      installments: [
        { name: "Term 1", amount: 6000, order: 1, dueDate: new Date("2027-07-01") },
        { name: "Term 2", amount: 6000, order: 2, dueDate: new Date("2027-12-01") },
      ],
    });

    const executed = await executePromotion(execInput(tc));

    expect(executed.executionStatus).toBe("PROMOTED");
    expect(executed.newFeeAssigned).toBe(true);
    expect(String(executed.newFeeStructureId)).toBe(String(feeStructure._id));
    expect(executed.newStudentFeeId).toBeTruthy();
    expect(executed.feeAssignmentWarning).toBeNull();

    // Verify the created StudentFee record
    const newFee = await StudentFee.findById(executed.newStudentFeeId);
    expect(newFee).not.toBeNull();
    expect(newFee.student_id.toString()).toBe(tc.student._id.toString());
    expect(newFee.college_id.toString()).toBe(tc.collegeId.toString());
    expect(newFee.course_id.toString()).toBe(tc.courseId.toString());
    expect(newFee.totalFee).toBe(12000);
    expect(newFee.paidAmount).toBe(0);
    expect(newFee.installments).toHaveLength(2);
    expect(newFee.installments.every((i) => i.status === "PENDING")).toBe(true);

    // Verify PromotionHistory has fee references
    const history = await PromotionHistory.findOne({
      promotion_decision_id: tc.decision._id,
    });
    expect(history.newFeeAssigned).toBe(true);
    expect(String(history.newFeeStructureId)).toBe(String(feeStructure._id));
    expect(String(history.newStudentFeeId)).toBe(String(executed.newStudentFeeId));
    expect(history.feeAssignmentWarning).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2 – year-specific FeeStructure preferred over generic
  // ─────────────────────────────────────────────────────────────────────────
  it("prefers year-specific FeeStructure over generic", async () => {
    const tc = await createApprovedCase();
    // Use the same function the service uses so the academicYear format always matches.
    const nextAcademicYear = calculateNextAcademicYear(
      tc.student.currentSemester,
      tc.student.currentAcademicYear,
    );

    await FeeStructure.create({
      college_id: tc.collegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: null,
      totalFee: 10000,
      installments: [],
    });

    const yearSpecificFee = await FeeStructure.create({
      college_id: tc.collegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: nextAcademicYear,
      totalFee: 13000,
      installments: [],
    });

    const executed = await executePromotion(execInput(tc));

    expect(executed.newFeeAssigned).toBe(true);
    expect(String(executed.newFeeStructureId)).toBe(String(yearSpecificFee._id));
    const newFee = await StudentFee.findById(executed.newStudentFeeId);
    expect(newFee.totalFee).toBe(13000);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 3 – no FeeStructure found: promotion succeeds with warning
  // ─────────────────────────────────────────────────────────────────────────
  it("succeeds with feeAssignmentWarning when no FeeStructure exists", async () => {
    const tc = await createApprovedCase();

    const executed = await executePromotion(execInput(tc));

    expect(executed.executionStatus).toBe("PROMOTED");
    expect(executed.newFeeAssigned).toBe(false);
    expect(executed.newFeeStructureId).toBeNull();
    expect(executed.newStudentFeeId).toBeNull();
    expect(typeof executed.feeAssignmentWarning).toBe("string");
    expect(executed.feeAssignmentWarning.length).toBeGreaterThan(0);

    // Student was still promoted
    const updatedStudent = await Student.findById(tc.student._id);
    expect(updatedStudent.currentSemester).toBe(4);

    // PromotionHistory records the warning
    const history = await PromotionHistory.findOne({
      promotion_decision_id: tc.decision._id,
    });
    expect(history.newFeeAssigned).toBe(false);
    expect(history.newFeeStructureId).toBeNull();
    expect(history.newStudentFeeId).toBeNull();
    expect(history.feeAssignmentWarning).toBeTruthy();

    // Only the original current-semester StudentFee exists (no new one)
    const feeCount = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });
    expect(feeCount).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 4 – StudentFee.create() throws → full transaction rolls back
  // ─────────────────────────────────────────────────────────────────────────
  it("rolls back the full promotion when StudentFee.create() throws", async () => {
    const tc = await createApprovedCase();

    await FeeStructure.create({
      college_id: tc.collegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: null,
      totalFee: 12000,
      installments: [],
    });

    // Spy on StudentFee.create – force a failure on the next call
    const createSpy = jest
      .spyOn(StudentFee, "create")
      .mockRejectedValueOnce(new Error("StudentFee write failed"));

    await expect(executePromotion(execInput(tc))).rejects.toThrow(
      "StudentFee write failed",
    );

    createSpy.mockRestore();

    // Semester must NOT have changed
    const student = await Student.findById(tc.student._id);
    expect(student.currentSemester).toBe(3);

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
  // Test 5 – FeeStructure for wrong college is not matched
  // ─────────────────────────────────────────────────────────────────────────
  it("does not match a FeeStructure belonging to a different college", async () => {
    const tc = await createApprovedCase();
    const wrongCollegeId = new mongoose.Types.ObjectId();

    await FeeStructure.create({
      college_id: wrongCollegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: null,
      totalFee: 9999,
      installments: [],
    });

    const executed = await executePromotion(execInput(tc));

    expect(executed.newFeeAssigned).toBe(false);
    expect(executed.feeAssignmentWarning).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 6 – FeeStructure for wrong category is not matched
  // ─────────────────────────────────────────────────────────────────────────
  it("does not match a FeeStructure for a different student category", async () => {
    const tc = await createApprovedCase({ category: "SC" });

    // Only GEN fee exists – should NOT match SC student
    await FeeStructure.create({
      college_id: tc.collegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: null,
      totalFee: 11000,
      installments: [],
    });

    const executed = await executePromotion(execInput(tc));

    expect(executed.newFeeAssigned).toBe(false);
    expect(executed.feeAssignmentWarning).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 7 – FeeStructure with no installments: StudentFee created with empty array
  // ─────────────────────────────────────────────────────────────────────────
  it("creates StudentFee with empty installments when FeeStructure has none", async () => {
    const tc = await createApprovedCase();

    await FeeStructure.create({
      college_id: tc.collegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: null,
      totalFee: 8000,
      installments: [],
    });

    const executed = await executePromotion(execInput(tc));

    expect(executed.newFeeAssigned).toBe(true);
    const newFee = await StudentFee.findById(executed.newStudentFeeId);
    expect(newFee.totalFee).toBe(8000);
    expect(newFee.paidAmount).toBe(0);
    expect(newFee.installments).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 8 – Idempotent second execution does not create duplicate StudentFee
  // ─────────────────────────────────────────────────────────────────────────
  it("does not create duplicate StudentFee on idempotent second execution", async () => {
    const tc = await createApprovedCase();

    await FeeStructure.create({
      college_id: tc.collegeId,
      course_id: tc.courseId,
      category: "GEN",
      academicYear: null,
      totalFee: 12000,
      installments: [],
    });

    const first = await executePromotion(execInput(tc));
    expect(first.executionStatus).toBe("PROMOTED");
    expect(first.newFeeAssigned).toBe(true);

    const feeCountAfterFirst = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });

    const second = await executePromotion(execInput(tc));
    expect(second.executionStatus).toBe("ALREADY_PROMOTED");

    const feeCountAfterSecond = await StudentFee.countDocuments({
      student_id: tc.student._id,
    });
    expect(feeCountAfterSecond).toBe(feeCountAfterFirst);
  });
});
