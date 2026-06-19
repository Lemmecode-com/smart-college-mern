const Teacher = require("../models/teacher.model");
const Subject = require("../models/subject.model");
const TimetableSlot = require("../models/timetableSlot.model");
const Timetable = require("../models/timetable.model");
const { parseLocalDateSafe } = require("../utils/date.utils");
const AppError = require("../utils/AppError");

async function assertActiveTeacher(teacherId, collegeId, departmentId, label) {
  const teacher = await Teacher.findOne({
    _id: teacherId,
    college_id: collegeId,
    department_id: departmentId,
    status: "ACTIVE",
  });
  if (!teacher) {
    throw new AppError(
      `${label || "Teacher"} not found or inactive`,
      404,
      "TEACHER_NOT_FOUND",
    );
  }
  return teacher;
}

async function assertActiveSubject(subjectId, collegeId, departmentId) {
  const subject = await Subject.findOne({
    _id: subjectId,
    college_id: collegeId,
    department_id: departmentId,
    status: "ACTIVE",
  });
  if (!subject) {
    throw new AppError("Subject not found or inactive", 404, "SUBJECT_NOT_FOUND");
  }
  return subject;
}

async function assertSlotInTimetable(slotId, timetableId, collegeId) {
  const slot = await TimetableSlot.findOne({
    _id: slotId,
    timetable_id: timetableId,
    college_id: collegeId,
  });
  if (!slot) {
    throw new AppError("Slot not found in timetable", 404, "SLOT_NOT_FOUND");
  }
  return slot;
}

async function validateExceptionReferences({
  type,
  substituteTeacher,
  extraSlot,
  rescheduledSlotId,
  collegeId,
  departmentId,
  timetableId,
  slotId,
}) {
  if (type === "TEACHER_CHANGE" && substituteTeacher) {
    await assertActiveTeacher(substituteTeacher, collegeId, departmentId, "Substitute teacher");
  }

  if (type === "EXTRA" && extraSlot) {
    if (extraSlot.teacher_id) {
      await assertActiveTeacher(extraSlot.teacher_id, collegeId, departmentId, "Extra class teacher");
    }
    if (extraSlot.subject_id) {
      await assertActiveSubject(extraSlot.subject_id, collegeId, departmentId);
    }
    if (
      extraSlot.teacher_id &&
      extraSlot.subject_id &&
      extraSlot.startTime &&
      extraSlot.endTime
    ) {
      const subject = await Subject.findById(extraSlot.subject_id);
      if (
        subject &&
        subject.teacher_id &&
        subject.teacher_id.toString() !== extraSlot.teacher_id.toString()
      ) {
        throw new AppError(
          "Extra class teacher must match subject mapping",
          409,
          "TEACHER_SUBJECT_MISMATCH",
        );
      }
    }
  }

  if (rescheduledSlotId) {
    await assertSlotInTimetable(rescheduledSlotId, timetableId, collegeId);
  }

  if (slotId) {
    await assertSlotInTimetable(slotId, timetableId, collegeId);
  }
}

async function validateExceptionForApproval(exceptionId, collegeId) {
  const TimetableException = require("../models/timetableException.model");
  const exception = await TimetableException.findOne({
    _id: exceptionId,
    college_id: collegeId,
  });
  if (!exception) {
    throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");
  }

  const timetable = await Timetable.findOne({
    _id: exception.timetable_id,
    college_id: collegeId,
  });
  if (!timetable) {
    throw new AppError("Referenced timetable not found", 404, "TIMETABLE_NOT_FOUND");
  }
  if (timetable.status !== "PUBLISHED") {
    throw new AppError("Timetable is not active", 409, "TIMETABLE_NOT_ACTIVE");
  }

  await validateExceptionReferences({
    type: exception.type,
    substituteTeacher: exception.substituteTeacher,
    extraSlot: exception.extraSlot,
    rescheduledSlotId: exception.rescheduledSlotId,
    collegeId: exception.college_id,
    departmentId: timetable.department_id,
    timetableId: exception.timetable_id,
    slotId: exception.slot_id,
  });

  return { exception, timetable };
}

module.exports = {
  validateExceptionReferences,
  validateExceptionForApproval,
  assertActiveTeacher,
  assertActiveSubject,
  assertSlotInTimetable,
};
