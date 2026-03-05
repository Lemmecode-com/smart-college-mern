/**
 * 🧹 CLEANUP ORPHANED RECORDS SCRIPT
 * 
 * Purpose: Find and archive records that reference non-existent colleges
 * Run: node backend/scripts/cleanup-orphaned-records.js
 * 
 * This script:
 * 1. Finds all valid college IDs
 * 2. Scans each model for records with invalid college_id references
 * 3. Either deletes or archives orphaned records
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Import all models
const College = require("../src/models/college.model");
const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");
const Student = require("../src/models/student.model");
const Teacher = require("../src/models/teacher.model");
const Subject = require("../src/models/subject.model");
const FeeStructure = require("../src/models/feeStructure.model");
const StudentFee = require("../src/models/studentFee.model");
const Notification = require("../src/models/notification.model");
const NotificationRead = require("../src/models/notificationRead.model");
const Timetable = require("../src/models/timetable.model");
const TimetableSlot = require("../src/models/timetableSlot.model");
const AttendanceSession = require("../src/models/attendanceSession.model");
const AttendanceRecord = require("../src/models/attendanceRecord.model");
const DocumentConfig = require("../src/models/documentConfig.model");
const PromotionHistory = require("../src/models/promotionHistory.model");
const User = require("../src/models/user.model");

// Models with college_id field
const MODELS_WITH_COLLEGE_ID = [
  { model: Department, name: "Department", field: "college_id", hasIsActive: true },
  { model: Course, name: "Course", field: "college_id", hasIsActive: true },
  { model: Student, name: "Student", field: "college_id", hasStatus: true },
  { model: Teacher, name: "Teacher", field: "college_id", hasIsActive: true },
  { model: Subject, name: "Subject", field: "college_id", hasIsActive: true },
  { model: FeeStructure, name: "FeeStructure", field: "college_id", hasIsActive: true },
  { model: StudentFee, name: "StudentFee", field: "college_id", hasIsActive: true },
  { model: Notification, name: "Notification", field: "college_id", hasIsActive: true },
  { model: NotificationRead, name: "NotificationRead", field: "college_id", hasIsActive: false },
  { model: Timetable, name: "Timetable", field: "college_id", hasIsActive: true },
  { model: TimetableSlot, name: "TimetableSlot", field: "college_id", hasIsActive: true },
  { model: AttendanceSession, name: "AttendanceSession", field: "college_id", hasIsActive: true },
  { model: AttendanceRecord, name: "AttendanceRecord", field: "college_id", hasIsActive: true },
  { model: PromotionHistory, name: "PromotionHistory", field: "college_id", hasIsActive: false },
  { model: User, name: "User", field: "college_id", hasIsActive: true },
];

// Models with collegeCode field
const MODELS_WITH_COLLEGE_CODE = [
  { model: DocumentConfig, name: "DocumentConfig", field: "collegeCode", hasIsActive: true },
];

async function cleanupOrphanedRecords(options = { dryRun: true, archive: true }) {
  const { dryRun, archive } = options;
  
  console.log("=".repeat(60));
  console.log("🧹 ORPHANED RECORDS CLEANUP SCRIPT");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "🔍 DRY RUN (no changes)" : "⚡ LIVE (changes will be made)"}`);
  console.log(`Strategy: ${archive ? "📦 Archive (set isActive=false)" : "🗑️ Delete permanently"}`);
  console.log("=".repeat(60));

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/smart-college-mern");
    console.log("✅ Connected to MongoDB");

    // Get all valid college IDs and codes
    const validColleges = await College.find().select("_id code isActive");
    const validCollegeIds = validColleges.map(c => c._id);
    const validCollegeCodes = validColleges.map(c => c.code);
    
    console.log(`\n📊 Found ${validCollegeIds.length} active colleges`);

    const stats = {
      totalOrphaned: 0,
      totalArchived: 0,
      totalDeleted: 0,
      byModel: {}
    };

    // Check models with college_id
    for (const { model, name, field, hasIsActive, hasStatus } of MODELS_WITH_COLLEGE_ID) {
      try {
        // Find orphaned records
        const orphanedQuery = { [field]: { $nin: validCollegeIds } };
        const orphanedCount = await model.countDocuments(orphanedQuery);

        if (orphanedCount > 0) {
          console.log(`\n⚠️  ${name}: ${orphanedCount} orphaned records found`);
          
          stats.byModel[name] = {
            orphaned: orphanedCount,
            archived: 0,
            deleted: 0
          };
          stats.totalOrphaned += orphanedCount;

          if (!dryRun) {
            if (archive) {
              // Archive orphaned records
              const updateOps = {};
              if (hasIsActive) updateOps.isActive = false;
              if (hasStatus) updateOps.status = "INACTIVE";
              
              if (Object.keys(updateOps).length > 0) {
                const result = await model.updateMany(
                  orphanedQuery,
                  { $set: updateOps }
                );
                stats.byModel[name].archived = result.modifiedCount;
                stats.totalArchived += result.modifiedCount;
                console.log(`   📦 Archived ${result.modifiedCount} ${name} records`);
              }
            } else {
              // Delete orphaned records
              const result = await model.deleteMany(orphanedQuery);
              stats.byModel[name].deleted = result.deletedCount;
              stats.totalDeleted += result.deletedCount;
              console.log(`   🗑️  Deleted ${result.deletedCount} ${name} records`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${name}:`, error.message);
      }
    }

    // Check models with collegeCode
    for (const { model, name, field, hasIsActive } of MODELS_WITH_COLLEGE_CODE) {
      try {
        // Find orphaned records
        const orphanedQuery = { [field]: { $nin: validCollegeCodes } };
        const orphanedCount = await model.countDocuments(orphanedQuery);

        if (orphanedCount > 0) {
          console.log(`\n⚠️  ${name}: ${orphanedCount} orphaned records found`);
          
          stats.byModel[name] = {
            orphaned: orphanedCount,
            archived: 0,
            deleted: 0
          };
          stats.totalOrphaned += orphanedCount;

          if (!dryRun) {
            if (archive && hasIsActive) {
              const result = await model.updateMany(
                orphanedQuery,
                { $set: { isActive: false } }
              );
              stats.byModel[name].archived = result.modifiedCount;
              stats.totalArchived += result.modifiedCount;
              console.log(`   📦 Archived ${result.modifiedCount} ${name} records`);
            } else {
              const result = await model.deleteMany(orphanedQuery);
              stats.byModel[name].deleted = result.deletedCount;
              stats.totalDeleted += result.deletedCount;
              console.log(`   🗑️  Deleted ${result.deletedCount} ${name} records`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${name}:`, error.message);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP SUMMARY");
    console.log("=".repeat(60));
    
    if (stats.totalOrphaned === 0) {
      console.log("✅ No orphaned records found! Database is clean.");
    } else {
      console.log(`Total orphaned records: ${stats.totalOrphaned}`);
      
      if (dryRun) {
        console.log("\n⚠️  This was a DRY RUN. No changes were made.");
        console.log("Run with 'node cleanup-orphaned-records.js --live' to apply changes.");
      } else {
        console.log(`Total archived: ${stats.totalArchived}`);
        console.log(`Total deleted: ${stats.totalDeleted}`);
      }

      if (Object.keys(stats.byModel).length > 0) {
        console.log("\n📋 Breakdown by model:");
        for (const [modelName, modelStats] of Object.entries(stats.byModel)) {
          console.log(`   ${modelName}: ${modelStats.orphaned} orphaned` +
            (modelStats.archived > 0 ? `, ${modelStats.archived} archived` : "") +
            (modelStats.deleted > 0 ? `, ${modelStats.deleted} deleted` : "")
          );
        }
      }
    }

    console.log("=".repeat(60));
    return stats;

  } catch (error) {
    console.error("❌ Script failed:", error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("👋 Database connection closed");
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const isLive = args.includes("--live") || args.includes("-l");
const isDryRun = !isLive;

// Run the cleanup
cleanupOrphanedRecords({
  dryRun: isDryRun,
  archive: true // Always prefer archiving over deletion
})
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed with error:", error);
    process.exit(1);
  });
