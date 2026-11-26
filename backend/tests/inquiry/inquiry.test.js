const mongoose = require("mongoose");
const request = require("supertest");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const { createUser } = require("../helpers/factories");
const Inquiry = require("../../src/models/inquiry.model");
const emailService = require("../../src/services/email.service");
const app = require("../../app");

describe("Inquiry Feature (#584)", () => {
  let superAdminCookies;
  let superAdminUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Create Super Admin for protected endpoints
    superAdminUser = await createUser({
      email: "superadmin@example.com",
      password: "Password@123",
      role: "SUPER_ADMIN",
      isActive: true,
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "superadmin@example.com", password: "Password@123" });

    superAdminCookies = loginRes.headers["set-cookie"];
  });

  describe("POST /api/inquiries (Landing page contact form)", () => {
    it("validates required fields and returns 400 on missing or invalid data", async () => {
      // Missing first name
      const res1 = await request(app).post("/api/inquiries").send({
        lastName: "Doe",
        email: "john@example.com",
        institutionName: "Greenwood College",
        message: "We need an ERP for our institution.",
      });
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe("INVALID_FIRST_NAME");

      // Invalid email
      const res2 = await request(app).post("/api/inquiries").send({
        firstName: "John",
        lastName: "Doe",
        email: "not-an-email",
        institutionName: "Greenwood College",
        message: "We need an ERP for our institution.",
      });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe("INVALID_EMAIL");

      // Short message (< 10 chars)
      const res3 = await request(app).post("/api/inquiries").send({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        institutionName: "Greenwood College",
        message: "Hi",
      });
      expect(res3.status).toBe(400);
      expect(res3.body.error.code).toBe("INVALID_MESSAGE");
    });

    it("creates enquiry with sequential reference number (ENQ-YYYYMM-XXXX) and saves in DB", async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const expectedPrefix = `ENQ-${year}${month}-`;

      // 1st inquiry
      const res1 = await request(app).post("/api/inquiries").send({
        firstName: "Alice",
        lastName: "Smith",
        email: "alice@collegex.edu",
        phone: "+91 9876543210",
        institutionName: "College X Engineering",
        role: "principal",
        message: "Interested in admission & fee management modules.",
      });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.inquiryNumber).toBe(`${expectedPrefix}0001`);
      expect(res1.body.data.institutionName).toBe("College X Engineering");

      // Verify in DB
      const inq1 = await Inquiry.findOne({ inquiryNumber: `${expectedPrefix}0001` });
      expect(inq1).not.toBeNull();
      expect(inq1.status).toBe("NEW");
      expect(inq1.role).toBe("principal");

      // 2nd inquiry gets sequential number 0002
      const res2 = await request(app).post("/api/inquiries").send({
        firstName: "Bob",
        lastName: "Jones",
        email: "bob@citycollege.org",
        institutionName: "City College of Arts",
        role: "admin",
        message: "Looking for ERP pricing and custom demo session.",
      });

      expect(res2.status).toBe(201);
      expect(res2.body.data.inquiryNumber).toBe(`${expectedPrefix}0002`);

      // 3rd inquiry with HOD role
      const res3 = await request(app).post("/api/inquiries").send({
        firstName: "Pooja",
        lastName: "Sharma",
        email: "pooja@engineering.edu",
        institutionName: "State Engineering College",
        role: "hod",
        message: "Requesting demo for department level attendance and syllabus tracking.",
      });

      expect(res3.status).toBe(201);
      expect(res3.body.data.inquiryNumber).toBe(`${expectedPrefix}0003`);

      const inq3 = await Inquiry.findOne({ inquiryNumber: `${expectedPrefix}0003` });
      expect(inq3).not.toBeNull();
      expect(inq3.role).toBe("hod");
    });

    it("triggers both Super Admin alert and applicant acknowledgement emails (#586)", async () => {
      const adminAlertSpy = jest
        .spyOn(emailService, "sendSuperAdminInquiryAlert")
        .mockResolvedValueOnce({ success: true, messageId: "admin-msg-123" });
      const ackEmailSpy = jest
        .spyOn(emailService, "sendInquiryAcknowledgementEmail")
        .mockResolvedValueOnce({ success: true, messageId: "ack-msg-456" });

      const res = await request(app).post("/api/inquiries").send({
        firstName: "Dr. Ramesh",
        lastName: "Deshmukh",
        email: "ramesh@pune-inst.edu",
        phone: "+91 9876543210",
        institutionName: "Pune Technical Institute",
        role: "principal",
        message: "Need automated campus fee and attendance solution.",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      expect(adminAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          inquiry: expect.objectContaining({
            email: "ramesh@pune-inst.edu",
            institutionName: "Pune Technical Institute",
          }),
        })
      );

      expect(ackEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          inquiry: expect.objectContaining({
            email: "ramesh@pune-inst.edu",
            institutionName: "Pune Technical Institute",
          }),
        })
      );

      adminAlertSpy.mockRestore();
      ackEmailSpy.mockRestore();
    });
  });

  describe("Super Admin Dashboard & Inquiry Management", () => {
    beforeEach(async () => {
      // Seed inquiries sequentially so pre-save generates distinct sequence numbers
      const seedData = [
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@inst1.com",
          institutionName: "Institute 1",
          role: "principal",
          message: "Inquiry message 1 for testing.",
          status: "NEW",
        },
        {
          firstName: "Jane",
          lastName: "Roe",
          email: "jane@inst2.com",
          institutionName: "Institute 2",
          role: "admin",
          message: "Inquiry message 2 for testing.",
          status: "CONTACTED",
        },
        {
          firstName: "Sam",
          lastName: "Wilson",
          email: "sam@inst3.com",
          institutionName: "Institute 3",
          role: "trustee",
          message: "Inquiry message 3 for testing.",
          status: "CLOSED",
        },
      ];

      for (const item of seedData) {
        await Inquiry.create(item);
      }
    });

    it("GET /api/dashboard/super-admin includes totalInquiries, newInquiries, and recentInquiries", async () => {
      const res = await request(app)
        .get("/api/dashboard/super-admin")
        .set("Cookie", superAdminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.totalInquiries).toBe(3);
      expect(res.body.data.stats.newInquiries).toBe(1);
      expect(res.body.data.recentInquiries).toBeDefined();
      expect(res.body.data.recentInquiries.length).toBe(3);
    });

    it("GET /api/inquiries allows Super Admin to list, filter and paginate inquiries", async () => {
      // All inquiries
      const resAll = await request(app)
        .get("/api/inquiries")
        .set("Cookie", superAdminCookies);

      expect(resAll.status).toBe(200);
      expect(resAll.body.success).toBe(true);
      expect(resAll.body.data.length).toBe(3);
      expect(resAll.body.pagination.summary.totalAll).toBe(3);
      expect(resAll.body.pagination.summary.new).toBe(1);

      // Filter by status=NEW
      const resNew = await request(app)
        .get("/api/inquiries?status=NEW")
        .set("Cookie", superAdminCookies);

      expect(resNew.status).toBe(200);
      expect(resNew.body.data.length).toBe(1);
      expect(resNew.body.data[0].institutionName).toBe("Institute 1");

      // Search by institution name
      const resSearch = await request(app)
        .get("/api/inquiries?search=Institute 2")
        .set("Cookie", superAdminCookies);

      expect(resSearch.status).toBe(200);
      expect(resSearch.body.data.length).toBe(1);
      expect(resSearch.body.data[0].institutionName).toBe("Institute 2");
    });

    it("PATCH /api/inquiries/:id/status updates status correctly", async () => {
      const inq = await Inquiry.findOne({ status: "NEW" });
      expect(inq).not.toBeNull();

      const res = await request(app)
        .patch(`/api/inquiries/${inq._id}/status`)
        .set("Cookie", superAdminCookies)
        .send({ status: "CONTACTED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CONTACTED");

      const updated = await Inquiry.findById(inq._id);
      expect(updated.status).toBe("CONTACTED");
    });

    it("GET /api/inquiries/:id returns single inquiry details", async () => {
      const inq = await Inquiry.findOne({ institutionName: "Institute 1" });
      expect(inq).not.toBeNull();

      const res = await request(app)
        .get(`/api/inquiries/${inq._id}`)
        .set("Cookie", superAdminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.institutionName).toBe("Institute 1");
      expect(res.body.data.email).toBe("john@inst1.com");
    });

    it("GET /api/inquiries/:id returns 404 for non-existent inquiry", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/inquiries/${nonExistentId}`)
        .set("Cookie", superAdminCookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("INQUIRY_NOT_FOUND");
    });
  });
});
