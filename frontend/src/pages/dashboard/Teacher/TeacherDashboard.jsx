import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaQrcode,
  FaUsers,
  FaChartBar,
  FaCalendarAlt,
  FaEdit,
  FaLock,
  FaUniversity,
  FaChalkboardTeacher,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSyncAlt,
  FaBell,
  FaFileAlt,
  FaGraduationCap,
  FaAward,
  FaStar,
  FaEye,
  FaArrowRight,
  FaInfoCircle,
  FaShieldAlt,
  FaDatabase
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
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

const blinkVariants = {
  initial: { opacity: 1 },
  blink: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-5, 5, -5],
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

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dashboard/teacher");
        setData(res.data);
      } catch (err) {
        console.error("Failed to load teacher dashboard:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingDisplay />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  }

  if (!data) return null;

  const { teacher, stats, recentLectures } = data;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-vh-100"
        style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' }}
      >
        <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="card shadow-sm mb-3 mb-md-4"
          >
            <div className="card-body py-2 py-md-3 px-3 px-md-4">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <span className="text-muted small">Dashboard</span>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    <span className="fw-semibold small" style={{ color: BRAND_COLORS.primary.main }}>Teacher Overview</span>
                  </li>
                </ol>
              </nav>
            </div>
          </motion.div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="card shadow-lg border-0 mb-3 mb-md-4 overflow-hidden"
            style={{ borderRadius: '1rem' }}
          >
            <div
              className="p-3 p-md-4 text-white"
              style={{ background: BRAND_COLORS.primary.gradient }}
            >
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <motion.div
                    variants={pulseVariants}
                    initial="initial"
                    animate="pulse"
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: '72px',
                      height: '72px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      fontSize: '2rem',
                      boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <FaChalkboardTeacher />
                  </motion.div>
                  <div>
                    <h1 className="mb-0 fw-bold" style={{ fontSize: '1.75rem' }}>
                      Welcome, {teacher.name}
                    </h1>
                    <p className="mb-0 mt-1" style={{ opacity: 0.9, fontSize: '1rem' }}>
                      Empowering Education Through Technology
                    </p>
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <div
                    className="text-center px-3 py-2"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}
                  >
                    <div className="small mb-1" style={{ opacity: 0.85, fontSize: '0.75rem' }}>Current Time</div>
                    <div className="fw-bold" style={{ fontSize: '1.125rem' }}>
                      {currentTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                  <div
                    className="text-center px-3 py-2"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}
                  >
                    <div className="small mb-1" style={{ opacity: 0.85, fontSize: '0.75rem' }}>Employee ID</div>
                    <div className="fw-bold" style={{ fontSize: '1.125rem' }}>
                      {teacher.employeeId}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Teacher Info Bar */}
            <div className="px-3 px-md-4 py-3 bg-light border-top">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2">
                  <FaShieldAlt style={{ color: BRAND_COLORS.info.main }} />
                  <span
                    className="px-3 py-1 rounded-pill fw-semibold small"
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      fontSize: '0.8rem'
                    }}
                  >
                    Active Faculty
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/profile/edit-profile")}
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                  style={{
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  <FaEdit /> <span className="d-none d-sm-inline">Edit Profile</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ================= STATS GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            <div className="row g-3 g-md-4 mb-3 mb-md-4">
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaCalendarAlt}
                  label="Total Lectures"
                  value={stats.totalLecturesTaken || 0}
                  color={BRAND_COLORS.primary.main}
                  gradient={BRAND_COLORS.primary.gradient}
                  subtitle="Lectures conducted"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaQrcode}
                  label="Open Sessions"
                  value={stats.openSessions || 0}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Active attendance sessions"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaCheckCircle}
                  label="Closed Sessions"
                  value={stats.closedSessions || 0}
                  color={BRAND_COLORS.info.main}
                  gradient={BRAND_COLORS.info.gradient}
                  subtitle="Completed sessions"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaChartBar}
                  label="Attendance %"
                  value={`${stats.attendancePercentage || 0}%`}
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle="Overall attendance rate"
                />
              </div>
            </div>
          </motion.div>

          {/* ================= QUICK ACTIONS GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            className="mb-3 mb-md-4"
          >
            <SectionCard
              title="Quick Actions"
              icon={<FaArrowRight />}
              subtitle="Frequently used operations"
              color={BRAND_COLORS.primary.main}
            >
              <div className="row g-3 g-md-4 p-3 p-md-4">
                <div className="col-12 col-sm-6 col-lg-3">
                  <ActionCard
                    icon={FaQrcode}
                    title="Create Attendance Session"
                    desc="Start a new lecture attendance session"
                    link="/timetable/weekly-timetable"
                    color={BRAND_COLORS.success.main}
                    gradient={BRAND_COLORS.success.gradient}
                  />
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <ActionCard
                    icon={FaUsers}
                    title="Mark Attendance"
                    desc="Record student attendance for active sessions"
                    link="/attendance/my-sessions-list"
                    color={BRAND_COLORS.info.main}
                    gradient={BRAND_COLORS.info.gradient}
                  />
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <ActionCard
                    icon={FaChartBar}
                    title="View Attendance Report"
                    desc="Analyze your attendance statistics and trends"
                    link="/attendance/report"
                    color={BRAND_COLORS.warning.main}
                    gradient={BRAND_COLORS.warning.gradient}
                  />
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                  <ActionCard
                    icon={FaBell}
                    title="Send Notifications"
                    desc="Communicate with students and parents"
                    link="/teacher/notifications/create"
                    color={BRAND_COLORS.danger.main}
                    gradient={BRAND_COLORS.danger.gradient}
                  />
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* ================= RECENT LECTURES ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={2}
            initial="hidden"
            animate="visible"
          >
            <SectionCard
              title="Recent Lectures"
              icon={<FaCalendarAlt />}
              subtitle="Your latest teaching sessions"
              color={BRAND_COLORS.info.main}
            >
              <div className="p-3 p-md-4">
                {recentLectures && recentLectures.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Date</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Course</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Subject</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Department</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Status</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLectures.map((lec, idx) => (
                          <LectureRow
                            key={lec._id}
                            lecture={lec}
                            delay={idx * 0.05}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={<FaCalendarAlt style={{ color: BRAND_COLORS.info.main }} />}
                    title="No Recent Lectures"
                    message="You haven't conducted any lectures yet. Start by creating your first attendance session!"
                  />
                )}
              </div>
            </SectionCard>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STYLES ================= */
const tableHeaderStyle = {
  padding: '1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#4a5568',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

/* ================= LOADING DISPLAY ================= */
function LoadingDisplay() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4"
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' }}>
      <div className="text-center">
        <motion.div
          variants={spinVariants}
          animate="animate"
          className="mb-4"
          style={{ color: BRAND_COLORS.primary.main, fontSize: '4rem' }}
        >
          <FaSyncAlt />
        </motion.div>
        <h3 className="fw-bold mb-2" style={{ color: '#1e293b', fontSize: '1.5rem' }}>
          Loading Teacher Dashboard...
        </h3>
        <p className="text-muted mb-0">
          Please wait while we fetch your teaching data
        </p>
      </div>
    </div>
  );
}

/* ================= ERROR DISPLAY ================= */
function ErrorDisplay({ message, onRetry }) {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4"
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' }}>
      <div className="card border-0 shadow-lg text-center p-4 p-md-5" style={{ maxWidth: '500px', width: '100%', borderRadius: '1.5rem' }}>
        <div
          className="d-flex align-items-center justify-content-center rounded-circle mb-4 mx-auto"
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            color: BRAND_COLORS.danger.main,
            fontSize: '3rem'
          }}
        >
          <FaTimesCircle />
        </div>
        <h3 className="fw-bold mb-2" style={{ color: '#1e293b', fontSize: '1.75rem' }}>
          Dashboard Error
        </h3>
        <p className="text-muted mb-4" style={{ lineHeight: 1.6 }}>
          {message}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="btn btn-primary d-flex align-items-center gap-2 mx-auto px-4 py-3"
          style={{
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)'
          }}
        >
          <motion.div variants={spinVariants} animate="animate">
            <FaSyncAlt />
          </motion.div>
          Refresh Dashboard
        </motion.button>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ icon: Icon, label, value, color, gradient, subtitle }) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)' }}
      whileTap={{ scale: 0.98 }}
      className="card h-100 border-0"
      style={{
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        borderLeft: `4px solid ${color}`,
        cursor: 'default'
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: gradient,
              color: 'white',
              fontSize: '1.75rem',
              boxShadow: `0 4px 12px ${color}30`
            }}
          >
            <Icon />
          </div>
          <div className="flex-grow-1">
            <div className="small fw-semibold text-muted mb-1" style={{ fontSize: '0.875rem' }}>
              {label}
            </div>
            <div className="h2 mb-0 fw-bold" style={{ fontSize: '1.75rem', color: '#1e293b' }}>
              {value}
            </div>
            {subtitle && (
              <div className="small text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================= SECTION CARD ================= */
function SectionCard({ title, icon, subtitle, color, children }) {
  return (
    <div
      className="card border-0 h-100"
      style={{
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden'
      }}
    >
      <div
        className="px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderBottom: '1px solid #eaeaea'
        }}
      >
        <h3 className="mb-0 fw-bold" style={{ fontSize: '1.125rem', color: '#1e293b' }}>
          <span className="me-2" style={{ color: color, fontSize: '1.1rem' }}>{icon}</span>
          {title}
        </h3>
        {subtitle && (
          <p className="text-muted small mb-0 mt-1 ms-4">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

/* ================= ACTION CARD ================= */
function ActionCard({ icon: Icon, title, desc, link, color, gradient }) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(link)}
      className="card border-0 h-100 text-center cursor-pointer"
      style={{
        borderRadius: '16px',
        padding: '1.75rem',
        transition: 'all 0.3s ease',
        border: '2px solid transparent',
        overflow: 'hidden'
      }}
    >
      <div
        className="position-absolute top-0 start-0 w-100"
        style={{
          height: '4px',
          background: gradient,
          zIndex: 1
        }}
      />

      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="pulse"
        className="d-flex align-items-center justify-content-center mb-3"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: gradient,
          color: 'white',
          fontSize: '2rem',
          margin: '0 auto',
          boxShadow: `0 6px 20px ${color}40`
        }}
      >
        <Icon />
      </motion.div>

      <h4 className="fw-bold mb-2" style={{ fontSize: '1.125rem', color: '#1e293b' }}>
        {title}
      </h4>

      <p className="text-muted mb-3" style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
        {desc}
      </p>

      <span
        className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold small"
        style={{
          backgroundColor: `${color}10`,
          color: color,
          fontSize: '0.8rem'
        }}
      >
        <FaArrowRight size={12} />
        Get Started
      </span>
    </motion.div>
  );
}

/* ================= LECTURE ROW ================= */
function LectureRow({ lecture, delay = 0 }) {
  const navigate = useNavigate();
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return BRAND_COLORS.success.main;
      case "CLOSED":
        return BRAND_COLORS.secondary.main;
      default:
        return BRAND_COLORS.warning.main;
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      className="table-row-hover"
    >
      <td className="py-3 px-3 align-middle">
        {new Date(lecture.lectureDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })}
      </td>
      <td className="py-3 px-3 align-middle">
        <div className="fw-semibold" style={{ color: '#1e293b' }}>
          {lecture.course_id?.name || 'N/A'}
        </div>
        <div className="small text-muted mt-1">
          {lecture.course_id?.code || ''}
        </div>
      </td>
      <td className="py-3 px-3 align-middle">
        <div className="fw-semibold" style={{ color: '#1e293b' }}>
          {lecture.subject_id?.name || 'N/A'}
        </div>
        <div className="small text-muted mt-1">
          {lecture.subject_id?.code || ''}
        </div>
      </td>
      <td className="py-3 px-3 align-middle">
        {lecture.department_id?.name || 'N/A'}
      </td>
      <td className="py-3 px-3 align-middle">
        <motion.span
          variants={blinkVariants}
          initial="initial"
          animate="blink"
          className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold small"
          style={{
            backgroundColor: `${getStatusColor(lecture.status)}15`,
            color: getStatusColor(lecture.status),
            border: `1px solid ${getStatusColor(lecture.status)}30`,
            fontSize: '0.8rem'
          }}
        >
          {lecture.status === "OPEN" && <FaQrcode size={12} />}
          {lecture.status === "CLOSED" && <FaCheckCircle size={12} />}
          {lecture.status}
        </motion.span>
      </td>
      <td className="py-3 px-3 align-middle">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/timetable/weekly-timetable`);
          }}
          className="btn btn-sm d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: BRAND_COLORS.primary.gradient,
            color: 'white',
            border: 'none'
          }}
        >
          <FaEye size={16} />
        </motion.button>
      </td>
    </motion.tr>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message }) {
  return (
    <div className="text-center py-5" style={{ color: '#64748b' }}>
      <div className="mb-4" style={{ fontSize: '4rem', opacity: 0.6, color: '#e2e8f0' }}>
        {icon}
      </div>
      <h4 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>
        {title}
      </h4>
      <p className="mb-0" style={{ fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
        {message}
      </p>
    </div>
  );
}