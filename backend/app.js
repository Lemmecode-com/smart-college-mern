const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

dotenv.config();

const connectDB = require("./src/config/db");

const app = express();

// Database connection
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/admin/college", require("./src/routes/college.routes"));
app.use("/api/college", require("./src/routes/college.routes"));
app.use("/api/departments", require("./src/routes/department.routes"));
app.use("/api/courses", require("./src/routes/course.routes"));
app.use("/api/subjects", require("./src/routes/subject.routes"));
app.use("/api/students", require("./src/routes/student.routes"));
app.use("/api/attendance", require("./src/routes/attendance.routes"));  
app.use("/api/users", require("./src/routes/user.routes"));
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/parents", require("./src/routes/parent.routes"));
app.use("/api/teachers", require("./src/routes/teacher.routes"));

// ❗ Global Error Handler (MUST be last)
app.use(require("./src/middleware/error.middleware"));

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port http//:localhost/${PORT}`);
});
