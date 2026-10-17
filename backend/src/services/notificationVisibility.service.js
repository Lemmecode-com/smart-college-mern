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

/**
 * HOD-created (department-scoped) conditions for a TEACHER viewer.
 *
 * HOD broadcasts (TEACHERS / DEPARTMENT / HOD) are only visible to teachers in
 * the HOD's own department (matched via createdByDepartment). INDIVIDUAL
 * targeting is honoured without a department check so that older HOD-created
 * individual notifications (e.g. timetable exception approvals that pre-date
 * createdByDepartment) keep working.
 */
const getHodScopedTeacherCondition = ({ teacherProfile, userId }) => {
  if (!teacherProfile) {
    return {
      createdByRole: "HOD",
      target: "INDIVIDUAL",
      target_users: userId,
    };
  }

  return {
    createdByRole: "HOD",
    $or: [
      { target: "INDIVIDUAL", target_users: userId },
      {
        // Broadcast targets are only visible when the HOD's department matches
        // the teacher's department (enforced via createdByDepartment).
        createdByDepartment: teacherProfile.department_id,
        $or: [
          { target: "TEACHERS" },
          { target: "DEPARTMENT", target_department: teacherProfile.department_id },
          // HOD-target broadcasts are also dept-scoped so only teachers in the
          // same department see them.
          { target: "HOD" },
        ],
      },
    ],
  };
};

/**
 * Audiences that genuinely include a COLLEGE_ADMIN / PRINCIPAL recipient.
 *
 * Only `ALL` is a college-wide announcement the admin is a member of, and
 * `INDIVIDUAL` counts only when the admin's own user id is in `target_users`
 * (handled separately, because it matches on `target_users`, not on `target`).
 *
 * Every other audience (STUDENTS, PARENTS, TEACHERS, HOD, DEPARTMENT, COURSE,
 * SEMESTER) explicitly excludes the admin. This is why a student-targeted fee
 * deadline notice such as "Fee Payment Deadline Extended" must not surface in
 * the admin's inbox / unread bell.
 */
const ADMIN_INBOX_TARGETS = ["ALL"];

const getNotificationVisibilityQuery = async ({
  collegeId,
  role,
  userId,
  studentProfile = null,
  teacherProfile = null,
  // Admin only. `true` (default) = management/outbox semantics, the admin sees
  // every notification they authored. `false` = inbox/bell semantics, the admin
  // only sees notifications whose audience actually includes them.
  includeOwnBroadcasts = true,
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

    // A student should only receive broadcast notifications created at or after
    // their eligibility date (approval). Explicitly targeted INDIVIDUAL
    // notifications are exempt from this historical restriction.
    const studentEligibilityDate = studentProfile.approvedAt || studentProfile.createdAt;

    return {
      ...baseQuery,
      $and: [
        getExpiryCondition(),
        {
          $or: [
            // Explicit individual targeting — no date restriction
            {
              target: "INDIVIDUAL",
              target_users: userObjectId,
            },
            // Broadcast targets — notification must exist at or after student eligibility
            {
              createdAt: { $gte: studentEligibilityDate },
              $or: [
                // COLLEGE_ADMIN & TEACHER: existing college-wide behavior
                {
                  createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] },
                  $or: [
                    { target: "ALL" },
                    { target: "STUDENTS" },
                    { target: "DEPARTMENT", target_department: studentProfile.department_id },
                    { target: "COURSE", target_course: studentProfile.course_id },
                    { target: "SEMESTER", target_semester: studentProfile.currentSemester },
                  ],
                },
                // HOD: department-scoped (only students in the HOD's department)
                {
                  createdByRole: "HOD",
                  createdByDepartment: studentProfile.department_id,
                  $or: [
                    { target: "STUDENTS" },
                    { target: "DEPARTMENT", target_department: studentProfile.department_id },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
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
            { createdByRole: "HOD", ...getHodScopedTeacherCondition({ teacherProfile, userId: userObjectId }) },
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
            // Own HOD notifications (HOD-created by this user). These are already
            // department-scoped at creation time, so no extra dept filter needed.
            { createdByRole: "HOD", createdBy: userObjectId },
            // HOD-created broadcasts from the same department (other HODs in the
            // same dept, or dept-scoped HOD-target notifications).
            ...(teacherProfile
              ? [
                  {
                    createdByRole: "HOD",
                    createdByDepartment: teacherProfile.department_id,
                    $or: [
                      { target: "HOD" },
                      { target: "TEACHERS" },
                      { target: "DEPARTMENT", target_department: teacherProfile.department_id },
                    ],
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }

  if (normalizedRole === "COLLEGE_ADMIN" || normalizedRole === "PRINCIPAL") {
    // An admin sees their own broadcasts in the management/outbox view, plus any
    // INDIVIDUAL notification that explicitly addresses them. INDIVIDUAL
    // notifications addressed to somebody else (e.g. a single student) are NOT
    // echoed back to the sender — being the creator is not the same as being
    // a recipient.
    //
    // Inbox/bell mode (includeOwnBroadcasts: false) additionally drops the
    // author's own non-ALL broadcasts, because audiences such as STUDENTS,
    // PARENTS, TEACHERS, HOD, DEPARTMENT, COURSE and SEMESTER do not contain
    // the admin. Without this, an admin-authored student-only fee deadline
    // notice was returned by the bell and the unread count.
    const ownBroadcastTargetCondition = includeOwnBroadcasts
      ? { $ne: "INDIVIDUAL" }
      : { $in: ADMIN_INBOX_TARGETS };

    const adminVisibility = {
      $or: [
        {
          createdByRole: "COLLEGE_ADMIN",
          createdBy: userObjectId,
          target: ownBroadcastTargetCondition,
        },
        {
          createdByRole: "COLLEGE_ADMIN",
          target: "INDIVIDUAL",
          target_users: userObjectId,
        },
        { createdByRole: "TEACHER" },
      ],
    };

    // Expired notifications must never linger in the admin inbox / unread count.
    // The management/outbox view intentionally keeps its existing behaviour.
    return {
      ...baseQuery,
      ...(includeOwnBroadcasts
        ? { $or: adminVisibility.$or }
        : { $and: [getExpiryCondition(), adminVisibility] }),
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

    const deptOids = linkedStudents.map((s) => s.department_id);
    const courseOids = linkedStudents.map((s) => s.course_id);
    const semesterValues = linkedStudents.map((s) => s.currentSemester);

    return {
      ...baseQuery,
      $and: [
        getExpiryCondition(),
        {
          $or: [
            // COLLEGE_ADMIN & TEACHER: college-wide per target rules (via linked students)
            {
              createdByRole: { $in: ["COLLEGE_ADMIN", "TEACHER"] },
              $or: [
                { target: "ALL" },
                { target: "STUDENTS" },
                { target: "PARENTS" },
                { target: "INDIVIDUAL", target_users: userObjectId },
                { target: "DEPARTMENT", target_department: { $in: deptOids } },
                { target: "COURSE", target_course: { $in: courseOids } },
                { target: "SEMESTER", target_semester: { $in: semesterValues } },
              ],
            },
            // HOD: department-scoped (only HOD broadcasts for linked students' departments)
            {
              createdByRole: "HOD",
              createdByDepartment: { $in: deptOids },
              $or: [
                { target: "STUDENTS" },
                { target: "DEPARTMENT", target_department: { $in: deptOids } },
                { target: "INDIVIDUAL", target_users: userObjectId },
              ],
            },
          ],
        },
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
