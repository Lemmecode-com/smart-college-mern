const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createTeacher,
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Subject = require("../../src/models/subject.model");
const Course = require("../../src/models/course.model");
const Department = require("../../src/models/department.model");
const Timetable = require("../../src/models/timetable.model");
const TimetableSlot = require("../../src/models/timetableSlot.model");
const Exam = require("../../src/models/exam.model");
const SemesterResult = require("../../src/models/semesterResult.model");
const AuditLog = require("../../src/models/auditLog.model");
const { RESULT_STATUS } = require("../../src/utils/constants");

const PW = "Test@123";
const getErrorCode = (res) => res.body.code || res.body.error?.code;
const getErrorMessage = (res) => res.body.message || res.body.error?.message;

describe("Subject Lifecycle — Deactivate & Reactivate", () => {
  let collegeA, collegeB;
  let adminA, adminB, teacherA, coordA;
  let adminTokenA, adminTokenB, teacherTokenA, coordTokenA;
  let deptA, courseA;

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

    courseA = await createCourse({
      college_id: collegeA._id,
      department_id: deptA._id,
      name: "Computer Science and Engineering",
      code: "CSE",
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

  describe("Deactivate Subject", () => {
    it("successfully deactivates an active subject with no dependants and writes audit log", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Data Structures",
        code: "DS101",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subject.status).toBe("INACTIVE");
      expect(res.body.data.subject.isActive).toBe(false);

      // Verify in DB
      const updated = await Subject.findById(subject._id);
      expect(updated.status).toBe("INACTIVE");
      expect(updated.isActive).toBe(false);

      // Verify Audit Log
      const audit = await AuditLog.findOne({
        resourceId: subject._id,
        action: "SUBJECT_DEACTIVATED",
      });
      expect(audit).not.toBeNull();
      expect(audit.collegeId.toString()).toBe(collegeA._id.toString());
      expect(audit.userId.toString()).toBe(adminA._id.toString());
      expect(audit.oldValues.isActive).toBe(true);
      expect(audit.newValues.isActive).toBe(false);
    });

    it("returns 400 when attempting to deactivate an already inactive subject", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Inactive Subject",
        code: "INACT",
        semester: 1,
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("SUBJECT_ALREADY_INACTIVE");
    });

    it("enforces tenant isolation — admin of college B cannot deactivate college A subject", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Alpha Subject",
        code: "ASUB",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", adminTokenB)
        .expect(404);

      expect(getErrorCode(res)).toBe("SUBJECT_NOT_FOUND");
    });

    it("blocks teacher role from deactivating a subject (403)", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Alpha Subject",
        code: "ASUB",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", teacherTokenA)
        .expect(403);
    });

    it("blocks deactivation when subject is assigned to an active teacher", async () => {
      const teacher = await createTeacher({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Dr. Smith",
        createdBy: adminA._id,
      });

      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        teacher_id: teacher._id,
        name: "Database Systems",
        code: "DBS",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("SUBJECT_HAS_ASSIGNED_TEACHER");
    });

    it("blocks deactivation when subject is in an active published timetable slot", async () => {
      const teacher = await createTeacher({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Dr. Timetable",
        createdBy: adminA._id,
      });

      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Operating Systems",
        code: "OS101",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const timetable = await Timetable.create({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "CSE Sem 1 Timetable",
        status: "PUBLISHED",
        createdBy: adminA._id,
      });

      await TimetableSlot.create({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        timetable_id: timetable._id,
        day: "MON",
        startTime: "09:00",
        endTime: "10:00",
        subject_id: subject._id,
        teacher_id: teacher._id,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("SUBJECT_IN_ACTIVE_TIMETABLE");
    });

    it("blocks deactivation when subject is in a published exam", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Computer Networks",
        code: "CN101",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await Exam.create({
        college_id: collegeA._id,
        name: "CSE Midterm",
        course_id: courseA._id,
        semester: 1,
        academicYear: "2025-2026",
        status: "PUBLISHED",
        subjects: [{ subject: subject._id, category: "REGULAR" }],
        createdBy: adminA._id,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("SUBJECT_HAS_ACTIVE_EXAMS");
    });

    it("blocks deactivation when subject has draft results / pending marks entry", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Software Engineering",
        code: "SE101",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const exam = await Exam.create({
        college_id: collegeA._id,
        name: "SE Final Exam",
        course_id: courseA._id,
        semester: 1,
        academicYear: "2025-2026",
        status: "DRAFT",
        createdBy: adminA._id,
      });

      await SemesterResult.create({
        college_id: collegeA._id,
        student_id: new mongoose.Types.ObjectId(),
        exam_id: exam._id,
        course_id: courseA._id,
        semester: 1,
        academicYear: "2025-2026",
        status: RESULT_STATUS.DRAFT,
        overallResult: "PASS",
        totalSubjects: 1,
        passedSubjects: 1,
        failedSubjects: 0,
        incompleteSubjects: 0,
        createdBy: adminA._id,
        subjects: [
          {
            subject: subject._id,
            subjectName: subject.name,
            subjectCode: subject.code,
            passed: true,
            status: "PASS",
          },
        ],
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("SUBJECT_HAS_PENDING_RESULTS");
    });
  });

  describe("Reactivate Subject", () => {
    it("successfully reactivates an inactive subject when parent course & department are active and writes audit log", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Web Tech",
        code: "WT101",
        semester: 1,
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subject.status).toBe("ACTIVE");
      expect(res.body.data.subject.isActive).toBe(true);

      const updated = await Subject.findById(subject._id);
      expect(updated.status).toBe("ACTIVE");
      expect(updated.isActive).toBe(true);

      // Verify Audit Log
      const audit = await AuditLog.findOne({
        resourceId: subject._id,
        action: "SUBJECT_REACTIVATED",
      });
      expect(audit).not.toBeNull();
      expect(audit.oldValues.isActive).toBe(false);
      expect(audit.newValues.isActive).toBe(true);
    });

    it("returns 400 when attempting to reactivate an already active subject", async () => {
      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Active Subject",
        code: "ACT",
        semester: 1,
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("SUBJECT_ALREADY_ACTIVE");
    });

    it("blocks reactivation when parent course is inactive", async () => {
      const inactiveCourse = await createCourse({
        college_id: collegeA._id,
        department_id: deptA._id,
        name: "Inactive Parent Course",
        code: "IPC",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: inactiveCourse._id,
        name: "Sub Under Inactive Course",
        code: "SUIC",
        semester: 1,
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("COURSE_INACTIVE");
      expect(getErrorMessage(res)).toContain("course is inactive");
    });

    it("blocks reactivation when parent department is inactive", async () => {
      const inactiveDept = await createDepartment({
        college_id: collegeA._id,
        name: "Inactive Parent Dept",
        code: "IPD",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const activeCourseUnderInactiveDept = await createCourse({
        college_id: collegeA._id,
        department_id: inactiveDept._id,
        name: "Course Under Inactive Dept",
        code: "CUID",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const subject = await createSubject({
        college_id: collegeA._id,
        department_id: inactiveDept._id,
        course_id: activeCourseUnderInactiveDept._id,
        name: "Sub Under Inactive Dept",
        code: "SUID",
        semester: 1,
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/subjects/${subject._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_INACTIVE");
      expect(getErrorMessage(res)).toContain("department is inactive");
    });
  });

  describe("Lists, Dropdowns & Exam Resolution Guards", () => {
    it("excludes inactive subjects by default from getSubjectsByCourse, but includes when includeInactive=true", async () => {
      const activeSub = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Active Sub",
        code: "ACTS",
        semester: 1,
        status: "ACTIVE",
        isActive: true,
        createdBy: adminA._id,
      });

      const inactiveSub = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Inactive Sub",
        code: "INACTS",
        semester: 1,
        status: "INACTIVE",
        isActive: false,
        createdBy: adminA._id,
      });

      // Default: active only
      const resDefault = await request(app)
        .get(`/api/subjects/course/${courseA._id}`)
        .set("Cookie", adminTokenA)
        .expect(200);

      const defaultIds = resDefault.body.map((s) => s._id.toString());
      expect(defaultIds).toContain(activeSub._id.toString());
      expect(defaultIds).not.toContain(inactiveSub._id.toString());

      // With includeInactive=true
      const resAll = await request(app)
        .get(`/api/subjects/course/${courseA._id}?includeInactive=true`)
        .set("Cookie", adminTokenA)
        .expect(200);

      const allIds = resAll.body.map((s) => s._id.toString());
      expect(allIds).toContain(activeSub._id.toString());
      expect(allIds).toContain(inactiveSub._id.toString());
    });

    it("blocks scheduling an inactive subject in an exam", async () => {
      const inactiveSub = await createSubject({
        college_id: collegeA._id,
        department_id: deptA._id,
        course_id: courseA._id,
        name: "Retired Subject",
        code: "RETIRED",
        semester: 1,
        status: "INACTIVE",
        isActive: false,
        createdBy: adminA._id,
      });

      const res = await request(app)
        .post("/api/exam")
        .set("Cookie", coordTokenA)
        .send({
          name: "Midterm Exam",
          course_id: courseA._id,
          semester: 1,
          academicYear: "2025-2026",
          subjects: [inactiveSub._id.toString()],
        })
        .expect(400);

      expect(getErrorCode(res)).toBe("SUBJECT_INACTIVE");
      expect(getErrorMessage(res)).toContain("inactive subject");
    });
  });
});
