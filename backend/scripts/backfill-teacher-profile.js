require("dotenv").config();
const mongoose = require("mongoose");

const Teacher = require("../src/models/teacher.model");
const User = require("../src/models/user.model");
const Department = require("../src/models/department.model");
const Subject = require("../src/models/subject.model");

async function backfillTeacherProfile() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const collegeId = "699c0f99cc496e694bae39c4";
    const userId = "699c21c8bb10c01ce821be29";

    const teacher = await Teacher.findOne({ user_id: userId, college_id: collegeId });
    if (!teacher) {
      console.log("❌ Teacher not found");
      process.exit(1);
    }

    console.log("🔍 Current teacher data:", {
      department_id: teacher.department_id,
      mobileNumber: teacher.mobileNumber,
      address: teacher.address,
      dateOfBirth: teacher.dateOfBirth,
      joiningDate: teacher.joiningDate,
    });

    // Backfill mobileNumber from User if missing
    if (!teacher.mobileNumber) {
      const user = await User.findById(userId).select("mobileNumber");
      if (user?.mobileNumber) {
        await Teacher.findByIdAndUpdate(teacher._id, { mobileNumber: user.mobileNumber });
        console.log("✅ Backfilled mobileNumber from User:", user.mobileNumber);
      } else {
        console.log("⚠️ User also has no mobileNumber");
      }
    } else {
      console.log("ℹ️ mobileNumber already exists:", teacher.mobileNumber);
    }

    // Backfill department_id from subjects if missing
    if (!teacher.department_id) {
      const subject = await Subject.findOne({ teacher_id: teacher._id, college_id: collegeId }).select("department_id");
      if (subject?.department_id) {
        const deptExists = await Department.findById(subject.department_id).exists();
        if (deptExists) {
          await Teacher.findByIdAndUpdate(teacher._id, { department_id: subject.department_id });
          console.log("✅ Backfilled department_id from subject:", subject.department_id);
        } else {
          console.log("⚠️ Subject's department_id references missing department:", subject.department_id);
          console.log("   Creating placeholder department record...");
          
          // Try to infer department name from course codes
          const subjectWithCourse = await Subject.findOne({ teacher_id: teacher._id, college_id: collegeId })
            .populate("course_id", "name code")
            .select("department_id");
          
          let deptName = "Unknown Department";
          let deptCode = "UNK";
          
          if (subjectWithCourse?.course_id?.code) {
            const code = subjectWithCourse.course_id.code;
            if (code.startsWith("ENG-")) {
              deptName = "Engineering";
              deptCode = "ENG";
            } else if (code.startsWith("SCI-")) {
              deptName = "Science";
              deptCode = "SCI";
            } else if (code.startsWith("COM-")) {
              deptName = "Commerce";
              deptCode = "COM";
            } else if (code.startsWith("ART-")) {
              deptName = "Arts";
              deptCode = "ART";
            }
          }
          
          const newDept = await Department.create({
            college_id: collegeId,
            name: deptName,
            code: deptCode,
            type: "ACADEMIC",
            programsOffered: ["UG"],
            startYear: new Date().getFullYear(),
            sanctionedFacultyCount: 1,
            sanctionedStudentIntake: 60,
            createdBy: userId,
          });
          
          await Teacher.findByIdAndUpdate(teacher._id, { department_id: newDept._id });
          console.log(`✅ Created placeholder department "${deptName}" (${deptCode}) and backfilled teacher`);
        }
      } else {
        console.log("⚠️ No subject found with department_id");
      }
    } else {
      console.log("ℹ️ department_id already exists:", teacher.department_id);
    }

    console.log("🎉 Migration completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

backfillTeacherProfile();
