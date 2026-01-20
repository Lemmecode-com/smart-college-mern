const College = require("../models/college.model");

module.exports = async (req, res, next) => {
  try {
    // Super Admin bypasses college check
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    if (!req.user.college_id) {
      return res.status(403).json({ message: "College not assigned" });
    }

    const college = await College.findById(req.user.college_id);
    if (!college) {
      return res.status(404).json({ message: "College not found" });
    }

    if (!college.isActive) {
      return res.status(403).json({ message: "College is suspended" });
    }

    // Attach college info
    req.college = college;
    req.college_id = college._id;

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
