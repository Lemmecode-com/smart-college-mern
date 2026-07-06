const jwt = require('jsonwebtoken');
const { connectTestDb, clearTestDb, closeTestDb } = require('../../setup/testDb');
const { createCollege, createUser } = require('../../helpers/factories');
const app = require('../../../app');

describe('Auth - JWT Expiry', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('access token lifetime matches JWT_ACCESS_EXPIRY (900 seconds for 15m), not JWT_EXPIRE (604800 seconds)', async () => {
    const college = await createCollege({ code: 'JWT001' });
    await createUser({
      email: 'jwtexpire@test.com',
      password: 'Test@123',
      role: 'SUPER_ADMIN',
      college_id: college._id,
      isActive: true,
    });

    const response = await require('supertest')(app)
      .post('/api/auth/login')
      .send({ email: 'jwtexpire@test.com', password: 'Test@123' })
      .expect(200);

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();

    const token = tokenCookie.split(';')[0].split('=')[1];

    const decoded = jwt.decode(token, { complete: true });
    expect(decoded).toBeDefined();

    const exp = decoded.payload.exp;
    const iat = decoded.payload.iat;

    const lifetimeSeconds = exp - iat;

    // JWT_ACCESS_EXPIRY=15m in .env.test = 900 seconds
    expect(lifetimeSeconds).toBe(900);
  });
});