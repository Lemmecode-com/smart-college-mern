const mongoose = require("mongoose");
const NotificationRead = require("../models/notificationRead.model");
const AppError = require("../utils/AppError");

const toObjectId = (value, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${label} format`, 400, "INVALID_ID");
  }

  return new mongoose.Types.ObjectId(value);
};

const getExpiryCondition = () => ({
  $or: [
    { expiresAt: null },
    { expiresAt: { $gte: new Date() } },
  ],
});

const getStudentTargetCondition = ({ userId, studentProfile }) => ({
  $or: [
    { target: "ALL" },
    { target: "STUDENTS" },
    {
      target: "DEPARTMENT",
      target_department: studentProfile.department_id,
    },
    {
      target: "COURSE",
      target_course: studentProfile.course_id,
    },
    {
      target: "SEMESTER",
      target_semester: studentProfile.currentSemester,
    },
    {
      target: "INDIVIDUAL",
      target_users: toObjectId(userId, "User ID"),
    },
  ],
});

const getTeacherTargetCondition = ({ teacherProfile }) => ({
  $or: [
    { target: "ALL" },
    { target: "TEACHERS" },
    {
      target: "DEPARTMENT",
      target_department: teacherProfile.department_id,
    },
    { target: "INDIVIDUAL", target_users: teacherProfile.user_id },
  ],
});

const getNotificationVisibilityQuery = ({
  collegeId,
  role,
  userId,
  studentProfile = null,
  teacherProfile = null,
}) => {
  const userObjectId = toObjectId(userId, "User ID");
  const normalizedRole = String(role || "").toUpperCase();
  const baseQuery = {
    college_id: toObjectId(collegeId, "College ID"),
    isActive: true,
  };

  if (normalizedRole === "STUDENT") {
    if (!studentProfile) {
      throw new AppError("Student profile not found", 404, "STUDENT_PROFILE_NOT_FOUND");
    }

    return {
      ...baseQuery,
      createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] },
      $and: [
        getExpiryCondition(),
        getStudentTargetCondition({ userId, studentProfile }),
      ],
    }
  }

  if (normalizedRole === "TEACHER") {
    const teacherConditions = [
      { createdByRole: "COLLEGE_ADMIN" },
      { createdByRole: "HOD" },
    ];

    if (teacherProfile) {
      teacherConditions.push(
        getTeacherTargetCondition({ teacherProfile })
      );
    } else {
      teacherConditions.push({ target: "INDIVIDUAL", target_users: userObjectId });
    }

    return {
      ...baseQuery,
      $and: [
        getExpiryCondition(),
        { $or: teacherConditions },
      ],
    };
  }

  if (normalizedRole === "HOD") {
    return {
      ...baseQuery,
      $and: [
        getExpiryCondition(),
        {
          $or: [
            { createdByRole: "COLLEGE_ADMIN" },
            {
              createdByRole: "TEACHER",
              target: "INDIVIDUAL",
              target_users: userObjectId,
            },
            { createdByRole: "HOD", createdBy: userObjectId },
          ],
        },
      ],
    };
  }

  if (normalizedRole === "COLLEGE_ADMIN" || normalizedRole === "PRINCIPAL") {
    return {
      ...baseQuery,
      $or: [
        { createdByRole: "COLLEGE_ADMIN", createdBy: userObjectId },
        { createdByRole: "TEACHER" },
      ],
    };
  }

  throw new AppError(`Notification visibility is not available for role ${role}`, 403, "UNSUPPORTED_ROLE");
};

const getReadNotificationIds = async (userId) => {
  const reads = await NotificationRead.find({
    user_id: toObjectId(userId, "User ID"),
  }).select("notification_id");

  return reads.map((read) => read.notification_id);
};

const attachReadStatus = async (notifications, userId) => {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return notifications;
  }

  const notificationIds = notifications.map((notification) => notification._id);
  const readRecords = await NotificationRead.find({
    user_id: toObjectId(userId, "User ID"),
    notification_id: { $in: notificationIds },
  }).select("notification_id");

  const readIds = new Set(readRecords.map((read) => read.notification_id.toString()));

  return notifications.map((notification) => {
    const notificationObject = notification.toObject
      ? notification.toObject()
      : { ...notification };

    notificationObject.isRead = readIds.has(notificationObject._id.toString());

    return notificationObject;
  });
};

module.exports = {
  toObjectId,
  getNotificationVisibilityQuery,
  getReadNotificationIds,
  attachReadStatus,
};
