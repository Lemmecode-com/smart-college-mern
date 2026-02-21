import React, { useEffect, useState } from "react";
import api from "../../../../api/axios";
import {
  FaCalendarAlt,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSyncAlt,
  FaArrowLeft,
  FaUniversity,
  FaEdit,
  FaInfoCircle,
  FaPlus,
  FaEye,
  FaFileAlt,
  FaShieldAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

export default function CreateTimetable() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    course_id: "",
    semester: "",
    academicYear: "",
  });

  const [previewName, setPreviewName] = useState("");
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* LOAD PROFILE */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/teachers/my-profile");
        setDepartment(res.data.department_id);
      } catch {
        setError("Failed to load department information");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  /* LOAD COURSES */
  useEffect(() => {
    if (!department?._id) return;
    const loadCourses = async () => {
      try {
        const res = await api.get(`/courses/department/${department._id}`);
        setCourses(res.data);
      } catch {
        setError("Failed to load courses for your department");
      }
    };
    loadCourses();
  }, [department]);

  /* GENERATE SEMESTERS BASED ON SELECTED COURSE */
  useEffect(() => {
    if (!form.course_id) {
      setAvailableSemesters([]);
      return;
    }

    const selectedCourse = courses.find((c) => c._id === form.course_id);

    if (!selectedCourse?.semester) {
      setAvailableSemesters([]);
      return;
    }

    const totalSem = selectedCourse.semester;
    const semArray = Array.from({ length: totalSem }, (_, i) => i + 1);
    setAvailableSemesters(semArray);
  }, [form.course_id, courses]);

  /* AUTO NAME GENERATION */
  useEffect(() => {
    if (!form.course_id || !form.semester || !form.academicYear) {
      setPreviewName("");
      return;
    }
    const course = courses.find((c) => c._id === form.course_id);
    if (!course) return;

    setPreviewName(
      `${course.name} - Semester ${form.semester} (${form.academicYear})`
    );
  }, [form, courses]);

  /* SUBMIT HANDLER */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await api.post("/timetable", {
        department_id: department._id,
        course_id: form.course_id,
        semester: Number(form.semester),
        academicYear: form.academicYear,
      });

      setSuccess("✅ Timetable created successfully! Redirecting to timetable management...");

      // ✅ FIXED: Access timetable object from response
      const timetableId = response.data.timetable?._id || response.data._id;
      
      if (!timetableId) {
        console.error("No timetable ID in response:", response.data);
        setError("Timetable created but failed to get ID. Please navigate manually.");
        return;
      }

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        navigate(`/timetable/${timetableId}/weekly`);
      }, 2000);
    } catch (err) {
      console.error("Timetable creation failed:", err);
      setError(err.response?.data?.message || "Failed to create timetable. Please try again.");
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
            Loading Department Information...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Preparing timetable creation interface
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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>
              Create Timetable
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
              borderRadius: '1.5rem',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
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
                    fontSize: '2.5rem',
                    flexShrink: 0,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <FaCalendarAlt />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    Create New Timetable
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    Set up academic schedule for your department courses
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/timetable/list')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaEye /> View Existing Timetables
                </motion.button>
              </div>
            </div>
            
            {/* Info Banner */}
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: '#dbeafe',
              borderTop: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <FaInfoCircle style={{ color: BRAND_COLORS.primary.main, fontSize: '1.5rem', flexShrink: 0 }} />
              <div style={{ color: '#1e293b', fontWeight: 500, lineHeight: 1.5 }}>
                Timetables can only be created for courses in your department. After creation, you can add time slots and assign subjects.
              </div>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* ================= FORM CARD ================= */}
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
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: `${BRAND_COLORS.primary.main}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: BRAND_COLORS.primary.main,
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    <FaFileAlt />
                  </div>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: 700,
                    color: '#1e293b'
                  }}>
                    Timetable Details
                  </h2>
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
                    {/* Department Field */}
                    <FormField 
                      icon={<FaUniversity />} 
                      label="Department" 
                      helperText="Your assigned department (auto-detected)"
                    >
                      <input
                        type="text"
                        value={department?.name || "Loading..."}
                        disabled
                        style={{
                          ...inputStyle,
                          backgroundColor: '#f8fafc',
                          color: '#4a5568',
                          fontWeight: 500
                        }}
                      />
                    </FormField>

                    {/* Course Selection */}
                    <FormField 
                      icon={<FaGraduationCap />} 
                      label="Course" 
                      required
                      helperText="Select a course from your department"
                    >
                      <select
                        value={form.course_id}
                        onChange={(e) => {
                          setForm({ ...form, course_id: e.target.value, semester: "" });
                          setError("");
                        }}
                        style={{
                          ...selectStyle,
                          borderColor: !form.course_id && error ? BRAND_COLORS.danger.main : '#e2e8f0'
                        }}
                        required
                      >
                        <option value="">Select course</option>
                        {courses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.name} ({course.code})
                          </option>
                        ))}
                      </select>
                      {!form.course_id && error && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          color: BRAND_COLORS.danger.main, 
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          <FaTimesCircle size={14} /> Please select a course
                        </div>
                      )}
                    </FormField>

                    {/* Semester Selection */}
                    <FormField 
                      icon={<FaLayerGroup />} 
                      label="Semester" 
                      required
                      helperText={`Available semesters for selected course: ${availableSemesters.length || 'N/A'}`}
                    >
                      <select
                        value={form.semester}
                        onChange={(e) => {
                          setForm({ ...form, semester: e.target.value });
                          setError("");
                        }}
                        disabled={!availableSemesters.length}
                        style={{
                          ...selectStyle,
                          backgroundColor: !availableSemesters.length ? '#f1f5f9' : 'white',
                          borderColor: !form.semester && error ? BRAND_COLORS.danger.main : '#e2e8f0',
                          cursor: !availableSemesters.length ? 'not-allowed' : 'pointer'
                        }}
                        required
                      >
                        <option value="">Select semester</option>
                        {availableSemesters.map((s) => (
                          <option key={s} value={s}>
                            Semester {s}
                          </option>
                        ))}
                      </select>
                      {!availableSemesters.length && form.course_id && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          color: BRAND_COLORS.warning.main, 
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          <FaInfoCircle size={14} /> Please select a course first
                        </div>
                      )}
                      {!form.semester && error && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          color: BRAND_COLORS.danger.main, 
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          <FaTimesCircle size={14} /> Please select a semester
                        </div>
                      )}
                    </FormField>

                    {/* Academic Year Selection */}
                    <FormField 
                      icon={<FaCalendarAlt />} 
                      label="Academic Year" 
                      required
                      helperText="Timetable will be active for this academic year"
                    >
                      <select
                        value={form.academicYear}
                        onChange={(e) => {
                          setForm({ ...form, academicYear: e.target.value });
                          setError("");
                        }}
                        style={{
                          ...selectStyle,
                          borderColor: !form.academicYear && error ? BRAND_COLORS.danger.main : '#e2e8f0'
                        }}
                        required
                      >
                        <option value="">Select academic year</option>
                        {Array.from({ length: 5 }, (_, i) => {
                          const currentYear = new Date().getFullYear();
                          const year = currentYear + i;
                          return (
                            <option key={year} value={`${year}-${year + 1}`}>
                              {year}-{year + 1}
                            </option>
                          );
                        })}
                      </select>
                      {!form.academicYear && error && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          color: BRAND_COLORS.danger.main, 
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem'
                        }}>
                          <FaTimesCircle size={14} /> Please select an academic year
                        </div>
                      )}
                    </FormField>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting || !previewName}
                      style={{
                        width: '100%',
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: 'none',
                        backgroundColor: (submitting || !previewName) ? '#cbd5e1' : BRAND_COLORS.primary.main,
                        color: 'white',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        cursor: (submitting || !previewName) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1rem',
                        boxShadow: (submitting || !previewName) ? 'none' : '0 6px 20px rgba(26, 75, 109, 0.35)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {submitting ? (
                        <>
                          <motion.div variants={spinVariants} animate="animate">
                            <FaSyncAlt size={20} />
                          </motion.div>
                          Creating Timetable...
                        </>
                      ) : (
                        <>
                          <FaPlus size={20} /> Create Timetable
                        </>
                      )}
                      {!submitting && !(!previewName) && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                          animation: 'shimmer 2s infinite'
                        }} />
                      )}
                    </motion.button>
                    
                    <div style={{ 
                      marginTop: '1.5rem', 
                      padding: '1.25rem', 
                      borderRadius: '16px', 
                      backgroundColor: '#fffbeb',
                      border: '1px solid #f59e0b',
                      fontSize: '0.95rem',
                      color: '#92400e',
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <FaShieldAlt style={{ marginTop: '0.25rem', color: BRAND_COLORS.warning.main, flexShrink: 0 }} />
                        <div>
                          <strong>Important:</strong> Once created, the timetable structure cannot be changed. 
                          You can only add/edit time slots and assign subjects. 
                          Ensure all details are correct before submitting.
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Add shimmer animation to global styles */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @media (prefers-reduced-motion) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({ icon, label, children, required = false, helperText }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '1.05rem'
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: `${BRAND_COLORS.primary.main}10`,
          color: BRAND_COLORS.primary.main,
          fontSize: '1.1rem'
        }}>
          {icon}
        </span>
        {label}
        {required && (
          <span style={{ 
            color: BRAND_COLORS.danger.main, 
            marginLeft: '0.25rem',
            fontSize: '1.2rem'
          }}>
            *
          </span>
        )}
      </label>
      
      {helperText && (
        <div style={{
          fontSize: '0.85rem',
          color: '#64748b',
          marginBottom: '0.75rem',
          paddingLeft: '2.5rem'
        }}>
          {helperText}
        </div>
      )}
      
      {children}
    </div>
  );
}

/* ================= STYLES ================= */
const inputStyle = {
  width: '100%',
  padding: '0.875rem 1.25rem',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  fontSize: '1.05rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500,
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
};

const selectStyle = {
  width: '100%',
  padding: '0.875rem 1.25rem',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  fontSize: '1.05rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1.25rem center',
  backgroundSize: '20px',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
};