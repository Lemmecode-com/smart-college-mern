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
} = require("../helpers/factories");
const app = require("../../app");

const Notification = require("../../src/models/notification.model");
const Department = require("../../src/models/department.model");

describe("NOT-REG — Notification Visibility Regression (ALL target)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("TC-01: Admin creates ONE notification with target=ALL → exactly 1 DB document", async () => {
    const college = await createCollege({ code: "REG01", name: "Regression College" });

    const admin = await createUser({
      email: "admin.reg01@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "College Maintenance",
        message: "Server maintenance on Sunday.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const count = await Notification.countDocuments({ college_id: college._id });
    expect(count).toBe(1);
  });

  it("TC-02: Student sees the ALL-targeted notification exactly once", async () => {
    const college = await createCollege({ code: "REG02", name: "Regression College 2" });

    const admin = await createUser({
      email: "admin.reg02@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const department = await Department.create({
      college_id: college._id,
      name: "Computer Science",
      code: "CSE",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const course = new mongoose.Types.ObjectId();

    const studentUser = await createUser({
      email: "student.reg02@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.reg02@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: course,
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Holiday Announcement",
        message: "Tomorrow is a holiday.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const studentRes = await studentAgent
      .get("/api/notifications/student/read")
      .expect(200);

    const allNotifications = [
      ...(studentRes.body.data.adminNotifications || []),
      ...(studentRes.body.data.teacherNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(1);
  });

  it("TC-03: Teacher sees the ALL-targeted notification exactly once", async () => {
    const college = await createCollege({ code: "REG03", name: "Regression College 3" });

    const admin = await createUser({
      email: "admin.reg03@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Staff Meeting",
        message: "Meeting at 3 PM.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const department = await Department.create({
      college_id: college._id,
      name: "Physics",
      code: "PHY",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const teacherUser = await createUser({
      email: "teacher.reg03@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "teacher.reg03@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      name: "Test Teacher",
      employeeId: "TCH-REG03",
      createdBy: teacherUser._id,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    const teacherRes = await teacherAgent
      .get("/api/notifications/teacher/read")
      .expect(200);

    const allNotifications = [
      ...(teacherRes.body.data.myNotifications || []),
      ...(teacherRes.body.data.adminNotifications || []),
      ...(teacherRes.body.data.hodNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(1);
  });

  it("TC-04: HOD sees the ALL-targeted notification exactly once", async () => {
    const college = await createCollege({ code: "REG04", name: "Regression College 4" });

    const admin = await createUser({
      email: "admin.reg04@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Audit Preparation",
        message: "Prepare for audit next week.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const department = await Department.create({
      college_id: college._id,
      name: "Mathematics",
      code: "MTH",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const hodUser = await createUser({
      email: "hod.reg04@test.com",
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "hod.reg04@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: hodUser._id,
      name: "Test HOD",
      employeeId: "HOD-REG04",
      designation: "HOD",
      createdBy: hodUser._id,
    });

    const hodAgent = request.agent(app);
    await hodAgent
      .post("/api/auth/login")
      .send({ email: hodUser.email, password: "Test@123" })
      .expect(200);

    const hodRes = await hodAgent
      .get("/api/notifications/hod/read")
      .expect(200);

    const allNotifications = [
      ...(hodRes.body.data.myNotifications || []),
      ...(hodRes.body.data.adminNotifications || []),
      ...(hodRes.body.data.teacherNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(1);
  });

  it("TC-05: College Admin sees their own ALL-targeted notification exactly once", async () => {
    const college = await createCollege({ code: "REG05", name: "Regression College 5" });

    const admin = await createUser({
      email: "admin.reg05@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Policy Update",
        message: "New attendance policy.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const adminRes = await adminAgent
      .get("/api/notifications/admin/read")
      .expect(200);

    const allNotifications = [
      ...(adminRes.body.data.myNotifications || []),
      ...(adminRes.body.data.staffNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(1);
  });

  it("TC-06: API responses contain unique notification _id values for Teacher", async () => {
    const college = await createCollege({ code: "REG06", name: "Regression College 6" });

    const admin = await createUser({
      email: "admin.reg06@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Unique ID Test",
        message: "Testing unique IDs.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const department = await Department.create({
      college_id: college._id,
      name: "Chemistry",
      code: "CHE",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const teacherUser = await createUser({
      email: "teacher.reg06@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "teacher.reg06@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      name: "Test Teacher",
      employeeId: "TCH-REG06",
      createdBy: teacherUser._id,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    const teacherRes = await teacherAgent
      .get("/api/notifications/teacher/read")
      .expect(200);

    const allNotifications = [
      ...(teacherRes.body.data.myNotifications || []),
      ...(teacherRes.body.data.adminNotifications || []),
      ...(teacherRes.body.data.hodNotifications || []),
    ];

    const ids = allNotifications.map((n) => n._id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("TC-07: API responses contain unique notification _id values for HOD", async () => {
    const college = await createCollege({ code: "REG07", name: "Regression College 7" });

    const admin = await createUser({
      email: "admin.reg07@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Unique ID HOD Test",
        message: "Testing unique IDs for HOD.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const department = await Department.create({
      college_id: college._id,
      name: "Biology",
      code: "BIO",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const hodUser = await createUser({
      email: "hod.reg07@test.com",
      password: "Test@123",
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "hod.reg07@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: hodUser._id,
      name: "Test HOD",
      employeeId: "HOD-REG07",
      designation: "HOD",
      createdBy: hodUser._id,
    });

    const hodAgent = request.agent(app);
    await hodAgent
      .post("/api/auth/login")
      .send({ email: hodUser.email, password: "Test@123" })
      .expect(200);

    const hodRes = await hodAgent
      .get("/api/notifications/hod/read")
      .expect(200);

    const allNotifications = [
      ...(hodRes.body.data.myNotifications || []),
      ...(hodRes.body.data.adminNotifications || []),
      ...(hodRes.body.data.teacherNotifications || []),
    ];

    const ids = allNotifications.map((n) => n._id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("TC-08: No cross-college visibility — Teacher from College A does not see College B admin notification", async () => {
    const collegeA = await createCollege({ code: "REG08A", name: "College A" });
    const collegeB = await createCollege({ code: "REG08B", name: "College B", email: "collegeb@test.com" });

    const adminA = await createUser({
      email: "admin.reg08a@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: collegeA._id,
      isActive: true,
    });

    const adminAgentA = request.agent(app);
    await adminAgentA
      .post("/api/auth/login")
      .send({ email: adminA.email, password: "Test@123" })
      .expect(200);

    await adminAgentA
      .post("/api/notifications/admin/create")
      .send({
        title: "College A Only",
        message: "Should not leak.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const departmentB = await Department.create({
      college_id: collegeB._id,
      name: "Physics",
      code: "PHY",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: adminA._id,
    });

    const teacherB = await createUser({
      email: "teacher.reg08b@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: collegeB._id,
      isActive: true,
    });

    await createTeacher({
      email: "teacher.reg08b@test.com",
      college_id: collegeB._id,
      department_id: departmentB._id,
      user_id: teacherB._id,
      name: "Teacher B",
      employeeId: "TCH-REG08B",
      createdBy: teacherB._id,
    });

    const teacherAgentB = request.agent(app);
    await teacherAgentB
      .post("/api/auth/login")
      .send({ email: teacherB.email, password: "Test@123" })
      .expect(200);

    const teacherResB = await teacherAgentB
      .get("/api/notifications/teacher/read")
      .expect(200);

    const allNotificationsB = [
      ...(teacherResB.body.data.myNotifications || []),
      ...(teacherResB.body.data.adminNotifications || []),
      ...(teacherResB.body.data.hodNotifications || []),
    ];

    expect(allNotificationsB).toHaveLength(0);
  });

  it("TC-09: Role-specific targets — STUDENTS-targeted admin notification NOT visible to Teacher", async () => {
    const college = await createCollege({ code: "REG09", name: "Regression College 9" });

    const admin = await createUser({
      email: "admin.reg09@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Students Only",
        message: "Should not be visible to teachers.",
        type: "GENERAL",
        target: "STUDENTS",
      })
      .expect(201);

    const department = await Department.create({
      college_id: college._id,
      name: "History",
      code: "HIS",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const teacherUser = await createUser({
      email: "teacher.reg09@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "teacher.reg09@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      name: "Test Teacher",
      employeeId: "TCH-REG09",
      createdBy: teacherUser._id,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    const teacherRes = await teacherAgent
      .get("/api/notifications/teacher/read")
      .expect(200);

    const allNotifications = [
      ...(teacherRes.body.data.myNotifications || []),
      ...(teacherRes.body.data.adminNotifications || []),
      ...(teacherRes.body.data.hodNotifications || []),
    ];

    const studentsOnly = allNotifications.filter((n) => n.title === "Students Only");
    expect(studentsOnly).toHaveLength(0);
  });

  it("TC-10: Role-specific targets — TEACHERS-targeted admin notification visible to Teacher", async () => {
    const college = await createCollege({ code: "REG10", name: "Regression College 10" });

    const admin = await createUser({
      email: "admin.reg10@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Teachers Only",
        message: "Visible to teachers.",
        type: "GENERAL",
        target: "TEACHERS",
      })
      .expect(201);

    const department = await Department.create({
      college_id: college._id,
      name: "Economics",
      code: "ECO",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const teacherUser = await createUser({
      email: "teacher.reg10@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "teacher.reg10@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      name: "Test Teacher",
      employeeId: "TCH-REG10",
      createdBy: teacherUser._id,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    const teacherRes = await teacherAgent
      .get("/api/notifications/teacher/read")
      .expect(200);

    const allNotifications = [
      ...(teacherRes.body.data.myNotifications || []),
      ...(teacherRes.body.data.adminNotifications || []),
      ...(teacherRes.body.data.hodNotifications || []),
    ];

    const teachersOnly = allNotifications.filter((n) => n.title === "Teachers Only");
    expect(teachersOnly).toHaveLength(1);
  });

  it("TC-11: Role-specific targets — DEPARTMENT-targeted admin notification visible to Teacher in same dept", async () => {
    const college = await createCollege({ code: "REG11", name: "Regression College 11" });

    const admin = await createUser({
      email: "admin.reg11@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const department = await Department.create({
      college_id: college._id,
      name: "Computer Science",
      code: "CSE",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Dept Notice",
        message: "For CS department only.",
        type: "GENERAL",
        target: "DEPARTMENT",
        target_department: department._id,
      })
      .expect(201);

    const teacherUser = await createUser({
      email: "teacher.reg11@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "teacher.reg11@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      name: "Test Teacher",
      employeeId: "TCH-REG11",
      createdBy: teacherUser._id,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    const teacherRes = await teacherAgent
      .get("/api/notifications/teacher/read")
      .expect(200);

    const allNotifications = [
      ...(teacherRes.body.data.myNotifications || []),
      ...(teacherRes.body.data.adminNotifications || []),
      ...(teacherRes.body.data.hodNotifications || []),
    ];

    const deptNotice = allNotifications.filter((n) => n.title === "Dept Notice");
    expect(deptNotice).toHaveLength(1);
  });

  it("TC-12: Notification bell unread count is accurate for Teacher after ALL-targeted notification", async () => {
    const college = await createCollege({ code: "REG12", name: "Regression College 12" });

    const admin = await createUser({
      email: "admin.reg12@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const department = await Department.create({
      college_id: college._id,
      name: "Geography",
      code: "GEO",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const teacherUser = await createUser({
      email: "teacher.reg12@test.com",
      password: "Test@123",
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });

    await createTeacher({
      email: "teacher.reg12@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      name: "Test Teacher",
      employeeId: "TCH-REG12",
      createdBy: teacherUser._id,
    });

    const teacherAgent = request.agent(app);
    await teacherAgent
      .post("/api/auth/login")
      .send({ email: teacherUser.email, password: "Test@123" })
      .expect(200);

    await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Bell Count Test",
        message: "Testing bell count.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const bellRes = await teacherAgent
      .get("/api/notifications/unread/bell")
      .expect(200);

    const bellNotifications = Array.isArray(bellRes.body.data) ? bellRes.body.data : [];
    const bellCount = bellNotifications.filter((n) => n.title === "Bell Count Test").length;
    expect(bellCount).toBe(1);
  });

  it("TC-13: Old ALL-targeted notification is NOT visible to newly approved student", async () => {
    const college = await createCollege({ code: "REG13", name: "Regression College 13" });

    const admin = await createUser({
      email: "admin.reg13@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    // Notification created BEFORE student exists
    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Old College Notice",
        message: "Created before student registration.",
        type: "GENERAL",
        target: "ALL",
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const department = await Department.create({
      college_id: college._id,
      name: "Physics",
      code: "PHY",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const studentUser = await createUser({
      email: "student.reg13@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.reg13@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const studentRes = await studentAgent
      .get("/api/notifications/student/read")
      .expect(200);

    const allNotifications = [
      ...(studentRes.body.data.adminNotifications || []),
      ...(studentRes.body.data.teacherNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(0);
  });

  it("TC-14: New STUDENTS-targeted notification IS visible to existing student", async () => {
    const college = await createCollege({ code: "REG14", name: "Regression College 14" });

    const admin = await createUser({
      email: "admin.reg14@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const department = await Department.create({
      college_id: college._id,
      name: "Chemistry",
      code: "CHE",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const studentUser = await createUser({
      email: "student.reg14@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.reg14@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    // Notification created AFTER student exists
    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "New Exam Notice",
        message: "Created after student registration.",
        type: "EXAM",
        target: "STUDENTS",
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const studentRes = await studentAgent
      .get("/api/notifications/student/read")
      .expect(200);

    const allNotifications = [
      ...(studentRes.body.data.adminNotifications || []),
      ...(studentRes.body.data.teacherNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(1);
  });

  it("TC-15: Old DEPARTMENT-targeted notification is NOT visible to newly approved student", async () => {
    const college = await createCollege({ code: "REG15", name: "Regression College 15" });

    const admin = await createUser({
      email: "admin.reg15@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const department = await Department.create({
      college_id: college._id,
      name: "Mathematics",
      code: "MTH",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    // Notification created BEFORE student exists
    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Old Dept Notice",
        message: "Created before student registration.",
        type: "GENERAL",
        target: "DEPARTMENT",
        target_department: department._id,
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const studentUser = await createUser({
      email: "student.reg15@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.reg15@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const studentRes = await studentAgent
      .get("/api/notifications/student/read")
      .expect(200);

    const allNotifications = [
      ...(studentRes.body.data.adminNotifications || []),
      ...(studentRes.body.data.teacherNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(0);
  });

  it("TC-16: Old INDIVIDUAL notification IS visible to newly approved student when explicitly targeted", async () => {
    const college = await createCollege({ code: "REG16", name: "Regression College 16" });

    const admin = await createUser({
      email: "admin.reg16@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const department = await Department.create({
      college_id: college._id,
      name: "Biology",
      code: "BIO",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const studentUser = await createUser({
      email: "student.reg16@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.reg16@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    // Notification created BEFORE student exists, but explicitly targets the student
    const createRes = await adminAgent
      .post("/api/notifications/admin/create")
      .send({
        title: "Old Individual Notice",
        message: "Created before student but explicitly targeted.",
        type: "GENERAL",
        target: "INDIVIDUAL",
        target_users: [studentUser._id],
      })
      .expect(201);

    const notificationId = createRes.body.data.notification._id;

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const studentRes = await studentAgent
      .get("/api/notifications/student/read")
      .expect(200);

    const allNotifications = [
      ...(studentRes.body.data.adminNotifications || []),
      ...(studentRes.body.data.teacherNotifications || []),
    ];

    const matching = allNotifications.filter((n) => n._id === notificationId);
    expect(matching).toHaveLength(1);
  });
});
