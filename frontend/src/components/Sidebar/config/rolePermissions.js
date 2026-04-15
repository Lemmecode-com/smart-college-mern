/**
 * Role Permissions Configuration - Enterprise SaaS Standard
 * Defines access levels for each user role
 * 
 * Benefits:
 * - Single source of truth for role-based access
 * - Easy to modify permissions without touching components
 * - Future-proof for feature-level permissions
 * - Can be used to filter navigation or protect routes
 */

/**
 * Role permissions definition
 * @typedef {Object} RolePermissions
 * @property {string[]} canAccess - Section IDs the role can access
 * @property {string[]} canCreate - Sections where role can create items
 * @property {string[]} canEdit - Sections where role can edit items
 * @property {string[]} canDelete - Sections where role can delete items
 */

export const rolePermissions = {
  /**
   * SUPER_ADMIN
   * Full system access - manages all colleges
   */
  SUPER_ADMIN: {
    displayName: 'System Administrator',
    canAccess: ['all'],
    canCreate: ['all'],
    canEdit: ['all'],
    canDelete: ['all'],
    canManageUsers: true,
    canManageColleges: true,
    canViewSystemReports: true,
    canManageSystemSettings: true
  },

  /**
   * COLLEGE_ADMIN
   * Full access within their own college
   */
  COLLEGE_ADMIN: {
    displayName: 'College Administrator',
    canAccess: [
      'college',
      'departments',
      'courses',
      'teachers',
      'students',
      'fee-structure',
      'reports',
      'notifications',
      'system-settings'
    ],
    canCreate: [
      'departments',
      'courses',
      'teachers',
      'students',
      'fee-structure',
      'notifications'
    ],
    canEdit: [
      'college',
      'departments',
      'courses',
      'teachers',
      'students',
      'fee-structure',
      'system-settings'
    ],
    canDelete: [
      'departments',
      'courses',
      'teachers',
      'students',
      'notifications'
    ],
    canManageUsers: false,
    canManageColleges: false,
    canViewSystemReports: false,
    canManageSystemSettings: false
  },

  /**
   * TEACHER
   * Access to teaching-related features
   */
  TEACHER: {
    displayName: 'Teacher',
    canAccess: [
      'profile-teacher',
      'timetable-teacher',
      'sessions-teacher',
      'attendance-teacher',
      'notifications-teacher'
    ],
    canCreate: [
      'timetable-teacher',
      'sessions-teacher',
      'notifications-teacher'
    ],
    canEdit: [
      'profile-teacher'
    ],
    canDelete: [],
    canManageUsers: false,
    canManageColleges: false,
    canViewSystemReports: false,
    canManageSystemSettings: false
  },

  /**
   * STUDENT
   * View-only access to personal information
   */
  STUDENT: {
    displayName: 'Student',
    canAccess: [
      'profile-student',
      'timetable-student',
      'fees-student',
      'attendance-student',
      'notifications-student'
    ],
    canCreate: [],
    canEdit: [
      'profile-student'
    ],
    canDelete: [],
    canManageUsers: false,
    canManageColleges: false,
    canViewSystemReports: false,
    canManageSystemSettings: false
  }
};

/**
 * Check if a role has access to a specific section
 * @param {string} role - User role
 * @param {string} sectionId - Section ID to check
 * @returns {boolean} True if role has access
 */
export const hasAccess = (role, sectionId) => {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  // Super admin has access to everything
  if (permissions.canAccess.includes('all')) return true;
  
  return permissions.canAccess.includes(sectionId);
};

/**
 * Check if a role can create items in a section
 * @param {string} role - User role
 * @param {string} sectionId - Section ID to check
 * @returns {boolean} True if role can create
 */
export const canCreate = (role, sectionId) => {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  // Super admin can create everything
  if (permissions.canCreate.includes('all')) return true;
  
  return permissions.canCreate.includes(sectionId);
};

/**
 * Check if a role can edit items in a section
 * @param {string} role - User role
 * @param {string} sectionId - Section ID to check
 * @returns {boolean} True if role can edit
 */
export const canEdit = (role, sectionId) => {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  // Super admin can edit everything
  if (permissions.canEdit.includes('all')) return true;
  
  return permissions.canEdit.includes(sectionId);
};

/**
 * Check if a role can delete items in a section
 * @param {string} role - User role
 * @param {string} sectionId - Section ID to check
 * @returns {boolean} True if role can delete
 */
export const canDelete = (role, sectionId) => {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  // Super admin can delete everything
  if (permissions.canDelete.includes('all')) return true;
  
  return permissions.canDelete.includes(sectionId);
};

/**
 * Filter navigation sections based on role permissions
 * @param {string} role - User role
 * @param {Array} sections - Array of section objects
 * @returns {Array} Filtered sections array
 */
export const filterSectionsByRole = (role, sections) => {
  const permissions = rolePermissions[role];
  if (!permissions) return [];
  
  // Super admin sees all sections
  if (permissions.canAccess.includes('all')) return sections;
  
  // Filter sections based on canAccess array
  return sections.filter(section => 
    permissions.canAccess.includes(section.id)
  );
};

/**
 * Get display name for a role
 * @param {string} role - User role
 * @returns {string} Human-readable role name
 */
export const getRoleDisplayName = (role) => {
  const permissions = rolePermissions[role];
  return permissions?.displayName || role?.replace('_', ' ') || 'User';
};

export default rolePermissions;
