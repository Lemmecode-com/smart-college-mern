const mongoose = require("mongoose");
const Department = require("../models/department.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const ParentGuardian = require("../models/parentGuardian.model");
const AppError = require("../utils/AppError");

/**
 * Authoritative HOD department-resolution logic.
 *
 * Relationship:
 *   Authenticated HOD user  ->  Teacher profile  ->  Department where teacher is HOD
 *
 * NOTE: This does NOT trust any client-supplied college_id, department_id or
 * target_department. The authoritative source is the authenticated user's
 * Teacher record and the Department that references that teacher as hod_id.
 *
 * @param {{ userId: (string|ObjectId), collegeId: (string|ObjectId) }}
 * @returns {Promise<{ teacher: ObjectId, department: ObjectId }>}
 */
const resolveHodDepartment = async ({ userId, collegeId }) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid HOD user id", 400, "INVALID_USER_ID");
  }
 
  if (!collegeId) {
    throw new AppError(
      "College not assigned to user account. Please contact administrator.",
      403,
      "COLLEGE_NOT_ASSIGNED"
    );
  }

  const teacher = await Teacher.findOne({
    user_id: new mongoose.Types.ObjectId(userId),
    college_id: new mongoose.Types.ObjectId(collegeId),
  });

  if (!teacher) {
    throw new AppError("Teacher profile not found", 404, "TEACHER_NOT_FOUND");
  }

  const department = await Department.findOne({
    hod_id: teacher._id,
    college_id: new mongoose.Types.ObjectId(collegeId),
  });

  if (!department) {
    throw new AppError(
      "Department not found for this HOD",
      404,
      "DEPARTMENT_NOT_FOUND"
    );
  }

  return { teacher, department };
};

/**
 * Roles that an HOD may select as individual notification recipients.
 */
const HOD_ALLOWED_RECIPIENT_ROLES = ["STUDENT", "TEACHER", "HOD", "PARENT_GUARDIAN"];

/**
 * Given a list of candidate user IDs, return ONLY those that an HOD is
 * authorised to target individually:
 *   - active user
 *   - same college
 *   - allowed role
 *   - within the HOD's own department scope
 *
 * STUDENT/TEACHER/HOD recipients must be affiliated with the HOD's department.
 * PARENT_GUARDIAN recipients are authorised only when they have at least one
 * linked student in the HOD's department and the same college.
 *
 * Returns a Set of authorised user ids (stringified).
 *
 * @param {{ userIds: string[], collegeId, departmentId }}
 * @returns {Promise<Set<string>>}
 */
const getHodAuthorizedRecipientIds = async ({ userIds, collegeId, departmentId }) => {
  const collegeObjectId = new mongoose.Types.ObjectId(collegeId);
  const departmentObjectId = new mongoose.Types.ObjectId(departmentId);

  const candidateObjectIds = userIds
    .map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
    .filter((id) => id !== null);

  if (candidateObjectIds.length === 0) {
    return new Set();
  }

  // Active, same-college users with an allowed recipient role
  const users = await User.find({
    _id: { $in: candidateObjectIds },
    college_id: collegeObjectId,
    isActive: true,
    role: { $in: HOD_ALLOWED_RECIPIENT_ROLES },
  }).select("_id role").lean();

  const byRole = { STUDENT: [], TEACHER: [], HOD: [], PARENT_GUARDIAN: [] };
  users.forEach((u) => {
    if (byRole[u.role]) {
      byRole[u.role].push(u._id);
    }
  });

  const authorized = [];

  // STUDENT recipients must belong to the HOD's department
  if (byRole.STUDENT.length > 0) {
    const authorisedStudentUserIds = await Student.find({
      user_id: { $in: byRole.STUDENT },
      college_id: collegeObjectId,
      department_id: departmentObjectId,
      status: { $in: ["APPROVED", "ENROLLED"] },
    }).distinct("user_id").lean();
    authorized.push(...authorisedStudentUserIds);
  }

  // TEACHER and HOD recipients must be teachers in the HOD's department
  const teacherLikeRoles = [...byRole.TEACHER, ...byRole.HOD];
  if (teacherLikeRoles.length > 0) {
    const authorisedTeacherUserIds = await Teacher.find({
      user_id: { $in: teacherLikeRoles },
      college_id: collegeObjectId,
      department_id: departmentObjectId,
      status: "ACTIVE",
    }).distinct("user_id").lean();
    authorized.push(...authorisedTeacherUserIds);
  }

  // PARENT_GUARDIAN recipients authorised only if they link to a student in the HOD's department
  if (byRole.PARENT_GUARDIAN.length > 0) {
    const departmentStudentIds = await Student.find({
      college_id: collegeObjectId,
      department_id: departmentObjectId,
      status: { $in: ["APPROVED", "ENROLLED"] },
    }).select("_id").lean();

    const studentIdArr = departmentStudentIds.map((s) => s._id);
    if (studentIdArr.length > 0) {
      const authorisedParentUserIds = await ParentGuardian.find({
        user_id: { $in: byRole.PARENT_GUARDIAN },
        college_id: collegeObjectId,
        student_ids: { $in: studentIdArr },
      }).distinct("user_id").lean();
      authorized.push(...authorisedParentUserIds);
    }
  }

  return new Set(authorized.map((id) => String(id)));
};

module.exports = {
  HOD_ALLOWED_RECIPIENT_ROLES,
  resolveHodDepartment,
  getHodAuthorizedRecipientIds,
};
