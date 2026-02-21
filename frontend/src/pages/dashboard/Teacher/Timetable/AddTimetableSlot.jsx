import React, { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import api from "../../../../api/axios";
import {
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaDoorOpen,
  FaEdit,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaInfoCircle,
  FaUniversity,
  FaLayerGroup,
  FaBook
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

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function AddTimetableSlot() {
  const [params] = useSearchParams();
  const timetableFromUrl = params.get("timetable");

  /* ================= STATE ================= */
  const [timetables, setTimetables] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState({
    timetable_id: timetableFromUrl || "",
    day: "MON",
    startTime: "",
    endTime: "",
    subject_id: "",
    teacher_id: "",
    room: "",
    slotType: "LECTURE",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= LOAD TIMETABLES ================= */
  useEffect(() => {
    const loadTimetables = async () => {
      try {
        const res = await api.get("/timetable");
        setTimetables(res.data);
      } catch {
        setError("Failed to load timetables");
      } finally {
        setLoading(false);
      }
    };
    loadTimetables();
  }, []);

  /* ================= LOAD SUBJECTS + TEACHERS ================= */
  useEffect(() => {
    if (!form.timetable_id) return;

    const timetable = timetables.find(t => t._id === form.timetable_id);
    if (!timetable) return;

    const loadDeps = async () => {
      try {
        
        const [subjectsRes, teachersRes] = await Promise.all([
          api.get(`/subjects/course/${timetable.course_id}`),
          api.get(`/teachers/department/${timetable.department_id}`)
        ]);

        setSubjects(subjectsRes.data || []);
        setTeachers(teachersRes.data || []);
      } catch (err) {
        console.error("Failed to load subjects/teachers:", err);
        setError("Failed to load subjects or teachers. Please check if subjects are created for this course.");
      }
    };

    loadDeps();
  }, [form.timetable_id, timetables]);

  /* ================= AUTO-SET TEACHER FROM SUBJECT ================= */
  useEffect(() => {
    if (!form.subject_id) return;

    const subject = subjects.find(s => s._id === form.subject_id);
    if (subject?.teacher_id?._id) {
      setForm(prev => ({
        ...prev,
        teacher_id: subject.teacher_id._id
      }));
    }
  }, [form.subject_id, subjects]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/timetable/slot", {
        ...form,
        startTime: form.startTime,
        endTime: form.endTime,
      });

      setSuccess("✅ Timetable slot added successfully!");

      setForm(prev => ({
        ...prev,
        startTime: "",
        endTime: "",
        subject_id: "",
        teacher_id: "",
        room: "",
      }));

      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to add slot";
      const errorCode = err.response?.data?.code;
      
      // ✅ Show specific validation errors
      if (errorCode === 'TEACHER_SUBJECT_MISMATCH') {
        setError("🔒 " + errorMsg);
      } else if (errorCode === 'SUBJECT_NOT_FOUND') {
        setError("⚠️ " + errorMsg);
      } else if (errorCode === 'TEACHER_NOT_FOUND') {
        setError("⚠️ " + errorMsg);
      } else if (errorCode === 'TIMETABLE_NOT_FOUND') {
        setError("⚠️ " + errorMsg);
      } else if (errorCode === 'TIME_CONFLICT') {
        setError("⏰ " + errorMsg);
      } else {
        setError("❌ " + errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          style={{ color: BRAND_COLORS.primary.main, fontSize: '3rem' }}
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
          paddingTop: '2rem',
          paddingBottom: '2rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Breadcrumb */}
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
              onClick={() => window.history.back()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: BRAND_COLORS.primary.main,
                background: 'none',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600 }}>Add Timetable Slot</span>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Form Card */}
            <motion.div
              variants={fadeInVariants}
              custom={0}
              initial="hidden"
              animate="visible"
              style={{ gridColumn: '1 / -1' }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(26, 75, 109, 0.12)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '2rem',
                  background: BRAND_COLORS.primary.gradient,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem'
                }}>
                  <motion.div
                    variants={pulseVariants}
                    initial="initial"
                    animate="pulse"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      flexShrink: 0
                    }}
                  >
                    <FaEdit />
                  </motion.div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Add Timetable Slot</h1>
                    <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.05rem' }}>
                      Create a new time slot for your academic schedule
                    </p>
                  </div>
                </div>
                
                <div style={{ padding: '2rem' }}>
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
                  
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        backgroundColor: `${BRAND_COLORS.success.main}0a`,
                        border: `1px solid ${BRAND_COLORS.success.main}`,
                        color: BRAND_COLORS.success.main,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <FaCheckCircle size={20} />
                      <span>{success}</span>
                    </motion.div>
                  )}

                  <form onSubmit={submitHandler}>
                    {/* Timetable Selection */}
                    <FormField
                      icon={<FaCalendarAlt />}
                      label="Timetable"
                      required
                      error={!form.timetable_id && form.timetable_id !== ""}
                    >
                      <select
                        name="timetable_id"
                        value={form.timetable_id}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: `1px solid ${(!form.timetable_id && form.timetable_id !== "") ? BRAND_COLORS.danger.main : '#e2e8f0'}`,
                          fontSize: '1rem',
                          backgroundColor: 'white',
                          color: '#1e293b',
                          fontWeight: 500,
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                          backgroundSize: '16px'
                        }}
                      >
                        <option value="">Select timetable</option>
                        {timetables.map(t => (
                          <option key={t._id} value={t._id}>
                            {t.name} - {t.department_id?.name || 'N/A'}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    {/* Day Selection */}
                    <FormField
                      icon={<FaUniversity />}
                      label="Day of Week"
                      required
                    >
                      <select
                        name="day"
                        value={form.day}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem',
                          backgroundColor: 'white',
                          color: '#1e293b',
                          fontWeight: 500,
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                          backgroundSize: '16px'
                        }}
                      >
                        {DAYS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </FormField>

                    {/* Time Selection */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <FormField
                        icon={<FaClock />}
                        label="Start Time"
                        required
                        error={!form.startTime && form.startTime !== ""}
                      >
                        <input
                          type="time"
                          name="startTime"
                          value={form.startTime}
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '0.875rem 1.25rem',
                            borderRadius: '12px',
                            border: `1px solid ${(!form.startTime && form.startTime !== "") ? BRAND_COLORS.danger.main : '#e2e8f0'}`,
                            fontSize: '1rem',
                            backgroundColor: 'white',
                            color: '#1e293b',
                            fontWeight: 500
                          }}
                        />
                      </FormField>

                      <FormField
                        icon={<FaClock />}
                        label="End Time"
                        required
                        error={!form.endTime && form.endTime !== ""}
                      >
                        <input
                          type="time"
                          name="endTime"
                          value={form.endTime}
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '0.875rem 1.25rem',
                            borderRadius: '12px',
                            border: `1px solid ${(!form.endTime && form.endTime !== "") ? BRAND_COLORS.danger.main : '#e2e8f0'}`,
                            fontSize: '1rem',
                            backgroundColor: 'white',
                            color: '#1e293b',
                            fontWeight: 500
                          }}
                        />
                      </FormField>
                    </div>

                    {/* Subject Selection */}
                    <FormField
                      icon={<FaBook />}
                      label="Subject"
                      required
                      error={!form.subject_id && form.subject_id !== ""}
                    >
                      <select
                        name="subject_id"
                        value={form.subject_id}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: `1px solid ${(!form.subject_id && form.subject_id !== "") ? BRAND_COLORS.danger.main : '#e2e8f0'}`,
                          fontSize: '1rem',
                          backgroundColor: 'white',
                          color: '#1e293b',
                          fontWeight: 500,
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                          backgroundSize: '16px'
                        }}
                      >
                        <option value="">
                          {subjects.length === 0 
                            ? "No subjects available for this course" 
                            : "Select subject"}
                        </option>
                        {subjects.length === 0 ? (
                          <option disabled value="">
                            ⚠️ Please create subjects for this course first
                          </option>
                        ) : (
                          subjects.map(s => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({s.code})
                            </option>
                          ))
                        )}
                      </select>
                    </FormField>

                    {/* Teacher (Auto-filled) */}
                    <FormField
                      icon={<FaChalkboardTeacher />}
                      label="Assigned Teacher"
                    >
                      <input
                        type="text"
                        value={teachers.find(t => t._id === form.teacher_id)?.name || "Select a subject to auto-assign teacher"}
                        disabled
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem',
                          backgroundColor: form.teacher_id ? '#f0fdf4' : '#f8fafc',
                          color: form.teacher_id ? BRAND_COLORS.success.main : '#94a3b8',
                          fontWeight: form.teacher_id ? 600 : 400,
                          fontStyle: form.teacher_id ? 'normal' : 'italic'
                        }}
                      />
                    </FormField>

                    {/* Room Number */}
                    <FormField
                      icon={<FaDoorOpen />}
                      label="Room Number"
                    >
                      <input
                        type="text"
                        name="room"
                        value={form.room}
                        onChange={handleChange}
                        placeholder="e.g., A-101, Lab-2"
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem',
                          backgroundColor: 'white',
                          color: '#1e293b',
                          fontWeight: 500
                        }}
                      />
                    </FormField>

                    {/* Slot Type */}
                    <FormField
                      icon={<FaLayerGroup />}
                      label="Slot Type"
                    >
                      <select
                        name="slotType"
                        value={form.slotType}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem',
                          backgroundColor: 'white',
                          color: '#1e293b',
                          fontWeight: 500,
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1rem center',
                          backgroundSize: '16px'
                        }}
                      >
                        <option value="LECTURE">Lecture</option>
                        <option value="LAB">Lab</option>
                        <option value="TUTORIAL">Tutorial</option>
                        <option value="PRACTICAL">Practical</option>
                      </select>
                    </FormField>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting || !form.timetable_id || !form.subject_id || !form.startTime || !form.endTime}
                      style={{
                        width: '100%',
                        padding: '1.125rem',
                        borderRadius: '14px',
                        border: 'none',
                        backgroundColor: (!form.timetable_id || !form.subject_id || !form.startTime || !form.endTime || submitting) ? '#cbd5e1' : BRAND_COLORS.success.main,
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: (!form.timetable_id || !form.subject_id || !form.startTime || !form.endTime || submitting) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1rem',
                        boxShadow: (!form.timetable_id || !form.subject_id || !form.startTime || !form.endTime || submitting) ? 'none' : '0 4px 15px rgba(40, 167, 69, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {submitting ? (
                        <>
                          <motion.div variants={spinVariants} animate="animate">
                            <FaSyncAlt />
                          </motion.div>
                          Adding Slot...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle /> Add Timetable Slot
                        </>
                      )}
                    </motion.button>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Info Card */}
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              style={{ gridColumn: '1 / -1' }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(26, 75, 109, 0.12)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
                  background: BRAND_COLORS.info.gradient,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    <FaInfoCircle />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Slot Information</h2>
                </div>
                
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <InfoBox
                      icon={<FaCalendarAlt />}
                      title="Timetable Selection"
                      description="Choose the timetable you want to add a slot to. Subjects and teachers will be loaded automatically based on your selection."
                    />
                    <InfoBox
                      icon={<FaBook />}
                      title="Subject & Teacher"
                      description="Select a subject and the assigned teacher will be auto-filled. You can only assign teachers from the same department."
                    />
                    <InfoBox
                      icon={<FaClock />}
                      title="Time Management"
                      description="Set start and end times for your slot. Make sure there are no time conflicts with existing slots."
                    />
                    <InfoBox
                      icon={<FaDoorOpen />}
                      title="Room Assignment"
                      description="Specify the room number where the class will be held. This helps students locate their classes easily."
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({ icon, label, children, required = false, error = false }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '0.95rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          backgroundColor: `${BRAND_COLORS.primary.main}10`,
          color: BRAND_COLORS.primary.main,
          fontSize: '0.85rem'
        }}>
          {icon}
        </span>
        {label}
        {required && (
          <motion.span
            variants={blinkVariants}
            initial="initial"
            animate="blink"
            style={{ color: BRAND_COLORS.danger.main, marginLeft: '0.25rem' }}
          >
            *
          </motion.span>
        )}
      </label>
      <div style={{ position: 'relative' }}>
        {children}
        {error && (
          <div style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: BRAND_COLORS.danger.main,
            fontSize: '1.25rem'
          }}>
            <FaTimesCircle />
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= INFO BOX COMPONENT ================= */
function InfoBox({ icon, title, description }) {
  return (
    <div style={{
      padding: '1.25rem',
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      display: 'flex',
      gap: '1rem'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        backgroundColor: `${BRAND_COLORS.info.main}15`,
        color: BRAND_COLORS.info.main,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '1.25rem'
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{
          margin: '0 0 0.5rem 0',
          fontWeight: 700,
          color: '#1e293b',
          fontSize: '1.05rem'
        }}>
          {title}
        </h4>
        <p style={{
          margin: 0,
          color: '#64748b',
          fontSize: '0.95rem',
          lineHeight: 1.6
        }}>
          {description}
        </p>
      </div>
    </div>
  );
}