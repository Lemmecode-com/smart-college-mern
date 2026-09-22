/**
 * Regression tests: teacher double-booking conflict scoping (Priority 2).
 *
 * A teacher conflict must be detected ONLY within the same active academic
 * context: same college + teacher + day + overlapping time + same semester
 * + same academicYear + ACTIVE timetable (DRAFT/PUBLISHED).
 *
 * ARCHIVED timetables, different semesters, and different academic years must
 * NOT participate. Division / course_id / department_id are intentionally NOT
 * conflict boundaries (a teacher cannot be in two rooms at once).
 *
 * Run with in-memory Mongo:
 *   node backend/tests/run-tests-memory.js tests/timetable/teacher-conflict-scoping.test.js
 */
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { loginAsHOD } = require("../helpers/testAuth");
const {
  createCollege,
  createUser,
  createTeacher,
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Timetable = require("../../src/models/timetable.model");
const TimetableSlot = require("../../src/models/timetableSlot.model");
const {
  findTeacherConflictSlot,
  checkTeacherConflict,
} = require("../../src/services/exceptionValidation.service");
const { getDayName } = require("../../src/utils/date.utils");

let seq = 0;
const unique = (p) => `${p}-${Date.now()}-${++seq}`;

const ACADEMIC_YEAR_1 = "2026-2027";

async function setupContext(suffix) {
  const college = await createCollege({
    code: unique(`CC${suffix}`),
    name: `Conflict College ${suffix}`,
    email: `conf${suffix.toLowerCase()}@test.com`,
  });
  const hodUser = await createUser({
    email: `hod${suffix.toLowerCase()}@test.com`,
    password: "Test@123",
    role: "HOD",
    college_id: college._id,
    isActive: true,
  });
  const department = await createDepartment({
    college_id: college._id,
    code: unique(`DEPT${suffix}`),
    createdBy: hodUser._id,
  });
  const hodTeacher = await createTeacher({
    name: `HOD ${suffix}`,
    email: `hod${suffix.toLowerCase()}@test.com`,
    user_id: hodUser._id,
    college_id: college._id,
    department_id: department._id,
    employeeId: unique(`EMP${suffix}`),
    courses: [],
    createdBy: hodUser._id,
  });
  department.hod_id = hodTeacher._id;
  await department.save();

  const course = await createCourse({
    college_id: college._id,
    department_id: department._id,
    code: unique(`CRS${suffix}`),
    createdBy: hodUser._id,
  });

  const { agent } = await loginAsHOD(app, hodUser.email, "Test@123");
  return { college, hodUser, hodTeacher, department, course, agent };
}

async function subjectFor(ctx, course, semester, code, teacher) {
  return createSubject({
    college_id: ctx.college._id,
    department_id: ctx.department._id,
    course_id: course._id,
    name: `Subject ${code}`,
    code: unique(code),
    semester,
    teacher_id: teacher._id,
    credits: 3,
    createdBy: ctx.hodUser._id,
  });
}

async function timetableFor(ctx, course, semester, academicYear, division, status) {
  return Timetable.create({
    college_id: ctx.college._id,
    department_id: ctx.department._id,
    course_id: course._id,
    semester,
    academicYear,
    division,
    name: `TT ${unique("t")}`,
    status: status || "DRAFT",
    createdBy: ctx.hodTeacher._id,
  });
}

async function seedSlot(timetable, subject, teacher, day, start, end) {
  return TimetableSlot.create({
    college_id: timetable.college_id,
    timetable_id: timetable._id,
    department_id: timetable.department_id,
    course_id: timetable.course_id,
    subject_id: subject._id,
    teacher_id: teacher._id,
    semester: timetable.semester,
    day,
    startTime: start,
    endTime: end,
    room: "R1",
    slotType: "LECTURE",
    division: timetable.division,
  });
}

// POST /api/timetable/slot — the code path under test for creation.
function addSlotViaApi(agent, timetable, subject, teacher, day, start, end) {
  return agent.post("/api/timetable/slot").send({
    timetable_id: timetable._id,
    day,
    startTime: start,
    endTime: end,
    subject_id: subject._id,
    teacher_id: teacher._id,
    room: "R1",
    slotType: "LECTURE",
  });
}

function updateSlotViaApi(agent, slotId, patch) {
  return agent.put(`/api/timetable/slot/${slotId}`).send(patch);
}

// First Monday of a given month (year, 0-indexed month) as a local Date.
function firstMonday(year, monthZeroIndexed) {
  const d = new Date(year, monthZeroIndexed, 1);
  while (getDayName(d) !== "MON") d.setDate(d.getDate() + 1);
  return d;
}

describe("Timetable teacher-conflict scoping (Priority 2)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  /* --------------------------------------------------------------- */

  it("T1 — same-context teacher overlap returns 409", async () => {
    const ctx = await setupContext("T1");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB1", ctx.hodTeacher);
    // Two timetables in the SAME active academic context differ only by division
    // (the unique index treats division as part of the context).
    const ttA = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "DRAFT");
    const ttB = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "B", "DRAFT");
    await seedSlot(ttB, subject, ctx.hodTeacher, "MON", "10:00", "11:00");

    const res = await addSlotViaApi(
      ctx.agent, ttA, subject, ctx.hodTeacher, "MON", "10:30", "11:30",
    );

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Teacher already assigned at this time");
  });

  it("T2 — ARCHIVED Semester 1 does NOT block current Semester 2", async () => {
    const ctx = await setupContext("T2");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB2", ctx.hodTeacher);
    const ttSem1 = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "ARCHIVED");
    const ttSem2 = await timetableFor(ctx, ctx.course, 2, ACADEMIC_YEAR_1, "B", "DRAFT");
    await seedSlot(ttSem1, subject, ctx.hodTeacher, "MON", "10:00", "11:00");

    const res = await addSlotViaApi(
      ctx.agent, ttSem2, subject, ctx.hodTeacher, "MON", "10:30", "11:30",
    );

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Slot added successfully");
  });

  it("T3 — different semester is not a conflict (Semester 1 vs Semester 2)", async () => {
    const ctx = await setupContext("T3");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB3", ctx.hodTeacher);
    const ttSem1 = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "PUBLISHED");
    const ttSem2 = await timetableFor(ctx, ctx.course, 2, ACADEMIC_YEAR_1, "B", "DRAFT");
    await seedSlot(ttSem1, subject, ctx.hodTeacher, "MON", "10:00", "11:00");

    const res = await addSlotViaApi(
      ctx.agent, ttSem2, subject, ctx.hodTeacher, "MON", "10:30", "11:30",
    );

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Slot added successfully");
  });

  it("T4 — different academic year is not a conflict", async () => {
    const ctx = await setupContext("T4");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB4", ctx.hodTeacher);
    const ttOld = await timetableFor(ctx, ctx.course, 1, "2025-2026", "A", "PUBLISHED");
    const ttNew = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "B", "DRAFT");
    await seedSlot(ttOld, subject, ctx.hodTeacher, "MON", "10:00", "11:00");

    const res = await addSlotViaApi(
      ctx.agent, ttNew, subject, ctx.hodTeacher, "MON", "10:30", "11:30",
    );

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Slot added successfully");
  });

  it("T5 — different divisions still conflict (division is not a boundary)", async () => {
    const ctx = await setupContext("T5");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB5", ctx.hodTeacher);
    const ttA = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "DRAFT");
    const ttB = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "B", "DRAFT");
    await seedSlot(ttA, subject, ctx.hodTeacher, "MON", "10:00", "11:00");

    const res = await addSlotViaApi(
      ctx.agent, ttB, subject, ctx.hodTeacher, "MON", "10:00", "11:00",
    );

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Teacher already assigned at this time");
  });

  it("T6 — different courses still conflict (course is not a boundary)", async () => {
    const ctx = await setupContext("T6");
    const courseA = ctx.course;
    const courseB = await createCourse({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      code: unique("CRS6B"),
      createdBy: ctx.hodUser._id,
    });
    const subjectA = await subjectFor(ctx, courseA, 1, "SUB6A", ctx.hodTeacher);
    const subjectB = await subjectFor(ctx, courseB, 1, "SUB6B", ctx.hodTeacher);
    const ttA = await timetableFor(ctx, courseA, 1, ACADEMIC_YEAR_1, "A", "DRAFT");
    const ttB = await timetableFor(ctx, courseB, 1, ACADEMIC_YEAR_1, "B", "DRAFT");
    await seedSlot(ttB, subjectB, ctx.hodTeacher, "MON", "10:00", "11:00");

    const res = await addSlotViaApi(
      ctx.agent, ttA, subjectA, ctx.hodTeacher, "MON", "10:30", "11:30",
    );

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Teacher already assigned at this time");
  });

  it("T7 — updating a slot into an overlapping teacher time returns 409", async () => {
    const ctx = await setupContext("T7");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB7", ctx.hodTeacher);
    const tt = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "DRAFT");

    const s1 = (await addSlotViaApi(
      ctx.agent, tt, subject, ctx.hodTeacher, "MON", "10:00", "11:00",
    )).body.slot;
    const s2 = (await addSlotViaApi(
      ctx.agent, tt, subject, ctx.hodTeacher, "MON", "11:00", "12:00",
    )).body.slot;

    const res = await updateSlotViaApi(ctx.agent, s2._id, {
      startTime: "10:30",
      endTime: "11:30",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Teacher already assigned at this time");
  });

  it("T8 — updating a slot overlapping only itself succeeds (self-exclusion)", async () => {
    const ctx = await setupContext("T8");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB8", ctx.hodTeacher);
    const tt = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "DRAFT");

    const s1 = (await addSlotViaApi(
      ctx.agent, tt, subject, ctx.hodTeacher, "MON", "10:00", "11:00",
    )).body.slot;

    const res = await updateSlotViaApi(ctx.agent, s1._id, {
      startTime: "09:00",
      endTime: "10:30",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Slot updated successfully");
  });

  it("T9a — ARCHIVED timetable excluded from exception teacher conflict (same semester)", async () => {
    const ctx = await setupContext("T9A");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB9A", ctx.hodTeacher);
    const ttArchived = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "ARCHIVED");
    await seedSlot(ttArchived, subject, ctx.hodTeacher, "MON", "10:00", "11:00");

    const monday = firstMonday(2026, 7); // August 2026 lies in Semester 1's window
    const result = await checkTeacherConflict(
      ctx.hodTeacher._id, monday, "10:30", "11:30",
      ctx.college._id, ACADEMIC_YEAR_1, 1,
    );

    expect(result).toBe(false);
  });

  it("T9b — exception path still detects same-context conflict and ignores other semesters", async () => {
    const ctx = await setupContext("T9B");
    const subject = await subjectFor(ctx, ctx.course, 1, "SUB9B", ctx.hodTeacher);
    const ttPub = await timetableFor(ctx, ctx.course, 1, ACADEMIC_YEAR_1, "A", "PUBLISHED");
    await seedSlot(ttPub, subject, ctx.hodTeacher, "MON", "10:00", "11:00");

    const monday = firstMonday(2026, 7);

    expect(
      await checkTeacherConflict(
        ctx.hodTeacher._id, monday, "10:30", "11:30",
        ctx.college._id, ACADEMIC_YEAR_1, 1,
      ),
    ).toBe(true);

    expect(
      await checkTeacherConflict(
        ctx.hodTeacher._id, monday, "10:30", "11:30",
        ctx.college._id, ACADEMIC_YEAR_1, 2,
      ),
    ).toBe(false);
  });

  it("T10 — teacher/slot from another college does not cause a conflict", async () => {
    const ctxA = await setupContext("T10A");
    const subA = await subjectFor(ctxA, ctxA.course, 1, "SUB10A", ctxA.hodTeacher);
    const ttA = await timetableFor(ctxA, ctxA.course, 1, ACADEMIC_YEAR_1, "A", "DRAFT");
    await seedSlot(ttA, subA, ctxA.hodTeacher, "MON", "10:00", "11:00");

    const ctxB = await setupContext("T10B");
    const subB = await subjectFor(ctxB, ctxB.course, 1, "SUB10B", ctxB.hodTeacher);
    const ttB = await timetableFor(ctxB, ctxB.course, 1, ACADEMIC_YEAR_1, "A", "DRAFT");

    const res = await addSlotViaApi(
      ctxB.agent, ttB, subB, ctxB.hodTeacher, "MON", "10:30", "11:30",
    );
    expect(res.status).toBe(201);

    // Direct helper check: college A's teacher must NOT be matched when
    // querying college B's college_id.
    const leak = await findTeacherConflictSlot({
      collegeId: ctxB.college._id,
      teacherId: ctxA.hodTeacher._id,
      day: "MON",
      startTime: "10:30",
      endTime: "11:30",
      academicYear: ACADEMIC_YEAR_1,
      semester: 1,
    });
    expect(leak).toBeNull();
  });
});
