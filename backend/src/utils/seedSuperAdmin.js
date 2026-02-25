const User = require("../models/user.model");

const seedSuperAdmin = async () => {
  const exists = await User.findOne({ role: "SUPER_ADMIN" });
  if (exists) return;

  // ✅ Don't hash here - the User model pre-save hook will handle it automatically
  await User.create({
    name: "System Owner",
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD, // Plain text - will be hashed by pre-save hook
    role: "SUPER_ADMIN"
  });

  console.log("✅ Super Admin created successfully");
};

module.exports = seedSuperAdmin;
