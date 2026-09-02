const mongoose = require("mongoose");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");

const getCourseId = (student) => student.course_id?._id || student.course_id;

const getAttendanceDataForStudents = async (students, collegeId) => {
  const normalizedStudents = students.map((student) => ({
    student_id: student._id,
    courseId: getCourseId(student),
    semester: Number(student.currentSemester),
    academicYear: typeof student.currentAcademicYear === "string"
      ? student.currentAcademicYear.trim()
      : student.currentAcademicYear,
  }));

  const scopedStudents = normalizedStudents.filter((student) => (
    student.courseId &&
    Number.isFinite(student.semester) &&
    typeof student.academicYear === "string" &&
    student.academicYear.length > 0
  ));

  if (scopedStudents.length === 0) {
    return normalizedStudents.map((student) => ({
      student_id: student.student_id,
      percentage: 0,
      totalSessions: 0,
    }));
  }

  const courseIds = [
    ...new Set(
      scopedStudents
        .map((student) => student.courseId.toString()),
    ),
  ];
  const courseObjectIds = courseIds.map((courseId) => new mongoose.Types.ObjectId(courseId));
  const semesterValues = [
    ...new Set(scopedStudents.map((student) => student.semester)),
  ];
  const academicYearValues = [
    ...new Set(scopedStudents.map((student) => student.academicYear)),
  ];

  const scopedSessions = await AttendanceSession.aggregate([
    {
      $match: {
        college_id: collegeId,
        course_id: { $in: courseObjectIds },
        status: "CLOSED",
        slot_id: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "timetableslots",
        localField: "slot_id",
        foreignField: "_id",
        as: "slot",
      },
    },
    {
      $unwind: {
        path: "$slot",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: "timetables",
        localField: "slot.timetable_id",
        foreignField: "_id",
        as: "timetable",
      },
    },
    {
      $unwind: {
        path: "$timetable",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        "slot.college_id": collegeId,
        "slot.course_id": { $in: courseObjectIds },
        "timetable.college_id": collegeId,
        "timetable.course_id": { $in: courseObjectIds },
        "timetable.semester": { $in: semesterValues },
        "timetable.academicYear": { $in: academicYearValues },
      },
    },
    {
      $group: {
        _id: {
          course_id: "$course_id",
          semester: "$timetable.semester",
          academicYear: "$timetable.academicYear",
        },
        totalSessions: { $sum: 1 },
        sessionIds: { $push: "$_id" },
      },
    },
  ]);

  const sessionIds = scopedSessions.flatMap((row) => row.sessionIds);
  const sessionScopeMap = new Map();
  scopedSessions.forEach((row) => {
    const scopeKey = `${row._id.course_id.toString()}|${row._id.semester}|${row._id.academicYear}`;
    row.sessionIds.forEach((sessionId) => {
      sessionScopeMap.set(sessionId.toString(), scopeKey);
    });
  });

  const presentRows = sessionIds.length > 0
    ? await AttendanceRecord.aggregate([
      {
        $match: {
          college_id: collegeId,
          session_id: { $in: sessionIds },
          status: "PRESENT",
        },
      },
      {
        $group: {
          _id: {
            student_id: "$student_id",
            session_id: "$session_id",
          },
          presentCount: { $sum: 1 },
        },
      },
    ])
    : [];

  const presentByStudentScope = new Map();
  presentRows.forEach((row) => {
    const scopeKey = sessionScopeMap.get(row._id.session_id.toString());
    if (!scopeKey) return;

    const key = `${row._id.student_id.toString()}|${scopeKey}`;
    presentByStudentScope.set(
      key,
      (presentByStudentScope.get(key) || 0) + row.presentCount,
    );
  });

  const scopedSessionMap = new Map(
    scopedSessions.map((row) => [
      `${row._id.course_id.toString()}|${row._id.semester}|${row._id.academicYear}`,
      row,
    ]),
  );

  return normalizedStudents.map((student) => {
    const scopeKey = student.courseId
      ? `${student.courseId.toString()}|${student.semester}|${student.academicYear}`
      : null;
    const scopedSession = scopeKey ? scopedSessionMap.get(scopeKey) : null;
    const totalSessions = scopedSession?.totalSessions || 0;
    const presentCount = scopeKey ? presentByStudentScope.get(`${student.student_id.toString()}|${scopeKey}`) || 0 : 0;
    const percentage = totalSessions > 0
      ? parseFloat(((presentCount / totalSessions) * 100).toFixed(2))
      : 0;

    return {
      student_id: student.student_id,
      percentage,
      totalSessions,
    };
  });
};

module.exports = {
  getAttendanceDataForStudents,
};
