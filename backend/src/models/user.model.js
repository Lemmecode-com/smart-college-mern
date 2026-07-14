const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { validateEmail, emailValidatorMessage } = require("../utils/validators");
const StaffProfile = require("./staffProfile.model");

const userSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: function () {
      return this.role !== "SUPER_ADMIN";
    },
  },
  name: String,
  email: {
    type: String,
    unique: true,
    validate: {
      validator: validateEmail,
      message: emailValidatorMessage,
    },
  },
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
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
  },
  tokenVersion: {
    type: Number,
    default: 0,
    index: true,
  },
});

userSchema.post("save", async function (doc) {
  const staffRoles = [
    "COLLEGE_ADMIN",
    "PRINCIPAL",
    "HOD",
    "ACCOUNTANT",
    "ADMISSION_OFFICER",
    "EXAM_COORDINATOR",
    "PLATFORM_SUPPORT",
  ];
  if (!staffRoles.includes(doc.role)) return;
  try {
    const existing = await StaffProfile.exists({ user_id: doc._id });
    if (!existing) {
      await StaffProfile.create([{ user_id: doc._id, college_id: doc.college_id }]);
    }
  } catch (err) {
    if (err.code !== 11000) console.error("[User hook] StaffProfile creation failed:", err.message);
  }
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User", userSchema);
