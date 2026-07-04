const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { connectTestDb, clearTestDb, closeTestDb } = require('../../setup/testDb');
const { createCollege, createUser, createTeacher, createStudent } = require('../../helpers/factories');
const { login } = require('../../helpers/testAuth');
const app = require('../../../app');
const request = require('supertest');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const logTokenDiagnostic = (token, user, route, role, errorContext) => {
  const decoded = jwt.decode(token);
  const tokenPreview = `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
  console.log(`[TOKEN DIAGNOSTIC] ${errorContext} - route=${route}, role=${role}`);
  console.log(`  Token cookie (preview): ${tokenPreview}`);
  if (decoded) {
    console.log(`  JWT payload: userId=${decoded.id}, role=${decoded.role}, iat=${decoded.iat}, exp=${decoded.exp}`);
  } else {
    console.log(`  JWT payload: FAILED TO DECODE`);
  }
  console.log(`  User object: _id=${user._id?.toString() || 'N/A'}, role=${user.role}, college_id=${user.college_id?.toString() || 'N/A'}`);
};

const ROLES = [
  'SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT',
  'ADMISSION_OFFICER', 'PARENT_GUARDIAN', 'PLATFORM_SUPPORT', 'TEACHER', 'STUDENT'
];

const rbacMatrix = [
  { route: '/api/college/setup-complete', method: 'post', allowed: ['COLLEGE_ADMIN'] },
  { route: '/api/master/create/college', method: 'post', allowed: ['SUPER_ADMIN'] },
  { route: '/api/college/staff', method: 'post', allowed: ['COLLEGE_ADMIN'] },
  { route: '/api/teachers', method: 'get', allowed: ['COLLEGE_ADMIN', 'HOD', 'TEACHER', 'PRINCIPAL'] },
  { route: '/api/students/my-profile', method: 'get', allowed: ['STUDENT'] },
  { route: '/api/students/teacher', method: 'get', allowed: ['TEACHER'] },
  { route: '/api/accountant/dashboard', method: 'get', allowed: ['ACCOUNTANT'] },
  { route: '/api/parent/children', method: 'get', allowed: ['PARENT_GUARDIAN'] },
  { route: '/api/hod/dashboard', method: 'get', allowed: ['TEACHER', 'HOD'] },
  { route: '/api/platform-support/health', method: 'get', allowed: ['PLATFORM_SUPPORT'] },
];

describe('RBAC Matrix - Role-Based Access Control', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const extractToken = (setCookie) => {
    const tokenCookie = setCookie.find((c) => c.startsWith('token='));
    if (!tokenCookie) return null;
    const match = tokenCookie.match(/^token=([^;]+)/);
    return match ? match[1] : null;
  };

  const getAgentForRole = async (role, route, method) => {
    const college = await createCollege({ code: `RBAC-${role}`, email: `rbac-${role.toLowerCase()}@test.com` });
    const user = await createUser({
      email: `${role.toLowerCase()}-${route.replace(/\//g, '-')}-${method}@test.com`,
      password: 'Test@123',
      role,
      college_id: college._id,
      isActive: true,
    });

    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@123' });

    if (loginRes.status !== 200) {
      throw new Error(
        `Login failed for role ${role} (${route}): status=${loginRes.status} body=${JSON.stringify(loginRes.body)}`
      );
    }

    const setCookie = loginRes.headers['set-cookie'] || [];
    const token = extractToken(setCookie);
    const hasTokenCookie = !!token;

    if (!hasTokenCookie) {
      const retryRes = await agent
        .post('/api/auth/login')
        .send({ email: user.email, password: 'Test@123' });

      if (retryRes.status !== 200) {
        throw new Error(
          `Login retry failed for role ${role} (${route}): status=${retryRes.status} body=${JSON.stringify(retryRes.body)}`
        );
      }

      const retrySetCookie = retryRes.headers['set-cookie'] || [];
      const retryToken = extractToken(retrySetCookie);
      const retryHasCookie = !!retryToken;

      if (!retryHasCookie) {
        throw new Error(
          `No token cookie after login retry for role ${role} (${route}). Set-cookie: ${JSON.stringify(retrySetCookie)}`
        );
      }
    }

    return { agent, college, user, loginRes, token };
  };

  describe.each(rbacMatrix)('$method $route', ({ route, method, allowed }) => {
    test.each(ROLES)('role: %s', async (role) => {
      const { agent, user, token } = await getAgentForRole(role, route, method);

      let response;
      if (method === 'get') {
        response = await agent.get(route);
      } else if (method === 'post') {
        response = await agent.post(route);
      } else if (method === 'put') {
        response = await agent.put(route);
      } else if (method === 'delete') {
        response = await agent.delete(route);
      }

      if (response.status === 401 && token) {
        logTokenDiagnostic(token, user, route, role, 'PROTECTED_ROUTE_RETURNED_401');
      }

      // DIAGNOSTIC LOGGING: Always log for the specific block in question
      if (route === '/api/college/setup-complete' && method === 'post') {
        console.log('DIAGNOSTIC_CHECK', role, response.status);
        console.log('DIAGNOSTIC_USER', user._id?.toString(), user.role, user.college_id?.toString());
      }

      if (allowed.includes(role)) {
        expect(response.status).not.toBe(403);
      } else {
        expect(response.status).toBe(403);
      }
    });
  });
});