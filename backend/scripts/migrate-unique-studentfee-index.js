/**
 * 🔒 SCRIPT: Migrate Unique Compound Index on StudentFee
 * Index: { college_id: 1, student_id: 1, course_id: 1 } (unique: true)
 *
 * Authoritative Business Rule: One StudentFee per student per course for entire course duration.
 *
 * Usage:
 *   node backend/scripts/migrate-unique-studentfee-index.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/smart-college";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const col = db.collection("studentfees");

  // 1. Check for duplicates on { college_id, student_id, course_id }
  const duplicates = await col
    .aggregate([
      {
        $match: {
          course_id: { $ne: null },
        },
      },
      {
        $group: {
          _id: {
            college_id: "$college_id",
            student_id: "$student_id",
            course_id: "$course_id",
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ])
    .toArray();

  if (duplicates.length > 0) {
    console.error(`\n❌ CANNOT CREATE UNIQUE INDEX: Found ${duplicates.length} duplicate groups on { college_id, student_id, course_id }:`);
    duplicates.forEach((d, i) => {
      console.error(
        `${i + 1}. Student: ${d._id.student_id} | Course: ${d._id.course_id} | Count: ${d.count} | IDs: ${d.ids.join(", ")}`,
      );
    });
    console.error("\nPlease run cleanup-duplicate-studentfees.js --apply first to resolve duplicates.\n");
    await mongoose.disconnect();
    process.exit(1);
  }

  // Check for docs where course_id is null or missing
  const nullCourseCount = await col.countDocuments({
    $or: [{ course_id: null }, { course_id: { $exists: false } }],
  });

  if (nullCourseCount > 0) {
    console.warn(`\n⚠️  WARNING: ${nullCourseCount} documents have null/missing course_id.`);
  }

  console.log("No duplicates found on { college_id, student_id, course_id }.");
  console.log("Creating unique compound index: { college_id: 1, student_id: 1, course_id: 1 }...");

  try {
    const result = await col.createIndex(
      { college_id: 1, student_id: 1, course_id: 1 },
      { unique: true, background: true, name: "college_1_student_1_course_1_unique" },
    );
    console.log(`✅ Unique index created successfully: ${result}`);
  } catch (err) {
    console.error("Index creation error:", err.message);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

