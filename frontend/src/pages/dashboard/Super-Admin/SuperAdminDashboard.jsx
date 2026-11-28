import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
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
  FaArrowLeft,
  FaCheckCircle,
  FaSearch,
  FaFilter,
  FaClock,
  FaTimes,
  FaEnvelopeOpenText,
  FaInbox,
  FaBolt,
} from "react-icons/fa";

// Constants
const INITIAL_COLLEGES_DISPLAY = 3;

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

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  /* ================= FETCH DASHBOARD DATA ================= */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/dashboard/super-admin");
      setData(res.data || { stats: {}, colleges: [] });
      setLastRefresh(new Date());
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load dashboard data. Please check your connection.";

      logger.error("Dashboard fetch error:", statusCode, errorCode);

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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    fetchDashboardData();
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
  }, [navigate, fetchDashboardData]);

  /* ================= CALCULATED METRICS ================= */
  const stats = useMemo(
    () =>
      data?.stats || {
        totalColleges: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalInquiries: 0,
        newInquiries: 0,
        collegeGrowth: 0,
        studentGrowth: 0,
        teacherGrowth: 0,
      },
    [data],
  );

  const colleges = useMemo(() => data?.colleges || [], [data]);
  const recentInquiries = useMemo(() => data?.recentInquiries || [], [data]);
  const collegeCount = colleges.length;

  // Filtered colleges
  const filteredColleges = useMemo(() => {
    return colleges.filter((college) => {
      const matchesSearch = college.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [colleges, searchTerm]);

  const collegesToDisplay = useMemo(
    () => filteredColleges.slice(0, INITIAL_COLLEGES_DISPLAY),
    [filteredColleges],
  );
  const showViewMore = filteredColleges.length > INITIAL_COLLEGES_DISPLAY;

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <ApiError
        title="Dashboard Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading || !data) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading
            size="md"
            color="primary"
            text="Loading Super Admin Dashboard..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="erp-page erp-viewport-min-100 sa-dash" style={{ background: "linear-gradient(180deg, #f0f4f8 0%, #e8eef5 100%)" }}>
      {/* HEADER */}
      <div className="erp-page-header">
        {/* Top row: left = icon + title block, right = action buttons */}
        <div className="erp-header-content">
          <div className="erp-header-left">
            <div className="erp-header-icon" aria-hidden="true">
              <FaUniversity />
            </div>
            <div className="erp-header-text">
              <h1 className="erp-page-title">Super Admin Dashboard</h1>
              <p className="erp-page-subtitle">
                Centralized management portal for all registered colleges
              </p>
              <div className="erp-page-meta">
                <FaClock className="meta-icon" aria-hidden="true" />
                <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="erp-header-actions">
            <button
              className="erp-btn erp-btn-secondary"
              onClick={fetchDashboardData}
              title="Refresh dashboard data (Ctrl+R)"
              aria-label="Refresh dashboard"
            >
              <FaSyncAlt className="erp-btn-icon" aria-hidden="true" />
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

        {/* Subtle horizontal divider */}
        <div className="erp-header-divider" aria-hidden="true" />

        {/* Bottom row: quick access text + System Owner badge */}
        <div className="erp-header-bottom">
          <div className="erp-header-quick-access">
            <FaBolt className="quick-access-icon" aria-hidden="true" />
            <span>Quick access to system management</span>
          </div>
          <span className="erp-system-badge">System Owner</span>
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
          <strong>System Overview: </strong> This dashboard provides a
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
        className="kpi-section stats-grid animate-fade-in"
        role="region"
        aria-label="Dashboard statistics"
      >
        {/* TOTAL COLLEGES */}
        <div
          className="stat-card stat-card-colleges"
          onClick={() => navigate("/super-admin/colleges-list")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/super-admin/colleges-list");
            }
          }}
          aria-label="View all colleges"
        >
          <div className="stat-card-inner">
            <div className="stat-icon-row">
              <div
                className="stat-icon-wrapper stat-icon-colleges"
                aria-hidden="true"
              >
                <FaUniversity className="stat-icon" />
              </div>
              <FaChevronRight className="stat-arrow" aria-hidden="true" />
            </div>
            <div className="stat-value">
              {stats.totalColleges?.toLocaleString() || "0"}
            </div>
            <div className="stat-label">Total Colleges</div>
            <div className="stat-description">Registered institutions</div>
          </div>
        </div>

        {/* TOTAL STUDENTS */}
        <div
          className="stat-card stat-card-students"
          onClick={() => navigate("/super-admin/reports")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/super-admin/reports");
            }
          }}
          aria-label="View student reports"
        >
          <div className="stat-card-inner">
            <div className="stat-icon-row">
              <div
                className="stat-icon-wrapper stat-icon-students"
                aria-hidden="true"
              >
                <FaUsers className="stat-icon" />
              </div>
              <FaChevronRight className="stat-arrow" aria-hidden="true" />
            </div>
            <div className="stat-value">
              {stats.totalStudents?.toLocaleString() || "0"}
            </div>
            <div className="stat-label">Total Students</div>
            <div className="stat-description">Across all colleges</div>
          </div>
        </div>

        {/* TOTAL TEACHERS */}
        <div
          className="stat-card stat-card-teachers"
          onClick={() => navigate("/super-admin/colleges-list")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/super-admin/colleges-list");
            }
          }}
          aria-label="View colleges to manage teachers"
        >
          <div className="stat-card-inner">
            <div className="stat-icon-row">
              <div
                className="stat-icon-wrapper stat-icon-teachers"
                aria-hidden="true"
              >
                <FaUserGraduate className="stat-icon" />
              </div>
              <FaChevronRight className="stat-arrow" aria-hidden="true" />
            </div>
            <div className="stat-value">
              {stats.totalTeachers?.toLocaleString() || "0"}
            </div>
            <div className="stat-label">Total Teachers</div>
            <div className="stat-description">Faculty members</div>
          </div>
        </div>

        {/* COLLEGE ENQUIRIES */}
        <div
          className="stat-card stat-card-inquiries"
          onClick={() => navigate("/super-admin/enquiries")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/super-admin/enquiries");
            }
          }}
          aria-label="View all enquiries"
        >
          <div className="stat-card-inner">
            <div className="stat-icon-row">
              <div
                className="stat-icon-wrapper stat-icon-inquiries"
                aria-hidden="true"
              >
                <FaEnvelopeOpenText className="stat-icon" />
              </div>
              <FaChevronRight className="stat-arrow" aria-hidden="true" />
            </div>
            <div className="stat-value">
              {stats.totalInquiries?.toLocaleString() || "0"}
            </div>
            <div className="stat-label">College Enquiries</div>
            <div className="stat-description">
              {stats.newInquiries > 0 ? (
                <span className="stat-badge-new">{stats.newInquiries} New</span>
              ) : (
                "Landing Page Enquiries"
              )}
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
                {searchTerm
                  ? `No colleges match your search "${searchTerm}". Try adjusting your search.`
                  : "There are no colleges registered in the system yet. Click 'Add College' to register your first institution."}
              </p>
              {!searchTerm && (
                <button
                  className="erp-btn erp-btn-primary empty-action"
                  onClick={() => navigate("/super-admin/create-college")}
                >
                  <FaPlus className="erp-btn-icon" aria-hidden="true" />
                  Add First College
                </button>
              )}
            </div>
          ) : (
            <div className="colleges-grid">
              {collegesToDisplay.map((college, index) => (
                <div
                  className="college-card-vertical"
                  key={college._id}
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
                  <div className="college-card-header">
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
                  <div className="college-card-body">
                    <h4 className="college-name">
                      {college.name || "Unnamed College"}
                    </h4>
                    <div className="college-divider" />
                    <div className="college-meta">
                      <div className="meta-item">
                        <FaMapMarkerAlt className="meta-icon" aria-hidden="true" />
                        <span>
                          {college.address || "Location not available"}
                        </span>
                      </div>
                      <div className="meta-item">
                        <FaCalendarAlt className="meta-icon" aria-hidden="true" />
                        <span>
                          {college.establishedYear
                            ? `Since ${college.establishedYear}`
                            : college.createdAt
                            ? `Since ${new Date(college.createdAt).getFullYear()}`
                            : "Date unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT ENQUIRIES SECTION */}
      <div
        className="erp-card animate-fade-in mb-4"
        role="region"
        aria-label="Recent college enquiries"
      >
        <div className="erp-card-header d-flex justify-content-between align-items-center">
          <h3 className="mb-0">
            <FaEnvelopeOpenText className="erp-card-icon me-2" aria-hidden="true" />
            Recent Enquiries ({recentInquiries.length})
          </h3>
          <button
            className="view-more-btn"
            onClick={() => navigate("/super-admin/enquiries")}
            aria-label="View all enquiries"
          >
            View All Enquiries
            <FaChevronRight className="view-more-icon" aria-hidden="true" />
          </button>
        </div>

        <div className="erp-card-body p-0" style={{ overflowX: "auto" }}>
          {recentInquiries.length === 0 ? (
            <div className="empty-state py-4 text-center">
              <div className="empty-icon text-muted mb-2" aria-hidden="true">
                <FaInbox size={32} />
              </div>
              <p className="text-muted mb-0">No enquiries received yet.</p>
            </div>
          ) : (
            <table className="table table-hover align-middle mb-0" style={{ minWidth: "650px" }}>
              <thead className="table-light">
                <tr>
                  <th style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Ref No.</th>
                  <th style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Institution</th>
                  <th style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Contact Person</th>
                  <th style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Role</th>
                  <th style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Status</th>
                  <th style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInquiries.map((inq) => (
                  <tr
                    key={inq._id || inq.inquiryNumber}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/super-admin/enquiry/${inq._id}`)}
                    title="Click to view enquiry details"
                  >
                    <td>
                      <span className="badge bg-light text-dark font-monospace border" style={{ fontSize: "0.8rem" }}>
                        {inq.inquiryNumber}
                      </span>
                    </td>
                    <td className="fw-semibold">{inq.institutionName}</td>
                    <td>
                      <div>{inq.firstName} {inq.lastName}</div>
                      <div className="text-muted small">{inq.email}</div>
                    </td>
                    <td>
                      <span className="badge bg-secondary text-capitalize" style={{ fontSize: "0.75rem" }}>
                        {inq.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          inq.status === "NEW"
                            ? "bg-warning text-dark"
                            : inq.status === "CONTACTED"
                            ? "bg-info text-dark"
                            : "bg-success"
                        }`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {inq.status}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {new Date(inq.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          --sidebar-accent: #20a0d3;
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

        /* Page spacing: matches College Admin dashboard (desktop only) */
        @media (min-width: 992px) {
          .erp-page.sa-dash {
            padding-top: 24px;
            padding-left: 24px;
            padding-right: 24px;
            padding-bottom: 15px;
          }
        }

        /* ================= PAGE HEADER ================= */
        .erp-page-header {
          background: #0E3746;
          padding: 24px 28px;
          border-radius: 15px;
          margin-bottom: 1.25rem;
          box-shadow: 0 8px 24px -4px rgba(14, 55, 70, 0.4), 0 2px 6px -1px rgba(14, 55, 70, 0.2);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
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
          background: radial-gradient(circle at 10% 20%, rgba(34, 184, 230, 0.12) 0%, transparent 60%),
                      linear-gradient(135deg, rgba(34, 184, 230, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Top row: left = icon + title block, right = action buttons */
        .erp-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 1;
          width: 100%;
          min-width: 0;
          flex-wrap: wrap;
        }

        .erp-header-left {
          display: flex;
          align-items: center;
          gap: 20px;
          min-width: 0;
          flex: 1;
        }

        .erp-header-icon {
          width: 52px;
          height: 52px;
          min-width: 52px;
          min-height: 52px;
          background: rgba(34, 184, 230, 0.15);
          border: 1px solid rgba(34, 184, 230, 0.35);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #22B8E6;
          box-shadow: 0 4px 14px rgba(34, 184, 230, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          flex-shrink: 0;
        }

        .erp-header-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .erp-page-title {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.2;
          color: #ffffff;
        }

        .erp-page-subtitle {
          margin: 3px 0 0 0;
          color: rgba(230, 242, 245, 0.88);
          font-size: 15px;
          font-weight: 400;
          line-height: 1.3;
        }

        .erp-page-meta {
          margin-top: 6px;
          font-size: 13px;
          color: rgba(230, 242, 245, 0.78);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          line-height: 1.2;
        }

        .meta-icon {
          font-size: 13px;
          color: #22B8E6;
          flex-shrink: 0;
        }

        /* Subtle Horizontal Divider */
        .erp-header-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, rgba(34, 184, 230, 0.25) 0%, rgba(34, 184, 230, 0.08) 70%, transparent 100%);
          margin: 4px 0;
          position: relative;
          z-index: 1;
        }

        /* Bottom Row: quick access text + System Owner badge */
        .erp-header-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          position: relative;
          z-index: 1;
          gap: 16px;
        }

        .erp-header-quick-access {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(230, 242, 245, 0.85);
          font-size: 13.5px;
          font-weight: 500;
        }

        .quick-access-icon {
          color: #22B8E6;
          font-size: 16px;
          flex-shrink: 0;
        }

        .erp-system-badge {
          background: transparent;
          color: rgba(230, 242, 245, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .erp-header-actions {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .erp-btn {
          height: 44px;
          padding: 0 18px;
          font-weight: 600;
          border-radius: 9px;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          border: 1px solid transparent;
          font-size: 15px;
          line-height: 1;
          white-space: nowrap;
          box-sizing: border-box;
        }

        .erp-btn-secondary {
          background: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: none;
        }

        .erp-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(34, 184, 230, 0.6);
          color: #ffffff;
          transform: none;
          box-shadow: 0 2px 8px rgba(14, 55, 70, 0.2);
        }

        .erp-btn-secondary:hover .erp-btn-icon {
          transform: rotate(180deg);
        }

        .erp-btn-primary {
          background: #FFFFFF;
          color: #0E3746;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
        }

        .erp-btn-primary:hover {
          background: #f1f6fa;
          color: #0E3746;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        .erp-btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }

        .erp-btn-primary:focus-visible {
          outline: 2px solid #7cc4ee;
          outline-offset: 2px;
        }

        .erp-btn-primary .erp-btn-icon {
          color: #0E3746;
        }

        .erp-btn-icon {
          font-size: 15px;
          transition: transform 0.4s ease;
        }

        /* Responsive: stack buttons below title on narrow screens */
        @media (max-width: 767px) {
          .erp-header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .erp-header-left {
            justify-content: center;
            text-align: center;
          }

          .erp-header-actions {
            justify-content: center;
            width: 100%;
          }

          .erp-header-bottom {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
          }

          .erp-header-quick-access {
            justify-content: center;
          }
        }

        /* ================= INFO BANNER ================= */
        .info-banner {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.07) 0%, rgba(79, 195, 247, 0.1) 100%);
          border-radius: var(--radius-lg);
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.875rem;
          margin-bottom: 1.1rem;
          border-left: 4px solid var(--sidebar-accent);
          box-shadow: var(--shadow-sm);
        }

        .info-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(61, 181, 230, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sidebar-accent);
          flex-shrink: 0;
          font-size: 1rem;
        }

        .info-content {
          flex: 1;
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.45;
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
          margin-bottom: 15px;
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

        /* ================= KPI STATISTICS SECTION ================= */
        .kpi-section.stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
          margin-bottom: 1.1rem;
          width: 100%;
          overflow: visible;
        }

        .kpi-section .stat-card {
          background: #FFFFFF;
          border-radius: 14px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #DCE6EF;
          animation: fadeIn 0.5s ease forwards;
          position: relative;
          width: 100%;
          min-height: 140px;
          padding: 1rem 1.25rem;
          transition: border-color 150ms ease, background-color 150ms ease;
          cursor: pointer;
        }

        .kpi-section .stat-card:focus-visible {
          outline: 2px solid #19A9DC;
          outline-offset: 2px;
        }

        .kpi-section .stat-card.stat-card-colleges:focus-visible {
          outline-color: #19A9DC;
        }
        .kpi-section .stat-card.stat-card-students:focus-visible {
          outline-color: #8964E8;
        }
        .kpi-section .stat-card.stat-card-teachers:focus-visible {
          outline-color: #16A879;
        }
        .kpi-section .stat-card.stat-card-inquiries:focus-visible {
          outline-color: #2563EB;
        }

        .kpi-section .stat-card.stat-card-colleges:hover {
          border-color: #19A9DC;
          background-color: rgba(25, 169, 220, 0.02);
        }
        .kpi-section .stat-card.stat-card-students:hover {
          border-color: #8964E8;
          background-color: rgba(137, 100, 232, 0.02);
        }
        .kpi-section .stat-card.stat-card-teachers:hover {
          border-color: #16A879;
          background-color: rgba(22, 168, 121, 0.02);
        }
        .kpi-section .stat-card.stat-card-inquiries:hover {
          border-color: #2563EB;
          background-color: rgba(37, 99, 235, 0.02);
        }

        .kpi-section .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .kpi-section .stat-card:nth-child(2) { animation-delay: 0.15s; }
        .kpi-section .stat-card:nth-child(3) { animation-delay: 0.2s; }
        .kpi-section .stat-card:nth-child(4) { animation-delay: 0.25s; }

        .kpi-section .stat-card-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-between;
        }

        .kpi-section .stat-icon-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .kpi-section .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1rem;
        }

        .kpi-section .stat-icon-wrapper.stat-icon-colleges {
          background: rgba(25, 169, 220, 0.12);
          color: #19A9DC;
        }

        .kpi-section .stat-icon-wrapper.stat-icon-students {
          background: rgba(137, 100, 232, 0.12);
          color: #8964E8;
        }

        .kpi-section .stat-icon-wrapper.stat-icon-teachers {
          background: rgba(22, 168, 121, 0.12);
          color: #16A879;
        }

        .kpi-section .stat-icon-wrapper.stat-icon-inquiries {
          background: rgba(37, 99, 235, 0.12);
          color: #2563EB;
        }

        .kpi-section .stat-icon {
          font-size: 1.1rem;
        }

        .kpi-section .stat-arrow {
          font-size: 0.85rem;
          color: #A0ADBA;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .kpi-section .stat-value {
          font-size: 30px;
          font-weight: 700;
          color: #0E3746;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }

        .kpi-section .stat-label {
          font-size: 13px;
          font-weight: 500;
          color: #4A5A6A;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          line-height: 1.3;
          margin-bottom: 0.375rem;
        }

        .kpi-section .stat-description {
          font-size: 13px;
          font-weight: 400;
          color: #8493A5;
          line-height: 1.4;
        }

        .kpi-section .stat-badge-new {
          display: inline-block;
          background: #EFF6FF;
          color: #2563EB;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 10px;
          line-height: 1;
        }

        /* Tablet: 2 columns */
        @media (max-width: 991.98px) {
          .kpi-section.stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.875rem;
          }

          .kpi-section .stat-card {
            min-height: 135px;
            padding: 0.875rem 1rem;
          }

          .kpi-section .stat-icon-row {
            margin-bottom: 0.625rem;
          }

          .kpi-section .stat-icon-wrapper {
            width: 38px;
            height: 38px;
            font-size: 0.95rem;
          }

          .kpi-section .stat-icon {
            font-size: 1.05rem;
          }

          .kpi-section .stat-arrow {
            font-size: 0.8rem;
          }

          .kpi-section .stat-value {
            font-size: 28px;
          }

          .kpi-section .stat-label {
            font-size: 12px;
          }

          .kpi-section .stat-description {
            font-size: 12px;
          }

          .kpi-section .stat-badge-new {
            font-size: 10px;
            padding: 2px 7px;
          }
        }

        /* Mobile: 1 column */
        @media (max-width: 767.98px) {
          .kpi-section.stats-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .kpi-section .stat-card {
            min-height: 130px;
            padding: 0.875rem 1rem;
          }

          .kpi-section .stat-icon-row {
            margin-bottom: 0.5rem;
          }

          .kpi-section .stat-icon-wrapper {
            width: 36px;
            height: 36px;
            font-size: 0.9rem;
          }

          .kpi-section .stat-icon {
            font-size: 1rem;
          }

          .kpi-section .stat-arrow {
            font-size: 0.75rem;
          }

          .kpi-section .stat-value {
            font-size: 28px;
          }

          .kpi-section .stat-label {
            font-size: 12px;
          }

          .kpi-section .stat-description {
            font-size: 12px;
          }

          .kpi-section .stat-badge-new {
            font-size: 10px;
            padding: 2px 7px;
          }
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
          gap: var(--spacing-sm);
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

        .college-card-body {
          margin-bottom: 0;
          flex: 1;
        }

        .college-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          letter-spacing: -0.2px;
        }

        .college-meta {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .meta-item .meta-icon {
          color: var(--sidebar-accent);
          font-size: 0.8rem;
        }

        /* Registered Colleges Grid */
        .colleges-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .college-card-vertical {
          background: #ffffff;
          border: 1px solid #DCE6EF;
          border-radius: 12px;
          padding: 1.125rem;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
          height: 100%;
        }

        .college-card-vertical:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
          border-color: var(--sidebar-accent);
        }

        .college-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.875rem;
        }

        .college-badge {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: var(--accent-gradient);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .college-status {
          background: var(--success-light);
          color: var(--success);
          padding: 0.1875rem 0.625rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.7rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .college-card-body {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .college-name {
          margin: 0 0 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.35;
          word-wrap: break-word;
        }

        .college-divider {
          height: 1px;
          background: var(--border-light);
          margin: 0.375rem 0;
        }

        .college-meta {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          margin-top: auto;
        }

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .meta-icon {
          font-size: 0.8rem;
          color: var(--sidebar-accent);
          flex-shrink: 0;
          width: 1rem;
          text-align: center;
        }

        /* Tablet: 2 columns */
        @media (max-width: 991.98px) {
          .colleges-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.875rem;
          }

          .college-card-vertical {
            padding: 1rem;
          }

          .college-badge {
            width: 24px;
            height: 24px;
            font-size: 0.7rem;
          }

          .college-status {
            padding: 0.15rem 0.5rem;
            font-size: 0.68rem;
          }

          .college-name {
            font-size: 0.9rem;
          }

          .meta-item {
            font-size: 0.75rem;
          }
        }

        /* Mobile: 1 column */
        @media (max-width: 767.98px) {
          .colleges-grid {
            grid-template-columns: 1fr;
            gap: 0.875rem;
          }

          .college-card-vertical {
            padding: 1rem;
          }

          .college-card-header {
            margin-bottom: 0.75rem;
          }

          .college-badge {
            width: 22px;
            height: 22px;
            font-size: 0.68rem;
          }

          .college-status {
            padding: 0.125rem 0.45rem;
            font-size: 0.65rem;
          }

          .college-name {
            font-size: 0.875rem;
          }

          .college-divider {
            margin: 0.3rem 0;
          }

          .meta-item {
            font-size: 0.72rem;
          }
        }

        /* ================= QUICK ACTIONS SECTION ================= */
        .quick-actions-section {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: 0.625rem 1rem 0.5rem;
          margin-bottom: 0.875rem;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border-light);
          animation: fadeIn 0.5s ease;
        }

        .quick-actions-header {
          margin-bottom: 0.5rem;
          padding-bottom: 0.375rem;
          border-bottom: 1px solid var(--border-light);
        }

        .quick-actions-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--sidebar-primary);
          display: flex;
          align-items: center;
          gap: 0.625rem;
          letter-spacing: -0.3px;
        }

        .quick-actions-icon {
          color: var(--sidebar-accent);
          font-size: 1.125rem;
        }

        .quick-actions-subtitle {
          margin: 0.25rem 0 0 0;
          font-size: 0.825rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        /* QUICK ACTIONS GRID - Desktop: single row, 4 equal cards */
        .quick-actions-grid {
          display: flex;
          gap: 14px;
        }

        .quick-action-card {
          flex: 1;
          background: #FFFFFF;
          border-radius: 12px;
          padding: 14px 16px;
          cursor: pointer;
          transition: border-color 150ms ease, background-color 150ms ease;
          border: 1px solid #DCE6EF;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          min-height: 110px;
          max-height: 120px;
        }

        .quick-action-card:focus-visible {
          outline: 2px solid var(--sidebar-accent);
          outline-offset: 2px;
        }

        .quick-action-card:hover {
          border-color: inherit;
        }

        .quick-action-card.add-college:hover {
          border-color: #10b981;
          background-color: rgba(16, 185, 129, 0.02);
        }
        .quick-action-card.view-colleges:hover {
          border-color: var(--sidebar-accent);
          background-color: rgba(61, 181, 230, 0.02);
        }
        .quick-action-card.reports:hover {
          border-color: #8b5cf6;
          background-color: rgba(139, 92, 246, 0.02);
        }
        .quick-action-card.security:hover {
          border-color: #f97316;
          background-color: rgba(249, 115, 22, 0.02);
        }

        .quick-action-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .quick-action-icon.add-college {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .quick-action-icon.view-colleges {
          background: rgba(61, 181, 230, 0.12);
          color: var(--sidebar-accent);
        }

        .quick-action-icon.reports {
          background: rgba(139, 92, 246, 0.12);
          color: #8b5cf6;
        }

        .quick-action-icon.security {
          background: rgba(249, 115, 22, 0.12);
          color: #f97316;
        }

        .quick-action-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .quick-action-title {
          font-weight: 600;
          color: var(--sidebar-primary);
          font-size: 0.9rem;
          line-height: 1.25;
        }

        .quick-action-description {
          font-size: 0.78rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: var(--spacing-xl) var(--spacing-lg);
          color: var(--text-muted);
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto var(--spacing-xl);
          background: var(--card-hover-gradient);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sidebar-accent);
          font-size: 2.5rem;
          box-shadow: var(--shadow-md);
        }

        .empty-state h3 {
          font-size: 1.75rem;
          color: var(--sidebar-primary);
          margin-bottom: var(--spacing-md);
        }

        .empty-description {
          font-size: 1.1rem;
          margin-bottom: var(--spacing-xl);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          color: var(--text-secondary);
        }

        .empty-action {
          background: var(--accent-gradient);
          border: none;
          padding: 0.875rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-colored);
        }

        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.5);
        }

        /* FOOTER NOTE */
        .footer-note {
          background: var(--card-hover-gradient);
          border-radius: var(--radius-md);
          padding: 0.65rem 1.1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          margin-top: var(--spacing-md);
          border-left: 4px solid var(--sidebar-accent);
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        .footer-note-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          line-height: 1.4;
        }

        .note-icon {
          font-size: 1rem;
          flex-shrink: 0;
          color: var(--sidebar-accent);
        }

        .refresh-btn {
          background: rgba(61, 181, 230, 0.15);
          border: none;
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sidebar-accent);
          cursor: pointer;
          transition: all var(--transition-base);
          flex-shrink: 0;
        }

        .refresh-btn:hover {
          background: rgba(61, 181, 230, 0.25);
          transform: rotate(90deg);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.3);
        }

        .refresh-icon {
          font-size: 0.9rem;
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
          padding: var(--spacing-xl);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          margin: var(--spacing-xl);
        }

        .erp-error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--spacing-xl);
          color: var(--error);
          font-size: 3rem;
        }

        .erp-error-container h3 {
          font-size: 1.8rem;
          color: var(--sidebar-primary);
          margin-bottom: var(--spacing-md);
        }

        .erp-error-container p {
          color: var(--text-secondary);
          font-size: 1.1rem;
          max-width: 600px;
          margin-bottom: var(--spacing-xl);
          line-height: 1.6;
        }

        .error-actions {
          display: flex;
          gap: var(--spacing-md);
          margin-top: var(--spacing-md);
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
        
        /* =========================================================
          SUPER ADMIN DASHBOARD
          MOBILE + TABLET RESPONSIVE
          DESKTOP REMAINS UNCHANGED
          ========================================================= */

        /* ================= TABLET ================= */
        @media (min-width: 768px) and (max-width: 991.98px) {

          .erp-page {
            padding: 1rem !important;
          }

          /* Breadcrumb */
          .erp-page > :first-child {
            margin-bottom: 1rem;
          }

          /* Header */
          .erp-page-header {
            padding: 20px 24px !important;
            margin-bottom: 1.15rem !important;
            border-radius: 12px !important;
            min-height: auto !important;
          }

          .erp-header-top,
          .erp-header-content {
            gap: 16px !important;
          }

          .erp-header-icon {
            width: 50px !important;
            height: 50px !important;
            min-width: 50px !important;
            min-height: 50px !important;
            font-size: 22px !important;
            border-radius: 10px !important;
            flex-shrink: 0;
          }

          .erp-page-title {
            font-size: 24px !important;
            line-height: 1.2 !important;
          }

          .erp-page-subtitle {
            font-size: 15px !important;
            line-height: 1.35 !important;
          }

          .erp-page-meta {
            font-size: 13px !important;
            gap: 6px !important;
          }

          .erp-header-divider {
            margin: 8px 0 !important;
          }

          .erp-header-bottom {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: center !important;
          }

          .erp-header-shortcut {
            font-size: 13px !important;
          }

          .erp-header-actions {
            display: inline-flex !important;
            gap: 10px !important;
          }

          .erp-header-actions .erp-btn {
            height: 42px !important;
            min-height: 42px !important;
            padding: 0 16px !important;
            font-size: 14px !important;
          }


          /* Info banner */
          .info-banner {
            padding: 0.75rem 1rem !important;
            margin-bottom: 1rem !important;
          }

          .info-content {
            font-size: 0.85rem !important;
            line-height: 1.5 !important;
          }


          /* Search / filter */
          .filter-bar {
            padding: 1rem !important;
            gap: 0.75rem !important;
            margin-bottom: 1.25rem !important;
          }

          .search-box {
            min-width: 0 !important;
            width: 100%;
          }

          .filter-results {
            width: 100%;
            text-align: center;
          }


          /* Stats */
          .stats-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.65rem !important;
          }

          .stat-card-header {
            padding: 0.8rem !important;
          }

          .stat-icon-wrapper {
            width: 36px !important;
            height: 36px !important;
            font-size: 1rem !important;
          }

          .stat-title {
            font-size: 0.72rem !important;
          }

          .stat-card-body {
            padding: 0 0.8rem !important;
          }

          .stat-value {
            font-size: 1.45rem !important;
          }

          .stat-card-footer {
            padding: 0.5rem 0.8rem !important;
          }

          .stat-trend {
            font-size: 0.68rem !important;
          }


          /* Quick actions */
          .quick-actions-section {
            padding: 0.625rem 0.875rem 0.5rem !important;
            margin-bottom: 0.875rem !important;
          }

          .quick-actions-header {
            margin-bottom: 0.5rem !important;
            padding-bottom: 0.375rem !important;
          }

          .quick-actions-header h3 {
            font-size: 1rem !important;
            gap: 0.5rem !important;
          }

          .quick-actions-icon {
            font-size: 1rem !important;
          }

          .quick-actions-subtitle {
            margin-top: 0.25rem !important;
            font-size: 0.75rem !important;
          }

          .quick-actions-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }

          .quick-action-card {
            padding: 12px 14px !important;
            min-height: 105px !important;
            max-height: 115px !important;
            gap: 10px !important;
          }

          .quick-action-icon {
            width: 36px !important;
            height: 36px !important;
            font-size: 1.1rem !important;
          }

          .quick-action-title {
            font-size: 0.85rem !important;
          }

          .quick-action-description {
            font-size: 0.72rem !important;
          }


          /* Registered colleges */
          .erp-card {
            margin-bottom: 1.25rem !important;
          }

          .erp-card-header {
            padding: 1rem 1.25rem !important;
          }

          .erp-card-header h3 {
            font-size: 1.05rem !important;
          }

          .erp-card-body {
            padding: 1rem !important;
          }

          .college-name {
            font-size: 1rem !important;
          }

          .meta-item {
            font-size: 0.78rem !important;
          }


          /* Footer */
          .footer-note {
            padding: 0.85rem 1rem !important;
            font-size: 0.78rem !important;
          }
        }


        /* ================= MOBILE ================= */
        @media (max-width: 767.98px) {

          .erp-page {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0.65rem !important;
            overflow-x: hidden !important;
          }


          /* Breadcrumb */
          .erp-page > :first-child {
            margin-bottom: 0.75rem;
          }


          /* ================= HEADER ================= */

          .erp-page-header {
            padding: 16px 18px !important;
            margin-bottom: 1rem !important;
            border-radius: 12px !important;
            min-height: auto !important;
          }

          .erp-header-top,
          .erp-header-content {
            width: 100% !important;
            display: flex !important;
            align-items: flex-start !important;
            gap: 14px !important;
          }

          .erp-header-icon {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            min-height: 44px !important;
            font-size: 20px !important;
            border-radius: 10px !important;
            flex-shrink: 0;
          }

          .erp-header-text {
            min-width: 0 !important;
            flex: 1;
          }

          .erp-page-title {
            font-size: 20px !important;
            line-height: 1.2 !important;
            letter-spacing: -0.2px !important;
          }

          .erp-page-subtitle {
            font-size: 14px !important;
            line-height: 1.35 !important;
            margin-top: 2px !important;
          }

          .erp-page-meta {
            margin-top: 5px !important;
            font-size: 12.5px !important;
            line-height: 1.3 !important;
            gap: 5px !important;
          }

          .erp-header-divider {
            margin: 10px 0 !important;
          }

          .erp-header-bottom {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .erp-header-shortcut {
            font-size: 12.5px !important;
            justify-content: flex-start !important;
          }

          /* Header buttons */
          .erp-header-actions {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }

          .erp-header-actions .erp-btn {
            width: 100% !important;
            height: 42px !important;
            min-height: 42px !important;
            padding: 0 12px !important;
            justify-content: center !important;
            font-size: 14px !important;
            gap: 6px !important;
          }

          .erp-btn-icon {
            font-size: 14px !important;
          }


          /* ================= INFO BANNER ================= */
          .info-banner {
            padding: 0.9rem !important;
            margin-bottom: 1rem !important;
            gap: 0.7rem !important;
            align-items: flex-start !important;
          }

          .info-icon {
            width: 34px !important;
            height: 34px !important;
            min-width: 34px !important;
            font-size: 0.9rem !important;
          }

          .info-content {
            font-size: 0.76rem !important;
            line-height: 1.5 !important;
          }


          /* ================= SEARCH ================= */

          .filter-bar {
            padding: 0.8rem !important;
            margin-bottom: 1rem !important;
            gap: 0.65rem !important;
            border-radius: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .search-box {
            width: 100% !important;
            min-width: 0 !important;
          }

          .search-input {
            width: 100% !important;
            min-height: 46px !important;
            padding: 0.65rem 2.3rem !important;
            font-size: 0.82rem !important;
            box-sizing: border-box !important;
          }

          .search-icon {
            left: 0.85rem !important;
            font-size: 0.85rem !important;
          }

          .filter-results {
            width: 100% !important;
            padding: 0.6rem !important;
            text-align: center !important;
            font-size: 0.72rem !important;
          }


          /* ================= STATS ================= */

          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 0.65rem !important;
            margin-bottom: 1rem !important;
          }

          .stat-card {
            min-height: auto !important;
          }

          .stat-card-header {
            padding: 0.75rem 0.85rem !important;
            gap: 0.65rem !important;
          }

          .stat-icon-wrapper {
            width: 38px !important;
            height: 38px !important;
            font-size: 1rem !important;
          }

          .stat-title {
            font-size: 0.75rem !important;
          }

          .stat-card-body {
            padding: 0 0.85rem !important;
          }

          .stat-value {
            font-size: 1.45rem !important;
          }

          .stat-card-footer {
            padding: 0.45rem 0.85rem 0.65rem !important;
          }

          .stat-trend {
            font-size: 0.7rem !important;
          }


          /* ================= QUICK ACTIONS ================= */

          .quick-actions-section {
            padding: 0.5rem 0.75rem 0.375rem !important;
            margin-bottom: 0.75rem !important;
            border-radius: 12px !important;
          }

          .quick-actions-header {
            margin-bottom: 0.375rem !important;
            padding-bottom: 0.25rem !important;
          }

          .quick-actions-header h3 {
            font-size: 0.9rem !important;
            gap: 0.5rem !important;
          }

          .quick-actions-icon {
            font-size: 0.9rem !important;
          }

          .quick-actions-subtitle {
            font-size: 0.675rem !important;
            margin-top: 0.125rem !important;
          }

          .quick-actions-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }

          .quick-action-card {
            min-height: 100px !important;
            padding: 12px 14px !important;
            gap: 10px !important;
            flex-direction: row !important;
            align-items: center !important;
            text-align: left !important;
          }

          .quick-action-icon {
            width: 38px !important;
            height: 38px !important;
            min-width: 38px !important;
            font-size: 1.1rem !important;
          }

          .quick-action-content {
            flex: 1 !important;
            min-width: 0 !important;
          }

          .quick-action-title {
            font-size: 0.85rem !important;
          }

          .quick-action-description {
            font-size: 0.72rem !important;
          }


          /* ================= REGISTERED COLLEGES ================= */

          .erp-card {
            margin-bottom: 1rem !important;
            border-radius: 12px !important;
          }

          .erp-card-header {
            padding: 0.85rem !important;
            flex-wrap: wrap !important;
            gap: 0.65rem !important;
          }

          .erp-card-header h3 {
            font-size: 0.95rem !important;
            line-height: 1.3 !important;
          }

          .view-more-btn {
            padding: 0.45rem 0.7rem !important;
            font-size: 0.72rem !important;
          }

          .erp-card-body {
            padding: 0.75rem !important;
          }

          .erp-card-body .row {
            margin-left: -0.3rem !important;
            margin-right: -0.3rem !important;
          }

          .erp-card-body .row > [class*="col-"] {
            padding-left: 0.3rem !important;
            padding-right: 0.3rem !important;
          }

          .meta-item span {
            overflow-wrap: anywhere !important;
          }


          /* ================= FOOTER ================= */

          .footer-note {
            padding: 0.75rem !important;
            margin-top: 0.75rem !important;
            font-size: 0.7rem !important;
            line-height: 1.4 !important;
            text-align: center !important;
          }

          .footer-note-content {
            gap: 0.5rem !important;
          }

          .note-icon {
            font-size: 1rem !important;
          }

          .refresh-btn {
            width: 34px !important;
            height: 34px !important;
          }
        }


        /* ================= SMALL MOBILE ================= */
        @media (max-width: 400px) {

          .erp-page {
            padding: 0.5rem !important;
          }

          .erp-page-header {
            padding: 14px !important;
            border-radius: 10px !important;
          }

          .erp-page-title {
            font-size: 18px !important;
          }

          .erp-page-subtitle {
            font-size: 13px !important;
          }

          .erp-header-actions {
            grid-template-columns: 1fr !important;
          }

          .erp-header-actions .erp-btn {
            height: 42px !important;
            min-height: 42px !important;
          }

          .info-content {
            font-size: 0.72rem !important;
          }

          .search-input {
            font-size: 0.78rem !important;
          }

          .quick-actions-section,
          .erp-card {
            border-radius: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
