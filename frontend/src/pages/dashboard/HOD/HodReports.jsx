import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { AuthContext } from "../../../auth/AuthContext";
import {
  FaUsers,
  FaUserGraduate,
  FaBook,
  FaLayerGroup,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaClipboardList,
  FaCheckCircle,
  FaEdit,
  FaArrowRight,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

const BRAND = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  primaryLight: "#e8f1f8",
  accent: "#f97316",
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

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

const LoadingState = () => (
  <div
    style={{
      minHeight: "70vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${BRAND.bg} 0%, ${BRAND.primaryLight} 100%)`,
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          margin: "0 auto 1rem",
          border: `4px solid ${BRAND.border}`,
          borderTopColor: BRAND.accent,
          borderRadius: "50%",
          animation: "novaa-spin 0.9s linear infinite",
        }}
      />
      <p style={{ color: BRAND.muted, fontWeight: 500, margin: 0 }}>
        Loading department reports…
      </p>
      <style>{`@keyframes novaa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div
    style={{
      minHeight: "70vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}
  >
    <div style={{ textAlign: "center", maxWidth: 420 }}>
      <div
        style={{
          width: 88,
          height: 88,
          margin: "0 auto 1.25rem",
          background: BRAND.dangerLight,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2.25rem",
          color: BRAND.danger,
        }}
      >
        <FaExclamationTriangle />
      </div>
      <h4 style={{ color: BRAND.ink, fontWeight: 700, marginBottom: "0.5rem" }}>
        Unable to load reports
      </h4>
      <p style={{ color: BRAND.muted, marginBottom: "1.5rem" }}>
        We couldn't fetch your department reports. Please check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        style={{
          background: BRAND.primary,
          color: "#fff",
          border: "none",
          padding: "0.7rem 1.5rem",
          borderRadius: 10,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, subtext, color, bg, delay = 0 }) => (
  <motion.div
    variants={fadeUp}
    custom={delay}
    initial="hidden"
    animate="visible"
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
      e.currentTarget.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 20px rgba(15, 23, 42, 0.05)";
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: color,
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
          background: bg,
          color: color,
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
      {value}
    </div>
    <div
      style={{
        fontSize: "0.85rem",
        fontWeight: 600,
        color: BRAND.ink,
        marginBottom: "0.15rem",
      }}
    >
      {label}
    </div>
    {subtext && (
      <div style={{ fontSize: "0.75rem", color: BRAND.muted }}>{subtext}</div>
    )}
  </motion.div>
);

const HodReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hod/reports/overview");
      setData(response.data);
    } catch (error) {
      console.error("HOD Reports error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load department reports"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!data) return <ErrorState onRetry={fetchReports} />;

  const kpis = data.kpis || {};
  const department = data.department || {};
  const attendance = kpis.attendanceSummary || {};

  const statCards = [
    {
      label: "Total Teachers",
      value: kpis.totalTeachers ?? 0,
      icon: FaUsers,
      color: BRAND.primary,
      bg: BRAND.primaryLight,
      subtext: "Faculty members",
    },
    {
      label: "Total Students",
      value: kpis.totalStudents ?? 0,
      icon: FaUserGraduate,
      color: BRAND.info,
      bg: BRAND.infoLight,
      subtext: "Enrolled students",
    },
    {
      label: "Total Subjects",
      value: kpis.totalSubjects ?? 0,
      icon: FaBook,
      color: BRAND.accent,
      bg: BRAND.accentLight,
      subtext: "Active subjects",
    },
    {
      label: "Total Courses",
      value: kpis.totalCourses ?? 0,
      icon: FaLayerGroup,
      color: BRAND.success,
      bg: BRAND.successLight,
      subtext: "Program courses",
    },
    {
      label: "Published Timetables",
      value: kpis.publishedTimetables ?? 0,
      icon: FaCheckCircle,
      color: BRAND.success,
      bg: BRAND.successLight,
      subtext: "Live schedules",
    },
    {
      label: "Draft Timetables",
      value: kpis.draftTimetables ?? 0,
      icon: FaEdit,
      color: BRAND.warning,
      bg: BRAND.warningLight,
      subtext: "Pending review",
    },
    {
      label: "Archived Timetables",
      value: kpis.archivedTimetables ?? 0,
      icon: FaCalendarAlt,
      color: BRAND.muted,
      bg: BRAND.bg,
      subtext: "Preserved records",
    },
    {
      label: "Pending Exceptions",
      value: kpis.pendingExceptions ?? 0,
      icon: FaExclamationTriangle,
      color: BRAND.danger,
      bg: BRAND.dangerLight,
      subtext: "Awaiting approval",
    },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${BRAND.bg} 0%, #eef4fb 100%)`,
          padding: "1.5rem 1rem 3rem",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          {/* Header */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              background: `linear-gradient(120deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 60%, #0a2a38 100%)`,
              borderRadius: 20,
              padding: "1.75rem 2rem",
              color: "#fff",
              boxShadow: "0 20px 50px -20px rgba(15, 58, 74, 0.5)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <FaClipboardList />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  Department Reports
                </h2>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    opacity: 0.85,
                    fontSize: "0.9rem",
                  }}
                >
                  {department.name || "Department"} ({department.code || "—"})
                </p>
              </div>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <div className="row g-3 mb-4">
            {statCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="col-6 col-lg-3">
                  <StatCard
                    icon={Icon}
                    label={card.label}
                    value={card.value}
                    subtext={card.subtext}
                    color={card.color}
                    bg={card.bg}
                    delay={idx}
                  />
                </div>
              );
            })}
          </div>

          {/* Attendance Summary Card */}
          <motion.div
            variants={fadeUp}
            custom={statCards.length}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: BRAND.infoLight,
                    color: BRAND.info,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                  }}
                >
                  <FaClipboardList />
                </div>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 700, color: BRAND.ink, fontSize: "1.05rem" }}>
                    Attendance Summary
                  </h5>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <div
                    style={{
                      padding: "1rem",
                      background: BRAND.bg,
                      borderRadius: 12,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: BRAND.info,
                      }}
                    >
                      {attendance.totalSessions ?? 0}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: BRAND.muted, marginTop: 4 }}>
                      Total Sessions
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div
                    style={{
                      padding: "1rem",
                      background: BRAND.bg,
                      borderRadius: 12,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: BRAND.success,
                      }}
                    >
                      {attendance.present ?? 0}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: BRAND.muted, marginTop: 4 }}>
                      Present
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div
                    style={{
                      padding: "1rem",
                      background: BRAND.bg,
                      borderRadius: 12,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: BRAND.danger,
                      }}
                    >
                      {attendance.absent ?? 0}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: BRAND.muted, marginTop: 4 }}>
                      Absent
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div
                    style={{
                      padding: "1rem",
                      background: BRAND.bg,
                      borderRadius: 12,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: BRAND.primary,
                      }}
                    >
                      {attendance.averageAttendancePercentage ?? 0}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: BRAND.muted, marginTop: 4 }}>
                      Avg Attendance
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            variants={fadeUp}
            custom={statCards.length + 1}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  marginBottom: "1rem",
                }}
              >
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
                  <FaArrowRight />
                </div>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 700, color: BRAND.ink, fontSize: "1.05rem" }}>
                    Quick Actions
                  </h5>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {[
                  { label: "View Timetables", path: "/timetable/list", icon: FaCalendarAlt },
                  { label: "Exception Approvals", path: "/hod/exception-approvals", icon: FaExclamationTriangle },
                  { label: "Department Info", path: "/hod/department", icon: FaLayerGroup },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(item.path)}
                      style={{
                        background: BRAND.bg,
                        border: `1px solid ${BRAND.border}`,
                        borderRadius: 10,
                        padding: "0.7rem 1rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.55rem",
                        transition: "all 0.2s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = BRAND.primary;
                        e.currentTarget.style.background = BRAND.primaryLight;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = BRAND.border;
                        e.currentTarget.style.background = BRAND.bg;
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: BRAND.primaryLight,
                          color: BRAND.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                        }}
                      >
                        <ItemIcon />
                      </div>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: BRAND.ink,
                        }}
                      >
                        {item.label}
                      </span>
                    </motion.button>
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

export default HodReports;
