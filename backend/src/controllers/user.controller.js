const User = require("../models/user.model");

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" })
      .select("_id name email");

    res.json({
      success: true,
      data: teachers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
