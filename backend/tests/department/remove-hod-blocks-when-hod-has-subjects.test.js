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

describe("DELETE /departments/:id/hod — HOD removal blocked by ACTIVE subjects", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("blocks removal when the HOD has ACTIVE subjects", async () => {
    const college = await createCollege({ code: "HOD-BLOCK-01" });
    const admin = await createUser({
      email: "admin.hod-block-01@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const hodUser = await createUser({
      email: "hod.hod-block-01@test.com",
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      code: "CS",
      createdBy: admin._id,
    });

    const hodTeacher = await createTeacher({
      college_id: college._id,
      user_id: hodUser._id,
      department_id: department._id,
      email: "hod.hod-block-01@test.com",
      employeeId: "EMP-HOD-01",
      name: "HOD Teacher",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    // Assign HOD to department
    department.hod_id = hodTeacher._id;
    await department.save();

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: "B Tech Computer Science",
      code: "BTCS",
      type: "BOTH",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    // Create an ACTIVE subject assigned to the HOD
    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      teacher_id: hodTeacher._id,
      name: "Data Structures",
      code: "DS",
      semester: 1,
      credits: 3,
      status: "ACTIVE",
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .delete(`/api/departments/${department._id}/hod`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("SUBJECTS_STILL_ASSIGNED");
    expect(res.body.error.details.subjectCount).toBe(1);

    // Department unchanged
    const dbDept = await Department.findById(department._id);
    expect(String(dbDept.hod_id)).toBe(String(hodTeacher._id));

    // User role unchanged
    const dbUser = await User.findById(hodUser._id);
    expect(dbUser.role).toBe("HOD");

    // Teacher unchanged
    const dbTeacher = await Teacher.findById(hodTeacher._id);
    expect(dbTeacher.status).toBe("ACTIVE");

    // Subject unchanged
    const dbSubject = await Subject.findById(subject._id);
    expect(String(dbSubject.teacher_id)).toBe(String(hodTeacher._id));
  });

  it("does NOT block removal for INACTIVE subjects (only ACTIVE count matters)", async () => {
    const college = await createCollege({ code: "HOD-BLOCK-02" });
    const admin = await createUser({
      email: "admin.hod-block-02@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const hodUser = await createUser({
      email: "hod.hod-block-02@test.com",
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });

    const department = await createDepartment({
      college_id: college._id,
      name: "Mathematics",
      code: "MATH",
      createdBy: admin._id,
    });

    const hodTeacher = await createTeacher({
      college_id: college._id,
      user_id: hodUser._id,
      department_id: department._id,
      email: "hod.hod-block-02@test.com",
      employeeId: "EMP-HOD-02",
      name: "HOD Teacher 2",
      status: "ACTIVE",
      createdBy: admin._id,
    });

    department.hod_id = hodTeacher._id;
    await department.save();

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: "B Tech Mathematics",
      code: "BTMATH",
      type: "BOTH",
      programLevel: "UG",
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    // Only an INACTIVE subject assigned — should NOT block
    await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      teacher_id: hodTeacher._id,
      name: "Inactive Subject",
      code: "INACT",
      semester: 1,
      credits: 3,
      status: "INACTIVE",
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .delete(`/api/departments/${department._id}/hod`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const dbDept = await Department.findById(department._id);
    expect(dbDept.hod_id).toBeNull();
  });
});