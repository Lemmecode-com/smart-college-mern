const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const PromotionDecision = require("../../src/models/promotionDecision.model");
const PromotionHistory = require("../../src/models/promotionHistory.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const AttendanceSession = require("../../src/models/attendanceSession.model");
const AttendanceRecord = require("../../src/models/attendanceRecord.model");
const Timetable = require("../../src/models/timetable.model");
const TimetableSlot = require("../../src/models/timetableSlot.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const { createStudent, createSubject } = require("../helpers/factories");
const {
  calculatePromotionDecision,
  calculateFeeClearanceData,
  evaluateAttendanceData,
  createPromotionDecision,
} = require("../../src/services/promotionDecision.service");

describe("Step 3 - promotion decision eligibility engine", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const policy = {
    snapshot: {
      minAttendancePercentage: 75,
      maxAllowedKTs: 3,
      scopedSemesters: [],
    },
  };

  const attendance = (passed = true) => ({
    percentage: passed ? 80 : 74,
    requiredPercentage: 75,
    totalSessions: 10,
    status: passed ? "ELIGIBLE" : "NOT_ELIGIBLE",
    passed,
    overridden: false,
    overrideReason: null,
  });

  const fee = (passed = true) => ({
    status: passed ? "FULLY_PAID" : "PENDING",
    totalFee: 1000,
    paidAmount: passed ? 1000 : 0,
    pendingAmount: passed ? 0 : 1000,
    requiredClearance: true,
    cleared: passed,
    passed,
    overridden: false,
  });

  const result = (overallResult, statuses = []) => ({
    _id: new mongoose.Types.ObjectId(),
    exam_id: new mongoose.Types.ObjectId(),
    status: "PUBLISHED",
    overallResult,
    subjects: statuses.map((status) => ({
      subject: new mongoose.Types.ObjectId(),
      status,
    })),
  });

  const found = (semesterResult) => ({
    status: "FOUND",
    result: semesterResult,
  });

  // calculatePromotionDecision is async because previous-year clearance
  // requires a Backlog lookup, so every caller must await it.
  const decide = async (
    overallResult,
    statuses,
    attendanceData = attendance(),
    feeData = fee(),
    customPolicy = policy,
  ) =>
    calculatePromotionDecision({
      authoritativeResult: found(result(overallResult, statuses)),
      policy: customPolicy,
      attendance: attendanceData,
      feeClearance: feeData,
    });

  describe("result and KT outcomes", () => {
    it("returns PASS when the published result, attendance, and fee are clear", async () => {
      const decision = await decide("PASS", ["PASS"]);

      expect(decision.promotionOutcome).toBe("PASS");
      expect(decision.decisionReason).toBe("ELIGIBLE");
      expect(decision.ktCount).toBe(0);
    });

    it.each([
      [1, "ATKT"],
      [2, "ATKT"],
      [3, "ATKT"],
    ])("returns ATKT for FAIL with %i KT", async (ktCount, expectedOutcome) => {
      const decision = await decide("FAIL", Array(ktCount).fill("FAIL"));

      expect(decision.promotionOutcome).toBe(expectedOutcome);
      expect(decision.ktCount).toBe(ktCount);
      expect(decision.failedSubjectCount).toBe(ktCount);
      expect(decision.failedSubjectIds).toHaveLength(ktCount);
    });

    it("blocks FAIL with 4 KT", async () => {
      const decision = await decide("FAIL", ["FAIL", "FAIL", "FAIL", "FAIL"]);

      expect(decision.promotionOutcome).toBe("BLOCKED");
      expect(decision.decisionReason).toBe("KT_LIMIT_EXCEEDED");
      expect(decision.ktCount).toBe(4);
    });

    it("returns INCOMPLETE and does not count INCOMPLETE as KT", async () => {
      const decision = await decide("INCOMPLETE", ["FAIL", "INCOMPLETE"]);

      expect(decision.promotionOutcome).toBe("INCOMPLETE");
      expect(decision.decisionReason).toBe("RESULT_INCOMPLETE");
      expect(decision.ktCount).toBe(1);
    });

    it.each([
      ["NO_RESULT", "NO_RESULT"],
      ["AMBIGUOUS_RESULT", "AMBIGUOUS_RESULT"],
    ])(
      "returns %s without making an academic decision",
      async (authorityStatus, outcome) => {
        const decision = await calculatePromotionDecision({
          authoritativeResult: { status: authorityStatus },
          policy,
          attendance: attendance(),
          feeClearance: fee(),
        });

        expect(decision.promotionOutcome).toBe(outcome);
        expect(decision.sourceResultId).toBeNull();
        expect(decision.ktCount).toBe(0);
      },
    );
  });

  describe("attendance and fee evaluation", () => {
    it.each([
      [76, true],
      [75, true],
      [74, false],
    ])(
      "evaluates %i%% attendance as passed=%s",
      (percentage, expectedPassed) => {
        const evaluated = evaluateAttendanceData({
          attendanceData: { percentage, totalSessions: 100 },
          requiredPercentage: 75,
        });

        expect(evaluated.passed).toBe(expectedPassed);
      },
    );

    it("evaluates cleared fees", () => {
      expect(
        calculateFeeClearanceData({ totalFee: 100, paidAmount: 100 }),
      ).toMatchObject({
        status: "FULLY_PAID",
        cleared: true,
        passed: true,
      });
    });

    it("evaluates uncleared fees", () => {
      expect(
        calculateFeeClearanceData({ totalFee: 100, paidAmount: 0 }),
      ).toMatchObject({
        status: "PENDING",
        cleared: false,
        passed: false,
      });
    });

    it("blocks ATKT when attendance fails", async () => {
      const decision = await decide("FAIL", ["FAIL"], attendance(false), fee());

      expect(decision.promotionOutcome).toBe("BLOCKED");
      expect(decision.decisionReason).toBe("ATTENDANCE_INSUFFICIENT");
    });

    it("blocks ATKT when fees are not cleared", async () => {
      const decision = await decide("FAIL", ["FAIL"], attendance(), fee(false));

      expect(decision.promotionOutcome).toBe("BLOCKED");
      expect(decision.decisionReason).toBe("FEE_NOT_CLEARED");
    });

    describe("attendance 0% threshold and availability handling (RCA-3)", () => {
      const zeroAttendancePolicy = {
        snapshot: {
          minAttendancePercentage: 0,
          maxAllowedKTs: 3,
          scopedSemesters: [],
        },
      };

      it("Test 1: 0% requirement + no attendance data (totalSessions = 0) passes attendance and yields PASS", async () => {
        const evaluatedAttendance = evaluateAttendanceData({
          attendanceData: { totalSessions: 0, percentage: 0 },
          requiredPercentage: 0,
        });
        expect(evaluatedAttendance.status).toBe("ELIGIBLE");
        expect(evaluatedAttendance.passed).toBe(true);

        const decision = await decide(
          "PASS",
          ["PASS"],
          evaluatedAttendance,
          fee(true),
          zeroAttendancePolicy,
        );
        expect(decision.attendanceSnapshot.passed).toBe(true);
        expect(decision.promotionOutcome).toBe("PASS");
        expect(decision.decisionReason).toBe("ELIGIBLE");
      });

      it("Test 2: 0% requirement + attendance exists (totalSessions > 0, 0% attendance) passes attendance", () => {
        const evaluated = evaluateAttendanceData({
          attendanceData: { totalSessions: 10, percentage: 0 },
          requiredPercentage: 0,
        });
        expect(evaluated.status).toBe("ELIGIBLE");
        expect(evaluated.passed).toBe(true);
      });

      it("Test 3: 75% requirement + no attendance data (totalSessions = 0) blocks promotion with ATTENDANCE_NOT_AVAILABLE", async () => {
        const evaluated = evaluateAttendanceData({
          attendanceData: { totalSessions: 0, percentage: 0 },
          requiredPercentage: 75,
        });
        expect(evaluated.status).toBe("ATTENDANCE_NOT_AVAILABLE");
        expect(evaluated.passed).toBe(false);

        const decision = await decide("PASS", ["PASS"], evaluated, fee(true), policy);
        expect(decision.promotionOutcome).toBe("BLOCKED");
        expect(decision.decisionReason).toBe("ATTENDANCE_NOT_AVAILABLE");
      });

      it("Test 4: 75% requirement + insufficient attendance (60%) blocks promotion with ATTENDANCE_INSUFFICIENT", async () => {
        const evaluated = evaluateAttendanceData({
          attendanceData: { totalSessions: 10, percentage: 60 },
          requiredPercentage: 75,
        });
        expect(evaluated.status).toBe("NOT_ELIGIBLE");
        expect(evaluated.passed).toBe(false);

        const decision = await decide("PASS", ["PASS"], evaluated, fee(true), policy);
        expect(decision.promotionOutcome).toBe("BLOCKED");
        expect(decision.decisionReason).toBe("ATTENDANCE_INSUFFICIENT");
      });

      it("Test 5: 75% requirement + sufficient attendance (80%) passes attendance", () => {
        const evaluated = evaluateAttendanceData({
          attendanceData: { totalSessions: 10, percentage: 80 },
          requiredPercentage: 75,
        });
        expect(evaluated.status).toBe("ELIGIBLE");
        expect(evaluated.passed).toBe(true);
      });

      it("Test 6: Other blocker remains active when attendance is 0% (fee fails)", async () => {
        const evaluated = evaluateAttendanceData({
          attendanceData: { totalSessions: 0, percentage: 0 },
          requiredPercentage: 0,
        });
        const decision = await decide(
          "PASS",
          ["PASS"],
          evaluated,
          fee(false),
          zeroAttendancePolicy,
        );
        expect(decision.attendanceSnapshot.passed).toBe(true);
        expect(decision.feeClearanceSnapshot.passed).toBe(false);
        expect(decision.promotionOutcome).toBe("BLOCKED");
        expect(decision.decisionReason).toBe("FEE_NOT_CLEARED");
      });

      it("Test 7: Result remains PASS in decision snapshot even when blocked by fee/attendance", async () => {
        const blockedDecision = await decide(
          "PASS",
          ["PASS"],
          attendance(),
          fee(false),
        );
        expect(blockedDecision.resultStatus).toBe("PUBLISHED");
        expect(blockedDecision.failedSubjectCount).toBe(0);
        expect(blockedDecision.ktCount).toBe(0);
        expect(blockedDecision.promotionOutcome).toBe("BLOCKED");
        expect(blockedDecision.decisionReason).toBe("FEE_NOT_CLEARED");
      });
    });
  });

  describe("persistence and safety", () => {
    it("persists a policy/result snapshot idempotently without promotion side effects", async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const departmentId = new mongoose.Types.ObjectId();
      const student = await createStudent({
        college_id: collegeId,
        course_id: courseId,
        department_id: departmentId,
        currentSemester: 3,
        currentAcademicYear: "2026-27",
        email: `step3-${Date.now()}@example.com`,
      });
      // A real Subject must exist because createPromotionDecision populates
      // failed_subject_ids; populate drops references with no matching document.
      const subject = await createSubject({
        college_id: collegeId,
        department_id: departmentId,
        course_id: courseId,
        name: "Step3 Subject",
        code: `S3-${Date.now()}`,
        semester: 3,
      });
      const subjectId = subject._id;
      const resultDocument = await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: courseId,
        semester: 3,
        academicYear: "2026-27",
        subjects: [
          {
            subject: subjectId,
            passed: false,
            status: "FAIL",
            marksRecorded: true,
          },
        ],
        totalSubjects: 1,
        passedSubjects: 0,
        failedSubjects: 1,
        incompleteSubjects: 0,
        overallResult: "FAIL",
        status: "PUBLISHED",
        createdBy: new mongoose.Types.ObjectId(),
      });
      const policyDocument = await PromotionPolicy.create({ collegeId });
      const userId = new mongoose.Types.ObjectId();

      const first = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId,
      });
      const second = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId,
      });

      expect(String(first._id)).toBe(String(second._id));
      expect(String(first.source_result_id)).toBe(String(resultDocument._id));
      expect(first.promotion_outcome).toBe("BLOCKED");
      // createPromotionDecision populates failed_subject_ids, so compare ids.
      expect(first.failed_subject_ids.map((s) => String(s._id))).toEqual([
        String(subjectId),
      ]);
      expect(first.policy_snapshot.maxAllowedKTs).toBe(3);
      expect(String(first.policy_id)).toBe(String(policyDocument._id));
      expect((await Student.findById(student._id)).currentSemester).toBe(3);
      expect(
        await PromotionDecision.countDocuments({ student_id: student._id }),
      ).toBe(1);
      expect(
        await PromotionHistory.countDocuments({ student_id: student._id }),
      ).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // RCA-1 — academic-year format mismatch in result authority
  //
  // Student.currentAcademicYear = "2026-2027" (full)
  // SemesterResult.academicYear  = "2026-27"   (short)
  //
  // Before the fix the exact-match query returned NO_RESULT, so
  // source_result_id was null. After the fix the formats are normalised and
  // the actual PUBLISHED result is resolved.
  // -------------------------------------------------------------------------

  describe("RCA-1 - cross-format academic year resolution", () => {
    it("resolves PUBLISHED result when student AY is full and result AY is short", async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const departmentId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const student = await createStudent({
        college_id: collegeId,
        course_id: courseId,
        department_id: departmentId,
        currentSemester: 1,
        currentAcademicYear: "2026-2027",
        email: `rca1-${Date.now()}@example.com`,
      });

      const resultDocument = await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: courseId,
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        status: "PUBLISHED",
        createdBy: userId,
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId,
      });

      expect(String(decision.source_result_id)).toBe(String(resultDocument._id));
      expect(decision.result_status).toBe("PUBLISHED");
      expect(decision.promotion_outcome).toBe("INCOMPLETE");
      expect(decision.decision_reason).toBe("RESULT_INCOMPLETE");
    });

    it("resolves PUBLISHED result when student AY is short and result AY is full", async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const departmentId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const student = await createStudent({
        college_id: collegeId,
        course_id: courseId,
        department_id: departmentId,
        currentSemester: 1,
        currentAcademicYear: "2026-27",
        email: `rca1b-${Date.now()}@example.com`,
      });

      const resultDocument = await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: courseId,
        semester: 1,
        academicYear: "2026-2027",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        status: "PUBLISHED",
        createdBy: userId,
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId,
      });

      expect(String(decision.source_result_id)).toBe(String(resultDocument._id));
      expect(decision.result_status).toBe("PUBLISHED");
    });

    it("returns NO_RESULT when no PUBLISHED result exists for the student AY", async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const departmentId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const student = await createStudent({
        college_id: collegeId,
        course_id: courseId,
        department_id: departmentId,
        currentSemester: 1,
        currentAcademicYear: "2026-2027",
        email: `rca1c-${Date.now()}@example.com`,
      });

      // Only a DRAFT result exists — must not be authoritative
      await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: courseId,
        semester: 1,
        academicYear: "2026-27",
        subjects: [],
        totalSubjects: 0,
        passedSubjects: 0,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "INCOMPLETE",
        status: "DRAFT",
        createdBy: userId,
      });

      const decision = await createPromotionDecision({
        studentId: student._id,
        collegeId,
        userId,
      });

      expect(decision.source_result_id).toBeNull();
      expect(decision.result_status).toBe("NO_RESULT");
      expect(decision.promotion_outcome).toBe("NO_RESULT");
    });
  });

  // -------------------------------------------------------------------------
  // RCA-2 — stale attendance snapshot on existing PromotionDecision
  //
  // createPromotionDecision() previously returned a cached record immediately
  // when one already existed, so the attendance_snapshot never refreshed even
  // after new sessions/records were added.  These tests verify that the
  // snapshot is refreshed on subsequent calls while idempotency and tenant
  // isolation are preserved.
  // --------------------------------------------------------------------------

  describe("RCA-2 - stale attendance snapshot on existing decision", () => {
    const ACADEMIC_YEAR = "2026-2027";

    const buildBaseContext = async () => {
      const collegeId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const departmentId = new mongoose.Types.ObjectId();
      const subjectId = new mongoose.Types.ObjectId();
      const teacherId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const createdBy = new mongoose.Types.ObjectId();

      const student = await createStudent({
        college_id: collegeId,
        course_id: courseId,
        department_id: departmentId,
        currentSemester: 3,
        currentAcademicYear: ACADEMIC_YEAR,
        email: `rca2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
      });

      await SemesterResult.create({
        college_id: collegeId,
        student_id: student._id,
        exam_id: new mongoose.Types.ObjectId(),
        course_id: courseId,
        semester: 3,
        academicYear: "2026-27",
        subjects: [
          { subject: subjectId, passed: true, status: "PASS", marksRecorded: true },
        ],
        totalSubjects: 1,
        passedSubjects: 1,
        failedSubjects: 0,
        incompleteSubjects: 0,
        overallResult: "PASS",
        status: "PUBLISHED",
        createdBy,
      });

      await PromotionPolicy.create({
        collegeId,
        minAttendancePercentage: 75,
        maxAllowedKTs: 3,
        isActive: true,
      });

      await StudentFee.create({
        student_id: student._id,
        college_id: collegeId,
        course_id: courseId,
        totalFee: 1000,
        paidAmount: 1000,
        installments: [],
      });

      const timetable = await Timetable.create({
        college_id: collegeId,
        department_id: departmentId,
        course_id: courseId,
        semester: 3,
        academicYear: ACADEMIC_YEAR,
        name: "Test Timetable",
        status: "PUBLISHED",
        createdBy,
      });

      return {
        collegeId,
        courseId,
        departmentId,
        subjectId,
        teacherId,
        userId,
        createdBy,
        student,
        timetable,
      };
    };

    const addSession = async (ctx, lectureNumber, present = true) => {
      const slot = await TimetableSlot.create({
        college_id: ctx.collegeId,
        department_id: ctx.departmentId,
        course_id: ctx.courseId,
        timetable_id: ctx.timetable._id,
        day: "MON",
        startTime: "09:00",
        endTime: "10:00",
        subject_id: ctx.subjectId,
        teacher_id: ctx.teacherId,
        slotType: "LECTURE",
      });

      const session = await AttendanceSession.create({
        college_id: ctx.collegeId,
        department_id: ctx.departmentId,
        course_id: ctx.courseId,
        subject_id: ctx.subjectId,
        teacher_id: ctx.teacherId,
        slot_id: slot._id,
        lectureDate: new Date(Date.now() + lectureNumber * 86400000),
        lectureNumber,
        totalStudents: 1,
        status: "CLOSED",
        slotSnapshot: {
          subject_id: ctx.subjectId,
          subject_name: "Test Subject",
          subject_code: "TS101",
          teacher_id: ctx.teacherId,
          teacher_name: "Test Teacher",
          day: "MON",
          startTime: "09:00",
          endTime: "10:00",
          slotType: "LECTURE",
        },
      });

      await AttendanceRecord.create({
        college_id: ctx.collegeId,
        session_id: session._id,
        student_id: ctx.student._id,
        status: present ? "PRESENT" : "ABSENT",
        markedBy: ctx.teacherId,
      });

      return session;
    };

    it("refreshes attendance snapshot when a new session is added after initial decision", async () => {
      const ctx = await buildBaseContext();

      await addSession(ctx, 1, true);

      const first = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(first.attendance_snapshot.totalSessions).toBe(1);
      expect(first.attendance_snapshot.percentage).toBe(100);

      // Add a second session — attendance data has changed
      await addSession(ctx, 2, true);

      const second = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      // Snapshot must be refreshed, not the stale 1-session record
      expect(String(second._id)).toBe(String(first._id));
      expect(second.attendance_snapshot.totalSessions).toBe(2);
      expect(second.attendance_snapshot.percentage).toBe(100);
    });

    it("reflects a new PRESENT session in the refreshed snapshot", async () => {
      const ctx = await buildBaseContext();

      // 3 sessions: 2 PRESENT, 1 ABSENT → 66.67 % (below 75 % threshold)
      await addSession(ctx, 1, true);
      await addSession(ctx, 2, true);
      await addSession(ctx, 3, false);

      const first = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(first.attendance_snapshot.totalSessions).toBe(3);
      expect(first.attendance_snapshot.percentage).toBe(66.67);
      expect(first.attendance_snapshot.status).toBe("NOT_ELIGIBLE");

      // Add a 4th PRESENT session → 4 sessions, 3 present → 75 % (eligible)
      await addSession(ctx, 4, true);

      const second = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(second.attendance_snapshot.totalSessions).toBe(4);
      expect(second.attendance_snapshot.percentage).toBe(75);
      expect(second.attendance_snapshot.status).toBe("ELIGIBLE");
      expect(second.promotion_outcome).toBe("PASS");
    });

    it("reflects a new ABSENT session in the refreshed snapshot", async () => {
      const ctx = await buildBaseContext();

      // 2 sessions, both PRESENT → 100 %
      await addSession(ctx, 1, true);
      await addSession(ctx, 2, true);

      const first = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(first.attendance_snapshot.totalSessions).toBe(2);
      expect(first.attendance_snapshot.percentage).toBe(100);

      // Add a 3rd ABSENT session → 3 sessions, 2 present → 66.67 %
      await addSession(ctx, 3, false);

      const second = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(second.attendance_snapshot.totalSessions).toBe(3);
      expect(second.attendance_snapshot.percentage).toBe(66.67);
      expect(second.attendance_snapshot.status).toBe("NOT_ELIGIBLE");
    });

    it("remains idempotent when attendance has not changed", async () => {
      const ctx = await buildBaseContext();

      await addSession(ctx, 1, true);

      const first = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      const second = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(String(first._id)).toBe(String(second._id));
      expect(second.attendance_snapshot.totalSessions).toBe(1);
      expect(second.attendance_snapshot.percentage).toBe(100);
      expect(second.promotion_outcome).toBe("PASS");
      expect(second.decision_reason).toBe("ELIGIBLE");
    });

    it("does not create duplicate PromotionDecision records", async () => {
      const ctx = await buildBaseContext();

      await addSession(ctx, 1, true);

      await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });
      await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      expect(
        await PromotionDecision.countDocuments({ student_id: ctx.student._id }),
      ).toBe(1);
      expect(
        await PromotionDecision.countDocuments({ college_id: ctx.collegeId }),
      ).toBe(1);
    });

    it("isolates promotion decisions by college (tenant isolation)", async () => {
      const ctxA = await buildBaseContext();
      await addSession(ctxA, 1, true);

      const first = await createPromotionDecision({
        studentId: ctxA.student._id,
        collegeId: ctxA.collegeId,
        userId: ctxA.userId,
      });

      // Second student in a *different* college — same course/semester/A-Y
      const ctxB = await buildBaseContext();
      await addSession(ctxB, 1, true);

      const second = await createPromotionDecision({
        studentId: ctxB.student._id,
        collegeId: ctxB.collegeId,
        userId: ctxB.userId,
      });

      expect(String(first._id)).not.toBe(String(second._id));
      expect(String(first.college_id)).toBe(String(ctxA.collegeId));
      expect(String(second.college_id)).toBe(String(ctxB.collegeId));
      expect(await PromotionDecision.countDocuments({})).toBe(2);
    });

    it("preserves workflow state while refreshing snapshots on proceeded decisions when academic outcome does not change", async () => {
      const ctx = await buildBaseContext();

      await addSession(ctx, 1, true);

      const decision = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      // Simulate workflow progress (recommend + approve)
      await PromotionDecision.updateOne(
        { _id: decision._id },
        {
          $set: {
            workflow_status: "APPROVED",
            recommendation: {
              user_id: ctx.userId,
              at: new Date(),
              comment: "recommended",
            },
            approval: {
              user_id: ctx.userId,
              at: new Date(),
              comment: "approved",
            },
          },
          $push: {
            workflow_history: {
              action: "APPROVE",
              performedBy: ctx.userId,
              performedAt: new Date(),
              previousStatus: "RECOMMENDED",
              newStatus: "APPROVED",
              comment: "approved",
            },
          },
        },
      );

      // Add a second PRESENT session — attendance data changes but outcome remains PASS
      await addSession(ctx, 2, true);

      const refreshed = await createPromotionDecision({
        studentId: ctx.student._id,
        collegeId: ctx.collegeId,
        userId: ctx.userId,
      });

      // Snapshot is refreshed …
      expect(refreshed.attendance_snapshot.totalSessions).toBe(2);
      expect(refreshed.attendance_snapshot.percentage).toBe(100);
      // … and workflow-managed state is preserved because outcome did not change
      expect(refreshed.workflow_status).toBe("APPROVED");
      expect(refreshed.approval).toBeTruthy();
      expect(refreshed.promotion_outcome).toBe("PASS");
      expect(refreshed.decision_reason).toBe("ELIGIBLE");
    });

    describe("Stale decision outcome refresh upon policy change", () => {
      it("existing RECOMMENDED ATKT + policy changed to max KT 0 → eligibility returns BLOCKED", async () => {
        const ctx = await buildBaseContext();

        // Give student 1 failed subject (eligible for ATKT under default maxAllowedKTs=3)
        const failedSubject = await createSubject({
          college_id: ctx.collegeId,
          course_id: ctx.courseId,
          department_id: ctx.departmentId,
          semester: 3,
        });

        await SemesterResult.updateOne(
          { student_id: ctx.student._id, semester: 3 },
          {
            $set: {
              overallResult: "FAIL",
              failedSubjects: 1,
              passedSubjects: 0,
              subjects: [
                {
                  subject: failedSubject._id,
                  passed: false,
                  status: "FAIL",
                  marksRecorded: true,
                },
              ],
            },
          },
        );

        await addSession(ctx, 1, true);

        // Initial decision evaluates to ATKT / DRAFT
        const initial = await createPromotionDecision({
          studentId: ctx.student._id,
          collegeId: ctx.collegeId,
          userId: ctx.userId,
        });
        expect(initial.promotion_outcome).toBe("ATKT");
        expect(initial.workflow_status).toBe("DRAFT");
        expect(initial.kt_count).toBe(1);

        // Simulate recommendation
        await PromotionDecision.updateOne(
          { _id: initial._id },
          {
            $set: {
              workflow_status: "RECOMMENDED",
              recommendation: {
                user_id: ctx.userId,
                at: new Date(),
                comment: "recommended for ATKT",
              },
            },
          },
        );

        // Policy changes: maxAllowedKTs = 0 (transition 3 -> 4 allows 0 KTs)
        await PromotionPolicy.updateOne(
          { collegeId: ctx.collegeId, isActive: true },
          {
            $set: {
              maxAllowedKTs: 0,
              ktRules: [
                {
                  fromSemester: 3,
                  toSemester: 4,
                  maxAllowedKTs: 0,
                },
              ],
            },
          },
        );

        // Re-evaluating eligibility must refresh the stale ATKT to BLOCKED
        const refreshed = await createPromotionDecision({
          studentId: ctx.student._id,
          collegeId: ctx.collegeId,
          userId: ctx.userId,
        });

        expect(refreshed.promotion_outcome).toBe("BLOCKED");
        expect(refreshed.workflow_status).toBe("BLOCKED");
        expect(refreshed.decision_reason).toBe("KT_LIMIT_EXCEEDED");
        expect(refreshed.recommendation).toBeNull();
        expect(refreshed.approval).toBeNull();
        expect(refreshed.policy_snapshot.resolvedMaxAllowedKTs).toBe(0);
      });

      it("existing UNDER_REVIEW/APPROVED decision with changed policy → stale outcome is refreshed correctly", async () => {
        const ctx = await buildBaseContext();

        const failedSubject = await createSubject({
          college_id: ctx.collegeId,
          course_id: ctx.courseId,
          department_id: ctx.departmentId,
          semester: 3,
        });

        await SemesterResult.updateOne(
          { student_id: ctx.student._id, semester: 3 },
          {
            $set: {
              overallResult: "FAIL",
              failedSubjects: 1,
              passedSubjects: 0,
              subjects: [
                {
                  subject: failedSubject._id,
                  passed: false,
                  status: "FAIL",
                  marksRecorded: true,
                },
              ],
            },
          },
        );

        await addSession(ctx, 1, true);

        // --- Case A: UNDER_REVIEW decision refreshed to BLOCKED ---
        const decisionA = await createPromotionDecision({
          studentId: ctx.student._id,
          collegeId: ctx.collegeId,
          userId: ctx.userId,
        });
        expect(decisionA.promotion_outcome).toBe("ATKT");

        await PromotionDecision.updateOne(
          { _id: decisionA._id },
          {
            $set: {
              workflow_status: "UNDER_REVIEW",
              recommendation: {
                user_id: ctx.userId,
                at: new Date(),
                comment: "under review",
              },
            },
          },
        );

        // Policy change: maxAllowedKTs = 0
        await PromotionPolicy.updateOne(
          { collegeId: ctx.collegeId, isActive: true },
          {
            $set: {
              maxAllowedKTs: 0,
              ktRules: [{ fromSemester: 3, toSemester: 4, maxAllowedKTs: 0 }],
            },
          },
        );

        const refreshedUnderReview = await createPromotionDecision({
          studentId: ctx.student._id,
          collegeId: ctx.collegeId,
          userId: ctx.userId,
        });

        expect(refreshedUnderReview.promotion_outcome).toBe("BLOCKED");
        expect(refreshedUnderReview.workflow_status).toBe("BLOCKED");
        expect(refreshedUnderReview.recommendation).toBeNull();

        // --- Case B: APPROVED decision refreshed to BLOCKED ---
        // Restore policy to allow KT for setup
        await PromotionPolicy.updateOne(
          { collegeId: ctx.collegeId, isActive: true },
          {
            $set: {
              maxAllowedKTs: 2,
              ktRules: [{ fromSemester: 3, toSemester: 4, maxAllowedKTs: 2 }],
            },
          },
        );

        const decisionB = await createPromotionDecision({
          studentId: ctx.student._id,
          collegeId: ctx.collegeId,
          userId: ctx.userId,
        });
        expect(decisionB.promotion_outcome).toBe("ATKT");

        await PromotionDecision.updateOne(
          { _id: decisionB._id },
          {
            $set: {
              workflow_status: "APPROVED",
              approval: {
                user_id: ctx.userId,
                at: new Date(),
                comment: "approved ATKT",
              },
            },
          },
        );

        // Policy change back to 0 KT
        await PromotionPolicy.updateOne(
          { collegeId: ctx.collegeId, isActive: true },
          {
            $set: {
              maxAllowedKTs: 0,
              ktRules: [{ fromSemester: 3, toSemester: 4, maxAllowedKTs: 0 }],
            },
          },
        );

        const refreshedApproved = await createPromotionDecision({
          studentId: ctx.student._id,
          collegeId: ctx.collegeId,
          userId: ctx.userId,
        });

        expect(refreshedApproved.promotion_outcome).toBe("BLOCKED");
        expect(refreshedApproved.workflow_status).toBe("BLOCKED");
        expect(refreshedApproved.approval).toBeNull();
        expect(refreshedApproved.decision_reason).toBe("KT_LIMIT_EXCEEDED");
      });
    });
  });
});
