import { FaBell, FaEdit, FaTrash, FaClock, FaExclamationTriangle, FaInfoCircle, FaGraduationCap, FaCalendarAlt, FaMoneyBillWave, FaUserCheck, FaBullhorn, FaClipboardList, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Reusable Notification Card Component
 * Works for Admin, Teacher, and Student roles
 * Includes text truncation, type badges, and click-to-view functionality
 */
export default function NotificationCard({ 
  note, 
  isOwner = false, 
  onEdit, 
  onDelete, 
  deletingId,
  showViewButton = true 
}) {
  const navigate = useNavigate();
  const isDeleting = deletingId === note._id;

  // Truncate text helper
  const truncateText = (text, maxLength = 120) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

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

  // Notification type configurations
  const typeConfig = {
    GENERAL: { icon: FaInfoCircle, color: "#3b82f6", bg: "#dbeafe", label: "General" },
    ACADEMIC: { icon: FaGraduationCap, color: "#8b5cf6", bg: "#ede9fe", label: "Academic" },
    EXAM: { icon: FaCalendarAlt, color: "#ec4899", bg: "#fce7f3", label: "Exam" },
    FEE: { icon: FaMoneyBillWave, color: "#f59e0b", bg: "#ffedd5", label: "Fee" },
    ATTENDANCE: { icon: FaUserCheck, color: "#10b981", bg: "#dcfce7", label: "Attendance" },
    EVENT: { icon: FaBullhorn, color: "#ef4444", bg: "#fee2e2", label: "Event" },
    ASSIGNMENT: { icon: FaClipboardList, color: "#6366f1", bg: "#eef2ff", label: "Assignment" },
    URGENT: { icon: FaExclamationTriangle, color: "#dc2626", bg: "#fee2e2", label: "Urgent" },
  };

  const priorityConfig = {
    LOW: { color: "#64748b", bg: "#f1f5f9", label: "Low" },
    NORMAL: { color: "#1e40af", bg: "#dbeafe", label: "Normal" },
    MEDIUM: { color: "#d97706", bg: "#fef3c7", label: "Medium" },
    HIGH: { color: "#b91c1c", bg: "#fee2e2", label: "High" },
    URGENT: { color: "#dc2626", bg: "#fecaca", label: "Urgent" },
  };

  const type = note.type || "GENERAL";
  const priority = note.priority || "NORMAL";
  const typeInfo = typeConfig[type] || typeConfig.GENERAL;
  const priorityInfo = priorityConfig[priority] || priorityConfig.NORMAL;
  const TypeIcon = typeInfo.icon;

  // Handle card click to navigate to details
  const handleCardClick = (e) => {
    // Don't navigate if clicking action buttons
    if (e.target.closest(".card-action-btn")) return;
    
    const notificationPath = window.location.pathname.includes("/teacher/")
      ? `/teacher/notifications/view/${note._id}`
      : `/notification/view/${note._id}`;
    
    navigate(notificationPath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0, 0, 0, 0.12)" }}
      className="notification-card"
      onClick={handleCardClick}
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        border: note.priority === "URGENT" ? "2px solid #dc2626" : "1px solid #e2e8f0",
        position: "relative",
      }}
    >
      {/* Priority indicator bar for urgent notifications */}
      {priority === "URGENT" && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, #dc2626 0%, #ef4444 100%)",
        }} />
      )}

      {/* Card Header */}
      <div style={{
        padding: "1rem 1.25rem",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "0.75rem",
      }}>
        {/* Type Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.375rem 0.75rem",
          borderRadius: "20px",
          backgroundColor: typeInfo.bg,
          color: typeInfo.color,
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          <TypeIcon size={12} />
          {typeInfo.label}
        </div>

        {/* Action Buttons (Edit/Delete) - Only for owners */}
        {isOwner && (
          <div className="card-action-btn" style={{ display: "flex", gap: "0.5rem" }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(note._id);
              }}
              disabled={isDeleting}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#3b82f6",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Edit notification"
            >
              <FaEdit size={12} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(note._id, note.title);
              }}
              disabled={isDeleting}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#dc2626",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.6 : 1,
                transition: "all 0.2s ease",
              }}
              title="Delete notification"
            >
              {isDeleting ? (
                <span className="spinner-border spinner-border-sm" style={{ width: "12px", height: "12px" }} />
              ) : (
                <FaTrash size={12} />
              )}
            </motion.button>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: "1.25rem" }}>
        {/* Title */}
        <h6 style={{
          margin: "0 0 0.75rem 0",
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "#1e293b",
          lineHeight: 1.4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {note.title}
        </h6>

        {/* Message (Truncated) */}
        <p style={{
          margin: "0 0 1rem 0",
          fontSize: "0.9rem",
          color: "#64748b",
          lineHeight: 1.6,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}>
          {truncateText(note.message)}
        </p>

        {/* Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid #f1f5f9",
        }}>
          {/* Date */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.8rem",
            color: "#94a3b8",
          }}>
            <FaClock size={12} />
            <span>{formatDate(note.createdAt)}</span>
          </div>

          {/* Priority Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.25rem 0.625rem",
            borderRadius: "12px",
            backgroundColor: priorityInfo.bg,
            color: priorityInfo.color,
            fontSize: "0.7rem",
            fontWeight: 600,
          }}>
            {priority === "URGENT" && <FaExclamationTriangle size={10} />}
            {priorityInfo.label}
          </div>
        </div>

        {/* Expiry Date (if exists) */}
        {note.expiresAt && new Date(note.expiresAt) > new Date() && (
          <div style={{
            marginTop: "0.75rem",
            padding: "0.5rem 0.75rem",
            backgroundColor: "#fef3c7",
            borderRadius: "8px",
            fontSize: "0.75rem",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <FaCalendarAlt size={12} />
            <span>Expires: {new Date(note.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        )}

        {/* View Details Button */}
        {showViewButton && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick(e);
            }}
            style={{
              width: "100%",
              marginTop: "1rem",
              padding: "0.625rem",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color: "#1e40af",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
          >
            <FaEye size={14} />
            View Details
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
