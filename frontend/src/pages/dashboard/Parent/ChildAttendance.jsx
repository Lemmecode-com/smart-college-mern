import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChartBar,
  FaCalendarAlt,
  FaUserGraduate,
  FaExclamationTriangle,
  FaSyncAlt
} from "react-icons/fa";
import api from "../../../api/axios";

// Brand Color Palette - Matching Application Theme
const BRAND_COLORS = {
  primary: {
    main: '#1a4b6d',
    dark: '#0f3a4a',
    light: '#2a6b8d',
    gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)'
  },
  success: {
    main: '#28a745',
    dark: '#218838',
    light: '#28a745',
    gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
  },
  info: {
    main: '#17a2b8',
    dark: '#138496',
    light: '#17a2b8',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    light: '#ffc107',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    light: '#dc3545',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
  },
  secondary: {
    main: '#6c757d',
    dark: '#545b62',
    light: '#868e96',
    gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)'
  }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" }
  })
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export default function ChildAttendance() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0
  });

  useEffect(() => {
    if (!childId) {
      setError("Invalid child ID");
      setLoading(false);
      return;
    }

    const fetchAttendance = async () => {
      try {
        const res = await api.get(`/parent/student/${childId}/attendance`);
        const attendanceData = res.data.data || [];
        setRecords(attendanceData);

        // Calculate attendance statistics
        const total = attendanceData.length;
        const present = attendanceData.filter(rec => rec.status === 'PRESENT').length;
        const absent = total - present;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        setAttendanceStats({
          total,
          present,
          absent,
          percentage
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [childId]);

  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
          <div className="text-center">
            <motion.div
              variants={spinVariants}
              animate="animate"
              style={{ fontSize: '3rem', color: BRAND_COLORS.primary.main }}
            >
              <FaSyncAlt />
            </motion.div>
            <h4 className="mt-3" style={{ color: BRAND_COLORS.primary.main }}>Loading Attendance...</h4>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container">
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="parent-dashboard-header"
          >
            <div className="parent-dashboard-header-hero">
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="parent-header-icon-wrapper"
                    >
                      <FaExclamationTriangle />
                    </motion.div>
                    <div className="parent-header-title-section">
                      <h1 className="parent-header-title">Error Loading Attendance</h1>
                      <p className="parent-header-subtitle">{error}</p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="parent-btn-primary"
                      onClick={() => navigate("/dashboard/parent")}
                    >
                      <FaArrowLeft className="me-2" />
                      Back to Dashboard
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="parent-portal-wrapper"
      >
        <div className="parent-portal-container">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="parent-dashboard-header"
          >
            {/* Hero Section */}
            <div className="parent-dashboard-header-hero">
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="parent-header-icon-wrapper"
                    >
                      <FaCalendarCheck />
                    </motion.div>
                    <div className="parent-header-title-section">
                      <h1 className="parent-header-title">
                        Attendance Records
                      </h1>
                      <p className="parent-header-subtitle">
                        Track your child's attendance performance and history
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center justify-content-center justify-content-md-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="parent-btn-outline"
                      onClick={() => navigate("/dashboard/parent")}
                    >
                      <FaArrowLeft className="me-2" />
                      Back to Dashboard
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= ATTENDANCE STATS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="dashboard-section"
          >
            <div className="row g-3 g-md-4">
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaCalendarAlt}
                  label="Total Sessions"
                  value={attendanceStats.total}
                  color={BRAND_COLORS.primary.main}
                  gradient={BRAND_COLORS.primary.gradient}
                  subtitle="Recorded sessions"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaCheckCircle}
                  label="Present"
                  value={attendanceStats.present}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Days attended"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaTimesCircle}
                  label="Absent"
                  value={attendanceStats.absent}
                  color={BRAND_COLORS.danger.main}
                  gradient={BRAND_COLORS.danger.gradient}
                  subtitle="Days missed"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaChartBar}
                  label="Attendance Rate"
                  value={`${attendanceStats.percentage}%`}
                  color={attendanceStats.percentage >= 75 ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main}
                  gradient={attendanceStats.percentage >= 75 ? BRAND_COLORS.success.gradient : BRAND_COLORS.warning.gradient}
                  subtitle="Overall performance"
                />
              </div>
            </div>
          </motion.div>

          {/* ================= ATTENDANCE RECORDS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <div className="parent-attendance-chart">
              <div className="parent-chart-header">
                <div>
                  <h3 className="parent-chart-title">Detailed Attendance History</h3>
                  <p className="text-muted mb-0">Complete record of your child's attendance</p>
                </div>
              </div>

              {records.length === 0 ? (
                <EmptyState
                  icon={<FaCalendarCheck style={{ color: BRAND_COLORS.info.main }} />}
                  title="No Attendance Records"
                  message="Attendance data will appear here once classes begin."
                  success={false}
                />
              ) : (
                <div className="parent-table-responsive">
                  <table className="parent-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Session Type</th>
                        <th>Slot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((rec, idx) => (
                        <motion.tr
                          key={rec._id}
                          variants={fadeInVariants}
                          custom={idx}
                          initial="hidden"
                          animate="visible"
                        >
                          <td>
                            <div className="d-flex flex-column">
                              <span className="fw-semibold">
                                {new Date(rec.session_id?.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <small className="text-muted">
                                {new Date(rec.session_id?.date).getFullYear()}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="parent-student-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                                {rec.subject_id?.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="fw-semibold">{rec.subject_id?.name || "N/A"}</div>
                                <small className="text-muted">{rec.course_id?.name}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`parent-status-badge ${
                              rec.status === 'PRESENT' ? 'parent-status-approved' : 'parent-status-rejected'
                            }`}>
                              {rec.status === 'PRESENT' ? (
                                <><FaCheckCircle /> Present</>
                              ) : (
                                <><FaTimesCircle /> Absent</>
                              )}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              <FaClock className="me-1" />
                              {rec.session_type || "Regular"}
                            </span>
                          </td>
                          <td>
                            <span className="fw-semibold">
                              {rec.session_id?.slotNumber || "N/A"}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ icon: Icon, label, value, color, gradient, subtitle }) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)' }}
      whileTap={{ scale: 0.98 }}
      className="parent-stat-card"
      tabIndex={0}
      role="region"
      aria-label={`${label}: ${value}`}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.outline = '2px solid #1a4b6d';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.outline = 'none';
      }}
    >
      <div className="parent-stat-card-icon" style={{ background: gradient }}>
        <Icon />
      </div>
      <div className="parent-stat-card-content">
        <div className="parent-card-label">{label}</div>
        <div className="parent-card-value">{value}</div>
        {subtitle && <div className="parent-card-subtitle">{subtitle}</div>}
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message, success = false }) {
  return (
    <div className="parent-empty-state">
      <div className="parent-empty-icon" style={{ opacity: success ? 0.9 : 0.6, color: success ? BRAND_COLORS.success.main : '#e2e8f0' }}>
        {icon}
      </div>
      <h4 className="parent-empty-title">{title}</h4>
      <p className="parent-empty-message">{message}</p>
    </div>
  );
}
