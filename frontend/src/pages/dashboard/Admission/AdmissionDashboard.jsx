import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import "./AdmissionDashboard.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaListOl,
  FaGraduationCap,
  FaUserTimes,
  FaExternalLinkAlt,
  FaArrowUp,
  FaUserGraduate,
  FaTachometerAlt,
  FaEye,
  FaArrowRight,
  FaUsers,
  FaPlus,
  FaEdit,
  FaSyncAlt,
  FaExclamationTriangle
} from "react-icons/fa";

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

export default function AdmissionDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pendingCount: 0, approvalsThisWeek: 0, rejectionsThisWeek: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/admission/dashboard");
        setStats(res.data);
        setRecent(res.data.recentApplications || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Loading fullScreen size="lg" text="Loading Admission Dashboard..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  const { pendingCount, approvalsThisWeek, rejectionsThisWeek } = stats;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dashboard-wrapper"
      >
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
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="header-icon-wrapper"
                    >
                      <FaUserGraduate />
                    </motion.div>
                    <div className="header-title-section">
                      <h1 className="header-title">
                        Admission Dashboard
                      </h1>
                      <p className="header-subtitle">
                        Manage student applications and admissions lifecycle
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center gap-3 justify-content-center justify-content-md-end">
                    <div className="header-time-display">
                      <div className="time-label">Current Time</div>
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
                      onClick={() => window.location.reload()}
                      className="dashboard-btn btn-refresh"
                      onFocus={(e) => {
                        e.target.style.outline = '2px solid #1a4b6d';
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.outline = 'none';
                      }}
                    >
                      <motion.div variants={spinVariants} animate="animate">
                        <FaSyncAlt />
                      </motion.div>
                      <span className="btn-text">Refresh</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= STATISTICS GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="dashboard-section"
          >
            <div className="row g-3 g-md-4">
              <div className="col-12 col-sm-6 col-lg-4">
                <StatCard
                  icon={FaClock}
                  label="Pending Applications"
                  value={pendingCount}
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle="Awaiting review"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <StatCard
                  icon={FaCheckCircle}
                  label="Approvals This Week"
                  value={approvalsThisWeek}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Students approved"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <StatCard
                  icon={FaTimesCircle}
                  label="Rejections This Week"
                  value={rejectionsThisWeek}
                  color={BRAND_COLORS.danger.main}
                  gradient={BRAND_COLORS.danger.gradient}
                  subtitle="Applications rejected"
                />
              </div>
            </div>
          </motion.div>

          {/* ================= MAIN CONTENT GRID ================= */}
          <div className="row g-3 g-md-4 dashboard-main-content">
            {/* RECENT PENDING APPLICATIONS - Full width on mobile, 8/12 on desktop */}
            <div className="col-12 col-lg-8">
              <motion.div
                variants={fadeInVariants}
                custom={1}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Recent Pending Applications"
                  icon={<FaClock />}
                  subtitle={`${recent.length} application${recent.length !== 1 ? 's' : ''} requiring attention`}
                  color={BRAND_COLORS.warning.main}
                >
                  <div className="section-card-body">
                    {recent.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {recent.slice(0, 5).map((app, idx) => (
                          <ApplicationItem
                            key={app._id}
                            application={app}
                            delay={idx * 0.05}
                            onClick={() => navigate(`/college/view-student/${app._id}`)}
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<FaCheckCircle style={{ color: BRAND_COLORS.success.main }} />}
                        title="No pending applications"
                        message="All student applications have been processed."
                        success={true}
                      />
                    )}
                    {recent.length > 5 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate("/admission/applications")}
                        className="dashboard-btn btn-view-all btn-warning w-100 mt-3"
                        onFocus={(e) => {
                          e.target.style.outline = '2px solid #1a4b6d';
                          e.target.style.outlineOffset = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.outline = 'none';
                        }}
                      >
                        <FaEye className="me-2" /> View All Applications ({recent.length})
                      </motion.button>
                    )}
                  </div>
                </SectionCard>
              </motion.div>
            </div>

            {/* QUICK ACTIONS - Full width on mobile, 4/12 on desktop */}
            <div className="col-12 col-lg-4">
              <motion.div
                variants={fadeInVariants}
                custom={2}
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
                    <div className="row g-3">
                      <div className="col-12">
                        <QuickActionCard
                          icon={FaClock}
                          label="Pending Applications"
                          path="/admission/applications"
                          color={BRAND_COLORS.warning.main}
                          gradient={BRAND_COLORS.warning.gradient}
                        />
                      </div>
                      <div className="col-12">
                        <QuickActionCard
                          icon={FaCheckCircle}
                          label="Approved Students"
                          path="/admission/approved"
                          color={BRAND_COLORS.success.main}
                          gradient={BRAND_COLORS.success.gradient}
                        />
                      </div>
                      <div className="col-12">
                        <QuickActionCard
                          icon={FaArrowUp}
                          label="Student Promotion"
                          path="/admission/promotion"
                          color={BRAND_COLORS.info.main}
                          gradient={BRAND_COLORS.info.gradient}
                        />
                      </div>
                      <div className="col-12">
                        <QuickActionCard
                          icon={FaGraduationCap}
                          label="View Alumni"
                          path="/admission/alumni"
                          color={BRAND_COLORS.secondary.main}
                          gradient={BRAND_COLORS.secondary.gradient}
                        />
                      </div>
                      <div className="col-12">
                        <QuickActionCard
                          icon={FaUserTimes}
                          label="Deactivated Students"
                          path="/admission/deactivated"
                          color={BRAND_COLORS.danger.main}
                          gradient={BRAND_COLORS.danger.gradient}
                        />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            </div>
          </div>
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
      background: 'linear-gradient(135deg, #f8fafc 0%, #f5f7fb 100%)',
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
function QuickActionCard({ icon: Icon, label, color, gradient, path }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
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

/* ================= APPLICATION ITEM ================= */
function ApplicationItem({ application, delay = 0, onClick }) {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ x: 5, backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="student-item"
      tabIndex={0}
      role="button"
      aria-label={`Review application for ${application.fullName}`}
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
        {application.fullName.charAt(0).toUpperCase()}
      </div>
      <div className="student-item-content">
        <div className="student-item-name">
          {application.fullName}
        </div>
        <div className="student-item-status">
          <span className="status-badge status-pending">
            <FaClock size={14} />
            <span className="status-text">Pending Review</span>
          </span>
        </div>
        <div className="student-item-meta">
          <div className="meta-item">
            <span className="meta-label">Email:</span>
            <span className="meta-value">{application.email}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Applied:</span>
            <span className="meta-value">{new Date(application.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">ID:</span>
            <span className="meta-value">{application._id.slice(-6).toUpperCase()}</span>
          </div>
        </div>
      </div>
      <div className="student-item-action">
        <div className="action-button">
          <FaEye size={16} />
        </div>
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
