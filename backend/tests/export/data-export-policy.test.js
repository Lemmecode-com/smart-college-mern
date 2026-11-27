const request = require('supertest');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser } = require('../helpers/factories');
const GeneralSettings = require('../../src/models/generalSettings.model');
const checkDataExport = require('../../src/middlewares/checkDataExport.middleware');
const express = require('express');

describe('Data Export Policy Enforcement (#583)', () => {
  let app;

  beforeAll(async () => {
    await connectTestDb();

    // Create a lightweight express test app using the checkDataExport middleware
    app = express();
    app.use(express.json());

    // Fake authentication injector for testing various roles
    app.use((req, res, next) => {
      req.user = req.headers['x-test-user']
        ? JSON.parse(req.headers['x-test-user'])
        : null;
      if (req.user?.college_id) {
        req.college_id = req.user.college_id;
      }
      next();
    });

    // Test export endpoint protected by checkDataExport
    app.get('/api/test/export', checkDataExport, (req, res) => {
      res.json({ success: true, message: 'Export data generated successfully' });
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('When allowDataExport is "disabled"', () => {
    it('returns HTTP 403 EXPORT_DISABLED for college users (including College Admin)', async () => {
      const college = await createCollege({ code: 'EXP_DIS' });
      await GeneralSettings.create({
        college_id: college._id,
        allowDataExport: 'disabled',
      });

      // College Admin attempt
      const adminUser = {
        id: 'admin1',
        role: 'COLLEGE_ADMIN',
        college_id: college._id.toString(),
      };
      const resAdmin = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(adminUser));

      expect(resAdmin.status).toBe(403);
      expect(resAdmin.body.success).toBe(false);
      expect(resAdmin.body.code).toBe('EXPORT_DISABLED');

      // Teacher attempt
      const teacherUser = {
        id: 'teacher1',
        role: 'TEACHER',
        college_id: college._id.toString(),
      };
      const resTeacher = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(resTeacher.status).toBe(403);
      expect(resTeacher.body.code).toBe('EXPORT_DISABLED');
    });

    it('exempts Super Admin and allows export even when policy is "disabled"', async () => {
      const college = await createCollege({ code: 'EXP_SA' });
      await GeneralSettings.create({
        college_id: college._id,
        allowDataExport: 'disabled',
      });

      const superAdminUser = {
        id: 'sa1',
        role: 'SUPER_ADMIN',
        college_id: college._id.toString(),
      };
      const res = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(superAdminUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('When allowDataExport is "restricted"', () => {
    it('blocks lower-tier roles (Teacher, Student) with HTTP 403 EXPORT_RESTRICTED', async () => {
      const college = await createCollege({ code: 'EXP_RES' });
      await GeneralSettings.create({
        college_id: college._id,
        allowDataExport: 'restricted',
      });

      const teacherUser = {
        id: 'teacher2',
        role: 'TEACHER',
        college_id: college._id.toString(),
      };
      const resTeacher = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(resTeacher.status).toBe(403);
      expect(resTeacher.body.code).toBe('EXPORT_RESTRICTED');

      const studentUser = {
        id: 'student1',
        role: 'STUDENT',
        college_id: college._id.toString(),
      };
      const resStudent = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(studentUser));

      expect(resStudent.status).toBe(403);
      expect(resStudent.body.code).toBe('EXPORT_RESTRICTED');
    });

    it('permits College Admin and Principal when policy is "restricted"', async () => {
      const college = await createCollege({ code: 'EXP_RES2' });
      await GeneralSettings.create({
        college_id: college._id,
        allowDataExport: 'restricted',
      });

      const adminUser = {
        id: 'admin2',
        role: 'COLLEGE_ADMIN',
        college_id: college._id.toString(),
      };
      const resAdmin = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(adminUser));

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);

      const principalUser = {
        id: 'principal1',
        role: 'PRINCIPAL',
        college_id: college._id.toString(),
      };
      const resPrincipal = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(principalUser));

      expect(resPrincipal.status).toBe(200);
      expect(resPrincipal.body.success).toBe(true);
    });
  });

  describe('When allowDataExport is "allowed"', () => {
    it('permits all authenticated roles to export data', async () => {
      const college = await createCollege({ code: 'EXP_ALL' });
      await GeneralSettings.create({
        college_id: college._id,
        allowDataExport: 'allowed',
      });

      const teacherUser = {
        id: 'teacher3',
        role: 'TEACHER',
        college_id: college._id.toString(),
      };
      const resTeacher = await request(app)
        .get('/api/test/export')
        .set('x-test-user', JSON.stringify(teacherUser));

      expect(resTeacher.status).toBe(200);
      expect(resTeacher.body.success).toBe(true);
    });
  });
});
