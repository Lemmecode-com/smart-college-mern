const fs = require("fs");
const file = "backend/src/controllers/student.controller.js";
let content = fs.readFileSync(file, "utf8");

// ONLY fix: add missing next parameter - no debug logs
content = content.replace(
  'exports.getRegisteredStudents = async (req, res) => {',
  'exports.getRegisteredStudents = async (req, res, next) => {'
);

content = content.replace(
  'exports.getDeactivatedStudents = async (req, res) => {',
  'exports.getDeactivatedStudents = async (req, res, next) => {'
);

fs.writeFileSync(file, content, "utf8");
console.log("Fixed: added next parameter to getRegisteredStudents and getDeactivatedStudents");
