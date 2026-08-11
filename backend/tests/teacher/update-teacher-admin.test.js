const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createTeacher } = require('../helpers/factories');
const app = require('../../app');
const Teacher = require('../../src/models/teacher.model');
const User = require('../../src/models/user.model');

describe('Teacher Admin Update — Email Bypass Protection', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('should reject direct email update via PUT /teachers/:id', async () => {
    const college = await createCollege({ code: 'TCH-EMAIL-01' });
    const admin = await createUser({
      email: 'admin.tch-email-01@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const teacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: 'teacher.tch-email-01@test.com',
      status: 'ACTIVE',
      name: 'Test Teacher',
      employeeId: 'EMP-TCH-EMAIL-01',
      designation: 'Teacher',
      qualification: 'MSc',
      experienceYears: 5,
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/teachers/${teacher._id}`)
      .send({ email: 'newemail.tch-email-01@test.com' })
      .expect(400);

    expect(res.body.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');
    expect(res.body.message).toMatch(/Email cannot be updated here/);

    const updatedTeacher = await Teacher.findById(teacher._id);
    expect(updatedTeacher.email).toBe('teacher.tch-email-01@test.com');
  });

  it('should allow normal non-email updates via PUT /teachers/:id', async () => {
    const college = await createCollege({ code: 'TCH-EMAIL-02' });
    const admin = await createUser({
      email: 'admin.tch-email-02@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const teacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: 'teacher.tch-email-02@test.com',
      status: 'ACTIVE',
      name: 'Original Name',
      employeeId: 'EMP-TCH-EMAIL-02',
      designation: 'Teacher',
      qualification: 'MSc',
      experienceYears: 5,
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/teachers/${teacher._id}`)
      .send({ name: 'Updated Name', experienceYears: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);

    const updatedTeacher = await Teacher.findById(teacher._id);
    expect(updatedTeacher.name).toBe('Updated Name');
    expect(updatedTeacher.experienceYears).toBe(10);
    expect(updatedTeacher.email).toBe('teacher.tch-email-02@test.com');
  });

  it('should reject mixed payload containing email and other fields', async () => {
    const college = await createCollege({ code: 'TCH-EMAIL-03' });
    const admin = await createUser({
      email: 'admin.tch-email-03@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const teacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: 'teacher.tch-email-03@test.com',
      status: 'ACTIVE',
      name: 'Original Name',
      employeeId: 'EMP-TCH-EMAIL-03',
      designation: 'Teacher',
      qualification: 'MSc',
      experienceYears: 5,
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/teachers/${teacher._id}`)
      .send({
        name: 'Updated Name',
        email: 'newemail.tch-email-03@test.com',
      })
      .expect(400);

    expect(res.body.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');

    const updatedTeacher = await Teacher.findById(teacher._id);
    expect(updatedTeacher.name).toBe('Original Name');
    expect(updatedTeacher.email).toBe('teacher.tch-email-03@test.com');
  });

  it('should keep Teacher.email and User.email consistent after blocked admin update', async () => {
    const college = await createCollege({ code: 'TCH-EMAIL-04' });
    const admin = await createUser({
      email: 'admin.tch-email-04@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const originalEmail = 'teacher.tch-email-04@test.com';
    const teacher = await createTeacher({
      college_id: college._id,
      user_id: new mongoose.Types.ObjectId(),
      department_id: new mongoose.Types.ObjectId(),
      email: originalEmail,
      status: 'ACTIVE',
      name: 'Test Teacher',
      employeeId: 'EMP-TCH-EMAIL-04',
      designation: 'Teacher',
      qualification: 'MSc',
      experienceYears: 5,
      createdBy: admin._id,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    await agent
      .put(`/api/teachers/${teacher._id}`)
      .send({ email: 'newemail.tch-email-04@test.com' })
      .expect(400);

    const updatedTeacher = await Teacher.findById(teacher._id);
    expect(updatedTeacher.email).toBe(originalEmail);

    const linkedUser = await User.findById(teacher.user_id);
    if (linkedUser) {
      expect(linkedUser.email).toBe(originalEmail);
    }
  });
});
