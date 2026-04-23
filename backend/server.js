require("dotenv").config();
require("./src/cron/paymentReminder.cron");
require("./src/cron/lowAttendanceAlert.cron");
require("./src/cron/paymentCleanup.cron");
require("./src/cron/paymentReconciliation.cron");
const app = require("./app");
const connectDB = require("./src/config/db");
const seedSuperAdmin = require("./src/utils/seedSuperAdmin");
const { initializeCronJobs } = require("./src/config/cron.config");
const validateEncryptionConfig = require("./src/utils/validateEncryptionConfig");

// Validate encryption configuration before starting server
validateEncryptionConfig();

connectDB().then(() => {
  seedSuperAdmin();
  initializeCronJobs();
});

const PORT = process.env.PORT;
app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`),
);


