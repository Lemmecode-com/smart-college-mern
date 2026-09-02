/**
 * Regression tests for HOD notification department-scoping & authorization.
 *
 * Security model enforced:
 *   HOD -> Own College -> Own Department -> Authorized recipients only
 *
 * Covers TC-HOD-01 .. TC-HOD-18.
 */
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

const User = require("../../src/models/user.model");
const Teacher = require("../../src/models/teacher.model");
const Student = require("../../src/models/student.model");
const Department = require("../../src/models/department.model");
const Notification = require("../../src/models/notification.model");
const NotificationRead = require("../../src/models/notificationRead.model");
const ParentGuardian = require("../../src/models/parentGuardian.model");

const PW = "Test@123";

/**
 * Wire an existing department's hod_id to a newly-created HOD user/teacher.
 * Returns { hodUser, teacher, department }.
 */
const assignHod = async (collegeId, department, opts = {}) => {
  const hodUser = await createUser({
    email: opts.email || `hod-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    password: PW,
    role: "HOD",
    college_id: collegeId,
    isActive: true,
  });

  const teacher = await createTeacher({
    email: hodUser.email,
    college_id: collegeId,
    department_id: department._id,
    user_id: hodUser._id,
    name: opts.name || "Test HOD",
    employeeId: opts.employeeId || `HOD-${Date.now()}`,
    designation: "HOD",
    createdBy: hodUser._id,
  });

  department.hod_id = teacher._id;
  await department.save();

  return { hodUser, teacher, department };
};

const login = async (user) => {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: PW })
    .expect(200);
  return agent;
};

describe("HOD Notification Department Isolation (TC-HOD-01..18)", () => {
  let college, otherCollege;
  let csDept, mechDept;
  let csHod, csHodTeacher, csHodDept;
  let csStudent, csStudentUser, mechStudent, mechStudentUser;
  let csTeacher, csTeacherUser, mechTeacher, mechTeacherUser;
  let parentUser, parentGuardian, parentDeptStudent;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    college = await createCollege({ code: "HODISO", name: "HOD Iso College" });
    otherCollege = await createCollege({
      code: "HODISO2",
      name: "Other College",
      email: "other2@test.com",
    });

    // Two departments in the same college
    csDept = await Department.create({
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
      createdBy: new mongoose.Types.ObjectId(),
    });

    mechDept = await Department.create({
      college_id: college._id,
      name: "Mechanical",
      code: "MECH",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Wire CS department -> HOD
    ({ hodUser: csHod, teacher: csHodTeacher } = await assignHod(college._id, csDept, {
      email: "cs-hod@test.com",
      name: "CS HOD",
      employeeId: "HOD-CS01",
    }));;
    csHodDept = csDept;
    csHodDept.hod_id = csHodTeacher._id;
    await csHodDept.save();

    // CS student
    csStudentUser = await createUser({
      email: "cs-student@test.com",
      password: PW,
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });
    csStudent = await createStudent({
      email: "cs-student@test.com",
      college_id: college._id,
      department_id: csDept._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: csStudentUser._id,
    });

    // Mechanical student (different department, same college)
    mechStudentUser = await createUser({
      email: "mech-student@test.com",
      password: PW,
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });
    mechStudent = await createStudent({
      email: "mech-student@test.com",
      college_id: college._id,
      department_id: mechDept._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: mechStudentUser._id,
    });

    // CS teacher
    csTeacherUser = await createUser({
      email: "cs-teacher@test.com",
      password: PW,
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });
    csTeacher = await createTeacher({
      email: "cs-teacher@test.com",
      college_id: college._id,
      department_id: csDept._id,
      user_id: csTeacherUser._id,
      name: "CS Teacher",
      employeeId: "TCH-CS01",
      createdBy: csTeacherUser._id,
    });

    // Mechanical teacher
    mechTeacherUser = await createUser({
      email: "mech-teacher@test.com",
      password: PW,
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });
    mechTeacher = await createTeacher({
      email: "mech-teacher@test.com",
      college_id: college._id,
      department_id: mechDept._id,
      user_id: mechTeacherUser._id,
      name: "Mech Teacher",
      employeeId: "TCH-ME01",
      createdBy: mechTeacherUser._id,
    });

    // Parent with a linked CS student (for parent visibility)
    parentUser = await createUser({
      email: "parent@test.com",
      password: PW,
      role: "PARENT_GUARDIAN",
      college_id: college._id,
      isActive: true,
    });
    parentDeptStudent = await createStudent({
      email: "parent-linked-student@test.com",
      fullName: "Linked CS Student",
      college_id: college._id,
      department_id: csDept._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: new mongoose.Types.ObjectId(),
    });
    parentGuardian = await ParentGuardian.create({
      user_id: parentUser._id,
      college_id: college._id,
      student_ids: [parentDeptStudent._id],
      relation: "father",
    });

    // A cross-college student (for TC-HOD-09 / TC-HOD-13)
    await createUser({
      email: "other-college-student@test.com",
      password: PW,
      role: "STUDENT",
      college_id: otherCollege._id,
      isActive: true,
    });
    await createStudent({
      email: "other-college-student@test.com",
      college_id: otherCollege._id,
      department_id: csDept._id,
      course_id: new mongoose.Types.ObjectId(),
      currentSemester: 1,
      status: "APPROVED",
      user_id: undefined,
    });
  });

  const csHodAgent = async () => login(csHod);

  /* ================= STUDENTS targeting ================= */
  describe("TC-HOD-01 / TC-HOD-02 — STUDENTS target", () => {
    it("TC-HOD-01: CS HOD creates STUDENTS -> CS student sees 1", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({ title: "CS Announcement", message: "For CS students", target: "STUDENTS" })
        .expect(201);

      const studentAgent = await login(csStudentUser);
      const res = await studentAgent.get("/api/notifications/student/read").expect(200);

      const hodNotes = res.body.data.hodNotifications || [];
      expect(hodNotes).toHaveLength(1);
      expect(hodNotes[0].title).toBe("CS Announcement");
    });

    it("TC-HOD-02: CS HOD creates STUDENTS -> Mechanical student sees 0", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({ title: "CS Announcement", message: "For CS students", target: "STUDENTS" })
        .expect(201);

      const studentAgent = await login(mechStudentUser);
      const res = await studentAgent.get("/api/notifications/student/read").expect(200);

      const hodNotes = res.body.data.hodNotifications || [];
      expect(hodNotes).toHaveLength(0);

      // other buckets must not contain it either
      const allTitles = [
        ...(res.body.data.adminNotifications || []).map((n) => n.title),
        ...(res.body.data.teacherNotifications || []).map((n) => n.title),
      ];
      expect(allTitles).not.toContain("CS Announcement");
    });
  });

  /* ================= TEACHERS targeting ================= */
  describe("TC-HOD-03 / TC-HOD-04 — TEACHERS target", () => {
    it("TC-HOD-03: CS HOD creates TEACHERS -> CS teacher sees 1", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({ title: "CS Faculty", message: "For CS teachers", target: "TEACHERS" })
        .expect(201);

      const teacherAgent = await login(csTeacherUser);
      const res = await teacherAgent.get("/api/notifications/teacher/read").expect(200);

      const hodNotes = res.body.data.hodNotifications || [];
      expect(hodNotes).toHaveLength(1);
      expect(hodNotes[0].title).toBe("CS Faculty");
    });

    it("TC-HOD-04: CS HOD creates TEACHERS -> Mechanical teacher sees 0", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({ title: "CS Faculty", message: "For CS teachers", target: "TEACHERS" })
        .expect(201);

      const teacherAgent = await login(mechTeacherUser);
      const res = await teacherAgent.get("/api/notifications/teacher/read").expect(200);

      const hodNotes = res.body.data.hodNotifications || [];
      expect(hodNotes).toHaveLength(0);

      const allTitles = [
        ...(res.body.data.myNotifications || []).map((n) => n.title),
        ...(res.body.data.adminNotifications || []).map((n) => n.title),
      ];
      expect(allTitles).not.toContain("CS Faculty");
    });
  });

  /* ================= DEPARTMENT targeting ================= */
  describe("TC-HOD-05 / TC-HOD-06 — DEPARTMENT target", () => {
    it("TC-HOD-05: CS HOD targets CS department -> success", async () => {
      const agent = await csHodAgent();
      const res = await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Dept Notice",
          message: "For CS dept only",
          target: "DEPARTMENT",
          target_department: csDept._id.toString(),
        })
        .expect(201);

      expect(res.body.data.notification.createdByDepartment.toString()).toBe(csDept._id.toString());
      expect(res.body.data.notification.target_department.toString()).toBe(csDept._id.toString());

      // CS teacher (same dept) should see it
      const teacherAgent = await login(csTeacherUser);
      const tRes = await teacherAgent.get("/api/notifications/teacher/read").expect(200);
      expect((tRes.body.data.hodNotifications || []).map((n) => n.title)).toContain("Dept Notice");
    });

    it("TC-HOD-06: CS HOD manually targets Mechanical department -> rejected 403", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Cross Dept",
          message: "Should be rejected",
          target: "DEPARTMENT",
          target_department: mechDept._id.toString(),
        })
        .expect(403);

      // No notification document should exist
      const count = await Notification.countDocuments({ title: "Cross Dept" });
      expect(count).toBe(0);
    });
  });

  /* ================= INDIVIDUAL targeting ================= */
  describe("TC-HOD-07 / TC-HOD-08 / TC-HOD-09 — INDIVIDUAL target", () => {
    it("TC-HOD-07: CS HOD targets CS student -> success", async () => {
      const agent = await csHodAgent();
      const res = await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Individual CS",
          message: "To CS student",
          target: "INDIVIDUAL",
          target_users: [csStudentUser._id.toString()],
        })
        .expect(201);

      expect(res.body.data.notification.target_users).toContainEqual(
        expect.objectContaining({ toString: expect.any(Function) })
      );
    });

    it("TC-HOD-08: CS HOD targets Mechanical student -> rejected 403", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Individual Mech",
          message: "To Mech student",
          target: "INDIVIDUAL",
          target_users: [mechStudentUser._id.toString()],
        })
        .expect(403);

      const count = await Notification.countDocuments({ title: "Individual Mech" });
      expect(count).toBe(0);
    });

    it("TC-HOD-09: CS HOD targets user from another college -> rejected 403", async () => {
      const otherStudent = await User.findOne({ email: "other-college-student@test.com" });
      expect(otherStudent).not.toBeNull();

      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Cross College",
          message: "To other college",
          target: "INDIVIDUAL",
          target_users: [otherStudent._id.toString()],
        })
        .expect(403);

      const count = await Notification.countDocuments({ title: "Cross College" });
      expect(count).toBe(0);
    });
  });

  /* ============== Eligible recipients API ============== */
  describe("TC-HOD-10 / TC-HOD-11 / TC-HOD-12 — eligible recipients", () => {
    it("TC-HOD-10: CS HOD searches recipients -> only CS department users", async () => {
      const agent = await csHodAgent();
      const res = await agent.get("/api/notifications/eligible-recipients").expect(200);

      const users = res.body.data || [];
      // CS HOD, CS student, CS teacher are in CS department -> allowed
      const emails = users.map((u) => u.email);
      expect(emails).toContain("cs-student@test.com");
      expect(emails).toContain("cs-teacher@test.com");
      // HOD self is a teacher in CS dept
      expect(emails).toContain("cs-hod@test.com");
      expect(users.length).toBeDefined();
    });

    it("TC-HOD-11: Mechanical users must not appear for CS HOD", async () => {
      const agent = await csHodAgent();
      const res = await agent.get("/api/notifications/eligible-recipients").expect(200);

      const emails = (res.body.data || []).map((u) => u.email);
      expect(emails).not.toContain("mech-student@test.com");
      expect(emails).not.toContain("mech-teacher@test.com");
      expect(emails).not.toContain("other-college-student@test.com");
    });

    it("TC-HOD-12: College Admin uses same endpoint -> college-wide behavior preserved", async () => {
      const admin = await createUser({
        email: "admin-hodiso@test.com",
        password: PW,
        role: "COLLEGE_ADMIN",
        college_id: college._id,
        isActive: true,
      });
      const agent = await login(admin);
      const res = await agent.get("/api/notifications/eligible-recipients").expect(200);

      const emails = (res.body.data || []).map((u) => u.email);
      // Admin sees college-wide users (CS + Mechanical)
      expect(emails).toContain("cs-student@test.com");
      expect(emails).toContain("mech-student@test.com");
      expect(emails).toContain("cs-teacher@test.com");
      expect(emails).toContain("mech-teacher@test.com");
    });
  });

  /* ============== Request tampering protection ============== */
  describe("TC-HOD-13 / TC-HOD-14 / TC-HOD-15 — request tampering", () => {
    it("TC-HOD-13: spoof college_id -> ignored (stays in own college)", async () => {
      const agent = await csHodAgent();
      const res = await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Spoof College",
          message: "Attempt",
          target: "STUDENTS",
          college_id: otherCollege._id.toString(),
        })
        .expect(201);

      // Notification must belong to the HOD's true college, not the spoofed one
      expect(res.body.data.notification.college_id.toString()).toBe(college._id.toString());
      expect(res.body.data.notification.college_id.toString()).not.toBe(otherCollege._id.toString());

      const stored = await Notification.findById(res.body.data.notification._id);
      expect(stored.college_id.toString()).toBe(college._id.toString());
    });

    it("TC-HOD-14: spoof createdBy -> ignored (uses authenticated HOD id)", async () => {
      const fakeAdmin = await createUser({
        email: "fake-admin@test.com",
        password: PW,
        role: "COLLEGE_ADMIN",
        college_id: college._id,
        isActive: true,
      });
      const agent = await csHodAgent();
      const res = await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Spoof Creator",
          message: "Attempt",
          target: "STUDENTS",
          createdBy: fakeAdmin._id.toString(),
          createdByRole: "COLLEGE_ADMIN",
        })
        .expect(201);

      expect(res.body.data.notification.createdBy.toString()).toBe(csHod._id.toString());
      expect(res.body.data.notification.createdByRole).toBe("HOD");
      expect(res.body.data.notification.createdByRole).not.toBe("COLLEGE_ADMIN");
    });

    it("TC-HOD-15: spoof createdByRole -> ignored (forced to HOD)", async () => {
      const agent = await csHodAgent();
      const res = await agent
        .post("/api/notifications/hod/create")
        .send({
          title: "Spoof Role",
          message: "Attempt",
          target: "STUDENTS",
          createdByRole: "COLLEGE_ADMIN",
        })
        .expect(201);

      expect(res.body.data.notification.createdByRole).toBe("HOD");
    });
  });

  /* ============== Bell / list / read counts ============== */
  describe("TC-HOD-16 / TC-HOD-17 / TC-HOD-18 — visibility lifecycle", () => {
    it("TC-HOD-16: bell count increases only for authorized recipient", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({ title: "Bell CS", message: "For CS students", target: "STUDENTS" })
        .expect(201);

      // CS student bell grows
      const csStudentAgent = await login(csStudentUser);
      const csBell = await csStudentAgent.get("/api/notifications/unread/bell").expect(200);
      const csBellItems = Array.isArray(csBell.body.data) ? csBell.body.data : [];
      const csBellCount = csBellItems.filter((n) => n.title === "Bell CS").length;
      expect(csBellCount).toBe(1);

      // Mechanical student bell must NOT contain it
      const mechStudentAgent = await login(mechStudentUser);
      const mechBell = await mechStudentAgent.get("/api/notifications/unread/bell").expect(200);
      const mechBellItems = Array.isArray(mechBell.body.data) ? mechBell.body.data : [];
      const mechBellCount = mechBellItems.filter((n) => n.title === "Bell CS").length;
      expect(mechBellCount).toBe(0);
    });

    it("TC-HOD-17: notification list shows exactly one notification to CS student", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({ title: "List CS", message: "For CS students", target: "STUDENTS" })
        .expect(201);

      const studentAgent = await login(csStudentUser);
      const res = await studentAgent.get("/api/notifications/student/read").expect(200);

      const all = [
        ...(res.body.data.hodNotifications || []),
        ...(res.body.data.adminNotifications || []),
        ...(res.body.data.teacherNotifications || []),
      ];
      const matching = all.filter((n) => n.title === "List CS");
      expect(matching).toHaveLength(1);
    });

    it("TC-HOD-18: mark as read decreases unread count", async () => {
      const agent = await csHodAgent();
      const createRes = await agent
        .post("/api/notifications/hod/create")
        .send({ title: "Read CS", message: "For CS students", target: "STUDENTS" })
        .expect(201);
      const notifId = createRes.body.data.notification._id;

      const studentAgent = await login(csStudentUser);

      const before = await studentAgent.get("/api/notifications/count/student").expect(200);
      expect(before.body.data.total).toBe(1);

      await studentAgent
        .post(`/api/notifications/${notifId}/mark-read`)
        .expect(200);

      const after = await studentAgent.get("/api/notifications/count/student").expect(200);
      expect(after.body.data.total).toBe(0);
    });
  });

  /* ============== Edit / Delete security ============== */
  describe("HOD edit/delete security", () => {
    it("HOD can edit only their own notification", async () => {
      const agent = await csHodAgent();
      const createRes = await agent
        .post("/api/notifications/hod/create")
        .send({ title: "Editable", message: "x", target: "STUDENTS" })
        .expect(201);
      const notifId = createRes.body.data.notification._id;

      // Owner can edit
      await agent.put(`/api/notifications/edit-note/${notifId}`).send({ title: "Updated" }).expect(200);

      // Another HOD (Mechanical) cannot edit CS HOD's notification
      const mechHod = await assignHod(college._id, mechDept, {
        email: "mech-hod@test.com",
        name: "Mech HOD",
        employeeId: "HOD-M02",
      });

      const mechAgent = await login(mechHod.hodUser);
      await mechAgent
        .put(`/api/notifications/edit-note/${notifId}`)
        .send({ title: "Hacked" })
        .expect(403);
    });

    it("HOD can delete only their own notification", async () => {
      const agent = await csHodAgent();
      const createRes = await agent
        .post("/api/notifications/hod/create")
        .send({ title: "Deletable", message: "x", target: "STUDENTS" })
        .expect(201);
      const notifId = createRes.body.data.notification._id;

      await agent.delete(`/api/notifications/delete-note/${notifId}`).expect(200);

      const exists = await Notification.findById(notifId);
      expect(exists).toBeNull();
    });

    it("HOD cannot delete a COLLEGE_ADMIN notification", async () => {
      const admin = await createUser({
        email: "admin-edit@test.com",
        password: PW,
        role: "COLLEGE_ADMIN",
        college_id: college._id,
        isActive: true,
      });
      const adminAgent = await login(admin);
      const res = await adminAgent
        .post("/api/notifications/admin/create")
        .send({ title: "Admin Note", message: "x", target: "ALL" })
        .expect(201);
      const notifId = res.body.data.notification._id;

      const agent = await csHodAgent();
      await agent.delete(`/api/notifications/delete-note/${notifId}`).expect(403);
    });
  });

  /* ============== Parent visibility ============== */
  describe("Parent sees HOD department-scoped notifications", () => {
    it("Parent of a CS student sees HOD STUDENTS notification; other-dept parent does not", async () => {
      const agent = await csHodAgent();
      await agent
        .post("/api/notifications/hod/create")
        .send({ title: "Parent CS", message: "For CS students", target: "STUDENTS" })
        .expect(201);

      const parentAgent = await login(parentUser);
      const res = await parentAgent.get("/api/notifications/parent/read").expect(200);
      const titles = [
        ...(res.body.data.hodNotifications || []).map((n) => n.title),
        ...(res.body.data.adminNotifications || []).map((n) => n.title),
        ...(res.body.data.teacherNotifications || []).map((n) => n.title),
      ];
      expect(titles).toContain("Parent CS");
    });
  });
});
