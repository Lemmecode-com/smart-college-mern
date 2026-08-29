/**
 * Migration: Replace status-blind timetable unique indexes with status-aware
 * partial unique indexes.
 *
 * PROBLEM:
 *   The old compound unique index on
 *   (college_id, department_id, course_id, semester, academicYear, division)
 *   treated ARCHIVED timetables as active. Once a timetable was archived,
 *   no new timetable could be created for the same academic context —
 *   permanently blocking the HOD.
 *
 * FIX:
 *   New partial unique indexes only enforce uniqueness for DRAFT/PUBLISHED
 *   timetables. ARCHIVED timetables are excluded from the index, so they
 *   never block creation of a new active timetable.
 *
 * RUN:
 *   node backend/src/scripts/migrate-timetable-partial-indexes.js
 *
 * IDEMPOTENT: safe to run multiple times.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const OLD_INDEXES = [
  "college_id_1_department_id_1_course_id_1_semester_1_academicYear_1_division_1",
  "college_id_1_department_id_1_course_id_1_semester_1_academicYear_1",
];

const NEW_INDEXES = [
  {
    key: {
      college_id: 1,
      department_id: 1,
      course_id: 1,
      semester: 1,
      academicYear: 1,
      division: 1,
    },
    options: {
      unique: true,
      partialFilterExpression: {
        division: { $type: "string" },
        status: { $in: ["DRAFT", "PUBLISHED"] },
      },
      name: "uniq_active_timetable_with_division",
    },
  },
  {
    key: {
      college_id: 1,
      department_id: 1,
      course_id: 1,
      semester: 1,
      academicYear: 1,
    },
    options: {
      unique: true,
      partialFilterExpression: {
        division: null,
        status: { $in: ["DRAFT", "PUBLISHED"] },
      },
      name: "uniq_active_timetable_no_division",
    },
  },
];

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const collection = mongoose.connection.db.collection("timetables");

  // 1. Drop old status-blind unique indexes (if they exist)
  for (const name of OLD_INDEXES) {
    try {
      await collection.dropIndex(name);
      console.log(`Dropped old index: ${name}`);
    } catch (err) {
      // Index may not exist (already migrated) — that's fine
      console.log(`Skip drop "${name}": ${err.codeName || err.message}`);
    }
  }

  // 2. Create new status-aware partial unique indexes
  for (const { key, options } of NEW_INDEXES) {
    try {
      await collection.createIndex(key, options);
      console.log(`Created new index: ${options.name}`);
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        // Index already exists with same name or options
        console.log(`Index already exists: ${options.name}`);
      } else {
        throw err;
      }
    }
  }

  // 3. Report final index state
  const indexes = await collection.indexes();
  console.log("\nCurrent timetable indexes:");
  for (const idx of indexes) {
    console.log(
      `  - ${idx.name}: ${JSON.stringify(idx.key)}` +
        (idx.unique ? " UNIQUE" : "") +
        (idx.partialFilterExpression
          ? ` PARTIAL(${JSON.stringify(idx.partialFilterExpression)})`
          : "") +
        (idx.sparse ? " SPARSE" : ""),
    );
  }

  await mongoose.disconnect();
  console.log("\nMigration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
