// Parent Dashboard - Main overview page for parents
import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";

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
  FaCheckCircle,
  FaClock
} from "react-icons/fa";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalChildren: 0,
    activeChildren: 0,
    avgAttendance: 0,
    totalFees: 0,
    pendingFees: 0,
  });

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    fetchChildren();
  }, [refreshKey]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get("/parent/children");
      const childrenData = response.data.children || [];
      setChildren(childrenData);

      const activeChildren = childrenData.filter(child =>
        ["APPROVED", "ENROLLED", "OFFER_MADE", "SEAT_CONFIRMED"].includes(child.status)
      ).length;

      let totalFees = 0;
      let pendingFees = 0;
      let totalAttendancePercentage = 0;
      let childrenWithAttendance = 0;

      const activeStatuses = ["APPROVED", "ENROLLED", "OFFER_MADE", "SEAT_CONFIRMED"];

      for (const child of childrenData) {
        if (activeStatuses.includes(child.status)) {
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

          try {
            const attResponse = await api.get(`/parent/student/${child._id}/attendance`);
            const attData = Array.isArray(attResponse.data) ? attResponse.data : (attResponse.data?.data || []);
            const present = attData.filter(rec => rec.status === 'PRESENT').length;
            const total = attData.length;
            if (total > 0) {
              totalAttendancePercentage += (present / total) * 100;
              childrenWithAttendance++;
            }
          } catch (attError) {
            console.warn(`Failed to fetch attendance for child ${child._id}:`, attError);
          }
        }
      }

      const avgAttendance = childrenWithAttendance > 0
        ? Math.round(totalAttendancePercentage / childrenWithAttendance)
        : 0;

      setStats({
        totalChildren: childrenData.length,
        activeChildren,
        avgAttendance,
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
  return (
    <div className="parent-portal-wrapper">
      <div
        className="parent-portal-container parent-loading-container"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Loading your children..."
        />
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
          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/dashboard/parent" },
              { label: "Parent Overview" }
            ]}
          />

  <PageHeader
  icon={FaChild}
  title="Parent Dashboard"
  subtitle="Welcome back! Here's an overview of your children's academic progress."
  actions={
    <>
      <div
        style={{
          minWidth: 105,
          padding: "0.55rem 0.9rem",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.12)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            opacity: 0.75,
            marginBottom: "0.2rem",
          }}
        >
          <FaClock style={{ marginRight: "0.25rem" }} />
          Time
        </div>

        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
          }}
        >
          {currentTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRefreshKey((prev) => prev + 1)}
        style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",       
                }}
                  onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(20, 27, 41, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}

      >
        <FaSyncAlt />
        <span>Refresh</span>
      </button>
    </>
  }
/>

          {/* ================= STATISTICS GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="parent-section-grid"
          >
            <StatCard
              icon={FaUsers}
              label="Total Children"
              value={stats.totalChildren}
              color={BRAND_COLORS.primary.main}
              gradient={BRAND_COLORS.primary.gradient}
              subtitle="Registered children"
            />
            <StatCard
              icon={FaUserGraduate}
              label="Active Students"
              value={stats.activeChildren}
              color={BRAND_COLORS.success.main}
              gradient={BRAND_COLORS.success.gradient}
              subtitle="Currently enrolled"
            />
            <StatCard
              icon={FaCalendarCheck}
              label="Avg Attendance"
              value={`${stats.avgAttendance || 0}%`}
              color={BRAND_COLORS.warning.main}
              gradient={BRAND_COLORS.warning.gradient}
              subtitle="Overall performance"
            />
            <StatCard
              icon={FaRupeeSign}
              label="Pending Fees"
              value={`₹${stats.pendingFees?.toLocaleString() || '0'}`}
              color={BRAND_COLORS.danger.main}
              gradient={BRAND_COLORS.danger.gradient}
              subtitle="Outstanding payments"
            />
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
              <div className="parent-section-card-body">
                {children.length === 0 ? (
                  <EmptyState
                    icon={<FaChild style={{ color: BRAND_COLORS.primary.main }} />}
                    title="No Children Found"
                    message="No student accounts are linked to your parent account yet."
                    success={false}
                  />
                ) : (
                  <div className="parent-section-grid">
                    {children.map((child, idx) => (
                      <motion.div
                        key={child._id}
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

/* ================= SECTION CARD ================= */
function SectionCard({ title, icon, subtitle, color, children }) {
  return (
    <div className="parent-section-card">
      <div className="parent-section-card-header">
        <h3 className="parent-section-card-title">
          <span className="parent-section-card-icon" style={{ color }}>{icon}</span>
          {title}
        </h3>
        {subtitle && (
          <span className="parent-section-card-subtitle">
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

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
      className="parent-child-card"
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
      <div className="parent-child-avatar">{getInitials(child.fullName)}</div>
      <div className="parent-child-info">
        <div className="parent-child-name">{child.fullName}</div>
        <div className="parent-child-details">
          <span className={`parent-status-badge ${
            child.status === 'APPROVED' ? 'parent-status-approved' :
            child.status === 'PENDING' ? 'parent-status-pending' :
            child.status === 'REJECTED' ? 'parent-status-rejected' :
            'parent-status-secondary'
          }`}>
            {child.status}
          </span>
        </div>
      </div>
      <div className="parent-child-action">
        <FaEye size={16} />
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