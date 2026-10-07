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
  createDepartment,
  createCourse,
  createSubject,
} = require("../helpers/factories");
const app = require("../../app");
const Exam = require("../../src/models/exam.model");
const ExamSchedule = require("../../src/models/examSchedule.model");

describe("Exam Schedule & Timetable Publish Guard — Duplicate Prevention", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const baseSetup = async () => {
    const college = await createCollege({
      code: `GRD${Date.now()}`,
      email: `guard.${Date.now()}@test.com`,
    });
    const coordinator = await createUser({
      email: `coord.guard.${Date.now()}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: coordinator.email, password: "Test@123" })
      .expect(200);

    const department = await createDepartment({
      college_id: college._id,
      createdBy: new mongoose.Types.ObjectId(),
      name: "Computer Science",
      code: "CS",
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
      createdBy: new mongoose.Types.ObjectId(),
      name: "B.Tech CSE",
      code: `CSE${Date.now()}`,
      durationYears: 4,
      totalSemesters: 8,
    });
    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      semester: 3,
      name: "Data Structures",
      code: `DS${Date.now()}`,
      subjectType: "THEORY",
      credits: 4,
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      internalPassMarks: 12,
      externalPassMarks: 28,
    });

    const exam = await Exam.create({
      college_id: college._id,
      name: "Third Semester Exam",
      course_id: course._id,
      semester: 3,
      academicYear: "2027-28",
      subjects: [
        {
          subject: subject._id,
          subjectType: "THEORY",
          category: "REGULAR",
          originalSemester: 3,
          internalMaxMarks: 30,
          externalMaxMarks: 70,
          internalPassMarks: 12,
          externalPassMarks: 28,
        },
      ],
      status: "DRAFT",
      createdBy: coordinator._id,
    });

    const schedule = await ExamSchedule.create({
      exam_id: exam._id,
      college_id: college._id,
      status: "DRAFT",
      subjects: [
        {
          subject: subject._id,
          category: "REGULAR",
          originalSemester: 3,
          examDate: new Date("2027-11-10"),
          startTime: "10:00",
          endTime: "13:00",
          session: "FORENOON",
          room: "101",
        },
      ],
      createdBy: coordinator._id,
    });

    return { agent, college, coordinator, course, subject, exam, schedule };
  };

  it("1. Publishing a DRAFT schedule succeeds and marks it PUBLISHED", async () => {
    const { agent, exam } = await baseSetup();

    const res = await agent
      .post(`/api/exam-schedule/${exam._id}/publish`)
      .expect(200);

    expect(res.body.schedule.status).toBe("PUBLISHED");
    expect(res.body.message).toContain("published successfully");
  });

  it("2. Trying to publish an already PUBLISHED schedule returns 400 with 'Exam Timetable is already published'", async () => {
    const { agent, exam } = await baseSetup();

    // First publish succeeds
    await agent
      .post(`/api/exam-schedule/${exam._id}/publish`)
      .expect(200);

    // Second publish is rejected
    const res = await agent
      .post(`/api/exam-schedule/${exam._id}/publish`)
      .expect(400);

    const message = res.body.error?.message || res.body.message;
    const code = res.body.error?.code || res.body.code;
    expect(message).toBe("Exam Timetable is already published");
    expect(code).toBe("TIMETABLE_ALREADY_PUBLISHED");
  });

  it("3. Trying to update an already PUBLISHED schedule returns 400 with 'Exam Timetable is already published'", async () => {
    const { agent, exam, subject } = await baseSetup();

    await agent
      .post(`/api/exam-schedule/${exam._id}/publish`)
      .expect(200);

    const res = await agent
      .put(`/api/exam-schedule/${exam._id}`)
      .send({
        subjects: [
          {
            subject: subject._id,
            category: "REGULAR",
            examDate: new Date("2027-11-12"),
            startTime: "10:00",
            endTime: "13:00",
          },
        ],
      })
      .expect(400);

    const message = res.body.error?.message || res.body.message;
    const code = res.body.error?.code || res.body.code;
    expect(message).toBe("Exam Timetable is already published");
    expect(code).toBe("TIMETABLE_ALREADY_PUBLISHED");
  });

  it("4. Trying to create a new Exam when an exam for the same course, semester, and academic year already has a PUBLISHED schedule returns 400", async () => {
    const { agent, exam, course, subject } = await baseSetup();

    // Publish both schedule and exam
    await agent
      .post(`/api/exam-schedule/${exam._id}/publish`)
      .expect(200);

    await agent
      .put(`/api/exam/${exam._id}/publish`)
      .expect(200);

    // Now try to create another exam for the exact same course, semester 3, and 2027-28
    const res = await agent
      .post("/api/exam")
      .send({
        name: "Third Semester Exam Duplicate",
        course_id: course._id,
        semester: 3,
        academicYear: "2027-28",
        subjects: [subject._id],
      })
      .expect(400);

    const message = res.body.error?.message || res.body.message;
    const code = res.body.error?.code || res.body.code;
    expect(message).toBe("Exam Timetable is already published");
    expect(code).toBe("TIMETABLE_ALREADY_PUBLISHED");
  });
});
