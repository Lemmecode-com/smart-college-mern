const College = require("../models/college.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

exports.createCollege = async (req, res) => {
  try {
    const {
      collegeName,
      collegeCode,
      collegeEmail,
      contactNumber,
      address,
      establishedYear,
      adminName,
      adminEmail,
      adminPassword
    } = req.body;

    // Check college code
    const exists = await College.findOne({ code: collegeCode });
    if (exists) {
      return res.status(400).json({ message: "College code already exists" });
    }

    // Logo file
    const logoPath = req.file ? req.file.path : null;

    // 1️⃣ Create College
    const college = await College.create({
      name: collegeName,
      code: collegeCode,
      email: collegeEmail,
      contactNumber,
      address,
      establishedYear,
      logo: logoPath
    });

    // 2️⃣ Create College Admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const collegeAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "COLLEGE_ADMIN",
      college_id: college._id
    });

    res.status(201).json({
      message: "College and College Admin created successfully",
      college,
      collegeAdmin: {
        id: collegeAdmin._id,
        email: collegeAdmin.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SUPER ADMIN: View all colleges
exports.getAllColleges = async (req, res) => {
  const colleges = await College.find();
  res.json(colleges);
};

// COLLEGE ADMIN: View own college only
exports.getMyCollege = async (req, res) => {
  const college = await College.findById(req.college_id);
  if (!college) {
    return res.status(404).json({ message: "College not found" });
  }
  res.json(college);
};