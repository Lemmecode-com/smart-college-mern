import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { Container, Row, Col, Card, Button, Badge } from "react-bootstrap";
import "./Dashboard.css";

import {
  FaUniversity,
  FaUsers,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaUserCheck,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaPlus,
  FaSpinner,
  FaEye,
  FaFileAlt,
  FaBell,
  FaCalendarAlt,
  FaGraduationCap,
  FaAward,
  FaSyncAlt,
  FaInfoCircle,
  FaShieldAlt,
  FaDatabase,
  FaCogs,
  FaChartLine,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt
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

export default function CollegeAdminDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [college, setCollege] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    totalCourses: 0,
    pendingAdmissions: 0,
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [pendingAdmissions, setPendingAdmissions] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  /* ================= QUICK ACTIONS ================= */
  const quickActions = [
    {
      id: 1,
      icon: FaUsers,
      label: "Approve Students",
      path: "/students/approve",
      color: BRAND_COLORS.success.main,
      gradient: BRAND_COLORS.success.gradient
    },
    {
      id: 2,
      icon: FaChalkboardTeacher,
      label: "Manage Teachers",
      path: "/teachers",
      color: BRAND_COLORS.info.main,
      gradient: BRAND_COLORS.info.gradient
    },
    {
      id: 3,
      icon: FaLayerGroup,
      label: "Manage Departments",
      path: "/departments",
      color: BRAND_COLORS.warning.main,
      gradient: BRAND_COLORS.warning.gradient
    },
    {
      id: 4,
      icon: FaGraduationCap,
      label: "Manage Courses",
      path: "/courses",
      color: BRAND_COLORS.primary.main,
      gradient: BRAND_COLORS.primary.gradient
    },
    {
      id: 6,
      icon: FaBell,
      label: "Send Notification",
      path: "/notification/create",
      color: BRAND_COLORS.secondary.main,
      gradient: BRAND_COLORS.secondary.gradient
    },
    {
      id: 7,
      icon: FaFileAlt,
      label: "View Reports",
      path: "/college-admin/reports-dashboard",
      color: BRAND_COLORS.primary.main,
      gradient: BRAND_COLORS.primary.gradient
    },
    {
      id: 8,
      icon: FaCogs,
      label: "System Settings",
      path: "/system-settings/general",
      color: BRAND_COLORS.info.main,
      gradient: BRAND_COLORS.info.gradient
    }
  ];

  /* ================= UPDATE CURRENT TIME ================= */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  /* ================= LOAD DASHBOARD DATA ================= */
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get("/dashboard/college-admin");
        const data = res.data;

        // Set college data
        setCollege(data.college);

        // Set statistics
        setStats({
          totalStudents: data.stats.totalStudents || 0,
          totalTeachers: data.stats.totalTeachers || 0,
          totalDepartments: data.stats.totalDepartments || 0,
          totalCourses: data.stats.totalCourses || 0,
          pendingAdmissions: data.stats.pendingAdmissions || 0,
        });

        // Set recent students
        setRecentStudents(data.recentStudents || []);

        // Set pending admissions
        setPendingAdmissions(data.pendingAdmissions || []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError(
          err.response?.data?.message ||
            "Failed to load dashboard data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  /* ================= NAVIGATION HANDLER ================= */
  const handleNavigate = (path) => {
    navigate(path);
  };

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <ErrorDisplay 
        message={error} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Dashboard..." />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dashboard-wrapper"
      >
        {/* Main Container - Centered with max-width for better readability */}
        <div className="dashboard-container-inner">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="dashboard-header"
          >
            {/* Hero Section */}
            <div className="dashboard-header-hero">
              <Row className="g-3 g-sm-4 align-items-center">
                <Col xs={12} md={7} lg={8}>
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="header-icon-wrapper"
                    >
                      <FaUniversity />
                    </motion.div>
                    <div className="header-title-section">
                      <h1 className="header-title">
                        {college?.name || 'College Dashboard'}
                      </h1>
                      <p className="header-subtitle">
                        Real-time overview of institution's key metrics
                      </p>
                    </div>
                  </div>
                </Col>
                <Col xs={12} md={5} lg={4}>
                  <div className="d-flex align-items-center gap-3 justify-content-center justify-content-md-end">
                    <div className="header-time-display">
                      <div className="time-label">Time</div>
                      <div className="time-value">
                        {currentTime.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(26, 75, 109, 0.4)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate("/college/profile")}
                      className="dashboard-btn btn-profile"
                      onFocus={(e) => {
                        e.target.style.outline = '2px solid #1a4b6d';
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.outline = 'none';
                      }}
                    >
                      <FaEye className="me-1" /> <span className="btn-text">View Profile</span>
                    </motion.button>
                  </div>
                </Col>
              </Row>
            </div>

            {/* College Info Bar */}
            {college && (
              <div className="dashboard-header-info">
                <Row className="g-3">
                  <Col xs={12} sm={6} lg={3} className="info-item">
                    <FaEnvelope className="info-icon" />
                    <span className="info-text text-truncate" title={college.email}>{college.email}</span>
                  </Col>
                  <Col xs={12} sm={6} lg={3} className="info-item">
                    <FaMapMarkerAlt className="info-icon" />
                    <span className="info-text">Est. {college.establishedYear}</span>
                  </Col>
                  <Col xs={12} sm={6} lg={3} className="info-item">
                    <FaShieldAlt className="info-icon info-icon-success" />
                    <Badge className="info-badge badge-success">
                      Active Institution
                    </Badge>
                  </Col>
                  <Col xs={12} sm={6} lg={3} className="info-item justify-content-sm-end">
                    <Badge className="info-badge badge-primary">
                      Code: {college.code}
                    </Badge>
                  </Col>
                </Row>
              </div>
            )}
          </motion.div>

          {/* ================= STATISTICS GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="dashboard-section"
          >
            <Row className="g-3 g-md-4">
              <Col xs={12} sm={6} lg={4} xl={4}>
                <StatCard
                  icon={FaUsers}
                  label="Total Students"
                  value={stats.totalStudents}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Enrolled students"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={4}>
                <StatCard
                  icon={FaChalkboardTeacher}
                  label="Total Teachers"
                  value={stats.totalTeachers}
                  color={BRAND_COLORS.info.main}
                  gradient={BRAND_COLORS.info.gradient}
                  subtitle="Active faculty members"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={4}>
                <StatCard
                  icon={FaLayerGroup}
                  label="Total Departments"
                  value={stats.totalDepartments}
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle="Academic departments"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={4}>
                <StatCard
                  icon={FaGraduationCap}
                  label="Total Courses"
                  value={stats.totalCourses}
                  color={BRAND_COLORS.primary.main}
                  gradient={BRAND_COLORS.primary.gradient}
                  subtitle="Active courses"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={4}>
                <StatCard
                  icon={FaUserCheck}
                  label="Pending Admissions"
                  value={stats.pendingAdmissions}
                  color={BRAND_COLORS.danger.main}
                  gradient={BRAND_COLORS.danger.gradient}
                  subtitle="Awaiting approval"
                />
              </Col>
            </Row>
          </motion.div>

          {/* ================= MAIN CONTENT GRID ================= */}
          <Row className="g-3 g-md-4 dashboard-main-content">
            {/* QUICK ACTIONS - Full width on mobile, 8/12 on desktop */}
            <Col xs={12} lg={8}>
              <motion.div
                variants={fadeInVariants}
                custom={1}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Quick Actions"
                  icon={<FaArrowRight />}
                  subtitle="Frequently used operations"
                  color={BRAND_COLORS.primary.main}
                >
                  <div className="section-card-body">
                    <Row className="g-3">
                      {quickActions.map((action, idx) => (
                        <Col xs={6} sm={4} key={action.id}>
                          <QuickActionCard
                            icon={action.icon}
                            label={action.label}
                            color={action.color}
                            gradient={action.gradient}
                            path={action.path}
                            delay={idx * 0.05}
                          />
                        </Col>
                      ))}
                    </Row>
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            {/* PENDING ADMISSIONS - Full width on mobile, 4/12 on desktop */}
            <Col xs={12} lg={4}>
              <motion.div
                variants={fadeInVariants}
                custom={3}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Pending Admissions"
                  icon={<FaUserCheck />}
                  subtitle={`${pendingAdmissions.length} student${pendingAdmissions.length !== 1 ? 's' : ''} awaiting approval`}
                  color={BRAND_COLORS.warning.main}
                >
                  <div className="section-card-body">
                    {pendingAdmissions.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {pendingAdmissions.slice(0, 4).map((student) => (
                          <StudentItem
                            key={student._id}
                            student={{ ...student, status: 'PENDING' }}
                            isPending={true}
                            onClick={() => navigate(`/college/view-student/${student._id}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<FaCheckCircle style={{ color: BRAND_COLORS.success.main }} />}
                        title="No pending admissions"
                        message="All student applications have been processed."
                        success={true}
                      />
                    )}
                    {pendingAdmissions.length > 4 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate("/students")}
                        className="dashboard-btn btn-view-all btn-success w-100 mt-3"
                        onFocus={(e) => {
                          e.target.style.outline = '2px solid #1a4b6d';
                          e.target.style.outlineOffset = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.outline = 'none';
                        }}
                      >
                        <FaCheckCircle className="me-2" /> Approve All ({pendingAdmissions.length})
                      </motion.button>
                    )}
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            {/* RECENT STUDENT ACTIVITIES - Full width */}
            <Col xs={12}>
              <motion.div
                variants={fadeInVariants}
                custom={2}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Recent Student Activities"
                  icon={<FaClock />}
                  subtitle="Latest student applications"
                  color={BRAND_COLORS.info.main}
                >
                  <div className="section-card-body">
                    {recentStudents.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {recentStudents.slice(0, 5).map((student) => (
                          <StudentItem
                            key={student._id}
                            student={student}
                            onClick={() => navigate(`/college/view-approved-student/${student._id}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<FaUsers />}
                        title="No recent activities"
                        message="No student activities to display at the moment."
                      />
                    )}
                    {recentStudents.length > 5 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate("/students")}
                        className="dashboard-btn btn-view-all btn-primary w-100 mt-3"
                        onFocus={(e) => {
                          e.target.style.outline = '2px solid #1a4b6d';
                          e.target.style.outlineOffset = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.outline = 'none';
                        }}
                      >
                        <FaEye className="me-2" /> View All Students
                      </motion.button>
                    )}
                  </div>
                </SectionCard>
              </motion.div>
            </Col>
          </Row>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= ERROR DISPLAY ================= */
function ErrorDisplay({ message, onRetry }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
        maxWidth: '500px',
        width: '100%',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        <div style={{ 
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: BRAND_COLORS.danger.main,
          fontSize: '3rem'
        }}>
          <FaExclamationTriangle />
        </div>
        <h3 style={{ 
          margin: '0 0 0.5rem 0', 
          fontWeight: 700, 
          color: '#1e293b',
          fontSize: '1.75rem'
        }}>
          Dashboard Error
        </h3>
        <p style={{ 
          color: '#64748b', 
          marginBottom: '1.5rem',
          lineHeight: 1.6
        }}>
          {message}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="dashboard-btn"
          style={{
            backgroundColor: BRAND_COLORS.primary.main,
            color: 'white',
            border: 'none',
            padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(1.5rem, 3vw, 2rem)',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0 auto',
            boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)',
            minHeight: '48px'
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
      whileHover={{ y: -3, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)' }}
      whileTap={{ scale: 0.98 }}
      className="stat-card"
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
      <div className="stat-card-icon" style={{ background: gradient }}>
        <Icon />
      </div>
      <div className="stat-card-content">
        <div className="card-label">{label}</div>
        <div className="card-value">{value}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
    </motion.div>
  );
}

/* ================= SECTION CARD ================= */
function SectionCard({ title, icon, subtitle, color, children }) {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <h3 className="section-card-title">
          <span className="section-card-icon" style={{ color }}>{icon}</span>
          {title}
        </h3>
        {subtitle && (
          <span className="section-card-subtitle">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ================= QUICK ACTION CARD ================= */
function QuickActionCard({ icon: Icon, label, color, gradient, path, delay = 0 }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)', borderColor: color }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(path);
        }
      }}
      className="quick-action-card"
      tabIndex={0}
      role="button"
      aria-label={label}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid #1a4b6d';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      <div className="quick-action-icon" style={{ background: gradient }}>
        <Icon />
      </div>
      <div className="quick-action-label">{label}</div>
      <div className="quick-action-arrow">
        <FaArrowRight />
      </div>
    </motion.div>
  );
}

/* ================= STUDENT ITEM ================= */
function StudentItem({ student, isPending = false, onClick }) {
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return BRAND_COLORS.success.main;
      case "REJECTED":
        return BRAND_COLORS.danger.main;
      case "PENDING":
        return BRAND_COLORS.warning.main;
      default:
        return BRAND_COLORS.secondary.main;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return <FaCheckCircle />;
      case "REJECTED":
        return <FaExclamationTriangle />;
      case "PENDING":
        return <FaClock />;
      default:
        return <FaUserCheck />;
    }
  };

  return (
    <motion.div
      whileHover={{ x: 5, backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="student-item"
      tabIndex={0}
      role="button"
      aria-label={`View ${student.fullName}`}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid #1a4b6d';
        e.currentTarget.style.outlineOffset = '2px';
        e.currentTarget.style.backgroundColor = '#f8fafc';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <div className="student-item-avatar">
        {student.fullName.charAt(0).toUpperCase()}
      </div>
      <div className="student-item-content">
        <div className="student-item-name">
          {student.fullName}
        </div>
        <div className="student-item-status">
          {isPending ? (
            <span className="status-badge status-pending">
              <FaClock size={14} />
              <span className="status-text">Pending</span>
            </span>
          ) : (
            <span className="status-badge" style={{ backgroundColor: `${getStatusColor(student.status)}15`, color: getStatusColor(student.status) }}>
              {getStatusIcon(student.status)}
              {student.status}
            </span>
          )}
        </div>
      </div>
      <div className="student-item-action">
        <FaEye size={16} />
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message, success = false }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ opacity: success ? 0.9 : 0.6, color: success ? BRAND_COLORS.success.main : '#e2e8f0' }}>
        {icon}
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-message">{message}</p>
    </div>
  );
}
