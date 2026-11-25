const mongoose = require('mongoose');
const request = require('supertest');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser } = require('../helpers/factories');
const GeneralSettings = require('../../src/models/generalSettings.model');
const User = require('../../src/models/user.model');
const AuthSession = require('../../src/models/authSession.model');
const RefreshToken = require('../../src/models/refreshToken.model');
const { deactivateInactiveUsers } = require('../../src/cron/userDeactivation.cron');
const app = require('../../app');

describe('Security & Automation Policy Enforcement (#582)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('Password Expiry Enforcement (passwordExpiryDays)', () => {
    it('blocks login with HTTP 403 PASSWORD_EXPIRED when password exceeds passwordExpiryDays', async () => {
      const college = await createCollege({ code: 'EXP001' });

      // Configure GeneralSettings with passwordExpiryDays: 30
      await GeneralSettings.create({
        college_id: college._id,
        passwordExpiryDays: 30,
        minPasswordLength: 8,
      });

      // User whose password was changed 45 days ago
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const user = await createUser({
        email: 'expireduser@test.com',
        password: 'Password@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
        passwordChangedAt: fortyFiveDaysAgo,
      });

      // Ensure passwordChangedAt is preserved in DB
      await User.findByIdAndUpdate(user._id, { passwordChangedAt: fortyFiveDaysAgo });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'expireduser@test.com', password: 'Password@123' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('PASSWORD_EXPIRED');
      expect(res.body.passwordExpired).toBe(true);
      expect(res.body.mustChangePassword).toBe(true);
    });

    it('permits login and records lastLogin when password is within passwordExpiryDays', async () => {
      const college = await createCollege({ code: 'EXP002' });

      await GeneralSettings.create({
        college_id: college._id,
        passwordExpiryDays: 90,
      });

      const user = await createUser({
        email: 'validpassuser@test.com',
        password: 'Password@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'validpassuser@test.com', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify lastLogin timestamp was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.lastLogin).not.toBeNull();
      expect(new Date(updatedUser.lastLogin).getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('exempts Super Admin from password expiry even with old passwordChangedAt', async () => {
      const superAdmin = await createUser({
        email: 'superadmin_expiry@test.com',
        password: 'Password@123',
        role: 'SUPER_ADMIN',
        isActive: true,
      });

      // Set passwordChangedAt to 500 days ago
      const longAgo = new Date(Date.now() - 500 * 24 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(superAdmin._id, { passwordChangedAt: longAgo });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'superadmin_expiry@test.com', password: 'Password@123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Auto-Disable Inactive Users Cron (autoDisableInactiveDays)', () => {
    it('deactivates inactive users and revokes active sessions when past threshold', async () => {
      const college = await createCollege({ code: 'INACT001' });

      // Configure GeneralSettings with autoDisableInactiveDays: 60
      await GeneralSettings.create({
        college_id: college._id,
        autoDisableInactiveDays: 60,
      });

      // User 1: Inactive for 90 days (should be deactivated)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const inactiveUser = await createUser({
        email: 'dormant@test.com',
        password: 'Password@123',
        role: 'TEACHER',
        college_id: college._id,
        isActive: true,
      });
      await User.findByIdAndUpdate(inactiveUser._id, {
        lastLogin: ninetyDaysAgo,
        createdAt: ninetyDaysAgo,
      });

      // Create an active session and refresh token for this dormant user
      await AuthSession.create({
        sessionId: 'session-dormant-1',
        user_id: inactiveUser._id,
        college_id: college._id,
        role: 'TEACHER',
        refreshTokenHash: 'hash123',
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
      });
      await RefreshToken.create({
        user_id: inactiveUser._id,
        token: 'token123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      });

      // User 2: Active 10 days ago (should remain active)
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const activeUser = await createUser({
        email: 'active@test.com',
        password: 'Password@123',
        role: 'TEACHER',
        college_id: college._id,
        isActive: true,
      });
      await User.findByIdAndUpdate(activeUser._id, {
        lastLogin: tenDaysAgo,
      });

      // User 3: Super Admin dormant for 200 days (should NEVER be deactivated)
      const superAdmin = await createUser({
        email: 'superadmin_dormant@test.com',
        password: 'Password@123',
        role: 'SUPER_ADMIN',
        isActive: true,
      });
      await User.findByIdAndUpdate(superAdmin._id, {
        lastLogin: ninetyDaysAgo,
      });

      // Execute cron worker
      const result = await deactivateInactiveUsers();
      expect(result.deactivatedCount).toBe(1);

      // Verify dormant user is now deactivated
      const refreshedDormant = await User.findById(inactiveUser._id);
      expect(refreshedDormant.isActive).toBe(false);
      expect(refreshedDormant.deactivationReason).toBe('AUTO_INACTIVITY_TIMEOUT');

      // Verify active session was invalidated
      const session = await AuthSession.findOne({ user_id: inactiveUser._id });
      expect(session.isActive).toBe(false);
      expect(session.invalidationReason).toBe('ACCOUNT_DEACTIVATED');

      // Verify refresh token was revoked
      const token = await RefreshToken.findOne({ user_id: inactiveUser._id });
      expect(token.isRevoked).toBe(true);

      // Verify active user remained active
      const refreshedActive = await User.findById(activeUser._id);
      expect(refreshedActive.isActive).toBe(true);

      // Verify Super Admin remained active
      const refreshedSuperAdmin = await User.findById(superAdmin._id);
      expect(refreshedSuperAdmin.isActive).toBe(true);
    });
  });
});
