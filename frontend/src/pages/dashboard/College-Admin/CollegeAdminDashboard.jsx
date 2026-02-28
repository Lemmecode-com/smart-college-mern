import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
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
      path: "/college-admin/reports",
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
    return <LoadingDisplay />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-vh-100 bg-gradient"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
        }}
      >
        <Container fluid className="dashboard-container px-2 px-sm-3 px-md-4 px-lg-5 py-3 py-sm-4">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="mb-3 mb-sm-4 bg-white rounded-3 rounded-sm-4 overflow-hidden shadow"
            style={{
              marginBottom: '1.25rem',
              backgroundColor: 'white',
              borderRadius: '1rem',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)'
            }}
          >
            {/* Hero Section */}
            <div
              className="p-3 p-sm-4 p-lg-5"
              style={{
                padding: '1.5rem',
                background: BRAND_COLORS.primary.gradient,
                color: 'white'
              }}
            >
              <Row className="g-3 g-sm-4 align-items-center">
                <Col xs={12} md={7} lg={8}>
                  <div className="d-flex align-items-center gap-2 gap-sm-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 'clamp(50px, 12vw, 64px)',
                        height: 'clamp(50px, 12vw, 64px)',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 'clamp(10px, 3vw, 14px)',
                        fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)'
                      }}
                    >
                      <FaUniversity />
                    </motion.div>
                    <div>
                      <h1 className="mb-0 fw-bold" style={{
                        fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)',
                        fontWeight: 700,
                        lineHeight: 1.2
                      }}>
                        {college?.name || 'College Dashboard'}
                      </h1>
                      <p className="mt-1 mt-sm-2 mb-0 d-none d-lg-block" style={{
                        opacity: 0.9,
                        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                      }}>
                        Real-time overview of institution's key metrics
                      </p>
                    </div>
                  </div>
                </Col>
                <Col xs={12} md={5} lg={4}>
                  <div className="d-flex align-items-center gap-2 gap-sm-3 justify-content-center justify-content-md-end">
                    <div
                      className="text-center px-2 px-sm-3 py-1 py-sm-2 rounded-2 rounded-sm-3"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        minWidth: '100px'
                      }}
                    >
                      <div className="small mb-0 mb-sm-1" style={{ fontSize: '0.65rem', opacity: 0.85 }}>Time</div>
                      <div className="fw-bold" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)' }}>
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
                      className="dashboard-btn btn btn-light text-primary fw-semibold"
                      style={{
                        padding: 'clamp(0.5rem, 1.5vw, 0.625rem) clamp(0.75rem, 2vw, 1rem)',
                        borderRadius: '10px',
                        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s ease',
                        minHeight: '40px',
                        outline: 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onFocus={(e) => {
                        e.target.style.outline = '2px solid #1a4b6d';
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.outline = 'none';
                      }}
                    >
                      <FaEye className="me-1" /> <span className="d-none d-sm-inline">View Profile</span><span className="d-inline d-sm-none">Profile</span>
                    </motion.button>
                  </div>
                </Col>
              </Row>
            </div>
            
            {/* College Info Bar */}
            {college && (
              <div
                className="p-2 p-sm-3 p-md-4 bg-light border-top"
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0'
                }}
              >
                <Row className="g-2 g-sm-3">
                  <Col xs={12} sm={6} lg={3} className="d-flex align-items-center gap-2">
                    <FaEnvelope style={{ color: BRAND_COLORS.primary.main, fontSize: 'clamp(1rem, 2.5vw, 1.1rem)' }} />
                    <span className="text-dark fw-medium text-truncate" title={college.email} style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{college.email}</span>
                  </Col>
                  <Col xs={12} sm={6} lg={3} className="d-flex align-items-center gap-2">
                    <FaMapMarkerAlt style={{ color: BRAND_COLORS.primary.main, fontSize: 'clamp(1rem, 2.5vw, 1.1rem)' }} />
                    <span className="text-dark fw-medium" style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>Est. {college.establishedYear}</span>
                  </Col>
                  <Col xs={12} sm={6} lg={3} className="d-flex align-items-center gap-2">
                    <FaShieldAlt style={{ color: BRAND_COLORS.success.main, fontSize: 'clamp(1rem, 2.5vw, 1.1rem)' }} />
                    <Badge bg="success" bgOpacity={10} className="fw-semibold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>
                      Active Institution
                    </Badge>
                  </Col>
                  <Col xs={12} sm={6} lg={3} className="d-flex align-items-center gap-2 justify-content-sm-end">
                    <Badge bg="primary" bgOpacity={10} className="fw-semibold" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>
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
            className="mb-3 mb-sm-4"
          >
            <Row className="g-2 g-sm-3">
              <Col xs={12} sm={6} lg={4}>
                <StatCard
                  icon={FaUsers}
                  label="Total Students"
                  value={stats.totalStudents}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Enrolled students"
                />
              </Col>
              <Col xs={12} sm={6} lg={4}>
                <StatCard
                  icon={FaChalkboardTeacher}
                  label="Total Teachers"
                  value={stats.totalTeachers}
                  color={BRAND_COLORS.info.main}
                  gradient={BRAND_COLORS.info.gradient}
                  subtitle="Active faculty members"
                />
              </Col>
              <Col xs={12} sm={6} lg={4}>
                <StatCard
                  icon={FaLayerGroup}
                  label="Total Departments"
                  value={stats.totalDepartments}
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle="Academic departments"
                />
              </Col>
              <Col xs={12} sm={6} lg={4}>
                <StatCard
                  icon={FaGraduationCap}
                  label="Total Courses"
                  value={stats.totalCourses}
                  color={BRAND_COLORS.primary.main}
                  gradient={BRAND_COLORS.primary.gradient}
                  subtitle="Active courses"
                />
              </Col>
              <Col xs={12} sm={6} lg={4}>
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
          <Row className="g-3 g-sm-4">
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
                  <div className="p-2 p-sm-3">
                    <Row className="g-2 g-sm-3">
                      {quickActions.map((action, idx) => (
                        <Col xs={6} sm={6} lg={4} key={action.id}>
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
                  <div className="p-2 p-sm-3">
                    {pendingAdmissions.length > 0 ? (
                      <div className="d-flex flex-column gap-2 gap-sm-3">
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
                        className="dashboard-btn btn btn-success w-100 mt-3"
                        style={{
                          padding: 'clamp(0.625rem, 2vw, 0.75rem)',
                          borderRadius: '12px',
                          fontWeight: 600,
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                          minHeight: '44px',
                          outline: 'none'
                        }}
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
                  <div className="p-2 p-sm-3">
                    {recentStudents.length > 0 ? (
                      <div className="d-flex flex-column gap-2 gap-sm-3">
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
                        className="dashboard-btn btn btn-primary w-100 mt-3"
                        style={{
                          padding: 'clamp(0.625rem, 2vw, 0.75rem)',
                          borderRadius: '12px',
                          fontWeight: 600,
                          transition: 'all 0.3s ease',
                          minHeight: '44px',
                          outline: 'none'
                        }}
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
        </Container>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= LOADING DISPLAY ================= */
function LoadingDisplay() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div
          variants={spinVariants}
          animate="animate"
          style={{ marginBottom: '1.5rem', color: BRAND_COLORS.primary.main, fontSize: '4rem' }}
        >
          <FaSyncAlt />
        </motion.div>
        <h3 style={{ 
          margin: '0 0 0.5rem 0', 
          color: '#1e293b', 
          fontWeight: 700,
          fontSize: '1.5rem'
        }}>
          Loading Dashboard...
        </h3>
        <p style={{ color: '#64748b', margin: 0 }}>
          Please wait while we fetch your college data
        </p>
      </div>
    </div>
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
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: 'clamp(0.875rem, 2vw, 1.125rem)',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        borderLeft: `4px solid ${color}`,
        outline: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
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
      <div className="stat-card-icon" style={{
        width: 'clamp(36px, 8vw, 44px)',
        height: 'clamp(36px, 8vw, 44px)',
        borderRadius: '10px',
        background: gradient,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
        marginBottom: 'clamp(0.5rem, 1.5vw, 0.625rem)'
      }}>
        <Icon />
      </div>
      <div className="stat-card-content">
        <div className="card-label" style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.8rem)', color: '#64748b', marginBottom: '0.1875rem', lineHeight: 1.3 }}>{label}</div>
        <div className="card-value" style={{ fontSize: 'clamp(1.35rem, 4vw, 1.6rem)', fontWeight: 700, color: '#1e293b', lineHeight: 1.1 }}>{value}</div>
        {subtitle && <div className="card-subtitle" style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.7rem)', color: '#94a3b8', marginTop: '0.25rem', lineHeight: 1.3 }}>{subtitle}</div>}
      </div>
    </motion.div>
  );
}

/* ================= SECTION CARD ================= */
function SectionCard({ title, icon, subtitle, color, children }) {
  return (
    <div className="section-card" style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      width: '100%'
    }}>
      <div className="section-card-header" style={{
        padding: 'clamp(1rem, 2vw, 1.25rem) clamp(1rem, 2vw, 1.5rem)',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        borderBottom: '1px solid #eaeaea'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 'clamp(1.1rem, 3vw, 1.25rem)',
          fontWeight: 700,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(0.5rem, 1.5vw, 0.75rem)'
        }}>
          <span style={{ color: color, fontSize: 'clamp(1rem, 2.5vw, 1.2rem)' }}>{icon}</span>
          {title}
        </h3>
        {subtitle && (
          <span style={{
            fontSize: 'clamp(0.8rem, 2vw, 0.875rem)',
            color: '#64748b',
            marginLeft: '1.9rem',
            display: 'block',
            marginTop: '0.25rem'
          }}>
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
      style={{
        backgroundColor: 'white',
        border: '2px solid transparent',
        borderRadius: '14px',
        padding: 'clamp(1rem, 2.5vw, 1.25rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'clamp(0.5rem, 1.5vw, 0.75rem)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minHeight: 'clamp(120px, 28vw, 140px)',
        width: '100%',
        outline: 'none',
        height: '100%'
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid #1a4b6d';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      <div style={{
        width: 'clamp(48px, 11vw, 56px)',
        height: 'clamp(48px, 11vw, 56px)',
        borderRadius: '14px',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)',
        flexShrink: 0
      }}>
        <Icon />
      </div>
      <div style={{
        fontWeight: 600,
        color: '#1e293b',
        fontSize: 'clamp(0.85rem, 2.8vw, 0.95rem)',
        lineHeight: 1.4,
        wordWrap: 'break-word',
        width: '100%',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {label}
      </div>
      <div style={{
        color: color,
        opacity: 0,
        transition: 'all 0.3s ease',
        marginTop: '0.25rem',
        fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
      }}>
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        borderRadius: '12px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        minWidth: 0,
        outline: 'none',
        height: 'auto'
      }}
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
      {/* Avatar - Fixed size, never shrinks */}
      <div className="student-item-avatar" style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: BRAND_COLORS.primary.gradient,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: '1.05rem',
        flexShrink: 0
      }}>
        {student.fullName.charAt(0).toUpperCase()}
      </div>

      {/* Content - Flexible width */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div className="student-item-name" style={{
          fontWeight: 600,
          color: '#1e293b',
          fontSize: '0.9rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {student.fullName}
        </div>
        <div className="student-item-status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isPending ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              borderRadius: '20px',
              backgroundColor: `${BRAND_COLORS.warning.main}15`,
              color: BRAND_COLORS.warning.main,
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <FaClock size={14} />
              <span className="d-none d-sm-inline">Pending Admission</span>
              <span className="d-inline d-sm-none">Pending</span>
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              borderRadius: '20px',
              backgroundColor: `${getStatusColor(student.status)}15`,
              color: getStatusColor(student.status),
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              {getStatusIcon(student.status)}
              {student.status}
            </span>
          )}
        </div>
      </div>

      {/* View Button - Fixed size, never shrinks */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: BRAND_COLORS.primary.gradient,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        touchAction: 'manipulation'
      }}>
        <FaEye size={16} />
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message, success = false }) {
  return (
    <div className="empty-state" style={{
      textAlign: 'center',
      padding: 'clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 2vw, 1.5rem)',
      color: '#64748b'
    }}>
      <div className="empty-state-icon" style={{
        fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
        marginBottom: '1rem',
        opacity: success ? 0.9 : 0.6,
        color: success ? BRAND_COLORS.success.main : '#e2e8f0'
      }}>
        {icon}
      </div>
      <h4 className="empty-state-title" style={{
        margin: '0 0 0.5rem 0',
        color: '#1e293b',
        fontWeight: 600,
        fontSize: 'clamp(1.1rem, 3vw, 1.25rem)'
      }}>
        {title}
      </h4>
      <p className="empty-state-message" style={{ margin: 0, fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>
        {message}
      </p>
    </div>
  );
}

/* ================= STATUS ITEM ================= */
function StatusItem({ title, detail, status, icon }) {
  const statusColors = {
    online: { bg: '#4caf50', shadow: 'rgba(76, 175, 80, 0.6)' },
    maintenance: { bg: '#ffc107', shadow: 'rgba(255, 193, 7, 0.6)' },
    offline: { bg: '#dc3545', shadow: 'rgba(220, 53, 69, 0.6)' }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.875rem 0',
      borderBottom: '1px solid #f1f5f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          backgroundColor: `${statusColors[status]?.bg || '#6c757d'}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: statusColors[status]?.bg || '#6c757d',
          fontSize: '1.1rem',
          flexShrink: 0
        }}>
          {icon}
        </div>
        <div>
          <div style={{
            fontWeight: 600,
            color: '#1e293b',
            fontSize: '0.95rem',
            marginBottom: '0.125rem'
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: '#64748b'
          }}>
            {detail}
          </div>
        </div>
      </div>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: statusColors[status]?.bg || '#6c757d',
        boxShadow: `0 0 8px ${statusColors[status]?.shadow || 'rgba(108, 117, 125, 0.6)'}`,
        flexShrink: 0
      }} />
    </div>
  );
}

// Custom Cloud Upload Icon
const FaCloudUploadAlt = ({ size = 16, color = "#17a2b8" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l3-3m-3 3h12"
    />
  </svg>
);