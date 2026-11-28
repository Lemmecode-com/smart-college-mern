const request = require("supertest");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const { createCollege, createUser, createStudent } = require("../helpers/factories");
const app = require("../../app");

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const FeeStructure = require("../../src/models/feeStructure.model");
const Document = require("../../src/models/document.model");
const DocumentConfig = require("../../src/models/documentConfig.model");
const CollegeEmailConfig = require("../../src/models/collegeEmailConfig.model");
const Student = require("../../src/models/student.model");
const User = require("../../src/models/user.model");
const ParentGuardian = require("../../src/models/parentGuardian.model");

describe("ADMISSION WORKFLOW — Manager Verification Test Suite", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ── 1. Setup-complete fails with SETUP_INCOMPLETE when a prerequisite is missing ──
  it("1. Setup-complete fails with SETUP_INCOMPLETE when a prerequisite is missing", async () => {
    const college = await createCollege({ code: "pcheck", name: "Prereq College" });
    const admin = await createUser({
      email: "admin@prereq.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: admin.email, password: "Test@123" }).expect(200);

    // Call setup-complete before departments/courses/fees/email exist
    const res = await agent.post("/api/college/setup-complete").send({}).expect(400);

    expect(res.body.error.code).toBe("SETUP_INCOMPLETE");
    expect(res.body.error.message).toMatch(/Cannot finish setup. Please complete:/);
  });

  // ── 2. Duplicate email registration gives DUPLICATE_EMAIL ──
  it("2. Duplicate email registration gives DUPLICATE_EMAIL", async () => {
    const college = await createCollege({ code: "dupcol", name: "Duplicate Test College" });
    const admin = await createUser({
      email: "admin@dup.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const dept = await Department.create({
      college_id: college._id,
      name: "Computer Science",
      code: "CSD",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const course = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "B.Tech CS",
      code: "BTCS",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 60,
      yearLabels: ["Year 1"],
      createdBy: admin._id,
    });

    // Register first student
    await request(app)
      .post(`/api/students/register/${college.code}`)
      .field("fullName", "First Student")
      .field("email", "same.email@test.com")
      .field("password", "Pass@123456")
      .field("mobileNumber", "9876543210")
      .field("gender", "Male")
      .field("dateOfBirth", "2005-01-01")
      .field("addressLine", "123 Main St")
      .field("city", "Mumbai")
      .field("state", "Maharashtra")
      .field("pincode", "400001")
      .field("department_id", dept._id.toString())
      .field("course_id", course._id.toString())
      .field("admissionYear", 2026)
      .field("currentSemester", 1)
      .field("category", "GEN")
      .expect(201);

    // Register second student with same email
    const res = await request(app)
      .post(`/api/students/register/${college.code}`)
      .field("fullName", "Second Student")
      .field("email", "same.email@test.com")
      .field("password", "Pass@123456")
      .field("mobileNumber", "9876543211")
      .field("gender", "Female")
      .field("dateOfBirth", "2005-02-02")
      .field("addressLine", "456 Side St")
      .field("city", "Mumbai")
      .field("state", "Maharashtra")
      .field("pincode", "400001")
      .field("department_id", dept._id.toString())
      .field("course_id", course._id.toString())
      .field("admissionYear", 2026)
      .field("currentSemester", 1)
      .field("category", "GEN")
      .expect(409);

    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  // ── 3. Approve without verified documents gives DOCUMENTS_NOT_VERIFIED ──
  it("3. Approve without verified documents gives DOCUMENTS_NOT_VERIFIED", async () => {
    const college = await createCollege({ code: "docg", name: "Doc Gate College" });
    const admin = await createUser({
      email: "admin@docg.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const dept = await Department.create({
      college_id: college._id,
      name: "Science",
      code: "SCI",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const course = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "B.Sc",
      code: "BSC",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 6,
      durationYears: 3,
      credits: 120,
      maxStudents: 50,
      yearLabels: ["Year 1"],
      createdBy: admin._id,
    });

    await FeeStructure.create({
      college_id: college._id,
      course_id: course._id,
      category: "GEN",
      academicYear: "2026-2027",
      totalFee: 50000,
      installments: [{ name: "T1", amount: 50000, dueDate: new Date("2026-08-01"), order: 1 }],
    });

    // Configure mandatory document
    await DocumentConfig.create({
      college_id: college._id,
      collegeCode: college.code,
      isActive: true,
      documents: [
        { type: "10th_marksheet", label: "10th Marksheet", enabled: true, mandatory: true, allowedFormats: ["pdf"], maxFileSize: 5, order: 1 },
      ],
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: dept._id,
      course_id: course._id,
      fullName: "Unverified Student",
      email: "unverified@test.com",
      status: "PENDING",
      admissionYear: 2026,
      currentSemester: 1,
    });

    // Create unverified document
    const doc = await Document.create({
      ownerType: "Student",
      ownerId: student._id,
      documentType: "10th_marksheet",
      storageKey: `sk-doc-${Date.now()}`,
      provider: "test",
      originalFileName: "10th.pdf",
      mimeType: "application/pdf",
      size: 1024,
      uploadedBy: student._id,
      status: "ACTIVE",
      verificationStatus: "PENDING",
    });

    await Student.findByIdAndUpdate(student._id, { documentRefs: [{ documentId: doc.documentId, documentType: "10th_marksheet" }] });

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: admin.email, password: "Test@123" }).expect(200);

    const res = await agent.put(`/api/students/${student._id}/approve`).expect(400);
    expect(res.body.error.code).toBe("DOCUMENTS_NOT_VERIFIED");
  });

  // ── 4. Approve without fee structure gives FEE_STRUCTURE_NOT_FOUND ──
  it("4. Approve without fee structure gives FEE_STRUCTURE_NOT_FOUND", async () => {
    const college = await createCollege({ code: "nofee", name: "No Fee College" });
    const admin = await createUser({
      email: "admin@nofee.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const dept = await Department.create({
      college_id: college._id,
      name: "Arts",
      code: "ART",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const course = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "BA",
      code: "BA",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 6,
      durationYears: 3,
      credits: 120,
      maxStudents: 50,
      yearLabels: ["Year 1"],
      createdBy: admin._id,
    });

    // Student has no fee structure created
    const student = await createStudent({
      college_id: college._id,
      department_id: dept._id,
      course_id: course._id,
      fullName: "No Fee Student",
      email: "nofee@test.com",
      status: "PENDING",
      category: "GEN",
      admissionYear: 2026,
      currentSemester: 1,
    });

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: admin.email, password: "Test@123" }).expect(200);

    const res = await agent.put(`/api/students/${student._id}/approve`).expect(404);
    expect(res.body.error.code).toBe("FEE_STRUCTURE_NOT_FOUND");
    expect(res.body.error.message).toMatch(/No fee structure found for BA/);
  });

  // ── 5. Approve when course is full gives CAPACITY_REACHED ──
  it("5. Approve when course is full gives CAPACITY_REACHED", async () => {
    const college = await createCollege({ code: "capcol", name: "Capacity Test College" });
    const admin = await createUser({
      email: "admin@cap.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const dept = await Department.create({
      college_id: college._id,
      name: "Engineering",
      code: "ENG",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    // Course with capacity = 1
    const course = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "B.Tech Robotics",
      code: "BTR",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 1, // Only 1 seat!
      yearLabels: ["Year 1"],
      createdBy: admin._id,
    });

    await FeeStructure.create({
      college_id: college._id,
      course_id: course._id,
      category: "GEN",
      academicYear: "2026-2027",
      totalFee: 80000,
      installments: [{ name: "T1", amount: 80000, dueDate: new Date("2026-08-01"), order: 1 }],
    });

    // Fill the 1 seat with an APPROVED student
    await createStudent({
      college_id: college._id,
      department_id: dept._id,
      course_id: course._id,
      fullName: "Student In Seat",
      email: "seated@test.com",
      status: "APPROVED",
      admissionYear: 2026,
      currentSemester: 1,
      enrollmentNumber: "CAP-BTR2026-0001",
    });

    // Second student trying to get approved
    const pendingStudent = await createStudent({
      college_id: college._id,
      department_id: dept._id,
      course_id: course._id,
      fullName: "Blocked Student",
      email: "blocked@test.com",
      status: "PENDING",
      category: "GEN",
      admissionYear: 2026,
      currentSemester: 1,
    });

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: admin.email, password: "Test@123" }).expect(200);

    const res = await agent.put(`/api/students/${pendingStudent._id}/approve`).expect(409);
    expect(res.body.error.code).toBe("CAPACITY_REACHED");
    expect(res.body.error.message).toMatch(/Admission capacity reached/);
  });

  // ── 6. Confirm enrollment without division gives DIVISION_NOT_ASSIGNED ──
  it("6. Confirm enrollment without division gives DIVISION_NOT_ASSIGNED", async () => {
    const college = await createCollege({ code: "divcol", email: "divcol@test.com", name: "Div College" });
    const admin = await createUser({
      email: "admin@div.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const dept = await Department.create({
      college_id: college._id,
      name: "Eng",
      code: "ENGD",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const course = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "BE",
      code: "BE",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 60,
      yearLabels: ["Year 1"],
      createdBy: admin._id,
    });

    const approvedStudent = await createStudent({
      college_id: college._id,
      department_id: dept._id,
      course_id: course._id,
      fullName: "No Div Student",
      email: "nodiv@test.com",
      status: "APPROVED",
      division: null,
      enrollmentNumber: "DIV-TEST-0001",
    });

    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: admin.email, password: "Test@123" }).expect(200);

    const res = await agent.put(`/api/students/${approvedStudent._id}/confirm-enrollment`).expect(400);
    expect(res.body.error.code).toBe("DIVISION_NOT_ASSIGNED");
    expect(res.body.error.message).toMatch(/Student must have a division assigned before enrollment/);
  });

  // ── 7. A College A admin cannot access College B's student ──
  it("7. College A admin cannot access College B's student (Tenant Isolation)", async () => {
    const collegeA = await createCollege({ code: "cola", email: "cola@test.com", name: "College A" });
    const collegeB = await createCollege({ code: "colb", email: "colb@test.com", name: "College B" });

    const adminA = await createUser({
      email: "admin@cola.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: collegeA._id,
      isActive: true,
    });

    const deptB = await Department.create({
      college_id: collegeB._id,
      name: "Eng B",
      code: "ENGB",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: adminA._id,
    });

    const courseB = await Course.create({
      college_id: collegeB._id,
      department_id: deptB._id,
      name: "BE B",
      code: "BEB",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 60,
      yearLabels: ["Year 1"],
      createdBy: adminA._id,
    });

    const studentB = await createStudent({
      college_id: collegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      fullName: "Student in College B",
      email: "studentb@test.com",
      status: "PENDING",
    });

    const agentA = request.agent(app);
    await agentA.post("/api/auth/login").send({ email: adminA.email, password: "Test@123" }).expect(200);

    // Admin A tries to approve Student of College B -> 404 STUDENT_NOT_FOUND (scoped by college_id)
    const res = await agentA.put(`/api/students/${studentB._id}/approve`).expect(404);
    expect(res.body.error.code).toBe("STUDENT_NOT_FOUND");
  });

  // ── 8. Happy path: register, verify docs, approve, assign division, enroll, parent account created ──
  it("8. Happy path: register, verify docs, approve, assign division, enroll, parent account created", async () => {
    const college = await createCollege({ code: "hpcol", email: "hpcol@test.com", name: "Happy Path College" });
    const admin = await createUser({
      email: "admin@hp.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });

    const dept = await Department.create({
      college_id: college._id,
      name: "Information Technology",
      code: "IT",
      type: "ACADEMIC",
      status: "ACTIVE",
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const course = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: "B.Tech IT",
      code: "IT",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 60,
      yearLabels: ["Year 1"],
      createdBy: admin._id,
    });

    await FeeStructure.create({
      college_id: college._id,
      course_id: course._id,
      category: "GEN",
      academicYear: "2026-2027",
      totalFee: 90000,
      installments: [
        { name: "Term 1", amount: 50000, dueDate: new Date("2026-08-01"), order: 1 },
        { name: "Term 2", amount: 40000, dueDate: new Date("2026-12-01"), order: 2 },
      ],
    });

    await DocumentConfig.create({
      college_id: college._id,
      collegeCode: college.code,
      isActive: true,
      documents: [
        { type: "10th_marksheet", label: "10th Marksheet", enabled: true, mandatory: true, allowedFormats: ["pdf"], maxFileSize: 5, order: 1 },
      ],
    });

    // 1. Student Registers
    const regRes = await request(app)
      .post(`/api/students/register/${college.code}`)
      .field("fullName", "Rohan Sharma")
      .field("email", "rohan.sharma@test.com")
      .field("password", "Secure@1234")
      .field("mobileNumber", "9876543210")
      .field("gender", "Male")
      .field("dateOfBirth", "2005-05-15")
      .field("addressLine", "74 Park Avenue")
      .field("city", "Pune")
      .field("state", "Maharashtra")
      .field("pincode", "411001")
      .field("department_id", dept._id.toString())
      .field("course_id", course._id.toString())
      .field("admissionYear", 2026)
      .field("currentSemester", 1)
      .field("category", "GEN")
      .field("fatherName", "Rajesh Sharma")
      .field("fatherEmail", "rajesh.sharma@test.com")
      .field("fatherMobile", "9822001122")
      .attach("sscMarksheet", Buffer.from("%PDF-1.4 test file"), "10th.pdf")
      .expect(201);

    expect(regRes.body.success).toBe(true);

    const createdStudent = await Student.findOne({ email: "rohan.sharma@test.com" });
    expect(createdStudent).toBeDefined();
    expect(createdStudent.status).toBe("PENDING");
    expect(createdStudent.documentRefs.length).toBeGreaterThan(0);

    const docId = createdStudent.documentRefs[0].documentId;

    // 2. Admin Logs in
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: admin.email, password: "Test@123" }).expect(200);

    // 3. Admin Verifies Document
    const verifyRes = await agent
      .put(`/api/students/${createdStudent._id}/documents/${docId}/verify`)
      .expect(200);
    expect(verifyRes.body.data.verificationStatus).toBe("VERIFIED");

    // 4. Admin Approves Student
    const approveRes = await agent
      .put(`/api/students/${createdStudent._id}/approve`)
      .expect(200);

    expect(approveRes.body.student.status).toBe("APPROVED");
    expect(approveRes.body.student.enrollmentNumber).toMatch(/^hpcol-IT2026-0001$/);

    // 5. Assign Division (Section A)
    await Student.findByIdAndUpdate(createdStudent._id, { division: "A" });

    // 6. Confirm Enrollment
    const enrollRes = await agent
      .put(`/api/students/${createdStudent._id}/confirm-enrollment`)
      .expect(200);

    const enrolledStudent = await Student.findById(createdStudent._id);
    expect(enrolledStudent.status).toBe("ENROLLED");
    expect(enrolledStudent.division).toBe("A");

    // 7. Verify Parent Account Created Automatically
    const parentUser = await User.findOne({ email: "rajesh.sharma@test.com" });
    expect(parentUser).toBeDefined();
    expect(parentUser.role).toBe("PARENT_GUARDIAN");
    expect(parentUser.name).toBe("Rajesh Sharma");

    const parentGuardian = await ParentGuardian.findOne({ user_id: parentUser._id });
    expect(parentGuardian).toBeDefined();
    expect(parentGuardian.student_ids.map(id => id.toString())).toContain(createdStudent._id.toString());
    expect(parentGuardian.relation).toBe("father");
  });
});
