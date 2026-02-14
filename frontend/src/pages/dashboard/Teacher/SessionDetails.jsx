import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaPercentage,
  FaSyncAlt,
  FaTrash,
  FaLock,
  FaEye,
  FaArrowLeft,
  FaInfoCircle,
  FaSave,
  FaDoorClosed,
  FaListAlt,
  FaUserGraduate,
  FaClock,
  FaUniversity,
  FaBook,
  FaEnvelope
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
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};

const scaleVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } }
};

export default function SessionDetails() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);

  /* ================= FETCH SESSION ================= */
  const fetchSession = async () => {
    try {
      const res = await api.get(`/attendance/sessions/${sessionId}`);
      setSession(res.data);
    } catch (err) {
      console.error("Failed to load session:", err);
      setError("Failed to load session details. Please try again.");
    }
  };

  /* ================= FETCH RECORDS ================= */
  const fetchRecords = async () => {
    try {
      const res = await api.get(`/attendance/sessions/${sessionId}/records`);
      setRecords(res.data || []);
    } catch (err) {
      console.error("Failed to load records:", err);
      setError("Failed to load attendance records. Please try again.");
    }
  };

  /* ================= FETCH STUDENTS (ONLY IF OPEN) ================= */
  const fetchStudents = async () => {
    try {
      const res = await api.get(`/attendance/sessions/${sessionId}/students`);
      setStudents(res.data || []);
    } catch (err) {
      console.error("Failed to load students:", err);
      setError("Failed to load student list. Please try again.");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchSession(), fetchRecords()]);
      } catch (err) {
        setError("Failed to load session data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === "OPEN") {
      fetchStudents();
    }
  }, [session]);

  /* ================= DELETE SESSION ================= */
  const deleteSession = async () => {
    if (!window.confirm("Are you sure you want to delete this attendance session? This action cannot be undone.")) return;
    
    setDeleting(true);
    try {
      await api.delete(`/attendance/sessions/${sessionId}`);
      navigate("/attendance/sessions");
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert(err.response?.data?.message || "Failed to delete session. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  /* ================= MARK ATTENDANCE ================= */
  const saveAttendance = async () => {
    if (Object.keys(attendance).length === 0) {
      alert("Please mark attendance for at least one student before saving.");
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        attendance: Object.keys(attendance).map((id) => ({
          student_id: id,
          status: attendance[id],
        })),
      };

      await api.post(`/attendance/sessions/${sessionId}/mark`, payload);
      alert("Attendance saved successfully!");
      fetchRecords();
      setAttendance({});
    } catch (err) {
      console.error("Failed to save attendance:", err);
      alert(err.response?.data?.message || "Failed to save attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ================= CLOSE SESSION ================= */
  const closeSession = async () => {
    if (!window.confirm("Are you sure you want to close this session? Attendance cannot be modified after closing.")) return;
    
    setClosing(true);
    try {
      await api.put(`/attendance/sessions/${sessionId}/close`);
      alert("Session closed successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Failed to close session:", err);
      alert(err.response?.data?.message || "Failed to close session. Please try again.");
    } finally {
      setClosing(false);
    }
  };

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
            Loading Session Details...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Fetching attendance session data
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          margin: '2rem',
          padding: '1.5rem',
          borderRadius: '12px',
          backgroundColor: `${BRAND_COLORS.danger.main}0a`,
          border: `1px solid ${BRAND_COLORS.danger.main}`,
          color: BRAND_COLORS.danger.main,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <FaTimesCircle size={24} />
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Error Loading Session</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </motion.div>
    );
  }

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          margin: '2rem',
          padding: '2rem',
          borderRadius: '16px',
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#e2e8f0' }}>
          <FaListAlt />
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#1e293b' }}>
          Session Not Found
        </h3>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          The attendance session you're looking for doesn't exist or has been deleted.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/attendance/sessions')}
          style={{
            backgroundColor: BRAND_COLORS.primary.main,
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.75rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)'
          }}
        >
          <FaArrowLeft /> Back to Sessions
        </motion.button>
      </motion.div>
    );
  }

  /* ================= CALCULATIONS ================= */
  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
  const isSessionOpen = session.status === "OPEN";

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
              onClick={() => navigate('/attendance/sessions')}
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
              <FaArrowLeft /> Back to Sessions
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>
              Session Details
            </span>
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
                  <FaUserGraduate />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    Attendance Session Details
                  </h1>
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.1rem'
                  }}>
                    {session.subject_id?.name} • Lecture #{session.lectureNumber}
                  </p>
                </div>
              </div>
              <motion.div
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '20px',
                  backgroundColor: isSessionOpen ? `${BRAND_COLORS.success.main}15` : `${BRAND_COLORS.secondary.main}15`,
                  color: isSessionOpen ? BRAND_COLORS.success.main : BRAND_COLORS.secondary.main,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: `1px solid ${isSessionOpen ? BRAND_COLORS.success.main : BRAND_COLORS.secondary.main}30`,
                  boxShadow: isSessionOpen ? '0 0 15px rgba(40, 167, 69, 0.2)' : 'none'
                }}
              >
                {isSessionOpen ? <FaCheckCircle size={20} /> : <FaLock size={20} />}
                {session.status}
              </motion.div>
            </div>
            
            {/* Session Info Bar */}
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
                  <FaCalendarAlt style={{ color: BRAND_COLORS.primary.main }} />
                  <span style={{ color: '#4a5568', fontWeight: 500 }}>
                    {new Date(session.lectureDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaBook style={{ color: BRAND_COLORS.info.main }} />
                  <span style={{ color: '#4a5568', fontWeight: 500 }}>
                    {session.course_id?.name || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaUniversity style={{ color: BRAND_COLORS.warning.main }} />
                  <span style={{ color: '#4a5568', fontWeight: 500 }}>
                    {session.timetable_id?.department_id?.name || 'N/A'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaChalkboardTeacher style={{ color: BRAND_COLORS.primary.main }} />
                <span style={{ color: '#4a5568', fontWeight: 500 }}>
                  {session.teacher_id?.name || 'N/A'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ================= SESSION STATS ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: '1.5rem' }}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem'
            }}>
              <StatItem
                icon={<FaUsers />}
                label="Total Students"
                value={total}
                color={BRAND_COLORS.primary.main}
              />
              <StatItem
                icon={<FaCheckCircle />}
                label="Present"
                value={present}
                color={BRAND_COLORS.success.main}
                subtitle={`${Math.round((present / total) * 100) || 0}% of total`}
              />
              <StatItem
                icon={<FaTimesCircle />}
                label="Absent"
                value={absent}
                color={BRAND_COLORS.danger.main}
                subtitle={`${Math.round((absent / total) * 100) || 0}% of total`}
              />
              <StatItem
                icon={<FaPercentage />}
                label="Attendance %"
                value={`${percentage}%`}
                color={percentage >= 75 ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main}
                large
              />
            </div>
          </motion.div>

          {/* ================= ACTION BUTTONS (OPEN SESSION) ================= */}
          {isSessionOpen && (
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              style={{ marginBottom: '1.5rem' }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '1.5rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                padding: '1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <ActionButton
                    icon={<FaSave />}
                    label="Save Attendance"
                    color={BRAND_COLORS.success.main}
                    onClick={saveAttendance}
                    loading={saving}
                    disabled={Object.keys(attendance).length === 0}
                  />
                  <ActionButton
                    icon={<FaDoorClosed />}
                    label="Close Session"
                    color={BRAND_COLORS.warning.main}
                    onClick={closeSession}
                    loading={closing}
                  />
                  <ActionButton
                    icon={<FaTrash />}
                    label="Delete Session"
                    color={BRAND_COLORS.danger.main}
                    onClick={deleteSession}
                    loading={deleting}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= CLOSED SESSION BANNER ================= */}
          {!isSessionOpen && (
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              style={{
                marginBottom: '1.5rem',
                padding: '1.25rem',
                borderRadius: '16px',
                backgroundColor: '#dbeafe',
                border: '1px solid #93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <FaLock size={24} style={{ color: BRAND_COLORS.primary.main, flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>Session Closed</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#4a5568' }}>
                  This session is closed. Attendance records are finalized and cannot be modified.
                </p>
              </div>
            </motion.div>
          )}

          {/* ================= ATTENDANCE TABLE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={2}
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
                {isSessionOpen ? (
                  <>
                    <FaUserGraduate style={{ color: BRAND_COLORS.primary.main }} /> Mark Attendance
                  </>
                ) : (
                  <>
                    <FaListAlt style={{ color: BRAND_COLORS.info.main }} /> Attendance Records
                  </>
                )}
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: isSessionOpen ? '#ffedd5' : '#dcfce7',
                color: isSessionOpen ? '#c2410c' : '#166534',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                <FaInfoCircle /> {isSessionOpen ? students.length : records.length} {isSessionOpen ? 'students' : 'records'} {isSessionOpen ? 'to mark' : 'found'}
              </div>
            </div>
            
            {isSessionOpen ? (
              // OPEN SESSION: Mark Attendance Table
              <div style={{ overflowX: 'auto' }}>
                {students.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={headerCellStyle}>Student</th>
                        <th style={headerCellStyle}>Email</th>
                        <th style={headerCellStyle}>Roll No.</th>
                        <th style={headerCellStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => (
                        <StudentRow
                          key={student._id}
                          student={student}
                          attendance={attendance[student._id]}
                          onChange={(status) => setAttendance(prev => ({ ...prev, [student._id]: status }))}
                          delay={idx * 0.03}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState 
                    icon={<FaUsers />} 
                    title="No Students Found" 
                    message="No students are enrolled in this session. Please check the timetable configuration."
                  />
                )}
              </div>
            ) : (
              // CLOSED SESSION: View Records Table
              <div style={{ overflowX: 'auto' }}>
                {records.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={headerCellStyle}>Student</th>
                        <th style={headerCellStyle}>Email</th>
                        <th style={headerCellStyle}>Roll No.</th>
                        <th style={headerCellStyle}>Status</th>
                        <th style={headerCellStyle}>Marked At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, idx) => (
                        <RecordRow 
                          key={record._id || idx} 
                          record={record} 
                          delay={idx * 0.03}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState 
                    icon={<FaListAlt />} 
                    title="No Attendance Records" 
                    message="No attendance records have been marked for this session."
                  />
                )}
              </div>
            )}
            
            {/* Table Footer Actions */}
            {isSessionOpen && students.length > 0 && (
              <div style={{
                padding: '1.25rem',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ 
                  backgroundColor: '#dbeafe', 
                  color: BRAND_COLORS.primary.main,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  fontWeight: 500,
                  fontSize: '1.1rem'
                }}>
                  Students to mark: <strong>{students.length}</strong>
                </div>
                <ActionButton
                  icon={<FaSave />}
                  label="Save All Attendance"
                  color={BRAND_COLORS.primary.main}
                  onClick={saveAttendance}
                  loading={saving}
                  disabled={Object.keys(attendance).length === 0}
                  large
                />
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STAT ITEM ================= */
function StatItem({ icon, label, value, color, subtitle, large = false }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      borderRadius: '16px',
      backgroundColor: `${color}08`,
      border: `1px solid ${color}20`
    }}>
      <div style={{
        width: large ? '64px' : '52px',
        height: large ? '64px' : '52px',
        borderRadius: '16px',
        backgroundColor: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        fontSize: large ? '2rem' : '1.75rem',
        flexShrink: 0,
        boxShadow: `0 4px 12px ${color}20`
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '0.85rem',
          color: '#64748b',
          fontWeight: 500,
          marginBottom: '0.25rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: large ? '2.25rem' : '1.75rem',
          fontWeight: 800,
          color: '#1e293b',
          lineHeight: 1
        }}>
          {value}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '0.85rem',
            color: color,
            fontWeight: 600,
            marginTop: '0.25rem'
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= ACTION BUTTON ================= */
function ActionButton({ icon, label, color, onClick, loading = false, disabled = false, large = false }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        backgroundColor: (loading || disabled) ? '#cbd5e1' : color,
        color: 'white',
        border: 'none',
        padding: large ? '0.875rem 2rem' : '0.75rem 1.5rem',
        borderRadius: '12px',
        fontSize: large ? '1.1rem' : '1rem',
        fontWeight: 600,
        cursor: (loading || disabled) ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.3s ease',
        boxShadow: (loading || disabled) ? 'none' : `0 4px 15px ${color}40`,
        minWidth: large ? '200px' : 'auto',
        justifyContent: 'center'
      }}
    >
      {loading ? (
        <>
          <motion.div variants={spinVariants} animate="animate">
            <FaSyncAlt size={large ? 18 : 16} />
          </motion.div>
          {large ? 'Processing...' : 'Loading...'}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </motion.button>
  );
}

/* ================= ACTION INFO ================= */
function ActionInfo({ children }) {
  return (
    <div style={{
      backgroundColor: '#dbeafe',
      color: BRAND_COLORS.primary.main,
      padding: '0.875rem 1.5rem',
      borderRadius: '16px',
      fontWeight: 500,
      fontSize: '1.05rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flex: 1,
      maxWidth: '600px'
    }}>
      {children}
    </div>
  );
}

/* ================= STUDENT ROW (OPEN SESSION) ================= */
function StudentRow({ student, attendance, onChange, delay = 0 }) {
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
      <td style={{ ...cellStyle, fontWeight: 600, color: '#1e293b' }}>
        {student.fullName}
      </td>
      <td style={cellStyle}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#4a5568',
          fontSize: '0.95rem'
        }}>
          <FaEnvelope size={14} />
          {student.email}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#4a5568',
          fontSize: '0.95rem'
        }}>
          <FaUserGraduate size={14} />
          {student.rollNumber || 'N/A'}
        </div>
      </td>
      <td style={cellStyle}>
        <select
          value={attendance || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '0.95rem',
            fontWeight: 500,
            backgroundColor: 'white',
            color: '#1e293b',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '16px'
          }}
        >
          <option value="">Select status</option>
          <option value="PRESENT" style={{ color: BRAND_COLORS.success.main }}>Present</option>
          <option value="ABSENT" style={{ color: BRAND_COLORS.danger.main }}>Absent</option>
        </select>
      </td>
    </motion.tr>
  );
}

/* ================= RECORD ROW (CLOSED SESSION) ================= */
function RecordRow({ record, delay = 0 }) {
  const isPresent = record.status === "PRESENT";
  const statusColor = isPresent ? BRAND_COLORS.success.main : BRAND_COLORS.danger.main;
  
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
      <td style={{ ...cellStyle, fontWeight: 600, color: '#1e293b' }}>
        {record.student_id?.fullName || 'N/A'}
      </td>
      <td style={cellStyle}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#4a5568',
          fontSize: '0.95rem'
        }}>
          <FaEnvelope size={14} />
          {record.student_id?.email || 'N/A'}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#4a5568',
          fontSize: '0.95rem'
        }}>
          <FaUserGraduate size={14} />
          {record.student_id?.rollNumber || 'N/A'}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{
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
        }}>
          {isPresent ? <FaCheckCircle size={12} /> : <FaTimesCircle size={12} />}
          {record.status}
        </div>
      </td>
      <td style={cellStyle}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          color: '#64748b',
          fontSize: '0.9rem'
        }}>
          <FaClock size={14} />
          {new Date(record.createdAt).toLocaleString()}
        </div>
      </td>
    </motion.tr>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message }) {
  return (
    <div style={{
      padding: '3rem 1.5rem',
      textAlign: 'center',
      color: '#64748b'
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1.5rem',
        opacity: 0.3,
        color: '#e2e8f0'
      }}>
        {icon}
      </div>
      <h3 style={{
        margin: '0 0 0.75rem 0',
        color: '#1e293b',
        fontWeight: 700,
        fontSize: '1.75rem'
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: 0, 
        fontSize: '1.1rem',
        maxWidth: '600px',
        margin: '0 auto',
        lineHeight: 1.6
      }}>
        {message}
      </p>
    </div>
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