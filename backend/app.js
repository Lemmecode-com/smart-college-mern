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

/* ✅ ADD THIS LINE */
app.use("/api/students", require("./src/routes/student.payment.routes"));

app.use("/api/attendance", require("./src/routes/attendanceSession.routes"));
app.use("/api/attendance", require("./src/routes/attendance.routes"));
app.use("/api/attendance", require("./src/routes/attendanceClose.routes"));
app.use("/api/attendance", require("./src/routes/studentAttendance.routes"));
app.use("/api/attendance", require("./src/routes/teacherAttendance.routes"));

app.use("/api/timetable", require("./src/routes/timetable.routes"));

app.use("/uploads", express.static("uploads"));

module.exports = app;
