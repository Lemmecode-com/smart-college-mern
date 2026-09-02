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
  createStudent,
} = require("../helpers/factories");
const app = require("../../app");

const Department = require("../../src/models/department.model");
const Course = require("../../src/models/course.model");
const FeeStructure = require("../../src/models/feeStructure.model");
const Document = require("../../src/models/document.model");
const DocumentConfig = require("../../src/models/documentConfig.model");
const Student = require("../../src/models/student.model");
const SecurityAudit = require("../../src/models/securityAudit.model");

/**
 * Shared fixtures for a college whose DocumentConfig marks 10th_marksheet and
 * 12th_marksheet as required (enabled + mandatory) and passport_photo as
 * optional. A PENDING student is created with one Document record per type,
 * all left in the default PENDING verification state.
 */
const buildFixtures = async () => {
  const college = await createCollege({
    code: "DVR",
    name: "Doc Verify College",
    email: "dv@test.com",
  });

  const admin = await createUser({
    email: "admin@dv.test.com",
    password: "Test@123",
    role: "COLLEGE_ADMIN",
    college_id: college._id,
    isActive: true,
  });

  const department = await Department.create({
    college_id: college._id,
    name: "Computer Science",
    code: "CSE",
    type: "ACADEMIC",
    status: "ACTIVE",
    hod_id: null,
    programsOffered: ["UG"],
    startYear: 2024,
    sanctionedFacultyCount: 5,
    sanctionedStudentIntake: 60,
    createdBy: admin._id,
  });

  const course = await Course.create({
    college_id: college._id,
    department_id: department._id,
    name: "B.Tech CSE",
    code: "CSE",
    type: "THEORY",
    status: "ACTIVE",
    programLevel: "UG",
    durationSemesters: 8,
    durationYears: 4,
    credits: 160,
    maxStudents: 120,
    yearLabels: ["Year 1", "Year 2", "Year 3", "Year 4"],
    createdBy: admin._id,
  });

  const feeStructure = await FeeStructure.create({
    college_id: college._id,
    course_id: course._id,
    category: "GEN",
    academicYear: "2025-2026",
    totalFee: 100000,
    installments: [
      { name: "Admission", amount: 50000, dueDate: new Date("2025-07-15"), order: 1 },
    ],
  });

  await DocumentConfig.create({
    college_id: college._id,
    collegeCode: college.code,
    isActive: true,
    documents: [
      {
        type: "10th_marksheet",
        label: "10th Marksheet",
        enabled: true,
        mandatory: true,
        allowedFormats: ["pdf"],
        maxFileSize: 5,
        description: "",
        order: 1,
      },
      {
        type: "12th_marksheet",
        label: "12th Marksheet",
        enabled: true,
        mandatory: true,
        allowedFormats: ["pdf"],
        maxFileSize: 5,
        description: "",
        order: 2,
      },
      {
        type: "passport_photo",
        label: "Passport Photo",
        enabled: true,
        mandatory: false,
        allowedFormats: ["jpg", "png"],
        maxFileSize: 2,
        description: "",
        order: 3,
      },
    ],
  });

  const student = await createStudent({
    college_id: college._id,
    department_id: department._id,
    course_id: course._id,
    fullName: "Doc Verify Student",
    email: "docverify@test.com",
    status: "PENDING",
    admissionYear: 2025,
    currentSemester: 1,
    division: "A",
  });

  const docs = {};
  const documentRefs = [];
  const docDefs = [
    ["10th_marksheet", "ssc.pdf", "application/pdf"],
    ["12th_marksheet", "hsc.pdf", "application/pdf"],
    ["passport_photo", "photo.jpg", "image/jpeg"],
  ];

  for (const [type, name, mimeType] of docDefs) {
    const doc = await Document.create({
      ownerType: "Student",
      ownerId: student._id,
      documentType: type,
      storageKey: `sk-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: "test",
      originalFileName: name,
      mimeType,
      size: 1024,
      uploadedBy: admin._id,
      status: "ACTIVE",
    });
    docs[type] = doc;
    documentRefs.push({ documentId: doc.documentId, documentType: type });
  }

  await Student.findByIdAndUpdate(student._id, { documentRefs });

  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: admin.email, password: "Test@123" })
    .expect(200);

  return {
    college,
    admin,
    department,
    course,
    feeStructure,
    student,
    docs,
    documentRefs,
    agent,
  };
};

const loginAs = async (role, collegeId, email, password = "Test@123") => {
  const user = await createUser({
    email,
    password,
    role,
    college_id: collegeId,
    isActive: true,
  });
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);
  return { agent, user };
};

const waitForAudit = async (predicate, timeout = 3000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await SecurityAudit.findOne(predicate).sort({ createdAt: -1 }).lean();
    if (found) return found;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
};

describe("DOC-VERIFY — Student Document Verification Workflow", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it("1. College Admin can verify a Student document belonging to their college", async () => {
    const { agent, student, docs } = await buildFixtures();

    const res = await agent
      .put(
        `/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/verify`
      )
      .expect(200);

    expect(res.body.data.verificationStatus).toBe("VERIFIED");

    const doc = await Document.findOne({
      documentId: docs["10th_marksheet"].documentId,
    }).lean();
    expect(doc.verificationStatus).toBe("VERIFIED");
    expect(doc.verifiedBy).toBeDefined();
  });

  it("2. Non-College Admin cannot verify a document", async () => {
    const { student, docs, college } = await buildFixtures();
    const { agent } = await loginAs(
      "ACCOUNTANT",
      college._id,
      "acc@dv.test.com"
    );

    const res = await agent
      .put(
        `/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/verify`
      )
      .expect(403);

    expect(res.status).toBe(403);
  });

  it("3. College Admin cannot verify a document belonging to another college", async () => {
    const collegeA = await createCollege({ code: "DVRA", name: "A", email: "a@test.com" });
    const adminA = await createUser({
      email: "admina@dv.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: collegeA._id,
      isActive: true,
    });

    const collegeB = await createCollege({ code: "DVRB", name: "B", email: "b@test.com" });
    const deptB = await Department.create({
      college_id: collegeB._id,
      name: "CSE",
      code: "CSE",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: adminA._id,
    });
    const courseB = await Course.create({
      college_id: collegeB._id,
      department_id: deptB._id,
      name: "B.Tech",
      code: "CSE",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 120,
      yearLabels: ["Y1", "Y2", "Y3", "Y4"],
      createdBy: adminA._id,
    });
    const studentB = await createStudent({
      college_id: collegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      fullName: "Other College Student",
      email: "other@test.com",
      status: "PENDING",
      admissionYear: 2025,
      currentSemester: 1,
    });
    const docB = await Document.create({
      ownerType: "Student",
      ownerId: studentB._id,
      documentType: "10th_marksheet",
      storageKey: `sk-other-${Date.now()}`,
      provider: "test",
      originalFileName: "ssc.pdf",
      mimeType: "application/pdf",
      size: 1024,
      uploadedBy: adminA._id,
      status: "ACTIVE",
    });

    const agentA = request.agent(app);
    await agentA
      .post("/api/auth/login")
      .send({ email: adminA.email, password: "Test@123" })
      .expect(200);

    // Admin A (college A) attempting to verify a doc owned by college B's student.
    const res = await agentA
      .put(`/api/students/${studentB._id}/documents/${docB.documentId}/verify`)
      .expect(404);

    expect(res.body.error.code).toBe("STUDENT_NOT_FOUND");
  });

  it("4. Student cannot verify their own document", async () => {
    const { student, docs, college } = await buildFixtures();
    const { agent } = await loginAs("STUDENT", college._id, "stu@dv.test.com");

    await agent
      .put(
        `/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/verify`
      )
      .expect(403);
  });

  it("5. Teacher cannot verify Student documents", async () => {
    const { student, docs, college } = await buildFixtures();
    const { agent } = await loginAs("TEACHER", college._id, "tch@dv.test.com");

    await agent
      .put(
        `/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/verify`
      )
      .expect(403);
  });

  it("6. Invalid student/document relationship is rejected (doc not owned by student)", async () => {
    const fx = await buildFixtures();
    const otherStudent = await createStudent({
      college_id: fx.college._id,
      department_id: fx.department._id,
      course_id: fx.course._id,
      fullName: "Other Student Same College",
      email: "other2@test.com",
      status: "PENDING",
      admissionYear: 2025,
      currentSemester: 1,
    });

    // doc "10th_marksheet" belongs to fx.student, not otherStudent.
    const res = await fx.agent
      .put(
        `/api/students/${otherStudent._id}/documents/${fx.docs["10th_marksheet"].documentId}/verify`
      )
      .expect(404);

    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("7. Document verification updates only verification fields", async () => {
    const { agent, student, docs } = await buildFixtures();
    const doc = docs["10th_marksheet"];

    const before = await Document.findOne({ documentId: doc.documentId }).lean();
    const beforeFields = {
      documentType: before.documentType,
      originalFileName: before.originalFileName,
      mimeType: before.mimeType,
      size: before.size,
      storageKey: before.storageKey,
      provider: before.provider,
      checksum: before.checksum,
      uploadedBy: before.uploadedBy ? before.uploadedBy.toString() : null,
      ownerType: before.ownerType,
      ownerId: before.ownerId.toString(),
      status: before.status,
    };

    await agent
      .put(`/api/students/${student._id}/documents/${doc.documentId}/verify`)
      .expect(200);

    const after = await Document.findOne({ documentId: doc.documentId }).lean();
    const afterFields = {
      documentType: after.documentType,
      originalFileName: after.originalFileName,
      mimeType: after.mimeType,
      size: after.size,
      storageKey: after.storageKey,
      provider: after.provider,
      checksum: after.checksum,
      uploadedBy: after.uploadedBy ? after.uploadedBy.toString() : null,
      ownerType: after.ownerType,
      ownerId: after.ownerId.toString(),
      status: after.status,
    };

    expect(afterFields).toEqual(beforeFields);
    expect(after.verificationStatus).toBe("VERIFIED");
    expect(after.verifiedBy).toBeDefined();
    expect(after.verifiedAt).toBeDefined();
  });

  it("8. Existing Student.status remains unchanged after verification", async () => {
    const { agent, student, docs } = await buildFixtures();

    await agent
      .put(`/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/verify`)
      .expect(200);

    const updatedStudent = await Student.findById(student._id).lean();
    expect(updatedStudent.status).toBe("PENDING");
  });

  it("9. PENDING student with unverified required docs cannot be approved", async () => {
    const { agent, student } = await buildFixtures();

    const res = await agent
      .put(`/api/students/${student._id}/approve`)
      .expect(400);

    expect(res.body.error.code).toBe("DOCUMENTS_NOT_VERIFIED");

    const updatedStudent = await Student.findById(student._id).lean();
    expect(updatedStudent.status).toBe("PENDING");
  });

  it("10. PENDING student with all required docs verified can be approved", async () => {
    const { agent, student, docs } = await buildFixtures();

    // Verify both mandatory documents first.
    await agent
      .put(`/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/verify`)
      .expect(200);
    await agent
      .put(`/api/students/${student._id}/documents/${docs["12th_marksheet"].documentId}/verify`)
      .expect(200);

    const res = await agent
      .put(`/api/students/${student._id}/approve`)
      .expect(200);

    expect(res.body.student).toBeDefined();
    expect(res.body.student.status).toBe("APPROVED");

    const updatedStudent = await Student.findById(student._id).lean();
    expect(updatedStudent.status).toBe("APPROVED");
  });

  it("11. Existing PENDING -> REJECTED workflow remains working", async () => {
    const { agent, student } = await buildFixtures();

    const res = await agent
      .put(`/api/students/${student._id}/reject`)
      .send({ reason: "Insufficient documentation" })
      .expect(200);

    expect(res.body.student.status).toBe("REJECTED");
    expect(res.body.student.rejectionReason).toBe("Insufficient documentation");

    const updatedStudent = await Student.findById(student._id).lean();
    expect(updatedStudent.status).toBe("REJECTED");
  });

  it("12. Audit event is created for successful verification", async () => {
    const { agent, student, docs } = await buildFixtures();

    await agent
      .put(`/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/verify`)
      .expect(200);

    const audit = await waitForAudit({ eventType: "ADMIN_ACTION" });
    expect(audit).toBeDefined();
    expect(audit.metadata && audit.metadata.action).toBe("VERIFY_DOCUMENT");
    expect(audit.collegeId).toBeDefined();
  });

  it("13. Document rejection works with a reason and records rejection fields", async () => {
    const { agent, student, docs } = await buildFixtures();

    const res = await agent
      .put(`/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/reject`)
      .send({ reason: "Document is unclear" })
      .expect(200);

    expect(res.body.data.verificationStatus).toBe("REJECTED");
    expect(res.body.data.rejectionReason).toBe("Document is unclear");

    const doc = await Document.findOne({
      documentId: docs["10th_marksheet"].documentId,
    }).lean();
    expect(doc.verificationStatus).toBe("REJECTED");
    expect(doc.rejectionReason).toBe("Document is unclear");
    expect(doc.rejectedBy).toBeDefined();
    expect(doc.rejectedAt).toBeDefined();
  });

  it("13b. Document rejection without a reason is rejected (400)", async () => {
    const { agent, student, docs } = await buildFixtures();

    await agent
      .put(`/api/students/${student._id}/documents/${docs["10th_marksheet"].documentId}/reject`)
      .send({})
      .expect(400);
  });

  it("14. Student with no DocumentConfig (no required docs) can still be approved", async () => {
    const college = await createCollege({ code: "NOC", name: "No Config College", email: "noc@test.com" });
    const admin = await createUser({
      email: "admin@noc.test.com",
      password: "Test@123",
      role: "COLLEGE_ADMIN",
      college_id: college._id,
      isActive: true,
    });
    const department = await Department.create({
      college_id: college._id,
      name: "CSE",
      code: "CSE",
      type: "ACADEMIC",
      status: "ACTIVE",
      hod_id: null,
      programsOffered: ["UG"],
      startYear: 2024,
      sanctionedFacultyCount: 5,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });
    const course = await Course.create({
      college_id: college._id,
      department_id: department._id,
      name: "B.Tech CSE",
      code: "CSE",
      type: "THEORY",
      status: "ACTIVE",
      programLevel: "UG",
      durationSemesters: 8,
      durationYears: 4,
      credits: 160,
      maxStudents: 120,
      yearLabels: ["Y1", "Y2", "Y3", "Y4"],
      createdBy: admin._id,
    });
    await FeeStructure.create({
      college_id: college._id,
      course_id: course._id,
      category: "GEN",
      academicYear: "2025-2026",
      totalFee: 100000,
      installments: [
        { name: "Admission", amount: 50000, dueDate: new Date("2025-07-15"), order: 1 },
      ],
    });
    // Note: NO DocumentConfig created for this college.
    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      fullName: "No Config Student",
      email: "nocstudent@test.com",
      status: "PENDING",
      admissionYear: 2025,
      currentSemester: 1,
      division: "A",
    });

    const agent = request.agent(app);
    await agent
      .post("/api/auth/login")
      .send({ email: admin.email, password: "Test@123" })
      .expect(200);

    const res = await agent
      .put(`/api/students/${student._id}/approve`)
      .expect(200);

    expect(res.body.student.status).toBe("APPROVED");
  });

  it("15. Existing Document model backward compatibility (defaults to PENDING verification)", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const doc = await Document.create({
      ownerType: "Student",
      ownerId,
      documentType: "ssc_marksheet",
      storageKey: `sk-default-${Date.now()}`,
      provider: "test",
      originalFileName: "ssc.pdf",
      mimeType: "application/pdf",
      size: 1024,
      uploadedBy: new mongoose.Types.ObjectId(),
      status: "ACTIVE",
      // No verification fields supplied -> should default to PENDING
    });

    const fetched = await Document.findOne({ documentId: doc.documentId }).lean();
    expect(fetched.verificationStatus).toBe("PENDING");
    expect(fetched.verifiedBy).toBeUndefined();
    expect(fetched.rejectionReason).toBeUndefined();

    // Existing lifecycle behaviour unaffected.
    expect(fetched.status).toBe("ACTIVE");
  });
});
