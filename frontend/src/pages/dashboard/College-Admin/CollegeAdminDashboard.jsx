import React, { useContext, useEffect, useState, useCallback, memo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import "./DashboardPage.css";
import { getFrontendRegistrationUrl } from "../../../utils/urlHelpers";
import LogoImage, { preloadLogo } from "../../../components/common/LogoImage";
import { getDashboardPath } from "../../../components/Sidebar/config/navigation.config";
import { formatDistanceToNow } from "date-fns";
import { logger } from "../../../utils/logger";

import {
  FaUsers,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaGraduationCap,
  FaUserClock,
  FaUserCheck,
  FaLink,
  FaCopy,
  FaCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaArrowRight,
  FaEye,
  FaFileAlt,
  FaBell,
  FaCogs,
  FaEnvelope,
  FaCalendarAlt,
  FaSyncAlt,
  FaSpinner,
  FaBarcode,
} from "react-icons/fa";

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

/* ================= ISOLATED HEADER CLOCK ================= */
// Isolates 30s timer updates to prevent re-rendering the whole page
const HeaderClock = memo(function HeaderClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="cad-header-clock"
      aria-label={`Current time: ${timeStr}, ${dateStr}`}
      role="timer"
    >
      <div className="cad-clock-time">{timeStr}</div>
      <div className="cad-clock-date">{dateStr}</div>
    </div>
  );
});

/* ================= RELATIVE TIME HELPER ================= */
const formatRelativeTime = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
};

/* ================= SAFE CLIPBOARD HELPER ================= */
const copyToClipboard = async (text) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
};

/* ================= STATUS CHIP HELPER ================= */
const getStatusBadge = (status) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "APPROVED":
      return {
        className: "cad-status-chip cad-status-approved",
        icon: <FaCheckCircle />,
        label: "Approved",
      };
    case "PENDING":
      return {
        className: "cad-status-chip cad-status-pending",
        icon: <FaClock />,
        label: "Pending",
      };
    case "ENROLLED":
      return {
        className: "cad-status-chip cad-status-enrolled",
        icon: <FaGraduationCap />,
        label: "Enrolled",
      };
    case "ALUMNI":
      return {
        className: "cad-status-chip cad-status-alumni",
        icon: <FaUsers />,
        label: "Alumni",
      };
    case "REJECTED":
      return {
        className: "cad-status-chip cad-status-rejected",
        icon: <FaExclamationTriangle />,
        label: "Rejected",
      };
    default:
      return {
        className: "cad-status-chip cad-status-enrolled",
        icon: <FaUserCheck />,
        label: status || "Active",
      };
  }
};

/* ================= QUICK ACTIONS CONFIG ================= */
const QUICK_ACTIONS = [
  {
    id: "approve",
    icon: FaUserCheck,
    label: "Approve Students",
    path: "/students/approve",
    ariaLabel: "Review and approve students",
  },
  {
    id: "staff",
    icon: FaChalkboardTeacher,
    label: "Manage Staff",
    path: "/college/staff",
    ariaLabel: "View and manage teaching staff",
  },
  {
    id: "departments",
    icon: FaLayerGroup,
    label: "Departments",
    path: "/departments",
    ariaLabel: "Manage college departments",
  },
  {
    id: "courses",
    icon: FaGraduationCap,
    label: "Courses",
    path: "/courses",
    ariaLabel: "Manage course offerings",
  },
  {
    id: "reports",
    icon: FaFileAlt,
    label: "Student Reports",
    path: "/college-admin/reports-dashboard",
    ariaLabel: "View student and payment reports",
  },
  {
    id: "notifications",
    icon: FaBell,
    label: "Notifications",
    path: "/notification/create",
    ariaLabel: "Send institution announcement",
  },
  {
    id: "settings",
    icon: FaCogs,
    label: "System Settings",
    path: "/system-settings/general",
    ariaLabel: "Manage system preferences",
  },
];

/* ================= MAIN DASHBOARD COMPONENT ================= */
export default function CollegeAdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [college, setCollege] = useState(null);
  const [setupRedirect, setSetupRedirect] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    totalCourses: 0,
    pendingAdmissions: 0,
    activeStudents: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [pendingAdmissions, setPendingAdmissions] = useState([]);

  /* ================= LOAD DASHBOARD DATA ================= */
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (!user || user.role !== "COLLEGE_ADMIN") return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await api.get("/dashboard/college-admin");
      const data = res.data;

      setCollege(data.college);
      if (data.college?.logoDocumentId) {
        preloadLogo(data.college.logoDocumentId);
      }

      if (data.college && data.college.setupCompleted === false) {
        setSetupRedirect(true);
      }

      setStats({
        totalStudents: data.stats?.totalStudents || 0,
        totalTeachers: data.stats?.totalTeachers || 0,
        totalDepartments: data.stats?.totalDepartments || 0,
        totalCourses: data.stats?.totalCourses || 0,
        pendingAdmissions: data.stats?.pendingAdmissions || 0,
        activeStudents: data.stats?.activeStudents || 0,
      });

      setRecentStudents(data.recentStudents || []);
      setPendingAdmissions(data.pendingAdmissions || []);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage =
        backendMessage ||
        "Failed to load dashboard data. Please try again.";

      logger.error("College admin dashboard load error:", statusCode, errorCode);

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
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Copy registration link
  const handleCopyLink = async () => {
    if (!college?.registrationUrl) return;
    const url = getFrontendRegistrationUrl(college.registrationUrl);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      toast.success("Registration link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Failed to copy link. Please copy manually.");
    }
  };

  // Copy college code
  const handleCopyCode = async () => {
    if (!college?.code) return;
    const ok = await copyToClipboard(college.code);
    if (ok) {
      setCopiedCode(true);
      toast.success("College code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  /* ================= SECURITY & REDIRECT CHECKS ================= */
  // Positioned after all hooks to strictly satisfy react-hooks/rules-of-hooks
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "COLLEGE_ADMIN") {
    const target = user.role ? getDashboardPath(user.role) : "/login";
    return <Navigate to={target === "/dashboard" ? "/login" : target} replace />;
  }

  if (setupRedirect) {
    return <Navigate to="/college/setup-wizard" replace />;
  }

  // Filter pending students out of recent activities
  const nonPendingRecentStudents = recentStudents.filter(
    (student) => (student?.status || "").toUpperCase() !== "PENDING"
  );

  return (
    <div className="cad-page">
      <div className="cad-container">
        {/* ================= HEADER SECTION ================= */}
        <header className="cad-header">
          <div className="cad-header-top">
            <div className="cad-header-brand">
              <div className="cad-header-logo" aria-hidden="true">
                <LogoImage documentId={college?.logoDocumentId} size={54} />
              </div>
              <div className="cad-header-titles">
                <h1 className="cad-header-title">
                  {college?.name || "College Dashboard"}
                </h1>
                <p className="cad-header-subtitle">
                  Real-time overview of institution's key metrics
                </p>
              </div>
            </div>

            <div className="cad-header-actions">
              <HeaderClock />

              <button
                type="button"
                className="cad-btn-refresh"
                onClick={() => loadDashboardData(true)}
                disabled={refreshing || loading}
                aria-label="Refresh dashboard data"
                title="Refresh dashboard data"
              >
                <FaSyncAlt className={refreshing ? "cad-spin" : ""} aria-hidden="true" />
                <span>Refresh</span>
              </button>

              <Link
                to="/college/profile"
                className="cad-btn-profile"
                aria-label="View and edit college profile"
              >
                <FaEye aria-hidden="true" />
                <span>View Profile</span>
              </Link>
            </div>
          </div>

          {/* Info Chips */}
          <div className="cad-header-chips" aria-label="Institution metadata">
            <div className="cad-chip" title="College email">
              <FaEnvelope className="cad-chip-icon" aria-hidden="true" />
              <span>{college?.email || "No email on record"}</span>
            </div>

            <div className="cad-chip" title="Established year">
              <FaCalendarAlt className="cad-chip-icon" aria-hidden="true" />
              <span>Est. {college?.establishedYear || "N/A"}</span>
            </div>

            <div className="cad-chip" title="College code">
              <FaBarcode className="cad-chip-icon" aria-hidden="true" />
              <span>Code: {college?.code ? college.code.toUpperCase() : "N/A"}</span>
              {college?.code && (
                <button
                  type="button"
                  className="cad-chip-copy"
                  onClick={handleCopyCode}
                  title="Copy college code"
                  aria-label="Copy college code"
                >
                  {copiedCode ? <FaCheck style={{ color: "#86efac" }} /> : <FaCopy />}
                </button>
              )}
            </div>

            <div className="cad-chip cad-chip-badge">
              <FaCheckCircle aria-hidden="true" />
              <span>Active Institution</span>
            </div>
          </div>
        </header>

        {/* ================= ERROR STATE ================= */}
        {error && (
          <div className="cad-error-card" role="alert">
            <FaExclamationTriangle className="cad-error-icon" aria-hidden="true" />
            <h2 className="cad-error-title">Dashboard Loading Error</h2>
            <p className="cad-error-msg">{error.message}</p>
            <button
              type="button"
              className="cad-btn-retry"
              onClick={() => loadDashboardData()}
            >
              <FaSyncAlt aria-hidden="true" />
              <span>Retry Loading</span>
            </button>
          </div>
        )}

        {/* ================= STAT CARDS GRID (6 CARDS) ================= */}
        <section aria-label="Key Institution Statistics">
          <div className="cad-stats-grid">
            {/* Card 1: Total Students */}
            <Link
              to="/students/approve"
              className="cad-stat-card"
              aria-label={`Total Students: ${stats.totalStudents}. Click to view students.`}
            >
              <div className="cad-stat-icon-wrap" aria-hidden="true">
                <FaUsers />
              </div>
              <div className="cad-stat-body">
                <div className="cad-stat-value">
                  {loading ? "--" : stats.totalStudents.toLocaleString()}
                </div>
                <div className="cad-stat-label">Total Students</div>
                <div className="cad-stat-helper">Approved & enrolled</div>
              </div>
              <FaArrowRight className="cad-stat-arrow" aria-hidden="true" />
            </Link>

            {/* Card 2: Total Teachers */}
            <Link
              to="/college/staff"
              className="cad-stat-card"
              aria-label={`Total Teachers: ${stats.totalTeachers}. Click to manage staff.`}
            >
              <div className="cad-stat-icon-wrap" aria-hidden="true">
                <FaChalkboardTeacher />
              </div>
              <div className="cad-stat-body">
                <div className="cad-stat-value">
                  {loading ? "--" : stats.totalTeachers.toLocaleString()}
                </div>
                <div className="cad-stat-label">Total Teachers</div>
                <div className="cad-stat-helper">Active faculty members</div>
              </div>
              <FaArrowRight className="cad-stat-arrow" aria-hidden="true" />
            </Link>

            {/* Card 3: Total Departments */}
            <Link
              to="/departments"
              className="cad-stat-card"
              aria-label={`Total Departments: ${stats.totalDepartments}. Click to manage departments.`}
            >
              <div className="cad-stat-icon-wrap" aria-hidden="true">
                <FaLayerGroup />
              </div>
              <div className="cad-stat-body">
                <div className="cad-stat-value">
                  {loading ? "--" : stats.totalDepartments.toLocaleString()}
                </div>
                <div className="cad-stat-label">Total Departments</div>
                <div className="cad-stat-helper">Academic departments</div>
              </div>
              <FaArrowRight className="cad-stat-arrow" aria-hidden="true" />
            </Link>

            {/* Card 4: Total Courses */}
            <Link
              to="/courses"
              className="cad-stat-card"
              aria-label={`Total Courses: ${stats.totalCourses}. Click to manage courses.`}
            >
              <div className="cad-stat-icon-wrap" aria-hidden="true">
                <FaGraduationCap />
              </div>
              <div className="cad-stat-body">
                <div className="cad-stat-value">
                  {loading ? "--" : stats.totalCourses.toLocaleString()}
                </div>
                <div className="cad-stat-label">Total Courses</div>
                <div className="cad-stat-helper">Active academic courses</div>
              </div>
              <FaArrowRight className="cad-stat-arrow" aria-hidden="true" />
            </Link>

            {/* Card 5: Pending Admissions (Warning Accent) */}
            <Link
              to="/students/pending-approvals"
              className="cad-stat-card"
              aria-label={`Pending Admissions: ${stats.pendingAdmissions}. Click to review.`}
            >
              <div
                className="cad-stat-icon-wrap cad-stat-icon-pending"
                aria-hidden="true"
              >
                <FaUserClock />
              </div>
              <div className="cad-stat-body">
                <div className="cad-stat-value">
                  {loading ? "--" : stats.pendingAdmissions.toLocaleString()}
                </div>
                <div className="cad-stat-label">Pending Admissions</div>
                <div className="cad-stat-helper">Awaiting approval</div>
              </div>
              <FaArrowRight className="cad-stat-arrow" aria-hidden="true" />
            </Link>

            {/* Card 6: Registration Link (Un-nested Card) */}
            <div className="cad-reg-card">
              <div className="cad-reg-top">
                <div className="cad-stat-icon-wrap" aria-hidden="true">
                  <FaLink />
                </div>
                <div className="cad-reg-meta">
                  <div className="cad-reg-title">Student Registration Link</div>
                  <div
                    className="cad-reg-url-preview"
                    title={
                      college?.registrationUrl
                        ? getFrontendRegistrationUrl(college.registrationUrl)
                        : "Link not configured"
                    }
                  >
                    {college?.registrationUrl
                      ? getFrontendRegistrationUrl(college.registrationUrl)
                      : "Not configured yet"}
                  </div>
                </div>
              </div>

              {college?.registrationUrl ? (
                <button
                  type="button"
                  className={`cad-reg-copy-btn ${copiedLink ? "cad-copied" : ""}`}
                  onClick={handleCopyLink}
                  aria-label="Copy student registration link"
                >
                  {copiedLink ? (
                    <>
                      <FaCheck aria-hidden="true" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <FaCopy aria-hidden="true" />
                      <span>Copy Registration Link</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to="/college/profile"
                  className="cad-reg-copy-btn"
                  style={{ textDecoration: "none" }}
                  aria-label="Configure registration link in college profile"
                >
                  <FaCogs aria-hidden="true" />
                  <span>Configure in Profile</span>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ================= MAIN CONTENT AREA ================= */}
        {/* On desktop (>=1200px): 2fr primary (Quick Actions + Recent) / 1fr secondary (Pending). */}
        {/* On mobile (<1200px): Pending Admissions appears FIRST, then Quick Actions, then Recent. */}
        <div className="cad-main-grid">
          {/* PRIMARY COLUMN: Quick Actions & Recent Student Activities */}
          <div className="cad-col-primary">
            {/* Quick Actions */}
            <section className="cad-section" aria-labelledby="cad-quick-actions-title">
              <div className="cad-section-header">
                <div className="cad-section-title-wrap">
                  <h2 id="cad-quick-actions-title" className="cad-section-title">
                    Quick Actions
                  </h2>
                  <p className="cad-section-subtitle">
                    Frequently used administration workflows
                  </p>
                </div>
              </div>

              <div className="cad-section-body">
                <div className="cad-quick-actions-grid" role="group" aria-label="Action shortcuts">
                  {QUICK_ACTIONS.map((action) => {
                    const IconComponent = action.icon;
                    return (
                      <Link
                        key={action.id}
                        to={action.path}
                        className="cad-quick-action-tile"
                        aria-label={action.ariaLabel}
                      >
                        <div className="cad-quick-action-icon" aria-hidden="true">
                          <IconComponent />
                        </div>
                        <span className="cad-quick-action-label">
                          {action.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Recent Student Activities */}
            <section className="cad-section" aria-labelledby="cad-recent-activities-title">
              <div className="cad-section-header">
                <div className="cad-section-title-wrap">
                  <h2 id="cad-recent-activities-title" className="cad-section-title">
                    Recent Student Activities
                  </h2>
                  <p className="cad-section-subtitle">
                    Latest registrations and status updates
                  </p>
                </div>

                {stats.totalStudents > 5 && (
                  <Link
                    to="/students/approve"
                    className="cad-section-action-link"
                    aria-label="View all students"
                  >
                    <span>View All</span>
                    <FaArrowRight aria-hidden="true" />
                  </Link>
                )}
              </div>

              <div className="cad-section-body">
                {loading && !refreshing ? (
                  <div
                    className="cad-spinner-container"
                    role="status"
                    aria-live="polite"
                  >
                    <FaSpinner className="cad-spin" aria-hidden="true" />
                    <span>Loading recent student activities...</span>
                  </div>
                ) : nonPendingRecentStudents.length > 0 ? (
                  <div className="cad-list">
                    {nonPendingRecentStudents.slice(0, 5).map((student) => {
                      const badgeInfo = getStatusBadge(student.status);
                      const initial = (student?.fullName?.[0] || "?").toUpperCase();

                      return (
                        <div key={student._id} className="cad-list-item">
                          <div className="cad-avatar" aria-hidden="true">
                            {initial}
                          </div>
                          <div className="cad-item-info">
                            <div className="cad-item-name">
                              {student?.fullName || "Unnamed Student"}
                            </div>
                            <div className="cad-item-meta">
                              <span className={badgeInfo.className}>
                                {badgeInfo.icon}
                                <span>{badgeInfo.label}</span>
                              </span>
                              {student.createdAt && (
                                <span className="cad-item-time">
                                  {formatRelativeTime(student.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="cad-item-action-btn"
                            onClick={() => {
                              if (student.status === "PENDING") {
                                navigate(`/college/view-student/${student._id}`);
                              } else {
                                navigate(`/college/view-approved-student/${student._id}`);
                              }
                            }}
                            aria-label={`View details for ${student?.fullName || "student"}`}
                            title="View student profile"
                          >
                            <FaEye aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}

                    {stats.totalStudents > 5 && (
                      <Link
                        to="/students/approve"
                        className="cad-card-footer-btn cad-btn-outline"
                      >
                        <FaEye aria-hidden="true" />
                        <span>View All Students ({stats.totalStudents})</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="cad-empty-state">
                    <FaUsers className="cad-empty-icon" aria-hidden="true" />
                    <h3 className="cad-empty-title">No recent student updates</h3>
                    <p className="cad-empty-text">
                      New student enrollments and approval status changes will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* SECONDARY COLUMN: Pending Admissions (Sticky on Desktop, Top on Mobile) */}
          <div className="cad-col-secondary">
            <section
              className="cad-section cad-section-pending"
              aria-labelledby="cad-pending-admissions-title"
            >
              <div className="cad-section-header">
                <div className="cad-section-title-wrap">
                  <div className="cad-title-row">
                    <h2 id="cad-pending-admissions-title" className="cad-section-title">
                      Pending Admissions
                    </h2>
                    <span className="cad-section-badge cad-badge-warning">
                      {pendingAdmissions.length}
                    </span>
                  </div>
                  <p className="cad-section-subtitle">
                    {pendingAdmissions.length === 1
                      ? "1 student awaiting approval"
                      : `${pendingAdmissions.length} students awaiting approval`}
                  </p>
                </div>
              </div>

              <div className="cad-section-body">
                {loading && !refreshing ? (
                  <div
                    className="cad-spinner-container"
                    role="status"
                    aria-live="polite"
                  >
                    <FaSpinner className="cad-spin" aria-hidden="true" />
                    <span>Checking pending admissions...</span>
                  </div>
                ) : pendingAdmissions.length > 0 ? (
                  <div className="cad-list">
                    {pendingAdmissions.slice(0, 4).map((student) => {
                      const initial = (student?.fullName?.[0] || "?").toUpperCase();

                      return (
                        <div key={student._id} className="cad-list-item">
                          <div
                            className="cad-avatar"
                            style={{ background: "var(--cad-warning)" }}
                            aria-hidden="true"
                          >
                            {initial}
                          </div>
                          <div className="cad-item-info">
                            <div className="cad-item-name">
                              {student?.fullName || "Unnamed Student"}
                            </div>
                            <div className="cad-item-meta">
                              <span className="cad-status-chip cad-status-pending">
                                <FaClock aria-hidden="true" />
                                <span>Pending</span>
                              </span>
                              {student.createdAt && (
                                <span className="cad-item-time">
                                  {formatRelativeTime(student.createdAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="cad-item-action-btn"
                            onClick={() => navigate(`/college/view-student/${student._id}`)}
                            aria-label={`Review application for ${student?.fullName || "student"}`}
                            title="Review student application"
                          >
                            <FaEye aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}

                    <Link
                      to="/students/pending-approvals"
                      className="cad-card-footer-btn cad-btn-primary"
                      aria-label="Review all pending applications"
                    >
                      <FaUserCheck aria-hidden="true" />
                      <span>
                        Review All Pending ({pendingAdmissions.length})
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="cad-empty-state">
                    <FaCheckCircle
                      className="cad-empty-icon cad-empty-icon-success"
                      aria-hidden="true"
                    />
                    <h3 className="cad-empty-title">No pending admissions</h3>
                    <p className="cad-empty-text">
                      All submitted student applications have been processed and reviewed.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
