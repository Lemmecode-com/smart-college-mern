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
const { cache: scheduleCache } = require("../services/scheduleCache.service");
const { parseLocalDateSafe } = require("../utils/date.utils");
const { assertTimetableMutable } = require("../utils/timetableLifecycle.util");

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

    // 7️⃣ Validate slot belongs to this timetable (if provided)
    if (slot_id) {
      const slot = await TimetableSlot.findOne({
        _id: slot_id,
        timetable_id: timetableId,
        college_id: req.college_id,
      });

      if (!slot) {
        throw new AppError(
          "Slot not found in this timetable",
          404,
          "SLOT_NOT_FOUND",
        );
      }

      // Validate teacher-subject match for EXTRA/TEACHER_CHANGE
      if (
        (type === "EXTRA" || type === "TEACHER_CHANGE") &&
        extraSlot?.subject_id &&
        extraSlot?.teacher_id
      ) {
        const subject = await Subject.findOne({ _id: extraSlot.subject_id, college_id: req.college_id });
        if (
          subject &&
          subject.teacher_id.toString() !== extraSlot.teacher_id.toString()
        ) {
          throw new AppError(
            "Teacher must match the subject's assigned teacher",
            403,
            "TEACHER_SUBJECT_MISMATCH",
          );
        }
      }
    }

    // 8️⃣ Check for duplicate exceptions
    const existingException = await TimetableException.findOne({
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
    const exception = await TimetableException.create({
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

    // 🔟 Populate response
    const populatedException = await TimetableException.findById(exception._id)
      .populate("slot_id", "day startTime endTime")
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

        const exception = await TimetableException.create({
          college_id: req.college_id,
          timetable_id: timetableId,
          slot_id: slot_id || null,
          exceptionDate: parseLocalDateSafe(exceptionDate),
          type,
          status: "PENDING",
          reason,
          rescheduledTo: rescheduledTo ? parseLocalDateSafe(rescheduledTo) : null,
          extraSlot: extraSlot || null,
          newRoom: newRoom || null,
          substituteTeacher: substituteTeacher || null,
          createdBy: req.user.id,
          notifyAffected: true,
          notes: notes || null,
        });

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
      .populate("slot_id", "day startTime endTime")
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name")
      .populate("substituteTeacher", "name")
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

    // 3️⃣ Prevent updating completed exceptions
    if (exception.status === "COMPLETED") {
      throw new AppError(
        "Cannot update completed exceptions",
        400,
        "ALREADY_COMPLETED",
      );
    }

    // 4️⃣ Validate conflict if date/time changed
    if (updateData.exceptionDate || updateData.extraSlot) {
      const newDate = new Date(
        updateData.exceptionDate || exception.exceptionDate,
      );
      const newExtraSlot = updateData.extraSlot || exception.extraSlot;

      if (
        newExtraSlot &&
        newExtraSlot.teacher_id &&
        newExtraSlot.startTime &&
        newExtraSlot.endTime
      ) {
        const hasConflict =
          await exceptionValidationService.checkTeacherConflict(
            newExtraSlot.teacher_id,
            newDate,
            newExtraSlot.startTime,
            newExtraSlot.endTime,
            req.college_id,
          );

        if (hasConflict) {
          throw new AppError(
            "Teacher conflict at the new time",
            409,
            "TEACHER_CONFLICT",
          );
        }
      }
    }

    // 5️⃣ Update exception
    const updatedException = await TimetableException.findOneAndUpdate(
      { _id: exceptionId, college_id: req.college_id },
      { $set: updateData },
      { new: true, runValidators: true },
    )
      .populate("slot_id", "day startTime endTime")
      .populate("extraSlot.subject_id", "name code")
      .populate("extraSlot.teacher_id", "name");

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

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

    // 1️⃣ Find own exception (any status)
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
      createdBy: req.user.id,
      isActive: true,
    });

    if (!exception) {
      const existingException = await TimetableException.findOne({
        _id: exceptionId,
        college_id: req.college_id,
        isActive: true,
      });

      if (!existingException) {
        throw new AppError("Exception not found", 404, "EXCEPTION_NOT_FOUND");
      }

      throw new AppError(
        "Access denied: You can only withdraw your own requests",
        403,
        "NOT_CREATOR",
      );
    }

    // 1.1️ Re-fetch latest state — race condition guard
    const latestException = await TimetableException.findById(exceptionId);
    if (!latestException || latestException.status !== "PENDING") {
      throw new AppError(
        "Exception has already been processed",
        409,
        "EXCEPTION_ALREADY_PROCESSED",
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

    // 3️ Withdraw exception using the freshly-fetched, guard-validated document
    await latestException.withdraw(
      req.user.id,
      withdrawalReason?.trim() || "No reason provided",
    );

    // 4️ Populate response
    const populatedException = await TimetableException.findById(latestException._id)
      .populate("slot_id", "day startTime endTime")
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
            const exceptionDateStr = latestException.exceptionDate
              ? latestException.exceptionDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "unknown date";
            const exceptionType = latestException.type || "TIMETABLE";
            const withdrawalReason =
              (latestException.withdrawalReason || "No reason provided").trim();

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
          resourceId: exception._id,
          ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: 200,
          oldValues: { status: "PENDING" },
          newValues: {
            status: "WITHDRAWN",
            withdrawalReason: exception.withdrawalReason,
          },
          metadata: {
            timetableId: timetable._id,
            exceptionDate: exception.exceptionDate,
            type: exception.type,
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
    exception.isActive = false;
    await exception.save();

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

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

    // 1️⃣ Find exception
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
      status: "PENDING",
    });

    if (!exception) {
      throw new AppError(
        "Exception not found or already approved/rejected",
        404,
        "EXCEPTION_NOT_PENDING",
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
        "Access denied: Only HOD can approve exceptions",
        403,
        "HOD_ONLY",
      );
    }

    // 3️⃣ Approve
    exception.status = "APPROVED";
    exception.approvedBy = req.user.id;
    exception.approvedAt = new Date();
    await exception.save();

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

    // 🔔 NOTIFICATION: Notify request creator
    (async () => {
      try {
        if (exception.createdBy) {
          await Notification.create({
            college_id: req.college_id,
            createdBy: req.user.id,
            createdByRole: "HOD",
            target: "INDIVIDUAL",
            target_users: [exception.createdBy],
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
        if (!exception.notifyAffected || exception.notificationsSent) return;

        const fullTimetable = await Timetable.findById(exception.timetable_id)
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
            title: `Schedule Change: ${exception.type}`,
            message: `A timetable exception (${exception.type}) on ${new Date(exception.exceptionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} affects your schedule. Reason: ${exception.reason}`,
            type: "ACADEMIC",
            actionUrl: "/timetable",
            isActive: true,
            isRead: false,
          })),
        );

        exception.notificationsSent = true;
        await exception.save();
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
          resourceId: exception._id,
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

    ApiResponse.success(res, { exception }, "Exception approved successfully");
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

    // 1️⃣ Find exception
    const exception = await TimetableException.findOne({
      _id: exceptionId,
      college_id: req.college_id,
      status: "PENDING",
    });

    if (!exception) {
      throw new AppError(
        "Exception not found or already approved/rejected",
        404,
        "EXCEPTION_NOT_PENDING",
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
        "Access denied: Only HOD can reject exceptions",
        403,
        "HOD_ONLY",
      );
    }

    // 3️⃣ Reject
    exception.status = "REJECTED";
    exception.rejectedBy = req.user.id;
    exception.rejectedAt = new Date();
    exception.rejectionReason = rejectionReason;
    await exception.save();

    // 🗑️ Invalidate cache for this timetable
    scheduleCache.invalidateTimetable(timetable._id);

    // 🔔 NOTIFICATION: Notify request creator
    (async () => {
      try {
        if (exception.createdBy) {
          await Notification.create({
            college_id: req.college_id,
            createdBy: req.user.id,
            createdByRole: "HOD",
            target: "INDIVIDUAL",
            target_users: [exception.createdBy],
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
          resourceId: exception._id,
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

    ApiResponse.success(res, { exception }, "Exception rejected successfully");
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

    // Query pending exceptions for HOD's department directly in MongoDB
    const pendingExceptions = await TimetableException.find({
      college_id: req.college_id,
      timetable_id: { $in: timetableIds },
      status: "PENDING",
      isActive: true,
    })
      .populate("timetable_id", "name semester academicYear")
      .populate("slot_id", "day startTime endTime")
      .populate("createdBy", "name email")
      .sort({ exceptionDate: 1, createdAt: -1 });

    ApiResponse.success(
      res,
      {
        exceptions: pendingExceptions,
        pendingExceptions,
        count: pendingExceptions.length,
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
      .populate("slot_id", "day startTime endTime")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("withdrawnBy", "name email")
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

    // Query APPROVED, REJECTED, and WITHDRAWN exceptions for HOD's department
    const historyExceptions = await TimetableException.find({
      college_id: req.college_id,
      timetable_id: { $in: timetableIds },
      status: { $in: ["APPROVED", "REJECTED", "WITHDRAWN"] },
      isActive: true,
    })
      .populate("timetable_id", "name semester academicYear")
      .populate("slot_id", "day startTime endTime")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("withdrawnBy", "name email")
      .sort({ createdAt: -1 });

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
      },
      "Approval history fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};
