import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import CreateSessionModal from "./CreateSessionModal";
import { useNavigate } from "react-router-dom";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ActionIconButton from "../../../components/common/ActionIconButton";
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
  FaInfoCircle,
  FaQrcode,
  FaClock,
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

export default function AttendanceSessionsList() {
  const [sessions, setSessions] = useState([]);
  const [slots, setSlots] = useState([]);
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
      setError("Failed to load attendance sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch slots for modal dropdown
  const fetchSlots = async () => {
    try {
      const res = await api.get("/timetable");
      const allTimetables = res.data || [];

      // Get all slots from all timetables
      const allSlots = [];
      for (const timetable of allTimetables) {
        if (timetable.slots) {
          allSlots.push(...timetable.slots);
        }
      }
      setSlots(allSlots);
    } catch (err) {
      // Silently fail - slots are optional
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchSlots();  // ✅ Fetch slots for modal
  }, []);

  // Calculate stats
  const totalSessions = sessions.length;
  const openSessions = sessions.filter(s => s.status === "OPEN").length;
  const closedSessions = sessions.filter(s => s.status === "CLOSED").length;
  const totalStudents = sessions.reduce((sum, s) => sum + (s.totalStudents || 0), 0);

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
            text="Loading Attendance Sessions..."
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
        className="erp-page erp-viewport-min-100"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '0.5rem',
          paddingBottom: '2rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div className="teacher-attendance-sessions" style={{ maxWidth: '100%', margin: '0 auto' }}>
          <style>{`
            .teacher-attendance-sessions .attendance-stats-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 1rem;
            }
            .teacher-attendance-sessions .sessions-table-wrap {
              width: 100%;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
            .teacher-attendance-sessions .sessions-table-wrap th,
            .teacher-attendance-sessions .sessions-table-wrap td {
              white-space: nowrap;
            }
            .teacher-attendance-sessions .sessions-table-wrap td:nth-child(3) {
              white-space: normal;
              min-width: 260px;
            }
            .teacher-attendance-sessions .sessions-header-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 0.65rem;
            }
            .teacher-attendance-sessions .sessions-header-actions button {
              min-height: 42px;
              padding: 0 15px;
              border: 1px solid rgba(255,255,255,.35);
              border-radius: 10px;
              background: rgba(255,255,255,.12);
              color: white;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: .9rem;
              font-weight: 600;
              cursor: pointer;
              transition: background .2s ease, transform .2s ease;
            }
            .teacher-attendance-sessions .sessions-header-actions button:first-child {
              background: white;
              color: #0f3a4a;
            }
            .teacher-attendance-sessions .sessions-header-actions button:hover {
              transform: translateY(-1px);
              background: rgba(255,255,255,.22);
            }
            .teacher-attendance-sessions .sessions-header-actions button:first-child:hover {
              background: #f1f5f9;
            }
            @media (max-width: 900px) {
              .teacher-attendance-sessions .attendance-stats-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
            @media (max-width: 520px) {
              .teacher-attendance-sessions .attendance-stats-grid {
                gap: .65rem;
              }
            }
          `}</style>
          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/teacher/dashboard" },
              { label: "My Sessions" },
            ]}
          />

          <PageHeader
            icon={FaClipboardList}
            title="Attendance Sessions"
            subtitle="Manage and monitor all your attendance sessions"
            actions={
              <div className="sessions-header-actions">
                <button type="button" onClick={() => setShowModal(true)}>
                  <FaPlus /> Create Session
                </button>
                <button type="button" onClick={fetchSessions}>
                  <FaSyncAlt /> Refresh
                </button>
              </div>
            }
          />

          <section aria-label="Attendance session summary" style={{ marginBottom: '1.25rem' }}>
            <div className="attendance-stats-grid">
              <StatItem icon={<FaClipboardList />} label="Total Sessions" value={totalSessions} color={BRAND_COLORS.primary.main} />
              <StatItem icon={<FaCheckCircle />} label="Open Sessions" value={openSessions} color={BRAND_COLORS.success.main} />
              <StatItem icon={<FaTimesCircle />} label="Closed Sessions" value={closedSessions} color={BRAND_COLORS.secondary.main} />
              <StatItem icon={<FaUsers />} label="Total Students" value={totalStudents} color={BRAND_COLORS.info.main} />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.75rem',
              color: '#526579',
              fontSize: '0.85rem',
            }}>
              <FaInfoCircle style={{ color: BRAND_COLORS.primary.main }} />
              Click "View" to manage attendance
            </div>
          </section>


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
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(15, 58, 74, 0.06)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.1rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 650,
                color: '#173b50',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <FaClipboardList style={{ color: BRAND_COLORS.primary.main }} />
                Session List
              </h2>
              <div style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#fff8e8',
                color: '#8a5a10',
                padding: '0.4rem 0.7rem',
                border: '1px solid #f3dfb2',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 500
              }}>
                <FaInfoCircle aria-hidden="true" />
                Open sessions require attendance marking
              </div>
            </div>
            
            <div className="sessions-table-wrap">
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '760px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f8fa', borderBottom: '1px solid #dfe7ed' }}>
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
                      <td colSpan="6" style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.35 }}>
                          <FaClipboardList />
                        </div>
                        <h3 style={{ margin: '0 0 0.4rem', fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>
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
              slots={slots}
              onClose={() => setShowModal(false)}
              onSuccess={() => {
                fetchSessions();
                setShowModal(false);
              }}
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
    <div style={{
      minWidth: 0,
      minHeight: '88px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      padding: '0.9rem 1rem',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(15, 58, 74, 0.045)',
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '10px',
        backgroundColor: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.15rem',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#173b50', lineHeight: 1.2 }}>{value}</div>
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
  const slot = session.slotSnapshot || {};
  const schedule = [slot.day, slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : null, slot.room ? `Room ${slot.room}` : null]
    .filter(Boolean);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ backgroundColor: '#f8fafc' }}
      style={{
        borderBottom: '1px solid #e2e8f0',
        transition: 'background-color 0.15s ease',
        backgroundColor: isToday ? '#dbeafe' : 'white'
      }}
    >
      <td style={{ ...cellStyle, fontWeight: isToday ? 650 : 500, color: isToday ? BRAND_COLORS.primary.main : '#1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaCalendarAlt size={14} style={{ color: BRAND_COLORS.primary.main, flexShrink: 0 }} />
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
              marginLeft: '0.25rem'
            }}>
              Today
            </span>
          )}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaChalkboardTeacher size={15} style={{ color: BRAND_COLORS.info.main }} />
          Lecture {session.lectureNumber}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>
          {session.subject?.name || session.slotSnapshot?.subject_name || session.subject_id?.name || 'N/A'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>
          <FaChalkboardTeacher size={12} aria-hidden="true" />
          {session.slotSnapshot?.teacher_name || session.teacher_id?.name || 'N/A'}
        </div>
        {schedule.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#8493a3', marginTop: '0.25rem' }}>
            <FaClock size={11} aria-hidden="true" />
            {schedule.join(' · ')}
          </div>
        )}
      </td>
      <td style={cellStyle}>
        <motion.span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '999px',
            backgroundColor: `${statusColor}15`,
            color: statusColor,
            fontSize: '0.78rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <FaUsers size={14} style={{ color: BRAND_COLORS.info.main }} />
          <span style={{ fontWeight: 600 }}>{session.totalStudents || 0}</span>
        </div>
        {session.presentCount !== undefined && (
          <div style={{ color: BRAND_COLORS.success.main, fontSize: '0.75rem', marginTop: '0.2rem' }}>
            {session.presentCount} present
          </div>
        )}
      </td>
      <td style={cellStyle}>
        <ActionIconButton
          icon={FaEye}
          ariaLabel="View attendance session"
          tooltip="View attendance session"
          onClick={onView}
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
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
        />
      </td>
    </motion.tr>
  );
}

/* ================= STYLES ================= */
const headerCellStyle = {
  padding: '0.8rem 1rem',
  textAlign: 'left',
  fontWeight: 650,
  color: '#526579',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.045em',
  backgroundColor: '#f5f8fa'
};

const cellStyle = {
  padding: '0.85rem 1rem',
  fontSize: '0.85rem',
  color: '#1e293b',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle',
};