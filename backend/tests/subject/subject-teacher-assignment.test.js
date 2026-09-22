const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { login } = require("../helpers/testAuth");
const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createTeacher,
} = require("../helpers/factories");
const app = require("../../app");
const Subject = require("../../src/models/subject.model");
const Teacher = require("../../src/models/teacher.model");

let sequence = 0;

const unique = (prefix) => `${prefix}-${Date.now()}-${++sequence}`;

const setupCollege = async () => {
  const college = await createCollege({
    code: unique("SUBJECT-TEACHER"),
    email: `${unique("subject-teacher")}@test.com`,
  });
  const admin = await createUser({
    email: `${unique("subject-admin")}@test.com`,
    password: "Test@123",
    role: "COLLEGE_ADMIN",
    college_id: college._id,
    isActive: true,
  });
  const { agent } = await login(app, {
    email: admin.email,
    password: "Test@123",
  });
  const department = await createDepartment({
    college_id: college._id,
    createdBy: admin._id,
    name: "Computer Science",
    code: unique("CS"),
    type: "ACADEMIC",
    status: "ACTIVE",
    programsOffered: ["UG"],
    startYear: 2020,
    sanctionedFacultyCount: 10,
    sanctionedStudentIntake: 60,
  });
  const course = await createCourse({
    college_id: college._id,
    department_id: department._id,
    createdBy: admin._id,
    name: "B.Tech CSE",
    code: unique("BTECH"),
    type: "THEORY",
    programLevel: "UG",
    durationSemesters: 8,
    credits: 120,
    maxStudents: 60,
  });

  return { college, admin, agent, department, course };
};

const createTeacherForCourse = async (context, suffix, overrides = {}) => {
  const user = await createUser({
    email: `${unique(`teacher-${suffix}`)}@test.com`,
    password: "Test@123",
    role: "TEACHER",
    college_id: context.college._id,
    isActive: true,
  });

  return createTeacher({
    college_id: context.college._id,
    user_id: user._id,
    department_id: context.department._id,
    courses: [context.course._id],
    email: user.email,
    employeeId: unique(`EMP-${suffix}`),
    designation: "Lecturer",
    qualification: "MSc",
    experienceYears: 2,
    status: "ACTIVE",
    createdBy: context.admin._id,
    ...overrides,
  });
};

const createSubject = async (context, overrides = {}) => {
  const payload = {
    course_id: context.course._id,
    name: unique("Subject"),
    code: unique("SUB"),
    semester: 1,
    credits: 3,
    ...overrides,
  };

  const response = await context.agent
    .post("/api/subjects")
    .send(payload)
    .expect(201);

  return response.body.subject;
};

const subjectIdStrings = (teacher) =>
  teacher.subjects.map((subjectId) => subjectId.toString());

describe("Subject teacher assignment synchronization", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("synchronizes Subject.teacher_id and Teacher.subjects on POST /subjects", async () => {
    const context = await setupCollege();
    const teacher = await createTeacherForCourse(context, "one");
    const subject = await createSubject(context, {
      teacher_id: teacher._id,
      semester: 1,
    });

    const [storedSubject, storedTeacher] = await Promise.all([
      Subject.findById(subject._id),
      Teacher.findById(teacher._id),
    ]);

    expect(storedSubject.teacher_id.toString()).toBe(teacher._id.toString());
    expect(subjectIdStrings(storedTeacher)).toEqual([subject._id.toString()]);
  });

  it("removes a reassigned subject from Teacher A and adds it once to Teacher B", async () => {
    const context = await setupCollege();
    const teacherA = await createTeacherForCourse(context, "a");
    const teacherB = await createTeacherForCourse(context, "b");
    const subject = await createSubject(context, {
      teacher_id: teacherA._id,
      semester: 1,
    });

    const response = await context.agent
      .put(`/api/subjects/${subject._id}`)
      .send({ teacher_id: teacherB._id })
      .expect(200);

    const [storedSubject, storedTeacherA, storedTeacherB] = await Promise.all([
      Subject.findById(subject._id),
      Teacher.findById(teacherA._id),
      Teacher.findById(teacherB._id),
    ]);

    expect(response.body.teacher_id.toString()).toBe(teacherB._id.toString());
    expect(storedSubject.teacher_id.toString()).toBe(teacherB._id.toString());
    expect(subjectIdStrings(storedTeacherA)).not.toContain(
      subject._id.toString(),
    );
    expect(subjectIdStrings(storedTeacherB)).toEqual([
      subject._id.toString(),
    ]);
  });

  it("clears Subject.teacher_id and Teacher.subjects on unassignment", async () => {
    const context = await setupCollege();
    const teacher = await createTeacherForCourse(context, "unassign");
    const subject = await createSubject(context, {
      teacher_id: teacher._id,
      semester: 1,
    });

    const response = await context.agent
      .put(`/api/subjects/${subject._id}`)
      .send({ teacher_id: null })
      .expect(200);

    const [storedSubject, storedTeacher] = await Promise.all([
      Subject.findById(subject._id),
      Teacher.findById(teacher._id),
    ]);

    expect(response.body.teacher_id).toBeNull();
    expect(storedSubject.teacher_id).toBeNull();
    expect(subjectIdStrings(storedTeacher)).toEqual([]);
  });

  it("normalizes an explicit null assignment on an unassigned subject", async () => {
    const context = await setupCollege();
    const subject = await createSubject(context, { semester: 1 });

    const response = await context.agent
      .put(`/api/subjects/${subject._id}`)
      .send({ teacher_id: null })
      .expect(200);

    const storedSubject = await Subject.findById(subject._id);

    expect(response.body.teacher_id).toBeNull();
    expect(storedSubject.teacher_id).toBeNull();
  });

  it("keeps Semester 1 intact when the same teacher is assigned a Semester 2 subject", async () => {
    const context = await setupCollege();
    const teacher = await createTeacherForCourse(context, "semesters");
    const semesterOne = await createSubject(context, {
      teacher_id: teacher._id,
      semester: 1,
    });
    const semesterTwo = await createSubject(context, {
      teacher_id: teacher._id,
      semester: 2,
    });

    await context.agent
      .put(`/api/subjects/${semesterTwo._id}`)
      .send({ teacher_id: teacher._id })
      .expect(200);

    const [storedSemesterOne, storedSemesterTwo, storedTeacher] =
      await Promise.all([
        Subject.findById(semesterOne._id),
        Subject.findById(semesterTwo._id),
        Teacher.findById(teacher._id),
      ]);

    expect(storedSemesterOne.teacher_id.toString()).toBe(
      teacher._id.toString(),
    );
    expect(storedSemesterTwo.teacher_id.toString()).toBe(
      teacher._id.toString(),
    );
    expect(subjectIdStrings(storedTeacher)).toEqual(
      expect.arrayContaining([
        semesterOne._id.toString(),
        semesterTwo._id.toString(),
      ]),
    );
    expect(subjectIdStrings(storedTeacher)).toHaveLength(2);
  });

  it("rejects a teacher from another tenant without changing the subject", async () => {
    const collegeA = await setupCollege();
    const collegeB = await setupCollege();
    const teacherA = await createTeacherForCourse(collegeA, "tenant-a");
    const subjectB = await createSubject(collegeB, { semester: 1 });

    const createResponse = await collegeB.agent
      .post("/api/subjects")
      .send({
        course_id: collegeB.course._id,
        name: unique("Tenant Subject"),
        code: unique("TENANT"),
        semester: 1,
        credits: 3,
        teacher_id: teacherA._id,
      })
      .expect(404);

    const updateResponse = await collegeA.agent
      .put(`/api/subjects/${subjectB._id}`)
      .send({ teacher_id: teacherA._id })
      .expect(404);

    const storedSubject = await Subject.findById(subjectB._id);

    expect(createResponse.body.error.code).toBe("TEACHER_NOT_FOUND");
    expect(updateResponse.body.error.code).toBe("SUBJECT_NOT_FOUND");
    expect(storedSubject.teacher_id).toBeNull();
  });

  it("preserves Subject route authorization", async () => {
    const context = await setupCollege();
    const teacherUser = await createUser({
      email: `${unique("forbidden-teacher")}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: context.college._id,
      isActive: true,
    });
    const { agent } = await login(app, {
      email: teacherUser.email,
      password: "Test@123",
    });

    const response = await agent
      .post("/api/subjects")
      .send({
        course_id: context.course._id,
        name: unique("Forbidden Subject"),
        code: unique("FORBIDDEN"),
        semester: 1,
        credits: 3,
      })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("rejects an inactive teacher and does not leave a subject behind", async () => {
    const context = await setupCollege();
    const inactiveTeacher = await createTeacherForCourse(context, "inactive", {
      status: "INACTIVE",
    });
    const subjectCount = await Subject.countDocuments({
      college_id: context.college._id,
    });

    const response = await context.agent
      .post("/api/subjects")
      .send({
        course_id: context.course._id,
        name: unique("Inactive Teacher Subject"),
        code: unique("INACTIVE"),
        semester: 1,
        credits: 3,
        teacher_id: inactiveTeacher._id,
      })
      .expect(400);

    expect(response.body.error.code).toBe("TEACHER_INACTIVE");
    expect(await Subject.countDocuments({ college_id: context.college._id })).toBe(
      subjectCount,
    );
  });

  it("rejects a teacher who is not assigned to the subject course", async () => {
    const context = await setupCollege();
    const teacher = await createTeacherForCourse(context, "course-mismatch", {
      courses: [],
    });
    const subjectCount = await Subject.countDocuments({
      college_id: context.college._id,
    });

    const response = await context.agent
      .post("/api/subjects")
      .send({
        course_id: context.course._id,
        name: unique("Course Mismatch Subject"),
        code: unique("COURSE-MISMATCH"),
        semester: 1,
        credits: 3,
        teacher_id: teacher._id,
      })
      .expect(400);

    expect(response.body.error.code).toBe("COURSE_MISMATCH");
    expect(await Subject.countDocuments({ college_id: context.college._id })).toBe(
      subjectCount,
    );
  });

  it("rejects assignment to an inactive subject", async () => {
    const context = await setupCollege();
    const teacher = await createTeacherForCourse(context, "inactive-subject");
    const inactiveSubject = await Subject.create({
      college_id: context.college._id,
      department_id: context.department._id,
      course_id: context.course._id,
      name: unique("Inactive Subject"),
      code: unique("INACTIVE-SUB"),
      semester: 1,
      credits: 3,
      status: "INACTIVE",
      createdBy: context.admin._id,
    });

    const response = await context.agent
      .put(`/api/subjects/${inactiveSubject._id}`)
      .send({ teacher_id: teacher._id })
      .expect(400);

    const storedTeacher = await Teacher.findById(teacher._id);

    expect(response.body.error.code).toBe("SUBJECT_INACTIVE");
    expect(subjectIdStrings(storedTeacher)).not.toContain(
      inactiveSubject._id.toString(),
    );
  });
});
