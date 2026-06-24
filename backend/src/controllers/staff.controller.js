const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const User = require("../models/user.model");
const StaffProfile = require("../models/staffProfile.model");
const Teacher = require("../models/teacher.model");
const Department = require("../models/department.model");
const { ROLE } = require("../utils/constants");
const AuditService = require("../services/auditLog.service");
const { sendStaffCredentialsEmail } = require("../services/email.service");

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
       departmentId,
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

     // If role is HOD, departmentId is required
     if (role === "HOD" && (!departmentId || departmentId === "")) {
       return next(new AppError("Department is required for HOD role", 400, "MISSING_DEPARTMENT_FOR_HOD"));
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

    // ─── Conflict checks (User table + Teacher table) ───
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("A user with this email already exists", 409, "EMAIL_EXISTS"));
    }

    // For HOD role, check if a Teacher record with this email already exists
    if (role === "HOD") {
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
        return next(new AppError(
          `A teacher with this email already exists in your college. ` +
          `To promote that teacher to HOD, use the "Assign HOD" feature on the teacher's profile instead.`,
          409,
          "EMAIL_EXISTS_IN_TEACHER"
        ));
      }

      // For HOD role, check if department already has an HOD
      const departmentWithHod = await Department.findOne({
        _id: departmentId,
        college_id: req.user.college_id,
        hod_id: { $ne: null }
      });

      if (departmentWithHod) {
        return next(new AppError(
          "This department already has an HOD assigned. Please remove the current HOD first.",
          400,
          "DEPARTMENT_ALREADY_HAS_HOD"
        ));
      }
    }

    // Generate temporary password (plaintext - will be auto-hashed by User.pre-save hook)
    const tempPassword = generateTempPassword(12);

    // Generate a unique employee ID for the HOD's Teacher record
    const generateEmployeeId = async (collegeId) => {
      let empId;
      let exists = true;
      let counter = 1;
      while (exists) {
        empId = `EMP-${Date.now().toString().slice(-6)}-${String(counter).padStart(3, '0')}`;
        exists = await Teacher.exists({ college_id: collegeId, employeeId: empId });
        counter++;
      }
      return empId;
    };

// Start transaction — create User, StaffProfile, and (for HOD) Teacher together
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

      let teacher = null;

      // If role is HOD, create Teacher record required by hodMiddleware
      if (role === "HOD") {
        const employeeId = await generateEmployeeId(req.user.college_id);
        teacher = await Teacher.create(
          [
            {
              college_id: req.user.college_id,
              user_id: user[0]._id,
              department_id,
              name,
              email,
              employeeId,
              designation: designation || "Head of Department",
              qualification: qualification || "",
              experienceYears: parseInt(experienceYears) || 0,
              createdBy: req.user.id,
              // Personal details
              gender: gender || "",
              bloodGroup: bloodGroup || "",
              dateOfBirth: dateOfBirth || null,
              address: address || "",
              city: city || "",
              state: state || "",
              pincode: pincode || "",
              employmentType: employmentType || "FULL_TIME",
              mobileNumber: mobileNumber || "",
              joiningDate: joiningDate || null,
            },
          ],
          { session }
        );

        // Assign teacher's _id as HOD of the department (Teacher._id, NOT User._id)
        await Department.findByIdAndUpdate(
          departmentId,
          { hod_id: teacher[0]._id },
          { session, new: true }
        );
      }

      await session.commitTransaction();
      session.endSession();

      const staffName = name;
      let employeeIdForAudit = null;
      let departmentIdForAudit = null;

      if (role === "HOD") {
        departmentIdForAudit = departmentId;
        employeeIdForAudit = teacher[0].employeeId;
      }

      AuditService.logStaffCreated(
        req.user,
        user[0],
        role,
        departmentIdForAudit,
        employeeIdForAudit,
        req,
        staffName
      ).catch((err) => console.error("Audit log failed:", err.message));

      // Send credentials email and report delivery status (outside transaction)
      let emailResult = { success: false };
      try {
        emailResult = await sendStaffCredentialsEmail({
          to: email,
          name,
          temporaryPassword: tempPassword,
          collegeId: req.user.college_id,
        });
      } catch (err) {
        console.error("Failed to send staff credentials email:", err.message);
      }

      const message = emailResult.success
        ? "Staff account created. Credentials sent via email."
        : "Staff account created. Email delivery failed - please share the temporary password manually.";

      res.status(201).json({
        success: true,
        message,
        emailDelivered: emailResult.success,
        emailError: emailResult.success ? null : (emailResult.error || "SMTP not configured"),
        data: {
          user: {
            id: user[0]._id,
            name: user[0].name,
            email: user[0].email,
            role: user[0].role,
            college_id: user[0].college_id,
          },
          teacher: teacher ? { id: teacher[0]._id, employeeId: teacher[0].employeeId } : null,
          temporaryPassword: tempPassword, // shown only once
        },
      });
    } catch (err) {
      // Only abort if transaction hasn't been committed yet
      try {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
      } finally {
        session.endSession();
      }
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
 * PUT /api/college/staff/:id/reset-password
 * Admin reset for a staff member's password
 */
exports.resetStaffPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      college_id: req.user.college_id,
      role: { $nin: ["SUPER_ADMIN", "STUDENT"] },
      isActive: { $ne: false },
    });

    if (!user) {
      return next(new AppError("Staff member not found", 404, "STAFF_NOT_FOUND"));
    }

    const tempPassword = generateTempPassword(12);

    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    AuditService.logStaffPasswordReset(req.user, user, req)
      .catch((err) => console.error("Audit log failed:", err.message));

    // Send credentials email and report delivery status
    let emailResult = { success: false };
    try {
      emailResult = await sendStaffCredentialsEmail({
        to: user.email,
        name: user.name,
        temporaryPassword: tempPassword,
        collegeId: req.user.college_id,
      });
    } catch (err) {
      console.error("Failed to send staff credentials email:", err.message);
    }

    const message = emailResult.success
      ? "Password reset successfully. Temporary password sent to staff email."
      : "Password reset successfully. Email delivery failed - please share the temporary password manually.";

    res.json({
      success: true,
      message,
      emailDelivered: emailResult.success,
      emailError: emailResult.success ? null : (emailResult.error || "SMTP not configured"),
      data: {
        userId: user._id,
        email: user.email,
        temporaryPassword: tempPassword,
      },
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

    const previousRole = user.role;
    const previousUserFields = {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    try {
      // Update user fields if any
      const roleChanged = userFields.role && userFields.role !== previousRole;

      if (roleChanged) {
        if (id === req.user.id) {
          return next(new AppError("Cannot change your own role", 400, "SELF_ROLE_CHANGE"));
        }

        const forbiddenTargets = ["SUPER_ADMIN", "COLLEGE_ADMIN"];
        if (forbiddenTargets.includes(userFields.role)) {
          return next(new AppError(
            `You cannot assign role: ${userFields.role}`,
            403,
            "ROLE_ASSIGN_FORBIDDEN"
          ));
        }
      }

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

      if (roleChanged) {
        AuditService.logStaffRoleChange(
          req.user,
          id,
          user.name,
          previousRole,
          userFields.role,
          req
        ).catch((err) => console.error("Audit log failed:", err.message));
      }

      const changedFields = [];
      ["name", "email", "role", "isActive"].forEach((field) => {
        if (userFields[field] !== undefined && previousUserFields[field] !== userFields[field]) {
          changedFields.push(field);
        }
      });

      if (changedFields.length > 0) {
        AuditService.logStaffUpdated(req.user, id, user.name, {
          oldValues: { ...previousUserFields },
          newValues: { ...userFields },
          changedFields,
        }, req).catch((err) => console.error("Audit log failed:", err.message));
      }

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
