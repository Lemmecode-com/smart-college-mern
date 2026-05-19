const mongoose = require("mongoose");
const StaffProfile = require("../models/staffProfile.model");
const User = require("../models/user.model");
const AppError = require("../utils/AppError");

/**
 * GET /api/staff/profile/:userId
 * Get staff profile by user ID (self or college admin)
 */
exports.getStaffProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    console.log(`[getStaffProfile] Request for userId: ${userId}, req.college_id: ${req.college_id}`);

    // Find staff profile with user populate
    let profile = await StaffProfile.findOne({ user_id: new mongoose.Types.ObjectId(userId) })
      .populate("user_id", "name email role isActive mustChangePassword")
      .populate("college_id", "name code");

    console.log(`[getStaffProfile] Found profile:`, profile ? { id: profile._id, user_id: profile.user_id, college_id: profile.college_id } : null);

    if (!profile) {
      console.log(`[getStaffProfile] Profile missing, creating...`);
      // Create profile on-demand if it doesn't exist
      const user = await User.findById(userId);
      console.log(`[getStaffProfile] User found:`, user ? { id: user._id, college_id: user.college_id } : null);
      if (!user) {
        console.log(`[getStaffProfile] User not found`);
        return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
      }

      // Verify college membership
      if (user.college_id.toString() !== req.college_id.toString()) {
        console.log(`[getStaffProfile] College mismatch: user.college_id=${user.college_id}, req.college_id=${req.college_id}`);
        return next(new AppError("Access denied: user belongs to different college", 403, "FORBIDDEN"));
      }

      // Create profile
      profile = await StaffProfile.create({
        user_id: userId,
        college_id: user.college_id,
        mobileNumber: "",
        designation: "",
        employmentType: "FULL_TIME",
        joiningDate: null,
        dateOfBirth: null,
        address: "",
        city: "",
        state: "",
        pincode: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyRelation: "",
        qualification: "",
        experienceYears: 0,
      });

      console.log(`[getStaffProfile] Profile created:`, profile ? { id: profile._id, user_id: profile.user_id, college_id: profile.college_id } : null);
    } else if (!profile.college_id) {
      console.log(`[getStaffProfile] Profile exists but college_id missing, updating...`);
      // Update profile with college_id
      const user = await User.findById(userId);
      if (!user) {
        console.log(`[getStaffProfile] User not found`);
        return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
      }

      if (user.college_id.toString() !== req.college_id.toString()) {
        console.log(`[getStaffProfile] College mismatch`);
        return next(new AppError("Access denied: user belongs to different college", 403, "FORBIDDEN"));
      }

      profile.college_id = user.college_id;
      await profile.save();
      console.log(`[getStaffProfile] Profile updated with college_id`);
    }

    // Populate after ensuring profile exists and is valid
    profile = await StaffProfile.findById(profile._id)
      .populate("user_id", "name email role isActive mustChangePassword")
      .populate("college_id", "name code");

    // Verify college membership
    if (profile.college_id._id.toString() !== req.college_id.toString()) {
      console.log(`[getStaffProfile] Final college check failed: profile.college_id=${profile.college_id._id}, req.college_id=${req.college_id}`);
      return next(new AppError("Access denied: staff belongs to different college", 403, "FORBIDDEN"));
    }

    console.log(`[getStaffProfile] Success, returning profile`);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error(`[getStaffProfile] Error:`, error);
    next(error);
  }
};

/**
 * PUT /api/staff/profile/:userId
 * Update staff profile (self or college admin)
 */
exports.updateStaffProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = { ...req.body };
    console.log(`[updateStaffProfile] Request for userId: ${userId}, req.college_id: ${req.college_id}, updates:`, updates);

    // Remove protected fields — user can't update these via profile
    delete updates.user_id;
    delete updates.college_id;
    delete updates.createdAt;

    // Find existing profile
    const profile = await StaffProfile.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
    console.log(`[updateStaffProfile] Found profile:`, profile ? { id: profile._id, user_id: profile.user_id, college_id: profile.college_id } : null);

    if (!profile) {
      console.log(`[updateStaffProfile] Profile not found`);
      return next(new AppError("Staff profile not found", 404, "PROFILE_NOT_FOUND"));
    }

    // Verify college membership
    if (profile.college_id.toString() !== req.college_id.toString()) {
      console.log(`[updateStaffProfile] College mismatch: profile.college_id=${profile.college_id}, req.college_id=${req.college_id}`);
      return next(new AppError("Access denied: staff belongs to different college", 403, "FORBIDDEN"));
    }

    // Update fields
    Object.assign(profile, updates);
    profile.updatedAt = Date.now();
    await profile.save();
    console.log(`[updateStaffProfile] Profile updated successfully`);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error(`[updateStaffProfile] Error:`, error);
    next(error);
  }
};

/**
 * GET /api/staff/my-profile
 * Get current logged-in staff's profile (convenience endpoint)
 */
exports.getMyStaffProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await StaffProfile.findOne({ user_id: userId })
      .populate("user_id", "name email role isActive mustChangePassword")
      .populate("college_id", "name code");

    if (!profile) {
      return res.json({
        success: true,
        data: null,
        message: "Profile not yet created",
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/staff/my-profile
 * Update current logged-in staff's profile
 */
exports.updateMyStaffProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = { ...req.body };

    delete updates.user_id;
    delete updates.college_id;
    delete updates.createdAt;

    const profile = await StaffProfile.findOne({ user_id: userId });

    if (!profile) {
      // Create profile if doesn't exist (on-demand)
      const user = await User.findById(userId);
      if (!user) {
        return next(new AppError("User not found", 404, "USER_NOT_FOUND"));
      }

      const newProfile = await StaffProfile.create({
        user_id: userId,
        college_id: user.college_id,
        ...updates,
      });

      return res.json({
        success: true,
        message: "Profile created successfully",
        data: newProfile,
      });
    }

    // Verify college membership
    if (profile.college_id.toString() !== req.college_id.toString()) {
      return next(new AppError("Access denied", 403, "FORBIDDEN"));
    }

    Object.assign(profile, updates);
    profile.updatedAt = Date.now();
    await profile.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};
