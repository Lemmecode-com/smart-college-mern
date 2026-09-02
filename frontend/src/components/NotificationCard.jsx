import { useState, useRef, useEffect } from "react";
import {
  FaEdit,
  FaTrash,
  FaClock,
  FaExclamationTriangle,
  FaEye,
  FaEllipsisV,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { NOTIFICATION_TYPES } from "../utils/notificationTypes";

/**
 * Reusable Notification Row Component
 * Works for Admin, Teacher, and Student roles
 * List-row layout: avatar, title + single-line message, time, badges, kebab menu
 */
export default function NotificationCard({
  note,
  isOwner = false,
  onEdit,
  onDelete,
  deletingId,
  showViewButton = true,
}) {
  const navigate = useNavigate();
  const isDeleting = deletingId === note._id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the kebab menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Short date for expiry, e.g. "Aug 8"
  const formatShortDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Notification type configurations (shared single source of truth)
  const typeConfig = NOTIFICATION_TYPES;

  const priorityConfig = {
    LOW: { color: "#64748b", bg: "#f1f5f9", label: "Low" },
    NORMAL: { color: "#1e40af", bg: "#dbeafe", label: "Normal" },
    MEDIUM: { color: "#b45309", bg: "#fef3c7", label: "Medium" },
    HIGH: { color: "#b91c1c", bg: "#fee2e2", label: "High" },
    URGENT: { color: "#dc2626", bg: "#fecaca", label: "Urgent" },
  };

  const type = note.type || "GENERAL";
  const priority = note.priority || "NORMAL";
  const typeInfo = typeConfig[type] || typeConfig.GENERAL;
  const priorityInfo = priorityConfig[priority] || priorityConfig.NORMAL;
  const TypeIcon = typeInfo.icon;

  // Check if notification is expired
  const isExpired = note.expiresAt && new Date(note.expiresAt) < new Date();

  const notificationPath = window.location.pathname.includes("/teacher/")
    ? `/teacher/notifications/view/${note._id}`
    : `/notification/view/${note._id}`;

  // Handle row click to navigate to details
  const handleRowClick = (e) => {
    // Don't navigate if clicking the kebab menu or its dropdown
    if (e.target.closest(".card-action-btn")) return;
    navigate(notificationPath);
  };

  const closeMenuThen = (fn) => (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    fn?.(e);
  };

  const hasMenu = showViewButton || (isOwner && (onEdit || onDelete));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileHover={{
        boxShadow: isExpired
          ? "0 2px 8px rgba(0, 0, 0, 0.06)"
          : "0 6px 18px rgba(15, 23, 42, 0.08)",
      }}
      className="notification-row"
      onClick={handleRowClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.875rem",
        backgroundColor: isExpired ? "#f9fafb" : "white",
        borderRadius: "14px",
        padding: "0.9rem 1.1rem",
        border:
          priority === "URGENT" && !isExpired
            ? "1px solid #fecaca"
            : "1px solid #e2e8f0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        cursor: "pointer",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        opacity: isExpired ? 0.75 : 1,
        position: "relative",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: "42px",
          height: "42px",
          minWidth: "42px",
          borderRadius: "50%",
          backgroundColor: isExpired ? "#e5e7eb" : typeInfo.bg,
          color: isExpired ? "#9ca3af" : typeInfo.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.05rem",
          marginTop: "0.1rem",
        }}
      >
        <TypeIcon />
      </div>

      {/* Title + message */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h6
          style={{
            margin: "0 0 0.2rem 0",
            fontSize: "0.98rem",
            fontWeight: 700,
            color: isExpired ? "#9ca3af" : "#1e293b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {note.title}
        </h6>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: isExpired ? "#9ca3af" : "#64748b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {note.message}
        </p>
      </div>

      {/* Meta: time + badges + kebab menu */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexShrink: 0,
          marginTop: "0.15rem",
        }}
      >
        {/* Time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.78rem",
            color: "#94a3b8",
            whiteSpace: "nowrap",
          }}
        >
          <FaClock size={11} />
          <span>{formatDate(note.createdAt)}</span>
        </div>

        {/* Type badge */}
        <span
          style={{
            padding: "0.3rem 0.65rem",
            borderRadius: "20px",
            backgroundColor: isExpired ? "#e5e7eb" : typeInfo.bg,
            color: isExpired ? "#6b7280" : typeInfo.color,
            fontSize: "0.72rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {typeInfo.label}
        </span>

        {/* Priority + expiry badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.3rem 0.65rem",
            borderRadius: "20px",
            backgroundColor: isExpired ? "#fee2e2" : priorityInfo.bg,
            color: isExpired ? "#dc2626" : priorityInfo.color,
            fontSize: "0.72rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {priority === "URGENT" && !isExpired && (
            <FaExclamationTriangle size={10} />
          )}
          {priorityInfo.label}
          {note.expiresAt &&
            ` - ${isExpired ? "Expired" : "Exp"}: ${formatShortDate(note.expiresAt)}`}
        </span>

        {/* Kebab menu */}
        {hasMenu && (
          <div
            className="card-action-btn"
            ref={menuRef}
            style={{ position: "relative" }}
          >
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              aria-label="More actions"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <FaEllipsisV size={14} />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    backgroundColor: "white",
                    borderRadius: "10px",
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
                    border: "1px solid #e2e8f0",
                    minWidth: "170px",
                    overflow: "hidden",
                    zIndex: 20,
                  }}
                >
                  {showViewButton && (
                    <button
                      onClick={closeMenuThen(() => navigate(notificationPath))}
                      style={menuItemStyle}
                    >
                      <FaEye size={13} color="#3b82f6" /> View details
                    </button>
                  )}
                  {isOwner && onEdit && (
                    <button
                      onClick={closeMenuThen(() => onEdit(note._id))}
                      style={menuItemStyle}
                    >
                      <FaEdit size={13} color="#3b82f6" /> Edit
                    </button>
                  )}
                  {isOwner && onDelete && (
                    <button
                      onClick={closeMenuThen(() => onDelete(note._id, note.title))}
                      disabled={isDeleting}
                      style={{
                        ...menuItemStyle,
                        color: "#dc2626",
                        cursor: isDeleting ? "not-allowed" : "pointer",
                        opacity: isDeleting ? 0.6 : 1,
                      }}
                    >
                      <FaTrash size={12} color="#dc2626" />
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const menuItemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  padding: "0.65rem 0.9rem",
  border: "none",
  background: "transparent",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#1e293b",
  cursor: "pointer",
  textAlign: "left",
};