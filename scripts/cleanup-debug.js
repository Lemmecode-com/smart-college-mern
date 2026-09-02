const fs = require("fs");

// Remove debug logs from PendingApprovals.jsx
let file = "frontend/src/pages/dashboard/College-Admin/PendingApprovals.jsx";
let content = fs.readFileSync(file, "utf8");
content = content.replace('console.log("DEBUG - First student department:", pendingStudents[0]?.department_id);\n', '');
fs.writeFileSync(file, content, "utf8");
console.log("Removed debug from PendingApprovals.jsx");

// Remove debug logs from AlumniList.jsx
file = "frontend/src/pages/dashboard/College-Admin/AlumniList.jsx";
content = fs.readFileSync(file, "utf8");
content = content.replace('console.log("DEBUG - Alumni first department:", (res.alumni || [])[0]?.department_id);\n', '');
fs.writeFileSync(file, content, "utf8");
console.log("Removed debug from AlumniList.jsx");

// Remove debug logs from DeactivatedStudents.jsx
file = "frontend/src/pages/dashboard/College-Admin/DeactivatedStudents.jsx";
content = fs.readFileSync(file, "utf8");
content = content.replace('console.log("DEBUG - Deactivated first department:", data[0]?.department_id);\n', '');
fs.writeFileSync(file, content, "utf8");
console.log("Removed debug from DeactivatedStudents.jsx");
