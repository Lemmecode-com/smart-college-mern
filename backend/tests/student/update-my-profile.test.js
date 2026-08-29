const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createStudent } = require('../helpers/factories');
const app = require('../../app');
const Student = require('../../src/models/student.model');

describe('Student - Save Profile Edits with Valid Data', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('should update student profile with valid data and reflect changes on re-fetch', async () => {
    const college = await createCollege({ code: 'STUDASH07' });
    const user = await createUser({
      email: 'student.dash07@test.com',
      password: 'Test@123',
      role: 'STUDENT',
      college_id: college._id,
      isActive: true,
    });

    const departmentId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    const student = await createStudent({
      college_id: college._id,
      user_id: user._id,
      department_id: departmentId,
      course_id: courseId,
      email: 'student.dash07@test.com',
      status: 'APPROVED',
      fullName: 'Original Student',
      mobileNumber: '9999999999',
      addressLine: 'Original Address',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: 'student.dash07@test.com', password: 'Test@123' })
      .expect(200);

    expect(loginRes.body.success).toBe(true);

    const getRes = await agent
      .get('/api/students/my-profile')
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.student.fullName).toBe('Original Student');
    expect(getRes.body.data.student.mobileNumber).toBe('9999999999');
    expect(getRes.body.data.student.city).toBe('Mumbai');

    const updateRes = await agent
      .put('/api/students/update-my-profile')
      .send({
        mobileNumber: '9876543210',
        addressLine: 'Updated Address Line',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);

    const updatedStudent = await Student.findById(student._id);
    expect(updatedStudent.mobileNumber).toBe('9876543210');
    expect(updatedStudent.addressLine).toBe('Updated Address Line');
    expect(updatedStudent.city).toBe('Pune');
    expect(updatedStudent.pincode).toBe('411001');

    const getAfterRes = await agent
      .get('/api/students/my-profile')
      .expect(200);

    expect(getAfterRes.body.success).toBe(true);
    expect(getAfterRes.body.data.student.mobileNumber).toBe('9876543210');
    expect(getAfterRes.body.data.student.city).toBe('Pune');
    expect(getAfterRes.body.data.student.pincode).toBe('411001');
  });
});
