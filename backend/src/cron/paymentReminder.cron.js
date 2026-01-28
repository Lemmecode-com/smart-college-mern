const cron = require("node-cron");
const { sendPaymentDueReminders } = require("../services/paymentReminder.service");

// Runs every day at 9 AM
cron.schedule("0 9 * * *", async () => {
  console.log("Running payment due reminder job...");
  await sendPaymentDueReminders();
});
