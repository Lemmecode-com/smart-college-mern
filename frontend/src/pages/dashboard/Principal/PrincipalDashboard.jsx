import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import LogoImage from "../../../components/common/LogoImage";
import "./Dashboard.css";

import {
  FaUsers,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaUserCheck,
  FaUserGraduate,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaPlus,
  FaSpinner,
  FaEye,
  FaFileAlt,
  FaChartLine,
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhone,
  FaCalendarAlt,
  FaBuilding,
  FaBook,
  FaMoneyBillWave,
  FaClipboardCheck,
  FaTimes,
  FaInfoCircle,
} from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

const CHART_COLORS = ['#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'];

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

const ProgressRing = ({ percentage, color, size = 96, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="progress-ring"
      role="img"
      aria-label={`${percentage}% pending`}
    >
      <circle
        className="progress-ring-bg"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-ring-circle"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          stroke: color
        }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="progress-ring-text">
        {percentage}%
      </text>
    </svg>
  );
};

export default function PrincipalDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canEdit } = useRole();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDepartments: 0,
    totalCourses: 0,
    pendingAdmissions: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalApplications: 0,
    approvedPercentage: 0,
    pendingPercentage: 0,
    rejectedPercentage: 0,
  });
  const [college, setCollege] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
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
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, admissionRes, deptRes] = await Promise.all([
          api.get("/dashboard/principal"),
          api.get("/reports/admissions/college-admin-summary"),
          api.get("/departments"),
        ]);

        const dData = dashboardRes.data;
        const admData = admissionRes.data;
        const deptData = Array.isArray(deptRes.data) ? deptRes.data :
                         Array.isArray(deptRes.data.departments) ? deptRes.data.departments :
                         Array.isArray(deptRes.data.data) ? deptRes.data.data : [];

        setStats({
          totalStudents: dData?.stats?.totalStudents || 0,
          totalTeachers: dData?.stats?.totalTeachers || 0,
          totalDepartments: dData?.stats?.totalDepartments || 0,
          totalCourses: dData?.stats?.totalCourses || 0,
          pendingAdmissions: dData?.stats?.pendingAdmissions || 0,
          totalApproved: admData?.approved || 0,
          totalRejected: admData?.rejected || 0,
          totalApplications: admData?.totalApplications || 0,
          approvedPercentage: admData?.approvedPercentage || 0,
          pendingPercentage: admData?.pendingPercentage || 0,
          rejectedPercentage: admData?.rejectedPercentage || 0,
        });
        setCollege(dData?.college || null);
        setRecentStudents(dData?.recentStudents || []);

        const deptChart = deptData.slice(0, 6).map(dept => ({
          name: dept.name?.length > 12 ? dept.name.substring(0, 12) + '...' : dept.name,
          Teachers: (dept.sanctionedFacultyCount || 0),
          Capacity: (dept.sanctionedStudentIntake || 0) / 10
        }));
        setDepartmentData(deptChart);
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;

        logger.error("Principal dashboard load error:", statusCode, errorCode, err);

        setError({
          message: backendMessage || "Failed to load dashboard data",
          statusCode,
          errorCode,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <Loading fullScreen size="lg" text="Loading Dashboard..." />;

  if (error) {
    return (
      <ApiError
        title="Dashboard Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={() => window.location.reload()}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  const {
    totalStudents,
    totalTeachers,
    totalDepartments,
    totalCourses,
    pendingAdmissions,
    totalApproved,
    totalRejected,
    totalApplications,
    approvedPercentage,
    pendingPercentage,
    rejectedPercentage,
  } = stats;
  const approvalRate = approvedPercentage;

  const quickActions = [
    { icon: FaBuilding, label: "Departments", path: "/departments", color: BRAND_COLORS.info, count: totalDepartments },
    { icon: FaBook, label: "Courses", path: "/courses", color: BRAND_COLORS.success, count: totalCourses },
    { icon: FaChalkboardTeacher, label: "Teachers", path: "/teachers", color: BRAND_COLORS.warning, count: totalTeachers },
    { icon: FaUserGraduate, label: "Students", path: "/students/pending-approvals", color: BRAND_COLORS.primary, count: totalStudents },
  ];

  const admissionBreakdown = [
    { name: 'Approved', value: totalApproved, color: BRAND_COLORS.success.main },
    { name: 'Pending', value: pendingAdmissions, color: BRAND_COLORS.warning.main },
    { name: 'Rejected', value: totalRejected, color: BRAND_COLORS.danger.main },
  ];

  const quickLinks = [
    { label: 'View Departments', path: '/departments', icon: FaBuilding, color: BRAND_COLORS.info },
    { label: 'View Courses', path: '/courses', icon: FaBook, color: BRAND_COLORS.success },
    { label: 'View Teachers', path: '/teachers', icon: FaChalkboardTeacher, color: BRAND_COLORS.warning },
    { label: 'Review Students', path: '/students/pending-approvals', icon: FaUserGraduate, color: BRAND_COLORS.primary },
    { label: 'Fee Structures', path: '/fees/list', icon: FaMoneyBillWave, color: BRAND_COLORS.danger },
    { label: 'Analytics Reports', path: '/college-admin/reports-dashboard', icon: FaChartLine, color: BRAND_COLORS.secondary },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-page erp-viewport-min-100"
        style={{ background: "var(--bg-gradient)" }}
      >
        <div className="erp-page-content">
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="dashboard-header"
          >
            <div className="dashboard-header-hero">
              <Row className="g-3 g-sm-4 align-items-center">
                <Col xs={12} md={7} lg={8}>
                  <div className="d-flex align-items-center gap-3">
                    <motion.div
                      variants={pulseVariants}
                      initial="initial"
                      animate="pulse"
                      style={{
                        width: 88,
                        height: 88,
                        flexShrink: 0,
                      }}
                    >
                      <LogoImage documentId={college?.logoDocumentId} size={88} />
                    </motion.div>
                    <div className="header-title-section">
                      <h1 className="header-title">
                        {college?.name || 'Principal Dashboard'}
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
                    <FaCheckCircle className="info-icon info-icon-success" />
                    <Badge className="info-badge badge-success" bg={null}>
                      Active Institution
                    </Badge>
                  </Col>
                  <Col xs={12} sm={6} lg={3} className="info-item justify-content-sm-end">
                    <Badge className="info-badge badge-primary" bg={null}>
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
              <Col xs={12} sm={6} lg={4} xl={3}>
                <StatCard
                  icon={FaUserGraduate}
                  label="Total Students"
                  value={totalStudents}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Enrolled students"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={3}>
                <StatCard
                  icon={FaChalkboardTeacher}
                  label="Total Teachers"
                  value={totalTeachers}
                  color={BRAND_COLORS.info.main}
                  gradient={BRAND_COLORS.info.gradient}
                  subtitle="Active faculty members"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={3}>
                <StatCard
                  icon={FaLayerGroup}
                  label="Total Departments"
                  value={totalDepartments}
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle="Academic departments"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={3}>
                <StatCard
                  icon={FaBook}
                  label="Total Courses"
                  value={totalCourses}
                  color={BRAND_COLORS.primary.main}
                  gradient={BRAND_COLORS.primary.gradient}
                  subtitle="Active courses"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={3}>
                <StatCard
                  icon={FaUserCheck}
                  label="Pending Admissions"
                  value={pendingAdmissions}
                  color={BRAND_COLORS.danger.main}
                  gradient={BRAND_COLORS.danger.gradient}
                  subtitle="Awaiting approval"
                />
              </Col>
              <Col xs={12} sm={6} lg={4} xl={3}>
                <StatCard
                  icon={FaCheckCircle}
                  label="Approval Rate"
                  value={`${approvalRate}%`}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Approved applications"
                />
              </Col>
            </Row>
          </motion.div>

          {/* ================= MAIN CONTENT GRID ================= */}
          <Row className="g-3 g-md-4 dashboard-main-content">
            {/* PENDING ADMISSIONS */}
            <Col xs={12} lg={6}>
              <motion.div
                variants={fadeInVariants}
                custom={1}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Pending Approvals"
                  icon={<FaExclamationTriangle />}
                  subtitle={`${pendingAdmissions} student${pendingAdmissions !== 1 ? 's' : ''} awaiting review`}
                  color={BRAND_COLORS.warning.main}
                >
                  <div className="section-card-body">
                    {pendingAdmissions > 0 ? (
                      <div className="approval-flow">
                        <div className="progress-circle-container">
                          <ProgressRing percentage={pendingPercentage} color={BRAND_COLORS.warning.main} />
                          <div className="progress-label">Pending</div>
                        </div>
                        <div className="approval-breakdown">
                          <div className="breakdown-item">
                            <span className="breakdown-color" style={{ background: BRAND_COLORS.success.main }} />
                            <div>
                              <div className="breakdown-value">{totalApproved}</div>
                              <div className="breakdown-label">Approved</div>
                            </div>
                          </div>
                          <div className="breakdown-item">
                            <span className="breakdown-color" style={{ background: BRAND_COLORS.warning.main }} />
                            <div>
                              <div className="breakdown-value">{pendingAdmissions}</div>
                              <div className="breakdown-label">Pending</div>
                            </div>
                          </div>
                          <div className="breakdown-item">
                            <span className="breakdown-color" style={{ background: BRAND_COLORS.danger.main }} />
                            <div>
                              <div className="breakdown-value">{totalRejected}</div>
                              <div className="breakdown-label">Rejected</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon={<FaCheckCircle style={{ color: BRAND_COLORS.success.main }} />}
                        title="All caught up!"
                        message="No pending student approvals"
                        success={true}
                      />
                    )}
                    <div className="section-card-footer">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate("/students/pending-approvals")}
                        className="dashboard-btn btn-view-all btn-primary w-100"
                        onFocus={(e) => {
                          e.target.style.outline = '2px solid #1a4b6d';
                          e.target.style.outlineOffset = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.outline = 'none';
                        }}
                      >
                        <FaArrowRight className="me-2" /> Review All
                      </motion.button>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            {/* COLLEGE OVERVIEW */}
            <Col xs={12} lg={6}>
              <motion.div
                variants={fadeInVariants}
                custom={2}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="College Overview"
                  icon={<FaBuilding />}
                  color={BRAND_COLORS.primary.main}
                >
                  <div className="section-card-body">
                    {college ? (
                      <div className="college-info-grid">
                        <div className="info-item">
                          <span className="info-icon"><FaMapMarkerAlt /></span>
                          <div>
                            <div className="info-label">Address</div>
                            <div className="info-value">
                              {college.address?.length > 30 ? college.address.substring(0, 30) + '...' : college.address}
                            </div>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon"><FaEnvelope /></span>
                          <div>
                            <div className="info-label">Email</div>
                            <div className="info-value">{college.email}</div>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon"><FaPhone /></span>
                          <div>
                            <div className="info-label">Contact</div>
                            <div className="info-value">{college.contactNumber}</div>
                          </div>
                        </div>
                        <div className="info-item">
                          <span className="info-icon"><FaCalendarAlt /></span>
                          <div>
                            <div className="info-label">Established</div>
                            <div className="info-value">{college.establishedYear}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted mb-0">College details not available</p>
                    )}
                  </div>
                  <div className="section-card-footer">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/college/profile")}
                      className="dashboard-btn btn-view-all btn-outline-primary w-100"
                      onFocus={(e) => {
                        e.target.style.outline = '2px solid #1a4b6d';
                        e.target.style.outlineOffset = '2px';
                      }}
                      onBlur={(e) => {
                        e.target.style.outline = 'none';
                      }}
                    >
                      <FaEye className="me-2" /> View Full Profile
                    </motion.button>
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            {/* ADMISSION METRICS BREAKDOWN */}
            <Col xs={12}>
              <motion.div
                variants={fadeInVariants}
                custom={3}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Admission Metrics Breakdown"
                  icon={<FaClipboardCheck />}
                  color={BRAND_COLORS.success.main}
                >
                  <div className="section-card-body">
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <div className="metric-icon approved"><FaCheckCircle /></div>
                        <div className="metric-content">
                          <div className="metric-label">Approval Rate</div>
                          <div className="metric-value">{approvedPercentage}%</div>
                          <div className="metric-description">
                            {totalApproved} out of {totalApplications} applications approved
                          </div>
                        </div>
                      </div>

                      <div className="metric-item">
                        <div className="metric-icon pending"><FaClock /></div>
                        <div className="metric-content">
                          <div className="metric-label">Pending Rate</div>
                          <div className="metric-value">{pendingPercentage}%</div>
                          <div className="metric-description">
                            {pendingAdmissions} applications awaiting review
                          </div>
                        </div>
                      </div>

                      <div className="metric-item">
                        <div className="metric-icon rejected"><FaTimes /></div>
                        <div className="metric-content">
                          <div className="metric-label">Rejected Rate</div>
                          <div className="metric-value">{rejectedPercentage}%</div>
                          <div className="metric-description">
                            {totalRejected} applications not approved
                          </div>
                        </div>
                      </div>

                      <div className="metric-item">
                        <div className="metric-icon total"><FaUsers /></div>
                        <div className="metric-content">
                          <div className="metric-label">Total Applications</div>
                          <div className="metric-value">{totalApplications}</div>
                          <div className="metric-description">Approved + Pending + Rejected</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            {/* CHARTS */}
            <Col xs={12} lg={6}>
              <motion.div
                variants={fadeInVariants}
                custom={4}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Admission Overview"
                  icon={<FaChartLine />}
                  subtitle="Application status distribution"
                  color={BRAND_COLORS.info.main}
                >
                  <div className="section-card-body chart-body">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={admissionBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {admissionBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            <Col xs={12} lg={6}>
              <motion.div
                variants={fadeInVariants}
                custom={5}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Department Overview"
                  icon={<FaBook />}
                  subtitle="Faculty and capacity distribution"
                  color={BRAND_COLORS.success.main}
                >
                  <div className="section-card-body chart-body">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={departmentData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6c757d' }} axisLine={false} tickLine={false} />
                        <YAxis fontSize={12} tick={{ fill: '#6c757d' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        />
                        <Legend verticalAlign="bottom" height={28} />
                        <Bar dataKey="Teachers" fill={BRAND_COLORS.info.main} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Capacity" fill={BRAND_COLORS.success.main} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            {/* RECENT ADMISSIONS */}
            <Col xs={12}>
              <motion.div
                variants={fadeInVariants}
                custom={6}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Recent Admissions"
                  icon={<FaUserGraduate />}
                  subtitle="Latest student registrations"
                  color={BRAND_COLORS.primary.main}
                >
                  <div className="section-card-body p-0">
                    {recentStudents && recentStudents.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Course</th>
                              <th>Department</th>
                              <th>Status</th>
                              <th>Registered</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentStudents.slice(0, 5).map((student) => (
                              <tr key={student._id}>
                                <td>
                                  <div className="student-cell">
                                    <div className="avatar-circle">
                                      {student.fullName?.charAt(0) || 'S'}
                                    </div>
                                    <div>
                                      <div className="student-name">{student.fullName}</div>
                                      <div className="student-email">{student.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>{student.course_id?.name || 'N/A'}</td>
                                <td>{student.department_id?.name || 'N/A'}</td>
                                <td>
                                  <Badge bg={
                                    student.status === 'APPROVED' ? 'success' :
                                    student.status === 'PENDING' ? 'warning' : 'danger'
                                  }>
                                    {student.status}
                                  </Badge>
                                </td>
                                <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                                <td className="text-end">
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                      if (student.status === 'PENDING') {
                                        navigate(`/college/view-student/${student._id}`);
                                      } else {
                                        navigate(`/college/view-approved-student/${student._id}`);
                                      }
                                    }}
                                    className="dashboard-btn btn-view-all btn-outline-primary is-small"
                                    onFocus={(e) => {
                                      e.target.style.outline = '2px solid #1a4b6d';
                                      e.target.style.outlineOffset = '2px';
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.outline = 'none';
                                    }}
                                  >
                                    <FaEye className="me-1" /> View
                                  </motion.button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState
                        icon={<FaUserGraduate />}
                        title="No recent admissions"
                        message="New student registrations will appear here"
                      />
                    )}
                    {recentStudents && recentStudents.length > 5 && (
                      <div className="section-card-footer">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate("/students/pending-approvals")}
                          className="dashboard-btn btn-view-all btn-primary w-100"
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
                      </div>
                    )}
                  </div>
                </SectionCard>
              </motion.div>
            </Col>

            {/* QUICK ACCESS */}
            <Col xs={12}>
              <motion.div
                variants={fadeInVariants}
                custom={7}
                initial="hidden"
                animate="visible"
              >
                <SectionCard
                  title="Quick Access"
                  icon={<FaArrowRight />}
                  subtitle="Frequently used shortcuts"
                  color={BRAND_COLORS.secondary.main}
                >
                  <div className="section-card-body">
                    <Row xs={2} sm={3} lg={6} className="g-3">
                      {quickLinks.map((link, idx) => (
                        <Col key={idx}>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05, duration: 0.5 }}
                            whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)', borderColor: link.color.main }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(link.path)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(link.path);
                              }
                            }}
                            className="quick-action-card"
                            tabIndex={0}
                            role="button"
                            aria-label={link.label}
                            onFocus={(e) => {
                              e.currentTarget.style.outline = '2px solid #1a4b6d';
                              e.currentTarget.style.outlineOffset = '2px';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.outline = 'none';
                            }}
                          >
                            <div className="quick-action-icon" style={{ background: link.color.gradient }}>
                              <link.icon />
                            </div>
                            <div className="quick-action-label">{link.label}</div>
                            <div className="quick-action-arrow">
                              <FaArrowRight />
                            </div>
                          </motion.div>
                        </Col>
                      ))}
                    </Row>
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
