/**
 * 🔧 DATABASE INDEX MIGRATION SCRIPT
 * 
 * Purpose: Create performance indexes on existing collections
 * Run: node backend/scripts/add-indexes.js
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Creates indexes on all collections
 * 3. Reports existing vs new indexes
 * 4. Safe to run multiple times (idempotent)
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function addIndexes() {
  console.log("=".repeat(60));
  console.log("🔧 DATABASE INDEX MIGRATION");
  console.log("=".repeat(60));

  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/smart-college-mern");
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const stats = { created: 0, existing: 0, errors: 0 };

    // ==========================================
    // 1. ATTENDANCE RECORDS INDEXES
    // ==========================================
    console.log("📊 Creating indexes on attendancerecords...");
    const attendanceRecordIndexes = [
      { key: { student_id: 1, college_id: 1 }, name: "student_1_college_1" },
      { key: { college_id: 1, session_id: 1 }, name: "college_1_session_1" },
      { key: { status: 1 }, name: "status_1" },
      { key: { session_id: 1 }, name: "session_id_1" },
      { key: { college_id: 1, createdAt: -1 }, name: "college_1_createdAt_-1" }
    ];

    for (const index of attendanceRecordIndexes) {
      try {
        await db.collection("attendancerecords").createIndex(index.key, { name: index.name });
        console.log(`   ✅ Created: ${index.name}`);
        stats.created++;
      } catch (err) {
        if (err.codeName === "IndexOptionsConflict") {
          console.log(`   ⚠️  Exists: ${index.name}`);
          stats.existing++;
        } else {
          console.log(`   ❌ Error: ${index.name} - ${err.message}`);
          stats.errors++;
        }
      }
    }

    // ==========================================
    // 2. ATTENDANCE SESSIONS INDEXES
    // ==========================================
    console.log("\n📊 Creating indexes on attendancesessions...");
    const attendanceSessionIndexes = [
      { key: { slot_id: 1, lectureDate: 1, lectureNumber: 1 }, name: "slot_1_lectureDate_1_lectureNumber_1", unique: true },
      { key: { teacher_id: 1, college_id: 1 }, name: "teacher_1_college_1" },
      { key: { teacher_id: 1, status: 1, college_id: 1 }, name: "teacher_1_status_1_college_1" },
      { key: { lectureDate: -1 }, name: "lectureDate_-1" },
      { key: { college_id: 1, lectureDate: -1 }, name: "college_1_lectureDate_-1" },
      { key: { college_id: 1, status: 1 }, name: "college_1_status_1" },
      { key: { college_id: 1, course_id: 1, lectureDate: -1 }, name: "college_1_course_1_lectureDate_-1" }
    ];

    for (const index of attendanceSessionIndexes) {
      try {
        await db.collection("attendancesessions").createIndex(index.key, { name: index.name, unique: index.unique || false });
        console.log(`   ✅ Created: ${index.name}`);
        stats.created++;
      } catch (err) {
        if (err.codeName === "IndexOptionsConflict") {
          console.log(`   ⚠️  Exists: ${index.name}`);
          stats.existing++;
        } else {
          console.log(`   ❌ Error: ${index.name} - ${err.message}`);
          stats.errors++;
        }
      }
    }

    // ==========================================
    // 3. STUDENT FEES INDEXES
    // ==========================================
    console.log("\n📊 Creating indexes on studentfees...");
    const studentFeeIndexes = [
      { key: { student_id: 1, college_id: 1 }, name: "student_1_college_1" },
      { key: { college_id: 1, course_id: 1 }, name: "college_1_course_1" },
      { key: { college_id: 1 }, name: "college_id_1" },
      { key: { "installments.dueDate": 1 }, name: "installments.dueDate_1" },
      { key: { "installments.status": 1 }, name: "installments.status_1" },
      { key: { "installments.escalationLevel": 1 }, name: "installments.escalationLevel_1" },
      { key: { "installments.finalNoticeSent": 1 }, name: "installments.finalNoticeSent_1" }
    ];

    for (const index of studentFeeIndexes) {
      try {
        await db.collection("studentfees").createIndex(index.key, { name: index.name });
        console.log(`   ✅ Created: ${index.name}`);
        stats.created++;
      } catch (err) {
        if (err.codeName === "IndexOptionsConflict") {
          console.log(`   ⚠️  Exists: ${index.name}`);
          stats.existing++;
        } else {
          console.log(`   ❌ Error: ${index.name} - ${err.message}`);
          stats.errors++;
        }
      }
    }

    // ==========================================
    // 4. NOTIFICATIONS INDEXES
    // ==========================================
    console.log("\n📊 Creating indexes on notifications...");
    const notificationIndexes = [
      { key: { college_id: 1, target: 1 }, name: "college_1_target_1" },
      { key: { college_id: 1, createdAt: -1 }, name: "college_1_createdAt_-1" },
      { key: { college_id: 1, isActive: 1 }, name: "college_1_isActive_1" },
      { key: { target: 1, type: 1 }, name: "target_1_type_1" },
      { key: { college_id: 1, target_department: 1 }, name: "college_1_target_department_1" },
      { key: { college_id: 1, target_course: 1 }, name: "college_1_target_course_1" },
      { key: { college_id: 1, target_semester: 1 }, name: "college_1_target_semester_1" },
      { key: { college_id: 1, target: 1, isActive: 1 }, name: "college_1_target_1_isActive_1" },
      { key: { college_id: 1, isActive: 1, createdAt: -1 }, name: "college_1_isActive_1_createdAt_-1" }
    ];

    for (const index of notificationIndexes) {
      try {
        await db.collection("notifications").createIndex(index.key, { name: index.name });
        console.log(`   ✅ Created: ${index.name}`);
        stats.created++;
      } catch (err) {
        if (err.codeName === "IndexOptionsConflict") {
          console.log(`   ⚠️  Exists: ${index.name}`);
          stats.existing++;
        } else {
          console.log(`   ❌ Error: ${index.name} - ${err.message}`);
          stats.errors++;
        }
      }
    }

    // ==========================================
    // 5. STUDENTS INDEXES
    // ==========================================
    console.log("\n📊 Creating indexes on students...");
    const studentIndexes = [
      { key: { college_id: 1, status: 1 }, name: "college_1_status_1" },
      { key: { college_id: 1, department_id: 1 }, name: "college_1_department_1" },
      { key: { college_id: 1, course_id: 1 }, name: "college_1_course_1" },
      { key: { college_id: 1, currentSemester: 1 }, name: "college_1_semester_1" },
      { key: { user_id: 1, college_id: 1 }, name: "user_1_college_1" }
    ];

    for (const index of studentIndexes) {
      try {
        await db.collection("students").createIndex(index.key, { name: index.name });
        console.log(`   ✅ Created: ${index.name}`);
        stats.created++;
      } catch (err) {
        if (err.codeName === "IndexOptionsConflict") {
          console.log(`   ⚠️  Exists: ${index.name}`);
          stats.existing++;
        } else {
          console.log(`   ❌ Error: ${index.name} - ${err.message}`);
          stats.errors++;
        }
      }
    }

    // ==========================================
    // 6. TEACHERS INDEXES
    // ==========================================
    console.log("\n📊 Creating indexes on teachers...");
    const teacherIndexes = [
      { key: { college_id: 1, status: 1 }, name: "college_1_status_1" },
      { key: { college_id: 1, department_id: 1 }, name: "college_1_department_1" },
      { key: { user_id: 1, college_id: 1 }, name: "user_1_college_1" },
      { key: { email: 1 }, name: "email_1" },
      { key: { mobileNumber: 1 }, name: "mobileNumber_1" },
      { key: { joiningDate: 1 }, name: "joiningDate_1" }
    ];

    for (const index of teacherIndexes) {
      try {
        await db.collection("teachers").createIndex(index.key, { name: index.name });
        console.log(`   ✅ Created: ${index.name}`);
        stats.created++;
      } catch (err) {
        if (err.codeName === "IndexOptionsConflict") {
          console.log(`   ⚠️  Exists: ${index.name}`);
          stats.existing++;
        } else {
          console.log(`   ❌ Error: ${index.name} - ${err.message}`);
          stats.errors++;
        }
      }
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Indexes created: ${stats.created}`);
    console.log(`⚠️  Indexes already existed: ${stats.existing}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log("=".repeat(60));

    if (stats.errors === 0) {
      console.log("✅ All indexes created successfully!");
    } else {
      console.log("⚠️  Some indexes failed. Review errors above.");
    }

    console.log("\n💡 TIP: Run MongoDB EXPLAIN on slow queries to verify index usage:");
    console.log("   db.attendancesessions.find({ teacher_id: ObjectId('...') }).explain('executionStats')");
    console.log("=".repeat(60));

    return stats;

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

// Run the migration
addIndexes()
  .then(() => {
    console.log("\n✅ Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });
