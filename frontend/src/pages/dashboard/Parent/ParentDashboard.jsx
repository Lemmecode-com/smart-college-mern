// Parent Dashboard - Main overview page for parents
import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import Breadcrumb from "../../../components/Breadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import "../College-Admin/Dashboard.css";

import {
  FaUsers,
  FaUserGraduate,
  FaCalendarCheck,
  FaRupeeSign,
  FaBell,
  FaEye,
  FaChild,
  FaSchool,
  FaTachometerAlt,
  FaArrowRight,
  FaSyncAlt,
  FaExclamationTriangle,
  FaCheckCircle
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

export default function ParentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalChildren: 0,
    activeChildren: 0,
    totalFees: 0,
    pendingFees: 0,
  });

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  /* ================= DATA FETCHING ================= */
  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get("/parent/children");
      const childrenData = response.data.children || [];
      setChildren(childrenData);

      // Calculate stats
      const activeChildren = childrenData.filter(child =>
        child.status === "APPROVED"
      ).length;

      // Calculate total and pending fees for all children
      let totalFees = 0;
      let pendingFees = 0;

      for (const child of childrenData) {
        if (child.status === "APPROVED") {
          try {
            const feeResponse = await api.get(`/parent/student/${child._id}/fees`);
            const feeData = feeResponse.data;
            if (feeData) {
              totalFees += feeData.totalFee || 0;
              pendingFees += (feeData.totalFee - feeData.paidAmount) || 0;
            }
          } catch (feeError) {
            console.warn(`Failed to fetch fees for child ${child._id}:`, feeError);
          }
        }
      }

      setStats({
        totalChildren: childrenData.length,
        activeChildren,
        totalFees,
        pendingFees,
      });

    } catch (error) {
      toast.error("Failed to load children information");
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading your children..." />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="dashboard-wrapper"
      >
        <div         className="dashboard-container-inner">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="dashboard-header"
          >
            {/* Hero Section */}
            <div             className="dashboard-header-hero">
              <div className="row g-3 g-sm-4 align-items-center">
                <div className="col-12 col-md-7 col-lg-8">
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      className="header-icon-wrapper"
                    >
                      <FaChild />
                    </motion.div>
                    <div                     className="header-title-section">
                      <h1                       className="header-title">
                        Parent Dashboard
                      </h1>
                      <p                       className="header-subtitle">
                        Welcome back! Here's an overview of your children's academic progress.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-5 col-lg-4">
                  <div className="d-flex align-items-center gap-3 justify-content-center justify-content-md-end">
                    <div                     className="header-time-display">
                      <div                       className="time-label">Current Time</div>
                      <div                       className="time-value">
                        {new Date().toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => window.location.reload()}
                      className="dashboard-btn btn-profile"
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
                      <span>Refresh</span>
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
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaUsers}
                  label="Total Children"
                  value={stats.totalChildren}
                  color={BRAND_COLORS.primary.main}
                  gradient={BRAND_COLORS.primary.gradient}
                  subtitle="Registered children"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaUserGraduate}
                  label="Active Students"
                  value={stats.activeChildren}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Currently enrolled"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaCalendarCheck}
                  label="Avg Attendance"
                  value="--"
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle="Overall performance"
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <StatCard
                  icon={FaRupeeSign}
                  label="Pending Fees"
                  value={`₹${stats.pendingFees?.toLocaleString() || '0'}`}
                  color={BRAND_COLORS.danger.main}
                  gradient={BRAND_COLORS.danger.gradient}
                  subtitle="Outstanding payments"
                />
              </div>
            </div>
          </motion.div>

          {/* ================= CHILDREN OVERVIEW ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
          >
            <SectionCard
              title="My Children"
              icon={<FaChild />}
              subtitle={`${children.length} child${children.length !== 1 ? 'ren' : ''} registered`}
              color={BRAND_COLORS.primary.main}
            >
              <div className="section-card-body">
                {children.length === 0 ? (
                  <EmptyState
                    icon={<FaChild style={{ color: BRAND_COLORS.primary.main }} />}
                    title="No Children Found"
                    message="No student accounts are linked to your parent account yet."
                    success={false}
                  />
                ) : (
                  <div className="row g-3 g-md-4">
                    {children.map((child, idx) => (
                      <motion.div
                        key={child._id}
                        className="col-12 col-sm-6 col-lg-4"
                        variants={fadeInVariants}
                        custom={idx}
                        initial="hidden"
                        animate="visible"
                      >
                        <ChildCard
                          child={child}
                          onViewDetails={() => navigate(`/dashboard/parent/child/${child._id}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          </motion.div>
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
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
          className="parent-btn-primary"
          style={{
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
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
      <div       className="stat-card-icon" style={{ background: gradient }}>
        <Icon />
      </div>
      <div       className="stat-card-content">
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
    <div     className="section-card">
      <div       className="section-card-header">
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

/* ================= CHILD CARD ================= */
function ChildCard({ child, onViewDetails }) {
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
      onClick={onViewDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewDetails();
        }
      }}
      className="student-item"
      tabIndex={0}
      role="button"
      aria-label={`View ${child.fullName}`}
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
        {child.fullName.charAt(0).toUpperCase()}
      </div>
      <div className="student-item-content">
        <div className="student-item-name">
          {child.fullName}
        </div>
        <div className="student-item-status">
          <span className="status-badge" style={{ backgroundColor: `${getStatusColor(child.status)}15`, color: getStatusColor(child.status) }}>
            {getStatusIcon(child.status)}
            {child.status}
          </span>
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