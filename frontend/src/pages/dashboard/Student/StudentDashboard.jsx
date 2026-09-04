import { useEffect, useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { AuthContext } from "../../../auth/AuthContext";
import { logger } from "../../../utils/logger";
import {
  FaUserGraduate,
  FaBook,
  FaBuilding,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaClock,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaRupeeSign,
  FaBell,
  FaCalendarAlt,
  FaChartPie,
  FaChartBar,
  FaDownload,
  FaEye,
  FaWallet,
  FaGraduationCap,
  FaAward,
  FaTrophy,
  FaStar,
  FaSync,
   FaUniversity,
   FaClipboardCheck,
   FaFileAlt,
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
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PAGE_LOAD_TOAST_ID = "student-dashboard-load";

// Authentication / session error codes that must NOT surface a toast.
// These are routed exclusively to ApiError for a friendly mapped screen.
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

/* ==========================================================================
   Design tokens — same palette used across the app's other pages.
   ========================================================================== */
const T = {
  navy: "#1e3a5f",
  navyDark: "#14293f",
  navyTint: "#eaf0f6",
  teal: "#2d6e7e",
  tealTint: "#e5f1f3",
  amber: "#b56a1f",
  amberTint: "#fdf0e3",
  danger: "#b3261e",
  dangerTint: "#fbe9e7",
  bg: "#f6f7f9",
  surface: "#ffffff",
  row: "#fafbfc",
  border: "#e6e8ec",
  text: "#1f2530",
  textMuted: "#6b7280",
  success: "#157a4a",
  successBg: "#e3f6ec",
  inactive: "#6b7280",
  inactiveBg: "#eef0f2",
  radiusLg: 14,
  radiusMd: 10,
  radiusSm: 7,
  shadow: "0 1px 2px rgba(20,27,41,0.04), 0 2px 8px rgba(20,27,41,0.05)",
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/* ================= small presentational helpers (inline styles only) ================= */

function useMounted(delay = 10) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return mounted;
}

const fadeStyle = (mounted, delay = 0) => ({
  opacity: mounted ? 1 : 0,
  transform: mounted ? "translateY(0)" : "translateY(14px)",
  transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
});

function Btn({ children, onClick, color = T.navy, tint }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.85rem",
        fontWeight: 600,
        borderRadius: T.radiusSm,
        padding: "0.6rem 1.1rem",
        cursor: "pointer",
        color: hover ? "#fff" : color,
        background: hover ? color : T.surface,
        border: `1px solid ${color}`,
        transition: "all 0.15s ease",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {children}
    </button>
  );
}

function Card({ icon, title, tooltip, action, children, delay = 0, mounted, style }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusLg,
        boxShadow: T.shadow,
        overflow: "hidden",
        height: "100%",
        ...fadeStyle(mounted, delay),
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.1rem 1.35rem",
          borderBottom: `1px solid ${T.border}`,
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ color: T.navy, fontSize: "1.05rem", display: "flex" }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: T.text }}>{title}</h3>
          {tooltip && <InfoTooltip message={tooltip} />}
        </div>
        {action}
      </div>
      <div style={{ padding: "1.35rem" }}>{children}</div>
    </div>
  );
}

function InfoTooltip({ message }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <FaInfoCircle style={{ color: T.textMuted, fontSize: 12, cursor: "pointer" }} />
      {show && (
        <span
          style={{
            position: "absolute",
            top: "135%",
            left: "50%",
            transform: "translateX(-50%)",
            background: T.navyDark,
            color: "#fff",
            padding: "0.4rem 0.65rem",
            borderRadius: 6,
            fontSize: "0.72rem",
            whiteSpace: "nowrap",
            zIndex: 20,
            boxShadow: T.shadow,
          }}
        >
          {message}
        </span>
      )}
    </span>
  );
}

function ViewAllLink({ to, children }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: hover ? T.navyDark : T.navy,
        fontSize: "0.8rem",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

function ProgressBar({ percent, color, thick }) {
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  return (
    <div
      style={{
        width: "100%",
        height: thick ? 14 : 8,
        background: T.inactiveBg,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${safePercent}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

function Pill({ children, bg, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.22rem 0.55rem",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function EmptyRow({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: T.textMuted }}>
      <div style={{ fontSize: "2.2rem", opacity: 0.35, marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}>
        {icon}
      </div>
      <p style={{ margin: 0, fontSize: "0.85rem" }}>{text}</p>
    </div>
  );
}

// Custom Tooltip for recharts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: T.surface,
          padding: "0.65rem 0.9rem",
          borderRadius: T.radiusSm,
          boxShadow: T.shadow,
          border: `1px solid ${T.border}`,
        }}
      >
        <p style={{ margin: "0 0 0.4rem", fontWeight: 700, color: T.text, fontSize: "0.8rem" }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: "0.15rem 0", fontSize: "0.75rem", color: entry.fill }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const [hoveredStat, setHoveredStat] = useState(null);
  const [hoveredSubject, setHoveredSubject] = useState(null);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [hoveredNotif, setHoveredNotif] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [payHover, setPayHover] = useState(false);
  const mounted = useMounted();

  // Defensive: Safe access to attendance data
  const attendanceSummary = dashboardData?.attendanceSummary || {
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
    warning: false,
  };

  // Defensive: Safe access to student data
  const studentData = dashboardData?.student || {
    name: "Student",
    enrollmentNumber: "N/A",
    course: "Not Assigned",
    department: "Not Assigned",
    semester: 1,
  };

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/dashboard/student");
        if (!isCancelled) {
          setDashboardData(response.data);
        }
      } catch (err) {
        if (!isCancelled) {
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

          setError({
            message:
              "Failed to load dashboard. Please check your connection and try again.",
            statusCode,
            errorCode,
          });

          const isAuthError =
            statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

          if (!isAuthError) {
            toast.error("Failed to load dashboard. Please try again.", {
              position: "top-right",
              autoClose: 5000,
              icon: <FaExclamationTriangle />,
            });
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
      toast.dismiss(PAGE_LOAD_TOAST_ID);
    };
  }, [retryCount]);

  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    setIsRetrying(false);
  };

  // Handle go back action
  const handleGoBack = () => {
    navigate("/student/dashboard");
  };

  // Prepare Attendance Pie Chart Data (with defensive checks)
  const attendancePieData = [
    {
      name: "Present",
      value: attendanceSummary.present || 0,
      color: T.success,
    },
    {
      name: "Absent",
      value: attendanceSummary.absent || 0,
      color: T.danger,
    },
  ];

  // Prepare Subject-wise Bar Chart Data (with defensive checks)
  const subjectBarData =
    (dashboardData?.subjectWiseAttendance || []).map((subject) => ({
      subject: subject.subject || "Unknown",
      code: subject.code || "N/A",
      present: subject.present || 0,
      total: subject.total || 0,
      percentage: subject.percentage || 0,
    })) || [];

  // Loading State
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading your dashboard..." />;
  }

  // Error State
  if (error) {
    return (
      <ApiError
        title="Dashboard Loading Error"
        message={error.message || "Failed to load dashboard. Please try again."}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  if (!dashboardData) return null;

  const {
    subjectWiseAttendance = [],
    todaysTimetable = [],
    feeSummary,
    latestNotifications = [],
  } = dashboardData || {};

  // Keep external references in sync. The backend response key is
  // `todaysTimetable`; the rest of the component renders `todayTimetable`.
  const todayTimetable = todaysTimetable;

  // Set default values for feeSummary if not available
  const safeFeeSummary = feeSummary || {
    totalFee: 0,
    paid: 0,
    due: 0,
    paymentStatus: "NOT_GENERATED",
  };

  // Utility Functions
  const getFeeStatusColor = (status) => {
    const colors = {
      PAID: T.success,
      PARTIAL: T.amber,
      DUE: T.danger,
    };
    return colors[status] || T.textMuted;
  };

  const getAttendanceWarningColor = (percentage) => {
    if (percentage >= 75) return T.success;
    if (percentage >= 60) return T.amber;
    return T.danger;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const quickActions = [
    { icon: <FaChartPie />, label: "Attendance", path: "/my-attendance" },
    { icon: <FaCalendarAlt />, label: "Timetable", path: "/student/timetable" },
    { icon: <FaWallet />, label: "Fees", path: "/student/fees" },
    { icon: <FaFileAlt />, label: "My Results", path: "/student/results" },
    { icon: <FaUserGraduate />, label: "Profile", path: "/student/profile" },
    { icon: <FaBell />, label: "Notifications", path: "/notification/student" },
  ];

  const topInfoCards = [
    { icon: <FaUserGraduate />, value: studentData.name, label: "Student Name", color: T.navy, tint: T.navyTint },
    { icon: <FaGraduationCap />, value: studentData.course, label: "Current Course", color: T.teal, tint: T.tealTint },
    { icon: <FaUniversity />, value: studentData.department, label: "Department", color: T.amber, tint: T.amberTint },
    {
      icon: <FaClipboardCheck />,
      value: `${attendanceSummary.percentage}%`,
      label: "Attendance",
      color: getAttendanceWarningColor(attendanceSummary.percentage),
      tint: T.inactiveBg,
    },
  ];

  const maxSubjectTotal =
    subjectBarData.length > 0 ? Math.max(...subjectBarData.map((s) => s.total)) : 0;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.font, color: T.text }}>
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

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "1.5rem" }}>
        {/* ================= HEADER ================= */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            boxShadow: T.shadow,
            padding: "1.35rem 1.6rem",
            marginBottom: "1.25rem",
            ...fadeStyle(mounted, 0),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: T.radiusMd,
                background: T.navyTint,
                color: T.navy,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                flexShrink: 0,
              }}
            >
              <FaGraduationCap />
            </div>
            <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: T.text }}>
              Welcome, {studentData.name}!
            </h1>
          </div>
          <Btn onClick={handleRetry} color={T.navy}>
            <FaSync size={13} /> Refresh
          </Btn>
        </div>

        {/* ================= QUICK ACTIONS ================= */}
        <div style={{ marginBottom: "1.25rem" }}>
          <Card icon={<FaStar />} title="Quick Actions" tooltip="Frequently used actions" mounted={mounted} delay={0.05}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "0.85rem",
              }}
            >
              {quickActions.map((qa, idx) => {
                const hovered = hoveredAction === idx;
                return (
                  <Link
                    key={idx}
                    to={qa.path}
                    onMouseEnter={() => setHoveredAction(idx)}
                    onMouseLeave={() => setHoveredAction(null)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "1.1rem 0.75rem",
                      borderRadius: T.radiusMd,
                      background: hovered ? T.navy : T.row,
                      color: hovered ? "#fff" : T.navy,
                      textDecoration: "none",
                      border: `1px solid ${hovered ? T.navy : T.border}`,
                      transition: "all 0.2s ease",
                      transform: hovered ? "translateY(-3px)" : "translateY(0)",
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>{qa.icon}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{qa.label}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ================= INFO CARDS ROW ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          {topInfoCards.map((c, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.9rem",
                padding: "1.1rem 1.25rem",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: T.radiusLg,
                boxShadow: T.shadow,
                ...fadeStyle(mounted, 0.1 + idx * 0.03),
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: T.radiusMd,
                  background: c.tint,
                  color: c.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                {c.icon}
              </div>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: T.text }}>{c.value}</div>
                <div style={{ fontSize: "0.78rem", color: T.textMuted }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
          {/* ATTENDANCE SUMMARY */}
          <div style={{ flex: "2 1 560px" }}>
            <Card
              icon={<FaChartPie />}
              title="Attendance Summary"
              tooltip="Your overall attendance statistics"
              action={<ViewAllLink to="/my-attendance"><FaEye size={12} /> View All</ViewAllLink>}
              mounted={mounted}
              delay={0.15}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {[
                  { key: "present", icon: <FaCheckCircle />, value: attendanceSummary.present, label: "Present", color: T.success },
                  { key: "absent", icon: <FaTimesCircle />, value: attendanceSummary.absent, label: "Absent", color: T.danger },
                  { key: "total", icon: <FaClock />, value: attendanceSummary.total, label: "Total", color: T.navy },
                ].map((stat) => {
                  const hovered = hoveredStat === stat.key;
                  return (
                    <div
                      key={stat.key}
                      role="listitem"
                      aria-label={`${stat.value} lectures ${stat.label.toLowerCase()}`}
                      onMouseEnter={() => setHoveredStat(stat.key)}
                      onMouseLeave={() => setHoveredStat(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.7rem",
                        padding: "0.9rem",
                        background: hovered ? T.navyTint : T.row,
                        borderRadius: T.radiusMd,
                        transition: "all 0.2s ease",
                        transform: hovered ? "translateY(-2px)" : "translateY(0)",
                      }}
                    >
                      <span style={{ fontSize: "1.3rem", color: stat.color, flexShrink: 0 }}>{stat.icon}</span>
                      <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{stat.value}</div>
                        <div style={{ fontSize: "0.68rem", color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ width: "100%", height: 280, marginBottom: "1.5rem" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendancePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                    >
                      {attendancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: getAttendanceWarningColor(attendanceSummary.percentage),
                    marginBottom: "0.6rem",
                  }}
                >
                  {attendanceSummary.percentage}% Overall Attendance
                </div>
                {attendanceSummary.warning && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      background: T.amberTint,
                      color: T.amber,
                      borderRadius: 20,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      marginBottom: "0.85rem",
                    }}
                  >
                    <FaExclamationTriangle aria-hidden="true" />
                    <span>Low Attendance! Minimum 75% required for exam eligibility.</span>
                  </div>
                )}
                <div
                  role="progressbar"
                  aria-valuenow={attendanceSummary.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Attendance progress: ${attendanceSummary.percentage}%`}
                  style={{ position: "relative", marginTop: "0.5rem" }}
                >
                  <ProgressBar percent={attendanceSummary.percentage} color={getAttendanceWarningColor(attendanceSummary.percentage)} thick />
                  <div style={{ position: "absolute", left: "75%", top: -6, transform: "translateX(-50%)", width: 2, height: 14, background: T.danger }} />
                </div>
                <div style={{ fontSize: "0.7rem", color: T.danger, fontWeight: 600, marginTop: "0.3rem" }}>75% Minimum</div>
              </div>
            </Card>
          </div>

          {/* SUBJECT-WISE ATTENDANCE */}
          <div style={{ flex: "1 1 360px" }}>
            <Card
              icon={<FaChartBar />}
              title="Subject-wise Attendance"
              tooltip="Attendance breakdown by subject. Subjects with low attendance are highlighted."
              mounted={mounted}
              delay={0.18}
            >
              <div style={{ width: "100%", height: 320, marginBottom: "1.5rem" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectBarData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="code" tick={{ fontSize: 11, fontWeight: 500 }} interval={0} height={50} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Lectures", angle: -90, position: "insideLeft", fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <ReferenceLine
                      y={maxSubjectTotal * 0.75}
                      stroke={T.danger}
                      strokeDasharray="3 3"
                      label={{ value: "75% Target", fill: T.danger, fontSize: 10, position: "right" }}
                    />
                    <Bar dataKey="present" name="Present" radius={[6, 6, 0, 0]} animationDuration={1000}>
                      {subjectBarData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.percentage >= 75 ? T.success : entry.percentage >= 60 ? T.amber : T.danger}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="total" name="Total" fill="#aebdcc" radius={[6, 6, 0, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {subjectWiseAttendance.length === 0 ? (
                <EmptyRow icon={<FaChartBar />} text="No subject attendance data available" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }} role="list" aria-label="Subject-wise attendance list">
                  {[...subjectWiseAttendance]
                    .sort((a, b) => a.percentage - b.percentage)
                    .map((subject, index) => {
                      const attendanceColor = getAttendanceWarningColor(subject.percentage);
                      const needsAttention = subject.percentage < 75;
                      const lecturesNeeded = Math.ceil(
                        (75 * (subject.present + subject.total - subject.present)) / 25 - subject.present,
                      );
                      const hovered = hoveredSubject === index;
                      return (
                        <div
                          key={index}
                          role="listitem"
                          aria-label={`${subject.subject}: ${subject.percentage}% attendance`}
                          onMouseEnter={() => setHoveredSubject(index)}
                          onMouseLeave={() => setHoveredSubject(null)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.6rem",
                            padding: "1rem",
                            borderRadius: T.radiusMd,
                            background: needsAttention ? T.dangerTint : hovered ? T.navyTint : T.row,
                            borderLeft: `4px solid ${needsAttention ? T.danger : "transparent"}`,
                            transition: "all 0.2s ease",
                            transform: hovered ? "translateX(4px)" : "translateX(0)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: T.text, fontSize: "0.92rem" }}>{subject.subject}</span>
                              <Pill bg={T.inactiveBg} color={T.textMuted}>{subject.code}</Pill>
                            </div>
                            {needsAttention && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "0.25rem 0.6rem",
                                  background: T.danger,
                                  color: "#fff",
                                  borderRadius: 12,
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}
                              >
                                <FaExclamationTriangle size={10} /> Needs Attention
                              </span>
                            )}
                          </div>
                          <div>
                            <ProgressBar percent={subject.percentage} color={attendanceColor} thick />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: attendanceColor }}>{subject.percentage}%</span>
                              <span style={{ fontSize: "0.78rem", color: T.textMuted, fontWeight: 600 }}>
                                {subject.present}/{subject.total}
                              </span>
                            </div>
                            {needsAttention && lecturesNeeded > 0 && lecturesNeeded < subject.total && (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: T.danger,
                                  fontWeight: 600,
                                  background: "rgba(179,38,30,0.08)",
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: 6,
                                  textAlign: "center",
                                  marginTop: "0.4rem",
                                }}
                              >
                                Need {lecturesNeeded} more to reach 75%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </div>

          {/* TODAY'S TIMETABLE */}
          <div style={{ flex: "1 1 440px" }}>
            <Card
              icon={<FaCalendarAlt />}
              title="Today's Timetable"
              tooltip="Your scheduled classes for today"
              action={<ViewAllLink to="/student/timetable"><FaEye size={12} /> Full Timetable</ViewAllLink>}
              mounted={mounted}
              delay={0.21}
            >
              {todayTimetable.length === 0 ? (
                <EmptyRow icon={<FaCalendarAlt />} text="No classes scheduled for today" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {[...todayTimetable]
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((slot, index) => {
                      const hovered = hoveredSlot === index;
                      return (
                        <div
                          key={index}
                          onMouseEnter={() => setHoveredSlot(index)}
                          onMouseLeave={() => setHoveredSlot(null)}
                          style={{
                            display: "flex",
                            gap: "1rem",
                            padding: "1rem",
                            borderRadius: T.radiusMd,
                            background: hovered ? T.navyTint : T.row,
                            borderLeft: `4px solid ${T.navy}`,
                            transition: "all 0.2s ease",
                            transform: hovered ? "translateX(4px)" : "translateX(0)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 84,
                              padding: "0.6rem",
                              background: T.surface,
                              borderRadius: T.radiusSm,
                              textAlign: "center",
                              border: `1px solid ${T.border}`,
                            }}
                          >
                            <FaClock style={{ color: T.navy, marginBottom: 4 }} />
                            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.navy }}>{slot.startTime}</div>
                            <div style={{ fontSize: "0.68rem", color: T.textMuted }}>to {slot.endTime}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.92rem", color: T.text, fontWeight: 700 }}>{slot.subject}</h4>
                            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                              <Pill bg={T.inactiveBg} color={T.textMuted}>{slot.code}</Pill>
                              <Pill bg={T.navy} color="#fff">{slot.slotType}</Pill>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem", fontSize: "0.78rem", color: T.textMuted }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <FaChalkboardTeacher /> {slot.teacher}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <FaMapMarkerAlt /> Room {slot.room}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </div>

          {/* FEE SUMMARY */}
          <div style={{ flex: "1 1 360px" }}>
            <Card
              icon={<FaWallet />}
              title="Fee Summary"
              tooltip="Your fee payment status"
              action={<ViewAllLink to="/student/fees"><FaEye size={12} /> View Details</ViewAllLink>}
              mounted={mounted}
              delay={0.24}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem", marginBottom: "1.25rem" }}>
                <div style={{ textAlign: "center", padding: "0.85rem", background: T.row, borderRadius: T.radiusMd }}>
                  <div style={{ fontSize: "0.68rem", color: T.textMuted, marginBottom: "0.4rem", fontWeight: 600, textTransform: "uppercase" }}>
                    Total Fee
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: T.text }}>{formatCurrency(safeFeeSummary.totalFee)}</div>
                </div>
                <div style={{ textAlign: "center", padding: "0.85rem", background: T.row, borderRadius: T.radiusMd }}>
                  <div style={{ fontSize: "0.68rem", color: T.textMuted, marginBottom: "0.4rem", fontWeight: 600, textTransform: "uppercase" }}>
                    Paid
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: T.success }}>{formatCurrency(safeFeeSummary.paid)}</div>
                </div>
                <div style={{ textAlign: "center", padding: "0.85rem", background: T.row, borderRadius: T.radiusMd }}>
                  <div style={{ fontSize: "0.68rem", color: T.textMuted, marginBottom: "0.4rem", fontWeight: 600, textTransform: "uppercase" }}>
                    Due
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: T.danger }}>{formatCurrency(safeFeeSummary.due)}</div>
                </div>
              </div>

              <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.45rem 1.2rem",
                    borderRadius: 999,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    background: getFeeStatusColor(safeFeeSummary.paymentStatus),
                  }}
                >
                  {safeFeeSummary.paymentStatus}
                </span>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: T.textMuted, fontWeight: 600, marginBottom: "0.4rem" }}>
                  <span>Payment Progress</span>
                  <span>{Math.round((safeFeeSummary.paid / safeFeeSummary.totalFee) * 100)}%</span>
                </div>
                <ProgressBar
                  percent={(safeFeeSummary.paid / safeFeeSummary.totalFee) * 100}
                  color={getFeeStatusColor(safeFeeSummary.paymentStatus)}
                />
              </div>

              {safeFeeSummary.paymentStatus !== "PAID" && (
                <Link
                  to="/student/make-payment"
                  onMouseEnter={() => setPayHover(true)}
                  onMouseLeave={() => setPayHover(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "0.85rem",
                    background: payHover ? "#116139" : T.success,
                    color: "#fff",
                    borderRadius: T.radiusSm,
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    transform: payHover ? "translateY(-1px)" : "translateY(0)",
                  }}
                >
                  <FaRupeeSign /> Pay Now
                </Link>
              )}
            </Card>
          </div>

          {/* LATEST NOTIFICATIONS */}
          <div style={{ flex: "1 1 100%" }}>
            <Card
              icon={<FaBell />}
              title="Latest Notifications"
              tooltip="Recent announcements and updates"
              action={<ViewAllLink to="/notification/student"><FaEye size={12} /> View All</ViewAllLink>}
              mounted={mounted}
              delay={0.27}
            >
              {latestNotifications?.length === 0 ? (
                <EmptyRow icon={<FaBell />} text="No new notifications" />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.85rem" }}>
                  {latestNotifications.slice(0, 5).map((notification) => {
                    const hovered = hoveredNotif === notification._id;
                    return (
                      <div
                        key={notification._id}
                        onMouseEnter={() => setHoveredNotif(notification._id)}
                        onMouseLeave={() => setHoveredNotif(null)}
                        style={{
                          display: "flex",
                          gap: "0.9rem",
                          padding: "1rem",
                          borderRadius: T.radiusMd,
                          background: !notification.isRead ? T.navyTint : T.row,
                          borderLeft: `4px solid ${!notification.isRead ? T.navy : T.border}`,
                          transition: "all 0.2s ease",
                          transform: hovered ? "translateX(4px)" : "translateX(0)",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: T.surface,
                            border: `1px solid ${T.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <FaBell style={{ color: notification.isRead ? T.textMuted : T.navy }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.9rem", color: T.text, fontWeight: 700 }}>{notification.title}</h4>
                          <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: T.textMuted, lineHeight: 1.5 }}>{notification.message}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", flexWrap: "wrap", gap: "0.4rem" }}>
                            <Pill bg={T.inactiveBg} color={T.textMuted}>{notification.type}</Pill>
                            <span style={{ color: T.textMuted }}>{formatDate(notification.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}