const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

const seedSuperAdmin = async () => {
  const exists = await User.findOne({ role: "SUPER_ADMIN" });
  if (exists) return;

  const hashedPassword = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD,
    10
  );

  await User.create({
    name: "System Owner",
    email: process.env.SUPER_ADMIN_EMAIL,
    password: hashedPassword,
    role: "SUPER_ADMIN"
  });

  console.log("Super Admin created");
};

module.exports = seedSuperAdmin;
