const fs = require("fs");
const file = "backend/src/controllers/student.controller.js";
let lines = fs.readFileSync(file, "utf8").split("\n");

const debugBlocks = {
  1261: [
    "",
    '    console.log("BACKEND DEBUG - Registered count:", students.length);',
    '    if (students.length > 0) {',
    '      console.log("BACKEND DEBUG - First registered department:", JSON.stringify(students[0].department_id));',
    '    }',
  ],
  1513: [
    "",
    '    console.log("BACKEND DEBUG - Alumni count:", alumni.length);',
    '    if (alumni.length > 0) {',
    '      console.log("BACKEND DEBUG - First alumni department:", JSON.stringify(alumni[0].department_id));',
    '    }',
  ],
  1564: [
    "",
    '    console.log("BACKEND DEBUG - Deactivated count:", students.length);',
    '    if (students.length > 0) {',
    '      console.log("BACKEND DEBUG - First deactivated department:", JSON.stringify(students[0].department_id));',
    '    }',
  ],
};

const sortedInsertPoints = Object.keys(debugBlocks)
  .map(Number)
  .sort((a, b) => b - a);

for (const insertLine of sortedInsertPoints) {
    const newLines = debugBlocks[insertLine];
    lines.splice(insertLine + 1, 0, ...newLines);
}

fs.writeFileSync(file, lines.join("\n"), "utf8");
console.log("Debug logs added successfully");
