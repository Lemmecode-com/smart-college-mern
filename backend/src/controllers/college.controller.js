const College = require("../models/college.model");

// COLLEGE ADMIN: View own college only
exports.getMyCollege = async (req, res) => {
  const college = await College.findById(req.college_id);
  if (!college) {
    return res.status(404).json({ message: "College not found" });
  }
  res.json(college);
};

/**
 * UPDATE COLLEGE PROFILE (ONLY COLLEGE ADMIN)
 */
exports.updateMyCollegeProfile = async (req, res) => {
  try {
    const collegeId = req.college_id;

    // Allowed fields (whitelist)
    const allowedUpdates = [
      "name",
      "code",
      "email",
      "contactNumber",
      "address",
      "establishedYear",
      "logo"
    ];

    const updates = {};

    // Pick only allowed fields
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update"
      });
    }

    const college = await College.findByIdAndUpdate(
      collegeId,
      { $set: updates },
      { new: true }
    ).select("-__v");

    if (!college) {
      return res.status(404).json({
        message: "College not found"
      });
    }

    res.json({
      message: "College profile updated successfully",
      college
    });

  } catch (error) {
    console.error("Update college profile error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
};
