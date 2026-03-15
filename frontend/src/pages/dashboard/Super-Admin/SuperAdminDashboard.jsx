import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import Loading from "../../../components/Loading";
import {
  FaUniversity,
  FaUsers,
  FaUserGraduate,
  FaTachometerAlt,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaInfoCircle,
  FaChartPie,
  FaListOl,
  FaPlus,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaBuilding,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
  FaDatabase,
  FaChevronRight,
  FaCog,
  FaCheckCircle,
  FaSearch,
  FaFilter,
  FaClock,
  FaTimes,
} from "react-icons/fa";

// Constants
const MAX_RETRY = 3;
const INITIAL_COLLEGES_DISPLAY = 3;

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ================= FETCH DASHBOARD DATA ================= */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/dashboard/super-admin");
      setData(res.data || { stats: {}, colleges: [] });
      setRetryCount(0);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessages = {
        401: "⚠️ Session expired. Please login again.",
        403: "🚫 Access denied. Super Admin privileges required.",
        500: "🔧 Server error. Please try again later.",
        503: "⏳ Service temporarily unavailable.",
      };

      const statusCode = err.response?.status;
      const message =
        err.response?.data?.message ||
        errorMessages[statusCode] ||
        "Failed to load dashboard data. Please check your connection.";

      setError(message);
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    if (retryCount < MAX_RETRY) {
      setRetryCount((prev) => prev + 1);
      fetchDashboardData();
    } else {
      setError("Maximum retry attempts reached. Please check your connection.");
    }
  };

  /* ================= KEYBOARD SHORTCUTS ================= */
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === "INPUT") return;

      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        fetchDashboardData();
      }
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        navigate("/super-admin/create-college");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [navigate]);

  /* ================= HELPER FUNCTIONS ================= */
  const safeDivide = (numerator, denominator) => {
    if (!denominator || denominator === 0) return "N/A";
    const result = numerator / denominator;
    return Number.isInteger(result) ? result : result.toFixed(1);
  };

  /* ================= CALCULATED METRICS ================= */
  const stats = useMemo(
    () =>
      data?.stats || {
        totalColleges: 0,
        totalStudents: 0,
        totalTeachers: 0,
        collegeGrowth: 0,
        studentGrowth: 0,
        teacherGrowth: 0,
      },
    [data],
  );

  const colleges = useMemo(() => data?.colleges || [], [data]);
  const collegeCount = colleges.length;

  // Filtered colleges
  const filteredColleges = useMemo(() => {
    return colleges.filter((college) => {
      const matchesSearch = college.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === "all" ||
        !college.status ||
        college.status.toLowerCase() === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [colleges, searchTerm, filterStatus]);

  const collegesToDisplay = useMemo(
    () => filteredColleges.slice(0, INITIAL_COLLEGES_DISPLAY),
    [filteredColleges],
  );
  const showViewMore = filteredColleges.length > INITIAL_COLLEGES_DISPLAY;

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon" role="alert" aria-live="assertive">
          <FaExclamationTriangle className="shake" aria-hidden="true" />
        </div>
        <h3>Dashboard Loading Error</h3>
        <p>{error}</p>
        <div className="error-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => window.history.back()}
          >
            <FaArrowLeft className="erp-btn-icon" aria-hidden="true" />
            Go Back
          </button>
          <button
            className="erp-btn erp-btn-primary"
            onClick={handleRetry}
            disabled={retryCount >= MAX_RETRY}
            aria-disabled={retryCount >= MAX_RETRY}
          >
            <FaSyncAlt className="erp-btn-icon spin" aria-hidden="true" />
            {retryCount >= MAX_RETRY
              ? "Max Retries"
              : `Retry (${retryCount}/${MAX_RETRY})`}
          </button>
        </div>
      </div>
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading || !data) {
    return (
      <Loading
        fullScreen
        size="lg"
        text="Loading Super Admin Dashboard..."
        variant="spinner"
      />
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb items={[{ label: "Dashboard" }]} />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse" aria-hidden="true">
            <FaUniversity />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Super Admin Dashboard</h1>
            <p className="erp-page-subtitle">
              Centralized management portal for all registered colleges
            </p>
            <p className="erp-page-meta">
              <FaClock className="meta-icon" aria-hidden="true" />
              Last refreshed: {lastRefresh.toLocaleTimeString()}
              <span className="keyboard-hint">(Ctrl+R to refresh)</span>
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={fetchDashboardData}
            title="Refresh dashboard data (Ctrl+R)"
            aria-label="Refresh dashboard"
          >
            <FaSyncAlt className="erp-btn-icon spin" aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate("/super-admin/create-college")}
            title="Add new college (Ctrl+N)"
            aria-label="Add new college"
          >
            <FaPlus className="erp-btn-icon" aria-hidden="true" />
            <span>Add College</span>
          </button>
        </div>
      </div>

      {/* INFO BANNER */}
      <div
        className="info-banner animate-fade-in"
        role="region"
        aria-label="System information"
      >
        <div className="info-icon" aria-hidden="true">
          <FaDatabase className="pulse" />
        </div>
        <div className="info-content">
          <strong>System Overview:</strong> This dashboard provides a
          centralized view of all registered colleges, student populations, and
          faculty statistics across your educational network. Data is updated in
          real-time.
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div
        className="filter-bar animate-fade-in"
        role="search"
        aria-label="College search and filter"
      >
        <div className="search-box">
          <FaSearch className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search colleges by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search colleges"
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              <FaTimes className="rotate-45" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="filter-group">
          <div className="filter-wrapper">
            <FaFilter className="filter-icon" aria-hidden="true" />
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {(searchTerm || filterStatus !== "all") && (
            <button
              className="filter-reset"
              onClick={() => {
                setSearchTerm("");
                setFilterStatus("all");
              }}
              aria-label="Reset filters"
            >
              Reset
            </button>
          )}
        </div>
        <div className="filter-results">
          Showing {filteredColleges.length} of {collegeCount} colleges
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div
        className="quick-actions-section animate-fade-in"
        role="region"
        aria-label="Quick actions"
      >
        <div className="quick-actions-header">
          <h3>
            <FaTachometerAlt
              className="quick-actions-icon"
              aria-hidden="true"
            />
            Quick Actions
          </h3>
          <p className="quick-actions-subtitle">
            Commonly used actions for quick access
          </p>
        </div>
        <div className="quick-actions-grid">
          <div
            className="quick-action-card"
            onClick={() => navigate("/super-admin/create-college")}
            role="button"
            tabIndex={0}
            aria-label="Add new college"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/super-admin/create-college");
              }
            }}
          >
            <div className="quick-action-icon add-college">
              <FaPlus />
            </div>
            <div className="quick-action-content">
              <div className="quick-action-title">Add New College</div>
              <div className="quick-action-description">
                Register a new institution
              </div>
            </div>
          </div>

          <div
            className="quick-action-card"
            onClick={() => navigate("/super-admin/colleges-list")}
            role="button"
            tabIndex={0}
            aria-label="View all colleges"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/super-admin/colleges-list");
              }
            }}
          >
            <div className="quick-action-icon view-colleges">
              <FaListOl />
            </div>
            <div className="quick-action-content">
              <div className="quick-action-title">View All Colleges</div>
              <div className="quick-action-description">
                Browse all institutions
              </div>
            </div>
          </div>

          <div
            className="quick-action-card"
            onClick={() => navigate("/super-admin/reports")}
            role="button"
            tabIndex={0}
            aria-label="View admission reports"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/super-admin/reports");
              }
            }}
          >
            <div className="quick-action-icon reports">
              <FaChartPie />
            </div>
            <div className="quick-action-content">
              <div className="quick-action-title">Admission Reports</div>
              <div className="quick-action-description">
                View analytics & reports
              </div>
            </div>
          </div>

          <div
            className="quick-action-card"
            onClick={() => navigate("/admin/security-audit")}
            role="button"
            tabIndex={0}
            aria-label="Security audit"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/admin/security-audit");
              }
            }}
          >
            <div className="quick-action-icon security">
              <FaDatabase />
            </div>
            <div className="quick-action-content">
              <div className="quick-action-title">Security Audit</div>
              <div className="quick-action-description">
                Monitor system activity
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div
        className="stats-grid animate-fade-in"
        role="region"
        aria-label="Dashboard statistics"
      >
        {/* TOTAL COLLEGES */}
        <div className="stat-card stat-card-colleges">
          <div className="stat-card-header">
            <div
              className="stat-icon-wrapper stat-icon-colleges"
              aria-hidden="true"
            >
              <FaUniversity className="stat-icon" />
            </div>
            <div className="stat-title">Total Colleges</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">
              {stats.totalColleges?.toLocaleString() || "0"}
            </div>
            <div className="stat-trend">
              <FaBuilding className="trend-icon" aria-hidden="true" />
              <span>Registered institutions</span>
            </div>
          </div>
        </div>

        {/* TOTAL STUDENTS */}
        <div className="stat-card stat-card-students">
          <div className="stat-card-header">
            <div
              className="stat-icon-wrapper stat-icon-students"
              aria-hidden="true"
            >
              <FaUsers className="stat-icon" />
            </div>
            <div className="stat-title">Total Students</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">
              {stats.totalStudents?.toLocaleString() || "0"}
            </div>
            <div className="stat-trend stat-trend-success">
              <FaGraduationCap className="trend-icon" aria-hidden="true" />
              <span>Across all colleges</span>
            </div>
          </div>
        </div>

        {/* TOTAL TEACHERS */}
        <div className="stat-card stat-card-teachers">
          <div className="stat-card-header">
            <div
              className="stat-icon-wrapper stat-icon-teachers"
              aria-hidden="true"
            >
              <FaUserGraduate className="stat-icon" />
            </div>
            <div className="stat-title">Total Teachers</div>
          </div>
          <div className="stat-card-body">
            <div className="stat-value">
              {stats.totalTeachers?.toLocaleString() || "0"}
            </div>
            <div className="stat-trend stat-trend-success">
              <FaUserGraduate className="trend-icon" aria-hidden="true" />
              <span>Faculty members</span>
            </div>
          </div>
        </div>
      </div>

      {/* COLLEGES SECTION */}
      <div
        className="erp-card animate-fade-in"
        role="region"
        aria-label="Registered colleges"
      >
        <div className="erp-card-header">
          <h3>
            <FaListOl className="erp-card-icon" aria-hidden="true" />
            Registered Colleges ({collegeCount})
          </h3>
          {showViewMore && (
            <button
              className="view-more-btn"
              onClick={() => navigate("/super-admin/colleges-list")}
              aria-label="View all colleges"
            >
              View All Colleges
              <FaChevronRight className="view-more-icon" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="erp-card-body">
          {filteredColleges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                <FaUniversity />
              </div>
              <h3>No Colleges Found</h3>
              <p className="empty-description">
                {searchTerm || filterStatus !== "all"
                  ? `No colleges match your search "${searchTerm}" and filter criteria. Try adjusting your filters.`
                  : "There are no colleges registered in the system yet. Click 'Add College' to register your first institution."}
              </p>
              {!searchTerm && filterStatus === "all" && (
                <button
                  className="erp-btn erp-btn-primary empty-action"
                  onClick={() => navigate("/super-admin/create-college")}
                >
                  <FaPlus className="erp-btn-icon" aria-hidden="true" />
                  Add First College
                </button>
              )}
              {(searchTerm || filterStatus !== "all") && (
                <button
                  className="erp-btn erp-btn-secondary empty-action"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                  }}
                >
                  <FaFilter className="erp-btn-icon" aria-hidden="true" />
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="row g-3 g-md-4">
              {collegesToDisplay.map((college, index) => (
                <div className="col-12 col-md-6 col-lg-4" key={college._id}>
                  <div
                    className="college-card card border-0 shadow-sm h-100"
                    onClick={() =>
                      navigate(`/super-admin/college/${college._id}`)
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${college.name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/super-admin/college/${college._id}`);
                      }
                    }}
                  >
                    <div className="college-card-header p-3">
                      <div className="college-badge">
                        <span>{index + 1}</span>
                      </div>
                      <div className="college-status">
                        <span
                          className={`status-badge status-${college.status?.toLowerCase() || "active"}`}
                        >
                          {college.status || "Active"}
                        </span>
                      </div>
                    </div>

                    <div className="college-card-body p-3">
                      <h4 className="college-name h6 mb-2 fw-bold">
                        {college.name || "Unnamed College"}
                      </h4>
                      <div className="college-meta d-flex flex-wrap gap-2">
                        <div className="meta-item d-flex align-items-center gap-1">
                          <FaMapMarkerAlt
                            className="text-muted"
                            aria-hidden="true"
                          />
                          <span className="small text-muted">
                            {college.location ||
                              college.city ||
                              college.address ||
                              "Location not available"}
                          </span>
                        </div>
                        <div className="meta-item d-flex align-items-center gap-1">
                          <FaCalendarAlt
                            className="text-muted"
                            aria-hidden="true"
                          />
                          <span className="small text-muted">
                            {college.establishedYear
                              ? `Since ${college.establishedYear}`
                              : college.registeredAt
                                ? `Since ${new Date(college.registeredAt).getFullYear()}`
                                : "Date unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="footer-note animate-fade-in" role="contentinfo">
        <div className="footer-note-content">
          <FaInfoCircle className="note-icon" aria-hidden="true" />
          <span>
            Super Admin Dashboard - Centralized management portal for
            educational institutions. Last refreshed:{" "}
            {lastRefresh.toLocaleString()}
          </span>
        </div>
        <button
          className="refresh-btn"
          onClick={fetchDashboardData}
          title="Refresh data (Ctrl+R)"
          aria-label="Refresh dashboard data"
        >
          <FaSyncAlt className="refresh-icon spin" aria-hidden="true" />
        </button>
      </div>

      {/* STYLES */}
      <style>{`
        /* ================= CSS VARIABLES - SIDEBAR THEME ================= */
        :root {
          /* Sidebar colors - exact match */
          --sidebar-primary: #0f3a4a;
          --sidebar-primary-dark: #0c2d3a;
          --sidebar-primary-light: #1a4a5a;
          --sidebar-accent: #3db5e6;
          --sidebar-accent-light: #4fc3f7;
          --sidebar-accent-bright: #7dd3fc;
          --sidebar-text: #e6f2f5;
          --sidebar-text-muted: rgba(255, 255, 255, 0.7);
          
          /* Gradients - exact sidebar match */
          --sidebar-gradient: linear-gradient(180deg, #0f3a4a 0%, #0c2d3a 100%);
          --accent-gradient: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          --card-gradient: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
          --card-hover-gradient: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.08) 100%);
          
          /* SaaS color palette */
          --bg-primary: #f5f7fa;
          --bg-secondary: #ffffff;
          --bg-tertiary: #eef2f6;
          
          --text-primary: #1a202c;
          --text-secondary: #4a5568;
          --text-muted: #718096;
          
          --border-light: #e2e8f0;
          --border-medium: #cbd5e0;
          
          --success: #10b981;
          --success-light: #d1fae5;
          --warning: #f59e0b;
          --warning-light: #fef3c7;
          --error: #ef4444;
          --error-light: #fee2e2;
          
          /* Shadows */
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
          --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.08);
          --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
          --shadow-colored: 0 4px 20px rgba(61, 181, 230, 0.15);
          --shadow-sidebar: 0 8px 32px rgba(15, 58, 74, 0.3);
          
          /* Spacing - 8px grid system */
          --spacing-xs: 0.5rem;
          --spacing-sm: 0.75rem;
          --spacing-md: 1rem;
          --spacing-lg: 1.5rem;
          --spacing-xl: 2rem;
          
          /* Border radius */
          --radius-sm: 0.5rem;
          --radius-md: 0.75rem;
          --radius-lg: 1rem;
          --radius-xl: 1.25rem;
          
          /* Transitions */
          --transition-fast: 0.15s ease;
          --transition-base: 0.25s ease;
          --transition-slow: 0.35s ease;
        }

        /* ================= BASE CONTAINER ================= */
        .erp-container {
          padding: var(--spacing-xl);
          background: var(--bg-primary);
          min-height: 100vh;
          animation: fadeIn 0.5s ease;
        }

        /* ================= PAGE HEADER ================= */
        .erp-page-header {
          background: var(--sidebar-gradient);
          padding: var(--spacing-xl);
          border-radius: var(--radius-xl);
          margin-bottom: var(--spacing-xl);
          box-shadow: var(--shadow-sidebar), 0 0 0 1px rgba(61, 181, 230, 0.2);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.5s ease;
          position: relative;
          overflow: hidden;
        }

        .erp-page-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.1) 0%, transparent 50%, rgba(61, 181, 230, 0.05) 100%);
          pointer-events: none;
        }

        .erp-header-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          position: relative;
          z-index: 1;
        }

        .erp-header-icon {
          width: 56px;
          height: 56px;
          background: rgba(61, 181, 230, 0.25);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .erp-page-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .erp-page-subtitle {
          margin: 0.25rem 0 0 0;
          opacity: 0.9;
          font-size: 0.95rem;
          font-weight: 400;
        }

        .erp-page-meta {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          opacity: 0.85;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .meta-icon {
          font-size: 0.9rem;
        }

        .keyboard-hint {
          margin-left: 0.5rem;
          padding: 0.125rem 0.5rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .erp-header-actions {
          display: flex;
          gap: 0.75rem;
          position: relative;
          z-index: 1;
        }

        .erp-btn {
          padding: 0.75rem 1.25rem;
          font-weight: 600;
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          border: none;
          font-size: 0.9rem;
        }

        .erp-btn-secondary {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .erp-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .erp-btn-primary {
          background: var(--accent-gradient);
          color: white;
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .erp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .erp-btn-icon {
          font-size: 1rem;
        }

        /* ================= INFO BANNER ================= */
        .info-banner {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.08) 0%, rgba(79, 195, 247, 0.12) 100%);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md) var(--spacing-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
          border-left: 4px solid var(--sidebar-accent);
          box-shadow: var(--shadow-sm);
        }

        .info-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(61, 181, 230, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sidebar-accent);
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .info-content strong {
          font-weight: 600;
          color: var(--text-primary);
        }

        /* ================= FILTER BAR ================= */
        .filter-bar {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md) var(--spacing-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          flex-wrap: wrap;
          border: 1px solid var(--border-light);
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: var(--spacing-md);
          color: var(--text-muted);
          font-size: 0.9rem;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 2.5rem;
          border: 2px solid var(--border-light);
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          transition: all var(--transition-base);
          background: var(--bg-tertiary);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--sidebar-accent);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        .search-clear {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }

        .search-clear:hover {
          background: var(--bg-tertiary);
          color: var(--error);
        }

        .rotate-45 {
          transform: rotate(45deg);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .filter-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .filter-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
          font-size: 0.875rem;
          pointer-events: none;
          z-index: 1;
        }

        .filter-select {
          padding: 0.625rem 2rem 0.625rem 2.25rem;
          border: 2px solid var(--border-light);
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-primary);
          background: var(--bg-secondary);
          cursor: pointer;
          transition: all var(--transition-base);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23718096' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--sidebar-accent);
          box-shadow: 0 0 0 4px rgba(61, 181, 230, 0.1);
        }

        .filter-reset {
          padding: 0.5rem 1rem;
          background: var(--bg-tertiary);
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .filter-reset:hover {
          background: var(--border-light);
        }

        .filter-results {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }

        /* ================= STATUS BADGE ================= */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .status-badge::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .status-active {
          background: var(--success-light);
          color: var(--success);
        }

        .status-inactive {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }

        .status-pending {
          background: var(--warning-light);
          color: var(--warning);
        }

        /* ================= STATS GRID ================= */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          width: 100%;
        }

        .stat-card {
          background: var(--card-gradient);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          overflow: hidden;
          transition: all var(--transition-base);
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.5s ease forwards;
          border: 1px solid var(--border-light);
          position: relative;
          height: 90%;
          width: 100%;
        }

        .stat-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent-gradient);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .stat-card-colleges::before {
          background: var(--sidebar-gradient);
        }

        .stat-card-students::before {
          background: var(--accent-gradient);
        }

        .stat-card-teachers::before {
          background: linear-gradient(180deg, #0c2d3a 0%, #09516d 100%);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
          border-color: var(--sidebar-accent);
        }

        .stat-card:hover::before {
          opacity: 1;
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.15s; }
        .stat-card:nth-child(3) { animation-delay: 0.2s; }

        .stat-card-header {
          padding: var(--spacing-md) var(--spacing-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          border-bottom: 1px solid var(--border-light);
          background: rgba(61, 181, 230, 0.03);
          flex-shrink: 0;
        }

        .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.25rem;
          transition: all var(--transition-base);
        }

        .stat-card:hover .stat-icon-wrapper {
          transform: scale(1.08);
        }

        .stat-icon-wrapper.stat-icon-colleges {
          background: var(--sidebar-gradient);
          box-shadow: 0 4px 12px rgba(15, 58, 74, 0.3);
        }

        .stat-icon-wrapper.stat-icon-students {
          background: var(--accent-gradient);
          box-shadow: 0 4px 12px rgba(19, 66, 84, 0.3);
        }

        .stat-icon-wrapper.stat-icon-teachers {
          background: linear-gradient(135deg, #0c2d3a 0%, #18495c 100%);
          box-shadow: 0 4px 12px rgba(12, 45, 58, 0.3);
        }

        .stat-icon {
          color: white;
          font-size: 1.25rem;
        }

        .stat-title {
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.9rem;
          flex: 1;
        }

        .stat-card-body {
          padding: var(--spacing-lg);
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: var(--spacing-sm);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--sidebar-primary);
          line-height: 1.2;
          letter-spacing: -1px;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .stat-trend-success {
          color: var(--success);
        }

        .trend-icon {
          font-size: 0.85rem;
        }

        /* ================= COLLEGES SECTION ================= */
        .erp-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          margin-bottom: var(--spacing-xl);
          overflow: hidden;
          animation: fadeIn 0.6s ease;
          border: 1px solid var(--border-light);
        }

        .erp-card-header {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.08) 100%);
          border-bottom: 1px solid rgba(61, 181, 230, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--sidebar-primary);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          letter-spacing: -0.3px;
        }

        .erp-card-icon {
          color: var(--sidebar-accent);
          font-size: 1.25rem;
        }

        .view-more-btn {
          background: var(--accent-gradient);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all var(--transition-base);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .view-more-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.4);
        }

        .view-more-icon {
          font-size: 0.9rem;
          transition: transform var(--transition-base);
        }

        .view-more-btn:hover .view-more-icon {
          transform: translateX(3px);
        }

        .erp-card-body {
          padding: var(--spacing-lg);
        }

        .college-card {
          background: var(--card-gradient);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          cursor: pointer;
          transition: all var(--transition-base);
          border: 1px solid var(--border-light);
          position: relative;
          overflow: hidden;
        }

        .college-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent-gradient);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .college-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-colored);
          border-color: var(--sidebar-accent);
        }

        .college-card:hover::before {
          opacity: 1;
        }

        .college-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
          padding-bottom: var(--spacing-sm);
          border-bottom: 1px solid var(--border-light);
        }

        .college-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-gradient);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .college-status {
          background: var(--success-light);
          color: var(--success);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .college-card-body {
          margin-bottom: var(--spacing-md);
        }

        .college-name {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--spacing-sm) 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          letter-spacing: -0.3px;
        }

        .college-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .meta-icon {
          color: var(--sidebar-accent);
          font-size: 0.9rem;
        }

        /* ================= QUICK ACTIONS SECTION ================= */
        .quick-actions-section {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-light);
          animation: fadeIn 0.5s ease;
        }

        .quick-actions-header {
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--border-light);
        }

        .quick-actions-header h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          letter-spacing: -0.3px;
        }

        .quick-actions-icon {
          color: var(--sidebar-accent);
          font-size: 1.25rem;
        }

        .quick-actions-subtitle {
          margin: 0.375rem 0 0 0;
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 400;
        }
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(61, 181, 230, 0.15);
        }

        .quick-actions-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--sidebar-primary);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .quick-actions-icon {
          color: var(--sidebar-accent);
          font-size: 1.25rem;
        }

        .quick-actions-subtitle {
          margin: 0.5rem 0 0 0;
          font-size: 0.9rem;
          color: #6c757d;
          font-weight: 400;
        }

        /* QUICK ACTIONS GRID */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.25rem;
        }

        .quick-action-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 14px;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid rgba(61, 181, 230, 0.15);
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }

        .quick-action-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background: var(--accent-gradient);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .quick-action-card:hover {
          transform: translateX(5px);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.25);
          border-color: var(--sidebar-accent);
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.08) 100%);
        }

        .quick-action-card:hover::before {
          opacity: 1;
        }

        .quick-action-card:focus {
          outline: 2px solid var(--sidebar-accent);
          outline-offset: 2px;
        }

        .quick-action-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .quick-action-card:hover .quick-action-icon {
          transform: scale(1.1);
        }

        .quick-action-icon.add-college {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.25) 100%);
          color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .quick-action-icon.view-colleges {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(79, 195, 247, 0.25) 100%);
          color: var(--sidebar-accent);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.2);
        }

        .quick-action-icon.reports {
          background: linear-gradient(135deg, rgba(12, 45, 58, 0.15) 0%, rgba(15, 58, 74, 0.25) 100%);
          color: var(--sidebar-primary);
          box-shadow: 0 4px 12px rgba(12, 45, 58, 0.2);
        }

        .quick-action-icon.security {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.25) 100%);
          color: #f59e0b;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }

        .quick-action-content {
          flex: 1;
          min-width: 0;
        }

        .quick-action-title {
          font-weight: 700;
          color: var(--sidebar-primary);
          font-size: 1rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quick-action-description {
          font-size: 0.85rem;
          color: #6c757d;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* QUICK ACTIONS - Sidebar themed (Old - Keep for fallback) */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .quick-action-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid rgba(61, 181, 230, 0.15);
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .quick-action-card:hover {
          transform: translateX(5px);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.25);
          border-color: var(--sidebar-accent);
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05) 0%, rgba(79, 195, 247, 0.08) 100%);
        }

        .quick-action-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          flex-shrink: 0;
        }

        .quick-action-icon.add-college { 
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.25) 100%);
          color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        .quick-action-icon.reports { 
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(79, 195, 247, 0.25) 100%);
          color: var(--sidebar-accent);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.2);
        }
        .quick-action-icon.settings { 
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.15) 0%, rgba(12, 45, 58, 0.25) 100%);
          color: var(--sidebar-primary);
          box-shadow: 0 4px 12px rgba(15, 58, 74, 0.2);
        }

        .quick-action-content {
          flex: 1;
        }

        .quick-action-title {
          font-weight: 700;
          color: var(--sidebar-primary);
          font-size: 1.05rem;
          margin-bottom: 0.25rem;
        }

        .quick-action-description {
          font-size: 0.9rem;
          color: #6c757d;
          line-height: 1.4;
        }

        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(79, 195, 247, 0.2) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sidebar-accent);
          font-size: 2.5rem;
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.2);
        }

        .empty-state h3 {
          font-size: 1.75rem;
          color: var(--sidebar-primary);
          margin-bottom: 0.75rem;
        }

        .empty-description {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          color: #6c757d;
        }

        .empty-action {
          background: var(--accent-gradient);
          border: none;
          padding: 0.875rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        /* FOOTER NOTE - Sidebar themed */
        .footer-note {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.1) 0%, rgba(79, 195, 247, 0.15) 100%);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1rem;
          border-left: 4px solid var(--sidebar-accent);
          font-size: 0.9rem;
          color: var(--sidebar-primary);
        }

        .footer-note-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .note-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
          color: var(--sidebar-accent);
        }

        .refresh-btn {
          background: rgba(61, 181, 230, 0.15);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sidebar-accent);
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .refresh-btn:hover {
          background: rgba(61, 181, 230, 0.25);
          transform: rotate(90deg);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.3);
        }

        .refresh-icon {
          font-size: 1.1rem;
        }

        /* SCREEN READER ONLY */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* ERROR CONTAINER */
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin: 2rem;
        }
        
        .erp-error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(244, 67, 54, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #F44336;
          font-size: 3rem;
        }
        
        .erp-error-container h3 {
          font-size: 1.8rem;
          color: #1a4b6d;
          margin-bottom: 1rem;
        }
        
        .erp-error-container p {
          color: #666;
          font-size: 1.1rem;
          max-width: 600px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        
        .error-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        /* ANIMATIONS */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes blink-pulse {
          0%, 100% { 
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.5);
          }
          50% { 
            opacity: 0.7;
            box-shadow: 0 0 15px 5px rgba(26, 75, 109, 0.7);
          }
        }
        
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
        }
        
        .blink {
          animation: blink 1.5s infinite;
        }
        
        .blink-pulse {
          animation: blink-pulse 2s ease-in-out infinite;
        }
        
        .pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 992px) {
          .erp-header-actions {
            flex-direction: column;
            width: 100%;
          }

          .erp-header-actions .erp-btn {
            width: 100%;
            justify-content: center;
          }

          .info-banner {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }

          .filter-group {
            width: 100%;
            justify-content: space-between;
          }

          .filter-wrapper {
            flex: 1;
          }

          .filter-select {
            width: 100%;
          }

          .filter-results {
            width: 100%;
            text-align: center;
          }

          .colleges-grid,
          .quick-actions-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          }

          .view-more-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .erp-container {
            padding: 1rem;
          }

          .erp-page-header {
            padding: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .erp-page-meta {
            flex-wrap: wrap;
          }

          .keyboard-hint {
            display: none;
          }

          .erp-header-actions {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.75rem;
          }

          .erp-header-actions .erp-btn {
            flex: 1;
            min-width: 120px;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .filter-bar {
            padding: 1rem;
          }

          .quick-actions-section {
            padding: 1.25rem;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1rem;
          }

          .quick-action-card {
            padding: 1rem;
          }

          .quick-action-icon {
            width: 48px;
            height: 48px;
            font-size: 1.25rem;
          }

          .filter-group {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-reset {
            width: 100%;
          }

          .footer-note {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .footer-note-content {
            flex-direction: column;
            align-items: center;
          }

          .refresh-btn {
            align-self: center;
          }

          .colleges-grid,
          .quick-actions-grid {
            grid-template-columns: 1fr;
          }

          .college-name {
            font-size: 1.1rem;
          }
        }

        @media (max-width: 480px) {
          .stat-value {
            font-size: 1.75rem;
          }

          .erp-card-header h3 {
            font-size: 1.25rem;
          }

          .erp-page-title {
            font-size: 1.5rem;
          }

          .college-card {
            padding: 1.25rem;
          }

          .college-name {
            font-size: 1rem;
          }

          .view-details-btn {
            font-size: 0.85rem;
            padding: 0.5rem;
          }

          .quick-action-card {
            flex-direction: column;
            text-align: center;
            padding: 1.25rem;
          }

          .quick-action-icon {
            width: 48px;
            height: 48px;
            font-size: 1.5rem;
          }

          .quick-action-title {
            font-size: 1rem;
          }

          .search-input {
            font-size: 0.9rem;
          }

          .filter-select {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
