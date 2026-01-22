const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/college", require("./src/routes/college.routes"));
app.use("/api/master", require("./src/routes/master.routes"));
app.use("/api/departments", require("./src/routes/department.routes"));
app.use("/api/courses", require("./src/routes/course.routes"));
app.use("/api/teachers", require("./src/routes/teacher.routes"));
app.use("/api/subjects", require("./src/routes/subject.routes"));
app.use("/api/students", require("./src/routes/student.routes"));
app.use("/api/attendance", require("./src/routes/attendanceSession.routes")); // Create new attendance session
app.use("/api/attendance", require("./src/routes/attendance.routes")); // Scan actual qr to attendance for student
app.use("/api/attendance", require("./src/routes/attendanceClose.routes")); // Close attendance session
app.use("/api/attendance", require("./src/routes/studentAttendance.routes")); // View attendance summary for student
app.use("/api/attendance", require("./src/routes/teacherAttendance.routes")); // View attendance report for logged in teacher only

app.use("/uploads", express.static("uploads"));

module.exports = app;
