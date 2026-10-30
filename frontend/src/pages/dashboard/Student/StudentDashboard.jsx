import { useEffect, useContext, useState, useCallback, memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../../api/axios";
import ApiError from "../../../components/ApiError";
import Loading from "../../../components/Loading";
import { AuthContext } from "../../../auth/AuthContext";
import { logger } from "../../../utils/logger";
import studentDashboardCache from "../../../utils/studentDashboardCache";
import {
  FaGraduationCap,
  FaCalendarAlt,
  FaWallet,
  FaFileAlt,
  FaUserGraduate,
  FaBell,
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChalkboardTeacher,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaArrowRight,
  FaRupeeSign,
  FaUniversity,
  FaBook,
  FaLayerGroup,
  FaIdBadge,
} from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./StudentDashboard.css";

const PAGE_LOAD_TOAST_ID = "student-dashboard-load";

// Attendance policy threshold
const MIN_ATTENDANCE_PERCENT = 75;

/**
 * Format a Date as YYYY-MM-DD using LOCAL date parts (not toISOString which uses UTC).
 * This avoids off-by-one-day issues for timezones ahead of UTC (like IST).
 */
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Authentication / session error codes that must NOT surface a toast.
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

/**
 * Memoized live clock to isolate 1-second interval updates from root dashboard re-renders
 */
const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="sd-hero-clock"
      aria-label={`Current time: ${time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })}`}
    >
      <span className="sd-clock-label">Time</span>
      <span className="sd-clock-val">
        {time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })}
      </span>
    </div>
  );
});

/**
 * Custom Recharts tooltip for chart hover states
 */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="sd-chart-tooltip">
        {label && <p className="sd-chart-tooltip-label">{label}</p>}
        {payload.map((entry, index) => (
          <p key={index} className="sd-chart-tooltip-row" style={{ color: entry.color || entry.fill }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * Converts "HH:mm" to total minutes from midnight for slot time comparison
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return -1;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const userId = user?.id || user?._id;

  const [dashboardData, setDashboardData] = useState(() =>
    studentDashboardCache.get(userId),
  );
  const [status, setStatus] = useState(() =>
    studentDashboardCache.get(userId) ? "success" : "loading",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Initial load effect
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadInitial = async () => {
      const cached = studentDashboardCache.get(userId);
      const hasCachedData = Boolean(cached);

      // If we have cached data, ensure it is set as data and status is success
      if (cached) {
        setDashboardData(cached);
        setStatus("success");
      }

      // If no cached data exists or if this is a manual retry, show loader
      if (!hasCachedData || retryCount > 0) {
        setStatus("loading");
        setError(null);
      }

      try {
        const todayStr = toLocalDateStr(new Date());
        const response = await api.get("/dashboard/student", {
          params: { date: todayStr },
          signal: controller.signal,
        });

        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setDashboardData(response.data);
        setStatus("success");
        setError(null);
        if (
          userId &&
          response.data?.student &&
          response.data?.feeSummary !== null &&
          response.data?.feeSummary !== undefined
        ) {
          studentDashboardCache.set(userId, response.data);
        }
      } catch (err) {
        const isAborted =
          controller.signal.aborted ||
          axios.isCancel(err) ||
          err?.name === "CanceledError" ||
          err?.name === "AbortError" ||
          err?.code === "ERR_CANCELED";

        if (isAborted || !isMounted) {
          return;
        }

        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;

        logger.error("Student dashboard load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "StudentDashboard",
          role: user?.role,
        });

        const isAuthError =
          statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

        if (hasCachedData && retryCount === 0) {
          // Keep cached data mounted and silently alert user of refresh failure
          if (!isAuthError) {
            toast.error("Failed to update dashboard. Showing cached data.", {
              position: "top-right",
              autoClose: 4000,
              icon: <FaExclamationTriangle />,
            });
          }
        } else {
          setError({
            message:
              backendMessage ||
              "Failed to load dashboard. Please check your connection and try again.",
            statusCode,
            errorCode,
          });
          setStatus("error");

          if (!isAuthError) {
            toast.error("Failed to load dashboard. Please try again.", {
              position: "top-right",
              autoClose: 5000,
              icon: <FaExclamationTriangle />,
            });
          }
        }
      }
    };

    loadInitial();

    return () => {
      isMounted = false;
      controller.abort();
      toast.dismiss(PAGE_LOAD_TOAST_ID);
    };
  }, [userId, user?.role, retryCount]);

  // Background refresh handler: keeps current data mounted, spins button, no click limit
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const todayStr = toLocalDateStr(new Date());
      const response = await api.get("/dashboard/student", {
        params: { date: todayStr },
      });
      setDashboardData(response.data);
      if (
        userId &&
        response.data?.student &&
        response.data?.feeSummary !== null &&
        response.data?.feeSummary !== undefined
      ) {
        studentDashboardCache.set(userId, response.data);
      }
      toast.success("Dashboard refreshed", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      logger.error("Student dashboard refresh error:", {
        statusCode: err.response?.status,
        errorCode: err.response?.data?.code,
        message: err.message,
        page: "StudentDashboard",
      });
      toast.error("Failed to refresh dashboard. Please try again.", {
        position: "top-right",
        autoClose: 4000,
        icon: <FaExclamationTriangle />,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, userId]);

  // Error retry handler: only used on error state screen, max 3 retries
  const handleRetry = useCallback(() => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    setIsRetrying(false);
  }, [retryCount]);

  // Handle go back action
  const handleGoBack = useCallback(() => {
    navigate("/student/dashboard");
  }, [navigate]);

  // Defensive: Safe access to attendance data
  const attendanceSummary = useMemo(() => {
    return (
      dashboardData?.attendanceSummary || {
        total: 0,
        present: 0,
        absent: 0,
        percentage: 0,
        warning: false,
      }
    );
  }, [dashboardData?.attendanceSummary]);

  // Defensive: Safe access to student data
  const studentData = useMemo(() => {
    return (
      dashboardData?.student || {
        name: "Student",
        enrollmentNumber: "N/A",
        course: "Not Assigned",
        department: "Not Assigned",
        semester: null,
      }
    );
  }, [dashboardData?.student]);

  // Defensive: Safe access to fee data
  const safeFeeSummary = useMemo(() => {
    return (
      dashboardData?.feeSummary || {
        totalFee: 0,
        paid: 0,
        due: 0,
        paymentStatus: "NOT_GENERATED",
      }
    );
  }, [dashboardData?.feeSummary]);

  const subjectWiseAttendance = useMemo(() => {
    return dashboardData?.subjectWiseAttendance || [];
  }, [dashboardData?.subjectWiseAttendance]);

  const todaysTimetable = useMemo(() => {
    return dashboardData?.todaysTimetable || [];
  }, [dashboardData?.todaysTimetable]);

  const latestNotifications = useMemo(() => {
    return dashboardData?.latestNotifications || [];
  }, [dashboardData?.latestNotifications]);

  // Format currency in INR
  const formatCurrency = useCallback((amount) => {
    const val = Number.isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  }, []);

  // Format date helper
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Timezone-safe greeting & name
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = useMemo(() => {
    const full = (studentData.name || "Student").trim();
    return full.split(" ")[0] || "Student";
  }, [studentData.name]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());
  }, []);

  // Guard against division by zero (never render NaN%)
  const feeProgressPercent = useMemo(() => {
    return safeFeeSummary.totalFee > 0
      ? Math.max(0, Math.min(100, Math.round((safeFeeSummary.paid / safeFeeSummary.totalFee) * 100)))
      : 0;
  }, [safeFeeSummary.paid, safeFeeSummary.totalFee]);

  // Prepare Attendance Pie Chart Data (Present #15803d, Absent #b91c1c)
  const attendancePieData = useMemo(() => {
    return [
      {
        name: "Present",
        value: attendanceSummary.present || 0,
        color: "#15803d",
      },
      {
        name: "Absent",
        value: attendanceSummary.absent || 0,
        color: "#b91c1c",
      },
    ];
  }, [attendanceSummary.present, attendanceSummary.absent]);

  const nonZeroAttendanceSlices = useMemo(() => {
    return attendancePieData.filter((entry) => entry.value > 0);
  }, [attendancePieData]);

  // Prepare Subject-wise Bar Chart Data
  const subjectBarData = useMemo(() => {
    return subjectWiseAttendance.map((subject) => ({
      subject: subject.subject || "Unknown",
      code: subject.code || "N/A",
      present: subject.present || 0,
      total: subject.total || 0,
      percentage: subject.percentage || 0,
    }));
  }, [subjectWiseAttendance]);

  // Low attendance count (only count subjects with at least 1 lecture recorded)
  const lowAttendanceCount = useMemo(() => {
    return subjectWiseAttendance.filter(
      (s) => (s.total || 0) > 0 && (s.percentage || 0) < MIN_ATTENDANCE_PERCENT,
    ).length;
  }, [subjectWiseAttendance]);

  // Compute "Today at a glance" strip items
  const glanceItems = useMemo(() => {
    const items = [];
    if (todaysTimetable.length > 0) {
      items.push({
        id: "classes",
        icon: <FaCalendarAlt />,
        val: `${todaysTimetable.length} Classes`,
        label: "Scheduled Today",
        to: "/student/timetable",
      });
    }
    if (safeFeeSummary.due > 0) {
      items.push({
        id: "fee",
        icon: <FaWallet />,
        val: formatCurrency(safeFeeSummary.due),
        label: "Fee Payment Due",
        to: "/student/fees",
      });
    }
    if (lowAttendanceCount > 0) {
      items.push({
        id: "attendance",
        icon: <FaExclamationTriangle />,
        val: `${lowAttendanceCount} Subject${lowAttendanceCount === 1 ? "" : "s"}`,
        label: `Below ${MIN_ATTENDANCE_PERCENT}% Minimum`,
        to: "/my-attendance",
      });
    }
    if (latestNotifications.length > 0) {
      items.push({
        id: "notifs",
        icon: <FaBell />,
        val: `${latestNotifications.length} New`,
        label: "Recent Notifications",
        to: "/notification/student",
      });
    }
    return items;
  }, [
    todaysTimetable.length,
    safeFeeSummary.due,
    lowAttendanceCount,
    latestNotifications.length,
    formatCurrency,
  ]);

  // Quick action tiles (6 equal tiles with meaning-matched tints)
  const quickActions = useMemo(
    () => [
      { icon: <FaGraduationCap />, label: "Attendance", path: "/my-attendance", tintClass: "sd-action-teal" },
      { icon: <FaCalendarAlt />, label: "Timetable", path: "/student/timetable", tintClass: "sd-action-blue" },
      { icon: <FaWallet />, label: "Fees", path: "/student/fees", tintClass: "sd-action-amber" },
      { icon: <FaFileAlt />, label: "My Results", path: "/student/results", tintClass: "sd-action-purple" },
      { icon: <FaUserGraduate />, label: "Profile", path: "/student/profile", tintClass: "sd-action-green" },
      { icon: <FaBell />, label: "Notifications", path: "/notification/student", tintClass: "sd-action-rose" },
    ],
    [],
  );

  // Timetable active/next slot calculation
  const sortedTimetable = useMemo(() => {
    return [...todaysTimetable].sort((a, b) =>
      (a.startTime || "").localeCompare(b.startTime || ""),
    );
  }, [todaysTimetable]);

  const { currentSlotIdx, nextSlotIdx } = useMemo(() => {
    const now = new Date();
    const currentM = now.getHours() * 60 + now.getMinutes();

    let cur = -1;
    let nxt = -1;

    for (let i = 0; i < sortedTimetable.length; i++) {
      const startM = parseTimeToMinutes(sortedTimetable[i].startTime);
      const endM = parseTimeToMinutes(sortedTimetable[i].endTime);
      if (startM !== -1 && endM !== -1 && currentM >= startM && currentM <= endM) {
        cur = i;
        break;
      }
    }

    if (cur === -1) {
      for (let i = 0; i < sortedTimetable.length; i++) {
        const startM = parseTimeToMinutes(sortedTimetable[i].startTime);
        if (startM !== -1 && startM > currentM) {
          nxt = i;
          break;
        }
      }
    }

    return { currentSlotIdx: cur, nextSlotIdx: nxt };
  }, [sortedTimetable]);

  // Loading State
  if (status === "loading") {
    return (
      <div className="sd-page">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        <div className="sd-container">
          <header className="sd-hero">
            <div className="sd-hero-left">
              <span className="sd-hero-subtitle">Student Portal</span>
              <h1 className="sd-hero-title">Loading dashboard...</h1>
            </div>
            <div className="sd-hero-right">
              <LiveClock />
            </div>
          </header>
          <div className="sd-loading-container">
            <Loading
              size="md"
              color="primary"
              text="Fetching your academic records..."
            />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (status === "error" || (status !== "success" && error)) {
    return (
      <ApiError
        title="Dashboard Loading Error"
        message={error?.message || "Failed to load dashboard. Please try again."}
        statusCode={error?.statusCode}
        errorCode={error?.errorCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  // Main tree renders only when status === "success" and dashboardData exists
  if (status !== "success" || !dashboardData) {
    return null;
  }

  const hasAttendanceRecords = (attendanceSummary.total || 0) > 0;
  const isAttendanceLow =
    hasAttendanceRecords && attendanceSummary.percentage < MIN_ATTENDANCE_PERCENT;

  return (
    <div className="sd-page">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      <div className="sd-container">
        {/* ================= 1. HERO SECTION ================= */}
        <header className="sd-hero">
          <div className="sd-hero-left">
            <h1 className="sd-hero-title">
              {greeting}, {firstName}!
            </h1>
            <div className="sd-hero-chips">
              {studentData.course && studentData.course !== "Not Assigned" && (
                <span className="sd-hero-chip">
                  <FaBook size={13} /> {studentData.course}
                </span>
              )}
              {studentData.semester && (
                <span className="sd-hero-chip">
                  <FaLayerGroup size={13} /> Semester {studentData.semester}
                </span>
              )}
              {studentData.enrollmentNumber && studentData.enrollmentNumber !== "N/A" && (
                <span className="sd-hero-chip">
                  <FaIdBadge size={13} /> {studentData.enrollmentNumber}
                </span>
              )}
            </div>
          </div>

          <div className="sd-hero-right">
            <div className="sd-hero-date-block">
              <span className="sd-hero-date-label">Today</span>
              <span className="sd-hero-date-val">{formattedDate}</span>
            </div>
            <LiveClock />
            <button
              type="button"
              className="sd-hero-refresh-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? "Refreshing dashboard data" : "Refresh dashboard data"}
              title={isRefreshing ? "Refreshing..." : "Refresh dashboard"}
            >
              <FaSync className={isRefreshing ? "sd-spin" : ""} size={16} />
            </button>
          </div>
        </header>

        {/* ================= 2. TODAY AT A GLANCE STRIP ================= */}
        {glanceItems.length > 0 && (
          <section className="sd-glance-strip" aria-label="Today at a glance">
            {glanceItems.map((item) => (
              <Link key={item.id} to={item.to} className="sd-glance-item">
                <div className="sd-glance-icon-box" aria-hidden="true">
                  {item.icon}
                </div>
                <div className="sd-glance-content">
                  <span className="sd-glance-val">{item.val}</span>
                  <span className="sd-glance-label">{item.label}</span>
                </div>
              </Link>
            ))}
          </section>
        )}

        {/* ================= 3. QUICK ACTIONS ================= */}
        <section className="sd-quick-actions-card" aria-label="Quick Actions">
          <div className="sd-quick-actions-grid">
            {quickActions.map((action, idx) => (
              <Link key={idx} to={action.path} className={`sd-action-tile ${action.tintClass}`}>
                <div className="sd-action-icon-box" aria-hidden="true">
                  {action.icon}
                </div>
                <span className="sd-action-label">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ================= 4. STAT CARDS (4) with 3px Accent Bars & Meaning Tints ================= */}
        <section className="sd-stats-grid" aria-label="Academic statistics">
          {/* Card 1: Course */}
          <div className="sd-stat-card sd-stat-card-blue">
            <div className="sd-stat-icon-box sd-stat-blue" aria-hidden="true">
              <FaGraduationCap />
            </div>
            <div className="sd-stat-content">
              <span className="sd-stat-label">Course</span>
              <div className="sd-stat-val-row">
                <span className="sd-stat-val" title={studentData.course}>
                  {studentData.course}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Department */}
          <div className="sd-stat-card sd-stat-card-amber">
            <div className="sd-stat-icon-box sd-stat-amber" aria-hidden="true">
              <FaUniversity />
            </div>
            <div className="sd-stat-content">
              <span className="sd-stat-label">Department</span>
              <div className="sd-stat-val-row">
                <span className="sd-stat-val" title={studentData.department}>
                  {studentData.department}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Semester or Enrollment No */}
          {Boolean(
            (studentData.enrollmentNumber && studentData.enrollmentNumber !== "N/A") ||
              studentData.semester,
          ) && (
            <div className="sd-stat-card sd-stat-card-teal">
              <div className="sd-stat-icon-box sd-stat-teal" aria-hidden="true">
                <FaIdBadge />
              </div>
              <div className="sd-stat-content">
                <span className="sd-stat-label">
                  {studentData.enrollmentNumber && studentData.enrollmentNumber !== "N/A"
                    ? "Enrollment No"
                    : "Semester"}
                </span>
                <div className="sd-stat-val-row">
                  <span
                    className="sd-stat-val sd-stat-val-enrollment"
                    title={
                      studentData.enrollmentNumber && studentData.enrollmentNumber !== "N/A"
                        ? studentData.enrollmentNumber
                        : `Semester ${studentData.semester}`
                    }
                  >
                    {studentData.enrollmentNumber && studentData.enrollmentNumber !== "N/A"
                      ? studentData.enrollmentNumber
                      : `Sem ${studentData.semester}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Overall Attendance */}
          <div
            className={`sd-stat-card ${
              !hasAttendanceRecords
                ? "sd-stat-card-teal"
                : isAttendanceLow
                  ? "sd-stat-card-danger"
                  : "sd-stat-card-green"
            }`}
          >
            <div
              className={`sd-stat-icon-box ${
                !hasAttendanceRecords
                  ? "sd-stat-teal"
                  : isAttendanceLow
                    ? "sd-stat-danger"
                    : "sd-stat-green"
              }`}
              aria-hidden="true"
            >
              <FaCheckCircle />
            </div>
            <div className="sd-stat-content">
              <span className="sd-stat-label">Overall Attendance</span>
              <div className="sd-stat-val-row">
                {hasAttendanceRecords ? (
                  <>
                    <span className="sd-stat-val">{attendanceSummary.percentage}%</span>
                    <span
                      className={`sd-chip ${isAttendanceLow ? "sd-chip-danger" : "sd-chip-success"}`}
                    >
                      {isAttendanceLow ? (
                        <>
                          <FaExclamationTriangle size={11} /> Low
                        </>
                      ) : (
                        <>
                          <FaCheckCircle size={11} /> On Track
                        </>
                      )}
                    </span>
                  </>
                ) : (
                  <span
                    className="sd-stat-val"
                    style={{ fontSize: "0.92rem", fontWeight: 600 }}
                  >
                    No attendance recorded yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================= 5. MAIN GRID (Equal Height Panels) ================= */}
        <div className="sd-main-grid">
          {/* Panel A: Attendance Summary */}
          <article className="sd-card">
            <header className="sd-card-header">
              <div className="sd-card-header-left">
                <div className="sd-card-header-icon" aria-hidden="true">
                  <FaCheckCircle />
                </div>
                <div className="sd-card-title-wrap">
                  <h2 className="sd-card-title">Attendance Summary</h2>
                  <p className="sd-card-subtitle">Overall attendance statistics & eligibility</p>
                </div>
              </div>
              <Link to="/my-attendance" className="sd-view-all-link">
                View All <FaArrowRight size={11} />
              </Link>
            </header>

            <div className="sd-card-body">
              {/* Donut Left + Stacked Metrics Right on >= 1200px */}
              <div className="sd-attendance-main-row">
                <div
                  className="sd-donut-wrapper"
                  role="region"
                  aria-label={`Attendance chart: ${attendanceSummary.percentage}% overall attendance`}
                >
                  {attendanceSummary.total === 0 || nonZeroAttendanceSlices.length === 0 ? (
                    <div className="sd-empty-state">
                      <div className="sd-empty-icon-circle">
                        <FaCheckCircle />
                      </div>
                      <div className="sd-empty-text-wrap">
                        <span className="sd-empty-title">No attendance yet</span>
                        <span className="sd-empty-subtitle">Records will show here</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width={180} height={180} minWidth={0}>
                        <PieChart>
                          <Pie
                            data={nonZeroAttendanceSlices}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={78}
                            paddingAngle={nonZeroAttendanceSlices.length > 1 ? 3 : 0}
                            dataKey="value"
                            stroke="none"
                          >
                            {nonZeroAttendanceSlices.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="sd-donut-center" aria-hidden="true">
                        <span className="sd-donut-percent">{attendanceSummary.percentage}%</span>
                        <span className="sd-donut-caption">Attended</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="sd-attendance-metrics">
                  <div className="sd-att-metric-box sd-metric-present">
                    <FaCheckCircle className="sd-att-metric-icon" />
                    <div className="sd-att-metric-info">
                      <span className="sd-att-metric-val">{attendanceSummary.present}</span>
                      <span className="sd-att-metric-label">Present</span>
                    </div>
                  </div>
                  <div className="sd-att-metric-box sd-metric-absent">
                    <FaTimesCircle className="sd-att-metric-icon" />
                    <div className="sd-att-metric-info">
                      <span className="sd-att-metric-val">{attendanceSummary.absent}</span>
                      <span className="sd-att-metric-label">Absent</span>
                    </div>
                  </div>
                  <div className="sd-att-metric-box sd-metric-total">
                    <FaClock className="sd-att-metric-icon" />
                    <div className="sd-att-metric-info">
                      <span className="sd-att-metric-val">{attendanceSummary.total}</span>
                      <span className="sd-att-metric-label">Total Lectures</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="sd-attendance-helper">
                {hasAttendanceRecords ? (
                  <>
                    {attendanceSummary.present} of {attendanceSummary.total}{" "}
                    {attendanceSummary.total === 1 ? "lecture" : "lectures"} attended
                  </>
                ) : (
                  "No lectures recorded for this term yet"
                )}
              </p>

              {/* Progress Section with 75% marker (10px height, green gradient) */}
              <div className="sd-progress-section">
                <div className="sd-progress-track">
                  <div
                    className={
                      !hasAttendanceRecords
                        ? "sd-progress-fill-green"
                        : isAttendanceLow
                          ? "sd-progress-fill-danger"
                          : "sd-progress-fill-green"
                    }
                    style={{
                      width: `${
                        hasAttendanceRecords
                          ? Math.max(0, Math.min(100, attendanceSummary.percentage))
                          : 0
                      }%`,
                    }}
                  />
                  <div className="sd-progress-marker" style={{ left: `${MIN_ATTENDANCE_PERCENT}%` }} aria-hidden="true" />
                </div>
                <div className="sd-progress-info">
                  <span className="sd-progress-threshold">
                    Minimum required: {MIN_ATTENDANCE_PERCENT}%
                  </span>
                  <span
                    className="sd-progress-status"
                    style={{
                      color: !hasAttendanceRecords
                        ? "var(--sd-muted)"
                        : isAttendanceLow
                          ? "var(--sd-danger)"
                          : "var(--sd-success)",
                    }}
                  >
                    {!hasAttendanceRecords
                      ? "No records"
                      : isAttendanceLow
                        ? "Action Needed"
                        : "Eligible for Exams"}
                  </span>
                </div>
              </div>

              {/* Alert banner if below minimum */}
              {isAttendanceLow && (
                <div className="sd-alert-banner" role="alert">
                  <FaExclamationTriangle className="sd-alert-icon" />
                  <span>
                    Low Attendance Alert: Minimum {MIN_ATTENDANCE_PERCENT}% required for exam eligibility.
                  </span>
                </div>
              )}
            </div>
          </article>

          {/* Panel B: Subject-wise Attendance */}
          <article className="sd-card">
            <header className="sd-card-header">
              <div className="sd-card-header-left">
                <div className="sd-card-header-icon" aria-hidden="true">
                  <FaBook />
                </div>
                <div className="sd-card-title-wrap">
                  <h2 className="sd-card-title">Subject-wise Attendance</h2>
                  <p className="sd-card-subtitle">Performance breakdown across subjects</p>
                </div>
              </div>
              <Link to="/my-attendance" className="sd-view-all-link">
                View All <FaArrowRight size={11} />
              </Link>
            </header>

            <div className="sd-card-body">
              {/* Show bar chart ONLY when there are 3 or more subjects */}
              {subjectBarData.length >= 3 && (
                <div
                  className="sd-subject-chart-wrap"
                  role="region"
                  aria-label={`Subject-wise attendance bar chart across ${subjectBarData.length} subjects`}
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={subjectBarData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf1" vertical={false} />
                      <XAxis
                        dataKey="code"
                        tick={{ fontSize: 12, fill: "#475569" }}
                        interval={0}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, "dataMax"]}
                        tick={{ fontSize: 12, fill: "#475569" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="present" name="Present" fill="var(--sd-success)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total" name="Total" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {subjectWiseAttendance.length === 0 ? (
                <div className="sd-empty-state">
                  <div className="sd-empty-icon-circle">
                    <FaBook />
                  </div>
                  <div className="sd-empty-text-wrap">
                    <span className="sd-empty-title">No subjects recorded</span>
                    <span className="sd-empty-subtitle">Course subjects will appear once scheduled</span>
                  </div>
                </div>
              ) : (
                <div className="sd-subject-rows" role="list" aria-label="Subject attendance list">
                  {[...subjectWiseAttendance]
                    .sort((a, b) => (a.percentage || 0) - (b.percentage || 0))
                    .map((subject, idx) => {
                      const isLow =
                        (subject.total || 0) > 0 &&
                        (subject.percentage || 0) < MIN_ATTENDANCE_PERCENT;
                      const lecturesNeeded = Math.max(
                        0,
                        Math.ceil(3 * (subject.total || 0) - 4 * (subject.present || 0)),
                      );
                      return (
                        <div
                          key={idx}
                          role="listitem"
                          className={`sd-subject-row ${isLow ? "sd-subject-row-warning" : ""}`}
                        >
                          <div className="sd-subject-row-top">
                            <div className="sd-subject-title-wrap">
                              <span className="sd-subject-name">{subject.subject}</span>
                              <span className="sd-subject-code">{subject.code}</span>
                            </div>
                            <span
                              className={`sd-chip ${isLow ? "sd-chip-danger" : "sd-chip-success"}`}
                            >
                              {isLow ? (
                                <>
                                  <FaExclamationTriangle size={11} /> Needs Attention
                                </>
                              ) : (
                                <>
                                  <FaCheckCircle size={11} /> On Track
                                </>
                              )}
                            </span>
                          </div>
                          <div className="sd-subject-progress-wrap">
                            <div className="sd-progress-track">
                              <div
                                className={isLow ? "sd-progress-fill-danger" : "sd-progress-fill-green"}
                                style={{
                                  width: `${Math.max(0, Math.min(100, subject.percentage || 0))}%`,
                                }}
                              />
                            </div>
                            <div className="sd-subject-progress-labels">
                              <span
                                style={{
                                  color: isLow ? "var(--sd-danger)" : "var(--sd-success)",
                                }}
                              >
                                {subject.percentage || 0}%
                              </span>
                              <span className="sd-subject-counts">
                                {subject.present || 0} / {subject.total || 0} lectures
                              </span>
                            </div>
                          </div>
                          {isLow && lecturesNeeded > 0 && (
                            <div>
                              <span className="sd-subject-needed-callout">
                                Need {lecturesNeeded} more {lecturesNeeded === 1 ? "lecture" : "lectures"} to reach {MIN_ATTENDANCE_PERCENT}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </article>
        </div>

        {/* ================= 6. SECOND GRID (Timetable & Fee Summary) ================= */}
        <div className="sd-second-grid">
          {/* Panel C: Today's Timetable */}
          <article className="sd-card">
            <header className="sd-card-header">
              <div className="sd-card-header-left">
                <div className="sd-card-header-icon" aria-hidden="true">
                  <FaCalendarAlt />
                </div>
                <div className="sd-card-title-wrap">
                  <h2 className="sd-card-title">Today's Schedule</h2>
                  <p className="sd-card-subtitle">Scheduled lectures & classroom timeline</p>
                </div>
              </div>
              <Link to="/student/timetable" className="sd-view-all-link">
                Full Timetable <FaArrowRight size={11} />
              </Link>
            </header>

            <div className="sd-card-body">
              {sortedTimetable.length === 0 ? (
                <div className="sd-empty-state">
                  <div className="sd-empty-icon-circle">
                    <FaCalendarAlt />
                  </div>
                  <div className="sd-empty-text-wrap">
                    <span className="sd-empty-title">No classes scheduled today</span>
                    <span className="sd-empty-subtitle">Enjoy your free day or catch up on revision</span>
                  </div>
                </div>
              ) : (
                <div className="sd-timeline" role="list" aria-label="Today's schedule list">
                  {sortedTimetable.map((slot, index) => {
                    const isCurrent = index === currentSlotIdx;
                    const isNext = index === nextSlotIdx;

                    return (
                      <div
                        key={index}
                        role="listitem"
                        className={`sd-timeline-item ${isCurrent ? "sd-timeline-active" : isNext ? "sd-timeline-next" : ""}`}
                      >
                        <div className="sd-timeline-time-box">
                          <span className="sd-time-start">{slot.startTime}</span>
                          <span className="sd-time-end">to {slot.endTime}</span>
                        </div>
                        <div className="sd-timeline-body">
                          <div className="sd-timeline-header-row">
                            <h3 className="sd-timeline-subject">{slot.subject}</h3>
                            <div className="sd-timeline-tags">
                              {isCurrent && (
                                <span className="sd-chip sd-chip-success">
                                  <FaClock size={11} /> Live Now
                                </span>
                              )}
                              {isNext && (
                                <span className="sd-chip sd-chip-brand">
                                  <FaClock size={11} /> Next Up
                                </span>
                              )}
                              <span className="sd-chip sd-chip-neutral">{slot.code}</span>
                              {slot.slotType && (
                                <span className="sd-chip sd-chip-brand">{slot.slotType}</span>
                              )}
                            </div>
                          </div>
                          <div className="sd-timeline-meta">
                            {slot.teacher && (
                              <span>
                                <FaChalkboardTeacher /> {slot.teacher}
                              </span>
                            )}
                            {slot.room && (
                              <span>
                                <FaMapMarkerAlt /> Room {slot.room}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </article>

          {/* Panel D: Fee Summary */}
          <article className="sd-card">
            <header className="sd-card-header">
              <div className="sd-card-header-left">
                <div className="sd-card-header-icon" aria-hidden="true">
                  <FaWallet />
                </div>
                <div className="sd-card-title-wrap">
                  <h2 className="sd-card-title">Fee Summary</h2>
                  <p className="sd-card-subtitle">Installment balance & payment status</p>
                </div>
              </div>
              <Link to="/student/fees" className="sd-view-all-link">
                View Details <FaArrowRight size={11} />
              </Link>
            </header>

            <div className="sd-card-body">
              {!dashboardData?.feeSummary || safeFeeSummary.paymentStatus === "NOT_GENERATED" ? (
                <div className="sd-empty-state">
                  <div className="sd-empty-icon-circle">
                    <FaWallet />
                  </div>
                  <div className="sd-empty-text-wrap">
                    <span className="sd-empty-title">Fee details not generated yet</span>
                    <span className="sd-empty-subtitle">Contact the administration office for billing updates</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="sd-fee-strip">
                    <div className="sd-fee-metric sd-fee-metric-total">
                      <span className="sd-fee-label">Total Fee</span>
                      <span className="sd-fee-val">{formatCurrency(safeFeeSummary.totalFee)}</span>
                    </div>
                    <div className="sd-fee-metric sd-fee-metric-paid">
                      <span className="sd-fee-label">Paid</span>
                      <span className="sd-fee-val sd-fee-val-paid">{formatCurrency(safeFeeSummary.paid)}</span>
                    </div>
                    <div className={`sd-fee-metric ${safeFeeSummary.due > 0 ? "sd-fee-metric-due" : "sd-fee-metric-cleared"}`}>
                      <span className="sd-fee-label">Due</span>
                      <span className={`sd-fee-val ${safeFeeSummary.due > 0 ? "sd-fee-val-due" : "sd-fee-val-cleared"}`}>
                        {formatCurrency(safeFeeSummary.due)}
                      </span>
                    </div>
                  </div>

                  <div className="sd-fee-status-row">
                    <span className="sd-fee-progress-label">Payment Progress</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="sd-fee-progress-pct">{feeProgressPercent}%</span>
                      {safeFeeSummary.due === 0 && safeFeeSummary.totalFee > 0 ? (
                        <span className="sd-chip sd-chip-success">
                          <FaCheckCircle size={12} /> Fully Paid
                        </span>
                      ) : safeFeeSummary.due > 0 ? (
                        <span className="sd-chip sd-chip-danger">
                          <FaClock size={12} /> Payment Due
                        </span>
                      ) : (
                        <span className="sd-chip sd-chip-warning">
                          <FaExclamationTriangle size={12} /> {safeFeeSummary.paymentStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sd-progress-section">
                    <div className="sd-progress-track">
                      <div
                        className={safeFeeSummary.due === 0 ? "sd-progress-fill-green" : "sd-progress-fill-danger"}
                        style={{
                          width: `${feeProgressPercent}%`,
                        }}
                      />
                    </div>
                  </div>

                  {safeFeeSummary.due > 0 &&
                    safeFeeSummary.paymentStatus !== "PAID" &&
                    safeFeeSummary.paymentStatus !== "NOT_GENERATED" && (
                      <div className="sd-fee-actions">
                        <Link to="/student/make-payment" className="sd-btn-primary">
                          <FaRupeeSign /> Pay Now ({formatCurrency(safeFeeSummary.due)})
                        </Link>
                      </div>
                    )}
                </>
              )}
            </div>
          </article>
        </div>

        {/* ================= 7. NOTIFICATIONS ================= */}
        <section className="sd-card" aria-label="Notifications">
          <header className="sd-card-header">
            <div className="sd-card-header-left">
              <div className="sd-card-header-icon" aria-hidden="true">
                <FaBell />
              </div>
              <div className="sd-card-title-wrap">
                <h2 className="sd-card-title">Latest Notifications</h2>
                <p className="sd-card-subtitle">Official announcements and campus notices</p>
              </div>
            </div>
            <Link to="/notification/student" className="sd-view-all-link">
              View All <FaArrowRight size={11} />
            </Link>
          </header>

          <div className="sd-card-body">
            {latestNotifications.length === 0 ? (
              <div className="sd-empty-state">
                <div className="sd-empty-icon-circle">
                  <FaCheckCircle />
                </div>
                <div className="sd-empty-text-wrap">
                  <span className="sd-empty-title">No new notifications</span>
                  <span className="sd-empty-subtitle">You are all caught up with announcements</span>
                </div>
              </div>
            ) : (
              <div className="sd-notifications-list" role="list">
                {latestNotifications.slice(0, 4).map((notification) => {
                  const handleNotificationClick = () => {
                    if (
                      notification.actionUrl &&
                      typeof notification.actionUrl === "string" &&
                      notification.actionUrl.startsWith("/")
                    ) {
                      navigate(notification.actionUrl);
                    } else {
                      navigate(`/notification/view/${notification._id}`);
                    }
                  };

                  return (
                    <div
                      key={notification._id}
                      role="button"
                      tabIndex={0}
                      className="sd-notif-card"
                      aria-label={`View notification: ${notification.title}`}
                      onClick={handleNotificationClick}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNotificationClick();
                        }
                      }}
                    >
                      <div className="sd-notif-icon-box" aria-hidden="true">
                        <FaBell />
                      </div>
                      <div className="sd-notif-content">
                        <h3 className="sd-notif-title">{notification.title}</h3>
                        <p className="sd-notif-message">{notification.message}</p>
                        <div className="sd-notif-meta">
                          <span className="sd-chip sd-chip-neutral">{notification.type || "General"}</span>
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}