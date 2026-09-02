/**
 * Tests for the HOD Timetable lifecycle fix:
 * archive -> unarchive -> edit -> publish, and the rule that
 * ARCHIVED timetables must NOT block creation of a new active timetable.
 *
 * Run: npx jest tests/timetable/timetable-archive-lifecycle.test.js --runInBand
 */
const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser, createTeacher } = require("../helpers/factories");
const { loginAsHOD } = require("../helpers/testAuth");
const app = require("../../app");

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const Timetable = require("../../src/models/timetable.model");

// Build a college + department (with HOD) + course + HOD user, and log in.
async function setupHODContext(suffix = "") {
  const college = await createCollege({
    code: `ARC${suffix}`,
    name: `Archive College ${suffix}`,
    email: `arc${suffix}@test.com`,
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
    hod_id: null, // set after teacher is created
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

  // Link department to its HOD
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

  const { agent } = await loginAsHOD(app, `hod${suffix}@test.com`, "Test@123");

  return { college, hodUser, hodTeacher, department, course, agent };
}

describe("HOD Timetable Archive/Unarchive Lifecycle", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe("Create", () => {
    it("1. creates a timetable when no existing timetable exists", async () => {
      const { course, department, agent } = await setupHODContext("-c1");

      const res = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);

      expect(res.body.data.timetable).toBeDefined();
      expect(res.body.data.timetable.status).toBe("DRAFT");
    });

    it("2. creates a new timetable when only an ARCHIVED timetable exists for the same context", async () => {
      const { course, department, agent } = await setupHODContext("-c2");

      // First timetable -> publish -> archive
      const first = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const firstId = first.body.data.timetable._id;

      await agent.put(`/api/timetable/${firstId}/publish`).expect(200);
      await agent.put(`/api/timetable/${firstId}/archive`).expect(200);

      // Second timetable for the SAME context should succeed
      const second = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);

      expect(second.body.data.timetable.status).toBe("DRAFT");

      // Both records should exist
      const count = await Timetable.countDocuments({
        college_id: (await course.populate("college_id")).college_id || course.college_id,
      });
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("3. blocks creation when a DRAFT timetable already exists for the same context", async () => {
      const { course, department, agent } = await setupHODContext("-c3");

      await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);

      const res = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(400);

      expect(res.body.message).toMatch(/active timetable already exists/i);
    });

    it("4. blocks creation when a PUBLISHED timetable already exists for the same context", async () => {
      const { course, department, agent } = await setupHODContext("-c4");

      const first = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const firstId = first.body.data.timetable._id;
      await agent.put(`/api/timetable/${firstId}/publish`).expect(200);

      const res = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(400);

      expect(res.body.message).toMatch(/active timetable already exists/i);
    });
  });

  describe("Archive", () => {
    it("5. archives a published timetable and sets status to ARCHIVED", async () => {
      const { course, department, agent } = await setupHODContext("-a5");

      const created = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const id = created.body.data.timetable._id;

      await agent.put(`/api/timetable/${id}/publish`).expect(200);

      const res = await agent.put(`/api/timetable/${id}/archive`).expect(200);
      expect(res.body.data.timetable.status).toBe("ARCHIVED");
    });
  });

  describe("Unarchive", () => {
    it("6. unarchives an archived timetable and restores it to DRAFT", async () => {
      const { course, department, agent } = await setupHODContext("-u6");

      const created = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const id = created.body.data.timetable._id;

      await agent.put(`/api/timetable/${id}/publish`).expect(200);
      await agent.put(`/api/timetable/${id}/archive`).expect(200);

      const res = await agent.put(`/api/timetable/${id}/unarchive`).expect(200);
      expect(res.body.data.timetable.status).toBe("DRAFT");
    });

    it("7. blocks unarchive when an active conflicting timetable exists", async () => {
      const { course, department, agent } = await setupHODContext("-u7");

      // First timetable -> publish -> archive
      const first = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const firstId = first.body.data.timetable._id;
      await agent.put(`/api/timetable/${firstId}/publish`).expect(200);
      await agent.put(`/api/timetable/${firstId}/archive`).expect(200);

      // Create a NEW active timetable for the same context (allowed because first is archived)
      const second = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);

      // Now unarchive the first one — should be blocked (conflict with active second)
      const res = await agent
        .put(`/api/timetable/${firstId}/unarchive`)
        .expect(409);

      expect(res.body.message).toMatch(/active timetable already exists/i);

      // First timetable should still be ARCHIVED
      const check = await Timetable.findById(firstId);
      expect(check.status).toBe("ARCHIVED");
      // Second timetable should still be DRAFT
      const checkSecond = await Timetable.findById(second.body.data.timetable._id);
      expect(checkSecond.status).toBe("DRAFT");
    });

    it("8. allows unarchive after the conflicting active timetable is itself archived", async () => {
      const { course, department, agent } = await setupHODContext("-u8");

      const first = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const firstId = first.body.data.timetable._id;
      await agent.put(`/api/timetable/${firstId}/publish`).expect(200);
      await agent.put(`/api/timetable/${firstId}/archive`).expect(200);

      // Create + publish a new active timetable for the same context
      const second = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const secondId = second.body.data.timetable._id;
      await agent.put(`/api/timetable/${secondId}/publish`).expect(200);

      // Unarchive first — blocked while second is active
      await agent.put(`/api/timetable/${firstId}/unarchive`).expect(409);

      // Archive the second one
      await agent.put(`/api/timetable/${secondId}/archive`).expect(200);

      // Now unarchive first — should succeed
      const res = await agent.put(`/api/timetable/${firstId}/unarchive`).expect(200);
      expect(res.body.data.timetable.status).toBe("DRAFT");
    });
  });

  describe("Full lifecycle", () => {
    it("9. supports archive -> unarchive -> publish cycle", async () => {
      const { course, department, agent } = await setupHODContext("-f9");

      const created = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const id = created.body.data.timetable._id;

      await agent.put(`/api/timetable/${id}/publish`).expect(200);
      await agent.put(`/api/timetable/${id}/archive`).expect(200);
      const unarchived = await agent.put(`/api/timetable/${id}/unarchive`).expect(200);
      expect(unarchived.body.data.timetable.status).toBe("DRAFT");

      const republished = await agent.put(`/api/timetable/${id}/publish`).expect(200);
      expect(republished.body.data.timetable.status).toBe("PUBLISHED");
    });
  });

  describe("Authorization", () => {
    it("10. rejects unarchive from a non-HOD (teacher) with 403", async () => {
      const { course, department, agent } = await setupHODContext("-auth10");

      // Create + publish + archive a timetable as HOD
      const created = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const id = created.body.data.timetable._id;
      await agent.put(`/api/timetable/${id}/publish`).expect(200);
      await agent.put(`/api/timetable/${id}/archive`).expect(200);

      // Create a regular teacher in the same college/department
      const teacherUser = await createUser({
        email: `teacher-auth10@test.com`,
        password: "Test@123",
        role: "TEACHER",
        college_id: course.college_id,
        isActive: true,
      });
      await createTeacher({
        name: "Regular Teacher",
        user_id: teacherUser._id,
        email: `teacher-auth10@test.com`,
        college_id: course.college_id,
        department_id: department._id,
        employeeId: "EMP-TCH-AUTH10",
        designation: "Teacher",
        status: "ACTIVE",
        createdBy: teacherUser._id,
      });

      const { agent: teacherAgent } = await loginAsHOD(
        app,
        `teacher-auth10@test.com`,
        "Test@123",
      );

      await teacherAgent.put(`/api/timetable/${id}/unarchive`).expect(403);
    });

    it("11. rejects unarchive of a timetable that is not ARCHIVED with 400", async () => {
      const { course, department, agent } = await setupHODContext("-auth11");

      const created = await agent
        .post("/api/timetable")
        .send({
          department_id: department._id,
          course_id: course._id,
          semester: 1,
          academicYear: "2025-2026",
          division: "A",
        })
        .expect(201);
      const id = created.body.data.timetable._id;

      // Try to unarchive a DRAFT timetable
      const res = await agent.put(`/api/timetable/${id}/unarchive`).expect(400);
      expect(res.body.message).toMatch(/only archived timetables can be unarchived/i);
    });
  });
});
