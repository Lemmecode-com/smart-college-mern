const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const User = require("../models/user.model");
const { ROLE } = require("../utils/constants");

/**
 * Generate a random temporary password
 */
const generateTempPassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

/**
 * POST /api/college/staff
 * Create a staff account (used by COLLEGE_ADMIN)
 */
exports.createStaff = async (req, res, next) => {
  try {
    // Only COLLEGE_ADMIN can access this endpoint (enforced by middleware)
    const { name, email, role } = req.body;

    // Validate required fields
    if (!name || !email || !role) {
      return next(new AppError("Name, email, and role are required", 400, "MISSING_FIELDS"));
    }

    // Validate role: must be a staff role that COLLEGE_ADMIN can create
    const allowedRoles = [
      ROLE.ACCOUNTANT,
      ROLE.ADMISSION_OFFICER,
      ROLE.PRINCIPAL,
      ROLE.HOD,
      ROLE.EXAM_COORDINATOR,
      ROLE.PARENT_GUARDIAN,
      ROLE.PLATFORM_SUPPORT,
      // Add other operational roles as needed
    ];

    if (!allowedRoles.includes(role)) {
      return next(
        new AppError(
          `Role ${role} cannot be created by college admin. Allowed roles: ${allowedRoles.join(", ")}`,
          403,
          "INVALID_ROLE"
        )
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("User with this email already exists", 409, "EMAIL_EXISTS"));
    }

    // Generate temporary password (plaintext - will be auto-hashed by User.pre-save hook)
    const tempPassword = generateTempPassword(12);

    // Create user - Mongoose pre-save hook will hash the password automatically
    const user = await User.create({
      name,
      email,
      password: tempPassword,
      role,
      college_id: req.user.college_id, // scoped to college admin's college
      isActive: true,
      mustChangePassword: true,
    });

    // Return credentials ONCE
    res.status(201).json({
      success: true,
      message: "Staff account created successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          college_id: user.college_id,
        },
        temporaryPassword: tempPassword, // shown only once
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/college/staff
 * List staff accounts for this college
 */
exports.listStaff = async (req, res, next) => {
  try {
    const users = await User.find({ college_id: req.user.college_id, role: { $nin: ["SUPER_ADMIN", "STUDENT"] } })
      .select("name email role isActive mustChangePassword createdAt")
      .sort({ createdAt: -1 });

    // Map users and indicate password state
    const staffList = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    }));

    res.json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
};
