/**
 * 🧪 TEST SCRIPT: Soft Delete College Workflow
 * 
 * Purpose: Test the cascade soft delete and restore functionality
 * Run: node backend/scripts/test-soft-delete.js
 * 
 * This script:
 * 1. Creates a test college with sample data
 * 2. Soft deletes the college
 * 3. Verifies all related records are deactivated
 * 4. Restores the college
 * 5. Verifies all related records are reactivated
 * 6. Cleans up test data
 */

require("dotenv").config();
const mongoose = require("mongoose");

const College = require("../src/models/college.model");
const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");
const Student = require("../src/models/student.model");
const Teacher = require("../src/models/teacher.model");

const TEST_DATA = {
  college: {
    name: "Test College for Deletion",
    code: "testcoldelete",
    email: "testdelete@college.edu",
    contactNumber: "9876543210",
    address: "123 Test Street, Test City",
    establishedYear: 2020,
    registrationUrl: "/register/testcoldelete",
    registrationQr: "/qr/testcoldelete.png"
  }
};

async function testSoftDelete() {
  let testCollegeId = null;
  
  console.log("=".repeat(60));
  console.log("🧪 SOFT DELETE WORKFLOW TEST");
  console.log("=".repeat(60));

  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/smart-college-mern");
    console.log("✅ Connected to MongoDB\n");

    // ========== STEP 1: Create Test Data ==========
    console.log("📝 STEP 1: Creating test college with sample data...");
    
    const college = await College.create(TEST_DATA.college);
    testCollegeId = college._id;
    console.log(`   ✅ Created College: ${college.name} (${college.code})`);

    const department = await Department.create({
      college_id: college._id,
      name: "Test Department",
      code: "TESTDEPT",
      isActive: true
    });
    console.log(`   ✅ Created Department: ${department.name}`);

    const course = await Course.create({
      college_id: college._id,
      department_id: department._id,
      name: "Test Course",
      code: "TEST101",
      isActive: true
    });
    console.log(`   ✅ Created Course: ${course.name}`);

    const teacher = await Teacher.create({
      college_id: college._id,
      department_id: department._id,
      name: "Test Teacher",
      employeeId: "TESTT001",
      email: "testteacher@college.edu",
      contactNumber: "9876543211",
      isActive: true
    });
    console.log(`   ✅ Created Teacher: ${teacher.name}`);

    const student = await Student.create({
      college_id: college._id,
      department_id: department._id,
      course_id: course._id,
      name: "Test Student",
      email: "teststudent@college.edu",
      contactNumber: "9876543212",
      enrollmentNumber: "TESTS001",
      status: "APPROVED"
    });
    console.log(`   ✅ Created Student: ${student.name}`);

    // ========== STEP 2: Verify Initial State ==========
    console.log("\n📊 STEP 2: Verifying initial state...");
    
    let activeCollege = await College.findById(testCollegeId);
    let activeDepartments = await Department.countDocuments({ college_id: testCollegeId, isActive: true });
    let activeCourses = await Course.countDocuments({ college_id: testCollegeId, isActive: true });
    let activeTeachers = await Teacher.countDocuments({ college_id: testCollegeId, isActive: true });
    let approvedStudents = await Student.countDocuments({ college_id: testCollegeId, status: "APPROVED" });

    console.log(`   College isActive: ${activeCollege.isActive}`);
    console.log(`   Active Departments: ${activeDepartments}`);
    console.log(`   Active Courses: ${activeCourses}`);
    console.log(`   Active Teachers: ${activeTeachers}`);
    console.log(`   Approved Students: ${approvedStudents}`);

    if (!activeCollege.isActive || activeDepartments === 0 || activeCourses === 0) {
      throw new Error("Initial state verification failed!");
    }
    console.log("   ✅ Initial state verified");

    // ========== STEP 3: Soft Delete College ==========
    console.log("\n🔒 STEP 3: Soft deleting college (cascade deactivation)...");
    
    await College.findOneAndUpdate(
      { _id: testCollegeId },
      { $set: { isActive: false } }
    );
    console.log("   ✅ College soft deleted");

    // ========== STEP 4: Verify Soft Delete ==========
    console.log("\n📊 STEP 4: Verifying soft delete cascade...");
    
    let deletedCollege = await College.findById(testCollegeId);
    let inactiveDepartments = await Department.countDocuments({ college_id: testCollegeId, isActive: false });
    let inactiveCourses = await Course.countDocuments({ college_id: testCollegeId, isActive: false });
    let inactiveTeachers = await Teacher.countDocuments({ college_id: testCollegeId, isActive: false });
    let inactiveStudents = await Student.countDocuments({ college_id: testCollegeId, status: "INACTIVE" });

    console.log(`   College isActive: ${deletedCollege.isActive}`);
    console.log(`   Inactive Departments: ${inactiveDepartments}`);
    console.log(`   Inactive Courses: ${inactiveCourses}`);
    console.log(`   Inactive Teachers: ${inactiveTeachers}`);
    console.log(`   Inactive Students: ${inactiveStudents}`);

    if (deletedCollege.isActive !== false) {
      throw new Error("College should be inactive!");
    }
    if (inactiveDepartments !== 1) {
      throw new Error("Department should be inactive!");
    }
    if (inactiveCourses !== 1) {
      throw new Error("Course should be inactive!");
    }
    if (inactiveTeachers !== 1) {
      throw new Error("Teacher should be inactive!");
    }
    if (inactiveStudents !== 1) {
      throw new Error("Student should be inactive!");
    }
    console.log("   ✅ Soft delete cascade verified");

    // ========== STEP 5: Restore College ==========
    console.log("\n🔄 STEP 5: Restoring college (cascade reactivation)...");
    
    await College.findOneAndUpdate(
      { _id: testCollegeId },
      { $set: { isActive: true } }
    );
    console.log("   ✅ College restored");

    // ========== STEP 6: Verify Restore ==========
    console.log("\n📊 STEP 6: Verifying restore cascade...");
    
    let restoredCollege = await College.findById(testCollegeId);
    let restoredDepartments = await Department.countDocuments({ college_id: testCollegeId, isActive: true });
    let restoredCourses = await Course.countDocuments({ college_id: testCollegeId, isActive: true });
    let restoredTeachers = await Teacher.countDocuments({ college_id: testCollegeId, isActive: true });
    let restoredStudents = await Student.countDocuments({ college_id: testCollegeId, status: "APPROVED" });

    console.log(`   College isActive: ${restoredCollege.isActive}`);
    console.log(`   Active Departments: ${restoredDepartments}`);
    console.log(`   Active Courses: ${restoredCourses}`);
    console.log(`   Active Teachers: ${restoredTeachers}`);
    console.log(`   Approved Students: ${restoredStudents}`);

    if (restoredCollege.isActive !== true) {
      throw new Error("College should be active after restore!");
    }
    if (restoredDepartments !== 1) {
      throw new Error("Department should be active after restore!");
    }
    if (restoredCourses !== 1) {
      throw new Error("Course should be active after restore!");
    }
    if (restoredTeachers !== 1) {
      throw new Error("Teacher should be active after restore!");
    }
    if (restoredStudents !== 1) {
      throw new Error("Student should be approved after restore!");
    }
    console.log("   ✅ Restore cascade verified");

    // ========== STEP 7: Cleanup Test Data ==========
    console.log("\n🧹 STEP 7: Cleaning up test data...");
    
    await College.findByIdAndDelete(testCollegeId);
    console.log("   ✅ Test data deleted");

    // ========== FINAL RESULT ==========
    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(60));
    console.log("\n📋 Test Summary:");
    console.log("   ✓ College soft delete works");
    console.log("   ✓ Cascade deactivation works for all models");
    console.log("   ✓ College restore works");
    console.log("   ✓ Cascade reactivation works for all models");
    console.log("   ✓ Data integrity maintained");
    console.log("=".repeat(60));

    return true;

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ TEST FAILED!");
    console.error("=".repeat(60));
    console.error("Error:", error.message);
    
    // Cleanup on failure
    if (testCollegeId) {
      console.log("\n🧹 Cleaning up test data after failure...");
      await College.findByIdAndDelete(testCollegeId);
      await Department.deleteMany({ college_id: testCollegeId });
      await Course.deleteMany({ college_id: testCollegeId });
      await Teacher.deleteMany({ college_id: testCollegeId });
      await Student.deleteMany({ college_id: testCollegeId });
      console.log("   ✅ Cleanup completed");
    }
    
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

// Run the test
testSoftDelete()
  .then(() => {
    console.log("\n✅ Test script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test script failed:", error);
    process.exit(1);
  });
