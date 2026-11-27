const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const { createCollege, createUser } = require("../helpers/factories");
const app = require("../../app");
const Notification = require("../../src/models/notification.model");
const NotificationRead = require("../../src/models/notificationRead.model");
const emailService = require("../../src/services/email.service");

describe("Super Admin In-App Enquiry Notifications (#587)", () => {
  let college;
  let superAdmin1, superAdmin2, collegeAdmin;
  let superAdmin1Agent, superAdmin2Agent, collegeAdminAgent;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Create 2 independent Super Admins (no college_id)
    superAdmin1 = await createUser({
      role: "SUPER_ADMIN",
      email: "superadmin1@test.com",
      password: "Test@123",
    });

    superAdmin2 = await createUser({
      role: "SUPER_ADMIN",
      email: "superadmin2@test.com",
      password: "Test@123",
    });

    // Create College and College Admin (tenant scoped)
    college = await createCollege({ name: "Alpha Institute", code: "ALPHA" });
    collegeAdmin = await createUser({
      role: "COLLEGE_ADMIN",
      email: "admin@alpha.edu",
      password: "Test@123",
      college_id: college._id,
    });

    // Login agents
    superAdmin1Agent = request.agent(app);
    await superAdmin1Agent
      .post("/api/auth/login")
      .send({ email: "superadmin1@test.com", password: "Test@123" })
      .expect(200);

    superAdmin2Agent = request.agent(app);
    await superAdmin2Agent
      .post("/api/auth/login")
      .send({ email: "superadmin2@test.com", password: "Test@123" })
      .expect(200);

    collegeAdminAgent = request.agent(app);
    await collegeAdminAgent
      .post("/api/auth/login")
      .send({ email: "admin@alpha.edu", password: "Test@123" })
      .expect(200);
  });

  test("1. Submitting enquiry creates in-app notification targeting SUPER_ADMIN with type ENQUIRY and relatedInquiryId", async () => {
    const res = await request(app)
      .post("/api/inquiries")
      .send({
        firstName: "Rajesh",
        lastName: "Patil",
        email: "rajesh@newcollege.org",
        phone: "9876543210",
        institutionName: "New College of Technology",
        role: "principal",
        message: "We are interested in Smart College SaaS implementation.",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.inquiryNumber).toMatch(/^ENQ-\d{6}-\d{4}$/);

    // Allow non-blocking background async task to persist
    await new Promise((r) => setTimeout(r, 200));

    const notifications = await Notification.find({
      target: "SUPER_ADMIN",
    }).lean();

    expect(notifications.length).toBe(1);
    const notif = notifications[0];
    expect(notif.college_id).toBeNull();
    expect(notif.createdByRole).toBe("SYSTEM");
    expect(notif.createdBy).toBeNull();
    expect(notif.type).toBe("ENQUIRY");
    expect(notif.priority).toBe("HIGH");
    expect(notif.title).toBe("New College Enquiry");
    expect(notif.relatedInquiryId).toBeDefined();
    expect(notif.actionUrl).toMatch(/^\/super-admin\/enquiry\//);
    expect(notif.expiresAt).toBeNull();
  });

  test("2. Unique index prevents duplicate notifications on retry for same inquiry", async () => {
    const testInquiryId = new mongoose.Types.ObjectId();

    // First insertion succeeds
    await Notification.create({
      relatedInquiryId: testInquiryId,
      college_id: null,
      createdBy: null,
      createdByRole: "SYSTEM",
      target: "SUPER_ADMIN",
      title: "New College Enquiry",
      message: "First notification",
      type: "ENQUIRY",
    });

    // Second insertion with identical relatedInquiryId fails unique constraint
    let duplicateError = null;
    try {
      await Notification.create({
        relatedInquiryId: testInquiryId,
        college_id: null,
        createdBy: null,
        createdByRole: "SYSTEM",
        target: "SUPER_ADMIN",
        title: "Duplicate Enquiry",
        message: "Duplicate notification",
        type: "ENQUIRY",
      });
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000);

    // Verify only 1 document exists
    const count = await Notification.countDocuments({ relatedInquiryId: testInquiryId });
    expect(count).toBe(1);
  });

  test("3. Failure in notification creation does not break enquiry response or emails", async () => {
    const originalFindOneAndUpdate = Notification.findOneAndUpdate;
    const findOneAndUpdateSpy = jest.spyOn(Notification, "findOneAndUpdate").mockImplementationOnce(() => {
      throw new Error("Simulated database failure during notification creation");
    });

    const alertEmailSpy = jest.spyOn(emailService, "sendSuperAdminInquiryAlert");
    const ackEmailSpy = jest.spyOn(emailService, "sendInquiryAcknowledgementEmail");

    const res = await request(app)
      .post("/api/inquiries")
      .send({
        firstName: "Anil",
        lastName: "Sharma",
        email: "anil@somewhere.edu",
        institutionName: "Greenwood University",
        message: "Interested in admission module demo.",
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.inquiryNumber).toBeDefined();

    // Allow async email handlers to be invoked
    await new Promise((r) => setTimeout(r, 100));

    expect(findOneAndUpdateSpy).toHaveBeenCalled();
    expect(alertEmailSpy).toHaveBeenCalled();
    expect(ackEmailSpy).toHaveBeenCalled();

    Notification.findOneAndUpdate = originalFindOneAndUpdate;
    findOneAndUpdateSpy.mockRestore();
    alertEmailSpy.mockRestore();
    ackEmailSpy.mockRestore();
  });

  test("4. Two Super Admins maintain independent read states for single enquiry notification", async () => {
    const inquiryId = new mongoose.Types.ObjectId();
    const notif = await Notification.create({
      relatedInquiryId: inquiryId,
      college_id: null,
      createdBy: null,
      createdByRole: "SYSTEM",
      target: "SUPER_ADMIN",
      title: "New College Enquiry",
      message: "Sample enquiry message",
      type: "ENQUIRY",
      actionUrl: `/super-admin/enquiry/${inquiryId}`,
    });

    // Initially both Super Admins see unread count = 1
    const countRes1Before = await superAdmin1Agent.get("/api/notifications/count/super-admin").expect(200);
    const countRes2Before = await superAdmin2Agent.get("/api/notifications/count/super-admin").expect(200);
    expect(countRes1Before.body.data.total).toBe(1);
    expect(countRes2Before.body.data.total).toBe(1);

    // Super Admin 1 marks it as read
    await superAdmin1Agent
      .post(`/api/notifications/${notif._id}/mark-read`)
      .expect(200);

    // Super Admin 1 unread count is now 0; bell list is empty
    const countRes1After = await superAdmin1Agent.get("/api/notifications/count/super-admin").expect(200);
    const bellRes1 = await superAdmin1Agent.get("/api/notifications/unread/bell").expect(200);
    expect(countRes1After.body.data.total).toBe(0);
    expect(bellRes1.body.data.length).toBe(0);

    // Super Admin 2 unread count is STILL 1; bell list STILL contains the notification
    const countRes2After = await superAdmin2Agent.get("/api/notifications/count/super-admin").expect(200);
    const bellRes2 = await superAdmin2Agent.get("/api/notifications/unread/bell").expect(200);
    expect(countRes2After.body.data.total).toBe(1);
    expect(bellRes2.body.data.length).toBe(1);
    expect(bellRes2.body.data[0]._id.toString()).toBe(notif._id.toString());
  });

  test("5. Security & RBAC: College roles and unauthenticated requests get 403/401 on /count/super-admin", async () => {
    // Unauthenticated request -> 401
    await request(app)
      .get("/api/notifications/count/super-admin")
      .expect(401);

    // College Admin request -> 403 (FORBIDDEN_ROLE)
    const forbiddenRes = await collegeAdminAgent
      .get("/api/notifications/count/super-admin")
      .expect(403);

    expect(forbiddenRes.body.success).toBe(false);
  });

  test("6. Multi-Tenant College Isolation: Platform notifications NEVER appear in college-level queries", async () => {
    // Create platform enquiry notification
    const inquiryId = new mongoose.Types.ObjectId();
    const platformNotif = await Notification.create({
      relatedInquiryId: inquiryId,
      college_id: null,
      createdBy: null,
      createdByRole: "SYSTEM",
      target: "SUPER_ADMIN",
      title: "New College Enquiry",
      message: "Lead details",
      type: "ENQUIRY",
    });

    // College Admin checks count -> 0
    const collegeCount = await collegeAdminAgent.get("/api/notifications/count/admin").expect(200);
    expect(collegeCount.body.data.total).toBe(0);

    // College Admin checks unread bell -> empty
    const collegeBell = await collegeAdminAgent.get("/api/notifications/unread/bell").expect(200);
    expect(collegeBell.body.data.length).toBe(0);

    // College Admin checks management list -> empty
    const collegeList = await collegeAdminAgent.get("/api/notifications/admin/read").expect(200);
    expect(collegeList.body.data.myNotifications.length).toBe(0);
    expect(collegeList.body.data.staffNotifications.length).toBe(0);

    // College Admin attempts to mark platform notification as read -> 404 (isolated)
    await collegeAdminAgent
      .post(`/api/notifications/${platformNotif._id}/mark-read`)
      .expect(404);
  });

  test("7. Tenant Isolation: Super Admin never receives or counts tenant notifications (broadcast or individual)", async () => {
    // Create tenant broadcast notification
    await Notification.create({
      college_id: college._id,
      createdBy: collegeAdmin._id,
      createdByRole: "COLLEGE_ADMIN",
      target: "ALL",
      title: "College Broadcast",
      message: "Notice for Alpha Institute",
      type: "GENERAL",
    });

    // Create tenant individual notification (even if targeting superAdmin1 user ID within college)
    await Notification.create({
      college_id: college._id,
      createdBy: collegeAdmin._id,
      createdByRole: "COLLEGE_ADMIN",
      target: "INDIVIDUAL",
      target_users: [collegeAdmin._id, superAdmin1._id],
      title: "Individual Tenant Alert",
      message: "Personal notice",
      type: "URGENT",
    });

    // Super Admin checks count -> must be 0
    const countRes = await superAdmin1Agent.get("/api/notifications/count/super-admin").expect(200);
    expect(countRes.body.data.total).toBe(0);

    // Super Admin checks bell unread -> must be empty []
    const bellRes = await superAdmin1Agent.get("/api/notifications/unread/bell").expect(200);
    expect(bellRes.body.data).toEqual([]);

    // Super Admin calls mark-all-read -> must mark 0
    const markAllRes = await superAdmin1Agent.post("/api/notifications/mark-all-read").expect(200);
    expect(markAllRes.body.data.markedCount).toBe(0);
    expect(markAllRes.body.data.totalUnread).toBe(0);
  });
});
