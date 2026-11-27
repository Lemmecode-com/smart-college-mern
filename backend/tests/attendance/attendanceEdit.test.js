const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../../app');
const {
  createCollege,
  createUser,
  createTeacher,
  createStudent,
  createDepartment,
  createCourse,
  createSubject,
} = require('../helpers/factories');
const { loginAsTeacher, loginAsStudent } = require('../helpers/testAuth');
const AttendanceSession = require('../../src/models/attendanceSession.model');
const AttendanceRecord = require('../../src/models/attendanceRecord.model');

describe('Attendance Edit & Mark - Integration Tests (Bug #556)', () => {
  let replSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  const setupCollegeAndTeacher = async (prefix = 'a') => {
    const cleanPrefix = prefix.toLowerCase();
    const uniqueId = `${cleanPrefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const college = await createCollege({
      code: `COL-${uniqueId}`,
      name: `Test College ${cleanPrefix}`,
      email: `college.${uniqueId}@test.com`,
    });

    const teacherUser = await createUser({
      email: `teacher.${uniqueId}@test.com`,
      password: 'Test@Password123',
      role: 'TEACHER',
      college_id: college._id,
    });

    const department = await createDepartment({
      college_id: college._id,
      createdBy: teacherUser._id,
    });

    const course = await createCourse({
      college_id: college._id,
      department_id: department._id,
      code: `CRS-${uniqueId}`,
    });

    const subject = await createSubject({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      code: `SUB-${uniqueId}`,
    });

    const teacher = await createTeacher({
      user_id: teacherUser._id,
      college_id: college._id,
      department_id: department._id,
      email: teacherUser.email,
      createdBy: teacherUser._id,
    });

    const student1 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      email: `student1.${uniqueId}@test.com`,
      fullName: `Student 1 ${cleanPrefix}`,
    });

    const student2 = await createStudent({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      email: `student2.${uniqueId}@test.com`,
      fullName: `Student 2 ${cleanPrefix}`,
    });

    const session = await AttendanceSession.create({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      subject_id: subject._id,
      teacher_id: teacher._id,
      slot_id: new mongoose.Types.ObjectId(),
      lectureDate: new Date(),
      lectureNumber: 1,
      totalStudents: 2,
      status: 'OPEN',
      slotSnapshot: {
        subject_id: subject._id,
        subject_name: subject.name,
        subject_code: subject.code,
        teacher_id: teacher._id,
        teacher_name: teacher.name,
        day: 'MON',
        startTime: '09:00',
        endTime: '10:00',
        slotType: 'LECTURE',
      },
    });

    return {
      college,
      teacherUser,
      teacher,
      department,
      course,
      subject,
      student1,
      student2,
      session,
    };
  };

  const getErrorCode = (res) => res.body.code || res.body.error?.code;
  const getErrorMessage = (res) => res.body.message || res.body.error?.message;

  it('initial mark creates records and sets session counts', async () => {
    const setup = await setupCollegeAndTeacher('mark');
    const { agent } = await loginAsTeacher(
      app,
      setup.teacherUser.email,
      'Test@Password123',
    );

    const markPayload = {
      attendance: [
        { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        { student_id: setup.student2._id.toString(), status: 'ABSENT' },
      ],
    };

    const res = await agent
      .post(`/api/attendance/sessions/${setup.session._id}/mark`)
      .send(markPayload)
      .expect(200);

    expect(res.body.message).toContain('Attendance marked successfully');

    const records = await AttendanceRecord.find({
      session_id: setup.session._id,
    });
    expect(records).toHaveLength(2);

    const s1Record = records.find(
      (r) => r.student_id.toString() === setup.student1._id.toString(),
    );
    const s2Record = records.find(
      (r) => r.student_id.toString() === setup.student2._id.toString(),
    );
    expect(s1Record.status).toBe('PRESENT');
    expect(s2Record.status).toBe('ABSENT');

    const updatedSession = await AttendanceSession.findById(setup.session._id);
    expect(updatedSession.presentCount).toBe(1);
    expect(updatedSession.absentCount).toBe(1);
    expect(updatedSession.totalStudents).toBe(2);
  });

  it('second POST .../mark returns 409 ATTENDANCE_ALREADY_SAVED', async () => {
    const setup = await setupCollegeAndTeacher('dupe');
    const { agent } = await loginAsTeacher(
      app,
      setup.teacherUser.email,
      'Test@Password123',
    );

    const markPayload = {
      attendance: [
        { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        { student_id: setup.student2._id.toString(), status: 'PRESENT' },
      ],
    };

    await agent
      .post(`/api/attendance/sessions/${setup.session._id}/mark`)
      .send(markPayload)
      .expect(200);

    const dupeRes = await agent
      .post(`/api/attendance/sessions/${setup.session._id}/mark`)
      .send(markPayload)
      .expect(409);

    expect(getErrorCode(dupeRes)).toBe('ATTENDANCE_ALREADY_SAVED');
    expect(getErrorMessage(dupeRes)).toContain('Attendance already saved');
  });

  it('PUT .../edit updates statuses, persists them, and returns a correct summary; session counts match the records', async () => {
    const setup = await setupCollegeAndTeacher('edit');
    const { agent } = await loginAsTeacher(
      app,
      setup.teacherUser.email,
      'Test@Password123',
    );

    await agent
      .post(`/api/attendance/sessions/${setup.session._id}/mark`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'PRESENT' },
          { student_id: setup.student2._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(200);

    const editPayload = {
      attendance: [
        { student_id: setup.student1._id.toString(), status: 'ABSENT' },
        { student_id: setup.student2._id.toString(), status: 'PRESENT' },
      ],
    };

    const editRes = await agent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send(editPayload)
      .expect(200);

    expect(editRes.body.message).toContain('Attendance updated successfully');
    expect(editRes.body.summary).toEqual({
      total: 2,
      present: 1,
      absent: 1,
      percentage: 50,
    });

    const records = await AttendanceRecord.find({
      session_id: setup.session._id,
    });
    const s1Record = records.find(
      (r) => r.student_id.toString() === setup.student1._id.toString(),
    );
    const s2Record = records.find(
      (r) => r.student_id.toString() === setup.student2._id.toString(),
    );
    expect(s1Record.status).toBe('ABSENT');
    expect(s2Record.status).toBe('PRESENT');

    const updatedSession = await AttendanceSession.findById(setup.session._id);
    expect(updatedSession.presentCount).toBe(1);
    expect(updatedSession.absentCount).toBe(1);
    expect(updatedSession.totalStudents).toBe(2);

    const persistedPresent = await AttendanceRecord.countDocuments({
      session_id: setup.session._id,
      status: 'PRESENT',
    });
    const persistedAbsent = await AttendanceRecord.countDocuments({
      session_id: setup.session._id,
      status: 'ABSENT',
    });
    expect(editRes.body.summary.present).toBe(persistedPresent);
    expect(editRes.body.summary.absent).toBe(persistedAbsent);
    expect(editRes.body.summary.total).toBe(persistedPresent + persistedAbsent);
    expect(updatedSession.presentCount).toBe(persistedPresent);
    expect(updatedSession.absentCount).toBe(persistedAbsent);
  });

  it('PUT .../edit on a CLOSED session is rejected with a clear error', async () => {
    const setup = await setupCollegeAndTeacher('closed');
    const { agent } = await loginAsTeacher(
      app,
      setup.teacherUser.email,
      'Test@Password123',
    );

    setup.session.status = 'CLOSED';
    await setup.session.save();

    const res = await agent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(400);

    expect(getErrorCode(res)).toBe('SESSION_CLOSED');
    expect(getErrorMessage(res)).toContain('closed and cannot be edited');
  });

  it('PUT .../edit by a teacher who does not own the session is rejected', async () => {
    const setup = await setupCollegeAndTeacher('owner');

    const otherUnique = `other-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const otherTeacherUser = await createUser({
      email: `other.teacher.${otherUnique}@test.com`,
      password: 'Test@Password123',
      role: 'TEACHER',
      college_id: setup.college._id,
    });
    await createTeacher({
      user_id: otherTeacherUser._id,
      college_id: setup.college._id,
      department_id: setup.department._id,
      email: otherTeacherUser.email,
      createdBy: otherTeacherUser._id,
    });

    const { agent } = await loginAsTeacher(
      app,
      otherTeacherUser.email,
      'Test@Password123',
    );

    const res = await agent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(404);

    expect(getErrorCode(res)).toBe('SESSION_NOT_FOUND');
    expect(getErrorMessage(res)).toContain('Attendance session not found');
  });

  it("PUT .../edit from another college's user is rejected (tenant isolation)", async () => {
    const setupA = await setupCollegeAndTeacher('tena');
    const setupB = await setupCollegeAndTeacher('tenb');

    const { agent: agentB } = await loginAsTeacher(
      app,
      setupB.teacherUser.email,
      'Test@Password123',
    );

    const res = await agentB
      .put(`/api/attendance/sessions/${setupA.session._id}/edit`)
      .send({
        attendance: [
          { student_id: setupA.student1._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(404);

    expect(getErrorCode(res)).toBe('SESSION_NOT_FOUND');
    expect(getErrorMessage(res)).toContain('Attendance session not found');
  });

  it('PUT .../edit with a student not in the course, with duplicates, or with an invalid status returns 400', async () => {
    const setup = await setupCollegeAndTeacher('valid');
    const { agent } = await loginAsTeacher(
      app,
      setup.teacherUser.email,
      'Test@Password123',
    );

    const outsiderUnique = `out-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const otherCourse = await createCourse({
      college_id: setup.college._id,
      department_id: setup.department._id,
      code: `CRS-${outsiderUnique}`,
    });
    const outsiderStudent = await createStudent({
      college_id: setup.college._id,
      department_id: setup.department._id,
      course_id: otherCourse._id,
      email: `outsider.${outsiderUnique}@test.com`,
      fullName: 'Outsider Student',
    });

    // 1. Student not in the course
    const resOutsider = await agent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send({
        attendance: [
          { student_id: outsiderStudent._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(400);
    expect(getErrorCode(resOutsider)).toBe('STUDENT_NOT_IN_ROSTER');
    expect(getErrorMessage(resOutsider)).toContain("not enrolled in this session's course roster");

    // 2. Duplicate student_ids
    const resDupe = await agent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'PRESENT' },
          { student_id: setup.student1._id.toString(), status: 'ABSENT' },
        ],
      })
      .expect(400);
    expect(getErrorMessage(resDupe)).toContain('Duplicate student ID');

    // 3. Invalid status
    const resInvalidStatus = await agent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'EXCUSED' },
        ],
      })
      .expect(400);
    expect(getErrorMessage(resInvalidStatus)).toContain('Invalid status');
  });

  it('a late-enrolled student is upserted with record creation and updated session count', async () => {
    const setup = await setupCollegeAndTeacher('late');
    const { agent } = await loginAsTeacher(
      app,
      setup.teacherUser.email,
      'Test@Password123',
    );

    // Initial mark only marks student 1
    await agent
      .post(`/api/attendance/sessions/${setup.session._id}/mark`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(200);

    const initialRecords = await AttendanceRecord.find({
      session_id: setup.session._id,
    });
    expect(initialRecords).toHaveLength(1);

    // Late enrollee student 2 (in course roster) is included in PUT /edit
    const editPayload = {
      attendance: [
        { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        { student_id: setup.student2._id.toString(), status: 'ABSENT' },
      ],
    };

    const res = await agent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send(editPayload)
      .expect(200);

    expect(res.body.message).toContain('Attendance updated successfully');

    // Student 2 record has been upserted
    const allRecords = await AttendanceRecord.find({
      session_id: setup.session._id,
    });
    expect(allRecords).toHaveLength(2);

    const s2Record = allRecords.find(
      (r) => r.student_id.toString() === setup.student2._id.toString(),
    );
    expect(s2Record).toBeDefined();
    expect(s2Record.status).toBe('ABSENT');
    expect(s2Record.markedBy.toString()).toBe(setup.teacher._id.toString());

    // Session counts reflect both students
    const updatedSession = await AttendanceSession.findById(setup.session._id);
    expect(updatedSession.totalStudents).toBe(2);
    expect(updatedSession.presentCount).toBe(1);
    expect(updatedSession.absentCount).toBe(1);
  });

  it('Unauthenticated and non-TEACHER/HOD roles are rejected', async () => {
    const setup = await setupCollegeAndTeacher('roles');

    // 1. Unauthenticated request
    await request(app)
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(401);

    // 2. Student role
    const studentUser = await createUser({
      email: `student.user.${Date.now()}@test.com`,
      password: 'Test@Password123',
      role: 'STUDENT',
      college_id: setup.college._id,
    });

    const { agent: studentAgent } = await loginAsStudent(
      app,
      studentUser.email,
      'Test@Password123',
    );

    await studentAgent
      .put(`/api/attendance/sessions/${setup.session._id}/edit`)
      .send({
        attendance: [
          { student_id: setup.student1._id.toString(), status: 'PRESENT' },
        ],
      })
      .expect(403);
  });
});
