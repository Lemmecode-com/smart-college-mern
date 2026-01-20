const College = require("../models/college.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const { generateCollegeQR } = require("../utils/qrGenerator");

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
      adminPassword,
    } = req.body;

    // 1️⃣ Check college code uniqueness
    const exists = await College.findOne({ code: collegeCode });
    if (exists) {
      return res.status(400).json({ message: "College code already exists" });
    }

    // 2️⃣ Generate Registration URL + QR FIRST
    const { registrationUrl, registrationQr } =
      await generateCollegeQR(collegeCode);

    // 3️⃣ Handle logo
    const logoPath = req.file ? req.file.path : null;

    // 4️⃣ Create College WITH required fields
    const college = await College.create({
      name: collegeName,
      code: collegeCode,
      email: collegeEmail,
      contactNumber,
      address,
      establishedYear,
      logo: logoPath,
      registrationUrl,
      registrationQr
    });

    // 5️⃣ Create College Admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const collegeAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "COLLEGE_ADMIN",
      college_id: college._id,
    });

    res.status(201).json({
      message: "College and College Admin created successfully",
      college: {
        id: college._id,
        name: college.name,
        registrationUrl,
        registrationQr
      },
      collegeAdmin: {
        id: collegeAdmin._id,
        email: collegeAdmin.email
      }
    });

  } catch (error) {
    console.error(error);
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
