require("dotenv").config();
const mongoose = require("mongoose");

const Department = require("../src/models/department.model");

async function createMissingDepartment() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const deptId = "699c10ed2df55ba336053f65";
    const collegeId = "699c0f99cc496e694bae39c4";

    const exists = await Department.findById(deptId);
    if (exists) {
      console.log("ℹ️ Department already exists:", deptId);
      process.exit(0);
    }

    const dept = await Department.create({
      _id: deptId,
      college_id: collegeId,
      name: "Engineering",
      code: "ENG",
      type: "ACADEMIC",
      programsOffered: ["UG", "PG"],
      startYear: 2020,
      sanctionedFacultyCount: 10,
      sanctionedStudentIntake: 120,
      createdBy: "699c0f99cc496e694bae39c6",
    });

    console.log("✅ Created missing department:", {
      _id: dept._id,
      name: dept.name,
      code: dept.code,
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed:", error);
    process.exit(1);
  }
}

createMissingDepartment();
