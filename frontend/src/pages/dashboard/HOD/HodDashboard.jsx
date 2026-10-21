import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { AuthContext } from "../../../auth/AuthContext";
import {
  FaUserTie,
  FaUsers,
  FaCalendarAlt,
  FaGraduationCap,
  FaCalendarDay,
  FaCogs,
  FaIdCard,
  FaArrowRight,
  FaCheckCircle,
  FaEdit,
  FaPlus,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaClock,
  FaHistory,
  FaChartBar,
  FaBell,
  FaSyncAlt,
  FaChevronDown,
  FaChevronUp,
  FaEye,
} from "react-icons/fa";
/* eslint-disable-next-line no-unused-vars */
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import Loading from "../../../components/Loading";
import { logger } from "../../../utils/logger";
import "./HodDashboard.css";

// ============================================================
// BRAND PALETTE — Teal/Blue primary + Orange accent
// Status colors: Green, Amber, Red only
// ============================================================
const BRAND = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  primaryLight: "#e8f1f8",
  accent: "#f97316",
  accentLight: "#fff7ed",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#d97706",
  warningLight: "#fef3c7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  info: "#0891b2",
  infoLight: "#cffafe",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
};

// ============================================================
// ANIMATIONS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
  }),
};

// ============================================================
// HELPERS
// ============================================================
// eslint-disable-next-line react-refresh/only-export-components
export const getGreetingIST = (date = new Date()) => {
  const istHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).format(date);
  const hour = parseInt(istHourStr, 10);
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const formatDateLong = () => {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTimeShort = (date = new Date()) => {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCurrentAcademicYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = m >= 5 ? y : y - 1;
  return `${start}-${start + 1}`;
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

// ============================================================
// COMPONENT
// ============================================================
const HodDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedActivities, setExpandedActivities] = useState({});
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleActivityExpand = (id) => {
    setExpandedActivities((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchHodDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await api.get("/hod/dashboard");
      setDashboardData(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load HOD dashboard";

      logger.error("HOD Dashboard error:", statusCode, errorCode);

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
  }, []);

  const handleRefresh = () => {
    fetchHodDashboard(true);
  };

  useEffect(() => {
    fetchHodDashboard();
  }, [fetchHodDashboard]);

  // Loading State
  if (loading) {
    return (
      <div className="hod-dashboard-root">
        <div
          className="hod-dashboard-container"
          style={{
            minHeight: "70vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loading
            size="md"
            color="primary"
            text="Loading HOD Dashboard..."
          />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <ApiError
        title="Dashboard Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchHodDashboard}
        onGoBack={() => navigate("/hod/profile")}
      />
    );
  }

  if (!dashboardData) {
    return (
      <ApiError
        title="Dashboard Loading Error"
        message="Unable to load dashboard data"
        onRetry={fetchHodDashboard}
        onGoBack={() => navigate("/hod/profile")}
      />
    );
  }

  // ============================================================
  // EXTRACT REAL DATA
  // ============================================================
  const stats = dashboardData.stats || {};
  const department = dashboardData.department || {};
  const hod = dashboardData.hod || null;
  const recentTimetables = dashboardData.recentTimetables || [];
  const actionRequired = dashboardData.actionRequired || {};
  const todaySchedule = dashboardData.todaySchedule || [];
  const recentActivity = dashboardData.recentActivity || [];
  const academicYear = dashboardData.academicYear || getCurrentAcademicYear();

  // Full Name & Greeting with Title
  // e.g. "Good afternoon, Dr. Vishal Kore"
  const hodFullName = hod?.name || user?.name || "HOD";
  const greetingText = `${getGreetingIST()}, ${hodFullName}`;

  // KPI Metrics (Must agree with Reports page)
  const totalTeachers = stats.teachers || 0;
  const totalStudents = stats.students || 0;
  const totalSubjects = stats.subjects || 0;
  const totalPrograms = stats.programs || 0;

  // Timetables Breakdown (Merge Published & Drafts into 1 card)
  const tb = stats.timetablesBreakdown || {};
  const publishedCount =
    tb.published ?? stats.publishedTimetables ??
    recentTimetables.filter((t) => t.status === "PUBLISHED").length;
  const draftCount =
    tb.draft ?? stats.draftTimetables ??
    recentTimetables.filter((t) => t.status === "DRAFT").length;
  const archivedCount =
    tb.archived ?? stats.archivedTimetables ??
    recentTimetables.filter((t) => t.status === "ARCHIVED").length;
  const totalTimetables = tb.total ?? stats.timetables ?? (publishedCount + draftCount + archivedCount);

  // Attendance Today
  const attendanceTodayRate =
    stats.attendanceToday !== null && stats.attendanceToday !== undefined
      ? stats.attendanceToday
      : null;
  const todaySessionsCount = stats.todayClosedSessionsCount || 0;

  // Action Required Data
  const pendingExceptions = actionRequired.pendingExceptions || 0;
  const draftTimetables = actionRequired.draftTimetables ?? draftCount;
  const lowAttendanceStudents = actionRequired.lowAttendanceStudents || 0;
  const unmarkedSessions = actionRequired.unmarkedSessions || 0;
  const totalActionItems =
    pendingExceptions + draftTimetables + lowAttendanceStudents + unmarkedSessions;

  // Quick Actions (6 key portals)
  const quickActions = [
    {
      label: "Manage Teachers",
      description: "Faculty roster & allocations",
      icon: FaUsers,
      route: "/hod/teachers",
      color: BRAND.primary,
      bg: BRAND.primaryLight,
    },
    {
      label: "Manage Timetable",
      description: "Schedules & slot management",
      icon: FaCalendarAlt,
      route: "/timetable/list",
      color: BRAND.accent,
      bg: BRAND.accentLight,
    },
    {
      label: "Exception Approvals",
      description: "Timetable change reviews",
      icon: FaClipboardCheck,
      route: "/hod/exception-approvals",
      color: BRAND.warning,
      bg: BRAND.warningLight,
    },
    {
      label: "Department Reports",
      description: "Attendance analytics & export",
      icon: FaChartBar,
      route: "/hod/reports",
      color: BRAND.info,
      bg: BRAND.infoLight,
    },
    {
      label: "Send Notification",
      description: "Broadcast announcements",
      icon: FaBell,
      route: "/hod/notifications/create",
      color: BRAND.primary,
      bg: BRAND.primaryLight,
    },
    {
      label: "Enter Marks",
      description: "Academic grades & evaluation",
      icon: FaEdit,
      route: "/teacher/marks-entry",
      color: BRAND.accent,
      bg: BRAND.accentLight,
    },
  ];

  return (
    <div className="hod-dashboard-root">
      <div className="hod-dashboard-container">
        {/* ==================================================
            1. HEADER BANNER
            Greeting + Department Info + Meta + Updated Time
        ================================================== */}
<motion.div
  initial={{ opacity: 0, y: -16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45, ease: "easeOut" }}
  className="hod-header-banner"
>
  {/* Dark upper section */}
  <div className="hod-header-main">
    <div className="hod-header-user-info">
      <div className="hod-header-avatar">
        <FaUserTie />
      </div>

      <div className="hod-header-identity">
        <p className="hod-header-greeting">
          {getGreetingIST()}, 👋
        </p>

        <h1 className="hod-header-name">{hodFullName}</h1>

        <p className="hod-header-subtitle">
          Head of Department ·{" "}
          <strong>{department.name || "Department"}</strong>
        </p>
      </div>
    </div>

    {/* Right-side time and refresh */}
    <div className="hod-header-actions">
      <div className="hod-header-time-box">
        <span className="hod-header-time-label">Updated</span>
        <strong>
          {formatTimeShort(lastUpdated || new Date())}
        </strong>
      </div>

      <button
        type="button"
        onClick={() => navigate("/hod/profile")}
        disabled={refreshing || loading}
        className="hod-header-refresh-btn"
        title="Refresh Dashboard"
        aria-label="Refresh Dashboard"
      >
        <FaEye className={refreshing ? "hod-spin" : ""} />
        <span>{refreshing ? "Refreshing..." : "View Profile"}</span>
      </button>
    </div>
  </div>

  {/* Light information strip */}
  <div className="hod-header-footer">
    <div className="hod-header-footer-item">
      <FaCalendarDay />
      <div>
        <span className="hod-footer-label">Date</span>
        <strong>{formatDateLong()}</strong>
      </div>
    </div>

    <div className="hod-header-footer-item">
      <FaGraduationCap />
      <div>
        <span className="hod-footer-label">Academic Year</span>
        <strong>AY {academicYear}</strong>
      </div>
    </div>

    <div className="hod-header-footer-item">
      <FaUsers />
      <div>
        <span className="hod-footer-label">Department</span>
        <strong>{department.name || "Department"}</strong>
      </div>
    </div>

    {hod?.employeeId && (
      <div className="hod-header-footer-item hod-header-employee">
        <FaIdCard />
        <div>
          <span className="hod-footer-label">Employee ID</span>
          <strong>{hod.employeeId}</strong>
        </div>
      </div>
    )}
  </div>
</motion.div>

        {/* ==================================================
            2. 4 COMPACT KPI CARDS (Entire Card Clickable)
        ================================================== */}
        <div className="hod-kpi-grid">
          {/* Card 1: Total Teachers */}
          <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
            className="hod-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/hod/teachers")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/hod/teachers");
              }
            }}
            aria-label="Total Teachers, navigate to teachers roster"
          >
            <div className="hod-kpi-top-bar" style={{ background: BRAND.primary }} />
            <div className="hod-kpi-header">
              <div
                className="hod-kpi-icon"
                style={{ background: BRAND.primaryLight, color: BRAND.primary }}
              >
                <FaUsers />
              </div>
              <FaArrowRight style={{ fontSize: "0.75rem", color: BRAND.muted, opacity: 0.6 }} />
            </div>
            <div>
              <div className="hod-kpi-value">{totalTeachers}</div>
              <div className="hod-kpi-label">Total Teachers</div>
              <div className="hod-kpi-subtext">Active faculty roster</div>
            </div>
          </motion.div>

          {/* Card 2: Total Students */}
          <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="visible"
            className="hod-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/hod/reports")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/hod/reports");
              }
            }}
            aria-label="Total Students, view department reports"
          >
            <div className="hod-kpi-top-bar" style={{ background: BRAND.info }} />
            <div className="hod-kpi-header">
              <div
                className="hod-kpi-icon"
                style={{ background: BRAND.infoLight, color: BRAND.info }}
              >
                <FaGraduationCap />
              </div>
              <FaArrowRight style={{ fontSize: "0.75rem", color: BRAND.muted, opacity: 0.6 }} />
            </div>
            <div>
              <div className="hod-kpi-value">{totalStudents}</div>
              <div className="hod-kpi-label">Total Students</div>
              <div className="hod-kpi-subtext">
                {totalSubjects} subjects · {totalPrograms} programs
              </div>
            </div>
          </motion.div>

          {/* Card 3: Timetables (Merged Published · Draft · Archived) */}
          <motion.div
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="visible"
            className="hod-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/timetable/list")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/timetable/list");
              }
            }}
            aria-label="Timetables, navigate to timetable list"
          >
            <div className="hod-kpi-top-bar" style={{ background: BRAND.accent }} />
            <div className="hod-kpi-header">
              <div
                className="hod-kpi-icon"
                style={{ background: BRAND.accentLight, color: BRAND.accent }}
              >
                <FaCalendarAlt />
              </div>
              <FaArrowRight style={{ fontSize: "0.75rem", color: BRAND.muted, opacity: 0.6 }} />
            </div>
            <div>
              <div className="hod-kpi-value">{totalTimetables}</div>
              <div className="hod-kpi-label">Timetables</div>
              <div className="hod-kpi-subtext">
                {publishedCount} Published · {draftCount} Draft · {archivedCount} Archived
              </div>
            </div>
          </motion.div>

          {/* Card 4: Attendance Today */}
          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="visible"
            className="hod-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/hod/reports")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/hod/reports");
              }
            }}
            aria-label="Attendance Today, view reports"
          >
            <div className="hod-kpi-top-bar" style={{ background: BRAND.success }} />
            <div className="hod-kpi-header">
              <div
                className="hod-kpi-icon"
                style={{ background: BRAND.successLight, color: BRAND.success }}
              >
                <FaClipboardCheck />
              </div>
              <FaArrowRight style={{ fontSize: "0.75rem", color: BRAND.muted, opacity: 0.6 }} />
            </div>
            <div>
              <div className="hod-kpi-value">
                {attendanceTodayRate !== null ? `${attendanceTodayRate}%` : "N/A"}
              </div>
              <div className="hod-kpi-label">Attendance Today</div>
              <div className="hod-kpi-subtext">
                {attendanceTodayRate !== null
                  ? `${todaySessionsCount} sessions today`
                  : stats.lastSession
                  ? `Last session: ${stats.lastSession.rate}% · ${stats.lastSession.timeAgo}`
                  : "N/A"}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ==================================================
            3. TWO-COLUMN MAIN LAYOUT
            Left: Action Required + Today's Schedule
            Right: Quick Actions + Recent Activity
        ================================================== */}
        <div className="hod-main-columns">
          {/* ================= LEFT COLUMN ================= */}
          <div className="hod-column-left">
            {/* SECTION: Action Required */}
            <motion.div
              variants={fadeUp}
              custom={4}
              initial="hidden"
              animate="visible"
              className="hod-section-card"
            >
              <div className="hod-section-header">
                <div className="hod-section-title-wrap">
                  <div
                    className="hod-section-icon"
                    style={{
                      background: totalActionItems > 0 ? BRAND.warningLight : BRAND.successLight,
                      color: totalActionItems > 0 ? BRAND.warning : BRAND.success,
                    }}
                  >
                    {totalActionItems > 0 ? <FaExclamationTriangle /> : <FaCheckCircle />}
                  </div>
                  <div>
                    <h2 className="hod-section-title">Action Required</h2>
                    <p className="hod-section-subtitle">
                      {totalActionItems > 0
                        ? `${totalActionItems} pending items require attention`
                        : "Department tasks & compliance"}
                    </p>
                  </div>
                </div>
              </div>

              {totalActionItems === 0 ? (
                <div className="hod-all-clear">
                  <FaCheckCircle className="hod-all-clear-icon" />
                  <div>
                    <p className="hod-all-clear-title">All clear</p>
                    <p className="hod-all-clear-sub">
                      No pending actions or timetable exceptions requiring review.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="hod-action-list">
                  {/* Pending Exceptions */}
                  {pendingExceptions > 0 && (
                    <div className="hod-action-item">
                      <div className="hod-action-item-left">
                        <span className="hod-action-pill warning">{pendingExceptions}</span>
                        <span className="hod-action-text">Pending timetable exceptions</span>
                      </div>
                      <button
                        type="button"
                        className="hod-action-btn"
                        onClick={() => navigate("/hod/exception-approvals")}
                      >
                        Review <FaArrowRight style={{ fontSize: "0.65rem" }} />
                      </button>
                    </div>
                  )}

                  {/* Draft Timetables Awaiting Review */}
                  {draftTimetables > 0 && (
                    <div className="hod-action-item">
                      <div className="hod-action-item-left">
                        <span className="hod-action-pill warning">{draftTimetables}</span>
                        <span className="hod-action-text">Draft timetables awaiting review</span>
                      </div>
                      <button
                        type="button"
                        className="hod-action-btn"
                        onClick={() => navigate("/timetable/list")}
                      >
                        Review <FaArrowRight style={{ fontSize: "0.65rem" }} />
                      </button>
                    </div>
                  )}

                  {/* Low Attendance Students */}
                  {lowAttendanceStudents > 0 && (
                    <div className="hod-action-item">
                      <div className="hod-action-item-left">
                        <span className="hod-action-pill danger">{lowAttendanceStudents}</span>
                        <span className="hod-action-text">Students below 75% attendance</span>
                      </div>
                      <button
                        type="button"
                        className="hod-action-btn"
                        onClick={() => navigate("/hod/reports")}
                      >
                        View <FaArrowRight style={{ fontSize: "0.65rem" }} />
                      </button>
                    </div>
                  )}

                  {/* Unmarked Attendance Sessions */}
                  {unmarkedSessions > 0 && (
                    <div className="hod-action-item">
                      <div className="hod-action-item-left">
                        <span className="hod-action-pill warning">{unmarkedSessions}</span>
                        <span className="hod-action-text">Sessions with attendance not yet marked</span>
                      </div>
                      <button
                        type="button"
                        className="hod-action-btn"
                        onClick={() => navigate("/timetable/list")}
                      >
                        View <FaArrowRight style={{ fontSize: "0.65rem" }} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* SECTION: Today's Schedule */}
            <motion.div
              variants={fadeUp}
              custom={5}
              initial="hidden"
              animate="visible"
              className="hod-section-card"
            >
              <div className="hod-section-header">
                <div className="hod-section-title-wrap">
                  <div
                    className="hod-section-icon"
                    style={{ background: BRAND.primaryLight, color: BRAND.primary }}
                  >
                    <FaClock />
                  </div>
                  <div>
                    <h2 className="hod-section-title">Today's Schedule</h2>
                    <p className="hod-section-subtitle">Department lectures happening today</p>
                  </div>
                </div>
              </div>

              {todaySchedule.length > 0 ? (
                <div className="hod-schedule-list">
                  {todaySchedule.map((lecture) => (
                    <div key={lecture.id} className="hod-schedule-item">
                      <div className="hod-schedule-info">
                        <div className="hod-schedule-time">{lecture.time}</div>
                        <div className="hod-schedule-subject">
                          {lecture.subjectName}
                          {lecture.subjectCode ? ` (${lecture.subjectCode})` : ""}
                        </div>
                        <div className="hod-schedule-meta">
                          {lecture.teacherName} · {lecture.room || "Classroom"}
                        </div>
                      </div>
                      <span
                        className={`hod-badge ${
                          lecture.isMarked ? "hod-badge-success" : "hod-badge-warning"
                        }`}
                      >
                        {lecture.isMarked ? (
                          <>
                            <FaCheckCircle style={{ fontSize: "0.65rem" }} /> Marked
                          </>
                        ) : (
                          <>
                            <FaClock style={{ fontSize: "0.65rem" }} /> Not Marked
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hod-schedule-compact-empty">
                  <div className="hod-schedule-compact-main">
                    <div className="hod-schedule-compact-icon-wrap">
                      <FaCalendarDay className="hod-schedule-compact-icon" />
                    </div>
                    <div className="hod-schedule-compact-text">
                      <p className="hod-schedule-compact-title">No lectures scheduled today</p>
                      {dashboardData.nextLecture ? (
                        <p className="hod-schedule-compact-next">
                          Next lecture: <strong>{dashboardData.nextLecture.formattedDateTime || `${dashboardData.nextLecture.date || dashboardData.nextLecture.day}, ${dashboardData.nextLecture.time}`}</strong> · {dashboardData.nextLecture.subject}
                        </p>
                      ) : (
                        <p className="hod-schedule-compact-sub">No upcoming lectures scheduled this week.</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="hod-schedule-compact-link"
                    onClick={() => navigate("/timetable/weekly-timetable")}
                  >
                    View weekly schedule <FaArrowRight style={{ fontSize: "0.68rem" }} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="hod-column-right">
            {/* SECTION: Quick Actions */}
            <motion.div
              variants={fadeUp}
              custom={4}
              initial="hidden"
              animate="visible"
              className="hod-section-card"
            >
              <div className="hod-section-header">
                <div className="hod-section-title-wrap">
                  <div
                    className="hod-section-icon"
                    style={{ background: BRAND.accentLight, color: BRAND.accent }}
                  >
                    <FaCogs />
                  </div>
                  <div>
                    <h2 className="hod-section-title">Quick Actions</h2>
                    <p className="hod-section-subtitle">Key departmental portals</p>
                  </div>
                </div>
              </div>

              <div className="hod-quick-grid">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      className="hod-quick-card"
                      onClick={() => navigate(action.route)}
                    >
                      <div
                        className="hod-quick-icon"
                        style={{ background: action.bg, color: action.color }}
                      >
                        <Icon />
                      </div>
                      <div className="hod-quick-info">
                        <div className="hod-quick-label">{action.label}</div>
                        <div className="hod-quick-desc">{action.description}</div>
                      </div>
                      <FaArrowRight
                        style={{
                          fontSize: "0.68rem",
                          color: BRAND.muted,
                          opacity: 0.5,
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* SECTION: Recent Activity */}
            <motion.div
              variants={fadeUp}
              custom={5}
              initial="hidden"
              animate="visible"
              className="hod-section-card"
            >
              <div className="hod-section-header">
                <div className="hod-section-title-wrap">
                  <div
                    className="hod-section-icon"
                    style={{ background: BRAND.infoLight, color: BRAND.info }}
                  >
                    <FaHistory />
                  </div>
                  <div>
                    <h2 className="hod-section-title">Recent Activity</h2>
                    <p className="hod-section-subtitle">Department audit log & events</p>
                  </div>
                </div>
              </div>

              {recentActivity.length > 0 ? (
                <div className="hod-activity-list">
                  {recentActivity.map((act) => {
                    const isExpanded = Boolean(expandedActivities[act.id]);
                    const subItems = act.detailsList || act.subItems || [];
                    return (
                      <div key={act.id} className="hod-activity-card">
                        <div
                          className={`hod-activity-item ${act.isGrouped ? "hod-activity-item--grouped" : ""}`}
                          onClick={act.isGrouped ? () => toggleActivityExpand(act.id) : undefined}
                          role={act.isGrouped ? "button" : undefined}
                          tabIndex={act.isGrouped ? 0 : undefined}
                          onKeyDown={
                            act.isGrouped
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleActivityExpand(act.id);
                                  }
                                }
                              : undefined
                          }
                          aria-expanded={act.isGrouped ? isExpanded : undefined}
                        >
                          <div className="hod-activity-dot" />
                          <div className="hod-activity-content">
                            <div className="hod-activity-text">{act.readableText}</div>
                            <div className="hod-activity-time">{act.timeAgo}</div>
                          </div>
                          {act.isGrouped && (
                            <span
                              className="hod-activity-expand-icon"
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? (
                                <FaChevronUp style={{ fontSize: "0.7rem" }} />
                              ) : (
                                <FaChevronDown style={{ fontSize: "0.7rem" }} />
                              )}
                            </span>
                          )}
                        </div>

                        {act.isGrouped && isExpanded && subItems.length > 0 && (
                          <div className="hod-activity-sublist">
                            {subItems.map((sub, idx) => (
                              <div key={sub?.id || idx} className="hod-activity-subitem">
                                <span className="hod-activity-subbullet">•</span>
                                <div className="hod-activity-subitem-content">
                                  <span className="hod-activity-subitem-title">
                                    {typeof sub === "string"
                                      ? sub
                                      : sub.subjectName || sub.name || "Subject"}
                                    {typeof sub === "object" && sub.courseName
                                      ? ` (${sub.courseName})`
                                      : ""}
                                  </span>
                                  {typeof sub === "object" && (sub.whoDidIt || sub.teacher) && (
                                    <span className="hod-activity-subitem-meta">
                                      · {sub.whoDidIt || sub.teacher}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="hod-empty-state">
                  <FaHistory className="hod-empty-icon" />
                  <p className="hod-empty-title">No recent activity</p>
                  <p className="hod-empty-sub">
                    No departmental events recorded recently.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ==================================================
            4. RECENT TIMETABLES (Slim Table, max 3-5 rows)
        ================================================== */}
        <motion.div
          variants={fadeUp}
          custom={6}
          initial="hidden"
          animate="visible"
          className="hod-section-card"
          style={{ marginBottom: "1.5rem" }}
        >
          <div className="hod-section-header">
            <div className="hod-section-title-wrap">
              <div
                className="hod-section-icon"
                style={{ background: BRAND.accentLight, color: BRAND.accent }}
              >
                <FaCalendarAlt />
              </div>
              <div>
                <h2 className="hod-section-title">Recent Timetables</h2>
                <p className="hod-section-subtitle">
                  Latest schedules created in your department (Published and Draft first)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/timetable/list")}
              style={{
                background: "transparent",
                border: `1px solid ${BRAND.primary}`,
                color: BRAND.primary,
                padding: "0.45rem 1rem",
                borderRadius: 8,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BRAND.primary;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = BRAND.primary;
              }}
            >
              View All <FaArrowRight style={{ fontSize: "0.7rem" }} />
            </button>
          </div>

          {recentTimetables.length > 0 ? (
            <div className="hod-table-wrapper">
              <table className="hod-slim-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Semester</th>
                    <th>Academic Year</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTimetables.slice(0, 5).map((tt) => (
                    <tr key={tt._id}>
                      <td>
                        <div className="hod-table-name">
                          <div
                            className="hod-table-icon"
                            style={{
                              background:
                                tt.status === "PUBLISHED"
                                  ? BRAND.successLight
                                  : tt.status === "DRAFT"
                                  ? BRAND.warningLight
                                  : "#f1f5f9",
                              color:
                                tt.status === "PUBLISHED"
                                  ? BRAND.success
                                  : tt.status === "DRAFT"
                                  ? BRAND.warning
                                  : BRAND.muted,
                            }}
                          >
                            <FaCalendarAlt />
                          </div>
                          <span>{tt.name}</span>
                        </div>
                      </td>
                      <td>Semester {tt.semester || "—"}</td>
                      <td>{tt.academicYear || "—"}</td>
                      <td>
                        <span
                          className={`hod-badge ${
                            tt.status === "PUBLISHED"
                              ? "hod-badge-success"
                              : tt.status === "DRAFT"
                              ? "hod-badge-warning"
                              : "hod-badge-muted"
                          }`}
                        >
                          {tt.status}
                        </span>
                      </td>
                      <td>{formatDateShort(tt.updatedAt || tt.createdAt)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/timetable/${tt._id}/weekly${
                                tt.status === "ARCHIVED" ? "?includeArchived=true" : ""
                              }`
                            )
                          }
                          style={{
                            background: "transparent",
                            border: `1px solid ${BRAND.border}`,
                            color: BRAND.accent,
                            padding: "0.3rem 0.75rem",
                            borderRadius: 6,
                            fontSize: "0.76rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = BRAND.accent;
                            e.currentTarget.style.background = BRAND.accentLight;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = BRAND.border;
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          Open <FaArrowRight style={{ fontSize: "0.65rem" }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hod-empty-state">
              <FaCalendarAlt className="hod-empty-icon" />
              <p className="hod-empty-title">No timetables yet</p>
              <p className="hod-empty-sub">
                Create your first department timetable to get started.
              </p>
              <button
                type="button"
                onClick={() => navigate("/timetable/create-timetable")}
                style={{
                  marginTop: "1rem",
                  background: BRAND.accent,
                  color: "#ffffff",
                  border: "none",
                  padding: "0.55rem 1.15rem",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FaPlus /> Create Timetable
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default HodDashboard;