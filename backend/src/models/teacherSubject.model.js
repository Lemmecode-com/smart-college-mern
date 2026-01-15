const mongoose = require("mongoose");

const teacherSubjectSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate assignment
teacherSubjectSchema.index(
  { teacherId: 1, subjectId: 1 },
  { unique: true }
);

module.exports = mongoose.model("TeacherSubject", teacherSubjectSchema);
