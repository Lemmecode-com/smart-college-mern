import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import Pagination from "../../../components/Pagination";
import ApiError from "../../../components/ApiError";
import PageHeader from "../../../components/PageHeader";
import { logger } from "../../../utils/logger";
import { motion, AnimatePresence } from "framer-motion";

import {
  FaClipboardList,
  FaFilter,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash,
  FaPlus,
  FaUsers,
  FaMoneyBillWave,
  FaFileAlt,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaChartLine,
  FaShieldAlt,
  FaInfoCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

// Theme colors matching the design system
const THEME = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  secondary: { main: "#3db5e6", light: "#4fc3f7" },
  success: { main: "#28a745", light: "#34ce57", bg: "rgba(40, 167, 69, 0.1)" },
  warning: { main: "#ffc107", dark: "#e0a800", bg: "rgba(255, 193, 7, 0.1)" },
  danger: { main: "#dc3545", light: "#e4606d", bg: "rgba(220, 53, 69, 0.1)" },
  info: { main: "#17a2b8", light: "#1fc8e3", bg: "rgba(23, 162, 184, 0.1)" },
  background: { light: "#f8fafc", medium: "#f1f5f9", dark: "#e2e8f0" },
  text: { primary: "#1a4b6d", secondary: "#64748b", muted: "#94a3b8" },
};

// Action type mapping
const ACTION_MAP = {
  CREATE: {
    icon: FaPlus,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.1)",
    label: "Created",
    border: "#10b981",
  },
  UPDATE: {
    icon: FaEdit,
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.1)",
    label: "Updated",
    border: "#3b82f6",
  },
  APPROVE: {
    icon: FaCheckCircle,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.1)",
    label: "Enrolled",
    border: "#10b981",
  },
  REJECT: {
    icon: FaTimesCircle,
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    label: "Rejected",
    border: "#ef4444",
  },
  DEACTIVATE: {
    icon: FaTimesCircle,
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.1)",
    label: "Deactivated",
    border: "#f59e0b",
  },
  REACTIVATE: {
    icon: FaCheckCircle,
    color: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.1)",
    label: "Reactivated",
    border: "#06b6d4",
  },
};

// Resource type mapping
const RESOURCE_MAP = {
  Student: { icon: FaUsers, label: "Student", color: "#6366f1" },
  StudentApproval: {
    icon: FaCheckCircle,
    label: "Student Approval",
    color: "#10b981",
  },
  FeeStructure: {
    icon: FaMoneyBillWave,
    label: "Fee Structure",
    color: "#f59e0b",
  },
  Teacher: { icon: FaUsers, label: "Teacher", color: "#8b5cf6" },
  Course: { icon: FaFileAlt, label: "Course", color: "#3b82f6" },
  Subject: { icon: FaFileAlt, label: "Subject", color: "#06b6d4" },
  User: { icon: FaUsers, label: "User", color: "#64748b" },
  Department: { icon: FaFileAlt, label: "Department", color: "#ec4899" },
};

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

export default function AuditLogs() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    startDate: "",
    endDate: "",
  });
  const [dateError, setDateError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  // Security check
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL")
    return <Navigate to="/dashboard" replace />;

  // Fetch audit logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      setDateError("");

      if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
        setDateError("End date cannot be earlier than start date");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
      });

      if (filters.action) params.append("action", filters.action);
      if (filters.resourceType)
        params.append("resourceType", filters.resourceType);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await api.get(`/audit-logs?${params}`);

      const logsData = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.logs || [];

      setLogs(Array.isArray(logsData) ? logsData : []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      logger.error("Failed to fetch audit logs:", statusCode, errorCode);
      setLogs([]);
      setError({
        message: err.response?.data?.message || "Failed to load audit logs.",
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await api.get("/audit-logs/stats");
      setStats(res.data?.data || res.data || null);
    } catch (err) {
      logger.error("Failed to fetch audit log stats:", err.response?.status);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLogs();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch on filter/page change
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      action: "",
      resourceType: "",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format time ago
  const timeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Get action config
  const getActionConfig = (action) => {
    return (
      ACTION_MAP[action] || {
        icon: FaFileAlt,
        color: "#64748b",
        bg: "rgba(100, 116, 139, 0.1)",
        label: action,
        border: "#64748b",
      }
    );
  };

  // Get resource config
  const getResourceConfig = (resourceType) => {
    return (
      RESOURCE_MAP[resourceType] || {
        icon: FaFileAlt,
        label: resourceType,
        color: "#64748b",
      }
    );
  };

  // Render stats cards
  const renderStatsCards = () => {
    if (!stats) return null;

    const cards = [
      {
        title: "Actions (Last 24 Hours)",
        value: stats.last24Hours || 0,
        icon: FaClock,
        color: "#3b82f6",
        bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
        border: "#3b82f6",
      },
      {
        title: "Actions (Last 7 Days)",
        value: stats.last7Days || 0,
        icon: FaChartLine,
        color: "#10b981",
        bg: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
        border: "#10b981",
      },
      {
        title: "Actions (Last 30 Days)",
        value: stats.last30Days || 0,
        icon: FaCalendarAlt,
        color: "#8b5cf6",
        bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
        border: "#8b5cf6",
      },
      {
        title: "Total Log Entries",
        value:
          stats.actionsByType?.reduce((sum, item) => sum + item.count, 0) || 0,
        icon: FaClipboardList,
        color: "#f59e0b",
        bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)",
        border: "#f59e0b",
      },
    ];

    return (
      <div className="audit-stats">
        {cards.map((card, index) => (
          <motion.div
            className="audit-stat-card"
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            style={{ "--audit-accent": card.color, "--audit-tint": card.bg }}
          >
            <div className="audit-stat-content">
              <div className="audit-stat-top">
                <p className="audit-stat-title">
                  {card.title}
                </p>
                <div className="audit-stat-icon">
                  <card.icon />
                </div>
              </div>
              <h3 className="audit-stat-value">{card.value.toLocaleString()}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Render filters
  const renderFilters = () => (
    <AnimatePresence>
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="audit-filter-panel"
        >
          <div
            className="audit-filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: THEME.text.secondary,
                }}
              >
                Action Type
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                  backgroundColor: "#f8fafc",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = THEME.primary.main)
                }
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              >
                <option value="">All Actions</option>
                {Object.keys(ACTION_MAP).map((action) => (
                  <option key={action} value={action}>
                    {ACTION_MAP[action].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: THEME.text.secondary,
                }}
              >
                Resource Type
              </label>
              <select
                value={filters.resourceType}
                onChange={(e) =>
                  handleFilterChange("resourceType", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                  backgroundColor: "#f8fafc",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = THEME.primary.main)
                }
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              >
                <option value="">All Resources</option>
                {Object.keys(RESOURCE_MAP).map((resource) => (
                  <option key={resource} value={resource}>
                    {RESOURCE_MAP[resource].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: THEME.text.secondary,
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                  backgroundColor: "#f8fafc",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = THEME.primary.main)
                }
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: THEME.text.secondary,
                }}
              >
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                  backgroundColor: "#f8fafc",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = THEME.primary.main)
                }
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
          </div>

          <div
            className="audit-filter-actions"
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={clearFilters}
              style={{
                padding: "0.625rem 1.25rem",
                background: "#f1f5f9",
                color: THEME.text.secondary,
                border: "2px solid #e2e8f0",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#e2e8f0";
                e.target.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#f1f5f9";
                e.target.style.borderColor = "#e2e8f0";
              }}
            >
              Clear Filters
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render shared pagination
const renderPagination = () => {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="audit-pagination-wrapper" style={{ marginTop: "2rem", marginBottom: "24px" }}>
      <Pagination
        page={currentPage}
        totalPages={pagination.pages}
        setPage={setCurrentPage}
      />
    </div>
  );
};

  if (error) {
    return (
      <ApiError
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchLogs}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div
    className="audit-responsive-container"
      style={{
        minHeight: "100vh",
        background: THEME.background.light,
        padding: "0.5rem 1.5rem 1.5rem",
      }}
    >
      {/* Breadcrumb */}
      <div
      className="audit-breadcrumb-wrapper"
        style={{
          width: "100%",
          margin: "0 auto",
          paddingTop: 0,
          height: "auto",
        }}
      >
        <div style={{ width: "100%" }}>
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/dashboard" },
              { label: "Reports & Analytics", },
              { label: "Audit Logs", active: true },
            ]}
          />
        </div>
      </div>

      <PageHeader
        icon={FaShieldAlt}
        title="Audit Logs"
        subtitle="Track all admin actions on student data • DPDPA 2026 Compliant"
        actions={
          <button
            type="button"
            className="audit-filter-btn"
            aria-expanded={showFilters}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter />
            Filters
            {showFilters ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        }
      />

      {/* Filters */}
      {renderFilters()}

      {dateError && (
        <div className="alert alert-warning d-flex align-items-center mt-3" role="alert">
          <FaExclamationTriangle className="me-2" size={18} />
          <div>{dateError}</div>
        </div>
      )}

      {/* Stats Cards */}
      <AnimatePresence>
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {renderStatsCards()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit Logs Table */}
      <style>{`
        .audit-responsive-container .erp-table {
          width: 100%;
          border-collapse: collapse;
        }
        .audit-responsive-container .erp-table thead {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
        }
        .audit-responsive-container .erp-table th {
          padding: 0.875rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .audit-responsive-container .erp-table tbody tr {
          transition: all 0.2s;
        }
        .audit-responsive-container .erp-table tbody tr:hover {
          background: #f0f9ff;
        }
        .audit-responsive-container .erp-table td {
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
      `}</style>
      <motion.div
      className="audit-table-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "4rem 0" }}>
            <Loading />
          </div>
        ) : logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              color: THEME.text.muted,
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <FaClipboardList
                style={{ fontSize: "2.5rem", color: "#94a3b8" }}
              />
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem",
                fontSize: "1.25rem",
                fontWeight: "600",
                color: THEME.text.secondary,
              }}
            >
              No audit logs found
            </h3>
            <p
              style={{
                margin: "0 auto",
                fontSize: "0.9375rem",
                color: THEME.text.muted,
                maxWidth: "400px",
              }}
            >
              Admin actions will appear here as you manage student data, fee
              structures, and user accounts
            </p>
          </motion.div>
        ) : (
          <>
            <div 
            className="audit-table-wrapper"
            style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" }}
            aria-label="Audit logs table; scroll horizontally to view all columns">
              <table
                className="erp-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.875rem",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.875rem 1rem",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Timestamp
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.875rem 1rem",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Action
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.875rem 1rem",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Resource
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.875rem 1rem",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      User
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.875rem 1rem",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const actionConfig = getActionConfig(log.action);
                    const resourceConfig = getResourceConfig(log.resourceType);
                    const ActionIcon = actionConfig.icon;
                    const ResourceIcon = resourceConfig.icon;

                    return (
                      <React.Fragment key={log._id}>
                        <motion.tr
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{ transition: "all 0.2s" }}
                          onClick={() =>
                            setExpandedLog(expandedLog === log._id ? null : log._id)
                          }
                        >
                          <td
                            style={{
                              padding: "1rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "0.875rem",
                                  fontWeight: "600",
                                  color: THEME.text.primary,
                                }}
                              >
                                {formatDate(log.createdAt)}
                              </p>
                              <p
                                style={{
                                  margin: "0.25rem 0 0",
                                  fontSize: "0.75rem",
                                  color: THEME.text.muted,
                                }}
                              >
                                {timeAgo(log.createdAt)}
                              </p>
                            </div>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <span
                              className="audit-action-badge"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem 1rem",
                                background: actionConfig.bg,
                                color: actionConfig.color,
                                borderRadius: "20px",
                                fontSize: "0.8125rem",
                                fontWeight: "600",
                                border: `1px solid ${actionConfig.border}30`,
                              }}
                            >
                              <ActionIcon style={{ fontSize: "0.875rem" }} />
                              {actionConfig.label}
                            </span>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <span
                              className="audit-resource-badge"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: resourceConfig.color,
                                fontWeight: "600",
                                fontSize: "0.875rem",
                              }}
                            >
                              <ResourceIcon style={{ fontSize: "1rem" }} />
                              {resourceConfig.label}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "1rem",
                              fontSize: "0.8125rem",
                              color: THEME.text.secondary,
                              fontWeight: "500",
                            }}
                          >
                            {log.userId?.email || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "1rem",
                              fontFamily: "monospace",
                              fontSize: "0.8125rem",
                              color: THEME.text.muted,
                              fontWeight: "500",
                            }}
                          >
                            {log.ipAddress}
                          </td>
                        </motion.tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="audit-table-scroll-hint">
              Swipe horizontally to view all columns
            </p>

            {/* Pagination */}
            {renderPagination()}

            {/* Results info */}
            {pagination && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: "1.5rem",
                  fontSize: "0.875rem",
                  color: THEME.text.muted,
                  fontWeight: "500",
                }}
              >
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} entries
              </p>
            )}
          </>
        )}
      </motion.div>
      <style>{`
  /* =========================================================
     AUDIT LOGS - MOBILE & TABLET RESPONSIVE
     Desktop remains unchanged
     ========================================================= */


  /* =========================
     TABLET
     769px - 1024px
     ========================= */

  @media (min-width: 769px) and (max-width: 1024px) {

    /* Main page spacing */
    .audit-responsive-container {
      padding: 0.5rem 1.25rem 1.25rem !important;
    }

    /* Filter button */
    .audit-responsive-container .audit-filter-btn {
      padding: 0.65rem 1.15rem !important;
      font-size: 0.85rem !important;
    }

    /* Stats - keep 4 cards but make them compact */
    .audit-responsive-container .audit-stats {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      gap: 0.6rem !important;
    }

    .audit-responsive-container .audit-stat-card {
      padding: 0.8rem !important;
      min-width: 0 !important;
    }

    .audit-responsive-container .audit-stat-title {
      font-size: 0.7rem !important;
      line-height: 1.4 !important;
    }

    .audit-responsive-container .audit-stat-icon {
      width: 28px !important;
      height: 28px !important;
      font-size: 0.75rem !important;
    }

    .audit-responsive-container .audit-stat-value {
      font-size: 1.35rem !important;
    }

    /* Table card */
    .audit-responsive-container .audit-table-card {
      padding: 1.1rem !important;
      border-radius: 16px !important;
    }

    /* Table */
    .audit-responsive-container .erp-table {
      min-width: 760px !important;
    }
  }


  /* =========================
     MOBILE
     <= 768px
     ========================= */

  @media (max-width: 768px) {

    /* Main page */
    .audit-responsive-container {
      padding: 0.5rem 0.75rem 0.75rem !important;
      width: 100% !important;
      box-sizing: border-box !important;
      overflow-x: hidden !important;
    }


    /* =========================
       BREADCRUMB
       ========================= */

    .audit-responsive-container .audit-breadcrumb-wrapper {
      height: auto !important;
      margin: 0 0 0.75rem !important;
      padding: 0 !important;
      overflow-x: auto !important;
      scrollbar-width: none !important;
    }

    .audit-responsive-container .audit-breadcrumb-wrapper::-webkit-scrollbar {
      display: none !important;
    }


    /* =========================
       FILTER BUTTON
       ========================= */

    .audit-responsive-container .audit-filter-btn {
      width: 100% !important;
      justify-content: center !important;
      padding: 0.7rem 1rem !important;
      border-radius: 10px !important;
      font-size: 0.85rem !important;
    }


    /* =========================
       STATS
       2 x 2 ON MOBILE
       ========================= */

    .audit-responsive-container .audit-stats {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 0.7rem !important;
      width: 100% !important;
      margin-bottom: 1rem !important;
    }

    .audit-responsive-container .audit-stat-card {
      width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
      padding: 0.85rem !important;
      border-radius: 12px !important;
    }

    .audit-responsive-container .audit-stat-title {
      font-size: 0.72rem !important;
      line-height: 1.35 !important;
      max-width: 85px !important;
    }

    .audit-responsive-container .audit-stat-icon {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      font-size: 0.72rem !important;
    }

    .audit-responsive-container .audit-stat-value {
      font-size: 1.5rem !important;
      margin-top: 0.2rem !important;
    }


    /* =========================
       FILTER PANEL
       ========================= */

    .audit-responsive-container .audit-filter-panel {
      padding: 1rem !important;
      border-radius: 14px !important;
      margin-bottom: 1rem !important;
    }

    .audit-responsive-container .audit-filter-grid {
      grid-template-columns: 1fr !important;
      gap: 0.75rem !important;
    }

    .audit-responsive-container .audit-filter-panel select,
    .audit-responsive-container .audit-filter-panel input {
      padding: 0.65rem 0.8rem !important;
      font-size: 0.82rem !important;
    }

    .audit-responsive-container .audit-filter-actions {
      justify-content: stretch !important;
    }

    .audit-responsive-container .audit-filter-actions button {
      width: 100% !important;
    }


    /* =========================
       TABLE CARD
       ========================= */

    .audit-responsive-container .audit-table-card {
      padding: 0.75rem !important;
      border-radius: 15px !important;
      overflow: hidden !important;
    }


    /* =========================
       TABLE
       ========================= */

    .audit-responsive-container .audit-table-wrapper {
      width: 100% !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      -webkit-overflow-scrolling: touch !important;
      border-radius: 10px !important;
      scrollbar-width: thin !important;
      scrollbar-color: #94a3b8 #e2e8f0 !important;
    }

    .audit-responsive-container .erp-table {
      min-width: 600px !important;
      width: 600px !important;
      font-size: 0.8rem !important;
    }

    .audit-responsive-container .audit-table-wrapper::-webkit-scrollbar {
      height: 6px;
    }

    .audit-responsive-container .audit-table-wrapper::-webkit-scrollbar-thumb {
      background: #94a3b8;
      border-radius: 6px;
    }

    .audit-responsive-container .audit-table-scroll-hint {
      margin: 0.35rem 0 0;
      color: #64748b;
      font-size: 0.68rem;
      text-align: center;
    }

    .audit-responsive-container .erp-table th {
      padding: 0.7rem 0.75rem !important;
      font-size: 0.68rem !important;
    }

    .audit-responsive-container .erp-table td {
      padding: 0.75rem !important;
    }


    /* =========================
       PAGINATION
       ========================= */

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination {
      margin-top: 1rem !important;
      gap: 0.3rem !important;
      flex-wrap: wrap !important;
      width: 100% !important;
      padding: 8px 4px !important;
      box-sizing: border-box !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination button {
      padding: 0.5rem 0.7rem !important;
      font-size: 0.75rem !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination span {
      padding: 0.5rem 0.6rem !important;
      font-size: 0.75rem !important;
    }

    /* Results text */
    .audit-responsive-container .audit-table-card > p {
      margin-top: 0.9rem !important;
      font-size: 0.75rem !important;
      line-height: 1.4 !important;
    }
  }


  /* =========================
     SMALL MOBILE
     <= 480px
     ========================= */

  @media (max-width: 480px) {

    .audit-responsive-container {
      padding: 0.6rem !important;
    }

    /* Stats */
    .audit-responsive-container .audit-stats {
      gap: 0.55rem !important;
    }

    .audit-responsive-container .audit-stat-card {
      padding: 0.7rem !important;
    }

    .audit-responsive-container .audit-stat-title {
      font-size: 0.68rem !important;
    }

    .audit-responsive-container .audit-stat-icon {
      width: 25px !important;
      height: 25px !important;
      min-width: 25px !important;
      font-size: 0.65rem !important;
    }

    .audit-responsive-container .audit-stat-value {
      font-size: 1.3rem !important;
    }

    /* Table */
    .audit-responsive-container .audit-table-card {
      padding: 0.55rem !important;
    }

    .audit-responsive-container .erp-table {
      min-width: 600px !important;
      width: 600px !important;
    }
  }

  @media (max-width: 360px) {
    .audit-responsive-container .audit-stats {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 0.6rem !important;
    }

    .audit-responsive-container .audit-stat-title {
      max-width: none !important;
      flex: 1 1 auto;
      min-width: 0;
      overflow-wrap: normal;
      word-break: normal;
    }

    .audit-responsive-container .audit-table-card {
      padding: 0.5rem !important;
    }

    .audit-responsive-container .audit-table-wrapper {
      overscroll-behavior-x: contain;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination {
      gap: 2px !important;
      padding: 6px 2px !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button,
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination__pages > button {
      flex: 0 0 26px !important;
      width: 26px !important;
      min-width: 26px !important;
      height: 28px !important;
      min-height: 28px !important;
      font-size: 9px !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button {
      display: inline-flex !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination__pages {
      gap: 2px !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination__pages > span {
      min-width: 18px !important;
      min-height: 28px !important;
      padding: 0 !important;
      font-size: 11px !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination__info {
      max-width: calc(100vw - 48px) !important;
      white-space: normal !important;
      text-align: center !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="First page"] svg,
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Previous page"] svg,
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Next page"] svg,
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Last page"] svg {
      display: none !important;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="First page"]::after,
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Last page"]::after {
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Previous page"]::after,
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Next page"]::after {
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
    }

    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="First page"]::after { content: "«"; }
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Previous page"]::after { content: "‹"; }
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Next page"]::after { content: "›"; }
    .audit-responsive-container .audit-pagination-wrapper .erp-pagination > button[aria-label="Last page"]::after { content: "»"; }

    .audit-responsive-container .audit-table-wrapper .erp-table {
      table-layout: fixed;
    }

    .audit-responsive-container .audit-table-wrapper .erp-table th:nth-child(1),
    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(1) { width: 145px; }

    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(1) {
      white-space: normal !important;
      overflow-wrap: anywhere;
    }

    .audit-responsive-container .audit-table-wrapper .erp-table th:nth-child(2),
    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(2) { width: 110px; }

    .audit-responsive-container .audit-table-wrapper .erp-table th:nth-child(3),
    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(3) { width: 95px; }

    .audit-responsive-container .audit-table-wrapper .erp-table th:nth-child(4),
    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(4) { width: 150px; }

    .audit-responsive-container .audit-table-wrapper .erp-table th:nth-child(5),
    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(5) { width: 100px; }

    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(2) > span,
    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(3) > span {
      max-width: 100%;
      box-sizing: border-box;
      padding: 0.35rem 0.45rem !important;
      gap: 0.3rem !important;
      font-size: 0.7rem !important;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(4),
    .audit-responsive-container .audit-table-wrapper .erp-table td:nth-child(5) {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  }

  .audit-responsive-container {
    padding: 0.6rem 1.5rem 1.5rem !important;
    background: #f4f7f9 !important;
  }

  .audit-responsive-container .audit-breadcrumb-wrapper {
    margin-bottom: 0.85rem;
  }

  .audit-responsive-container .standard-page-header {
    margin-bottom: 1rem;
  }

  .audit-responsive-container .standard-page-header-actions {
    flex-shrink: 0;
  }

  .audit-responsive-container .audit-filter-btn {
    min-height: 38px;
    padding: 0 0.95rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.32);
    border-radius: 8px;
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .audit-responsive-container .audit-filter-btn:hover,
  .audit-responsive-container .audit-filter-btn[aria-expanded="true"] {
    background: rgba(255, 255, 255, 0.22);
    transform: translateY(-1px);
  }

  .audit-responsive-container .audit-filter-btn:focus-visible {
    outline: 3px solid rgba(255, 255, 255, 0.45);
    outline-offset: 2px;
  }

  .audit-responsive-container .audit-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
    margin: 0 0 1rem;
  }

  .audit-responsive-container .audit-stat-card {
    min-width: 0;
    min-height: 108px;
    padding: 1rem 1.1rem;
    position: relative;
    overflow: hidden;
    background: #fff;
    border: 1px solid #e3eaee;
    border-left: 3px solid var(--audit-accent);
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(15, 58, 74, 0.055);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .audit-responsive-container .audit-stat-card::after {
    content: "";
    position: absolute;
    top: -25px;
    right: -25px;
    width: 78px;
    height: 78px;
    background: var(--audit-tint);
    border-radius: 50%;
    pointer-events: none;
  }

  .audit-responsive-container .audit-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 7px 18px rgba(15, 58, 74, 0.1);
  }

  .audit-responsive-container .audit-stat-content {
    position: relative;
    z-index: 1;
  }

  .audit-responsive-container .audit-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    margin-bottom: 0.65rem;
  }

  .audit-responsive-container .audit-stat-title {
    min-width: 0;
    margin: 0;
    color: #60737c;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .audit-responsive-container .audit-stat-icon {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--audit-accent);
    background: var(--audit-tint);
    border: 1px solid color-mix(in srgb, var(--audit-accent) 20%, white);
    border-radius: 9px;
    font-size: 0.9rem;
  }

  .audit-responsive-container .audit-stat-value {
    margin: 0;
    color: var(--audit-accent);
    font-size: 1.55rem;
    font-weight: 750;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  .audit-responsive-container .audit-filter-panel {
    padding: 1.15rem !important;
    margin-bottom: 1rem !important;
    background: #fff;
    border: 1px solid #e2e9ed;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(15, 58, 74, 0.06);
    overflow: hidden;
  }

  .audit-responsive-container .audit-filter-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 0.85rem !important;
    margin-bottom: 0.9rem !important;
  }

  .audit-responsive-container .audit-filter-grid label {
    color: #425e69 !important;
    font-size: 0.78rem !important;
  }

  .audit-responsive-container .audit-filter-panel select,
  .audit-responsive-container .audit-filter-panel input {
    box-sizing: border-box;
    min-height: 40px;
    padding: 0.55rem 0.75rem !important;
    color: #294652;
    background: #fbfcfd !important;
    border: 1px solid #d8e2e6 !important;
    border-radius: 8px !important;
    font-size: 0.84rem !important;
  }

  .audit-responsive-container .audit-filter-panel select:focus,
  .audit-responsive-container .audit-filter-panel input:focus {
    border-color: #1a6875 !important;
    box-shadow: 0 0 0 3px rgba(26, 104, 117, 0.12);
    outline: none;
  }

  .audit-responsive-container .audit-filter-actions {
    gap: 0.6rem !important;
  }

  .audit-responsive-container .audit-filter-actions button {
    min-height: 38px;
    padding: 0.5rem 0.9rem !important;
    border-radius: 8px !important;
    font-size: 0.82rem !important;
  }

  .audit-responsive-container .alert {
    margin: 0 0 1rem !important;
    border-radius: 9px;
  }

  .audit-responsive-container .audit-table-card {
    padding: 1.1rem !important;
    border: 1px solid #e2e9ed !important;
    border-radius: 13px !important;
    box-shadow: 0 4px 16px rgba(15, 58, 74, 0.06) !important;
  }

  .audit-responsive-container .audit-table-wrapper {
    border-color: #e2e9ed !important;
    border-radius: 10px !important;
    scrollbar-width: thin;
    scrollbar-color: #aab9bf #f1f5f6;
  }

  .audit-responsive-container .erp-table {
    min-width: 780px;
    border-collapse: separate;
    border-spacing: 0;
  }

  .audit-responsive-container .erp-table thead {
    background: #103f50;
  }

  .audit-responsive-container .erp-table th {
    padding: 0.8rem 1rem !important;
    color: #fff;
    background: linear-gradient(135deg, #103f50 0%, #0d3442 100%);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  .audit-responsive-container .erp-table td {
    padding: 0.85rem 1rem !important;
    color: #40545d;
    border-bottom: 1px solid #edf1f3;
    vertical-align: middle;
  }

  .audit-responsive-container .erp-table tbody tr {
    cursor: pointer;
    transition: background-color 0.18s ease;
  }

  .audit-responsive-container .erp-table tbody tr:nth-child(even) {
    background: #f9fbfc;
  }

  .audit-responsive-container .erp-table tbody tr:hover {
    background: #eef7f8 !important;
  }

  .audit-responsive-container .audit-action-badge,
  .audit-responsive-container .audit-resource-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem !important;
    max-width: 100%;
    padding: 0.38rem 0.65rem !important;
    border: 1px solid currentColor;
    border-radius: 7px !important;
    font-size: 0.74rem !important;
    font-weight: 650 !important;
    line-height: 1.25;
    white-space: nowrap;
  }

  .audit-responsive-container .audit-resource-badge {
    background: #f2f7f9 !important;
    border-color: #e1eaee !important;
  }

  .audit-responsive-container .audit-table-scroll-hint {
    margin: 0.5rem 0 0 !important;
    color: #71838b;
    font-size: 0.72rem;
    text-align: center;
  }

  .audit-responsive-container .audit-pagination-wrapper {
    margin-top: 1rem !important;
    margin-bottom: 0.75rem !important;
  }

  .audit-responsive-container .audit-table-card > p {
    margin: 0.75rem 0 0 !important;
    color: #71838b !important;
    font-size: 0.8rem !important;
  }

  @media (max-width: 1024px) {
    .audit-responsive-container .audit-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .audit-responsive-container .audit-filter-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .audit-responsive-container .erp-table {
      min-width: 760px !important;
      width: 760px !important;
    }
  }

  @media (max-width: 600px) {
    .audit-responsive-container {
      padding: 0.5rem 0.75rem 0.9rem !important;
    }

    .audit-responsive-container .standard-page-header-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .audit-responsive-container .audit-filter-btn {
      min-height: 40px;
      width: 100%;
    }

    .audit-responsive-container .audit-stats,
    .audit-responsive-container .audit-filter-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .audit-responsive-container .audit-stat-card {
      min-height: 92px;
      padding: 0.85rem !important;
    }

    .audit-responsive-container .audit-stat-title {
      max-width: none !important;
      font-size: 0.78rem !important;
    }

    .audit-responsive-container .audit-filter-panel {
      padding: 0.9rem !important;
    }

    .audit-responsive-container .audit-filter-actions {
      justify-content: stretch !important;
    }

    .audit-responsive-container .audit-filter-actions button {
      width: 100% !important;
    }

    .audit-responsive-container .audit-table-card {
      padding: 0.65rem !important;
    }

    .audit-responsive-container .erp-table {
      min-width: 760px !important;
      width: 760px !important;
    }
  }
`}</style>
    </div>
  );
}
