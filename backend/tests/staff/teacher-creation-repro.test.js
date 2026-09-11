/**
 * Reproduction test for Teacher creation via FormData.
 * Uses supertest's built-in .field() for multipart form data.
 * Uses mongodb-memory-server in replica set mode for transactions.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../app');

const User = require('../../src/models/user.model');
const Teacher = require('../../src/models/teacher.model');
const StaffProfile = require('../../src/models/staffProfile.model');

let mongoServer;

const connectReplicaTestDb = async () => {
  if (process.env.MONGO_URI) {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to pre-configured replica-set MongoDB:', uri);
    return;
  }
  mongoServer = await MongoMemoryServer.create({
    instance: {
      replSet: 'rs0',
    },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Initiate replica set
  const adminDb = mongoose.connection.db.admin();
  try {
      await adminDb.command({
        replSetInitiate: {
          _id: 'rs0',
          members: [{ _id: 0, host: '127.0.0.1:' + parseInt(uri.match(/:(\d+)\//)[1]) }],
        },
      });
  } catch (e) {
    // Already initiated or not needed
  }
  // Wait for replica set to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ Connected to replica-set in-memory MongoDB:', uri);
};

describe('Teacher Creation - FormData Reproduction', () => {
  beforeAll(async () => {
    await connectReplicaTestDb();
  });
  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });
  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  const setupFull = async () => {
    const User = require('../../src/models/user.model');
    const College = require('../../src/models/college.model');
    const Department = require('../../src/models/department.model');
    const Course = require('../../src/models/course.model');
    const Subject = require('../../src/models/subject.model');

    const college = await College.create({
      name: 'Test College', code: `R${Date.now()}`,
      email: `col.${Date.now()}@test.com`, contactNumber: '9999999999',
      address: 'Test', establishedYear: 2020, isActive: true,
      registrationUrl: 'http://test.com/r', registrationQr: 'uploads/qr.png',
      setupCompleted: false,
      subscription: { plan: 'TRIAL', status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false },
    });

    const admin = await User.create({
      name: 'Admin', email: `adm.${Date.now()}@test.com`,
      password: 'Test@12345', role: 'COLLEGE_ADMIN',
      college_id: college._id, isActive: true, mustChangePassword: false,
    });

    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@12345' });
    if (loginRes.status !== 200) {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }

    const department = await Department.create({
      college_id: college._id, name: 'Computer Science', code: `D${Date.now()}`,
      type: 'ACADEMIC', programsOffered: ['UG'], startYear: 2020,
      sanctionedFacultyCount: 10, sanctionedStudentIntake: 60, createdBy: admin._id,
    });
    const course = await Course.create({
      college_id: college._id, department_id: department._id,
      name: 'B.Tech CSE', code: `C${Date.now()}`, type: 'THEORY',
      programLevel: 'UG', durationSemesters: 8, credits: 120,
      maxStudents: 60, createdBy: admin._id,
    });
    const subject1 = await Subject.create({
      college_id: college._id, department_id: department._id, course_id: course._id,
      name: 'Data Structures', code: `S1${Date.now()}`, semester: 3, credits: 4, createdBy: admin._id,
    });
    const subject2 = await Subject.create({
      college_id: college._id, department_id: department._id, course_id: course._id,
      name: 'Algorithms', code: `S2${Date.now()}`, semester: 3, credits: 4, createdBy: admin._id,
    });

    return { agent, college, admin, department, course, subject1, subject2 };
  };

  const commonFields = (department, course) => ({
    name: 'Test Teacher',
    email: `teacher.${Date.now()}.${Math.floor(Math.random() * 100000)}@test.com`,
    role: 'TEACHER',
    departmentId: department._id.toString(),
    courseId: course._id.toString(),
    designation: 'Lecturer',
    qualification: 'MSc',
    experienceYears: '5',
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
  });

  // ═══════════════════════════════════════════════════
  // Scenario 1: FormData — No Subject
  // ═══════════════════════════════════════════════════
  it('1. FormData TEACHER — no subject', async () => {
    const { agent, department, course } = await setupFull();
    const fields = commonFields(department, course);

    const usersBefore = await User.countDocuments({});

    const res = await agent.post('/api/college/staff')
      .field('name', fields.name)
      .field('email', fields.email)
      .field('role', fields.role)
      .field('departmentId', fields.departmentId)
      .field('courseId', fields.courseId)
      .field('designation', fields.designation)
      .field('qualification', fields.qualification)
      .field('experienceYears', fields.experienceYears)
      .field('gender', fields.gender)
      .field('bloodGroup', fields.bloodGroup)
      .field('dateOfBirth', fields.dateOfBirth)
      .field('address', fields.address)
      .field('city', fields.city)
      .field('state', fields.state)
      .field('pincode', fields.pincode)
      .field('mobileNumber', fields.mobileNumber)
      .field('joiningDate', fields.joiningDate)
      .field('employmentType', fields.employmentType);

    const usersAfter = await User.countDocuments({});

    console.log('=== Scenario 1: FormData TEACHER (No Subject) ===');
    console.log('Status:', res.status);
    console.log('Users before:', usersBefore, 'after:', usersAfter);
    console.log('');

    expect(res.status).toBe(201);
    expect(usersAfter - usersBefore).toBe(1);

    const newUser = await User.findOne({ email: fields.email });
    expect(newUser).not.toBeNull();
    expect(newUser.role).toBe('TEACHER');

    const newUserProfile = await StaffProfile.findOne({ user_id: newUser._id });
    expect(newUserProfile).not.toBeNull();

    const newTeacher = await Teacher.findOne({ email: fields.email });
    expect(newTeacher).not.toBeNull();
    expect(newTeacher.user_id).toEqual(newUser._id);
  });

  // ═══════════════════════════════════════════════════
  // Scenario 2: FormData — One Subject
  // ═══════════════════════════════════════════════════
  it('2. FormData TEACHER — one subject', async () => {
    const { agent, department, course, subject1 } = await setupFull();
    const fields = commonFields(department, course);

    const usersBefore = await User.countDocuments({});

    const res = await agent.post('/api/college/staff')
      .field('name', fields.name)
      .field('email', fields.email)
      .field('role', fields.role)
      .field('departmentId', fields.departmentId)
      .field('courseId', fields.courseId)
      .field('designation', fields.designation)
      .field('qualification', fields.qualification)
      .field('experienceYears', fields.experienceYears)
      .field('gender', fields.gender)
      .field('bloodGroup', fields.bloodGroup)
      .field('dateOfBirth', fields.dateOfBirth)
      .field('address', fields.address)
      .field('city', fields.city)
      .field('state', fields.state)
      .field('pincode', fields.pincode)
      .field('mobileNumber', fields.mobileNumber)
      .field('joiningDate', fields.joiningDate)
      .field('employmentType', fields.employmentType)
      .field('subjectIds', subject1._id.toString());

    const usersAfter = await User.countDocuments({});

    console.log('=== Scenario 2: FormData TEACHER (One Subject) ===');
    console.log('Status:', res.status);
    console.log('Users before:', usersBefore, 'after:', usersAfter);
    console.log('');

    expect(res.status).toBe(201);
    expect(usersAfter - usersBefore).toBe(1);

    const newTeacher = await Teacher.findOne({ email: fields.email });
    expect(newTeacher).not.toBeNull();
    expect(newTeacher.user_id).toBeDefined();
    expect(newTeacher.courses).toContainEqual(course._id);
  });

  // ═══════════════════════════════════════════════════
  // Scenario 3: FormData — Multiple Subjects
  // ═══════════════════════════════════════════════════
  it('3. FormData TEACHER — multiple subjects', async () => {
    const { agent, department, course, subject1, subject2 } = await setupFull();
    const fields = commonFields(department, course);

    const usersBefore = await User.countDocuments({});

    const res = await agent.post('/api/college/staff')
      .field('name', fields.name)
      .field('email', fields.email)
      .field('role', fields.role)
      .field('departmentId', fields.departmentId)
      .field('courseId', fields.courseId)
      .field('designation', fields.designation)
      .field('qualification', fields.qualification)
      .field('experienceYears', fields.experienceYears)
      .field('gender', fields.gender)
      .field('bloodGroup', fields.bloodGroup)
      .field('dateOfBirth', fields.dateOfBirth)
      .field('address', fields.address)
      .field('city', fields.city)
      .field('state', fields.state)
      .field('pincode', fields.pincode)
      .field('mobileNumber', fields.mobileNumber)
      .field('joiningDate', fields.joiningDate)
      .field('employmentType', fields.employmentType)
      .field('subjectIds', subject1._id.toString())
      .field('subjectIds', subject2._id.toString());

    const usersAfter = await User.countDocuments({});

    console.log('=== Scenario 3: FormData TEACHER (Multiple Subjects) ===');
    console.log('Status:', res.status);
    console.log('Users before:', usersBefore, 'after:', usersAfter);
    console.log('');

    expect(res.status).toBe(201);
    expect(usersAfter - usersBefore).toBe(1);

    const newTeacher = await Teacher.findOne({ email: fields.email });
    expect(newTeacher).not.toBeNull();
    expect(newTeacher.user_id).toBeDefined();
  });

  // ═══════════════════════════════════════════════════
  // Scenario 4: JSON — No Subject (for comparison)
  // ═══════════════════════════════════════════════════
  it('4. JSON TEACHER — no subject (control)', async () => {
    const { agent, department, course } = await setupFull();
    const fields = commonFields(department, course);

    const usersBefore = await User.countDocuments({});

    const res = await agent.post('/api/college/staff')
      .send(fields);

    const usersAfter = await User.countDocuments({});

    console.log('=== Scenario 4: JSON TEACHER (No Subject - Control) ===');
    console.log('Status:', res.status);
    console.log('Users before:', usersBefore, 'after:', usersAfter);
    console.log('');

    expect(res.status).toBe(201);
    expect(usersAfter - usersBefore).toBe(1);
  });

  // ═══════════════════════════════════════════════════
  // Scenario 5: JSON HOD — No Course (control test)
  // ═══════════════════════════════════════════════════
  it('5. JSON HOD — no course (control)', async () => {
    const { agent, college, admin, department } = await setupFull();

    const usersBefore = await User.countDocuments({});

    const res = await agent.post('/api/college/staff')
      .send({
        name: 'Test HOD',
        email: `hod.${Date.now()}.${Math.floor(Math.random() * 100000)}@test.com`,
        role: 'HOD',
        departmentId: department._id.toString(),
        qualification: 'PhD',
        gender: 'Male',
        bloodGroup: 'A+',
      });

    const usersAfter = await User.countDocuments({});

    console.log('=== Scenario 5: JSON HOD (Control) ===');
    console.log('Status:', res.status);
    console.log('Users before:', usersBefore, 'after:', usersAfter);
    console.log('');

    expect(res.status).toBe(201);
    expect(usersAfter - usersBefore).toBe(1);

    const newUser = await User.findOne({ email: /^hod\./ });
    expect(newUser).not.toBeNull();
    expect(newUser.role).toBe('HOD');

    const newTeacher = await Teacher.findOne({ email: newUser.email });
    expect(newTeacher).not.toBeNull();
    expect(newTeacher.user_id).toEqual(newUser._id);
  });
});
