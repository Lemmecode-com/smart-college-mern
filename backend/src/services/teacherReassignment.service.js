const Subject = require("../models/subject.model");
const TimetableSlot = require("../models/timetableSlot.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Teacher = require("../models/teacher.model");
const AppError = require("../utils/AppError");

/**
 * Teacher Resource Reassignment Service
 *
 * When deactivating a teacher, all their assigned resources must be
 * reassigned to another teacher. This affects:
 * 1. Subjects (teacher_id)
 * 2. TimetableSlots (teacher_id)
 * 3. AttendanceSessions (teacher_id) — future sessions only
 *
 * CONSTRAINTS:
 * - Replacement teacher MUST be from the same DEPARTMENT as the subject.
 * - Replacement teacher MUST be assigned to the same COURSE as the subject.
 *
 * IMPORTANT: MongoDB M0 free tier does not support transactions.
 * We use sequential operations with manual rollback on failure.
 */

/**
 * Perform the full reassignment of a teacher's resources
 */
exports.reassignTeacherResources = async (
  teacherId,
  collegeId,
  subjectToTeacherMap = new Map(),
  defaultTeacherId = null,
) => {
  const rollbackOperations = [];

  try {
    const oldTeacher = await Teacher.findOne({
      _id: teacherId,
      college_id: collegeId,
    });

    if (!oldTeacher) {
      throw new AppError("Teacher not found", 404, "TEACHER_NOT_FOUND");
    }

    if (!defaultTeacherId) {
      throw new AppError(
        "Default teacher is required for reassignment",
        400,
        "DEFAULT_TEACHER_REQUIRED",
      );
    }

    const defaultTeacher = await Teacher.findOne({
      _id: defaultTeacherId,
      college_id: collegeId,
      status: "ACTIVE",
    });

    if (!defaultTeacher) {
      throw new AppError(
        "Default teacher not found or is inactive",
        404,
        "DEFAULT_TEACHER_INVALID",
      );
    }

    if (defaultTeacherId === teacherId) {
      throw new AppError(
        "Cannot reassign resources to the same teacher",
        400,
        "CANNOT_REASSIGN_TO_SAME_TEACHER",
      );
    }

    const subjects = await Subject.find({
      teacher_id: teacherId,
      college_id: collegeId,
      status: "ACTIVE",
    });

    if (subjects.length === 0) {
      return {
        success: true,
        reassignedSubjects: 0,
        reassignedSlots: 0,
        reassignedSessions: 0,
        message: "No active subjects to reassign",
      };
    }

    const reassignedSubjects = [];
    const reassignedSlots = [];
    const reassignedSessions = [];

    for (const subject of subjects) {
      const newTeacherId =
        subjectToTeacherMap.get(subject._id.toString()) || defaultTeacherId;

      const newTeacher = await Teacher.findOne({
        _id: newTeacherId,
        college_id: collegeId,
        status: "ACTIVE",
      });

      if (!newTeacher) {
        throw new AppError(
          `Target teacher for subject "${subject.name}" not found or inactive`,
          404,
          "TARGET_TEACHER_INVALID",
        );
      }

      // ENFORCE: Same DEPARTMENT
      if (
        newTeacher.department_id.toString() !== subject.department_id.toString()
      ) {
        throw new AppError(
          `Cannot assign subject "${subject.name}" to teacher "${newTeacher.name}": different departments.`,
          400,
          "DEPARTMENT_MISMATCH",
        );
      }

      // ENFORCE: Same COURSE
      const subjectCourseId = subject.course_id
        ? subject.course_id._id || subject.course_id
        : null;
      if (subjectCourseId) {
        const teacherCourseIds = (newTeacher.courses || []).map(
          (c) => c._id || c,
        );
        const matchesCourse = teacherCourseIds.some(
          (tid) => tid.toString() === subjectCourseId.toString(),
        );

        if (!matchesCourse) {
          throw new AppError(
            `Cannot assign subject "${subject.name}" to teacher "${newTeacher.name}": teacher is not assigned to the required course (${subject.course_id?.name || "N/A"}).`,
            400,
            "COURSE_MISMATCH",
          );
        }
      }

      // Rollback save
      rollbackOperations.push({
        model: Subject,
        id: subject._id,
        originalValue: { teacher_id: subject.teacher_id },
      });

      subject.teacher_id = newTeacherId;
      await subject.save();

      reassignedSubjects.push({
        subjectId: subject._id,
        subjectName: subject.name,
        subjectCode: subject.code,
        oldTeacherId: teacherId,
        newTeacherId,
      });

      // Reassign timetable slots
      const slots = await TimetableSlot.find({
        subject_id: subject._id,
        college_id: collegeId,
        teacher_id: teacherId,
      });

      for (const slot of slots) {
        rollbackOperations.push({
          model: TimetableSlot,
          id: slot._id,
          originalValue: { teacher_id: slot.teacher_id },
        });

        slot.teacher_id = newTeacherId;
        await slot.save();

        reassignedSlots.push({
          slotId: slot._id,
          subjectId: subject._id,
          day: slot.day,
          startTime: slot.startTime,
          oldTeacherId: teacherId,
          newTeacherId,
        });
      }

      // Reassign future attendance sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sessions = await AttendanceSession.find({
        subject_id: subject._id,
        college_id: collegeId,
        teacher_id: teacherId,
        $or: [{ status: "OPEN" }, { lectureDate: { $gte: today } }],
      });

      for (const session of sessions) {
        rollbackOperations.push({
          model: AttendanceSession,
          id: session._id,
          originalValue: { teacher_id: session.teacher_id },
        });

        session.teacher_id = newTeacherId;
        if (session.slotSnapshot) {
          session.slotSnapshot.teacher_id = newTeacherId;
          session.slotSnapshot.teacher_name = newTeacher.name;
        }

        await session.save();

        reassignedSessions.push({
          sessionId: session._id,
          subjectId: subject._id,
          lectureDate: session.lectureDate,
          lectureNumber: session.lectureNumber,
          oldTeacherId: teacherId,
          newTeacherId,
        });
      }
    }

    // Update old teacher's subjects array
    oldTeacher.subjects = [];
    await oldTeacher.save();

    // Update new teachers' subjects arrays
    const uniqueNewTeacherIds = [
      ...new Set(reassignedSubjects.map((r) => r.newTeacherId)),
    ];
    for (const newTeacherId of uniqueNewTeacherIds) {
      const newTeacher = await Teacher.findById(newTeacherId);
      if (newTeacher) {
        const teacherSubjects = await Subject.find({
          teacher_id: newTeacherId,
          college_id: collegeId,
          status: "ACTIVE",
        }).select("_id");

        newTeacher.subjects = teacherSubjects.map((s) => s._id);
        await newTeacher.save();
      }
    }

    return {
      success: true,
      reassignedSubjects: reassignedSubjects.length,
      reassignedSlots: reassignedSlots.length,
      reassignedSessions: reassignedSessions.length,
      details: {
        subjects: reassignedSubjects,
        slots: reassignedSlots,
        sessions: reassignedSessions,
      },
    };
  } catch (error) {
    console.error("[REASSIGNMENT FAILED]", error.message);
    console.log(
      `[ROLLBACK] Attempting to rollback ${rollbackOperations.length} operations...`,
    );

    let rollbackSuccess = 0;
    let rollbackFailed = 0;

    for (let i = rollbackOperations.length - 1; i >= 0; i--) {
      const op = rollbackOperations[i];
      try {
        await op.model.findByIdAndUpdate(op.id, op.originalValue);
        rollbackSuccess++;
      } catch (rollbackError) {
        rollbackFailed++;
        console.error(
          `[ROLLBACK FAILED] ${op.model.modelName} ${op.id}:`,
          rollbackError.message,
        );
      }
    }

    console.log(
      `[ROLLBACK COMPLETE] Success: ${rollbackSuccess}, Failed: ${rollbackFailed}`,
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      `Resource reassignment failed: ${error.message}. Rollback attempted.`,
      500,
      "REASSIGNMENT_FAILED",
    );
  }
};

/**
 * Get available teachers for reassignment
 */
exports.getAvailableTeachersForReassignment = async (
  collegeId,
  excludeTeacherId,
) => {
  const teachers = await Teacher.find({
    college_id: collegeId,
    _id: { $ne: excludeTeacherId },
    status: "ACTIVE",
  })
    .populate("department_id", "_id name code")
    .populate("subjects", "name code")
    .populate("courses", "_id name code")
    .select("name employeeId designation email department_id subjects courses")
    .sort({ name: 1 });

  return teachers;
};

/**
 * Get teacher reassignment data — subjects, slots, and sessions needing reassignment
 */
exports.getTeacherReassignmentData = async (teacherId, collegeId) => {
  const subjects = await Subject.find({
    teacher_id: teacherId,
    college_id: collegeId,
    status: "ACTIVE",
  })
    .populate("course_id", "name code")
    .populate("department_id", "_id name")
    .select("name code semester credits department_id course_id");

  if (subjects.length === 0) {
    return {
      subjects: [],
      slots: [],
      sessions: [],
      needsReassignment: false,
    };
  }

  const subjectIds = subjects.map((s) => s._id);

  const slots = await TimetableSlot.find({
    subject_id: { $in: subjectIds },
    college_id: collegeId,
    teacher_id: teacherId,
  })
    .populate("subject_id", "name code")
    .populate("course_id", "name code")
    .select("day startTime endTime room slotType")
    .sort({ day: 1, startTime: 1 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessions = await AttendanceSession.find({
    subject_id: { $in: subjectIds },
    college_id: collegeId,
    teacher_id: teacherId,
    $or: [{ status: "OPEN" }, { lectureDate: { $gte: today } }],
  })
    .populate("subject_id", "name code")
    .select("lectureDate lectureNumber status")
    .sort({ lectureDate: 1, lectureNumber: 1 });

  return {
    subjects,
    slots,
    sessions,
    needsReassignment: subjects.length > 0,
  };
};
