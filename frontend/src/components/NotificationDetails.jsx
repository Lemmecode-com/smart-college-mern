import { useEffect, useState, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import api from "../api/axios";
import Loading from "../components/Loading";
import Breadcrumb from "../components/Breadcrumb";
import ConfirmModal from "../components/ConfirmModal";
import { AuthContext } from "../auth/AuthContext";
import {
  FaBell,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaClock,
  FaCalendarAlt,
  FaInfoCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaUser,
  FaSpinner,
} from "react-icons/fa";

/**
 * Notification Details Page
 * Displays full notification content with metadata
 * Supports edit/delete for owners, read-only for others
 */
export default function NotificationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'delete' or 'back'
  });

  // Notification type configurations
  const typeConfig = {
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

  const priorityConfig = {
    LOW: { color: "#64748b", bg: "#f1f5f9", label: "Low Priority" },
    NORMAL: { color: "#1e40af", bg: "#dbeafe", label: "Normal Priority" },
    MEDIUM: { color: "#d97706", bg: "#fef3c7", label: "Medium Priority" },
    HIGH: { color: "#b91c1c", bg: "#fee2e2", label: "High Priority" },
    URGENT: { color: "#dc2626", bg: "#fecaca", label: "Urgent" },
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch notification details
  const fetchNotification = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine API endpoint based on user role
      let endpoint;
      if (user?.role === "TEACHER") {
        endpoint = "/notifications/teacher/read";
      } else if (user?.role === "STUDENT") {
        endpoint = "/notifications/student/read";
      } else {
        endpoint = "/notifications/admin/read";
      }

      const res = await api.get(endpoint);

      // Search for the notification in all possible arrays
      let found = null;
      let isOwnerCheck = false;

      if (res.data.myNotifications) {
        found = res.data.myNotifications.find((n) => n._id === id);
        if (found) isOwnerCheck = true;
      }

      if (!found && res.data.staffNotifications) {
        found = res.data.staffNotifications.find((n) => n._id === id);
        isOwnerCheck = false;
      }

      if (!found && res.data.adminNotifications) {
        found = res.data.adminNotifications.find((n) => n._id === id);
        isOwnerCheck = false;
      }

      if (!found && res.data.teacherNotifications) {
        found = res.data.teacherNotifications.find((n) => n._id === id);
        isOwnerCheck = false;
      }

      if (!found) {
        // Try direct fetch
        try {
          const directRes = await api.get(`/notifications/${id}`);
          found = directRes.data;
          isOwnerCheck =
            found.createdBy === user?.id || found.createdBy === user?._id;
        } catch (err) {
          setError("Notification not found");
          setLoading(false);
          return;
        }
      }

      setNotification(found);
      setIsOwner(isOwnerCheck);
    } catch (err) {
      console.error("Error fetching notification:", err);
      setError(err.response?.data?.message || "Failed to load notification");
      toast.error("Failed to load notification details");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchNotification();
  }, [fetchNotification]);

  // Handle edit click
  const handleEdit = () => {
    if (!notification) return;

    const editPath = window.location.pathname.includes("/teacher/")
      ? `/notifications/edit/${id}`
      : `/notification/edit/${id}`;

    navigate(editPath);
  };

  // Handle delete click
  const handleDeleteClick = () => {
    setConfirmModal({ isOpen: true, type: "delete" });
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/notifications/delete-note/${id}`);
      toast.success("Notification deleted successfully");
      navigate(-1);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(
        err.response?.data?.message || "Failed to delete notification",
      );
    } finally {
      setDeleting(false);
      setConfirmModal({ isOpen: false, type: null });
    }
  };

  // Handle back click
  const handleBackClick = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Loading fullScreen size="lg" text="Loading notification details..." />
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "20px",
            padding: "3rem",
            textAlign: "center",
            maxWidth: "500px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1.5rem",
              backgroundColor: "#fee2e2",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
              fontSize: "2rem",
            }}
          >
            <FaExclamationTriangle />
          </div>
          <h2
            style={{
              margin: "0 0 0.75rem",
              color: "#1e293b",
              fontSize: "1.5rem",
            }}
          >
            {error}
          </h2>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            The notification you're looking for may have been deleted or doesn't
            exist.
          </p>
          <button
            onClick={handleBackClick}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "#1e40af",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <FaArrowLeft /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!notification) {
    return null;
  }

  const type = notification.type || "GENERAL";
  const priority = notification.priority || "NORMAL";
  const typeInfo = typeConfig[type] || typeConfig.GENERAL;
  const priorityInfo = priorityConfig[priority] || priorityConfig.NORMAL;
  const TypeIcon = typeInfo.icon;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        paddingBottom: "3rem",
      }}
    >
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          {
            label: "Dashboard",
            path:
              user?.role === "TEACHER" ? "/teacher/dashboard" : "/dashboard",
          },
          {
            label: "Notifications",
            path:
              user?.role === "TEACHER"
                ? "/teacher/notifications/list"
                : "/notification/list",
          },
          { label: notification.title?.substring(0, 30) || "Details" },
        ]}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: "white",
          borderRadius: "20px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          marginBottom: "2rem",
          margin: "0 auto 2rem",
          maxWidth: "1000px",
        }}
      >
        {/* Header Gradient Bar */}
        <div
          style={{
            height: "4px",
            background: `linear-gradient(90deg, ${typeInfo.color} 0%, ${priorityInfo.color} 100%)`,
          }}
        />

        <div style={{ padding: "1.5rem 2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {/* Left: Back button + Title */}
            <div style={{ flex: 1, minWidth: "280px" }}>
              <button
                onClick={handleBackClick}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "white",
                  color: "#64748b",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  marginBottom: "1rem",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#f8fafc";
                  e.target.style.color = "#1e293b";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "white";
                  e.target.style.color = "#64748b";
                }}
              >
                <FaArrowLeft size={12} /> Back
              </button>

              <h1
                style={{
                  margin: "0 0 0.5rem",
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  lineHeight: 1.3,
                }}
              >
                {notification.title}
              </h1>

              {/* Badges Row */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {/* Type Badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.375rem 0.875rem",
                    borderRadius: "20px",
                    backgroundColor: typeInfo.bg,
                    color: typeInfo.color,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <TypeIcon size={14} />
                  {typeInfo.label}
                </div>

                {/* Priority Badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.375rem 0.875rem",
                    borderRadius: "20px",
                    backgroundColor: priorityInfo.bg,
                    color: priorityInfo.color,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {priority === "URGENT" && <FaExclamationTriangle size={12} />}
                  {priorityInfo.label}
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            {isOwner && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEdit}
                  style={{
                    padding: "0.75rem 1.25rem",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.9rem",
                  }}
                >
                  <FaEdit /> Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteClick}
                  disabled={deleting}
                  style={{
                    padding: "0.75rem 1.25rem",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    color: "white",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {deleting ? <FaSpinner className="spin" /> : <FaTrash />}{" "}
                  Delete
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: "1.5rem",
          }}
        >
          {/* Content Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
            }}
          >
            {/* Message Content */}
            <div style={{ padding: "2rem" }}>
              <h3
                style={{
                  margin: "0 0 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Message
              </h3>
              <div
                style={{
                  fontSize: "1.05rem",
                  lineHeight: 1.8,
                  color: "#334155",
                  whiteSpace: "pre-wrap",
                }}
              >
                {notification.message}
              </div>
            </div>
          </motion.div>

          {/* Sidebar Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* Metadata Card */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "20px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: "#f8fafc",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaInfoCircle style={{ color: "#3b82f6" }} /> Details
                </h3>
              </div>

              <div style={{ padding: "1.25rem 1.5rem" }}>
                {/* Created Date */}
                <div
                  style={{
                    marginBottom: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      marginBottom: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <FaClock size={10} /> Created
                  </div>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      color: "#334155",
                      fontWeight: 500,
                    }}
                  >
                    {formatDate(notification.createdAt)}
                  </div>
                </div>

                {/* Updated Date */}
                {notification.updatedAt && (
                  <div
                    style={{
                      marginBottom: "1rem",
                      paddingBottom: "1rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginBottom: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <FaClock size={10} /> Last Updated
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        color: "#334155",
                        fontWeight: 500,
                      }}
                    >
                      {formatDate(notification.updatedAt)}
                    </div>
                  </div>
                )}

                {/* Expiry Date */}
                {notification.expiresAt && (
                  <div
                    style={{
                      marginBottom: "1rem",
                      paddingBottom: "1rem",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginBottom: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <FaCalendarAlt size={10} /> Expires
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        color:
                          new Date(notification.expiresAt) < new Date()
                            ? "#dc2626"
                            : "#334155",
                      }}
                    >
                      {formatDate(notification.expiresAt)}
                      {new Date(notification.expiresAt) < new Date() && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            color: "#dc2626",
                            backgroundColor: "#fee2e2",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "8px",
                          }}
                        >
                          Expired
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Created By */}
                {notification.createdBy && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginBottom: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <FaUser size={10} /> Created By
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        color: "#334155",
                        fontWeight: 500,
                      }}
                    >
                      {notification.createdBy?.name || "Admin"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Target Audience Card */}
            {notification.target && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "20px",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FaUser style={{ color: "#10b981" }} /> Target Audience
                  </h3>
                </div>
                <div style={{ padding: "1.25rem 1.5rem" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      backgroundColor: "#dcfce7",
                      color: "#16a34a",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    {notification.target}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Notification"
        message={`Are you sure you want to delete "${notification.title}"? This action cannot be undone.`}
        type="danger"
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleting}
      />

      {/* Styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }

        /* Responsive layout - collapse grid on mobile */
        @media (max-width: 1023.98px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 767.98px) {
          /* Reduce padding on mobile */
          div[style*="padding: 2rem"] {
            padding: 1.25rem !important;
          }

          div[style*="padding: 1.5rem"] {
            padding: 1rem !important;
          }

          /* Reduce icon and button sizes */
          div[style*="width: 80px"][style*="height: 80px"] {
            width: 60px !important;
            height: 60px !important;
          }

          /* Reduce title font size */
          h1[style*="fontSize: 1.75rem"] {
            font-size: 1.5rem !important;
          }

          /* Stack action buttons vertically */
          div[style*="justify-content: flex-end"] {
            flex-direction: column !important;
          }

          div[style*="justify-content: flex-end"] button {
            width: 100% !important;
          }
        }

        @media (max-width: 479.98px) {
          /* Further reduce sizes for small screens */
          div[style*="padding: 1.25rem"] {
            padding: 1rem !important;
          }

          h1[style*="fontSize: 1.5rem"] {
            font-size: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
