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
  createStudent,
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Exam = require("../../src/models/exam.model");
const ExamSchedule = require("../../src/models/examSchedule.model");
const Student = require("../../src/models/student.model");
const Teacher = require("../../src/models/teacher.model");
const Department = require("../../src/models/department.model");

describe("Published Exam Timetable Visibility", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const createPublishedExamWithSchedule = async ({
    college,
    course,
    semester,
    academicYear,
    subjects,
    createdBy,
  }) => {
    const exam = await Exam.create({
      college_id: college._id,
      name: `Test Exam ${Date.now()}`,
      course_id: course._id,
      semester,
      academicYear,
      subjects: subjects.map((s) => ({
        subject: s._id,
        subjectType: s.subjectType || "THEORY",
        internalMaxMarks: 20,
        externalMaxMarks: 80,
        internalPassMarks: 10,
        externalPassMarks: 28,
        passMarks: 40,
      })),
      status: "PUBLISHED",
      createdBy: createdBy._id,
    });

    const schedule = await ExamSchedule.create({
      exam_id: exam._id,
      college_id: college._id,
      status: "PUBLISHED",
      subjects: subjects.map((s) => ({
        subject: s._id,
        examDate: new Date("2026-05-01"),
        startTime: "09:00",
        endTime: "12:00",
        session: "FORENOON",
        room: "101",
      })),
      createdBy: createdBy._id,
      updatedBy: createdBy._id,
      publishedBy: createdBy._id,
      publishedAt: new Date(),
    });

    return { exam, schedule };
  };

  describe("Student Visibility", () => {
    it("should list published exams for student's course and semester", async () => {
      const college = await createCollege({
        code: `STU${Date.now()}`,
        email: `student.vis.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.vis.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
        status: "APPROVED",
      });
      const studentUser = await createUser({
        email: `student.vis.${Date.now()}@test.com`,
        password: "Test@123",
        role: "STUDENT",
        college_id: college._id,
        isActive: true,
      });
      await Student.findByIdAndUpdate(student._id, { user_id: studentUser._id });

      await createPublishedExamWithSchedule({
        college,
        course,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: studentUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].course_id._id.toString()).toBe(course._id.toString());
      expect(res.body.data[0].semester).toBe(3);
    });

    it("should not list exams for a different semester", async () => {
      const college = await createCollege({
        code: `STU2${Date.now()}`,
        email: `student.vis2.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.vis2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 5,
        status: "APPROVED",
      });
      const studentUser = await createUser({
        email: `student.vis2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "STUDENT",
        college_id: college._id,
        isActive: true,
      });
      await Student.findByIdAndUpdate(student._id, { user_id: studentUser._id });

      await createPublishedExamWithSchedule({
        college,
        course,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: studentUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it("should not return DRAFT exams to student", async () => {
      const college = await createCollege({
        code: `STU3${Date.now()}`,
        email: `student.vis3.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.vis3.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
        status: "APPROVED",
      });
      const studentUser = await createUser({
        email: `student.vis3.${Date.now()}@test.com`,
        password: "Test@123",
        role: "STUDENT",
        college_id: college._id,
        isActive: true,
      });
      await Student.findByIdAndUpdate(student._id, { user_id: studentUser._id });

      await Exam.create({
        college_id: college._id,
        name: `Draft Exam ${Date.now()}`,
        course_id: course._id,
        semester: 3,
        academicYear: "2026-27",
        subjects: [
          {
            subject: subject._id,
            subjectType: "THEORY",
            internalMaxMarks: 20,
            externalMaxMarks: 80,
            passMarks: 40,
          },
        ],
        status: "DRAFT",
        createdBy: coordinator._id,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: studentUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it("should return 404 for student accessing another course's published exam by id", async () => {
      const college = await createCollege({
        code: `STU4${Date.now()}`,
        email: `student.vis4.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.vis4.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const courseA = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
        name: "Course A",
        code: "COURSE_A",
      });
      const courseB = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
        name: "Course B",
        code: "COURSE_B",
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: courseA._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: courseB._id,
        currentSemester: 3,
        status: "APPROVED",
      });
      const studentUser = await createUser({
        email: `student.vis4.${Date.now()}@test.com`,
        password: "Test@123",
        role: "STUDENT",
        college_id: college._id,
        isActive: true,
      });
      await Student.findByIdAndUpdate(student._id, { user_id: studentUser._id });

      const { exam } = await createPublishedExamWithSchedule({
        college,
        course: courseA,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: studentUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent
        .get(`/api/exam/published/${exam._id}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  describe("Teacher Visibility", () => {
    it("should list published exams containing teacher's assigned subject", async () => {
      const college = await createCollege({
        code: `TCH${Date.now()}`,
        email: `teacher.vis.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.tch.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const teacherUser = await createUser({
        email: `teacher.vis.${Date.now()}@test.com`,
        password: "Test@123",
        role: "TEACHER",
        college_id: college._id,
        isActive: true,
      });

      const teacher = await createTeacher({
        college_id: college._id,
        department_id: department._id,
        courses: [course._id],
        subjects: [subject._id],
        status: "ACTIVE",
        user_id: teacherUser._id,
        createdBy: coordinator._id,
      });

      await createPublishedExamWithSchedule({
        college,
        course,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: teacherUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it("should not list exams unrelated to teacher", async () => {
      const college = await createCollege({
        code: `TCH2${Date.now()}`,
        email: `teacher.vis2.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.tch2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const courseA = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
        name: "Course A",
        code: "COURSE_A2",
      });
      const courseB = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
        name: "Course B",
        code: "COURSE_B2",
      });
      const subjectA = await createSubject({
        college_id: college._id,
        course_id: courseA._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });
      const subjectB = await createSubject({
        college_id: college._id,
        course_id: courseB._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const teacherUser = await createUser({
        email: `teacher.vis2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "TEACHER",
        college_id: college._id,
        isActive: true,
      });

      const teacher = await createTeacher({
        college_id: college._id,
        department_id: department._id,
        courses: [courseA._id],
        subjects: [subjectA._id],
        status: "ACTIVE",
        user_id: teacherUser._id,
        createdBy: coordinator._id,
      });

      await createPublishedExamWithSchedule({
        college,
        course: courseB,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subjectB],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: teacherUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it("should return 404 for teacher accessing unrelated exam by id", async () => {
      const college = await createCollege({
        code: `TCH3${Date.now()}`,
        email: `teacher.vis3.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.tch3.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const courseA = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
        name: "Course A",
        code: "COURSE_A3",
      });
      const courseB = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
        name: "Course B",
        code: "COURSE_B3",
      });
      const subjectB = await createSubject({
        college_id: college._id,
        course_id: courseB._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const teacherUser = await createUser({
        email: `teacher.vis3.${Date.now()}@test.com`,
        password: "Test@123",
        role: "TEACHER",
        college_id: college._id,
        isActive: true,
      });

      const teacher = await createTeacher({
        college_id: college._id,
        department_id: department._id,
        courses: [courseA._id],
        subjects: [],
        status: "ACTIVE",
        user_id: teacherUser._id,
        createdBy: coordinator._id,
      });

      const { exam } = await createPublishedExamWithSchedule({
        college,
        course: courseB,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subjectB],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: teacherUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent
        .get(`/api/exam/published/${exam._id}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  describe("HOD Visibility", () => {
    it("should list published exams for HOD's department courses", async () => {
      const college = await createCollege({
        code: `HOD${Date.now()}`,
        email: `hod.vis.${Date.now()}@test.com`,
      });
      const admin = await createUser({
        email: `admin.hod.${Date.now()}@test.com`,
        password: "Test@123",
        role: "COLLEGE_ADMIN",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: admin._id,
        hod_id: new mongoose.Types.ObjectId(),
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: admin._id,
        durationSemesters: 6,
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        semester: 3,
        createdBy: admin._id,
      });

      const hodUser = await createUser({
        email: `hod.vis.${Date.now()}@test.com`,
        password: "Test@123",
        role: "HOD",
        college_id: college._id,
        isActive: true,
      });

      const hodTeacher = await createTeacher({
        college_id: college._id,
        department_id: department._id,
        courses: [course._id],
        subjects: [subject._id],
        status: "ACTIVE",
        user_id: hodUser._id,
        createdBy: admin._id,
      });
      await Department.findByIdAndUpdate(department._id, {
        hod_id: hodTeacher._id,
      });

      const coordinator = await createUser({
        email: `coord.hod.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      await createPublishedExamWithSchedule({
        college,
        course,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: hodUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it("should not list exams for another department", async () => {
      const college = await createCollege({
        code: `HOD2${Date.now()}`,
        email: `hod.vis2.${Date.now()}@test.com`,
      });
      const admin = await createUser({
        email: `admin.hod2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "COLLEGE_ADMIN",
        college_id: college._id,
        isActive: true,
      });

      const departmentA = await createDepartment({
        college_id: college._id,
        createdBy: admin._id,
        hod_id: new mongoose.Types.ObjectId(),
        code: "DEPT_A2",
      });
      const departmentB = await createDepartment({
        college_id: college._id,
        createdBy: admin._id,
        hod_id: new mongoose.Types.ObjectId(),
        code: "DEPT_B2",
      });
      const courseB = await createCourse({
        college_id: college._id,
        department_id: departmentB._id,
        createdBy: admin._id,
        durationSemesters: 6,
      });
      const subjectB = await createSubject({
        college_id: college._id,
        course_id: courseB._id,
        department_id: departmentB._id,
        semester: 3,
        createdBy: admin._id,
      });

      const hodUser = await createUser({
        email: `hod.vis2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "HOD",
        college_id: college._id,
        isActive: true,
      });

      const hodTeacher = await createTeacher({
        college_id: college._id,
        department_id: departmentA._id,
        courses: [],
        subjects: [],
        status: "ACTIVE",
        user_id: hodUser._id,
        createdBy: admin._id,
      });
      await Department.findByIdAndUpdate(departmentA._id, {
        hod_id: hodTeacher._id,
      });

      const coordinator = await createUser({
        email: `coord.hod2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      await createPublishedExamWithSchedule({
        college,
        course: courseB,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subjectB],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: hodUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it("should return 404 for HOD accessing another department's exam by id", async () => {
      const college = await createCollege({
        code: `HOD3${Date.now()}`,
        email: `hod.vis3.${Date.now()}@test.com`,
      });
      const admin = await createUser({
        email: `admin.hod3.${Date.now()}@test.com`,
        password: "Test@123",
        role: "COLLEGE_ADMIN",
        college_id: college._id,
        isActive: true,
      });

      const departmentA = await createDepartment({
        college_id: college._id,
        createdBy: admin._id,
        hod_id: new mongoose.Types.ObjectId(),
        code: "DEPT_A3",
      });
      const departmentB = await createDepartment({
        college_id: college._id,
        createdBy: admin._id,
        hod_id: new mongoose.Types.ObjectId(),
        code: "DEPT_B3",
      });
      const courseB = await createCourse({
        college_id: college._id,
        department_id: departmentB._id,
        createdBy: admin._id,
        durationSemesters: 6,
      });
      const subjectB = await createSubject({
        college_id: college._id,
        course_id: courseB._id,
        department_id: departmentB._id,
        semester: 3,
        createdBy: admin._id,
      });

      const hodUser = await createUser({
        email: `hod.vis3.${Date.now()}@test.com`,
        password: "Test@123",
        role: "HOD",
        college_id: college._id,
        isActive: true,
      });

      const hodTeacher = await createTeacher({
        college_id: college._id,
        department_id: departmentA._id,
        courses: [],
        subjects: [],
        status: "ACTIVE",
        user_id: hodUser._id,
        createdBy: admin._id,
      });
      await Department.findByIdAndUpdate(departmentA._id, {
        hod_id: hodTeacher._id,
      });

      const coordinator = await createUser({
        email: `coord.hod3.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const { exam } = await createPublishedExamWithSchedule({
        college,
        course: courseB,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subjectB],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: hodUser.email, password: "Test@123" })
        .expect(200);

      const res = await agent
        .get(`/api/exam/published/${exam._id}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  describe("Cross-role and auth", () => {
    it("rejects unauthenticated access to published exams", async () => {
      const res = await request(app).get("/api/exam/published");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated access to published exam schedule", async () => {
      const college = await createCollege({
        code: `AUTH${Date.now()}`,
        email: `auth.vis.${Date.now()}@test.com`,
      });
      const coordinator = await createUser({
        email: `coord.auth.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const { exam } = await createPublishedExamWithSchedule({
        college,
        course,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject],
        createdBy: coordinator,
      });

      const res = await request(app).get(
        `/api/exam-schedule/published/${exam._id}`,
      );
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects wrong role accessing published exam list", async () => {
      const college = await createCollege({
        code: `WR${Date.now()}`,
        email: `wrong.role.${Date.now()}@test.com`,
      });
      const user = await createUser({
        email: `wrong.role.${Date.now()}@test.com`,
        password: "Test@123",
        role: "ACCOUNTANT",
        college_id: college._id,
        isActive: true,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: user.email, password: "Test@123" })
        .expect(200);

      const res = await agent.get("/api/exam/published").expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects wrong role accessing published exam schedule", async () => {
      const college = await createCollege({
        code: `WR2${Date.now()}`,
        email: `wrong.role2.${Date.now()}@test.com`,
      });
      const user = await createUser({
        email: `wrong.role2.${Date.now()}@test.com`,
        password: "Test@123",
        role: "ACCOUNTANT",
        college_id: college._id,
        isActive: true,
      });

      const coordinator = await createUser({
        email: `coord.wr.${Date.now()}@test.com`,
        password: "Test@123",
        role: "EXAM_COORDINATOR",
        college_id: college._id,
        isActive: true,
      });

      const department = await createDepartment({
        college_id: college._id,
        createdBy: coordinator._id,
      });
      const course = await createCourse({
        college_id: college._id,
        department_id: department._id,
        createdBy: coordinator._id,
        durationSemesters: 6,
      });
      const subject = await createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: department._id,
        semester: 3,
        createdBy: coordinator._id,
      });

      const { exam } = await createPublishedExamWithSchedule({
        college,
        course,
        semester: 3,
        academicYear: "2026-27",
        subjects: [subject],
        createdBy: coordinator,
      });

      const agent = request.agent(app);
      await agent
        .post("/api/auth/login")
        .send({ email: user.email, password: "Test@123" })
        .expect(200);

      const res = await agent
        .get(`/api/exam-schedule/published/${exam._id}`)
        .expect(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  });
});
