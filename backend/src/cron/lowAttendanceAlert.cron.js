const cron = require("node-cron");
const { sendLowAttendanceAlerts } = require("../services/lowAttendanceAlert.service");

// Runs every day at 10 AM
cron.schedule("0 10 * * *", async () => {
  console.log("Running low attendance alert job...");
  await sendLowAttendanceAlerts();
});
