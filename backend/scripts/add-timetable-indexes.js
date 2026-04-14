/**
 * 📊 TIMETABLE PERFORMANCE INDEXES
 *
 * Creates optimized indexes for schedule generation queries.
 * Run this after migration to improve performance.
 *
 * Usage:
 *   node backend/scripts/add-timetable-indexes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

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
    create: "🆕",
    exist: "⚡",
  };
  console.log(`[${timestamp}] ${icons[type] || icons.info} ${message}`);
}

async function createIndex(collection, indexKeys, options = {}) {
  try {
    const indexName =
      options.name ||
      Object.entries(indexKeys)
        .map(([k, v]) => `${k}_${v}`)
        .join("_");

    await collection.createIndex(indexKeys, { ...options, name: indexName });
    log(`Created index: ${indexName}`, "create");
    return { success: true, name: indexName };
  } catch (err) {
    if (err.codeName === "IndexOptionsConflict" || err.code === 86) {
      log(`Index already exists: ${options.name || "unnamed"}`, "exist");
      return { success: true, name: options.name || "existing", exists: true };
    }
    log(
      `Index creation failed: ${options.name || "unnamed"} - ${err.message}`,
      "error",
    );
    return { success: false, error: err.message };
  }
}

// ==========================================
// MAIN INDEX CREATION
// ==========================================
async function addTimetableIndexes() {
  console.log("\n" + "=".repeat(70));
  console.log("📊 CREATING TIMETABLE PERFORMANCE INDEXES");
  console.log("=".repeat(70));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(70) + "\n");

  let conn;
  const stats = { created: 0, existing: 0, errors: 0 };

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

    // ================= TIMETABLE INDEXES =================
    log("\n📌 timetable collection indexes...", "info");
    const timetableCollection = db.collection("timetables");

    let result = await createIndex(
      timetableCollection,
      { college_id: 1, startDate: 1, endDate: 1, status: 1 },
      { name: "college_1_startDate_1_endDate_1_status_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      timetableCollection,
      { department_id: 1, status: 1, createdAt: -1 },
      { name: "department_1_status_1_createdAt_-1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    // ================= TIMETABLE SLOT INDEXES =================
    log("\n📌 timetableslot collection indexes...", "info");
    const timetableSlotCollection = db.collection("timetableslots");

    result = await createIndex(
      timetableSlotCollection,
      { timetable_id: 1, day: 1, startTime: 1 },
      { name: "timetable_1_day_1_startTime_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      timetableSlotCollection,
      { college_id: 1, teacher_id: 1, day: 1 },
      { name: "college_1_teacher_1_day_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      timetableSlotCollection,
      { college_id: 1, room: 1, day: 1, startTime: 1 },
      { name: "college_1_room_1_day_1_startTime_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    // ================= TIMETABLE EXCEPTION INDEXES =================
    log("\n📌 timetableexception collection indexes...", "info");
    const exceptionCollection = db.collection("timetableexceptions");

    result = await createIndex(
      exceptionCollection,
      { timetable_id: 1, exceptionDate: 1, type: 1 },
      { name: "timetable_1_exceptionDate_1_type_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      exceptionCollection,
      { college_id: 1, exceptionDate: 1, status: 1 },
      { name: "college_1_exceptionDate_1_status_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      exceptionCollection,
      { slot_id: 1, exceptionDate: 1 },
      { name: "slot_1_exceptionDate_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      exceptionCollection,
      { "extraSlot.teacher_id": 1, exceptionDate: 1 },
      { name: "extraTeacher_1_exceptionDate_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      exceptionCollection,
      { substituteTeacher: 1, exceptionDate: 1 },
      { name: "substituteTeacher_1_exceptionDate_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    result = await createIndex(
      exceptionCollection,
      { college_id: 1, status: 1, exceptionDate: 1 },
      { name: "college_1_status_1_exceptionDate_1" },
    );
    if (result.success && result.exists) stats.existing++;
    else if (result.success) stats.created++;
    else stats.errors++;

    // Final summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 INDEX CREATION SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Indexes Created: ${stats.created}`);
    console.log(`⚡ Indexes Already Exists: ${stats.existing}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log("=".repeat(70));

    if (stats.errors === 0) {
      log("🎉 All indexes created successfully!", "success");
    } else {
      log("⚠️  Some indexes failed to create. Check errors above.", "warning");
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

// Run if called directly
if (require.main === module) {
  addTimetableIndexes();
}

module.exports = { addTimetableIndexes };
