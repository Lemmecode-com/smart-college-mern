const mongoose = require("mongoose");
const { 
  validateEmail, 
  emailValidatorMessage,
  validateIndianMobile, 
  mobileValidatorMessage
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
      message: emailValidatorMessage
    }
  },
  contactNumber: {
    type: String,
    required: true,
    validate: {
      validator: validateIndianMobile,
      message: mobileValidatorMessage
    }
  },
  address: {
    type: String,
    required: true,
  },
  establishedYear: {
    type: Number,
    required: true,
    min: [1900, "Established year must be after 1900"],
    max: [new Date().getFullYear(), "Established year cannot be in the future"]
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

// 🔒 CASCADE DELETE: Clean up all related data when college is deleted
collegeSchema.pre('findOneAndDelete', async function(next) {
  try {
    const collegeId = this.getQuery()._id;
    
    console.log(`🗑️ Cascade delete triggered for college: ${collegeId}`);
    
    // Delete all related data in parallel
    await Promise.all([
      // 1. Delete departments
      mongoose.model('Department').deleteMany({ college_id: collegeId }),
      
      // 2. Delete courses
      mongoose.model('Course').deleteMany({ college_id: collegeId }),
      
      // 3. Delete students
      mongoose.model('Student').deleteMany({ college_id: collegeId }),
      
      // 4. Delete teachers
      mongoose.model('Teacher').deleteMany({ college_id: collegeId }),
      
      // 5. Delete subjects
      mongoose.model('Subject').deleteMany({ college_id: collegeId }),
      
      // 6. Delete fee structures
      mongoose.model('FeeStructure').deleteMany({ college_id: collegeId }),
      
      // 7. Delete student fees
      mongoose.model('StudentFee').deleteMany({ college_id: collegeId }),
      
      // 8. Delete notifications
      mongoose.model('Notification').deleteMany({ college_id: collegeId }),
      
      // 9. Delete notification reads
      mongoose.model('NotificationRead').deleteMany({ college_id: collegeId }),
      
      // 10. Delete timetables
      mongoose.model('Timetable').deleteMany({ college_id: collegeId }),
      
      // 11. Delete timetable slots
      mongoose.model('TimetableSlot').deleteMany({ college_id: collegeId }),
      
      // 12. Delete attendance sessions
      mongoose.model('AttendanceSession').deleteMany({ college_id: collegeId }),
      
      // 13. Delete attendance records
      mongoose.model('AttendanceRecord').deleteMany({ college_id: collegeId }),
      
      // 14. Delete document configs
      mongoose.model('DocumentConfig').deleteMany({ collegeCode: this.getQuery().code }),
      
      // 15. Delete promotion history
      mongoose.model('PromotionHistory').deleteMany({ college_id: collegeId }),
      
      // 16. Delete users associated with this college
      mongoose.model('User').deleteMany({ college_id: collegeId })
    ]);
    
    console.log(`✅ Cascade delete completed for college: ${collegeId}`);
    next();
  } catch (error) {
    console.error('❌ Cascade delete failed:', error.message);
    next(error);
  }
});

module.exports = mongoose.model("College", collegeSchema);