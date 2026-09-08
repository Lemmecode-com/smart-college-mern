const Subject = require("../models/subject.model");
const Teacher = require("../models/teacher.model");
const Course = require("../models/course.model");
const AppError = require("../utils/AppError");

/**
 * Teacher-Subject Assignment Service
 *
 * Business rules:
 * 1. Teacher and Subject must belong to the same college.
 * 2. Teacher and Subject must belong to the same department.
 * 3. Teacher must be assigned to the Subject's course (teacher.courses includes subject.course_id).
 * 4. Both Teacher and Subject must be ACTIVE.
 * 5. Subject.teacher_id and Teacher.subjects[] must remain synchronized.
 */

const validateCompatibility = async (teacherId, subjectId, collegeId) => {
  const teacher = await Teacher.findOne({
    _id: teacherId,
    college_id: collegeId,
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
  }

  if (teacher.status !== "ACTIVE") {
    throw new AppError("Teacher is inactive", 400, "TEACHER_INACTIVE");
  }

  const subject = await Subject.findOne({
    _id: subjectId,
    college_id: collegeId,
  });

  if (!subject) {
    throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
  }

  if (subject.status !== "ACTIVE") {
    throw new AppError("Subject is inactive", 400, "SUBJECT_INACTIVE");
  }

  if (teacher.department_id.toString() !== subject.department_id.toString()) {
    throw new AppError(
      "Teacher and Subject must belong to the same department",
      400,
      "DEPARTMENT_MISMATCH",
    );
  }

  const subjectCourseId = subject.course_id
    ? subject.course_id._id || subject.course_id
    : null;

  if (subjectCourseId) {
    const teacherCourseIds = (teacher.courses || []).map(
      (c) => c._id || c,
    );

    const matchesCourse = teacherCourseIds.some(
      (tid) => tid.toString() === subjectCourseId.toString(),
    );

    if (!matchesCourse) {
      const course = await Course.findById(subjectCourseId).select("name code");
      throw new AppError(
        `Teacher is not assigned to the required course (${
          course?.name || course?.code || "N/A"
        })`,
        400,
        "COURSE_MISMATCH",
      );
    }
  }

  return { teacher, subject };
};

/**
 * Assign a single subject to a teacher.
 * Handles reassignment if the subject is already assigned to another teacher.
 */
exports.assignSubjectToTeacher = async (teacherId, subjectId, collegeId) => {
  const { teacher, subject } = await validateCompatibility(
    teacherId,
    subjectId,
    collegeId,
  );

  const oldTeacherId = subject.teacher_id;

  if (oldTeacherId && oldTeacherId.toString() === teacherId.toString()) {
    return {
      success: true,
      message: "Subject is already assigned to this teacher",
      reassigned: false,
      subject,
      teacher,
    };
  }

  if (oldTeacherId) {
    const oldTeacher = await Teacher.findById(oldTeacherId);
    if (oldTeacher && oldTeacher.subjects) {
      oldTeacher.subjects = oldTeacher.subjects.filter(
        (sid) => sid.toString() !== subjectId.toString(),
      );
      await oldTeacher.save();
    }
  }

  subject.teacher_id = teacherId;
  await subject.save();

  if (!teacher.subjects) {
    teacher.subjects = [];
  }

  const alreadyInArray = teacher.subjects.some(
    (sid) => sid.toString() === subjectId.toString(),
  );

  if (!alreadyInArray) {
    teacher.subjects.push(subjectId);
    await teacher.save();
  }

  return {
    success: true,
    message: oldTeacherId
      ? "Subject reassigned successfully"
      : "Subject assigned successfully",
    reassigned: !!oldTeacherId,
    subject,
    teacher,
  };
};

/**
 * Unassign a subject from a teacher.
 */
exports.unassignSubjectFromTeacher = async (teacherId, subjectId, collegeId) => {
  const teacher = await Teacher.findOne({
    _id: teacherId,
    college_id: collegeId,
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
  }

  const subject = await Subject.findOne({
    _id: subjectId,
    college_id: collegeId,
  });

  if (!subject) {
    throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");
  }

  if (subject.teacher_id && subject.teacher_id.toString() !== teacherId.toString()) {
    throw new AppError(
      "Subject is not assigned to this teacher",
      400,
      "SUBJECT_NOT_ASSIGNED",
    );
  }

  subject.teacher_id = null;
  await subject.save();

  if (teacher.subjects) {
    teacher.subjects = teacher.subjects.filter(
      (sid) => sid.toString() !== subjectId.toString(),
    );
    await teacher.save();
  }

  return {
    success: true,
    message: "Subject unassigned successfully",
    subject,
    teacher,
  };
};

/**
 * Bulk assign multiple subjects to a teacher.
 */
exports.bulkAssignSubjects = async (teacherId, subjectIds, collegeId) => {
  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    throw new AppError("subjectIds must be a non-empty array", 400, "INVALID_REQUEST");
  }

  const results = [];
  const errors = [];

  for (const subjectId of subjectIds) {
    try {
      const result = await exports.assignSubjectToTeacher(
        teacherId,
        subjectId,
        collegeId,
      );
      results.push(result);
    } catch (error) {
      errors.push({
        subjectId,
        message: error.message,
        code: error.code,
      });
    }
  }

  return {
    success: errors.length === 0,
    assigned: results.filter((r) => r.reassigned !== false || r.message.includes("already assigned")).length,
    reassigned: results.filter((r) => r.reassigned).length,
    results,
    errors,
  };
};

/**
 * Get subjects assigned to a teacher.
 */
exports.getTeacherSubjects = async (teacherId, collegeId) => {
  const teacher = await Teacher.findOne({
    _id: teacherId,
    college_id: collegeId,
  });

  if (!teacher) {
    throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
  }

  const subjects = await Subject.find({
    teacher_id: teacherId,
    college_id: collegeId,
    status: "ACTIVE",
  })
    .populate("course_id", "name code")
    .populate("department_id", "name code")
    .select("name code semester credits status subjectType");

  return {
    success: true,
    subjects,
    count: subjects.length,
  };
};
