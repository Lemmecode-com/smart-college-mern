const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const { createFeeStructure, updateFeeStructure } = require("../../src/controllers/feeStructure.controller");
const FeeStructure = require("../../src/models/feeStructure.model");

const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
} = require("../helpers/factories");

describe("FeeStructure Controller — Payment Installments Validation", () => {
  let college;
  let adminUser;
  let department;
  let course;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    const collegeId = new mongoose.Types.ObjectId();
    adminUser = await createUser({
      name: "Admin User",
      email: `admin-${Date.now()}@testcollege.edu`,
      role: "COLLEGE_ADMIN",
      college_id: collegeId,
    });

    college = await createCollege({
      _id: collegeId,
      name: "NOVAA Engineering College",
      code: "NOVAENG",
      email: `info-${Date.now()}@novaa.edu`,
      admin_id: adminUser._id,
    });

    department = await createDepartment({
      name: "Computer Science",
      code: "CS",
      college_id: college._id,
      createdBy: adminUser._id,
    });

    course = await createCourse({
      name: "B.Tech Computer Science",
      code: "BTCS",
      college_id: college._id,
      department_id: department._id,
      durationSemesters: 8,
      maxStudents: 60,
      createdBy: adminUser._id,
    });
  });

  const getFutureDate = (daysAhead = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
  };

  const getPastDate = (daysBehind = 1) => {
    const d = new Date();
    d.setDate(d.getDate() - daysBehind);
    return d.toISOString().split("T")[0];
  };

  it("1. empty array: rejects missing or empty installments array before .reduce", async () => {
    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [],
      },
    };

    let error = null;
    const res = {};
    await createFeeStructure(req, res, (err) => {
      error = err;
    });

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("INVALID_INSTALLMENTS");
    expect(error.message).toBe("At least one installment is required");
    expect(error.details?.field).toBe("installmentTotal");
  });

  it("2. zero/negative amount: rejects installment with amount <= 0", async () => {
    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "Term 1", amount: 0, dueDate: getFutureDate(10) },
        ],
      },
    };

    let error = null;
    const res = {};
    await createFeeStructure(req, res, (err) => {
      error = err;
    });

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("INVALID_INSTALLMENT_AMOUNT");
    expect(error.details?.field).toBe("installments[0].amount");
  });

  it("3. missing installment name: rejects installment with empty name", async () => {
    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "   ", amount: 50000, dueDate: getFutureDate(10) },
        ],
      },
    };

    let error = null;
    const res = {};
    await createFeeStructure(req, res, (err) => {
      error = err;
    });

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("MISSING_INSTALLMENT_NAME");
    expect(error.details?.field).toBe("installments[0].name");
  });

  it("4. missing date: rejects installment without dueDate", async () => {
    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "Term 1", amount: 50000, dueDate: "" },
        ],
      },
    };

    let error = null;
    const res = {};
    await createFeeStructure(req, res, (err) => {
      error = err;
    });

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("MISSING_DUE_DATE");
    expect(error.details?.field).toBe("installments[0].dueDate");
  });

  it("5. past due date: rejects installment with dueDate in the past", async () => {
    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "Term 1", amount: 50000, dueDate: getPastDate(2) },
        ],
      },
    };

    let error = null;
    const res = {};
    await createFeeStructure(req, res, (err) => {
      error = err;
    });

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("PAST_DUE_DATE");
    expect(error.details?.field).toBe("installments[0].dueDate");
  });

  it("6. non-sequential dates: rejects when installment 2 dueDate is on or before installment 1", async () => {
    const day10 = getFutureDate(10);
    const day5 = getFutureDate(5);

    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "Term 1", amount: 25000, dueDate: day10 },
          { name: "Term 2", amount: 25000, dueDate: day5 },
        ],
      },
    };

    let error = null;
    const res = {};
    await createFeeStructure(req, res, (err) => {
      error = err;
    });

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("INVALID_DUE_DATE_ORDER");
    expect(error.details?.field).toBe("installments[1].dueDate");
  });

  it("7. total mismatch: rejects when installment total does not match totalFee", async () => {
    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "Term 1", amount: 20000, dueDate: getFutureDate(10) },
          { name: "Term 2", amount: 20000, dueDate: getFutureDate(20) },
        ],
      },
    };

    let error = null;
    const res = {};
    await createFeeStructure(req, res, (err) => {
      error = err;
    });

    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("INVALID_INSTALLMENTS");
    expect(error.details?.field).toBe("installmentTotal");
  });

  it("8. rounding tolerance: allows slight floating point / fractional divisions within 0.01 tolerance", async () => {
    // 52700 / 3 -> 17566.67, 17566.67, 17566.66 (sum = 52700)
    const req = {
      college_id: college._id,
      user: adminUser,
      body: {
        course_id: course._id,
        category: "GEN",
        totalFee: 52700,
        installments: [
          { name: "Term 1", amount: 17566.67, dueDate: getFutureDate(10) },
          { name: "Term 2", amount: 17566.67, dueDate: getFutureDate(20) },
          { name: "Term 3", amount: 17566.66, dueDate: getFutureDate(30) },
        ],
      },
    };

    let capturedData = null;
    const res = {
      status: () => res,
      json: (d) => {
        capturedData = d;
      },
    };

    let nextError = null;
    await createFeeStructure(req, res, (err) => {
      nextError = err;
    });

    expect(nextError).toBeNull();
    expect(capturedData?.success).toBe(true);
    expect(capturedData?.data?.feeStructure?.totalFee).toBe(52700);
    expect(capturedData?.data?.feeStructure?.installments).toHaveLength(3);
  });
});
