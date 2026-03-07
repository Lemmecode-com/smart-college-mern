/**
 * 🔙 DATABASE ROLLBACK SCRIPT
 *
 * Project: NOVAA - Smart College MERN
 * Version: 1.0.0
 * Date: March 6, 2026
 *
 * Purpose:
 * - Remove indexes created by migration
 * - Optionally remove seeded data
 * - Safe to run multiple times (idempotent)
 *
 * ⚠️ WARNING: This script can delete data!
 *
 * Usage:
 *   node backend/scripts/rollback.js              # Remove indexes only
 *   node backend/scripts/rollback.js --data       # Remove indexes + seeded data
 *   node backend/scripts/rollback.js --all        # Drop all collections
 *   npm run rollback                              # Remove indexes only
 *   npm run rollback:data                         # Remove indexes + data
 *   npm run rollback:all                          # Drop everything
 *
 * Environment Variables Required:
 * - MONGO_URI or MONGODB_URI
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Import models
const User = require("../src/models/user.model");
const College = require("../src/models/college.model");
const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");

// ==========================================
// CONFIGURATION
// ==========================================
const config = {
  mode: process.argv.includes("--all") ? "all" : 
        process.argv.includes("--data") ? "data" : "indexes",
  
  // Data to remove in "data" mode
  removeSuperAdmin: true,
  removeSampleCollege: true,
  superAdminEmail: "admin@novaa.edu",
  sampleCollegeEmail: "demo@college.edu"
};

// ==========================================
// STATISTICS TRACKING
// ==========================================
const stats = {
  indexes: { removed: 0, errors: 0 },
  data: { users: 0, colleges: 0, departments: 0, courses: 0 },
  startTime: Date.now()
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
    remove: "🗑️",
    skip: "⏭️"
  };
  console.log(`[${timestamp}] ${icons[type] || icons.info} ${message}`);
}

// ==========================================
// INDEX REMOVAL FUNCTIONS
// ==========================================
async function removeIndex(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
    log(`Removed index: ${indexName}`, "remove");
    stats.indexes.removed++;
    return true;
  } catch (err) {
    if (err.codeName === "IndexNotFound" || err.code === 27) {
      log(`Index not found: ${indexName}`, "skip");
      return true;
    }
    if (err.codeName === "CannotDropDefaultIndex") {
      log(`Cannot drop default index: ${indexName}`, "skip");
      return true;
    }
    log(`Failed to remove index ${indexName}: ${err.message}`, "error");
    stats.indexes.errors++;
    return false;
  }
}

async function removeAllIndexes(db) {
  log("\n🗑️  REMOVING DATABASE INDEXES", "info");
  log("=".repeat(60), "info");

  // Indexes to remove from each collection
  const indexesToRemove = {
    attendancerecords: [
      "student_1_college_1", "college_1_session_1", "status_1", 
      "session_id_1", "college_1_createdAt_-1"
    ],
    attendancesessions: [
      "slot_1_lectureDate_1_lectureNumber_1", "teacher_1_college_1",
      "teacher_1_status_1_college_1", "lectureDate_-1", "college_1_lectureDate_-1",
      "college_1_status_1", "college_1_course_1_lectureDate_-1"
    ],
    studentfees: [
      "student_1_college_1", "college_1_course_1", "college_id_1",
      "installments.dueDate_1", "installments.status_1", 
      "installments.escalationLevel_1", "installments.finalNoticeSent_1"
    ],
    notifications: [
      "college_1_target_1", "college_1_createdAt_-1", "college_1_isActive_1",
      "target_1_type_1", "college_1_target_department_1", "college_1_target_course_1",
      "college_1_target_semester_1", "college_1_target_1_isActive_1",
      "college_1_isActive_1_createdAt_-1"
    ],
    students: [
      "college_1_status_1", "college_1_department_1", "college_1_course_1",
      "college_1_semester_1", "user_1_college_1", "college_1_currentYear_1",
      "email_1", "admissionYear_1"
    ],
    teachers: [
      "college_1_status_1", "college_1_department_1", "user_1_college_1",
      "email_1"
    ],
    users: [
      "email_1", "role_1_college_1", "college_id_1"
    ],
    colleges: [
      "code_1", "email_1", "isActive_1"
    ],
    departments: [
      "college_id_1", "name_1_college_1", "isActive_1"
    ],
    courses: [
      "college_id_1", "name_1_college_1", "isActive_1", "durationSemesters_1"
    ],
    subjects: [
      "college_1_course_1", "college_1_semester_1", "teacher_1_college_1", "isActive_1"
    ],
    feestructures: [
      "college_1_course_1", "college_1_semester_1", "isActive_1"
    ],
    promotionhistories: [
      "college_1_student_1", "fromSemester_1_toSemester_1", "academicYear_1"
    ],
    timetableslots: [
      "college_1_department_1", "day_1_start_1_end_1", "isActive_1"
    ],
    refreshtokens: [
      "userId_1", "expiresAt_1", "token_1"
    ],
    tokenblacklists: [
      "token_1", "expiresAt_1"
    ],
    passwordresets: [
      "email_1", "otp_1", "expiresAt_1"
    ]
  };

  for (const [collectionName, indexNames] of Object.entries(indexesToRemove)) {
    try {
      const collection = db.collection(collectionName);
      log(`\n📌 ${collectionName} collection...`, "info");
      
      const existingIndexes = await collection.listIndexes().toArray();
      const existingIndexNames = existingIndexes.map(idx => idx.name);

      for (const indexName of indexNames) {
        if (existingIndexNames.includes(indexName)) {
          await removeIndex(collection, indexName);
        } else {
          log(`Index not found: ${indexName}`, "skip");
        }
      }
    } catch (err) {
      log(`Error processing ${collectionName}: ${err.message}`, "error");
    }
  }

  log("\n" + "=".repeat(60), "info");
  log(`Index Summary: ${stats.indexes.removed} removed, ${stats.indexes.errors} errors`, "success");
}

// ==========================================
// DATA REMOVAL FUNCTIONS
// ==========================================
async function removeSeededData() {
  log("\n🗑️  REMOVING SEEDED DATA", "info");
  log("=".repeat(60), "info");

  // Remove Super Admin
  if (config.removeSuperAdmin) {
    try {
      const result = await User.deleteOne({ 
        email: config.superAdminEmail,
        role: "SUPER_ADMIN"
      });
      
      if (result.deletedCount > 0) {
        log(`Removed Super Admin: ${config.superAdminEmail}`, "remove");
        stats.data.users++;
      } else {
        log(`Super Admin not found: ${config.superAdminEmail}`, "skip");
      }
    } catch (err) {
      log(`Failed to remove Super Admin: ${err.message}`, "error");
    }
  }

  // Remove Sample College and related data
  if (config.removeSampleCollege) {
    try {
      const sampleCollege = await College.findOne({ email: config.sampleCollegeEmail });
      
      if (sampleCollege) {
        log(`Removing sample college: ${sampleCollege.name}`, "remove");
        
        // Remove related data
        const [departments, courses, students, teachers] = await Promise.all([
          Department.deleteMany({ college_id: sampleCollege._id }),
          Course.deleteMany({ college_id: sampleCollege._id }),
          require("../src/models/student.model").deleteMany({ college_id: sampleCollege._id }),
          require("../src/models/teacher.model").deleteMany({ college_id: sampleCollege._id })
        ]);

        stats.data.departments += departments.deletedCount;
        stats.data.courses += courses.deletedCount;
        stats.data.users += students.deletedCount + teachers.deletedCount;

        // Remove college
        await College.deleteOne({ _id: sampleCollege._id });
        stats.data.colleges++;

        log(`Removed college and ${departments.deletedCount} departments, ${courses.deletedCount} courses`, "success");
      } else {
        log(`Sample college not found: ${config.sampleCollegeEmail}`, "skip");
      }
    } catch (err) {
      log(`Failed to remove sample college: ${err.message}`, "error");
    }
  }

  log("\n" + "=".repeat(60), "info");
  log(`Data Summary: ${stats.data.users} users, ${stats.data.colleges} colleges, ${stats.data.departments} departments, ${stats.data.courses} courses removed`, "success");
}

async function dropAllCollections(db) {
  log("\n⚠️  DROPPING ALL COLLECTIONS", "warning");
  log("=".repeat(60), "warning");
  log("THIS ACTION IS IRREVERSIBLE!", "error");
  log("=".repeat(60), "warning");

  const collections = await db.listCollections().toArray();
  
  for (const collection of collections) {
    try {
      await db.dropCollection(collection.name);
      log(`Dropped collection: ${collection.name}`, "remove");
    } catch (err) {
      log(`Failed to drop ${collection.name}: ${err.message}`, "error");
    }
  }

  log(`\nDropped ${collections.length} collections`, "success");
}

// ==========================================
// VERIFICATION FUNCTIONS
// ==========================================
async function verifyRollback(db) {
  log("\n🔍 VERIFYING ROLLBACK", "info");
  log("=".repeat(60), "info");

  const collections = await db.listCollections().toArray();
  log(`Remaining collections: ${collections.length}`, "info");

  for (const collection of collections) {
    const count = await db.collection(collection.name).countDocuments();
    const indexes = await db.collection(collection.name).listIndexes().toArray();
    log(`   ${collection.name}: ${count} documents, ${indexes.length} indexes`, "info");
  }
}

// ==========================================
// MAIN ROLLBACK FUNCTION
// ==========================================
async function runRollback() {
  console.clear();
  
  console.log("\n" + "=".repeat(70));
  console.log("🔙 NOVAA - SMART COLLEGE MERN");
  console.log("📊 DATABASE ROLLBACK SCRIPT");
  console.log("=".repeat(70));
  console.log(`Mode: ${config.mode.toUpperCase()}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(70) + "\n");

  if (config.mode !== "indexes") {
    log("⚠️  WARNING: This will delete data!", "warning");
    log("Press Ctrl+C within 5 seconds to cancel...", "warning");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  let conn;

  try {
    // Connect to MongoDB
    log("Connecting to database...", "info");
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/smart-college-mern";
    log(`Using: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`, "info");
    
    conn = await mongoose.connect(mongoUri);
    log("Connected to MongoDB", "success");

    const db = mongoose.connection.db;

    // Step 1: Remove all indexes
    await removeAllIndexes(db);

    // Step 2: Remove seeded data (if requested)
    if (config.mode === "data" || config.mode === "all") {
      await removeSeededData();
    }

    // Step 3: Drop all collections (if requested)
    if (config.mode === "all") {
      await dropAllCollections(db);
    }

    // Step 4: Verify rollback
    await verifyRollback(db);

    // Final summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(70));
    console.log("📊 ROLLBACK SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Indexes: ${stats.indexes.removed} removed, ${stats.indexes.errors} errors`);
    if (config.mode !== "indexes") {
      console.log(`✅ Data: ${stats.data.users} users, ${stats.data.colleges} colleges, ${stats.data.departments} departments, ${stats.data.courses} courses removed`);
    }
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(70));

    log("🎉 Rollback completed successfully!", "success");
    console.log("\n" + "=".repeat(70) + "\n");

  } catch (err) {
    log(`Rollback failed: ${err.message}`, "error");
    log(err.stack, "error");
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
      log("Database connection closed", "info");
    }
  }
}

// Run rollback
if (require.main === module) {
  runRollback();
}

module.exports = runRollback;
