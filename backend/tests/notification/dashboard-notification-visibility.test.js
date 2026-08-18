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

describe("NOT-REG — Dashboard Notification Visibility Regression", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("Test 1: Old ALL-targeted notification must NOT appear on Student Dashboard", async () => {
    const college = await createCollege({ code: "DASH01", name: "Dashboard College 1" });

    const admin = await createUser({
      email: "admin.dash01@test.com",
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

    const studentUser = await createUser({
      email: "student.dash01@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.dash01@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    // Notification created BEFORE student approval
    const oldNotification = await Notification.create({
      college_id: college._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: admin._id,
      title: "Old ALL Notice",
      message: "Created before student.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "ALL",
      isActive: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const dashboardRes = await studentAgent
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    const matching = latestNotifications.filter((n) => String(n._id) === String(oldNotification._id));
    expect(matching).toHaveLength(0);
  });

  it("Test 2: Old STUDENTS-targeted notification must NOT appear on Student Dashboard", async () => {
    const college = await createCollege({ code: "DASH02", name: "Dashboard College 2" });

    const admin = await createUser({
      email: "admin.dash02@test.com",
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
      email: "student.dash02@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.dash02@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    // Notification created BEFORE student approval
    const oldNotification = await Notification.create({
      college_id: college._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: admin._id,
      title: "Old Students Notice",
      message: "Created before student.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "STUDENTS",
      isActive: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    });

    const studentAgent = request.agent(app);
    await studentAgent
      .post("/api/auth/login")
      .send({ email: studentUser.email, password: "Test@123" })
      .expect(200);

    const dashboardRes = await studentAgent
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    const matching = latestNotifications.filter((n) => String(n._id) === String(oldNotification._id));
    expect(matching).toHaveLength(0);
  });

  it("Test 3: New ALL-targeted notification MUST appear on Student Dashboard", async () => {
    const college = await createCollege({ code: "DASH03", name: "Dashboard College 3" });

    const admin = await createUser({
      email: "admin.dash03@test.com",
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

    const studentUser = await createUser({
      email: "student.dash03@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.dash03@test.com",
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

    // Notification created AFTER student approval
    const newNotification = await Notification.create({
      college_id: college._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: admin._id,
      title: "New ALL Notice",
      message: "Created after student.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "ALL",
      isActive: true,
      createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in future
    });

    const dashboardRes = await studentAgent
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    const matching = latestNotifications.filter((n) => String(n._id) === String(newNotification._id));
    expect(matching).toHaveLength(1);
  });

  it("Test 4: New STUDENTS-targeted notification MUST appear on Student Dashboard", async () => {
    const college = await createCollege({ code: "DASH04", name: "Dashboard College 4" });

    const admin = await createUser({
      email: "admin.dash04@test.com",
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
      email: "student.dash04@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.dash04@test.com",
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

    // Notification created AFTER student approval
    const newNotification = await Notification.create({
      college_id: college._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: admin._id,
      title: "New Students Notice",
      message: "Created after student.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "STUDENTS",
      isActive: true,
      createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in future
    });

    const dashboardRes = await studentAgent
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    const matching = latestNotifications.filter((n) => String(n._id) === String(newNotification._id));
    expect(matching).toHaveLength(1);
  });

  it("Test 5: Department notification visibility on Dashboard", async () => {
    const college = await createCollege({ code: "DASH05", name: "Dashboard College 5" });

    const admin = await createUser({
      email: "admin.dash05@test.com",
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
      email: "student.dash05@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.dash05@test.com",
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

    // Old department notification - should NOT appear
    const oldDeptNotification = await Notification.create({
      college_id: college._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: admin._id,
      title: "Old Dept Notice",
      message: "Created before student.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "DEPARTMENT",
      target_department: department._id,
      isActive: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    });

    // New department notification - should appear
    const newDeptNotification = await Notification.create({
      college_id: college._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: admin._id,
      title: "New Dept Notice",
      message: "Created after student.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "DEPARTMENT",
      target_department: department._id,
      isActive: true,
      createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in future
    });

    const dashboardRes = await studentAgent
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    const oldMatching = latestNotifications.filter((n) => String(n._id) === String(oldDeptNotification._id));
    const newMatching = latestNotifications.filter((n) => String(n._id) === String(newDeptNotification._id));

    expect(oldMatching).toHaveLength(0);
    expect(newMatching).toHaveLength(1);
  });

  it("Test 6: Cross-college notification must NOT appear on Student Dashboard", async () => {
    const collegeA = await createCollege({ code: "DASH06A", name: "College A", email: "collegea@test.com" });
    const collegeB = await createCollege({ code: "DASH06B", name: "College B", email: "collegeb@test.com" });

    const adminA = await createUser({
      email: "admin.dash06a@test.com",
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

    const studentB = await createUser({
      email: "student.dash06b@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: collegeB._id,
      isActive: true,
    });

    const studentBRecord = await createStudent({
      email: "student.dash06b@test.com",
      college_id: collegeB._id,
      department_id: departmentB._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: studentB._id,
    });

    // Create notification in College A
    await Notification.create({
      college_id: collegeA._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: adminA._id,
      title: "College A Only",
      message: "Should not leak.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "ALL",
      isActive: true,
      createdAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const studentAgentB = request.agent(app);
    await studentAgentB
      .post("/api/auth/login")
      .send({ email: studentB.email, password: "Test@123" })
      .expect(200);

    const dashboardRes = await studentAgentB
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    const collegeANotifications = latestNotifications.filter(
      (n) => n.title === "College A Only"
    );
    expect(collegeANotifications).toHaveLength(0);
  });

  it("Test 7: Expired notification must NOT appear on Student Dashboard", async () => {
    const college = await createCollege({ code: "DASH07", name: "Dashboard College 7" });

    const admin = await createUser({
      email: "admin.dash07@test.com",
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

    const studentUser = await createUser({
      email: "student.dash07@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.dash07@test.com",
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

    // Notification created AFTER student approval but expires very soon
    const expiredNotification = await Notification.create({
      college_id: college._id,
      createdByRole: "COLLEGE_ADMIN",
      createdBy: admin._id,
      title: "Expired Notice",
      message: "This is expired.",
      type: "GENERAL",
      priority: "NORMAL",
      target: "ALL",
      isActive: true,
      expiresAt: new Date(Date.now() + 2 * 1000), // expires in 2 seconds
    });

    // Wait for notification to expire
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const dashboardRes = await studentAgent
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    const matching = latestNotifications.filter((n) => String(n._id) === String(expiredNotification._id));
    expect(matching).toHaveLength(0);
  });

  it("Test 8: Dashboard returns at most 5 notifications sorted by createdAt descending", async () => {
    const college = await createCollege({ code: "DASH08", name: "Dashboard College 8" });

    const admin = await createUser({
      email: "admin.dash08@test.com",
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

    const studentUser = await createUser({
      email: "student.dash08@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      email: "student.dash08@test.com",
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

    // Create 7 notifications after student approval
    for (let i = 0; i < 7; i++) {
      await Notification.create({
        college_id: college._id,
        createdByRole: "COLLEGE_ADMIN",
        createdBy: admin._id,
        title: `Dashboard Notice ${i + 1}`,
        message: `Message ${i + 1}`,
        type: "GENERAL",
        priority: "NORMAL",
        target: "ALL",
        isActive: true,
        createdAt: new Date(Date.now() + (i + 1) * 60 * 1000), // staggered by minutes
      });
    }

    const dashboardRes = await studentAgent
      .get("/api/dashboard/student")
      .expect(200);

    const latestNotifications = dashboardRes.body.data?.latestNotifications || [];
    expect(latestNotifications.length).toBeLessThanOrEqual(5);

    // Verify sorted by createdAt descending
    for (let i = 0; i < latestNotifications.length - 1; i++) {
      const current = new Date(latestNotifications[i].createdAt);
      const next = new Date(latestNotifications[i + 1].createdAt);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });
});
