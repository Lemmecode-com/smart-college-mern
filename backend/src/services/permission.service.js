const Permission = require('../models/permission.model');
const { ROLE } = require('../utils/constants');

/**
 * Check if a role has permission for a specific action on a resource
 */
exports.checkPermission = async (role, resource, action, college_id = null) => {
  try {
    // First check for specific college permission
    let permission = await Permission.findOne({
      role,
      resource,
      action,
      college_id,
      isActive: true
    });

    // If not found and college_id is specified, check for system-wide permission
    if (!permission && college_id) {
      permission = await Permission.findOne({
        role,
        resource,
        action,
        college_id: null,
        isActive: true
      });
    }

    return !!permission;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

/**
 * Get all permissions for a role
 */
exports.getRolePermissions = async (role, college_id = null) => {
  try {
    const permissions = await Permission.find({
      role,
      isActive: true,
      $or: [
        { college_id: null },
        { college_id }
      ]
    });

    return permissions;
  } catch (error) {
    console.error('Get role permissions error:', error);
    return [];
  }
};

/**
 * Initialize default permissions for all roles
 * This ensures backward compatibility
 */
exports.initializeDefaultPermissions = async () => {
  try {
    const existingPermissions = await Permission.countDocuments();
    if (existingPermissions > 0) {
      return; // Already initialized
    }

    const defaultPermissions = [
      // SUPER_ADMIN - full access
      { role: ROLE.SUPER_ADMIN, resource: '*', action: 'MANAGE' },

      // PLATFORM_SUPPORT - system monitoring and support
      { role: ROLE.PLATFORM_SUPPORT, resource: 'platform-support', action: 'READ' },
      { role: ROLE.PLATFORM_SUPPORT, resource: 'platform-support', action: 'CREATE' },
      { role: ROLE.PLATFORM_SUPPORT, resource: 'platform-support', action: 'UPDATE' },
      { role: ROLE.PLATFORM_SUPPORT, resource: 'audit-logs', action: 'READ' },
      { role: ROLE.PLATFORM_SUPPORT, resource: 'system-logs', action: 'READ' },
      { role: ROLE.PLATFORM_SUPPORT, resource: 'colleges', action: 'READ' },

      // COLLEGE_ADMIN - college management
      { role: ROLE.COLLEGE_ADMIN, resource: 'college-admin', action: 'MANAGE' },

      // TEACHER - teaching functions
      { role: ROLE.TEACHER, resource: 'teacher', action: 'READ' },
      { role: ROLE.TEACHER, resource: 'teacher', action: 'UPDATE' },

      // STUDENT - student functions
      { role: ROLE.STUDENT, resource: 'student', action: 'READ' },
      { role: ROLE.STUDENT, resource: 'student', action: 'UPDATE' },

      // HOD - department management
      { role: ROLE.HOD, resource: 'hod', action: 'MANAGE' },

      // PRINCIPAL - principal functions
      { role: ROLE.PRINCIPAL, resource: 'principal', action: 'READ' },
      { role: ROLE.PRINCIPAL, resource: 'principal', action: 'UPDATE' },

      // ACCOUNTANT - finance functions
      { role: ROLE.ACCOUNTANT, resource: 'accountant', action: 'MANAGE' },

      // ADMISSION_OFFICER - admission functions
      { role: ROLE.ADMISSION_OFFICER, resource: 'admission', action: 'MANAGE' },

      // EXAM_COORDINATOR - exam functions
      { role: ROLE.EXAM_COORDINATOR, resource: 'exam', action: 'MANAGE' },

      // PARENT_GUARDIAN - parent functions
      { role: ROLE.PARENT_GUARDIAN, resource: 'parent', action: 'READ' }
    ];

    await Permission.insertMany(defaultPermissions);
    console.log('Default permissions initialized');
  } catch (error) {
    console.error('Initialize default permissions error:', error);
  }
};

/**
 * Add or update permission
 */
exports.setPermission = async (role, resource, action, college_id = null, isActive = true) => {
  try {
    const result = await Permission.findOneAndUpdate(
      { role, resource, action, college_id },
      { isActive },
      { upsert: true, new: true }
    );
    return result;
  } catch (error) {
    console.error('Set permission error:', error);
    throw error;
  }
};

/**
 * Remove permission
 */
exports.removePermission = async (role, resource, action, college_id = null) => {
  try {
    await Permission.findOneAndDelete({ role, resource, action, college_id });
    return true;
  } catch (error) {
    console.error('Remove permission error:', error);
    return false;
  }
};

/**
 * Initialize default PLATFORM_SUPPORT feature flags
 */
exports.initializePlatformSupportFeatures = async () => {
  try {
    const FeatureFlag = require('../models/featureFlag.model');
    const { ROLE } = require('../utils/constants');

    const existingFlags = await FeatureFlag.countDocuments({ name: { $regex: '^PLATFORM_SUPPORT_' } });
    if (existingFlags > 0) {
      return; // Already initialized
    }

    const platformSupportFeatures = [
      {
        name: 'PLATFORM_SUPPORT_SYSTEM_HEALTH',
        description: 'System health monitoring and metrics dashboard',
        enabled: true,
        metadata: { category: 'monitoring', icon: 'FaChartLine' }
      },
      {
        name: 'PLATFORM_SUPPORT_AUDIT_LOGS',
        description: 'Access to audit logs and security events',
        enabled: true,
        metadata: { category: 'security', icon: 'FaClipboardList' }
      },
      {
        name: 'PLATFORM_SUPPORT_SYSTEM_LOGS',
        description: 'Application error and debug logs viewer',
        enabled: true,
        metadata: { category: 'monitoring', icon: 'GiMicroscope' }
      },
      {
        name: 'PLATFORM_SUPPORT_INTEGRATIONS',
        description: 'Third-party integration health monitoring',
        enabled: true,
        metadata: { category: 'monitoring', icon: 'FaPlug' }
      },
      {
        name: 'PLATFORM_SUPPORT_SUPPORT_TICKETS',
        description: 'Support ticket management system',
        enabled: true,
        metadata: { category: 'support', icon: 'FaTicketAlt' }
      },
      {
        name: 'PLATFORM_SUPPORT_ERROR_ANALYTICS',
        description: 'Error analytics and trending issues',
        enabled: true,
        metadata: { category: 'monitoring', icon: 'FaBug' }
      },
      {
        name: 'PLATFORM_SUPPORT_COLLEGES_HEALTH',
        description: 'College health overview and diagnostics',
        enabled: true,
        metadata: { category: 'monitoring', icon: 'FaBuilding' }
      },
      {
        name: 'PLATFORM_SUPPORT_DATABASE',
        description: 'Database health and diagnostics',
        enabled: true,
        metadata: { category: 'monitoring', icon: 'FaDatabase' }
      },
      {
        name: 'PLATFORM_SUPPORT_CONFIGURATION',
        description: 'System configuration viewer and feature flags',
        enabled: true,
        metadata: { category: 'admin', icon: 'FaCog' }
      },
      {
        name: 'PLATFORM_SUPPORT_BROADCAST_ALERTS',
        description: 'Broadcast alerts to all college administrators',
        enabled: false,
        metadata: { category: 'communication', icon: 'FaExclamationTriangle' }
      }
    ];

    // Find SUPER_ADMIN user for createdBy
    const User = require('../models/user.model');
    const superAdmin = await User.findOne({ role: ROLE.SUPER_ADMIN });
    const createdBy = superAdmin ? superAdmin._id : null;

    for (const feature of platformSupportFeatures) {
      await FeatureFlag.create({
        ...feature,
        createdBy
      });
    }

    console.log('PLATFORM_SUPPORT feature flags initialized');
  } catch (error) {
    console.error('Initialize PLATFORM_SUPPORT features error:', error);
  }
};