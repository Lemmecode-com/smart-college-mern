const mongoose = require('mongoose');
const request = require('supertest');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createTeacher, createStudent } = require('../helpers/factories');
const app = require('../../app');

describe('Auth - Login', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

describe('successful login', () => {
    it('SUPER_ADMIN ? 200 with id, role, college_id', async () => {
      const college = await createCollege({ code: 'SUP001' });
      await createUser({
        email: 'superadmin@test.com',
        password: 'Test@123',
        role: 'SUPER_ADMIN',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'superadmin@test.com', password: 'Test@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.role).toBe('SUPER_ADMIN');
      expect(res.body.data.user.id).toBeDefined();
    });

    it('COLLEGE_ADMIN ? 200 with id, role, college_id', async () => {
      const college = await createCollege({ code: 'CADM001' });
      await createUser({
        email: 'collegeadmin@test.com',
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'collegeadmin@test.com', password: 'Test@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('COLLEGE_ADMIN');
      expect(res.body.data.user.college_id).toBeDefined();
    });

    it('TEACHER ? 200 (linked User + Teacher record)', async () => {
      const college = await createCollege({ code: 'TCH001' });
      const user = await createUser({
        email: 'teacher@test.com',
        password: 'Test@123',
        role: 'TEACHER',
        college_id: college._id,
        isActive: true,
      });

      await createTeacher({
        college_id: college._id,
        user_id: user._id,
        department_id: new mongoose.Types.ObjectId(),
        email: 'teacher@test.com',
        createdBy: user._id,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'teacher@test.com', password: 'Test@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('TEACHER');
      expect(res.body.data.user.id).toBeDefined();
    });

    it('STUDENT (APPROVED) ? 200 (linked User + Student record)', async () => {
      const college = await createCollege({ code: 'STU001' });
      const user = await createUser({
        email: 'student@test.com',
        password: 'Test@123',
        role: 'STUDENT',
        college_id: college._id,
        isActive: true,
      });

      await createStudent({
        college_id: college._id,
        user_id: user._id,
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
        email: 'student@test.com',
        status: 'APPROVED',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'student@test.com', password: 'Test@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user.id).toBeDefined();
    });

    it('STUDENT (ENROLLED) ? 200', async () => {
      const college = await createCollege({ code: 'STU002' });
      const user = await createUser({
        email: 'enrolled@test.com',
        password: 'Test@123',
        role: 'STUDENT',
        college_id: college._id,
        isActive: true,
      });

      await createStudent({
        college_id: college._id,
        user_id: user._id,
        department_id: new mongoose.Types.ObjectId(),
        course_id: new mongoose.Types.ObjectId(),
        email: 'enrolled@test.com',
        status: 'ENROLLED',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'enrolled@test.com', password: 'Test@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('STUDENT');
    });
  });

  describe('failed login', () => {
    it('wrong password ? 401 INVALID_CREDENTIALS', async () => {
      const college = await createCollege({ code: 'ERR001' });
      await createUser({
        email: 'user@test.com',
        password: 'Test@123',
        role: 'SUPER_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('non-existent email ? 404 USER_NOT_FOUND', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.com', password: 'Test@123' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('missing email ? 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Test@123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
    });

    it('missing password ? 400 validation error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
    });

    it('deactivated account ? 403 ACCOUNT_DEACTIVATED', async () => {
      const college = await createCollege({ code: 'DEACT001' });
      await createUser({
        email: 'deactivated@test.com',
        password: 'Test@123',
        role: 'SUPER_ADMIN',
        college_id: college._id,
        isActive: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'deactivated@test.com', password: 'Test@123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

it('lockout after 5 failed attempts ? 423 ACCOUNT_LOCKED', async () => {
      const college = await createCollege({ code: 'LOCK001' });
      const user = await createUser({
        email: 'lockme@test.com',
        password: 'Test@123',
        role: 'SUPER_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      // Directly set lockout state in DB to test lockout in isolation from rate limiter
      const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
      await require('../../src/models/user.model').findByIdAndUpdate(user._id, {
        loginAttempts: 5,
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'lockme@test.com', password: 'Test@123' });

      expect(res.status).toBe(423);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('mustChangePassword non-STUDENT ? 403 MUST_CHANGE_PASSWORD', async () => {
      const college = await createCollege({ code: 'MCP001' });
      await createUser({
        email: 'mustchange@test.com',
        password: 'Temp@123',
        role: 'PRINCIPAL',
        college_id: college._id,
        isActive: true,
        mustChangePassword: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'mustchange@test.com', password: 'Temp@123' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('MUST_CHANGE_PASSWORD');
    });
  });
});
