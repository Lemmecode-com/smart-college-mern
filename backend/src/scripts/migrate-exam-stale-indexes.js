/**
 * Migration: Drop stale unique index `idx_exam_college_code_unique` from the
 * `exams` collection.
 *
 * PROBLEM:
 *   The current Exam schema (`backend/src/models/exam.model.js`) no longer has
 *   a `code` field, but MongoDB still has a unique compound index on
 *   `{college_id: 1, code: 1}`. Because every new Exam document is inserted
 *   with `code: null` (missing), MongoDB treats them as duplicates and blocks
 *   the second insert for the same college with error 11000.
 *
 *   The global error handler maps the first key in `keyValue` to the error
 *   message, producing the misleading frontend message:
 *     "college_id already exists"
 *
 * FIX:
 *   Drop the stale unique index. This allows multiple Exams to be created
 *   for the same college, which matches the current schema and business rules.
 *
 * RUN:
 *   node backend/src/scripts/migrate-exam-stale-indexes.js
 *
 * IDEMPOTENT: safe to run multiple times.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const STALE_UNIQUE_INDEX = "idx_exam_college_code_unique";

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const collection = mongoose.connection.db.collection("exams");

  // 1. Drop the stale unique index (if it exists)
  try {
    await collection.dropIndex(STALE_UNIQUE_INDEX);
    console.log(`Dropped stale unique index: ${STALE_UNIQUE_INDEX}`);
  } catch (err) {
    if (err.codeName === "IndexNotFound") {
      console.log(`Skip drop "${STALE_UNIQUE_INDEX}": index does not exist`);
    } else {
      throw err;
    }
  }

  // 2. Report all current indexes and flag stale non-unique indexes that
  //    reference fields no longer present in the current Exam schema.
  const indexes = await collection.indexes();
  console.log("\nCurrent Exam indexes:");
  const schemaFields = ["college_id", "name", "course_id", "semester", "academicYear", "subjects", "status", "createdBy", "updatedBy"];
  const staleFields = ["code", "department_id", "examType", "examDate", "isActive"];

  for (const idx of indexes) {
    const keyFields = Object.keys(idx.key);
    const referencesStaleField = keyFields.some((f) => staleFields.includes(f));

    let suffix = "";
    if (referencesStaleField) {
      suffix = "  [STALE — references removed field(s)]";
    }

    console.log(
      `  - ${idx.name}: ${JSON.stringify(idx.key)}` +
        (idx.unique ? " UNIQUE" : "") +
        suffix,
    );
  }

  if (indexes.some((idx) => Object.keys(idx.key).some((f) => staleFields.includes(f)))) {
    console.log(
      "\nNOTE: Non-unique stale indexes above do not block inserts, but should be" +
        " reviewed and dropped if the referenced fields are permanently removed.",
    );
  }

  await mongoose.disconnect();
  console.log("\nMigration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
