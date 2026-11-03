const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const { createDepartment, createCourse, createStudent } = require("../helpers/factories");

const Student = require("../../src/models/student.model");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const AlumniPolicy = require("../../src/models/alumniPolicy.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const StudentFee = require("../../src/models/studentFee.model");
const AttendanceSession = require("../../src/models/attendanceSession.model");
const AttendanceRecord = require("../../src/models/attendanceRecord.model");
const Backlog = require("../../src/models/backlog.model");
const FeeStructure = require("../../src/models/feeStructure.model");

const {
  getAttendanceDataForStudents,
  checkOrphanAttendanceSessions,
} = require("../../src/services/attendance.service");
const {
  createPromotionDecision,
} = require("../../src/services/promotionDecision.service");
const {
  checkAlumniEligibility,
} = require("../../src/services/alumniEligibility.service");

let collegeId;
let course;
let department;
let student;

beforeAll(async () => {
  await connectTestDb();

  collegeId = new mongoose.Types.ObjectId();
  department = await createDepartment({
    college_id: collegeId,
    name: "Computer Science",
    code: "CS",
  });

  course = await createCourse({
    college_id: collegeId,
    department_id: department._id,
    name: "B.Tech Computer Science",
    code: "BTCS",
    durationSemesters: 8,
  });

  student = await createStudent({
    college_id: collegeId,
    course_id: course._id,
    department_id: department._id,
    fullName: "Test Performance Student",
    email: "perf.student@college.edu",
    enrollmentNumber: "EN-PERF-01",
    rollNumber: "ROLL-PERF-01",
    currentSemester: 8,
    currentAcademicYear: "2026-2027",
    status: "APPROVED",
  });

  await PromotionPolicy.create({
    collegeId,
    course_id: course._id,
    isActive: true,
    minAttendancePercentage: 75,
    maxAllowedKTs: 3,
    minimumFeePaidPercentage: 100,
  });

  await AlumniPolicy.create({
    college_id: collegeId,
    course_id: course._id,
    isActive: true,
    enabled: true,
    requireFinalSemester: true,
    attendanceRule: { enabled: true, minimumPercentage: 75, allowCumulativeFallback: true },
    feeRule: { enabled: true, minimumPaidPercentage: 100 },
    backlogRule: { requirePreviousYearClearance: true, allowCurrentBacklog: false },
    resultRule: { requiredOutcome: "PASS" },
  });

  await StudentFee.create({
    college_id: collegeId,
    student_id: student._id,
    course_id: course._id,
    totalFee: 50000,
    paidAmount: 50000,
  });
});

afterAll(async () => {
  await closeTestDb();
});

describe("Phase 1: Attendance Aggregation Optimizations", () => {
  it("early exits with zero stats when no attendance sessions exist", async () => {
    const data = await getAttendanceDataForStudents([student], collegeId);
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      student_id: student._id,
      percentage: 0,
      totalSessions: 0,
      presentSessions: 0,
    });
  });

  it("diagnostic orphan check function is safely available", async () => {
    const orphans = await checkOrphanAttendanceSessions(collegeId, [course._id]);
    expect(Array.isArray(orphans)).toBe(true);
  });
});

describe("Phase 2: Index Definitions in Schemas", () => {
  it("verifies required indexes are registered in Mongoose schemas", () => {
    const attRecIndexes = AttendanceRecord.schema.indexes().map((idx) => Object.keys(idx[0]).join(","));
    expect(attRecIndexes).toContain("college_id,session_id,student_id,status");

    const attSessIndexes = AttendanceSession.schema.indexes().map((idx) => Object.keys(idx[0]).join(","));
    expect(attSessIndexes).toContain("college_id,course_id,status,slot_id");

    const semResIndexes = SemesterResult.schema.indexes().map((idx) => Object.keys(idx[0]).join(","));
    expect(semResIndexes).toContain("college_id,student_id,course_id,semester,status");

    const backlogIndexes = Backlog.schema.indexes().map((idx) => Object.keys(idx[0]).join(","));
    expect(backlogIndexes).toContain("college_id,student_id,academicYear,status");

    const studentIndexes = Student.schema.indexes().map((idx) => Object.keys(idx[0]).join(","));
    expect(studentIndexes).toContain("college_id,status,currentSemester,fullName");

    const feeStructIndexes = FeeStructure.schema.indexes().map((idx) => Object.keys(idx[0]).join(","));
    expect(feeStructIndexes).toContain("college_id,course_id,category,academicYear");
  });
});

describe("Phase 3: Parallelized Checks Integrity", () => {
  it("correctly evaluates createPromotionDecision with parallelized checks", async () => {
    const decision = await createPromotionDecision({
      studentId: student._id,
      collegeId,
      userId: student._id,
    });

    expect(decision).toBeDefined();
    expect(decision.result_status).toBe("NO_RESULT");
    expect(decision.promotion_outcome).toBe("NO_RESULT");
    expect(decision.fee_clearance_snapshot.status).toBe("FULLY_PAID");
    expect(decision.attendance_snapshot.totalSessions).toBe(0);
  });

  it("correctly evaluates checkAlumniEligibility with parallelized checks", async () => {
    const alumni = await checkAlumniEligibility(student._id, collegeId);

    expect(alumni).toBeDefined();
    expect(alumni.eligible).toBe(false);
    expect(alumni.checks.finalSemester.passed).toBe(true);
    expect(alumni.checks.fee.passed).toBe(true);
    expect(alumni.checks.result.passed).toBe(false);
    expect(alumni.blockers.some((b) => b.code === "NO_RESULT")).toBe(true);
  });
});
