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
  createTeacher,
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Department = require("../../src/models/department.model");
const Teacher = require("../../src/models/teacher.model");
const User = require("../../src/models/user.model");
const Subject = require("../../src/models/subject.model");

describe("DELETE /departments/:id/hod — HOD removal succeeds with zero ACTIVE subjects", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("removes the HOD and demotes the User when no ACTIVE subjects exist", async () => {
    const college = await createCollege({ code: "HOD-OK-01" });
    const admin = await createUser({
      email: "admin.hod-ok-01@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const hodUser = await createUser({
      email: "hod.hod-ok-01@test.com",
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Physics",
      code: "PHY",
      createdBy: admin._id,
    });

    const hodTeacher = await createTeacher({
      college_id: college._id,
      user_id: hodUser._id,
      department_id: department._id,
      email: "hod.hod-ok-01@test.com",
      employeeId: "EMP-HOD-OK-01",
      name: "HOD Teacher Ok",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    department.hod_id = hodTeacher._id;
    await department.save();

    // No ACTIVE subjects assigned to the HOD
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .delete(`/api/departments/${department._id}/hod`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // department.hod_id becomes null
    const dbDept = await Department.findById(department._id);
    expect(dbDept.hod_id).toBeNull();

    // User role demoted HOD -> TEACHER
    const dbUser = await User.findById(hodUser._id);
    expect(dbUser.role).toBe("TEACHER");

    // Teacher normalization: status stays ACTIVE
    const dbTeacher = await Teacher.findById(hodTeacher._id);
    expect(dbTeacher.status).toBe("ACTIVE");
    expect(String(dbTeacher.department_id)).toBe(String(department._id));
  });

  it("does NOT modify any Subject records during HOD removal", async () => {
    const college = await createCollege({ code: "HOD-OK-02" });
    const admin = await createUser({
      email: "admin.hod-ok-02@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const hodUser = await createUser({
      email: "hod.hod-ok-02@test.com",
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Chemistry",
      code: "CHEM",
      createdBy: admin._id,
    });

    const hodTeacher = await createTeacher({
      college_id: college._id,
      user_id: hodUser._id,
      department_id: department._id,
      email: "hod.hod-ok-02@test.com",
      employeeId: "EMP-HOD-OK-02",
      name: "HOD Teacher Ok 2",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    department.hod_id = hodTeacher._id;
    await department.save();

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: "B Tech Chemistry",
      code: "BTCHEM",
      type: "BOTH",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    // Pre-existing subject assigned to a DIFFERENT teacher — must be untouched
    const otherUser = await createUser({
      email: "other.hod-ok-02@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });
    const otherTeacher = await createTeacher({
      college_id: college._id,
      user_id: otherUser._id,
      department_id: department._id,
      email: "other.hod-ok-02@test.com",
      employeeId: "EMP-OTHER-02",
      name: "Other Teacher",
      status: "ACTIVE",
      createdBy: admin._id,
    });
    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      teacher_id: otherTeacher._id,
      name: "Organic Chemistry",
      code: "OC",
      semester: 1,
      credits: 4,
      status: "ACTIVE",
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    await agent.delete(`/api/departments/${department._id}/hod`).expect(200);

    const dbSubject = await Subject.findById(subject._id);
    expect(String(dbSubject.teacher_id)).toBe(String(otherTeacher._id));
    expect(dbSubject.status).toBe("ACTIVE");
  });
});