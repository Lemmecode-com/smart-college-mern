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
app.use("/api/departments", require("./src/routes/department.routes"));
app.use("/api/courses", require("./src/routes/course.routes"));
app.use("/api/students", require("./src/routes/student.routes"));
app.use("/api/attendance", require("./src/routes/attendance.routes"));

app.use(require("./src/middleware/error.middleware"));

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port http//:localhost/${PORT}`);
});
