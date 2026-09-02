const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const StaffProfile = require("../src/models/staffProfile.model");
const User = require("../src/models/user.model");

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const userId = "6a34f3747596af129142535e";
  const user = await User.findById(userId);
  console.log("User:", user?.name, "| Role:", user?.role, "| College:", user?.college_id);

  const profile = await StaffProfile.findOne({ user_id: userId });
  console.log("StaffProfile exists:", !!profile);
  if (profile) {
    console.log("Profile _id:", profile._id);
    console.log("All fields:", JSON.stringify(profile.toObject(), null, 2));
  }

  await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
