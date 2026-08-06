const College = require('../../src/models/college.model');
const User = require('../../src/models/user.model');
const Teacher = require('../../src/models/teacher.model');
const Student = require('../../src/models/student.model');
const ParentGuardian = require('../../src/models/parentGuardian.model');
const { CATEGORY, GENDER, STUDENT_STATUS } = require('../../src/utils/constants');

// Real fields only � do NOT invent fields like "phone", "website", etc.
const collegeDefaults = () => ({
  name: 'Test College',
  code: 'TEST',
  email: 'testcollege@example.com',
  admin_id: null,
  adminEmail: '',
  adminName: '',
  contactNumber: '9999999999',
  address: 'Test Address',
  establishedYear: 2020,
  logo: '',
  isActive: true,
  registrationUrl: 'http://test.com/register',
  registrationQr: '',
  setupCompleted: false,
  subscription: {
    plan: 'TRIAL',
    status: 'ACTIVE',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
  },
});

const userDefaults = (overrides = {}) => {
  const role = overrides.role || 'SUPER_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  return {
    name: 'Test User',
    email: overrides.email || `test-${Date.now()}@example.com`,
    password: overrides.password || 'Test@123',
    role,
    college_id: isSuperAdmin ? undefined : (overrides.college_id || null),
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    mustChangePassword: overrides.mustChangePassword || false,
    loginAttempts: overrides.loginAttempts || 0,
    lockedUntil: null,
    tokenVersion: 0,
  };
};

/**
 * Create a College document with overrides merged.
 * Generates registrationQr and registrationUrl based on code to match real format.
 */
const createCollege = async (overrides = {}) => {
  const code = overrides.code || 'TEST';
  const payload = {
    ...collegeDefaults(),
    ...overrides,
    registrationUrl: `http://localhost:5173/register/${code}`,
    registrationQr: `uploads/college-qrs/${code}.png`,
    subscription: { ...collegeDefaults().subscription, ...(overrides.subscription || {}) }
  };
  return College.create(payload);
};

/**
 * Create a User document with overrides merged.
 *
 * CRITICAL:
 * - SUPER_ADMIN: college_id is NOT required / will be removed.
 * - All other roles: college_id MUST be provided (legitimately required by schema).
 * - Pre-save hook auto-hashes password.
 */
const createUser = async (overrides = {}) => {
  const payload = userDefaults(overrides);
  if (payload.role === 'SUPER_ADMIN') {
    delete payload.college_id;
  }
  if (overrides.college_id !== undefined) {
    payload.college_id = overrides.college_id;
  }
  return User.create(payload);
};

/**
 * Create a Teacher document with overrides merged.
 */
const createTeacher = async (overrides = {}) => {
  const now = new Date();
  const birthYear = now.getFullYear() - 30; // 30 years old
  const payload = {
    name: 'Test Teacher',
    email: 'teacher@test.com',
    college_id: null,
    department_id: null,
    employeeId: 'EMP-001',
    designation: 'Teacher',
    qualification: 'MSc',
    experienceYears: 5,
    status: 'ACTIVE',
    createdBy: null,
    gender: GENDER.MALE,
    dateOfBirth: new Date(`${birthYear}-01-01`),
    mobileNumber: '9999999999',
    ...overrides,
  };
  return Teacher.create(payload);
};

/**
 * Create a Student document with overrides merged.
 */
const createStudent = async (overrides = {}) => {
  const now = new Date();
  const birthYear = now.getFullYear() - 20; // 20 years old
  const payload = {
    fullName: 'Test Student',
    email: 'student@test.com',
    college_id: null,
    department_id: null,
    course_id: null,
    gender: GENDER.MALE,
    dateOfBirth: new Date(`${birthYear}-01-01`),
    mobileNumber: '9999999999',
    addressLine: 'Test Address',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
    category: CATEGORY.GEN,
    admissionYear: now.getFullYear(),
    currentSemester: 1,
    status: STUDENT_STATUS.APPROVED,
    ...overrides,
  };
  return Student.create(payload);
};

/**
 * Create a ParentGuardian document with overrides merged.
 */
const createParentGuardian = async (overrides = {}) => {
  const payload = {
    user_id: null,
    college_id: null,
    student_ids: [],
    relation: "guardian",
    ...overrides,
  };
  return ParentGuardian.create(payload);
};

module.exports = { createCollege, createUser, createTeacher, createStudent, createParentGuardian };
