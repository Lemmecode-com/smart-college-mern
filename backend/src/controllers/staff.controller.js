const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const User = require("../models/user.model");
const StaffProfile = require("../models/staffProfile.model");
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
    const {
      name,
      email,
      role,
      // Extended profile fields (optional)
      mobileNumber,
      designation,
      employmentType,
      joiningDate,
      gender,
      dateOfBirth,
      bloodGroup,
      address,
      city,
      state,
      pincode,
      emergencyContactName,
      emergencyContactPhone,
      emergencyRelation,
      qualification,
      experienceYears,
    } = req.body;

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
      ROLE.PLATFORM_SUPPORT,
      // Note: ROLE.PARENT_GUARDIAN removed - parents are created automatically during student approval
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

    // Start transaction — create User and StaffProfile together
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Create user - Mongoose pre-save hook will hash the password automatically
      const user = await User.create(
        [
          {
            name,
            email,
            password: tempPassword,
            role,
            college_id: req.user.college_id, // scoped to college admin's college
            isActive: true,
            mustChangePassword: true,
          },
        ],
        { session }
      );

      // Create staff profile with extended fields
      const staffProfile = await StaffProfile.create(
        [
          {
            user_id: user[0]._id,
            college_id: req.user.college_id,
            mobileNumber: mobileNumber || "",
            designation: designation || "",
            employmentType: employmentType || "FULL_TIME",
            joiningDate: joiningDate || null,
            gender: gender || "",
            dateOfBirth: dateOfBirth || null,
            bloodGroup: bloodGroup || "",
            address: address || "",
            city: city || "",
            state: state || "",
            pincode: pincode || "",
            emergencyContactName: emergencyContactName || "",
            emergencyContactPhone: emergencyContactPhone || "",
            emergencyRelation: emergencyRelation || "",
            qualification: qualification || "",
             experienceYears: parseInt(experienceYears) || 0,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Return credentials ONCE
      res.status(201).json({
        success: true,
        message: "Staff account created successfully",
        data: {
          user: {
            id: user[0]._id,
            name: user[0].name,
            email: user[0].email,
            role: user[0].role,
            college_id: user[0].college_id,
          },
          temporaryPassword: tempPassword, // shown only once
        },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
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
    const users = await User.find({
      college_id: req.user.college_id,
      role: { $nin: ["SUPER_ADMIN", "STUDENT"] },
    })
      .select("name email role isActive mustChangePassword createdAt")
      .sort({ createdAt: -1 });

    // Get all staff profiles for these users in one query
    const userIds = users.map((u) => u._id);
    const profiles = await StaffProfile.find({ user_id: { $in: userIds } }).select(
      "user_id mobileNumber designation employmentType"
    );

    // Create lookup map
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user_id.toString()] = p;
    });

    // Merge data
    const staffList = users.map((user) => {
      const profile = profileMap[user._id.toString()] || {};
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
        // Profile fields (may be empty)
        mobileNumber: profile.mobileNumber || "",
        designation: profile.designation || "",
        employmentType: profile.employmentType || "FULL_TIME",
      };
    });

    res.json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/college/staff/:id
 * Get individual staff profile details
 */
exports.getStaffProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the user
    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: { $nin: ["SUPER_ADMIN", "STUDENT"] },
    });

    if (!user) {
      return next(new AppError("Staff member not found", 404, "STAFF_NOT_FOUND"));
    }

    // Find the staff profile
    const profile = await StaffProfile.findOne({
      user_id: id,
      college_id: req.user.college_id,
    });

    // Combine user and profile data
    const staffData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      // Profile fields (may be empty)
      mobileNumber: profile?.mobileNumber || "",
      designation: profile?.designation || "",
      employmentType: profile?.employmentType || "FULL_TIME",
      joiningDate: profile?.joiningDate || null,
      gender: profile?.gender || "",
      dateOfBirth: profile?.dateOfBirth || null,
      bloodGroup: profile?.bloodGroup || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
      emergencyContactName: profile?.emergencyContactName || "",
      emergencyContactPhone: profile?.emergencyContactPhone || "",
      emergencyRelation: profile?.emergencyRelation || "",
      qualification: profile?.qualification || "",
      experienceYears: profile?.experienceYears || 0,
    };

    res.json({
      success: true,
      data: staffData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/college/staff/:id
 * Update staff profile details
 */
exports.updateStaffProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the user first to verify ownership
    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: { $nin: ["SUPER_ADMIN", "STUDENT"] },
    });

    if (!user) {
      return next(new AppError("Staff member not found", 404, "STAFF_NOT_FOUND"));
    }

    // Separate user fields from profile fields
    const userFields = {};
    const profileFields = {};

    // Define which fields belong to User vs StaffProfile
    const userFieldNames = ['name', 'email', 'role', 'isActive'];
    const profileFieldNames = [
      'mobileNumber', 'designation', 'employmentType', 'joiningDate',
      'gender', 'dateOfBirth', 'bloodGroup', 'address', 'city', 'state', 'pincode',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyRelation',
      'qualification', 'experienceYears'
    ];

    // Split the data
    Object.keys(updateData).forEach(key => {
      if (userFieldNames.includes(key)) {
        userFields[key] = updateData[key];
      } else if (profileFieldNames.includes(key)) {
        profileFields[key] = updateData[key];
      }
    });

    // Start transaction for atomic updates
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Update user fields if any
      if (Object.keys(userFields).length > 0) {
        await User.findByIdAndUpdate(id, userFields, { session, new: true });
      }

      // Update or create staff profile
      await StaffProfile.findOneAndUpdate(
        { user_id: id, college_id: req.user.college_id },
        { ...profileFields, user_id: id, college_id: req.user.college_id },
        { session, upsert: true, new: true }
      );

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: "Staff profile updated successfully",
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (error) {
    next(error);
  }
};
