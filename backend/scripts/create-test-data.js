require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const collegeId = '699c0f99cc496e694bae39c4';

  const existingDept = await db.collection('departments').findOne({ college_id: collegeId, name: 'Test Dept' });
  if (existingDept) {
    console.log('Test data already exists');
    process.exit(0);
  }

  const dept = await db.collection('departments').insertOne({
    college_id: collegeId,
    name: 'Test Dept',
    shortName: 'TD',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created department:', dept.insertedId);

  const course = await db.collection('courses').insertOne({
    college_id: collegeId,
    department_id: dept.insertedId,
    name: 'Test Course',
    code: 'TC',
    durationSemesters: 8,
    durationYears: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created course:', course.insertedId);

  const sub1 = await db.collection('subjects').insertOne({
    college_id: collegeId,
    course_id: course.insertedId,
    department_id: dept.insertedId,
    name: 'Test Subject 1',
    code: 'TS1',
    subjectType: 'THEORY',
    semester: 1,
    internalMaxMarks: 30,
    externalMaxMarks: 70,
    internalPassMarks: 15,
    externalPassMarks: 28,
    passMarks: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const sub2 = await db.collection('subjects').insertOne({
    college_id: collegeId,
    course_id: course.insertedId,
    department_id: dept.insertedId,
    name: 'Test Subject 2',
    code: 'TS2',
    subjectType: 'THEORY',
    semester: 1,
    internalMaxMarks: 30,
    externalMaxMarks: 70,
    internalPassMarks: 15,
    externalPassMarks: 28,
    passMarks: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created subjects:', sub1.insertedId, sub2.insertedId);

  const studentUser = await db.collection('users').insertOne({
    college_id: collegeId,
    name: 'Test Student',
    email: 'teststudent@test.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'STUDENT',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created student user:', studentUser.insertedId);

  const student = await db.collection('students').insertOne({
    college_id: collegeId,
    user_id: studentUser.insertedId,
    course_id: course.insertedId,
    currentSemester: 1,
    admissionNumber: 'TS001',
    firstName: 'Test',
    lastName: 'Student',
    email: 'teststudent@test.com',
    mobileNumber: '9999999999',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created student profile:', student.insertedId);

  const teacherUser = await db.collection('users').insertOne({
    college_id: collegeId,
    name: 'Test Teacher',
    email: 'testteacher@test.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'TEACHER',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created teacher user:', teacherUser.insertedId);

  const teacher = await db.collection('teachers').insertOne({
    college_id: collegeId,
    user_id: teacherUser.insertedId,
    department_id: dept.insertedId,
    courses: [course.insertedId],
    subjects: [sub1.insertedId, sub2.insertedId],
    employeeId: 'TT001',
    firstName: 'Test',
    lastName: 'Teacher',
    email: 'testteacher@test.com',
    mobileNumber: '9999999998',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created teacher profile:', teacher.insertedId);

  const hodUser = await db.collection('users').insertOne({
    college_id: collegeId,
    name: 'Test HOD',
    email: 'testhod@test.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'HOD',
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created HOD user:', hodUser.insertedId);

  const hodTeacher = await db.collection('teachers').insertOne({
    college_id: collegeId,
    user_id: hodUser.insertedId,
    department_id: dept.insertedId,
    courses: [course.insertedId],
    subjects: [sub1.insertedId],
    employeeId: 'TH001',
    firstName: 'Test',
    lastName: 'HOD',
    email: 'testhod@test.com',
    mobileNumber: '9999999997',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created HOD teacher profile:', hodTeacher.insertedId);

  const exam = await db.collection('exams').insertOne({
    college_id: collegeId,
    name: 'Test Exam',
    course_id: course.insertedId,
    semester: 1,
    academicYear: '2026-27',
    status: 'PUBLISHED',
    subjects: [
      { subject: sub1.insertedId, subjectType: 'THEORY', internalMaxMarks: 30, externalMaxMarks: 70, internalPassMarks: 15, externalPassMarks: 28, passMarks: 40 },
      { subject: sub2.insertedId, subjectType: 'THEORY', internalMaxMarks: 30, externalMaxMarks: 70, internalPassMarks: 15, externalPassMarks: 28, passMarks: 40 },
    ],
    createdBy: teacherUser.insertedId,
    updatedBy: teacherUser.insertedId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created exam:', exam.insertedId);

  const schedule = await db.collection('examschedules').insertOne({
    exam_id: exam.insertedId,
    college_id: collegeId,
    status: 'PUBLISHED',
    subjects: [
      { subject: sub1.insertedId, examDate: new Date('2026-09-15'), startTime: '10:00', endTime: '11:00', room: 'A-1', session: 'FORENOON' },
      { subject: sub2.insertedId, examDate: new Date('2026-09-15'), startTime: '11:00', endTime: '12:00', room: 'A-2', session: 'AFTERNOON' },
    ],
    createdBy: teacherUser.insertedId,
    updatedBy: teacherUser.insertedId,
    publishedBy: teacherUser.insertedId,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Created schedule:', schedule.insertedId);

  console.log('\n=== TEST DATA SUMMARY ===');
  console.log('Student login: teststudent@test.com / Test@123');
  console.log('Teacher login: testteacher@test.com / Test@123');
  console.log('HOD login: testhod@test.com / Test@123');
  console.log('Exam ID:', exam.insertedId);
  console.log('Course ID:', course.insertedId);
  console.log('Department ID:', dept.insertedId);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
