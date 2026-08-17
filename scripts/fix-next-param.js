const fs = require("fs");
const file = "backend/src/controllers/student.controller.js";
let content = fs.readFileSync(file, "utf8");

// Fix getRegisteredStudents missing next parameter
const pattern = 'exports.getRegisteredStudents = async (req, res) => {';
const replacement = 'exports.getRegisteredStudents = async (req, res, next) => {';
content = content.replace(pattern, replacement);

// Also fix getDeactivatedStudents missing next parameter
const pattern2 = 'exports.getDeactivatedStudents = async (req, res) => {';
const replacement2 = 'exports.getDeactivatedStudents = async (req, res, next) => {';
content = content.replace(pattern2, replacement2);

fs.writeFileSync(file, content, "utf8");
console.log("Fixed missing next parameters");
