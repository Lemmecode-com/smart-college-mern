const cron = require('node-cron');
const { autoCloseAttendanceSessions, cleanupOldSessions } = require('../services/autoCloseSession.service');

/**
 * CRON JOB SCHEDULER
 * 
 * Purpose:
 * - Schedule automated tasks
 * - Auto-close attendance sessions
 * - Cleanup old data
 */

/**
 * Initialize all cron jobs
 */
exports.initializeCronJobs = () => {
  // console.log('🕐 Initializing cron jobs...\n');

  // ✅ Job 1: Auto-close attendance sessions
  // Run every 5 minutes during college hours (8 AM - 6 PM)
  const autoCloseJob = cron.schedule('*/5 * 8-18 * * *', async () => {
    // console.log('\n🔔 [Cron] Triggering auto-close job...');
    await autoCloseAttendanceSessions();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust to your timezone
  });

  // console.log('✅ Auto-close job scheduled: Every 5 minutes (8 AM - 6 PM)');

  // ✅ Job 2: Cleanup old sessions (optional)
  // Run every Sunday at 2 AM
  const cleanupJob = cron.schedule('0 2 * * 0', async () => {
    // console.log('\n🔔 [Cron] Triggering cleanup job...');
    await cleanupOldSessions();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  // console.log('✅ Cleanup job scheduled: Every Sunday at 2 AM\n');

  // console.log('🕐 All cron jobs initialized successfully!\n');

  // Store job references for potential cleanup
  return {
    autoCloseJob,
    cleanupJob
  };
};

/**
 * Stop all cron jobs (for graceful shutdown)
 */
exports.stopCronJobs = () => {
  // console.log('🛑 Stopping all cron jobs...');
  cron.getTasks().forEach(task => task.stop());
  // console.log('✅ All cron jobs stopped\n');
};
