const Notification = require("../models/notification.model");
const logger = require("../utils/logger");

class NotificationService {
  /**
   * Create a notification with duplicate prevention
   * Uses atomic upsert with unique compound index to prevent race conditions
   */
  async createNotification(notificationData) {
    try {
      const notification = await Notification.create(notificationData);
      logger.logInfo("Notification created", {
        notificationId: notification._id,
        target: notificationData.target,
        createdByRole: notificationData.createdByRole,
      });
      return notification;
    } catch (error) {
      if (error.code === 11000) {
        logger.warn("Duplicate notification prevented", {
          error: error.message,
          notificationData: {
            target: notificationData.target,
            createdByRole: notificationData.createdByRole,
          },
        });
        return null;
      }
      logger.logError("Failed to create notification", {
        error: error.message,
        notificationData: {
          target: notificationData.target,
          createdByRole: notificationData.createdByRole,
        },
      });
      return null;
    }
  }

  /**
   * Create multiple notifications atomically with duplicate prevention
   */
  async createNotifications(notificationsData) {
    try {
      const notifications = await Notification.insertMany(notificationsData, {
        ordered: false,
      });
      logger.logInfo(`Created ${notifications.length} notifications`);
      return notifications;
    } catch (error) {
      if (error.code === 11000 || error.writeErrors) {
        const successfulCount = error.result?.insertedIds ? Object.keys(error.result.insertedIds).length : 0;
        logger.warn(`Partial notification creation: ${successfulCount} succeeded, ${error.writeErrors?.length || 0} duplicates skipped`);
        return error.result?.insertedIds ? Object.values(error.result.insertedIds) : [];
      }
      logger.logError("Failed to create notifications batch", { error: error.message });
      return [];
    }
  }

  /**
   * Check if a notification already exists for a specific target type
   * Used to prevent duplicate notifications in the same workflow
   */
  async notificationExists(collegeId, target, targetUsers, createdByRole, title) {
    const query = {
      college_id: collegeId,
      target: target,
      createdByRole: createdByRole,
      title: title,
    };

    if (targetUsers && targetUsers.length > 0) {
      query.target_users = { $in: targetUsers };
    }

    const count = await Notification.countDocuments(query);
    return count > 0;
  }

  /**
   * Send exception notification to HOD
   * TEACHER -> HOD workflow
   */
  async sendExceptionToHod(collegeId, teacherId, hodUserId) {
    const existing = await this.notificationExists(
      collegeId,
      "INDIVIDUAL",
      [hodUserId],
      "TEACHER",
      "New Timetable Exception Request"
    );

    if (existing) {
      logger.warn("Skipping duplicate exception notification to HOD");
      return null;
    }

    return await this.createNotification({
      college_id: collegeId,
      createdBy: teacherId,
      createdByRole: "TEACHER",
      target: "INDIVIDUAL",
      target_users: [hodUserId],
      title: "New Timetable Exception Request",
      message: "A teacher has submitted a timetable exception request requiring your approval.",
      type: "ACADEMIC",
      actionUrl: "/hod/exception-approvals",
    });
  }

  /**
   * Send exception approval notification to teacher
   * HOD -> TEACHER workflow
   */
  async sendExceptionApproval(collegeId, hodUserId, teacherUserId) {
    const existing = await this.notificationExists(
      collegeId,
      "INDIVIDUAL",
      [teacherUserId],
      "HOD",
      "Timetable Exception Approved"
    );

    if (existing) {
      logger.warn("Skipping duplicate exception approval notification");
      return null;
    }

    return await this.createNotification({
      college_id: collegeId,
      createdBy: hodUserId,
      createdByRole: "HOD",
      target: "INDIVIDUAL",
      target_users: [teacherUserId],
      title: "Timetable Exception Approved",
      message: "Your timetable exception request has been approved.",
      type: "ACADEMIC",
      actionUrl: "/timetable/exceptions",
    });
  }

  /**
   * Send exception rejection notification to teacher
   * HOD -> TEACHER workflow
   */
  async sendExceptionRejection(collegeId, hodUserId, teacherUserId, rejectionReason) {
    const existing = await this.notificationExists(
      collegeId,
      "INDIVIDUAL",
      [teacherUserId],
      "HOD",
      "Timetable Exception Rejected"
    );

    if (existing) {
      logger.warn("Skipping duplicate exception rejection notification");
      return null;
    }

    return await this.createNotification({
      college_id: collegeId,
      createdBy: hodUserId,
      createdByRole: "HOD",
      target: "INDIVIDUAL",
      target_users: [teacherUserId],
      title: "Timetable Exception Rejected",
      message: `Your timetable exception request has been rejected. Reason: ${rejectionReason}`,
      type: "ACADEMIC",
      actionUrl: "/timetable/exceptions",
    });
  }

  /**
   * Send exception withdrawal notification to HOD
   * TEACHER -> HOD workflow
   */
  async sendExceptionWithdrawal(collegeId, teacherId, hodUserId, teacherName, exceptionDate, exceptionType, withdrawalReason) {
    const existing = await this.notificationExists(
      collegeId,
      "INDIVIDUAL",
      [hodUserId],
      "TEACHER",
      "Timetable Exception Request Withdrawn"
    );

    if (existing) {
      logger.warn("Skipping duplicate exception withdrawal notification to HOD");
      return null;
    }

    return await this.createNotification({
      college_id: collegeId,
      createdBy: teacherId,
      createdByRole: "TEACHER",
      target: "INDIVIDUAL",
      target_users: [hodUserId],
      title: "Timetable Exception Request Withdrawn",
      message: `${teacherName} withdrew a ${exceptionType} request for ${exceptionDate}. Reason: ${withdrawalReason}`,
      type: "ACADEMIC",
      actionUrl: "/hod/exception-approvals",
    });
  }
}

module.exports = new NotificationService();