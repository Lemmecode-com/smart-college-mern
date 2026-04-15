const User = require("../models/user.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const auditLogService = require("../services/auditLog.service");

/**
 * Deactivate a user (COLLEGE_ADMIN only)
 * PUT /api/users/:id/deactivate
 *
 * - Cannot deactivate own account
 * - Sets user.isActive = false
 * - For TEACHER role: also sets Teacher.status = INACTIVE
 * - For STUDENT role: also sets Student.status = DEACTIVATED
 * - All active JWT tokens for this user become invalid (checked in auth middleware)
 */
exports.deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cannot deactivate own account
    if (id === req.user.id) {
      throw new AppError(
        "You cannot deactivate your own account",
        400,
        "CANNOT_DEACTIVATE_SELF",
      );
    }

    // Find the user
    const user = await User.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Already deactivated
    if (!user.isActive) {
      throw new AppError(
        "User is already deactivated",
        400,
        "USER_ALREADY_DEACTIVATED",
      );
    }

    // Deactivate the user
    user.isActive = false;
    await user.save();

    // If the user is a TEACHER, also update the Teacher model
    let teacherData = null;
    if (user.role === "TEACHER") {
      teacherData = await Teacher.findOneAndUpdate(
        { user_id: user._id, college_id: req.college_id },
        { status: "INACTIVE" },
        { new: true },
      );
    }

    // If the user is a STUDENT, also update the Student model
    let studentData = null;
    if (user.role === "STUDENT") {
      studentData = await Student.findOneAndUpdate(
        { user_id: user._id, college_id: req.college_id },
        { status: "DEACTIVATED" },
        { new: true },
      );
    }

    // 📝 Audit log - User deactivation
    const resourceType =
      user.role === "STUDENT"
        ? "Student"
        : user.role === "TEACHER"
          ? "Teacher"
          : "User";
    const entityData = studentData || teacherData || user;
    auditLogService
      .logUserDeactivate(req.user, user, req, {
        resourceType,
        name: studentData?.fullName || teacherData?.name || user.email,
      })
      .catch((err) => console.error("Audit log failed:", err));

    ApiResponse.success(
      res,
      {
        userId: user._id,
        role: user.role,
        isActive: false,
      },
      "User deactivated successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reactivate a user (COLLEGE_ADMIN only)
 * PUT /api/users/:id/reactivate
 *
 * - Sets user.isActive = true
 * - For TEACHER role: also sets Teacher.status = ACTIVE
 * - For STUDENT role: also sets Student.status = APPROVED
 */
exports.reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the user
    const user = await User.findOne({
      _id: id,
      college_id: req.college_id,
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Already active
    if (user.isActive) {
      throw new AppError("User is already active", 400, "USER_ALREADY_ACTIVE");
    }

    // Reactivate the user
    user.isActive = true;
    await user.save();

    // If the user is a TEACHER, also update the Teacher model
    let teacherData = null;
    if (user.role === "TEACHER") {
      teacherData = await Teacher.findOneAndUpdate(
        { user_id: user._id, college_id: req.college_id },
        { status: "ACTIVE" },
        { new: true },
      );
    }

    // If the user is a STUDENT, also update the Student model
    let studentData = null;
    if (user.role === "STUDENT") {
      studentData = await Student.findOneAndUpdate(
        { user_id: user._id, college_id: req.college_id },
        { status: "APPROVED" },
        { new: true },
      );
    }

    // 📝 Audit log - User reactivation
    const resourceType =
      user.role === "STUDENT"
        ? "Student"
        : user.role === "TEACHER"
          ? "Teacher"
          : "User";
    const entityData = studentData || teacherData || user;
    auditLogService
      .logUserReactivate(req.user, user, req, {
        resourceType,
        name: studentData?.fullName || teacherData?.name || user.email,
      })
      .catch((err) => console.error("Audit log failed:", err));

    ApiResponse.success(
      res,
      {
        userId: user._id,
        role: user.role,
        isActive: true,
      },
      "User reactivated successfully",
    );
  } catch (error) {
    next(error);
  }
};
