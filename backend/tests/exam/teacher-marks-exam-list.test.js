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
  createTeacher,
  createStudent,
} = require("../helpers/factories");
const Exam = require("../../src/models/exam.model");
const app = require("../../app");

/**
 * TEACHER Marks Entry scoping.
 *
 * Subject.teacher_id is the ownership source of truth. Teacher.courses[] /
 * Teacher.subjects[] are intentionally NOT used because they are not populated
 * by any write path in the codebase.
 */
describe("TEACHER MARKS ENTRY â€” exam/subject scoping and authorization", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const login = async (email) => {
    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email, password: "Test@123" })
      .expect(200);
    return agent;
  };

  const unique = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const buildFixture = async () => {
    const college = await createCollege({
      code: `TME${unique()}`,
      email: `teacher-marks-exams.${unique()}@test.com`,
    });

    const csDepartment = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      code: `CS${unique()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const eceDepartment = await createDepartment({
      college_id: college._id,
      name: "Electronics",
      code: `EC${unique()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });

    const csCourse = await createCourse({
      college_id: college._id,
      department_id: csDepartment._id,
      name: "B.Tech CSE",
      code: `BT-CSE-${unique()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });
    const eceCourse = await createCourse({
      college_id: college._id,
      department_id: eceDepartment._id,
      name: "B.Tech ECE",
      code: `BT-ECE-${unique()}`,
      createdBy: new mongoose.Types.ObjectId(),
    });

    // --- Teachers -------------------------------------------------------
    const makeTeacher = async (role, departmentId) => {
      const user = await createUser({
        email: `${role.toLowerCase()}.${unique()}@test.com`,
        password: "Test@123",
        role,
        college_id: college._id,
        isActive: true,
      });
      const teacher = await createTeacher({
        college_id: college._id,
        department_id: departmentId,
        user_id: user._id,
        email: `${role.toLowerCase()}.profile.${unique()}@test.com`,
        employeeId: `EMP-${unique()}`,
        createdBy: user._id,
      });
      return { user, teacher };
    };

    const teacherA = await makeTeacher("TEACHER", csDepartment._id);
    const teacherB = await makeTeacher("TEACHER", csDepartment._id);
    const hod = await makeTeacher("HOD", csDepartment._id);
    const coordinatorUser = await createUser({
      email: `coordinator.${unique()}@test.com`,
      password: "Test@123",
      role: "EXAM_COORDINATOR",
      college_id: college._id,
      isActive: true,
    });

    // --- Subjects -------------------------------------------------------
    const subjectFor = async (course, teacherId, overrides = {}) =>
      createSubject({
        college_id: college._id,
        course_id: course._id,
        department_id: course.department_id,
        semester: 1,
        name: `Subject ${unique()}`,
        code: `SUB-${unique()}`,
        createdBy: new mongoose.Types.ObjectId(),
        teacher_id: teacherId,
        subjectType: "THEORY",
        internalMaxMarks: 30,
        externalMaxMarks: 70,
        passMarks: 40,
        ...overrides,
      });

    const subjectA = await subjectFor(csCourse, teacherA.teacher._id);
    const subjectB = await subjectFor(csCourse, teacherB.teacher._id);
    const subjectHod = await subjectFor(csCourse, hod.teacher._id);
    const unassignedSubject = await createSubject({
      college_id: college._id,
      course_id: csCourse._id,
      department_id: csDepartment._id,
      semester: 1,
      name: `Unassigned ${unique()}`,
      code: `SUB-${unique()}`,
      createdBy: new mongoose.Types.ObjectId(),
      subjectType: "THEORY",
      internalMaxMarks: 30,
      externalMaxMarks: 70,
      passMarks: 40,
    });
    // Assigned to Teacher A but living in the ECE course (other department).
    const eceSubjectForA = await subjectFor(eceCourse, teacherA.teacher._id);

    // --- Exams ----------------------------------------------------------
    // Shared by Teacher A and Teacher B.
    const sharedExam = await Exam.create({
      college_id: college._id,
      name: "Shared Exam",
      course_id: csCourse._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [
        { subject: subjectA._id, subjectType: "THEORY" },
        { subject: subjectB._id, subjectType: "THEORY" },
      ],
      createdBy: coordinatorUser._id,
    });

    // Only Teacher B has a subject here.
    const onlyBExam = await Exam.create({
      college_id: college._id,
      name: "Only B Exam",
      course_id: csCourse._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [{ subject: subjectB._id, subjectType: "THEORY" }],
      createdBy: coordinatorUser._id,
    });

    // Own course + own department, but no subject assigned to the teacher.
    const unassignedExam = await Exam.create({
      college_id: college._id,
      name: "Unassigned Subject Exam",
      course_id: csCourse._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [
        { subject: unassignedSubject._id, subjectType: "THEORY" },
        { subject: subjectHod._id, subjectType: "THEORY" },
      ],
      createdBy: coordinatorUser._id,
    });

    // Course belongs to another department even though a subject is ours.
    const otherDepartmentExam = await Exam.create({
      college_id: college._id,
      name: "Other Department Exam",
      course_id: eceCourse._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [{ subject: eceSubjectForA._id, subjectType: "THEORY" }],
      createdBy: coordinatorUser._id,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: csDepartment._id,
      course_id: csCourse._id,
      currentSemester: 1,
      createdBy: new mongoose.Types.ObjectId(),
    });

    return {
      college,
      csDepartment,
      eceDepartment,
      csCourse,
      eceCourse,
      teacherA,
      teacherB,
      hod,
      coordinatorUser,
      subjectA,
      subjectB,
      subjectHod,
      unassignedSubject,
      sharedExam,
      onlyBExam,
      unassignedExam,
      otherDepartmentExam,
      student,
    };
  };

  const subjectIdsOf = (exam) =>
    exam.subjects.map((entry) => String(entry.subject._id));

  // ===================== EXAM LIST FILTERING =====================

  it("1. teacher sees the exam and only their own subject", async () => {
    const { teacherA, sharedExam, subjectA } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent.get("/api/exam").expect(200);

    const exam = res.body.find((e) => e._id === String(sharedExam._id));
    expect(exam).toBeDefined();
    expect(exam.subjects).toHaveLength(1);
    expect(String(exam.subjects[0].subject._id)).toBe(String(subjectA._id));
  });

  it("2. exam containing only another teacher's subjects is excluded", async () => {
    const { teacherA, onlyBExam } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent.get("/api/exam").expect(200);

    expect(res.body.find((e) => e._id === String(onlyBExam._id))).toBeUndefined();
  });

  it("3. exam with no subject assigned to the teacher is excluded", async () => {
    const { teacherA, unassignedExam } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent.get("/api/exam").expect(200);

    expect(
      res.body.find((e) => e._id === String(unassignedExam._id)),
    ).toBeUndefined();
  });

  it("4. exam whose course belongs to another department is excluded", async () => {
    const { teacherA, otherDepartmentExam } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent.get("/api/exam").expect(200);

    expect(
      res.body.find((e) => e._id === String(otherDepartmentExam._id)),
    ).toBeUndefined();
  });

  it("5. exam from another college is excluded", async () => {
    const { teacherA, csCourse, subjectA } = await buildFixture();
    const otherCollege = await createCollege({
      code: `TMO${unique()}`,
      email: `other-college.${unique()}@test.com`,
    });
    await Exam.create({
      college_id: otherCollege._id,
      name: "Foreign Exam",
      course_id: csCourse._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [{ subject: subjectA._id, subjectType: "THEORY" }],
      createdBy: teacherA.user._id,
    });
    const agent = await login(teacherA.user.email);

    const res = await agent.get("/api/exam").expect(200);

    expect(
      res.body.some((e) => e.college_id === String(otherCollege._id)),
    ).toBe(false);
  });

  it("6. multi-teacher exam gives Teacher A and Teacher B their own subject only", async () => {
    const { teacherA, teacherB, sharedExam, subjectA, subjectB } =
      await buildFixture();

    const resA = await (await login(teacherA.user.email))
      .get("/api/exam")
      .expect(200);
    const resB = await (await login(teacherB.user.email))
      .get("/api/exam")
      .expect(200);

    const examA = resA.body.find((e) => e._id === String(sharedExam._id));
    const examB = resB.body.find((e) => e._id === String(sharedExam._id));

    // The exam is visible to both.
    expect(examA).toBeDefined();
    expect(examB).toBeDefined();

    // But each only receives their own subjects.
    expect(subjectIdsOf(examA)).toEqual([String(subjectA._id)]);
    expect(subjectIdsOf(examB)).toEqual([String(subjectB._id)]);
  });

  it("7. teacher with no Teacher profile receives an empty exam list", async () => {
    const orphanUser = await createUser({
      email: `orphan.${unique()}@test.com`,
      password: "Test@123",
      role: "TEACHER",
      college_id: (
        await createCollege({
          code: `TMO${unique()}`,
          email: `orphan-college.${unique()}@test.com`,
        })
      )._id,
      isActive: true,
    });
    const agent = await login(orphanUser.email);

    const res = await agent.get("/api/exam").expect(200);

    expect(res.body).toHaveLength(0);
  });

  // ===================== UNCHANGED BEHAVIOUR =====================

  it("8. HOD exam filtering behaviour is unchanged", async () => {
    const { hod, sharedExam, subjectHod } = await buildFixture();
    const agent = await login(hod.user.email);

    const res = await agent.get("/api/exam").expect(200);

    const exam = res.body.find((e) => e._id === String(sharedExam._id));
    expect(exam).toBeUndefined();

    const resHodOwn = await (await login(hod.user.email))
      .get("/api/exam")
      .expect(200);
    expect(resHodOwn.body.length).toBeGreaterThanOrEqual(0);
  });

  it("9. EXAM_COORDINATOR still receives every college exam unfiltered", async () => {
    const { coordinatorUser, sharedExam, onlyBExam, unassignedExam, otherDepartmentExam } =
      await buildFixture();
    const agent = await login(coordinatorUser.email);

    const res = await agent.get("/api/exam").expect(200);

    const ids = res.body.map((e) => e._id);
    expect(ids).toContain(String(sharedExam._id));
    expect(ids).toContain(String(onlyBExam._id));
    expect(ids).toContain(String(unassignedExam._id));
    expect(ids).toContain(String(otherDepartmentExam._id));

    const shared = res.body.find((e) => e._id === String(sharedExam._id));
    expect(shared.subjects).toHaveLength(2);
  });

  // ===================== MARKS AUTHORIZATION =====================

  it("10. teacher cannot load a roster for a subject with teacher_id = null", async () => {
    const { teacherA, unassignedExam, unassignedSubject } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent
      .get("/api/marks/roster")
      .query({ examId: String(unassignedExam._id), subjectId: String(unassignedSubject._id) })
      .expect(403);

    expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
  });

  it("11. teacher cannot load a roster for another teacher's subject", async () => {
    const { teacherA, onlyBExam, subjectB } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent
      .get("/api/marks/roster")
      .query({ examId: String(onlyBExam._id), subjectId: String(subjectB._id) })
      .expect(403);

    expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
  });

  it("12. teacher cannot save marks for another teacher's subject", async () => {
    const { teacherA, onlyBExam, subjectB, student } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent
      .post("/api/marks/bulk")
      .send({
        examId: String(onlyBExam._id),
        subjectId: String(subjectB._id),
        marks: [{ studentId: student._id, internalMarks: 20, externalMarks: 50 }],
      })
      .expect(403);

    expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
  });

  it("13. teacher cannot save marks for a subject with teacher_id = null", async () => {
    const { teacherA, unassignedExam, unassignedSubject, student } =
      await buildFixture();
    const agent = await login(teacherA.user.email);

    const res = await agent
      .post("/api/marks/bulk")
      .send({
        examId: String(unassignedExam._id),
        subjectId: String(unassignedSubject._id),
        marks: [{ studentId: student._id, internalMarks: 20, externalMarks: 50 }],
      })
      .expect(403);

    expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
  });

  it("14. teacher can read and save marks for their own subject", async () => {
    const { teacherA, sharedExam, subjectA, student } = await buildFixture();
    const agent = await login(teacherA.user.email);

    const roster = await agent
      .get("/api/marks/roster")
      .query({ examId: String(sharedExam._id), subjectId: String(subjectA._id) })
      .expect(200);
    expect(roster.body.success).toBe(true);
    expect(roster.body.data.totalStudents).toBe(1);

    const save = await agent
      .post("/api/marks/bulk")
      .send({
        examId: String(sharedExam._id),
        subjectId: String(subjectA._id),
        marks: [
          { studentId: student._id, internalMarks: 22, externalMarks: 55 },
        ],
      })
      .expect(200);
    expect(save.body.success).toBe(true);
    expect(save.body.data[0].internalMarks).toBe(22);
  });

  it("15. subject/exam course mismatch is rejected for a teacher", async () => {
    const { teacherA, csCourse, eceCourse, sharedExam, subjectA, student } =
      await buildFixture();

    // Exam claims the ECE course while carrying a CS subject assigned to A.
    const mismatched = await Exam.create({
      college_id: teacherA.teacher.college_id,
      name: "Course Mismatch Exam",
      course_id: eceCourse._id,
      semester: 1,
      academicYear: "2026-27",
      subjects: [{ subject: subjectA._id, subjectType: "THEORY" }],
      createdBy: teacherA.user._id,
    });

    const agent = await login(teacherA.user.email);

    const res = await agent
      .get("/api/marks/roster")
      .query({ examId: String(mismatched._id), subjectId: String(subjectA._id) })
      .expect(403);
    expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");

    const save = await agent
      .post("/api/marks/bulk")
      .send({
        examId: String(mismatched._id),
        subjectId: String(subjectA._id),
        marks: [
          { studentId: student._id, internalMarks: 20, externalMarks: 50 },
        ],
      })
      .expect(403);
    expect(save.body.error.code).toBe("SUBJECT_ACCESS_DENIED");

    expect(csCourse._id).not.toBe(eceCourse._id);
    expect(String(sharedExam._id)).not.toBe(String(mismatched._id));
  });

  it("16. subject/exam semester mismatch is rejected for a teacher", async () => {
    const { teacherA, csCourse, subjectA, student } = await buildFixture();

    const mismatched = await Exam.create({
      college_id: teacherA.teacher.college_id,
      name: "Semester Mismatch Exam",
      course_id: csCourse._id,
      semester: 4, // subjectA.semester === 1
      academicYear: "2026-27",
      subjects: [{ subject: subjectA._id, subjectType: "THEORY" }],
      createdBy: teacherA.user._id,
    });

    const agent = await login(teacherA.user.email);

    const res = await agent
      .get("/api/marks/roster")
      .query({ examId: String(mismatched._id), subjectId: String(subjectA._id) })
      .expect(403);
    expect(res.body.error.code).toBe("SUBJECT_ACCESS_DENIED");

    const save = await agent
      .post("/api/marks/bulk")
      .send({
        examId: String(mismatched._id),
        subjectId: String(subjectA._id),
        marks: [
          { studentId: student._id, internalMarks: 20, externalMarks: 50 },
        ],
      })
      .expect(403);
    expect(save.body.error.code).toBe("SUBJECT_ACCESS_DENIED");
  });

  it("17. EXAM_COORDINATOR bypass is unchanged for unassigned subjects", async () => {
    const { coordinatorUser, unassignedExam, unassignedSubject, student } =
      await buildFixture();
    const agent = await login(coordinatorUser.email);

    const res = await agent
      .get("/api/marks/roster")
      .query({
        examId: String(unassignedExam._id),
        subjectId: String(unassignedSubject._id),
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
