const mongoose = require("mongoose");
const NotificationRead = require("../models/notificationRead.model");
const AppError = require("../utils/AppError");
const ParentGuardian = require("../models/parentGuardian.model");
const Student = require("../models/student.model");

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

const getTeacherTargetCondition = ({ teacherProfile, userId }) => {
  const conditions = [
    { target: "ALL" },
    { target: "TEACHERS" },
  ];

  if (teacherProfile) {
    conditions.push(
      {
        target: "DEPARTMENT",
        target_department: teacherProfile.department_id,
      },
      {
        target: "INDIVIDUAL",
        target_users: teacherProfile.user_id,
      }
    );
  } else {
    conditions.push({
      target: "INDIVIDUAL",
      target_users: userId,
    });
  }

  return { $or: conditions };
};

const getNotificationVisibilityQuery = async ({
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
    const teacherTargetCondition = getTeacherTargetCondition({
      teacherProfile,
      userId: userObjectId,
    });

    return {
      ...baseQuery,
      $and: [
        getExpiryCondition(),
        {
          $or: [
            { createdByRole: "COLLEGE_ADMIN", ...teacherTargetCondition },
            { createdByRole: "HOD", ...teacherTargetCondition },
            {
              createdByRole: "TEACHER",
              $or: [
                { createdBy: userObjectId },
                ...(teacherProfile
                  ? [
                      { target: "ALL" },
                      { target: "TEACHERS" },
                      {
                        target: "DEPARTMENT",
                        target_department: teacherProfile.department_id,
                      },
                      {
                        target: "INDIVIDUAL",
                        target_users: teacherProfile.user_id,
                      },
                    ]
                  : [{ target: "INDIVIDUAL", target_users: userObjectId }]),
              ],
            },
          ],
        },
      ],
    };
  }

  if (normalizedRole === "HOD") {
    const adminTargetConditions = [
      { target: "ALL" },
      { target: "TEACHERS" },
      { target: "HOD" },
      ...(teacherProfile
        ? [{ target: "DEPARTMENT", target_department: teacherProfile.department_id }]
        : []),
      { target: "INDIVIDUAL", target_users: userObjectId },
    ];

    return {
      ...baseQuery,
      $and: [
        getExpiryCondition(),
        {
          $or: [
            { createdByRole: "COLLEGE_ADMIN", $or: adminTargetConditions },
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

  if (normalizedRole === "PARENT_GUARDIAN") {
    const parentGuardian = await ParentGuardian.findOne({
      user_id: userObjectId,
      college_id: toObjectId(collegeId, "College ID"),
    }).select("student_ids");

    if (
      !parentGuardian ||
      !parentGuardian.student_ids ||
      parentGuardian.student_ids.length === 0
    ) {
      return {
        ...baseQuery,
        $and: [getExpiryCondition(), { _id: null }],
      };
    }

    const linkedStudents = await Student.find({
      _id: { $in: parentGuardian.student_ids },
      college_id: toObjectId(collegeId, "College ID"),
      status: { $in: ["APPROVED", "ENROLLED"] },
    }).select("department_id course_id currentSemester");

    if (linkedStudents.length === 0) {
      return {
        ...baseQuery,
        $and: [getExpiryCondition(), { _id: null }],
      };
    }

    const conditions = [
      { target: "ALL" },
      { target: "STUDENTS" },
    ];

    linkedStudents.forEach((student) => {
      conditions.push({
        target: "DEPARTMENT",
        target_department: student.department_id,
      });
      conditions.push({
        target: "COURSE",
        target_course: student.course_id,
      });
      conditions.push({
        target: "SEMESTER",
        target_semester: student.currentSemester,
      });
    });

    conditions.push({
      target: "INDIVIDUAL",
      target_users: userObjectId,
    });

    conditions.push({
      target: "PARENTS",
    });

    return {
      ...baseQuery,
      createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER", "HOD"] },
      $and: [getExpiryCondition(), { $or: conditions }],
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
