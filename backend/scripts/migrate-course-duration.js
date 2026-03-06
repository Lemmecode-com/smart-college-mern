const mongoose = require("mongoose");
require("dotenv").config();

const Course = require("../src/models/course.model");

/**
 * MIGRATION SCRIPT: Course Semester → Duration
 * 
 * Purpose:
 * - Rename 'semester' field to 'durationSemesters'
 * - Add 'durationYears' field (calculated from semesters)
 * - Fix the fundamental course-semester architecture issue
 * 
 * Run with: node backend/scripts/migrate-course-duration.js
 * 
 * Migration Logic:
 * semester: 1-2  →  durationYears: 1
 * semester: 3-4  →  durationYears: 2
 * semester: 5-6  →  durationYears: 3
 * semester: 7-8  →  durationYears: 4
 */

async function migrateCourseDuration() {
  let conn;
  
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 Starting Course Duration Migration");
    console.log("=".repeat(70) + "\n");

    // Connect to database
    console.log("🔌 Connecting to database...");
    conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database\n");

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Find all courses with old 'semester' field
      console.log("📊 Finding courses with old 'semester' field...");
      const courses = await Course.find({
        semester: { $exists: true }
      }).session(session);

      console.log(`   Found ${courses.length} courses to migrate\n`);

      if (courses.length === 0) {
        console.log("ℹ️  No courses need migration (already migrated or no courses exist)");
        await session.commitTransaction();
        console.log("\n✅ Migration completed (no changes needed)\n");
        return;
      }

      const migrationReport = {
        total: courses.length,
        migrated: 0,
        skipped: 0,
        errors: []
      };

      // Step 2: Migrate each course
      console.log("🔄 Migrating courses...\n");

      for (const course of courses) {
        try {
          const oldSemester = course.semester;
          
          // Calculate durationYears from semester
          const durationYears = Math.ceil(oldSemester / 2);
          
          // Update course with new fields
          course.durationSemesters = oldSemester;
          course.durationYears = durationYears;
          
          // Save the course (will trigger pre-save hook, but we already set values)
          await course.save({ session });
          
          migrationReport.migrated++;
          
          console.log(`   ✅ MIGRATED: "${course.name}"`);
          console.log(`      Old: semester = ${oldSemester}`);
          console.log(`      New: durationSemesters = ${oldSemester}, durationYears = ${durationYears}\n`);
          
        } catch (err) {
          migrationReport.errors.push({
            courseId: course._id.toString(),
            courseName: course.name,
            error: err.message
          });
          
          console.log(`   ❌ ERROR: "${course.name}" - ${err.message}\n`);
        }
      }

      // Step 3: Verify migration
      console.log("🔍 Verifying migration...\n");
      
      const migratedCount = await Course.countDocuments({
        durationSemesters: { $exists: true }
      }).session(session);
      
      console.log(`   Verified: ${migratedCount} courses have new fields\n`);

      // Step 4: Check for any courses still having old field
      const oldFieldCount = await Course.countDocuments({
        semester: { $exists: true },
        durationSemesters: { $exists: false }
      }).session(session);
      
      if (oldFieldCount > 0) {
        console.log(`⚠️  WARNING: ${oldFieldCount} courses still have old 'semester' field only\n`);
      }

      // Commit transaction
      await session.commitTransaction();
      
      // Print migration report
      console.log("\n" + "=".repeat(70));
      console.log("📊 MIGRATION REPORT");
      console.log("=".repeat(70));
      console.log(`   Total Courses:        ${migrationReport.total}`);
      console.log(`   ✅ Migrated:           ${migrationReport.migrated}`);
      console.log(`   ⏭️  Skipped:           ${migrationReport.skipped}`);
      console.log(`   ❌ Errors:             ${migrationReport.errors.length}`);
      
      if (migrationReport.errors.length > 0) {
        console.log("\n   Error Details:");
        migrationReport.errors.forEach((err, idx) => {
          console.log(`   ${idx + 1}. ${err.courseName}: ${err.error}`);
        });
      }
      
      console.log("\n" + "=".repeat(70));
      console.log("✅ Migration completed successfully!");
      console.log("=".repeat(70) + "\n");

      // Step 5: Next steps
      console.log("📋 NEXT STEPS:");
      console.log("   1. ✅ Verify courses in database");
      console.log("   2. ✅ Test course creation");
      console.log("   3. ✅ Test student approval");
      console.log("   4. ✅ Test subject creation");
      console.log("   5. ⏭️  Deploy to production (after testing)\n");

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    console.error("\nStack trace:");
    console.error(err.stack);
    console.error("\n" + "=".repeat(70) + "\n");
    
    // Rollback instructions
    console.log("🔄 ROLLBACK INSTRUCTIONS:");
    console.log("   If migration partially completed, you can rollback with:");
    console.log("   node backend/scripts/rollback-course-duration.js\n");
    
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
      console.log("👋 Database connection closed\n");
    }
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateCourseDuration();
}

module.exports = migrateCourseDuration;
