const fs = require("fs");
const file = "backend/src/controllers/student.controller.js";
let content = fs.readFileSync(file, "utf8");

// Add more detailed debug to getRegisteredStudents
const regMarker = '    console.log("BACKEND DEBUG - Registered count:", students.length);';
const regReplacement = `    console.log("BACKEND DEBUG - Registered count:", students.length);
    console.log("BACKEND DEBUG - Mongoose Department model:", !!mongoose.models.Department);
    if (students.length > 0) {
      console.log("BACKEND DEBUG - Raw department_id:", students[0].department_id);
      console.log("BACKEND DEBUG - Populated department_id:", JSON.stringify(students[0].department_id));
    }`;

content = content.replace(regMarker, regReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Enhanced debug added");
