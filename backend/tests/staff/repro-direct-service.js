/**
 * Direct reproduction: calls createTeacher() in isolation (no controller, no transaction)
 * to verify whether the service itself works correctly.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const teacherCreationService = require('../../src/services/teacherCreation.service');

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('✅ Connected to in-memory MongoDB:', uri);

  // Build indexes manually
  await mongoose.connection.db.command({ createIndexes: 'users', indexes: [{ key: { email: 1 }, name: 'email_1', unique: true }] });
  await mongoose.connection.db.command({ createIndexes: 'teachers', indexes: [{ key: { email: 1 }, name: 'email_1', unique: true }] });
  await mongoose.connection.db.command({ createIndexes: 'teachers', indexes: [{ key: { user_id: 1 }, name: 'user_id_1', unique: true }] });
  console.log('✅ Indexes built');

  const College = require('../../src/models/college.model');
  const User = require('../../src/models/user.model');
  const Department = require('../../src/models/department.model');
  const Course = require('../../src/models/course.model');
  const Subject = require('../../src/models/subject.model');

  // Create college
  const college = await College.create({
    name: 'Test College',
    code: 'TESTCOL',
    email: 'college@test.com',
    contactNumber: '9999999999',
    address: 'Test Address',
    establishedYear: 2020,
    isActive: true,
    registrationUrl: 'http://test.com/register',
    registrationQr: 'uploads/college-qrs/TESTCOL.png',
    setupCompleted: false,
    subscription: {
      plan: 'TRIAL', status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    },
  });

  // Create admin user
  const admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'Test@12345',
    role: 'COLLEGE_ADMIN',
    college_id: college._id,
    isActive: true,
    mustChangePassword: false,
  });

  // Create department
  const department = await Department.create({
    college_id: college._id,
    name: 'Computer Science',
    code: 'CS',
    type: 'ACADEMIC',
    programsOffered: ['UG'],
    startYear: 2020,
    sanctionedFacultyCount: 10,
    sanctionedStudentIntake: 60,
    createdBy: admin._id,
  });

  // Create course
  const course = await Course.create({
    college_id: college._id,
    department_id: department._id,
    name: 'B.Tech CSE',
    code: 'BTECHCSE',
    type: 'THEORY',
    programLevel: 'UG',
    durationSemesters: 8,
    credits: 120,
    maxStudents: 60,
    createdBy: admin._id,
  });

  // Create subjects
  const subject1 = await Subject.create({
    college_id: college._id,
    department_id: department._id,
    course_id: course._id,
    name: 'Data Structures',
    code: 'DS',
    semester: 3,
    credits: 4,
    createdBy: admin._id,
  });

  const subject2 = await Subject.create({
    college_id: college._id,
    department_id: department._id,
    course_id: course._id,
    name: 'Algorithms',
    code: 'ALGO',
    semester: 3,
    credits: 4,
    createdBy: admin._id,
  });

  console.log('=== Setup complete ===');
  console.log('College:', college._id.toString());
  console.log('Admin:', admin._id.toString());
  console.log('Department:', department._id.toString());
  console.log('Course:', course._id.toString());
  console.log('Subject1:', subject1._id.toString());
  console.log('Subject2:', subject2._id.toString());
  console.log('');

  const teacherEmail = 'teacher1@test.com';
  const teacherName = 'Test Teacher 1';

  // ================================================================
  // Test 1: createTeacher directly (no session, no pre-existing User)
  // This tests whether the service works in isolation.
  // ================================================================
  console.log('--- Test 1: createTeacher() in isolation (no session) ---');
  try {
    const result = await teacherCreationService.createTeacher({
      collegeId: college._id,
      name: teacherName,
      email: teacherEmail,
      role: 'TEACHER',
      departmentId: department._id,
      courses: [course._id],
      designation: 'Lecturer',
      qualification: 'MSc',
      experienceYears: 5,
      gender: 'Male',
      bloodGroup: 'A+',
      dateOfBirth: '1990-01-01',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      mobileNumber: '9876543210',
      joiningDate: '2020-01-01',
      employmentType: 'FULL_TIME',
      createdBy: admin._id,
      files: {},
      employeeId: 'EMP-001',
      sendCredentialsEmail: false,
      validateDuplicateTeacherEmail: true,
    });
    console.log('✅ SUCCESS - Teacher created');
    console.log('  User._id:', result.user._id.toString());
    console.log('  Teacher._id:', result.teacher._id.toString());
    console.log('  Teacher.email:', result.teacher.email);
    console.log('  Teacher.name:', result.teacher.name);
    console.log('  Teacher.employeeId:', result.teacher.employeeId);
    console.log('  Teacher.designation:', result.teacher.designation);
    console.log('  Teacher.qualification:', result.teacher.qualification);
    console.log('  Teacher.experienceYears:', result.teacher.experienceYears);
  } catch (err) {
    console.error('❌ FAILED -', err.name, '-', err.message);
    if (err.code) console.error('  code:', err.code);
    if (err.errors) console.error('  errors:', JSON.stringify(err.errors));
    if (err.keyValue) console.error('  keyValue:', JSON.stringify(err.keyValue));
  }
  console.log('');

  // ================================================================
  // Test 2: createTeacher again with same email (should fail)
  // This tests the duplicate email check.
  // ================================================================
  console.log('--- Test 2: createTeacher() again with same email ---');
  try {
    await teacherCreationService.createTeacher({
      collegeId: college._id,
      name: 'Another Teacher',
      email: teacherEmail, // DUPLICATE
      role: 'TEACHER',
      departmentId: department._id,
      courses: [course._id],
      designation: 'Lecturer',
      qualification: 'PhD',
      experienceYears: 3,
      gender: 'Female',
      bloodGroup: 'B+',
      dateOfBirth: '1985-01-01',
      address: '456 Test Ave',
      city: 'Test City',
      state: 'Test State',
      pincode: '654321',
      mobileNumber: '8765432109',
      joiningDate: '2020-01-01',
      employmentType: 'FULL_TIME',
      createdBy: admin._id,
      files: {},
      employeeId: 'EMP-002',
      sendCredentialsEmail: false,
      validateDuplicateTeacherEmail: true,
    });
    console.log('✅ UNEXPECTED SUCCESS - Teacher created with duplicate email');
  } catch (err) {
    console.error('❌ FAILED (expected) -', err.name, '-', err.message);
    console.error('  statusCode:', err.statusCode || 'N/A');
    console.error('  code:', err.code || 'N/A');
  }
  console.log('');

  // ================================================================
  // Test 3: createTeacher with employmentType 'INTERN' (Teacher schema mismatch)
  // ================================================================
  console.log('--- Test 3: createTeacher() with employmentType=INTERN ---');
  try {
    const result = await teacherCreationService.createTeacher({
      collegeId: college._id,
      name: 'Intern Teacher',
      email: 'teacher3@test.com',
      role: 'TEACHER',
      departmentId: department._id,
      courses: [course._id],
      designation: 'Intern',
      qualification: 'BSc',
      experienceYears: 0,
      gender: 'Other',
      bloodGroup: 'O+',
      dateOfBirth: '2000-01-01',
      address: '789 Test Blvd',
      city: 'Test City',
      state: 'Test State',
      pincode: '111111',
      mobileNumber: '7654321098',
      joiningDate: '2024-01-01',
      employmentType: 'INTERN',
      createdBy: admin._id,
      files: {},
      employeeId: 'EMP-003',
      sendCredentialsEmail: false,
      validateDuplicateTeacherEmail: false,
    });
    console.log('✅ SUCCESS - Teacher created with INTERN');
  } catch (err) {
    console.error('❌ FAILED -', err.name, '-', err.message);
    console.error('  statusCode:', err.statusCode || 'N/A');
    console.error('  code:', err.code || 'N/A');
  }
  console.log('');

  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('✅ Done');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
