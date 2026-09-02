const request = require('supertest');
const mongoose = require('mongoose');
const { connectTestDb, clearTestDb, closeTestDb } = require('../setup/testDb');
const { createCollege, createUser, createTeacher, createDepartment, createCourse, createSubject } = require('../helpers/factories');
const app = require('../../app');
const User = require('../../src/models/user.model');
const Teacher = require('../../src/models/teacher.model');
const Department = require('../../src/models/department.model');
const Course = require('../../src/models/course.model');
const Subject = require('../../src/models/subject.model');

describe('HOD Course and Subject Assignment', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const loginAsAdmin = async (collegeId) => {
    const admin = await createUser({
      email: `admin.${Date.now()}@test.com`,
      password: 'Test@123',
      role: 'COLLEGE_ADMIN',
      college_id: collegeId,
      isActive: true,
    });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Test@123' })
      .expect(200);

    return { agent, admin };
  };

  const hodBasePayload = (overrides = {}) => ({
    name: 'HOD Test',
    email: `hod.${Date.now()}@test.com`,
    role: 'HOD',
    qualification: 'PhD',
    ...overrides,
  });

  it('1. should create HOD without Course and Subject', async () => {
    const college = await createCollege({ code: 'HOD-CS-01', email: `college1.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const res = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({ departmentId: department._id }))
      .expect(201);

    expect(res.body.success).toBe(true);

    const hodUser = await User.findOne({ email: res.body.data.user.email });
    expect(hodUser.role).toBe('HOD');

    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });
    expect(hodTeacher).toBeDefined();
    expect(hodTeacher.courses).toHaveLength(0);
  });

  it('2. should create HOD with Course only', async () => {
    const college = await createCollege({ code: 'HOD-CS-02', email: `college2.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const res = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: department._id,
        courseId: course._id,
      }))
      .expect(201);

    expect(res.body.success).toBe(true);

    const hodUser = await User.findOne({ email: res.body.data.user.email });
    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });
    expect(hodTeacher.courses).toHaveLength(1);
    expect(hodTeacher.courses[0].toString()).toBe(course._id.toString());
  });

  it('3. should create HOD with Course and Subject', async () => {
    const college = await createCollege({ code: 'HOD-CS-03', email: `college3.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: 'Data Structures',
      code: 'DS',
      semester: 3,
      credits: 4,
      createdBy: admin._id,
    });

    const res = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: department._id,
        courseId: course._id,
        subjectId: subject._id,
      }))
      .expect(201);

    expect(res.body.success).toBe(true);

    const hodUser = await User.findOne({ email: res.body.data.user.email });
    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });
    expect(hodTeacher.courses).toHaveLength(1);
    expect(hodTeacher.courses[0].toString()).toBe(course._id.toString());

    const assignedSubject = await Subject.findOne({ teacher_id: hodTeacher._id });
    expect(assignedSubject).toBeDefined();
    expect(assignedSubject._id.toString()).toBe(subject._id.toString());
  });

  it('4. should fail to create HOD with Subject but no Course', async () => {
    const college = await createCollege({ code: 'HOD-CS-04', email: `college4.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: 'Data Structures',
      code: 'DS',
      semester: 3,
      credits: 4,
      createdBy: admin._id,
    });

    const res = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: department._id,
        subjectId: subject._id,
      }))
      .expect(400);

    expect(res.body.error.code).toBe('SUBJECT_WITHOUT_COURSE');
    expect(res.body.error.message).toMatch(/Please select a course before assigning a subject/);
  });

  it('5. should fail to create HOD with unrelated Course and Subject', async () => {
    const college = await createCollege({ code: 'HOD-CS-05', email: `college5.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const otherDepartment = await createDepartment({
      college_id: college._id,
      name: 'Mechanical Engineering',
      code: 'ME',
      type: 'ACADEMIC',
      programsOffered: ['UG'],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
      createdBy: admin._id,
    });

    const otherCourse = await createCourse({
      college_id: college._id,
      department_id: otherDepartment._id,
      name: 'B.Tech ME',
      code: 'BTECH-ME',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const otherSubject = await createSubject({
      college_id: college._id,
      department_id: otherDepartment._id,
      course_id: otherCourse._id,
      name: 'Thermodynamics',
      code: 'THERMO',
      semester: 3,
      credits: 4,
      createdBy: admin._id,
    });

    const res = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: department._id,
        courseId: course._id,
        subjectId: otherSubject._id,
      }))
      .expect(400);

    expect(res.body.error.code).toBe('SUBJECT_NOT_IN_COURSE');
  });

  it('6. should create HOD with valid Course and valid Subject', async () => {
    const college = await createCollege({ code: 'HOD-CS-06', email: `college6.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: 'Data Structures',
      code: 'DS',
      semester: 3,
      credits: 4,
      createdBy: admin._id,
    });

    const res = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: department._id,
        courseId: course._id,
        subjectId: subject._id,
      }))
      .expect(201);

    expect(res.body.success).toBe(true);

    const hodUser = await User.findOne({ email: res.body.data.user.email });
    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });
    expect(hodTeacher.courses).toHaveLength(1);

    const assignedSubject = await Subject.findOne({ teacher_id: hodTeacher._id });
    expect(assignedSubject).toBeDefined();
  });

  it('7. should allow existing HOD without Course/Subject to still work', async () => {
    const college = await createCollege({ code: 'HOD-CS-07', email: `college7.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const res = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({ departmentId: department._id }))
      .expect(201);

    expect(res.body.success).toBe(true);

    const hodUser = await User.findOne({ email: res.body.data.user.email });
    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });
    expect(hodTeacher.courses).toHaveLength(0);

    const profileRes = await agent
      .get(`/api/college/staff/profile/${hodUser._id}`)
      .expect(200);

    expect(profileRes.body.data.role).toBe('HOD');
  });

  it('8. should allow admin to edit HOD and remove Course/Subject', async () => {
    const college = await createCollege({ code: 'HOD-CS-08', email: `college8.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: 'Data Structures',
      code: 'DS',
      semester: 3,
      credits: 4,
      createdBy: admin._id,
    });

    const createRes = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: department._id,
        courseId: course._id,
        subjectId: subject._id,
      }))
      .expect(201);

    const hodUser = await User.findOne({ email: createRes.body.data.user.email });
    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });

    const updateRes = await agent
      .put(`/api/college/staff/profile/${hodUser._id}`)
      .send({
        courseId: '',
        subjectId: '',
        previousSubjectId: subject._id,
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);

    const updatedTeacher = await Teacher.findById(hodTeacher._id);
    expect(updatedTeacher.courses).toHaveLength(0);

    const clearedSubject = await Subject.findById(subject._id);
    expect(clearedSubject.teacher_id).toBeUndefined();
  });

  it('9. should allow admin to edit HOD and assign Course only', async () => {
    const college = await createCollege({ code: 'HOD-CS-09', email: `college9.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const createRes = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({ departmentId: department._id }))
      .expect(201);

    const hodUser = await User.findOne({ email: createRes.body.data.user.email });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const updateRes = await agent
      .put(`/api/college/staff/profile/${hodUser._id}`)
      .send({
        courseId: course._id,
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);

    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });
    expect(hodTeacher.courses).toHaveLength(1);
    expect(hodTeacher.courses[0].toString()).toBe(course._id.toString());
  });

  it('10. should allow admin to edit HOD and assign Course + Subject', async () => {
    const college = await createCollege({ code: 'HOD-CS-10', email: `college10.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const createRes = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({ departmentId: department._id }))
      .expect(201);

    const hodUser = await User.findOne({ email: createRes.body.data.user.email });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: 'Data Structures',
      code: 'DS',
      semester: 3,
      credits: 4,
      createdBy: admin._id,
    });

    const updateRes = await agent
      .put(`/api/college/staff/profile/${hodUser._id}`)
      .send({
        courseId: course._id,
        subjectId: subject._id,
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);

    const hodTeacher = await Teacher.findOne({ user_id: hodUser._id });
    expect(hodTeacher.courses).toHaveLength(1);

    const assignedSubject = await Subject.findOne({ teacher_id: hodTeacher._id });
    expect(assignedSubject).toBeDefined();
  });

  it('11. should fail to edit HOD with Subject but no Course', async () => {
    const college = await createCollege({ code: 'HOD-CS-11', email: `college11.${Date.now()}@test.com` });
    const { agent, admin } = await loginAsAdmin(college._id);

    const department = await createDepartment({
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

    const createRes = await agent
      .post('/api/college/staff')
      .send(hodBasePayload({ departmentId: department._id }))
      .expect(201);

    const hodUser = await User.findOne({ email: createRes.body.data.user.email });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: admin._id,
    });

    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: 'Data Structures',
      code: 'DS',
      semester: 3,
      credits: 4,
      createdBy: admin._id,
    });

    const res = await agent
      .put(`/api/college/staff/profile/${hodUser._id}`)
      .send({
        subjectId: subject._id,
      })
      .expect(400);

    expect(res.body.error.code).toBe('SUBJECT_WITHOUT_COURSE');
  });

  it('12. should reject cross-college Course/Subject assignment', async () => {
    const collegeA = await createCollege({ code: 'HOD-CC-A', email: `collegeA.${Date.now()}@test.com` });
    const collegeB = await createCollege({ code: 'HOD-CC-B', email: `collegeB.${Date.now()}@test.com` });
    const { agent: agentA, admin: adminA } = await loginAsAdmin(collegeA._id);
    const { agent: agentB, admin: adminB } = await loginAsAdmin(collegeB._id);

    const deptA = await createDepartment({
      college_id: collegeA._id,
      name: 'Computer Science',
      code: 'CS',
      type: 'ACADEMIC',
      programsOffered: ['UG'],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
      createdBy: adminA._id,
    });

    const deptB = await createDepartment({
      college_id: collegeB._id,
      name: 'Mechanical Engineering',
      code: 'ME',
      type: 'ACADEMIC',
      programsOffered: ['UG'],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 60,
      createdBy: adminB._id,
    });

    const courseB = await createCourse({
      college_id: collegeB._id,
      department_id: deptB._id,
      name: 'B.Tech ME',
      code: 'BTECH-ME',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: adminB._id,
    });

    const subjectB = await createSubject({
      college_id: collegeB._id,
      department_id: deptB._id,
      course_id: courseB._id,
      name: 'Thermodynamics',
      code: 'THERMO',
      semester: 3,
      credits: 4,
      createdBy: adminB._id,
    });

    const res = await agentA
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: deptA._id,
        courseId: courseB._id,
      }))
      .expect(400);

    expect(res.body.error.code).toBe('COURSE_NOT_IN_DEPARTMENT');

    const courseA = await createCourse({
      college_id: collegeA._id,
      department_id: deptA._id,
      name: 'B.Tech CSE',
      code: 'BTECH-CSE',
      type: 'THEORY',
      programLevel: 'UG',
      durationSemesters: 8,
      credits: 120,
      maxStudents: 60,
      createdBy: adminA._id,
    });

    const res2 = await agentA
      .post('/api/college/staff')
      .send(hodBasePayload({
        departmentId: deptA._id,
        courseId: courseA._id,
        subjectId: subjectB._id,
      }))
      .expect(400);

    expect(res2.body.error.code).toBe('SUBJECT_NOT_IN_COURSE');
  });
});
