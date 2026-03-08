/**
 * Navigation Configuration - Enterprise SaaS Standard
 * Centralized navigation definitions for all roles
 * 
 * Benefits:
 * - Single source of truth for all navigation items
 * - Easy to add/remove menu items (3 lines vs editing 50+ lines)
 * - Consistent structure across all roles
 * - Easier to test and maintain
 */

import {
  FaTachometerAlt,
  FaUniversity,
  FaBook,
  FaLayerGroup,
  FaUserGraduate,
  FaClipboardList,
  FaCog,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaBell,
  FaPlus,
  FaListOl,
  FaChartPie,
  FaEnvelope,
  FaUsers,
  FaGraduationCap,
  FaCheckCircle,
  FaChartBar,
  FaMoneyBill,
  FaFileAlt,
  FaUser,
  FaEdit,
  FaClock,
  FaChartLine
} from 'react-icons/fa';

export const navigationConfig = {
  /**
   * SUPER ADMIN Navigation
   * Manages multiple colleges across the system
   */
  SUPER_ADMIN: {
    dashboard: {
      path: '/super-admin/dashboard',
      icon: FaTachometerAlt,
      label: 'Dashboard'
    },
    sections: [
      {
        id: 'super-colleges',
        title: 'College Management',
        icon: FaUniversity,
        defaultOpen: true,
        items: [
          {
            path: '/super-admin/create-college',
            icon: FaPlus,
            label: 'Add New College',
            exact: true
          },
          {
            path: '/super-admin/colleges-list',
            icon: FaListOl,
            label: 'Colleges List',
            exact: true
          }
        ]
      },
      {
        id: 'super-reports',
        title: 'Reports & Analytics',
        icon: FaChartPie,
        defaultOpen: true,
        items: [
          {
            path: '/super-admin/reports',
            icon: FaUniversity,
            label: 'College Analytics',
            exact: true
          }
        ]
      },
      {
        id: 'super-settings',
        title: 'System Settings',
        icon: FaCog,
        defaultOpen: true,
        items: [
          {
            path: '/super-admin/settings',
            icon: FaCog,
            label: 'General Settings',
            exact: true
          },
          {
            path: '/super-admin/settings/users',
            icon: FaUsers,
            label: 'User Management',
            exact: false
          }
        ]
      }
    ]
  },

  /**
   * COLLEGE ADMIN Navigation
   * Manages single college operations
   */
  COLLEGE_ADMIN: {
    dashboard: {
      path: '/dashboard',
      icon: FaTachometerAlt,
      label: 'Dashboard'
    },
    sections: [
      {
        id: 'college',
        title: 'College',
        icon: FaUniversity,
        defaultOpen: true,
        items: [
          {
            path: '/college/profile',
            icon: FaUniversity,
            label: 'Profile',
            exact: true
          }
        ]
      },
      {
        id: 'departments',
        title: 'Departments',
        icon: FaBook,
        defaultOpen: true,
        items: [
          {
            path: '/departments',
            icon: FaListOl,
            label: 'Departments',
            exact: true
          },
          {
            path: '/departments/add',
            icon: FaPlus,
            label: 'Add Department',
            exact: true
          }
        ]
      },
      {
        id: 'courses',
        title: 'Courses',
        icon: FaLayerGroup,
        defaultOpen: true,
        items: [
          {
            path: '/courses',
            icon: FaListOl,
            label: 'Course List',
            exact: true
          },
          {
            path: '/courses/add',
            icon: FaPlus,
            label: 'Add Course',
            exact: true
          },
          {
            path: '/subjects/course/:courseId',
            icon: FaBook,
            label: 'Subject List',
            exact: false
          },
          {
            path: '/subjects/add',
            icon: FaPlus,
            label: 'Add Subject',
            exact: true
          }
        ]
      },
      {
        id: 'teachers',
        title: 'Teachers',
        icon: FaUserGraduate,
        defaultOpen: true,
        items: [
          {
            path: '/teachers',
            icon: FaListOl,
            label: 'Teacher List',
            exact: true
          },
          {
            path: '/teachers/add-teacher',
            icon: FaPlus,
            label: 'Add Teacher',
            exact: true
          }
        ]
      },
      {
        id: 'students',
        title: 'Students',
        icon: FaUserGraduate,
        defaultOpen: true,
        items: [
          {
            path: '/students',
            icon: FaListOl,
            label: 'Pending Student List',
            exact: true
          },
          {
            path: '/students/approve',
            icon: FaCheckCircle,
            label: 'Approve Students',
            exact: true
          },
          {
            path: '/students/promotion',
            icon: FaGraduationCap,
            label: 'Student Promotion',
            exact: true
          },
          {
            path: '/students/alumni',
            icon: FaUserGraduate,
            label: 'Alumni List',
            exact: true
          }
        ]
      },
      {
        id: 'fee-structure',
        title: 'Fee Management',
        icon: FaMoneyBillWave,
        defaultOpen: true,
        items: [
          {
            path: '/fees/create',
            icon: FaPlus,
            label: 'Create Fee Structure',
            exact: true
          },
          {
            path: '/fees/list',
            icon: FaListOl,
            label: 'Fee Structures List',
            exact: true
          }
        ]
      },
      {
        id: 'reports',
        title: 'Reports & Analytics',
        icon: FaChartPie,
        defaultOpen: true,
        items: [
          {
            path: '/college-admin/reports-dashboard',
            icon: FaChartBar,
            label: 'Reports Dashboard',
            exact: true
          },
          {
            path: '/college-admin/reports',
            icon: FaGraduationCap,
            label: 'Admission Reports',
            exact: true
          },
          {
            path: '/college-admin/reports/payment-summary',
            icon: FaMoneyBillWave,
            label: 'Payment Reports',
            exact: false
          },
          {
            path: '/college-admin/reports/attendance',
            icon: FaClipboardList,
            label: 'Attendance Reports',
            exact: true
          },
          {
            path: '/admin/security-audit',
            icon: FaCheckCircle,
            label: 'Security Audit',
            exact: true
          }
        ]
      },
      {
        id: 'notifications',
        title: 'Notifications',
        icon: FaBell,
        defaultOpen: true,
        items: [
          {
            path: '/notification/create',
            icon: FaPlus,
            label: 'Create Notification',
            exact: true
          },
          {
            path: '/notification/list',
            icon: FaListOl,
            label: 'Notification List',
            exact: true
          }
        ]
      },
      {
        id: 'system-settings',
        title: 'System Settings',
        icon: FaCog,
        defaultOpen: true,
        items: [
          {
            path: '/system-settings/general',
            icon: FaCog,
            label: 'General Settings',
            exact: true
          },
          {
            path: '/system-settings/academic',
            icon: FaGraduationCap,
            label: 'Academic Settings',
            exact: true
          },
          {
            path: '/system-settings/fees',
            icon: FaMoneyBill,
            label: 'Fee Settings',
            exact: true
          },
          {
            path: '/system-settings/notifications',
            icon: FaBell,
            label: 'Notification Settings',
            exact: true
          },
          {
            path: '/college/document-settings',
            icon: FaFileAlt,
            label: 'Document Settings',
            exact: true
          }
        ]
      }
    ]
  },

  /**
   * TEACHER Navigation
   * Manages teaching activities and classes
   */
  TEACHER: {
    dashboard: {
      path: '/teacher/dashboard',
      icon: FaTachometerAlt,
      label: 'Dashboard'
    },
    sections: [
      {
        id: 'profile-teacher',
        title: 'My Profile',
        icon: FaCog,
        defaultOpen: true,
        items: [
          {
            path: '/profile/my-profile',
            icon: FaUser,
            label: 'Profile Details',
            exact: true
          },
          {
            path: '/profile/edit-profile',
            icon: FaEdit,
            label: 'Edit Profile',
            exact: true
          }
        ]
      },
      {
        id: 'timetable-teacher',
        title: 'Timetable',
        icon: FaCalendarAlt,
        defaultOpen: true,
        items: [
          {
            path: '/timetable/create-timetable',
            icon: FaPlus,
            label: 'Create Timetable',
            exact: true
          },
          {
            path: '/timetable/list',
            icon: FaListOl,
            label: 'View Timetables',
            exact: true
          },
          {
            path: '/timetable/add-slot',
            icon: FaPlus,
            label: 'Add Slot',
            exact: true
          },
          {
            path: '/timetable/weekly-timetable',
            icon: FaClock,
            label: 'My Schedule',
            exact: true
          }
        ]
      },
      {
        id: 'sessions-teacher',
        title: 'Attendance Sessions',
        icon: FaClipboardList,
        defaultOpen: true,
        items: [
          {
            path: '/attendance/my-sessions-list',
            icon: FaListOl,
            label: 'My Sessions',
            exact: true
          }
        ]
      },
      {
        id: 'attendance-teacher',
        title: 'Attendance',
        icon: FaClipboardList,
        defaultOpen: true,
        items: [
          {
            path: '/attendance/report',
            icon: FaChartLine,
            label: 'Attendance Report',
            exact: true
          }
        ]
      },
      {
        id: 'notifications-teacher',
        title: 'Notifications',
        icon: FaBell,
        defaultOpen: true,
        items: [
          {
            path: '/teacher/notifications/create',
            icon: FaPlus,
            label: 'Create Notification',
            exact: true
          },
          {
            path: '/teacher/notifications/list',
            icon: FaEnvelope,
            label: 'All Notifications',
            exact: true
          }
        ]
      }
    ]
  },

  /**
   * STUDENT Navigation
   * View-only access to personal academic information
   */
  STUDENT: {
    dashboard: {
      path: '/student/dashboard',
      icon: FaTachometerAlt,
      label: 'Dashboard'
    },
    sections: [
      {
        id: 'profile-student',
        title: 'My Profile',
        icon: FaCog,
        defaultOpen: false,
        items: [
          {
            path: '/student/profile',
            icon: FaUser,
            label: 'Profile',
            exact: true
          }
        ]
      },
      {
        id: 'timetable-student',
        title: 'Timetable',
        icon: FaCalendarAlt,
        defaultOpen: false,
        items: [
          {
            path: '/student/timetable',
            icon: FaCalendarAlt,
            label: 'My Timetable',
            exact: true
          }
        ]
      },
      {
        id: 'fees-student',
        title: 'Fees',
        icon: FaMoneyBillWave,
        defaultOpen: false,
        items: [
          {
            path: '/student/fees',
            icon: FaMoneyBillWave,
            label: 'My Fees',
            exact: true
          }
        ]
      },
      {
        id: 'attendance-student',
        title: 'My Attendance',
        icon: FaClipboardList,
        defaultOpen: false,
        items: [
          {
            path: '/my-attendance',
            icon: FaClipboardList,
            label: 'View Attendance',
            exact: true
          }
        ]
      },
      {
        id: 'notifications-student',
        title: 'Notifications',
        icon: FaBell,
        defaultOpen: false,
        items: [
          {
            path: '/notification/student',
            icon: FaBell,
            label: 'View Notifications',
            exact: true
          }
        ]
      }
    ]
  }
};

/**
 * Get dashboard path for a given role
 * @param {string} role - User role (SUPER_ADMIN, COLLEGE_ADMIN, TEACHER, STUDENT)
 * @returns {string} Dashboard path for the role
 */
export const getDashboardPath = (role) => {
  const paths = {
    SUPER_ADMIN: '/super-admin/dashboard',
    COLLEGE_ADMIN: '/dashboard',
    TEACHER: '/teacher/dashboard',
    STUDENT: '/student/dashboard'
  };
  return paths[role] || '/dashboard';
};

export default navigationConfig;
