const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const Subject = require("../models/subject.model");
const Course = require("../models/course.model");
const Timetable = require("../models/timetable.model");
const TimetableException = require("../models/timetableException.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Department = require("../models/department.model");
const teacherService = require("./teacher.service");

exports.getHodReportsOverview = async (userId, collegeId) => {
  const teacher = await teacherService.getTeacherWithValidation(userId, collegeId);
  const { isHOD, department } = await teacherService.getHODStatus(teacher, collegeId);

  if (!isHOD || !department) {
    throw new Error("Access denied: Not a HOD");
  }

  const departmentId = teacher.department_id;

  const [
    totalTeachers,
    totalStudents,
    totalSubjects,
    totalCourses,
    publishedTimetables,
    draftTimetables,
    archivedTimetables,
    pendingExceptions,
    attendanceSummary,
  ] = await Promise.all([
    Teacher.countDocuments({ college_id: collegeId, department_id: departmentId }),
    Student.countDocuments({ college_id: collegeId, department_id: departmentId }),
    Subject.countDocuments({ college_id: collegeId, department_id: departmentId }),
    Course.countDocuments({ college_id: collegeId, department_id: departmentId }),
    Timetable.countDocuments({ college_id: collegeId, department_id: departmentId, status: "PUBLISHED" }),
    Timetable.countDocuments({ college_id: collegeId, department_id: departmentId, status: "DRAFT" }),
    Timetable.countDocuments({ college_id: collegeId, department_id: departmentId, status: "ARCHIVED" }),
    getPendingExceptionsCount(collegeId, departmentId),
    getAttendanceSummary(collegeId, departmentId),
  ]);

  return {
    department: {
      id: department._id,
      name: department.name,
      code: department.code,
      sanctionedFacultyCount: department.sanctionedFacultyCount,
      sanctionedStudentIntake: department.sanctionedStudentIntake,
    },
    kpis: {
      totalTeachers,
      totalStudents,
      totalSubjects,
      totalCourses,
      publishedTimetables,
      draftTimetables,
      archivedTimetables,
      pendingExceptions,
      attendanceSummary,
    },
    meta: {
      departmentId,
      collegeId,
      generatedAt: new Date().toISOString(),
    },
  };
};

const getPendingExceptionsCount = async (collegeId, departmentId) => {
  const timetableIds = await Timetable.find({
    college_id: collegeId,
    department_id: departmentId,
  }).select("_id");

  const ids = timetableIds.map((t) => t._id);

  if (ids.length === 0) return 0;

  return await TimetableException.countDocuments({
    timetable_id: { $in: ids },
    status: "PENDING",
    isActive: true,
  });
};

const getAttendanceSummary = async (collegeId, departmentId) => {
  const sessions = await AttendanceSession.find({
    college_id: collegeId,
    department_id: departmentId,
    status: "CLOSED",
  }).select("presentCount absentCount totalStudents");

  const totalSessions = sessions.length;
  const totalRecords = sessions.reduce((sum, s) => sum + (s.totalStudents || 0), 0);
  const totalPresent = sessions.reduce((sum, s) => sum + (s.presentCount || 0), 0);
  const totalAbsent = sessions.reduce((sum, s) => sum + (s.absentCount || 0), 0);
  const averageAttendancePercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  return {
    totalSessions,
    totalRecords,
    present: totalPresent,
    absent: totalAbsent,
    averageAttendancePercentage,
  };
};
