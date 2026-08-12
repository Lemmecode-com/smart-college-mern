const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser } = require('../helpers/factories');
const app = require('../../app');
const College = require('../../src/models/college.model');
const User = require('../../src/models/user.model');
const PasswordReset = require('../../src/models/passwordReset.model');
const SecurityAudit = require('../../src/models/securityAudit.model');
const bcrypt = require('bcryptjs');

/**
 * Helper: create a college + college-admin user pair
 */
const createCollegeAdminPair = async ({ collegeOverrides = {}, adminEmail = 'admin@test.com' } = {}) => {
  const college = await createCollege(collegeOverrides);
  const admin = await createUser({
    email: adminEmail,
    password: 'Test@123',
    role: 'COLLEGE_ADMIN',
    college_id: college._id,
    isActive: true,
  });
  return { college, admin };
};

/**
 * Helper: insert an OTP record directly into PasswordReset with a known
 * plaintext value so tests can verify the exact OTP.
 */
const seedOTP = async (email, plainOtp = '123456') => {
  return PasswordReset.create({
    email,
    otpHash: plainOtp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    isUsed: false,
    failedAttempts: 0,
    maxAttempts: 5,
  });
};

describe('College Official Email Change Flow (Step 7)', () => {
  let adminUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 1: Direct bypass via profile update
  // ──────────────────────────────────────────────────────────
  describe('Direct Bypass via PUT /api/college/edit/my-college', () => {
    it('should block email in the normal profile update endpoint (400)', async () => {
      const { college, admin } = await createCollegeAdminPair({
        collegeOverrides: { code: 'BYPASS01', email: 'bypass01@test.com' },
        adminEmail: 'admin.bypass01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.bypass01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put('/api/college/edit/my-college')
        .send({ email: 'hacker@example.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('COLLEGE_EMAIL_CHANGE_NOT_ALLOWED');

      const unchanged = await College.findById(college._id);
      expect(unchanged.email).toBe('bypass01@test.com');
    });

    it('should block email even when combined with valid profile fields', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'BYPASS02', email: 'bypass02@test.com' },
        adminEmail: 'admin.bypass02@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.bypass02@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put('/api/college/edit/my-college')
        .field('name', 'Updated Name')
        .field('email', 'hacker@example.com')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('COLLEGE_EMAIL_CHANGE_NOT_ALLOWED');

      const unchanged = await College.findById(college._id);
      expect(unchanged.email).toBe('bypass02@test.com');
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 2: Missing authentication
  // ──────────────────────────────────────────────────────────
  describe('Missing Authentication', () => {
    it('should reject request without authentication (401)', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'AUTH01', email: 'auth01@test.com' },
        adminEmail: 'admin.auth01@test.com',
      });

      const res = await request(app)
        .post('/api/college/change-email/request')
        .send({ email: 'newauth01@test.com', currentPassword: 'Test@123' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject verify without authentication (401)', async () => {
      const res = await request(app)
        .post('/api/college/change-email/verify')
        .send({ email: 'newauth02@test.com', otp: '123456' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 3: Missing / wrong password
  // ──────────────────────────────────────────────────────────
  describe('Password Verification', () => {
    it('should reject missing currentPassword (400)', async () => {
      const { college, admin } = await createCollegeAdminPair({
        collegeOverrides: { code: 'PW01', email: 'pw01@test.com' },
        adminEmail: 'admin.pw01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.pw01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/college/change-email/request')
        .send({ email: 'newpw01@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject wrong current password (401)', async () => {
      const { college, admin } = await createCollegeAdminPair({
        collegeOverrides: { code: 'PW02', email: 'pw02@test.com' },
        adminEmail: 'admin.pw02@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.pw02@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/college/change-email/request')
        .send({ email: 'newpw02@test.com', currentPassword: 'WrongPassword' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');

      // College.email must remain unchanged
      const unchanged = await College.findById(college._id);
      expect(unchanged.email).toBe('pw02@test.com');
    });

    it('should log COLLEGE_EMAIL_CHANGE_FAILED audit on wrong password', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'PW03', email: 'pw03@test.com' },
        adminEmail: 'admin.pw03@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.pw03@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/college/change-email/request')
        .send({ email: 'newpw03@test.com', currentPassword: 'WrongPassword' })
        .expect(401);

      const audits = await SecurityAudit.find({
        eventType: 'COLLEGE_EMAIL_CHANGE_FAILED',
        userId: { $ne: null },
      });
      expect(audits.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 4: Same email
  // ──────────────────────────────────────────────────────────
  describe('Same Email Rejection', () => {
    it('should reject same email as current college email (400)', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'SAME01', email: 'same01@test.com' },
        adminEmail: 'admin.same01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.same01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/college/change-email/request')
        .send({ email: 'same01@test.com', currentPassword: 'Test@123' })
        .expect(400);

      expect(res.body.code).toBe('COLLEGE_SAME_EMAIL');
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 5: Duplicate college email
  // ──────────────────────────────────────────────────────────
  describe('Duplicate College Email', () => {
    it('should reject email already used by another college (400)', async () => {
      await createCollege({ code: 'DUP01', email: 'duplicate@test.com' });

      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'DUP02', email: 'dup02@test.com' },
        adminEmail: 'admin.dup02@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.dup02@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/college/change-email/request')
        .send({ email: 'duplicate@test.com', currentPassword: 'Test@123' })
        .expect(400);

      expect(res.body.code).toBe('EMAIL_ALREADY_IN_USE');
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 6: Valid request
  // ──────────────────────────────────────────────────────────
  describe('Valid Request', () => {
    it('should accept valid request with correct password (200)', async () => {
      const { college, admin } = await createCollegeAdminPair({
        collegeOverrides: { code: 'VALID01', email: 'valid01@test.com' },
        adminEmail: 'admin.valid01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.valid01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/college/change-email/request')
        .send({ email: 'newvalid01@test.com', currentPassword: 'Test@123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('OTP sent successfully to your email');

      // OTP record should be stored against the NEW email
      const otpRecord = await PasswordReset.findOne({
        email: 'newvalid01@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 7: Invalid OTP + max attempts
  // ──────────────────────────────────────────────────────────
  describe('OTP Verification', () => {
    it('should reject invalid OTP (400)', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'OTP01', email: 'otp01@test.com' },
        adminEmail: 'admin.otp01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.otp01@test.com', password: 'Test@123' })
        .expect(200);

      // Seed an OTP for the new email
      await seedOTP('newotp01@test.com', '123456');

      const res = await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newotp01@test.com', otp: '000000' })
        .expect(400);

      expect(res.body.code).toBe('INVALID_OTP');
    });

    it('should block OTP after max failed attempts', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'OTP02', email: 'otp02@test.com' },
        adminEmail: 'admin.otp02@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.otp02@test.com', password: 'Test@123' })
        .expect(200);

      await seedOTP('newotp02@test.com', '123456');

      // 4 wrong attempts
      for (let i = 0; i < 4; i++) {
        const res = await agent
          .post('/api/college/change-email/verify')
          .send({ email: 'newotp02@test.com', otp: '000000' })
          .expect(400);

        expect(res.body.code).toBe('INVALID_OTP');
      }

      // 5th failed attempt should block
      const res = await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newotp02@test.com', otp: '000000' })
        .expect(400);

      expect(res.body.code).toBe('OTP_MAX_ATTEMPTS');

      // OTP should be marked as used (blocked)
      const otpRecord = await PasswordReset.findOne({ email: 'newotp02@test.com' });
      expect(otpRecord.isUsed).toBe(true);
    });

    it('should reject correct OTP after max attempts reached', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'OTP03', email: 'otp03@test.com' },
        adminEmail: 'admin.otp03@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.otp03@test.com', password: 'Test@123' })
        .expect(200);

      await seedOTP('newotp03@test.com', '123456');

      // Burn through all 5 attempts
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/api/college/change-email/verify')
          .send({ email: 'newotp03@test.com', otp: '000000' })
          .expect(400);
      }

      // Even correct OTP should be rejected
      const res = await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newotp03@test.com', otp: '123456' })
        .expect(400);

      expect(res.body.code).toBe('OTP_MAX_ATTEMPTS');
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 8: Valid OTP — success + User.email unchanged
  // ──────────────────────────────────────────────────────────
  describe('Valid OTP Verification', () => {
    it('should update College.email and NOT update User.email (200)', async () => {
      const { college, admin } = await createCollegeAdminPair({
        collegeOverrides: { code: 'SUCCESS01', email: 'success01@test.com' },
        adminEmail: 'admin.success01@test.com',
      });

      const originalUserEmail = admin.email;

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.success01@test.com', password: 'Test@123' })
        .expect(200);

      await seedOTP('newsuccess01@test.com', '123456');

      const res = await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newsuccess01@test.com', otp: '123456' })
        .expect(200);

      expect(res.body.success).toBe(true);

      // College.email changed
      const updatedCollege = await College.findById(college._id);
      expect(updatedCollege.email).toBe('newsuccess01@test.com');

      // User.email unchanged
      const unchangedUser = await User.findById(admin._id);
      expect(unchangedUser.email).toBe(originalUserEmail);
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 9: Transaction rollback
  // ──────────────────────────────────────────────────────────
  describe('Transaction Rollback', () => {
    const originalStartSession = College.startSession.bind(College);

    afterEach(async () => {
      College.startSession = originalStartSession;
      await clearTestDb();
    });

    it('should rollback College.email when transaction fails after OTP consumption', async () => {
      let forceFail = true;
      College.startSession = async () => {
        const session = await originalStartSession();
        const originalCommit = session.commitTransaction.bind(session);
        session.commitTransaction = async function (...args) {
          if (forceFail) {
            forceFail = false;
            throw new Error('forced transaction failure');
          }
          return originalCommit.apply(this, args);
        };
        return session;
      };

      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'ROLLBACK01', email: 'rollback01@test.com' },
        adminEmail: 'admin.rollback01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.rollback01@test.com', password: 'Test@123' })
        .expect(200);

      await seedOTP('newrollback01@test.com', '123456');

      const res = await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newrollback01@test.com', otp: '123456' });

      expect(res.status).toBe(500);

      // College.email must remain unchanged
      const unchangedCollege = await College.findById(college._id);
      expect(unchangedCollege.email).toBe('rollback01@test.com');

      // OTP must NOT be marked as used (rolled back)
      const otpRecord = await PasswordReset.findOne({ email: 'newrollback01@test.com' });
      expect(otpRecord.isUsed).toBe(false);
    });

    it('should allow OTP reuse after transaction rollback', async () => {
      let forceFail = true;
      College.startSession = async () => {
        const session = await originalStartSession();
        const originalCommit = session.commitTransaction.bind(session);
        session.commitTransaction = async function (...args) {
          if (forceFail) {
            forceFail = false;
            throw new Error('forced transaction failure');
          }
          return originalCommit.apply(this, args);
        };
        return session;
      };

      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'REUSE01', email: 'reuse01@test.com' },
        adminEmail: 'admin.reuse01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.reuse01@test.com', password: 'Test@123' })
        .expect(200);

      await seedOTP('newreuse01@test.com', '123456');

      // First attempt: forced rollback
      const res1 = await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newreuse01@test.com', otp: '123456' });

      expect(res1.status).toBe(500);

      const otpAfterRollback = await PasswordReset.findOne({ email: 'newreuse01@test.com' });
      expect(otpAfterRollback.isUsed).toBe(false);

      // Second attempt: should succeed with the same OTP
      const res2 = await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newreuse01@test.com', otp: '123456' })
        .expect(200);

      expect(res2.body.success).toBe(true);

      const updatedCollege = await College.findById(college._id);
      expect(updatedCollege.email).toBe('newreuse01@test.com');

      const otpAfterSuccess = await PasswordReset.findOne({ email: 'newreuse01@test.com' });
      expect(otpAfterSuccess.isUsed).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 10: Concurrent OTP consumption
  // ──────────────────────────────────────────────────────────
  describe('Concurrent OTP Consumption', () => {
    it('should allow exactly one of two concurrent valid requests', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: { code: 'CONC01', email: 'conc01@test.com' },
        adminEmail: 'admin.conc01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.conc01@test.com', password: 'Test@123' })
        .expect(200);

      await seedOTP('newconc01@test.com', '123456');

      const [resA, resB] = await Promise.all([
        agent.post('/api/college/change-email/verify').send({ email: 'newconc01@test.com', otp: '123456' }),
        agent.post('/api/college/change-email/verify').send({ email: 'newconc01@test.com', otp: '123456' }),
      ]);

      const successCount = [resA, resB].filter((r) => r.status === 200).length;
      const rejectCount = [resA, resB].filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(1);

      const rejected = [resA, resB].find((r) => r.status === 400);
      expect(rejected.body.code).toBe('OTP_ALREADY_USED');

      const updatedCollege = await College.findById(college._id);
      expect(updatedCollege.email).toBe('newconc01@test.com');
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 11: Normal profile update regression
  // ──────────────────────────────────────────────────────────
  describe('Normal Profile Update Regression', () => {
    it('should continue to update name, contactNumber, address, establishedYear', async () => {
      const { college } = await createCollegeAdminPair({
        collegeOverrides: {
          code: 'REG01',
          email: 'reg01@test.com',
          name: 'Original College',
          contactNumber: '9999999999',
          address: 'Original Address',
          establishedYear: 2010,
        },
        adminEmail: 'admin.reg01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.reg01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put('/api/college/edit/my-college')
        .send({
          name: 'Updated College',
          code: college.code,
          contactNumber: '8888888888',
          address: 'Updated Address',
          establishedYear: 2015,
        })
        .expect(200);

      expect(res.body.message).toBe('College profile updated successfully');

      const updated = await College.findById(college._id);
      expect(updated.name).toBe('Updated College');
      expect(updated.contactNumber).toBe('8888888888');
      expect(updated.address).toBe('Updated Address');
      expect(updated.establishedYear).toBe(2015);
      expect(updated.email).toBe('reg01@test.com');
    });
  });

  // ──────────────────────────────────────────────────────────
  // SECTION 12: Security audit on successful change
  // ──────────────────────────────────────────────────────────
  describe('Security Audit', () => {
    it('should create COLLEGE_EMAIL_CHANGED audit on successful change', async () => {
      const { college, admin } = await createCollegeAdminPair({
        collegeOverrides: { code: 'AUDIT01', email: 'audit01@test.com' },
        adminEmail: 'admin.audit01@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.audit01@test.com', password: 'Test@123' })
        .expect(200);

      await seedOTP('newaudit01@test.com', '123456');

      await agent
        .post('/api/college/change-email/verify')
        .send({ email: 'newaudit01@test.com', otp: '123456' })
        .expect(200);

      const audits = await SecurityAudit.find({
        eventType: 'COLLEGE_EMAIL_CHANGED',
        collegeId: college._id,
      });

      expect(audits.length).toBe(1);
      expect(audits[0].metadata.previousEmail).toBe('audit01@test.com');
      expect(audits[0].metadata.newEmail).toBe('newaudit01@test.com');
    });

    it('should log COLLEGE_EMAIL_CHANGE_REQUESTED on request step', async () => {
      const { college, admin } = await createCollegeAdminPair({
        collegeOverrides: { code: 'AUDIT02', email: 'audit02@test.com' },
        adminEmail: 'admin.audit02@test.com',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.audit02@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/college/change-email/request')
        .send({ email: 'newaudit02@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const audits = await SecurityAudit.find({
        eventType: 'COLLEGE_EMAIL_CHANGE_REQUESTED',
        collegeId: college._id,
      });

      expect(audits.length).toBeGreaterThan(0);
    });
  });
});
