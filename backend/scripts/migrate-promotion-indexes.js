/**
 * Migration Script: Add Promotion & Alumni Performance Indexes
 * 
 * Safely creates non-blocking (background) indexes to accelerate:
 * - Promotion eligibility checking
 * - Alumni eligibility evaluation
 * - Authoritative result resolution
 * - Promotion execution & fee structure lookups
 * 
 * Usage:
 *   node backend/scripts/migrate-promotion-indexes.js [--dry-run]
 */

const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const INDEX_DEFINITIONS = [
  {
    collection: "attendancerecords",
    name: "idx_att_rec_college_session_student_status",
    key: { college_id: 1, session_id: 1, student_id: 1, status: 1 },
    options: { background: true },
    purpose: "Accelerates student-scoped attendance aggregation"
  },
  {
    collection: "attendancesessions",
    name: "idx_att_sess_college_course_status_slot",
    key: { college_id: 1, course_id: 1, status: 1, slot_id: 1 },
    options: { background: true },
    purpose: "Accelerates closed session lookup for course/semester"
  },
  {
    collection: "semesterresults",
    name: "idx_sem_res_college_student_course_sem_status",
    key: { college_id: 1, student_id: 1, course_id: 1, semester: 1, status: 1 },
    options: { background: true },
    purpose: "Accelerates resolveAuthoritativeResult point lookups"
  },
  {
    collection: "backlogs",
    name: "idx_backlog_college_student_year_status",
    key: { college_id: 1, student_id: 1, academicYear: 1, status: 1 },
    options: { background: true },
    purpose: "Accelerates previous-year uncleared backlog checks"
  },
  {
    collection: "students",
    name: "idx_student_college_status_sem_name",
    key: { college_id: 1, status: 1, currentSemester: 1, fullName: 1 },
    options: { background: true },
    purpose: "Eliminates in-memory SORT on getPromotionEligibleStudents"
  },
  {
    collection: "feestructures",
    name: "idx_feestruct_college_course_cat_year",
    key: { college_id: 1, course_id: 1, category: 1, academicYear: 1 },
    options: { background: true },
    purpose: "Accelerates assignNewSemesterFee structure lookup"
  }
];

function isSameKey(key1, key2) {
  const k1 = Object.keys(key1);
  const k2 = Object.keys(key2);
  if (k1.length !== k2.length) return false;
  return k1.every((k, idx) => k === k2[idx] && key1[k] === key2[k]);
}

async function runMigration() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n=== PROMOTION & ALUMNI INDEX MIGRATION ${isDryRun ? "(DRY RUN)" : ""} ===\n`);

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is missing.");
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log("Connected to MongoDB successfully.\n");

  let createdCount = 0;
  let skippedCount = 0;

  for (const def of INDEX_DEFINITIONS) {
    const coll = db.collection(def.collection);
    const existing = await coll.indexes();

    const exists = existing.some(idx => isSameKey(idx.key, def.key));
    if (exists) {
      console.log(`[SKIP] Index already exists on [${def.collection}]:`, JSON.stringify(def.key));
      skippedCount++;
      continue;
    }

    console.log(`[TARGET] Needs index on [${def.collection}]:`);
    console.log(`   Key:     ${JSON.stringify(def.key)}`);
    console.log(`   Purpose: ${def.purpose}`);

    if (!isDryRun) {
      try {
        await coll.createIndex(def.key, {
          name: def.name,
          ...def.options
        });
        console.log(`   Status:  ✅ Successfully created in background`);
        createdCount++;
      } catch (err) {
        console.error(`   Status:  ❌ Failed to create index: ${err.message}`);
      }
    } else {
      console.log(`   Status:  ℹ️ Dry run - skipped creation`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total defined: ${INDEX_DEFINITIONS.length}`);
  console.log(`Created:       ${createdCount}`);
  console.log(`Skipped:       ${skippedCount}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

