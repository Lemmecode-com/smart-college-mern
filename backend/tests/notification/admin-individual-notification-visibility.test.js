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
} = require("../helpers/factories");
const app = require("../../app");

const Notification = require("../../src/models/notification.model");

/**
 * Regression suite for the College Admin "sender-echo" notification bug.
 *
 * Root cause under test: the COLLEGE_ADMIN / PRINCIPAL branch of
 * getNotificationVisibilityQuery matched on SENDER only
 * ({ createdByRole: "COLLEGE_ADMIN", createdBy: <self> }), never inspecting
 * `target` / `target_users`. An admin-authored, student-addressed
 * INDIVIDUAL notification (e.g. "Promotion Confirmed") was therefore echoed
 * back into the creating admin's Notification Center, unread bell and count.
 *
 * The fix narrows the branch so that an admin sees their own broadcasts plus
 * INDIVIDUAL notifications that actually address them.
 *
 * NOTE: this suite only writes to the guarded novaa-test database
 * (see tests/setup/testDb.js, which refuses to run outside novaa-test).
 */

const login = async (user) => {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: "Test@123" })
    .expect(200);
  return agent;
};

const collectAdminPayload = (body) => ({
  myNotifications: (body.data && body.data.myNotifications) || [],
  staffNotifications: (body.data && body.data.staffNotifications) || [],
});

const adminIds = (body) =>
  collectAdminPayload(body)
    .myNotifications.map((n) => n._id)
    .concat(collectAdminPayload(body).staffNotifications.map((n) => n._id));

const studentIds = (body) => {
  const d = body.data || {};
  return []
    .concat(d.adminNotifications || [], d.teacherNotifications || [], d.hodNotifications || [])
    .map((n) => n._id);
};

describe("NTF-ADM-IND — Admin visibility of INDIVIDUAL notifications", () => {
  let college;
  let department;
  let course;

  let admin;
  let otherAdmin;
  let principal;

  let adminAgent;
  let otherAdminAgent;
  let principalAgent;

  let studentUser;
  let student;
  let studentAgent;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    college = await createCollege({ code: "NADM", name: "Admin Individual Visibility College" });

    admin = await createUser({
      email: "admin.nadm@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
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

    otherAdmin = await createUser({
      email: "admin2.nadm@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    principal = await createUser({
      email: "principal.nadm@test.com",
      password: "Test@123",
      role: "PRINCIPAL",
      college_id: college._id,
      isActive: true,
    });

    studentUser = await createUser({
      email: "student.nadm@test.com",
      password: "Test@123",
      role: "STUDENT",
      college_id: college._id,
      isActive: true,
    });

    student = await createStudent({
      email: "student.nadm@test.com",
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 3,
      status: "APPROVED",
      user_id: studentUser._id,
    });

    adminAgent = await login(admin);
    otherAdminAgent = await login(otherAdmin);
    principalAgent = await login(principal);
    studentAgent = await login(studentUser);
  });

  /* ------------------------------------------------------------------ */
  /* Test 1 — Admin -> Student INDIVIDUAL must not echo back to admins    */
  /* ------------------------------------------------------------------ */
  describe("Test 1: Admin creates INDIVIDUAL notification targeted to a student", () => {
    let notificationId;

    beforeEach(async () => {
      const res = await adminAgent
        .post("/api/notifications/admin/create")
        .send({
          title: "Promotion Confirmed",
          message: "Congratulations Test Student! You have been promoted to 2nd Year.",
          type: "ACADEMIC",
          priority: "HIGH",
          target: "INDIVIDUAL",
          target_users: [studentUser._id.toString()],
        })
        .expect(201);

      notificationId = res.body.data.notification._id;
    });

    it("TC-1.1: creating admin does NOT see the student-targeted notification", async () => {
      const res = await adminAgent.get("/api/notifications/admin/read").expect(200);
      expect(adminIds(res.body)).not.toContain(notificationId);
    });

    it("TC-1.2: another College Admin does NOT see it", async () => {
      const res = await otherAdminAgent.get("/api/notifications/admin/read").expect(200);
      expect(adminIds(res.body)).not.toContain(notificationId);
    });

    it("TC-1.3: Principal does NOT see it", async () => {
      const res = await principalAgent.get("/api/notifications/admin/read").expect(200);
      expect(adminIds(res.body)).not.toContain(notificationId);
    });

    it("TC-1.4: the targeted student DOES see it", async () => {
      const res = await studentAgent.get("/api/notifications/student/read").expect(200);
      const ids = studentIds(res.body);
      expect(ids).toContain(notificationId);
      expect(ids.filter((id) => id === notificationId)).toHaveLength(1);
    });

    it("TC-1.5: stored recipient fields address the student, not the admin", async () => {
      const doc = await Notification.findById(notificationId).lean();
      expect(doc.target).toBe("INDIVIDUAL");
      expect(doc.target_users.map(String)).toEqual([studentUser._id.toString()]);
      expect(doc.target_users.map(String)).not.toContain(admin._id.toString());
      expect(doc.createdBy.toString()).toBe(admin._id.toString());
      expect(doc.createdByRole).toBe("COLLEGE_ADMIN");
    });
  });

  /* ------------------------------------------------------------------ */
  /* Test 2 — Admin -> Self INDIVIDUAL remains visible to that admin      */
  /* ------------------------------------------------------------------ */
  describe("Test 2: Admin creates INDIVIDUAL notification targeted to itself", () => {
    let notificationId;

    beforeEach(async () => {
      // The public admin-create endpoint intentionally restricts INDIVIDUAL
      // recipients to STUDENT/TEACHER/HOD/PARENT_GUARDIAN, so an
      // admin-addressed document is created directly against the model to
      // exercise the read filter itself.
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

    it("TC-2.1: the targeted admin DOES see it in My Notifications", async () => {
      const res = await adminAgent.get("/api/notifications/admin/read").expect(200);
      expect(collectAdminPayload(res.body).myNotifications.map((n) => n._id)).toContain(notificationId);
    });

    it("TC-2.2: an admin NOT in target_users does NOT see it", async () => {
      const res = await otherAdminAgent.get("/api/notifications/admin/read").expect(200);
      expect(adminIds(res.body)).not.toContain(notificationId);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Test 3 — Admin broadcasts keep working for every non-INDIVIDUAL target
   *
   * The admin OUTBOX (admin/read -> myNotifications) keeps every broadcast.
   * The admin INBOX (unread bell + count/admin) only keeps target=ALL,
   * because every other audience explicitly excludes the admin. See
   * tests/notification/fee-deadline-notification-visibility.test.js.
   * ------------------------------------------------------------------ */
  describe("Test 3: Admin-created broadcast notifications remain visible to the admin", () => {
    const cases = [
      { target: "ALL", extra: () => ({}) },
      { target: "STUDENTS", extra: () => ({}) },
      { target: "TEACHERS", extra: () => ({}) },
      { target: "DEPARTMENT", extra: (d) => ({ target_department: d._id.toString() }) },
      { target: "COURSE", extra: (c) => ({ target_course: c._id.toString() }) },
      { target: "SEMESTER", extra: () => ({ target_semester: 3 }) },
    ];

    cases.forEach(({ target, extra }, i) => {
      it(`TC-3.${i + 1}: target=${target} is still visible to the creating admin`, async () => {
        const extraFields =
          target === "DEPARTMENT" ? extra(department) : extra(course);

        const res = await adminAgent
          .post("/api/notifications/admin/create")
          .send({
            title: `Broadcast ${target}`,
            message: `Broadcast to ${target}.`,
            type: "GENERAL",
            target,
            ...extraFields,
          })
          .expect(201);

        const notificationId = res.body.data.notification._id;

        const listRes = await adminAgent.get("/api/notifications/admin/read").expect(200);
        expect(collectAdminPayload(listRes.body).myNotifications.map((n) => n._id)).toContain(notificationId);

        // Unread count is the admin INBOX. Only an ALL broadcast is also an
        // incoming notification for the admin; STUDENTS/TEACHERS/DEPARTMENT/
        // COURSE/SEMESTER audiences explicitly exclude the admin, so they must
        // not raise an unread badge for the person who sent them.
        const countRes = await adminAgent.get("/api/notifications/count/admin").expect(200);
        if (target === "ALL") {
          expect(countRes.body.data.myCount).toBeGreaterThanOrEqual(1);
        } else {
          expect(countRes.body.data.myCount).toBe(0);
        }
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Test 4 — Teacher-created notifications are untouched                  */
  /* ------------------------------------------------------------------ */
  describe("Test 4: Teacher-created notifications keep existing admin behavior", () => {
    it("TC-4.1: teacher-created notification is still visible to the admin as a staff notification", async () => {
      const teacherUser = await createUser({
        email: "teacher.nadm@test.com",
        password: "Test@123",
        role: "TEACHER",
        college_id: college._id,
        isActive: true,
      });

      await createTeacher({
        email: "teacher.nadm@test.com",
        college_id: college._id,
        department_id: department._id,
        user_id: teacherUser._id,
        status: "ACTIVE",
        createdBy: admin._id,
      });

      const teacherAgent = await login(teacherUser);

      const createRes = await teacherAgent
        .post("/api/notifications/teacher/create")
        .send({
          title: "Class Cancelled",
          message: "Today's class is cancelled.",
          type: "GENERAL",
          target: "STUDENTS",
        })
        .expect(201);

      const notificationId = createRes.body.data.notification._id;

      const adminRes = await adminAgent.get("/api/notifications/admin/read").expect(200);
      expect(collectAdminPayload(adminRes.body).staffNotifications.map((n) => n._id)).toContain(notificationId);

      const countRes = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(countRes.body.data.staffCount).toBeGreaterThanOrEqual(1);

      const bellRes = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      const bellIds = (bellRes.body.data || []).map((n) => n._id);
      expect(bellIds).toContain(notificationId);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Test 5 — the promoted student still receives "Promotion Confirmed"   */
  /* ------------------------------------------------------------------ */
  describe("Test 5: Promotion Confirmed notification is still visible to the promoted student", () => {
    it("TC-5.1: student sees the exact document shape produced by the promotion flow", async () => {
      // Mirrors backend/src/controllers/promotion.controller.js:126-137
      const doc = await Notification.create({
        college_id: college._id,
        createdBy: admin._id,
        createdByRole: "COLLEGE_ADMIN",
        target: "INDIVIDUAL",
        target_users: [studentUser._id],
        title: "\u{1F393} Promotion Confirmed",
        message:
          "Congratulations Test Student! You have been promoted to 2nd Year (Semester 3, 2025-2026) by Admin.",
        type: "ACADEMIC",
        priority: "HIGH",
        actionUrl: "/student/dashboard",
      });

      const res = await studentAgent.get("/api/notifications/student/read").expect(200);
      const d = res.body.data || {};

      const hits = (d.adminNotifications || []).filter((n) => n._id === doc._id.toString());
      expect(hits).toHaveLength(1);
      expect(hits[0].title).toBe("\u{1F393} Promotion Confirmed");
      expect(hits[0].message).toContain("promoted to 2nd Year");
      expect(hits[0].type).toBe("ACADEMIC");
      expect(hits[0].isRead).toBe(false);
    });

    it("TC-5.2: a non-promoted student does NOT see another student's promotion", async () => {
      const promotedDoc = await Notification.create({
        college_id: college._id,
        createdBy: admin._id,
        createdByRole: "COLLEGE_ADMIN",
        target: "INDIVIDUAL",
        target_users: [studentUser._id],
        title: "\u{1F393} Promotion Confirmed",
        message: "Congratulations Test Student! You have been promoted to 2nd Year.",
        type: "ACADEMIC",
        priority: "HIGH",
      });

      const otherStudentUser = await createUser({
        email: "student2.nadm@test.com",
        password: "Test@123",
        role: "STUDENT",
        college_id: college._id,
        isActive: true,
      });

      await createStudent({
        email: "student2.nadm@test.com",
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        currentSemester: 3,
        status: "APPROVED",
        user_id: otherStudentUser._id,
      });

      const otherAgent = await login(otherStudentUser);
      const res = await otherAgent.get("/api/notifications/student/read").expect(200);
      expect(studentIds(res.body)).not.toContain(promotedDoc._id.toString());
    });
  });

  /* ------------------------------------------------------------------ */
  /* Test 6 — admin count and unread bell are not inflated               */
  /* ------------------------------------------------------------------ */
  describe("Test 6: student-targeted promotion notification does not raise admin count/bell", () => {
    it("TC-6.1: count and bell stay at zero when only a student-targeted promotion exists", async () => {
      const beforeCount = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(beforeCount.body.data.total).toBe(0);

      const promotion = await Notification.create({
        college_id: college._id,
        createdBy: admin._id,
        createdByRole: "COLLEGE_ADMIN",
        target: "INDIVIDUAL",
        target_users: [studentUser._id],
        title: "\u{1F393} Promotion Confirmed",
        message: "Congratulations Test Student! You have been promoted to 2nd Year.",
        type: "ACADEMIC",
        priority: "HIGH",
        actionUrl: "/student/dashboard",
      });

      const afterCount = await adminAgent.get("/api/notifications/count/admin").expect(200);
      expect(afterCount.body.data.myCount).toBe(0);
      expect(afterCount.body.data.staffCount).toBe(0);
      expect(afterCount.body.data.total).toBe(0);

      const bellRes = await adminAgent.get("/api/notifications/unread/bell").expect(200);
      const bellIds = (bellRes.body.data || []).map((n) => n._id);
      expect(bellIds).not.toContain(promotion._id.toString());

      // ...and the student still counts it as unread.
      const studentCount = await studentAgent.get("/api/notifications/count/student").expect(200);
      expect(studentCount.body.data.total).toBe(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Cross-college isolation is preserved                                */
  /* ------------------------------------------------------------------ */
  it("TC-7.1: an admin in another college cannot see the notification", async () => {
    const otherCollege = await createCollege({
      code: "NADM2",
      name: "Other College",
      email: "othercollege.nadm@test.com",
    });
    const foreignAdmin = await createUser({
      email: "admin.nadm2@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: otherCollege._id,
      isActive: true,
    });
    const foreignAgent = await login(foreignAdmin);

    const created = await Notification.create({
      college_id: college._id,
      createdBy: admin._id,
      createdByRole: "COLLEGE_ADMIN",
      target: "INDIVIDUAL",
      target_users: [studentUser._id],
      title: "\u{1F393} Promotion Confirmed",
      message: "Congratulations Test Student! You have been promoted to 2nd Year.",
      type: "ACADEMIC",
      priority: "HIGH",
    });

    const res = await foreignAgent.get("/api/notifications/admin/read").expect(200);
    expect(adminIds(res.body)).not.toContain(created._id.toString());
  });
});
