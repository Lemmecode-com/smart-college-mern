/**
 * 🌱 DATABASE SEED DATA SCRIPT
 *
 * Project: NOVAA - Smart College MERN
 * Version: 1.0.0
 * Date: March 6, 2026
 *
 * Purpose:
 * - Populate database with sample/initial data
 * - Create demo colleges, departments, courses
 * - Create sample users (teachers, students)
 * - Safe to run multiple times (idempotent)
 *
 * Usage:
 *   node backend/scripts/seed-data.js              # Seed all data
 *   node backend/scripts/seed-data.js --minimal    # Seed only essentials
 *   node backend/scripts/seed-data.js --users      # Seed only users
 *   npm run seed                                   # Seed all data
 *   npm run seed:minimal                           # Seed minimal data
 *
 * Environment Variables Required:
 * - MONGO_URI or MONGODB_URI
 * - FRONTEND_URL (optional, default: http://localhost:5173)
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
const FeeStructure = require("../src/models/feeStructure.model");
const DocumentConfig = require("../src/models/documentConfig.model");

// ==========================================
// CONFIGURATION
// ==========================================
const config = {
  mode: process.argv.includes("--minimal") ? "minimal" : 
        process.argv.includes("--users") ? "users" : "full",
  
  frontendUrl: process.env.FRONTEND_URL,
  
  // Default passwords for seeded users
  defaultPassword: "User@123",
  
  // Sample data configuration
  colleges: [
    {
      name: "Institute of Technology Mumbai",
      email: "info@itmumbai.edu.in",
      contactNumber: "9876543210",
      address: "Tech Park Road, Powai, Mumbai, Maharashtra - 400076",
      establishedYear: 1985,
      code: "ITM"
    },
    {
      name: "College of Engineering Pune",
      email: "info@coepune.ac.in",
      contactNumber: "9123456789",
      address: "Shivaji Nagar, Pune, Maharashtra - 411005",
      establishedYear: 1854,
      code: "COEP"
    }
  ],
  
  departments: [
    { name: "Computer Science & Engineering", shortName: "CSE" },
    { name: "Information Technology", shortName: "IT" },
    { name: "Electronics & Telecommunication", shortName: "EXTC" },
    { name: "Mechanical Engineering", shortName: "MECH" },
    { name: "Civil Engineering", shortName: "CIVIL" },
    { name: "Electrical Engineering", shortName: "ELEC" }
  ],
  
  courses: [
    { name: "B.Tech Computer Science", durationSemesters: 8, durationYears: 4 },
    { name: "B.Tech Information Technology", durationSemesters: 8, durationYears: 4 },
    { name: "B.Tech Electronics & Telecommunication", durationSemesters: 8, durationYears: 4 },
    { name: "B.Tech Mechanical Engineering", durationSemesters: 8, durationYears: 4 },
    { name: "B.Tech Civil Engineering", durationSemesters: 8, durationYears: 4 },
    { name: "B.Tech Electrical Engineering", durationSemesters: 8, durationYears: 4 },
    { name: "M.Tech Computer Science", durationSemesters: 4, durationYears: 2 },
    { name: "M.Tech Data Science", durationSemesters: 4, durationYears: 2 },
    { name: "MCA", durationSemesters: 6, durationYears: 3 },
    { name: "MBA", durationSemesters: 4, durationYears: 2 }
  ],
  
  // Sample teachers
  teachers: [
    { name: "Dr. Rajesh Kumar", email: "rajesh.k@demo.edu", department: "CSE" },
    { name: "Prof. Priya Sharma", email: "priya.s@demo.edu", department: "CSE" },
    { name: "Dr. Amit Patel", email: "amit.p@demo.edu", department: "IT" },
    { name: "Prof. Sneha Desai", email: "sneha.d@demo.edu", department: "EXTC" },
    { name: "Dr. Vikram Singh", email: "vikram.s@demo.edu", department: "MECH" }
  ],
  
  // Sample students
  students: [
    { name: "Arjun Nair", email: "arjun.n@student.edu", semester: 3, course: "B.Tech Computer Science" },
    { name: "Kavya Reddy", email: "kavya.r@student.edu", semester: 5, course: "B.Tech Computer Science" },
    { name: "Rohan Mehta", email: "rohan.m@student.edu", semester: 2, course: "B.Tech Information Technology" },
    { name: "Ananya Iyer", email: "ananya.i@student.edu", semester: 7, course: "B.Tech Electronics & Telecommunication" },
    { name: "Karan Joshi", email: "karan.j@student.edu", semester: 4, course: "B.Tech Mechanical Engineering" }
  ]
};

// ==========================================
// STATISTICS TRACKING
// ==========================================
const stats = {
  users: { created: 0, existing: 0, errors: 0 },
  colleges: { created: 0, existing: 0, errors: 0 },
  departments: { created: 0, existing: 0, errors: 0 },
  courses: { created: 0, existing: 0, errors: 0 },
  teachers: { created: 0, existing: 0, errors: 0 },
  students: { created: 0, existing: 0, errors: 0 },
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

async function generateCollegeCode(name) {
  const base = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}-${random}`;
}

// ==========================================
// SEED FUNCTIONS
// ==========================================
async function seedColleges() {
  log("\n🏫 Seeding Colleges...", "info");
  
  for (const collegeData of config.colleges) {
    try {
      const existing = await College.findOne({ email: collegeData.email });
      
      if (existing) {
        log(`College exists: ${existing.name}`, "exist");
        stats.colleges.existing++;
        continue;
      }
      
      const code = await generateCollegeCode(collegeData.name);
      const registrationUrl = `${config.frontendUrl}/register/${code}`;
      
      const college = await College.create({
        ...collegeData,
        code: code,
        registrationUrl: registrationUrl,
        registrationQr: ""
      });
      
      log(`Created college: ${college.name} (${college.code})`, "create");
      stats.colleges.created++;
      
      // Store college reference for later use
      college._seedData = { departments: [], courses: [] };
      config._colleges = config._colleges || [];
      config._colleges.push(college);
      
    } catch (err) {
      log(`Failed to create college ${collegeData.name}: ${err.message}`, "error");
      stats.colleges.errors++;
    }
  }
}

async function seedDepartments() {
  if (!config._colleges || config._colleges.length === 0) {
    log("No colleges available for department seeding", "warning");
    return;
  }
  
  log("\n📚 Seeding Departments...", "info");
  
  for (const college of config._colleges) {
    for (const deptData of config.departments) {
      try {
        const existing = await Department.findOne({
          college_id: college._id,
          name: deptData.name
        });
        
        if (existing) {
          stats.departments.existing++;
          continue;
        }
        
        const department = await Department.create({
          college_id: college._id,
          name: deptData.name,
          shortName: deptData.shortName,
          isActive: true
        });
        
        log(`Created department: ${deptData.name} at ${college.name}`, "create");
        stats.departments.created++;
        
        if (!college._seedData) college._seedData = { departments: [], courses: [] };
        college._seedData.departments.push(department);
        
      } catch (err) {
        log(`Failed to create department ${deptData.name}: ${err.message}`, "error");
        stats.departments.errors++;
      }
    }
  }
}

async function seedCourses() {
  if (!config._colleges || config._colleges.length === 0) {
    log("No colleges available for course seeding", "warning");
    return;
  }
  
  log("\n🎓 Seeding Courses...", "info");
  
  for (const college of config._colleges) {
    for (const courseData of config.courses) {
      try {
        const existing = await Course.findOne({
          college_id: college._id,
          name: courseData.name
        });
        
        if (existing) {
          stats.courses.existing++;
          continue;
        }
        
        const course = await Course.create({
          college_id: college._id,
          name: courseData.name,
          durationSemesters: courseData.durationSemesters,
          durationYears: courseData.durationYears,
          isActive: true
        });
        
        log(`Created course: ${courseData.name}`, "create");
        stats.courses.created++;
        
        if (!college._seedData) college._seedData = { departments: [], courses: [] };
        college._seedData.courses.push(course);
        
      } catch (err) {
        log(`Failed to create course ${courseData.name}: ${err.message}`, "error");
        stats.courses.errors++;
      }
    }
  }
}

async function seedTeachers() {
  if (!config._colleges || config._colleges.length === 0) {
    log("No colleges available for teacher seeding", "warning");
    return;
  }
  
  log("\n👨‍🏫 Seeding Teachers...", "info");
  
  const college = config._colleges[0]; // Use first college
  const departments = college._seedData?.departments || [];
  
  for (const teacherData of config.teachers) {
    try {
      // Check if user exists
      let user = await User.findOne({ email: teacherData.email });
      
      if (!user) {
        const hashedPassword = await bcrypt.hash(config.defaultPassword, 10);
        user = await User.create({
          name: teacherData.name,
          email: teacherData.email,
          password: hashedPassword,
          role: "TEACHER",
          college_id: college._id
        });
        log(`Created teacher user: ${teacherData.name}`, "create");
        stats.users.created++;
      } else {
        stats.users.existing++;
      }
      
      // Check if teacher record exists
      const existingTeacher = await Teacher.findOne({ user_id: user._id });
      
      if (existingTeacher) {
        continue;
      }
      
      // Find department
      const department = departments.find(d => d.shortName === teacherData.department) || departments[0];
      
      if (!department) {
        log(`Department not found for ${teacherData.name}`, "error");
        continue;
      }
      
      const teacher = await Teacher.create({
        user_id: user._id,
        college_id: college._id,
        department_id: department._id,
        fullName: teacherData.name,
        email: teacherData.email,
        qualification: "M.Tech",
        experience: 5,
        specialization: teacherData.department,
        isActive: true
      });
      
      log(`Created teacher: ${teacherData.name} (${teacherData.department})`, "create");
      stats.teachers.created++;
      
    } catch (err) {
      log(`Failed to create teacher ${teacherData.name}: ${err.message}`, "error");
      stats.teachers.errors++;
    }
  }
}

async function seedStudents() {
  if (!config._colleges || config._colleges.length === 0) {
    log("No colleges available for student seeding", "warning");
    return;
  }
  
  log("\n👨‍🎓 Seeding Students...", "info");
  
  const college = config._colleges[0];
  const courses = college._seedData?.courses || [];
  const departments = college._seedData?.departments || [];
  
  for (const studentData of config.students) {
    try {
      // Check if user exists
      let user = await User.findOne({ email: studentData.email });
      
      if (!user) {
        const hashedPassword = await bcrypt.hash(config.defaultPassword, 10);
        user = await User.create({
          name: studentData.name,
          email: studentData.email,
          password: hashedPassword,
          role: "STUDENT",
          college_id: college._id
        });
        log(`Created student user: ${studentData.name}`, "create");
        stats.users.created++;
      } else {
        stats.users.existing++;
      }
      
      // Check if student record exists
      const existingStudent = await Student.findOne({ user_id: user._id });
      
      if (existingStudent) {
        continue;
      }
      
      // Find course and department
      const course = courses.find(c => c.name === studentData.course);
      
      if (!course) {
        log(`Course not found for ${studentData.name}`, "error");
        continue;
      }
      
      const department = departments[0]; // Use first department
      
      const currentYear = Math.ceil(studentData.semester / 2);
      const currentYear_str = new Date().getFullYear();
      const academicYear = `${currentYear_str}-${currentYear_str + 1}`;
      
      const student = await Student.create({
        user_id: user._id,
        college_id: college._id,
        department_id: department._id,
        course_id: course._id,
        fullName: studentData.name,
        email: studentData.email,
        mobileNumber: `9${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        gender: "Male",
        dateOfBirth: new Date(Date.now() - Math.random() * 63115200000), // Random DOB 18-38 years ago
        addressLine: `${Math.floor(Math.random() * 100)} Street ${Math.floor(Math.random() * 1000)}`,
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        admissionYear: currentYear_str - Math.ceil(studentData.semester / 2),
        currentSemester: studentData.semester,
        currentYear: currentYear,
        currentAcademicYear: academicYear,
        category: "General",
        nationality: "Indian",
        fatherName: `${studentData.name.split(' ')[0]}'s Father`,
        fatherMobile: `9${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        motherName: `${studentData.name.split(' ')[0]}'s Mother`,
        sscSchoolName: "Sample High School",
        sscBoard: "State Board",
        sscPassingYear: currentYear_str - 2,
        sscPercentage: 75 + Math.random() * 20,
        hscSchoolName: "Sample Junior College",
        hscBoard: "State Board",
        hscPassingYear: currentYear_str,
        hscPercentage: 70 + Math.random() * 25,
        status: "APPROVED",
        approvedBy: user._id,
        approvedAt: new Date(),
        isPromotionEligible: true
      });
      
      log(`Created student: ${studentData.name} (Sem ${studentData.semester})`, "create");
      stats.students.created++;
      
    } catch (err) {
      log(`Failed to create student ${studentData.name}: ${err.message}`, "error");
      stats.students.errors++;
    }
  }
}

async function seedFeeStructures() {
  if (!config._colleges || config._colleges.length === 0) {
    return;
  }
  
  log("\n💰 Seeding Fee Structures...", "info");
  
  const college = config._colleges[0];
  const courses = college._seedData?.courses || [];
  
  const feeCategories = [
    { name: "General", fees: 100000 },
    { name: "SC", fees: 50000 },
    { name: "ST", fees: 50000 },
    { name: "OBC", fees: 75000 },
    { name: "EWS", fees: 75000 }
  ];
  
  for (const course of courses.slice(0, 3)) { // First 3 courses
    for (let semester = 1; semester <= Math.min(course.durationSemesters, 2); semester++) {
      for (const category of feeCategories) {
        try {
          const existing = await FeeStructure.findOne({
            college_id: college._id,
            course_id: course._id,
            semester: semester,
            category: category.name
          });
          
          if (existing) {
            continue;
          }
          
          await FeeStructure.create({
            college_id: college._id,
            course_id: course._id,
            semester: semester,
            category: category.name,
            totalFees: category.fees,
            installments: [
              { 
                installmentNumber: 1, 
                amount: category.fees / 2, 
                dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                description: "First Installment"
              },
              { 
                installmentNumber: 2, 
                amount: category.fees / 2, 
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                description: "Second Installment"
              }
            ],
            isActive: true
          });
          
          log(`Created fee structure: ${course.name} - Sem ${semester} - ${category.name}`, "create");
          
        } catch (err) {
          log(`Failed to create fee structure: ${err.message}`, "error");
        }
      }
    }
  }
}

async function seedDocumentConfigs() {
  if (!config._colleges || config._colleges.length === 0) {
    return;
  }
  
  log("\n📄 Seeding Document Configurations...", "info");
  
  const college = config._colleges[0];
  
  const requiredDocs = [
    { name: "SSC Marksheet", isRequired: true, acceptedFormats: ["pdf", "jpg", "png"] },
    { name: "HSC Marksheet", isRequired: true, acceptedFormats: ["pdf", "jpg", "png"] },
    { name: "Aadhar Card", isRequired: true, acceptedFormats: ["pdf", "jpg", "png"] },
    { name: "Passport Photo", isRequired: true, acceptedFormats: ["jpg", "png"], maxSizeMB: 1 },
    { name: "Caste Certificate", isRequired: false, acceptedFormats: ["pdf", "jpg", "png"] },
    { name: "Income Certificate", isRequired: false, acceptedFormats: ["pdf", "jpg", "png"] },
    { name: "Domicile Certificate", isRequired: false, acceptedFormats: ["pdf", "jpg", "png"] }
  ];
  
  for (const doc of requiredDocs) {
    try {
      const existing = await DocumentConfig.findOne({
        collegeCode: college.code,
        documentName: doc.name
      });
      
      if (existing) {
        continue;
      }
      
      await DocumentConfig.create({
        collegeCode: college.code,
        documentName: doc.name,
        isRequired: doc.isRequired,
        acceptedFormats: doc.acceptedFormats,
        maxSizeMB: doc.maxSizeMB || 5,
        isActive: true
      });
      
      log(`Created document config: ${doc.name}`, "create");
      
    } catch (err) {
      log(`Failed to create document config: ${err.message}`, "error");
    }
  }
}

// ==========================================
// MAIN SEED FUNCTION
// ==========================================
async function runSeed() {
  console.clear();
  
  console.log("\n" + "=".repeat(70));
  console.log("🌱 NOVAA - SMART COLLEGE MERN");
  console.log("📊 DATABASE SEED DATA SCRIPT");
  console.log("=".repeat(70));
  console.log(`Mode: ${config.mode.toUpperCase()}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("=".repeat(70) + "\n");

  let conn;

  try {
    // Connect to MongoDB
    log("Connecting to database...", "info");
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    log(`Using: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`, "info");
    
    conn = await mongoose.connect(mongoUri);
    log("Connected to MongoDB", "success");

    // Run seed functions based on mode
    if (config.mode === "full" || config.mode === "minimal") {
      await seedColleges();
      await seedDepartments();
      await seedCourses();
    }
    
    if (config.mode === "full") {
      await seedTeachers();
      await seedStudents();
      await seedFeeStructures();
      await seedDocumentConfigs();
    }
    
    if (config.mode === "users") {
      await seedTeachers();
      await seedStudents();
    }

    // Final summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    
    console.log("\n" + "=".repeat(70));
    console.log("📊 SEED DATA SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Users: ${stats.users.created} created, ${stats.users.existing} existing, ${stats.users.errors} errors`);
    console.log(`✅ Colleges: ${stats.colleges.created} created, ${stats.colleges.existing} existing, ${stats.colleges.errors} errors`);
    console.log(`✅ Departments: ${stats.departments.created} created, ${stats.departments.existing} existing, ${stats.departments.errors} errors`);
    console.log(`✅ Courses: ${stats.courses.created} created, ${stats.courses.existing} existing, ${stats.courses.errors} errors`);
    console.log(`✅ Teachers: ${stats.teachers.created} created, ${stats.teachers.existing} existing, ${stats.teachers.errors} errors`);
    console.log(`✅ Students: ${stats.students.created} created, ${stats.students.existing} existing, ${stats.students.errors} errors`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(70));

    if (stats.users.created > 0 || stats.users.existing > 0) {
      console.log("\n📋 DEFAULT CREDENTIALS:");
      console.log(`   Default Password: ${config.defaultPassword}`);
      console.log("   ⚠️  CHANGE THESE IN PRODUCTION!");
    }

    console.log("\n" + "=".repeat(70) + "\n");

  } catch (err) {
    log(`Seeding failed: ${err.message}`, "error");
    log(err.stack, "error");
    process.exit(1);
  } finally {
    if (conn) {
      await mongoose.disconnect();
      log("Database connection closed", "info");
    }
  }
}

// Run seed
if (require.main === module) {
  runSeed();
}

module.exports = runSeed;
