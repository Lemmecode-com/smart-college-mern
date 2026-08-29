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

    const allPGs = await parentGuardians.find({}).toArray();
    console.log(`📊 Found ${allPGs.length} ParentGuardian records\n`);

    let fixed = 0;
    let skipped = 0;
    let deleted = 0;

    for (const pg of allPGs) {
      if (!pg.student_ids || pg.student_ids.length === 0) {
        console.log(`⏭ SKIP: PG ${pg._id} has no student_ids`);
        skipped++;
        continue;
      }

      // Find which student_ids don't exist in students collection
      const existingStudents = await students
        .find({ _id: { $in: pg.student_ids } })
        .toArray();

      const existingIds = new Set(existingStudents.map((s) => s._id.toString()));
      const validStudentIds = pg.student_ids.filter((id) => existingIds.has(id.toString()));
      const orphanedIds = pg.student_ids.filter((id) => !existingIds.has(id.toString()));

      if (orphanedIds.length === 0) {
        console.log(`✅ OK: PG ${pg._id} — all ${pg.student_ids.length} student_ids valid`);
        skipped++;
        continue;
      }

      console.log(`🔧 Fixing PG ${pg._id}:`);
      console.log(`   Orphaned student_ids: ${orphanedIds.map((id) => id.toString()).join(", ")}`);

      if (validStudentIds.length === 0) {
        // No valid students left — delete the entire PG record
        await parentGuardians.deleteOne({ _id: pg._id });
        console.log(`   🗑️  Deleted PG ${pg._id} (no valid students remaining)`);
        deleted++;
      } else {
        // Update with only valid student_ids
        await parentGuardians.updateOne(
          { _id: pg._id },
          { $set: { student_ids: validStudentIds } }
        );
        console.log(`   ✅ Updated PG ${pg._id} — kept ${validStudentIds.length} valid student_ids`);
        fixed++;
      }
    }

    console.log(`\n📈 Summary: ${fixed} fixed, ${deleted} deleted, ${skipped} unchanged`);
    await mongoose.disconnect();
    console.log("🔌 Disconnected\nDone!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
};

run();
