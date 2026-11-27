/**
 * Regression tests for P0 Bug Fix:
 * Student Today's Timetable ignores current semester and academic year
 *
 * Endpoint: GET /api/timetable/student/today
 *
 * The today-timetable query must be scoped to the student's current
 * semester and current academic year, in addition to college/course/department,
 * PUBLISHED status, division fallback, and today's day-of-week filtering.
 *
 * Run:
 *   node backend/tests/run-tests-memory.js tests/timetable/student-today-timetable.test.js
 *   npx jest tests/timetable/student-today-timetable.test.js --runInBand
 */
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createStudent,
  createTeacher,
} = require("../helpers/factories");
const { loginAsHOD, loginAsStudent } = require("../helpers/testAuth");
const { getDayName } = require("../../src/utils/date.utils");
const app = require("../../app");

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const Timetable = require("../../src/models/timetable.model");
const TimetableSlot = require("../../src/models/timetableSlot.model");
const Subject = require("../../src/models/subject.model");

const ACADEMIC_YEAR_1 = "2026-2027";
const ACADEMIC_YEAR_2 = "2025-2026";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const todayDayName = getDayName(new Date());
const otherDayName = DAYS.find((d) => d !== todayDayName) || "MON";

/**
 * Build a college + department (with HOD) + course + HOD user/teacher.
 * Returns these objects so each test can create its own student and timetables.
 */
async function setupContext(suffix) {
  const college = await createCollege({
    code: `STTODAY${suffix}`,
    name: `Student Today TT College ${suffix}`,
    email: `sttoday${suffix}@test.com`,
  });

  const hodUser = await createUser({
    email: `hodtoday${suffix}@test.com`,
    password: "Test@123",
    role: "HOD",
    college_id: college._id,
    isActive: true,
  });

  const department = await Department.create({
    college_id: college._id,
    name: `Dept ${suffix}`,
    code: `D${suffix}`,
    type: "ACADEMIC",
    status: "ACTIVE",
    hod_id: null,
    programsOffered: ["UG"],
    startYear: 2024,
    sanctionedFacultyCount: 5,
    sanctionedStudentIntake: 60,
    createdBy: hodUser._id,
  });

  const hodTeacher = await createTeacher({
    name: `HOD ${suffix}`,
    user_id: hodUser._id,
    email: `hodtoday${suffix}@test.com`,
    college_id: college._id,
    department_id: department._id,
    employeeId: `EMP-HOD-TODAY-${suffix}`,
    designation: "HOD",
    status: "ACTIVE",
    createdBy: hodUser._id,
  });

  department.hod_id = hodTeacher._id;
  await department.save();

  const course = await Course.create({
    college_id: college._id,
    department_id: department._id,
    name: `Course ${suffix}`,
    code: `C${suffix}`,
    type: "THEORY",
    status: "ACTIVE",
    programLevel: "UG",
    durationSemesters: 6,
    durationYears: 3,
    credits: 120,
    maxStudents: 60,
    yearLabels: ["Year 1", "Year 2", "Year 3"],
    createdBy: hodUser._id,
  });

  await loginAsHOD(app, hodUser.email, "Test@123");

  return { college, hodUser, hodTeacher, department, course };
}

async function createStudentAgent(ctx, overrides = {}) {
  const {
    currentSemester = 1,
    currentAcademicYear = ACADEMIC_YEAR_1,
    division = undefined,
  } = overrides;
  const studentUser = await createUser({
    email: `student-today-${ctx.college.code}@test.com`,
    password: "Test@123",
    role: "STUDENT",
    college_id: ctx.college._id,
    isActive: true,
  });
  const studentOverrides = {
    fullName: "Today Student",
    email: `student-today-${ctx.college.code}@test.com`,
    college_id: ctx.college._id,
    user_id: studentUser._id,
    department_id: ctx.department._id,
    course_id: ctx.course._id,
    currentSemester,
    currentAcademicYear,
    status: "APPROVED",
  };
  if (division !== undefined) {
    studentOverrides.division = division;
  }
  const student = await createStudent(studentOverrides);
  const { agent } = await loginAsStudent(app, studentUser.email, "Test@123");
  return { agent, student, studentUser };
}

async function addSubject(ctx, name, code, semester) {
  return Subject.create({
    college_id: ctx.college._id,
    department_id: ctx.department._id,
    course_id: ctx.course._id,
    name,
    code,
    semester,
    teacher_id: ctx.hodTeacher._id,
    credits: 3,
    status: "ACTIVE",
    createdBy: ctx.hodTeacher._id,
  });
}

async function addSlot(ctx, timetable, subject, day, startTime) {
  return TimetableSlot.create({
    college_id: ctx.college._id,
    timetable_id: timetable._id,
    department_id: ctx.department._id,
    course_id: ctx.course._id,
    subject_id: subject._id,
    teacher_id: ctx.hodTeacher._id,
    day,
    startTime,
    endTime: "10:00",
    room: "R1",
    slotType: "LECTURE",
    division: timetable.division,
  });
}

async function createTimetable(ctx, overrides = {}) {
  return Timetable.create({
    college_id: ctx.college._id,
    department_id: ctx.department._id,
    course_id: ctx.course._id,
    semester: 1,
    academicYear: ACADEMIC_YEAR_1,
    division: null,
    name: "TT Default",
    status: "PUBLISHED",
    createdBy: ctx.hodTeacher._id,
    ...overrides,
  });
}

describe("Student Today's Timetable - Semester & Academic Year Filtering (P0)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  /* --------------------------------------------------------
     A. Student in Semester 1 sees today's published Sem 1
     -------------------------------------------------------- */
  it("A: Semester 1 student sees only published Semester 1 today timetable", async () => {
    const ctx = await setupContext("a1");
    const { agent, student } = await createStudentAgent(ctx);

    const tt1 = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Sem1",
      status: "PUBLISHED",
    });
    const sub1 = await addSubject(ctx, "Math", "M1", 1);
    await addSlot(ctx, tt1, sub1, todayDayName, "09:00");

    const res = await agent.get("/api/timetable/student/today").expect(200);
    const slots = res.body.data?.slots || [];

    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.semester).toBe(student.currentSemester);
      expect(slot.timetable_id.semester).toBe(1);
      expect(slot.timetable_id.academicYear).toBe(ACADEMIC_YEAR_1);
      expect(slot.timetable_id.status).toBe("PUBLISHED");
      expect(slot.day).toBe(todayDayName);
    });
  });

  /* --------------------------------------------------------
     B. After promotion to Semester 2, sees Semester 2
     -------------------------------------------------------- */
  it("B: After promotion to Semester 2, student sees today's Semester 2 timetable", async () => {
    const ctx = await setupContext("b2");
    const { agent, student } = await createStudentAgent(ctx);

    const tt1 = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Sem1",
      status: "PUBLISHED",
    });
    const sub1 = await addSubject(ctx, "Math1", "M1", 1);
    await addSlot(ctx, tt1, sub1, todayDayName, "09:00");

    const tt2 = await createTimetable(ctx, {
      semester: 2,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Sem2",
      status: "PUBLISHED",
    });
    const sub2 = await addSubject(ctx, "Phys2", "P2", 2);
    await addSlot(ctx, tt2, sub2, todayDayName, "10:00");

    // Simulate promotion to Semester 2
    student.currentSemester = 2;
    student.currentAcademicYear = ACADEMIC_YEAR_1;
    await student.save();

    const res = await agent.get("/api/timetable/student/today").expect(200);
    const slots = res.body.data?.slots || [];

    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.semester).toBe(2);
      expect(slot.timetable_id.academicYear).toBe(ACADEMIC_YEAR_1);
    });
  });

  /* --------------------------------------------------------
     C. Both PUBLISHED — Semester 2 student must NOT see
        Semester 1 slots
     -------------------------------------------------------- */
  it("C: Sem 2 student does not see Sem 1 slots when both are published", async () => {
    const ctx = await setupContext("c3");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 2,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const tt1 = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Sem1",
      status: "PUBLISHED",
    });
    const sub1 = await addSubject(ctx, "Math1", "M1", 1);
    await addSlot(ctx, tt1, sub1, todayDayName, "09:00");

    const tt2 = await createTimetable(ctx, {
      semester: 2,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Sem2",
      status: "PUBLISHED",
    });
    const sub2 = await addSubject(ctx, "Phys2", "P2", 2);
    await addSlot(ctx, tt2, sub2, todayDayName, "10:00");

    const res = await agent.get("/api/timetable/student/today").expect(200);
    const slots = res.body.data?.slots || [];

    const sem1Slots = slots.filter((s) => s.timetable_id.semester === 1);
    expect(sem1Slots.length).toBe(0);

    slots.forEach((slot) => {
      expect(slot.timetable_id.semester).toBe(2);
      expect(slot.timetable_id.status).toBe("PUBLISHED");
    });
  });

  /* --------------------------------------------------------
     D. Timetable from another academic year is NOT returned
     -------------------------------------------------------- */
  it("D: Timetable from another academic year is not returned", async () => {
    const ctx = await setupContext("d4");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const ttCur = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Cur AY",
      status: "PUBLISHED",
    });
    const subCur = await addSubject(ctx, "Cur", "CUR1", 1);
    await addSlot(ctx, ttCur, subCur, todayDayName, "09:00");

    const ttOld = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_2,
      name: "TT Old AY",
      status: "PUBLISHED",
    });
    const subOld = await addSubject(ctx, "Old", "OLD1", 1);
    await addSlot(ctx, ttOld, subOld, todayDayName, "11:00");

    const res = await agent.get("/api/timetable/student/today").expect(200);
    const slots = res.body.data?.slots || [];

    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.academicYear).toBe(ACADEMIC_YEAR_1);
    });
    const other = slots.filter(
      (s) => s.timetable_id.academicYear === ACADEMIC_YEAR_2,
    );
    expect(other.length).toBe(0);
  });

  /* --------------------------------------------------------
     E. DRAFT timetable is NOT returned
     -------------------------------------------------------- */
  it("E: DRAFT timetable slots are not returned", async () => {
    const ctx = await setupContext("e5");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const ttDraft = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Draft",
      status: "DRAFT",
    });
    const subDraft = await addSubject(ctx, "DraftSub", "DS1", 1);
    await addSlot(ctx, ttDraft, subDraft, todayDayName, "09:00");

    // DRAFT timetable (student's exact semester/AY) must NOT appear
    let res = await agent.get("/api/timetable/student/today").expect(200);
    expect(res.body.data.slots.length).toBe(0);
    expect(res.body.data.totalSlots).toBe(0);

    // Publishing the same timetable makes the today-slot appear,
    // proving the slot existed and was only hidden by status.
    await Timetable.updateOne({ _id: ttDraft._id }, { status: "PUBLISHED" });
    res = await agent.get("/api/timetable/student/today").expect(200);
    expect(res.body.data.slots.length).toBe(1);
    expect(res.body.data.slots[0].timetable_id.status).toBe("PUBLISHED");
  });

  /* --------------------------------------------------------
     F. ARCHIVED timetable is NOT returned
     -------------------------------------------------------- */
  it("F: ARCHIVED timetable slots are not returned", async () => {
    const ctx = await setupContext("f6");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const ttArchived = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Archived",
      status: "ARCHIVED",
    });
    const subArch = await addSubject(ctx, "ArchSub", "AS1", 1);
    await addSlot(ctx, ttArchived, subArch, todayDayName, "09:00");

    // ARCHIVED timetable (student's exact semester/AY) must NOT appear
    let res = await agent.get("/api/timetable/student/today").expect(200);
    expect(res.body.data.slots.length).toBe(0);
    expect(res.body.data.totalSlots).toBe(0);

    // Un-archiving makes the today-slot appear,
    // proving the slot existed and was only hidden by status.
    await Timetable.updateOne({ _id: ttArchived._id }, { status: "PUBLISHED" });
    res = await agent.get("/api/timetable/student/today").expect(200);
    expect(res.body.data.slots.length).toBe(1);
    expect(res.body.data.slots[0].timetable_id.status).toBe("PUBLISHED");
  });

  /* --------------------------------------------------------
     G. Division filtering still works (incl. null fallback)
     -------------------------------------------------------- */
  it("G: Division filtering returns only matching division slots", async () => {
    const ctx = await setupContext("g7");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
      division: "A",
    });

    const ttDivA = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: "A",
      name: "TT Div A",
      status: "PUBLISHED",
    });
    const subA = await addSubject(ctx, "DivA Sub", "DA1", 1);
    await addSlot(ctx, ttDivA, subA, todayDayName, "09:00");

    const ttDivB = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: "B",
      name: "TT Div B",
      status: "PUBLISHED",
    });
    const subB = await addSubject(ctx, "DivB Sub", "DB1", 1);
    await addSlot(ctx, ttDivB, subB, todayDayName, "11:00");

    const res = await agent.get("/api/timetable/student/today").expect(200);
    const slots = res.body.data?.slots || [];

    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.division).toBe("A");
    });
    const divB = slots.filter((s) => s.timetable_id.division === "B");
    expect(divB.length).toBe(0);
  });

  /* --------------------------------------------------------
     H. Cross-tenant timetable data is NOT returned
     -------------------------------------------------------- */
  it("H: Cross-tenant timetable data is not returned", async () => {
    const ctx = await setupContext("h8");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    // Timetable in the student's own college/tenant
    const ttA = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Own College",
      status: "PUBLISHED",
    });
    const subA = await addSubject(ctx, "Own", "O1", 1);
    await addSlot(ctx, ttA, subA, todayDayName, "09:00");

    // Timetable in a DIFFERENT college/tenant
    const collegeB = await createCollege({
      code: "STTODAYB",
      name: "Cross Tenant Today College",
      email: "sttodayb@test.com",
    });
    const deptB = await Department.create({
      college_id: collegeB._id,
      name: "Dept B",
      code: "DB",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: ctx.hodUser._id,
    });
    const courseB = await Course.create({
      college_id: collegeB._id,
      department_id: deptB._id,
      name: "Course B",
      code: "CRSB",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 6,
      durationYears: 3,
      credits: 120,
      maxStudents: 60,
      yearLabels: ["Year 1", "Year 2", "Year 3"],
      createdBy: ctx.hodUser._id,
    });
    const subB = await Subject.create({
      college_id: collegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      name: "Tenant B Sub",
      code: "TB1",
      semester: 1,
      teacher_id: ctx.hodTeacher._id,
      credits: 3,
      status: "ACTIVE",
      createdBy: ctx.hodUser._id,
    });
    const ttB = await Timetable.create({
      college_id: collegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Tenant B",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await TimetableSlot.create({
      college_id: collegeB._id,
      timetable_id: ttB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      subject_id: subB._id,
      teacher_id: ctx.hodTeacher._id,
      day: todayDayName,
      startTime: "09:00",
      endTime: "10:00",
      room: "R1",
      slotType: "LECTURE",
      division: null,
    });

    const res = await agent.get("/api/timetable/student/today").expect(200);
    const slots = res.body.data?.slots || [];

    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.college_id.toString()).toBe(ctx.college._id.toString());
    });
  });

  /* --------------------------------------------------------
     I. No matching timetable returns the existing empty shape
     -------------------------------------------------------- */
  it("I: No matching timetable returns empty response with today context", async () => {
    const ctx = await setupContext("i9");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 3,
      currentAcademicYear: ACADEMIC_YEAR_1,
      division: null,
    });

    const tt = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Sem1 Only",
      status: "PUBLISHED",
    });
    const sub = await addSubject(ctx, "Math", "M1", 1);
    await addSlot(ctx, tt, sub, todayDayName, "09:00");

    const res = await agent.get("/api/timetable/student/today").expect(200);

    expect(res.body.data.slots).toEqual([]);
    expect(res.body.data.totalSlots).toBe(0);
    expect(res.body.data.today).toBeDefined();
    expect(res.body.data.dayName).toBe(todayDayName);
    expect(res.body.message).toBe("Today's timetable fetched successfully");
  });

  /* --------------------------------------------------------
     J. Today/day filtering continues to work
     -------------------------------------------------------- */
  it("J: Only today's day slots are returned, other days excluded", async () => {
    const ctx = await setupContext("j0");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const tt = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Day Filter",
      status: "PUBLISHED",
    });
    const subToday = await addSubject(ctx, "TodaySub", "T1", 1);
    await addSlot(ctx, tt, subToday, todayDayName, "09:00");

    const subOther = await addSubject(ctx, "OtherDaySub", "O1", 1);
    await addSlot(ctx, tt, subOther, otherDayName, "11:00");

    const res = await agent.get("/api/timetable/student/today").expect(200);
    const slots = res.body.data?.slots || [];

    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.day).toBe(todayDayName);
    });
    const otherDaySlots = slots.filter((s) => s.day === otherDayName);
    expect(otherDaySlots.length).toBe(0);
    expect(res.body.data.dayName).toBe(todayDayName);
  });

  /* --------------------------------------------------------
     K. Parent department is part of the timetable context
     -------------------------------------------------------- */
  it("K: Excludes a published timetable whose parent department differs", async () => {
    const ctx = await setupContext("k11");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const otherDepartment = await Department.create({
      college_id: ctx.college._id,
      name: "Other Department",
      code: "OTHERDEPT",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: ctx.hodUser._id,
    });
    const otherDepartmentTimetable = await Timetable.create({
      college_id: ctx.college._id,
      department_id: otherDepartment._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Other Department",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    const subject = await addSubject(ctx, "Other Department", "OD1", 1);
    await TimetableSlot.create({
      college_id: ctx.college._id,
      timetable_id: otherDepartmentTimetable._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      subject_id: subject._id,
      teacher_id: ctx.hodTeacher._id,
      day: todayDayName,
      startTime: "09:00",
      endTime: "10:00",
      room: "R1",
      slotType: "LECTURE",
      division: null,
    });

    const res = await agent.get("/api/timetable/student/today").expect(200);

    expect(res.body.data.slots).toEqual([]);
    expect(res.body.data.totalSlots).toBe(0);
  });
});
