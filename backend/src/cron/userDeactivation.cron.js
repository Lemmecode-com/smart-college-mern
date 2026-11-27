const cron = require("node-cron");
const User = require("../models/user.model");
const Teacher = require("../models/teacher.model");
const Student = require("../models/student.model");
const GeneralSettings = require("../models/generalSettings.model");
const AuthSession = require("../models/authSession.model");
const RefreshToken = require("../models/refreshToken.model");
const logger = require("../utils/logger");

const DEFAULT_INACTIVE_DAYS = 180;

/**
 * Worker function to deactivate dormant / inactive accounts across tenants.
 * Can be called by the cron job or directly by tests / administrative scripts.
 *
 * @param {Object} [options]
 * @param {Date} [options.referenceDate=new Date()]
 * @returns {Promise<{ deactivatedCount: number, affectedColleges: number }>}
 */
const deactivateInactiveUsers = async (options = {}) => {
  const referenceDate = options.referenceDate || new Date();
  let totalDeactivated = 0;
  let affectedColleges = 0;

  try {
    // 1. Fetch settings for all colleges
    const allSettings = await GeneralSettings.find({}).lean();
    const settingsByCollege = new Map();
    for (const setting of allSettings) {
      if (setting.college_id) {
        settingsByCollege.set(setting.college_id.toString(), setting);
      }
    }

    // 2. Query all distinct college IDs for non-superadmin users
    const activeCollegeIds = await User.distinct("college_id", {
      college_id: { $ne: null },
      role: { $ne: "SUPER_ADMIN" },
      isActive: true,
    });

    for (const collegeId of activeCollegeIds) {
      if (!collegeId) continue;

      const collegeSetting = settingsByCollege.get(collegeId.toString());
      const inactiveDays =
        typeof collegeSetting?.autoDisableInactiveDays === "number" &&
        collegeSetting.autoDisableInactiveDays > 0
          ? collegeSetting.autoDisableInactiveDays
          : DEFAULT_INACTIVE_DAYS;

      const cutoffDate = new Date(
        referenceDate.getTime() - inactiveDays * 24 * 60 * 60 * 1000
      );

      // Find active users belonging to this college that exceeded cutoff
      const inactiveQuery = {
        college_id: collegeId,
        role: { $ne: "SUPER_ADMIN" },
        isActive: true,
        $or: [
          { lastLogin: { $lt: cutoffDate } },
          { lastLogin: null, createdAt: { $lt: cutoffDate } },
        ],
      };

      const inactiveUsers = await User.find(inactiveQuery).select("_id email role").lean();

      if (inactiveUsers.length > 0) {
        const userIds = inactiveUsers.map((u) => u._id);

        // A. Mark users as inactive
        await User.updateMany(
          { _id: { $in: userIds } },
          {
            $set: {
              isActive: false,
              deactivationReason: "AUTO_INACTIVITY_TIMEOUT",
            },
          }
        );

        // B. Update linked Teacher & Student records
        await Teacher.updateMany(
          { user_id: { $in: userIds } },
          { $set: { deactivationReason: "AUTO_INACTIVITY_TIMEOUT" } }
        );
        await Student.updateMany(
          { user_id: { $in: userIds } },
          {
            $set: {
              status: "DEACTIVATED",
              deactivationReason: "AUTO_INACTIVITY_TIMEOUT",
            },
          }
        );

        // C. Revoke all active sessions and refresh tokens
        await AuthSession.updateMany(
          { user_id: { $in: userIds }, isActive: true },
          {
            $set: {
              isActive: false,
              invalidationReason: "ACCOUNT_DEACTIVATED",
            },
          }
        );
        await RefreshToken.updateMany(
          { user_id: { $in: userIds }, isRevoked: false },
          { $set: { isRevoked: true } }
        );

        totalDeactivated += userIds.length;
        affectedColleges += 1;

        logger.logInfo("Automated inactive user deactivation executed for college", {
          collegeId: collegeId.toString(),
          inactiveDays,
          deactivatedCount: userIds.length,
        });
      }
    }

    return { deactivatedCount: totalDeactivated, affectedColleges };
  } catch (error) {
    logger.logError("Error running user deactivation cron job", {
      error: error.message,
      stack: error.stack,
    });
    return { deactivatedCount: totalDeactivated, affectedColleges, error: error.message };
  }
};

// Schedule nightly run at 00:00 (Asia/Kolkata)
const job = cron.schedule(
  "0 0 * * *",
  async () => {
    logger.logInfo("[CRON] Starting automated inactive user deactivation...");
    const result = await deactivateInactiveUsers();
    logger.logInfo("[CRON] Inactive user deactivation complete", result);
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

module.exports = {
  deactivateInactiveUsers,
  job,
};
