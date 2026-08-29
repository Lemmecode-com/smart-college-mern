const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../../setup/testDb");
const {
  createCollege,
  createUser,
  createStudent,
} = require("../../helpers/factories");
const app = require("../../../app");

const Department = require("../../../src/models/department.model");
const Course = require("../../../src/models/course.model");
const FeeStructure = require("../../../src/models/feeStructure.model");
const Timetable = require("../../../src/models/timetable.model");

const loginAsPrincipal = async (app, email, password) => {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);
  return { agent, res };
};

const setupColleges = async (suffix = "") => {
  const collegeA = await createCollege({
    code: `TNT-A${suffix}`,
    name: "College Alpha",
    email: `alpha-${suffix}@test.com`,
  });
  const collegeB = await createCollege({
    code: `TNT-B${suffix}`,
    name: "College Beta",
    email: `beta-${suffix}@test.com`,
  });

  const principalA = await createUser({
    email: `principal-a${suffix}@test.com`,
    password: "Test@123",
    role: "PRINCIPAL",
    college_id: collegeA._id,
    isActive: true,
  });

  const principalB = await createUser({
    email: `principal-b${suffix}@test.com`,
    password: "Test@123",
    role: "PRINCIPAL",
    college_id: collegeB._id,
    isActive: true,
  });

  return { collegeA, collegeB, principalA, principalB };
};

const createDeptAndCourse = async (collegeId, createdBy, suffix) => {
  const department = await Department.create({
    college_id: collegeId,
    name: `Dept ${suffix}`,
    code: `DEPT${suffix}`,
    type: "ACADEMIC",
    status: "ACTIVE",
    hod_id: null,
    programsOffered: ["UG"],
    startYear: 2024,
    sanctionedFacultyCount: 5,
    sanctionedStudentIntake: 60,
    createdBy,
  });

  const course = await Course.create({
    college_id: collegeId,
    department_id: department._id,
    name: `Course ${suffix}`,
    code: `CRS${suffix}`,
    type: "THEORY",
    status: "ACTIVE",
    programLevel: "UG",
    durationSemesters: 6,
    durationYears: 3,
    credits: 120,
    maxStudents: 60,
    yearLabels: ["Year 1", "Year 2", "Year 3"],
    createdBy,
  });

  return { department, course };
};

describe("Security — Cross-Tenant Isolation", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe("Students", () => {
    it("College A list never includes College B records", async () => {
      const { collegeA, collegeB } = await setupColleges("-s1");

      const studentA = await createStudent({
        college_id: collegeA._id,
        fullName: "Alice",
        status: "APPROVED",
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
      });
      const studentB = await createStudent({
        college_id: collegeB._id,
        fullName: "Bob",
        status: "APPROVED",
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-s1@test.com",
        "Test@123"
      );

      const res = await agent
        .get("/api/students/approved-students")
        .expect(200);

      const students = res.body.data.students || res.body.data || [];
      const ids = students.map((s) => s._id || s.id);
      expect(ids).toContain(studentA._id.toString());
      expect(ids).not.toContain(studentB._id.toString());
    });

    it("College A user requesting College B student by ID gets 404", async () => {
      const { collegeA, collegeB } = await setupColleges("-s2");

      const studentA = await createStudent({
        college_id: collegeA._id,
        fullName: "Alice",
        status: "APPROVED",
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
      });
      const studentB = await createStudent({
        college_id: collegeB._id,
        fullName: "Bob",
        status: "APPROVED",
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-s2@test.com",
        "Test@123"
      );

      const res = await agent
        .get(`/api/students/approved-stud/${studentB._id}`)
        .expect(404);
    });

    it("?college_id=<College B> query param is ignored for students list", async () => {
      const { collegeA, collegeB } = await setupColleges("-s3");

      const studentA = await createStudent({
        college_id: collegeA._id,
        fullName: "Alice",
        status: "APPROVED",
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
      });
      const studentB = await createStudent({
        college_id: collegeB._id,
        fullName: "Bob",
        status: "APPROVED",
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-s3@test.com",
        "Test@123"
      );

      const resClean = await agent
        .get("/api/students/approved-students")
        .expect(200);
      const cleanStudents =
        resClean.body.data.students || resClean.body.data || [];
      const cleanIds = cleanStudents.map((s) => s._id || s.id);

      const resInjected = await agent
        .get(`/api/students/approved-students?college_id=${collegeB._id}`)
        .expect(200);
      const injectedStudents =
        resInjected.body.data.students || resInjected.body.data || [];
      const injectedIds = injectedStudents.map((s) => s._id || s.id);

      expect(injectedIds).toEqual(cleanIds);
      expect(injectedIds).not.toContain(studentB._id.toString());
    });
  });

  describe("Fee Structures", () => {
    it("College A list never includes College B records", async () => {
      const { collegeA, collegeB, principalA, principalB } =
        await setupColleges("-f1");

      const { course: courseA } = await createDeptAndCourse(
        collegeA._id,
        principalA._id,
        "A"
      );
      const { course: courseB } = await createDeptAndCourse(
        collegeB._id,
        principalB._id,
        "B"
      );

      const feeA = await FeeStructure.create({
        college_id: collegeA._id,
        course_id: courseA._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "First", amount: 25000, dueDate: new Date(), order: 1 },
          { name: "Second", amount: 25000, dueDate: new Date(), order: 2 },
        ],
      });

      const feeB = await FeeStructure.create({
        college_id: collegeB._id,
        course_id: courseB._id,
        category: "GEN",
        totalFee: 60000,
        installments: [
          { name: "First", amount: 30000, dueDate: new Date(), order: 1 },
          { name: "Second", amount: 30000, dueDate: new Date(), order: 2 },
        ],
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-f1@test.com",
        "Test@123"
      );

      const res = await agent.get("/api/fees/structure/").expect(200);
      const fees = res.body.data.fees || [];
      const ids = fees.map((f) => f._id || f.id);
      expect(ids).toContain(feeA._id.toString());
      expect(ids).not.toContain(feeB._id.toString());
    });

    it("College A user requesting College B fee structure by ID gets 404", async () => {
      const { collegeA, collegeB, principalA, principalB } =
        await setupColleges("-f2");

      const { course: courseA } = await createDeptAndCourse(
        collegeA._id,
        principalA._id,
        "A"
      );
      const { course: courseB } = await createDeptAndCourse(
        collegeB._id,
        principalB._id,
        "B"
      );

      const feeA = await FeeStructure.create({
        college_id: collegeA._id,
        course_id: courseA._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "First", amount: 25000, dueDate: new Date(), order: 1 },
          { name: "Second", amount: 25000, dueDate: new Date(), order: 2 },
        ],
      });

      const feeB = await FeeStructure.create({
        college_id: collegeB._id,
        course_id: courseB._id,
        category: "GEN",
        totalFee: 60000,
        installments: [
          { name: "First", amount: 30000, dueDate: new Date(), order: 1 },
          { name: "Second", amount: 30000, dueDate: new Date(), order: 2 },
        ],
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-f2@test.com",
        "Test@123"
      );

      const res = await agent
        .get(`/api/fees/structure/${feeB._id}`)
        .expect(404);
    });

    it("?college_id=<College B> query param is ignored for fee structures list", async () => {
      const { collegeA, collegeB, principalA, principalB } =
        await setupColleges("-f3");

      const { course: courseA } = await createDeptAndCourse(
        collegeA._id,
        principalA._id,
        "A"
      );
      const { course: courseB } = await createDeptAndCourse(
        collegeB._id,
        principalB._id,
        "B"
      );

      const feeA = await FeeStructure.create({
        college_id: collegeA._id,
        course_id: courseA._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "First", amount: 25000, dueDate: new Date(), order: 1 },
          { name: "Second", amount: 25000, dueDate: new Date(), order: 2 },
        ],
      });

      const feeB = await FeeStructure.create({
        college_id: collegeB._id,
        course_id: courseB._id,
        category: "GEN",
        totalFee: 60000,
        installments: [
          { name: "First", amount: 30000, dueDate: new Date(), order: 1 },
          { name: "Second", amount: 30000, dueDate: new Date(), order: 2 },
        ],
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-f3@test.com",
        "Test@123"
      );

      const resClean = await agent.get("/api/fees/structure/").expect(200);
      const cleanFees = resClean.body.data.fees || [];
      const cleanIds = cleanFees.map((f) => f._id || f.id);

      const resInjected = await agent
        .get(`/api/fees/structure/?college_id=${collegeB._id}`)
        .expect(200);
      const injectedFees = resInjected.body.data.fees || [];
      const injectedIds = injectedFees.map((f) => f._id || f.id);

      expect(injectedIds).toEqual(cleanIds);
      expect(injectedIds).not.toContain(feeB._id.toString());
    });
  });

  describe("Timetables", () => {
    it("College A list never includes College B records", async () => {
      const { collegeA, collegeB, principalA, principalB } =
        await setupColleges("-t1");

      const { course: courseA } = await createDeptAndCourse(
        collegeA._id,
        principalA._id,
        "A"
      );
      const { course: courseB } = await createDeptAndCourse(
        collegeB._id,
        principalB._id,
        "B"
      );

      const timetableA = await Timetable.create({
        college_id: collegeA._id,
        department_id: courseA.department_id,
        course_id: courseA._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "TT College A",
        status: "DRAFT",
      });

      const timetableB = await Timetable.create({
        college_id: collegeB._id,
        department_id: courseB.department_id,
        course_id: courseB._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "TT College B",
        status: "DRAFT",
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-t1@test.com",
        "Test@123"
      );

      const res = await agent.get("/api/timetable/").expect(200);
      const timetables =
        res.body.data.timetables || res.body.data || [];
      const ids = timetables.map((t) => t._id || t.id);
      expect(ids).toContain(timetableA._id.toString());
      expect(ids).not.toContain(timetableB._id.toString());
    });

    it("College A user requesting College B timetable by ID gets 404", async () => {
      const { collegeA, collegeB, principalA, principalB } =
        await setupColleges("-t2");

      const { course: courseA } = await createDeptAndCourse(
        collegeA._id,
        principalA._id,
        "A"
      );
      const { course: courseB } = await createDeptAndCourse(
        collegeB._id,
        principalB._id,
        "B"
      );

      const timetableA = await Timetable.create({
        college_id: collegeA._id,
        department_id: courseA.department_id,
        course_id: courseA._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "TT College A",
        status: "DRAFT",
      });

      const timetableB = await Timetable.create({
        college_id: collegeB._id,
        department_id: courseB.department_id,
        course_id: courseB._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "TT College B",
        status: "DRAFT",
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-t2@test.com",
        "Test@123"
      );

      const res = await agent
        .get(`/api/timetable/${timetableB._id}/weekly`)
        .expect(404);
    });

    it("?college_id=<College B> query param is ignored for timetables list", async () => {
      const { collegeA, collegeB, principalA, principalB } =
        await setupColleges("-t3");

      const { course: courseA } = await createDeptAndCourse(
        collegeA._id,
        principalA._id,
        "A"
      );
      const { course: courseB } = await createDeptAndCourse(
        collegeB._id,
        principalB._id,
        "B"
      );

      const timetableA = await Timetable.create({
        college_id: collegeA._id,
        department_id: courseA.department_id,
        course_id: courseA._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "TT College A",
        status: "DRAFT",
      });

      const timetableB = await Timetable.create({
        college_id: collegeB._id,
        department_id: courseB.department_id,
        course_id: courseB._id,
        semester: 1,
        academicYear: "2025-2026",
        name: "TT College B",
        status: "DRAFT",
      });

      const { agent } = await loginAsPrincipal(
        app,
        "principal-a-t3@test.com",
        "Test@123"
      );

      const resClean = await agent.get("/api/timetable/").expect(200);
      const cleanTimetables =
        resClean.body.data.timetables || resClean.body.data || [];
      const cleanIds = cleanTimetables.map((t) => t._id || t.id);

      const resInjected = await agent
        .get(`/api/timetable/?college_id=${collegeB._id}`)
        .expect(200);
      const injectedTimetables =
        resInjected.body.data.timetables || resInjected.body.data || [];
      const injectedIds = injectedTimetables.map((t) => t._id || t.id);

      expect(injectedIds).toEqual(cleanIds);
      expect(injectedIds).not.toContain(timetableB._id.toString());
    });
  });
});
