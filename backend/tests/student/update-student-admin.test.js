const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createStudent } = require('../helpers/factories');
const app = require('../../app');
const Student = require('../../src/models/student.model');
const User = require('../../src/models/user.model');

describe('Student Admin Update — Email Bypass Protection', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('should reject direct email update via PUT /api/students/:id', async () => {
    const college = await createCollege({ code: 'STU-EMAIL-01' });
    const admin = await createUser({
      email: 'admin.stu-email-01@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: new mongoose.Types.ObjectId(),
      course_id: new mongoose.Types.ObjectId(),
      email: 'student.stu-email-01@test.com',
      status: 'APPROVED',
      fullName: 'Test Student',
      mobileNumber: '9999999999',
      addressLine: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/students/${student._id}`)
      .send({ email: 'newemail.stu-email-01@test.com' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((err) => err.field === 'email' && err.message.includes('Email cannot be updated here'))).toBe(true);

    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.email).toBe('student.stu-email-01@test.com');

    const updatedUser = await User.findById(student.user_id);
    if (updatedUser) {
      expect(updatedUser.email).toBe('student.stu-email-01@test.com');
    }
  });

  it('should allow normal non-email updates via PUT /api/students/:id', async () => {
    const college = await createCollege({ code: 'STU-EMAIL-02' });
    const admin = await createUser({
      email: 'admin.stu-email-02@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: new mongoose.Types.ObjectId(),
      course_id: new mongoose.Types.ObjectId(),
      email: 'student.stu-email-02@test.com',
      status: 'APPROVED',
      fullName: 'Original Name',
      mobileNumber: '9999999999',
      addressLine: 'Original Address',
      city: 'Original City',
      state: 'Original State',
      pincode: '123456',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/students/${student._id}`)
      .send({ fullName: 'Updated Name', mobileNumber: '8888888888' })
      .expect(200);

    expect(res.body.success).toBe(true);

    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.fullName).toBe('Updated Name');
    expect(updatedStudent.mobileNumber).toBe('8888888888');
    expect(updatedStudent.email).toBe('student.stu-email-02@test.com');
  });

  it('should reject mixed payload containing email and other fields', async () => {
    const college = await createCollege({ code: 'STU-EMAIL-03' });
    const admin = await createUser({
      email: 'admin.stu-email-03@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const student = await createStudent({
      college_id: college._id,
      department_id: new mongoose.Types.ObjectId(),
      course_id: new mongoose.Types.ObjectId(),
      email: 'student.stu-email-03@test.com',
      status: 'APPROVED',
      fullName: 'Original Name',
      mobileNumber: '9999999999',
      addressLine: 'Original Address',
      city: 'Original City',
      state: 'Original State',
      pincode: '123456',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/students/${student._id}`)
      .send({
        fullName: 'Updated Name',
        email: 'newemail.stu-email-03@test.com',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((err) => err.field === 'email' && err.message.includes('Email cannot be updated here'))).toBe(true);

    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.fullName).toBe('Original Name');
    expect(updatedStudent.email).toBe('student.stu-email-03@test.com');
  });

  it('should keep Student.email and User.email consistent after blocked admin update', async () => {
    const college = await createCollege({ code: 'STU-EMAIL-04' });
    const admin = await createUser({
      email: 'admin.stu-email-04@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const originalEmail = 'student.stu-email-04@test.com';
    const student = await createStudent({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      course_id: new mongoose.Types.ObjectId(),
      email: originalEmail,
      status: 'APPROVED',
      fullName: 'Test Student',
      mobileNumber: '9999999999',
      addressLine: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    await agent
      .put(`/api/students/${student._id}`)
      .send({ email: 'newemail.stu-email-04@test.com' })
      .expect(400);

    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.email).toBe(originalEmail);

    const linkedUser = await User.findById(student.user_id);
    if (linkedUser) {
      expect(linkedUser.email).toBe(originalEmail);
    }
  });
});
