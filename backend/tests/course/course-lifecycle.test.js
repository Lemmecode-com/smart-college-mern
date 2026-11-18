const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createSubject,
  createStudent,
} = require("../helpers/factories");
const app = require("../../app");
const Course = require("../../src/models/course.model");
const Department = require("../../src/models/department.model");
const Timetable = require("../../src/models/timetable.model");
const Exam = require("../../src/models/exam.model");
const AuditLog = require("../../src/models/auditLog.model");

const PW = "Test@123";
const getErrorCode = (res) => res.body.code || res.body.error?.code;
const getErrorMessage = (res) => res.body.message || res.body.error?.message;

describe("Course Lifecycle — Deactivate & Reactivate", () => {
  let collegeA, collegeB;
  let adminA, adminB, teacherA, coordA;
  let adminTokenA, adminTokenB, teacherTokenA, coordTokenA;
  let deptA;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Create Colleges
    const rand = Math.random().toString(36).substring(2, 8);
    collegeA = await createCollege({ name: "College Alpha", code: `ALP${rand.substring(0, 3).toUpperCase()}`, email: `alpha-${rand}@test.com` });
    collegeB = await createCollege({ name: "College Beta", code: `BET${rand.substring(0, 3).toUpperCase()}`, email: `beta-${rand}@test.com` });

    // College A Admin
    adminA = await createUser({
      email: "admin.a@alpha.edu",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: collegeA._id,
      isActive: true,
    });

    // College B Admin
    adminB = await createUser({
      email: "admin.b@beta.edu",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: collegeB._id,
      isActive: true,
    });

    // College A Teacher
    teacherA = await createUser({
      email: "teacher.a@alpha.edu",
      password: PW,
      role: "TEACHER",
      college_id: collegeA._id,
      isActive: true,
    });

    // College A Exam Coordinator
    coordA = await createUser({
      email: "coord.a@alpha.edu",
      password: PW,
      role: "EXAM_COORDINATOR",
      college_id: collegeA._id,
      isActive: true,
    });

    deptA = await createDepartment({
      college_id: collegeA._id,
      name: "Computer Science Dept",
      code: "CSD",
      createdBy: adminA._id,
      status: "ACTIVE",
      isActive: true,
    });

    // Login Admin A
    const resA = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.a@alpha.edu", password: PW });
    adminTokenA = resA.headers["set-cookie"];

    // Login Admin B
    const resB = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin.b@beta.edu", password: PW });
    adminTokenB = resB.headers["set-cookie"];

    // Login Teacher A
    const resTeacher = await request(app)
      .post("/api/auth/login")
      .send({ email: "teacher.a@alpha.edu", password: PW });
    teacherTokenA = resTeacher.headers["set-cookie"];

    // Login Coord A
    const resCoord = await request(app)
      .post("/api/auth/login")
      .send({ email: "coord.a@alpha.edu", password: PW });
    coordTokenA = resCoord.headers["set-cookie"];
  });

  describe("Deactivate Course", () => {
    it("successfully deactivates an active course with no dependants and writes audit log", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Computer Science and Engineering",
        code: "CSE",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.course.status).toBe("INACTIVE");
      expect(res.body.data.course.isActive).toBe(false);

      // Verify in DB
      const updated = await Course.findById(course._id);
      expect(updated.status).toBe("INACTIVE");
      expect(updated.isActive).toBe(false);

      // Verify Audit Log
      const audit = await AuditLog.findOne({
        resourceId: course._id,
        action: "COURSE_DEACTIVATED",
      });
      expect(audit).not.toBeNull();
      expect(audit.collegeId.toString()).toBe(collegeA._id.toString());
      expect(audit.userId.toString()).toBe(adminA._id.toString());
      expect(audit.oldValues.isActive).toBe(true);
      expect(audit.newValues.isActive).toBe(false);
    });

    it("returns 400 when attempting to deactivate an already inactive course", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Inactive Course",
        code: "INACT",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("COURSE_ALREADY_INACTIVE");
    });

    it("enforces tenant isolation — admin of college B cannot deactivate college A course", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Alpha Course",
        code: "ALC",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", adminTokenB)
        .expect(404);

      expect(getErrorCode(res)).toBe("COURSE_NOT_FOUND");
    });

    it("blocks teacher role from deactivating a course (403)", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Alpha Course",
        code: "ALC",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", teacherTokenA)
        .expect(403);
    });

    it("blocks deactivation when course has active students enrolled", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "B.Tech CSE",
        code: "BTCSE",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await createStudent({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: course._id,
        fullName: "Active Student",
        email: "student.active@test.com",
        status: "ENROLLED",
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("COURSE_HAS_ACTIVE_STUDENTS");
    });

    it("blocks deactivation when course has active subjects", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "B.Tech IT",
        code: "BTIT",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: course._id,
        name: "Algorithms",
        code: "ALGO",
        status: "ACTIVE",
        isActive: true,
        createdBy: adminA._id,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("COURSE_HAS_ACTIVE_SUBJECTS");
    });

    it("blocks deactivation when course has active published timetables", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "B.Tech Mech",
        code: "BTME",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await Timetable.create({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: course._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "Mech Sem 1 TT",
        status: "PUBLISHED",
        createdBy: adminA._id,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("COURSE_HAS_ACTIVE_TIMETABLE");
    });

    it("blocks deactivation when course has active published exams", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "B.Tech Civil",
        code: "BTCE",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await Exam.create({
        college_id: collegeA._id,
        name: "Civil End Term",
        course_id: course._id,
        semester: 1,
        academicYear: "2025-2026",
        status: "PUBLISHED",
        createdBy: adminA._id,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("COURSE_HAS_ACTIVE_EXAMS");
    });
  });

  describe("Reactivate Course", () => {
    it("successfully reactivates an inactive course when parent department is active and writes audit log", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Electronics Eng",
        code: "ECE",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.course.status).toBe("ACTIVE");
      expect(res.body.data.course.isActive).toBe(true);

      const updated = await Course.findById(course._id);
      expect(updated.status).toBe("ACTIVE");
      expect(updated.isActive).toBe(true);

      // Verify Audit Log
      const audit = await AuditLog.findOne({
        resourceId: course._id,
        action: "COURSE_REACTIVATED",
      });
      expect(audit).not.toBeNull();
      expect(audit.oldValues.isActive).toBe(false);
      expect(audit.newValues.isActive).toBe(true);
    });

    it("returns 400 when attempting to reactivate an already active course", async () => {
      const course = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Active Course",
        code: "ACT",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("COURSE_ALREADY_ACTIVE");
    });

    it("blocks reactivation when parent department is inactive", async () => {
      const inactiveDept = await createDepartment({
        college_id: collegeA._id,
        name: "Inactive Dept",
        code: "INCD",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const course = await createCourse({
        college_id: collegeA._id,
        department_id: inactiveDept._id,
        name: "Orphaned Course",
        code: "ORPH",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/courses/${course._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_INACTIVE");
      expect(getErrorMessage(res)).toContain("department is inactive");
    });
  });

  describe("Lists, Dropdowns & New-record creation guards", () => {
    it("excludes inactive courses by default from getCoursesByDepartment and getAllCourses, but includes when includeInactive=true", async () => {
      const activeCourse = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Active Course",
        code: "ACTC",
        status: "ACTIVE",
        isActive: true,
        createdBy: adminA._id,
      });

      const inactiveCourse = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Inactive Course",
        code: "INACTC",
        status: "INACTIVE",
        isActive: false,
        createdBy: adminA._id,
      });

      // Default: active only
      const resDefault = await request(app)
        .get(`/api/courses/department/${deptA._id}`)
        .set("Cookie", adminTokenA)
        .expect(200);

      const defaultIds = resDefault.body.data.courses.map((c) => c._id.toString());
      expect(defaultIds).toContain(activeCourse._id.toString());
      expect(defaultIds).not.toContain(inactiveCourse._id.toString());

      // With includeInactive=true
      const resAll = await request(app)
        .get(`/api/courses/department/${deptA._id}?includeInactive=true`)
        .set("Cookie", adminTokenA)
        .expect(200);

      const allIds = resAll.body.data.courses.map((c) => c._id.toString());
      expect(allIds).toContain(activeCourse._id.toString());
      expect(allIds).toContain(inactiveCourse._id.toString());
    });

    it("blocks creating a subject under an inactive course", async () => {
      const inactiveCourse = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Closed Course",
        code: "CLSD",
        status: "INACTIVE",
        isActive: false,
        createdBy: adminA._id,
      });

      const res = await request(app)
        .post("/api/subjects")
        .set("Cookie", adminTokenA)
        .send({
          course_id: inactiveCourse._id,
          name: "New Subject",
          code: "NEWSUB",
          semester: 1,
          credits: 3,
        })
        .expect(400);

      expect(getErrorCode(res)).toBe("COURSE_INACTIVE");
    });

    it("blocks creating an exam for an inactive course", async () => {
      const inactiveCourse = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Closed Course 2",
        code: "CLSD2",
        status: "INACTIVE",
        isActive: false,
        createdBy: adminA._id,
      });

      const sub = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: inactiveCourse._id,
        name: "Sub",
        code: "SUB1",
        semester: 1,
        status: "ACTIVE",
        isActive: true,
        createdBy: adminA._id,
      });

      const res = await request(app)
        .post("/api/exam")
        .set("Cookie", coordTokenA)
        .send({
          name: "Exam Closed",
          course_id: inactiveCourse._id,
          semester: 1,
          academicYear: "2025-2026",
          subjects: [sub._id.toString()],
        })
        .expect(400);

      expect(getErrorCode(res)).toBe("COURSE_INACTIVE");
      expect(getErrorMessage(res)).toContain("inactive course");
    });
  });
});
