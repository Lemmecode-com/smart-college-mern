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
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Dashboard</span>
              <span style={{ color: '#94a3b8' }}>›</span>
              <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '0.9rem' }}>Teacher Overview</span>
            </div>
          </motion.div>

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
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    flexShrink: 0,
                    boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <FaChalkboardTeacher />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    Welcome, {teacher.name}
                  </h1>
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.1rem'
                  }}>
                    Empowering Education Through Technology
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
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: '0.25rem' }}>Employee ID</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {teacher.employeeId}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Teacher Info Bar */}
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
                  <FaShieldAlt style={{ color: BRAND_COLORS.info.main }} />
                  <span style={{ 
                    backgroundColor: '#dcfce7', 
                    color: '#166534', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}>
                    Active Faculty
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/profile/my-profile")}
                  style={{
                    backgroundColor: 'white',
                    color: BRAND_COLORS.primary.main,
                    border: '2px solid ' + BRAND_COLORS.primary.main,
                    padding: '0.5rem 1.25rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaEdit /> Edit Profile
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
            style={{
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem'
            }}
          >
            <StatCard
              icon={FaCalendarAlt}
              label="Total Lectures"
              value={stats.totalLecturesTaken || 0}
              color={BRAND_COLORS.primary.main}
              gradient={BRAND_COLORS.primary.gradient}
              subtitle="Lectures conducted"
            />
            <StatCard
              icon={FaQrcode}
              label="Open Sessions"
              value={stats.openSessions || 0}
              color={BRAND_COLORS.success.main}
              gradient={BRAND_COLORS.success.gradient}
              subtitle="Active attendance sessions"
            />
            <StatCard
              icon={FaCheckCircle}
              label="Closed Sessions"
              value={stats.closedSessions || 0}
              color={BRAND_COLORS.info.main}
              gradient={BRAND_COLORS.info.gradient}
              subtitle="Completed sessions"
            />
            <StatCard
              icon={FaChartBar}
              label="Attendance %"
              value={`${stats.attendancePercentage || 0}%`}
              color={BRAND_COLORS.warning.main}
              gradient={BRAND_COLORS.warning.gradient}
              subtitle="Overall attendance rate"
            />
          </motion.div>

          {/* ================= QUICK ACTIONS GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: '1.5rem' }}
          >
            <SectionCard
              title="Quick Actions"
              icon={<FaArrowRight />}
              subtitle="Frequently used operations"
              color={BRAND_COLORS.primary.main}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.25rem',
                padding: '1.25rem'
              }}>
                <ActionCard
                  icon={FaQrcode}
                  title="Create Attendance Session"
                  desc="Start a new lecture attendance session"
                  link="/timetable/weekly-timetable"
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                />
                <ActionCard
                  icon={FaUsers}
                  title="Mark Attendance"
                  desc="Record student attendance for active sessions"
                  link="/attendance/my-sessions-list"
                  color={BRAND_COLORS.info.main}
                  gradient={BRAND_COLORS.info.gradient}
                />
                <ActionCard
                  icon={FaChartBar}
                  title="View Attendance Report"
                  desc="Analyze your attendance statistics and trends"
                  link="/attendance/report"
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                />
                <ActionCard
                  icon={FaBell}
                  title="Send Notifications"
                  desc="Communicate with students and parents"
                  link="/teacher/notifications/create"
                  color={BRAND_COLORS.danger.main}
                  gradient={BRAND_COLORS.danger.gradient}
                />
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
              <div style={{ padding: '1rem' }}>
                {recentLectures && recentLectures.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={tableHeaderStyle}>Date</th>
                          <th style={tableHeaderStyle}>Course</th>
                          <th style={tableHeaderStyle}>Subject</th>
                          <th style={tableHeaderStyle}>Department</th>
                          <th style={tableHeaderStyle}>Status</th>
                          <th style={tableHeaderStyle}>Actions</th>
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
          Loading Teacher Dashboard...
        </h3>
        <p style={{ color: '#64748b', margin: 0 }}>
          Please wait while we fetch your teaching data
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
          <FaTimesCircle />
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
        fontSize: '1.75rem',
        boxShadow: `0 4px 12px ${color}30`
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

/* ================= ACTION CARD ================= */
function ActionCard({ icon: Icon, title, desc, link, color, gradient }) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(link)}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '1rem',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: `2px solid transparent`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: gradient,
        zIndex: 1
      }} />
      
      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="pulse"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2rem',
          flexShrink: 0,
          boxShadow: `0 6px 20px ${color}40`
        }}
      >
        <Icon />
      </motion.div>
      
      <h4 style={{
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#1e293b'
      }}>
        {title}
      </h4>
      
      <p style={{
        margin: 0,
        color: '#64748b',
        fontSize: '0.95rem',
        lineHeight: 1.5
      }}>
        {desc}
      </p>
      
      <div style={{
        marginTop: '0.5rem',
        padding: '0.5rem 1.25rem',
        backgroundColor: `${color}10`,
        color: color,
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem'
      }}>
        <FaArrowRight size={12} />
        Get Started
      </div>
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
      whileHover={{ backgroundColor: '#f8fafc' }}
      style={{
        borderBottom: '1px solid #e2e8f0',
        transition: 'background-color 0.2s ease'
      }}
    >
      <td style={tableCellStyle}>
        {new Date(lecture.lectureDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })}
      </td>
      <td style={tableCellStyle}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>
          {lecture.course_id?.name || 'N/A'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          {lecture.course_id?.code || ''}
        </div>
      </td>
      <td style={tableCellStyle}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>
          {lecture.subject_id?.name || 'N/A'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          {lecture.subject_id?.code || ''}
        </div>
      </td>
      <td style={tableCellStyle}>
        {lecture.department_id?.name || 'N/A'}
      </td>
      <td style={tableCellStyle}>
        <motion.span
          variants={blinkVariants}
          initial="initial"
          animate="blink"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '20px',
            backgroundColor: `${getStatusColor(lecture.status)}15`,
            color: getStatusColor(lecture.status),
            fontSize: '0.85rem',
            fontWeight: 600,
            border: `1px solid ${getStatusColor(lecture.status)}30`
          }}
        >
          {lecture.status === "OPEN" && <FaQrcode size={12} />}
          {lecture.status === "CLOSED" && <FaCheckCircle size={12} />}
          {lecture.status}
        </motion.span>
      </td>
      <td style={tableCellStyle}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/timetable/weekly-timetable`);
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: BRAND_COLORS.primary.gradient,
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
        >
          <FaEye size={16} />
        </motion.button>
      </td>
    </motion.tr>
  );
}

const tableCellStyle = {
  padding: '1rem',
  fontSize: '0.95rem',
  color: '#1e293b',
  borderBottom: '1px solid #e2e8f0'
};

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1.5rem',
      color: '#64748b'
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1.5rem',
        opacity: 0.6,
        color: '#e2e8f0'
      }}>
        {icon}
      </div>
      <h4 style={{
        margin: '0 0 0.75rem 0',
        color: '#1e293b',
        fontWeight: 700,
        fontSize: '1.5rem'
      }}>
        {title}
      </h4>
      <p style={{ 
        margin: 0, 
        fontSize: '1rem',
        maxWidth: '600px',
        margin: '0 auto',
        lineHeight: 1.6
      }}>
        {message}
      </p>
    </div>
  );
}