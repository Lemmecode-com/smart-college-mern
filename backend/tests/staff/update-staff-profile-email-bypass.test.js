const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createStaffProfile } = require('../helpers/factories');
const app = require('../../app');
const User = require('../../src/models/user.model');
const StaffProfile = require('../../src/models/staffProfile.model');

describe('Staff Profile — Email Bypass Protection', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const createStaffUser = async (collegeId, role = 'ACCOUNTANT') => {
    const user = await createUser({
      email: `staff.${Date.now()}@test.com`,
      password: 'Test@123',
      role,
      college_id: collegeId,
      isActive: true,
    });
    return user;
  };

  it('should reject direct email update for another staff member via PUT /api/college/staff/profile/:id', async () => {
    const college = await createCollege({ code: 'STAFF-EMAIL-01' });
    const admin = await createUser({
      email: 'admin.staff-email-01@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const staff = await createStaffUser(college._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staff._id,
      college_id: college._id,
      mobileNumber: '9999999999',
      designation: 'Accountant',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/college/staff/profile/${staff._id}`)
      .send({ email: 'hacked.staff-email-01@test.com' })
      .expect(400);

    expect(res.body.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');
    expect(res.body.message).toMatch(/Email cannot be updated through Staff profile editing/);

    const updatedUser = await User.findById(staff._id);
    expect(updatedUser.email).toBe(staff.email);
  });

  it('should reject mixed payload containing email for another staff member', async () => {
    const college = await createCollege({ code: 'STAFF-EMAIL-02' });
    const admin = await createUser({
      email: 'admin.staff-email-02@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const staff = await createStaffUser(college._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staff._id,
      college_id: college._id,
      mobileNumber: '9999999999',
      designation: 'Accountant',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/college/staff/profile/${staff._id}`)
      .send({ name: 'Hacked Name', email: 'hacked.staff-email-02@test.com' })
      .expect(400);

    expect(res.body.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');

    const updatedUser = await User.findById(staff._id);
    const updatedProfile = await StaffProfile.findOne({ user_id: staff._id });
    expect(updatedUser.name).toBe(staff.name);
    expect(updatedUser.email).toBe(staff.email);
    expect(updatedProfile.mobileNumber).toBe('9999999999');
  });

  it('should allow normal non-email staff profile updates', async () => {
    const college = await createCollege({ code: 'STAFF-EMAIL-03' });
    const admin = await createUser({
      email: 'admin.staff-email-03@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const staff = await createStaffUser(college._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staff._id,
      college_id: college._id,
      mobileNumber: '9999999999',
      designation: 'Accountant',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/college/staff/profile/${staff._id}`)
      .send({ name: 'Updated Name', mobileNumber: '8888888888' })
      .expect(200);

    expect(res.body.success).toBe(true);

    const updatedUser = await User.findById(staff._id);
    const updatedProfile = await StaffProfile.findOne({ user_id: staff._id });
    expect(updatedUser.name).toBe('Updated Name');
    expect(updatedProfile.mobileNumber).toBe('8888888888');
    expect(updatedUser.email).toBe(staff.email);
  });

  it('should reject self direct email update via PUT /api/college/staff/profile/own-id', async () => {
    const college = await createCollege({ code: 'STAFF-EMAIL-04' });
    const admin = await createUser({
      email: 'admin.staff-email-04@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/college/staff/profile/${admin._id}`)
      .send({ email: 'hacked.staff-email-04@test.com' })
      .expect(400);

    expect(res.body.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');

    const updatedUser = await User.findById(admin._id);
    expect(updatedUser.email).toBe(admin.email);
  });

  it('should preserve cross-college isolation when rejecting email update', async () => {
    const collegeA = await createCollege({ code: 'STAFF-EMAIL-05A', email: 'college-a.staff-email-05@test.com' });
    const collegeB = await createCollege({ code: 'STAFF-EMAIL-05B', email: 'college-b.staff-email-05@test.com' });
    const adminA = await createUser({
      email: 'admin.staff-email-05a@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: collegeA._id,
      isActive: true,
    });

    const staffB = await createStaffUser(collegeB._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staffB._id,
      college_id: collegeB._id,
      mobileNumber: '9999999999',
      designation: 'Accountant',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: adminA.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/college/staff/profile/${staffB._id}`)
      .send({ email: 'hacked.staff-email-05@test.com' })
      .expect(404);

    expect(res.body.error.code).toBe('STAFF_NOT_FOUND');

    const updatedUser = await User.findById(staffB._id);
    expect(updatedUser.email).toBe(staffB.email);
  });

  it('should reject email update via PUT /api/staff/profile/:userId', async () => {
    const college = await createCollege({ code: 'STAFF-EMAIL-06' });
    const staffA = await createStaffUser(college._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staffA._id,
      college_id: college._id,
      mobileNumber: '9999999999',
      designation: 'Accountant',
    });

    const staffB = await createStaffUser(college._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staffB._id,
      college_id: college._id,
      mobileNumber: '8888888888',
      designation: 'Accountant',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: staffA.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put(`/api/staff/profile/${staffB._id}`)
      .send({ name: 'Hacked Name', email: 'hacked.staff-email-06@test.com' })
      .expect(400);

    expect(res.body.error.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');

    const updatedUser = await User.findById(staffB._id);
    const updatedProfile = await StaffProfile.findOne({ user_id: staffB._id });
    expect(updatedUser.email).toBe(staffB.email);
    expect(updatedProfile.mobileNumber).toBe('8888888888');
  });

  it('should reject email update via PUT /api/staff/my-profile', async () => {
    const college = await createCollege({ code: 'STAFF-EMAIL-07' });
    const staff = await createStaffUser(college._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staff._id,
      college_id: college._id,
      mobileNumber: '9999999999',
      designation: 'Accountant',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put('/api/staff/my-profile')
      .send({ name: 'Hacked Name', email: 'hacked.staff-email-07@test.com' })
      .expect(400);

    expect(res.body.error.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');

    const updatedUser = await User.findById(staff._id);
    expect(updatedUser.email).toBe(staff.email);
  });

  it('should allow valid non-email profile update via PUT /api/staff/my-profile', async () => {
    const college = await createCollege({ code: 'STAFF-EMAIL-08' });
    const staff = await createStaffUser(college._id, 'ACCOUNTANT');
    await createStaffProfile({
      user_id: staff._id,
      college_id: college._id,
      mobileNumber: '9999999999',
      designation: 'Accountant',
      address: 'Old Address',
      city: 'Old City',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: staff.email, password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put('/api/staff/my-profile')
      .send({ mobileNumber: '8888888888', designation: 'Senior Accountant', address: 'New Address', city: 'New City' })
      .expect(200);

    expect(res.body.success).toBe(true);

    const updatedUser = await User.findById(staff._id);
    const updatedProfile = await StaffProfile.findOne({ user_id: staff._id });
    expect(updatedUser.email).toBe(staff.email);
    expect(updatedProfile.mobileNumber).toBe('8888888888');
    expect(updatedProfile.designation).toBe('Senior Accountant');
    expect(updatedProfile.address).toBe('New Address');
    expect(updatedProfile.city).toBe('New City');
  });
});
