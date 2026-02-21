require("dotenv").config();
require("./src/cron/paymentReminder.cron");
require("./src/cron/lowAttendanceAlert.cron");
const app = require("./app");
const connectDB = require("./src/config/db");
const seedSuperAdmin = require("./src/utils/seedSuperAdmin");
const { initializeCronJobs } = require("./src/config/cron.config");

connectDB().then(() => {
  seedSuperAdmin();
  
  // Initialize cron jobs after DB connection
  initializeCronJobs();
});

const PORT = process.env.PORT;
app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);