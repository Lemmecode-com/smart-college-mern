const mongoose = require("mongoose");

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  contactNumber: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  establishedYear: {
    type: Number,
    required: true,
  },
  logo: {
    type: String, // file path or URL
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  registrationUrl: {
    type: String,
    required: true,
  },
  registrationQr: {
    type: String, // file path of QR image
    required: true,
  },
});

module.exports = mongoose.model("College", collegeSchema);
