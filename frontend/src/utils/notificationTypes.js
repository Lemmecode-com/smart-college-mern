import {
  FaInfoCircle,
  FaGraduationCap,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaExclamationTriangle,
} from "react-icons/fa";

/**
 * Canonical notification type configuration.
 *
 * This is the single source of truth for notification types and is shared by
 * NotificationCard, NotificationForm, NotificationDetails and the Notification
 * List type filter so the mapping is not duplicated across the codebase.
 *
 * `value` is the raw backend enum value (stored in the DB and used for
 * filtering). `label` is the friendly Title-Case string shown in the UI.
 */
export const NOTIFICATION_TYPES = {
  GENERAL: {
    icon: FaInfoCircle,
    color: "#3b82f6",
    bg: "#dbeafe",
    label: "General",
  },
  ACADEMIC: {
    icon: FaGraduationCap,
    color: "#8b5cf6",
    bg: "#ede9fe",
    label: "Academic",
  },
  EXAM: {
    icon: FaCalendarAlt,
    color: "#ec4899",
    bg: "#fce7f3",
    label: "Exam",
  },
  FEE: {
    icon: FaMoneyBillWave,
    color: "#f59e0b",
    bg: "#ffedd5",
    label: "Fee",
  },
  ATTENDANCE: {
    icon: FaUserCheck,
    color: "#10b981",
    bg: "#dcfce7",
    label: "Attendance",
  },
  EVENT: {
    icon: FaBullhorn,
    color: "#ef4444",
    bg: "#fee2e2",
    label: "Event",
  },
  ASSIGNMENT: {
    icon: FaClipboardList,
    color: "#6366f1",
    bg: "#eef2ff",
    label: "Assignment",
  },
  URGENT: {
    icon: FaExclamationTriangle,
    color: "#dc2626",
    bg: "#fee2e2",
    label: "Urgent",
  },
};

/**
 * Returns the friendly Title-Case label for a notification type.
 * Falls back to "General" when the type is unknown/undefined.
 */
export const getNotificationTypeLabel = (type) =>
  NOTIFICATION_TYPES[type]?.label ?? NOTIFICATION_TYPES.GENERAL.label;

export default NOTIFICATION_TYPES;
