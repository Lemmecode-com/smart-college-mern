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
      enum: ["NEW", "CONTACTED", "CLOSED", "CONVERTED"],
      default: "NEW",
      index: true,
    },
    convertedCollegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null,
      index: true,
    },
    convertedAt: {
      type: Date,
      default: null,
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

    // Fetch all existing inquiry numbers for current month to find the true numerical max sequence
    // (Note: Lexicographical sort fails because 'INQ-' > 'ENQ-' in ASCII)
    const existingInquiries = await this.constructor
      .find({ inquiryNumber: new RegExp(`^(ENQ|INQ)-${year}${month}-(\\d+)`) })
      .select("inquiryNumber")
      .lean();

    let maxSeq = 0;
    for (const inq of existingInquiries) {
      if (inq.inquiryNumber) {
        const parts = inq.inquiryNumber.split("-");
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    let seq = maxSeq + 1;
    let candidateNumber = `${prefix}${String(seq).padStart(4, "0")}`;

    // Guarantee uniqueness in case of race condition or existing keys
    while (await this.constructor.exists({ inquiryNumber: candidateNumber })) {
      seq += 1;
      candidateNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    }

    this.inquiryNumber = candidateNumber;
  }
});

module.exports = mongoose.model("Inquiry", inquirySchema);
