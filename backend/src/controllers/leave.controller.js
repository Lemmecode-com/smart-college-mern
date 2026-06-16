const mongoose = require("mongoose");
const Leave = require("../models/leave.model");
const Teacher = require("../models/teacher.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const Notification = require("../models/notification.model");
const AuditLog = require("../models/auditLog.model");

const QUOTA_TABLE = {
  SICK: 12,
  CASUAL: 10,
  EMERGENCY: 5,
  OFFICIAL: 15,
};

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function getAcademicYearBounds(academicYear) {
  const [startStr] = academicYear.split("-");
  const startYear = parseInt(startStr, 10);
  return {
    start: new Date(startYear, 5, 1),
    end: new Date(startYear + 1, 5, 31),
  };
}

function calcDaysCount(startDate, endDate, durationType) {
  if (
    durationType === "HALF_DAY_MORNING" ||
    durationType === "HALF_DAY_AFTERNOON"
  ) {
    return 0.5;
  }
  const diffMs = endDate - startDate;
  const wholeDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return wholeDays;
}

function normalizeDuration(daysCount, durationType) {
  let normalizedDays = daysCount;
  let normalizedType = durationType;

  if (durationType === "FULL_DAY") {
    normalizedDays = daysCount >= 1 ? daysCount : 1;
    normalizedType = "FULL_DAY";
  } else if (
    durationType === "HALF_DAY_MORNING" ||
    durationType === "HALF_DAY_AFTERNOON"
  ) {
    normalizedDays = 0.5;
    normalizedType = durationType;
  }

  return { normalizedDays, normalizedType };
}

exports.applyLeave = async (req, res, next) => {
  try {
    const teacher = req.teacher;
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      durationType = "FULL_DAY",
      daysCount,
      attachments = [],
      academicYear,
    } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      throw new AppError(
        "leaveType, startDate, endDate, and reason are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new AppError(
        "startDate must be on or before endDate",
        400,
        "INVALID_DATE_RANGE",
      );
    }

    if (
      durationType === "HALF_DAY_MORNING" ||
      durationType === "HALF_DAY_AFTERNOON"
    ) {
      if (start.getTime() !== end.getTime()) {
        throw new AppError(
          "Half-day leave requires startDate and endDate to be the same day",
          400,
          "HALF_DAY_SAME_DATE_REQUIRED",
        );
      }
    }

    const calculatedDays = calcDaysCount(start, end, durationType);
    const { normalizedDays, normalizedType } = normalizeDuration(
      daysCount || calculatedDays,
      durationType,
    );

    const resolvedAcademicYear =
      academicYear || getCurrentAcademicYear();

    // Overlap check
    const existing = await Leave.findOne({
      college_id: req.college_id,
      teacher_id: teacher._id,
      status: { $in: ["PENDING", "APPROVED"] },
      isActive: true,
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });

    if (existing) {
      throw new AppError(
        `You already have an ${existing.status} leave (${existing.leaveType}) from ${existing.startDate.toISOString().split("T")[0]} to ${existing.endDate.toISOString().split("T")[0]} that overlaps with this request`,
        409,
        "LEAVE_OVERLAP",
      );
    }

    const leave = await Leave.create({
      college_id: req.college_id,
      createdBy: req.user.id,
      teacher_id: teacher._id,
      department_id: teacher.department_id,
      leaveType,
      academicYear: resolvedAcademicYear,
      startDate: start,
      endDate: end,
      durationType: normalizedType,
      daysCount: normalizedDays,
      reason: reason.trim(),
      attachments,
      status: "PENDING",
      isActive: true,
    });

    (async () => {
      try {
        await Notification.create({
          college_id: req.college_id,
          createdBy: req.user.id,
          createdByRole: req.user.role,
          target: "DEPARTMENT",
          target_users: [],
          title: "New Leave Application",
          message: `${teacher.name} has applied for ${leaveType} leave from ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`,
          type: "ACADEMIC",
          actionUrl: "/hod/leave-approvals",
        });
      } catch (notifErr) {
        console.error("Failed to create leave notification:", notifErr.message);
      }
    })();

    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "LEAVE_APPLIED",
          resourceType: "Leave",
          resourceId: leave._id,
          details: {
            leaveType,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            daysCount: normalizedDays,
            durationType: normalizedType,
            academicYear: resolvedAcademicYear,
          },
        });
      } catch (auditErr) {
        console.error("Failed to create leave audit log:", auditErr.message);
      }
    })();

    const populated = await Leave.findById(leave._id).populate(
      "createdBy approvedBy rejectedBy cancelledBy",
      "name email",
    );

    return ApiResponse.created(
      res,
      { leave: populated },
      "Leave application submitted successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.getMyLeaves = async (req, res, next) => {
  try {
    const teacher = req.teacher;
    const { status, page = 1, limit = 50 } = req.query;

    const result = await Leave.findTeacherHistory(req.college_id, teacher._id, {
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return ApiResponse.success(
      res,
      { ...result },
      "My leaves fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.getPendingLeaves = async (req, res, next) => {
  try {
    if (!req.isHOD) {
      throw new AppError(
        "Access denied: Only HOD can view pending leaves",
        403,
        "HOD_ONLY",
      );
    }

    const leaves = await Leave.findPendingForDepartment(
      req.college_id,
      req.department._id,
    );

    return ApiResponse.success(
      res,
      { leaves, count: leaves.length },
      "Pending leaves fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.getLeaveHistory = async (req, res, next) => {
  try {
    if (!req.isHOD) {
      throw new AppError(
        "Access denied: Only HOD can view leave history",
        403,
        "HOD_ONLY",
      );
    }

    const { status, from, to, page = 1, limit = 50 } = req.query;

    const query = {
      college_id: req.college_id,
      department_id: req.department._id,
      isActive: true,
    };

    if (status) {
      query.status = status;
    }

    if (from || to) {
      query.startDate = {};
      if (from) query.startDate.$gte = new Date(from);
      if (to) query.startDate.$lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [leaves, total] = await Promise.all([
      Leave.find(query)
        .sort({ startDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("teacher_id", "name email employeeId designation")
        .populate("createdBy", "name email")
        .populate("approvedBy", "name email")
        .populate("rejectedBy", "name email")
        .populate("cancelledBy", "name email"),
      Leave.countDocuments(query),
    ]);

    return ApiResponse.paginate(
      res,
      leaves,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
      "Leave history fetched successfully",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.approveLeave = async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const leave = await Leave.findOne({
      _id: leaveId,
      college_id: req.college_id,
    });

    if (!leave) {
      throw new AppError("Leave not found", 404, "LEAVE_NOT_FOUND");
    }

    if (leave.status !== "PENDING") {
      throw new AppError(
        "Leave is not in PENDING status",
        400,
        "LEAVE_NOT_PENDING",
      );
    }

    if (leave.createdBy.toString() === req.user.id.toString()) {
      throw new AppError(
        "Cannot approve your own leave request. Please ask another HOD to approve.",
        403,
        "SELF_APPROVAL_NOT_ALLOWED",
      );
    }

    if (!req.isHOD) {
      throw new AppError(
        "Access denied: Only HOD can approve leaves",
        403,
        "HOD_ONLY",
      );
    }

    if (
      leave.department_id.toString() !== req.department._id.toString()
    ) {
      throw new AppError(
        "Access denied: You can only approve leaves for your own department",
        403,
        "HOD_WRONG_DEPARTMENT",
      );
    }

    const updatedLeave = await leave.approve(req.user.id);

    (async () => {
      try {
        if (leave.createdBy) {
          await Notification.create({
            college_id: req.college_id,
            createdBy: req.user.id,
            createdByRole: "HOD",
            target: "INDIVIDUAL",
            target_users: [leave.createdBy],
            title: "Leave Approved",
            message: `Your ${leave.leaveType} leave from ${leave.startDate.toISOString().split("T")[0]} to ${leave.endDate.toISOString().split("T")[0]} has been approved.`,
            type: "ACADEMIC",
            actionUrl: "/teacher/leaves",
          });
        }
      } catch (notifErr) {
        console.error("Failed to send leave approval notification:", notifErr.message);
      }
    })();

    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "LEAVE_APPROVED",
          resourceType: "Leave",
          resourceId: leave._id,
          details: {
            leaveType: leave.leaveType,
            teacherId: leave.teacher_id,
            startDate: leave.startDate.toISOString(),
            endDate: leave.endDate.toISOString(),
          },
        });
      } catch (auditErr) {
        console.error("Failed to create leave approval audit log:", auditErr.message);
      }
    })();

    const populated = await Leave.findById(updatedLeave._id)
      .populate("approvedBy", "name email")
      .populate("teacher_id", "name email employeeId");

    return ApiResponse.success(
      res,
      { leave: populated },
      "Leave approved successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.rejectLeave = async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      throw new AppError("rejectionReason is required", 400, "MISSING_REASON");
    }

    const leave = await Leave.findOne({
      _id: leaveId,
      college_id: req.college_id,
    });

    if (!leave) {
      throw new AppError("Leave not found", 404, "LEAVE_NOT_FOUND");
    }

    if (leave.status !== "PENDING") {
      throw new AppError(
        "Leave is not in PENDING status",
        400,
        "LEAVE_NOT_PENDING",
      );
    }

    if (leave.createdBy.toString() === req.user.id.toString()) {
      throw new AppError(
        "Cannot reject your own leave request. Please ask another HOD to process.",
        403,
        "SELF_REJECTION_NOT_ALLOWED",
      );
    }

    if (!req.isHOD) {
      throw new AppError(
        "Access denied: Only HOD can reject leaves",
        403,
        "HOD_ONLY",
      );
    }

    if (
      leave.department_id.toString() !== req.department._id.toString()
    ) {
      throw new AppError(
        "Access denied: You can only reject leaves for your own department",
        403,
        "HOD_WRONG_DEPARTMENT",
      );
    }

    const updatedLeave = await leave.reject(req.user.id, rejectionReason.trim());

    (async () => {
      try {
        if (leave.createdBy) {
          await Notification.create({
            college_id: req.college_id,
            createdBy: req.user.id,
            createdByRole: "HOD",
            target: "INDIVIDUAL",
            target_users: [leave.createdBy],
            title: "Leave Rejected",
            message: `Your ${leave.leaveType} leave from ${leave.startDate.toISOString().split("T")[0]} to ${leave.endDate.toISOString().split("T")[0]} has been rejected. Reason: ${rejectionReason.trim()}`,
            type: "ACADEMIC",
            actionUrl: "/teacher/leaves",
          });
        }
      } catch (notifErr) {
        console.error("Failed to send leave rejection notification:", notifErr.message);
      }
    })();

    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "LEAVE_REJECTED",
          resourceType: "Leave",
          resourceId: leave._id,
          details: {
            leaveType: leave.leaveType,
            teacherId: leave.teacher_id,
            rejectionReason: rejectionReason.trim(),
            startDate: leave.startDate.toISOString(),
            endDate: leave.endDate.toISOString(),
          },
        });
      } catch (auditErr) {
        console.error("Failed to create leave rejection audit log:", auditErr.message);
      }
    })();

    const populated = await Leave.findById(updatedLeave._id)
      .populate("rejectedBy", "name email")
      .populate("teacher_id", "name email employeeId");

    return ApiResponse.success(
      res,
      { leave: populated },
      "Leave rejected successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.cancelLeave = async (req, res, next) => {
  try {
    const { leaveId } = req.params;
    const { cancellationReason } = req.body;

    const leave = await Leave.findOne({
      _id: leaveId,
      college_id: req.college_id,
      teacher_id: req.teacher._id,
    });

    if (!leave) {
      throw new AppError("Leave not found", 404, "LEAVE_NOT_FOUND");
    }

    if (leave.status !== "PENDING") {
      throw new AppError(
        "Only PENDING leaves can be cancelled",
        400,
        "NOT_CANCELLABLE",
      );
    }

    const updatedLeave = await leave.cancel(
      req.user.id,
      cancellationReason?.trim() || null,
    );

    (async () => {
      try {
        await AuditLog.create({
          collegeId: req.college_id,
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: "LEAVE_CANCELLED",
          resourceType: "Leave",
          resourceId: leave._id,
          details: {
            leaveType: leave.leaveType,
            teacherId: leave.teacher_id,
            cancellationReason: cancellationReason?.trim() || null,
          },
        });
      } catch (auditErr) {
        console.error("Failed to create leave cancel audit log:", auditErr.message);
      }
    })();

    const populated = await Leave.findById(updatedLeave._id)
      .populate("cancelledBy", "name email")
      .populate("teacher_id", "name email employeeId");

    return ApiResponse.success(
      res,
      { leave: populated },
      "Leave cancelled successfully",
    );
  } catch (error) {
    next(error);
  }
};

exports.getQuotaSummary = async (req, res, next) => {
  try {
    const leaveService = require("../services/leave.service");

    const academicYear = req.query.academicYear;
    const summary = await leaveService.getQuotaSummary(
      req.college_id,
      req.teacher._id,
      academicYear,
    );
    return ApiResponse.success(res, summary, "Quota summary fetched successfully");
  } catch (error) {
    next(error);
  }
};
