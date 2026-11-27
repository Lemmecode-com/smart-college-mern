const mongoose = require('mongoose');
const request = require('supertest');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser } = require('../helpers/factories');
const GeneralSettings = require('../../src/models/generalSettings.model');
const app = require('../../app');

describe('Dynamic Auth Policy Enforcement (#581)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('Dynamic maxLoginAttempts', () => {
    it('locks account after 3 attempts when college configures maxLoginAttempts: 3', async () => {
      const college = await createCollege({ code: 'DYN001' });

      // Configure GeneralSettings with maxLoginAttempts: 3
      await GeneralSettings.create({
        college_id: college._id,
        maxLoginAttempts: 3,
        minPasswordLength: 8,
      });

      const user = await createUser({
        email: 'strictuser@test.com',
        password: 'Password@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      // 1st failed attempt
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'strictuser@test.com', password: 'WrongPassword!' });
      expect(res1.status).toBe(401);
      expect(res1.body.error.code).toBe('INVALID_CREDENTIALS');

      // 2nd failed attempt
      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'strictuser@test.com', password: 'WrongPassword!' });
      expect(res2.status).toBe(401);
      expect(res2.body.error.code).toBe('INVALID_CREDENTIALS');

      // 3rd failed attempt - should lock account
      const res3 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'strictuser@test.com', password: 'WrongPassword!' });
      expect(res3.status).toBe(401);

      // Next attempt must trigger ACCOUNT_LOCKED (423)
      const res4 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'strictuser@test.com', password: 'Password@123' });
      expect(res4.status).toBe(423);
      expect(res4.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('falls back to default 5 attempts for Super Admin without college_id', async () => {
      const superAdmin = await createUser({
        email: 'superadmin_policy@test.com',
        password: 'Password@123',
        role: 'SUPER_ADMIN',
        isActive: true,
      });

      // 3 failed attempts should NOT lock Super Admin
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'superadmin_policy@test.com', password: 'WrongPassword!' });
        expect(res.status).toBe(401);
      }

      // Valid password on 4th attempt should succeed
      const resValid = await request(app)
        .post('/api/auth/login')
        .send({ email: 'superadmin_policy@test.com', password: 'Password@123' });
      expect(resValid.status).toBe(200);
      expect(resValid.body.success).toBe(true);
    });
  });

  describe('Dynamic minPasswordLength in changePassword', () => {
    it('rejects password shorter than college minPasswordLength: 10', async () => {
      const college = await createCollege({ code: 'PWD001' });

      // Configure GeneralSettings with minPasswordLength: 10
      await GeneralSettings.create({
        college_id: college._id,
        minPasswordLength: 10,
        maxLoginAttempts: 5,
      });

      const user = await createUser({
        email: 'pwduser@test.com',
        password: 'OldPassword@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      // Try setting an 8-char password (valid baseline, but shorter than college min 10)
      const resShort = await request(app)
        .post('/api/auth/change-password')
        .send({
          userId: user._id.toString(),
          currentPassword: 'OldPassword@123',
          newPassword: 'Abc@1234', // 8 chars
        });

      expect(resShort.status).toBe(400);
      expect(resShort.body.error.code).toBe('WEAK_PASSWORD');
      expect(resShort.body.error.message).toContain('at least 10 characters');

      // Try setting a 12-char password - should succeed
      const resValid = await request(app)
        .post('/api/auth/change-password')
        .send({
          userId: user._id.toString(),
          currentPassword: 'OldPassword@123',
          newPassword: 'ValidPass@123', // 13 chars
        });

      expect(resValid.status).toBe(200);
      expect(resValid.body.success).toBe(true);
    });
  });
});
