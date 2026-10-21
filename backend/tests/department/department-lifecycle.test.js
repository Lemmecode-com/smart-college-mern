const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createTeacher,
  createStudent,
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Department = require("../../src/models/department.model");
const AuditLog = require("../../src/models/auditLog.model");

const PW = "Test@123";
const getErrorCode = (res) => res.body.code || res.body.error?.code;
const getErrorMessage = (res) => res.body.message || res.body.error?.message;

describe("Department Lifecycle — Deactivate & Reactivate", () => {
  let collegeA, collegeB;
  let adminA, adminB, teacherA;
  let adminTokenA, adminTokenB, teacherTokenA;

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
  });

  describe("Deactivate Department", () => {
    it("successfully deactivates an active department with no dependants and writes audit log", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Mechanical Engineering",
        code: "MECH",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.department.status).toBe("INACTIVE");
      expect(res.body.data.department.isActive).toBe(false);

      // Verify in database
      const updated = await Department.findById(dept._id);
      expect(updated.status).toBe("INACTIVE");
      expect(updated.isActive).toBe(false);

      // Verify Audit Log
      const audit = await AuditLog.findOne({
        resourceId: dept._id,
        action: "DEPARTMENT_DEACTIVATED",
      });
      expect(audit).not.toBeNull();
      expect(audit.collegeId.toString()).toBe(collegeA._id.toString());
      expect(audit.userId.toString()).toBe(adminA._id.toString());
    });

    it("returns 400 when attempting to deactivate an already inactive department", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Civil Engineering",
        code: "CIVIL",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_ALREADY_INACTIVE");
    });

    it("blocks deactivation when an HOD is assigned", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Computer Science",
        code: "CS",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const teacher = await createTeacher({
        college_id: collegeA._id,
        department_id: dept._id,
        name: "Prof HOD",
        createdBy: adminA._id,
      });

      dept.hod_id = teacher._id;
      await dept.save();

      const res = await request(app)
        .put(`/api/departments/${dept._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_HAS_ACTIVE_HOD");
      expect(getErrorMessage(res)).toMatch(/assigned HOD/i);
    });

    it("blocks deactivation when active teachers exist in the department", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Information Technology",
        code: "IT",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await createTeacher({
        college_id: collegeA._id,
        department_id: dept._id,
        name: "Active Teacher",
        status: "ACTIVE",
        createdBy: adminA._id,
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_HAS_ACTIVE_TEACHERS");
      expect(getErrorMessage(res)).toMatch(/active teacher/i);
    });

    it("blocks deactivation when active students exist in the department", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Biotechnology",
        code: "BIOT",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const course = await createCourse({
        college_id: collegeA._id,
        department_id: dept._id,
        createdBy: adminA._id,
      });

      await createStudent({
        college_id: collegeA._id,
        department_id: dept._id,
        course_id: course._id,
        status: "APPROVED",
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_HAS_ACTIVE_STUDENTS");
      expect(getErrorMessage(res)).toMatch(/active student/i);
    });

    it("blocks deactivation when active courses exist in the department", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Electronics",
        code: "ELEC",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      await createCourse({
        college_id: collegeA._id,
        department_id: dept._id,
        status: "ACTIVE",
        createdBy: adminA._id,
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_HAS_ACTIVE_COURSES");
      expect(getErrorMessage(res)).toMatch(/active course/i);
    });

    it("blocks deactivation when active subjects exist in the department", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Aerospace",
        code: "AERO",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const course = await createCourse({
        college_id: collegeA._id,
        department_id: dept._id,
        status: "INACTIVE", // Course itself is inactive
        createdBy: adminA._id,
      });

      await createSubject({
        college_id: collegeA._id,
        department_id: dept._id,
        course_id: course._id,
        status: "ACTIVE",
        createdBy: adminA._id,
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/deactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_HAS_ACTIVE_SUBJECTS");
      expect(getErrorMessage(res)).toMatch(/active subject/i);
    });
  });

  describe("Reactivate Department", () => {
    it("successfully reactivates an inactive department and writes audit log", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Chemical Engineering",
        code: "CHEM",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.department.status).toBe("ACTIVE");
      expect(res.body.data.department.isActive).toBe(true);

      const updated = await Department.findById(dept._id);
      expect(updated.status).toBe("ACTIVE");
      expect(updated.isActive).toBe(true);

      const audit = await AuditLog.findOne({
        resourceId: dept._id,
        action: "DEPARTMENT_REACTIVATED",
      });
      expect(audit).not.toBeNull();
      expect(audit.collegeId.toString()).toBe(collegeA._id.toString());
      expect(audit.userId.toString()).toBe(adminA._id.toString());
    });

    it("returns 400 when attempting to reactivate an already active department", async () => {
      const dept = await createDepartment({
        college_id: collegeA._id,
        name: "Robotics",
        code: "ROBO",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/departments/${dept._id}/reactivate`)
        .set("Cookie", adminTokenA)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_ALREADY_ACTIVE");
    });
  });

  describe("Tenant Isolation & Role Authorization", () => {
    it("rejects deactivation from another college admin (404 tenant isolation)", async () => {
      const deptA = await createDepartment({
        college_id: collegeA._id,
        name: "Physics",
        code: "PHYS",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      // Admin B belongs to College B
      const res = await request(app)
        .put(`/api/departments/${deptA._id}/deactivate`)
        .set("Cookie", adminTokenB)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_NOT_FOUND");
    });

    it("rejects reactivate from another college admin (404 tenant isolation)", async () => {
      const deptA = await createDepartment({
        college_id: collegeA._id,
        name: "Mathematics",
        code: "MATH",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .put(`/api/departments/${deptA._id}/reactivate`)
        .set("Cookie", adminTokenB)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_NOT_FOUND");
    });

    it("rejects non-admin roles (TEACHER gets 403)", async () => {
      const deptA = await createDepartment({
        college_id: collegeA._id,
        name: "Botany",
        code: "BOTA",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/departments/${deptA._id}/deactivate`)
        .set("Cookie", teacherTokenA)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe("Dropdowns & New Record Forms Exclusion", () => {
    it("excludes inactive departments from default GET /api/departments", async () => {
      const activeDept = await createDepartment({
        college_id: collegeA._id,
        name: "Active Dept",
        code: "ACTV",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const inactiveDept = await createDepartment({
        college_id: collegeA._id,
        name: "Inactive Dept",
        code: "INACT",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .get("/api/departments")
        .set("Cookie", adminTokenA)
        .expect(200);

      const depts = res.body.data.departments;
      const ids = depts.map((d) => d._id.toString());
      expect(ids).toContain(activeDept._id.toString());
      expect(ids).not.toContain(inactiveDept._id.toString());
    });

    it("includes inactive departments when includeInactive=true is passed", async () => {
      const activeDept = await createDepartment({
        college_id: collegeA._id,
        name: "Active Dept 2",
        code: "ACT2",
        createdBy: adminA._id,
        status: "ACTIVE",
        isActive: true,
      });

      const inactiveDept = await createDepartment({
        college_id: collegeA._id,
        name: "Inactive Dept 2",
        code: "INA2",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .get("/api/departments?includeInactive=true")
        .set("Cookie", adminTokenA)
        .expect(200);

      const depts = res.body.data.departments;
      const ids = depts.map((d) => d._id.toString());
      expect(ids).toContain(activeDept._id.toString());
      expect(ids).toContain(inactiveDept._id.toString());
    });

    it("rejects creating a new course under an inactive department", async () => {
      const inactiveDept = await createDepartment({
        college_id: collegeA._id,
        name: "Archived Dept",
        code: "ARCH",
        createdBy: adminA._id,
        status: "INACTIVE",
        isActive: false,
      });

      const res = await request(app)
        .post("/api/courses")
        .set("Cookie", adminTokenA)
        .send({
          department_id: inactiveDept._id,
          name: "New Course",
          code: "NEWC",
          type: "THEORY",
          programLevel: "UG",
          durationSemesters: 6,
          maxStudents: 50,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(getErrorCode(res)).toBe("DEPARTMENT_INACTIVE");
    });
  });
});
