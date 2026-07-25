const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createStudent } = require('../helpers/factories');
const app = require('../../app');
const DocumentConfig = require('../../src/models/documentConfig.model');

describe('Student - getMyFullProfile documentConfig fallback', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('should return all document types as enabled when no DocumentConfig exists', async () => {
    const college = await createCollege({ code: 'FALLBACK01' });
    const user = await createUser({
      email: 'student.fallback@test.com',
      password: 'Test@123',
      role: 'STUDENT',
      college_id: college._id,
      isActive: true,
    });

    const departmentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    await createStudent({
      college_id: college._id,
      user_id: user._id,
      department_id: departmentId,
      course_id: courseId,
      email: 'student.fallback@test.com',
      status: 'APPROVED',
      fullName: 'Fallback Student',
      mobileNumber: '9999999999',
      addressLine: 'Test Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'student.fallback@test.com', password: 'Test@123' })
      .expect(200);

    const getRes = await agent
      .get('/api/students/my-profile')
      .expect(200);

    expect(getRes.body.success).toBe(true);
    const documentConfig = getRes.body.data.documentConfig;
    expect(Array.isArray(documentConfig)).toBe(true);
    expect(documentConfig.length).toBeGreaterThan(0);
    expect(documentConfig.every(doc => doc.enabled === true)).toBe(true);
    expect(documentConfig.some(doc => doc.type === '10th_marksheet')).toBe(true);
    expect(documentConfig.some(doc => doc.type === 'passport_photo')).toBe(true);
  });

  it('should return college-specific config when DocumentConfig exists', async () => {
    const college = await createCollege({ code: 'CONFIG01' });
    const user = await createUser({
      email: 'student.config@test.com',
      password: 'Test@123',
      role: 'STUDENT',
      college_id: college._id,
      isActive: true,
    });

    const departmentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    await createStudent({
      college_id: college._id,
      user_id: user._id,
      department_id: departmentId,
      course_id: courseId,
      email: 'student.config@test.com',
      status: 'APPROVED',
      fullName: 'Config Student',
      mobileNumber: '9999999999',
      addressLine: 'Test Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    });

    await DocumentConfig.create({
      college_id: college._id,
      collegeCode: college.code,
      documents: [
        { type: '10th_marksheet', label: '10th Marksheet', enabled: true, mandatory: true },
        { type: 'passport_photo', label: 'Passport Photo', enabled: false, mandatory: false },
      ],
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'student.config@test.com', password: 'Test@123' })
      .expect(200);

    const getRes = await agent
      .get('/api/students/my-profile')
      .expect(200);

    expect(getRes.body.success).toBe(true);
    const documentConfig = getRes.body.data.documentConfig;
    expect(documentConfig.length).toBe(2);
    expect(documentConfig.find(d => d.type === '10th_marksheet').enabled).toBe(true);
    expect(documentConfig.find(d => d.type === 'passport_photo').enabled).toBe(false);
  });
});
