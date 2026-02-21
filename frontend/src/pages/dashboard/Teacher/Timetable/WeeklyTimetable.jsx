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
  FaGraduationCap,
  FaShieldAlt,
  FaUserTie
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

// Convert 24-hour to 12-hour format
const convertTo12Hour = (time24h) => {
  if (!time24h) return "";
  const [hours, minutes] = time24h.split(':');
  let h = parseInt(hours);
  const modifier = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${minutes} ${modifier}`;
};

export default function WeeklyTimetable() {
  const { timetableId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // State
  const [timetable, setTimetable] = useState(null);
  const [weekly, setWeekly] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // ✅ HOD Status Check
  const [isHOD, setIsHOD] = useState(false);
  const [hodVerified, setHodVerified] = useState(false);
  
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

  /* ================= LOAD WEEKLY ================= */
  useEffect(() => {
    loadTimetable();
  }, [timetableId]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError("");

      // Step 1: Load teacher profile to check HOD status
      const profileRes = await api.get("/teachers/my-profile");
      setTeacherProfile(profileRes.data);

      // Step 2: Check if teacher is HOD of their department
      const teacherData = profileRes.data;
      const isTeacherHOD = teacherData.department_id?.hod_id?.toString() === teacherData._id.toString();
      setIsHOD(isTeacherHOD);
      setHodVerified(true);

      // Step 3: Load timetable
      if (!timetableId) {
        const res = await api.get("/timetable/weekly");
        setTimetable(res.data.timetable || null);
        setWeekly(res.data.weekly || {});
        if (res.data.timetable) {
          setForm(f => ({ ...f, timetable_id: res.data.timetable._id }));
        }
      } else {
        const res = await api.get(`/timetable/${timetableId}/weekly`);
        setTimetable(res.data.timetable);
        setWeekly(res.data.weekly || {});
        setForm(f => ({ ...f, timetable_id: res.data.timetable._id }));

        // Load subjects and teachers for slot creation
        const [subRes, teachRes] = await Promise.all([
          api.get(`/subjects/course/${res.data.timetable.course_id}`),
          api.get(`/teachers/department/${res.data.timetable.department_id}`)
        ]);
        setSubjects(subRes.data || []);
        setTeachers(teachRes.data || []);
      }
    } catch (err) {
      console.error("Failed to load timetable:", err);
      setError(err.response?.data?.message || "Failed to load weekly timetable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTO SET TEACHER FROM SUBJECT ================= */
  useEffect(() => {
    if (!form.subject_id) return;
    const subject = subjects.find(s => s._id === form.subject_id);
    if (subject?.teacher_id?._id) {
      setForm(prev => ({ ...prev, teacher_id: subject.teacher_id._id }));
    }
  }, [form.subject_id, subjects]);

  /* ================= FORM HANDLERS ================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setEditSlot(null);
    setForm({
      timetable_id: timetable?._id || "",
      day: "MON",
      startTime: "",
      endTime: "",
      subject_id: "",
      teacher_id: "",
      room: "",
      slotType: "LECTURE",
    });
    setShowModal(true);
  };

  const openEditModal = (slot) => {
    setEditSlot(slot);
    setForm({
      timetable_id: timetable?._id || "",
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject_id: slot.subject_id?._id || slot.subject_id,
      teacher_id: slot.teacher_id?._id || slot.teacher_id,
      room: slot.room || "",
      slotType: slot.slotType || "LECTURE",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (editSlot) {
        // Update existing slot
        await api.put(`/timetable/slot/${editSlot._id}`, form);
        setForm(prev => ({ ...prev, startTime: "", endTime: "", subject_id: "", teacher_id: "", room: "" }));
        setShowModal(false);
        loadTimetable();
      } else {
        // Add new slot
        await api.post("/timetable/slot", form);
        setForm(prev => ({ ...prev, startTime: "", endTime: "", subject_id: "", teacher_id: "", room: "" }));
        setShowModal(false);
        loadTimetable();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save slot. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this slot? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/timetable/slot/${slotId}`);
      loadTimetable();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete slot.");
    }
  };

  // Loading State
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)'
      }}>
        <motion.div
          variants={spinVariants}
          animate="animate"
          style={{ color: BRAND_COLORS.primary.main, fontSize: '4rem' }}
        >
          <FaSyncAlt />
        </motion.div>
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
          padding: '2rem 1rem'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
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
                borderRadius: '8px'
              }}
            >
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600 }}>
              Weekly Timetable
            </span>
          </motion.div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '2rem',
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '2rem',
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
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem'
                  }}
                >
                  <FaCalendarAlt />
                </motion.div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                    Weekly Timetable
                  </h1>
                  <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                    {timetable?.name || 'My Schedule'}
                  </p>
                  {hodVerified && isHOD && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      padding: '0.375rem 0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      <FaUserTie /> HOD Access Enabled
                    </div>
                  )}
                </div>
              </div>
              
              {/* ✅ HOD Only: Add Slot Button */}
              {hodVerified && isHOD && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openAddModal}
                  style={{
                    backgroundColor: 'white',
                    color: BRAND_COLORS.primary.main,
                    border: '2px solid white',
                    padding: '0.875rem 1.75rem',
                    borderRadius: '14px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <FaPlus /> Add Slot
                </motion.button>
              )}
            </div>

            {/* Info Banner */}
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              {hodVerified && isHOD ? (
                <>
                  <FaUserShield style={{ color: BRAND_COLORS.success.main, fontSize: '1.5rem' }} />
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>
                    You are viewing this timetable as <strong>HOD</strong>. You can add, edit, and delete slots.
                  </span>
                </>
              ) : (
                <>
                  <FaEye style={{ color: BRAND_COLORS.info.main, fontSize: '1.5rem' }} />
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>
                    You are viewing this timetable as <strong>Teacher</strong>. Contact your HOD for any changes.
                  </span>
                </>
              )}
            </div>
          </motion.div>

          {/* ================= ERROR ================= */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '2rem',
                padding: '1.25rem',
                borderRadius: '12px',
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `2px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <FaExclamationTriangle size={24} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* ================= TIMETABLE GRID ================= */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '1000px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: BRAND_COLORS.primary.main, color: 'white' }}>
                    <th style={{ padding: '1.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Time</th>
                    {DAYS.map(day => (
                      <th key={day} style={{ padding: '1.25rem', fontWeight: 600, fontSize: '0.9rem' }}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { start: "09:00", end: "10:00" },
                    { start: "10:00", end: "11:00" },
                    { start: "11:00", end: "12:00" },
                    { start: "12:00", end: "13:00" },
                    { start: "13:00", end: "14:00" },
                    { start: "14:00", end: "15:00" },
                    { start: "15:00", end: "16:00" },
                    { start: "16:00", end: "17:00" }
                  ].map((time, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        fontWeight: 600,
                        color: BRAND_COLORS.primary.main,
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaClock />
                          {convertTo12Hour(time.start)} - {convertTo12Hour(time.end)}
                        </div>
                      </td>
                      {DAYS.map(day => {
                        const slots = weekly[day] || [];
                        const slot = slots.find(s => 
                          s.startTime === time.start && s.endTime === time.end
                        );
                        
                        return (
                          <td key={day} style={{
                            padding: '0.75rem',
                            minHeight: '100px',
                            verticalAlign: 'top'
                          }}>
                            {slot ? (
                              <div style={{
                                position: 'relative',
                                padding: '0.75rem',
                                borderRadius: '12px',
                                backgroundColor: slot.slotType === 'LAB' ? '#ffedd5' :
                                               slot.slotType === 'PRACTICAL' ? '#ede9fe' :
                                               '#dbeafe',
                                border: `2px solid ${slot.slotType === 'LAB' ? '#fed7aa' :
                                                       slot.slotType === 'PRACTICAL' ? '#ddd6fe' :
                                                       '#bfdbfe'}`,
                                marginBottom: '0.5rem'
                              }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.25rem' }}>
                                  {slot.subject_id?.name || 'N/A'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                  <FaChalkboardTeacher style={{ marginRight: '0.25rem' }} />
                                  {slot.teacher_id?.name || 'N/A'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                  <FaDoorOpen style={{ marginRight: '0.25rem' }} />
                                  {slot.room || 'N/A'}
                                </div>
                                <div style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                  color: '#1e293b'
                                }}>
                                  {slot.slotType}
                                </div>
                                
                                {/* ✅ HOD Only: Edit/Delete Actions */}
                                {hodVerified && isHOD && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    display: 'flex',
                                    gap: '0.25rem'
                                  }}>
                                    <button
                                      onClick={() => openEditModal(slot)}
                                      style={{
                                        padding: '0.25rem',
                                        backgroundColor: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: BRAND_COLORS.primary.main,
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(slot._id)}
                                      style={{
                                        padding: '0.25rem',
                                        backgroundColor: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        color: BRAND_COLORS.danger.main,
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{
                                minHeight: '80px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#cbd5e1',
                                fontSize: '1.5rem'
                              }}>
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

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
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '20px',
                  padding: '2rem',
                  maxWidth: '600px',
                  width: '90%',
                  maxHeight: '90vh',
                  overflow: 'auto'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem'
                }}>
                  <h2 style={{ margin: 0, color: '#1e293b' }}>
                    {editSlot ? 'Edit Slot' : 'Add New Slot'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {/* Day */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                        Day
                      </label>
                      <select
                        name="day"
                        value={form.day}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem'
                        }}
                      >
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    {/* Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                          Start Time
                        </label>
                        <input
                          type="time"
                          name="startTime"
                          value={form.startTime}
                          onChange={handleChange}
                          required
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                          End Time
                        </label>
                        <input
                          type="time"
                          name="endTime"
                          value={form.endTime}
                          onChange={handleChange}
                          required
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                        Subject
                      </label>
                      <select
                        name="subject_id"
                        value={form.subject_id}
                        onChange={handleChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                          <option key={s._id} value={s._id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Teacher (Auto-filled) */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                        Teacher
                      </label>
                      <input
                        type="text"
                        value={teachers.find(t => t._id === form.teacher_id)?.name || ""}
                        disabled
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          color: form.teacher_id ? BRAND_COLORS.success.main : '#94a3b8',
                          fontWeight: 600
                        }}
                      />
                      <small style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        Auto-assigned from subject
                      </small>
                    </div>

                    {/* Room */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                        Room
                      </label>
                      <input
                        type="text"
                        name="room"
                        value={form.room}
                        onChange={handleChange}
                        placeholder="e.g., A-101"
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem'
                        }}
                      />
                    </div>

                    {/* Slot Type */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                        Slot Type
                      </label>
                      <select
                        name="slotType"
                        value={form.slotType}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="LECTURE">Lecture</option>
                        <option value="LAB">Lab</option>
                        <option value="TUTORIAL">Tutorial</option>
                        <option value="PRACTICAL">Practical</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: submitting ? '#cbd5e1' : BRAND_COLORS.success.main,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {submitting ? <FaSyncAlt className="spin" /> : <FaCheckCircle />}
                      {editSlot ? 'Update Slot' : 'Add Slot'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: 'white',
                        color: '#64748b',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: submitting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}