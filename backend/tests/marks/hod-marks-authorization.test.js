const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createSubject,
  createTeacher,
} = require("../helpers/factories");
const { authorizeTeacher } = require("../../src/controllers/marks.controller");

describe("MARKS — HOD subject authorization", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const setup = async () => {
    const college = await createCollege({
      code: `HMA${Date.now()}`,
      email: `hod-marks.${Date.now()}@test.com`,
    });
    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const hodUser = await createUser({
      email: `hod.${Date.now()}@test.com`,
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });
    const hodTeacher = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: hodUser._id,
      email: `hod-teacher.${Date.now()}@test.com`,
      employeeId: `HOD-${Date.now()}-1`,
      createdBy: hodUser._id,
    });
    const otherTeacherUser = await createUser({
      email: `teacher.${Date.now()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });
    const otherTeacher = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: otherTeacherUser._id,
      email: `other-teacher.${Date.now()}@test.com`,
      employeeId: `TEACHER-${Date.now()}-2`,
      createdBy: otherTeacherUser._id,
    });
    const otherHodUser = await createUser({
      email: `other-hod.${Date.now()}@test.com`,
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });
    const otherHod = await createTeacher({
      college_id: college._id,
      department_id: department._id,
      user_id: otherHodUser._id,
      email: `other-hod-teacher.${Date.now()}@test.com`,
      employeeId: `HOD-${Date.now()}-3`,
      createdBy: otherHodUser._id,
    });

    const createAssignedSubject = async (
      teacherId,
      subjectCollegeId = college._id,
    ) =>
      createSubject({
        college_id: subjectCollegeId,
        course_id: course._id,
        department_id: department._id,
        teacher_id: teacherId,
        createdBy: new mongoose.Types.ObjectId(),
      });

    return {
      college,
      hodUser,
      hodTeacher,
      otherTeacher,
      otherHod,
      createAssignedSubject,
    };
  };

  const hodRequest = (hodUser) => ({
    user: { id: hodUser._id, role: "HOD" },
  });

  it("authorizes an HOD for their assigned subject", async () => {
    const { college, hodUser, hodTeacher, createAssignedSubject } =
      await setup();
    const subject = await createAssignedSubject(hodTeacher._id);

    await expect(
      authorizeTeacher(hodRequest(hodUser), subject._id, college._id),
    ).resolves.toMatchObject({ _id: hodTeacher._id });
  });

  it("rejects an HOD accessing another teacher's subject", async () => {
    const { college, hodUser, otherTeacher, createAssignedSubject } =
      await setup();
    const subject = await createAssignedSubject(otherTeacher._id);

    await expect(
      authorizeTeacher(hodRequest(hodUser), subject._id, college._id),
    ).rejects.toMatchObject({ statusCode: 403, code: "SUBJECT_ACCESS_DENIED" });
  });

  it("rejects an HOD accessing another HOD's subject", async () => {
    const { college, hodUser, otherHod, createAssignedSubject } = await setup();
    const subject = await createAssignedSubject(otherHod._id);

    await expect(
      authorizeTeacher(hodRequest(hodUser), subject._id, college._id),
    ).rejects.toMatchObject({ statusCode: 403, code: "SUBJECT_ACCESS_DENIED" });
  });

  it("rejects an HOD accessing a subject from another college", async () => {
    const { college, hodUser, hodTeacher, createAssignedSubject } =
      await setup();
    const otherCollege = await createCollege({
      code: `HMB${Date.now()}`,
      email: `other-hod-marks.${Date.now()}@test.com`,
    });
    const subject = await createAssignedSubject(
      hodTeacher._id,
      otherCollege._id,
    );

    await expect(
      authorizeTeacher(hodRequest(hodUser), subject._id, college._id),
    ).rejects.toMatchObject({ statusCode: 403, code: "SUBJECT_ACCESS_DENIED" });
  });

  it("preserves Teacher authorization for their assigned subject", async () => {
    const { college, otherTeacher, createAssignedSubject } = await setup();
    const subject = await createAssignedSubject(otherTeacher._id);

    await expect(
      authorizeTeacher(
        { user: { id: otherTeacher.user_id, role: "TEACHER" } },
        subject._id,
        college._id,
      ),
    ).resolves.toMatchObject({ _id: otherTeacher._id });
  });
});
