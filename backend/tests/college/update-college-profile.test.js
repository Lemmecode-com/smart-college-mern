const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser } = require("../helpers/factories");
const app = require("../../app");
const College = require("../../src/models/college.model");

describe("College Admin - Save Profile Edits (DASH-07)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("updates college profile and reflects changes on re-fetch", async () => {
    const college = await createCollege({
      code: "DASH07",
      name: "Original College",
      email: "original@test.com",
      contactNumber: "9999999999",
      address: "Original Address",
      establishedYear: 2010,
    });

    const admin = await createUser({
      email: "admin.dash07@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const getBefore = await agent
      .get("/api/college/my-college")
      .expect(200);

    expect(getBefore.body.name).toBe("Original College");
    expect(getBefore.body.email).toBe("original@test.com");

    const updateRes = await agent
      .put("/api/college/edit/my-college")
      .send({
        name: "Updated College",
        code: college.code,
        contactNumber: "8888888888",
        address: "Updated Address",
        establishedYear: 2015,
      })
      .expect(200);

    expect(updateRes.body).toBeDefined();
    expect(updateRes.body.message).toBe("College profile updated successfully");

    const updatedCollege = await College.findById(college._id);
    expect(updatedCollege.name).toBe("Updated College");
    expect(updatedCollege.email).toBe("original@test.com");
    expect(updatedCollege.contactNumber).toBe("8888888888");
    expect(updatedCollege.address).toBe("Updated Address");
    expect(updatedCollege.establishedYear).toBe(2015);

    const getAfter = await agent
      .get("/api/college/my-college")
      .expect(200);

    expect(getAfter.body.name).toBe("Updated College");
    expect(getAfter.body.email).toBe("original@test.com");
    expect(getAfter.body.contactNumber).toBe("8888888888");
    expect(getAfter.body.address).toBe("Updated Address");
    expect(getAfter.body.establishedYear).toBe(2015);
  });

  it("should block direct email update via profile edit (bypass protection)", async () => {
    const college = await createCollege({
      code: "DASH08",
      name: "Bypass College",
      email: "bypass@test.com",
      contactNumber: "9999999999",
      address: "Bypass Address",
      establishedYear: 2010,
    });

    const admin = await createUser({
      email: "admin.dash08@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .put("/api/college/edit/my-college")
      .send({
        email: "hacker@example.com",
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("COLLEGE_EMAIL_CHANGE_NOT_ALLOWED");

    // College.email must remain unchanged
    const unchangedCollege = await College.findById(college._id);
    expect(unchangedCollege.email).toBe("bypass@test.com");
  });

  it("should block email update even when combined with other field updates", async () => {
    const college = await createCollege({
      code: "DASH09",
      name: "Mixed College",
      email: "mixed@test.com",
      contactNumber: "9999999999",
      address: "Mixed Address",
      establishedYear: 2012,
    });

    const admin = await createUser({
      email: "admin.dash09@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .put("/api/college/edit/my-college")
      .field("name", "Updated Name")
      .field("email", "sneakymail@example.com")
      .field("contactNumber", "8888888888")
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("COLLEGE_EMAIL_CHANGE_NOT_ALLOWED");

    // No fields should have been updated
    const unchangedCollege = await College.findById(college._id);
    expect(unchangedCollege.email).toBe("mixed@test.com");
    expect(unchangedCollege.name).toBe("Mixed College");
    expect(unchangedCollege.contactNumber).toBe("9999999999");
  });
});
