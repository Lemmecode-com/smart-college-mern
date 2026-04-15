const Timetable = require("../models/timetable.model");
const TimetableSlot = require("../models/timetableSlot.model");
const TimetableException = require("../models/timetableException.model");
const Teacher = require("../models/teacher.model");
const Subject = require("../models/subject.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const teacherService = require("../services/teacher.service");
const exceptionValidationService = require("../services/exceptionValidation.service");
const { cache: scheduleCache } = require("../services/scheduleCache.service");
const { parseLocalDateSafe } = require("../utils/date.utils");

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

    // 2️⃣ Verify user is HOD of this department
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

    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (
      !isHOD ||
      teacher.department_id.toString() !== timetable.department_id.toString()
    ) {
      throw new AppError(
        "Access denied: Only HOD of this department can create exceptions",
        403,
        "HOD_ONLY",
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
        const subject = await Subject.findById(extraSlot.subject_id);
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
      exceptionDate: new Date(exceptionDate),
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
      status: "APPROVED", // HOD creates, so auto-approve
      reason,
      rescheduledTo: rescheduledTo ? parseLocalDateSafe(rescheduledTo) : null,
      rescheduledSlotId: rescheduledSlotId || null,
      extraSlot: extraSlot || null,
      newRoom: newRoom || null,
      substituteTeacher: substituteTeacher || null,
      createdBy: req.user.id,
      approvedBy: req.user.id, // HOD approved
      approvedAt: new Date(),
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

    ApiResponse.created(
      res,
      { exception: populatedException },
      "Exception created successfully",
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

    // 2️⃣ Verify HOD
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

    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (
      !isHOD ||
      teacher.department_id.toString() !== timetable.department_id.toString()
    ) {
      throw new AppError(
        "Access denied: Only HOD of this department can create exceptions",
        403,
        "HOD_ONLY",
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

        // Check for duplicates
        const existing = await TimetableException.findOne({
          timetable_id: timetableId,
          slot_id: slot_id || null,
          exceptionDate: new Date(exceptionDate),
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

        // Create exception
        const exception = await TimetableException.create({
          college_id: req.college_id,
          timetable_id: timetableId,
          slot_id: slot_id || null,
          exceptionDate: new Date(exceptionDate),
          type,
          status: "APPROVED",
          reason,
          rescheduledTo: rescheduledTo ? new Date(rescheduledTo) : null,
          extraSlot: extraSlot || null,
          newRoom: newRoom || null,
          substituteTeacher: substituteTeacher || null,
          createdBy: req.user.id,
          approvedBy: req.user.id,
          approvedAt: new Date(),
          notifyAffected: true,
          notes: notes || null,
        });

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
    const timetable = await Timetable.findById(exception.timetable_id);
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher);

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
    const updatedException = await TimetableException.findByIdAndUpdate(
      exceptionId,
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
    const timetable = await Timetable.findById(exception.timetable_id);
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher);

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

    // 2️⃣ Verify HOD
    const timetable = await Timetable.findById(exception.timetable_id);
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (!isHOD) {
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

    // 2️⃣ Verify HOD
    const timetable = await Timetable.findById(exception.timetable_id);
    if (!timetable) {
      throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
    }

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (!isHOD) {
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
    // Only HODs can see pending approvals
    if (req.user.role !== "TEACHER") {
      throw new AppError(
        "Only teachers can view pending approvals",
        403,
        "UNAUTHORIZED",
      );
    }

    const teacher = await teacherService.getTeacherWithValidation(
      req.user.id,
      req.college_id,
      true,
    );

    const { isHOD } = await teacherService.getHODStatus(teacher);

    if (!isHOD) {
      throw new AppError(
        "Access denied: Only HOD can view pending approvals",
        403,
        "HOD_ONLY",
      );
    }

    // Get pending exceptions for HOD's department
    const pendingExceptions = await TimetableException.find({
      college_id: req.college_id,
      status: "PENDING",
      isActive: true,
    })
      .populate("timetable_id", "name semester academicYear")
      .populate("slot_id", "day startTime endTime")
      .populate("createdBy", "name email")
      .sort({ exceptionDate: 1, createdAt: -1 });

    // Filter to only show exceptions for HOD's department
    const departmentTimetables = pendingExceptions.filter(
      (exc) =>
        exc.timetable_id?.department_id?.toString() ===
        teacher.department_id.toString(),
    );

    ApiResponse.success(
      res,
      {
        pendingExceptions: departmentTimetables,
        count: departmentTimetables.length,
      },
      "Pending approvals fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};
