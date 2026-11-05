/**
 * Tests for StudentFee authoritative single-course fee rule across promotions and reporting
 *
 * AUTHORITATIVE BUSINESS RULE:
 * A fee structure is created by the college admin per course (+ category).
 * Once a student is assigned a fee for their course (at admission approval), that fee
 * and its installments apply for the ENTIRE duration of the course.
 * Promotion (semester change, year change, any) must NEVER create a new StudentFee
 * or new installments. One StudentFee per student per course.
 *
 * Covers:
 * Test 1: Promote Sem 1 -> Sem 2 (same year) creates no StudentFee.
 * Test 2: Promote Year 1 -> Year 2 (new academic year) creates NO new StudentFee, repeated execution creates nothing.
 * Test 3: Student who paid full fee in Sem 1 is Fully Paid (Rs 0 pending) in student portal, accountant report, Payment History, and fee clearance in later semesters.
 * Test 4: Student with unpaid fee fails fee clearance.
 * Test 5: Legacy student with duplicate docs: reader returns original fee and does not sum.
 * Test 6: Dashboard totals (getDashboard), defaulter list (getDefaulters), and payment summaries (paymentSummary) do not double count duplicate docs, and students with paid fee (Anirudha & Jagan) do NOT appear in getDefaulters even when duplicate installments are past due (simulated after 05-Nov-2026).
 */

const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

jest.mock("../../src/services/attendance.service", () => ({
  getAttendanceDataForStudents: jest.fn(),
}));

const { getAttendanceDataForStudents } = require("../../src/services/attendance.service");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const FeeStructure = require("../../src/models/feeStructure.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const Course = require("../../src/models/course.model");
const Department = require("../../src/models/department.model");

const { executePromotion } = require("../../src/services/promotionExecution.service");
const { getActiveStudentFee } = require("../../src/services/studentFee.service");
const { evaluateFeeClearance } = require("../../src/services/promotionDecision.service");
const {
  studentSpecificPaymentHistory,
  paymentSummary,
} = require("../../src/services/reports.service");
const {
  getCollegePaymentReport,
  getDefaulters,
} = require("../../src/controllers/admin.payment.controller");
const { getDashboard } = require("../../src/controllers/accountant.controller");

const { createCourse, createDepartment, createStudent } = require("../helpers/factories");

describe("Authoritative StudentFee Single-Fee-Per-Course Tests (Tests 1-6)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    getAttendanceDataForStudents.mockResolvedValue([
      { percentage: 85, totalSessions: 20 },
    ]);
  });

  const setupStudentContext = async ({
    fullName = "Anirudha Hole",
    semester = 1,
    academicYear = "2026-2027",
    admissionYear = 2026,
    feePaid = true,
    collegeId = new mongoose.Types.ObjectId(),
    course = null,
  } = {}) => {
    const department = await createDepartment({ college_id: collegeId });
    if (!course) {
      course = await createCourse({
        college_id: collegeId,
        department_id: department._id,
        durationSemesters: 8,
      });
    }

    const student = await createStudent({
      college_id: collegeId,
      department_id: department._id,
      course_id: course._id,
      fullName,
      admissionYear,
      currentSemester: semester,
      currentYear: Math.ceil(semester / 2),
      currentAcademicYear: academicYear,
      category: "GEN",
      status: "APPROVED",
    });

    const feeStructure = await FeeStructure.create({
      college_id: collegeId,
      course_id: course._id,
      category: "GEN",
      academicYear,
      totalFee: 24000,
      installments: [
        { name: "Installment 1", amount: 4000, order: 1, dueDate: new Date("2026-08-31") },
        { name: "Installment 2", amount: 20000, order: 2, dueDate: new Date("2026-12-31") },
      ],
    });

    const studentFee = await StudentFee.create({
      student_id: student._id,
      college_id: collegeId,
      course_id: course._id,
      academicYear,
      feeStructure_id: feeStructure._id,
      totalFee: 24000,
      paidAmount: feePaid ? 24000 : 0,
      paymentStatus: feePaid ? "PAID" : "PENDING",
      installments: [
        {
          name: "Installment 1",
          amount: 4000,
          status: feePaid ? "PAID" : "PENDING",
          paidAmount: feePaid ? 4000 : 0,
          dueDate: new Date("2026-08-31"),
        },
        {
          name: "Installment 2",
          amount: 20000,
          status: feePaid ? "PAID" : "PENDING",
          paidAmount: feePaid ? 20000 : 0,
          dueDate: new Date("2026-12-31"),
        },
      ],
    });

    const result = await SemesterResult.create({
      college_id: collegeId,
      student_id: student._id,
      exam_id: new mongoose.Types.ObjectId(),
      course_id: course._id,
      semester,
      academicYear,
      subjects: [
        {
          subject: new mongoose.Types.ObjectId(),
          subjectName: "Sub 1",
          subjectCode: "S1",
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
      course_id: course._id,
      semester,
      academicYear,
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
        percentage: 85,
        requiredPercentage: 75,
        totalSessions: 20,
        status: "ELIGIBLE",
        passed: true,
      },
      fee_clearance_snapshot: {
        status: feePaid ? "FULLY_PAID" : "PENDING",
        totalFee: 24000,
        paidAmount: feePaid ? 24000 : 0,
        pendingAmount: feePaid ? 0 : 24000,
        requiredClearance: true,
        cleared: feePaid,
        passed: feePaid,
      },
      policy_version: "DEFAULT-v1",
      policy_snapshot: {
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        scopedSemesters: [],
        minimumFeePaidPercentage: 100,
      },
      createdBy: new mongoose.Types.ObjectId(),
    });

    return { collegeId, course, student, feeStructure, studentFee, result, decision };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Promote Sem 1 -> Sem 2 (same year) creates no StudentFee
  // ─────────────────────────────────────────────────────────────────────────
  it("TEST 1: Promote Sem 1 -> Sem 2 (same year) creates no StudentFee", async () => {
    const ctx = await setupStudentContext({ semester: 1, academicYear: "2026-2027", feePaid: true });

    const execution = await executePromotion({
      decisionId: ctx.decision._id,
      collegeId: ctx.collegeId,
      actorId: new mongoose.Types.ObjectId(),
      actorRole: "COLLEGE_ADMIN",
      actorName: "Test Admin",
    });

    expect(execution.executionStatus).toBe("PROMOTED");
    expect(execution.newFeeAssigned).toBe(false);
    expect(execution.newStudentFeeId).toBeNull();

    // Exactly 1 StudentFee document exists
    const allFees = await StudentFee.find({ student_id: ctx.student._id });
    expect(allFees).toHaveLength(1);
    expect(allFees[0].totalFee).toBe(24000);
    expect(allFees[0].paidAmount).toBe(24000);

    const activeFee = await getActiveStudentFee(ctx.student._id, ctx.collegeId);
    expect(activeFee._id.toString()).toBe(ctx.studentFee._id.toString());
    expect(activeFee.totalFee).toBe(24000);
    expect(activeFee.paidAmount).toBe(24000);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Promote Year 1 -> Year 2 (new academic year) creates NO new StudentFee
  // ─────────────────────────────────────────────────────────────────────────
  it("TEST 2: Promote Year 1 -> Year 2 (new academic year) creates NO new StudentFee, repeated execution creates nothing", async () => {
    const ctx = await setupStudentContext({ semester: 2, academicYear: "2026-2027", feePaid: true });

    // Promote Sem 2 -> Sem 3 (cross-academic-year)
    const execution = await executePromotion({
      decisionId: ctx.decision._id,
      collegeId: ctx.collegeId,
      actorId: new mongoose.Types.ObjectId(),
      actorRole: "COLLEGE_ADMIN",
      actorName: "Test Admin",
    });

    expect(execution.executionStatus).toBe("PROMOTED");
    expect(execution.newFeeAssigned).toBe(false);
    expect(execution.newStudentFeeId).toBeNull();

    // Exactly 1 StudentFee remains
    const allFees = await StudentFee.find({ student_id: ctx.student._id });
    expect(allFees).toHaveLength(1);
    expect(allFees[0].totalFee).toBe(24000);
    expect(allFees[0].paidAmount).toBe(24000);

    // Repeated execution creates nothing
    const reExecution = await executePromotion({
      decisionId: ctx.decision._id,
      collegeId: ctx.collegeId,
      actorId: new mongoose.Types.ObjectId(),
      actorRole: "COLLEGE_ADMIN",
      actorName: "Test Admin",
    });
    expect(["PROMOTED", "ALREADY_PROMOTED"]).toContain(reExecution.executionStatus);
    const countAfterRetry = await StudentFee.countDocuments({ student_id: ctx.student._id });
    expect(countAfterRetry).toBe(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Student who paid full fee in Sem 1 is Fully Paid in all views
  // ─────────────────────────────────────────────────────────────────────────
  it("TEST 3: Student who paid full fee in Sem 1 is Fully Paid (Rs 0 pending) in student portal, accountant report, Payment History, and fee clearance in later semesters", async () => {
    const ctx = await setupStudentContext({ semester: 1, academicYear: "2026-2027", feePaid: true });

    // Promote Sem 1 -> Sem 2
    await executePromotion({
      decisionId: ctx.decision._id,
      collegeId: ctx.collegeId,
      actorId: new mongoose.Types.ObjectId(),
      actorRole: "COLLEGE_ADMIN",
      actorName: "Test Admin",
    });

    const studentSem2 = await Student.findById(ctx.student._id);
    expect(studentSem2.currentSemester).toBe(2);

    // 1. Student Portal / Active Fee
    const studentFeeView = await getActiveStudentFee(studentSem2._id, ctx.collegeId, { student: studentSem2 });
    expect(studentFeeView.totalFee).toBe(24000);
    expect(studentFeeView.paidAmount).toBe(24000);
    expect(studentFeeView.totalFee - studentFeeView.paidAmount).toBe(0);

    // 2. Accountant Student Specific Report
    const accountantReport = await studentSpecificPaymentHistory(ctx.collegeId, studentSem2._id);
    expect(accountantReport).toHaveLength(1);
    expect(accountantReport[0].totalFee).toBe(24000);
    expect(accountantReport[0].paidAmount).toBe(24000);
    expect(accountantReport[0].pendingAmount).toBe(0);
    expect(accountantReport[0].installments.every((i) => i.status === "PAID")).toBe(true);

    // 3. Payment History / College Payment Report
    let paymentHistoryData = null;
    await getCollegePaymentReport(
      { college_id: ctx.collegeId, query: {} },
      {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((d) => {
          paymentHistoryData = d;
        }),
      },
    );
    expect(paymentHistoryData.totalStudents).toBe(1);
    expect(paymentHistoryData.totalCollected).toBe(24000);
    expect(paymentHistoryData.report[0].totalFee).toBe(24000);
    expect(paymentHistoryData.report[0].paidAmount).toBe(24000);
    expect(paymentHistoryData.report[0].pendingAmount).toBe(0);
    expect(paymentHistoryData.report[0].status).toBe("PAID");

    // 4. Fee clearance check in later semester
    const clearance = await evaluateFeeClearance({
      studentId: studentSem2._id,
      collegeId: ctx.collegeId,
      student: studentSem2,
    });
    expect(clearance.cleared).toBe(true);
    expect(clearance.status).toBe("FULLY_PAID");
    expect(clearance.pendingAmount).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Student with unpaid fee fails fee clearance
  // ─────────────────────────────────────────────────────────────────────────
  it("TEST 4: Student with unpaid fee fails fee clearance", async () => {
    const ctx = await setupStudentContext({ semester: 1, academicYear: "2026-2027", feePaid: false });

    const clearance = await evaluateFeeClearance({
      studentId: ctx.student._id,
      collegeId: ctx.collegeId,
      student: ctx.student,
      minimumFeePaidPercentage: 100,
    });

    expect(clearance.cleared).toBe(false);
    expect(clearance.status).toBe("PENDING");
    expect(clearance.totalFee).toBe(24000);
    expect(clearance.paidAmount).toBe(0);
    expect(clearance.pendingAmount).toBe(24000);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Legacy student with duplicate docs: reader returns original fee and does not sum
  // ─────────────────────────────────────────────────────────────────────────
  it("TEST 5: Legacy student with duplicate docs: reader returns original fee and does not sum", async () => {
    const ctx = await setupStudentContext({ semester: 2, academicYear: "2026-2027", feePaid: true });

    // Insert an erroneous secondary fee doc
    await StudentFee.create({
      college_id: ctx.collegeId,
      student_id: ctx.student._id,
      course_id: ctx.course._id,
      feeStructure_id: ctx.feeStructure._id,
      academicYear: "2026-2027",
      totalFee: 24000,
      paidAmount: 0,
      paymentStatus: "PENDING",
      installments: [
        { name: "Installment 1", amount: 4000, status: "PENDING", dueDate: new Date("2026-11-05") },
        { name: "Installment 2", amount: 20000, status: "PENDING", dueDate: new Date("2026-11-18") },
      ],
    });

    expect(await StudentFee.countDocuments({ student_id: ctx.student._id })).toBe(2);

    // Active fee reader picks original paid fee
    const activeFee = await getActiveStudentFee(ctx.student._id, ctx.collegeId);
    expect(activeFee._id.toString()).toBe(ctx.studentFee._id.toString());
    expect(activeFee.paidAmount).toBe(24000);

    // Accountant student report shows 24,000, NOT 48,000
    const report = await studentSpecificPaymentHistory(ctx.collegeId, ctx.student._id);
    expect(report).toHaveLength(1);
    expect(report[0].totalFee).toBe(24000);
    expect(report[0].paidAmount).toBe(24000);
    expect(report[0].pendingAmount).toBe(0);
    expect(report[0].installments).toHaveLength(2);
    expect(report[0].installments.every((i) => i.status === "PAID")).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: Dashboard totals, defaulter list, payment summaries & past-due simulation
  // ─────────────────────────────────────────────────────────────────────────
  it("TEST 6: Dashboard totals, defaulter list, payment summaries do not double count, and students with paid fee (Anirudha & Jagan) do NOT appear in getDefaulters even when duplicate installments are past due (e.g. simulated after 05-Nov-2026)", async () => {
    const collegeId = new mongoose.Types.ObjectId();
    const department = await createDepartment({ college_id: collegeId });
    const course = await createCourse({ college_id: collegeId, department_id: department._id });

    // Student 1: Anirudha Hole
    const s1 = await setupStudentContext({
      collegeId,
      course,
      fullName: "Anirudha Hole",
      feePaid: true,
    });

    // Student 2: Jagan Kokare
    const s2 = await setupStudentContext({
      collegeId,
      course,
      fullName: "Jagan Kokare",
      feePaid: true,
    });

    // For both students, insert an erroneous duplicate StudentFee with past-due installments (past 05-Nov-2026)
    const pastDueDate = new Date("2025-11-05"); // Guaranteed past date relative to current/future
    for (const ctx of [s1, s2]) {
      await StudentFee.create({
        college_id: collegeId,
        student_id: ctx.student._id,
        course_id: course._id,
        feeStructure_id: ctx.feeStructure._id,
        academicYear: "2026-2027",
        totalFee: 24000,
        paidAmount: 0,
        paymentStatus: "PENDING",
        installments: [
          {
            installmentNumber: 1,
            name: "Installment 1",
            amount: 4000,
            dueDate: pastDueDate,
            status: "PENDING",
          },
          {
            installmentNumber: 2,
            name: "Installment 2",
            amount: 20000,
            dueDate: pastDueDate,
            status: "PENDING",
          },
        ],
      });
    }

    // Total documents in DB is 4 (2 students x 2 docs)
    expect(await StudentFee.countDocuments({ college_id: collegeId })).toBe(4);

    // 1. paymentSummary deduplication check
    const summary = await paymentSummary(collegeId);
    expect(summary.totalExpectedFee).toBe(48000); // 24k x 2, NOT 96,000
    expect(summary.totalCollected).toBe(48000); // fully paid
    expect(summary.totalPending).toBe(0);

    // 2. getDashboard check
    let dashboardData = null;
    await getDashboard(
      { college_id: collegeId, user: { college_id: collegeId }, query: {} },
      {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((resObj) => {
          dashboardData = resObj.data || resObj;
        }),
      },
      (err) => {
        throw err;
      },
    );

    expect(dashboardData).toBeDefined();
    expect(dashboardData.totalStudents).toBe(2); // distinct student count
    expect(dashboardData.totalFees).toBe(48000); // NOT 96,000
    expect(dashboardData.totalCollected).toBe(48000);
    expect(dashboardData.pendingAmount).toBe(0);
    expect(dashboardData.overdueInstallments).toBe(0); // neither is overdue
    expect(dashboardData.criticalOverdueCount).toBe(0);
    expect(dashboardData.totalDefaulters).toBe(0);

    // 3. getDefaulters check (crucial test for Anirudha & Jagan)
    let defaultersData = null;
    await getDefaulters(
      { college_id: collegeId, query: {} },
      {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((resObj) => {
          defaultersData = resObj.defaulters || resObj.data || resObj;
        }),
      },
      (err) => {
        throw err;
      },
    );

    expect(defaultersData).toBeDefined();
    // Neither Anirudha nor Jagan should appear as defaulters!
    expect(defaultersData).toHaveLength(0);
  });
});
