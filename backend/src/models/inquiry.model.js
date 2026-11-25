const mongoose = require("mongoose");
const { validateEmail, emailValidatorMessage } = require("../utils/validators");

const inquirySchema = new mongoose.Schema(
  {
    inquiryNumber: {
      type: String,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      index: true,
      validate: {
        validator: validateEmail,
        message: emailValidatorMessage,
      },
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    institutionName: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
      index: true,
      minlength: [3, "Institution name must be at least 3 characters"],
    },
    role: {
      type: String,
      enum: ["principal", "admin", "hod", "teacher", "trustee", "other", "student", "parent"],
      default: "other",
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
    },
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "CLOSED"],
      default: "NEW",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

inquirySchema.pre("save", async function () {
  if (this.isNew && !this.inquiryNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `ENQ-${year}${month}-`;

    const lastInquiry = await this.constructor
      .findOne({ inquiryNumber: new RegExp(`^(ENQ|INQ)-${year}${month}-`) })
      .sort({ inquiryNumber: -1 })
      .select("inquiryNumber")
      .lean();

    let seq = 1;
    if (lastInquiry && lastInquiry.inquiryNumber) {
      const parts = lastInquiry.inquiryNumber.split("-");
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        seq = parsedSeq + 1;
      }
    }

    this.inquiryNumber = `${prefix}${String(seq).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Inquiry", inquirySchema);
