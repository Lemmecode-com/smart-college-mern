const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const TimetableException = require("../models/timetableException.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const Subject = require("../models/subject.model");
const AuditLog = require("../models/auditLog.model");
const Notification = require("../models/notification.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const teacherService = require("../services/teacher.service");
const exceptionValidationService = require("../services/exceptionValidation.service");
const { validateExceptionForApproval, validateExceptionReferences } = require("../services/exceptionReferenceValidation.service");
const { cache: scheduleCache } = require("../services/scheduleCache.service");
const { parseLocalDateSafe } = require("../utils/date.utils");
const { assertTimetableMutable } = require("../utils/timetableLifecycle.util");

const EDITABLE_EXCEPTION_FIELDS = new Set([
  "reason",
  "rescheduledTo",
  "rescheduledSlotId",
  "extraSlot",
  "newRoom",
  "substituteTeacher",
  "notifyAffected",
  "notes",
  "attachments",
]);

const PROTECTED_EXCEPTION_FIELDS = new Set([
  "status",
  "approvedBy",
  "approvedAt",
  "rejectedBy",
  "rejectedAt",
  "withdrawnBy",
  "withdrawnAt",
  "createdBy",
  "timetable_id",
  "slot_id",
  "type",
  "exceptionDate",
  "isActive",
]);

const NON_EDITABLE_EXCEPTION_STATUSES = new Set([
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "COMPLETED",
]);

const TIMETABLE_EXCEPTION_UNIQUE_INDEX_NAME =
  "idx_exception_unique_pending_approved";

function duplicateExceptionError() {
  return new AppError(
    "Duplicate timetable exception",
    409,
    "DUPLICATE_EXCEPTION",
  );
}

function isTimetableExceptionDuplicateError(error) {
  if (!error || error.code !== 11000) {
    return false;
  }

  if (error.indexName === TIMETABLE_EXCEPTION_UNIQUE_INDEX_NAME) {
    return true;
  }

  const keyPattern = error.keyPattern || {};

  return (
    keyPattern.college_id === 1 &&
    keyPattern.timetable_id === 1 &&
    keyPattern.slot_id === 1 &&
    keyPattern.exceptionDate === 1 &&
    keyPattern.type === 1
  );
}

/* =========================================================
   CREATE SINGLE EXCEPTION
   POST /api/timetable/:id/exceptions
========================================================= */
exports.createException = async (req, res, next) => {
  try {
    const { id: timetableId } = req.params;

    // 1️⃣ Validate timetable exists
    const timetable = await Timetable.findOne({
      _id: timetableId,
      college_id: req.college_id,
    });

    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    assertTimetableMutable(timetable, "exception");

    // 2️⃣ Verify user is TEACHER of this department
    if (req.user.role !== "TEACHER") {
      throw new AppError(
        "Only teachers can create exceptions",
        403,
        "UNAUTHORIZED_ROLE",
      );
    }

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    // 🔒 SECURITY: Teacher must belong to the timetable's department
    if (teacher.department_id.toString() !== timetable.department_id.toString()) {
      throw new AppError(
        "Access denied: You can only create exceptions for timetables in your department",
        403,
        "DEPARTMENT_MISMATCH",
      );
    }

    // 3️⃣ Extract exception data from request
    const {
      slot_id,
      exceptionDate,
      type,
      reason,
      rescheduledTo,
      rescheduledSlotId,
      extraSlot,
      newRoom,
      substituteTeacher,
      notifyAffected,
      notes,
    } = req.body;

    // 4️⃣ Validate required fields
    if (!exceptionDate || !type || !reason) {
      throw new AppError(
        "Missing required fields: exceptionDate, type, reason",
        400,
        "MISSING_FIELDS",
      );
    }

    // 5️⃣ Validate type-specific requirements
    if (type === "EXTRA" && !extraSlot) {
      throw new AppError(
        "EXTRA exception requires extraSlot details",
        400,
        "INVALID_EXTRA",
      );
    }

    if (type === "RESCHEDULED" && !rescheduledTo) {
      throw new AppError(
        "RESCHEDULED exception requires rescheduledTo date",
        400,
        "INVALID_RESCHEDULE",
      );
    }

    // 6️⃣ Run conflict validation
    if (type === "EXTRA" || type === "RESCHEDULED") {
      const conflictDate =
        type === "RESCHEDULED" ? rescheduledTo : exceptionDate;
      const teacherToCheck =
        type === "EXTRA" ? extraSlot.teacher_id : substituteTeacher;
      const timeToCheck =
        type === "EXTRA"
          ? { start: extraSlot.startTime, end: extraSlot.endTime }
          : null;

      if (teacherToCheck && timeToCheck) {
        const hasConflict =
          await exceptionValidationService.checkTeacherConflict(
            teacherToCheck,
            conflictDate,
            timeToCheck.start,
            timeToCheck.end,
            req.college_id,
          );

        if (hasConflict) {
          throw new AppError(
            "Teacher is already assigned to another class at this time",
            409,
            "TEACHER_CONFLICT",
          );
        }
      }

      // Check room conflict for EXTRA classes
      if (type === "EXTRA" && extraSlot.room) {
        const roomConflict = await exceptionValidationService.checkRoomConflict(
          extraSlot.room,
          conflictDate,
          extraSlot.startTime,
          extraSlot.endTime,
          req.college_id,
        );

        if (roomConflict) {
          throw new AppError(
            `Room "${extraSlot.room}" is already booked at this time`,
            409,
            "ROOM_CONFLICT",
          );
        }
      }
    }

    // 7️⃣ Validate exception references before save
    await validateExceptionReferences({
      type,
      substituteTeacher,
      extraSlot,
      rescheduledSlotId,
      collegeId: req.college_id,
      departmentId: timetable.department_id,
      timetableId,
      slotId: slot_id || null,
    });

    // 8️⃣ Check for duplicate exceptions
    const existingException = await TimetableException.findOne({
      college_id: req.college_id,
      timetable_id: timetableId,
      slot_id: slot_id || null,
      exceptionDate: parseLocalDateSafe(exceptionDate),
      type,
      status: { $in: ["PENDING", "APPROVED"] },
      isActive: true,
    });

    if (existingException) {
      throw new AppError(
        `A ${type} exception already exists for this date`,
        409,
        "DUPLICATE_EXCEPTION",
      );
    }

    // 9️⃣ Create exception
    let exception;
    try {
      exception = await TimetableException.create({
        college_id: req.college_id,
        timetable_id: timetableId,
        slot_id: slot_id || null,
        exceptionDate: parseLocalDateSafe(exceptionDate),
        type,
        status: "PENDING",
        reason,
        rescheduledTo: rescheduledTo ? parseLocalDateSafe(rescheduledTo) : null,
        rescheduledSlotId: rescheduledSlotId || null,
        extraSlot: extraSlot || null,
        newRoom: newRoom || null,
        substituteTeacher: substituteTeacher || null,
        createdBy: req.user.id,
        notifyAffected: notifyAffected !== false,
        notes: notes || null,
      });
    } catch (error) {
      if (isTimetableExceptionDuplicateError(error)) {
        throw duplicateExceptionError();
      }
      throw error;
    }

    // 🔟 Populate response
    const populatedException = await TimetableException.findById(exception._id)
      .populate({
        path: "slot_id",
        select: "day startTime endTime",
        populate: {
          path: "subject_id",
          select: "name code"
        }
      })
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name")
      .populate("substituteTeacher", "name")
      .populate("createdBy", "name email");

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetableId);

    // 🔔 NOTIFICATION: Notify HOD of the department
    (async () => {
      try {
        const Department = require("../models/department.model");
        const hodDepartment = await Department.findOne({
          _id: timetable.department_id,
          college_id: req.college_id,
        });
        if (hodDepartment && hodDepartment.hod_id) {
          const hodUser = await Teacher.findOne({
            _id: hodDepartment.hod_id,
          }).populate("user_id", "_id");
          if (hodUser && hodUser.user_id) {
            await Notification.create({
              college_id: req.college_id,
              createdBy: req.user.id,
              createdByRole: "TEACHER",
              target: "INDIVIDUAL",
              target_users: [hodUser.user_id._id],
              title: "New Timetable Exception Request",
              message: "A teacher has submitted a timetable exception request requiring your approval.",
              type: "ACADEMIC",
              actionUrl: "/hod/exception-approvals",
            });
          }
        }
      } catch (notifErr) {
        console.error("Failed to send HOD notification for exception:", notifErr.message);
      }
    })();

    // 📋 AUDIT LOG: Log exception creation
    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "TIMETABLE_EXCEPTION_CREATED",
          resourceType: "TimetableException",
          resourceId: exception._id,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 201,
          newValues: {
            timetableId: timetableId,
            type: type,
            status: "PENDING",
            exceptionDate: exceptionDate,
          },
        });
      } catch (auditErr) {
        console.error("Audit log failed for exception creation:", auditErr.message);
      }
    })();

    ApiResponse.created(
      res,
      { exception: populatedException },
      "Exception request submitted for HOD approval",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CREATE BULK EXCEPTIONS
   POST /api/timetable/:id/exceptions/bulk
========================================================= */
exports.createBulkExceptions = async (req, res, next) => {
  try {
    const { id: timetableId } = req.params;
    const { exceptions } = req.body;

    // 1️⃣ Validate timetable
    const timetable = await Timetable.findOne({
      _id: timetableId,
      college_id: req.college_id,
    });

    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    assertTimetableMutable(timetable, "exception");

    // 2️⃣ Verify TEACHER of this department
    if (req.user.role !== "TEACHER") {
      throw new AppError(
        "Only teachers can create exceptions",
        403,
        "UNAUTHORIZED_ROLE",
      );
    }

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    // 🔒 SECURITY: Teacher must belong to the timetable's department
    if (teacher.department_id.toString() !== timetable.department_id.toString()) {
      throw new AppError(
        "Access denied: You can only create exceptions for timetables in your department",
        403,
        "DEPARTMENT_MISMATCH",
      );
    }

    // 3️⃣ Validate input
    if (!Array.isArray(exceptions) || exceptions.length === 0) {
      throw new AppError(
        "exceptions must be a non-empty array",
        400,
        "INVALID_INPUT",
      );
    }

    if (exceptions.length > 100) {
      throw new AppError(
        "Maximum 100 exceptions per bulk request",
        400,
        "TOO_MANY_EXCEPTIONS",
      );
    }

    // 4️⃣ Process each exception
    const results = {
      success: [],
      failed: [],
    };

    for (const exc of exceptions) {
      try {
        const {
          slot_id,
          exceptionDate,
          type,
          reason,
          rescheduledTo,
          extraSlot,
          newRoom,
          substituteTeacher,
          notes,
        } = exc;

        // Skip if missing required fields
        if (!exceptionDate || !type || !reason) {
          results.failed.push({
            exception: exc,
            error: "Missing required fields",
          });
          continue;
        }

        const existing = await TimetableException.findOne({
          college_id: req.college_id,
          timetable_id: timetableId,
          slot_id: slot_id || null,
          exceptionDate: parseLocalDateSafe(exceptionDate),
          type,
          status: { $in: ["PENDING", "APPROVED"] },
          isActive: true,
        });

        if (existing) {
          results.failed.push({
            exception: exc,
            error: "Duplicate exception",
          });
          continue;
        }

        // 4️⃣ Validate exception references before save
        await validateExceptionReferences({
          type: exc.type,
          substituteTeacher: exc.substituteTeacher,
          extraSlot: exc.extraSlot,
          rescheduledSlotId: exc.rescheduledSlotId,
          collegeId: req.college_id,
          departmentId: timetable.department_id,
          timetableId,
          slotId: (exc.slot_id || null),
        });

        let exception;
        try {
          exception = await TimetableException.create({
            college_id: req.college_id,
            timetable_id: timetableId,
            slot_id: exc.slot_id || null,
            exceptionDate: parseLocalDateSafe(exc.exceptionDate),
            type: exc.type,
            status: "PENDING",
            reason: exc.reason,
            rescheduledTo: exc.rescheduledTo ? parseLocalDateSafe(exc.rescheduledTo) : null,
            extraSlot: exc.extraSlot || null,
            newRoom: exc.newRoom || null,
            substituteTeacher: exc.substituteTeacher || null,
            createdBy: req.user.id,
            notifyAffected: true,
            notes: exc.notes || null,
          });
        } catch (error) {
          if (isTimetableExceptionDuplicateError(error)) {
            results.failed.push({
              exception: exc,
              error: "DUPLICATE_EXCEPTION",
            });
            continue;
          }
          throw error;
        }

        // 🔔 NOTIFICATION: Notify HOD for each created exception (batch-friendly)
        (async () => {
          try {
            const Department = require("../models/department.model");
            for (const createdExc of [exception]) {
              const hodDept = await Department.findOne({
                _id: timetable.department_id,
                college_id: req.college_id,
              });
              if (hodDept && hodDept.hod_id) {
                const hodUser = await Teacher.findOne({
                  _id: hodDept.hod_id,
                }).populate("user_id", "_id");
                if (hodUser && hodUser.user_id) {
                  await Notification.create({
                    college_id: req.college_id,
                    createdBy: req.user.id,
                    createdByRole: "TEACHER",
                    target: "INDIVIDUAL",
                    target_users: [hodUser.user_id._id],
                    title: "New Timetable Exception Request",
                    message: "A teacher has submitted a timetable exception request requiring your approval.",
                    type: "ACADEMIC",
                    actionUrl: "/hod/exception-approvals",
                  });
                }
              }
            }
          } catch (notifErr) {
            console.error("Bulk exception HOD notification failed:", notifErr.message);
          }
        })();

        // 📋 AUDIT LOG: Log exception creation
        (async () => {
          try {
            await AuditLog.create({
              collegeId: req.college_id,
              userId: req.user.id,
              userEmail: req.user.email,
              userRole: req.user.role,
              action: "TIMETABLE_EXCEPTION_CREATED",
              resourceType: "TimetableException",
              resourceId: exception._id,
              ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
              userAgent: req.get("user-agent"),
              endpoint: req.originalUrl,
              method: req.method,
              statusCode: 201,
              newValues: {
                timetableId: timetableId,
                type: type,
                status: "PENDING",
                exceptionDate: exceptionDate,
              },
            });
          } catch (auditErr) {
            console.error("Audit log failed for bulk exception creation:", auditErr.message);
          }
        })();

        results.success.push(exception._id);
      } catch (err) {
        results.failed.push({
          exception: exc,
          error: err.message,
        });
      }
    }

    ApiResponse.created(
      res,
      {
        total: exceptions.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        successIds: results.success,
        failures: results.failed,
      },
      `Bulk exception creation: ${results.success.length} succeeded, ${results.failed.length} failed`,
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET EXCEPTIONS FOR TIMETABLE
   GET /api/timetable/:id/exceptions
========================================================= */
exports.getExceptions = async (req, res, next) => {
  try {
    const { id: timetableId } = req.params;
    const {
      startDate,
      endDate,
      type,
      status,
      slot_id,
      page = 1,
      limit = 50,
    } = req.query;

    // 1️⃣ Validate timetable
    const timetable = await Timetable.findOne({
      _id: timetableId,
      college_id: req.college_id,
    });

    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    // 2️⃣ Check access (teacher or student)
    const allowedRoles = ["TEACHER", "STUDENT"];
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError("Unauthorized access", 403, "UNAUTHORIZED");
    }

    // 3️⃣ Build query
    const query = {
      timetable_id: timetableId,
      college_id: req.college_id,
      isActive: true,
    };

    if (req.user.role === "TEACHER") {
      query.createdBy = req.user.id;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.exceptionDate = {};
      if (startDate) query.exceptionDate.$gte = new Date(startDate);
      if (endDate) query.exceptionDate.$lte = new Date(endDate);
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by slot
    if (slot_id) {
      query.slot_id = slot_id;
    }

    // 4️️ Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const exceptions = await TimetableException.find(query)
      .populate("timetable_id", "name semester academicYear")
      .populate({
        path: "slot_id",
        select: "day startTime endTime",
        populate: {
          path: "subject_id",
          select: "name code"
        }
      })
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name")
      .populate("substituteTeacher", "name")
      .populate("rescheduledSlotId", "day startTime endTime")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name")
      .populate("rejectedBy", "name email")
      .populate("withdrawnBy", "name email")
      .sort({ exceptionDate: 1, type: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TimetableException.countDocuments(query);

    ApiResponse.success(
      res,
      {
        exceptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Exceptions fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   UPDATE EXCEPTION
   PUT /api/timetable/exceptions/:exceptionId
========================================================= */
exports.updateException = async (req, res, next) => {
  try {
    const { exceptionId } = req.params;
    const updateData = req.body;

    if (
      !updateData ||
      Array.isArray(updateData) ||
      typeof updateData !== "object"
    ) {
      throw new AppError(
        "Request body must be a JSON object",
        400,
        "INVALID_INPUT",
      );
    }

    const requestedFields = Object.keys(updateData);
    if (requestedFields.length === 0) {
      throw new AppError("No update fields provided", 400, "INVALID_INPUT");
    }

    const blockedFields = requestedFields.filter((field) => {
      if (field.startsWith("$")) return true;
      return (
        PROTECTED_EXCEPTION_FIELDS.has(field) ||
        !EDITABLE_EXCEPTION_FIELDS.has(field)
      );
    });

    if (blockedFields.length > 0) {
      throw new AppError(
        `Cannot update protected or unsupported fields: ${blockedFields.join(", ")}`,
        400,
        "INVALID_UPDATE_FIELD",
      );
    }

    const sanitizedUpdate = {};

    if (Object.prototype.hasOwnProperty.call(updateData, "reason")) {
      sanitizedUpdate.reason = String(updateData.reason).trim();
      if (!sanitizedUpdate.reason) {
        throw new AppError("reason is required", 400, "MISSING_REASON");
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "rescheduledTo")) {
      sanitizedUpdate.rescheduledTo = updateData.rescheduledTo
        ? parseLocalDateSafe(updateData.rescheduledTo)
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "rescheduledSlotId")) {
      sanitizedUpdate.rescheduledSlotId = updateData.rescheduledSlotId || null;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "extraSlot")) {
      sanitizedUpdate.extraSlot = updateData.extraSlot || null;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "newRoom")) {
      sanitizedUpdate.newRoom = updateData.newRoom || null;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "substituteTeacher")) {
      sanitizedUpdate.substituteTeacher = updateData.substituteTeacher || null;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "notifyAffected")) {
      sanitizedUpdate.notifyAffected = updateData.notifyAffected === true;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "notes")) {
      sanitizedUpdate.notes = updateData.notes
        ? String(updateData.notes).trim()
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(updateData, "attachments")) {
      if (!Array.isArray(updateData.attachments)) {
        throw new AppError(
          "attachments must be an array",
          400,
          "INVALID_ATTACHMENTS",
        );
      }
      sanitizedUpdate.attachments = updateData.attachments.map((attachment) =>
        String(attachment),
      );
    }

    // 1️⃣ Find exception
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
    });

    if (!exception) {
      throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");
    }

    // 2️⃣ Verify HOD
    const timetable = await Timetable.findOne({
      _id: exception.timetable_id,
      college_id: req.college_id,
    });
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    assertTimetableMutable(timetable, "exception");

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);

    if (
      !isHOD ||
      teacher.department_id.toString() !== timetable.department_id.toString()
    ) {
      throw new AppError(
        "Access denied: Only HOD can update exceptions",
        403,
        "HOD_ONLY",
      );
    }

    if (NON_EDITABLE_EXCEPTION_STATUSES.has(exception.status)) {
      throw new AppError(
        "Exception has already been processed",
        409,
        "EXCEPTION_ALREADY_PROCESSED",
      );
    }

    if (exception.status !== "PENDING") {
      throw new AppError(
        "Exception has already been processed",
        409,
        "EXCEPTION_ALREADY_PROCESSED",
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(sanitizedUpdate, "rescheduledTo") &&
      (!sanitizedUpdate.rescheduledTo ||
        Number.isNaN(sanitizedUpdate.rescheduledTo.getTime()))
    ) {
      throw new AppError(
        "rescheduledTo must be a valid date",
        400,
        "INVALID_RESCHEDULE",
      );
    }

    if (
      exception.type === "RESCHEDULED" &&
      Object.prototype.hasOwnProperty.call(sanitizedUpdate, "rescheduledTo") &&
      !sanitizedUpdate.rescheduledTo
    ) {
      throw new AppError(
        "RESCHEDULED exception requires rescheduledTo date",
        400,
        "INVALID_RESCHEDULE",
      );
    }

    await validateExceptionReferences({
      type: exception.type,
      substituteTeacher: sanitizedUpdate.substituteTeacher,
      extraSlot: sanitizedUpdate.extraSlot,
      rescheduledSlotId: sanitizedUpdate.rescheduledSlotId,
      collegeId: req.college_id,
      departmentId: timetable.department_id,
      timetableId: exception.timetable_id,
      slotId: exception.slot_id,
    });

    if (
      exception.type === "ROOM_CHANGE" &&
      Object.prototype.hasOwnProperty.call(sanitizedUpdate, "newRoom") &&
      !sanitizedUpdate.newRoom
    ) {
      throw new AppError(
        "ROOM_CHANGE exception requires newRoom",
        400,
        "INVALID_ROOM_CHANGE",
      );
    }

    if (
      exception.type === "TEACHER_CHANGE" &&
      Object.prototype.hasOwnProperty.call(
        sanitizedUpdate,
        "substituteTeacher",
      ) &&
      !sanitizedUpdate.substituteTeacher
    ) {
      throw new AppError(
        "TEACHER_CHANGE exception requires substituteTeacher",
        400,
        "INVALID_TEACHER_CHANGE",
      );
    }

    const updatedException = await TimetableException.findOneAndUpdate(
      {
        _id: exceptionId,
        college_id: req.college_id,
        status: "PENDING",
        isActive: true,
      },
      { $set: sanitizedUpdate },
      { new: true, runValidators: true },
    )
      .populate({
        path: "slot_id",
        select: "day startTime endTime",
        populate: {
          path: "subject_id",
          select: "name code"
        }
      })
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name")
      .populate("substituteTeacher", "name")
      .populate("createdBy", "name email");

    if (!updatedException) {
      throw new AppError(
        "Exception has already been processed",
        409,
        "EXCEPTION_ALREADY_PROCESSED",
      );
    }

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

    const changedFields = Object.keys(sanitizedUpdate);
    const oldValues = {};
    changedFields.forEach((field) => {
      oldValues[field] = exception.get(field);
    });

    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "TIMETABLE_EXCEPTION_UPDATED",
          resourceType: "TimetableException",
          resourceId: updatedException._id,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          oldValues,
          newValues: sanitizedUpdate,
          metadata: {
            timetableId: timetable._id,
            exceptionId: exception._id,
            previousStatus: exception.status,
            newStatus: updatedException.status,
            changedFields,
          },
        });
      } catch (auditErr) {
        console.error("Audit log failed for exception update:", auditErr.message);
      }
    })();

    ApiResponse.success(
      res,
      { exception: updatedException },
      "Exception updated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   WITHDRAW EXCEPTION
   PUT /api/timetable/exceptions/:exceptionId/withdraw
========================================================= */
exports.withdrawException = async (req, res, next) => {
  try {
    const { exceptionId } = req.params;
    const { withdrawalReason } = req.body;

    if (req.user.role !== "TEACHER") {
      throw new AppError(
        "Only teachers can withdraw exception requests",
        403,
        "UNAUTHORIZED_ROLE",
      );
    }

    // 1️⃣ Find own exception for auth and existence checks
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
      isActive: true,
    });

    if (!exception) {
      throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");
    }

    if (exception.createdBy && exception.createdBy.toString() !== req.user.id.toString()) {
      throw new AppError(
        "Access denied: You can only withdraw your own requests",
        403,
        "NOT_CREATOR",
      );
    }

    // 2️⃣ Verify timetable lifecycle integrity
    const timetable = await Timetable.findOne({
      _id: exception.timetable_id,
      college_id: req.college_id,
    });

    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    assertTimetableMutable(timetable, "exception");

    // 3️ Perform atomic state transition WITHDRAWN
    const withdrawnException = await TimetableException.findOneAndUpdate(
      { _id: exceptionId, college_id: req.college_id, status: "PENDING" },
      {
        $set: {
          status: "WITHDRAWN",
          withdrawnBy: req.user.id,
          withdrawnAt: new Date(),
          withdrawalReason: withdrawalReason?.trim() || "No reason provided",
        },
      },
      { new: true },
    );

    if (!withdrawnException) {
      throw new AppError(
        "Exception has already been processed",
        409,
        "EXCEPTION_ALREADY_PROCESSED",
      );
    }

    // 4️ Populate response
    const populatedException = await TimetableException.findById(withdrawnException._id)
      .populate({
        path: "slot_id",
        select: "day startTime endTime",
        populate: {
          path: "subject_id",
          select: "name code"
        }
      })
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name")
      .populate("substituteTeacher", "name")
      .populate("createdBy", "name email")
      .populate("withdrawnBy", "name email");

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

    // 🔔 NOTIFICATION: Notify HOD of the department
    (async () => {
      try {
        const Department = require("../models/department.model");
        const hodDepartment = await Department.findOne({
          _id: timetable.department_id,
          college_id: req.college_id,
        });
        if (hodDepartment && hodDepartment.hod_id) {
          const hodUser = await Teacher.findOne({
            _id: hodDepartment.hod_id,
          }).populate("user_id", "name _id");
          if (hodUser && hodUser.user_id) {
            const teacherName = (req.user.name || "A teacher").trim();
            const exceptionDateStr = withdrawnException.exceptionDate
              ? withdrawnException.exceptionDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "unknown date";
            const exceptionType = withdrawnException.type || "TIMETABLE";
            const withdrawalReason =
              (withdrawnException.withdrawalReason || "No reason provided").trim();

            await Notification.create({
              college_id: req.college_id,
              createdBy: req.user.id,
              createdByRole: "TEACHER",
              target: "INDIVIDUAL",
              target_users: [hodUser.user_id._id],
              title: "Timetable Exception Request Withdrawn",
              message: `${teacherName} withdrew a ${exceptionType} request for ${exceptionDateStr}. Reason: ${withdrawalReason}`,
              type: "ACADEMIC",
              actionUrl: "/hod/exception-approvals",
            });
          }
        }
      } catch (notifErr) {
        console.error("Failed to send withdrawal notification:", notifErr.message);
      }
    })();

    // 📋 AUDIT LOG: Log exception withdrawal
    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "TIMETABLE_EXCEPTION_WITHDRAWN",
          resourceType: "TimetableException",
          resourceId: withdrawnException._id,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          oldValues: { status: "PENDING" },
          newValues: {
            status: "WITHDRAWN",
            withdrawalReason: withdrawnException.withdrawalReason,
          },
          metadata: {
            timetableId: timetable._id,
            exceptionDate: withdrawnException.exceptionDate,
            type: withdrawnException.type,
          },
        });
      } catch (auditErr) {
        console.error("Audit log failed for exception withdrawal:", auditErr.message);
      }
    })();

    ApiResponse.success(
      res,
      { exception: populatedException },
      "Exception request withdrawn successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE EXCEPTION
   DELETE /api/timetable/exceptions/:exceptionId
========================================================= */
exports.deleteException = async (req, res, next) => {
  try {
    const { exceptionId } = req.params;

    // 1️⃣ Find exception
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
    });

    if (!exception) {
      throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");
    }

    // 2️⃣ Verify HOD
    const timetable = await Timetable.findOne({
      _id: exception.timetable_id,
      college_id: req.college_id,
    });
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    assertTimetableMutable(timetable, "exception");

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);

    if (
      !isHOD ||
      teacher.department_id.toString() !== timetable.department_id.toString()
    ) {
      throw new AppError(
        "Access denied: Only HOD can delete exceptions",
        403,
        "HOD_ONLY",
      );
    }

    // 3️⃣ Soft delete (set isActive = false)
    const exceptionSnapshot = exception.toObject();
    exception.isActive = false;
    await exception.save();

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "TIMETABLE_EXCEPTION_DELETED",
          resourceType: "TimetableException",
          resourceId: exception._id,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          oldValues: {
            exceptionId: exception._id,
            timetableId: exception.timetable_id,
            slotId: exception.slot_id,
            exceptionDate: exception.exceptionDate,
            type: exception.type,
            status: exception.status,
            reason: exception.reason,
            createdBy: exception.createdBy,
            createdAt: exception.createdAt,
            rescheduledTo: exception.rescheduledTo,
            rescheduledSlotId: exception.rescheduledSlotId,
            extraSlot: exception.extraSlot,
            newRoom: exception.newRoom,
            substituteTeacher: exception.substituteTeacher,
            notifyAffected: exception.notifyAffected,
            notes: exception.notes,
            attachments: exception.attachments,
          },
          metadata: {
            timetableId: timetable._id,
            exceptionId: exception._id,
            deletedBy: req.user.id,
            deletedAt: new Date(),
            previousStatus: exception.status,
          },
        });
      } catch (auditErr) {
        console.error("Audit log failed for exception deletion:", auditErr.message);
      }
    })();

    ApiResponse.success(res, null, "Exception deleted successfully");
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   APPROVE EXCEPTION
   PUT /api/timetable/exceptions/:exceptionId/approve
   ========================================================= */
exports.approveException = async (req, res, next) => {
  try {
    const { exceptionId } = req.params;

    // 1️⃣ Fetch exception without status filter (for timetable/self checks)
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
      isActive: true,
    });

    if (!exception) {
      throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");
    }

    // 2️⃣ Verify HOD and timetable
    const timetable = await Timetable.findOne({
      _id: exception.timetable_id,
      college_id: req.college_id,
    });
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    assertTimetableMutable(timetable, "exception");

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);

    if (!isHOD || teacher.department_id.toString() !== timetable.department_id.toString()) {
      throw new AppError(
        "Access denied: Only HOD can approve exceptions",
        403,
        "HOD_ONLY",
      );
    }

    // 🔒 SECURITY: Prevent HOD from approving own request
    if (exception.createdBy && exception.createdBy.toString() === req.user.id.toString()) {
      throw new AppError(
        "Cannot approve your own exception request. Please ask another HOD to approve.",
        403,
        "SELF_APPROVAL_NOT_ALLOWED",
      );
    }

    // 4️ Revalidate all business references before transition
    await validateExceptionForApproval(exceptionId, req.college_id);

    const existingDuplicateException = await TimetableException.findOne({
      _id: { $ne: exceptionId },
      college_id: req.college_id,
      timetable_id: exception.timetable_id,
      slot_id: exception.slot_id || null,
      exceptionDate: exception.exceptionDate,
      type: exception.type,
      status: { $in: ["PENDING", "APPROVED"] },
      isActive: true,
    });

    if (existingDuplicateException) {
      throw duplicateExceptionError();
    }

    // 5️⃣ Perform atomic state transition APPROVED
    let approvedException;
    try {
      approvedException = await TimetableException.findOneAndUpdate(
        { _id: exceptionId, college_id: req.college_id, status: "PENDING" },
        {
          $set: {
            status: "APPROVED",
            approvedBy: req.user.id,
            approvedAt: new Date(),
          },
        },
        { new: true },
      );
    } catch (error) {
      if (isTimetableExceptionDuplicateError(error)) {
        throw duplicateExceptionError();
      }
      throw error;
    }

    if (!approvedException) {
      throw new AppError(
        "Exception has already been processed",
        409,
        "EXCEPTION_ALREADY_PROCESSED",
      );
    }

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

    // 🔔 NOTIFICATION: Notify request creator
    (async () => {
      try {
        if (approvedException.createdBy) {
          await Notification.create({
            college_id: req.college_id,
            createdBy: req.user.id,
            createdByRole: "HOD",
            target: "INDIVIDUAL",
            target_users: [approvedException.createdBy],
            title: "Timetable Exception Approved",
            message: "Your timetable exception request has been approved.",
            type: "ACADEMIC",
            actionUrl: "/timetable/exceptions",
          });
        }
      } catch (notifErr) {
        console.error("Failed to send approval notification:", notifErr.message);
      }
    })();

    // 🔔 NOTIFICATION: Notify affected users (teachers + students) if notifyAffected is set
    (async () => {
      try {
        if (!approvedException.notifyAffected || approvedException.notificationsSent) return;

        const fullTimetable = await Timetable.findById(approvedException.timetable_id)
          .select("course_id department_id semester division")
          .lean();

        if (!fullTimetable) return;

        const slotTeacherIds = await TimetableSlot.find({
          timetable_id: fullTimetable._id,
        }).distinct("teacher_id");

        const teacherUserIds = await Teacher.find({
          _id: { $in: slotTeacherIds },
        }).distinct("user_id");

        const studentQuery = {
          course_id: fullTimetable.course_id,
          currentSemester: fullTimetable.semester,
          status: "APPROVED",
          college_id: req.college_id,
        };
        if (fullTimetable.division) {
          studentQuery.division = fullTimetable.division;
        }

        const studentUserIds = await Student.find(studentQuery).distinct("user_id");

        const allUserIds = [
          ...new Set([...teacherUserIds, ...studentUserIds]),
        ];

        if (allUserIds.length === 0) return;

        await Notification.insertMany(
          allUserIds.map((uid) => ({
            college_id: req.college_id,
            createdBy: req.user.id,
            createdByRole: "HOD",
            target: "INDIVIDUAL",
            target_users: [uid],
            title: `Schedule Change: ${approvedException.type}`,
            message: `A timetable exception (${approvedException.type}) on ${new Date(approvedException.exceptionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} affects your schedule. Reason: ${approvedException.reason}`,
            type: "ACADEMIC",
            actionUrl: "/timetable",
            isActive: true,
            isRead: false,
          })),
        );

        approvedException.notificationsSent = true;
        await approvedException.save();
      } catch (notifErr) {
        console.error("Failed to send affected-user notifications:", notifErr.message);
      }
    })();

    // 📋 AUDIT LOG: Log exception approval
    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "TIMETABLE_EXCEPTION_APPROVED",
          resourceType: "TimetableException",
          resourceId: approvedException._id,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          oldValues: { status: "PENDING" },
          newValues: { status: "APPROVED" },
        });
      } catch (auditErr) {
        console.error("Audit log failed for exception approval:", auditErr.message);
      }
    })();

    ApiResponse.success(res, { exception: approvedException }, "Exception approved successfully");
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   REJECT EXCEPTION
   PUT /api/timetable/exceptions/:exceptionId/reject
   ========================================================= */
exports.rejectException = async (req, res, next) => {
  try {
    const { exceptionId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      throw new AppError("rejectionReason is required", 400, "MISSING_REASON");
    }

    // 1️⃣ Find exception (to get timetable_id)
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
      isActive: true,
    });

    if (!exception) {
      throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");
    }

    // 2️⃣ Verify HOD and timetable
    const timetable = await Timetable.findOne({
      _id: exception.timetable_id,
      college_id: req.college_id,
    });
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    assertTimetableMutable(timetable, "exception");

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);

    if (!isHOD || teacher.department_id.toString() !== timetable.department_id.toString()) {
      throw new AppError(
        "Access denied: Only HOD can reject exceptions",
        403,
        "HOD_ONLY",
      );
    }

    // 🔒 SECURITY: Prevent HOD from rejecting own request
    if (exception.createdBy && exception.createdBy.toString() === req.user.id.toString()) {
      throw new AppError(
        "Cannot reject your own exception request. Please ask another HOD to process.",
        403,
        "SELF_REJECTION_NOT_ALLOWED",
      );
    }

    // 3️⃣ Perform atomic state transition REJECTED
    const rejectedException = await TimetableException.findOneAndUpdate(
      { _id: exceptionId, college_id: req.college_id, status: "PENDING" },
      {
        $set: {
          status: "REJECTED",
          rejectedBy: req.user.id,
          rejectedAt: new Date(),
          rejectionReason,
        },
      },
      { new: true },
    );

    if (!rejectedException) {
      throw new AppError(
        "Exception has already been processed",
        409,
        "EXCEPTION_ALREADY_PROCESSED",
      );
    }

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

    // 🔔 NOTIFICATION: Notify request creator
    (async () => {
      try {
        if (rejectedException.createdBy) {
          await Notification.create({
            college_id: req.college_id,
            createdBy: req.user.id,
            createdByRole: "HOD",
            target: "INDIVIDUAL",
            target_users: [rejectedException.createdBy],
            title: "Timetable Exception Rejected",
            message: `Your timetable exception request has been rejected. Reason: ${rejectionReason}`,
            type: "ACADEMIC",
            actionUrl: "/timetable/exceptions",
          });
        }
      } catch (notifErr) {
        console.error("Failed to send rejection notification:", notifErr.message);
      }
    })();

    // 📋 AUDIT LOG: Log exception rejection
    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "TIMETABLE_EXCEPTION_REJECTED",
          resourceType: "TimetableException",
          resourceId: rejectedException._id,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          oldValues: { status: "PENDING" },
          newValues: { status: "REJECTED", rejectionReason: rejectionReason },
        });
      } catch (auditErr) {
        console.error("Audit log failed for exception rejection:", auditErr.message);
      }
    })();

    ApiResponse.success(res, { exception: rejectedException }, "Exception rejected successfully");
  } catch (error) {
    next(error);
  }
};

/* =========================================================
    GET PENDING APPROVALS
    GET /api/timetable/exceptions/pending
  ========================================================= */
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);
    if (!isHOD) {
      throw new AppError(
        "Access denied: Only HOD can view pending approvals",
        403,
        "HOD_ONLY",
      );
    }

    // Get timetables for HOD's department
    const departmentTimetables = await Timetable.find({
      college_id: req.college_id,
      department_id: teacher.department_id,
    }).select("_id");

    const timetableIds = departmentTimetables.map(t => t._id);

    const {
      page = 1,
      limit = 20,
      status,
      type,
      search,
    } = req.query;

    // Build query
    const query = {
      college_id: req.college_id,
      timetable_id: { $in: timetableIds },
      status: "PENDING",
      isActive: true,
    };

    // Filter by status (for flexibility if needed)
    if (status) {
      query.status = status;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Search by teacher name or subject name
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { "createdBy.name": searchRegex },
        { "createdBy.email": searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pendingExceptions = await TimetableException.find(query)
      .populate("timetable_id", "name semester academicYear")
      .populate({
        path: "slot_id",
        select: "day startTime endTime",
        populate: {
          path: "subject_id",
          select: "name code"
        }
      })
      .populate("createdBy", "name email")
      .populate("substituteTeacher", "name")
      .populate("rescheduledSlotId", "day startTime endTime")
      .sort({ exceptionDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TimetableException.countDocuments(query);

    ApiResponse.success(
      res,
      {
        exceptions: pendingExceptions,
        pendingExceptions,
        count: pendingExceptions.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Pending approvals fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
    GET MY EXCEPTIONS (Teacher's own requests)
    GET /api/timetable/exceptions/my
========================================================= */
exports.getMyExceptions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    // Build query - teacher can only see their own requests
    const query = {
      college_id: req.college_id,
      createdBy: req.user.id,
      isActive: true,
    };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const exceptions = await TimetableException.find(query)
      .populate("timetable_id", "name semester academicYear")
      .populate({
        path: "slot_id",
        select: "day startTime endTime",
        populate: {
          path: "subject_id",
          select: "name code"
        }
      })
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("withdrawnBy", "name email")
      .populate("substituteTeacher", "name")
      .populate("rescheduledSlotId", "day startTime endTime")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TimetableException.countDocuments(query);

    ApiResponse.success(
      res,
      {
        exceptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "My exceptions fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

/* =========================================================
     GET APPROVAL HISTORY (HOD's department - APPROVED/REJECTED)
     GET /api/timetable/exceptions/history
  ========================================================= */
exports.getApprovalHistory = async (req, res, next) => {
  try {
    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher, req.college_id);
    if (!isHOD) {
      throw new AppError(
        "Access denied: Only HOD can view approval history",
        403,
        "HOD_ONLY",
      );
    }

    // Get timetables for HOD's department
    const departmentTimetables = await Timetable.find({
      college_id: req.college_id,
      department_id: teacher.department_id,
    }).select("_id");

    const timetableIds = departmentTimetables.map(t => t._id);

    const {
      page = 1,
      limit = 20,
      status,
      type,
      search,
    } = req.query;

    // Build base query
    const baseQuery = {
      college_id: req.college_id,
      timetable_id: { $in: timetableIds },
      status: { $in: ["APPROVED", "REJECTED", "WITHDRAWN"] },
      isActive: true,
    };

    // Filter by specific status
    if (status) {
      baseQuery.status = status;
    }

    // Filter by type
    if (type) {
      baseQuery.type = type;
    }

    // Search by teacher name or subject name
    if (search) {
      const searchRegex = new RegExp(search, "i");
      baseQuery.$or = [
        { "createdBy.name": searchRegex },
        { "createdBy.email": searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const historyExceptions = await TimetableException.find(baseQuery)
      .populate("timetable_id", "name semester academicYear")
      .populate({
        path: "slot_id",
        select: "day startTime endTime",
        populate: {
          path: "subject_id",
          select: "name code"
        }
      })
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("withdrawnBy", "name email")
      .populate("substituteTeacher", "name")
      .populate("rescheduledSlotId", "day startTime endTime")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TimetableException.countDocuments(baseQuery);

    const approved = historyExceptions.filter((exception) => exception.status === "APPROVED");
    const rejected = historyExceptions.filter((exception) => exception.status === "REJECTED");
    const withdrawn = historyExceptions.filter((exception) => exception.status === "WITHDRAWN");

    ApiResponse.success(
      res,
      {
        exceptions: historyExceptions,
        approved,
        rejected,
        withdrawn,
        count: historyExceptions.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Approval history fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};
