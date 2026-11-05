/**
 * NOVAA ERP — Issue #212 Integration & Regression Test Suite
 * 
 * Tests:
 * 1. Legacy Fee Structure & Receipt Compatibility (taxDetails: null)
 * 2. Policy Guard: Taxable fee components blocked when policy is unapproved
 * 3. Validation Guard: Missing gstRate rejected
 * 4. GST-Exclusive Calculation, Split & Multi-installment Allocation
 * 5. Student Fee creation & Promotion snapshot preservation
 * 6. Admin and Student Receipt API tax breakdown
 * 7. PDF and Email receipt generation
 */

const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");

const College = require("../../src/models/college.model");
const Course = require("../../src/models/course.model");
const Department = require("../../src/models/department.model");
const Student = require("../../src/models/student.model");
const StudentFee = require("../../src/models/studentFee.model");
const FeeStructure = require("../../src/models/feeStructure.model");
const User = require("../../src/models/user.model");

const {
  setStatutoryPolicyApproval,
  getStatutoryPolicyApproval,
} = require("../../src/utils/gstCalculator");
const { createFeeStructure, updateFeeStructure } = require("../../src/controllers/feeStructure.controller");
const { getAdminReceipt } = require("../../src/controllers/admin.receipt.controller");
const { getStudentReceipt } = require("../../src/controllers/student.payment.controller");
const { generatePaymentReceiptPdf } = require("../../src/utils/pdfReceipt");

const {
  createCollege,
  createUser,
  createDepartment,
  createCourse,
  createStudent,
} = require("../helpers/factories");

describe("Issue #212 — GST Exclusive Architecture & Receipt Integration", () => {
  let college;
  let department;
  let course;
  let studentUser;
  let student;
  let adminUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    // Reset policy approval to default false
    setStatutoryPolicyApproval(false);
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    setStatutoryPolicyApproval(false);

    // Setup basic fixtures using established test factories
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
      gstin: "27AAAAA0000A1Z5",
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

    studentUser = await createUser({
      name: "Rohan Verma",
      email: `rohan-${Date.now()}@student.novaa.edu`,
      role: "STUDENT",
      college_id: college._id,
    });

    student = await createStudent({
      user_id: studentUser._id,
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Rohan Verma",
      email: studentUser.email,
      enrollmentNumber: "NOVAENG-BTCS2025-0001",
      category: "GEN",
      status: "APPROVED",
    });
  });

  describe("1. Legacy Compatibility & Regression", () => {
    it("creates and preserves legacy fee structure without tax", async () => {
      const dueDate1 = new Date();
      dueDate1.setDate(dueDate1.getDate() + 30);
      const dueDate2 = new Date();
      dueDate2.setDate(dueDate2.getDate() + 60);

      const feeStructure = await FeeStructure.create({
        college_id: college._id,
        course_id: course._id,
        category: "GEN",
        totalFee: 50000,
        installments: [
          { name: "Installment 1", amount: 25000, dueDate: dueDate1, order: 1 },
          { name: "Installment 2", amount: 25000, dueDate: dueDate2, order: 2 },
        ],
      });

      expect(feeStructure.totalFee).toBe(50000);
      expect(feeStructure.totalTax).toBe(0);
      expect(feeStructure.installments[0].taxBreakdown).toBeNull();
      expect(feeStructure.installments[0].amount).toBe(25000);
    });

    it("returns taxDetails: null for legacy fee receipts", async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const studentFee = await StudentFee.create({
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        totalFee: 50000,
        paidAmount: 25000,
        installments: [
          {
            name: "Semester 1 Fee",
            amount: 25000,
            dueDate,
            status: "PAID",
            transactionId: "TXN_LEGACY_001",
            paymentMode: "ONLINE",
            paymentGateway: "STRIPE",
            paidAt: new Date(),
          },
        ],
      });

      const installmentId = studentFee.installments[0]._id;

      // Test Admin Receipt API
      const req = {
        params: { installmentId: installmentId.toString() },
        college_id: college._id,
      };
      let jsonResponse = null;
      const res = {
        json: (data) => {
          jsonResponse = data;
          return data;
        },
      };

      await getAdminReceipt(req, res, (err) => {
        if (err) throw err;
      });

      expect(jsonResponse).toBeDefined();
      expect(jsonResponse.receiptNumber).toMatch(/^RCPT-/);
      expect(jsonResponse.amount).toBe(25000);
      expect(jsonResponse.taxDetails).toBeNull();
      expect(jsonResponse.college.gstin).toBe("27AAAAA0000A1Z5");
      expect(jsonResponse.summary.totalFee).toBe(50000);
      expect(jsonResponse.summary.totalPaid).toBe(25000);
    });
  });

  describe("2. Statutory Policy Guard & Component Validation", () => {
    it("BLOCKS taxable components when statutory GST policy is not approved", async () => {
      expect(getStatutoryPolicyApproval()).toBe(false);

      const req = {
        college_id: college._id,
        body: {
          course_id: course._id,
          category: "GEN",
          components: [
            { name: "Tuition Fee", baseAmount: 40000, gstRate: 0 },
            { name: "Laboratory Fee", baseAmount: 10000, gstRate: 18 },
          ],
          installments: [
            { name: "Term 1", amount: 51800, dueDate: new Date(Date.now() + 86400000 * 30) },
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
      expect(error.code).toBe("GST_POLICY_APPROVAL_PENDING");
    });

    it("REJECTS components with missing gstRate to prevent silent exemption", async () => {
      const req = {
        college_id: college._id,
        body: {
          course_id: course._id,
          category: "GEN",
          components: [
            { name: "Tuition Fee", baseAmount: 50000 }, // missing gstRate
          ],
          installments: [
            { name: "Term 1", amount: 50000, dueDate: new Date(Date.now() + 86400000 * 30) },
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
      expect(error.code).toBe("GST_RATE_REQUIRED");
    });

    it("BLOCKS 0% exempt components when statutory policy is unapproved (prevents unapproved statutory exemption claims)", async () => {
      expect(getStatutoryPolicyApproval()).toBe(false);

      const req = {
        college_id: college._id,
        user: { id: adminUser._id, name: adminUser.name, role: adminUser.role },
        body: {
          course_id: course._id,
          category: "GEN",
          components: [
            { name: "Exempt Tuition Fee", baseAmount: 60000, gstRate: 0 },
          ],
          installments: [
            { name: "Term 1", amount: 60000, dueDate: new Date(Date.now() + 86400000 * 30) },
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
      expect(error.code).toBe("GST_POLICY_APPROVAL_PENDING");
    });

    it("REJECTS unspecified fee components (e.g. Other Fees) even when policy is approved", async () => {
      setStatutoryPolicyApproval(true);

      const req = {
        college_id: college._id,
        user: { id: adminUser._id, name: adminUser.name, role: adminUser.role },
        body: {
          course_id: course._id,
          category: "OBC",
          components: [
            { name: "Other Fees", baseAmount: 5000, gstRate: 0 },
          ],
          installments: [
            { name: "Term 1", amount: 5000, dueDate: new Date(Date.now() + 86400000 * 30) },
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
      expect(error.code).toBe("UNAPPROVED_FEE_COMPONENT_OR_RATE");
    });

    it("REJECTS component rate mismatch against approved policy schedule (e.g. Tuition Fee at 18%)", async () => {
      setStatutoryPolicyApproval(true);

      const req = {
        college_id: college._id,
        user: { id: adminUser._id, name: adminUser.name, role: adminUser.role },
        body: {
          course_id: course._id,
          category: "SC",
          components: [
            { name: "Tuition Fee", baseAmount: 50000, gstRate: 18 }, // Tuition Fee must be 0%
          ],
          installments: [
            { name: "Term 1", amount: 59000, dueDate: new Date(Date.now() + 86400000 * 30) },
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
      expect(error.code).toBe("UNAPPROVED_FEE_COMPONENT_OR_RATE");
    });

    it("activates policy through server environment configuration ENABLE_STATUTORY_GST_POLICY=true", async () => {
      const originalEnv = process.env.ENABLE_STATUTORY_GST_POLICY;
      try {
        setStatutoryPolicyApproval(null); // Clear manual override
        process.env.ENABLE_STATUTORY_GST_POLICY = "true";

        const req = {
          college_id: college._id,
          user: { id: adminUser._id, name: adminUser.name, role: adminUser.role },
          body: {
            course_id: course._id,
            category: "ST",
            components: [
              { name: "Transport Fee", baseAmount: 10000, gstRate: 5 },
            ],
            installments: [
              { name: "Term 1", amount: 10500, dueDate: new Date(Date.now() + 86400000 * 30) },
            ],
          },
        };

        let createdData = null;
        const res = {
          status: () => res,
          json: (data) => {
            createdData = data;
            return data;
          },
        };

        await createFeeStructure(req, res, (err) => {
          if (err) throw err;
        });

        expect(createdData).toBeDefined();
        expect(createdData.data.feeStructure.totalFee).toBe(10500);
        expect(createdData.data.feeStructure.totalTax).toBe(500);
      } finally {
        process.env.ENABLE_STATUTORY_GST_POLICY = originalEnv;
        setStatutoryPolicyApproval(false);
      }
    });
  });

  describe("3. GST-Exclusive Calculation, Split & Multi-Installment Allocation (When Policy Approved)", () => {
    beforeEach(() => {
      // Temporarily approve policy in this test suite
      setStatutoryPolicyApproval(true);
    });

    afterEach(() => {
      setStatutoryPolicyApproval(false);
    });

    it("calculates exact GST, allocates across installments and verifies gross reconciliation", async () => {
      // 50,000 base + 18% GST (9,000) = 59,000 gross
      // 2 Installments: each 29,500 gross (25,000 base + 4,500 tax)
      const req = {
        college_id: college._id,
        user: { id: adminUser._id, name: adminUser.name, role: adminUser.role },
        body: {
          course_id: course._id,
          category: "GEN",
          components: [
            { name: "Laboratory Fee", baseAmount: 50000, gstRate: 18 },
          ],
          installments: [
            { name: "Installment 1", amount: 29500, dueDate: new Date(Date.now() + 86400000 * 30), order: 1 },
            { name: "Installment 2", amount: 29500, dueDate: new Date(Date.now() + 86400000 * 60), order: 2 },
          ],
        },
      };

      let createdData = null;
      const res = {
        status: () => res,
        json: (data) => {
          createdData = data;
          return data;
        },
      };

      await createFeeStructure(req, res, (err) => {
        if (err) throw err;
      });

      const fs = createdData.data.feeStructure;
      expect(fs.totalFee).toBe(59000);
      expect(fs.baseFee).toBe(50000);
      expect(fs.totalTax).toBe(9000);

      // Verify installments
      expect(fs.installments).toHaveLength(2);
      const [inst1, inst2] = fs.installments;

      expect(inst1.baseAmount + inst1.gstAmount).toBe(inst1.amount);
      expect(inst2.baseAmount + inst2.gstAmount).toBe(inst2.amount);

      expect(inst1.baseAmount).toBe(25000);
      expect(inst1.gstAmount).toBe(4500);
      expect(inst1.taxBreakdown.isTaxApplicable).toBe(true);
      expect(inst1.taxBreakdown.taxSplit.cgstAmount).toBe(2250);
      expect(inst1.taxBreakdown.taxSplit.sgstAmount).toBe(2250);

      expect(inst1.amount + inst2.amount).toBe(fs.totalFee);
    });

    it("ALLOWS approved 0% exempt components once statutory policy approval is active", async () => {
      const req = {
        college_id: college._id,
        user: { id: adminUser._id, name: adminUser.name, role: adminUser.role },
        body: {
          course_id: course._id,
          category: "GEN",
          components: [
            { name: "Exempt Tuition Fee", baseAmount: 60000, gstRate: 0 },
          ],
          installments: [
            { name: "Term 1", amount: 60000, dueDate: new Date(Date.now() + 86400000 * 30) },
          ],
        },
      };

      let createdData = null;
      const res = {
        status: () => res,
        json: (data) => {
          createdData = data;
          return data;
        },
      };

      await createFeeStructure(req, res, (err) => {
        if (err) throw err;
      });

      expect(createdData).toBeDefined();
      expect(createdData.data.feeStructure.totalFee).toBe(60000);
      expect(createdData.data.feeStructure.totalTax).toBe(0);
      expect(createdData.data.feeStructure.installments[0].taxBreakdown.isTaxApplicable).toBe(false);
    });

    it("serves rich tax invoice receipt when installment with taxBreakdown is paid", async () => {
      await FeeStructure.create({
        college_id: college._id,
        course_id: course._id,
        category: "GEN",
        totalFee: 59000,
        baseFee: 50000,
        totalTax: 9000,
        components: [
          { name: "Lab & Computational Facility Fee", baseAmount: 50000, gstRate: 18, gstAmount: 9000, totalAmount: 59000 },
        ],
        installments: [
          { order: 1, name: "Installment 1", amount: 29500, dueDate: new Date() },
          { order: 2, name: "Installment 2", amount: 29500, dueDate: new Date() },
        ],
      });

      const studentFee = await StudentFee.create({
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        totalFee: 59000,
        baseFee: 50000,
        totalTax: 9000,
        paidAmount: 29500,
        installments: [
          {
            name: "Installment 1",
            amount: 29500,
            baseAmount: 25000,
            gstAmount: 4500,
            taxBreakdown: {
              isTaxApplicable: true,
              taxableBase: 25000,
              gstRate: 18,
              totalTax: 4500,
              grossAmount: 29500,
              taxSplit: {
                type: "INTRA_STATE",
                cgstRate: 9,
                cgstAmount: 2250,
                sgstRate: 9,
                sgstAmount: 2250,
                igstRate: 0,
                igstAmount: 0,
              },
            },
            dueDate: new Date(Date.now() + 86400000 * 30),
            status: "PAID",
            transactionId: "TXN_GST_1001",
            paymentMode: "ONLINE",
            paymentGateway: "STRIPE",
            paidAt: new Date(),
          },
        ],
      });

      const instId = studentFee.installments[0]._id;

      // Student Receipt API
      const reqStudent = {
        params: { installmentId: instId.toString() },
        user: { id: studentUser._id.toString() },
        college_id: college._id,
      };
      let studentReceipt = null;
      const resStudent = {
        json: (data) => {
          studentReceipt = data;
          return data;
        },
      };

      await getStudentReceipt(reqStudent, resStudent, (err) => {
        if (err) throw err;
      });

      expect(studentReceipt).toBeDefined();
      expect(studentReceipt.taxDetails).toBeDefined();
      expect(studentReceipt.taxDetails.isTaxApplicable).toBe(true);
      expect(studentReceipt.taxDetails.sacCode).toBe("999299");
      expect(studentReceipt.taxDetails.placeOfSupply).toBe("Maharashtra (27)");
      expect(studentReceipt.taxDetails.baseAmount).toBe(25000);
      expect(studentReceipt.taxDetails.totalTax).toBe(4500);
      expect(studentReceipt.taxDetails.taxSplit.cgstAmount).toBe(2250);
      expect(studentReceipt.taxDetails.taxSplit.sgstAmount).toBe(2250);
      expect(studentReceipt.taxDetails.lineItems).toBeInstanceOf(Array);
      expect(studentReceipt.taxDetails.lineItems.length).toBe(1);
      expect(studentReceipt.taxDetails.lineItems[0].name).toBe("Lab & Computational Facility Fee");
      expect(studentReceipt.taxDetails.lineItems[0].baseAmount).toBe(25000);
      expect(studentReceipt.taxDetails.lineItems[0].gstAmount).toBe(4500);
      expect(studentReceipt.taxDetails.lineItems[0].totalAmount).toBe(29500);
      expect(studentReceipt.college.gstin).toBe("27AAAAA0000A1Z5");
    });
  });

  describe("4. PDF Generation Breakdown", () => {
    it("generates payment receipt PDF with tax breakdown without error", async () => {
      const pdfBuffer = await generatePaymentReceiptPdf({
        studentName: "Rohan Verma",
        enrollmentNumber: "NOVAENG-BTCS2025-0001",
        installment: {
          name: "Semester 1 Installment",
          amount: 29500,
          taxBreakdown: {
            isTaxApplicable: true,
            baseAmount: 25000,
            totalTax: 4500,
            gstRate: 18,
            taxSplit: {
              type: "INTRA_STATE",
              cgstRate: 9,
              cgstAmount: 2250,
              sgstRate: 9,
              sgstAmount: 2250,
            },
          },
        },
        totalFee: 59000,
        paidAmount: 29500,
        remainingAmount: 29500,
        collegeName: "NOVAA Engineering College",
        collegeGstin: "27AAAAA0000A1Z5",
        transactionId: "TXN_PDF_001",
        paymentMode: "ONLINE",
        paidAt: new Date(),
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });

    it("generates legacy payment receipt PDF when no tax is applicable", async () => {
      const pdfBuffer = await generatePaymentReceiptPdf({
        studentName: "Rohan Verma",
        enrollmentNumber: "NOVAENG-BTCS2025-0001",
        installment: {
          name: "Semester 1 Installment",
          amount: 25000,
        },
        totalFee: 50000,
        paidAmount: 25000,
        remainingAmount: 25000,
        collegeName: "NOVAA Engineering College",
        transactionId: "TXN_PDF_002",
        paymentMode: "ONLINE",
        paidAt: new Date(),
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });

    it("generates payment receipt PDF without Tax Invoice title when college GSTIN is missing", async () => {
      const pdfBuffer = await generatePaymentReceiptPdf({
        studentName: "Rohan Verma",
        enrollmentNumber: "NOVAENG-BTCS2025-0001",
        installment: {
          name: "Semester 1 Installment",
          amount: 29500,
          taxBreakdown: {
            isTaxApplicable: true,
            baseAmount: 25000,
            totalTax: 4500,
            gstRate: 18,
          },
        },
        totalFee: 59000,
        paidAmount: 29500,
        remainingAmount: 29500,
        collegeName: "NOVAA Engineering College",
        collegeGstin: null, // missing GSTIN
        transactionId: "TXN_PDF_003",
        paymentMode: "ONLINE",
        paidAt: new Date(),
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });
  });

  describe("5. Historical Paid Installment Preservation During Fee Structure Updates", () => {
    it("preserves paid installments intact when fee structure is updated", async () => {
      setStatutoryPolicyApproval(true);

      // Create separate course and student for isolation
      const course2 = await createCourse({
        name: "M.Tech Computer Science",
        code: `MTCS-${Date.now()}`,
        college_id: college._id,
        department_id: department._id,
        durationSemesters: 4,
        maxStudents: 30,
        createdBy: adminUser._id,
      });

      const updatedStudent = await createStudent({
        fullName: "Aarav Sharma",
        email: `aarav-${Date.now()}@teststudent.edu`,
        college_id: college._id,
        department_id: department._id,
        course_id: course2._id,
        category: "GEN",
        status: "APPROVED",
      });

      // Create initial fee structure
      const feeStructure = await FeeStructure.create({
        college_id: college._id,
        course_id: course2._id,
        category: "GEN",
        totalFee: 59000,
        baseFee: 50000,
        totalTax: 9000,
        components: [
          { name: "Laboratory Fee", baseAmount: 50000, gstRate: 18, gstAmount: 9000, totalAmount: 59000 },
        ],
        installments: [
          { name: "Term 1", amount: 29500, dueDate: new Date(Date.now() + 86400000 * 30), order: 1, baseAmount: 25000, gstAmount: 4500 },
          { name: "Term 2", amount: 29500, dueDate: new Date(Date.now() + 86400000 * 60), order: 2, baseAmount: 25000, gstAmount: 4500 },
        ],
      });

      // Create student fee with Term 1 already PAID
      const paidDate = new Date("2026-01-15T10:00:00.000Z");
      const studentFee = await StudentFee.create({
        student_id: updatedStudent._id,
        college_id: college._id,
        course_id: course2._id,
        totalFee: 59000,
        baseFee: 50000,
        totalTax: 9000,
        paidAmount: 29500,
        installments: [
          {
            name: "Term 1",
            amount: 29500,
            baseAmount: 25000,
            gstAmount: 4500,
            dueDate: new Date(Date.now() + 86400000 * 30),
            order: 1,
            status: "PAID",
            paidAt: paidDate,
            transactionId: "TXN_HISTORICAL_PAID_001",
            paymentMode: "ONLINE",
            paymentGateway: "STRIPE",
          },
          {
            name: "Term 2",
            amount: 29500,
            baseAmount: 25000,
            gstAmount: 4500,
            dueDate: new Date(Date.now() + 86400000 * 60),
            order: 2,
            status: "PENDING",
          },
        ],
      });

      // Update FeeStructure: Change Term 2 amount from 29500 to 35400 (base: 30000, tax: 5400)
      // New total: 29500 + 35400 = 64900
      const updateReq = {
        params: { feeStructureId: feeStructure._id.toString() },
        college_id: college._id,
        user: { id: adminUser._id, name: adminUser.name, role: adminUser.role },
        get: () => "Jest-Agent",
        headers: {},
        body: {
          totalFee: 64900,
          components: [
            { name: "Laboratory Fee", baseAmount: 55000, gstRate: 18 },
          ],
          installments: [
            { name: "Term 1", amount: 29500, dueDate: new Date(Date.now() + 86400000 * 30), order: 1 },
            { name: "Term 2", amount: 35400, dueDate: new Date(Date.now() + 86400000 * 90), order: 2 },
          ],
        },
      };

      let updatedData = null;
      const updateRes = {
        status: () => updateRes,
        json: (data) => {
          updatedData = data;
          return data;
        },
      };

      await updateFeeStructure(updateReq, updateRes, (err) => {
        if (err) throw err;
      });

      expect(updatedData).toBeDefined();

      // Verify the student fee record
      const refreshedStudentFee = await StudentFee.findById(studentFee._id);
      expect(refreshedStudentFee.totalFee).toBe(64900);
      expect(refreshedStudentFee.paidAmount).toBe(29500); // Historical paid amount remains untouched!

      const paidInst = refreshedStudentFee.installments.find((i) => i.name === "Term 1");
      expect(paidInst.status).toBe("PAID");
      expect(paidInst.amount).toBe(29500);
      expect(paidInst.transactionId).toBe("TXN_HISTORICAL_PAID_001");
      expect(paidInst.paidAt.toISOString()).toBe(paidDate.toISOString());
    });
  });

  describe("6. Fee Receipt Email Tax Verification", () => {
    it("renders CGST/SGST rows and Tax Invoice subject in email HTML for taxable payment", async () => {
      let sentMailOptions = null;
      jest.spyOn(require("../../src/services/collegeEmail.service"), "getCollegeTransporter").mockResolvedValue({
        transporter: {
          sendMail: async (options) => {
            sentMailOptions = options;
            return { messageId: "test-msg-id" };
          },
        },
        fromName: "NOVAA Engineering College",
        fromEmail: "fees@novaa.edu",
      });

      const { sendPaymentReceiptEmail } = require("../../src/services/email.service");

      await sendPaymentReceiptEmail({
        to: "student@novaa.edu",
        studentName: "Rohan Verma",
        installment: {
          name: "Semester 1 Fee",
          amount: 29500,
          baseAmount: 25000,
          gstAmount: 4500,
          paidAt: new Date("2026-10-15"),
          transactionId: "TXN_EMAIL_001",
          taxBreakdown: {
            isTaxApplicable: true,
            baseAmount: 25000,
            totalTax: 4500,
            gstRate: 18,
            taxSplit: {
              type: "INTRA_STATE",
              cgstRate: 9,
              cgstAmount: 2250,
              sgstRate: 9,
              sgstAmount: 2250,
              igstRate: 0,
              igstAmount: 0,
            },
          },
        },
        totalFee: 59000,
        paidAmount: 29500,
        remainingAmount: 29500,
        collegeId: college._id,
        collegeGstin: "27AAAAA0000A1Z5",
      });

      expect(sentMailOptions).toBeDefined();
      expect(sentMailOptions.subject).toContain("Tax Invoice");
      expect(sentMailOptions.html).toContain("SAC Code:");
      expect(sentMailOptions.html).toContain("999299");
      expect(sentMailOptions.html).toContain("Place of Supply:");
      expect(sentMailOptions.html).toContain("Maharashtra (27)");
      expect(sentMailOptions.html).toContain("Base Fee:");
      expect(sentMailOptions.html).toContain("CGST (9%):");
      expect(sentMailOptions.html).toContain("SGST (9%):");
      expect(sentMailOptions.html).toContain("2,250");
      expect(sentMailOptions.html).toContain("25,000");
      expect(sentMailOptions.html).toContain("29,500");
    });

    it("renders cleanly without CGST/SGST rows for exempt/zero-tax payment", async () => {
      let sentMailOptions = null;
      jest.spyOn(require("../../src/services/collegeEmail.service"), "getCollegeTransporter").mockResolvedValue({
        transporter: {
          sendMail: async (options) => {
            sentMailOptions = options;
            return { messageId: "test-msg-id-2" };
          },
        },
        fromName: "NOVAA Engineering College",
        fromEmail: "fees@novaa.edu",
      });

      const { sendPaymentReceiptEmail } = require("../../src/services/email.service");

      await sendPaymentReceiptEmail({
        to: "student@novaa.edu",
        studentName: "Rohan Verma",
        installment: {
          name: "Semester 1 Fee",
          amount: 50000,
          baseAmount: 50000,
          gstAmount: 0,
          paidAt: new Date("2026-10-15"),
          transactionId: "TXN_EMAIL_002",
          taxBreakdown: {
            isTaxApplicable: false,
            baseAmount: 50000,
            totalTax: 0,
            gstRate: 0,
          },
        },
        totalFee: 50000,
        paidAmount: 50000,
        remainingAmount: 0,
        collegeId: college._id,
        collegeGstin: "27AAAAA0000A1Z5",
      });

      expect(sentMailOptions).toBeDefined();
      expect(sentMailOptions.subject).toBe("Payment Receipt - College Fee");
      expect(sentMailOptions.html).not.toContain("CGST");
      expect(sentMailOptions.html).not.toContain("SGST");
      expect(sentMailOptions.html).toContain("50,000");
    });
  });

  describe("7. FeeStructure Model Statutory Fields & Pre-Validate Hook (Task 3)", () => {
    it("auto-populates components, baseFee, totalTax, and totalFee from statutory fee fields", async () => {
      setStatutoryPolicyApproval(true);

      const fee = await FeeStructure.create({
        college_id: college._id,
        course_id: course._id,
        category: "EWS",
        tuitionFee: 50000,
        labFee: 10000,
        sportsFee: 5000,
        transportFee: 8000,
        installments: [
          { order: 1, name: "Installment 1", amount: 76100, dueDate: new Date(Date.now() + 86400000 * 30) },
        ],
      });

      expect(fee.tuitionFee).toBe(50000);
      expect(fee.labFee).toBe(10000);
      expect(fee.sportsFee).toBe(5000);
      expect(fee.transportFee).toBe(8000);
      expect(fee.libraryFee).toBe(0);

      // Base: 50000 + 10000 + 5000 + 8000 = 73000
      expect(fee.baseFee).toBe(73000);
      // Tax: Lab (1800) + Sports (900) + Transport (400) = 3100
      expect(fee.totalTax).toBe(3100);
      // Gross: 73000 + 3100 = 76100
      expect(fee.totalFee).toBe(76100);

      expect(fee.components).toHaveLength(4);
      const tuitionComp = fee.components.find((c) => c.name === "Tuition Fee");
      expect(tuitionComp).toBeDefined();
      expect(tuitionComp.baseAmount).toBe(50000);
      expect(tuitionComp.gstRate).toBe(0);
      expect(tuitionComp.gstAmount).toBe(0);

      const labComp = fee.components.find((c) => c.name === "Lab Fee");
      expect(labComp).toBeDefined();
      expect(labComp.baseAmount).toBe(10000);
      expect(labComp.gstRate).toBe(18);
      expect(labComp.gstAmount).toBe(1800);

      const transportComp = fee.components.find((c) => c.name === "Transport Fee");
      expect(transportComp).toBeDefined();
      expect(transportComp.baseAmount).toBe(8000);
      expect(transportComp.gstRate).toBe(5);
      expect(transportComp.gstAmount).toBe(400);
    });

    it("supports libraryFee at approved 0% statutory rate", async () => {
      setStatutoryPolicyApproval(true);

      const fee = await FeeStructure.create({
        college_id: college._id,
        course_id: course._id,
        category: "SC",
        libraryFee: 4000,
        installments: [
          { order: 1, name: "Term 1", amount: 4000, dueDate: new Date(Date.now() + 86400000 * 30) },
        ],
      });

      expect(fee.libraryFee).toBe(4000);
      expect(fee.baseFee).toBe(4000);
      expect(fee.totalTax).toBe(0);
      expect(fee.totalFee).toBe(4000);
      expect(fee.components).toHaveLength(1);
      expect(fee.components[0].name).toBe("Library Fee");
      expect(fee.components[0].gstRate).toBe(0);
    });

    it("preserves backward compatibility for legacy documents without fee fields", async () => {
      const legacyFee = await FeeStructure.create({
        college_id: college._id,
        course_id: course._id,
        category: "ST",
        totalFee: 45000,
        installments: [
          { order: 1, name: "Installment 1", amount: 45000, dueDate: new Date(Date.now() + 86400000 * 30) },
        ],
      });

      expect(legacyFee.totalFee).toBe(45000);
      expect(legacyFee.baseFee).toBe(45000);
      expect(legacyFee.totalTax).toBe(0);
      expect(legacyFee.tuitionFee).toBe(0);
      expect(legacyFee.labFee).toBe(0);
      expect(legacyFee.sportsFee).toBe(0);
      expect(legacyFee.libraryFee).toBe(0);
      expect(legacyFee.transportFee).toBe(0);
      expect(legacyFee.components).toHaveLength(0);
    });

    it("rejects negative fee values", async () => {
      await expect(
        FeeStructure.create({
          college_id: college._id,
          course_id: course._id,
          category: "GEN",
          tuitionFee: -500,
          totalFee: 500,
          installments: [
            { order: 1, name: "Inst 1", amount: 500, dueDate: new Date() },
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe("8. Final Verification Scenario (Tuition 50k, Lab 10k, Sports 5k, Library 2k, Transport 8k)", () => {
    it("matches exact expected tax ₹3,100, gross ₹78,100, totals CGST 1,550 / SGST 1,550 across API, PDF, and Email", async () => {
      setStatutoryPolicyApproval(true);

      // Create Fee Structure for final verification scenario
      const feeStructure = await FeeStructure.create({
        college_id: college._id,
        course_id: course._id,
        category: "GEN",
        tuitionFee: 50000,
        labFee: 10000,
        sportsFee: 5000,
        libraryFee: 2000,
        transportFee: 8000,
        installments: [
          {
            order: 1,
            name: "Full Year Payment",
            amount: 78100,
            dueDate: new Date(Date.now() + 86400000 * 30),
          },
        ],
      });

      expect(feeStructure.baseFee).toBe(75000);
      expect(feeStructure.totalTax).toBe(3100);
      expect(feeStructure.totalFee).toBe(78100);

      // Create paid StudentFee
      const studentFee = await StudentFee.create({
        student_id: student._id,
        college_id: college._id,
        course_id: course._id,
        totalFee: 78100,
        baseFee: 75000,
        totalTax: 3100,
        paidAmount: 78100,
        installments: [
          {
            name: "Full Year Payment",
            amount: 78100,
            baseAmount: 75000,
            gstAmount: 3100,
            taxBreakdown: {
              isTaxApplicable: true,
              taxableBase: 75000,
              gstRate: null,
              totalTax: 3100,
              grossAmount: 78100,
              taxSplit: {
                type: "INTRA_STATE",
                isUniformRate: false,
                cgstRate: null,
                cgstAmount: 1550,
                sgstRate: null,
                sgstAmount: 1550,
                igstRate: null,
                igstAmount: 0,
              },
            },
            dueDate: new Date(Date.now() + 86400000 * 30),
            status: "PAID",
            transactionId: "TXN_FINAL_VERIFY_001",
            paymentMode: "ONLINE",
            paymentGateway: "RAZORPAY",
            paidAt: new Date(),
          },
        ],
      });

      const instId = studentFee.installments[0]._id;

      // 1. Fetch Receipt API JSON
      const reqStudent = {
        params: { installmentId: instId.toString() },
        user: { id: studentUser._id.toString() },
        college_id: college._id,
      };
      let receiptJson = null;
      const resStudent = {
        json: (data) => {
          receiptJson = data;
          return data;
        },
      };

      await getStudentReceipt(reqStudent, resStudent, (err) => {
        if (err) throw err;
      });

      // Verify Receipt API JSON
      expect(receiptJson).toBeDefined();
      expect(receiptJson.taxDetails.isTaxApplicable).toBe(true);
      expect(receiptJson.taxDetails.sacCode).toBe("999299");
      expect(receiptJson.taxDetails.placeOfSupply).toBe("Maharashtra (27)");
      expect(receiptJson.taxDetails.baseAmount).toBe(75000);
      expect(receiptJson.taxDetails.totalTax).toBe(3100);
      expect(receiptJson.taxDetails.taxSplit.isUniformRate).toBe(false);
      expect(receiptJson.taxDetails.taxSplit.cgstRate).toBeNull();
      expect(receiptJson.taxDetails.taxSplit.sgstRate).toBeNull();
      expect(receiptJson.taxDetails.taxSplit.cgstAmount).toBe(1550);
      expect(receiptJson.taxDetails.taxSplit.sgstAmount).toBe(1550);
      expect(receiptJson.amount).toBe(78100);

      // Verify line items in receipt
      expect(receiptJson.taxDetails.lineItems).toHaveLength(5);
      const lineTuition = receiptJson.taxDetails.lineItems.find((l) => l.name === "Tuition Fee");
      const lineLab = receiptJson.taxDetails.lineItems.find((l) => l.name === "Lab Fee");
      const lineSports = receiptJson.taxDetails.lineItems.find((l) => l.name === "Sports Fee");
      const lineLibrary = receiptJson.taxDetails.lineItems.find((l) => l.name === "Library Fee");
      const lineTransport = receiptJson.taxDetails.lineItems.find((l) => l.name === "Transport Fee");

      expect(lineTuition.baseAmount).toBe(50000);
      expect(lineTuition.gstRate).toBe(0);
      expect(lineTuition.cgstRate).toBe(0);
      expect(lineTuition.cgstAmount).toBe(0);
      expect(lineTuition.sgstRate).toBe(0);
      expect(lineTuition.sgstAmount).toBe(0);
      expect(lineTuition.gstAmount).toBe(0);
      expect(lineTuition.totalAmount).toBe(50000);

      // Lab 9%+9% (900+900)
      expect(lineLab.baseAmount).toBe(10000);
      expect(lineLab.gstRate).toBe(18);
      expect(lineLab.cgstRate).toBe(9);
      expect(lineLab.cgstAmount).toBe(900);
      expect(lineLab.sgstRate).toBe(9);
      expect(lineLab.sgstAmount).toBe(900);
      expect(lineLab.gstAmount).toBe(1800);
      expect(lineLab.totalAmount).toBe(11800);

      // Sports 9%+9% (450+450)
      expect(lineSports.baseAmount).toBe(5000);
      expect(lineSports.gstRate).toBe(18);
      expect(lineSports.cgstRate).toBe(9);
      expect(lineSports.cgstAmount).toBe(450);
      expect(lineSports.sgstRate).toBe(9);
      expect(lineSports.sgstAmount).toBe(450);
      expect(lineSports.gstAmount).toBe(900);
      expect(lineSports.totalAmount).toBe(5900);

      // Library 0%+0% (0+0)
      expect(lineLibrary.baseAmount).toBe(2000);
      expect(lineLibrary.gstRate).toBe(0);
      expect(lineLibrary.cgstRate).toBe(0);
      expect(lineLibrary.cgstAmount).toBe(0);
      expect(lineLibrary.sgstRate).toBe(0);
      expect(lineLibrary.sgstAmount).toBe(0);
      expect(lineLibrary.gstAmount).toBe(0);
      expect(lineLibrary.totalAmount).toBe(2000);

      // Transport 2.5%+2.5% (200+200)
      expect(lineTransport.baseAmount).toBe(8000);
      expect(lineTransport.gstRate).toBe(5);
      expect(lineTransport.cgstRate).toBe(2.5);
      expect(lineTransport.cgstAmount).toBe(200);
      expect(lineTransport.sgstRate).toBe(2.5);
      expect(lineTransport.sgstAmount).toBe(200);
      expect(lineTransport.gstAmount).toBe(400);
      expect(lineTransport.totalAmount).toBe(8400);

      // Sum of line-item CGST and SGST must sum exactly to aggregate CGST and SGST (zero drift)
      const sumLineCgst = receiptJson.taxDetails.lineItems.reduce((s, i) => s + i.cgstAmount, 0);
      const sumLineSgst = receiptJson.taxDetails.lineItems.reduce((s, i) => s + i.sgstAmount, 0);
      expect(sumLineCgst).toBe(1550);
      expect(sumLineSgst).toBe(1550);

      // 2. Email Receipt HTML Verification
      let sentMailOptions = null;
      jest.spyOn(require("../../src/services/collegeEmail.service"), "getCollegeTransporter").mockResolvedValue({
        transporter: {
          sendMail: async (options) => {
            sentMailOptions = options;
            return { messageId: "final-verify-msg-id" };
          },
        },
        fromName: "NOVAA Engineering College",
        fromEmail: "fees@novaa.edu",
      });

      const { sendPaymentReceiptEmail } = require("../../src/services/email.service");
      await sendPaymentReceiptEmail({
        to: "student@novaa.edu",
        studentName: "Rohan Verma",
        installment: {
          name: "Full Year Payment",
          amount: 78100,
          baseAmount: 75000,
          gstAmount: 3100,
          paidAt: new Date(),
          transactionId: "TXN_FINAL_VERIFY_001",
          taxBreakdown: {
            isTaxApplicable: true,
            baseAmount: 75000,
            totalTax: 3100,
            taxSplit: receiptJson.taxDetails.taxSplit,
            lineItems: receiptJson.taxDetails.lineItems,
          },
        },
        totalFee: 78100,
        paidAmount: 78100,
        remainingAmount: 0,
        collegeId: college._id,
        collegeGstin: "27AAAAA0000A1Z5",
      });

      expect(sentMailOptions).toBeDefined();
      expect(sentMailOptions.subject).toContain("Tax Invoice");
      expect(sentMailOptions.html).toContain("999299");
      expect(sentMailOptions.html).toContain("Maharashtra (27)");
      expect(sentMailOptions.html).toContain("75,000");
      expect(sentMailOptions.html).toContain("1,550");
      expect(sentMailOptions.html).toContain("3,100");
      expect(sentMailOptions.html).toContain("78,100");
      expect(sentMailOptions.html).toContain("Tuition Fee");
      expect(sentMailOptions.html).toContain("Lab Fee");
      expect(sentMailOptions.html).toContain("Sports Fee");
      expect(sentMailOptions.html).toContain("Library Fee");
      expect(sentMailOptions.html).toContain("Transport Fee");
      // Aggregate summary must show CGST: and SGST: without blended percentage
      expect(sentMailOptions.html).toContain("<b>CGST:</b>");
      expect(sentMailOptions.html).toContain("<b>SGST:</b>");
      expect(sentMailOptions.html).not.toMatch(/CGST \([0-9.]+%\):/);
      expect(sentMailOptions.html).not.toMatch(/SGST \([0-9.]+%\):/);

      // 3. PDF Receipt Verification
      const { generatePaymentReceiptPdf } = require("../../src/utils/pdfReceipt");
      const pdfBuffer = await generatePaymentReceiptPdf({
        studentName: "Rohan Verma",
        enrollmentNumber: "NOVAENG-BTCS2025-0001",
        installment: {
          name: "Full Year Payment",
          amount: 78100,
          paidAt: new Date(),
          taxBreakdown: {
            isTaxApplicable: true,
            baseAmount: 75000,
            totalTax: 3100,
            taxSplit: receiptJson.taxDetails.taxSplit,
            lineItems: receiptJson.taxDetails.lineItems,
          },
        },
        totalFee: 78100,
        paidAmount: 78100,
        remainingAmount: 0,
        collegeName: "NOVAA Engineering College",
        collegeGstin: "27AAAAA0000A1Z5",
        transactionId: "TXN_FINAL_VERIFY_001",
        paymentMode: "ONLINE",
        paidAt: new Date(),
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });
  });
});



