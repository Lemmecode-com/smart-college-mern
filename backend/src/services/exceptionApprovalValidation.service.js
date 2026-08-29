const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const TimetableException = require("../models/timetableException.model");
const Teacher = require("../models/teacher.model");
const Subject = require("../models/subject.model");
const { checkTeacherConflict, checkRoomConflict } = require("./exceptionValidation.service");
const AppError = require("../utils/AppError");

async function validateExceptionForApproval(exceptionId, collegeId) {
  const exception = await TimetableException.findOne({
    _id: exceptionId,
    college_id: collegeId,
  });
  if (!exception) throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");

  const timetable = await Timetable.findOne({
    _id: exception.timetable_id,
    college_id: collegeId,
  });
  if (!timetable)
    throw new AppError("Referenced timetable not found", 404, "TIMETABLE_NOT_FOUND");
  if (timetable.status !== "APPROVED")
    throw new AppError("Timetable is not active", 409, "TIMETABLE_NOT_ACTIVE");

  let slot = null;
  if (exception.slot_id) {
    slot = await TimetableSlot.findOne({
      _id: exception.slot_id,
      timetable_id: exception.timetable_id,
      college_id: collegeId,
    });
    if (!slot) throw new AppError("Slot not found in timetable", 404, "SLOT_NOT_FOUND");
  }

  if (slot && slot.teacher_id) {
    const slotTeacher = await Teacher.findOne({
      _id: slot.teacher_id,
      college_id: collegeId,
    });
    if (!slotTeacher)
      throw new AppError("Slot teacher not found", 404, "TEACHER_NOT_FOUND");
  }

  const teacherIds = [];
  if (exception.extraSlot?.teacher_id) {
    const extraTeacher = await Teacher.findOne({
      _id: exception.extraSlot.teacher_id,
      college_id: collegeId,
    });
    if (!extraTeacher)
      throw new AppError(
        "Extra class teacher not found",
        404,
        "TEACHER_NOT_FOUND",
      );
    teacherIds.push(exception.extraSlot.teacher_id);
  }

  if (exception.substituteTeacher) {
    const subTeacher = await Teacher.findOne({
      _id: exception.substituteTeacher,
      college_id: collegeId,
    });
    if (!subTeacher)
      throw new AppError("Substitute teacher not found", 404, "TEACHER_NOT_FOUND");
    teacherIds.push(exception.substituteTeacher);
  }

  if (exception.extraSlot?.subject_id) {
    const subject = await Subject.findOne({
      _id: exception.extraSlot.subject_id,
      college_id: collegeId,
    });
    if (!subject)
      throw new AppError("Subject not found", 404, "SUBJECT_NOT_FOUND");

    const subjectTeacherId =
      subject.teacher_id || exception.extraSlot.teacher_id;
    if (
      exception.extraSlot.teacher_id &&
      subjectTeacherId &&
      subjectTeacherId.toString() !== exception.extraSlot.teacher_id.toString()
    ) {
      throw new AppError(
        "Teacher does not match subject mapping",
        409,
        "TEACHER_SUBJECT_MISMATCH",
      );
    }
  }

  for (const teacherId of teacherIds) {
    if (!slot) continue;
    const hasConflict = await checkTeacherConflict(
      teacherId,
      exception.exceptionDate,
      slot.startTime,
      slot.endTime,
      collegeId,
    );
    if (hasConflict)
      throw new AppError(
        "Teacher has scheduling conflict",
        409,
        "TEACHER_CONFLICT",
      );
  }

  if (exception.newRoom && slot) {
    const hasRoomConflict = await checkRoomConflict(
      exception.newRoom,
      exception.exceptionDate,
      slot.startTime,
      slot.endTime,
      collegeId,
    );
    if (hasRoomConflict)
      throw new AppError("Room is already booked", 409, "ROOM_CONFLICT");
  }

  if (exception.newRoom && !/^[A-Za-z0-9\s\-]+$/.test(exception.newRoom.trim())) {
    throw new AppError("Invalid room format", 400, "INVALID_ROOM");
  }

  return { exception, timetable, slot };
}

module.exports = { validateExceptionForApproval };
