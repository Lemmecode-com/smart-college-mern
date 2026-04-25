const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: function () {
      return this.role !== "SUPER_ADMIN";
    },
  },
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: [
      "SUPER_ADMIN",
      "COLLEGE_ADMIN",
      "PRINCIPAL",
      "HOD",
      "ACCOUNTANT",
      "ADMISSION_OFFICER",
      "EXAM_COORDINATOR",
      "PARENT_GUARDIAN",
      "PLATFORM_SUPPORT",
      "TEACHER",
      "STUDENT",
    ],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
});

/* ✅ FIXED PRE-SAVE HOOK */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);
