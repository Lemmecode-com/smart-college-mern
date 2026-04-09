import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

import {
  FaClipboardList,
  FaFilter,
  FaCalendarAlt,
  FaSyncAlt,
  FaUserShield,
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
  DELETE: {
    icon: FaTrash,
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    label: "Deleted",
    border: "#ef4444",
  },
  APPROVE: {
    icon: FaCheckCircle,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.1)",
    label: "Approved",
    border: "#10b981",
  },
  REJECT: {
    icon: FaTimesCircle,
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    label: "Rejected",
    border: "#ef4444",
  },
  BULK_APPROVE: {
    icon: FaUsers,
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.1)",
    label: "Bulk Approved",
    border: "#10b981",
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

export default function AuditLogs() {
  const { user } = useContext(AuthContext);

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  // Security check
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  // Fetch audit logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
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

      // API returns array directly, not wrapped in { success, data }
      const logsData = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.logs || [];

      setLogs(Array.isArray(logsData) ? logsData : []);
      setPagination(res.data?.pagination || null);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      setLogs([]);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await api.get("/audit-logs/stats");
      // API returns stats directly, not wrapped
      setStats(res.data?.data || res.data || null);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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
        title: "Last 24 Hours",
        value: stats.last24Hours || 0,
        icon: FaClock,
        color: "#3b82f6",
        bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
        border: "#3b82f6",
      },
      {
        title: "Last 7 Days",
        value: stats.last7Days || 0,
        icon: FaChartLine,
        color: "#10b981",
        bg: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
        border: "#10b981",
      },
      {
        title: "Last 30 Days",
        value: stats.last30Days || 0,
        icon: FaCalendarAlt,
        color: "#8b5cf6",
        bg: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
        border: "#8b5cf6",
      },
      {
        title: "Total Actions",
        value:
          stats.actionsByType?.reduce((sum, item) => sum + item.count, 0) || 0,
        icon: FaClipboardList,
        color: "#f59e0b",
        bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)",
        border: "#f59e0b",
      },
    ];

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {cards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              border: `2px solid ${card.border}20`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "100px",
                height: "100px",
                background: card.bg,
                borderRadius: "50%",
                transform: "translate(30%, -30%)",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: THEME.text.secondary,
                  }}
                >
                  {card.title}
                </p>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: card.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${card.border}30`,
                  }}
                >
                  <card.icon
                    style={{ fontSize: "1.25rem", color: card.color }}
                  />
                </div>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "2.25rem",
                  fontWeight: "bold",
                  color: card.color,
                  letterSpacing: "-0.02em",
                }}
              >
                {card.value.toLocaleString()}
              </h3>
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
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
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

  // Render pagination
  const renderPagination = () => {
    if (!pagination || pagination.pages <= 1) return null;

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5rem",
          marginTop: "2rem",
        }}
      >
        <button
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          style={{
            padding: "0.625rem 1rem",
            background: currentPage === 1 ? "#f1f5f9" : "white",
            border: `2px solid ${currentPage === 1 ? "#e2e8f0" : "#e2e8f0"}`,
            borderRadius: "10px",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 ? 0.5 : 1,
            fontWeight: "600",
            fontSize: "0.875rem",
            color: THEME.text.secondary,
            transition: "all 0.2s",
          }}
        >
          ← Previous
        </button>

        <span
          style={{
            padding: "0.625rem 1.25rem",
            color: THEME.text.secondary,
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          Page {currentPage} of {pagination.pages}
        </span>

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))
          }
          disabled={currentPage === pagination.pages}
          style={{
            padding: "0.625rem 1rem",
            background: currentPage === pagination.pages ? "#f1f5f9" : "white",
            border: `2px solid ${currentPage === pagination.pages ? "#e2e8f0" : "#e2e8f0"}`,
            borderRadius: "10px",
            cursor:
              currentPage === pagination.pages ? "not-allowed" : "pointer",
            opacity: currentPage === pagination.pages ? 0.5 : 1,
            fontWeight: "600",
            fontSize: "0.875rem",
            color: THEME.text.secondary,
            transition: "all 0.2s",
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.background.light,
        padding: "1.5rem",
      }}
    >
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Audit Logs", active: true },
        ]}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
          padding: "2rem",
          borderRadius: "20px",
          marginBottom: "1.5rem",
          boxShadow: "0 10px 40px rgba(26, 75, 109, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30px",
            left: "100px",
            width: "150px",
            height: "150px",
            background: "rgba(61, 181, 230, 0.1)",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            >
              <FaShieldAlt style={{ fontSize: "1.75rem", color: "white" }} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.75rem",
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                Audit Logs
              </h2>
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.9375rem",
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: "500",
                }}
              >
                Track all admin actions on student data • DPDPA 2026 Compliant
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "0.75rem 1.5rem",
              background: showFilters
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.1)",
              color: "white",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9375rem",
              fontWeight: "600",
              backdropFilter: "blur(10px)",
              transition: "all 0.2s",
            }}
          >
            <FaFilter />
            Filters
            {showFilters ? <FaChevronUp /> : <FaChevronDown />}
          </motion.button>
        </div>
      </motion.div>

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

      {/* Filters */}
      {renderFilters()}

      {/* Audit Logs Table */}
      <motion.div
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
                fontSize: "0.9375rem",
                color: THEME.text.muted,
                maxWidth: "400px",
                margin: "0 auto",
              }}
            >
              Admin actions will appear here as you manage student data, fee
              structures, and user accounts
            </p>
          </motion.div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0 0.5rem",
                  fontSize: "0.875rem",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "1rem",
                        color: THEME.text.muted,
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
                        padding: "1rem",
                        color: THEME.text.muted,
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
                        padding: "1rem",
                        color: THEME.text.muted,
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
                        padding: "1rem",
                        color: THEME.text.muted,
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
                        padding: "1rem",
                        color: THEME.text.muted,
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
                    const isExpanded = expandedLog === log._id;

                    return (
                      <React.Fragment key={log._id}>
                        <motion.tr
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{
                            background: isExpanded ? "#f8fafc" : "white",
                            transition: "all 0.2s",
                          }}
                          onClick={() =>
                            setExpandedLog(isExpanded ? null : log._id)
                          }
                          onMouseEnter={(e) => {
                            if (!isExpanded)
                              e.currentTarget.style.background = "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded)
                              e.currentTarget.style.background = "white";
                          }}
                        >
                          <td
                            style={{
                              padding: "1rem",
                              whiteSpace: "nowrap",
                              borderRadius: "12px 0 0 12px",
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
    </div>
  );
}
