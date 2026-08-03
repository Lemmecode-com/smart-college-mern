import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import Loading from "../../../components/Loading";
import {
  FaUser,
  FaKey,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaEdit,
  FaSearch,
  FaSyncAlt,
  FaUserFriends,
} from "react-icons/fa";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import ConfirmModal from "../../../components/ConfirmModal";
import { logger } from "../../../utils/logger";

// Moved outside component to prevent re-creation on every render
const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
]);

const BRAND_COLORS = {
  primary: {
    main: "#0f3a4a",
    dark: "#0c2d3a",
    light: "#2a6b8d",
    gradient: "linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%)",
  },
  accent: {
    main: "#3db5e6",
    dark: "#4fc3f7",
    light: "#4fc3f7",
    gradient: "linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%)",
  },
  text: {
    primary: "#1e293b",
    secondary: "#475569",
    muted: "#64748b",
  },
  success: {
    main: "#22c55e",
    dark: "#16a34a",
    light: "#dcfce7",
  },
  danger: {
    main: "#ef4444",
    dark: "#dc2626",
    light: "#fee2e2",
  },
  warning: {
    main: "#f59e0b",
    dark: "#d97706",
    light: "#fef3c7",
  },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: "easeOut" },
  }),
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

// Memoized row component for optimal rendering performance
const ParentTableRow = React.memo(({ p, idx, onNavigate, onResetPassword, onToggleStatus }) => {
  return (
    <motion.tr
      variants={fadeInVariants}
      custom={idx}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        borderRadius: "12px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      whileHover={{ scale: 1.005, boxShadow: "0 6px 16px rgba(0, 0, 0, 0.08)" }}
    >
      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: `${BRAND_COLORS.primary.light}20`,
            color: BRAND_COLORS.primary.main,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
            fontSize: "1rem",
          }}>
            {p.name?.charAt(0)?.toUpperCase() || "P"}
          </div>
          <div>
            <div style={{ fontWeight: "700", color: BRAND_COLORS.text.primary, fontSize: "0.95rem" }}>
              {p.name}
            </div>
            <div style={{ fontSize: "0.85rem", color: BRAND_COLORS.text.muted, textTransform: "capitalize" }}>
              {p.relation?.replace("_", " ")}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: "16px 20px", verticalAlign: "middle", color: BRAND_COLORS.text.secondary, fontSize: "0.9rem" }}>
        {p.email}
      </td>
      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
        <span style={{
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "0.8rem",
          fontWeight: "600",
          backgroundColor: "#f8f9fa",
          color: BRAND_COLORS.text.secondary,
          textTransform: "capitalize",
        }}>
          {p.relation?.replace("_", " ")}
        </span>
      </td>
      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
        <div style={{ fontWeight: "600", color: BRAND_COLORS.text.primary, fontSize: "0.9rem" }}>
          {p.linkedStudents?.length || 0} student(s)
        </div>
        <small style={{ color: BRAND_COLORS.text.muted, fontSize: "0.8rem" }}>
          {p.linkedStudents?.length > 0 ? p.linkedStudents.map((s) => s.fullName).join(", ") : "Not linked"}
        </small>
      </td>
      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "20px",
          fontSize: "0.8rem",
          fontWeight: "700",
          backgroundColor: p.isActive ? BRAND_COLORS.success.light : BRAND_COLORS.danger.light,
          color: p.isActive ? BRAND_COLORS.success.dark : BRAND_COLORS.danger.dark,
          border: `1px solid ${p.isActive ? BRAND_COLORS.success.main : BRAND_COLORS.danger.main}30`,
        }}>
          {p.isActive ? <FaCheckCircle /> : <FaTimesCircle />}
          {p.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
        {p.mustChangePassword ? (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: "600",
            backgroundColor: BRAND_COLORS.warning.light,
            color: BRAND_COLORS.warning.dark,
          }}>
            <FaKey /> Temp password
          </span>
        ) : (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: "600",
            backgroundColor: BRAND_COLORS.success.light,
            color: BRAND_COLORS.success.dark,
          }}>
            <FaCheckCircle /> Set
          </span>
        )}
      </td>
      <td style={{ padding: "16px 20px", verticalAlign: "middle" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ActionButton
            icon={<FaEye />}
            color={BRAND_COLORS.primary}
            title="View Profile"
            ariaLabel="View Profile"
            onClick={() => onNavigate(`/college/parents/${p.id}`)}
          />
          <ActionButton
            icon={<FaEdit />}
            color={BRAND_COLORS.accent}
            title="Edit Profile"
            ariaLabel="Edit Profile"
            onClick={() => onNavigate(`/college/parents/edit/${p.id}`)}
          />
          <ActionButton
            icon={<FaKey />}
            color={BRAND_COLORS.warning}
            title="Reset Password"
            ariaLabel="Reset Password"
            onClick={() => onResetPassword(p)}
          />
          <ActionButton
            icon={p.isActive ? <FaTimesCircle /> : <FaCheckCircle />}
            color={p.isActive ? BRAND_COLORS.danger : BRAND_COLORS.success}
            title={p.isActive ? "Deactivate" : "Activate"}
            ariaLabel={p.isActive ? "Deactivate Account" : "Activate Account"}
            onClick={() => onToggleStatus(p)}
          />
        </div>
      </td>
    </motion.tr>
  );
});

// Reusable inline-styled action button for cleaner JSX
function ActionButton({ icon, color, title, ariaLabel, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, backgroundColor: color.light }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        border: "none",
        backgroundColor: `${color.light}40`,
        color: color.dark,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontSize: "0.9rem",
      }}
    >
      {icon}
    </motion.button>
  );
}

export default function ParentList() {
  const navigate = useNavigate();

  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: "", message: "", type: "warning", confirmText: "Confirm" });

  const fetchParents = useCallback(async () => {
    try {
      const res = await api.get("/college/parents");
      const data = Array.isArray(res.data) ? res.data : [];
      setParents(data);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load parents";

      logger.error("Error fetching parents:", statusCode, errorCode);
      setError({ message: errorMessage, statusCode, errorCode });

      const isAuthError = statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));
      if (!isAuthError) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  // OPTIMIZATION: Derived state using useMemo instead of useState + useEffect
  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      const matchesSearch = searchTerm
        ? p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.email?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      const matchesStatus = statusFilter
        ? (statusFilter === "active" ? p.isActive : !p.isActive)
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [parents, searchTerm, statusFilter]);

  const handleToggleStatus = useCallback(async (parent) => {
    const newStatus = !parent.isActive;
    const action = newStatus ? "activate" : "deactivate";

    setConfirmModal({
      isOpen: true,
      title: newStatus ? "Activate Parent Account" : "Deactivate Parent Account",
      message: `Are you sure you want to ${action} ${parent.name}'s account?`,
      type: newStatus ? "success" : "warning",
      confirmText: newStatus ? "Activate" : "Deactivate",
      onConfirm: async () => {
        try {
          await api.patch(`/college/parents/${parent.id}/status`, { isActive: newStatus });
          toast.success(newStatus ? "Parent account activated successfully" : "Parent account deactivated successfully");
          fetchParents();
        } catch (err) {
          const backendMessage = err.response?.data?.message;
          toast.error(backendMessage || `Failed to ${action} parent account`);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  }, [fetchParents]);

  const handleResetPassword = useCallback(async (parent) => {
    setConfirmModal({
      isOpen: true,
      title: "Reset Password",
      message: `Reset password for ${parent.name}? A new temporary password will be sent to their email.`,
      type: "info",
      confirmText: "Reset Password",
      onConfirm: async () => {
        try {
          const res = await api.post(`/college/parents/${parent.id}/reset-password`);
          toast.success("Password reset email sent successfully", { toastId: "parent-reset-success" });
          if (res.data?.data?.temporaryPassword) {
            toast.info(`Temporary password: ${res.data.data.temporaryPassword}`, { autoClose: 8000 });
          }
        } catch (err) {
          const backendMessage = err.response?.data?.message;
          toast.error(backendMessage || "Failed to reset password");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  }, []);

  if (error && !loading) {
    return (
      <ApiError
        title="Parents Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchParents}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading parent data..." />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-page-content erp-viewport-min-100"
      >
        {/* Header Section */}
        <motion.div
          variants={slideDownVariants}
          initial="hidden"
          animate="visible"
          style={{
            marginBottom: "32px",
            padding: "24px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
            borderLeft: `5px solid ${BRAND_COLORS.accent.main}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <motion.div
              variants={pulseVariants}
              initial="initial"
              animate="pulse"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                background: BRAND_COLORS.primary.gradient,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                boxShadow: `0 4px 12px ${BRAND_COLORS.primary.main}50`,
              }}
            >
              <FaUserFriends />
            </motion.div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: "1.75rem",
                fontWeight: "800",
                color: BRAND_COLORS.text.primary,
                letterSpacing: "-0.02em",
              }}>
                Parent / Guardian Management
              </h1>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.95rem", color: BRAND_COLORS.text.secondary }}>
                Manage parent and guardian accounts linked to students
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters Section */}
        <motion.div
          variants={fadeInVariants}
          custom={0}
          initial="hidden"
          animate="visible"
          style={{ marginBottom: "24px" }}
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "16px",
            alignItems: "end",
          }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "0.85rem", color: BRAND_COLORS.text.secondary }}>
                Search Parents
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: BRAND_COLORS.text.muted,
                }}>
                  <FaSearch />
                </span>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = BRAND_COLORS.accent.main;
                    e.target.style.boxShadow = `0 0 0 3px ${BRAND_COLORS.accent.light}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }}
                  style={{
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 14px 10px 36px",
                    fontSize: "0.95rem",
                    transition: "all 0.2s ease",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "0.85rem", color: BRAND_COLORS.text.secondary }}>
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = BRAND_COLORS.accent.main;
                  e.target.style.boxShadow = `0 0 0 3px ${BRAND_COLORS.accent.light}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
                style={{
                  width: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.95rem",
                  transition: "all 0.2s ease",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
              }}
              disabled={!searchTerm && !statusFilter}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: `1px solid ${BRAND_COLORS.text.muted}`,
                backgroundColor: (!searchTerm && !statusFilter) ? "#f8f9fa" : "#ffffff",
                color: BRAND_COLORS.text.primary,
                fontWeight: "600",
                cursor: (!searchTerm && !statusFilter) ? "not-allowed" : "pointer",
                opacity: (!searchTerm && !statusFilter) ? 0.6 : 1,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "42px",
              }}
            >
              <FaSyncAlt />
              Clear Filters
            </motion.button>
          </div>
        </motion.div>

        {/* Table Section */}
        <motion.div
          variants={fadeInVariants}
          custom={1}
          initial="hidden"
          animate="visible"
        >
          <div style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "12px",
            }}>
              <h3 style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: "700",
                color: BRAND_COLORS.text.primary,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <FaUser style={{ color: BRAND_COLORS.accent.main }} />
                Parent/Guardian Overview
              </h3>
              <div style={{
                fontSize: "0.9rem",
                fontWeight: "600",
                color: BRAND_COLORS.text.secondary,
                backgroundColor: "#ffffff",
                padding: "6px 14px",
                borderRadius: "20px",
                border: "1px solid #e2e8f0",
              }}>
                Showing: <span style={{ color: BRAND_COLORS.accent.main }}>{filteredParents.length}</span> of {parents.length} parents
              </div>
            </div>

            {filteredParents.length === 0 ? (
              <EmptyState
                icon={<FaUserFriends />}
                title="No Parents Found"
                message={parents.length === 0 ? "No parent accounts have been created yet." : "No parents match your search criteria."}
                success={false}
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" }}>
                  <thead>
                    <tr>
                      {["Parent", "Email", "Relationship", "Linked Students", "Status", "Account", "Actions"].map((header) => (
                        <th
                          key={header}
                          style={{
                            padding: "12px 20px",
                            textAlign: "left",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            color: BRAND_COLORS.text.primary,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            borderBottom: `2px solid ${BRAND_COLORS.accent.main}`,
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParents.map((p, idx) => (
                      <ParentTableRow
                        key={p.id}
                        p={p}
                        idx={idx}
                        onNavigate={navigate}
                        onResetPassword={handleResetPassword}
                        onToggleStatus={handleToggleStatus}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText={confirmModal.confirmText}
          cancelText="Cancel"
        />
      </motion.div>
    </AnimatePresence>
  );
}

function EmptyState({ icon, title, message, success = false }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      textAlign: "center",
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
      border: "2px dashed #e2e8f0",
    }}>
      <div style={{
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2.5rem",
        marginBottom: "16px",
        backgroundColor: success ? `${BRAND_COLORS.success.main}15` : "#f8f9fa",
        color: success ? BRAND_COLORS.success.main : BRAND_COLORS.text.muted,
      }}>
        {icon}
      </div>
      <h4 style={{
        margin: "0 0 8px 0",
        color: BRAND_COLORS.text.primary,
        fontWeight: "700",
        fontSize: "1.25rem",
      }}>
        {title}
      </h4>
      <p style={{
        margin: 0,
        color: BRAND_COLORS.text.secondary,
        fontSize: "0.95rem",
        maxWidth: "400px",
        lineHeight: "1.5",
      }}>
        {message}
      </p>
    </div>
  );
}