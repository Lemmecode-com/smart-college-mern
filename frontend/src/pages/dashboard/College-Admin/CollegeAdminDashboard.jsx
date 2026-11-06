import React, { useContext, useEffect, useState, useCallback, useRef, memo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../../components/Loading";
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
  FaBarcode,
  FaChartBar,
  FaChartPie,
} from "react-icons/fa";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
    description: "Review student applications",
    path: "/students/approve",
    ariaLabel: "Review and approve students",
  },
  {
    id: "staff",
    icon: FaChalkboardTeacher,
    label: "Manage Staff",
    description: "View and manage faculty",
    path: "/college/staff",
    ariaLabel: "View and manage teaching staff",
  },
  {
    id: "departments",
    icon: FaLayerGroup,
    label: "Departments",
    description: "Organize academic departments",
    path: "/departments",
    ariaLabel: "Manage college departments",
  },
  {
    id: "courses",
    icon: FaGraduationCap,
    label: "Courses",
    description: "Manage academic offerings",
    path: "/courses",
    ariaLabel: "Manage course offerings",
  },
  {
    id: "reports",
    icon: FaFileAlt,
    label: "Student Reports",
    description: "Review student and payment data",
    path: "/college-admin/reports-dashboard",
    ariaLabel: "View student and payment reports",
  },
  {
    id: "notifications",
    icon: FaBell,
    label: "Notifications",
    description: "Send institution announcements",
    path: "/notification/create",
    ariaLabel: "Send institution announcement",
  },
  {
    id: "settings",
    icon: FaCogs,
    label: "System Settings",
    description: "Manage system preferences",
    path: "/system-settings/general",
    ariaLabel: "Manage system preferences",
  },
];

/* ================= MAIN DASHBOARD COMPONENT ================= */
export default function CollegeAdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= STATE & REFS ================= */
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
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
  const [admissionAnalytics, setAdmissionAnalytics] = useState(null);
  const [coursesByDepartment, setCoursesByDepartment] = useState([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState(null);
  const [showAllStudentDepartments, setShowAllStudentDepartments] = useState(false);
  const [courseDepartmentSearch, setCourseDepartmentSearch] = useState("");
  const [courseDepartmentSort, setCourseDepartmentSort] = useState("desc");
  const [teacherDepartmentSearch, setTeacherDepartmentSearch] = useState("");
  const [teacherDepartmentSort, setTeacherDepartmentSort] = useState("desc");

  const isMountedRef = useRef(true);
  const collegeRef = useRef(college);

  useEffect(() => {
    collegeRef.current = college;
  }, [college]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /* ================= LOAD DASHBOARD DATA ================= */
  const loadDashboardData = useCallback(async (signal = null) => {
    if (!user || user.role !== "COLLEGE_ADMIN") return;

    try {
      setStatus("loading");
      setError(null);

      const res = await api.get("/dashboard/college-admin", { signal });
      if (signal?.aborted || !isMountedRef.current) return;

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
      setDashboardAnalytics(data.analytics || null);

      const [admissionsResult, coursesResult] = await Promise.allSettled([
        api.get("/reports/admissions/college-admin-summary", { signal }),
        api.get("/courses", { signal }),
      ]);
      if (signal?.aborted || !isMountedRef.current) return;

      if (admissionsResult.status === "fulfilled") {
        setAdmissionAnalytics(admissionsResult.value.data);
      } else {
        logger.error("College admin admission analytics load error:", admissionsResult.reason);
        setAdmissionAnalytics(null);
      }

      if (coursesResult.status === "fulfilled") {
        const responseData = coursesResult.value.data;
        const courses = Array.isArray(responseData?.data)
          ? responseData.data
          : Array.isArray(responseData)
            ? responseData
            : [];
        const counts = new Map();
        courses.forEach((course) => {
          const departmentName = course.department?.name;
          if (!departmentName) return;
          counts.set(departmentName, (counts.get(departmentName) || 0) + 1);
        });
        setCoursesByDepartment(
          [...counts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        );
      } else {
        logger.error("College admin course distribution load error:", coursesResult.reason);
        setCoursesByDepartment([]);
      }

      setStatus("success");
    } catch (err) {
      if (
        signal?.aborted ||
        axios.isCancel?.(err) ||
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        err?.code === "ERR_CANCELED"
      ) {
        return;
      }

      if (!isMountedRef.current) return;

      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage =
        backendMessage ||
        "Failed to load dashboard data. Please try again.";

      logger.error("College admin dashboard load error:", statusCode, errorCode);

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      // If college data is not loaded yet (initial load failure), record error for the error gate
      if (!collegeRef.current) {
        setError({
          message: errorMessage,
          statusCode,
          errorCode,
        });
        setStatus("error");
      }

      // User-facing error notification
      if (!isAuthError) {
        toast.error(errorMessage);
      }
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboardData(controller.signal);
    return () => {
      controller.abort();
    };
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

  /* ================= LOADING GATE ================= */
  if (status === "loading") {
    return (
      <div className="cad-page">
        <div className="cad-container cad-state-wrap">
          <Loading
            size="md"
            color="primary"
            text="Loading College Dashboard..."
          />
        </div>
      </div>
    );
  }

  /* ================= ERROR GATE ================= */
  if (status === "error" && !college) {
    return (
      <div className="cad-page">
        <div className="cad-container cad-state-wrap">
          <div className="cad-error-card" role="alert">
            <FaExclamationTriangle className="cad-error-icon" aria-hidden="true" />
            <h2 className="cad-error-title">Dashboard Loading Error</h2>
            <p className="cad-error-msg">{error?.message || "Failed to load dashboard data. Please try again."}</p>
            <button
              type="button"
              className="cad-btn-retry"
              onClick={() => loadDashboardData()}
            >
              <FaSyncAlt aria-hidden="true" />
              <span>Retry Loading</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= MAIN DASHBOARD GUARD ================= */
  // Ensure dashboard only renders on success with valid college data
  if (status !== "success" || !college) {
    return null;
  }

  // Filter pending students out of recent activities
  const nonPendingRecentStudents = recentStudents.filter(
    (student) => (student?.status || "").toUpperCase() !== "PENDING"
  );
  const admissionChartData = admissionAnalytics
    ? [
        { name: "Active admissions", count: Number(admissionAnalytics.approved) || 0, color: "#0f6b78" },
        { name: "Pending", count: Number(admissionAnalytics.pending) || 0, color: "#d99a2b" },
        { name: "Rejected", count: Number(admissionAnalytics.rejected) || 0, color: "#c75b5b" },
      ]
    : [];
  const admissionChartTotal = Number(admissionAnalytics?.totalApplications) || 0;
  const categorizedAdmissions = admissionChartData.reduce((total, item) => total + item.count, 0);
  const admissionChartSegments = admissionChartTotal > categorizedAdmissions
    ? [...admissionChartData, {
        name: "Other statuses",
        count: admissionChartTotal - categorizedAdmissions,
        color: "#94a3b8",
      }]
    : admissionChartData;
  const sortDepartments = (departments, direction = "desc") => [...departments].sort((a, b) => (
    (direction === "asc" ? a.count - b.count : b.count - a.count)
      || String(a.name).localeCompare(String(b.name))
  ));
  const studentDepartmentData = sortDepartments(dashboardAnalytics?.studentsByDepartment || []);
  const teacherDepartmentData = sortDepartments(dashboardAnalytics?.teachersByDepartment || []);
  const courseDepartmentData = sortDepartments(dashboardAnalytics?.coursesByDepartment || coursesByDepartment);
  const studentDonutDepartments = studentDepartmentData.length > 6
    ? [
        ...studentDepartmentData.slice(0, 5),
        {
          id: "other",
          name: "Other",
          count: studentDepartmentData.slice(5).reduce((sum, department) => sum + department.count, 0),
          color: "#94a3b8",
        },
      ]
    : studentDepartmentData;
  const filterDepartments = (departments, query, sort) => {
    const search = query.trim().toLocaleLowerCase();
    return sortDepartments(
      departments.filter((department) => String(department.name).toLocaleLowerCase().includes(search)),
      sort,
    );
  };
  const visibleCourseDepartments = filterDepartments(courseDepartmentData, courseDepartmentSearch, courseDepartmentSort);
  const visibleTeacherDepartments = filterDepartments(teacherDepartmentData, teacherDepartmentSearch, teacherDepartmentSort);
  const statusColorMap = {
    APPROVED: "#0f766e",
    PENDING: "#d99a2b",
    REJECTED: "#c75b5b",
    OFFER_MADE: "#168aad",
    SEAT_CONFIRMED: "#5876b7",
    ENROLLED: "#39845a",
    ALUMNI: "#7c67a7",
    INACTIVE: "#7b8794",
    DELETED: "#9b6b5b",
    DEACTIVATED: "#596579",
    UNSPECIFIED: "#94a3b8",
  };
  const detailedAdmissionStatuses = (dashboardAnalytics?.studentsByStatus || []).map((item) => ({
    name: item.status === "UNSPECIFIED"
      ? "Unspecified"
      : item.status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    count: Number(item.count) || 0,
    color: statusColorMap[item.status] || "#8b9aa8",
  }));
  const detailedAdmissionTotal = detailedAdmissionStatuses.reduce((sum, item) => sum + item.count, 0);
  const admissionsChart = detailedAdmissionStatuses.length > 0
    ? detailedAdmissionStatuses
    : admissionChartSegments;
  const admissionsTotal = detailedAdmissionStatuses.length > 0
    ? detailedAdmissionTotal
    : admissionChartTotal;
  const departmentColors = ["#0f6b78", "#138496", "#3b82a0", "#5b8fa8", "#758fa0", "#93a4ad", "#537c79", "#78916e"];
  const admissionsTrend = dashboardAnalytics?.admissionsTrend || [];
  const renderDepartmentDonut = (data, total, ariaLabel, totalLabel, showPercentages = false) => (
    <div className="cad-admissions-chart">
      <div className="cad-donut-wrap">
        <ResponsiveContainer width="100%" height={174}>
          <PieChart>
            <Pie
              data={data.filter((item) => item.count > 0)}
              dataKey="count"
              nameKey="name"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={2}
              stroke="none"
              aria-label={ariaLabel}
            >
              {data.filter((item) => item.count > 0).map((item, index) => (
                <Cell key={item.id || item.name} fill={item.color || departmentColors[index % departmentColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [Number(value).toLocaleString(), name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="cad-donut-center">
          <strong>{total.toLocaleString()}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
      <div className="cad-chart-legend">
        {data.map((item, index) => (
          <div className="cad-chart-legend-row" key={item.id || item.name}>
            <span className="cad-chart-legend-label">
              <i style={{ backgroundColor: item.color || departmentColors[index % departmentColors.length] }} />
              <span>{item.name}</span>
            </span>
            <strong>
              {item.count.toLocaleString()}
              {showPercentages && (
                <small>{total > 0 ? `${((item.count / total) * 100).toFixed(1)}%` : "0.0%"}</small>
              )}
            </strong>
          </div>
        ))}
      </div>
    </div>
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
            {college?.email && (
              <div className="cad-chip" title="College email">
                <FaEnvelope className="cad-chip-icon" aria-hidden="true" />
                <span>{college.email}</span>
              </div>
            )}

            {college?.establishedYear && (
              <div className="cad-chip" title="Established year">
                <FaCalendarAlt className="cad-chip-icon" aria-hidden="true" />
                <span>Est. {college.establishedYear}</span>
              </div>
            )}

            {college?.code && (
              <div className="cad-chip" title="College code">
                <FaBarcode className="cad-chip-icon" aria-hidden="true" />
                <span>Code: {college.code.toUpperCase()}</span>
                <button
                  type="button"
                  className="cad-chip-copy"
                  onClick={handleCopyCode}
                  title="Copy college code"
                  aria-label="Copy college code"
                >
                  {copiedCode ? <FaCheck style={{ color: "#86efac" }} /> : <FaCopy />}
                </button>
              </div>
            )}

            <div className="cad-chip cad-chip-badge">
              <FaCheckCircle aria-hidden="true" />
              <span>Active Institution</span>
            </div>
          </div>
        </header>

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
                  {stats.totalStudents.toLocaleString()}
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
                  {stats.totalTeachers.toLocaleString()}
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
                  {stats.totalDepartments.toLocaleString()}
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
                  {stats.totalCourses.toLocaleString()}
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
                  {stats.pendingAdmissions.toLocaleString()}
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
                  <div className="cad-stat-helper">
                    {college?.registrationUrl
                      ? "Shareable link for student self-enrollment"
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

        <section className="cad-section cad-quick-actions-section" aria-labelledby="cad-quick-actions-title">
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
                    <span className="cad-quick-action-copy">
                      <span className="cad-quick-action-label">{action.label}</span>
                      <span className="cad-quick-action-description">{action.description}</span>
                    </span>
                    <FaArrowRight className="cad-quick-action-arrow" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="cad-analytics-grid" aria-label="Institutional analytics">
          <div className="cad-analytics-column">
          <section className="cad-section cad-analytics-card" aria-labelledby="cad-admissions-analytics-title">
            <div className="cad-section-header">
              <div className="cad-section-title-wrap">
                <h2 id="cad-admissions-analytics-title" className="cad-section-title">Admissions Analytics</h2>
                <p className="cad-section-subtitle">Application status and monthly registrations</p>
              </div>
              <FaChartPie className="cad-analytics-heading-icon" aria-hidden="true" />
            </div>
            <div className="cad-section-body">
              {admissionsChart.length > 0 && admissionsTotal > 0 ? (
                <div className="cad-admissions-visuals">
                  {renderDepartmentDonut(admissionsChart, admissionsTotal, "Admissions by student status", "Records")}
                  {admissionsTrend.length > 0 && (
                    <div className="cad-trend-chart">
                      <div className="cad-trend-heading">
                        <span>Monthly registrations</span>
                        <span><i /> New students</span>
                      </div>
                      <ResponsiveContainer width="100%" height={112}>
                        <LineChart data={admissionsTrend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                          <CartesianGrid stroke="#edf1f4" vertical={false} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 10 }} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 10 }} />
                          <Tooltip
                            labelFormatter={(_, payload) => payload?.[0]?.payload
                              ? `${payload[0].payload.month} ${payload[0].payload.year}`
                              : ""}
                            formatter={(value) => [Number(value).toLocaleString(), "New students"]}
                          />
                          <Line type="monotone" dataKey="count" stroke="#168496" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="cad-analytics-empty">
                  <FaChartPie aria-hidden="true" />
                  <span>{admissionAnalytics ? "No admission applications to display." : "Admission analytics are unavailable."}</span>
                </div>
              )}
            </div>
          </section>

          <section className="cad-section cad-analytics-card" aria-labelledby="cad-student-distribution-title">
            <div className="cad-section-header">
              <div className="cad-section-title-wrap">
                <h2 id="cad-student-distribution-title" className="cad-section-title">Student Distribution</h2>
                <p className="cad-section-subtitle">Student count and share by department</p>
              </div>
              <FaChartPie className="cad-analytics-heading-icon" aria-hidden="true" />
            </div>
            <div className="cad-section-body">
              {studentDepartmentData.length > 0
                ? (
                  <>
                    {renderDepartmentDonut(studentDonutDepartments, stats.totalStudents, "Students by department", "Students", true)}
                    {studentDepartmentData.length > 6 && (
                      <button
                        type="button"
                        className="cad-chart-view-all"
                        aria-expanded={showAllStudentDepartments}
                        onClick={() => setShowAllStudentDepartments((current) => !current)}
                      >
                        {showAllStudentDepartments ? "Show fewer departments" : `View all ${studentDepartmentData.length} departments`}
                      </button>
                    )}
                    {showAllStudentDepartments && (
                      <div className="cad-student-department-list" aria-label="Complete student department distribution">
                        {studentDepartmentData.map((department) => (
                          <div className="cad-chart-legend-row" key={department.id || department.name}>
                            <span className="cad-chart-legend-label">{department.name}</span>
                            <strong>
                              {department.count.toLocaleString()}
                              <small>{stats.totalStudents > 0 ? `${((department.count / stats.totalStudents) * 100).toFixed(1)}%` : "0.0%"}</small>
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
                : (
                  <div className="cad-analytics-empty">
                    <FaUsers aria-hidden="true" />
                    <span>No student department records are available.</span>
                  </div>
                )}
            </div>
          </section>
          </div>

          <div className="cad-analytics-column">
          <section className="cad-section cad-analytics-card" aria-labelledby="cad-course-distribution-title">
            <div className="cad-section-header">
              <div className="cad-section-title-wrap">
                <h2 id="cad-course-distribution-title" className="cad-section-title">Course Distribution</h2>
                <p className="cad-section-subtitle">Courses grouped by department</p>
              </div>
              <FaChartBar className="cad-analytics-heading-icon" aria-hidden="true" />
            </div>
            <div className="cad-section-body">
              {courseDepartmentData.length > 0 ? (
                <>
                  {courseDepartmentData.length > 8 && (
                    <div className="cad-department-chart-controls">
                      <label className="cad-department-search">
                        <span className="cad-sr-only">Search course departments</span>
                        <input
                          type="search"
                          value={courseDepartmentSearch}
                          onChange={(event) => setCourseDepartmentSearch(event.target.value)}
                          placeholder="Search departments"
                        />
                      </label>
                      <label className="cad-department-sort">
                        <span>Sort</span>
                        <select value={courseDepartmentSort} onChange={(event) => setCourseDepartmentSort(event.target.value)}>
                          <option value="desc">Most courses</option>
                          <option value="asc">Fewest courses</option>
                        </select>
                      </label>
                    </div>
                  )}
                  {visibleCourseDepartments.length > 0 ? (
                    <div className="cad-course-chart-scroll" aria-label="Course counts by department">
                      <div className="cad-course-chart" style={{ height: Math.max(180, visibleCourseDepartments.length * 32) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={visibleCourseDepartments} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
                            <CartesianGrid stroke="#edf1f4" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} domain={[0, (max) => Math.max(1, max * 1.12)]} axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 11 }} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={110}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#475569", fontSize: 11 }}
                              tickFormatter={(value) => value.length > 17 ? `${value.slice(0, 16)}…` : value}
                            />
                            <Tooltip labelFormatter={(label) => label} formatter={(value) => [Number(value).toLocaleString(), "Courses"]} />
                            <Bar dataKey="count" fill="#176579" radius={[0, 5, 5, 0]} maxBarSize={18}>
                              <LabelList dataKey="count" position="right" fill="#475569" fontSize={10} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="cad-analytics-empty cad-filter-empty">No departments match this search.</div>
                  )}
                  {courseDepartmentData.length > 8 && (
                    <p className="cad-chart-scroll-hint">
                      Showing {visibleCourseDepartments.length} of {courseDepartmentData.length} departments. Scroll to view more.
                    </p>
                  )}
                </>
              ) : (
                <div className="cad-analytics-empty">
                  <FaChartBar aria-hidden="true" />
                  <span>No courses are available for this institution.</span>
                </div>
              )}
            </div>
          </section>

          <section className="cad-section cad-analytics-card" aria-labelledby="cad-faculty-distribution-title">
            <div className="cad-section-header">
              <div className="cad-section-title-wrap">
                <h2 id="cad-faculty-distribution-title" className="cad-section-title">Faculty Overview</h2>
                <p className="cad-section-subtitle">Teacher headcount by department</p>
              </div>
              <FaChalkboardTeacher className="cad-analytics-heading-icon" aria-hidden="true" />
            </div>
            <div className="cad-section-body">
              {teacherDepartmentData.length > 0 ? (
                <>
                  {teacherDepartmentData.length > 8 && (
                    <div className="cad-department-chart-controls">
                      <label className="cad-department-search">
                        <span className="cad-sr-only">Search faculty departments</span>
                        <input
                          type="search"
                          value={teacherDepartmentSearch}
                          onChange={(event) => setTeacherDepartmentSearch(event.target.value)}
                          placeholder="Search departments"
                        />
                      </label>
                      <label className="cad-department-sort">
                        <span>Sort</span>
                        <select value={teacherDepartmentSort} onChange={(event) => setTeacherDepartmentSort(event.target.value)}>
                          <option value="desc">Most teachers</option>
                          <option value="asc">Fewest teachers</option>
                        </select>
                      </label>
                    </div>
                  )}
                  {visibleTeacherDepartments.length > 0 ? (
                    <>
                      <div className="cad-chart-series-label"><i /> Teachers</div>
                      <div className="cad-course-chart-scroll" aria-label="Teacher counts by department">
                        <div className="cad-course-chart" style={{ height: Math.max(180, visibleTeacherDepartments.length * 32) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={visibleTeacherDepartments} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
                              <CartesianGrid stroke="#edf1f4" horizontal={false} />
                              <XAxis type="number" allowDecimals={false} domain={[0, (max) => Math.max(1, max * 1.12)]} axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 11 }} />
                              <YAxis
                                type="category"
                                dataKey="name"
                                width={110}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#475569", fontSize: 11 }}
                                tickFormatter={(value) => value.length > 17 ? `${value.slice(0, 16)}…` : value}
                              />
                              <Tooltip labelFormatter={(label) => label} formatter={(value) => [Number(value).toLocaleString(), "Teachers"]} />
                              <Bar dataKey="count" fill="#168496" radius={[0, 5, 5, 0]} maxBarSize={18}>
                                <LabelList dataKey="count" position="right" fill="#475569" fontSize={10} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="cad-analytics-empty cad-filter-empty">No departments match this search.</div>
                  )}
                  {teacherDepartmentData.length > 8 && (
                    <p className="cad-chart-scroll-hint">
                      Showing {visibleTeacherDepartments.length} of {teacherDepartmentData.length} departments. Scroll to view more.
                    </p>
                  )}
                </>
              ) : (
                <div className="cad-analytics-empty">
                  <FaChalkboardTeacher aria-hidden="true" />
                  <span>No teacher department records are available.</span>
                </div>
              )}
            </div>
          </section>
          </div>
        </section>

        {/* ================= MAIN CONTENT AREA ================= */}
        {/* On desktop (>=1200px): 2fr primary (Quick Actions + Recent) / 1fr secondary (Pending). */}
        {/* On mobile (<1200px): Pending Admissions appears FIRST, then Quick Actions, then Recent. */}
        <div className="cad-main-grid">
          {/* PRIMARY COLUMN: Quick Actions & Recent Student Activities */}
          <div className="cad-col-primary">
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
                {nonPendingRecentStudents.length > 0 ? (
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
                      {stats.pendingAdmissions}
                    </span>
                  </div>
                  <p className="cad-section-subtitle">
                    {stats.pendingAdmissions === 1
                      ? "1 student awaiting approval"
                      : `${stats.pendingAdmissions} students awaiting approval`}
                  </p>
                </div>
              </div>

              <div className="cad-section-body">
                {pendingAdmissions.length > 0 ? (
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
                        Review All Pending ({stats.pendingAdmissions})
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
