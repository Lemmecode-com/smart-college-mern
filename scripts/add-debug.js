const fs = require("fs");
const file = "backend/src/controllers/student.controller.js";
let content = fs.readFileSync(file, "utf8");

// Add debug after getRegisteredStudents populate
const regPattern = `    const students = await Student.find(filter)
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    ApiResponse.paginate(`;

const regReplacement = `    const students = await Student.find(filter)
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    console.log("BACKEND DEBUG - Registered count:", students.length);
    if (students.length > 0) {
      console.log("BACKEND DEBUG - First registered department:", JSON.stringify(students[0].department_id));
    }

    ApiResponse.paginate(`;

content = content.replace(regPattern, regReplacement);

// Add debug after getAlumni populate
const alumniPattern = `    const alumni = await Student.find(filter)
      .populate("course_id", "name code")
      .populate("department_id", "name code")
      .sort({ alumniDate: -1 });

    ApiResponse.success(`;

const alumniReplacement = `    const alumni = await Student.find(filter)
      .populate("course_id", "name code")
      .populate("department_id", "name code")
      .sort({ alumniDate: -1 });

    console.log("BACKEND DEBUG - Alumni count:", alumni.length);
    if (alumni.length > 0) {
      console.log("BACKEND DEBUG - First alumni department:", JSON.stringify(alumni[0].department_id));
    }

    ApiResponse.success(`;

content = content.replace(alumniPattern, alumniReplacement);

// Add debug after getDeactivatedStudents populate
const deactPattern = `    const students = await Student.find(filter)
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .select(
        "fullName email mobileNumber admissionYear status user_id department_id course_id",
      )
      .limit(limit)
      .skip(skip)
      .sort({ updatedAt: -1 });

    ApiResponse.paginate(`;

const deactReplacement = `    const students = await Student.find(filter)
      .populate("department_id", "name code")
      .populate("course_id", "name")
      .select(
        "fullName email mobileNumber admissionYear status user_id department_id course_id",
      )
      .limit(limit)
      .skip(skip)
      .sort({ updatedAt: -1 });

    console.log("BACKEND DEBUG - Deactivated count:", students.length);
    if (students.length > 0) {
      console.log("BACKEND DEBUG - First deactivated department:", JSON.stringify(students[0].department_id));
    }

    ApiResponse.paginate(`;

content = content.replace(deactPattern, deactReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Debug logs added successfully");
