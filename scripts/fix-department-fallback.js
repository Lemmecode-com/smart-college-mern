const fs = require("fs");

// Fix PendingApprovals.jsx
let file = "frontend/src/pages/dashboard/College-Admin/PendingApprovals.jsx";
let content = fs.readFileSync(file, "utf8");
content = content.replace(
  '{student.department_id?.name || student.department_id?.code || (typeof student.department_id === "string" ? student.department_id : "N/A")}',
  '{student.department_id?.name || student.department_id?.code || (typeof student.department_id === "string" ? student.department_id : student.course_id?.name || "N/A")}'
);
fs.writeFileSync(file, content, "utf8");
console.log("PendingApprovals.jsx fixed");

// Fix AlumniList.jsx
file = "frontend/src/pages/dashboard/College-Admin/AlumniList.jsx";
content = fs.readFileSync(file, "utf8");
content = content.replace(
  '{alumnus.department_id?.name || "N/A"}',
  '{alumnus.department_id?.name || alumnus.course_id?.name || "N/A"}'
);
fs.writeFileSync(file, content, "utf8");
console.log("AlumniList.jsx fixed");

// Fix DeactivatedStudents.jsx
file = "frontend/src/pages/dashboard/College-Admin/DeactivatedStudents.jsx";
content = fs.readFileSync(file, "utf8");
content = content.replace(
  '{student.department_id?.name || "N/A"}',
  '{student.department_id?.name || student.course_id?.name || "N/A"}'
);
fs.writeFileSync(file, content, "utf8");
console.log("DeactivatedStudents.jsx fixed");
