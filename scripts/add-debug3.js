const fs = require("fs");
const file = "backend/src/controllers/student.controller.js";
let content = fs.readFileSync(file, "utf8");

// Add debug after getRegisteredStudents
const regMarker = '      .sort({ createdAt: -1 });\n\n    ApiResponse.paginate(';
content = content.replace(regMarker, `      .sort({ createdAt: -1 });\n\n    console.log("BACKEND DEBUG - Registered count:", students.length);\n    if (students.length > 0) {\n      console.log("BACKEND DEBUG - First registered department:", JSON.stringify(students[0].department_id));\n    }\n\n    ApiResponse.paginate(`);

// Add debug after getAlumni
const alumniMarker = '      .sort({ alumniDate: -1 });\n\n    ApiResponse.success(';
content = content.replace(alumniMarker, `      .sort({ alumniDate: -1 });\n\n    console.log("BACKEND DEBUG - Alumni count:", alumni.length);\n    if (alumni.length > 0) {\n      console.log("BACKEND DEBUG - First alumni department:", JSON.stringify(alumni[0].department_id));\n    }\n\n    ApiResponse.success(`);

// Add debug after getDeactivatedStudents
const deactMarker = '      .sort({ updatedAt: -1 });\n\n    ApiResponse.paginate(';
content = content.replace(deactMarker, `      .sort({ updatedAt: -1 });\n\n    console.log("BACKEND DEBUG - Deactivated count:", students.length);\n    if (students.length > 0) {\n      console.log("BACKEND DEBUG - First deactivated department:", JSON.stringify(students[0].department_id));\n    }\n\n    ApiResponse.paginate(`);

fs.writeFileSync(file, content, "utf8");
console.log("Debug logs added successfully");
