const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createStudent, createDepartment, createCourse } = require('../helpers/factories');
const app = require('../../app');
const Timetable = require('../../src/models/timetable.model');
const Student = require('../../src/models/student.model');

describe('Division Assignment — Authorization & Tenant Isolation', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  async function setupCollegeEnvironment(collegeCode) {
    const college = await createCollege({
      code: collegeCode,
      name: `${collegeCode} College`,
      email: `college.${collegeCode.toLowerCase()}@test.com`,
    });

    const admin = await createUser({
      email: `admin.${collegeCode.toLowerCase()}@test.com`,
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const admissionOfficer = await createUser({
      email: `admission.${collegeCode.toLowerCase()}@test.com`,
      password: 'Test@123',
      role: 'ADMISSION_OFFICER',
      college_id: college._id,
      isActive: true,
    });

    const department = await createDepartment({
      college_id: college._id,
      name: `${collegeCode} Computer Science`,
      code: `${collegeCode}-CSE`,
      createdBy: admin._id,
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: `${collegeCode} B.Tech CSE`,
      code: `${collegeCode}-BTECH`,
      createdBy: admin._id,
    });

    const timetableA = await Timetable.create({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      semester: 1,
      academicYear: '2025-2026',
      division: 'A',
      name: `${collegeCode} Sem 1 Div A`,
      status: 'PUBLISHED',
      createdBy: admin._id,
    });

    const timetableB = await Timetable.create({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      semester: 1,
      academicYear: '2025-2026',
      division: 'B',
      name: `${collegeCode} Sem 1 Div B`,
      status: 'PUBLISHED',
      createdBy: admin._id,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      currentSemester: 1,
      currentAcademicYear: '2025-2026',
      status: 'APPROVED',
      fullName: `${collegeCode} Student`,
      email: `student.${collegeCode.toLowerCase()}@test.com`,
      mobileNumber: '9999999999',
      addressLine: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    });

    return {
      college,
      admin,
      admissionOfficer,
      department,
      course,
      timetables: [timetableA, timetableB],
      student,
    };
  }

  it('ADMISSION_OFFICER can load valid divisions for an approved student', async () => {
    const env = await setupCollegeEnvironment('DIV01');

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: env.admissionOfficer.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .get(`/api/students/${env.student._id}/valid-divisions`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.divisions).toBeDefined();
    expect(res.body.data.divisions).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('ADMISSION_OFFICER can save assigned division via student update', async () => {
    const env = await setupCollegeEnvironment('DIV02');

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: env.admissionOfficer.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/students/${env.student._id}`)
      .send({ division: 'A' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.student.division).toBe('A');

    const updated = await Student.findById(env.student._id);
    expect(updated.division).toBe('A');
  });

  it('Preserves COLLEGE_ADMIN permission to load valid divisions and assign division', async () => {
    const env = await setupCollegeEnvironment('DIV03');

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: env.admin.email, password: 'Test@123' })
      .expect(200);

    const getRes = await agent
      .get(`/api/students/${env.student._id}/valid-divisions`)
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.divisions).toContain('B');

    const putRes = await agent
      .put(`/api/students/${env.student._id}`)
      .send({ division: 'B' })
      .expect(200);

    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data.student.division).toBe('B');
  });

  it('Tenant Isolation: ADMISSION_OFFICER from College A cannot view valid divisions for College B student', async () => {
    const collegeA = await setupCollegeEnvironment('COL_A');
    const collegeB = await setupCollegeEnvironment('COL_B');

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: collegeA.admissionOfficer.email, password: 'Test@123' })
      .expect(200);

    // Attempt to access student from College B
    const res = await agent
      .get(`/api/students/${collegeB.student._id}/valid-divisions`)
      .expect(404);

    expect(res.body.message).toBe('Student not found');
  });

  it('Tenant Isolation: ADMISSION_OFFICER from College A cannot assign division to College B student', async () => {
    const collegeA = await setupCollegeEnvironment('COL_C');
    const collegeB = await setupCollegeEnvironment('COL_D');

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: collegeA.admissionOfficer.email, password: 'Test@123' })
      .expect(200);

    // Attempt to assign division to College B's student
    const res = await agent
      .put(`/api/students/${collegeB.student._id}`)
      .send({ division: 'A' })
      .expect(404);

    expect(res.body.message).toBe('Student not found');

    const studentB = await Student.findById(collegeB.student._id);
    expect(studentB.division).toBeFalsy();
  });

  it('Tenant Isolation: Cannot assign a division not defined in the student\'s college timetable', async () => {
    const collegeA = await setupCollegeEnvironment('COL_E');

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: collegeA.admissionOfficer.email, password: 'Test@123' })
      .expect(200);

    // Division Z does not exist in College A's timetable
    const res = await agent
      .put(`/api/students/${collegeA.student._id}`)
      .send({ division: 'Z' })
      .expect(400);

    expect(res.body.code).toBe('INVALID_DIVISION');
  });

  it('Blocks unauthorized roles (STUDENT) from accessing valid-divisions and student update', async () => {
    const env = await setupCollegeEnvironment('DIV04');

    const studentUser = await createUser({
      email: 'student.auth@test.com',
      password: 'Test@123',
      role: 'STUDENT',
      college_id: env.college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: studentUser.email, password: 'Test@123' })
      .expect(200);

    await agent
      .get(`/api/students/${env.student._id}/valid-divisions`)
      .expect(403);

    await agent
      .put(`/api/students/${env.student._id}`)
      .send({ division: 'A' })
      .expect(403);
  });
});
