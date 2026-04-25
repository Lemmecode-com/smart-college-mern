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

    // Find staff profile with user populate
    const profile = await StaffProfile.findOne({ user_id: userId })
      .populate("user_id", "name email role isActive mustChangePassword")
      .populate("college_id", "name code");

    if (!profile) {
      return next(new AppError("Staff profile not found", 404, "PROFILE_NOT_FOUND"));
    }

    // Verify college membership (collegeMiddleware already ensured req.college_id)
    if (profile.college_id._id.toString() !== req.college_id.toString()) {
      return next(new AppError("Access denied: staff belongs to different college", 403, "FORBIDDEN"));
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
 * PUT /api/staff/profile/:userId
 * Update staff profile (self or college admin)
 */
exports.updateStaffProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = { ...req.body };

    // Remove protected fields — user can't update these via profile
    delete updates.user_id;
    delete updates.college_id;
    delete updates.createdAt;

    // Find existing profile
    const profile = await StaffProfile.findOne({ user_id: userId });

    if (!profile) {
      return next(new AppError("Staff profile not found", 404, "PROFILE_NOT_FOUND"));
    }

    // Verify college membership
    if (profile.college_id.toString() !== req.college_id.toString()) {
      return next(new AppError("Access denied: staff belongs to different college", 403, "FORBIDDEN"));
    }

    // Update fields
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
