const request = require("supertest");
const mongoose = require("mongoose");
const {
  connectTestDb,
  clearTestDb,
  closeTestDb,
} = require("../setup/testDb");
const { createCollege, createUser, createStudent } = require("../helpers/factories");
const app = require("../../app");

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const StudentFee = require("../../src/models/studentFee.model");
const reportsService = require("../../src/services/reports.service");
const {
  selectAuthoritativeFee,
  getAuthoritativeFeeIds,
  getAuthoritativeFeeIdsMemory,
  recalculateStudentFeePaidAmount,
  getSplitPaymentStudentSummary,
} = require("../../src/services/studentFee.service");

describe("Phase 2 — Authoritative Fee Deduplication & Anti-Double-Counting", () => {
  let college;
  let admin;
  let department;
  let course;
  let agent;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    college = await createCollege({
      code: "DEDUP01",
      name: "Deduplication Test College",
      email: "dedup.college@test.com",
    });

    admin = await createUser({
      email: "dedup.admin@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    department = await Department.create({
      college_id: college._id,
      name: "Information Technology",
      code: "IT",
      type: "ACADEMIC",
      status: "ACTIVE",
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    course = await Course.create({
      college_id: college._id,
      department_id: department._id,
      name: "B.Tech Information Technology",
      code: "BT-IT",
      type: "THEORY",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 60,
      status: "ACTIVE",
      createdBy: admin._id,
    });

    agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);
  });

  describe("1. selectAuthoritativeFee deterministic tiebreak", () => {
    it("returns null for empty or null array", () => {
      expect(selectAuthoritativeFee([])).toBeNull();
      expect(selectAuthoritativeFee(null)).toBeNull();
    });

    it("returns the document when only one exists", () => {
      const doc = { _id: "fee1", paidAmount: 0 };
      expect(selectAuthoritativeFee([doc])).toBe(doc);
    });

    it("prefers document with highest paidAmount recorded", () => {
      const zeroDoc = { _id: "zero", paidAmount: 0, createdAt: new Date("2024-01-01") };
      const partialDoc = { _id: "partial", paidAmount: 20000, createdAt: new Date("2024-02-01") };
      const fullDoc = { _id: "full", paidAmount: 50000, createdAt: new Date("2024-03-01") };

      // Regardless of array order, fullDoc should be picked
      expect(selectAuthoritativeFee([zeroDoc, fullDoc, partialDoc])._id).toBe("full");
      expect(selectAuthoritativeFee([partialDoc, zeroDoc, fullDoc])._id).toBe("full");
      expect(selectAuthoritativeFee([fullDoc, partialDoc, zeroDoc])._id).toBe("full");
    });

    it("tiebreaks by earliest createdAt when paidAmount is equal", () => {
      const older = { _id: "fee_old", paidAmount: 0, createdAt: new Date("2024-01-01") };
      const newer = { _id: "fee_new", paidAmount: 0, createdAt: new Date("2024-06-01") };

      expect(selectAuthoritativeFee([newer, older])._id).toBe("fee_old");
      expect(selectAuthoritativeFee([older, newer])._id).toBe("fee_old");
    });

    it("tiebreaks by _id string comparison when paidAmount and createdAt are equal", () => {
      const idA = { _id: "aaaa1111", paidAmount: 0 };
      const idB = { _id: "bbbb2222", paidAmount: 0 };

      expect(selectAuthoritativeFee([idB, idA])._id).toBe("aaaa1111");
      expect(selectAuthoritativeFee([idA, idB])._id).toBe("aaaa1111");
    });
  });

  describe("2. reports.service paymentSummaryWithDateRange", () => {
    it("excludes duplicate fee installments when date filters are applied", async () => {
      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Rohan Varma",
        status: "ENROLLED",
      });

      // Authoritative Fee: Total 50000, Paid 25000
      const authFee = await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 25000,
        paymentStatus: "PARTIAL",
        createdAt: new Date("2025-01-01"),
        installments: [
          {
            name: "Term 1",
            amount: 25000,
            status: "PAID",
            paidAt: new Date("2025-05-10T10:00:00Z"),
            dueDate: new Date("2025-05-01"),
          },
          {
            name: "Term 2",
            amount: 25000,
            status: "PENDING",
            dueDate: new Date("2025-10-01"),
          },
        ],
      });

      // Duplicate Fee (from old promotion flow bug): Total 50000, Paid 0, but with a duplicate paid installment
      await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 0,
        paymentStatus: "PENDING",
        createdAt: new Date("2025-06-01"),
        installments: [
          {
            name: "Term 1 Dup",
            amount: 25000,
            status: "PAID",
            paidAt: new Date("2025-05-10T10:00:00Z"),
            dueDate: new Date("2025-05-01"),
          },
        ],
      });

      // With date range filtering covering May 2025
      const summary = await reportsService.paymentSummaryWithDateRange(
        college._id.toString(),
        "2025-05-01",
        "2025-05-31"
      );

      // Must only count the authoritative fee's installment: 25000, NOT 50000
      expect(summary.totalExpectedFee).toBe(25000);
      expect(summary.totalCollected).toBe(25000);
      expect(summary.totalPending).toBe(0);
      expect(summary.collectionRate).toBe(100);
    });

    it("aggregates authoritative fees correctly when NO date filters are applied", async () => {
      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Meera Nair",
        status: "ENROLLED",
      });

      // Authoritative Fee
      await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 30000,
        paymentStatus: "PARTIAL",
        createdAt: new Date("2025-01-01"),
      });

      // Duplicate Fee with 0 paid
      await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 0,
        paymentStatus: "PENDING",
        createdAt: new Date("2025-06-01"),
      });

      const summary = await reportsService.paymentSummaryWithDateRange(college._id.toString());

      // Only authoritative fee counted: Expected 50000, Collected 30000, Pending 20000
      expect(summary.totalExpectedFee).toBe(50000);
      expect(summary.totalCollected).toBe(30000);
      expect(summary.totalPending).toBe(20000);
      expect(summary.collectionRate).toBe(60);
    });
  });

  describe("3. reports.service paymentTrendsByMonth", () => {
    it("does not double-count monthly collections when duplicate fee installments exist", async () => {
      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Karan Johar",
        status: "ENROLLED",
      });

      // Authoritative Fee with March payment
      await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 60000,
        paidAmount: 30000,
        paymentStatus: "PARTIAL",
        createdAt: new Date("2025-01-01"),
        installments: [
          {
            name: "Sem 1",
            amount: 30000,
            status: "PAID",
            paidAt: new Date("2025-03-15T12:00:00Z"),
            dueDate: new Date("2025-03-01"),
          },
        ],
      });

      // Duplicate Fee with identical installment date & amount
      await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 60000,
        paidAmount: 0,
        paymentStatus: "PENDING",
        createdAt: new Date("2025-07-01"),
        installments: [
          {
            name: "Sem 1 Dup",
            amount: 30000,
            status: "PAID",
            paidAt: new Date("2025-03-15T12:00:00Z"),
            dueDate: new Date("2025-03-01"),
          },
        ],
      });

      const trendsData = await reportsService.paymentTrendsByMonth(college._id.toString(), 2025);

      const marchTrend = trendsData.trends.find((t) => t.month === 3);
      expect(marchTrend).toBeDefined();
      // Must only be 30000, NOT 60000
      expect(marchTrend.totalCollected).toBe(30000);
      expect(marchTrend.transactionCount).toBe(1);

      expect(trendsData.totalYearCollection).toBe(30000);
      expect(trendsData.totalYearTransactions).toBe(1);
    });
  });

  describe("4. student.controller getApprovedStudents fee attachment", () => {
    it("attaches authoritative fee to student instead of random duplicate overwrite", async () => {
      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Priya Sharma",
        status: "APPROVED",
      });

      // Create Authoritative fee (with payments)
      const authFee = await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 80000,
        paidAmount: 50000,
        paymentStatus: "PARTIAL",
        createdAt: new Date("2025-01-10"),
      });

      // Create empty promotion duplicate fee (with 0 paidAmount)
      const dupFee = await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 80000,
        paidAmount: 0,
        paymentStatus: "PENDING",
        createdAt: new Date("2025-06-15"),
      });

      const res = await agent
        .get("/api/students/approved-students")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);

      const studentRecord = res.body.data.find((s) => s._id === student._id.toString());
      expect(studentRecord).toBeDefined();
      expect(studentRecord.fee).toBeDefined();

      // The attached fee MUST be the authoritative fee (paidAmount 50000), NOT the empty duplicate
      expect(studentRecord.fee._id.toString()).toBe(authFee._id.toString());
      expect(studentRecord.fee.paidAmount).toBe(50000);
      expect(studentRecord.fee.paymentStatus).toBe("PARTIAL");
    });
  });

  describe("5. admin.payment.controller markInstallmentAsPaid and recalculateStudentFeePaidAmount", () => {
    it("recalculates paidAmount from sum of PAID installments and stays in sync when installments change", async () => {
      const student = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Vikram Malhotra",
        status: "APPROVED",
      });

      const fee = await StudentFee.create({
        college_id: college._id,
        student_id: student._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 0,
        paymentStatus: "PENDING",
        installments: [
          {
            name: "Term 1",
            amount: 25000,
            status: "PENDING",
            order: 1,
            dueDate: new Date(Date.now() + 86400000 * 10),
          },
          {
            name: "Term 2",
            amount: 25000,
            status: "PENDING",
            order: 2,
            dueDate: new Date(Date.now() + 86400000 * 30),
          },
        ],
      });

      const inst1Id = fee.installments[0]._id.toString();

      // Record offline payment via endpoint
      const res = await agent
        .post("/api/admin/payments/mark-paid")
        .field("studentId", student._id.toString())
        .field("installmentId", inst1Id)
        .field("paymentMode", "CASH")
        .attach("proof", Buffer.from("dummy-receipt-pdf-content"), "receipt.pdf")
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify DB state
      const feeAfterFirstPayment = await StudentFee.findById(fee._id);
      expect(feeAfterFirstPayment.paidAmount).toBe(25000);
      expect(feeAfterFirstPayment.paymentStatus).toBe("PARTIAL");
      expect(feeAfterFirstPayment.installments[0].status).toBe("PAID");

      // Now simulate editing / resetting the installment:
      // Case A: Installment 1 amount is updated from 25000 to 20000
      feeAfterFirstPayment.installments[0].amount = 20000;
      recalculateStudentFeePaidAmount(feeAfterFirstPayment);
      await feeAfterFirstPayment.save();

      const feeAfterEdit = await StudentFee.findById(fee._id);
      expect(feeAfterEdit.paidAmount).toBe(20000);
      expect(feeAfterEdit.paymentStatus).toBe("PARTIAL");

      // Case B: Reset installment 1 status back to PENDING (e.g. payment reversal or audit reset)
      feeAfterEdit.installments[0].status = "PENDING";
      recalculateStudentFeePaidAmount(feeAfterEdit);
      await feeAfterEdit.save();

      const feeAfterReset = await StudentFee.findById(fee._id);
      expect(feeAfterReset.paidAmount).toBe(0);
      expect(feeAfterReset.paymentStatus).toBe("PENDING");

      // Case C: Both installments PAID
      feeAfterReset.installments[0].status = "PAID";
      feeAfterReset.installments[0].amount = 25000;
      feeAfterReset.installments[1].status = "PAID";
      recalculateStudentFeePaidAmount(feeAfterReset);
      await feeAfterReset.save();

      const feeFullyPaid = await StudentFee.findById(fee._id);
      expect(feeFullyPaid.paidAmount).toBe(50000);
      expect(feeFullyPaid.paymentStatus).toBe("PAID");
    });
  });

  describe("6. getAuthoritativeFeeIds aggregation vs in-memory parity", () => {
    it("returns identical authoritative IDs from both aggregation and in-memory implementations across complex scenarios", async () => {
      // Create 5 students with various tiebreak situations
      const students = await Promise.all([
        createStudent({ college_id: college._id, department_id: department._id, course_id: course._id, fullName: "Student A" }),
        createStudent({ college_id: college._id, department_id: department._id, course_id: course._id, fullName: "Student B" }),
        createStudent({ college_id: college._id, department_id: department._id, course_id: course._id, fullName: "Student C" }),
        createStudent({ college_id: college._id, department_id: department._id, course_id: course._id, fullName: "Student D" }),
        createStudent({ college_id: college._id, department_id: department._id, course_id: course._id, fullName: "Student E" }),
      ]);

      // Student A: One fee with 10000 paid, one fee with 30000 paid -> Expect 30000 fee
      await StudentFee.create([
        { college_id: college._id, student_id: students[0]._id, course_id: course._id, totalFee: 50000, paidAmount: 10000, createdAt: new Date("2025-01-01") },
        { college_id: college._id, student_id: students[0]._id, course_id: course._id, totalFee: 50000, paidAmount: 30000, createdAt: new Date("2025-02-01") },
      ]);

      // Student B: Both fees paid 0 -> Earliest createdAt wins
      await StudentFee.create([
        { college_id: college._id, student_id: students[1]._id, course_id: course._id, totalFee: 40000, paidAmount: 0, createdAt: new Date("2025-03-01") },
        { college_id: college._id, student_id: students[1]._id, course_id: course._id, totalFee: 40000, paidAmount: 0, createdAt: new Date("2025-01-15") },
      ]);

      // Student C: Both fees paid 15000 -> Earliest createdAt wins
      await StudentFee.create([
        { college_id: college._id, student_id: students[2]._id, course_id: course._id, totalFee: 40000, paidAmount: 15000, createdAt: new Date("2025-04-01") },
        { college_id: college._id, student_id: students[2]._id, course_id: course._id, totalFee: 40000, paidAmount: 15000, createdAt: new Date("2025-02-15") },
      ]);

      // Student D: Single fee -> Returns sole fee
      await StudentFee.create([
        { college_id: college._id, student_id: students[3]._id, course_id: course._id, totalFee: 60000, paidAmount: 20000, createdAt: new Date("2025-05-01") },
      ]);

      // Student E: Three duplicate fees with paidAmount 0 and identical createdAt -> _id tiebreak
      const now = new Date("2025-06-01T00:00:00Z");
      await StudentFee.create([
        { college_id: college._id, student_id: students[4]._id, course_id: course._id, totalFee: 50000, paidAmount: 0, createdAt: now },
        { college_id: college._id, student_id: students[4]._id, course_id: course._id, totalFee: 50000, paidAmount: 0, createdAt: now },
        { college_id: college._id, student_id: students[4]._id, course_id: course._id, totalFee: 50000, paidAmount: 0, createdAt: now },
      ]);

      // Fetch IDs using both methods
      const memoryIds = await getAuthoritativeFeeIdsMemory(college._id);
      const aggregationIds = await getAuthoritativeFeeIds(college._id);

      // Verify lengths match (exactly 5 authoritative fees, 1 per student)
      expect(memoryIds.length).toBe(5);
      expect(aggregationIds.length).toBe(5);

      // Verify exact matching set of ObjectIds
      const sortedMemory = memoryIds.map((id) => id.toString()).sort();
      const sortedAggregation = aggregationIds.map((id) => id.toString()).sort();
      expect(sortedAggregation).toEqual(sortedMemory);
    });
  });

  describe("7. getSplitPaymentStudentSummary read-only detection", () => {
    it("detects students with payments on multiple StudentFee documents without mutating data", async () => {
      const student1 = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Split Payment Student",
        status: "APPROVED",
      });

      const student2 = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Clean Student With Duplicate",
        status: "APPROVED",
      });

      const student3 = await createStudent({
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: "Normal Student Single Fee",
        status: "APPROVED",
      });

      // Student 1: SPLIT PAYMENTS (payments on BOTH docs)
      await StudentFee.create({
        college_id: college._id,
        student_id: student1._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 20000,
        installments: [{ name: "T1", amount: 20000, status: "PAID", dueDate: new Date() }],
      });
      await StudentFee.create({
        college_id: college._id,
        student_id: student1._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 15000,
        installments: [{ name: "T2", amount: 15000, status: "PAID", dueDate: new Date() }],
      });

      // Student 2: Duplicate exists, but ONLY ONE has payments
      await StudentFee.create({
        college_id: college._id,
        student_id: student2._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 30000,
        installments: [{ name: "T1", amount: 30000, status: "PAID", dueDate: new Date() }],
      });
      await StudentFee.create({
        college_id: college._id,
        student_id: student2._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 0,
        installments: [{ name: "T1 Dup", amount: 30000, status: "PENDING", dueDate: new Date() }],
      });

      // Student 3: Single fee, normal
      await StudentFee.create({
        college_id: college._id,
        student_id: student3._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 50000,
        installments: [{ name: "Full", amount: 50000, status: "PAID", dueDate: new Date() }],
      });

      const summary = await getSplitPaymentStudentSummary(college._id);

      // Only student1 should be flagged
      expect(summary.count).toBe(1);
      expect(summary.studentIds).toEqual([student1._id.toString()]);
      expect(summary.details[0].feeCount).toBe(2);
      expect(summary.details[0].totalSplitPaid).toBe(35000);

      // Verify no database mutation occurred
      const s1Fees = await StudentFee.find({ student_id: student1._id });
      expect(s1Fees.length).toBe(2);
      expect(s1Fees[0].paidAmount + s1Fees[1].paidAmount).toBe(35000);
    });
  });
});

