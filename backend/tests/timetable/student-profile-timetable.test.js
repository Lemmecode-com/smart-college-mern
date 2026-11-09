/**
 * Regression tests for P0 Bug Fix:
 * Student Profile (my-profile) exposes DRAFT timetables
 *
 * Endpoint: GET /api/students/my-profile
 *
 * The today-timetable query must be scoped to:
 * - PUBLISHED status only (DRAFT and ARCHIVED excluded)
 * - Student's current semester and academic year
 * - Student's college/tenant, department, course, division
 *
 * Run with in-memory Mongo:
 *   node backend/tests/run-tests-memory.js tests/timetable/student-profile-timetable.test.js
 * Or with external Mongo:
 *   npx jest tests/timetable/student-profile-timetable.test.js --runInBand
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

async function setupContext(suffix) {
  const college = await createCollege({
    code: `STTPROF${suffix}`,
    name: `Student Profile TT College ${suffix}`,
    email: `sttprof${suffix}@test.com`,
  });

  const hodUser = await createUser({
    email: `hodprof${suffix}@test.com`,
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
    email: `hodprof${suffix}@test.com`,
    college_id: college._id,
    department_id: department._id,
    employeeId: `EMP-HOD-PROF-${suffix}`,
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
    email: `student-prof-${ctx.college.code}@test.com`,
    password: "Test@123",
    role: "STUDENT",
    college_id: ctx.college._id,
    isActive: true,
  });
  const studentOverrides = {
    fullName: "Profile Student",
    email: `student-prof-${ctx.college.code}@test.com`,
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

describe("Student Profile (my-profile) - Timetable Filtering (P0 Bug Fix)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("1: PUBLISHED current timetable is visible in student profile", async () => {
    const ctx = await setupContext("p1");
    const { agent, student } = await createStudentAgent(ctx);

    const tt = await createTimetable(ctx, {
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      name: "TT Published",
      status: "PUBLISHED",
    });
    const sub = await addSubject(ctx, "Math", "M1", 1);
    await addSlot(ctx, tt, sub, todayDayName, "09:00");

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBeGreaterThan(0);
    expect(todayTT[0]?.subject_id?.name).toBe("Math");
  });

  it("2: DRAFT timetable is hidden in student profile", async () => {
    const ctx = await setupContext("p2");
    const { agent, student } = await createStudentAgent(ctx);

    const ttDraft = await createTimetable(ctx, {
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      name: "TT Draft",
      status: "DRAFT",
    });
    const subDraft = await addSubject(ctx, "DraftSub", "DS1", 1);
    await addSlot(ctx, ttDraft, subDraft, todayDayName, "09:00");

    let res = await agent.get("/api/students/my-profile").expect(200);
    let todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBe(0);

    await Timetable.updateOne({ _id: ttDraft._id }, { status: "PUBLISHED" });
    res = await agent.get("/api/students/my-profile").expect(200);
    todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBe(1);
    expect(todayTT[0]?.subject_id?.name).toBe("DraftSub");
  });

  it("3: ARCHIVED timetable is hidden in student profile", async () => {
    const ctx = await setupContext("p3");
    const { agent, student } = await createStudentAgent(ctx);

    const ttArchived = await createTimetable(ctx, {
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      name: "TT Archived",
      status: "ARCHIVED",
    });
    const subArch = await addSubject(ctx, "ArchSub", "AS1", 1);
    await addSlot(ctx, ttArchived, subArch, todayDayName, "09:00");

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBe(0);

    await Timetable.updateOne({ _id: ttArchived._id }, { status: "PUBLISHED" });
    const res2 = await agent.get("/api/students/my-profile").expect(200);
    expect(res2.body.data?.todaysTimetable?.length).toBe(1);
  });

  it("4: Previous semester timetable is hidden in student profile", async () => {
    const ctx = await setupContext("p4");
    const { agent } = await createStudentAgent(ctx, {
      currentSemester: 2,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const ttOld = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Old Sem",
      status: "PUBLISHED",
    });
    const subOld = await addSubject(ctx, "OldSub", "OS1", 1);
    await addSlot(ctx, ttOld, subOld, todayDayName, "09:00");

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBe(0);
  });

  it("5: Previous academic year timetable is hidden in student profile", async () => {
    const ctx = await setupContext("p5");
    const { agent, student } = await createStudentAgent(ctx);

    const ttOldAY = await createTimetable(ctx, {
      semester: student.currentSemester,
      academicYear: ACADEMIC_YEAR_2,
      name: "TT Old AY",
      status: "PUBLISHED",
    });
    const subOldAY = await addSubject(ctx, "OldAYSub", "OAS1", 1);
    await addSlot(ctx, ttOldAY, subOldAY, todayDayName, "09:00");

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBe(0);
  });

  it("6: Other department timetable is hidden in student profile", async () => {
    const ctx = await setupContext("p6");
    const { agent } = await createStudentAgent(ctx);

    const otherDept = await Department.create({
      college_id: ctx.college._id,
      name: "Other Dept",
      code: "OD",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: ctx.hodUser._id,
    });
    const otherCourse = await Course.create({
      college_id: ctx.college._id,
      department_id: otherDept._id,
      name: "Other Course",
      code: "OC",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 6,
      durationYears: 3,
      credits: 120,
      maxStudents: 60,
      yearLabels: ["Year 1"],
      createdBy: ctx.hodUser._id,
    });
    const ttOther = await Timetable.create({
      college_id: ctx.college._id,
      department_id: otherDept._id,
      course_id: otherCourse._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Other Dept",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    const subOther = await addSubject(ctx, "OtherSub", "OS2", 1);
    await TimetableSlot.create({
      college_id: ctx.college._id,
      timetable_id: ttOther._id,
      department_id: otherDept._id,
      course_id: otherCourse._id,
      subject_id: subOther._id,
      teacher_id: ctx.hodTeacher._id,
      day: todayDayName,
      startTime: "09:00",
      endTime: "10:00",
      room: "R1",
      slotType: "LECTURE",
      division: null,
    });

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBe(0);
  });

  it("7: Division filtering works in student profile", async () => {
    const ctx = await setupContext("p7");
    const { agent, student } = await createStudentAgent(ctx, {
      division: "A",
    });

    const ttDivA = await createTimetable(ctx, {
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      division: "A",
      name: "TT Div A",
      status: "PUBLISHED",
    });
    const subA = await addSubject(ctx, "DivA Sub", "DA1", 1);
    await addSlot(ctx, ttDivA, subA, todayDayName, "09:00");

    const ttDivB = await createTimetable(ctx, {
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
      division: "B",
      name: "TT Div B",
      status: "PUBLISHED",
    });
    const subB = await addSubject(ctx, "DivB Sub", "DB1", 1);
    await addSlot(ctx, ttDivB, subB, todayDayName, "10:00");

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBeGreaterThan(0);
    todayTT.forEach((slot) => {
      expect(slot.subject).not.toBe("DivB Sub");
    });
    const divB = todayTT.filter((s) => s.subject === "DivB Sub");
    expect(divB.length).toBe(0);
  });

  it("8: Cross-tenant timetable is hidden in student profile", async () => {
    const ctx = await setupContext("p8");
    const { agent, student } = await createStudentAgent(ctx);

    const collegeB = await createCollege({
      code: "STTPROFB",
      name: "Cross Tenant College B",
      email: "crosstenantb@test.com",
    });
    const deptB = await Department.create({
      college_id: collegeB._id,
      name: "Dept B",
      code: "DEPTB",
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
      yearLabels: ["Year 1"],
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
      semester: student.currentSemester,
      academicYear: student.currentAcademicYear,
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

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    todayTT.forEach((slot) => {
      // Slots from cross-tenant should not appear
      expect(slot.subject).not.toBe("Tenant B Sub");
    });
  });

  it("9: No matching timetable returns empty todaysTimetable", async () => {
    const ctx = await setupContext("p9");
    const { agent, student } = await createStudentAgent(ctx, {
      currentSemester: 3,
      currentAcademicYear: ACADEMIC_YEAR_1,
    });

    const tt = await createTimetable(ctx, {
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      name: "TT Sem1 Only",
      status: "PUBLISHED",
    });
    const sub = await addSubject(ctx, "Math", "M1", 1);
    await addSlot(ctx, tt, sub, todayDayName, "09:00");

    const res = await agent.get("/api/students/my-profile").expect(200);
    const todayTT = res.body.data?.todaysTimetable || [];
    expect(todayTT.length).toBe(0);
    expect(res.body.data.todaysTimetable).toBeDefined();
    expect(res.body.message).toBe("Profile fetched successfully");
  });
});
