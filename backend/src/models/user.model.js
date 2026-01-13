const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "collegeAdmin", "teacher", "student", "parent"],
      required: true
    },
    refreshToken: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ["Active", "Blocked"],
      default: "Active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
