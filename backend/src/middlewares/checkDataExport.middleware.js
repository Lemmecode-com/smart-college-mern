const GeneralSettings = require("../models/generalSettings.model");
const { ROLE } = require("../utils/constants");

/**
 * 🔒 Data Export Access Control Middleware (#583)
 *
 * Enforces tenant-level allowDataExport policy from GeneralSettings:
 * - 'allowed': All authorized staff and roles can export data.
 * - 'restricted': Only COLLEGE_ADMIN, PRINCIPAL, and SUPER_ADMIN can export data.
 * - 'disabled': Exporting data is completely forbidden across the entire tenant.
 *
 * Exemption:
 * - SUPER_ADMIN is always exempt from tenant export restrictions.
 */
const checkDataExport = async (req, res, next) => {
  try {
    const user = req.user;

    // 1. Super Admin is always exempt from export restrictions
    if (user?.role === "SUPER_ADMIN" || user?.role === ROLE.SUPER_ADMIN) {
      return next();
    }

    // 2. Resolve college_id
    const collegeId = req.college_id || user?.college_id;

    if (!collegeId) {
      // If no college context exists, allow next() so route-level auth handles it
      return next();
    }

    // 3. Fetch college GeneralSettings
    const settings = await GeneralSettings.findOne({ college_id: collegeId }).lean();
    const exportPolicy = settings?.allowDataExport || "restricted";

    // 4. Case: 'disabled' -> Completely blocked
    if (exportPolicy === "disabled") {
      return res.status(403).json({
        success: false,
        code: "EXPORT_DISABLED",
        message: "Data export is disabled by your institution policy.",
      });
    }

    // 5. Case: 'restricted' -> Only privileged administrative roles permitted
    if (exportPolicy === "restricted") {
      const privilegedRoles = [
        "SUPER_ADMIN",
        "COLLEGE_ADMIN",
        "PRINCIPAL",
        ROLE.SUPER_ADMIN,
        ROLE.COLLEGE_ADMIN,
        ROLE.PRINCIPAL,
      ];

      if (!privilegedRoles.includes(user?.role)) {
        return res.status(403).json({
          success: false,
          code: "EXPORT_RESTRICTED",
          message: "Data export is restricted to administrators and principals only.",
        });
      }
    }

    // 6. Case: 'allowed' or user passed role check
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkDataExport;
