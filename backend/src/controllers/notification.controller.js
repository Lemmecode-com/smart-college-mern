const mongoose = require("mongoose");
const Notification = require("../models/notification.model");
const NotificationRead = require("../models/notificationRead.model");
const Student = require("../models/student.model");
const {
  getNotificationVisibilityQuery,
  getReadNotificationIds,
  attachReadStatus,
  toObjectId,
} = require("../services/notificationVisibility.service");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");

/**
 * ================================
 * COLLEGE ADMIN – CREATE NOTIFICATION
 * Enhanced with granular targeting (FIX: Issue #7)
 * ================================
 */
exports.createAdminNotification = async (req, res, next) => {
  try {
    const { title, message, type, target, actionUrl, expiresAt, priority,
            target_department, target_course, target_semester, target_users } = req.body;

    // Validate target field
    const validTargets = ["ALL", "STUDENTS", "TEACHERS", "DEPARTMENT", "COURSE", "SEMESTER", "INDIVIDUAL"];
    if (target && !validTargets.includes(target)) {
      throw new AppError(`Invalid target. Must be one of: ${validTargets.join(", ")}`, 400, "INVALID_TARGET");
    }

    // Validate priority field
    const validPriorities = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"];
    if (priority && !validPriorities.includes(priority)) {
      throw new AppError(`Invalid priority. Must be one of: ${validPriorities.join(", ")}`, 400, "INVALID_PRIORITY");
    }

    // Validate expiresAt date format
    if (expiresAt) {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        throw new AppError("Invalid expiresAt date format", 400, "INVALID_DATE");
      }
    }

    // Validate granular targeting fields based on target type
    if (target === "DEPARTMENT" && !target_department) {
      throw new AppError("target_department is required when target is DEPARTMENT", 400, "MISSING_TARGET_DEPARTMENT");
    }

    if (target === "COURSE" && !target_course) {
      throw new AppError("target_course is required when target is COURSE", 400, "MISSING_TARGET_COURSE");
    }

    if (target === "SEMESTER" && (!target_semester || target_semester < 1 || target_semester > 8)) {
      throw new AppError("target_semester (1-8) is required when target is SEMESTER", 400, "MISSING_TARGET_SEMESTER");
    }

    if (target === "INDIVIDUAL" && (!target_users || !Array.isArray(target_users) || target_users.length === 0)) {
      throw new AppError("target_users array is required when target is INDIVIDUAL", 400, "MISSING_TARGET_USERS");
    }

    const notification = await Notification.create({
      college_id: req.college_id,
      createdBy: req.user.id,
      createdByRole: "COLLEGE_ADMIN",
      target: target || "ALL",
      title,
      message,
      type: type || "GENERAL",
      priority: priority || "NORMAL",
      actionUrl,
      expiresAt,
      target_department,
      target_course,
      target_semester,
      target_users
    });

    ApiResponse.created(res, {
      notification
    }, "Notification created successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * TEACHER – CREATE NOTIFICATION
 * Enhanced with granular targeting (FIX: Issue #7)
 * ================================
 */
exports.createTeacherNotification = async (req, res, next) => {
  try {
    const { title, message, type, target, actionUrl, expiresAt, priority,
            target_department, target_course, target_semester, target_users } = req.body;

    // Teachers can only target STUDENTS, DEPARTMENT, COURSE, or SEMESTER
    const validTeacherTargets = ["STUDENTS", "DEPARTMENT", "COURSE", "SEMESTER"];
    const effectiveTarget = target || "STUDENTS";
    
    if (!validTeacherTargets.includes(effectiveTarget)) {
      throw new AppError(`Teachers can only target: ${validTeacherTargets.join(", ")}`, 400, "INVALID_TEACHER_TARGET");
    }

    // Validate priority field
    const validPriorities = ["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"];
    if (priority && !validPriorities.includes(priority)) {
      throw new AppError(`Invalid priority. Must be one of: ${validPriorities.join(", ")}`, 400, "INVALID_PRIORITY");
    }

    // Validate expiresAt date format
    if (expiresAt) {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        throw new AppError("Invalid expiresAt date format", 400, "INVALID_DATE");
      }
    }

    // Validate granular targeting fields
    if (effectiveTarget === "DEPARTMENT" && !target_department) {
      throw new AppError("target_department is required when target is DEPARTMENT", 400, "MISSING_TARGET_DEPARTMENT");
    }

    if (effectiveTarget === "COURSE" && !target_course) {
      throw new AppError("target_course is required when target is COURSE", 400, "MISSING_TARGET_COURSE");
    }

    if (effectiveTarget === "SEMESTER" && (!target_semester || target_semester < 1 || target_semester > 8)) {
      throw new AppError("target_semester (1-8) is required when target is SEMESTER", 400, "MISSING_TARGET_SEMESTER");
    }

    const notification = await Notification.create({
      college_id: req.college_id,
      createdBy: req.user.id,
      createdByRole: "TEACHER",
      target: effectiveTarget,
      title,
      message,
      type: type || "GENERAL",
      priority: priority || "NORMAL",
      actionUrl,
      expiresAt,
      target_department,
      target_course,
      target_semester,
      target_users
    });

    ApiResponse.created(res, {
      notification
    }, "Notification created successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * STUDENT – VIEW NOTIFICATIONS
 * Sees: Admin + Teacher notifications (with granular targeting - FIX: Issue #7)
 * ================================
 */
exports.getStudentNotifications = async (req, res, next) => {
  try {
    const student = await Student.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: { $in: ["APPROVED", "ENROLLED"] }
    }).select("department_id course_id currentSemester");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found"
      });
    }

    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId: req.user.id,
      studentProfile: student,
    });

    const notifications = await Notification.find(visibilityQuery)
      .populate("target_department", "name code")
      .populate("target_course", "name code")
      .sort({ createdAt: -1 });

    const adminNotifications = [];
    const teacherNotifications = [];

    notifications.forEach((n) => {
      if (n.createdByRole === "COLLEGE_ADMIN") {
        adminNotifications.push(n);
      } else if (n.createdByRole === "TEACHER") {
        teacherNotifications.push(n);
      }
    });

    ApiResponse.success(res, {
      count: notifications.length,
      adminNotifications: await attachReadStatus(adminNotifications, req.user.id),
      teacherNotifications: await attachReadStatus(teacherNotifications, req.user.id),
    }, "Admin notifications fetched successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * HOD – VIEW NOTIFICATIONS
 * Sees: Admin + HOD notifications (same pattern as Teacher)
 * ================================
 */
exports.getHodNotifications = async (req, res, next) => {
  try {
    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId: req.user.id,
    });

    const notifications = await Notification.find(visibilityQuery)
      .sort({ createdAt: -1 });

    const myNotifications = [];
    const adminNotifications = [];
    const teacherNotifications = [];

    notifications.forEach((n) => {
      if (n.createdByRole === "HOD" && n.createdBy.toString() === req.user.id) {
        myNotifications.push(n);
      } else if (n.createdByRole === "TEACHER") {
        teacherNotifications.push(n);
      } else if (n.createdByRole === "COLLEGE_ADMIN") {
        adminNotifications.push(n);
      }
    });

    ApiResponse.success(res, {
      myNotifications: await attachReadStatus(myNotifications, req.user.id),
      adminNotifications: await attachReadStatus(adminNotifications, req.user.id),
      teacherNotifications: await attachReadStatus(teacherNotifications, req.user.id),
    }, "HOD notifications fetched successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * TEACHER – VIEW NOTIFICATIONS
 * Sees: Admin notifications + HOD notifications (targeted individually)
 * ================================
 */
exports.getTeacherNotifications = async (req, res, next) => {
  try {
    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId: req.user.id,
    });

    const notifications = await Notification.find(visibilityQuery)
      .sort({ createdAt: -1 });

    const myNotifications = [];
    const adminNotifications = [];
    const hodNotifications = [];

    notifications.forEach((n) => {
      if (n.createdByRole === "TEACHER" && n.createdBy.toString() === req.user.id) {
        myNotifications.push(n);
      } else if (n.createdByRole === "COLLEGE_ADMIN") {
        adminNotifications.push(n);
      } else if (n.createdByRole === "HOD") {
        hodNotifications.push(n);
      }
    });

    ApiResponse.success(res, {
      myNotifications: await attachReadStatus(myNotifications, req.user.id),
      adminNotifications: await attachReadStatus(adminNotifications, req.user.id),
      hodNotifications: await attachReadStatus(hodNotifications, req.user.id),
    }, "Teacher notifications fetched successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * COLLEGE ADMIN – VIEW ALL NOTIFICATIONS
 * (Admin + Teacher)
 * ================================
 */
exports.getAdminNotifications = async (req, res, next) => {
  try {
    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId: req.user.id,
    });

    const notifications = await Notification.find(visibilityQuery)
      .sort({ createdAt: -1 });

    const myNotifications = [];
    const staffNotifications = [];

    notifications.forEach((n) => {
      if (
        n.createdByRole === "COLLEGE_ADMIN" &&
        n.createdBy.toString() === req.user.id
      ) {
        myNotifications.push(n);
      } else if (n.createdByRole === "TEACHER") {
        staffNotifications.push(n);
      }
    });

    ApiResponse.success(res, {
      myNotifications: await attachReadStatus(myNotifications, req.user.id),
      staffNotifications: await attachReadStatus(staffNotifications, req.user.id),
    }, "Student notifications fetched successfully");
  } catch (error) {
    next(error);
  }
};

exports.getNotificationById = async (req, res, next) => {
  try {
    const notificationId = toObjectId(req.params.notificationId, "Notification ID");
    let studentProfile = null;

    if (req.user.role === "STUDENT") {
      studentProfile = await Student.findOne({
        user_id: req.user.id,
        college_id: req.college_id,
        status: { $in: ["APPROVED", "ENROLLED"] }
      }).select("department_id course_id currentSemester");

      if (!studentProfile) {
        return res.status(404).json({
          success: false,
          message: "Student profile not found"
        });
      }
    }

    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId: req.user.id,
      studentProfile,
    });

    const notification = await Notification.findOne({
      ...visibilityQuery,
      _id: notificationId,
    })
      .populate("target_department", "name code")
      .populate("target_course", "name code");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    const [notificationWithReadStatus] = await attachReadStatus([notification], req.user.id);

    return res.status(200).json({
      success: true,
      notification: notificationWithReadStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * UPDATE NOTIFICATION
 * Rule:
 * - Admin can update ONLY admin notifications
 * - Teacher can update ONLY teacher notifications
 * ================================
 */
exports.updateNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Ownership + role check
    if (
      notification.createdBy.toString() !== req.user.id ||
      notification.createdByRole !== req.user.role
    ) {
      return res.status(403).json({
        message: "Access denied: cannot update this notification"
      });
    }

    notification.title = req.body.title ?? notification.title;
    notification.message = req.body.message ?? notification.message;
    notification.type = req.body.type ?? notification.type;
    notification.actionUrl = req.body.actionUrl ?? notification.actionUrl;
    notification.expiresAt = req.body.expiresAt ?? notification.expiresAt;
    notification.isActive =
      typeof req.body.isActive === "boolean"
        ? req.body.isActive
        : notification.isActive;

    await notification.save();

    ApiResponse.success(res, {
      notification
    }, "Notification updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * DELETE NOTIFICATION
 * Rule:
 * - Admin deletes admin notifications
 * - Teacher deletes teacher notifications
 * ================================
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (
      notification.createdBy.toString() !== req.user.id ||
      notification.createdByRole !== req.user.role
    ) {
      return res.status(403).json({
        message: "Access denied: cannot delete this notification"
      });
    }

    await notification.deleteOne();

    ApiResponse.success(res, null, "Notification deleted successfully");
  } catch (error) {
    next(error);
  }
};


exports.getStudentNotificationCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }

    const student = await Student.findOne({
      user_id: userId,
      college_id: req.college_id,
      status: { $in: ["APPROVED", "ENROLLED"] }
    }).select("department_id course_id currentSemester");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found"
      });
    }

    const readIds = await getReadNotificationIds(userId);
    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId,
      studentProfile: student,
    });

    const adminCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN"
    });

    const teacherCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "TEACHER"
    });

    ApiResponse.success(res, {
      adminCount,
      teacherCount,
      total: adminCount + teacherCount
    }, "Notification count fetched successfully");
  } catch (error) {
    next(error);
  }
};

exports.getTeacherNotificationCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }

    const readIds = await getReadNotificationIds(userId);
    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId,
    });

    const adminCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN"
    });

    const hodCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "HOD"
    });

    const individualCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      target: "INDIVIDUAL",
      target_users: toObjectId(userId, "User ID")
    });

    const myCount = adminCount + hodCount + individualCount;

    ApiResponse.success(res, {
      myCount,
      adminCount,
      hodCount,
      total: myCount
    }, "Teacher notification count fetched successfully");
  } catch (error) {
    next(error);
  }
};

exports.getHodNotificationCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }

    const readIds = await getReadNotificationIds(userId);
    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId,
    });

    const adminCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN"
    });

    const teacherCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      target: "INDIVIDUAL",
      target_users: toObjectId(userId, "User ID")
    });

    const ownHodCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "HOD",
      createdBy: toObjectId(userId, "User ID")
    });

    const myCount = adminCount + teacherCount + ownHodCount;

    ApiResponse.success(res, {
      myCount,
      adminCount,
      teacherCount,
      total: myCount
    }, "HOD notification count fetched successfully");
  } catch (error) {
    next(error);
  }
};

exports.getAdminNotificationCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }

    const readIds = await getReadNotificationIds(userId);
    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId,
    });

    const myCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN",
      createdBy: toObjectId(userId, "User ID")
    });

    const staffCount = await Notification.countDocuments({
      ...visibilityQuery,
      _id: { $nin: readIds },
      createdByRole: "TEACHER"
    });

    ApiResponse.success(res, {
      myCount,
      staffCount,
      total: myCount + staffCount
    }, "Admin notification count fetched successfully");
  } catch (error) {
    next(error);
  }
};

exports.getUnreadForBell = async (req, res, next) => {
  try {
    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }

    const readIds = await getReadNotificationIds(req.user.id);
    let studentProfile = null;

    if (req.user.role === "STUDENT") {
      studentProfile = await Student.findOne({
        user_id: req.user.id,
        college_id: req.college_id,
        status: { $in: ["APPROVED", "ENROLLED"] }
      }).select("department_id course_id currentSemester");

      if (!studentProfile) {
        return ApiResponse.success(res, [], "Unread notifications fetched successfully");
      }
    }

    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: req.user.role,
      userId: req.user.id,
      studentProfile,
    });

    const unread = await Notification.find({
      ...visibilityQuery,
      _id: { $nin: readIds },
    })
      .sort({ createdAt: -1 })
      .limit(20);

    ApiResponse.success(res, unread, "Unread notifications fetched successfully");
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!req.college_id) {
      throw new AppError(
        "College ID not available. Please login again.",
        403,
        "COLLEGE_ID_MISSING",
      );
    }

    const readIds = await getReadNotificationIds(userId);
    let studentProfile = null;

    if (userRole === "STUDENT") {
      studentProfile = await Student.findOne({
        user_id: userId,
        college_id: req.college_id,
        status: { $in: ["APPROVED", "ENROLLED"] }
      }).select("department_id course_id currentSemester");

      if (!studentProfile) {
        return ApiResponse.success(
          res,
          { markedCount: 0, totalUnread: 0 },
          "No unread notifications",
        );
      }
    }

    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role: userRole,
      userId,
      studentProfile,
    });

    const unreadNotifications = await Notification.find({
      ...visibilityQuery,
      _id: { $nin: readIds },
    }).select("_id");
    const unreadIds = unreadNotifications.map((n) => n._id);

    if (unreadIds.length === 0) {
      return ApiResponse.success(
        res,
        { markedCount: 0, totalUnread: 0 },
        "No unread notifications",
      );
    }

    await NotificationRead.insertMany(
      unreadIds.map((notificationId) => ({
        notification_id: notificationId,
        user_id: userId,
        role: userRole,
        readAt: new Date(),
      })),
      { ordered: false },
    );

    await Notification.updateMany(
      {
        _id: { $in: unreadIds },
        college_id: req.college_id,
        isActive: true,
      },
      { $set: { isRead: true } },
    );

    ApiResponse.success(
      res,
      { markedCount: unreadIds.length, totalUnread: 0 },
      `Marked ${unreadIds.length} notifications as read`,
    );
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const { id: userId, role } = req.user;
    const safeNotificationId = toObjectId(notificationId, "Notification ID");
    let studentProfile = null;

    if (role === "STUDENT") {
      studentProfile = await Student.findOne({
        user_id: userId,
        college_id: req.college_id,
        status: { $in: ["APPROVED", "ENROLLED"] }
      }).select("department_id course_id currentSemester");

      if (!studentProfile) {
        return res.status(404).json({
          success: false,
          message: "Student profile not found"
        });
      }
    }

    const visibilityQuery = await getNotificationVisibilityQuery({
      collegeId: req.college_id,
      role,
      userId,
      studentProfile,
    });

    const notification = await Notification.findOne({
      ...visibilityQuery,
      _id: safeNotificationId,
    }).select("_id");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    await NotificationRead.findOneAndUpdate(
      {
        notification_id: safeNotificationId,
        user_id: userId,
      },
      {
        notification_id: safeNotificationId,
        user_id: userId,
        role,
        readAt: new Date(),
      },
      { upsert: true },
    );

    await Notification.updateOne(
      {
        _id: safeNotificationId,
        college_id: req.college_id,
        isActive: true,
      },
      { $set: { isRead: true } },
    );

    ApiResponse.success(res, null, "Notification marked as read");
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * SEND PROMOTION NOTIFICATION
 * Rule: Only COLLEGE_ADMIN can send promotion notifications
 * ================================
 */
exports.sendPromotionNotification = async (req, res, next) => {
  try {
    const { studentId, studentName, newSemester, newAcademicYear, adminName } = req.body;

    await Notification.create({
      college_id: req.college_id,
      createdBy: new mongoose.Types.ObjectId(req.user.id),
      createdByRole: "COLLEGE_ADMIN",
      target: "STUDENTS",
      title: "🎓 Promotion Approved",
      message: `Congratulations ${studentName}! You have been promoted to Semester ${newSemester} (${newAcademicYear}) by ${adminName}.`,
      type: "ACADEMIC",
      actionUrl: "/dashboard/student/profile"
    });

    ApiResponse.success(res, null, "Notification sent successfully");
  } catch (error) {
    next(error);
  }
}; 







