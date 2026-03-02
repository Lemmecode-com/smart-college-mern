const Notification = require("../models/notification.model");
const NotificationRead = require("../models/notificationRead.model");
const AppError = require("../utils/AppError");

const getValidExpiryCondition = () => ({
  $or: [
    { expiresAt: null },
    { expiresAt: { $gte: new Date() } }
  ]
});

const unreadFilter = async (userId) => {
  const reads = await NotificationRead.find({ user_id: userId })
    .select("notification_id");
  return reads.map(r => r.notification_id);
};

/**
 * Get all notification IDs already read by this user
 */
const getReadNotificationIds = async (userId) => {
  const reads = await NotificationRead.find({ user_id: userId })
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
    const { title, message, type, target, actionUrl, expiresAt, 
            target_department, target_course, target_semester, target_users } = req.body;

    // Validate target field
    const validTargets = ["ALL", "STUDENTS", "TEACHERS", "DEPARTMENT", "COURSE", "SEMESTER", "INDIVIDUAL"];
    if (target && !validTargets.includes(target)) {
      throw new AppError(`Invalid target. Must be one of: ${validTargets.join(", ")}`, 400, "INVALID_TARGET");
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
      actionUrl,
      expiresAt,
      target_department,
      target_course,
      target_semester,
      target_users
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification
    });
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
    const { title, message, type, target, actionUrl, expiresAt,
            target_department, target_course, target_semester, target_users } = req.body;

    // Teachers can only target STUDENTS, DEPARTMENT, COURSE, or SEMESTER
    const validTeacherTargets = ["STUDENTS", "DEPARTMENT", "COURSE", "SEMESTER"];
    const effectiveTarget = target || "STUDENTS";
    
    if (!validTeacherTargets.includes(effectiveTarget)) {
      throw new AppError(`Teachers can only target: ${validTeacherTargets.join(", ")}`, 400, "INVALID_TEACHER_TARGET");
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
      actionUrl,
      expiresAt,
      target_department,
      target_course,
      target_semester,
      target_users
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification
    });
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
    const targetQuery = {
      college_id: req.college_id,
      isActive: true,
      createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gte: new Date() } }
      ],
      // Target audience filtering
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

    res.json({
      success: true,
      count: notifications.length,
      adminNotifications,
      teacherNotifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ================================
 * TEACHER – VIEW NOTIFICATIONS
 * Sees: Admin notifications only
 * ================================
 */
exports.getTeacherNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      $or: [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdBy: req.user.id }
      ]
    }).sort({ createdAt: -1 });

    const myNotifications = [];
    const adminNotifications = [];

    notifications.forEach((n) => {
      if (
        n.createdByRole === "TEACHER" &&
        n.createdBy.toString() === req.user.id
      ) {
        myNotifications.push(n);
      } else if (n.createdByRole === "COLLEGE_ADMIN") {
        adminNotifications.push(n);
      }
    });

    res.json({
      myNotifications,
      adminNotifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ================================
 * COLLEGE ADMIN – VIEW ALL NOTIFICATIONS
 * (Admin + Teacher)
 * ================================
 */
exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
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

    res.json({
      myNotifications,
      staffNotifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
exports.updateNotification = async (req, res) => {
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

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
exports.deleteNotification = async (req, res) => {
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

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getStudentNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const readIds = await getReadNotificationIds(userId);

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] }
    });

    let adminCount = 0;
    let teacherCount = 0;

    notifications.forEach(n => {
      if (n.createdByRole === "COLLEGE_ADMIN") adminCount++;
      if (n.createdByRole === "TEACHER") teacherCount++;
    });

    res.json({
      adminCount,
      teacherCount,
      total: adminCount + teacherCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeacherNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const readIds = await getReadNotificationIds(userId);

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds },
      $or: [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdBy: userId }
      ]
    });

    let myCount = 0;
    let adminCount = 0;

    notifications.forEach(n => {
      if (n.createdByRole === "COLLEGE_ADMIN") {
        adminCount++;
      } else if (
        n.createdByRole === "TEACHER" &&
        n.createdBy.toString() === userId
      ) {
        myCount++;
      }
    });

    res.json({
      myCount,
      adminCount,
      total: myCount + adminCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const readIds = await getReadNotificationIds(userId);

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds }
    });

    let myCount = 0;
    let staffCount = 0;

    notifications.forEach(n => {
      if (
        n.createdByRole === "COLLEGE_ADMIN" &&
        n.createdBy.toString() === userId
      ) {
        myCount++;
      } else if (n.createdByRole === "TEACHER") {
        staffCount++;
      }
    });

    res.json({
      myCount,
      staffCount,
      total: myCount + staffCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUnreadForBell = async (req, res) => {
  try {
    const readIds = await getReadNotificationIds(req.user.id);

    let query = {
      college_id: req.college_id,
      isActive: true,
      _id: { $nin: readIds }
    };

    if (req.user.role === "STUDENT") {
      query.createdByRole = { $in: ["COLLEGE_ADMIN", "TEACHER"] };
    }

    if (req.user.role === "TEACHER") {
      query.$or = [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdBy: req.user.id }
      ];
    }

    const unread = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(6);

    res.json(unread);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { id: userId, role } = req.user;

    await NotificationRead.findOneAndUpdate(
      {
        notification_id: notificationId,
        user_id: userId
      },
      {
        notification_id: notificationId,
        user_id: userId,
        role,
        readAt: new Date()
      },
      { upsert: true }
    );

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ================================
 * SEND PROMOTION NOTIFICATION
 * Rule: Only COLLEGE_ADMIN can send promotion notifications
 * ================================
 */
exports.sendPromotionNotification = async (req, res) => {
  try {
    const { studentId, studentName, newSemester, newAcademicYear, adminName } = req.body;
    
    await Notification.create({
      college_id: req.college_id,
      createdBy: req.user.id,
      createdByRole: "COLLEGE_ADMIN",
      target: "STUDENTS",
      title: "🎓 Promotion Approved",
      message: `Congratulations ${studentName}! You have been promoted to Semester ${newSemester} (${newAcademicYear}) by ${adminName}.`,
      type: "ACADEMIC",
      actionUrl: "/dashboard/student/profile"
    });

    res.json({ message: "Notification sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};