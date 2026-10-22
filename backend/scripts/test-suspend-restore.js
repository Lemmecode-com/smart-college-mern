/**
 * Test: College Suspend & Restore — Student Status Preservation
 * Directly exercises Mongoose hooks (same code path as production API)
 * Run: node scripts/test-suspend-restore.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

// Register every model referenced inside the college.model hooks
require("../src/models/department.model");
require("../src/models/course.model");
require("../src/models/teacher.model");
require("../src/models/subject.model");
require("../src/models/feeStructure.model");
require("../src/models/studentFee.model");
require("../src/models/notification.model");
require("../src/models/timetable.model");
require("../src/models/timetableSlot.model");
require("../src/models/attendanceSession.model");
require("../src/models/attendanceRecord.model");
require("../src/models/documentConfig.model");
require("../src/models/notificationRead.model");
require("../src/models/promotionHistory.model");
require("../src/models/user.model");
require("../src/models/student.model");

const College = require("../src/models/college.model");
const Student = require("../src/models/student.model");
const User    = require("../src/models/user.model");

// ── Console helpers ───────────────────────────────────────────────────────────
const pass = (msg) => console.log(`  ✅ PASS  ${msg}`);
const fail = (msg) => { console.log(`  ❌ FAIL  ${msg}`); process.exitCode = 1; };
const info = (msg) => console.log(`\n─── ${msg} ───`);

function assert(label, actual, expected) {
  String(actual) === String(expected)
    ? pass(label)
    : fail(`${label}  →  expected "${expected}"  got "${actual}"`);
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const ts = Date.now();

async function seedCollege() {
  return College.create({
    name:            `Test College ${ts}`,
    code:            `tst${ts}`.slice(-10).toLowerCase(),
    email:           `tst${ts}@testcollege.com`,
    contactNumber:   "9876543210",
    address:         "123 Test Street, Pune",
    establishedYear: 2000,
    registrationUrl: "http://localhost/register",
    registrationQr:  "test-qr-placeholder",
  });
}

async function seedAdminUser(college_id) {
  return User.create({
    name:     "Test Admin",
    email:    `admin_${ts}@testcollege.com`,
    password: "notarealhash",
    role:     "COLLEGE_ADMIN",
    college_id,
    isActive: true,
  });
}

async function seedDepartment(college_id, adminUserId) {
  return mongoose.model("Department").create({
    college_id,
    name:                    "Test Department",
    code:                    `TDPT${ts}`.slice(-8).toUpperCase(),
    type:                    "ACADEMIC",
    programsOffered:         ["UG"],
    startYear:               2000,
    sanctionedFacultyCount:  5,
    sanctionedStudentIntake: 60,
    createdBy:               adminUserId,
  });
}

async function seedCourse(college_id, department_id, adminUserId) {
  return mongoose.model("Course").create({
    college_id,
    department_id,
    name:              "Test Course",
    code:              `TCRS${ts}`.slice(-8).toUpperCase(),
    type:              "THEORY",
    programLevel:      "UG",
    durationSemesters: 6,
    credits:           120,
    maxStudents:       60,
    createdBy:         adminUserId,
  });
}

async function seedStudentUser(college_id, label) {
  return User.create({
    name:     `Student ${label}`,
    email:    `student_${label}_${ts}@testcollege.com`,
    password: "notarealhash",
    role:     "STUDENT",
    college_id,
    isActive: true,
  });
}

async function seedStudent(college_id, department_id, course_id, user_id, status) {
  return Student.create({
    college_id,
    department_id,
    course_id,
    user_id,
    fullName:           `Student ${status} ${ts}`,
    email:              `stu_${status}_${ts}@testcollege.com`,
    mobileNumber:       "9876543210",
    gender:             "Male",
    dateOfBirth:        new Date("2000-06-15"),
    addressLine:        "123 Test Lane",
    city:               "Pune",
    state:              "Maharashtra",
    pincode:            "411001",
    admissionYear:      2023,
    currentSemester:    1,
    category:           "GEN",
    status,
    currentAcademicYear: "2024-2025",
  });
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanup(collegeId) {
  await Student.deleteMany({ college_id: collegeId });
  await mongoose.model("Department").deleteMany({ college_id: collegeId });
  await mongoose.model("Course").deleteMany({ college_id: collegeId });
  await User.deleteMany({ college_id: collegeId });
  await College.deleteOne({ _id: collegeId });
}

// ── Test runner ───────────────────────────────────────────────────────────────
async function run() {
  console.log("\n🧪  College Suspend & Restore — Student Status Test");
  console.log("    Testing the P0 bug fix: PENDING/REJECTED students must");
  console.log("    NOT be promoted to APPROVED on college restore.\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("  Connected to MongoDB Atlas\n");

  let college;

  try {
    // ── SEED ─────────────────────────────────────────────────────────────────
    info("Seeding test data");
    college    = await seedCollege();
    const adminUser  = await seedAdminUser(college._id);
    const dept       = await seedDepartment(college._id, adminUser._id);
    const course     = await seedCourse(college._id, dept._id, adminUser._id);

    const uApproved  = await seedStudentUser(college._id, "APPROVED");
    const uPending   = await seedStudentUser(college._id, "PENDING");
    const uRejected  = await seedStudentUser(college._id, "REJECTED");

    const sApproved  = await seedStudent(college._id, dept._id, course._id, uApproved._id,  "APPROVED");
    const sPending   = await seedStudent(college._id, dept._id, course._id, uPending._id,   "PENDING");
    const sRejected  = await seedStudent(college._id, dept._id, course._id, uRejected._id,  "REJECTED");

    console.log(`  College   : ${college.name}`);
    console.log(`  Students  : APPROVED(${sApproved.fullName}) | PENDING(${sPending.fullName}) | REJECTED(${sRejected.fullName})\n`);

    // ─────────────────────────────────────────────────────────────────────────
    info("TEST 1 — Suspend college (isActive → false)");
    await College.findOneAndUpdate({ _id: college._id }, { $set: { isActive: false } });

    const c1 = await College.findById(college._id);
    const a1 = await Student.findById(sApproved._id);
    const p1 = await Student.findById(sPending._id);
    const r1 = await Student.findById(sRejected._id);
    const u1 = await User.findById(uApproved._id);
    const u2 = await User.findById(uPending._id);

    assert("College isActive = false",                     c1.isActive,                  false);
    assert("APPROVED student status → INACTIVE",           a1.status,                    "INACTIVE");
    assert("APPROVED student suspendedFromStatus stamped", a1.suspendedFromStatus,        "APPROVED");
    assert("PENDING student status unchanged",             p1.status,                    "PENDING");
    assert("PENDING suspendedFromStatus = null",           p1.suspendedFromStatus,        null);
    assert("REJECTED student status unchanged",            r1.status,                    "REJECTED");
    assert("REJECTED suspendedFromStatus = null",          r1.suspendedFromStatus,        null);
    assert("APPROVED user blocked (isActive=false)",       u1.isActive,                  false);
    assert("PENDING user blocked (isActive=false)",        u2.isActive,                  false);

    // ─────────────────────────────────────────────────────────────────────────
    info("TEST 2 — Restore college (isActive → true)");
    await College.findOneAndUpdate({ _id: college._id }, { $set: { isActive: true } });

    const c2 = await College.findById(college._id);
    const a2 = await Student.findById(sApproved._id);
    const p2 = await Student.findById(sPending._id);
    const r2 = await Student.findById(sRejected._id);
    const u3 = await User.findById(uApproved._id);

    assert("College isActive = true",                          c2.isActive,               true);
    assert("INACTIVE student restored → APPROVED",             a2.status,                 "APPROVED");
    assert("suspendedFromStatus cleared after restore",        a2.suspendedFromStatus,     null);
    assert("PENDING stays PENDING after restore  [BUG FIX]",  p2.status,                  "PENDING");
    assert("REJECTED stays REJECTED after restore [BUG FIX]", r2.status,                  "REJECTED");
    assert("APPROVED user reactivated (isActive=true)",        u3.isActive,               true);

    // ─────────────────────────────────────────────────────────────────────────
    info("TEST 3 — No orphaned INACTIVE students after restore");
    const orphans = await Student.countDocuments({ college_id: college._id, status: "INACTIVE" });
    assert("Zero INACTIVE students remain", orphans, 0);

    // ─────────────────────────────────────────────────────────────────────────
    info("TEST 4 — Double cycle: Suspend → Restore → Suspend → Restore");
    await College.findOneAndUpdate({ _id: college._id }, { $set: { isActive: false } });
    await College.findOneAndUpdate({ _id: college._id }, { $set: { isActive: true } });

    const a3 = await Student.findById(sApproved._id);
    const p3 = await Student.findById(sPending._id);
    const r3 = await Student.findById(sRejected._id);

    assert("After 2nd cycle: APPROVED still APPROVED",  a3.status, "APPROVED");
    assert("After 2nd cycle: PENDING still PENDING",    p3.status, "PENDING");
    assert("After 2nd cycle: REJECTED still REJECTED",  r3.status, "REJECTED");
    assert("After 2nd cycle: suspendedFromStatus null", a3.suspendedFromStatus, null);

  } finally {
    if (college) {
      info("Cleanup");
      await cleanup(college._id);
      console.log("  All test data removed from Atlas\n");
    }
    await mongoose.disconnect();

    const result = process.exitCode === 1
      ? "🔴  One or more tests FAILED"
      : "🟢  All tests PASSED";
    console.log(`${result}\n`);
  }
}

run().catch((err) => {
  console.error("\n💥  Test runner crashed:", err.message, "\n");
  process.exit(1);
});
