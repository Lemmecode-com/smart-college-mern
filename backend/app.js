const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { securityMiddleware } = require("./src/middlewares/security.middleware");
const {
  globalLimiter,
  healthCheckLimiter,
  publicLimiter,
  paymentLimiter
} = require("./src/middlewares/rateLimit.middleware");
const logger = require("./src/utils/logger");

const app = express();

/* ================= CORS CONFIGURATION ================= */
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || "http://localhost:5173"  // Adjust this to your frontend URL
}));
app.use(cookieParser());

/* ================= REQUEST LOGGING (MORGAN) ================= */
// Log all HTTP requests with Morgan
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.http(message.trim());
    }
  }
}));

/* ================= WEBHOOK ROUTE (NEEDS RAW BODY) ================= */
// Stripe webhook needs raw body, so we handle it separately
app.use("/api/stripe/webhook", require("./src/webhooks/stripe.webhook").handleStripeWebhook);

/* ================= JSON PARSER (EXCLUDES WEBHOOK) ================= */
app.use(express.json());

/* ================= SECURITY MIDDLEWARE ================= */
app.use(securityMiddleware);

/* ================= RATE LIMITING ================= */
// Global limiter applied to ALL /api/* routes (development-friendly)
app.use("/api/", globalLimiter);

// Specific limiters override global for their specific paths
app.use("/health-check", healthCheckLimiter);
app.use("/api/public", publicLimiter);
app.use("/api/stripe", paymentLimiter);
app.use("/api/student/payments", paymentLimiter);
app.use("/api/admin/payments", paymentLimiter);
app.use("/api/fees/structure", paymentLimiter);

/* ================= AUTH & CORE ================= */
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/college", require("./src/routes/college.routes"));
app.use("/api/master", require("./src/routes/master.routes"));

/* ================= ACADEMICS ================= */
app.use("/api/departments", require("./src/routes/department.routes"));
app.use("/api/courses", require("./src/routes/course.routes"));
app.use("/api/teachers", require("./src/routes/teacher.routes"));
app.use("/api/subjects", require("./src/routes/subject.routes"));
app.use("/api/students", require("./src/routes/student.routes"));
app.use("/api/timetable", require("./src/routes/timetable.routes"));

/* ================= ATTENDANCE ================= */
app.use("/api/attendance", require("./src/routes/attendance.routes"));

/* ================= PAYMENTS & FEES ================= */
app.use("/api/student/payments", require("./src/routes/student.payment.routes"));
app.use("/api/admin/payments", require("./src/routes/admin.payment.routes"));
app.use("/api/fees/structure", require("./src/routes/feeStructure.routes"));

/* ================= STUDENT PROMOTION ================= */
app.use("/api/promotion", require("./src/routes/promotion.routes"));

/* ================= REPORTS & DASHBOARD ================= */
app.use("/api/reports/dashboard", require("./src/routes/reportDashboard.routes"));
app.use("/api/reports", require("./src/routes/reports.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));
app.use("/api/notifications", require("./src/routes/notification.routes"));


app.use("/api/stripe", require("./src/routes/stripe.routes"));


/* ================= PUBLIC DEPARTMENT & COURSE ROUTES ================= */
app.use("/api/public", require("./src/routes/public.department.course.routes"));

/* ================= DOCUMENT CONFIGURATION ================= */
app.use("/api/document-config", require("./src/routes/documentConfig.routes"));

/* ================= STATIC FILES ================= */
app.use("/uploads", express.static("uploads"));

/* ================= 404 HANDLER ================= */
// Handle routes that don't exist
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
});

/* ================= GLOBAL ERROR HANDLER ================= */
// Must be last - handles all errors from above routes
app.use(require("./src/middlewares/error.middleware"));

module.exports = app;