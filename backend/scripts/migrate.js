/**
 * 🚀 MASTER DATABASE MIGRATION SCRIPT
 *
 * Project: NOVAA - Smart College MERN
 * Version: 1.0.0
 * Date: March 6, 2026
 *
 * Purpose:
 * - Create all database indexes for performance optimization
 * - Seed initial data (Super Admin, default configurations)
 * - Migrate existing data structures if needed
 * - Safe to run multiple times (idempotent)
 *
 * Usage:
 *   node backend/scripts/migrate.js
 *   npm run migrate
 *
 * Environment Variables Required:
 * - MONGO_URI or MONGODB_URI
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import all models
const User = require("../src/models/user.model");
const College = require("../src/models/college.model");
const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");
const Student = require("../src/models/student.model");
const Teacher = require("../src/models/teacher.model");
const Subject = require("../src/models/subject.model");
const AttendanceSession = require("../src/models/attendanceSession.model");
const AttendanceRecord = require("../src/models/attendanceRecord.model");
const FeeStructure = require("../src/models/feeStructure.model");
const StudentFee = require("../src/models/studentFee.model");
const Notification = require("../src/models/notification.model");
const Timetable = require("../src/models/timetable.model");
const TimetableSlot = require("../src/models/timetableSlot.model");
const DocumentConfig = require("../src/models/documentConfig.model");
const PromotionHistory = require("../src/models/promotionHistory.model");

// ==========================================
// CONFIGURATION
// ==========================================
const config = {
  // Default Super Admin credentials (CHANGE IN PRODUCTION!)
  superAdmin: {
    name: "Super Admin",
    email: "admin@novaa.edu",
    password: "Admin@123", // ⚠️ CHANGE THIS IN PRODUCTION
    role: "SUPER_ADMIN"
  },

  // Sample data generation (set to false in production)
  createSampleCollege: process.env.NODE_ENV !== "production",
  sampleCollege: {
    name: "Demo College of Engineering",
    email: "demo@college.edu",
    contactNumber: "9876543210",
    address: "123 Education Street, Knowledge City, State - 400001",
    establishedYear: 2010
  }
};

// ==========================================
// STATISTICS TRACKING
// ==========================================
const stats = {
  indexes: { created: 0, existing: 0, errors: 0 },
  seed: { users: 0, colleges: 0, departments: 0, courses: 0 },
  migrations: { completed: 0, skipped: 0, errors: 0 },
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
    create: "🆕",
    exist: "⚡"
  };
  console.log(`[${timestamp}] ${icons[type] || icons.info} ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// INDEX CREATION FUNCTIONS
// ==========================================
async function createIndex(collection, indexKeys, options = {}) {
  try {
    const indexName = options.name || Object.entries(indexKeys).map(([k, v]) => `${k}_${v}`).join("_");
    await collection.createIndex(indexKeys, { ...options, name: indexName });
    log(`Created index: ${indexName}`, "create");
    stats.indexes.created++;
    return true;
  } catch (err) {
    if (err.codeName === "IndexOptionsConflict" || err.code === 86) {
      log(`Index already exists: ${options.name || "unnamed"}`, "exist");
      stats.indexes.existing++;
      return true;
    }
    log(`Index creation failed: ${options.name || "unnamed"} - ${err.message}`, "error");
    stats.indexes.errors++;
    return false;
  }
}

async function createAllIndexes(db) {
  log("\n📊 CREATING DATABASE INDEXES", "info");
  log("=".repeat(60), "info");

  // 1. ATTENDANCE RECORDS INDEXES
  log("\n📌 attendancerecords collection...", "info");
  const attendanceRecordCollection = db.collection("attendancerecords");
  await createIndex(attendanceRecordCollection, { student_id: 1, college_id: 1 }, { name: "student_1_college_1" });
  await createIndex(attendanceRecordCollection, { college_id: 1, session_id: 1 }, { name: "college_1_session_1" });
  await createIndex(attendanceRecordCollection, { status: 1 }, { name: "status_1" });
  await createIndex(attendanceRecordCollection, { session_id: 1 }, { name: "session_id_1" });
  await createIndex(attendanceRecordCollection, { college_id: 1, createdAt: -1 }, { name: "college_1_createdAt_-1" });

  // 2. ATTENDANCE SESSIONS INDEXES
  log("\n📌 attendancesessions collection...", "info");
  const attendanceSessionCollection = db.collection("attendancesessions");
  await createIndex(attendanceSessionCollection, { slot_id: 1, lectureDate: 1, lectureNumber: 1 }, { name: "slot_1_lectureDate_1_lectureNumber_1", unique: true });
  await createIndex(attendanceSessionCollection, { teacher_id: 1, college_id: 1 }, { name: "teacher_1_college_1" });
  await createIndex(attendanceSessionCollection, { teacher_id: 1, status: 1, college_id: 1 }, { name: "teacher_1_status_1_college_1" });
  await createIndex(attendanceSessionCollection, { lectureDate: -1 }, { name: "lectureDate_-1" });
  await createIndex(attendanceSessionCollection, { college_id: 1, lectureDate: -1 }, { name: "college_1_lectureDate_-1" });
  await createIndex(attendanceSessionCollection, { college_id: 1, status: 1 }, { name: "college_1_status_1" });
  await createIndex(attendanceSessionCollection, { college_id: 1, course_id: 1, lectureDate: -1 }, { name: "college_1_course_1_lectureDate_-1" });

  // 3. STUDENT FEES INDEXES
  log("\n📌 studentfees collection...", "info");
  const studentFeeCollection = db.collection("studentfees");
  await createIndex(studentFeeCollection, { student_id: 1, college_id: 1 }, { name: "student_1_college_1" });
  await createIndex(studentFeeCollection, { college_id: 1, course_id: 1 }, { name: "college_1_course_1" });
  await createIndex(studentFeeCollection, { college_id: 1 }, { name: "college_id_1" });
  await createIndex(studentFeeCollection, { "installments.dueDate": 1 }, { name: "installments.dueDate_1" });
  await createIndex(studentFeeCollection, { "installments.status": 1 }, { name: "installments.status_1" });
  await createIndex(studentFeeCollection, { "installments.escalationLevel": 1 }, { name: "installments.escalationLevel_1" });
  await createIndex(studentFeeCollection, { "installments.finalNoticeSent": 1 }, { name: "installments.finalNoticeSent_1" });

  // 4. NOTIFICATIONS INDEXES
  log("\n📌 notifications collection...", "info");
  const notificationCollection = db.collection("notifications");
  await createIndex(notificationCollection, { college_id: 1, target: 1 }, { name: "college_1_target_1" });
  await createIndex(notificationCollection, { college_id: 1, createdAt: -1 }, { name: "college_1_createdAt_-1" });
  await createIndex(notificationCollection, { college_id: 1, isActive: 1 }, { name: "college_1_isActive_1" });
  await createIndex(notificationCollection, { target: 1, type: 1 }, { name: "target_1_type_1" });
  await createIndex(notificationCollection, { college_id: 1, target_department: 1 }, { name: "college_1_target_department_1" });
  await createIndex(notificationCollection, { college_id: 1, target_course: 1 }, { name: "college_1_target_course_1" });
  await createIndex(notificationCollection, { college_id: 1, target_semester: 1 }, { name: "college_1_target_semester_1" });
  await createIndex(notificationCollection, { college_id: 1, target: 1, isActive: 1 }, { name: "college_1_target_1_isActive_1" });
  await createIndex(notificationCollection, { college_id: 1, isActive: 1, createdAt: -1 }, { name: "college_1_isActive_1_createdAt_-1" });

  // 5. STUDENTS INDEXES
  log("\n📌 students collection...", "info");
  const studentCollection = db.collection("students");
  await createIndex(studentCollection, { college_id: 1, status: 1 }, { name: "college_1_status_1" });
  await createIndex(studentCollection, { college_id: 1, department_id: 1 }, { name: "college_1_department_1" });
  await createIndex(studentCollection, { college_id: 1, course_id: 1 }, { name: "college_1_course_1" });
  await createIndex(studentCollection, { college_id: 1, currentSemester: 1 }, { name: "college_1_semester_1" });
  await createIndex(studentCollection, { user_id: 1, college_id: 1 }, { name: "user_1_college_1" });
  await createIndex(studentCollection, { college_id: 1, currentYear: 1 }, { name: "college_1_currentYear_1" });
  await createIndex(studentCollection, { email: 1 }, { name: "email_1" });
  await createIndex(studentCollection, { admissionYear: 1 }, { name: "admissionYear_1" });

  // 6. TEACHERS INDEXES
  log("\n📌 teachers collection...", "info");
  const teacherCollection = db.collection("teachers");
  await createIndex(teacherCollection, { college_id: 1, status: 1 }, { name: "college_1_status_1" });
  await createIndex(teacherCollection, { college_id: 1, department_id: 1 }, { name: "college_1_department_1" });
  await createIndex(teacherCollection, { user_id: 1, college_id: 1 }, { name: "user_1_college_1" });
  await createIndex(teacherCollection, { email: 1 }, { name: "email_1" });

  // 7. USERS INDEXES
  log("\n📌 users collection...", "info");
  const userCollection = db.collection("users");
  await createIndex(userCollection, { email: 1 }, { name: "email_1", unique: true });
  await createIndex(userCollection, { role: 1, college_id: 1 }, { name: "role_1_college_1" });
  await createIndex(userCollection, { college_id: 1 }, { name: "college_id_1" });

  // 8. COLLEGES INDEXES
  log("\n📌 colleges collection...", "info");
  const collegeCollection = db.collection("colleges");
  await createIndex(collegeCollection, { code: 1 }, { name: "code_1", unique: true });
  await createIndex(collegeCollection, { email: 1 }, { name: "email_1", unique: true });
  await createIndex(collegeCollection, { isActive: 1 }, { name: "isActive_1" });

  // 9. DEPARTMENTS INDEXES
  log("\n📌 departments collection...", "info");
  const departmentCollection = db.collection("departments");
  await createIndex(departmentCollection, { college_id: 1 }, { name: "college_id_1" });
  await createIndex(departmentCollection, { name: 1, college_id: 1 }, { name: "name_1_college_1" });
  await createIndex(departmentCollection, { isActive: 1 }, { name: "isActive_1" });

  // 10. COURSES INDEXES
  log("\n📌 courses collection...", "info");
  const courseCollection = db.collection("courses");
  await createIndex(courseCollection, { college_id: 1 }, { name: "college_id_1" });
  await createIndex(courseCollection, { name: 1, college_id: 1 }, { name: "name_1_college_1" });
  await createIndex(courseCollection, { isActive: 1 }, { name: "isActive_1" });
  await createIndex(courseCollection, { durationSemesters: 1 }, { name: "durationSemesters_1" });

  // 11. SUBJECTS INDEXES
  log("\n📌 subjects collection...", "info");
  const subjectCollection = db.collection("subjects");
  await createIndex(subjectCollection, { college_id: 1, course_id: 1 }, { name: "college_1_course_1" });
  await createIndex(subjectCollection, { college_id: 1, semester: 1 }, { name: "college_1_semester_1" });
  await createIndex(subjectCollection, { teacher_id: 1, college_id: 1 }, { name: "teacher_1_college_1" });
  await createIndex(subjectCollection, { isActive: 1 }, { name: "isActive_1" });

  // 12. FEE STRUCTURE INDEXES
  log("\n📌 feestructures collection...", "info");
  const feeStructureCollection = db.collection("feestructures");
  await createIndex(feeStructureCollection, { college_id: 1, course_id: 1 }, { name: "college_1_course_1" });
  await createIndex(feeStructureCollection, { college_id: 1, semester: 1 }, { name: "college_1_semester_1" });
  await createIndex(feeStructureCollection, { isActive: 1 }, { name: "isActive_1" });

  // 13. PROMOTION HISTORY INDEXES
  log("\n📌 promotionhistories collection...", "info");
  const promotionHistoryCollection = db.collection("promotionhistories");
  await createIndex(promotionHistoryCollection, { college_id: 1, student_id: 1 }, { name: "college_1_student_1" });
  await createIndex(promotionHistoryCollection, { fromSemester: 1, toSemester: 1 }, { name: "fromSemester_1_toSemester_1" });
  await createIndex(promotionHistoryCollection, { academicYear: 1 }, { name: "academicYear_1" });

  // 14. TIMETABLE SLOTS INDEXES
  log("\n📌 timetableslots collection...", "info");
  const timetableSlotCollection = db.collection("timetableslots");
  await createIndex(timetableSlotCollection, { college_id: 1, department_id: 1 }, { name: "college_1_department_1" });
  await createIndex(timetableSlotCollection, { dayOfWeek: 1, startTime: 1, endTime: 1 }, { name: "day_1_start_1_end_1" });
  await createIndex(timetableSlotCollection, { isActive: 1 }, { name: "isActive_1" });

  // 15. REFRESH TOKENS INDEXES
  log("\n📌 refreshtokens collection...", "info");
  const refreshTokenCollection = db.collection("refreshtokens");
  await createIndex(refreshTokenCollection, { userId: 1 }, { name: "userId_1" });
  await createIndex(refreshTokenCollection, { expiresAt: 1 }, { name: "expiresAt_1" });
  await createIndex(refreshTokenCollection, { token: 1 }, { name: "token_1", unique: true });

  // 16. TOKEN BLACKLIST INDEXES
  log("\n📌 tokenblacklists collection...", "info");
  const tokenBlacklistCollection = db.collection("tokenblacklists");
  await createIndex(tokenBlacklistCollection, { token: 1 }, { name: "token_1", unique: true });
  await createIndex(tokenBlacklistCollection, { expiresAt: 1 }, { name: "expiresAt_1" });

  // 17. PASSWORD RESETS INDEXES
  log("\n📌 passwordresets collection...", "info");
  const passwordResetCollection = db.collection("passwordresets");
  await createIndex(passwordResetCollection, { email: 1 }, { name: "email_1" });
  await createIndex(passwordResetCollection, { otp: 1 }, { name: "otp_1" });
  await createIndex(passwordResetCollection, { expiresAt: 1 }, { name: "expiresAt_1" });

  log("\n" + "=".repeat(60), "info");
  log(`Index Summary: ${stats.indexes.created} created, ${stats.indexes.existing} existing, ${stats.indexes.errors} errors`, "success");
}

// ==========================================
// SEED DATA FUNCTIONS
// ==========================================
async function seedSuperAdmin() {
  log("\n👤 Creating Super Admin user...", "info");

  try {
    const existingAdmin = await User.findOne({ email: config.superAdmin.email });
    if (existingAdmin) {
      log(`Super Admin already exists: ${config.superAdmin.email}`, "exist");
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(config.superAdmin.password, 10);
    const superAdmin = await User.create({
      name: config.superAdmin.name,
      email: config.superAdmin.email,
      password: hashedPassword,
      role: config.superAdmin.role
    });

    log(`Super Admin created: ${config.superAdmin.email}`, "create");
    stats.seed.users++;
    return superAdmin;
  } catch (err) {
    log(`Failed to create Super Admin: ${err.message}`, "error");
    throw err;
  }
}

async function seedSampleCollege() {
  if (!config.createSampleCollege) {
    log("\n⏭️  Skipping sample college creation (production mode)", "info");
    return null;
  }

  log("\n🏫 Creating sample college...", "info");

  try {
    const existingCollege = await College.findOne({ email: config.sampleCollege.email });
    if (existingCollege) {
      log(`Sample college already exists: ${existingCollege.name}`, "exist");
      return existingCollege;
    }

    // Generate college code
    const code = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    const registrationUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/register/${code}`;

    const college = await College.create({
      name: config.sampleCollege.name,
      code: code,
      email: config.sampleCollege.email,
      contactNumber: config.sampleCollege.contactNumber,
      address: config.sampleCollege.address,
      establishedYear: config.sampleCollege.establishedYear,
      registrationUrl: registrationUrl,
      registrationQr: "" // QR code generation would go here
    });

    log(`Sample college created: ${college.name} (${college.code})`, "create");
    stats.seed.colleges++;

    // Create sample departments
    await seedSampleDepartments(college);

    return college;
  } catch (err) {
    log(`Failed to create sample college: ${err.message}`, "error");
    throw err;
  }
}

async function seedSampleDepartments(college) {
  const sampleDepartments = [
    { name: "Computer Engineering", shortName: "CE" },
    { name: "Information Technology", shortName: "IT" },
    { name: "Electronics & Communication", shortName: "EC" },
    { name: "Mechanical Engineering", shortName: "ME" },
    { name: "Civil Engineering", shortName: "CE" }
  ];

  log("\n📚 Creating sample departments...", "info");

  for (const dept of sampleDepartments) {
    try {
      const existing = await Department.findOne({
        college_id: college._id,
        name: dept.name
      });

      if (existing) {
        log(`Department exists: ${dept.name}`, "exist");
        continue;
      }

      await Department.create({
        college_id: college._id,
        name: dept.name,
        shortName: dept.shortName,
        isActive: true
      });

      log(`Department created: ${dept.name}`, "create");
      stats.seed.departments++;
    } catch (err) {
      log(`Failed to create department ${dept.name}: ${err.message}`, "error");
    }
  }
}

async function seedSampleCourses(college, departments) {
  const sampleCourses = [
    { name: "B.Tech Computer Science", durationSemesters: 8, durationYears: 4 },
    { name: "B.Tech Information Technology", durationSemesters: 8, durationYears: 4 },
    { name: "B.Tech Electronics & Communication", durationSemesters: 8, durationYears: 4 },
    { name: "M.Tech Computer Science", durationSemesters: 4, durationYears: 2 },
    { name: "MCA", durationSemesters: 6, durationYears: 3 }
  ];

  log("\n🎓 Creating sample courses...", "info");

  for (const course of sampleCourses) {
    try {
      const existing = await Course.findOne({
        college_id: college._id,
        name: course.name
      });

      if (existing) {
        log(`Course exists: ${course.name}`, "exist");
        continue;
      }

      await Course.create({
        college_id: college._id,
        name: course.name,
        durationSemesters: course.durationSemesters,
        durationYears: course.durationYears,
        isActive: true
      });

      log(`Course created: ${course.name}`, "create");
      stats.seed.courses++;
    } catch (err) {
      log(`Failed to create course ${course.name}: ${err.message}`, "error");
    }
  }
}

// ==========================================
// DATA MIGRATION FUNCTIONS
// ==========================================
async function migrateStudentCurrentYear() {
  log("\n🔄 Migrating student currentYear field...", "info");

  try {
    const students = await Student.find({ currentYear: { $exists: false } });
    
    if (students.length === 0) {
      log("All students already have currentYear field", "exist");
      return;
    }

    log(`Found ${students.length} students to migrate`, "info");

    let migrated = 0;
    for (const student of students) {
      try {
        student.currentYear = Math.ceil(student.currentSemester / 2);
        await student.save();
        migrated++;
      } catch (err) {
        log(`Failed to migrate student ${student._id}: ${err.message}`, "error");
      }
    }

    log(`Migrated ${migrated}/${students.length} students`, "success");
    stats.migrations.completed += migrated;
  } catch (err) {
    log(`Migration failed: ${err.message}`, "error");
    stats.migrations.errors++;
  }
}

async function migrateCourseDuration() {
  log("\n🔄 Migrating course semester → durationSemesters...", "info");

  try {
    const courses = await Course.find({ 
      semester: { $exists: true },
      durationSemesters: { $exists: false }
    });

    if (courses.length === 0) {
      log("All courses already migrated", "exist");
      return;
    }

    log(`Found ${courses.length} courses to migrate`, "info");

    for (const course of courses) {
      try {
        course.durationSemesters = course.semester;
        course.durationYears = Math.ceil(course.semester / 2);
        await course.save();
        stats.migrations.completed++;
      } catch (err) {
        log(`Failed to migrate course ${course._id}: ${err.message}`, "error");
        stats.migrations.errors++;
      }
    }

    log(`Migrated ${courses.length} courses`, "success");
  } catch (err) {
    log(`Migration failed: ${err.message}`, "error");
    stats.migrations.errors++;
  }
}

// ==========================================
// VERIFICATION FUNCTIONS
// ==========================================
async function verifyMigration(db) {
  log("\n🔍 VERIFYING MIGRATION", "info");
  log("=".repeat(60), "info");

  const collections = await db.listCollections().toArray();
  log(`Total collections: ${collections.length}`, "info");

  const indexes = {};
  for (const collection of collections) {
    const collectionIndexes = await db.collection(collection.name).listIndexes().toArray();
    indexes[collection.name] = collectionIndexes.length;
  }

  log("\n📊 Collection Index Summary:", "info");
  for (const [collection, count] of Object.entries(indexes)) {
    if (count > 1) { // 1 is just the default _id index
      log(`   ${collection}: ${count} indexes`, "success");
    }
  }

  // Count seeded data
  const userCount = await User.countDocuments();
  const collegeCount = await College.countDocuments();
  const departmentCount = await Department.countDocuments();
  const courseCount = await Course.countDocuments();

  log("\n📊 Data Summary:", "info");
  log(`   Users: ${userCount}`, "info");
  log(`   Colleges: ${collegeCount}`, "info");
  log(`   Departments: ${departmentCount}`, "info");
  log(`   Courses: ${courseCount}`, "info");
}

// ==========================================
// MAIN MIGRATION FUNCTION
// ==========================================
async function runMigration() {
  console.clear();
  
  console.log("\n" + "=".repeat(70));
  console.log("🚀 NOVAA - SMART COLLEGE MERN");
  console.log("📊 DATABASE MIGRATION SCRIPT");
  console.log("=".repeat(70));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(70) + "\n");

  let conn;

  try {
    // Connect to MongoDB
    log("Connecting to database...", "info");
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/smart-college-mern";
    log(`Using: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`, "info");
    
    conn = await mongoose.connect(mongoUri);
    log("Connected to MongoDB", "success");

    const db = mongoose.connection.db;

    // Step 1: Create all indexes
    await createAllIndexes(db);

    // Step 2: Seed initial data
    log("\n🌱 SEEDING INITIAL DATA", "info");
    log("=".repeat(60), "info");
    
    const superAdmin = await seedSuperAdmin();
    const sampleCollege = await seedSampleCollege();

    if (sampleCollege) {
      const departments = await Department.find({ college_id: sampleCollege._id });
      await seedSampleCourses(sampleCollege, departments);
    }

    // Step 3: Run data migrations
    log("\n🔄 RUNNING DATA MIGRATIONS", "info");
    log("=".repeat(60), "info");
    
    await migrateStudentCurrentYear();
    await migrateCourseDuration();

    // Step 4: Verify migration
    await verifyMigration(db);

    // Final summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(70));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Indexes: ${stats.indexes.created} created, ${stats.indexes.existing} existing, ${stats.indexes.errors} errors`);
    console.log(`✅ Seed Data: ${stats.seed.users} users, ${stats.seed.colleges} colleges, ${stats.seed.departments} departments, ${stats.seed.courses} courses`);
    console.log(`✅ Migrations: ${stats.migrations.completed} completed, ${stats.migrations.errors} errors`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(70));

    if (stats.indexes.errors === 0 && stats.migrations.errors === 0) {
      log("🎉 Migration completed successfully!", "success");
      
      if (config.createSampleCollege) {
        console.log("\n📋 SAMPLE DATA CREATED:");
        console.log("   Super Admin: admin@novaa.edu / Admin@123");
        console.log("   ⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!");
      }
    } else {
      log("⚠️  Migration completed with some errors. Review logs above.", "warning");
    }

    console.log("\n" + "=".repeat(70) + "\n");

  } catch (err) {
    log(`Migration failed: ${err.message}`, "error");
    log(err.stack, "error");
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
      log("Database connection closed", "info");
    }
  }
}

// Run migration
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
