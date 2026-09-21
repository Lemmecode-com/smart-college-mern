/**
 * Regression tests for P0 Bug Fix:
 * Student timetable is not filtered by current semester and academic year
 *
 * Run with in-memory Mongo:
 *   node backend/tests/run-tests-memory.js tests/timetable/student-timetable-filtering.test.js
 * Or with external Mongo:
 *   npx jest tests/timetable/student-timetable-filtering.test.js --runInBand
 */
const request = require("supertest");
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
const app = require("../../app");

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const Timetable = require("../../src/models/timetable.model");
const TimetableSlot = require("../../src/models/timetableSlot.model");
const Subject = require("../../src/models/subject.model");

const ACADEMIC_YEAR_1 = "2026-2027";
const ACADEMIC_YEAR_2 = "2025-2026";

async function setupContext(suffix) {
  const college = await createCollege({
    code: `STT${suffix}`,
    name: `Student TT Test College ${suffix}`,
    email: `stt${suffix}@test.com`,
  });

  const hodUser = await createUser({
    email: `hod${suffix}@test.com`,
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
    email: `hod${suffix}@test.com`,
    college_id: college._id,
    department_id: department._id,
    employeeId: `EMP-HOD-${suffix}`,
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

  const { agent: hodAgent } = await loginAsHOD(app, hodUser.email, "Test@123");

  return { college, hodUser, hodTeacher, department, course, hodAgent };
}

async function createSubject(ctx, name, code, semester) {
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

async function createSlot(ctx, timetable, subject, day, startTime) {
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

describe("Student Timetable - Semester & Academic Year Filtering (P0 Bug Fix)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("covers all 10 scenarios for student timetable filtering", async () => {
    /* === SETUP: College, HOD, Teacher, Course === */
    const ctx = await setupContext("x1");

    async function clearTimetables() {
      await Timetable.deleteMany({
        college_id: ctx.college._id,
        department_id: ctx.department._id,
        course_id: ctx.course._id,
      });
      await TimetableSlot.deleteMany({
        college_id: ctx.college._id,
        department_id: ctx.department._id,
        course_id: ctx.course._id,
      });
      await Subject.deleteMany({
        college_id: ctx.college._id,
        department_id: ctx.department._id,
        course_id: ctx.course._id,
      });
    }

    /* === Create student in Sem 1, AY 2026-27 === */
    const studentUser = await createUser({
      email: "student-filter@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: ctx.college._id,
      isActive: true,
    });
    const student = await createStudent({
      college_id: ctx.college._id,
      user_id: studentUser._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      currentSemester: 1,
      currentAcademicYear: ACADEMIC_YEAR_1,
      status: "APPROVED",
    });
    const { agent: studentAgent } = await loginAsStudent(
      app,
      studentUser.email,
      "Test@123"
    );

    /* === Helper to create subject + slot for a given timetable === */
    async function addSubjectSlot(timetable, name, code, day, startTime) {
      const sub = await createSubject(ctx, name, code, timetable.semester);
      await createSlot(ctx, timetable, sub, day, startTime);
      return sub;
    }

    /* -------------------------------------------------- */
    /* SCENARIO 1: Student in Semester 1 sees only        */
    /*            Semester 1 PUBLISHED timetable            */
    /* -------------------------------------------------- */
    const ttSem1_S1 = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Sem1 S1",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await addSubjectSlot(ttSem1_S1, "Math1", "M1", "MON", "09:00");

    const ttSem2_S1 = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 2,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Sem2 S1",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await addSubjectSlot(ttSem2_S1, "Phys1", "P1", "TUE", "09:00");

    let res = await studentAgent.get("/api/timetable/student").expect(200);
    let slots = res.body.data?.slots || [];
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.semester).toBe(1);
      expect(slot.timetable_id.academicYear).toBe(ACADEMIC_YEAR_1);
    });

    /* -------------------------------------------------- */
    /* SCENARIO 2: Promote to Sem 2, sees only            */
    /*            Sem 2 PUBLISHED                          */
    /* -------------------------------------------------- */
    student.currentSemester = 2;
    student.currentAcademicYear = ACADEMIC_YEAR_1;
    await student.save();

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.semester).toBe(2);
      expect(slot.timetable_id.academicYear).toBe(ACADEMIC_YEAR_1);
    });

    /* -------------------------------------------------- */
    /* SCENARIO 3: Sem 1 timetable not seen when          */
    /*            both are PUBLISHED                       */
    /* -------------------------------------------------- */
    const sem1Slots = slots.filter((s) => s.timetable_id.semester === 1);
    expect(sem1Slots.length).toBe(0);

    /* -------------------------------------------------- */
    /* SCENARIO 4: Does not see another academic year     */
    /* -------------------------------------------------- */
    student.currentSemester = 1;
    student.currentAcademicYear = ACADEMIC_YEAR_1;
    await student.save();

    const ttOldAY = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_2,
      division: null,
      name: "TT Old AY",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await addSubjectSlot(ttOldAY, "Hist1", "H1", "WED", "09:00");

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.academicYear).toBe(ACADEMIC_YEAR_1);
    });

    /* -------------------------------------------------- */
    /* SCENARIO 5: Does not see DRAFT timetable           */
    /* -------------------------------------------------- */
    await clearTimetables();
    const ttDraft = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Draft",
      status: "DRAFT",
      createdBy: ctx.hodTeacher._id,
    });
    await addSubjectSlot(ttDraft, "DraftSub", "DS1", "THU", "09:00");

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    slots.forEach((slot) => {
      expect(slot.timetable_id.status).toBe("PUBLISHED");
    });

    /* -------------------------------------------------- */
    /* SCENARIO 6: Does not see ARCHIVED timetable        */
    /* -------------------------------------------------- */
    const ttArchived = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Archived",
      status: "ARCHIVED",
      createdBy: ctx.hodTeacher._id,
    });
    await addSubjectSlot(ttArchived, "ArchSub", "AS1", "FRI", "09:00");

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    slots.forEach((slot) => {
      expect(slot.timetable_id.status).toBe("PUBLISHED");
    });

    /* -------------------------------------------------- */
    /* SCENARIO 7: Division filtering works               */
    /* -------------------------------------------------- */
    student.currentSemester = 1;
    student.currentAcademicYear = ACADEMIC_YEAR_1;
    student.division = "A";
    await student.save();

    const ttDivA = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: "A",
      name: "TT Div A",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await addSubjectSlot(ttDivA, "DivA Sub", "DA1", "MON", "10:00");

    const ttDivB = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: "B",
      name: "TT Div B",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await addSubjectSlot(ttDivB, "DivB Sub", "DB1", "TUE", "10:00");

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.division).toBe("A");
    });

    /* -------------------------------------------------- */
    /* SCENARIO 8: Cross-tenant timetable not returned    */
    /* -------------------------------------------------- */
    await clearTimetables();
    const collegeB = await createCollege({
      code: "STTB",
      name: "Cross Tenant College",
      email: "crosstenant@test.com",
    });
    const hodUserB = await createUser({
      email: "hod-b@test.com",
      password: "Test@123",
      role: "HOD",
      college_id: collegeB._id,
      isActive: true,
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
      createdBy: hodUserB._id,
    });
    const hodTeacherB = await createTeacher({
      name: "HOD B",
      user_id: hodUserB._id,
      email: "hod-b@test.com",
      college_id: collegeB._id,
      department_id: deptB._id,
      employeeId: "EMP-HOD-B",
      designation: "HOD",
      status: "ACTIVE",
      createdBy: hodUserB._id,
    });
    deptB.hod_id = hodTeacherB._id;
    await deptB.save();

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
      createdBy: hodUserB._id,
    });

    const subA = await createSubject(ctx, "Tenant A", "TA1", 1);
    const ttCollegeA = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT College A",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await createSlot(ctx, ttCollegeA, subA, "MON", "09:00");

    const subB = await Subject.create({
      college_id: collegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      name: "Tenant B",
      code: "TB1",
      semester: 1,
      teacher_id: hodTeacherB._id,
      credits: 3,
      status: "ACTIVE",
      createdBy: hodUserB._id,
    });
    const ttCollegeB = await Timetable.create({
      college_id: collegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT College B",
      status: "PUBLISHED",
      createdBy: hodTeacherB._id,
    });
    await TimetableSlot.create({
      college_id: collegeB._id,
      timetable_id: ttCollegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      subject_id: subB._id,
      teacher_id: hodTeacherB._id,
      day: "TUE",
      startTime: "09:00",
      endTime: "10:00",
      room: "R1",
      slotType: "LECTURE",
      division: null,
    });

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    slots.forEach((slot) => {
      expect(slot.college_id.toString()).toBe(ctx.college._id.toString());
    });

    /* -------------------------------------------------- */
    /* SCENARIO 9: No matching timetable returns empty    */
    /* -------------------------------------------------- */
    student.currentSemester = 3;
    student.currentAcademicYear = ACADEMIC_YEAR_1;
    await student.save();

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    expect(slots.length).toBe(0);
    expect(res.body.data?.count).toBe(0);

    /* -------------------------------------------------- */
    /* SCENARIO 10: Different academic year, same        */
    /*             semester - not seen                    */
    /* -------------------------------------------------- */
    await clearTimetables();
    student.currentSemester = 1;
    student.currentAcademicYear = ACADEMIC_YEAR_1;
    await student.save();

    const subM = await createSubject(ctx, "Multi", "MU1", 1);

    const ttCur = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_1,
      division: null,
      name: "TT Cur",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await createSlot(ctx, ttCur, subM, "MON", "09:00");

    const ttOld = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: ACADEMIC_YEAR_2,
      division: null,
      name: "TT Old",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await createSlot(ctx, ttOld, subM, "TUE", "09:00");

    const ttNext = await Timetable.create({
      college_id: ctx.college._id,
      department_id: ctx.department._id,
      course_id: ctx.course._id,
      semester: 1,
      academicYear: "2027-2028",
      division: null,
      name: "TT Next",
      status: "PUBLISHED",
      createdBy: ctx.hodTeacher._id,
    });
    await createSlot(ctx, ttNext, subM, "WED", "09:00");

    res = await studentAgent.get("/api/timetable/student").expect(200);
    slots = res.body.data?.slots || [];
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((slot) => {
      expect(slot.timetable_id.academicYear).toBe(ACADEMIC_YEAR_1);
      expect(slot.timetable_id.semester).toBe(1);
    });
  });
});
