const fs = require("fs");
const file = "backend/src/controllers/student.controller.js";
let lines = fs.readFileSync(file, "utf8").split("\n");

// Function to insert lines after a specific line number (0-indexed)
function insertAfter(lines, afterLine, newLines) {
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);
    if (i === afterLine) {
      newLines.forEach(l => result.push(l));
    }
  }
  return result;
}

// Insert after line 1261 (sort({ createdAt: -1 });) - after getRegisteredStudents populate
lines = insertAfter(lines, 1261, [
  "",
  '    console.log("BACKEND DEBUG - Registered count:", students.length);',
  '    if (students.length > 0) {',
  '      console.log("BACKEND DEBUG - First registered department:", JSON.stringify(students[0].department_id));',
  '    }',
]);

// Insert after line 1513 (sort({ alumniDate: -1 });) - after getAlumni populate
// Need to account for the 4 lines we just added
lines = insertAfter(lines, 1513 + 4, [
  "",
  '    console.log("BACKEND DEBUG - Alumni count:", alumni.length);',
  '    if (alumni.length > 0) {',
  '      console.log("BACKEND DEBUG - First alumni department:", JSON.stringify(alumni[0].department_id));',
  '    }',
]);

// Insert after line 1564 (sort({ updatedAt: -1 });) - after getDeactivatedStudents populate
// Need to account for the 8 lines we just added
lines = insertAfter(lines, 1564 + 8, [
  "",
  '    console.log("BACKEND DEBUG - Deactivated count:", students.length);',
  '    if (students.length > 0) {',
  '      console.log("BACKEND DEBUG - First deactivated department:", JSON.stringify(students[0].department_id));',
  '    }',
]);

fs.writeFileSync(file, lines.join("\n"), "utf8");
console.log("Debug logs added at specific line numbers");
