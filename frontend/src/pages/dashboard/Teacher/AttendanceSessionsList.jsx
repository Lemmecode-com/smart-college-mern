import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import CreateSessionModal from "./CreateSessionModal";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaUsers,
  FaSyncAlt,
  FaPlus,
  FaArrowLeft,
  FaInfoCircle,
  FaBell,
  FaQrcode,
  FaClock,
  FaDatabase
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.6, ease: "easeOut" }
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
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

const blinkVariants = {
  initial: { opacity: 1 },
  blink: {
    opacity: [1, 0.5, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
  }
};

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-5, 5, -5],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};

export default function AttendanceSessionsList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/attendance/sessions");
      setSessions(res.data || []);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError("Failed to load attendance sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Calculate stats
  const totalSessions = sessions.length;
  const openSessions = sessions.filter(s => s.status === "OPEN").length;
  const closedSessions = sessions.filter(s => s.status === "CLOSED").length;
  const totalStudents = sessions.reduce((sum, s) => sum + (s.totalStudents || 0), 0);

  if (loading) {
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
            Loading Attendance Sessions...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Fetching your attendance session data
          </p>
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
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '1.5rem',
          paddingBottom: '2rem',
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/teacher/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: BRAND_COLORS.primary.main,
                background: 'none',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaArrowLeft /> Back to Dashboard
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>Attendance Sessions</span>
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
                  <FaClipboardList />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    Attendance Sessions
                  </h1>
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.1rem'
                  }}>
                    Manage and monitor all your attendance sessions
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(40, 167, 69, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(true)}
                  style={{
                    backgroundColor: BRAND_COLORS.success.main,
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                  }}
                >
                  <FaPlus /> Create Session
                </motion.button> */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchSessions}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaSyncAlt /> Refresh
                </motion.button>
              </div>
            </div>
            
            {/* Stats Bar */}
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
                <StatItem
                  icon={<FaClipboardList />}
                  label="Total Sessions"
                  value={totalSessions}
                  color={BRAND_COLORS.primary.main}
                />
                <StatItem
                  icon={<FaCheckCircle />}
                  label="Open Sessions"
                  value={openSessions}
                  color={BRAND_COLORS.success.main}
                />
                <StatItem
                  icon={<FaTimesCircle />}
                  label="Closed Sessions"
                  value={closedSessions}
                  color={BRAND_COLORS.secondary.main}
                />
                <StatItem
                  icon={<FaUsers />}
                  label="Total Students"
                  value={totalStudents}
                  color={BRAND_COLORS.info.main}
                />
              </div>
              <div style={{ 
                padding: '0.5rem 1.25rem',
                borderRadius: '20px',
                backgroundColor: '#dbeafe',
                color: BRAND_COLORS.primary.main,
                fontWeight: 600,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FaInfoCircle size={14} />
                Click "View" to manage attendance
              </div>
            </div>
          </motion.div>

          {/* ================= ERROR STATE ================= */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `1px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <FaTimesCircle size={20} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* ================= SESSIONS TABLE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <FaClipboardList style={{ color: BRAND_COLORS.primary.main }} /> Session List
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: '#ffedd5',
                color: '#c2410c',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                <FaBell /> Open sessions require attendance marking
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '800px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={headerCellStyle}>Date</th>
                    <th style={headerCellStyle}>Lecture No.</th>
                    <th style={headerCellStyle}>Subject</th>
                    <th style={headerCellStyle}>Status</th>
                    <th style={headerCellStyle}>Students</th>
                    <th style={headerCellStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length > 0 ? (
                    sessions.map((session, idx) => (
                      <SessionRow 
                        key={session._id} 
                        session={session} 
                        delay={idx * 0.05}
                        onView={() => navigate(`/attendance/session/${session._id}`)}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>
                          <FaClipboardList />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#1e293b' }}>
                          No Attendance Sessions Found
                        </h3>
                        <p style={{ margin: 0, color: '#64748b' }}>
                          Create your first session to start tracking attendance
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ================= MODAL ================= */}
          {showModal && (
            <CreateSessionModal
              onClose={() => setShowModal(false)}
              onSuccess={fetchSessions}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STAT ITEM ================= */
function StatItem({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        backgroundColor: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

/* ================= SESSION ROW ================= */
function SessionRow({ session, delay, onView }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "OPEN":
        return BRAND_COLORS.success.main;
      case "CLOSED":
        return BRAND_COLORS.secondary.main;
      default:
        return BRAND_COLORS.warning.main;
    }
  };

  const statusColor = getStatusColor(session.status);
  const isToday = new Date(session.lectureDate).toDateString() === new Date().toDateString();

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ backgroundColor: '#f8fafc' }}
      style={{
        borderBottom: '1px solid #e2e8f0',
        transition: 'background-color 0.2s ease',
        backgroundColor: isToday ? '#dbeafe' : 'white'
      }}
    >
      <td style={{ ...cellStyle, fontWeight: isToday ? 700 : 500, color: isToday ? BRAND_COLORS.primary.main : '#1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaCalendarAlt size={16} style={{ color: BRAND_COLORS.primary.main }} />
          {new Date(session.lectureDate).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
          {isToday && (
            <span style={{ 
              backgroundColor: `${BRAND_COLORS.success.main}15`,
              color: BRAND_COLORS.success.main,
              padding: '0.125rem 0.5rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginLeft: '0.5rem'
            }}>
              Today
            </span>
          )}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaChalkboardTeacher size={16} style={{ color: BRAND_COLORS.info.main }} />
          Lecture {session.lectureNumber}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>
          {session.subject_id?.name || 'N/A'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          {session.course_id?.name || 'N/A'}
        </div>
      </td>
      <td style={cellStyle}>
        <motion.span
          variants={session.status === "OPEN" ? blinkVariants : undefined}
          initial="initial"
          animate={session.status === "OPEN" ? "blink" : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '20px',
            backgroundColor: `${statusColor}15`,
            color: statusColor,
            fontSize: '0.85rem',
            fontWeight: 600,
            border: `1px solid ${statusColor}30`
          }}
        >
          {session.status === "OPEN" && <FaQrcode size={12} />}
          {session.status === "CLOSED" && <FaCheckCircle size={12} />}
          {session.status}
        </motion.span>
      </td>
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaUsers size={16} style={{ color: BRAND_COLORS.info.main }} />
          <span style={{ fontWeight: 600 }}>{session.totalStudents || 0}</span>
          {session.presentCount !== undefined && (
            <span style={{ 
              color: BRAND_COLORS.success.main,
              fontSize: '0.85rem',
              marginLeft: '0.5rem'
            }}>
              ({session.presentCount} present)
            </span>
          )}
        </div>
      </td>
      <td style={cellStyle}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onView}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: BRAND_COLORS.primary.main,
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(26, 75, 109, 0.3)'
          }}
        >
          <FaEye size={16} />
        </motion.button>
      </td>
    </motion.tr>
  );
}

/* ================= STYLES ================= */
const headerCellStyle = {
  padding: '1rem',
  textAlign: 'left',
  fontWeight: 700,
  color: '#1e293b',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: '#f1f5f9'
};

const cellStyle = {
  padding: '1rem',
  fontSize: '0.95rem',
  color: '#1e293b',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle'
};