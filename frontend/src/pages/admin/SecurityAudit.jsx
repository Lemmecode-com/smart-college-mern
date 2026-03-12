import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../api/axios";
import Loading from "../../components/Loading";
import { exportToPDF, exportToExcel } from "../../utils/exportHelpers";
import {
  FaShieldAlt,
  FaChartPie,
  FaSyncAlt,
  FaExclamationTriangle,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaUserLock,
  FaUserSlash,
  FaSignOutAlt,
  FaKey,
  FaBan,
  FaExclamationCircle,
  FaEyeSlash,
  FaFileExport,
  FaFilter,
  FaCalendarAlt,
  FaUniversity,
  FaLayerGroup,
  FaClipboardList,
  FaClock,
} from "react-icons/fa";

export default function SecurityAudit() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const hasLoadedRef = useRef(false);

  /* ================= FILTERS ================= */
  const [filters, setFilters] = useState({
    eventType: "",
    severity: "",
    startDate: "",
    endDate: "",
    collegeId: "",  // Reserved for future when college list API is available
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [colleges, setColleges] = useState([]);  // Not used currently

  /* ================= FETCH DATA ================= */
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      console.log('🔍 Fetching logs with filters:', filters);
      
      const params = new URLSearchParams({
        ...filters,
        page: currentPage,
        limit: 20,
      });
      console.log('📡 API Request:', `/security-audit?${params}`);
      
      const res = await api.get(`/security-audit?${params}`);
      console.log('📥 API Response:', res.data);

      const logsData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      console.log('📊 Logs data:', logsData.length, 'records');
      
      setLogs(logsData);
      setPagination(res.data?.pagination || null);

      if (logsData.length > 0) {
        toast.success(`Loaded ${logsData.length} security events`, {
          position: "top-right",
          autoClose: 2000,
        });
      } else {
        toast.info('No security events found', {
          position: "top-right",
          autoClose: 2000,
        });
      }
    } catch (err) {
      console.error("Security audit fetch error:", err);
      setError(err.response?.data?.message || "Failed to load security audit logs.");
      toast.error("Failed to load security audit logs.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/security-audit/dashboard");
      setStats(res.data?.data || null);
    } catch (err) {
      console.error("Security audit stats error:", err);
    }
  }, []);

  const fetchColleges = useCallback(async () => {
    try {
      const res = await api.get("/college/list");
      console.log('🏛️ Colleges API Response:', res.data);
      
      // Handle both array and object responses
      const collegesData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      if (collegesData && collegesData.length > 0) {
        console.log('✅ Setting colleges:', collegesData);
        setColleges(collegesData);
        console.log('📚 Colleges count:', collegesData.length);
      } else {
        console.warn('⚠️ No colleges data in response');
      }
    } catch (err) {
      console.error("❌ Failed to fetch colleges:", err.response?.data || err.message);
    }
  }, []);

  useEffect(() => {
    // Initial load only
    fetchColleges();
  }, [fetchColleges]);

  // Log colleges state changes
  useEffect(() => {
    console.log('🔄 Colleges state updated:', colleges.length, 'colleges');
    if (colleges.length > 0) {
      console.log('📋 First college:', colleges[0]);
    }
  }, [colleges]);

  // Fetch logs when filters or page change
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      return; // Skip first render, will be triggered by filter/page change
    }
    fetchLogs();
    fetchStats();
  }, [filters, currentPage]);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount((prev) => prev + 1);
      hasLoadedRef.current = false;
      fetchLogs();
    } else {
      toast.error("Maximum retry attempts reached.", {
        position: "top-right",
        autoClose: 3000,
      });
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  }, [retryCount, fetchLogs]);

  /* ================= FILTER HANDLERS ================= */
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchLogs();
    toast.info("Filters applied", {
      position: "top-right",
      autoClose: 1500,
    });
  };

  const handleClearFilters = () => {
    setFilters({
      eventType: "",
      severity: "",
      startDate: "",
      endDate: "",
      collegeId: "",
    });
    setCurrentPage(1);
    toast.info("Filters cleared", {
      position: "top-right",
      autoClose: 1500,
    });
  };

  /* ================= MARK AS REVIEWED ================= */
  const handleMarkAsReviewed = async (id) => {
    try {
      await api.put(`/security-audit/${id}/review`, { notes: "Reviewed by Super Admin" });
      toast.success("Marked as reviewed!", {
        position: "top-right",
        autoClose: 2000,
      });
      fetchLogs();
      fetchStats();
    } catch (err) {
      console.error("Mark as reviewed error:", err);
      toast.error("Failed to mark as reviewed.", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  /* ================= EXPORT ================= */
  const handleExport = async (format) => {
    try {
      toast.info(`Preparing ${format.toUpperCase()} export...`, {
        position: "top-right",
        autoClose: 1500,
      });

      // Prepare columns for export
      const columns = [
        { header: 'Timestamp', key: 'timestamp' },
        { header: 'Event Type', key: 'eventType' },
        { header: 'User Email', key: 'userEmail' },
        { header: 'User Role', key: 'userRole' },
        { header: 'College', key: 'college' },
        { header: 'IP Address', key: 'ipAddress' },
        { header: 'Severity', key: 'severity' },
        { header: 'Status', key: 'reviewed' },
      ];

      // Prepare data from current logs
      const exportData = logs.map(log => ({
        timestamp: new Date(log.createdAt).toLocaleString(),
        eventType: log.eventType,
        userEmail: log.userEmail || 'N/A',
        userRole: log.userRole || 'N/A',
        college: log.collegeId?.name || 'N/A',
        ipAddress: log.ipAddress,
        severity: log.severity,
        reviewed: log.reviewed ? 'Reviewed' : 'Pending'
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `security-audit-${timestamp}`;

      if (format === 'pdf') {
        await exportToPDF(
          'Security Audit Report',
          columns,
          exportData,
          `${filename}.pdf`
        );
        toast.success('PDF exported successfully!', {
          position: "top-right",
          autoClose: 2000,
        });
      } else if (format === 'excel') {
        await exportToExcel(
          'Security Audit Report',
          columns,
          exportData,
          `${filename}.xlsx`
        );
        toast.success('Excel exported successfully!', {
          position: "top-right",
          autoClose: 2000,
        });
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error(`Failed to export ${format}.`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  /* ================= HELPERS ================= */
  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return "badge-critical";
      case "HIGH":
        return "badge-high";
      case "MEDIUM":
        return "badge-medium";
      case "LOW":
        return "badge-low";
      default:
        return "badge-secondary";
    }
  };

  const getEventIcon = (eventType) => {
    const icons = {
      LOGIN_SUCCESS: <FaCheckCircle className="icon-success" />,
      LOGIN_FAILED: <FaTimesCircle className="icon-danger" />,
      LOGOUT: <FaSignOutAlt className="icon-info" />,
      PASSWORD_RESET_REQUEST: <FaKey className="icon-warning" />,
      PASSWORD_RESET_SUCCESS: <FaCheckCircle className="icon-success" />,
      PERMISSION_DENIED: <FaBan className="icon-danger" />,
      UNAUTHORIZED_ACCESS: <FaEyeSlash className="icon-warning" />,
      BRUTE_FORCE_DETECTED: <FaExclamationTriangle className="icon-critical" />,
      TOKEN_BLACKLISTED: <FaBan className="icon-danger" />,
    };
    return icons[eventType] || <FaClipboardList className="icon-info" />;
  };

  const getEventTypeName = (eventType) => {
    const names = {
      LOGIN_SUCCESS: "Login Success",
      LOGIN_FAILED: "Login Failed",
      LOGOUT: "Logout",
      PASSWORD_RESET_REQUEST: "Password Reset Request",
      PASSWORD_RESET_SUCCESS: "Password Reset Success",
      PERMISSION_DENIED: "Permission Denied",
      UNAUTHORIZED_ACCESS: "Unauthorized Access",
      BRUTE_FORCE_DETECTED: "Brute Force Detected",
      TOKEN_BLACKLISTED: "Token Blacklisted",
    };
    return names[eventType] || eventType;
  };

  /* ================= LOADING STATE ================= */
  if (loading && !hasLoadedRef.current) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Loading />
      </div>
    );
  }

  /* ================= ERROR STATE ================= */
  if (error && logs.length === 0) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm border-danger">
              <div className="card-body text-center">
                <FaExclamationTriangle className="text-danger mb-3" style={{ fontSize: "3rem" }} />
                <h5 className="text-danger">Failed to Load Security Audit</h5>
                <p className="text-muted">{error}</p>
                <button className="btn btn-primary" onClick={handleRetry}>
                  <FaSyncAlt className="me-2" /> Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* ================= PAGE HEADER ================= */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <FaShieldAlt className="me-2 text-primary" />
            Security Audit Dashboard
          </h2>
          <p className="text-muted mb-0">Monitor and track security events across all colleges</p>
        </div>
        <div className="d-flex gap-2">
          <div className="btn-group">
            <button className="btn btn-outline-success" onClick={() => handleExport("excel")}>
              <FaFileExport className="me-2" /> Excel
            </button>
            <button className="btn btn-outline-danger" onClick={() => handleExport("pdf")}>
              <FaFileExport className="me-2" /> PDF
            </button>
          </div>
          <button className="btn btn-outline-primary" onClick={fetchLogs}>
            <FaSyncAlt className="me-2" /> Refresh
          </button>
        </div>
      </div>

      {/* ================= STATISTICS CARDS ================= */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card stat-card bg-primary text-white shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h3 className="mb-0 fw-bold">{stats.last24Hours?.totalEvents || 0}</h3>
                    <small className="opacity-75">Events (24h)</small>
                  </div>
                  <FaClipboardList style={{ fontSize: "2.5rem", opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card stat-card bg-warning text-white shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h3 className="mb-0 fw-bold">{stats.last24Hours?.failedLogins || 0}</h3>
                    <small className="opacity-75">Failed Logins (24h)</small>
                  </div>
                  <FaUserSlash style={{ fontSize: "2.5rem", opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card stat-card bg-danger text-white shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h3 className="mb-0 fw-bold">{stats.last24Hours?.criticalEvents || 0}</h3>
                    <small className="opacity-75">Critical Events (24h)</small>
                  </div>
                  <FaExclamationTriangle style={{ fontSize: "2.5rem", opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card stat-card bg-success text-white shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h3 className="mb-0 fw-bold">{stats.last7Days?.totalEvents || 0}</h3>
                    <small className="opacity-75">Total Events (7 days)</small>
                  </div>
                  <FaChartPie style={{ fontSize: "2.5rem", opacity: 0.3 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= FILTERS CARD ================= */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-light">
          <h6 className="mb-0">
            <FaFilter className="me-2" />
            Filter Security Events
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-xl-2 col-md-6">
              <label className="form-label small">
                <FaUniversity className="me-1 text-muted" />
                College
              </label>
              <select
                className="form-select form-select-sm"
                value={filters.collegeId || ""}
                onChange={(e) => {
                  console.log('🏛️ College selected:', e.target.value);
                  handleFilterChange("collegeId", e.target.value);
                }}
              >
                <option value="">All Colleges</option>
                {colleges && colleges.length > 0 ? (
                  colleges.map((college) => (
                    <option key={college._id} value={college._id}>
                      {college.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Loading colleges...</option>
                )}
              </select>
              {colleges.length > 0 && (
                <small className="text-muted">{colleges.length} colleges loaded</small>
              )}
            </div>

            <div className="col-xl-2 col-md-6">
              <label className="form-label small">
                <FaClipboardList className="me-1 text-muted" />
                Event Type
              </label>
              <select
                className="form-select form-select-sm"
                value={filters.eventType}
                onChange={(e) => handleFilterChange("eventType", e.target.value)}
              >
                <option value="">All Events</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
                <option value="LOGOUT">Logout</option>
                <option value="PASSWORD_RESET_REQUEST">Password Reset Request</option>
                <option value="PASSWORD_RESET_SUCCESS">Password Reset Success</option>
                <option value="PERMISSION_DENIED">Permission Denied</option>
                <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                <option value="BRUTE_FORCE_DETECTED">Brute Force Detected</option>
                <option value="TOKEN_BLACKLISTED">Token Blacklisted</option>
              </select>
            </div>

            <div className="col-xl-2 col-md-6">
              <label className="form-label small">
                <FaExclamationCircle className="me-1 text-muted" />
                Severity
              </label>
              <select
                className="form-select form-select-sm"
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

            <div className="col-xl-2 col-md-6">
              <label className="form-label small">
                <FaCalendarAlt className="me-1 text-muted" />
                Start Date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            <div className="col-xl-2 col-md-6">
              <label className="form-label small">
                <FaCalendarAlt className="me-1 text-muted" />
                End Date
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="col-xl-2 col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-primary btn-sm flex-fill" onClick={handleApplyFilters}>
                <FaFilter className="me-1" /> Apply
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={handleClearFilters}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DATA TABLE ================= */}
      <div className="card shadow-sm">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaClipboardList className="me-2" />
            Security Events Log
            {pagination && (
              <span className="badge bg-secondary ms-2">{pagination.total} events</span>
            )}
          </h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <Loading />
              <p className="text-muted mt-3">Loading security events...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-5">
              <FaShieldAlt className="text-muted mb-3" style={{ fontSize: "3rem" }} />
              <h5 className="text-muted">No Security Events Found</h5>
              <p className="text-muted">No security events match your current filters.</p>
              <button className="btn btn-primary" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "120px" }}>Timestamp</th>
                    <th style={{ width: "180px" }}>Event</th>
                    <th>User</th>
                    <th>College</th>
                    <th style={{ width: "120px" }}>IP Address</th>
                    <th style={{ width: "100px" }}>Severity</th>
                    <th>Endpoint</th>
                    <th style={{ width: "100px" }}>Status</th>
                    <th style={{ width: "120px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <small className="text-muted">
                          <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                          <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                        </small>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {getEventIcon(log.eventType)}
                          <span className="badge bg-info bg-opacity-10 text-info">
                            {getEventTypeName(log.eventType)}
                          </span>
                        </div>
                      </td>
                      <td>
                        {log.userEmail ? (
                          <div>
                            <div className="fw-medium">{log.userEmail}</div>
                            <small className="text-muted">{log.userRole}</small>
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        {log.collegeId?.name ? (
                          <div className="d-flex align-items-center gap-1">
                            <FaUniversity className="text-muted small" />
                            <span>{log.collegeId.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        <code className="small">{log.ipAddress}</code>
                      </td>
                      <td>
                        <span className={`badge ${getSeverityBadgeClass(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">{log.endpoint || "N/A"}</small>
                      </td>
                      <td>
                        {log.reviewed ? (
                          <span className="badge bg-success bg-opacity-10 text-success">
                            <FaCheckCircle className="me-1" /> Reviewed
                          </span>
                        ) : (
                          <span className="badge bg-warning bg-opacity-10 text-warning">
                            <FaClock className="me-1" /> Pending
                          </span>
                        )}
                      </td>
                      <td>
                        {!log.reviewed && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleMarkAsReviewed(log._id)}
                            title="Mark as Reviewed"
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================= PAGINATION ================= */}
        {pagination && pagination.pages > 1 && (
          <div className="card-footer bg-light">
            <nav>
              <ul className="pagination pagination-sm justify-content-center mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((prev) => prev - 1)}>
                    Previous
                  </button>
                </li>
                {[...Array(pagination.pages)].map((_, i) => (
                  <li
                    key={i}
                    className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                  >
                    <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === pagination.pages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setCurrentPage((prev) => prev + 1)}>
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* ================= CUSTOM STYLES ================= */}
      <style>{`
        .stat-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        
        .badge-low { background-color: #28a745; }
        .badge-medium { background-color: #ffc107; color: #000; }
        .badge-high { background-color: #fd7e14; }
        .badge-critical { background-color: #dc3545; }
        .badge-secondary { background-color: #6c757d; }
        
        .icon-success { color: #28a745; font-size: 1.1rem; }
        .icon-danger { color: #dc3545; font-size: 1.1rem; }
        .icon-warning { color: #ffc107; font-size: 1.1rem; }
        .icon-info { color: #17a2b8; font-size: 1.1rem; }
        .icon-critical { color: #dc3545; font-size: 1.1rem; }
        
        .table th {
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .table td {
          vertical-align: middle;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
