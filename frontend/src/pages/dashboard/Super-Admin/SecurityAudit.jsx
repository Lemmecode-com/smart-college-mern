import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import {
  FaShieldAlt,
  FaChartPie,
  FaSyncAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUserLock,
  FaSignOutAlt,
  FaKey,
  FaBan,
  FaFileExport,
  FaFilter,
  FaCalendarAlt,
  FaUniversity,
  FaClipboardList,
  FaClock,
  FaSearch,
  FaChevronRight,
} from "react-icons/fa";

// Theme colors matching sidebar
const THEME = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  secondary: {
    main: "#3db5e6",
    light: "#4fc3f7",
  },
  success: {
    main: "#28a745",
    light: "#34ce57",
  },
  warning: {
    main: "#ffc107",
    dark: "#e0a800",
  },
  danger: {
    main: "#dc3545",
    light: "#e4606d",
  },
  info: {
    main: "#17a2b8",
    light: "#1fc8e3",
  },
  background: {
    light: "#f8fafc",
    medium: "#f1f5f9",
    dark: "#e2e8f0",
  },
  text: {
    primary: "#1a4b6d",
    secondary: "#64748b",
    muted: "#94a3b8",
  },
  sidebar: {
    start: "#0f3a4a",
    end: "#0c2d3a",
    accent: "#3db5e6",
  },
};

export default function SecurityAudit() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    eventType: "",
    severity: "",
    startDate: "",
    endDate: "",
    collegeId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [colleges, setColleges] = useState([]);

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

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchColleges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - only run on mount

  useEffect(() => {
    fetchLogs();
    // Don't refetch colleges and stats on filter change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  useEffect(() => {
    const interval = setInterval(fetchLogs, 60000); // Auto-refresh logs every 60s for real-time monitoring
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        ...filters,
        page: currentPage,
        limit: 10,
      });
      const res = await api.get(`/security-audit?${params}`);
      const logsData = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.logs || [];
      setLogs(Array.isArray(logsData) ? logsData : []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load security logs";

      logger.error("Error fetching security logs:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/security-audit/dashboard");
      setStats(res.data?.data || null);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      logger.error("Error fetching security stats:", statusCode, errorCode);
      setStats(null);
    }
  };

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await api.get("/master/get/colleges?includeInactive=true");

      if (Array.isArray(res.data)) {
        setColleges(res.data);
      } else if (res.data?.colleges && Array.isArray(res.data.colleges)) {
        setColleges(res.data.colleges);
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        setColleges(res.data.data);
      } else {
        logger.warn("Invalid colleges response structure:", res.data);
        setColleges([]);
      }
    } catch (err) {
      logger.error("Error fetching colleges:", err.response?.status, err.response?.data?.code);
      setColleges([]);
    }
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };

    if ((key === "startDate" || key === "endDate") && next.startDate && next.endDate && next.endDate < next.startDate) {
      toast.error("End Date cannot be earlier than Start Date");
      return;
    }

    setFilters(next);
    setCurrentPage(1);
  };

  const handleMarkAsReviewed = async (id) => {
    try {
      await api.put(`/security-audit/${id}/review`, {
        notes: "Reviewed by admin",
      });
      toast.success("Marked as reviewed");
      fetchLogs();
      fetchStats();
    } catch (err) {
      logger.error("Error marking as reviewed:", err.response?.status, err.response?.data?.code);
      toast.error("Failed to update status");
    }
  };

  const getSeverityBadgeClass = (severity) => {
    const classes = {
      CRITICAL: "severity-critical",
      HIGH: "severity-high",
      MEDIUM: "severity-medium",
      LOW: "severity-low",
    };
    return classes[severity] || "";
  };

  const getEventTypeIcon = (eventType) => {
    const icons = {
      LOGIN_SUCCESS: "✅",
      LOGIN_FAILED: "❌",
      LOGOUT: "🚪",
      PASSWORD_RESET_REQUEST: "🔑",
      PASSWORD_RESET_SUCCESS: "✅",
      PERMISSION_DENIED: "🚫",
      UNAUTHORIZED_ACCESS: "⚠️",
      BRUTE_FORCE_DETECTED: "🚨",
      TOKEN_BLACKLISTED: "⛔",
      DATA_MODIFICATION: "📝",
      BULK_DATA_EXPORT: "📊",
    };
    return icons[eventType] || "📋";
  };

const getCategoryBadgeClass = (category) => {
     switch (category) {
       case 'AUTHENTICATION':
         return 'category-auth';
       case 'AUTHORIZATION':
         return 'category-auth';
       case 'DATA_ACCESS':
         return 'category-data';
       case 'DATA_MODIFICATION':
         return 'category-modification';
       case 'SYSTEM':
         return 'category-system';
       default:
         return 'category-system';
     }
   };

  if (error && !loading) {
    return (
      <ApiError
        title="Security Audit Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchLogs}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (loading && !logs.length) {
    return (
      <Loading
        fullScreen
        size="lg"
        text="Loading Security Audit..."
        variant="spinner"
      />
    );
  }

  return (
    <>
      <div className="security-audit-page">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-icon">
              <FaShieldAlt />
            </div>
            <div className="header-text">
              <h1 className="page-title">Security Audit Dashboard</h1>
              <p className="page-subtitle">
                Monitor and analyze security events across all colleges
              </p>
              <p className="page-meta">
                <FaClock className="meta-icon" />
                Real-time security monitoring
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-card-header">
                <div className="stat-icon stat-icon-total">
                  <FaChartPie />
                </div>
                <div className="stat-title">Events (24h)</div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">
                  {stats.last24Hours.totalEvents?.toLocaleString() || "0"}
                </div>
                <div className="stat-trend">
                  <FaClipboardList className="trend-icon" />
                  <span>Total events logged</span>
                </div>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-card-header">
                <div className="stat-icon stat-icon-warning">
                  <FaExclamationTriangle />
                </div>
                <div className="stat-title">Failed Logins (24h)</div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">
                  {stats.last24Hours.failedLogins?.toLocaleString() || "0"}
                </div>
                <div className="stat-trend">
                  <FaUserSlash className="trend-icon" />
                  <span>Authentication failures</span>
                </div>
              </div>
            </div>

            <div className="stat-card stat-danger">
              <div className="stat-card-header">
                <div className="stat-icon stat-icon-danger">
                  <FaBan />
                </div>
                <div className="stat-title">Critical Events (24h)</div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">
                  {stats.last24Hours.criticalEvents?.toLocaleString() || "0"}
                </div>
                <div className="stat-trend">
                  <FaShieldAlt className="trend-icon" />
                  <span>High severity incidents</span>
                </div>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-card-header">
                <div className="stat-icon stat-icon-success">
                  <FaCheckCircle />
                </div>
                <div className="stat-title">Total Events (7 days)</div>
              </div>
              <div className="stat-card-body">
                <div className="stat-value">
                  {stats.last7Days.totalEvents?.toLocaleString() || "0"}
                </div>
                <div className="stat-trend">
                  <FaCalendarAlt className="trend-icon" />
                  <span>Weekly overview</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="filter-section">
          <div className="filter-header">
            <h3 className="filter-title">
              <FaFilter className="filter-icon" />
              Filters
            </h3>
          </div>
          <div className="filter-grid">
            <div className="filter-item">
              <label className="filter-label">
                <FaUniversity className="label-icon" />
                College
              </label>
              <select
                className="filter-select"
                value={filters.collegeId}
                onChange={(e) =>
                  handleFilterChange("collegeId", e.target.value)
                }
              >
                <option value="">All Colleges</option>
                {colleges && colleges.length > 0
                  ? colleges.map((college) => (
                      <option key={college._id} value={college._id}>
                        {college.name} {college.code ? `(${college.code})` : ""}
                      </option>
                    ))
                  : null}
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">
                <FaClipboardList className="label-icon" />
                Event Type
              </label>
              <select
                className="filter-select"
                value={filters.eventType}
                onChange={(e) =>
                  handleFilterChange("eventType", e.target.value)
                }
              >
                <option value="">All Event Types</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">
                <FaShieldAlt className="label-icon" />
                Severity
              </label>
              <select
                className="filter-select"
                value={filters.severity}
                onChange={(e) => handleFilterChange("severity", e.target.value)}
              >
                <option value="">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">
                <FaCalendarAlt className="label-icon" />
                Start Date
              </label>
              <input
                type="date"
                className="filter-input"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">
                <FaCalendarAlt className="label-icon" />
                End Date
              </label>
              <input
                type="date"
                className="filter-input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="filter-item filter-actions">
              <button className="btn-apply" onClick={() => setCurrentPage(1)}>
                <FaSearch className="btn-icon" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="table-section">
          <div className="table-header">
            <h3 className="table-title">
              <FaClipboardList className="table-icon" />
              Security Events Log
            </h3>
            {pagination && (
              <span className="table-info">
                {pagination.page} of {pagination.pages} pages •{" "}
                {pagination.totalDocs} events
              </span>
            )}
          </div>

          {loading ? (
            <div className="table-loading">
              <Loading
                size="lg"
                text="Loading security logs..."
                variant="spinner"
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>User</th>
                    <th>College</th>
                    <th>IP Address</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs && logs.length > 0 ? (
                    logs.map((log) => (
                      <tr
                        key={log._id}
                        className={!log.reviewed ? "row-pending" : ""}
                      >
                        <td className="cell-timestamp" data-label="Timestamp">
                          <div className="timestamp-date">
                            {new Date(log.createdAt).toLocaleDateString("en-IN")}
                          </div>
                          <div className="timestamp-time">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td data-label="Event">
                          <div className="event-cell">
                            <span className="event-icon">
                              {getEventTypeIcon(log.eventType)}
                            </span>
                            <span
                              className={`category-badge ${getCategoryBadgeClass(log.category)}`}
                            >
                              {log.eventType}
                            </span>
                          </div>
                        </td>
                        <td data-label="User">
                          {log.userId?.name || log.userRole ? (
                            <div className="user-cell">
                              {log.userId?.name && (
                                <div className="user-name">{log.userId.name}</div>
                              )}
                              {log.userRole && (
                                <div className="user-role">{log.userRole}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td data-label="College">
                          {log.collegeId?.name || (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td data-label="IP Address">
                          <span className="ip-address">{log.ipAddress}</span>
                        </td>
                        <td data-label="Severity">
                          <span
                            className={`severity-badge ${getSeverityBadgeClass(log.severity)}`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td data-label="Status">
                          {log.reviewed ? (
                            <span className="status-badge status-reviewed">
                              <FaCheckCircle className="status-icon" />
                              Reviewed
                            </span>
                          ) : (
                            <span className="status-badge status-pending">
                              <FaClock className="status-icon" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td data-label="Action">
                          {!log.reviewed && (
                            <button
                              className="btn-review"
                              onClick={() => handleMarkAsReviewed(log._id)}
                            >
                              Mark Reviewed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                        <td colSpan="8" className="cell-empty">
                        <div className="empty-state">
                          <FaShieldAlt className="empty-icon" />
                          <p className="empty-text">
                            No security events found for the selected filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="pagination-section">
              <nav className="pagination-nav">
                <ul className="pagination-list">
                  <li
                    className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                </ul>
                <div className="pagination-pages-wrapper">
                  <ul className="pagination-list">
                    {[...Array(pagination.pages)].map((_, i) => (
                      <li
                        key={i}
                        className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="pagination-list">
                  <li
                    className={`page-item ${currentPage === pagination.pages ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={currentPage === pagination.pages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* =====================================================
           SECURITY AUDIT PAGE - Enterprise SaaS Theme
           Matches sidebar dark teal gradient design system
           ===================================================== */

        .security-audit-page {
          padding: 1.5rem;
          background: var(--bs-light, #f8fafc);
          min-height: 100vh;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a4b6d;
          margin: 0;
        }

        .page-subtitle {
          color: #64748b;
          margin: 0.25rem 0 0;
          font-size: 0.95rem;
        }

        .page-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.85rem;
          margin: 0.5rem 0 0;
        }

        .meta-icon {
          font-size: 0.75rem;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .stat-icon-total {
          background: linear-gradient(135deg, #1a4b6d, #0f3a4a);
          color: white;
        }

        .stat-icon-warning {
          background: linear-gradient(135deg, #ffc107, #e0a800);
          color: white;
        }

        .stat-icon-danger {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
        }

        .stat-icon-success {
          background: linear-gradient(135deg, #28a745, #218838);
          color: white;
        }

        .stat-title {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1a4b6d;
          line-height: 1;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .trend-icon {
          font-size: 0.75rem;
        }

        /* Filter Section */
        .filter-section {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .filter-header {
          margin-bottom: 1rem;
        }

        .filter-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 700;
          color: #1a4b6d;
          margin: 0;
        }

        .filter-icon {
          color: #3db5e6;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
        }

        .label-icon {
          font-size: 0.75rem;
          color: #3db5e6;
        }

        .filter-select,
        .filter-input {
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
          color: #1a4b6d;
          transition: all 0.2s ease;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #1a4b6d;
          box-shadow: 0 0 0 3px rgba(26, 75, 109, 0.1);
        }

        .filter-actions {
          justify-content: flex-end;
        }

        .btn-apply {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-end;
        }

        .btn-apply:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(26, 75, 109, 0.3);
        }

        /* Table Section */
        .table-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 700;
          color: #1a4b6d;
          margin: 0;
        }

        .table-icon {
          color: #3db5e6;
        }

        .table-info {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .table-loading {
          padding: 3rem;
          display: flex;
          justify-content: center;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }

        .data-table thead th {
          padding: 1rem 0.875rem;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          white-space: nowrap;
        }

        .data-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .data-table tbody tr:hover {
          background: linear-gradient(90deg, rgba(61, 181, 230, 0.05), transparent);
        }

        .data-table tbody tr.row-pending {
          background: rgba(255, 193, 7, 0.03);
        }

        .data-table tbody td {
          padding: 1rem 0.875rem;
          font-size: 0.9rem;
          color: #334155;
          vertical-align: middle;
        }

        .cell-timestamp {
          white-space: nowrap;
        }

        .timestamp-date {
          font-weight: 600;
          color: #1a4b6d;
        }

        .timestamp-time {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        .event-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .event-icon {
          font-size: 1rem;
        }

        .category-badge {
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .category-auth {
          background: rgba(23, 162, 184, 0.1);
          color: #17a2b8;
        }

        .category-data {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
        }

        .category-modification {
          background: rgba(255, 193, 7, 0.1);
          color: #e0a800;
        }

        .category-system {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .user-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .user-role {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .ip-address {
          background: rgba(26, 75, 109, 0.05);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #1a4b6d;
        }

        .severity-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .severity-critical {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
        }

        .severity-high {
          background: linear-gradient(135deg, #fd7e14, #e8590c);
          color: white;
        }

        .severity-medium {
          background: linear-gradient(135deg, #ffc107, #e0a800);
          color: #1a4b6d;
        }

        .severity-low {
          background: linear-gradient(135deg, #28a745, #218838);
          color: white;
        }

        .endpoint-cell {
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 0.8rem;
          color: #64748b;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-icon {
          font-size: 0.65rem;
        }

        .status-reviewed {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
        }

        .status-pending {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }

        .btn-review {
          padding: 0.375rem 0.75rem;
          background: linear-gradient(135deg, #28a745, #218838);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-review:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .cell-empty {
          padding: 3rem !important;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 3rem;
          opacity: 0.3;
        }

        .empty-text {
          margin: 0;
          font-size: 1rem;
        }

        .text-muted {
          color: #94a3b8 !important;
        }

        /* Pagination */
        .pagination-section {
          padding: 1rem 1.25rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .pagination-nav {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: nowrap;
        }

        .pagination-pages-wrapper {
          display: flex;
          overflow-x: auto;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem;
          max-width: 100%;
          scroll-behavior: smooth;
          align-items: center;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #1a4b6d #f1f5f9;
        }

        .pagination-pages-wrapper::-webkit-scrollbar {
          height: 6px;
        }

        .pagination-pages-wrapper::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .pagination-pages-wrapper::-webkit-scrollbar-thumb {
          background: #1a4b6d;
          border-radius: 3px;
        }

        .pagination-list {
          display: flex;
          list-style: none;
          gap: 0.5rem;
          padding: 0;
          margin: 0;
          flex-shrink: 0;
        }

        .page-item button {
          padding: 0.5rem 0.875rem;
          border: 1px solid #e2e8f0;
          background: white;
          color: #1a4b6d;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .page-item button:hover:not(:disabled) {
          background: linear-gradient(135deg, #1a4b6d, #0f3a4a);
          color: white;
          border-color: #1a4b6d;
        }

        .page-item.active button {
          background: linear-gradient(135deg, #1a4b6d, #0f3a4a);
          color: white;
          border-color: #1a4b6d;
        }

        .page-item.disabled button,
        .page-item button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

 /* =========================================================
   RESPONSIVE DESIGN
   Desktop remains unchanged
   Tablet + Mobile optimized
   ========================================================= */

/* =========================================================
   TABLET
   769px - 991px
   ========================================================= */

@media (min-width: 769px) and (max-width: 991.98px) {

  .security-audit-page {
    padding: 1.25rem;
    width: 100%;
    box-sizing: border-box;
  }

  /* =========================
     HEADER
     ========================= */

  .page-header {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    border-radius: 14px;
  }

  .header-content {
    gap: 0.9rem;
    min-width: 0;
  }

  .header-icon {
    width: 52px;
    height: 52px;
    min-width: 52px;
    font-size: 1.35rem;
  }

  .header-text {
    min-width: 0;
  }

  .page-title {
    font-size: 1.55rem;
    line-height: 1.25;
  }

  .page-subtitle {
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .page-meta {
    font-size: 0.8rem;
    margin-top: 0.4rem;
  }

  /* =========================
     STATISTICS
     ========================= */

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .stat-card {
    min-width: 0;
    padding: 1rem;
  }

  .stat-card-header {
    gap: 0.65rem;
    margin-bottom: 0.8rem;
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    min-width: 44px;
    font-size: 1.15rem;
  }

  .stat-title {
    font-size: 0.8rem;
    line-height: 1.3;
  }

  .stat-value {
    font-size: 1.8rem;
  }

  .stat-trend {
    font-size: 0.8rem;
    line-height: 1.35;
  }

  /* =========================
     FILTERS
     ========================= */

  .filter-section {
    padding: 1.15rem;
    margin-bottom: 1.25rem;
  }

  .filter-header {
    margin-bottom: 0.9rem;
  }

  .filter-title {
    font-size: 1rem;
  }

  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .filter-item {
    min-width: 0;
    gap: 0.45rem;
  }

  .filter-label {
    font-size: 0.82rem;
  }

  .filter-select,
  .filter-input {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;

    padding: 0.65rem 0.8rem;
    font-size: 0.88rem;
  }

  .filter-actions {
    justify-content: flex-end;
    align-items: flex-end;
  }

  .btn-apply {
    width: auto;
    min-height: 42px;
    padding: 0.65rem 1rem;
    font-size: 0.85rem;
  }

  /* =========================
     TABLE
     ========================= */

  .table-section {
    border-radius: 12px;
  }

  .table-header {
    padding: 1rem 1.15rem;
  }

  .table-title {
    font-size: 0.95rem;
  }

  .table-info {
    font-size: 0.8rem;
  }

  .table-responsive {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    min-width: 850px;
  }

  .data-table thead th {
    padding: 0.8rem 0.7rem;
    font-size: 0.78rem;
  }

  .data-table tbody td {
    padding: 0.8rem 0.7rem;
    font-size: 0.82rem;
  }

  /* =========================
     PAGINATION
     ========================= */

  .pagination-section {
    padding: 0.85rem 1rem;
  }

  .pagination-nav {
    gap: 0.35rem;
  }

  .page-item button {
    padding: 0.45rem 0.7rem;
    font-size: 0.82rem;
  }
}


/* =========================================================
   MOBILE
   0px - 768px
   ========================================================= */

@media (max-width: 768px) {

  .security-audit-page {
    padding: 0.75rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  /* =========================
     PAGE HEADER
     ========================= */

  .page-header {
    display: block;

    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 14px;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;
  }

  .header-icon {
    width: 46px;
    height: 46px;
    min-width: 46px;
    border-radius: 11px;
    font-size: 1.2rem;
  }

  .header-text {
    min-width: 0;
    flex: 1;
  }

  .page-title {
    font-size: 1.35rem;
    line-height: 1.2;
    margin: 0;
    word-break: normal;
  }

  .page-subtitle {
    font-size: 0.84rem;
    line-height: 1.4;
    margin-top: 0.3rem;
  }

  .page-meta {
    font-size: 0.76rem;
    line-height: 1.3;
    margin-top: 0.45rem;
    gap: 0.35rem;
  }

  .meta-icon {
    font-size: 0.7rem;
  }

  /* =========================
     STATISTICS
     ========================= */

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .stat-card {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 1rem;
    border-radius: 12px;
  }

  .stat-card-header {
    gap: 0.7rem;
    margin-bottom: 0.75rem;
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 10px;
    font-size: 1.05rem;
  }

  .stat-title {
    font-size: 0.8rem;
    line-height: 1.3;
  }

  .stat-value {
    font-size: 1.65rem;
  }

  .stat-trend {
    font-size: 0.78rem;
    line-height: 1.35;
    flex-wrap: wrap;
  }

  /* =========================
     FILTER SECTION
     ========================= */

  .filter-section {
    width: 100%;
    box-sizing: border-box;

    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 14px;
  }

  .filter-header {
    margin-bottom: 0.9rem;
  }

  .filter-title {
    font-size: 1.05rem;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.8rem;
    width: 100%;
  }

  .filter-item {
    width: 100%;
    min-width: 0;
    gap: 0.4rem;
  }

  .filter-label {
    font-size: 0.84rem;
    line-height: 1.3;
  }

  .label-icon {
    font-size: 0.72rem;
  }

  /*
   * Important:
   * Prevent select/date inputs from overflowing
   * the mobile card.
   */

  .filter-select,
  .filter-input {
    display: block;

    width: 100%;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;

    height: 44px;
    padding: 0.6rem 0.75rem;

    font-size: 0.88rem;
    border-radius: 9px;
  }

  .filter-select {
    text-overflow: ellipsis;
  }

  .filter-input {
    -webkit-appearance: none;
    appearance: none;
  }

  /* Apply button */

  .filter-actions {
    width: 100%;
    align-items: center;
    justify-content: center;
    margin-top: 0.25rem;
  }

  .btn-apply {
    width: 100%;
    max-width: 210px;
    min-height: 44px;

    justify-content: center;
    align-self: center;

    padding: 0.65rem 1rem;
    font-size: 0.88rem;
  }

  /* =========================
     TABLE SECTION
     ========================= */

  .table-section {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
  }

  .table-header {
    padding: 0.9rem 1rem;

    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }

  .table-title {
    font-size: 0.95rem;
    line-height: 1.3;
  }

  .table-info {
    font-size: 0.78rem;
    line-height: 1.35;
  }

  /*
   * Mobile table becomes cards.
   */

  .table-responsive {
    width: 100%;
    overflow-x: hidden;
  }

  .data-table {
    width: 100%;
    min-width: 0;
    border-collapse: separate;
  }

  .data-table thead {
    display: none;
  }

  .data-table tbody {
    display: block;
    width: 100%;
  }

  .data-table tbody tr {
    display: block;

    width: calc(100% - 1rem);
    margin: 0.5rem;

    box-sizing: border-box;

    padding: 0.8rem;

    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: white;
  }

  .data-table tbody td {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    width: 100%;
    box-sizing: border-box;

    gap: 0.75rem;

    padding: 0.55rem 0;
    font-size: 0.8rem;

    border-bottom: 1px solid #f1f5f9;
  }

  .data-table tbody td:last-child {
    border-bottom: none;
  }

  .data-table tbody td::before {
    content: attr(data-label);

    flex: 0 0 38%;

    font-weight: 600;
    font-size: 0.76rem;
    line-height: 1.35;
    color: #1a4b6d;
  }

  .data-table tbody td > * {
    max-width: 62%;
    text-align: right;
  }

  .event-cell {
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .category-badge,
  .severity-badge,
  .status-badge {
    white-space: normal;
    text-align: center;
    word-break: break-word;
  }

  .user-cell {
    align-items: flex-end;
    text-align: right;
  }

  .ip-address {
    word-break: break-all;
  }

  .btn-review {
    padding: 0.4rem 0.65rem;
    font-size: 0.75rem;
  }

  /* Empty state */

  .cell-empty {
    display: block !important;
    padding: 2rem 1rem !important;
  }

  .cell-empty::before {
    display: none;
  }

  .empty-text {
    font-size: 0.85rem;
    line-height: 1.45;
    text-align: center;
  }

  .empty-icon {
    font-size: 2.5rem;
  }

  /* =========================
     PAGINATION
     ========================= */

  .pagination-section {
    padding: 0.75rem;
  }

  .pagination-nav {
    width: 100%;
    justify-content: center;
    gap: 0.3rem;
  }

  .pagination-pages-wrapper {
    max-width: calc(100vw - 150px);
    overflow-x: auto;
  }

  .page-item button {
    padding: 0.4rem 0.6rem;
    font-size: 0.76rem;
    white-space: nowrap;
  }
}


/* =========================================================
   SMALL MOBILE
   0px - 480px
   ========================================================= */

@media (max-width: 480px) {

  .security-audit-page {
    padding: 0.6rem;
  }

  /* Header */

  .page-header {
    padding: 0.9rem;
    border-radius: 12px;
  }

  .header-content {
    gap: 0.65rem;
  }

  .header-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    font-size: 1.05rem;
    border-radius: 10px;
  }

  .page-title {
    font-size: 1.2rem;
  }

  .page-subtitle {
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .page-meta {
    font-size: 0.7rem;
  }

  /* Stats */

  .stat-card {
    padding: 0.85rem;
  }

  .stat-card-header {
    margin-bottom: 0.65rem;
  }

  .stat-icon {
    width: 38px;
    height: 38px;
    min-width: 38px;
    font-size: 0.95rem;
  }

  .stat-title {
    font-size: 0.75rem;
  }

  .stat-value {
    font-size: 1.45rem;
  }

  .stat-trend {
    font-size: 0.72rem;
  }

  /* Filters */

  .filter-section {
    padding: 0.85rem;
  }

  .filter-title {
    font-size: 0.95rem;
  }

  .filter-grid {
    gap: 0.7rem;
  }

  .filter-label {
    font-size: 0.78rem;
  }

  .filter-select,
  .filter-input {
    height: 42px;
    padding: 0.55rem 0.7rem;
    font-size: 0.82rem;
  }

  .btn-apply {
    max-width: 190px;
    min-height: 42px;
    font-size: 0.82rem;
  }

  /* Table */

  .table-header {
    padding: 0.8rem 0.85rem;
  }

  .table-title {
    font-size: 0.88rem;
  }

  .table-info {
    font-size: 0.7rem;
  }

  .data-table tbody tr {
    width: calc(100% - 0.75rem);
    margin: 0.375rem;
    padding: 0.7rem;
  }

  .data-table tbody td {
    gap: 0.5rem;
    padding: 0.45rem 0;
    font-size: 0.74rem;
  }

  .data-table tbody td::before {
    flex-basis: 40%;
    font-size: 0.7rem;
  }

  .data-table tbody td > * {
    max-width: 60%;
  }

  .category-badge,
  .severity-badge,
  .status-badge {
    font-size: 0.62rem;
    padding: 0.2rem 0.45rem;
  }

  .btn-review {
    padding: 0.3rem 0.45rem;
    font-size: 0.68rem;
  }

  /* Pagination */

  .pagination-section {
    padding: 0.6rem;
  }

  .pagination-pages-wrapper {
    max-width: calc(100vw - 135px);
  }

  .page-item button {
    padding: 0.35rem 0.5rem;
    font-size: 0.7rem;
  }
}


/* =========================================================
   VERY SMALL DEVICES
   0px - 375px
   ========================================================= */

@media (max-width: 375px) {

  .security-audit-page {
    padding: 0.5rem;
  }

  .page-header {
    padding: 0.75rem;
  }

  .header-icon {
    width: 38px;
    height: 38px;
    min-width: 38px;
    font-size: 0.95rem;
  }

  .page-title {
    font-size: 1.1rem;
  }

  .page-subtitle {
    font-size: 0.72rem;
  }

  .page-meta {
    font-size: 0.65rem;
  }

  .filter-section {
    padding: 0.75rem;
  }

  .filter-select,
  .filter-input {
    height: 40px;
    font-size: 0.78rem;
  }

  .btn-apply {
    max-width: 175px;
    min-height: 40px;
    font-size: 0.78rem;
  }

  .stat-card {
    padding: 0.7rem;
  }

  .stat-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 0.85rem;
  }

  .stat-title {
    font-size: 0.68rem;
  }

  .stat-value {
    font-size: 1.3rem;
  }

  .stat-trend {
    font-size: 0.68rem;
  }

  .table-title {
    font-size: 0.82rem;
  }

  .table-info {
    font-size: 0.65rem;
  }

  .data-table tbody tr {
    padding: 0.6rem;
  }

  .data-table tbody td {
    font-size: 0.7rem;
  }

  .data-table tbody td::before {
    font-size: 0.66rem;
  }

  .empty-icon {
    font-size: 2rem;
  }

  .empty-text {
    font-size: 0.78rem;
  }
}
      `}</style>
    </>
  );
}
