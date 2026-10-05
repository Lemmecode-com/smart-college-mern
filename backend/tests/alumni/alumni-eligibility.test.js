const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

jest.mock("../../src/services/attendance.service", () => ({
  getAttendanceDataForStudents: jest.fn(),
}));

const {
  getAttendanceDataForStudents,
} = require("../../src/services/attendance.service");

const {
  createCollege,
  createDepartment,
  createCourse,
  createStudent,
} = require("../helpers/factories");

const AlumniPolicy = require("../../src/models/alumniPolicy.model");
const Student = require("../../src/models/student.model");
const Course = require("../../src/models/course.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const StudentFee = require("../../src/models/studentFee.model");
const Backlog = require("../../src/models/backlog.model");
const Exam = require("../../src/models/exam.model");

const {
  checkAlumniEligibility,
} = require("../../src/services/alumniEligibility.service");
const {
  moveToAlumni,
} = require("../../src/controllers/student.controller");

describe("Alumni Settings & Eligibility Matrix", () => {
  beforeAll(connectTestDb);
  afterAll(closeTestDb);

  let collegeId;
  let collegeId2;
  let dept;
  let dept2;
  let course;
  let courseOtherCollege;

  beforeEach(async () => {
    await clearTestDb();

    const ts = Date.now() + Math.floor(Math.random() * 10000);
    const college1 = await createCollege({ code: `COL1_${ts}`, email: `col1_${ts}@test.com` });
    const college2 = await createCollege({ code: `COL2_${ts}`, email: `col2_${ts}@test.com` });
    collegeId = college1._id;
    collegeId2 = college2._id;

    dept = await createDepartment({ college_id: collegeId, code: `D1_${ts}`, createdBy: new mongoose.Types.ObjectId() });
    dept2 = await createDepartment({ college_id: collegeId2, code: `D2_${ts}`, createdBy: new mongoose.Types.ObjectId() });

    course = await createCourse({
      college_id: collegeId,
      department_id: dept._id,
      name: "Computer Engineering",
      code: "CE",
      durationSemesters: 4,
    });

    courseOtherCollege = await createCourse({
      college_id: collegeId2,
      department_id: dept2._id,
      name: "Mechanical Engineering",
      code: "ME",
      durationSemesters: 4,
    });

    // Default good attendance mock
    getAttendanceDataForStudents.mockResolvedValue([
      { percentage: 85, totalSessions: 20, status: "ELIGIBLE" },
    ]);
  });

  const createTestStudent = async (overrides = {}) => {
    return await createStudent({
      college_id: collegeId,
      department_id: dept._id,
      course_id: course._id,
      fullName: "Test Final Student",
      email: `student_${Date.now()}_${Math.random()}@test.com`,
      currentSemester: 4,
      currentAcademicYear: "2027-2028",
      status: "APPROVED",
      ...overrides,
    });
  };

  const createPublishedResult = async (student, overrides = {}) => {
    const exam = await Exam.create({
      college_id: student.college_id,
      course_id: student.course_id,
      name: "Sem 4 Final Exam",
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      status: "PUBLISHED",
      createdBy: new mongoose.Types.ObjectId(),
    });

    return await SemesterResult.create({
      college_id: student.college_id,
      student_id: student._id,
      course_id: student.course_id,
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      exam_id: exam._id,
      status: "PUBLISHED",
      overallResult: "PASS",
      totalSubjects: 4,
      passedSubjects: 4,
      failedSubjects: 0,
      incompleteSubjects: 0,
      createdBy: new mongoose.Types.ObjectId(),
      ...overrides,
    });
  };

  const createFeeRecord = async (student, overrides = {}) => {
    return await StudentFee.create({
      college_id: student.college_id,
      student_id: student._id,
      course_id: student.course_id,
      totalFee: 10000,
      paidAmount: 10000,
      status: "PAID",
      ...overrides,
    });
  };

  const createBacklogRecord = async (student, overrides = {}) => {
    return await Backlog.create({
      college_id: student.college_id,
      student_id: student._id,
      course_id: student.course_id,
      semester: overrides.semester || 1,
      academicYear: overrides.academicYear || "2026-2027",
      original_exam_id: new mongoose.Types.ObjectId(),
      original_result_id: new mongoose.Types.ObjectId(),
      subject_id: new mongoose.Types.ObjectId(),
      original_marks_snapshot: { marks: 20 },
      status: "OPEN",
      ...overrides,
    });
  };

  const createPolicy = async (overrides = {}) => {
    return await AlumniPolicy.create({
      college_id: collegeId,
      course_id: course._id,
      enabled: true,
      requireFinalSemester: true,
      resultRule: {
        requirePublished: true,
        requiredOutcome: "PASS",
      },
      attendanceRule: {
        enabled: true,
        minimumPercentage: 75,
      },
      feeRule: {
        enabled: true,
        minimumPaidPercentage: 100,
      },
      backlogRule: {
        requirePreviousYearClearance: true,
        allowCurrentBacklog: false,
      },
      version: 1,
      isActive: true,
      ...overrides,
    });
  };

  // 1. Final semester + PUBLISHED + PASS + all requirements passed -> ELIGIBLE
  it("1. Final semester + PUBLISHED + PASS + all requirements passed -> ELIGIBLE", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createPublishedResult(student);
    await createFeeRecord(student);

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(true);
    expect(res.status).toBe("ELIGIBLE");
    expect(res.blockers).toHaveLength(0);
    expect(res.checks.result.passed).toBe(true);
    expect(res.checks.result.status).toBe("PUBLISHED");
    expect(res.checks.attendance.passed).toBe(true);
    expect(res.checks.fee.passed).toBe(true);
    expect(res.checks.backlog.passed).toBe(true);
  });

  // 2. Non-final semester -> NOT_FINAL_SEMESTER
  it("2. Non-final semester -> NOT_FINAL_SEMESTER", async () => {
    await createPolicy();
    const student = await createTestStudent({ currentSemester: 3 }); // Duration is 4
    await createPublishedResult(student);
    await createFeeRecord(student);

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "NOT_FINAL_SEMESTER")).toBe(true);
  });

  // 3. Alumni transition disabled by policy -> ALUMNI_DISABLED
  it("3. Alumni transition disabled -> ALUMNI_DISABLED", async () => {
    await createPolicy({ enabled: false });
    const student = await createTestStudent();

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.status).toBe("ALUMNI_DISABLED");
    expect(res.blockers.some((b) => b.code === "ALUMNI_DISABLED")).toBe(true);
  });

  // 4. No published final result -> NO_RESULT
  it("4. No published final result -> NO_RESULT", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createFeeRecord(student);
    // No SemesterResult created

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "NO_RESULT")).toBe(true);
  });

  // 5. Incomplete result -> INCOMPLETE_RESULT
  it("5. Incomplete result -> INCOMPLETE_RESULT", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createPublishedResult(student, { overallResult: "INCOMPLETE", incompleteSubjects: 1 });
    await createFeeRecord(student);

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "INCOMPLETE_RESULT")).toBe(true);
  });

  // 6. FAIL result -> RESULT_FAIL
  it("6. FAIL result -> RESULT_FAIL", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createPublishedResult(student, { overallResult: "FAIL", failedSubjects: 3 });
    await createFeeRecord(student);

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "RESULT_FAIL")).toBe(true);
  });

  // 7. ATKT result (uncleared subjects) -> RESULT_ATKT
  it("7. ATKT result -> RESULT_ATKT", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createPublishedResult(student, { overallResult: "PASS", failedSubjects: 1 });
    await createFeeRecord(student);

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "RESULT_ATKT")).toBe(true);
  });

  // 8. Multiple published results -> AMBIGUOUS_RESULT
  it("8. Multiple published results -> AMBIGUOUS_RESULT", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createPublishedResult(student);
    // Create second published result for same context
    await createPublishedResult(student);
    await createFeeRecord(student);

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "AMBIGUOUS_RESULT")).toBe(true);
  });

  // 9. Attendance below configured threshold -> ATTENDANCE_REQUIREMENT
  it("9. Attendance below configured threshold -> ATTENDANCE_REQUIREMENT", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createPublishedResult(student);
    await createFeeRecord(student);

    // Mock low attendance
    getAttendanceDataForStudents.mockResolvedValueOnce([
      { percentage: 65, totalSessions: 20, status: "NOT_ELIGIBLE" },
    ]);

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "ATTENDANCE_REQUIREMENT")).toBe(true);
  });

  // 10. Fee below configured threshold -> FEE_REQUIREMENT
  it("10. Fee below configured threshold -> FEE_REQUIREMENT", async () => {
    await createPolicy();
    const student = await createTestStudent();
    await createPublishedResult(student);
    await createFeeRecord(student, { totalFee: 10000, paidAmount: 8000 }); // 80% paid vs 100% required

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "FEE_REQUIREMENT")).toBe(true);
  });

  // 11. Previous backlog not cleared -> PREVIOUS_BACKLOG_NOT_CLEARED
  it("11. Previous backlog not cleared -> PREVIOUS_BACKLOG_NOT_CLEARED", async () => {
    await createPolicy();
    const student = await createTestStudent({ currentAcademicYear: "2027-2028" });
    await createPublishedResult(student);
    await createFeeRecord(student);

    // Create an uncleared backlog in previous academic year "2026-2027"
    await createBacklogRecord(student, {
      semester: 2,
      academicYear: "2026-2027",
      status: "OPEN",
    });

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "PREVIOUS_BACKLOG_NOT_CLEARED")).toBe(true);
  });

  // 12. Current backlog when current backlog is not allowed -> CURRENT_BACKLOG_NOT_ALLOWED
  it("12. Current backlog when current backlog is not allowed -> CURRENT_BACKLOG_NOT_ALLOWED", async () => {
    await createPolicy({
      backlogRule: { requirePreviousYearClearance: false, allowCurrentBacklog: false },
    });
    const student = await createTestStudent();
    await createPublishedResult(student);
    await createFeeRecord(student);

    await createBacklogRecord(student, {
      semester: 4,
      academicYear: student.currentAcademicYear,
      status: "OPEN",
    });

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "CURRENT_BACKLOG_NOT_ALLOWED")).toBe(true);
  });

  // 13. Policy disabled -> ALUMNI_DISABLED
  it("13. Policy disabled -> ALUMNI_DISABLED", async () => {
    await createPolicy({ enabled: false });
    const student = await createTestStudent();

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.status).toBe("ALUMNI_DISABLED");
  });

  // 14. Missing policy -> CONFIGURATION_REQUIRED
  it("14. Missing policy -> CONFIGURATION_REQUIRED", async () => {
    // No policy created at all
    const student = await createTestStudent();

    const res = await checkAlumniEligibility(student._id, collegeId);

    expect(res.eligible).toBe(false);
    expect(res.status).toBe("CONFIGURATION_REQUIRED");
    expect(res.blockers.some((b) => b.code === "CONFIGURATION_REQUIRED")).toBe(true);
  });

  // 15. Cross-college access -> rejected (404 STUDENT_NOT_FOUND)
  it("15. Cross-college access -> rejected (404 STUDENT_NOT_FOUND)", async () => {
    await createPolicy();
    const student = await createTestStudent();

    await expect(
      checkAlumniEligibility(student._id, collegeId2)
    ).rejects.toThrow("Student not found or does not belong to your college");
  });

  // 16. Course from another college -> rejected (COURSE_NOT_FOUND)
  it("16. Course from another college -> rejected (COURSE_NOT_FOUND)", async () => {
    const studentWithOtherCourse = await createTestStudent({
      college_id: collegeId,
      department_id: dept._id,
      course_id: courseOtherCollege._id, // Belongs to collegeId2
      fullName: "Student Bad Course",
      email: "bad_course@test.com",
      currentSemester: 4,
      currentAcademicYear: "2027-2028",
      status: "APPROVED",
    });

    await expect(
      checkAlumniEligibility(studentWithOtherCourse._id, collegeId)
    ).rejects.toThrow("Course not found or does not belong to your college");
  });

  // 17. Policy update changes eligibility -> latest policy is used
  it("17. Policy update changes eligibility -> latest policy is used", async () => {
    const policy = await createPolicy({ feeRule: { enabled: true, minimumPaidPercentage: 100 } });
    const student = await createTestStudent();
    await createPublishedResult(student);
    await createFeeRecord(student, { totalFee: 10000, paidAmount: 8000 }); // 80%

    // First check: ineligible due to 80% paid
    let res = await checkAlumniEligibility(student._id, collegeId);
    expect(res.eligible).toBe(false);
    expect(res.blockers.some((b) => b.code === "FEE_REQUIREMENT")).toBe(true);

    // Update policy to require only 75% fee
    policy.feeRule.minimumPaidPercentage = 75;
    policy.version = 2;
    await policy.save();

    // Second check: now eligible!
    res = await checkAlumniEligibility(student._id, collegeId);
    expect(res.eligible).toBe(true);
    expect(res.status).toBe("ELIGIBLE");
  });

  // 18. Move-to-Alumni endpoint revalidates eligibility -> stale/ineligible student cannot be moved (409 ALUMNI_ELIGIBILITY_FAILED)
  it("18. Move-to-Alumni endpoint revalidates eligibility -> stale/ineligible student cannot be moved (409 ALUMNI_ELIGIBILITY_FAILED)", async () => {
    await createPolicy();
    const student = await createTestStudent();
    // Do NOT create result -> student is ineligible

    const req = {
      params: { studentId: student._id.toString() },
      body: { graduationYear: 2028 },
      college_id: collegeId,
      user: { id: new mongoose.Types.ObjectId() },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    let thrownError = null;
    const next = (err) => {
      thrownError = err;
    };

    await moveToAlumni(req, res, next);

    expect(thrownError).toBeTruthy();
    expect(thrownError.statusCode).toBe(409);
    expect(thrownError.code).toBe("ALUMNI_ELIGIBILITY_FAILED");
  });
});
