import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { AuthContext } from "../../../auth/AuthContext";
import {
  FaUserTie,
  FaUsers,
  FaCalendarAlt,
  FaLayerGroup,
  FaClipboardList,
  FaUser,
  FaArrowRight,
  FaCheckCircle,
  FaEdit,
  FaPlus,
  FaBuilding,
  FaGraduationCap,
  FaCalendarDay,
  FaCogs,
  FaIdCard,
  FaRegCalendarPlus,
  FaRegClock,
  FaUniversity,
  FaCalendarCheck,
  FaClipboardCheck,
} from "react-icons/fa";
/* eslint-disable-next-line no-unused-vars */
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

// ============================================================
// BRAND PALETTE — Blue primary + Orange accent (per user pref)
// ============================================================
const BRAND = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  primaryLight: "#e8f1f8",
  accent: "#f97316",       // Orange accent
  accentLight: "#fff7ed",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#f59e0b",
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
// ANIMATION VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

const slideDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// ============================================================
// HELPERS
// ============================================================
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const formatDateLong = () => {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getCurrentAcademicYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  // Indian academic year typically starts in June/July
  const start = m >= 6 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
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
// LOADING STATE
// ============================================================


// ============================================================
// SECTION HEADER (reusable)
// ============================================================
// eslint-disable-next-line no-unused-vars
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1rem",
      flexWrap: "wrap",
      gap: "0.5rem",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: BRAND.primaryLight,
          color: BRAND.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
        }}
      >
        <Icon />
      </div>
      <div>
        <h5 style={{ margin: 0, fontWeight: 700, color: BRAND.ink, fontSize: "1.05rem" }}>
          {title}
        </h5>
        {subtitle && (
          <p style={{ margin: 0, color: BRAND.muted, fontSize: "0.8rem" }}>{subtitle}</p>
        )}
      </div>
    </div>
    {action}
  </div>
);

// ============================================================
// QUICK ACTION CARD (reusable)
// ============================================================
// eslint-disable-next-line no-unused-vars
const QuickActionCard = ({ label, description, icon: Icon, route, color, navigate, index }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    whileHover={{ scale: 1.01, y: -1 }}
    whileTap={{ scale: 0.99 }}
    onClick={() => navigate(route)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.85rem",
      padding: "0.75rem 1rem",
      minHeight: 48,
      background: BRAND.bg,
      border: `1px solid ${BRAND.border}`,
      borderRadius: 12,
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.2s ease",
      width: "100%",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color + "60";
      e.currentTarget.style.background = color + "0a";
      e.currentTarget.style.boxShadow = `0 3px 10px ${color}18`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = BRAND.border;
      e.currentTarget.style.background = BRAND.bg;
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: color + "15",
        color: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.95rem",
        flexShrink: 0,
      }}
    >
      <Icon />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: "0.86rem",
          fontWeight: 600,
          color: BRAND.ink,
          lineHeight: 1.25,
        }}
      >
        {label}
      </div>
      {description && (
        <div
          style={{
            fontSize: "0.74rem",
            color: BRAND.muted,
            marginTop: 2,
          }}
        >
          {description}
        </div>
      )}
    </div>
    <FaArrowRight
      style={{
        fontSize: "0.72rem",
        color: BRAND.muted,
        opacity: 0.5,
        flexShrink: 0,
      }}
    />
  </motion.button>
);

// ============================================================
// MAIN DASHBOARD
// ============================================================
const HodDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHodDashboard();
  }, []);

  const fetchHodDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/hod/dashboard");
      setDashboardData(response.data);
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
    }
  };

// Loading State
if (loading) {
  return (
    <div className="parent-portal-wrapper">
      <div
        className="parent-portal-container parent-loading-container"
        style={{ minHeight: "70vh" }}
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

  const handleGoBack = () => {
    navigate("/hod/profile");
  };

  if (!dashboardData) {
    return (
      <ApiError
        title="Dashboard Loading Error"
        message="Unable to load dashboard data"
        onRetry={fetchHodDashboard}
        onGoBack={handleGoBack}
      />
    );
  }

  const stats = dashboardData.stats || {};
  const department = dashboardData.department || {};
  const hod = dashboardData.hod || null;
  const recentTimetables = dashboardData.recentTimetables || [];

  // Derive meaningful KPIs
  const totalTeachers = stats.teachers || 0;
  const totalTimetables = stats.timetables || 0;
  const publishedCount =
    recentTimetables.filter((t) => t.status === "PUBLISHED").length;
  const draftCount =
    recentTimetables.filter((t) => t.status === "DRAFT").length;

  // KPI definitions
  const kpis = [
    {
      label: "Total Teachers",
      value: totalTeachers,
      icon: FaUsers,
      color: BRAND.primary,
      bg: BRAND.primaryLight,
      hint: "Active faculty",
    },
    {
      label: "Total Timetables",
      value: totalTimetables,
      icon: FaCalendarAlt,
      color: BRAND.info,
      bg: BRAND.infoLight,
      hint: "All schedules",
    },
    {
      label: "Published",
      value: publishedCount,
      icon: FaCheckCircle,
      color: BRAND.success,
      bg: BRAND.successLight,
      hint: "Live this semester",
    },
    {
      label: "Drafts Pending",
      value: draftCount,
      icon: FaEdit,
      color: BRAND.accent,
      bg: BRAND.accentLight,
      hint: "Needs review",
    },
  ];

  // Quick actions
  const quickActions = [
    {
      label: "View Department",
      description: "Department details and programs",
      icon: FaLayerGroup,
      route: "/hod/department",
      color: BRAND.primary,
    },
    {
      label: "Manage Teachers",
      description: "Faculty roster and teaching allocations",
      icon: FaUsers,
      route: "/hod/teachers",
      color: BRAND.info,
    },
    {
      label: "Manage Timetable",
      description: "Class schedules and slot management",
      icon: FaCalendarCheck,
      route: "/timetable/list",
      color: BRAND.accent,
    },
    {
      label: "Exception Approvals",
      description: "Timetable change and exception reviews",
      icon: FaClipboardCheck,
      route: "/hod/exception-approvals",
      color: BRAND.warning,
    },
  ];

  // Today's snapshot — derive from recent timetables (since backend doesn't give classes)
  const todaysClasses = recentTimetables.slice(0, 4);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-page erp-viewport-min-100"
        style={{
          background: `linear-gradient(135deg, ${BRAND.bg} 0%, #eef4fb 100%)`,
          padding: "1.5rem 1rem 3rem",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* ==================================================
              1. WELCOME BANNER
          ================================================== */}
          <motion.div
            variants={slideDown}
            initial="hidden"
            animate="visible"
            style={{
              background: `linear-gradient(120deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 60%, #0a2a38 100%)`,
              borderRadius: 20,
              padding: "1.75rem 2rem",
              color: "#fff",
              boxShadow: "0 20px 50px -20px rgba(15, 58, 74, 0.5)",
              marginBottom: "1.5rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 220,
                height: "100%",
                background: `linear-gradient(120deg, transparent, ${BRAND.accent}30)`,
                borderTopRightRadius: 20,
                pointerEvents: "none",
              }}
            />

            <div
              className="row align-items-center g-3"
              style={{ position: "relative", zIndex: 1 }}
            >
              <div className="col-md-8">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(10px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.6rem",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <FaUserTie />
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        opacity: 0.85,
                        letterSpacing: 0.5,
                      }}
                    >
                      {getGreeting()} 👋
                    </p>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "clamp(1.3rem, 2.5vw, 1.85rem)",
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {user?.name || "HOD"}
                    </h2>
                  </div>
                </div>
                <p
                  style={{
                    margin: 0,
                    opacity: 0.9,
                    fontSize: "0.95rem",
                  }}
                >
                  Head of Department,{" "}
                  <strong>{department.name || "Department"}</strong>
                  {department.code && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "2px 10px",
                        background: "rgba(255,255,255,0.18)",
                        borderRadius: 20,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                      }}
                    >
                      {department.code}
                    </span>
                  )}
                </p>
              </div>

              <div className="col-md-4 text-md-end">
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                    background: "rgba(255,255,255,0.1)",
                    padding: "0.75rem 1.1rem",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.15)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FaCalendarDay style={{ opacity: 0.8 }} />
                    <span>{formatDateLong()}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FaGraduationCap style={{ opacity: 0.8 }} />
                    <span>AY {getCurrentAcademicYear()}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ==================================================
              2. KPI GRID
          ================================================== */}
          <div className="row g-3 mb-4">
            {kpis.map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  variants={fadeUp}
                  custom={idx}
                  initial="hidden"
                  animate="visible"
                  className="col-6 col-lg-3"
                >
                  <div
                    style={{
                      background: BRAND.card,
                      borderRadius: 16,
                      padding: "1.25rem",
                      boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
                      border: `1px solid ${BRAND.border}`,
                      height: "100%",
                      position: "relative",
                      overflow: "hidden",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 30px rgba(15, 23, 42, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 20px rgba(15, 23, 42, 0.05)";
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: kpi.color,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: kpi.bg,
                          color: kpi.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.15rem",
                        }}
                      >
                        <Icon />
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(1.5rem, 3vw, 2rem)",
                        fontWeight: 700,
                        color: BRAND.ink,
                        lineHeight: 1,
                        marginBottom: "0.3rem",
                      }}
                    >
                      {kpi.value}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: BRAND.ink,
                        marginBottom: "0.15rem",
                      }}
                    >
                      {kpi.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: BRAND.muted,
                      }}
                    >
                      {kpi.hint}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ==================================================
              3. OPERATIONAL GRID (Today's Overview + Quick Actions)
          ================================================== */}
          <div className="row g-3 mb-4">
            {/* TODAY'S OVERVIEW */}
            <motion.div
              variants={fadeUp}
              custom={4}
              initial="hidden"
              animate="visible"
              className="col-lg-7"
            >
              <div
                style={{
                  background: BRAND.card,
                  borderRadius: 16,
                  padding: "1.5rem",
                  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
                  border: `1px solid ${BRAND.border}`,
                  height: "100%",
                }}
              >
                <SectionHeader
                  icon={FaCalendarDay}
                  title="Today's Department Snapshot"
                  subtitle="Operational overview for today"
                  action={
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: BRAND.accent,
                        fontWeight: 600,
                        background: BRAND.accentLight,
                        padding: "4px 10px",
                        borderRadius: 20,
                      }}
                    >
                      <FaRegClock style={{ marginRight: 4 }} />
                      Live
                    </span>
                  }
                />

                {/* Mini stats row */}
                <div
                  className="row g-2 mb-3"
                  style={{
                    padding: "0.85rem",
                    background: BRAND.bg,
                    borderRadius: 12,
                  }}
                >
                  <div className="col-4 text-center">
                    <div
                      style={{
                        fontSize: "1.35rem",
                        fontWeight: 700,
                        color: BRAND.primary,
                      }}
                    >
                      {totalTeachers}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: BRAND.muted }}>
                      Faculty
                    </div>
                  </div>
                  <div
                    className="col-4 text-center"
                    style={{
                      borderLeft: `1px solid ${BRAND.border}`,
                      borderRight: `1px solid ${BRAND.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.35rem",
                        fontWeight: 700,
                        color: BRAND.success,
                      }}
                    >
                      {publishedCount}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: BRAND.muted }}>
                      Active Schedules
                    </div>
                  </div>
                  <div className="col-4 text-center">
                    <div
                      style={{
                        fontSize: "1.35rem",
                        fontWeight: 700,
                        color: BRAND.accent,
                      }}
                    >
                      {draftCount}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: BRAND.muted }}>
                      Pending Review
                    </div>
                  </div>
                </div>

                {/* Recent activity list */}
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: BRAND.ink, marginBottom: "0.6rem" }}>
                  Recent Timetable Activity
                </div>
                {todaysClasses.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                    {todaysClasses.map((t, i) => (
                      <motion.div
                        key={t._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.7rem 0.85rem",
                          background: BRAND.bg,
                          borderRadius: 10,
                          borderLeft: `3px solid ${
                            t.status === "PUBLISHED"
                              ? BRAND.success
                              : t.status === "DRAFT"
                              ? BRAND.warning
                              : BRAND.muted
                          }`,
                          gap: "0.5rem",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: BRAND.ink,
                              fontSize: "0.88rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.73rem",
                              color: BRAND.muted,
                              marginTop: 2,
                            }}
                          >
                            Sem {t.semester} • {t.academicYear}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: 20,
                            background:
                              t.status === "PUBLISHED"
                                ? BRAND.successLight
                                : t.status === "DRAFT"
                                ? BRAND.warningLight
                                : "#f1f5f9",
                            color:
                              t.status === "PUBLISHED"
                                ? BRAND.success
                                : t.status === "DRAFT"
                                ? BRAND.warning
                                : BRAND.muted,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem 1rem",
                      color: BRAND.muted,
                    }}
                  >
                    <FaCalendarAlt
                      style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "0.5rem" }}
                    />
                    <p style={{ margin: 0, fontSize: "0.85rem" }}>
                      No recent timetable activity
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* QUICK ACTIONS */}
            <motion.div
              variants={fadeUp}
              custom={5}
              initial="hidden"
              animate="visible"
              className="col-lg-5"
            >
              <div
                style={{
                  background: BRAND.card,
                  borderRadius: 16,
                  padding: "1.5rem",
                  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
                  border: `1px solid ${BRAND.border}`,
                  height: "100%",
                }}
              >
                <SectionHeader
                  icon={FaCogs}
                  title="Quick Actions"
                  subtitle="Key departmental portals"
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  {quickActions.map((action, idx) => (
                    <QuickActionCard
                      key={action.label}
                      label={action.label}
                      description={action.description}
                      icon={action.icon}
                      route={action.route}
                      color={action.color}
                      navigate={navigate}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* ==================================================
              4. RECENT TIMETABLES (Card-based list)
          ================================================== */}
          <motion.div
            variants={fadeUp}
            custom={6}
            initial="hidden"
            animate="visible"
            className="mb-4"
          >
            <div
              style={{
                background: BRAND.card,
                borderRadius: 16,
                padding: "1.5rem",
                boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
                border: `1px solid ${BRAND.border}`,
              }}
            >
              <SectionHeader
                icon={FaRegCalendarPlus}
                title="Recent Timetables"
                subtitle="Latest schedules created in your department"
                action={
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate("/timetable/list")}
                    style={{
                      background: "transparent",
                      border: `1px solid ${BRAND.primary}`,
                      color: BRAND.primary,
                      padding: "0.4rem 0.95rem",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    View All <FaArrowRight style={{ fontSize: "0.7rem" }} />
                  </motion.button>
                }
              />

              {recentTimetables.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {recentTimetables.map((t, i) => (
                    <motion.div
                      key={t._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="row g-2 align-items-center"
                      style={{
                        padding: "0.95rem 1rem",
                        background: BRAND.bg,
                        borderRadius: 12,
                        border: `1px solid ${BRAND.border}`,
                        transition: "all 0.2s",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        navigate(
                          `/timetable/${t._id}/weekly${
                            t.status === "ARCHIVED"
                              ? "?includeArchived=true"
                              : ""
                          }`
                        )
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = BRAND.accent;
                        e.currentTarget.style.boxShadow =
                          "0 4px 15px rgba(249, 115, 22, 0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = BRAND.border;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div className="col-12 col-md-5">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background:
                                t.status === "PUBLISHED"
                                  ? BRAND.successLight
                                  : BRAND.accentLight,
                              color:
                                t.status === "PUBLISHED"
                                  ? BRAND.success
                                  : BRAND.accent,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1rem",
                              flexShrink: 0,
                            }}
                          >
                            <FaCalendarAlt />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: BRAND.ink,
                                fontSize: "0.95rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: BRAND.muted,
                                marginTop: 2,
                              }}
                            >
                              Academic Year {t.academicYear}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-6 col-md-3">
                        <div style={{ fontSize: "0.72rem", color: BRAND.muted }}>
                          Semester
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: BRAND.ink,
                            fontSize: "0.88rem",
                          }}
                        >
                          Semester {t.semester}
                        </div>
                      </div>

                      <div className="col-6 col-md-2">
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "4px 11px",
                            borderRadius: 20,
                            background:
                              t.status === "PUBLISHED"
                                ? BRAND.successLight
                                : t.status === "DRAFT"
                                ? BRAND.warningLight
                                : "#f1f5f9",
                            color:
                              t.status === "PUBLISHED"
                                ? BRAND.success
                                : t.status === "DRAFT"
                                ? BRAND.warning
                                : BRAND.muted,
                            letterSpacing: 0.3,
                          }}
                        >
                          {t.status}
                        </span>
                      </div>

                      <div className="col-12 col-md-2 text-md-end">
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: BRAND.accent,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          Open <FaArrowRight style={{ fontSize: "0.68rem" }} />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1rem",
                    background: BRAND.bg,
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      margin: "0 auto 1rem",
                      background: BRAND.accentLight,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.75rem",
                      color: BRAND.accent,
                    }}
                  >
                    <FaRegCalendarPlus />
                  </div>
                  <h6
                    style={{
                      color: BRAND.ink,
                      fontWeight: 700,
                      marginBottom: "0.35rem",
                    }}
                  >
                    No timetables yet
                  </h6>
                  <p
                    style={{
                      color: BRAND.muted,
                      fontSize: "0.85rem",
                      marginBottom: "1rem",
                    }}
                  >
                    Create your first timetable to get started.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate("/timetable/create-timetable")}
                    style={{
                      background: BRAND.accent,
                      color: "#fff",
                      border: "none",
                      padding: "0.6rem 1.25rem",
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FaPlus /> Create Timetable
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          {/* ==================================================
              5. DEPARTMENT INFO
          ================================================== */}
          <motion.div
            variants={fadeUp}
            custom={7}
            initial="hidden"
            animate="visible"
          >
            <div
              style={{
                background: BRAND.card,
                borderRadius: 16,
                padding: "1.5rem",
                boxShadow: "0 4px 20px rgba(15, 23, 42, 0.05)",
                border: `1px solid ${BRAND.border}`,
              }}
            >
              <SectionHeader
                icon={FaBuilding}
                title="Department Information"
                subtitle="Official department details"
              />

              <div className="row g-3">
                {[
                  { label: "Department Name", value: department.name, icon: FaUniversity },
                  { label: "Department Code", value: department.code,  icon: FaIdCard },
                  { label: "Head of Department", value: hod?.name ?? null, icon: FaUserTie },
                  { label: "Employee ID", value: hod?.employeeId ?? null, icon: FaClipboardList },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="col-6 col-md-3">
                      <div
                        style={{
                          padding: "1rem",
                          background: BRAND.bg,
                          borderRadius: 12,
                          height: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.72rem",
                            color: BRAND.muted,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: "0.5rem",
                          }}
                        >
                          <Icon style={{ fontSize: "0.75rem" }} />
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: item.value ? BRAND.ink : BRAND.muted,
                            fontSize: "0.98rem",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.value || "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HodDashboard;