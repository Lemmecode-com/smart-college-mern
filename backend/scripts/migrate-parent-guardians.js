require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Student = require("../src/models/student.model");
const ParentGuardian = require("../src/models/parentGuardian.model");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("DB error", error);
    process.exit(1);
  }
};

const migrateMissingParentGuardians = async () => {
  console.log("Starting migration: Missing ParentGuardian records\n");

  const parentUsers = await User.find({ role: "PARENT_GUARDIAN" }).lean();
  console.log(`Found ${parentUsers.length} PARENT_GUARDIAN users\n`);

  if (parentUsers.length === 0) {
    console.log("No parent users found. Migration complete.");
    await mongoose.disconnect();
    return;
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const parent of parentUsers) {
    try {
      const matchedStudents = await Student.find({
        $or: [
          { fatherEmail: parent.email },
          { motherEmail: parent.email },
        ],
      }).lean();

      if (matchedStudents.length === 0) {
        console.log(`  [-] ${parent.email} - no matching student found`);
        skipped++;
        continue;
      }

      const existingLink = await ParentGuardian.findOne({
        user_id: parent._id,
      });

      if (existingLink) {
        console.log(`  [=] ${parent.email} - ParentGuardian record already exists`);
        skipped++;
        continue;
      }

      let relation = "guardian";
      const studentIds = [];
      let collegeId = parent.college_id;

      for (const student of matchedStudents) {
        studentIds.push(student._id);
        if (student.fatherEmail === parent.email) relation = "father";
        if (student.motherEmail === parent.email) relation = "mother";
        if (!collegeId && student.college_id) collegeId = student.college_id;
      }

      await ParentGuardian.create({
        user_id: parent._id,
        college_id: collegeId,
        student_ids: studentIds,
        relation,
      });

      console.log(`  [+] ${parent.email} - created ParentGuardian (${relation}, ${studentIds.length} students)`);
      created++;
    } catch (error) {
      console.log(`  [x] ${parent.email} - error: ${error.message}`);
      errors++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors}`);

  await mongoose.disconnect();
};

connectDB()
  .then(() => migrateMissingParentGuardians())
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
