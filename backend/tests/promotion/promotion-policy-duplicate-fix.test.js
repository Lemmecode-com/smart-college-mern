const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const PromotionPolicy = require("../../src/models/promotionPolicy.model");
const {
  getPromotionPolicy,
  updatePromotionPolicy,
} = require("../../src/controllers/promotionPolicy.controller");
const { createCourse } = require("../helpers/factories");
const { resolvePromotionPolicy } = require("../../src/services/promotionDecision.service");
const errorHandler = require("../../src/middlewares/error.middleware");

describe("Promotion policy - duplicate college fix & tenant-scoped create/update", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const newId = () => new mongoose.Types.ObjectId();

  const seedCourse = async (collegeId, name = "Test Course") =>
    createCourse({
      college_id: collegeId,
      department_id: newId(),
      name,
      code: `TC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      durationSemesters: 6,
    });

  const invokeGet = async (query = {}, collegeId) => {
    const req = { query, body: {}, college_id: collegeId };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    await getPromotionPolicy(req, res, next);
    return { res, next };
  };

  const invokeUpdate = async (body, collegeId) => {
    const req = { body, query: {}, college_id: collegeId };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    await updatePromotionPolicy(req, res, next);
    return { res, next };
  };

  // 1. Create promotion policy when none exists
  it("1. creates a new promotion policy when none exists for the college", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    const { res, next } = await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 80,
        maxAllowedKTs: 2,
        minimumFeePaidPercentage: 60,
      },
      collegeId
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const created = await PromotionPolicy.findOne({ collegeId, isActive: true });
    expect(created).not.toBeNull();
    expect(created.minAttendancePercentage).toBe(80);
    expect(created.maxAllowedKTs).toBe(2);
    expect(created.minimumFeePaidPercentage).toBe(60);
  });

  // 2. Get existing promotion policy
  it("2. gets the existing promotion policy for the college", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    await PromotionPolicy.create({
      collegeId,
      course_id: course._id,
      minAttendancePercentage: 85,
      maxAllowedKTs: 1,
      minimumFeePaidPercentage: 75,
      isActive: true,
    });

    // When querying without course_id or with course_id
    const { res: resWithCourse } = await invokeGet({ course_id: String(course._id) }, collegeId);
    expect(resWithCourse.json).toHaveBeenCalled();
    const payloadWithCourse = resWithCourse.json.mock.calls[0][0];
    expect(payloadWithCourse.data.minAttendancePercentage).toBe(85);

    const { res: resWithoutCourse } = await invokeGet({}, collegeId);
    expect(resWithoutCourse.json).toHaveBeenCalled();
    const payloadWithoutCourse = resWithoutCourse.json.mock.calls[0][0];
    expect(payloadWithoutCourse.data.minAttendancePercentage).toBe(85);
  });

  // 3. Update existing promotion policy successfully
  it("3. updates existing promotion policy successfully", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    const initial = await PromotionPolicy.create({
      collegeId,
      course_id: course._id,
      minAttendancePercentage: 75,
      maxAllowedKTs: 3,
      minimumFeePaidPercentage: 50,
      isActive: true,
    });

    const { res, next } = await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 82,
        maxAllowedKTs: 1,
        minimumFeePaidPercentage: 90,
      },
      collegeId
    );

    expect(next).not.toHaveBeenCalled();
    const updated = await PromotionPolicy.findById(initial._id);
    expect(updated.minAttendancePercentage).toBe(82);
    expect(updated.maxAllowedKTs).toBe(1);
    expect(updated.minimumFeePaidPercentage).toBe(90);
  });

  // 4. Saving existing policy does NOT create duplicate document
  it("4. saving an existing policy does NOT create a duplicate document", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    const initial = await PromotionPolicy.create({
      collegeId,
      course_id: course._id,
      minAttendancePercentage: 75,
      isActive: true,
    });

    await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 88,
      },
      collegeId
    );

    const count = await PromotionPolicy.countDocuments({ collegeId });
    expect(count).toBe(1);
  });

  // 5. Repeated Save Changes works
  it("5. repeated Save Changes calls succeed without duplicate key errors", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    // Save 1 (create)
    await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 75,
      },
      collegeId
    );

    // Save 2 (repeat without change)
    const { res: res2, next: next2 } = await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 75,
      },
      collegeId
    );
    expect(next2).not.toHaveBeenCalled();
    expect(res2.status).toHaveBeenCalledWith(200);

    // Save 3 (repeat with change)
    const { res: res3, next: next3 } = await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 80,
      },
      collegeId
    );
    expect(next3).not.toHaveBeenCalled();
    expect(res3.status).toHaveBeenCalledWith(200);

    const count = await PromotionPolicy.countDocuments({ collegeId });
    expect(count).toBe(1);
  });

  // 6. Existing policy ID is preserved
  it("6. preserves the existing policy document _id upon update", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    const policy = await PromotionPolicy.create({
      collegeId,
      course_id: course._id,
      minAttendancePercentage: 75,
      isActive: true,
    });
    const originalId = policy._id.toString();

    await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 85,
      },
      collegeId
    );

    const current = await PromotionPolicy.findOne({ collegeId, isActive: true });
    expect(current._id.toString()).toBe(originalId);
  });

  // 7. Only one policy exists per college when updating across courses
  it("7. maintains exactly one policy per college when updating across different course selections", async () => {
    const collegeId = newId();
    const courseA = await seedCourse(collegeId, "Course A");
    const courseB = await seedCourse(collegeId, "Course B");

    // Initially saved with course A
    const initial = await PromotionPolicy.create({
      collegeId,
      course_id: courseA._id,
      minAttendancePercentage: 75,
      isActive: true,
    });
    expect(await PromotionPolicy.countDocuments({ collegeId })).toBe(1);

    // Admin selects Course B in UI and clicks Save Changes
    const { res, next } = await invokeUpdate(
      {
        course_id: String(courseB._id),
        minAttendancePercentage: 80,
        maxAllowedKTs: 2,
      },
      collegeId
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);

    // Document count MUST remain 1
    const countAfter = await PromotionPolicy.countDocuments({ collegeId });
    expect(countAfter).toBe(1);

    const updated = await PromotionPolicy.findOne({ collegeId });
    expect(updated._id.toString()).toBe(initial._id.toString());
    expect(updated.minAttendancePercentage).toBe(80);
    expect(updated.maxAllowedKTs).toBe(2);
  });

  // 8. Different colleges can each have their own policy
  it("8. allows different colleges to each have their own policy without conflict", async () => {
    const college1 = newId();
    const college2 = newId();

    const course1 = await seedCourse(college1);
    const course2 = await seedCourse(college2);

    await invokeUpdate(
      {
        course_id: String(course1._id),
        minAttendancePercentage: 75,
      },
      college1
    );

    await invokeUpdate(
      {
        course_id: String(course2._id),
        minAttendancePercentage: 85,
      },
      college2
    );

    const p1 = await PromotionPolicy.findOne({ collegeId: college1 });
    const p2 = await PromotionPolicy.findOne({ collegeId: college2 });

    expect(p1).not.toBeNull();
    expect(p2).not.toBeNull();
    expect(p1.minAttendancePercentage).toBe(75);
    expect(p2.minAttendancePercentage).toBe(85);
  });

  // 9. College A cannot update College B's policy
  it("9. prevents College A from updating College B's policy", async () => {
    const collegeA = newId();
    const collegeB = newId();

    const courseB = await seedCourse(collegeB);
    const policyB = await PromotionPolicy.create({
      collegeId: collegeB,
      course_id: courseB._id,
      minAttendancePercentage: 75,
      isActive: true,
    });

    // College A attempts to update using courseB's id
    const { next } = await invokeUpdate(
      {
        course_id: String(courseB._id),
        minAttendancePercentage: 50,
      },
      collegeA
    );

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].code).toBe("COURSE_NOT_FOUND");

    const unchangedB = await PromotionPolicy.findById(policyB._id);
    expect(unchangedB.minAttendancePercentage).toBe(75);
  });

  // 10. Invalid/unauthorized tenant access is rejected
  it("10. rejects update when course does not belong to the authenticated college", async () => {
    const collegeId = newId();
    const otherCollege = newId();
    const courseFromOther = await seedCourse(otherCollege);

    const { next } = await invokeUpdate(
      {
        course_id: String(courseFromOther._id),
        minAttendancePercentage: 80,
      },
      collegeId
    );

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("COURSE_NOT_FOUND");
  });

  // 11. Duplicate-key error is still correctly handled when a genuine duplicate insert occurs
  it("11. formats genuine duplicate key error as 409 DUPLICATE_FIELD in error middleware", () => {
    const mongoDupError = new Error("E11000 duplicate key error collection: NOVAA.promotionpolicies index: collegeId_1 dup key: { collegeId: ObjectId('6ab35f3d3da08048c9ae79ff') }");
    mongoDupError.code = 11000;
    mongoDupError.keyValue = { collegeId: new mongoose.Types.ObjectId() };

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    errorHandler(mongoDupError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "DUPLICATE_FIELD",
          message: "collegeId already exists",
        }),
      })
    );
  });

  // 12. Promotion decision engine still reads the correct policy after update
  it("12. promotion decision engine resolves the updated policy", async () => {
    const collegeId = newId();
    const course = await seedCourse(collegeId);

    await invokeUpdate(
      {
        course_id: String(course._id),
        minAttendancePercentage: 88,
        maxAllowedKTs: 4,
        minimumFeePaidPercentage: 65,
      },
      collegeId
    );

    const resolved = await resolvePromotionPolicy(collegeId, course._id);
    expect(resolved.snapshot.minAttendancePercentage).toBe(88);
    expect(resolved.snapshot.maxAllowedKTs).toBe(4);
    expect(resolved.snapshot.minimumFeePaidPercentage).toBe(65);
  });
});
