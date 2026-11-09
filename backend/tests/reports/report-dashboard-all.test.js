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

describe("GET /api/reports/dashboard/all — Payment Summary & Student Fee Integrity", () => {
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
      code: "RPT001",
      name: "Report Test College",
      email: "report.college@test.com",
    });

    admin = await createUser({
      email: "report.admin@test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    department = await Department.create({
      college_id: college._id,
      name: "Computer Science",
      code: "CSE",
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
      name: "B.Tech Computer Science",
      code: "BT-CSE",
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

  it("returns paymentSummary all zeros and studentPaymentStatus === [] when approved students exist but NO fee records exist", async () => {
    // Create 3 APPROVED students without any StudentFee records
    await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Alice Sharma",
      email: "alice@test.com",
      status: "APPROVED",
    });

    await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Bob Patel",
      email: "bob@test.com",
      status: "APPROVED",
    });

    await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Charlie Verma",
      email: "charlie@test.com",
      status: "APPROVED",
    });

    const res = await agent
      .get("/api/reports/dashboard/all")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Admission summary reflects approved students
    expect(res.body.data.admissionSummary.approved).toBe(3);
    expect(res.body.data.admissionSummary.totalApplications).toBe(3);

    // Payment summary must be all zeros
    const { paymentSummary, studentPaymentStatus } = res.body.data;
    expect(paymentSummary.totalExpectedFee).toBe(0);
    expect(paymentSummary.totalCollected).toBe(0);
    expect(paymentSummary.totalPending).toBe(0);
    expect(paymentSummary.collectionRate).toBe(0);
    expect(paymentSummary.totalStudents).toBe(0);
    expect(paymentSummary.barChartData).toEqual([
      { name: "Collected", amount: 0, color: "#28a745" },
      { name: "Pending", amount: 0, color: "#dc3545" },
    ]);

    // studentPaymentStatus MUST be empty — NO fabricated 50000 fallback fees
    expect(studentPaymentStatus).toEqual([]);
    expect(studentPaymentStatus.length).toBe(0);
  });

  it("returns matching paymentSummary and studentPaymentStatus when real fee records exist", async () => {
    const student1 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Dana Gupta",
      email: "dana@test.com",
      status: "ENROLLED",
    });

    const student2 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Evan Kumar",
      email: "evan@test.com",
      status: "ENROLLED",
    });

    // Create fee for Student 1: total 60000, paid 40000 (pending 20000, PARTIAL)
    await StudentFee.create({
      college_id: college._id,
      student_id: student1._id,
      course_id: course._id,
      totalFee: 60000,
      paidAmount: 40000,
      paymentStatus: "PARTIAL",
      installments: [
        { name: "Installment 1", amount: 40000, status: "PAID", paidDate: new Date(), dueDate: new Date() },
        { name: "Installment 2", amount: 20000, status: "PENDING", dueDate: new Date(Date.now() + 86400000 * 30) },
      ],
    });

    // Create fee for Student 2: total 40000, paid 40000 (pending 0, PAID)
    await StudentFee.create({
      college_id: college._id,
      student_id: student2._id,
      course_id: course._id,
      totalFee: 40000,
      paidAmount: 40000,
      paymentStatus: "PAID",
      installments: [
        { name: "Installment 1", amount: 40000, status: "PAID", paidDate: new Date(), dueDate: new Date() },
      ],
    });

    const res = await agent
      .get("/api/reports/dashboard/all")
      .expect(200);

    expect(res.body.success).toBe(true);
    const { paymentSummary, studentPaymentStatus } = res.body.data;

    // Payment summary values
    expect(paymentSummary.totalExpectedFee).toBe(100000);
    expect(paymentSummary.totalCollected).toBe(80000);
    expect(paymentSummary.totalPending).toBe(20000);
    expect(paymentSummary.collectionRate).toBe(80);
    expect(paymentSummary.totalStudents).toBe(2);

    // studentPaymentStatus values
    expect(studentPaymentStatus.length).toBe(2);

    const s1Record = studentPaymentStatus.find((s) => s.studentId === student1._id.toString());
    expect(s1Record).toBeDefined();
    expect(s1Record.name).toBe("Dana Gupta");
    expect(s1Record.totalFee).toBe(60000);
    expect(s1Record.paid).toBe(40000);
    expect(s1Record.pending).toBe(20000);
    expect(s1Record.status).toBe("PARTIAL");

    const s2Record = studentPaymentStatus.find((s) => s.studentId === student2._id.toString());
    expect(s2Record).toBeDefined();
    expect(s2Record.name).toBe("Evan Kumar");
    expect(s2Record.totalFee).toBe(40000);
    expect(s2Record.paid).toBe(40000);
    expect(s2Record.pending).toBe(0);
    expect(s2Record.status).toBe("PAID");

    // Reconcile table sum with summary cards
    const tableTotalFee = studentPaymentStatus.reduce((sum, s) => sum + s.totalFee, 0);
    const tableTotalPaid = studentPaymentStatus.reduce((sum, s) => sum + s.paid, 0);
    const tableTotalPending = studentPaymentStatus.reduce((sum, s) => sum + s.pending, 0);

    expect(tableTotalFee).toBe(paymentSummary.totalExpectedFee);
    expect(tableTotalPaid).toBe(paymentSummary.totalCollected);
    expect(tableTotalPending).toBe(paymentSummary.totalPending);
  });

  it("filters studentPaymentStatus by status query param without affecting summary cards", async () => {
    const student1 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Frank Castle",
      status: "ENROLLED",
    });

    const student2 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "Grace Hopper",
      status: "ENROLLED",
    });

    await StudentFee.create({
      college_id: college._id,
      student_id: student1._id,
      course_id: course._id,
      totalFee: 50000,
      paidAmount: 20000,
      paymentStatus: "PARTIAL",
    });

    await StudentFee.create({
      college_id: college._id,
      student_id: student2._id,
      course_id: course._id,
      totalFee: 30000,
      paidAmount: 30000,
      paymentStatus: "PAID",
    });

    // Request filter for PAID only
    const res = await agent
      .get("/api/reports/dashboard/all?status=PAID")
      .expect(200);

    const { paymentSummary, studentPaymentStatus } = res.body.data;

    // Summary cards reflect entire college fee totals
    expect(paymentSummary.totalExpectedFee).toBe(80000);
    expect(paymentSummary.totalCollected).toBe(50000);
    expect(paymentSummary.totalPending).toBe(30000);

    // studentPaymentStatus table is filtered to only PAID
    expect(studentPaymentStatus.length).toBe(1);
    expect(studentPaymentStatus[0].name).toBe("Grace Hopper");
    expect(studentPaymentStatus[0].status).toBe("PAID");
  });
});
