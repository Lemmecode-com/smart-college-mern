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
  createStudent,
  createTeacher,
} = require("../helpers/factories");
const app = require("../../app");

const Notification = require("../../src/models/notification.model");
const Department = require("../../src/models/department.model");

const PW = "Test@123";

const login = async (user) => {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: PW })
    .expect(200);
  return agent;
};

describe("NOT-DUP-VIS — Duplicate Submission Protection & Admin Visibility", () => {
  let collegeA;
  let collegeB;
  let adminA;
  let adminASecond;
  let adminB;
  let studentUser;
  let student;
  let teacherUser;
  let teacher;

  let adminAgent;
  let adminASecondAgent;
  let adminBAgent;
  let studentAgent;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // College A setup
    collegeA = await createCollege({ code: "COLA", name: "College Alpha", email: "cola@test.com" });
    adminA = await createUser({
      email: "admin.cola@test.com",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: collegeA._id,
      isActive: true,
    });
    adminASecond = await createUser({
      email: "admin2.cola@test.com",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: collegeA._id,
      isActive: true,
    });

    const dept = await Department.create({
      college_id: collegeA._id,
      name: "Computer Science",
      code: "CS",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: adminA._id,
    });

    studentUser = await createUser({
      email: "student.cola@test.com",
      password: PW,
      role: "STUDENT",
      college_id: collegeA._id,
      isActive: true,
    });
    student = await createStudent({
      email: "student.cola@test.com",
      college_id: collegeA._id,
      department_id: dept._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    teacherUser = await createUser({
      email: "teacher.cola@test.com",
      password: PW,
      role: "TEACHER",
      college_id: collegeA._id,
      isActive: true,
    });
    teacher = await createTeacher({
      email: "teacher.cola@test.com",
      college_id: collegeA._id,
      department_id: dept._id,
      user_id: teacherUser._id,
      status: "ACTIVE",
      createdBy: adminA._id,
    });

    // College B setup (tenant isolation)
    collegeB = await createCollege({ code: "COLB", name: "College Beta", email: "colb@test.com" });
    adminB = await createUser({
      email: "admin.colb@test.com",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: collegeB._id,
      isActive: true,
    });

    adminAgent = await login(adminA);
    adminASecondAgent = await login(adminASecond);
    adminBAgent = await login(adminB);
    studentAgent = await login(studentUser);
  });

  describe("A. Duplicate Submission Protection", () => {
    const SAMPLE_PAYLOAD = {
      title: "Fee Payment Deadline Extended",
      message: "Dear Students, semester fee deadline extended to Feb 28.",
      type: "FEE",
      target: "STUDENTS",
    };

    it("two consecutive identical create requests produce only 1 DB record and return 409 DUPLICATE_NOTIFICATION", async () => {
      const beforeCount = await Notification.countDocuments({ college_id: collegeA._id });

      // First submission succeeds
      const firstRes = await adminAgent
        .post("/api/notifications/admin/create")
        .send(SAMPLE_PAYLOAD)
        .expect(201);
      expect(firstRes.body.success).toBe(true);

      // Second immediate identical submission is blocked
      const secondRes = await adminAgent
        .post("/api/notifications/admin/create")
        .send(SAMPLE_PAYLOAD)
        .expect(409);
      const errorCode = secondRes.body.error?.code || secondRes.body.code;
      const errorMessage = secondRes.body.error?.message || secondRes.body.message;
      expect(errorCode).toBe("DUPLICATE_NOTIFICATION");
      expect(errorMessage).toContain("recently created");

      const afterCount = await Notification.countDocuments({ college_id: collegeA._id });
      expect(afterCount - beforeCount).toBe(1);
    });

    it("different targets with same title/message are NOT blocked as duplicates", async () => {
      // 1. Post to STUDENTS
      await adminAgent
        .post("/api/notifications/admin/create")
        .send({ ...SAMPLE_PAYLOAD, target: "STUDENTS" })
        .expect(201);

      // 2. Post same text to TEACHERS -> should be allowed
      const res = await adminAgent
        .post("/api/notifications/admin/create")
        .send({ ...SAMPLE_PAYLOAD, target: "TEACHERS" })
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.target).toBe("TEACHERS");
    });

    it("different content with same target is NOT blocked", async () => {
      await adminAgent
        .post("/api/notifications/admin/create")
        .send(SAMPLE_PAYLOAD)
        .expect(201);

      const res = await adminAgent
        .post("/api/notifications/admin/create")
        .send({
          title: "Exam Schedule Released",
          message: "Check timetable portal.",
          type: "EXAM",
          target: "STUDENTS",
        })
        .expect(201);
      expect(res.body.success).toBe(true);
    });

    it("different creators in the same college do not block each other", async () => {
      await adminAgent
        .post("/api/notifications/admin/create")
        .send(SAMPLE_PAYLOAD)
        .expect(201);

      // Admin A2 in the same college creates the notice -> allowed
      const res = await adminASecondAgent
        .post("/api/notifications/admin/create")
        .send(SAMPLE_PAYLOAD)
        .expect(201);
      expect(res.body.success).toBe(true);
    });

    it("different colleges do not interfere with each other's submissions", async () => {
      await adminAgent
        .post("/api/notifications/admin/create")
        .send(SAMPLE_PAYLOAD)
        .expect(201);

      // Admin in College B creates same notice -> allowed
      const res = await adminBAgent
        .post("/api/notifications/admin/create")
        .send(SAMPLE_PAYLOAD)
        .expect(201);
      expect(res.body.success).toBe(true);
    });

    it("concurrent simultaneous submissions with identical payload are safely rejected", async () => {
      const results = await Promise.all([
        adminAgent.post("/api/notifications/admin/create").send({
          title: "Concurrent Flood Test",
          message: "Testing race condition handling",
          type: "GENERAL",
          target: "ALL",
        }),
        adminAgent.post("/api/notifications/admin/create").send({
          title: "Concurrent Flood Test",
          message: "Testing race condition handling",
          type: "GENERAL",
          target: "ALL",
        }),
      ]);

      const statuses = results.map((r) => r.status);
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      const createdCount = await Notification.countDocuments({
        college_id: collegeA._id,
        title: "Concurrent Flood Test",
      });
      expect(createdCount).toBe(1);
    });
  });

  describe("B. College Admin Visibility & Tenant Isolation", () => {
    it("a STUDENTS fee notification created by College Admin is excluded from GET /api/notifications/admin/read", async () => {
      const createRes = await adminAgent
        .post("/api/notifications/admin/create")
        .send({
          title: "Fee Payment Deadline Extended",
          message: "Dear Students, please pay your fees.",
          type: "FEE",
          target: "STUDENTS",
        })
        .expect(201);

      const noteId = createRes.body.data.notification._id;

      // Admin read list must NOT contain it
      const adminList = await adminAgent
        .get("/api/notifications/admin/read")
        .expect(200);
      const myNoteIds = (adminList.body.data.myNotifications || []).map((n) => n._id);
      expect(myNoteIds).not.toContain(noteId);

      // Admin Bell & Unread Count must NOT contain it
      const bellRes = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      expect((bellRes.body.data || []).map((n) => n._id)).not.toContain(noteId);

      const countRes = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(countRes.body.data.myCount).toBe(0);

      // Student MUST receive it
      const studentRes = await studentAgent
        .get("/api/notifications/student/read")
        .expect(200);
      const studentNoteIds = (studentRes.body.data.adminNotifications || []).map((n) => n._id);
      expect(studentNoteIds).toContain(noteId);
    });

    it("ALL notifications remain visible to College Admin in /api/notifications/admin/read", async () => {
      const createRes = await adminAgent
        .post("/api/notifications/admin/create")
        .send({
          title: "Campus Closed for Maintenance",
          message: "Campus is closed this Sunday.",
          type: "GENERAL",
          target: "ALL",
        })
        .expect(201);

      const noteId = createRes.body.data.notification._id;

      const adminList = await adminAgent
        .get("/api/notifications/admin/read")
        .expect(200);
      const myNoteIds = (adminList.body.data.myNotifications || []).map((n) => n._id);
      expect(myNoteIds).toContain(noteId);
    });

    it("INDIVIDUAL notifications explicitly directed to the Admin remain visible", async () => {
      const doc = await Notification.create({
        college_id: collegeA._id,
        createdBy: adminASecond._id,
        createdByRole: "COLLEGE_ADMIN",
        target: "INDIVIDUAL",
        target_users: [adminA._id],
        title: "Admin Internal Memo",
        message: "Notice for Admin Alpha.",
        type: "GENERAL",
      });
      const noteId = doc._id.toString();

      const adminList = await adminAgent
        .get("/api/notifications/admin/read")
        .expect(200);
      const myNoteIds = (adminList.body.data.myNotifications || []).map((n) => n._id);
      expect(myNoteIds).toContain(noteId);
    });

    it("valid staff/teacher notifications remain visible in staffNotifications", async () => {
      const doc = await Notification.create({
        college_id: collegeA._id,
        createdBy: teacherUser._id,
        createdByRole: "TEACHER",
        target: "STUDENTS",
        title: "Class Project Guidelines",
        message: "Submit by Friday.",
        type: "ACADEMIC",
      });
      const noteId = doc._id.toString();

      const adminList = await adminAgent
        .get("/api/notifications/admin/read")
        .expect(200);
      const staffNoteIds = (adminList.body.data.staffNotifications || []).map((n) => n._id);
      expect(staffNoteIds).toContain(noteId);
    });

    it("cross-tenant notification access is strictly rejected", async () => {
      const createRes = await adminAgent
        .post("/api/notifications/admin/create")
        .send({
          title: "Alpha Confidential Announcement",
          message: "Only for Alpha.",
          type: "GENERAL",
          target: "ALL",
        })
        .expect(201);

      const noteId = createRes.body.data.notification._id;

      // Admin B from College Beta must see nothing in their list
      const adminBList = await adminBAgent
        .get("/api/notifications/admin/read")
        .expect(200);
      const allBNotes = [
        ...(adminBList.body.data.myNotifications || []),
        ...(adminBList.body.data.staffNotifications || []),
      ].map((n) => n._id);
      expect(allBNotes).not.toContain(noteId);

      // Direct ID lookup from College B must be 404
      await adminBAgent.get(`/api/notifications/${noteId}`).expect(404);
    });
  });
});
