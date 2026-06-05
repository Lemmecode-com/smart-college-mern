require("dotenv").config();
const mongoose = require("mongoose");

const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");
const Teacher = require("../src/models/teacher.model");
const User = require("../src/models/user.model");
const path = require("path");

async function runDebug() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB\n");

    // 1. Find HOD users
    console.log("=" .repeat(60));
    console.log("1. HOD USERS AND THEIR DEPARTMENTS");
    console.log("=" .repeat(60));
    
    const hodUsers = await User.find({ role: "TEACHER" });
    for (const user of hodUsers) {
      const teacher = await Teacher.findOne({ user_id: user._id });
      if (teacher) {
        console.log(`\nUser: ${user.email} (${user.role})`);
        console.log(`  Teacher ID: ${teacher._id}`);
        console.log(`  department_id in Teacher: ${teacher.department_id || "MISSING"}`);
        
        // Check if teacher is HOD of any department
        const hodDept = await Department.findOne({ hod_id: teacher._id });
        if (hodDept) {
          console.log(`  HOD OF DEPARTMENT: ${hodDept.name}`);
          console.log(`  Department _id: ${hodDept._id}`);
        } else {
          console.log(`  NOT an HOD of any department`);
        }
      }
    }

    // 2. Get all departments
console.log("\n" + "=".repeat(60));
    console.log("5. SIMULATING GET /api/courses/department/{departmentId}");
    console.log("=".repeat(60));
    
    // Find the Engineering & Technology department with HOD
    const hodDept = departments.find(d => d.name === "Engineering & Technology");
    if (hodDept) {
      console.log(`\nQuerying courses for HOD's department: ${hodDept._id}`);
      console.log(`Department: ${hodDept.name}`);
      
      // Check by department_id
      const deptCourses = await Course.find({ department_id: hodDept._id }).select("_id name department_id college_id");
      console.log(`\nFound ${deptCourses.length} courses by department_id query`);
      for (const c of deptCourses) {
        console.log(`  - ${c.name} (_id: ${c._id}, dept: ${c.department_id}, college: ${c.college_id})`);
      }
      
      // Check if courses have matching college_id
      const collegeId = hodDept.college_id;
      const collegeCourses = await Course.find({ college_id: collegeId }).select("_id name department_id college_id");
      console.log(`\nFound ${collegeCourses.length} courses by college_id: ${collegeId}`);
      
      console.log("\nCross-check: Courses in this college but DIFFERENT department:");
      const mismatched = collegeCourses.filter(c => 
        String(c.department_id) !== String(hodDept._id)
      );
      console.log(`  Mismatched courses: ${mismatched.length}`);
      for (const c of mismatched) {
        console.log(`    - ${c.name} (dept: ${c.department_id})`);
      }
    }

    // 6. Check courses WITHOUT department_id (data integrity check)
    console.log("\n" + "=".repeat(60));
    console.log("6. COURSES MISSING department_id (DATA INTEGRITY CHECK)");
    console.log("=".repeat(60));
    
    const coursesNoDept = await Course.find({
      $or: [
        { department_id: { $exists: false } },
        { department_id: null }
      ]
    }).select("_id name college_id department_id");
    console.log(`\nCourses WITHOUT department_id: ${coursesNoDept.length}`);
    for (const c of coursesNoDept) {
      console.log(`  - ${c.name} (_id: ${c._id})`);
    }

    // 3. Get all courses and check their department_id field
    console.log("\n" + "=".repeat(60));
    console.log("3. ALL COURSES - CHECKING department_id FIELD");
    console.log("=".repeat(60));
    
    const courses = await Course.find({}).select("_id name department_id college_id");
    console.log(`\nTotal courses found: ${courses.length}\n`);
    
    let missingDeptId = 0;
    let hasDeptId = 0;
    for (const course of courses) {
      const hasDept = course.department_id !== null && course.department_id !== undefined;
      if (!hasDept) {
        missingDeptId++;
        console.log(`❌ ${course.name}`);
        console.log(`   _id: ${course._id}`);
        console.log(`   department_id: MISSING/NULL`);
        console.log(`   college_id: ${course.college_id}`);
      } else {
        hasDeptId++;
        console.log(`✅ ${course.name}`);
        console.log(`   _id: ${course._id}`);
        console.log(`   department_id: ${course.department_id}`);
        console.log(`   college_id: ${course.college_id}`);
      }
    }

    // 4. Summary
    console.log("\n" + "=".repeat(60));
    console.log("4. SUMMARY");
    console.log("=".repeat(60));
    console.log(`Courses WITH department_id: ${hasDeptId}`);
    console.log(`Courses WITHOUT department_id: ${missingDeptId}`);
    console.log(`Total courses: ${courses.length}`);

    // 5. Check course by department query (simulate API call)
    console.log("\n" + "=".repeat(60));
    console.log("5. SIMULATING GET /api/courses/department/{departmentId}");
    console.log("=".repeat(60));
    
    if (departments.length > 0) {
      // Find the Engineering & Technology department with HOD
      const hodDept = departments.find(d => d.name === "Engineering & Technology");
      if (hodDept) {
        console.log(`\nQuerying courses for HOD's department: ${hodDept._id}`);
        console.log(`Department: ${hodDept.name}`);
        const deptCourses = await Course.find({ department_id: hodDept._id }).select("_id name department_id college_id");
        console.log(`Found ${deptCourses.length} courses in this department`);
        if (deptCourses.length > 0) {
          for (const c of deptCourses) {
            console.log(`  - ${c.name} (_id: ${c._id}, dept: ${c.department_id}, college: ${c.college_id})`);
          }
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

runDebug();