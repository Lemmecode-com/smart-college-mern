/**
 * IDEAL COLLEGE SEED SCRIPT
 *
 * Populates database with 1 ideal college, departments, courses, subjects,
 * teachers, fee structures, and students (PENDING status with parent info
 * so college admin can approve them and parent creds are created on confirm enrollment).
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node backend/scripts/seed-ideal-college.js
 *   npm run seed:ideal
 *
 * Environment Variables Required:
 * - MONGO_URI or MONGODB_URI
 * - FRONTEND_URL (optional, default: http://localhost:5173)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Import models
const User = require("../src/models/user.model");
const College = require("../src/models/college.model");
const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");
const Teacher = require("../src/models/teacher.model");
const Subject = require("../src/models/subject.model");
const Student = require("../src/models/student.model");
const FeeStructure = require("../src/models/feeStructure.model");

// ==========================================
// CONFIGURATION
// ==========================================
const COLLEGE_CODE = "ICCE";
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEAR = `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`;
const CREDENTIALS_FILE = path.join(__dirname, "ideal-college-credentials.txt");

const config = {
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

// ==========================================
// STATISTICS
// ==========================================
const stats = {
  college: { created: 0, existing: 0 },
  users: { created: 0, existing: 0 },
  departments: { created: 0, existing: 0 },
  teachers: { created: 0, existing: 0 },
  staff: { created: 0, existing: 0 },
  courses: { created: 0, existing: 0 },
  subjects: { created: 0, existing: 0 },
  feeStructures: { created: 0, existing: 0 },
  students: { created: 0, existing: 0 },
};

// ==========================================
// UTILITIES
// ==========================================
function log(message, type = "info") {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const icons = {
    info: "\u2139\uFE0F",
    success: "\u2705",
    error: "\u274C",
    warning: "\u26A0\uFE0F",
    create: "\uD83C\uDD95",
    exist: "\u26A1",
  };
  console.log(`[${timestamp}] ${icons[type] || icons.info} ${message}`);
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI or MONGODB_URI must be set in .env");
  }
  await mongoose.connect(mongoUri);
  log("Connected to MongoDB", "success");
}

function writeCredentialsFile(data) {
  const lines = [];
  lines.push("=".repeat(70));
  lines.push("IDEAL COLLEGE - CREDENTIALS FOR MANAGER");
  lines.push("=".repeat(70));
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("COLLEGE DETAILS");
  lines.push("-".repeat(70));
  lines.push(`College Name: ${data.college.name}`);
  lines.push(`College Code: ${data.college.code}`);
  lines.push(`College Email: ${data.college.email}`);
  lines.push(`Contact: ${data.college.contactNumber}`);
  lines.push(`Address: ${data.college.address}`);
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("COLLEGE ADMIN CREDENTIALS");
  lines.push("-".repeat(70));
  lines.push(`Email: ${data.collegeAdmin.email}`);
  lines.push(`Password: ${data.collegeAdmin.password}`);
  lines.push(`Role: ${data.collegeAdmin.role}`);
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("TEACHER CREDENTIALS");
  lines.push("-".repeat(70));
  for (const teacher of data.teachers) {
    lines.push("");
    lines.push(`--- ${teacher.department} Department ---`);
    lines.push(`Name: ${teacher.name}`);
    lines.push(`Email: ${teacher.email}`);
    lines.push(`Password: ${teacher.password}`);
    lines.push(`Employee ID: ${teacher.employeeId}`);
    lines.push(`Designation: ${teacher.designation}`);
    lines.push(`Department: ${teacher.department}`);
    lines.push("---");
  }
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("STAFF CREDENTIALS");
  lines.push("-".repeat(70));
  if (data.staff && data.staff.length > 0) {
    for (const s of data.staff) {
      lines.push("");
      lines.push(`Name: ${s.name}`);
      lines.push(`Email: ${s.email}`);
      lines.push(`Password: ${s.password}`);
      lines.push(`Role: ${s.role}`);
      if (s.dept) lines.push(`Department: ${s.dept}`);
      lines.push("---");
    }
  } else {
    lines.push("No staff users seeded.");
  }
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("STUDENT CREDENTIALS");
  lines.push("-".repeat(70));
  lines.push(`Total Students: ${data.students.length}`);
  lines.push(`Default Password: ${data.students[0]?.password || "Student@123"}`);
  lines.push("");
  lines.push("Students can login with their registered email and the default password.");
  lines.push("");
  const categoryCounts = {};
  for (const s of data.students) {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  }
  lines.push("Category-wise distribution:");
  for (const [cat, count] of Object.entries(categoryCounts)) {
    lines.push(`  ${cat}: ${count}`);
  }
  lines.push("");
  lines.push("=".repeat(70));
  lines.push(`LOGIN URL: ${config.frontendUrl}/login`);
  lines.push("=".repeat(70));

  fs.writeFileSync(CREDENTIALS_FILE, lines.join("\n") + "\n", "utf-8");
  log(`Credentials saved to ${CREDENTIALS_FILE}`, "success");
}

// ==========================================
// SEED FUNCTIONS
// ==========================================
async function seedCollege() {
  log("\n🏫 Seeding College...", "info");

  const existing = await College.findOne({ code: COLLEGE_CODE });
  if (existing) {
    log(`College exists: ${existing.name}`, "exist");
    stats.college.existing++;
    return existing;
  }

  const college = await College.create({
    name: "Ideal College of Engineering",
    email: "info@idealcollege.edu.in",
    contactNumber: "9876543210",
    address: "123 Education Road, Knowledge City, Maharashtra - 400001",
    establishedYear: 2005,
    code: COLLEGE_CODE,
    registrationUrl: `${config.frontendUrl}/register/${COLLEGE_CODE}`,
    registrationQr: "",
  });

  log(`Created college: ${college.name} (${college.code})`, "create");
  stats.college.created++;
  return college;
}

async function seedCollegeAdmin(college) {
  log("\n👤 Seeding College Admin...", "info");

  const email = "admin@idealcollege.edu.in";
  const existing = await User.findOne({ email });
  if (existing) {
    log(`User exists: ${email}`, "exist");
    stats.users.existing++;
    return { user: existing, password: null };
  }

  const password = "Admin@1234";
  const user = await User.create({
    name: "College Admin",
    email,
    password,
    role: "COLLEGE_ADMIN",
    college_id: college._id,
    mobileNumber: "9876543210",
    isActive: true,
  });

  log(`Created college admin: ${email}`, "create");
  stats.users.created++;
  return { user, password };
}

async function seedTeachers(college) {
  log("\n👨‍🏫 Seeding Teachers...", "info");

  const teachersData = [
    { name: "Dr. Rajesh Kumar", email: "rajesh.k@idealcollege.edu.in", dept: "CSE", designation: "Professor", empId: "ICCE-CSE-T001" },
    { name: "Prof. Priya Sharma", email: "priya.s@idealcollege.edu.in", dept: "CSE", designation: "Associate Professor", empId: "ICCE-CSE-T002" },
    { name: "Dr. Amit Patel", email: "amit.p@idealcollege.edu.in", dept: "CSE", designation: "Assistant Professor", empId: "ICCE-CSE-T003" },
    { name: "Dr. Sneha Desai", email: "sneha.d@idealcollege.edu.in", dept: "CSE", designation: "Associate Professor", empId: "ICCE-CSE-T004" },
    { name: "Prof. Vikram Singh", email: "vikram.s@idealcollege.edu.in", dept: "CSE", designation: "Professor", empId: "ICCE-CSE-T005" },
    { name: "Dr. Meera Joshi", email: "meera.j@idealcollege.edu.in", dept: "EXTC", designation: "Professor", empId: "ICCE-EXTC-T006" },
    { name: "Prof. Ramesh Patil", email: "ramesh.p@idealcollege.edu.in", dept: "EXTC", designation: "Associate Professor", empId: "ICCE-EXTC-T007" },
    { name: "Dr. Kavita More", email: "kavita.m@idealcollege.edu.in", dept: "EXTC", designation: "Assistant Professor", empId: "ICCE-EXTC-T008" },
    { name: "Prof. Sanjay Deshmukh", email: "sanjay.d@idealcollege.edu.in", dept: "EXTC", designation: "Professor", empId: "ICCE-EXTC-T009" },
    { name: "Dr. Anjali Borse", email: "anjali.b@idealcollege.edu.in", dept: "EXTC", designation: "Associate Professor", empId: "ICCE-EXTC-T010" },
    { name: "Dr. Suresh Nair", email: "suresh.n@idealcollege.edu.in", dept: "MECH", designation: "Professor", empId: "ICCE-MECH-T011" },
    { name: "Prof. Deepa Iyer", email: "deepa.i@idealcollege.edu.in", dept: "MECH", designation: "Associate Professor", empId: "ICCE-MECH-T012" },
    { name: "Dr. Manoj Tiwari", email: "manoj.t@idealcollege.edu.in", dept: "MECH", designation: "Assistant Professor", empId: "ICCE-MECH-T013" },
    { name: "Prof. Renuka Gaikwad", email: "renuka.g@idealcollege.edu.in", dept: "MECH", designation: "Professor", empId: "ICCE-MECH-T014" },
    { name: "Dr. Amit Bhandari", email: "amit.b@idealcollege.edu.in", dept: "MECH", designation: "Associate Professor", empId: "ICCE-MECH-T015" },
  ];

  const teachers = [];

  for (let i = 0; i < teachersData.length; i++) {
    const t = teachersData[i];
    const password = `Teacher@${i + 1}`;

    const existingUser = await User.findOne({ email: t.email });
    const existingTeacher = existingUser ? await Teacher.findOne({ user_id: existingUser._id }) : null;

    let user = existingUser;
    let teacher = existingTeacher;

    if (!existingUser) {
      user = await User.create({
        name: t.name,
        email: t.email,
        password,
        role: "TEACHER",
        college_id: college._id,
        mobileNumber: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        isActive: true,
      });
      teacher = await Teacher.create({
        user_id: user._id,
        college_id: college._id,
        employeeId: t.empId,
        department: t.dept,
        designation: t.designation,
        joiningDate: new Date("2020-06-01"),
        qualifications: "Ph.D",
        specialization: "General",
        experienceYears: 5,
        isActive: true,
      });
      stats.teachers.created++;
      stats.users.created++;
      log(`Created teacher: ${t.name} (${t.email})`, "create");
    } else {
      stats.users.existing++;
      if (existingTeacher) {
        stats.teachers.existing++;
      } else {
        teacher = await Teacher.create({
          user_id: existingUser._id,
          college_id: college._id,
          employeeId: t.empId,
          department: t.dept,
          designation: t.designation,
          joiningDate: new Date("2020-06-01"),
          qualifications: "Ph.D",
          specialization: "General",
          experienceYears: 5,
          isActive: true,
        });
        stats.teachers.created++;
        log(`Created Teacher doc for existing user: ${t.email}`, "create");
      }
      user.password = password;
      await user.save();
      log(`Reset password for existing teacher: ${t.email}`, "success");
    }

    teachers.push({
      ...t,
      _id: teacher ? teacher._id : user._id,
      userId: user._id,
      password,
      empId: t.empId,
      dept: t.dept,
      designation: t.designation,
    });
  }

  return teachers;
}

async function seedDepartments(college, teachers, collegeAdmin) {
  log("\n📚 Seeding Departments...", "info");

  const departmentsData = [
    { name: "Computer Science & Engineering", code: "CSE", type: "ACADEMIC", programs: ["UG", "PG"], intake: 120, sanctionedFaculty: 15, startYear: 2005 },
    { name: "Electronics & Telecommunication", code: "EXTC", type: "ACADEMIC", programs: ["UG", "PG"], intake: 60, sanctionedFaculty: 15, startYear: 2005 },
    { name: "Mechanical Engineering", code: "MECH", type: "ACADEMIC", programs: ["UG"], intake: 60, sanctionedFaculty: 15, startYear: 2005 },
  ];

  const departments = [];

  for (const deptData of departmentsData) {
    const existing = await Department.findOne({ college_id: college._id, code: deptData.code });
    if (existing) {
      log(`Department exists: ${deptData.code}`, "exist");
      stats.departments.existing++;
      departments.push(existing);
      continue;
    }

    const department = await Department.create({
      college_id: college._id,
      name: deptData.name,
      code: deptData.code,
      type: deptData.type,
      programsOffered: deptData.programs,
      sanctionedStudentIntake: deptData.intake,
      sanctionedFacultyCount: deptData.sanctionedFaculty,
      startYear: deptData.startYear,
      createdBy: collegeAdmin._id,
      status: "ACTIVE",
    });

    log(`Created department: ${deptData.name}`, "create");
    stats.departments.created++;
    departments.push(department);
  }

  // Assign HODs (set hod_id on Department)
  for (const dept of departments) {
    const hodTeacher = teachers.find(t => t.dept === dept.code && (t.designation === "Professor" || t.designation === "Associate Professor"));
    if (hodTeacher) {
      dept.hod_id = hodTeacher._id;
      await dept.save();
      log(`Assigned HOD ${hodTeacher.name} to ${dept.code}`, "success");
    }
  }

  return departments;
}

async function seedCourses(college, departments, collegeAdmin) {
  log("\n🎓 Seeding Courses...", "info");

  const coursesData = [
    { name: "B.Tech Computer Science", code: "BTECH-CSE", dept: "CSE", type: "BOTH", level: "UG", durationSem: 8, durationYrs: 4, credits: 160, maxStudents: 120 },
    { name: "M.Tech Computer Science", code: "MTECH-CSE", dept: "CSE", type: "BOTH", level: "PG", durationSem: 4, durationYrs: 2, credits: 80, maxStudents: 30 },
    { name: "B.Tech EXTC", code: "BTECH-EXTC", dept: "EXTC", type: "BOTH", level: "UG", durationSem: 8, durationYrs: 4, credits: 160, maxStudents: 60 },
    { name: "M.Tech EXTC", code: "MTECH-EXTC", dept: "EXTC", type: "BOTH", level: "PG", durationSem: 4, durationYrs: 2, credits: 80, maxStudents: 30 },
    { name: "B.Tech Mechanical", code: "BTECH-MECH", dept: "MECH", type: "BOTH", level: "UG", durationSem: 8, durationYrs: 4, credits: 160, maxStudents: 60 },
  ];

  const courses = [];

  for (const courseData of coursesData) {
    const dept = departments.find(d => d.code === courseData.dept);
    if (!dept) continue;

    const existing = await Course.findOne({ college_id: college._id, code: courseData.code });
    if (existing) {
      log(`Course exists: ${courseData.code}`, "exist");
      stats.courses.existing++;
      courses.push(existing);
      continue;
    }

    const course = await Course.create({
      college_id: college._id,
      department_id: dept._id,
      name: courseData.name,
      code: courseData.code,
      type: courseData.type,
      programLevel: courseData.level,
      durationSemesters: courseData.durationSem,
      durationYears: courseData.durationYrs,
      credits: courseData.credits,
      maxStudents: courseData.maxStudents,
      createdBy: collegeAdmin._id,
      status: "ACTIVE",
      yearLabels: Array.from({ length: courseData.durationYrs }, (_, i) => `Year ${i + 1}`),
    });

    log(`Created course: ${courseData.name}`, "create");
    stats.courses.created++;
    courses.push(course);
  }

  return courses;
}

async function seedSubjects(college, departments, courses, teachers) {
  log("\n📖 Seeding Subjects...", "info");

  const subjectsData = [
    { name: "Data Structures", code: "CS201", dept: "CSE", course: "BTECH-CSE", semester: 1, credits: 4 },
    { name: "Algorithms", code: "CS301", dept: "CSE", course: "BTECH-CSE", semester: 3, credits: 4 },
    { name: "Database Systems", code: "CS401", dept: "CSE", course: "BTECH-CSE", semester: 5, credits: 3 },
    { name: "Digital Electronics", code: "EC201", dept: "EXTC", course: "BTECH-EXTC", semester: 1, credits: 4 },
    { name: "Signals & Systems", code: "EC301", dept: "EXTC", course: "BTECH-EXTC", semester: 3, credits: 3 },
    { name: "Communication Systems", code: "EC401", dept: "EXTC", course: "BTECH-EXTC", semester: 5, credits: 3 },
    { name: "Thermodynamics", code: "ME201", dept: "MECH", course: "BTECH-MECH", semester: 1, credits: 4 },
    { name: "Fluid Mechanics", code: "ME301", dept: "MECH", course: "BTECH-MECH", semester: 3, credits: 4 },
    { name: "Machine Design", code: "ME401", dept: "MECH", course: "BTECH-MECH", semester: 5, credits: 3 },
    { name: "Advanced Algorithms", code: "CS601", dept: "CSE", course: "MTECH-CSE", semester: 1, credits: 4 },
    { name: "Advanced EXTC", code: "EC601", dept: "EXTC", course: "MTECH-EXTC", semester: 1, credits: 4 },
    { name: "Advanced Thermodynamics", code: "ME601", dept: "MECH", course: "BTECH-MECH", semester: 7, credits: 3 },
  ];

  for (const subjData of subjectsData) {
    const dept = departments.find(d => d.code === subjData.dept);
    const course = courses.find(c => c.code === subjData.course);
    const teacher = teachers.find(t => t.dept === subjData.dept);

    if (!dept || !course || !teacher) continue;

    const existing = await Subject.findOne({ college_id: college._id, code: subjData.code });
    if (existing) {
      log(`Subject exists: ${subjData.code}`, "exist");
      stats.subjects.existing++;
      continue;
    }

    await Subject.create({
      college_id: college._id,
      department_id: dept._id,
      course_id: course._id,
      name: subjData.name,
      code: subjData.code,
      semester: subjData.semester,
      credits: subjData.credits,
      teacher_id: teacher._id,
      status: "ACTIVE",
      createdBy: teacher.userId,
    });

    log(`Created subject: ${subjData.name} (${subjData.code})`, "create");
    stats.subjects.created++;
  }
}

async function seedFeeStructures(college, courses) {
  log("\n💰 Seeding Fee Structures...", "info");

  const categories = ["GEN", "OBC", "SC", "ST"];
  const feeAmounts = { GEN: 50000, OBC: 35000, SC: 15000, ST: 10000 };

  for (const course of courses) {
    for (const category of categories) {
    const existing = await FeeStructure.findOne({ college_id: college._id, course_id: course._id, category });
    if (existing) {
      if (existing.academicYear !== ACADEMIC_YEAR) {
        existing.academicYear = ACADEMIC_YEAR;
        existing.installments[0].dueDate = new Date(`${CURRENT_YEAR}-07-01`);
        existing.installments[1].dueDate = new Date(`${CURRENT_YEAR + 1}-01-01`);
        await existing.save();
        log(`Updated fee structure year: ${course.code} - ${category} → ${ACADEMIC_YEAR}`, "success");
      } else {
        log(`Fee structure exists: ${course.code} - ${category}`, "exist");
      }
      stats.feeStructures.existing++;
      continue;
    }

      const totalFee = feeAmounts[category];
      const installment1 = Math.round(totalFee * 0.4);
      const installment2 = totalFee - installment1;

      await FeeStructure.create({
        college_id: college._id,
        course_id: course._id,
        category,
        academicYear: ACADEMIC_YEAR,
        totalFee,
        installments: [
          { name: "1st Installment", amount: installment1, dueDate: new Date(`${CURRENT_YEAR}-07-01`), order: 1 },
          { name: "2nd Installment", amount: installment2, dueDate: new Date(`${CURRENT_YEAR + 1}-01-01`), order: 2 },
        ],
      });

      log(`Created fee structure: ${course.code} - ${category} (₹${totalFee})`, "create");
      stats.feeStructures.created++;
    }
  }
}

async function seedStudents(college, departments, courses) {
  log("\n🎓 Seeding Students...", "info");

  const studentsData = [];
  const categories = ["GEN", "OBC", "SC", "ST", "OTHER"];
  const categoryWeights = [15, 10, 10, 10, 10];
  const totalStudents = 55;

  const maleNames = ["Arjun Nair", "Karan Joshi", "Rohan Mehta", "Aditya Patil", "Sahil Khan", "Vivek Rane", "Pratik Shah", "Rahul Verma", "Amit Singh", "Saurabh Kumar", "Nikhil Thakur", "Manish Dubey", "Deepak Yadav", "Ravi Shankar", "Ankit Jain"];
  const femaleNames = ["Kavya Reddy", "Ananya Iyer", "Sneha Kulkarni", "Priya Deshmukh", "Pooja Patil", "Neha Joshi", "Divya More", "Riya Naik", "Swati Pandey", "Aarti Chauhan", "Meena Devi", "Sunita Rathod", "Kirti Wagh", "Vaishali Mane", "Jyoti Kadam"];
  const maleFatherNames = ["Ramesh Nair", "Sanjay Joshi", "Vijay Mehta", "Sunil Patil", "Firoz Khan", "Dinesh Rane", "Harsh Shah", "Rakesh Verma", "Manoj Singh", "Rajesh Kumar", "Amit Thakur", "Sanjay Dubey", "Ravindra Yadav", "Prakash Shankar", "Rajeev Jain"];
  const femaleFatherNames = ["Krishna Reddy", "Venkat Iyer", "Madhav Kulkarni", "Bapusaheb Deshmukh", "Anil Patil", "Pradeep Joshi", "Rahul More", "Datta Naik", "Ravi Pandey", "Suresh Chauhan", "Bharat Devi", "Nanaji Rathod", "Ganesh Wagh", "Seema Mane", "Sunil Kadam"];
  const motherNames = ["Lakshmi Nair", "Anita Joshi", "Sunita Mehta", "Savita Patil", "Nasreen Khan", "Usha Rane", "Geeta Shah", "Pinki Verma", "Ritu Singh", "Mamta Kumar", "Anjali Thakur", "Kiran Dubey", "Meera Yadav", "Suman Shankar", "Neelam Jain"];
  const surnames = ["Nair", "Joshi", "Mehta", "Patil", "Khan", "Rane", "Shah", "Verma", "Singh", "Kumar", "Thakur", "Dubey", "Yadav", "Shankar", "Jain"];

  let studentIndex = 0;
  let nameIndex = 0;
  let categoryIndex = 0;
  let categoryCount = 0;

  // Assign students across courses
  const courseStudentMap = {
    "BTECH-CSE": 18,
    "MTECH-CSE": 8,
    "BTECH-EXTC": 12,
    "MTECH-EXTC": 8,
    "BTECH-MECH": 9,
  };

  const defaultPassword = "Student@123";
  const admissionYear = 2024;
  const credentials = [];

  for (const [courseCode, count] of Object.entries(courseStudentMap)) {
    const course = courses.find(c => c.code === courseCode);
    const dept = departments.find(d => d._id.toString() === course?.department_id?.toString());
    if (!course || !dept) continue;

    for (let i = 0; i < count; i++) {
      const isMale = i % 2 === 0;
      const firstName = isMale ? maleNames[nameIndex % maleNames.length] : femaleNames[nameIndex % femaleNames.length];
      const fullName = `${firstName} ${surnames[nameIndex % surnames.length]}${studentIndex + 1}`;
      const email = `${firstName.toLowerCase().replace(/[^a-z]/g, ".")}.${studentIndex + 1}@student.idealcollege.edu.in`;
      const fatherName = isMale ? maleFatherNames[nameIndex % maleFatherNames.length] : femaleFatherNames[nameIndex % femaleFatherNames.length];
      const motherName = motherNames[nameIndex % motherNames.length];

      const category = categories[categoryIndex % categories.length];
      categoryCount++;
      if (categoryCount >= categoryWeights[categoryIndex % categories.length]) {
        categoryCount = 0;
        categoryIndex++;
      }

      const existing = await Student.findOne({ college_id: college._id, email });
      if (existing) {
        log(`Student exists: ${email}`, "exist");
        stats.students.existing++;
        nameIndex++;
        studentIndex++;
        continue;
      }

      const user = await User.create({
        name: fullName,
        email,
        password: defaultPassword,
        role: "STUDENT",
        college_id: college._id,
        mobileNumber: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        isActive: true,
      });
      stats.users.created++;

      const student = await Student.create({
        college_id: college._id,
        department_id: dept._id,
        course_id: course._id,
        fullName,
        email,
        password: defaultPassword,
        mobileNumber: user.mobileNumber,
        gender: isMale ? "Male" : "Female",
        dateOfBirth: new Date("2002-01-15"),
        addressLine: `${studentIndex + 1} Main Road`,
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        admissionYear,
        currentSemester: (i % course.durationSemesters) + 1,
        category,
        status: "PENDING",
        fatherName,
        fatherMobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        fatherEmail: `father.${firstName.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
        motherName,
        motherMobile: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        motherEmail: `mother.${firstName.toLowerCase().replace(/[^a-z]/g, ".")}@example.com`,
        nationality: "Indian",
        currentAcademicYear: ACADEMIC_YEAR,
        isPromotionEligible: true,
        user_id: user._id,
      });

      log(`Created student: ${fullName} (${category})`, "create");
      stats.students.created++;
      credentials.push({
        name: fullName,
        email,
        password: defaultPassword,
        category,
        course: course.name,
        department: dept.code,
      });

      nameIndex++;
      studentIndex++;
    }
  }

  return { credentials, defaultPassword };
}

async function seedStudentUsers(college, defaultPassword) {
  log("\n👤 Ensuring all students have User accounts...", "info");
  
  const studentsWithoutUser = await Student.find({
    college_id: college._id,
    $or: [
      { user_id: { $exists: false } },
      { user_id: null }
    ]
  });

  let fixed = 0;
  for (const student of studentsWithoutUser) {
    const existingUser = await User.findOne({ email: student.email });
    if (existingUser) {
      student.user_id = existingUser._id;
      await student.save();
      log(`Linked existing user to student: ${student.email}`, "success");
    } else {
      const user = await User.create({
        name: student.fullName,
        email: student.email,
        password: defaultPassword,
        role: "STUDENT",
        college_id: student.college_id,
        mobileNumber: student.mobileNumber || "",
        isActive: true,
      });
      student.user_id = user._id;
      await student.save();
      log(`Created user for student: ${student.email}`, "create");
      stats.users.created++;
    }
    fixed++;
  }

  if (fixed === 0) {
    log("All students already have User accounts", "success");
  }
}

async function seedStaff(college, departments) {
  log("\n👥 Seeding Staff Roles...", "info");

  const staffData = [
    { name: "Dr. Principal", email: "principal@idealcollege.edu.in", role: "PRINCIPAL", dept: null, password: "Principal@1" },
    { name: "HOD CSE", email: "hod.cse@idealcollege.edu.in", role: "HOD", dept: "CSE", password: "HOD@1" },
    { name: "HOD EXTC", email: "hod.extc@idealcollege.edu.in", role: "HOD", dept: "EXTC", password: "HOD@2" },
    { name: "HOD MECH", email: "hod.mech@idealcollege.edu.in", role: "HOD", dept: "MECH", password: "HOD@3" },
    { name: "Mr. Accountant", email: "accountant@idealcollege.edu.in", role: "ACCOUNTANT", dept: null, password: "Accountant@1" },
    { name: "Ms. Admission Officer", email: "admission@idealcollege.edu.in", role: "ADMISSION_OFFICER", dept: null, password: "Admission@1" },
    { name: "Mr. Exam Coordinator", email: "exam@idealcollege.edu.in", role: "EXAM_COORDINATOR", dept: null, password: "Exam@1" },
  ];

  const staff = [];
  const StaffProfile = require("../src/models/staffProfile.model");

  for (const s of staffData) {
    const existingUser = await User.findOne({ email: s.email });
    let user = existingUser;

    if (!existingUser) {
      user = await User.create({
        name: s.name,
        email: s.email,
        password: s.password,
        role: s.role,
        college_id: college._id,
        mobileNumber: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        isActive: true,
        mustChangePassword: true,
      });
      stats.users.created++;
      log(`Created staff user: ${s.email}`, "create");
    } else {
      stats.users.existing++;
      existingUser.password = s.password;
      await existingUser.save();
      log(`Reset password for staff: ${s.email}`, "success");
    }

    let teacher = null;

    if (s.role === "HOD") {
      const dept = departments.find(d => d.code === s.dept);
      if (!dept) {
        log(`Skipping HOD - department not found: ${s.dept}`, "warning");
        continue;
      }

      const existingTeacher = await Teacher.findOne({ user_id: user._id, college_id: college._id });
      if (existingTeacher) {
        teacher = existingTeacher;
        stats.teachers.existing++;
      } else {
      teacher = await Teacher.create({
        user_id: user._id,
        college_id: college._id,
        department_id: dept._id,
        employeeId: s.empId || `ICCE-${dept.code}-HOD`,
        name: s.name,
        email: s.email,
        designation: "Head of Department",
        qualification: "Ph.D",
        experienceYears: 10,
        status: "ACTIVE",
        createdBy: user._id,
        mobileNumber: user.mobileNumber || "",
        joiningDate: new Date("2015-06-01"),
      });
        stats.teachers.created++;
        log(`Created Teacher doc for HOD: ${s.email}`, "create");
      }

      const deptExists = await Department.findOne({ _id: dept._id, college_id: college._id, hod_id: teacher._id });
      if (!deptExists) {
        await Department.findByIdAndUpdate(dept._id, { hod_id: teacher._id });
        log(`Assigned HOD ${s.name} to ${dept.code}`, "success");
      }
    }

    const existingProfile = await StaffProfile.findOne({ user_id: user._id, college_id: college._id });
    if (!existingProfile) {
      await StaffProfile.create({
        user_id: user._id,
        college_id: college._id,
        designation: s.role === "HOD" ? "Head of Department" : (s.role === "PRINCIPAL" ? "Principal" : s.role),
        mobileNumber: user.mobileNumber || "",
        employmentType: "FULL_TIME",
        joiningDate: new Date("2015-06-01"),
        qualification: "Ph.D",
        experienceYears: 10,
      });
      log(`Created StaffProfile for: ${s.email}`, "create");
    }

    stats.staff.created++;
    staff.push({
      name: s.name,
      email: s.email,
      password: s.password,
      role: s.role,
      dept: s.dept || "",
      teacherId: teacher ? teacher._id : null,
    });
  }

  return staff;
}

// ==========================================
// MAIN
// ==========================================
async function main() {
  try {
    await connectDB();
    log("\n🚀 Starting Ideal College Seed...", "info");

    // 1. Create College
    const college = await seedCollege();

    // 2. Create College Admin
    const { user: collegeAdmin, password: adminPassword } = await seedCollegeAdmin(college);

    // 3. Create Teachers
    const teachers = await seedTeachers(college);

    // 4. Create Departments
    const departments = await seedDepartments(college, teachers, collegeAdmin);

    // 5. Create Courses
    const courses = await seedCourses(college, departments, collegeAdmin);

    // 6. Create Staff Roles
    const staff = await seedStaff(college, departments);

    // 7. Create Subjects
    await seedSubjects(college, departments, courses, teachers);

    // 8. Create Fee Structures
    await seedFeeStructures(college, courses);

    // 9. Create Students
    const { credentials, defaultPassword } = await seedStudents(college, departments, courses);

    // 9b. Ensure all students have User accounts (fixes pre-existing data)
    await seedStudentUsers(college, defaultPassword);

    // 9c. Build complete student credentials from DB so file is accurate on every run
    const allStudents = await Student.find({ college_id: college._id }).sort({ createdAt: 1 });
    const completeStudentCreds = allStudents.map(s => {
      const c = courses.find(course => course._id.toString() === s.course_id?.toString());
      const d = departments.find(dept => dept._id.toString() === s.department_id?.toString());
      return {
        name: s.fullName,
        email: s.email,
        password: "Student@123",
        category: s.category,
        course: c ? c.name : "",
        department: d ? d.code : "",
      };
    });

    // 9. Build credentials file data
    const teachersToCreds = teachers.map(t => ({
      name: t.name,
      email: t.email,
      password: t.password || "(existing - already set)",
      employeeId: t.empId,
      designation: t.designation,
      department: t.dept,
    }));

    const credentialData = {
      college: {
        name: college.name,
        code: college.code,
        email: college.email,
        contactNumber: "9876543210",
        address: college.address,
      },
      collegeAdmin: {
        email: collegeAdmin.email,
        password: collegeAdmin.email === "admin@idealcollege.edu.in" ? "Admin@1234" : (adminPassword || "(check DB)"),
        role: "COLLEGE_ADMIN",
      },
      teachers: teachersToCreds,
      staff: staff.map(s => ({
        name: s.name,
        email: s.email,
        password: s.password,
        role: s.role,
        dept: s.dept || "",
      })),
      students: completeStudentCreds,
    };

    writeCredentialsFile(credentialData);

    // Print summary
    log("\n" + "=".repeat(50), "info");
    log("SEED SUMMARY", "info");
    log("=".repeat(50), "info");
    for (const [key, val] of Object.entries(stats)) {
      const total = val.created + val.existing;
      log(`${key}: ${val.created} created, ${val.existing} existing (${total} total)`, "info");
    }
    log("=".repeat(50), "success");
    log("Ideal college seed completed!", "success");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log("Disconnected from MongoDB", "info");
  }
}

main();
