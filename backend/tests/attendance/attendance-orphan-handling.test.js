const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, closeTestDb } = require("../setup/testDb");
const {
  createCollege,
  createDepartment,
  createCourse,
  createStudent,
  createTeacher,
  createSubject,
} = require("../helpers/factories");

const AttendanceSession = require("../../src/models/attendanceSession.model");
const AttendanceRecord = require("../../src/models/attendanceRecord.model");
const User = require("../../src/models/user.model");

const {
  getAttendanceDataForStudents,
  getCumulativeAttendanceForStudent,
} = require("../../src/services/attendance.service");

describe("Attendance Service - Orphan Session & Cumulative Attendance", () => {
  beforeAll(connectTestDb);
  afterAll(closeTestDb);

  let collegeId;
  let dept;
  let course;
  let teacherUser;
  let teacher;
  let subject;
  let student;

  beforeEach(async () => {
    await clearTestDb();

    const ts = Date.now() + Math.floor(Math.random() * 10000);
    const college = await createCollege({ code: `COL_${ts}`, email: `col_${ts}@test.com` });
    collegeId = college._id;

    dept = await createDepartment({
      college_id: collegeId,
      code: `D_${ts}`,
      createdBy: new mongoose.Types.ObjectId(),
    });

    course = await createCourse({
      college_id: collegeId,
      department_id: dept._id,
      name: "Computer Science",
      code: `CS_${ts}`,
      durationSemesters: 4,
    });

    teacherUser = await User.create({
      name: "Test Teacher",
      email: `teacher_${ts}@test.com`,
      password: "Password@123",
      role: "TEACHER",
      college_id: collegeId,
    });

    teacher = await createTeacher({
      college_id: collegeId,
      user_id: teacherUser._id,
      department_id: dept._id,
      createdBy: teacherUser._id,
    });

    subject = await createSubject({
      college_id: collegeId,
      department_id: dept._id,
      course_id: course._id,
      name: "Data Structures",
      code: `DS_${ts}`,
      semester: 1,
      createdBy: teacherUser._id,
    });

    student = await createStudent({
      college_id: collegeId,
      department_id: dept._id,
      course_id: course._id,
      fullName: "Dikha Sen",
      email: `dikha_${ts}@test.com`,
      currentSemester: 2,
      currentAcademicYear: "2026-2027",
      status: "APPROVED",
    });
  });

  it("does not crash when AttendanceSession references a nonexistent timetable slot", async () => {
    const missingSlotId = new mongoose.Types.ObjectId();

    const helperCreateSession = (slotId) =>
      AttendanceSession.create({
        college_id: collegeId,
        department_id: dept._id,
        course_id: course._id,
        subject_id: subject._id,
        teacher_id: teacher._id,
        slot_id: slotId,
        lectureDate: new Date(),
        lectureNumber: 1,
        totalStudents: 1,
        status: "CLOSED",
        session_date: new Date(),
        markedBy: teacher._id,
        slotSnapshot: {
          subject_id: subject._id,
          subject_name: subject.name,
          subject_code: subject.code,
          teacher_id: teacher._id,
          teacher_name: teacher.name,
          day: "MON",
          startTime: "09:00",
          endTime: "10:00",
          slotType: "LECTURE",
        },
      });

    // Create an orphan session with missing slot_id
    const session = await helperCreateSession(missingSlotId);

    // Create attendance record linked to this orphan session
    await AttendanceRecord.create({
      college_id: collegeId,
      session_id: session._id,
      student_id: student._id,
      status: "PRESENT",
      markedBy: teacher._id,
    });

    // Should run smoothly without throwing
    const result = await getAttendanceDataForStudents([student], collegeId);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].student_id.toString()).toBe(student._id.toString());
    // Since slot was missing, scopedSessions dropped it safely -> 0 sessions
    expect(result[0].totalSessions).toBe(0);
    expect(result[0].percentage).toBe(0);
  });

  it("computes cumulative attendance across all closed sessions for a student", async () => {
    const missingSlotId = new mongoose.Types.ObjectId();

    const helperCreateSession = (slotId, lectureNumber = 1) =>
      AttendanceSession.create({
        college_id: collegeId,
        department_id: dept._id,
        course_id: course._id,
        subject_id: subject._id,
        teacher_id: teacher._id,
        slot_id: slotId,
        lectureDate: new Date(),
        lectureNumber,
        totalStudents: 1,
        status: "CLOSED",
        session_date: new Date(),
        markedBy: teacher._id,
        slotSnapshot: {
          subject_id: subject._id,
          subject_name: subject.name,
          subject_code: subject.code,
          teacher_id: teacher._id,
          teacher_name: teacher.name,
          day: "MON",
          startTime: "09:00",
          endTime: "10:00",
          slotType: "LECTURE",
        },
      });

    const session1 = await helperCreateSession(missingSlotId, 1);
    const session2 = await helperCreateSession(missingSlotId, 2);

    // Student attended both
    await AttendanceRecord.create({
      college_id: collegeId,
      session_id: session1._id,
      student_id: student._id,
      status: "PRESENT",
      markedBy: teacher._id,
    });

    await AttendanceRecord.create({
      college_id: collegeId,
      session_id: session2._id,
      student_id: student._id,
      status: "PRESENT",
      markedBy: teacher._id,
    });

    const cumulative = await getCumulativeAttendanceForStudent(student._id, collegeId);

    expect(cumulative.totalSessions).toBe(2);
    expect(cumulative.presentSessions).toBe(2);
    expect(cumulative.percentage).toBe(100);
  });
});
