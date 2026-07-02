const College = require('../../src/models/college.model');
const User = require('../../src/models/user.model');

// Real fields only — do NOT invent fields like "phone", "website", etc.
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
    email: `test-${Date.now()}@example.com`,
    password: 'Test@123',
    role,
    college_id: isSuperAdmin ? undefined : (overrides.college_id || null),
    isActive: true,
    mustChangePassword: false,
    loginAttempts: 0,
    lockedUntil: null,
    tokenVersion: 0,
  };
};

/**
 * Create a College document with overrides merged.
 */
const createCollege = async (overrides = {}) => {
  const payload = { ...collegeDefaults(), ...overrides, subscription: { ...collegeDefaults().subscription, ...(overrides.subscription || {}) } };
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

module.exports = { createCollege, createUser };
