/**
 * 🗓️ TIMETABLE DATE-WISE SCHEDULING MIGRATION
 *
 * Purpose:
 * - Add startDate and endDate to existing timetables
 * - Populate workingDays based on existing slot patterns
 * - Set default timezone for all timetables
 * - Create indexes for TimetableException collection
 *
 * Usage:
 *   node backend/scripts/migrate-timetable-dates.js
 *
 * Safe to run multiple times (idempotent)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Timetable = require("../src/models/timetable.model");
const TimetableSlot = require("../src/models/timetableSlot.model");

// ==========================================
// CONFIGURATION
// ==========================================
const config = {
  // Default date ranges based on academic year patterns
  // If timetable academicYear is "2024-2025", use Aug 2024 - May 2025
  defaultStartMonth: 7, // August (0-indexed)
  defaultEndMonth: 4, // May (0-indexed)
  defaultTimezone: "Asia/Kolkata",
  defaultWorkingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function log(message, type = "info") {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const icons = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    update: "🔄",
    skip: "⏭️",
  };
  console.log(`[${timestamp}] ${icons[type] || icons.info} ${message}`);
}

function parseAcademicYear(academicYear) {
  // Parse "2024-2025" → { startYear: 2024, endYear: 2025 }
  const parts = academicYear.split("-");
  if (parts.length === 2) {
    return {
      startYear: parseInt(parts[0]),
      endYear: parseInt(parts[1]),
    };
  }
  // Fallback: try to extract first 4 digits
  const match = academicYear.match(/(\d{4})/);
  if (match) {
    const year = parseInt(match[1]);
    return { startYear: year, endYear: year + 1 };
  }
  return null;
}

function calculateDefaultDates(academicYear) {
  const parsed = parseAcademicYear(academicYear);
  if (!parsed) {
    // Fallback to current year
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), config.defaultStartMonth, 1),
      endDate: new Date(now.getFullYear() + 1, config.defaultEndMonth, 31),
    };
  }

  return {
    startDate: new Date(parsed.startYear, config.defaultStartMonth, 1),
    endDate: new Date(parsed.endYear, config.defaultEndMonth, 30),
  };
}

async function extractWorkingDaysFromSlots(timetableId) {
  // Find all unique days from slots for this timetable
  const slots = await TimetableSlot.find({
    timetable_id: timetableId,
  }).distinct("day");

  return slots.length > 0 ? slots : config.defaultWorkingDays;
}

// ==========================================
// MIGRATION FUNCTIONS
// ==========================================
async function migrateTimetableDates() {
  log("\n🗓️  MIGRATING TIMETABLE DATE FIELDS", "info");
  log("=".repeat(60), "info");

  try {
    // Find all timetables missing startDate or endDate
    const timetablesToUpdate = await Timetable.find({
      $or: [
        { startDate: { $exists: false } },
        { endDate: { $exists: false } },
        { workingDays: { $exists: false } },
        { timezone: { $exists: false } },
      ],
    });

    if (timetablesToUpdate.length === 0) {
      log("All timetables already have date fields migrated", "skip");
      return { updated: 0, total: 0 };
    }

    log(`Found ${timetablesToUpdate.length} timetables to migrate`, "info");

    let updated = 0;
    let errors = 0;

    for (const timetable of timetablesToUpdate) {
      try {
        const updates = {};

        // Calculate startDate and endDate if missing
        if (!timetable.startDate || !timetable.endDate) {
          const dates = calculateDefaultDates(timetable.academicYear);
          updates.startDate = dates.startDate;
          updates.endDate = dates.endDate;
          log(
            `   📅 ${timetable.name}: ${dates.startDate.toISOString().split("T")[0]} → ${dates.endDate.toISOString().split("T")[0]}`,
            "update",
          );
        }

        // Set workingDays from existing slots if missing
        if (!timetable.workingDays || timetable.workingDays.length === 0) {
          const workingDays = await extractWorkingDaysFromSlots(timetable._id);
          updates.workingDays = workingDays;
          log(`   📆 Working days: ${workingDays.join(", ")}`, "info");
        }

        // Set default timezone if missing
        if (!timetable.timezone) {
          updates.timezone = config.defaultTimezone;
        }

        // Apply updates
        if (Object.keys(updates).length > 0) {
          await Timetable.findByIdAndUpdate(timetable._id, { $set: updates });
          updated++;
        } else {
          log(
            `   ⏭️  Skipping ${timetable.name} (already has all fields)`,
            "skip",
          );
        }
      } catch (err) {
        log(
          `   ❌ Failed to migrate timetable ${timetable._id}: ${err.message}`,
          "error",
        );
        errors++;
      }
    }

    log(
      `\n✅ Migrated ${updated}/${timetablesToUpdate.length} timetables`,
      "success",
    );
    if (errors > 0) {
      log(`⚠️  ${errors} timetables failed migration`, "warning");
    }

    return { updated, total: timetablesToUpdate.length, errors };
  } catch (err) {
    log(`Migration failed: ${err.message}`, "error");
    throw err;
  }
}

async function createTimetableExceptionIndexes(db) {
  log("\n📊 CREATING TIMETABLE EXCEPTION INDEXES", "info");
  log("=".repeat(60), "info");

  const collection = db.collection("timetableexceptions");

  const indexes = [
    {
      keys: { college_id: 1, exceptionDate: 1 },
      name: "college_1_exceptionDate_1",
    },
    {
      keys: { timetable_id: 1, exceptionDate: 1, type: 1 },
      name: "timetable_1_exceptionDate_1_type_1",
    },
    {
      keys: { college_id: 1, status: 1, exceptionDate: 1 },
      name: "college_1_status_1_exceptionDate_1",
    },
    { keys: { slot_id: 1, exceptionDate: 1 }, name: "slot_1_exceptionDate_1" },
    {
      keys: { "extraSlot.teacher_id": 1, exceptionDate: 1 },
      name: "extraTeacher_1_exceptionDate_1",
    },
    {
      keys: { substituteTeacher: 1, exceptionDate: 1 },
      name: "substituteTeacher_1_exceptionDate_1",
    },
  ];

  let created = 0;
  let existing = 0;
  let errors = 0;

  for (const index of indexes) {
    try {
      await collection.createIndex(index.keys, { name: index.name });
      log(`   ✅ Created index: ${index.name}`, "success");
      created++;
    } catch (err) {
      if (err.codeName === "IndexOptionsConflict" || err.code === 86) {
        log(`   ⏭️  Index exists: ${index.name}`, "skip");
        existing++;
      } else {
        log(`   ❌ Failed: ${index.name} - ${err.message}`, "error");
        errors++;
      }
    }
  }

  log(
    `\n📊 Index Summary: ${created} created, ${existing} existing, ${errors} errors`,
    "success",
  );
  return { created, existing, errors };
}

async function verifyMigration() {
  log("\n🔍 VERIFYING TIMETABLE MIGRATION", "info");
  log("=".repeat(60), "info");

  const totalTimetables = await Timetable.countDocuments();
  const withDates = await Timetable.countDocuments({
    startDate: { $exists: true },
    endDate: { $exists: true },
  });
  const withWorkingDays = await Timetable.countDocuments({
    workingDays: { $exists: true, $not: { $size: 0 } },
  });
  const withTimezone = await Timetable.countDocuments({
    timezone: { $exists: true },
  });

  log(`📊 Total Timetables: ${totalTimetables}`, "info");
  log(
    `   ✅ With startDate/endDate: ${withDates}/${totalTimetables}`,
    withDates === totalTimetables ? "success" : "warning",
  );
  log(
    `   ✅ With workingDays: ${withWorkingDays}/${totalTimetables}`,
    withWorkingDays === totalTimetables ? "success" : "warning",
  );
  log(
    `   ✅ With timezone: ${withTimezone}/${totalTimetables}`,
    withTimezone === totalTimetables ? "success" : "warning",
  );

  // Show sample timetables
  const sampleTimetables = await Timetable.find({})
    .limit(3)
    .select("name startDate endDate workingDays timezone");
  if (sampleTimetables.length > 0) {
    log("\n📋 Sample Timetables:", "info");
    sampleTimetables.forEach((tt) => {
      const startStr = tt.startDate
        ? tt.startDate.toISOString().split("T")[0]
        : "N/A";
      const endStr = tt.endDate
        ? tt.endDate.toISOString().split("T")[0]
        : "N/A";
      log(`   • ${tt.name}`, "info");
      log(`     📅 ${startStr} → ${endStr}`, "info");
      log(`     📆 ${tt.workingDays.join(", ")}`, "info");
      log(`     🌍 ${tt.timezone}`, "info");
    });
  }
}

// ==========================================
// MAIN MIGRATION FUNCTION
// ==========================================
async function runMigration() {
  console.clear();

  console.log("\n" + "=".repeat(70));
  console.log("🗓️  TIMETABLE DATE-WISE SCHEDULING MIGRATION");
  console.log("=".repeat(70));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(70) + "\n");

  let conn;
  const startTime = Date.now();

  try {
    // Connect to MongoDB
    log("Connecting to database...", "info");
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/smart-college-mern";
    // Mask credentials in URI (handles multiple formats)
    const maskedUri = mongoUri
      .replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")
      .replace(/\/([^/?]+)\?/, "/***?");
    log(`Using: ${maskedUri}`, "info");

    conn = await mongoose.connect(mongoUri);
    log("Connected to MongoDB", "success");

    const db = mongoose.connection.db;

    // Step 1: Migrate timetable dates
    const dateMigrationResult = await migrateTimetableDates();

    // Step 2: Create exception indexes
    const indexResult = await createTimetableExceptionIndexes(db);

    // Step 3: Verify migration
    await verifyMigration();

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(70));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(70));
    console.log(
      `✅ Timetables Updated: ${dateMigrationResult.updated}/${dateMigrationResult.total}`,
    );
    console.log(`   ⚠️  Errors: ${dateMigrationResult.errors || 0}`);
    console.log(
      `✅ Exception Indexes: ${indexResult.created} created, ${indexResult.existing} existing`,
    );
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(70));

    if (!dateMigrationResult.errors || dateMigrationResult.errors === 0) {
      log("🎉 Migration completed successfully!", "success");
    } else {
      log("⚠️  Migration completed with errors. Check logs above.", "warning");
    }

    process.exit(0);
  } catch (err) {
    log(`Fatal error: ${err.message}`, "error");
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
      log("Disconnected from MongoDB", "info");
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, migrateTimetableDates, verifyMigration };
