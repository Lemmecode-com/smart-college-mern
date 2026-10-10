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
  createParentGuardian,
  createDepartment,
  createCourse,
} = require("../helpers/factories");
const app = require("../../app");

const Notification = require("../../src/models/notification.model");

/**
 * Regression suite for the P1 issue:
 *   "Fee Payment Deadline Extended" (an admin-authored, STUDENTS-targeted
 *   notice) was visible to the College Admin in the unread Bell and the unread
 *   Count, because the COLLEGE_ADMIN / PRINCIPAL branch of
 *   getNotificationVisibilityQuery matched on SENDER only and never checked
 *   whether the admin belonged to the notification's audience.
 *
 * The fix separates ADMIN OUTBOX (management view, unchanged) from ADMIN
 * INBOX (bell + unread count). The fee notice must reach the affected Student
 * and their respective linked Parent/Guardian, and must not appear as an
 * incoming notification for the admin, other admins, the principal, teachers,
 * HODs or any other college.
 *
 * NOTE: this suite only writes to the guarded novaa-test database
 * (see tests/setup/testDb.js, which refuses to run outside novaa-test).
 */

const PW = "Test@123";

const login = async (user) => {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: PW })
    .expect(200);
  return agent;
};

const bellIds = (body) => (body.data || []).map((n) => n._id);
const parentIds = (body) => {
  const d = body.data || {};
  return []
    .concat(d.adminNotifications || [], d.teacherNotifications || [], d.hodNotifications || [])
    .map((n) => n._id);
};
const studentIds = (body) => {
  const d = body.data || {};
  return []
    .concat(d.adminNotifications || [], d.teacherNotifications || [], d.hodNotifications || [])
    .map((n) => n._id);
};
const adminOwnIds = (body) => {
  const d = body.data || {};
  return []
    .concat(d.myNotifications || [], d.staffNotifications || [])
    .map((n) => n._id);
};
const adminCount = (body) => (body.data || {}).total;

describe("NTF-FEE-DEADLINE — student fee deadline audience isolation", () => {
  let college;
  let department;
  let course;

  // --- College A (the college that owns the notification) ---
  let admin;
  let otherAdmin;
  let principal;
  let teacherUser;
  let teacher;
  let hodUser;
  let hodTeacher;

  let studentAUser;
  let studentA;
  let parentAUser;
  let parentA;
  let parentASecondUser; // second guardian for the SAME student
  let parentASecond;

  let studentBUser;
  let studentB;
  let parentBUser;
  let parentB;

  // --- College B (tenant isolation) ---
  let otherCollege;
  let otherCollegeAdmin;
  let otherCollegeStudentUser;
  let otherCollegeStudent;
  let otherCollegeParentUser;
  let otherCollegeParent;

  let adminAgent;
  let otherAdminAgent;
  let principalAgent;
  let teacherAgent;
  let hodAgent;
  let studentAAgent;
  let parentAAgent;
  let parentASecondAgent;
  let studentBAgent;
  let parentBAgent;
  let otherCollegeAdminAgent;
  let otherCollegeStudentAgent;
  let otherCollegeParentAgent;

  const FEE_NOTICE = {
    title: "Fee Payment Deadline Extended",
    message:
      "Dear Students,\n\nThe deadline for semester fee payment has been extended to February 28, 2026.",
    type: "FEE",
    priority: "MEDIUM",
  };

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    college = await createCollege({
      code: "NFEE",
      name: "Fee Deadline College",
      email: "college.nfee@test.com",
    });

    admin = await createUser({
      email: "admin.nfee@test.com",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    otherAdmin = await createUser({
      email: "admin2.nfee@test.com",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    principal = await createUser({
      email: "principal.nfee@test.com",
      password: PW,
      role: "PRINCIPAL",
      college_id: college._id,
      isActive: true,
    });

    department = await createDepartment({
      college_id: college._id,
      name: "Computer Science",
      code: "CSE",
      createdBy: admin._id,
    });

    course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: "Bachelor of Technology",
      code: "BTC",
      durationSemesters: 8,
      createdBy: admin._id,
    });

    teacherUser = await createUser({
      email: "teacher.nfee@test.com",
      password: PW,
      role: "TEACHER",
      college_id: college._id,
      isActive: true,
    });
    teacher = await createTeacher({
      email: "teacher.nfee@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: teacherUser._id,
      status: "ACTIVE",
      createdBy: admin._id,
    });

    hodUser = await createUser({
      email: "hod.nfee@test.com",
      password: PW,
      role: "HOD",
      college_id: college._id,
      isActive: true,
    });
    hodTeacher = await createTeacher({
      email: "hod.nfee@test.com",
      college_id: college._id,
      department_id: department._id,
      user_id: hodUser._id,
      status: "ACTIVE",
      employeeId: "EMP-HOD",
      createdBy: admin._id,
    });

    /* ---------------- Student A + its guardians ---------------- */
    studentAUser = await createUser({
      email: "studenta.nfee@test.com",
      password: PW,
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });
    studentA = await createStudent({
      email: "studenta.nfee@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      status: "APPROVED",
      user_id: studentAUser._id,
    });

    parentAUser = await createUser({
      email: "parenta.nfee@test.com",
      password: PW,
      role: "PARENT_GUARDIAN",
      college_id: college._id,
      isActive: true,
    });
    parentA = await createParentGuardian({
      user_id: parentAUser._id,
      college_id: college._id,
      student_ids: [studentA._id],
      relation: "father",
    });

    // A second guardian account linked to the SAME student must also see it.
    parentASecondUser = await createUser({
      email: "parenta2.nfee@test.com",
      password: PW,
      role: "PARENT_GUARDIAN",
      college_id: college._id,
      isActive: true,
    });
    parentASecond = await createParentGuardian({
      user_id: parentASecondUser._id,
      college_id: college._id,
      student_ids: [studentA._id],
      relation: "mother",
    });

    /* ---------------- Student B + its own guardian ---------------- */
    studentBUser = await createUser({
      email: "studentb.nfee@test.com",
      password: PW,
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });
    studentB = await createStudent({
      email: "studentb.nfee@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 5,
      status: "APPROVED",
      user_id: studentBUser._id,
    });

    parentBUser = await createUser({
      email: "parentb.nfee@test.com",
      password: PW,
      role: "PARENT_GUARDIAN",
      college_id: college._id,
      isActive: true,
    });
    parentB = await createParentGuardian({
      user_id: parentBUser._id,
      college_id: college._id,
      student_ids: [studentB._id],
      relation: "father",
    });

    /* ---------------- College B (tenant isolation) ---------------- */
    otherCollege = await createCollege({
      code: "NFE2",
      name: "Other College",
      email: "college.nfe2@test.com",
    });

    otherCollegeAdmin = await createUser({
      email: "admin.nfe2@test.com",
      password: PW,
      role: "COLLEGE_ADMIN",
      college_id: otherCollege._id,
      isActive: true,
    });

    otherCollegeStudentUser = await createUser({
      email: "student.nfe2@test.com",
      password: PW,
      role: "STUDENT",
      college_id: otherCollege._id,
      isActive: true,
    });
    otherCollegeStudent = await createStudent({
      email: "student.nfe2@test.com",
      college_id: otherCollege._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      status: "APPROVED",
      user_id: otherCollegeStudentUser._id,
    });

    otherCollegeParentUser = await createUser({
      email: "parent.nfe2@test.com",
      password: PW,
      role: "PARENT_GUARDIAN",
      college_id: otherCollege._id,
      isActive: true,
    });
    otherCollegeParent = await createParentGuardian({
      user_id: otherCollegeParentUser._id,
      college_id: otherCollege._id,
      student_ids: [otherCollegeStudent._id],
      relation: "father",
    });

    /* ---------------- Agents ---------------- */
    adminAgent = await login(admin);
    otherAdminAgent = await login(otherAdmin);
    principalAgent = await login(principal);
    teacherAgent = await login(teacherUser);
    hodAgent = await login(hodUser);
    studentAAgent = await login(studentAUser);
    parentAAgent = await login(parentAUser);
    parentASecondAgent = await login(parentASecondUser);
    studentBAgent = await login(studentBUser);
    parentBAgent = await login(parentBUser);
    otherCollegeAdminAgent = await login(otherCollegeAdmin);
    otherCollegeStudentAgent = await login(otherCollegeStudentUser);
    otherCollegeParentAgent = await login(otherCollegeParentUser);
  });

  /* ================================================================== */
  /* Group 1 — the admin-authored, STUDENTS-targeted fee deadline notice */
  /* ================================================================== */
  describe("Group 1: target=STUDENTS fee deadline notice", () => {
    let notificationId;

    beforeEach(async () => {
      const res = await adminAgent
        .post("/api/notifications/admin/create")
        .send({ ...FEE_NOTICE, target: "STUDENTS" })
        .expect(201);

      notificationId = res.body.data.notification._id;
    });

    it("TC-1.1: the notice is stored with a student-only audience and no target_users", async () => {
      const doc = await Notification.findById(notificationId).lean();
      expect(doc.target).toBe("STUDENTS");
      expect(doc.target_users).toEqual([]);
      expect(doc.createdBy.toString()).toBe(admin._id.toString());
      expect(doc.createdByRole).toBe("COLLEGE_ADMIN");
      expect(doc.college_id.toString()).toBe(college._id.toString());
    });

    it("TC-1.2: the affected Student receives it", async () => {
      const res = await studentAAgent.get("/api/notifications/student/read").expect(200);
      expect(studentIds(res.body)).toContain(notificationId);
    });

    it("TC-1.3: the respective Parent/Guardian receives it", async () => {
      const res = await parentAAgent.get("/api/notifications/parent/read").expect(200);
      expect(parentIds(res.body)).toContain(notificationId);
    });

    it("TC-1.4: a second guardian linked to the same student also receives it", async () => {
      const res = await parentASecondAgent.get("/api/notifications/parent/read").expect(200);
      expect(parentIds(res.body)).toContain(notificationId);
    });

    it("TC-1.5: a Parent/Guardian with no linked student receives nothing", async () => {
      const orphanParentUser = await createUser({
        email: "parent.orphan@test.com",
        password: PW,
        role: "PARENT_GUARDIAN",
        college_id: college._id,
        isActive: true,
      });
      await createParentGuardian({
        user_id: orphanParentUser._id,
        college_id: college._id,
        student_ids: [],
        relation: "guardian",
      });
      const agent = await login(orphanParentUser);

      const res = await agent.get("/api/notifications/parent/read").expect(200);
      expect(parentIds(res.body)).not.toContain(notificationId);
    });

    it("TC-1.6: the authoring Admin does NOT see the student fee notice in My Notifications", async () => {
      const res = await adminAgent.get("/api/notifications/admin/read").expect(200);
      expect(res.body.data.myNotifications.map((n) => n._id)).not.toContain(notificationId);
    });

    it("TC-1.7: the authoring Admin does NOT see it in the Bell", async () => {
      const res = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(res.body)).not.toContain(notificationId);
    });

    it("TC-1.8: the authoring Admin does NOT count it as unread", async () => {
      const res = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(res.body.data.myCount).toBe(0);
    });

    it("TC-1.9: it stays editable/deletable through the admin management view", async () => {
      const editRes = await adminAgent
        .put(`/api/notifications/edit-note/${notificationId}`)
        .send({ message: "Updated fee deadline notice." })
        .expect(200);
      expect(editRes.body.data.notification.message).toBe(
        "Updated fee deadline notice.",
      );
    });

    it("TC-1.10: another College Admin in the same college sees nothing", async () => {
      const bell = await otherAdminAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(bell.body)).not.toContain(notificationId);

      const count = await otherAdminAgent.get("/api/notifications/count/admin").expect(200);
      expect(adminCount(count.body)).toBe(0);

      const list = await otherAdminAgent.get("/api/notifications/admin/read").expect(200);
      expect(adminOwnIds(list.body)).not.toContain(notificationId);
    });

    it("TC-1.11: the Principal sees nothing in bell/count", async () => {
      const bell = await principalAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(bell.body)).not.toContain(notificationId);

      const count = await principalAgent.get("/api/notifications/count/admin").expect(200);
      expect(adminCount(count.body)).toBe(0);
    });

    it("TC-1.12: the outbox owner can still open it (management view is preserved)", async () => {
      // The single-notification API backs the admin's own "View" action on the
      // outbox, so it keeps management/outbox semantics. This is not an inbox
      // surface, so the student-only audience does not block the author.
      const res = await adminAgent.get(`/api/notifications/${notificationId}`).expect(200);
      expect(res.body.notification._id).toBe(notificationId);
    });

    it("TC-1.12b: the Principal cannot open it by direct id", async () => {
      const res = await principalAgent.get(`/api/notifications/${notificationId}`).expect(404);
      expect(res.body.message).toBe("Notification not found");
    });

    it("TC-1.13: a Teacher does not receive it", async () => {
      const res = await teacherAgent.get("/api/notifications/teacher/read").expect(200);
      const d = res.body.data || {};
      const ids = []
        .concat(d.myNotifications || [], d.adminNotifications || [], d.hodNotifications || [])
        .map((n) => n._id);
      expect(ids).not.toContain(notificationId);
    });

    it("TC-1.14: an HOD does not receive it", async () => {
      const res = await hodAgent.get("/api/notifications/hod/read").expect(200);
      const d = res.body.data || {};
      const ids = []
        .concat(d.myNotifications || [], d.adminNotifications || [], d.teacherNotifications || [])
        .map((n) => n._id);
      expect(ids).not.toContain(notificationId);
    });

    it("TC-1.15: cross-college isolation — College B sees nothing", async () => {
      const adminBell = await otherCollegeAdminAgent
        .get("/api/notifications/unread/bell")
        .expect(200);
      expect(bellIds(adminBell.body)).not.toContain(notificationId);

      const adminList = await otherCollegeAdminAgent
        .get("/api/notifications/admin/read")
        .expect(200);
      expect(adminOwnIds(adminList.body)).not.toContain(notificationId);

      const studentRes = await otherCollegeStudentAgent
        .get("/api/notifications/student/read")
        .expect(200);
      expect(studentIds(studentRes.body)).not.toContain(notificationId);

      const parentRes = await otherCollegeParentAgent
        .get("/api/notifications/parent/read")
        .expect(200);
      expect(parentIds(parentRes.body)).not.toContain(notificationId);
    });

    it("TC-1.16: the notice stays reachable for its real recipients via the detail API", async () => {
      await studentAAgent.get(`/api/notifications/${notificationId}`).expect(200);
      await parentAAgent.get(`/api/notifications/${notificationId}`).expect(200);
    });
  });

  /* ================================================================== */
  /* Group 2 — target=ALL must still reach the Admin inbox               */
  /* ================================================================== */
  describe("Group 2: target=ALL college-wide announcement", () => {
    let notificationId;

    beforeEach(async () => {
      const res = await adminAgent
        .post("/api/notifications/admin/create")
        .send({
          title: "College Holiday Announcement",
          message: "The college will remain closed on Monday.",
          type: "GENERAL",
          target: "ALL",
        })
        .expect(201);

      notificationId = res.body.data.notification._id;
    });

    it("TC-2.1: the Admin Bell shows it", async () => {
      const res = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(res.body)).toContain(notificationId);
    });

    it("TC-2.2: the Admin unread count includes it", async () => {
      const res = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(res.body.data.myCount).toBe(1);
    });

    it("TC-2.3: Students and their parents still receive it", async () => {
      const s = await studentAAgent.get("/api/notifications/student/read").expect(200);
      expect(studentIds(s.body)).toContain(notificationId);

      const p = await parentAAgent.get("/api/notifications/parent/read").expect(200);
      expect(parentIds(p.body)).toContain(notificationId);
    });

    it("TC-2.4: it also remains in the admin outbox", async () => {
      const res = await adminAgent.get("/api/notifications/admin/read").expect(200);
      expect(res.body.data.myNotifications.map((n) => n._id)).toContain(notificationId);
    });
  });

  /* ================================================================== */
  /* Group 3 — INDIVIDUAL addressed to the Admin must reach the inbox    */
  /* ================================================================== */
  describe("Group 3: target=INDIVIDUAL addressed to the Admin", () => {
    let notificationId;

    beforeEach(async () => {
      // The public admin-create endpoint whitelists STUDENT/TEACHER/HOD/
      // PARENT_GUARDIAN as INDIVIDUAL recipients, so an admin-addressed
      // document is created directly against the model.
      const doc = await Notification.create({
        college_id: college._id,
        createdBy: admin._id,
        createdByRole: "COLLEGE_ADMIN",
        target: "INDIVIDUAL",
        target_users: [admin._id],
        title: "Admin Personal Reminder",
        message: "A note addressed to yourself.",
        type: "GENERAL",
        priority: "NORMAL",
      });
      notificationId = doc._id.toString();
    });

    it("TC-3.1: the Admin Bell shows it", async () => {
      const res = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(res.body)).toContain(notificationId);
    });

    it("TC-3.2: the Admin unread count includes it", async () => {
      const res = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(res.body.data.myCount).toBe(1);
    });

    it("TC-3.3: an admin NOT in target_users sees nothing", async () => {
      const bell = await otherAdminAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(bell.body)).not.toContain(notificationId);

      const count = await otherAdminAgent.get("/api/notifications/count/admin").expect(200);
      expect(adminCount(count.body)).toBe(0);
    });
  });

  /* ================================================================== */
  /* Group 4 — no other admin-only audience leaks into the Admin inbox   */
  /* ================================================================== */
  describe("Group 4: other admin-only audiences never enter the Admin inbox", () => {
    const audiences = [
      { target: "TEACHERS", extra: () => ({}) },
      { target: "HOD", extra: () => ({}) },
      { target: "PARENTS", extra: () => ({}) },
      { target: "DEPARTMENT", extra: () => ({ target_department: department._id.toString() }) },
      { target: "COURSE", extra: () => ({ target_course: course._id.toString() }) },
      { target: "SEMESTER", extra: () => ({ target_semester: 3 }) },
    ];

    audiences.forEach(({ target, extra }, i) => {
      it(`TC-4.${i + 1}: target=${target} is in the outbox but not the bell/count`, async () => {
        const res = await adminAgent
          .post("/api/notifications/admin/create")
          .send({
            title: `Scoped ${target}`,
            message: `Scoped to ${target}.`,
            type: "GENERAL",
            target,
            ...extra(),
          })
          .expect(201);

        const notificationId = res.body.data.notification._id;

        const listRes = await adminAgent.get("/api/notifications/admin/read").expect(200);
        expect(listRes.body.data.myNotifications.map((n) => n._id)).not.toContain(notificationId);

        const bellRes = await adminAgent.get("/api/notifications/unread/bell").expect(200);
        expect(bellIds(bellRes.body)).not.toContain(notificationId);

        const countRes = await adminAgent.get("/api/notifications/count/admin").expect(200);
        expect(countRes.body.data.myCount).toBe(0);
      });
    });
  });

  /* ================================================================== */
  /* Group 5 — expired notices must not linger in the Admin inbox        */
  /* ================================================================== */
  describe("Group 5: expiry handling in the Admin bell/count", () => {
    it("TC-5.1: an expired STUDENTS notice is excluded from bell and count", async () => {
      const doc = await Notification.create({
        college_id: college._id,
        createdBy: admin._id,
        createdByRole: "COLLEGE_ADMIN",
        target: "STUDENTS",
        title: "Expired Fee Notice",
        message: "This notice has already expired.",
        type: "FEE",
        priority: "MEDIUM",
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });
      const notificationId = doc._id.toString();

      const bell = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(bell.body)).not.toContain(notificationId);

      const count = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(count.body.data.myCount).toBe(0);

      // The student must not see it either.
      const s = await studentAAgent.get("/api/notifications/student/read").expect(200);
      expect(studentIds(s.body)).not.toContain(notificationId);

      // The management/outbox view intentionally keeps its previous behaviour.
      const list = await adminAgent.get("/api/notifications/admin/read").expect(200);
      expect(list.body.data.myNotifications.map((n) => n._id)).not.toContain(notificationId);
    });

    it("TC-5.2: an expired ALL notice is excluded from the admin bell and count", async () => {
      await Notification.create({
        college_id: college._id,
        createdBy: admin._id,
        createdByRole: "COLLEGE_ADMIN",
        target: "ALL",
        title: "Expired College Notice",
        message: "This notice has already expired.",
        type: "GENERAL",
        priority: "NORMAL",
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });

      const bell = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      expect(bellIds(bell.body)).toHaveLength(0);

      const count = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(adminCount(count.body)).toBe(0);
    });
  });

  /* ================================================================== */
  /* Group 6 — no duplicate notifications for one submission            */
  /* ================================================================== */
  describe("Group 6: creation count", () => {
    it("TC-6.1: one admin submission creates exactly one notification", async () => {
      const before = await Notification.countDocuments();
      await adminAgent
        .post("/api/notifications/admin/create")
        .send({ ...FEE_NOTICE, target: "STUDENTS" })
        .expect(201);
      const after = await Notification.countDocuments();

      expect(after - before).toBe(1);
    });

    it("TC-6.2: the fee notice is never echoed to the admin in any admin surface", async () => {
      const res = await adminAgent
        .post("/api/notifications/admin/create")
        .send({ ...FEE_NOTICE, target: "STUDENTS" })
        .expect(201);
      const notificationId = res.body.data.notification._id;

      const bell = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      const count = await adminAgent.get("/api/notifications/count/admin").expect(200);
      const list = await adminAgent.get("/api/notifications/admin/read").expect(200);

      expect(bellIds(bell.body)).not.toContain(notificationId);
      expect(count.body.data.myCount).toBe(0);
      expect(
        (list.body.data.myNotifications || []).map((n) => n._id),
      ).not.toContain(notificationId);
      expect(mongoose.isValidObjectId(notificationId)).toBe(true);
    });
  });
});
