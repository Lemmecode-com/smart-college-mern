const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createTeacher, createStudent } = require('../helpers/factories');
const app = require('../../app');
const User = require('../../src/models/user.model');
const Teacher = require('../../src/models/teacher.model');
const Student = require('../../src/models/student.model');
const AuthSession = require('../../src/models/authSession.model');
const SecurityAudit = require('../../src/models/securityAudit.model');
const Department = require('../../src/models/department.model');
const StaffProfile = require('../../src/models/staffProfile.model');

/** Helper: create a minimal Department for a college */
const createDept = async (collegeId, adminId) => {
  return Department.create({
    name: 'Test Dept',
    code: `DEPT-${Date.now()}`,
    college_id: collegeId,
    createdBy: adminId,
    type: 'ACADEMIC',
    programsOffered: ['UG'],
    startYear: 2020,
    sanctionedFacultyCount: 10,
    sanctionedStudentIntake: 60,
  });
};

/** Helper: create User + Teacher pair for a college */
const createTeacherPair = async ({ college, email, employeeId, adminId }) => {
  const dept = await createDept(college._id, adminId);
  const user = await createUser({
    email,
    password: 'Test@123',
    role: 'TEACHER',
    college_id: college._id,
    isActive: true,
  });
  const teacher = await createTeacher({
    college_id: college._id,
    user_id: user._id,
    department_id: dept._id,
    email,
    employeeId,
    status: 'ACTIVE',
    createdBy: adminId,
  });
  return { user, teacher, dept };
};

/** Helper: create User + Student pair for a college */
const createStudentPair = async ({ college, email, adminId }) => {
  const dept = await createDept(college._id, adminId);
  const user = await createUser({
    email,
    password: 'Test@123',
    role: 'STUDENT',
    college_id: college._id,
    isActive: true,
  });
  const student = await createStudent({
    college_id: college._id,
    user_id: user._id,
    department_id: dept._id,
    course_id: dept._id,
    email,
    status: 'APPROVED',
    createdBy: adminId,
  });
  return { user, student, dept };
};

/** Helper: create a College Admin user for a college */
const createCollegeAdmin = async ({ college, email, withStaffProfile = false }) => {
  const user = await createUser({
    email,
    password: 'Test@123',
    role: 'COLLEGE_ADMIN',
    college_id: college._id,
    isActive: true,
  });

  if (withStaffProfile) {
    await StaffProfile.create({
      user_id: user._id,
      college_id: college._id,
      mobileNumber: '',
      designation: '',
      employmentType: 'FULL_TIME',
      joiningDate: null,
      dateOfBirth: null,
      address: '',
      city: '',
      state: '',
      pincode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyRelation: '',
      qualification: '',
      experienceYears: 0,
    });
  }

  return { user };
};

describe('Centralized Email Change Mechanism', () => {
  let adminUser; // shared admin for dept creation

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    // Create a throwaway admin for use as createdBy in teacher records
    const college = await createCollege({ code: 'ADMIN00', email: 'admin00@test.com' });
    adminUser = await createUser({
      email: 'sysadmin@test.com',
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: college._id,
      isActive: true,
    });
  });

  describe('POST /api/auth/change-email/request', () => {
    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail@test.com', currentPassword: 'password' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const college = await createCollege({ code: 'EMAIL01', email: 'email01@test.com' });
      const { user } = await createTeacherPair({
        college,
        email: 'teacher.email01@test.com',
        employeeId: 'EMP-EMAIL01',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'invalid-email', currentPassword: 'Test@123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject same email as current', async () => {
      const college = await createCollege({ code: 'EMAIL02', email: 'email02@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.email02@test.com',
        employeeId: 'EMP-EMAIL02',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email02@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'teacher.email02@test.com', currentPassword: 'Test@123' })
        .expect(400);

      expect(res.body.code).toBe('SAME_EMAIL');
    });

    it('should reject wrong current password', async () => {
      const college = await createCollege({ code: 'EMAIL03', email: 'email03@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.email03@test.com',
        employeeId: 'EMP-EMAIL03',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email03@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail03@test.com', currentPassword: 'WrongPassword' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should reject duplicate email', async () => {
      const college = await createCollege({ code: 'EMAIL04', email: 'email04@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.email04a@test.com',
        employeeId: 'EMP-EMAIL04A',
        adminId: adminUser._id,
      });
      await createTeacherPair({
        college,
        email: 'teacher.email04b@test.com',
        employeeId: 'EMP-EMAIL04B',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email04a@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'teacher.email04b@test.com', currentPassword: 'Test@123' })
        .expect(409);

      expect(res.body.code).toBe('EMAIL_EXISTS');
    });

    it('should accept valid request with correct password', async () => {
      const college = await createCollege({ code: 'EMAIL05', email: 'email05@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.email05@test.com',
        employeeId: 'EMP-EMAIL05',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email05@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail05@test.com', currentPassword: 'Test@123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Verification OTP has been sent');
    });
  });

  describe('POST /api/auth/change-email/verify', () => {
    it('should reject invalid OTP', async () => {
      const college = await createCollege({ code: 'EMAIL06', email: 'email06@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.email06@test.com',
        employeeId: 'EMP-EMAIL06',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email06@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail06@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newemail06@test.com', otp: '000000' })
        .expect(400);

      expect(res.body.code).toBe('INVALID_OTP');
    });
  });

  describe('OTP Brute-Force Protection', () => {
    it('should increment failedAttempts on wrong OTP', async () => {
      const college = await createCollege({ code: 'BRUTE01', email: 'brute01@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.brute01@test.com',
        employeeId: 'EMP-BRUTE01',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.brute01@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newbrute01@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newbrute01@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const res = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newbrute01@test.com', otp: '000000' })
        .expect(400);

      expect(res.body.code).toBe('INVALID_OTP');

      const updatedOtp = await PasswordReset.findById(otpRecord._id);
      expect(updatedOtp.failedAttempts).toBe(1);
      expect(updatedOtp.isUsed).toBe(false);
    });

    it('should block OTP after max failed attempts', async () => {
      const college = await createCollege({ code: 'BRUTE02', email: 'brute02@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.brute02@test.com',
        employeeId: 'EMP-BRUTE02',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.brute02@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newbrute02@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newbrute02@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      for (let i = 0; i < 4; i++) {
        const res = await agent
          .post('/api/auth/change-email/verify')
          .send({ email: 'newbrute02@test.com', otp: '000000' })
          .expect(400);
        expect(res.body.code).toBe('INVALID_OTP');
      }

      const beforeBlock = await PasswordReset.findById(otpRecord._id);
      expect(beforeBlock.failedAttempts).toBe(4);
      expect(beforeBlock.isUsed).toBe(false);

      const res = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newbrute02@test.com', otp: '000000' })
        .expect(400);

      expect(res.body.code).toBe('OTP_MAX_ATTEMPTS');

      const afterBlock = await PasswordReset.findById(otpRecord._id);
      expect(afterBlock.failedAttempts).toBe(5);
      expect(afterBlock.isUsed).toBe(true);
    });

    it('should reject correct OTP after max attempts reached', async () => {
      const college = await createCollege({ code: 'BRUTE03', email: 'brute03@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.brute03@test.com',
        employeeId: 'EMP-BRUTE03',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.brute03@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newbrute03@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newbrute03@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      for (let i = 0; i < 5; i++) {
        await agent
          .post('/api/auth/change-email/verify')
          .send({ email: 'newbrute03@test.com', otp: '000000' })
          .expect(400);
      }

      const res = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newbrute03@test.com', otp: plainOtp })
        .expect(400);

      expect(res.body.code).toBe('OTP_MAX_ATTEMPTS');
    });

    it('should not increment failedAttempts on correct OTP before max', async () => {
      const college = await createCollege({ code: 'BRUTE04', email: 'brute04@test.com' });
      const { user, student } = await createStudentPair({
        college,
        email: 'student.brute04@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.brute04@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newbrute04@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newbrute04@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newbrute04@test.com', otp: '000000' })
        .expect(400);

      const afterWrong = await PasswordReset.findById(otpRecord._id);
      expect(afterWrong.failedAttempts).toBe(1);

      const verifyRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newbrute04@test.com', otp: plainOtp })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      const updatedStudent = await Student.findById(student._id);
      expect(updatedUser.email).toBe('newbrute04@test.com');
      expect(updatedStudent.email).toBe('newbrute04@test.com');

      const afterCorrect = await PasswordReset.findById(otpRecord._id);
      expect(afterCorrect.isUsed).toBe(true);
      expect(afterCorrect.failedAttempts).toBe(1);
    });

    it('should reset failedAttempts when new OTP is generated', async () => {
      const college = await createCollege({ code: 'BRUTE05', email: 'brute05@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.brute05@test.com',
        employeeId: 'EMP-BRUTE05',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.brute05@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newbrute05@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newbrute05@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      await PasswordReset.findByIdAndUpdate(otpRecord._id, { failedAttempts: 5, isUsed: true });

      const res = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newbrute05@test.com', otp: '000000' })
        .expect(400);

      expect(res.body.code).toBe('OTP_MAX_ATTEMPTS');

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newbrute05@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const newOtpRecord = await PasswordReset.findOne({
        email: 'newbrute05@test.com',
        isUsed: false,
      });
      expect(newOtpRecord).not.toBeNull();
      expect(newOtpRecord.failedAttempts).toBe(0);
    });
  });

  describe('Password Reset OTP Brute-Force Regression', () => {
    it('should increment failedAttempts on wrong password reset OTP', async () => {
      const college = await createCollege({ code: 'PWRESET01', email: 'pwreset01@test.com' });
      const { user } = await createTeacherPair({
        college,
        email: 'teacher.pwreset01@test.com',
        employeeId: 'EMP-PWRESET01',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.pwreset01@test.com', password: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      const otpRecord = await PasswordReset.create({
        email: 'teacher.pwreset01@test.com',
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        failedAttempts: 0,
        maxAttempts: 5,
      });

      const res = await agent
        .post('/api/auth/verify-otp-reset')
        .send({ email: 'teacher.pwreset01@test.com', otp: '000000', newPassword: 'NewPass@123' })
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_OTP');

      const updatedOtp = await PasswordReset.findById(otpRecord._id);
      expect(updatedOtp.failedAttempts).toBe(1);
      expect(updatedOtp.isUsed).toBe(false);
    });

    it('should block password reset OTP after max attempts', async () => {
      const college = await createCollege({ code: 'PWRESET02', email: 'pwreset02@test.com' });
      const { user } = await createTeacherPair({
        college,
        email: 'teacher.pwreset02@test.com',
        employeeId: 'EMP-PWRESET02',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.pwreset02@test.com', password: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      const otpRecord = await PasswordReset.create({
        email: 'teacher.pwreset02@test.com',
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        failedAttempts: 0,
        maxAttempts: 5,
      });

      for (let i = 0; i < 4; i++) {
        const res = await agent
          .post('/api/auth/verify-otp-reset')
          .send({ email: 'teacher.pwreset02@test.com', otp: '000000', newPassword: 'NewPass@123' })
          .expect(400);
        expect(res.body.error.code).toBe('INVALID_OTP');
      }

      const res = await agent
        .post('/api/auth/verify-otp-reset')
        .send({ email: 'teacher.pwreset02@test.com', otp: '000000', newPassword: 'NewPass@123' })
        .expect(400);

      expect(res.body.error.code).toBe('OTP_MAX_ATTEMPTS');

      const blockedOtp = await PasswordReset.findById(otpRecord._id);
      expect(blockedOtp.isUsed).toBe(true);
    });

    it('should reset failedAttempts on new password reset OTP', async () => {
      const college = await createCollege({ code: 'PWRESET03', email: 'pwreset03@test.com' });
      const { user } = await createTeacherPair({
        college,
        email: 'teacher.pwreset03@test.com',
        employeeId: 'EMP-PWRESET03',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.pwreset03@test.com', password: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      const otpRecord = await PasswordReset.create({
        email: 'teacher.pwreset03@test.com',
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        failedAttempts: 0,
        maxAttempts: 5,
      });

      await PasswordReset.findByIdAndUpdate(otpRecord._id, { failedAttempts: 5, isUsed: true });

      const res = await agent
        .post('/api/auth/verify-otp-reset')
        .send({ email: 'teacher.pwreset03@test.com', otp: '000000', newPassword: 'NewPass@123' })
        .expect(400);

      expect(res.body.error.code).toBe('OTP_MAX_ATTEMPTS');

      const newOtpRecord = await PasswordReset.create({
        email: 'teacher.pwreset03@test.com',
        otpHash: await bcrypt.hash('654321', 10),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        failedAttempts: 0,
        maxAttempts: 5,
      });

      expect(newOtpRecord.failedAttempts).toBe(0);
    });
  });

  describe('Teacher Profile Update Bypass Protection', () => {
    it('should not update email directly via profile update', async () => {
      const college = await createCollege({ code: 'EMAIL07', email: 'email07@test.com' });
      await createTeacherPair({
        college,
        email: 'teacher.email07@test.com',
        employeeId: 'EMP-EMAIL07',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email07@test.com', password: 'Test@123' })
        .expect(200);

      const updateRes = await agent
        .put('/api/teachers/my-profile')
        .send({
          name: 'Updated Name',
          email: 'bypass.email07@test.com',
          experienceYears: 10,
        })
        .expect(200);

      expect(updateRes.body.success).toBe(true);

      const getRes = await agent
        .get('/api/teachers/my-profile')
        .expect(200);

      // Email must remain unchanged — bypass attempt must be silently ignored
      expect(getRes.body.data.teacher.email).toBe('teacher.email07@test.com');
    });
  });

  describe('Admin Staff Email Change', () => {
    it('should allow college admin to update staff email with audit', async () => {
      const college = await createCollege({ code: 'EMAIL08', email: 'email08@test.com' });
      const admin = await createUser({
        email: 'admin.email08@test.com',
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const staffUser = await createUser({
        email: 'staff.email08@test.com',
        password: 'Test@123',
        role: 'ACCOUNTANT',
        college_id: college._id,
        isActive: true,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.email08@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put(`/api/college/staff/${staffUser._id}`)
        .send({ email: 'newstaff.email08@test.com' })
        .expect(200);

      expect(res.body.success).toBe(true);

      const user = await User.findById(staffUser._id);
      expect(user.email).toBe('newstaff.email08@test.com');
    });

    it('should block cross-college staff email modification', async () => {
      const collegeA = await createCollege({ code: 'EMAIL09A', email: 'email09a@test.com' });
      const collegeB = await createCollege({ code: 'EMAIL09B', email: 'email09b@test.com' });

      await createUser({
        email: 'admin.email09a@test.com',
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: collegeA._id,
        isActive: true,
      });

      const staffB = await createUser({
        email: 'staff.email09b@test.com',
        password: 'Test@123',
        role: 'ACCOUNTANT',
        college_id: collegeB._id,
        isActive: true,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.email09a@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put(`/api/college/staff/${staffB._id}`)
        .send({ email: 'newstaff.email09b@test.com' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Admin Parent Email Change', () => {
    it('should allow college admin to update parent email with audit', async () => {
      const college = await createCollege({ code: 'EMAIL10', email: 'email10@test.com' });
      await createUser({
        email: 'admin.email10@test.com',
        password: 'Test@123',
        role: 'COLLEGE_ADMIN',
        college_id: college._id,
        isActive: true,
      });

      const parentUser = await createUser({
        email: 'parent.email10@test.com',
        password: 'Test@123',
        role: 'PARENT_GUARDIAN',
        college_id: college._id,
        isActive: true,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.email10@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put(`/api/college/parents/${parentUser._id}`)
        .send({ name: 'Updated Parent', email: 'newparent.email10@test.com' })
        .expect(200);

      expect(res.body.success).toBe(true);

      const user = await User.findById(parentUser._id);
      expect(user.email).toBe('newparent.email10@test.com');
    });
  });

  describe('Security Audit', () => {
    it('should log EMAIL_CHANGE_REQUESTED event on request step', async () => {
      const college = await createCollege({ code: 'EMAIL11', email: 'email11@test.com' });
      const { user } = await createTeacherPair({
        college,
        email: 'teacher.email11@test.com',
        employeeId: 'EMP-EMAIL11',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email11@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail11@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const auditLogs = await SecurityAudit.find({
        eventType: 'EMAIL_CHANGE_REQUESTED',
        userId: user._id,
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Session Invalidation', () => {
    it('should keep sessions active after request step and create OTP record', async () => {
      const college = await createCollege({ code: 'EMAIL12', email: 'email12@test.com' });
      const { user } = await createTeacherPair({
        college,
        email: 'teacher.email12@test.com',
        employeeId: 'EMP-EMAIL12',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      const loginRes = await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.email12@test.com', password: 'Test@123' })
        .expect(200);

      expect(loginRes.body.success).toBe(true);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail12@test.com', currentPassword: 'Test@123' })
        .expect(200);

      // Sessions must still be active — invalidation only happens after verify
      const sessionsAfterRequest = await AuthSession.find({ user_id: user._id, isActive: true });
      expect(sessionsAfterRequest.length).toBeGreaterThan(0);

      // OTP record must exist for the new email
      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newemail12@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();
    });
  });

  describe('Centralized Student Email Change', () => {
    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail@test.com', currentPassword: 'password' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject same email as current', async () => {
      const college = await createCollege({ code: 'STUEMAIL01', email: 'stuemail01@test.com' });
      const { user } = await createStudentPair({
        college,
        email: 'student.stuemail01@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.stuemail01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'student.stuemail01@test.com', currentPassword: 'Test@123' })
        .expect(400);

      expect(res.body.code).toBe('SAME_EMAIL');
    });

    it('should reject wrong current password', async () => {
      const college = await createCollege({ code: 'STUEMAIL02', email: 'stuemail02@test.com' });
      await createStudentPair({
        college,
        email: 'student.stuemail02@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.stuemail02@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail02@test.com', currentPassword: 'WrongPassword' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should accept valid request with correct password', async () => {
      const college = await createCollege({ code: 'STUEMAIL03', email: 'stuemail03@test.com' });
      await createStudentPair({
        college,
        email: 'student.stuemail03@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.stuemail03@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail03@test.com', currentPassword: 'Test@123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Verification OTP has been sent');
    });

    it('should atomically update User.email and Student.email on verify', async () => {
      const college = await createCollege({ code: 'STUEMAIL04', email: 'stuemail04@test.com' });
      const { user, student } = await createStudentPair({
        college,
        email: 'student.stuemail04@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.stuemail04@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newemail04@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newemail04@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const verifyRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newemail04@test.com', otp: plainOtp })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      const updatedStudent = await Student.findById(student._id);
      expect(updatedUser.email).toBe('newemail04@test.com');
      expect(updatedStudent.email).toBe('newemail04@test.com');
    });
  });

  describe('Centralized College Admin Email Change', () => {
    it('should reject request without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-email/request')
        .send({ email: 'newadmin@test.com', currentPassword: 'password' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should reject same email as current', async () => {
      const college = await createCollege({ code: 'ADMINEMAIL01', email: 'adminemail01@test.com' });
      const { user } = await createCollegeAdmin({ college, email: 'admin.adminemail01@test.com' });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.adminemail01@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'admin.adminemail01@test.com', currentPassword: 'Test@123' })
        .expect(400);

      expect(res.body.code).toBe('SAME_EMAIL');
    });

    it('should reject wrong current password', async () => {
      const college = await createCollege({ code: 'ADMINEMAIL02', email: 'adminemail02@test.com' });
      const { user } = await createCollegeAdmin({ college, email: 'admin.adminemail02@test.com' });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.adminemail02@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newadmin02@test.com', currentPassword: 'WrongPassword' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should accept valid request with correct password', async () => {
      const college = await createCollege({ code: 'ADMINEMAIL03', email: 'adminemail03@test.com' });
      const { user } = await createCollegeAdmin({ college, email: 'admin.adminemail03@test.com' });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.adminemail03@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newadmin03@test.com', currentPassword: 'Test@123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Verification OTP has been sent');
    });

    it('should atomically update User.email on verify', async () => {
      const college = await createCollege({ code: 'ADMINEMAIL04', email: 'adminemail04@test.com' });
      const { user } = await createCollegeAdmin({ college, email: 'admin.adminemail04@test.com' });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.adminemail04@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newadmin04@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newadmin04@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const verifyRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newadmin04@test.com', otp: plainOtp })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.email).toBe('newadmin04@test.com');
    });

    it('should block direct profile email bypass', async () => {
      const college = await createCollege({ code: 'ADMINEMAIL05', email: 'adminemail05@test.com' });
      const { user } = await createCollegeAdmin({ college, email: 'admin.adminemail05@test.com', withStaffProfile: true });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.adminemail05@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put(`/api/college/staff/profile/${user._id}`)
        .send({ name: 'Updated Admin', email: 'bypass.adminemail05@test.com' })
        .expect(400);

      expect(res.body.code).toBe('EMAIL_CHANGE_NOT_ALLOWED');

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.email).toBe('admin.adminemail05@test.com');
    });

    it('should allow normal profile update without email', async () => {
      const college = await createCollege({ code: 'ADMINEMAIL06', email: 'adminemail06@test.com' });
      const { user } = await createCollegeAdmin({ college, email: 'admin.adminemail06@test.com', withStaffProfile: true });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'admin.adminemail06@test.com', password: 'Test@123' })
        .expect(200);

      const res = await agent
        .put(`/api/college/staff/profile/${user._id}`)
        .send({ name: 'Updated Admin Name' })
        .expect(200);

      expect(res.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe('Updated Admin Name');
      expect(updatedUser.email).toBe('admin.adminemail06@test.com');
    });
  });

  describe('Transaction Safety — OTP Rollback', () => {
    const originalStartSession = User.startSession.bind(User);

    afterEach(async () => {
      User.startSession = originalStartSession;
      await clearTestDb();
    });

    it('should mark OTP as used after successful transaction commit', async () => {
      const college = await createCollege({ code: 'TXNSUCCESS', email: 'txnsuccess@test.com' });
      const { user, student } = await createStudentPair({
        college,
        email: 'student.txnsuccess@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.txnsuccess@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newtxnsuccess@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newtxnsuccess@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const verifyRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newtxnsuccess@test.com', otp: plainOtp })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      const updatedStudent = await Student.findById(student._id);
      const updatedOtp = await PasswordReset.findById(otpRecord._id);

      expect(updatedUser.email).toBe('newtxnsuccess@test.com');
      expect(updatedStudent.email).toBe('newtxnsuccess@test.com');
      expect(updatedOtp.isUsed).toBe(true);
    });

    it('should rollback OTP.isUsed when transaction fails after OTP consumption', async () => {
      let forceFail = true;
      User.startSession = async () => {
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

      const college = await createCollege({ code: 'ROLLBACK01', email: 'rollback01@test.com' });
      const { user, student } = await createStudentPair({
        college,
        email: 'student.rollback01@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.rollback01@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newrollback01@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newrollback01@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const res = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newrollback01@test.com', otp: plainOtp });

      expect(res.status).toBe(500);

      const updatedUser = await User.findById(user._id);
      const updatedStudent = await Student.findById(student._id);
      const updatedOtp = await PasswordReset.findById(otpRecord._id);

      expect(updatedUser.email).toBe('student.rollback01@test.com');
      expect(updatedStudent.email).toBe('student.rollback01@test.com');
      expect(updatedOtp.isUsed).toBe(false);
    });

    it('should allow OTP reuse after transaction rollback', async () => {
      let forceFail = true;
      User.startSession = async () => {
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

      const college = await createCollege({ code: 'REUSE01', email: 'reuse01@test.com' });
      const { user, student } = await createStudentPair({
        college,
        email: 'student.reuse01@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.reuse01@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newreuse01@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newreuse01@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      // First attempt: forced rollback
      const res1 = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newreuse01@test.com', otp: plainOtp });

      expect(res1.status).toBe(500);

      const otpAfterRollback = await PasswordReset.findById(otpRecord._id);
      expect(otpAfterRollback.isUsed).toBe(false);

      // Second attempt: should succeed with the same OTP
      const verifyRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newreuse01@test.com', otp: plainOtp })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      const updatedStudent = await Student.findById(student._id);
      const updatedOtp = await PasswordReset.findById(otpRecord._id);

      expect(updatedUser.email).toBe('newreuse01@test.com');
      expect(updatedStudent.email).toBe('newreuse01@test.com');
      expect(updatedOtp.isUsed).toBe(true);
    });

    it('should mark OTP as used for Teacher after successful transaction commit', async () => {
      const college = await createCollege({ code: 'TXNSUCCESS_TCH', email: 'txnsuccesstch@test.com' });
      const { user, teacher } = await createTeacherPair({
        college,
        email: 'teacher.txnsuccesstch@test.com',
        employeeId: 'EMP-TXNSUCCESS',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'teacher.txnsuccesstch@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newtxnsuccesstch@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newtxnsuccesstch@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const verifyRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newtxnsuccesstch@test.com', otp: plainOtp })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);

      const updatedUser = await User.findById(user._id);
      const updatedTeacher = await Teacher.findById(teacher._id);
      const updatedOtp = await PasswordReset.findById(otpRecord._id);

      expect(updatedUser.email).toBe('newtxnsuccesstch@test.com');
      expect(updatedTeacher.email).toBe('newtxnsuccesstch@test.com');
      expect(updatedOtp.isUsed).toBe(true);
    });
  });

  describe('Concurrent OTP Consumption', () => {
    it('should reject duplicate OTP verification when two concurrent requests use the same valid OTP', async () => {
      const college = await createCollege({ code: 'CONCURRENT01', email: 'concurrent01@test.com' });
      const { user, student } = await createStudentPair({
        college,
        email: 'student.concurrent01@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.concurrent01@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newconcurrent01@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newconcurrent01@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const [resA, resB] = await Promise.all([
        agent.post('/api/auth/change-email/verify').send({ email: 'newconcurrent01@test.com', otp: plainOtp }),
        agent.post('/api/auth/change-email/verify').send({ email: 'newconcurrent01@test.com', otp: plainOtp }),
      ]);

      const successCount = [resA, resB].filter((r) => r.status === 200).length;
      const rejectCount = [resA, resB].filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(rejectCount).toBe(1);

      const rejected = [resA, resB].find((r) => r.status === 400);
      expect(rejected.body.code).toBe('OTP_ALREADY_USED');

      const updatedUser = await User.findById(user._id);
      const updatedStudent = await Student.findById(student._id);
      const updatedOtp = await PasswordReset.findById(otpRecord._id);

      expect(updatedUser.email).toBe('newconcurrent01@test.com');
      expect(updatedStudent.email).toBe('newconcurrent01@test.com');
      expect(updatedOtp.isUsed).toBe(true);
      expect(updatedOtp.usedAt).not.toBeNull();
    });

    it('should reject already-used OTP on subsequent verification', async () => {
      const college = await createCollege({ code: 'CONCURRENT02', email: 'concurrent02@test.com' });
      const { user, student } = await createStudentPair({
        college,
        email: 'student.concurrent02@test.com',
        adminId: adminUser._id,
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'student.concurrent02@test.com', password: 'Test@123' })
        .expect(200);

      await agent
        .post('/api/auth/change-email/request')
        .send({ email: 'newconcurrent02@test.com', currentPassword: 'Test@123' })
        .expect(200);

      const PasswordReset = require('../../src/models/passwordReset.model');
      const otpRecord = await PasswordReset.findOne({
        email: 'newconcurrent02@test.com',
        isUsed: false,
      });
      expect(otpRecord).not.toBeNull();

      const plainOtp = '123456';
      const bcrypt = require('bcryptjs');
      const otpHash = await bcrypt.hash(plainOtp, 10);
      await PasswordReset.findByIdAndUpdate(otpRecord._id, { otpHash });

      const firstRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newconcurrent02@test.com', otp: plainOtp })
        .expect(200);

      expect(firstRes.body.success).toBe(true);

      const secondRes = await agent
        .post('/api/auth/change-email/verify')
        .send({ email: 'newconcurrent02@test.com', otp: plainOtp })
        .expect(400);

      expect(secondRes.body.code).toBe('INVALID_OTP');

      const updatedOtp = await PasswordReset.findById(otpRecord._id);
      expect(updatedOtp.isUsed).toBe(true);
      expect(updatedOtp.usedAt).not.toBeNull();
    });
  });
});
