const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createTeacher } = require('../helpers/factories');
const app = require('../../app');

describe('Teacher - Save Profile Edits with Valid Data (DASH-07)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('should update teacher profile with valid data and reflect changes on re-fetch', async () => {
    const college = await createCollege({ code: 'DASH07' });
    const user = await createUser({
      email: 'teacher.dash07@test.com',
      password: 'Test@123',
      role: 'TEACHER',
      college_id: college._id,
      isActive: true,
    });

    const departmentId = new mongoose.Types.ObjectId();
    await createTeacher({
      college_id: college._id,
      user_id: user._id,
      department_id: departmentId,
      email: 'teacher.dash07@test.com',
      employeeId: 'EMP-DASH07',
      designation: 'Teacher',
      qualification: 'MSc',
      experienceYears: 5,
      status: 'ACTIVE',
      createdBy: user._id,
      name: 'Original Name',
      mobileNumber: '9999999999',
      joiningDate: new Date('2020-01-01'),
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: 'teacher.dash07@test.com', password: 'Test@123' })
      .expect(200);

    expect(loginRes.body.success).toBe(true);

    const getRes = await agent
      .get('/api/teachers/my-profile')
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.teacher.name).toBe('Original Name');
    expect(getRes.body.data.teacher.experienceYears).toBe(5);
    expect(getRes.body.data.teacher.mobileNumber).toBe('9999999999');

    const updateRes = await agent
      .put('/api/teachers/my-profile')
      .send({
        name: 'Updated Name',
        email: 'updated.dash07@test.com',
        experienceYears: 10,
        mobileNumber: '9876543210',
        joiningDate: '2021-06-15',
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.teacher.name).toBe('Updated Name');
    expect(updateRes.body.data.teacher.experienceYears).toBe(10);
    expect(updateRes.body.data.teacher.mobileNumber).toBe('9876543210');

    const getAfterRes = await agent
      .get('/api/teachers/my-profile')
      .expect(200);

    expect(getAfterRes.body.success).toBe(true);
    expect(getAfterRes.body.data.teacher.name).toBe('Updated Name');
    expect(getAfterRes.body.data.teacher.experienceYears).toBe(10);
    expect(getAfterRes.body.data.teacher.mobileNumber).toBe('9876543210');
    expect(getAfterRes.body.data.teacher.email).toBe('teacher.dash07@test.com');
    expect(getAfterRes.body.data.teacher.joiningDate).toBeDefined();
  });
});
