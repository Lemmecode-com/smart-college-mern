/**
 * Sidebar Constants - Enterprise SaaS Standard
 * Centralized constants for sidebar dimensions, breakpoints, and timing
 * 
 * Benefits:
 * - Single source of truth for all sidebar measurements
 * - Consistent values between CSS and JavaScript
 * - Easy to customize sidebar width globally
 */

/**
 * Sidebar width configurations
 */
export const SIDEBAR_WIDTH = {
  /** Expanded sidebar width (desktop) */
  EXPANDED: 250,
  
  /** Collapsed sidebar width (icon-only mode) */
  COLLAPSED: 80,
  
  /** Mobile breakpoint (pixels) */
  MOBILE_BREAKPOINT: 768,
  
  /** Tablet breakpoint (pixels) */
  TABLET_BREAKPOINT: 1024
};

/**
 * Animation timing configurations (milliseconds)
 */
export const ANIMATION_TIMING = {
  /** Fast animations for hover states */
  FAST: 150,
  
  /** Standard animations for transitions */
  NORMAL: 250,
  
  /** Slow animations for complex transitions */
  SLOW: 350,
  
  /** Debounce delay for resize events */
  DEBOUNCE_DELAY: 50
};

/**
 * CSS custom property names (for JS access)
 */
export const CSS_PROPERTIES = {
  SIDEBAR_WIDTH_EXPANDED: '--sidebar-width-expanded',
  SIDEBAR_WIDTH_COLLAPSED: '--sidebar-width-collapsed'
};

/**
 * LocalStorage key for persisting sidebar state
 */
export const STORAGE_KEYS = {
  COLLAPSED_STATE: 'sidebar-collapsed',
  OPEN_SECTIONS: 'sidebar-open-sections'
};

/**
 * Z-index layers for sidebar components
 */
export const Z_INDEX = {
  /** Sidebar container */
  SIDEBAR: 1030,
  
  /** Mobile backdrop overlay */
  BACKDROP: 1029,
  
  /** Collapse toggle button */
  COLLAPSE_TOGGLE: 1031,
  
  /** Mobile offcanvas */
  OFFCANVAS: 1030
};

/**
 * ARIA labels for accessibility
 */
export const ARIA_LABELS = {
  /** Main navigation landmark */
  MAIN_NAVIGATION: 'Main navigation',
  
  /** Mobile navigation menu */
  MOBILE_NAVIGATION: 'Mobile navigation menu',
  
  /** Collapse toggle button */
  COLLAPSE_TOGGLE: (isCollapsed) => isCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
  
  /** Section toggle button */
  SECTION_TOGGLE: (sectionTitle) => `Toggle ${sectionTitle} section`,
  
  /** Logout button */
  LOGOUT: 'Logout',
  
  /** User role badge */
  USER_ROLE: (role) => `User role: ${role?.replace('_', ' ') || 'User'}`
};

/**
 * Keyboard navigation key codes
 */
export const KEY_CODES = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End'
};

/**
 * CSS class names for state management
 */
export const CSS_CLASSES = {
  /** Body class when sidebar is open on mobile */
  SIDEBAR_OPEN: 'sidebar-open',
  
  /** Body class when sidebar is present (desktop) */
  HAS_SIDEBAR: 'has-sidebar',
  
  /** Body class during sidebar resize */
  SIDEBAR_RESIZING: 'sidebar-resizing',
  
  /** Sidebar collapsed state */
  SIDEBAR_COLLAPSED: 'sidebar-collapsed',
  
  /** Active link state */
  ACTIVE_LINK: 'active-link',
  
  /** Active section state */
  ACTIVE_SECTION: 'active-section',
  
  /** Open submenu state */
  SUBMENU_OPEN: 'open'
};

/**
 * Default open state for navigation sections by role
 */
export const DEFAULT_OPEN_SECTIONS = {
  SUPER_ADMIN: {
    'super-colleges': true,
    'super-reports': true,
    'super-settings': true
  },
  COLLEGE_ADMIN: {
    college: true,
    departments: true,
    courses: true,
    teachers: true,
    students: true,
    'fee-structure': true,
    notifications: true,
    reports: true,
    'system-settings': true
  },
  TEACHER: {
    'profile-teacher': true,
    'timetable-teacher': true,
    'sessions-teacher': true,
    'attendance-teacher': true,
    'notifications-teacher': true
  },
  STUDENT: {
    'profile-student': false,
    'timetable-student': false,
    'fees-student': false,
    'attendance-student': false,
    'notifications-student': false
  }
};

/**
 * Get default open sections for a role
 * @param {string} role - User role
 * @returns {Object} Default open sections state
 */
export const getDefaultOpenSections = (role) => {
  return DEFAULT_OPEN_SECTIONS[role] || {};
};

/**
 * Easing functions for animations (CSS cubic-bezier)
 */
export const EASING = {
  /** Standard ease */
  EASE: 'ease',
  
  /** Ease-in-out */
  EASE_IN_OUT: 'ease-in-out',
  
  /** Ease-out expo (smooth deceleration) */
  EASE_OUT_EXPO: 'cubic-bezier(0.19, 1, 0.22, 1)',
  
  /** Ease-in-out quart (smooth acceleration and deceleration) */
  EASE_IN_OUT_QUART: 'cubic-bezier(0.76, 0, 0.24, 1)',
  
  /** Spring effect (slight overshoot) */
  EASE_SPRING: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
};

export default {
  SIDEBAR_WIDTH,
  ANIMATION_TIMING,
  CSS_PROPERTIES,
  STORAGE_KEYS,
  Z_INDEX,
  ARIA_LABELS,
  KEY_CODES,
  CSS_CLASSES,
  DEFAULT_OPEN_SECTIONS,
  getDefaultOpenSections,
  EASING
};
