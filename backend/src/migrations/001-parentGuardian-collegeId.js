require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");

const run = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
  }

  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const parentGuardians = mongoose.connection.db.collection("parentguardians");
    const students = mongoose.connection.db.collection("students");

    const broken = await parentGuardians
      .find({ college_id: { $exists: false } })
      .toArray();

    console.log(`📊 Found ${broken.length} ParentGuardian records without college_id\n`);

    if (broken.length === 0) {
      console.log("✅ Nothing to fix. All records have college_id.");
      await mongoose.disconnect();
      return;
    }

    let fixed = 0;
    let skipped = 0;

    for (const pg of broken) {
      if (!pg.student_ids || pg.student_ids.length === 0) {
        console.log(`⏭ SKIP: PG ${pg._id} has no student_ids`);
        skipped++;
        continue;
      }

      const student = await students.findOne({
        _id: { $in: pg.student_ids },
      });

      if (student && student.college_id) {
        await parentGuardians.updateOne(
          { _id: pg._id },
          { $set: { college_id: student.college_id } }
        );
        console.log(`✅ Fixed: PG ${pg._id} → college ${student.college_id}`);
        fixed++;
      } else {
        console.log(`❌ FAIL: No college found for PG ${pg._id}`);
        skipped++;
      }
    }

    console.log(`\n📈 Summary: ${fixed} fixed, ${skipped} skipped`);
    await mongoose.disconnect();
    console.log("🔌 Disconnected\nDone!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
};

run();
