const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createStudent, createParentGuardian } = require('../helpers/factories');
const app = require('../../app');
const User = require('../../src/models/user.model');

describe('Parent - My Profile (GET /api/parent/my-profile)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('should return parent profile with user fields, relation, and linked students', async () => {
    const college = await createCollege({ code: 'PARENT01' });
    const user = await createUser({
      email: 'parent.profile@test.com',
      password: 'Test@123',
      role: 'PARENT_GUARDIAN',
      college_id: college._id,
      isActive: true,
    });

    const studentUser1 = await createUser({
      email: 'child1.parent01@test.com',
      password: 'Test@123',
      role: 'STUDENT',
      college_id: college._id,
      isActive: true,
    });

    const student1 = await createStudent({
      college_id: college._id,
      user_id: studentUser1._id,
      department_id: new mongoose.Types.ObjectId(),
      course_id: new mongoose.Types.ObjectId(),
      fullName: 'Child One',
      email: 'child1.parent01@test.com',
      status: 'APPROVED',
    });

    const studentUser2 = await createUser({
      email: 'child2.parent01@test.com',
      password: 'Test@123',
      role: 'STUDENT',
      college_id: college._id,
      isActive: true,
    });

    const student2 = await createStudent({
      college_id: college._id,
      user_id: studentUser2._id,
      department_id: new mongoose.Types.ObjectId(),
      course_id: new mongoose.Types.ObjectId(),
      fullName: 'Child Two',
      email: 'child2.parent01@test.com',
      status: 'APPROVED',
    });

    await createParentGuardian({
      user_id: user._id,
      college_id: college._id,
      student_ids: [student1._id, student2._id],
      relation: 'father',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'parent.profile@test.com', password: 'Test@123' })
      .expect(200);

    const res = await agent.get('/api/parent/my-profile').expect(200);

    expect(res.body.success).toBe(true);
    const { user: profileUser, parent } = res.body.data;

    expect(profileUser.name).toBe(user.name);
    expect(profileUser.email).toBe('parent.profile@test.com');
    expect(profileUser.mobileNumber).toBe(user.mobileNumber);
    expect(profileUser.role).toBe('PARENT_GUARDIAN');

    expect(parent.relation).toBe('father');
    expect(parent.linkedStudentIds).toContain(student1._id.toString());
    expect(parent.linkedStudentIds).toContain(student2._id.toString());
    expect(parent.students).toHaveLength(2);
    expect(parent.students.map((s) => s.fullName).sort()).toEqual(['Child One', 'Child Two']);
  });

  it('should return empty linked students for parent with no linked children', async () => {
    const college = await createCollege({ code: 'PARENT02' });
    const user = await createUser({
      email: 'parent.nolink@test.com',
      password: 'Test@123',
      role: 'PARENT_GUARDIAN',
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'parent.nolink@test.com', password: 'Test@123' })
      .expect(200);

    const res = await agent.get('/api/parent/my-profile').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('parent.nolink@test.com');
    expect(res.body.data.parent.relation).toBeNull();
    expect(res.body.data.parent.linkedStudentIds).toEqual([]);
    expect(res.body.data.parent.students).toEqual([]);
  });
});

describe('Parent - Update My Profile (PUT /api/parent/update-my-profile)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('should update parent name and mobileNumber and reflect on re-fetch', async () => {
    const college = await createCollege({ code: 'PARENT03' });
    const user = await createUser({
      email: 'parent.update@test.com',
      password: 'Test@123',
      role: 'PARENT_GUARDIAN',
      college_id: college._id,
      isActive: true,
    });

    await createParentGuardian({
      user_id: user._id,
      college_id: college._id,
      student_ids: [],
      relation: 'guardian',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'parent.update@test.com', password: 'Test@123' })
      .expect(200);

    const updateRes = await agent
      .put('/api/parent/update-my-profile')
      .send({
        name: 'Updated Parent Name',
        mobileNumber: '9876543210',
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.user.name).toBe('Updated Parent Name');
    expect(updateRes.body.data.user.mobileNumber).toBe('9876543210');

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.name).toBe('Updated Parent Name');
    expect(updatedUser.mobileNumber).toBe('9876543210');

    const getRes = await agent.get('/api/parent/my-profile').expect(200);
    expect(getRes.body.data.user.name).toBe('Updated Parent Name');
    expect(getRes.body.data.user.mobileNumber).toBe('9876543210');
  });

  it('should reject email in PUT payload with 400 EMAIL_CHANGE_NOT_ALLOWED', async () => {
    const college = await createCollege({ code: 'PARENT04' });
    const user = await createUser({
      email: 'parent.email@test.com',
      password: 'Test@123',
      role: 'PARENT_GUARDIAN',
      college_id: college._id,
      isActive: true,
    });

    await createParentGuardian({
      user_id: user._id,
      college_id: college._id,
      student_ids: [],
      relation: 'mother',
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'parent.email@test.com', password: 'Test@123' })
      .expect(200);

    const res = await agent
      .put('/api/parent/update-my-profile')
      .send({
        name: 'Should Still Apply',
        email: 'hijack@test.com',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error?.code || res.body.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');

    const unchangedUser = await User.findById(user._id);
    expect(unchangedUser.email).toBe('parent.email@test.com');
  });
});
