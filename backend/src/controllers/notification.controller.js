const mongoose = require("mongoose");
const Notification = require("../models/notification.model");
const NotificationRead = require("../models/notificationRead.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");

const getValidExpiryCondition = () => ({
  $or: [
    { expiresAt: null },
    { expiresAt: { $gte: new Date() } }
  ]
});

/**
 * Get all notification IDs already read by this user
 * ⚡ PERFORMANCE OPTIMIZED: Only loads IDs, not full documents
 */
const getReadNotificationIds = async (userId) => {
  const reads = await NotificationRead.find({ user_id: new mongoose.Types.ObjectId(userId) })
    .select("notification_id");

  return reads.map(r => r.notification_id);
};

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
    const Student = require("../models/student.model");
    
    // Get student profile to know their department, course, semester
    const student = await Student.findOne({
      user_id: req.user.id,
      college_id: req.college_id,
      status: "APPROVED"
    }).select("department_id course_id currentSemester");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found"
      });
    }

    // Build query for targeted notifications
    // FIX: Use $and to combine two $or conditions properly (MongoDB doesn't support multiple $or at same level)
    const targetQuery = {
      college_id: req.college_id,
      isActive: true,
      createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] },
      $and: [
        // Expiry condition
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } }
          ]
        },
        // Target audience filtering
        {
          $or: [
            { target: "ALL" },
            { target: "STUDENTS" },
            // Department-specific notifications
            { 
              target: "DEPARTMENT", 
              target_department: student.department_id 
            },
            // Course-specific notifications
            { 
              target: "COURSE", 
              target_course: student.course_id 
            },
            // Semester-specific notifications
            { 
              target: "SEMESTER", 
              target_semester: student.currentSemester 
            },
            // Individual notifications (if student is in target_users)
            {
              target: "INDIVIDUAL",
              target_users: req.user.id
            }
          ]
        }
      ]
    };

    const notifications = await Notification.find(targetQuery)
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
      adminNotifications,
      teacherNotifications,
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
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      $or: [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdByRole: "HOD", createdBy: userObjectId },
        { target: "INDIVIDUAL", target_users: userId }
      ]
    }).sort({ createdAt: -1 });

    const myNotifications = [];
    const adminNotifications = [];
    const teacherNotifications = [];

    notifications.forEach((n) => {
      if (n.createdByRole === "HOD" && n.createdBy.toString() === userId) {
        myNotifications.push(n);
      } else if (n.createdByRole === "TEACHER") {
        teacherNotifications.push(n);
      } else if (n.createdByRole === "COLLEGE_ADMIN") {
        adminNotifications.push(n);
      }
    });

    ApiResponse.success(res, {
      myNotifications,
      adminNotifications,
      teacherNotifications,
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
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      $or: [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdByRole: "HOD" },
        { target: "INDIVIDUAL", target_users: userId }
      ]
    }).sort({ createdAt: -1 });

    const myNotifications = [];
    const adminNotifications = [];
    const hodNotifications = [];

    notifications.forEach((n) => {
      if (n.createdByRole === "TEACHER" && n.createdBy.toString() === userId) {
        myNotifications.push(n);
      } else if (n.createdByRole === "COLLEGE_ADMIN") {
        adminNotifications.push(n);
      } else if (n.createdByRole === "HOD") {
        hodNotifications.push(n);
      }
    });

    ApiResponse.success(res, {
      myNotifications,
      adminNotifications,
      hodNotifications,
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
    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      $or: [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdBy: new mongoose.Types.ObjectId(req.user.id) }
      ]
    }).sort({ createdAt: -1 });

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
      myNotifications,
      staffNotifications,
    }, "Student notifications fetched successfully");
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

    const readIds = await getReadNotificationIds(userId);

    // ⚡ PERFORMANCE FIX: Use countDocuments instead of find + manual counting
    // This avoids loading full documents into memory and uses MongoDB's native counting
    const adminCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN"
    });

    const teacherCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
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
    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }

    const readIds = await getReadNotificationIds(userId);

    // Count notifications that teacher can see:
    // - Admin notifications (COLLEGE_ADMIN)
    // - HOD notifications (HOD role - exception approval/rejection)
    // - Individual notifications where teacher is in target_users (own notifications)
    const adminCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN"
    });

    const hodCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      createdByRole: "HOD"
    });

    const individualCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      target: "INDIVIDUAL",
      target_users: userId
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
    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (!req.college_id) {
      throw new AppError("College ID not available. Please login again.", 403, "COLLEGE_ID_MISSING");
    }

    const readIds = await getReadNotificationIds(userId);

    // Count notifications that HOD can see:
    // - Admin notifications (COLLEGE_ADMIN) - all college admin notifications
    // - TEACHER notifications where HOD is in target_users (INDIVIDUAL targeting)
    // - Own HOD notifications
    const adminCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN"
    });

    const teacherCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      target: "INDIVIDUAL",
      target_users: userId
    });

    const ownHodCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      createdByRole: "HOD",
      createdBy: userObjectId
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

    // ⚡ PERFORMANCE FIX: Use countDocuments instead of find + manual counting
    // Separate queries for better performance and clarity
    const myCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      createdByRole: "COLLEGE_ADMIN",
      createdBy: new mongoose.Types.ObjectId(userId)
    });

    const staffCount = await Notification.countDocuments({
      college_id: req.college_id,
      isActive: true,
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
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    let query = {
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds }
    };

    // Role-based filtering with proper INDIVIDUAL notification support
    if (req.user.role === "STUDENT") {
      query.createdByRole = { $in: ["COLLEGE_ADMIN", "TEACHER"] };
    } else if (req.user.role === "TEACHER") {
      query.$or = [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdByRole: "HOD" },
        { target: "INDIVIDUAL", target_users: userId }
      ];
    } else if (req.user.role === "COLLEGE_ADMIN") {
      // Admin sees: Admin-created notifications + Teacher-created notifications
      query.$or = [
        { createdByRole: "COLLEGE_ADMIN", createdBy: userObjectId },
        { createdByRole: "TEACHER" }
      ];
    } else if (req.user.role === "HOD") {
      // HOD sees: Admin notifications + Teacher notifications (INDIVIDUAL) + Own notifications
      query.$or = [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdByRole: "TEACHER", target: "INDIVIDUAL", target_users: userId },
        { createdByRole: "HOD", createdBy: userObjectId }
      ];
    }

    const unread = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20);  // Increased limit for better UX

    // ✅ Return array directly for frontend compatibility
    ApiResponse.success(res, unread, "Unread notifications fetched successfully");
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    if (!req.college_id) {
      throw new AppError(
        "College ID not available. Please login again.",
        403,
        "COLLEGE_ID_MISSING",
      );
    }

    const readIds = await getReadNotificationIds(userId);

    const query = {
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
    };

    if (userRole === "STUDENT") {
      query.createdByRole = { $in: ["COLLEGE_ADMIN", "TEACHER"] };
    } else if (userRole === "TEACHER") {
      query.$or = [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdByRole: "HOD" },
        { target: "INDIVIDUAL", target_users: userId },
      ];
    } else if (userRole === "COLLEGE_ADMIN" || userRole === "PRINCIPAL") {
      query.$or = [
        { createdByRole: "COLLEGE_ADMIN", createdBy: userObjectId },
        { createdByRole: "TEACHER" },
      ];
    } else if (userRole === "HOD") {
      query.$or = [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdByRole: "TEACHER", target: "INDIVIDUAL", target_users: userId },
        { createdByRole: "HOD", createdBy: userObjectId },
      ];
    }

    const unreadNotifications = await Notification.find(query).select(
      "_id",
    );
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

    await NotificationRead.findOneAndUpdate(
      {
        notification_id: notificationId,
        user_id: userId,
      },
      {
        notification_id: notificationId,
        user_id: userId,
        role,
        readAt: new Date(),
      },
      { upsert: true },
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







