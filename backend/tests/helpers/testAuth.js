const request = require('supertest');

/**
 * testAuth — cookie-based auth helper.
 *
 * WHY AGENT:
 *   The project auth middleware reads req.cookies.token. request.agent(app) persists
 *   Set-Cookie headers automatically across calls, so a single login populates cookies
 *   for every subsequent authenticated request in that agent.
 */

const login = async (app, credentials) => {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/login')
    .send(credentials)
    .expect(200);

  return { agent, response };
};

const loginAsSuperAdmin = async (app, email, password) =>
  login(app, { email, password });

const loginAsCollegeAdmin = async (app, email, password) =>
  login(app, { email, password });

const loginAsPrincipal = async (app, email, password) =>
  login(app, { email, password });

const loginAsHOD = async (app, email, password) =>
  login(app, { email, password });

const loginAsAccountant = async (app, email, password) =>
  login(app, { email, password });

const loginAsAdmissionOfficer = async (app, email, password) =>
  login(app, { email, password });

const loginAsParentGuardian = async (app, email, password) =>
  login(app, { email, password });

const loginAsPlatformSupport = async (app, email, password) =>
  login(app, { email, password });

const loginAsTeacher = async (app, email, password) =>
  login(app, { email, password });

const loginAsStudent = async (app, email, password) =>
  login(app, { email, password });

module.exports = {
  login,
  loginAsSuperAdmin,
  loginAsCollegeAdmin,
  loginAsPrincipal,
  loginAsHOD,
  loginAsAccountant,
  loginAsAdmissionOfficer,
  loginAsParentGuardian,
  loginAsPlatformSupport,
  loginAsTeacher,
  loginAsStudent,
};
