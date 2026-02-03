const Notification = require("../models/notification.model");

const getValidExpiryCondition = () => ({
  $or: [
    { expiresAt: null },
    { expiresAt: { $gte: new Date() } }
  ]
});

/**
 * ================================
 * COLLEGE ADMIN – CREATE NOTIFICATION
 * Visible to: Admin + Teachers + Students
 * ================================
 */
exports.createAdminNotification = async (req, res) => {
  try {
    const notification = await Notification.create({
      college_id: req.college_id,
      createdBy: req.user.id,
      createdByRole: "COLLEGE_ADMIN",
      target: "ALL",
      title: req.body.title,
      message: req.body.message,
      type: req.body.type || "GENERAL",
      actionUrl: req.body.actionUrl,
      expiresAt: req.body.expiresAt
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ================================
 * TEACHER – CREATE NOTIFICATION
 * Visible to: Students only
 * ================================
 */
exports.createTeacherNotification = async (req, res) => {
  try {
    const notification = await Notification.create({
      college_id: req.college_id,
      createdBy: req.user.id,
      createdByRole: "TEACHER",
      target: "STUDENTS",
      title: req.body.title,
      message: req.body.message,
      type: req.body.type || "GENERAL",
      actionUrl: req.body.actionUrl,
      expiresAt: req.body.expiresAt
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ================================
 * STUDENT – VIEW NOTIFICATIONS
 * Sees: Admin + Teacher notifications
 * ================================
 */
exports.getStudentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] },
    }).sort({ createdAt: -1 });

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
      adminNotifications,
      teacherNotifications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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


/**
 * ================================
 * NOTIFICATION COUNTS
 * ================================
 */
exports.getAdminNotificationCount = async (req, res) => {
  try {
    const expiryCondition = getValidExpiryCondition();

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      ...expiryCondition
    });

    let myCount = 0;
    let staffCount = 0;

    notifications.forEach((n) => {
      if (
        n.createdByRole === "COLLEGE_ADMIN" &&
        n.createdBy.toString() === req.user.id
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

exports.getTeacherNotificationCount = async (req, res) => {
  try {
    const expiryCondition = getValidExpiryCondition();

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      ...expiryCondition,
      $or: [
        { createdByRole: "COLLEGE_ADMIN" },
        { createdBy: req.user.id }
      ]
    });

    let myCount = 0;
    let adminCount = 0;

    notifications.forEach((n) => {
      if (
        n.createdByRole === "TEACHER" &&
        n.createdBy.toString() === req.user.id
      ) {
        myCount++;
      } else if (n.createdByRole === "COLLEGE_ADMIN") {
        adminCount++;
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

exports.getStudentNotificationCount = async (req, res) => {
  try {
    const expiryCondition = getValidExpiryCondition();

    const notifications = await Notification.find({
      college_id: req.college_id,
      isActive: true,
      ...expiryCondition,
      createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] }
    });

    let adminCount = 0;
    let teacherCount = 0;

    notifications.forEach((n) => {
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
