import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

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
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            <div style={{
              padding: '1.75rem 2rem',
              background: BRAND_COLORS.primary.gradient,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  style={{
                    width: '72px',
                    height: '72px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    flexShrink: 0
                  }}
                >
                  <FaUniversity />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    {college?.name || 'College Dashboard'}
                  </h1>
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.1rem'
                  }}>
                    Real-time overview of institution's key metrics
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: '0.25rem' }}>Current Time</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
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
                  style={{
                    backgroundColor: 'white',
                    color: BRAND_COLORS.primary.main,
                    border: 'none',
                    padding: '0.875rem 1.75rem',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaEye /> View College Profile
                </motion.button>
              </div>
            </div>
            
            {/* College Info Bar */}
            {college && (
              <div style={{
                padding: '1rem 2rem',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaEnvelope style={{ color: BRAND_COLORS.primary.main }} />
                    <span style={{ color: '#4a5568', fontWeight: 500 }}>{college.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaMapMarkerAlt style={{ color: BRAND_COLORS.primary.main }} />
                    <span style={{ color: '#4a5568', fontWeight: 500 }}>Est. {college.establishedYear}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaShieldAlt style={{ color: BRAND_COLORS.success.main }} />
                    <span style={{ 
                      backgroundColor: '#dcfce7', 
                      color: '#166534', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}>
                      Active Institution
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    backgroundColor: '#dbeafe', 
                    color: BRAND_COLORS.primary.main, 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}>
                    Code: {college.code}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* ================= STATISTICS GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem'
            }}
          >
            <StatCard
              icon={FaUsers}
              label="Total Students"
              value={stats.totalStudents}
              color={BRAND_COLORS.success.main}
              gradient={BRAND_COLORS.success.gradient}
              subtitle="Enrolled students"
            />
            <StatCard
              icon={FaChalkboardTeacher}
              label="Total Teachers"
              value={stats.totalTeachers}
              color={BRAND_COLORS.info.main}
              gradient={BRAND_COLORS.info.gradient}
              subtitle="Active faculty members"
            />
            <StatCard
              icon={FaLayerGroup}
              label="Total Departments"
              value={stats.totalDepartments}
              color={BRAND_COLORS.warning.main}
              gradient={BRAND_COLORS.warning.gradient}
              subtitle="Academic departments"
            />
            <StatCard
              icon={FaGraduationCap}
              label="Total Courses"
              value={stats.totalCourses}
              color={BRAND_COLORS.primary.main}
              gradient={BRAND_COLORS.primary.gradient}
              subtitle="Active courses"
            />
            <StatCard
              icon={FaUserCheck}
              label="Pending Admissions"
              value={stats.pendingAdmissions}
              color={BRAND_COLORS.danger.main}
              gradient={BRAND_COLORS.danger.gradient}
              subtitle="Awaiting approval"
            />
          </motion.div>

          {/* ================= MAIN CONTENT GRID ================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* LEFT COLUMN - QUICK ACTIONS & RECENT ACTIVITIES */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* QUICK ACTIONS */}
                <motion.div
                  variants={fadeInVariants}
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <SectionCard
                    title="Quick Actions"
                    icon={<FaArrowRight />}
                    subtitle="Frequently used operations"
                    color={BRAND_COLORS.primary.main}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '1rem',
                      padding: '1rem'
                    }}>
                      {quickActions.map((action, idx) => (
                        <QuickActionCard
                          key={action.id}
                          icon={action.icon}
                          label={action.label}
                          color={action.color}
                          gradient={action.gradient}
                          path={action.path}
                          delay={idx * 0.05}
                        />
                      ))}
                    </div>
                  </SectionCard>
                </motion.div>

                {/* RECENT STUDENT ACTIVITIES */}
                <motion.div
                  variants={fadeInVariants}
                  custom={2}
                  initial="hidden"
                  animate="visible"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <SectionCard
                    title="Recent Student Activities"
                    icon={<FaClock />}
                    subtitle="Latest student applications"
                    color={BRAND_COLORS.info.main}
                  >
                    <div style={{ padding: '1rem' }}>
                      {recentStudents.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                          style={{
                            width: '100%',
                            marginTop: '1rem',
                            padding: '0.875rem',
                            backgroundColor: BRAND_COLORS.primary.main,
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <FaEye /> View All Students
                        </motion.button>
                      )}
                    </div>
                  </SectionCard>
                </motion.div>
              </div>
            </div>

            {/* RIGHT COLUMN - PENDING ADMISSIONS & SYSTEM STATUS */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* PENDING ADMISSIONS */}
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
                    <div style={{ padding: '1rem' }}>
                      {pendingAdmissions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {pendingAdmissions.map((student) => (
                            <StudentItem 
                              key={student._id} 
                              student={{ ...student, status: 'PENDING' }} 
                              isPending={true}
                              onClick={() => navigate(`/students/approve`)}
                            />
                          ))}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate("/students/approve")}
                            style={{
                              width: '100%',
                              marginTop: '1.25rem',
                              padding: '0.875rem',
                              backgroundColor: BRAND_COLORS.success.main,
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                            }}
                          >
                            <FaCheckCircle /> Approve Pending Students
                          </motion.button>
                        </div>
                      ) : (
                        <EmptyState 
                          icon={<FaCheckCircle style={{ color: BRAND_COLORS.success.main }} />} 
                          title="No pending admissions" 
                          message="All student applications have been processed."
                          success={true}
                        />
                      )}
                    </div>
                  </SectionCard>
                </motion.div>

                {/* SYSTEM STATUS */}
                <motion.div
                  variants={fadeInVariants}
                  custom={4}
                  initial="hidden"
                  animate="visible"
                >
                  <SectionCard
                    title="System Status"
                    icon={<FaAward />}
                    color={BRAND_COLORS.secondary.main}
                  >
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <StatusItem
                          title="Database"
                          detail="Operational"
                          status="online"
                          icon={<FaDatabase />}
                        />
                        <StatusItem
                          title="Authentication"
                          detail="Secure & Active"
                          status="online"
                          icon={<FaShieldAlt />}
                        />
                        <StatusItem
                          title="File Storage"
                          detail="Available"
                          status="online"
                          icon={<FaCloudUploadAlt />}
                        />
                        <StatusItem
                          title="Reports Module"
                          detail="Scheduled maintenance"
                          status="maintenance"
                          icon={<FaCogs />}
                        />
                      </div>
                    </div>
                  </SectionCard>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
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
          style={{
            backgroundColor: BRAND_COLORS.primary.main,
            color: 'white',
            border: 'none',
            padding: '0.875rem 2rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0 auto',
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
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        borderLeft: `4px solid ${color}`,
        transition: 'all 0.3s ease',
        cursor: 'default'
      }}
    >
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexShrink: 0,
        fontSize: '1.75rem'
      }}>
        <Icon />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.9rem',
          color: '#64748b',
          fontWeight: 600,
          marginBottom: '0.25rem'
        }}>{label}</div>
        <div style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: '#1e293b',
          lineHeight: 1
        }}>{value}</div>
        {subtitle && (
          <div style={{
            fontSize: '0.85rem',
            color: '#94a3b8',
            marginTop: '0.25rem'
          }}>{subtitle}</div>
        )}
      </div>
    </motion.div>
  );
}

/* ================= SECTION CARD ================= */
function SectionCard({ title, icon, subtitle, color, children }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        borderBottom: '1px solid #eaeaea'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ color: color, fontSize: '1.2rem' }}>{icon}</span>
          {title}
        </h3>
        {subtitle && (
          <span style={{
            fontSize: '0.875rem',
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
      style={{
        backgroundColor: 'white',
        border: '2px solid transparent',
        borderRadius: '14px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        minHeight: '130px'
      }}
    >
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.5rem',
        flexShrink: 0
      }}>
        <Icon />
      </div>
      <div style={{
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '0.95rem',
        lineHeight: 1.4
      }}>
        {label}
      </div>
      <div style={{
        color: color,
        opacity: 0,
        transition: 'all 0.3s ease',
        marginTop: '0.25rem'
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        borderRadius: '12px',
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.25s ease'
      }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: BRAND_COLORS.primary.gradient,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: '1.1rem',
        flexShrink: 0
      }}>
        {student.fullName.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 600,
          color: '#1e293b',
          fontSize: '0.95rem',
          marginBottom: '0.25rem'
        }}>
          {student.fullName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isPending ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: `${BRAND_COLORS.warning.main}15`,
              color: BRAND_COLORS.warning.main,
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <FaClock /> Pending Admission
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: `${getStatusColor(student.status)}15`,
              color: getStatusColor(student.status),
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {getStatusIcon(student.status)}
              {student.status}
            </span>
          )}
        </div>
      </div>
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        background: BRAND_COLORS.primary.gradient,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s ease'
      }}>
        <FaEye size={16} />
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message, success = false }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '2.5rem 1.5rem',
      color: '#64748b'
    }}>
      <div style={{
        fontSize: '3.5rem',
        marginBottom: '1rem',
        opacity: success ? 0.9 : 0.6,
        color: success ? BRAND_COLORS.success.main : '#e2e8f0'
      }}>
        {icon}
      </div>
      <h4 style={{
        margin: '0 0 0.5rem 0',
        color: '#1e293b',
        fontWeight: 600,
        fontSize: '1.25rem'
      }}>
        {title}
      </h4>
      <p style={{ margin: 0, fontSize: '0.95rem' }}>
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