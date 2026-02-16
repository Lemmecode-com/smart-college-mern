import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { AuthContext } from "../../../../auth/AuthContext";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaArrowLeft,
  FaUniversity,
  FaLayerGroup,
  FaBook,
  FaClock,
  FaLock,
  FaUserShield,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaStar,
  FaQuestionCircle,
  FaLightbulb,
  FaGraduationCap,
  FaShieldAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from 'uuid';

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' },
  slotTypes: {
    LECTURE: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    LAB: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
    TUTORIAL: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    PRACTICAL: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' }
  }
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

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};

const scaleVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
  exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2 } }
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
];

export default function WeeklyTimetable() {
  const { timetableId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [timetable, setTimetable] = useState(null);
  const [weekly, setWeekly] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isHOD, setIsHOD] = useState(false);
  const [form, setForm] = useState({
    timetable_id: "",
    day: "MON",
    startTime: "",
    endTime: "",
    subject_id: "",
    teacher_id: "",
    room: "",
    slotType: "LECTURE",
  });
  const [showTooltip, setShowTooltip] = useState(null);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoContent, setInfoContent] = useState("");

  /* ================= LOAD WEEKLY ================= */
  useEffect(() => {
    if (!timetableId) return;
    
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/timetable/${timetableId}/weekly`);
        setTimetable(res.data.timetable);
        setWeekly(res.data.weekly || {});
        setForm(f => ({ ...f, timetable_id: res.data.timetable._id }));
        
        // Set HOD status based on user role
        setIsHOD(user?.role === "COLLEGE_ADMIN" || user?.role === "TEACHER");
        
        const [subRes, teachRes] = await Promise.all([
          api.get(`/subjects/course/${res.data.timetable.course_id}`),
          api.get(`/teachers/department/${res.data.timetable.department_id}`)
        ]);
        
        setSubjects(subRes.data || []);
        setTeachers(teachRes.data || []);
      } catch (err) {
        console.error("Failed to load timetable:", err);
        setError(err.response?.data?.message || "Failed to load weekly timetable. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [timetableId, user]);

  /* ================= AUTO SET TEACHER ================= */
  useEffect(() => {
    if (!form.subject_id) return;
    const subject = subjects.find(s => s._id === form.subject_id);
    if (subject?.teacher_id?._id) {
      setForm(prev => ({ ...prev, teacher_id: subject.teacher_id._id }));
    }
  }, [form.subject_id, subjects]);

  /* ================= ACTIONS ================= */
  const openCreate = (day, time) => {
    setEditSlot(null);
    setForm({
      timetable_id: timetable?._id || "",
      day,
      startTime: time.start,
      endTime: time.end,
      subject_id: "",
      teacher_id: "",
      room: "",
      slotType: "LECTURE",
    });
    setShowModal(true);
  };

  const openEdit = (slot, day) => {
    setEditSlot(slot);
    setForm({
      timetable_id: timetable?._id || "",
      day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject_id: slot.subject_id?._id || "",
      teacher_id: slot.teacher_id?._id || "",
      room: slot.room || "",
      slotType: slot.slotType || "LECTURE",
    });
    setShowModal(true);
  };

  const submitSlot = async () => {
    if (!form.subject_id) {
      setError("Please select a subject");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      if (editSlot) {
        await api.put(`/timetable/slot/${editSlot._id}`, form);
      } else {
        await api.post("/timetable/slot", form);
      }
      
      setShowModal(false);
      window.location.reload();
    } catch (err) {
      console.error("Failed to save slot:", err);
      setError(err.response?.data?.message || "Cannot modify published timetable or only HOD has access.");
      alert(err.response?.data?.message || "Cannot modify published timetable or only HOD has access.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this timetable slot? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/timetable/slot/${slotId}`);
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete slot:", err);
      alert(err.response?.data?.message || "Delete failed. Only HOD can delete slots or timetable may be published.");
    }
  };

  /* ================= INFO TOOLTIP ================= */
  const handleTooltip = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipContent(content);
    setTooltipPosition({
      top: rect.top + window.scrollY + 30,
      left: rect.left + window.scrollX + rect.width / 2
    });
    setShowTooltip(true);
  };

  const handleTooltipLeave = () => {
    setShowTooltip(false);
  };

  /* ================= INFO MODAL ================= */
  const openInfoModal = (content) => {
    setInfoContent(content);
    setShowInfoModal(true);
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
            Loading Timetable...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Preparing your weekly schedule
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
          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Error Loading Timetable</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </motion.div>
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
              onClick={() => navigate(-1)}
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
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>Weekly Timetable</span>
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
                  <FaCalendarAlt />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    {timetable?.name || 'Weekly Timetable'}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaUniversity />
                      <span style={{ opacity: 0.9 }}>Semester {timetable?.semester}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaClock />
                      <span style={{ opacity: 0.9 }}>{timetable?.academicYear}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaLayerGroup />
                      <span style={{ opacity: 0.9 }}>{timetable?.department_id?.name || 'N/A'}</span>
                    </div>
                    <motion.div
                      style={{
                        padding: '0.375rem 1rem',
                        borderRadius: '20px',
                        backgroundColor: timetable?.status === 'PUBLISHED' ? `${BRAND_COLORS.success.main}20` : `${BRAND_COLORS.warning.main}20`,
                        color: timetable?.status === 'PUBLISHED' ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: `1px solid ${timetable?.status === 'PUBLISHED' ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main}40`
                      }}
                    >
                      {timetable?.status === 'PUBLISHED' ? <FaCheckCircle size={14} /> : <FaLock size={14} />}
                      {timetable?.status}
                    </motion.div>
                  </div>
                </div>
              </div>
              {isHOD && (
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(26, 75, 109, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/timetable/create`)}
                  style={{
                    backgroundColor: 'white',
                    color: BRAND_COLORS.primary.main,
                    border: '2px solid white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <FaPlus /> Create New Timetable
                </motion.button>
              )}
            </div>
            
            {/* Info Banner */}
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: timetable?.status === 'PUBLISHED' ? '#dcfce7' : '#ffedd5',
              borderTop: '1px solid',
              borderColor: timetable?.status === 'PUBLISHED' ? '#bbf7d0' : '#fed7aa',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <FaInfoCircle style={{
                  color: timetable?.status === 'PUBLISHED' ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main,
                  fontSize: '1.25rem'
                }} />
                <span style={{ color: '#1e293b', fontWeight: 500 }}>
                  {timetable?.status === 'PUBLISHED'
                    ? "This timetable is published and visible to students. Only HOD can modify it."
                    : "This timetable is in draft mode. Complete it and publish when ready."
                  }
                </span>
              </div>
              {isHOD && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: timetable?.status === 'PUBLISHED' ? '#bbf7d0' : '#fed7aa',
                  color: timetable?.status === 'PUBLISHED' ? '#166534' : '#92400e',
                  padding: '0.375rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  <FaUserShield size={14} />
                  HOD Access: {isHOD ? 'Enabled' : 'Restricted'}
                </div>
              )}
            </div>
          </motion.div>
          
          {/* ================= TIMETABLE GRID ================= */}
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
                <FaCalendarAlt style={{ color: BRAND_COLORS.primary.main }} /> Weekly Schedule
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#dbeafe',
                color: BRAND_COLORS.primary.main,
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                <FaInfoCircle /> {Object.values(weekly).flat().length} slots scheduled
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '900px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={headerCellStyle}>Time</th>
                    {DAYS.map((day, idx) => (
                      <th
                        key={day}
                        style={{
                          ...headerCellStyle,
                          backgroundColor: '#f1f5f9',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            justifyContent: 'center'
                          }}>
                            {day}
                            <div style={{ 
                              fontSize: '0.8rem', 
                              opacity: 0.9, 
                              marginTop: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              {DAY_NAMES[idx]}
                              <motion.span
                                whileHover={{ scale: 1.2 }}
                                style={{
                                  cursor: 'pointer',
                                  color: BRAND_COLORS.info.main,
                                  fontSize: '0.85rem'
                                }}
                                onMouseEnter={(e) => handleTooltip(e, `Monday is the first day of the academic week. Timetable slots for Monday are displayed in this column.`)}
                                onMouseLeave={handleTooltipLeave}
                              >
                                <FaQuestionCircle />
                              </motion.span>
                            </div>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map((timeSlot, timeIdx) => (
                    <motion.tr
                      key={timeSlot.start}
                      variants={fadeInVariants}
                      custom={timeIdx + 1}
                      initial="hidden"
                      animate="visible"
                      style={{ 
                        backgroundColor: 'white',
                        cursor: 'default'
                      }}
                    >
                      <td style={{
                        ...cellStyle,
                        fontWeight: 600,
                        color: '#1e293b',
                        fontSize: '0.95rem',
                        borderRight: '1px solid #e2e8f0'
                      }}>
                        {timeSlot.start} - {timeSlot.end}
                      </td>
                      {DAYS.map((day) => {
                        const slots = weekly[day] || [];
                        const slot = slots.find(s => s.startTime === timeSlot.start && s.endTime === timeSlot.end);
                        return (
                          <td
                            key={`${day}-${timeSlot.start}`}
                            style={{
                              ...cellStyle,
                              padding: '0.5rem',
                              verticalAlign: 'top',
                              backgroundColor: slot ? 'white' : '#f8fafc',
                              borderLeft: slot ? `3px solid ${BRAND_COLORS.primary.main}` : '1px solid #e2e8f0'
                            }}
                          >
                            {slot ? (
                              <TimetableSlot
                                slot={slot}
                                isHOD={isHOD}
                                onEdit={() => openEdit(slot, day)}
                                onDelete={() => deleteSlot(slot._id)}
                                handleTooltip={handleTooltip}
                                handleTooltipLeave={handleTooltipLeave}
                              />
                            ) : (
                              isHOD ? (
                                <AddSlotButton
                                  onClick={() => openCreate(day, timeSlot)}
                                  time={timeSlot}
                                  day={day}
                                  handleTooltip={handleTooltip}
                                  handleTooltipLeave={handleTooltipLeave}
                                />
                              ) : (
                                <div style={{
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#cbd5e1',
                                  fontSize: '2rem'
                                }}>
                                  —
                                </div>
                              )
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Legend */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              justifyContent: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: BRAND_COLORS.slotTypes.LECTURE.bg,
                  border: `1px solid ${BRAND_COLORS.slotTypes.LECTURE.border}`
                }} />
                <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Lecture</span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: 'pointer',
                    color: BRAND_COLORS.info.main,
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => handleTooltip(e, "Lecture slots are for theoretical instruction. They typically involve the teacher presenting concepts to students in a classroom setting.")}
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaQuestionCircle />
                </motion.span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: BRAND_COLORS.slotTypes.LAB.bg,
                  border: `1px solid ${BRAND_COLORS.slotTypes.LAB.border}`
                }} />
                <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Lab</span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: 'pointer',
                    color: BRAND_COLORS.info.main,
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => handleTooltip(e, "Lab slots are for hands-on practical sessions. They typically involve students working with equipment or software in a lab environment.")}
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaQuestionCircle />
                </motion.span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: BRAND_COLORS.slotTypes.TUTORIAL.bg,
                  border: `1px solid ${BRAND_COLORS.slotTypes.TUTORIAL.border}`
                }} />
                <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Tutorial</span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: 'pointer',
                    color: BRAND_COLORS.info.main,
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => handleTooltip(e, "Tutorial slots are for small-group discussions and problem-solving sessions. They typically involve guided learning with the teacher.")}
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaQuestionCircle />
                </motion.span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  backgroundColor: BRAND_COLORS.slotTypes.PRACTICAL.bg,
                  border: `1px solid ${BRAND_COLORS.slotTypes.PRACTICAL.border}`
                }} />
                <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Practical</span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: 'pointer',
                    color: BRAND_COLORS.info.main,
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => handleTooltip(e, "Practical slots are for real-world application of concepts. They typically involve students working on projects or experiments.")}
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaQuestionCircle />
                </motion.span>
              </div>
              {isHOD && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: BRAND_COLORS.primary.main,
                    border: '2px dashed white',
                    boxShadow: '0 0 0 2px #1a4b6d'
                  }} />
                  <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>Click to add slot (HOD only)</span>
                  <motion.span
                    whileHover={{ scale: 1.2 }}
                    style={{
                      cursor: 'pointer',
                      color: BRAND_COLORS.info.main,
                      fontSize: '0.85rem'
                    }}
                    onMouseEnter={(e) => handleTooltip(e, "Only HODs can add new slots to published timetables. For draft timetables, all teachers can add slots.")}
                    onMouseLeave={handleTooltipLeave}
                  >
                    <FaQuestionCircle />
                  </motion.span>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* ================= MODAL ================= */}
          <AnimatePresence>
            {showModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  padding: '1rem'
                }}
                onClick={() => setShowModal(false)}
              >
                <motion.div
                  variants={scaleVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        {editSlot ? <FaEdit /> : <FaPlus />}
                        {editSlot ? 'Edit Timetable Slot' : 'Add New Timetable Slot'}
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowModal(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        &times;
                      </motion.button>
                    </div>
                    
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
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
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <FormField label="Subject" icon={<FaBook />}>
                        <select
                          value={form.subject_id}
                          onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select subject</option>
                          {subjects.map(s => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </FormField>
                      
                      <FormField label="Assigned Teacher" icon={<FaChalkboardTeacher />}>
                        <input
                          type="text"
                          value={teachers.find(t => t._id === form.teacher_id)?.name || "Select a subject to auto-assign teacher"}
                          disabled
                          style={{
                            ...inputStyle,
                            backgroundColor: form.teacher_id ? '#f0fdf4' : '#f8fafc',
                            color: form.teacher_id ? BRAND_COLORS.success.main : '#94a3b8',
                            fontWeight: form.teacher_id ? 600 : 400,
                            fontStyle: form.teacher_id ? 'normal' : 'italic'
                          }}
                        />
                      </FormField>
                      
                      <FormField label="Room Number" icon={<FaDoorOpen />}>
                        <input
                          type="text"
                          placeholder="e.g., A-101, Lab-2"
                          value={form.room}
                          onChange={(e) => setForm({ ...form, room: e.target.value })}
                          style={inputStyle}
                        />
                      </FormField>
                      
                      <FormField label="Slot Type" icon={<FaLayerGroup />}>
                        <select
                          value={form.slotType}
                          onChange={(e) => setForm({ ...form, slotType: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="LECTURE">Lecture</option>
                          <option value="LAB">Lab</option>
                          <option value="TUTORIAL">Tutorial</option>
                          <option value="PRACTICAL">Practical</option>
                        </select>
                      </FormField>
                      
                      <div style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        backgroundColor: '#dbeafe',
                        border: '1px solid #93c5fd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <FaInfoCircle style={{ color: BRAND_COLORS.primary.main, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                          <strong>Time:</strong> {form.startTime} - {form.endTime} • <strong>Day:</strong> {form.day}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginTop: '1.5rem',
                      justifyContent: 'flex-end'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowModal(false)}
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: 'white',
                          color: '#1e293b',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Cancel
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={submitSlot}
                        disabled={submitting || !form.subject_id}
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '12px',
                          border: 'none',
                          backgroundColor: (!form.subject_id || submitting) ? '#cbd5e1' : BRAND_COLORS.primary.main,
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: (!form.subject_id || submitting) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.3s ease',
                          boxShadow: (!form.subject_id || submitting) ? 'none' : '0 4px 15px rgba(26, 75, 109, 0.3)'
                        }}
                      >
                        {submitting ? (
                          <>
                            <motion.div variants={spinVariants} animate="animate">
                              <FaSyncAlt size={16} />
                            </motion.div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaCheckCircle /> {editSlot ? 'Update Slot' : 'Add Slot'}
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* ================= INFO TOOLTIP ================= */}
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'fixed',
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1001,
                maxWidth: '300px',
                fontSize: '0.9rem',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaInfoCircle style={{ color: BRAND_COLORS.primary.main }} />
                <span>{tooltipContent}</span>
              </div>
            </motion.div>
          )}
          
          {/* ================= INFO MODAL ================= */}
          <AnimatePresence>
            {showInfoModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1001,
                  padding: '1rem'
                }}
                onClick={() => setShowInfoModal(false)}
              >
                <motion.div
                  variants={scaleVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '1.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <FaInfoCircle /> Information
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowInfoModal(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        &times;
                      </motion.button>
                    </div>
                    
                    <div style={{ 
                      padding: '1rem', 
                      borderRadius: '12px', 
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                        <FaLightbulb style={{ color: BRAND_COLORS.warning.main }} />
                        <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>Timetable Information</h4>
                      </div>
                      <p style={{ 
                        margin: 0, 
                        color: '#4a5568',
                        lineHeight: 1.6
                      }}>
                        {infoContent}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD ================= */
function FormField({ label, icon, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '0.95rem'
      }}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

/* ================= TIMETABLE SLOT ================= */
function TimetableSlot({ slot, isHOD, onEdit, onDelete, handleTooltip, handleTooltipLeave }) {
  const slotType = BRAND_COLORS.slotTypes[slot.slotType] || BRAND_COLORS.slotTypes.LECTURE;
  
  return (
    <motion.div
      whileHover={{ 
        y: -2, 
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
        scale: 1.02
      }}
      style={{
        backgroundColor: 'white',
        border: `1px solid ${slotType.border}`,
        borderRadius: '12px',
        padding: '0.875rem',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: slotType.text,
        zIndex: 1
      }} />
      
      <div style={{
        fontWeight: 700,
        color: slotType.text,
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem'
      }}>
        <FaBook size={14} />
        {slot.subject_id?.name || 'N/A'}
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        fontSize: '0.85rem',
        color: '#4a5568'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <FaChalkboardTeacher size={12} />
          {slot.teacher_id?.name || 'N/A'}
          <motion.span
            whileHover={{ scale: 1.2 }}
            style={{
              cursor: 'pointer',
              color: BRAND_COLORS.info.main,
              fontSize: '0.85rem'
            }}
            onMouseEnter={(e) => handleTooltip(e, "The teacher assigned to this subject. Click to view teacher details or contact information.")}
            onMouseLeave={handleTooltipLeave}
          >
            <FaQuestionCircle />
          </motion.span>
        </span>
        {slot.room && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FaDoorOpen size={12} />
            Room {slot.room}
            <motion.span
              whileHover={{ scale: 1.2 }}
              style={{
                cursor: 'pointer',
                color: BRAND_COLORS.info.main,
                fontSize: '0.85rem'
              }}
              onMouseEnter={(e) => handleTooltip(e, "The room where this class will be held. Click to view room details or location on campus map.")}
              onMouseLeave={handleTooltipLeave}
            >
              <FaQuestionCircle />
            </motion.span>
          </span>
        )}
      </div>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.375rem',
        marginTop: '0.25rem'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.625rem',
          borderRadius: '6px',
          backgroundColor: slotType.bg,
          color: slotType.text,
          fontSize: '0.75rem',
          fontWeight: 600,
          border: `1px solid ${slotType.border}`
        }}>
          <FaLayerGroup size={10} />
          {slot.slotType}
        </span>
      </div>
      
      {isHOD && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: '1px dashed #e2e8f0'
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              color: BRAND_COLORS.primary.main,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              transition: 'all 0.2s ease'
            }}
          >
            <FaEdit size={14} /> Edit
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fee2e2',
              color: BRAND_COLORS.danger.main,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              transition: 'all 0.2s ease'
            }}
          >
            <FaTrash size={14} /> Delete
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ================= ADD SLOT BUTTON ================= */
function AddSlotButton({ onClick, time, day, handleTooltip, handleTooltipLeave }) {
  return (
    <motion.button
      whileHover={{ 
        scale: 1.05, 
        backgroundColor: '#dbeafe',
        transform: 'translateY(-3px)'
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        border: '2px dashed #93c5fd',
        borderRadius: '12px',
        backgroundColor: '#eff6ff',
        color: BRAND_COLORS.primary.main,
        fontSize: '2.5rem',
        fontWeight: 300,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'all 0.3s ease',
        padding: '0.5rem'
      }}
    >
      <FaPlus size={24} />
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 500,
        marginTop: '-0.5rem'
      }}>
        Add Slot
      </span>
      <motion.div
        whileHover={{ scale: 1.2 }}
        style={{
          cursor: 'pointer',
          color: BRAND_COLORS.info.main,
          fontSize: '0.85rem',
          position: 'absolute',
          bottom: '8px',
          right: '8px'
        }}
        onMouseEnter={(e) => handleTooltip(e, "Click to add a new timetable slot for this time period. Only HODs can add slots to published timetables.")}
        onMouseLeave={handleTooltipLeave}
      >
        <FaQuestionCircle size={16} />
      </motion.div>
    </motion.button>
  );
}

/* ================= STYLES ================= */
const headerCellStyle = {
  padding: '1rem',
  textAlign: 'center',
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
  padding: '0.75rem',
  fontSize: '0.95rem',
  color: '#1e293b',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'middle',
  minWidth: '150px'
};

const inputStyle = {
  width: '100%',
  padding: '0.875rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  fontSize: '1rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500
};