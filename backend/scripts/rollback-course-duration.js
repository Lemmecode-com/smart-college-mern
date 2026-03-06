const mongoose = require("mongoose");
require("dotenv").config();

const Course = require("../src/models/course.model");

/**
 * ROLLBACK SCRIPT: Course Duration Migration
 * 
 * Purpose:
 * - Restore 'semester' field from 'durationSemesters'
 * - Remove 'durationYears' field
 * - Use this if migration needs to be reverted
 * 
 * Run with: node backend/scripts/rollback-course-duration.js
 */

async function rollbackCourseDuration() {
  let conn;
  
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🔄 Starting Course Duration Rollback");
    console.log("=".repeat(70) + "\n");

    console.log("⚠️  WARNING: This will revert all course duration changes!");
    console.log("⚠️  Only run this if you need to undo the migration.\n");

    // Connect to database
    console.log("🔌 Connecting to database...");
    conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database\n");

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find all courses with new 'durationSemesters' field
      console.log("📊 Finding courses with new 'durationSemesters' field...");
      const courses = await Course.find({
        durationSemesters: { $exists: true }
      }).session(session);

      console.log(`   Found ${courses.length} courses to rollback\n`);

      if (courses.length === 0) {
        console.log("ℹ️  No courses need rollback (migration not run or already rolled back)\n");
        await session.commitTransaction();
        console.log("✅ Rollback completed (no changes needed)\n");
        return;
      }

      const rollbackReport = {
        total: courses.length,
        rolledBack: 0,
        errors: []
      };

      // Rollback each course
      console.log("🔄 Rolling back courses...\n");

      for (const course of courses) {
        try {
          const oldSemester = course.durationSemesters;
          
          // Restore old semester field
          course.semester = oldSemester;
          
          // Note: durationSemesters and durationYears will remain
          // but semester field is restored for backward compatibility
          
          await course.save({ session });
          
          rollbackReport.rolledBack++;
          
          console.log(`   ✅ ROLLED BACK: "${course.name}"`);
          console.log(`      Restored: semester = ${oldSemester}\n`);
          
        } catch (err) {
          rollbackReport.errors.push({
            courseId: course._id.toString(),
            courseName: course.name,
            error: err.message
          });
          
          console.log(`   ❌ ERROR: "${course.name}" - ${err.message}\n`);
        }
      }

      await session.commitTransaction();
      
      // Print report
      console.log("\n" + "=".repeat(70));
      console.log("📊 ROLLBACK REPORT");
      console.log("=".repeat(70));
      console.log(`   Total Courses:     ${rollbackReport.total}`);
      console.log(`   ✅ Rolled Back:    ${rollbackReport.rolledBack}`);
      console.log(`   ❌ Errors:         ${rollbackReport.errors.length}`);
      
      if (rollbackReport.errors.length > 0) {
        console.log("\n   Error Details:");
        rollbackReport.errors.forEach((err, idx) => {
          console.log(`   ${idx + 1}. ${err.courseName}: ${err.error}`);
        });
      }
      
      console.log("\n" + "=".repeat(70));
      console.log("⚠️  Rollback completed!");
      console.log("⚠️  NOTE: Courses now have BOTH old and new fields.");
      console.log("⚠️  You may want to manually clean up durationSemesters/durationYears.\n");
      console.log("=".repeat(70) + "\n");

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error("\n❌ Rollback failed:", err.message);
    console.error("\nStack trace:");
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
      console.log("👋 Database connection closed\n");
    }
  }
}

// Run rollback if executed directly
if (require.main === module) {
  rollbackCourseDuration();
}

module.exports = rollbackCourseDuration;
