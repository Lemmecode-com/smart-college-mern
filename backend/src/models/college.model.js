const mongoose = require("mongoose");
const {
  validateEmail,
  emailValidatorMessage,
  validateIndianMobile,
  mobileValidatorMessage,
} = require("../utils/validators");

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
    unique: true,
    validate: {
      validator: validateEmail,
      message: emailValidatorMessage,
    },
  },
  contactNumber: {
    type: String,
    required: true,
    validate: {
      validator: validateIndianMobile,
      message: mobileValidatorMessage,
    },
  },
  address: {
    type: String,
    required: true,
  },
  establishedYear: {
    type: Number,
    required: true,
    min: [1900, "Established year must be after 1900"],
    max: [new Date().getFullYear(), "Established year cannot be in the future"],
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

// 🔒 SOFT DELETE: Cascade isActive=false to all related data when college is deactivated
collegeSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();

  // Only trigger soft delete when isActive is being set to false
  if (update.isActive === false) {
    try {
      const college = await this.model.findOne(this.getQuery());
      if (!college) {
        return;
      }

      const collegeId = college._id;
      const collegeCode = college.code;

      console.log(
        `🔒 Soft delete triggered for college: ${collegeId} (${collegeCode})`,
      );

      // Cascade soft delete to all related models in parallel
      await Promise.all([
        // 1. Deactivate departments
        mongoose
          .model("Department")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 2. Deactivate courses
        mongoose
          .model("Course")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 3. Deactivate students (set status to INACTIVE if exists, else isActive)
        mongoose
          .model("Student")
          .updateMany(
            { college_id: collegeId },
            { $set: { status: "INACTIVE" } },
          ),

        // 4. Deactivate teachers
        mongoose
          .model("Teacher")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 5. Deactivate subjects
        mongoose
          .model("Subject")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 6. Deactivate fee structures
        mongoose
          .model("FeeStructure")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 7. Deactivate student fees
        mongoose
          .model("StudentFee")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 8. Deactivate notifications
        mongoose
          .model("Notification")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 9. Deactivate timetables
        mongoose
          .model("Timetable")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 10. Deactivate timetable slots
        mongoose
          .model("TimetableSlot")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 11. Deactivate attendance sessions
        mongoose
          .model("AttendanceSession")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 12. Deactivate attendance records
        mongoose
          .model("AttendanceRecord")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),

        // 13. Deactivate document configs
        mongoose
          .model("DocumentConfig")
          .updateMany(
            { collegeCode: collegeCode },
            { $set: { isActive: false } },
          ),

        // 14. Deactivate users associated with this college
        mongoose
          .model("User")
          .updateMany({ college_id: collegeId }, { $set: { isActive: false } }),
      ]);

      console.log(`✅ Soft delete completed for college: ${collegeId}`);
    } catch (error) {
      console.error("❌ Soft delete failed:", error.message);
      throw error; // Throw error instead of calling next(error)
    }
  }
});

// 🔄 RESTORE: Cascade isActive=true when college is reactivated
collegeSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();

  // Only trigger restore when isActive is being set to true
  if (update.isActive === true) {
    try {
      const college = await this.model.findOne(this.getQuery());
      if (!college) {
        return;
      }

      const collegeId = college._id;

      console.log(`🔄 Restore triggered for college: ${collegeId}`);

      // Cascade restore to all related models in parallel
      await Promise.all([
        // 1. Activate departments
        mongoose
          .model("Department")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 2. Activate courses
        mongoose
          .model("Course")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 3. Activate students (only those who were set to INACTIVE by cascade)
        mongoose
          .model("Student")
          .updateMany(
            { college_id: collegeId, status: "INACTIVE" },
            { $set: { status: "APPROVED" } },
          ),

        // 4. Activate teachers
        mongoose
          .model("Teacher")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 5. Activate subjects
        mongoose
          .model("Subject")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 6. Activate fee structures
        mongoose
          .model("FeeStructure")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 7. Activate student fees
        mongoose
          .model("StudentFee")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 8. Activate notifications
        mongoose
          .model("Notification")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 9. Activate timetables
        mongoose
          .model("Timetable")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 10. Activate timetable slots
        mongoose
          .model("TimetableSlot")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 11. Activate attendance sessions
        mongoose
          .model("AttendanceSession")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 12. Activate attendance records
        mongoose
          .model("AttendanceRecord")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),

        // 13. Activate document configs
        mongoose
          .model("DocumentConfig")
          .updateMany(
            { collegeCode: college.code },
            { $set: { isActive: true } },
          ),

        // 14. Activate users associated with this college
        mongoose
          .model("User")
          .updateMany({ college_id: collegeId }, { $set: { isActive: true } }),
      ]);

      console.log(`✅ Restore completed for college: ${collegeId}`);
    } catch (error) {
      console.error("❌ Restore failed:", error.message);
      throw error; // Throw error instead of calling next(error)
    }
  }
});

// 🔒 CASCADE DELETE: Hard delete fallback (use with extreme caution)
// This is kept for cases where permanent deletion is truly required
collegeSchema.pre("findOneAndDelete", async function (next) {
  try {
    const collegeId = this.getQuery()._id;

    console.log(`🗑️ HARD DELETE triggered for college: ${collegeId}`);

    // Delete all related data in parallel
    await Promise.all([
      mongoose.model("Department").deleteMany({ college_id: collegeId }),
      mongoose.model("Course").deleteMany({ college_id: collegeId }),
      mongoose.model("Student").deleteMany({ college_id: collegeId }),
      mongoose.model("Teacher").deleteMany({ college_id: collegeId }),
      mongoose.model("Subject").deleteMany({ college_id: collegeId }),
      mongoose.model("FeeStructure").deleteMany({ college_id: collegeId }),
      mongoose.model("StudentFee").deleteMany({ college_id: collegeId }),
      mongoose.model("Notification").deleteMany({ college_id: collegeId }),
      mongoose.model("NotificationRead").deleteMany({ college_id: collegeId }),
      mongoose.model("Timetable").deleteMany({ college_id: collegeId }),
      mongoose.model("TimetableSlot").deleteMany({ college_id: collegeId }),
      mongoose.model("AttendanceSession").deleteMany({ college_id: collegeId }),
      mongoose.model("AttendanceRecord").deleteMany({ college_id: collegeId }),
      mongoose
        .model("DocumentConfig")
        .deleteMany({ collegeCode: this.getQuery().code }),
      mongoose.model("PromotionHistory").deleteMany({ college_id: collegeId }),
      mongoose.model("User").deleteMany({ college_id: collegeId }),
    ]);

    console.log(`✅ Hard delete completed for college: ${collegeId}`);
    next();
  } catch (error) {
    console.error("❌ Hard delete failed:", error.message);
    next(error);
  }
});

module.exports = mongoose.model("College", collegeSchema);
