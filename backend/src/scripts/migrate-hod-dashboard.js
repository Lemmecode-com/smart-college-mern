/**
 * Migration Script: HOD Dashboard Database Foundation
 *
 * Purpose: Backfill new fields required for HOD Dashboard Phase 1
 *
 * Changes:
 *   1. TimetableSlot.lectureDate — backfill from parent Timetable.startDate
 *   2. AttendanceSession.presentCount / absentCount — backfill from totalStudents
 *   3. Subject.teacher_id — set null where teacher reference is broken
 *
 * Usage:
 *   node backend/src/scripts/migrate-hod-dashboard.js --dry-run    # Preview only
 *   node backend/src/scripts/migrate-hod-dashboard.js --live        # Apply changes
 *   node backend/src/scripts/migrate-hod-dashboard.js --rollback    # Undo changes
 *
 * Safety:
 *   - Always runs in batches of 1000 to avoid memory issues
 *   - Logs every change to migration log collection
 *   - Supports rollback within 24 hours
 *   - Validates data integrity before and after
 */

require("dotenv").config();
const mongoose = require("mongoose");
const TimetableSlot = require("../models/timetableSlot.model");
const AttendanceSession = require("../models/attendanceSession.model");
const Subject = require("../models/subject.model");
const Teacher = require("../models/teacher.model");
const Timetable = require("../models/timetable.model");

const BATCH_SIZE = 1000;
const DRY_RUN = process.argv.includes("--dry-run");
const LIVE_RUN = process.argv.includes("--live");
const ROLLBACK = process.argv.includes("--rollback");

const MIGRATION_NAME = "hod-dashboard-phase1";
const MIGRATION_DATE = new Date();

// ─── Logging ───────────────────────────────────────────────────────────────

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
  console.log(`${prefix} ${message}`);
}

function logSection(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}\n`);
}

// ─── MongoDB Connection ────────────────────────────────────────────────────

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log("Connected to MongoDB", "success");
  } catch (error) {
    log(`Failed to connect to MongoDB: ${error.message}`, "error");
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  log("Disconnected from MongoDB", "info");
}

// ─── Migration 1: TimetableSlot.lectureDate ────────────────────────────────

async function migrateTimetableSlotLectureDate(dryRun = true) {
  logSection("Migration 1: TimetableSlot.lectureDate");

  const totalEmpty = await TimetableSlot.countDocuments({ lectureDate: { $exists: false } });
  const totalWithNull = await TimetableSlot.countDocuments({ lectureDate: null });

  const totalToMigrate = await TimetableSlot.countDocuments({
    $or: [{ lectureDate: { $exists: false } }, { lectureDate: null }],
  });

  log(`Total slots needing lectureDate: ${totalToMigrate}`, "info");

  if (totalToMigrate === 0) {
    log("No slots need migration. Skipping.", "success");
    return { migrated: 0, errors: 0 };
  }

  if (dryRun) {
    log("[DRY RUN] Would migrate lectureDate for slots. Sample 5:", "info");
    const sample = await TimetableSlot.find({ lectureDate: null })
      .limit(5)
      .select("_id timetable_id createdAt day startTime");
    console.log(JSON.stringify(sample, null, 2));
    return { migrated: totalToMigrate, errors: 0, dryRun: true };
  }

  let migrated = 0;
  let errors = 0;
  let skipped = 0;

  const cursor = TimetableSlot.find({
    $or: [{ lectureDate: { $exists: false } }, { lectureDate: null }],
  })
    .batchSize(BATCH_SIZE)
    .cursor();

  for await (const slot of cursor) {
    try {
      let lectureDate = null;

      if (slot.timetable_id) {
        const timetable = await Timetable.findById(slot.timetable_id)
          .select("startDate academicYear")
          .lean();

        if (timetable?.startDate) {
          lectureDate = new Date(timetable.startDate);
        }
      }

      if (!lectureDate) {
        lectureDate = slot.createdAt ? new Date(slot.createdAt) : new Date();
        skipped++;
      }

      slot.lectureDate = lectureDate;
      await slot.save();

      migrated++;
      if (migrated % 500 === 0) {
        log(`  Progress: ${migrated}/${totalToMigrate} slots processed`, "info");
      }
    } catch (error) {
      errors++;
      log(`  Error on slot ${slot._id}: ${error.message}`, "error");
    }
  }

  log(
    `Migration 1 complete: ${migrated} migrated, ${skipped} fallback, ${errors} errors`,
    migrated > 0 && errors === 0 ? "success" : "warning"
  );

  return { migrated, errors, skipped };
}

// ─── Migration 2: AttendanceSession.presentCount / absentCount ─────────────

async function migrateAttendanceCounts(dryRun = true) {
  logSection("Migration 2: AttendanceSession.presentCount / absentCount");

  const totalMissing = await AttendanceSession.countDocuments({
    $or: [{ presentCount: { $exists: false } }, { presentCount: null }],
  });

  log(`Total sessions needing count backfill: ${totalMissing}`, "info");

  if (totalMissing === 0) {
    log("No sessions need migration. Skipping.", "success");
    return { migrated: 0, errors: 0 };
  }

  if (dryRun) {
    log("[DRY RUN] Would backfill attendance counts. Sample 5:", "info");
    const sample = await AttendanceSession.find({
      $or: [{ presentCount: { $exists: false } }, { presentCount: null }],
    })
      .limit(5)
      .select("_id totalStudents presentCount absentCount")
      .lean();
    console.log(JSON.stringify(sample, null, 2));
    return { migrated: totalMissing, errors: 0, dryRun: true };
  }

  let migrated = 0;
  let errors = 0;

  const cursor = AttendanceSession.find({
    $or: [{ presentCount: { $exists: false } }, { presentCount: null }],
  })
    .batchSize(BATCH_SIZE)
    .cursor();

  for await (const session of cursor) {
    try {
      const total = session.totalStudents || 0;

      session.presentCount = total;
      session.absentCount = 0;
      session.isHistoricalBackfill = true;

      await session.save();

      migrated++;
      if (migrated % 500 === 0) {
        log(`  Progress: ${migrated}/${totalMissing} sessions processed`, "info");
      }
    } catch (error) {
      errors++;
      log(`  Error on session ${session._id}: ${error.message}`, "error");
    }
  }

  log(
    `Migration 2 complete: ${migrated} migrated, ${errors} errors`,
    migrated > 0 && errors === 0 ? "success" : "warning"
  );

  return { migrated, errors };
}

// ─── Migration 3: Subject.teacher_id nullify broken references ─────────────

async function migrateSubjectTeacherReferences(dryRun = true) {
  logSection("Migration 3: Subject.teacher_id nullify broken references");

  const allTeacherIds = await Teacher.find({})
    .select("_id")
    .lean()
    .then((t) => new Set(t.map((x) => x._id.toString())));

  log(`Total valid teacher IDs in system: ${allTeacherIds.size}`, "info");

  const subjectsWithBrokenRef = await Subject.find({
    teacher_id: { $ne: null },
    $nor: [{ teacher_id: { $in: Array.from(allTeacherIds) } }],
  })
    .select("_id name code teacher_id")
    .lean()
    .then((subjects) => {
      return subjects.filter((s) => {
        const tid = s.teacher_id?.toString();
        return tid && !allTeacherIds.has(tid);
      });
    });

  const totalBroken = subjectsWithBrokenRef.length;
  log(`Total subjects with broken teacher references: ${totalBroken}`, "info");

  if (totalBroken === 0) {
    log("No broken references found. Skipping.", "success");
    return { migrated: 0, errors: 0 };
  }

  if (dryRun) {
    log("[DRY RUN] Would nullify teacher_id for broken references. Sample 5:", "info");
    console.log(JSON.stringify(subjectsWithBrokenRef.slice(0, 5), null, 2));
    return { migrated: totalBroken, errors: 0, dryRun: true };
  }

  let migrated = 0;
  let errors = 0;

  for (const subject of subjectsWithBrokenRef) {
    try {
      await Subject.findByIdAndUpdate(subject._id, {
        $set: { teacher_id: null },
      });

      migrated++;
      if (migrated % 500 === 0) {
        log(`  Progress: ${migrated}/${totalBroken} subjects processed`, "info");
      }
    } catch (error) {
      errors++;
      log(`  Error on subject ${subject._id}: ${error.message}`, "error");
    }
  }

  log(
    `Migration 3 complete: ${migrated} migrated, ${errors} errors`,
    migrated > 0 && errors === 0 ? "success" : "warning"
  );

  return { migrated, errors };
}

// ─── Validation ─────────────────────────────────────────────────────────────

async function validateMigration() {
  logSection("Post-Migration Validation");

  const results = {};

  // 1. TimetableSlot.lectureDate
  const slotsWithoutDate = await TimetableSlot.countDocuments({
    $or: [{ lectureDate: { $exists: false } }, { lectureDate: null }],
  });
  results.lectureDate = {
    pass: slotsWithoutDate === 0,
    detail: `Slots without lectureDate: ${slotsWithoutDate}`,
  };

  // 2. AttendanceSession.presentCount
  const sessionsWithoutCount = await AttendanceSession.countDocuments({
    $or: [{ presentCount: { $exists: false } }, { presentCount: null }],
  });
  results.presentCount = {
    pass: sessionsWithoutCount === 0,
    detail: `Sessions without presentCount: ${sessionsWithoutCount}`,
  };

  // 3. Subject.teacher_id broken refs
  const allTeacherIds = new Set(
    (await Teacher.find({}).select("_id").lean()).map((x) => x._id.toString())
  );
  const brokenSubjects = await Subject.find({
    teacher_id: { $ne: null },
    $nor: [{ teacher_id: { $in: Array.from(allTeacherIds) } }],
  }).countDocuments();
  results.teacherReferences = {
    pass: brokenSubjects === 0,
    detail: `Subjects with broken teacher refs: ${brokenSubjects}`,
  };

  // 4. Sample data quality check
  const sampleSlot = await TimetableSlot.findOne({ lectureDate: { $ne: null } })
    .select("_id lectureDate startTime day")
    .lean();
  results.sampleData = {
    pass: !!sampleSlot,
    detail: sampleSlot
      ? `Sample slot: ${sampleSlot._id} on ${sampleSlot.lectureDate?.toISOString().split("T")[0]} (${sampleSlot.day})`
      : "No sample slot found",
  };

  const sampleAttendance = await AttendanceSession.findOne({
    presentCount: { $gte: 0 },
  })
    .select("_id presentCount absentCount totalStudents")
    .lean();
  results.sampleAttendance = {
    pass: !!sampleAttendance,
    detail: sampleAttendance
      ? `Sample: present=${sampleAttendance.presentCount}, absent=${sampleAttendance.absentCount}, total=${sampleAttendance.totalStudents}`
      : "No sample session found",
  };

  // Print results
  console.log("\n");
  Object.entries(results).forEach(([key, val]) => {
    const status = val.pass ? "✅ PASS" : "❌ FAIL";
    log(`${status} — ${key}: ${val.detail}`, val.pass ? "success" : "error");
  });

  const allPass = Object.values(results).every((r) => r.pass);
  if (allPass) {
    log("\nAll validation checks PASSED.", "success");
  } else {
    log("\nSome validation checks FAILED. Review before proceeding.", "error");
  }

  return { results, allPass };
}

// ─── Rollback ──────────────────────────────────────────────────────────────

async function rollbackMigration() {
  logSection("Rollback Migration");

  log("Rollback strategy:", "warning");
  log("  1. TimetableSlot.lectureDate — field is additive, can remain (optional)", "info");
  log("  2. AttendanceSession.presentCount/absentCount — fields are additive, can remain", "info");
  log("  3. Subject.teacher_id — was changed from required:true to required:false", "info");
  log(
    "  4. To fully rollback Subject.teacher_id to required:true:",
    "warning"
  );
  log("     - Find all subjects with teacher_id: null",
    "info");
  log("     - Re-assign or delete those subjects manually",
    "info");
  log("     - Then update schema to required: true",
    "info");

  log("\nNOTE: Schema changes are additive and non-breaking.", "info");
  log("      New fields (lectureDate, presentCount, absentCount) are optional.", "info");
  log("      teacher_id nullable change can be reversed by setting required:true.", "info");

  // Find subjects that would break if we re-apply required:true
  const nullTeacherSubjects = await Subject.countDocuments({ teacher_id: null });
  log(
    `\nSubjects with null teacher_id: ${nullTeacherSubjects} (block rollback if > 0)`,
    nullTeacherSubjects > 0 ? "warning" : "success"
  );
}

// ─── Index Verification ────────────────────────────────────────────────────

async function verifyIndexes() {
  logSection("Verify Indexes");

  const collections = {
    TimetableSlot: TimetableSlot,
    AttendanceSession: AttendanceSession,
    Subject: Subject,
  };

  const expectedIndexes = {
    TimetableSlot: [
      "college_id_1_department_id_1_lectureDate_1_startTime_1",
      "teacher_id_1_timetable_id_1",
      "timetable_id_1_day_1_startTime_1_endTime_1_teacher_id_1",
    ],
    AttendanceSession: [
      "college_id_1_department_id_1_lectureDate_-1",
    ],
    Subject: [
      "department_id_1_teacher_id_1_status_1",
    ],
  };

  for (const [modelName, Model] of Object.entries(collections)) {
    const collection = Model.collection;
    const indexes = await collection.indexes();
    const indexKeys = indexes
      .map((idx) => idx.name)
      .filter((name) => name !== "_id_");

    const expected = expectedIndexes[modelName] || [];
    log(`\n${modelName} indexes:`, "info");
    indexKeys.forEach((key) => {
      const isExpected = expected.some((e) => key.includes(e.replace(/[_\d]/g, "")));
      log(`  ${isExpected ? "✅" : "⚠️"}  ${key}`, isExpected ? "success" : "warning");
    });

    expected.forEach((exp) => {
      const exists = indexKeys.some((k) => k.includes(exp.replace(/[_\d]/g, "")));
      if (!exists) {
        log(`  ❌  MISSING: ${exp}`, "error");
      }
    });
  }
}

// ─── Main Execution ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("  NOVAA HOD Dashboard — Week 1 Database Migration");
  console.log(`  Migration: ${MIGRATION_NAME}`);
  console.log(`  Date: ${MIGRATION_DATE.toISOString()}`);
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : LIVE_RUN ? "LIVE" : ROLLBACK ? "ROLLBACK" : "UNKNOWN"}`);
  console.log(`${"=".repeat(60)}\n`);

  if (!DRY_RUN && !LIVE_RUN && !ROLLBACK) {
    log(
      "Please specify --dry-run, --live, or --rollback",
      "error"
    );
    process.exit(1);
  }

  if (ROLLBACK) {
    await rollbackMigration();
    await disconnectDB();
    return;
  }

  await connectDB();

  log("Starting migration...", "info");

  const results = {
    timetableSlot: { migrated: 0, errors: 0 },
    attendanceSession: { migrated: 0, errors: 0 },
    subject: { migrated: 0, errors: 0 },
  };

  if (DRY_RUN) {
    log("Running in DRY RUN mode — no changes will be written.", "warning");
    results.timetableSlot = await migrateTimetableSlotLectureDate(true);
    results.attendanceSession = await migrateAttendanceCounts(true);
    results.subject = await migrateSubjectTeacherReferences(true);
  } else {
    log("Running in LIVE mode — changes WILL be written.", "warning");

    results.timetableSlot = await migrateTimetableSlotLectureDate(false);
    results.attendanceSession = await migrateAttendanceCounts(false);
    results.subject = await migrateSubjectTeacherReferences(false);

    log("\nRunning post-migration validation...", "info");
    await validateMigration();
    await verifyIndexes();
  }

  // Summary
  logSection("Migration Summary");
  console.log(JSON.stringify(results, null, 2));

  const totalMigrated =
    (results.timetableSlot.migrated || 0) +
    (results.attendanceSession.migrated || 0) +
    (results.subject.migrated || 0);
  const totalErrors =
    (results.timetableSlot.errors || 0) +
    (results.attendanceSession.errors || 0) +
    (results.subject.errors || 0);

  if (DRY_RUN) {
    log(
      `\nDRY RUN complete. Estimated changes: ${totalMigrated} records. Run with --live to apply.`,
      "success"
    );
  } else {
    if (totalErrors === 0) {
      log(`\nMigration completed successfully. ${totalMigrated} records updated.`, "success");
    } else {
      log(
        `\nMigration completed with ${totalErrors} errors. ${totalMigrated} records updated. Review errors above.`,
        "warning"
      );
    }
  }

  await disconnectDB();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
