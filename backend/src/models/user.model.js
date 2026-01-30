const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  college_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    required: function () {
      return this.role !== "SUPER_ADMIN";
    }
  },
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ["SUPER_ADMIN", "COLLEGE_ADMIN", "TEACHER", "STUDENT"]
  }
});

module.exports = mongoose.model("User", userSchema);
