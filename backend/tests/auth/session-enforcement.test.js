const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createTeacher, createStudent } = require('../helpers/factories');
const GeneralSettings = require('../../src/models/generalSettings.model');
const AuthSession = require('../../src/models/authSession.model');
const RefreshToken = require('../../src/models/refreshToken.model');
const PasswordReset = require('../../src/models/passwordReset.model');
const app = require('../../app');

describe('Auth - Session Enforcement', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const getCookies = (res) => {
    const cookieHeader = res.headers['set-cookie'];
    if (!cookieHeader) return {};
    const cookies = {};
    cookieHeader.forEach((c) => {
      const [nameValue] = c.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = value;
    });
    return cookies;
  };

  const uniqueEmail = () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;

  describe('allowMultipleLogins = allowed', () => {
    it('allows multiple active sessions for same user', async () => {
      const college = await createCollege({ code: 'ALLOW001' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'allowed',
      });

      const email = uniqueEmail();
      await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const browserA = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserA.status).toBe(200);

      const browserB = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserB.status).toBe(200);

      const sessions = await AuthSession.find({
        user_id: browserA.body.data.user.id,
      });
      const activeSessions = sessions.filter((s) => s.isActive);
      expect(activeSessions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('allowMultipleLogins = restricted', () => {
    it('deactivates previous active session on new login', async () => {
      const college = await createCollege({ code: 'RESTR001' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'restricted',
      });

      const email = uniqueEmail();
      await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const browserA = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserA.status).toBe(200);
      const cookiesA = getCookies(browserA);
      expect(cookiesA.token).toBeDefined();

      const decodedA = jwt.decode(cookiesA.token);
      const sessionA = await AuthSession.findOne({ sessionId: decodedA.sessionId });
      expect(sessionA.isActive).toBe(true);

      const browserB = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserB.status).toBe(200);

      const sessionAfterB = await AuthSession.findOne({ sessionId: decodedA.sessionId });
      expect(sessionAfterB.isActive).toBe(false);
    });

    it('returns SESSION_INVALIDATED when old session makes API request', async () => {
      const college = await createCollege({ code: 'RESTR002' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'restricted',
      });

      const email = uniqueEmail();
      await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const browserA = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserA.status).toBe(200);
      const cookiesA = getCookies(browserA);

      const browserB = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserB.status).toBe(200);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${cookiesA.token}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('SESSION_INVALIDATED');
      expect(res.body.error.message).toContain('another location');
    });

    it('allows new session to continue working', async () => {
      const college = await createCollege({ code: 'RESTR003' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'restricted',
      });

      const email = uniqueEmail();
      await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const browserA = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserA.status).toBe(200);

      const browserB = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserB.status).toBe(200);
      const cookiesB = getCookies(browserB);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${cookiesB.token}`);

      expect(res.status).toBe(200);
    });

    it('rejects refresh token from invalidated session', async () => {
      const college = await createCollege({ code: 'RESTR004' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'restricted',
      });

      const email = uniqueEmail();
      await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const browserA = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserA.status).toBe(200);
      const cookiesA = getCookies(browserA);

      const browserB = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserB.status).toBe(200);

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `token=${cookiesA.token}; refreshToken=${cookiesA.refreshToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('allows refresh token from active session', async () => {
      const college = await createCollege({ code: 'RESTR005' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'restricted',
      });

      const email = uniqueEmail();
      await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const browserB = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(browserB.status).toBe(200);
      const cookiesB = getCookies(browserB);

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `token=${cookiesB.token}; refreshToken=${cookiesB.refreshToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('password reset', () => {
    it('invalidates all sessions on password reset', async () => {
      const college = await createCollege({ code: 'RESET001' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'allowed',
      });

      const email = uniqueEmail();
      const user = await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(loginRes.status).toBe(200);

      const sessionCountBefore = await AuthSession.countDocuments({
        user_id: user._id,
        isActive: true,
      });
      expect(sessionCountBefore).toBeGreaterThanOrEqual(1);

      const { generateOTP } = require('../../src/services/otp.service');
      const otp = generateOTP();
      await PasswordReset.create({
        email,
        otpHash: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
      });

      const resetRes = await request(app)
        .post('/api/auth/verify-otp-reset')
        .send({ email, otp, newPassword: 'NewPass@123' });

      expect(resetRes.status).toBe(200);

      const sessionCountAfter = await AuthSession.countDocuments({
        user_id: user._id,
        isActive: true,
      });
      expect(sessionCountAfter).toBe(0);
    });
  });

  describe('change password', () => {
    it('invalidates all sessions on password change', async () => {
      const college = await createCollege({ code: 'CHGPW001' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'allowed',
      });

      const email = uniqueEmail();
      const user = await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(loginRes.status).toBe(200);

      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .send({ userId: user._id.toString(), currentPassword: 'Test@123', newPassword: 'NewPass@123' });

      expect(changeRes.status).toBe(200);

      const sessionCountAfter = await AuthSession.countDocuments({
        user_id: user._id,
        isActive: true,
      });
      expect(sessionCountAfter).toBe(0);
    });
  });

  describe('logout', () => {
    it('keeps session inactive after logout', async () => {
      const college = await createCollege({ code: 'LOGOUT001' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'allowed',
      });

      const email = uniqueEmail();
      await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'Test@123' });

      expect(loginRes.status).toBe(200);
      const cookies = getCookies(loginRes);
      expect(cookies.token).toBeDefined();

      const decoded = jwt.decode(cookies.token);
      expect(decoded.sessionId).toBeDefined();

      const sessionBefore = await AuthSession.findOne({ sessionId: decoded.sessionId });
      expect(sessionBefore.isActive).toBe(true);

      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${cookies.token}`);

      const sessionAfter = await AuthSession.findOne({ sessionId: decoded.sessionId });
      expect(sessionAfter.isActive).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    it('allows JWTs without sessionId to continue working', async () => {
      const college = await createCollege({ code: 'COMPAT001' });
      await GeneralSettings.create({
        college_id: college._id,
        allowMultipleLogins: 'allowed',
      });

      const email = uniqueEmail();
      const user = await createUser({
        email,
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const oldToken = jwt.sign(
        { id: user._id, role: 'COLLEGE_ADMIN', college_id: college._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${oldToken}`);

      expect(res.status).toBe(200);
    });
  });
});
