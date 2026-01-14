const College = require("../models/college.model");

/**
 * CREATE or UPDATE college profile
 * Only CollegeAdmin / Admin
 */
exports.upsertCollege = async (req, res) => {
  const { name, address, contactEmail, contactPhone, logo } = req.body;

  if (!name || !address || !contactEmail || !contactPhone) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  let college = await College.findOne();

  if (college) {
    college.name = name;
    college.address = address;
    college.contactEmail = contactEmail;
    college.contactPhone = contactPhone;
    college.logo = logo;

    await college.save();

    return res.json({
      message: "College profile updated",
      data: college
    });
  }

  college = await College.create({
    name,
    address,
    contactEmail,
    contactPhone,
    logo
  });

  res.status(201).json({
    message: "College profile created",
    data: college
  });
};

/* =========================
   GET COLLEGE PROFILE
   (ALL ROLES)
========================= */
exports.getCollegeProfile = async (req, res) => {
  const college = await College.findOne({ isActive: true });

  if (!college) {
    return res.status(404).json({
      message: "College profile not found"
    });
  }

  res.json({
    success: true,
    data: college
  });
};