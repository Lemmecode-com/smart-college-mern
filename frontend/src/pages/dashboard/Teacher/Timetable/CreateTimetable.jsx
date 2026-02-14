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
  FaInfoCircle
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

export default function CreateTimetable() {
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* LOAD PROFILE */
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/teachers/my-profile");
        setDepartment(res.data.department_id);
      } catch {
        setError("Failed to load department");
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
        setError("Failed to load courses");
      }
    };
    loadCourses();
  }, [department]);

  /* AUTO NAME */
  useEffect(() => {
    if (!form.course_id || !form.semester || !form.academicYear) {
      setPreviewName("");
      return;
    }
    const course = courses.find((c) => c._id === form.course_id);
    if (!course) return;
    setPreviewName(`${course.name} - Sem ${form.semester} (${form.academicYear})`);
  }, [form, courses]);

  /* SUBMIT */
  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/timetable", {
        department_id: department._id,
        course_id: form.course_id,
        semester: Number(form.semester),
        academicYear: form.academicYear,
      });
      setSuccess("Timetable created successfully!");
      setForm({ course_id: "", semester: "", academicYear: "" });
      setPreviewName("");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create timetable");
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
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600 }}>Create Timetable</span>
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
                    <FaCalendarAlt />
                  </motion.div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Create New Timetable</h1>
                    <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.05rem' }}>
                      Set up academic schedule for your course
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
                    <FormField
                      icon={<FaUniversity />}
                      label="Department"
                      required
                    >
                      <input
                        type="text"
                        value={department?.name || "Loading..."}
                        disabled
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem',
                          backgroundColor: '#f8fafc',
                          color: '#4a5568',
                          fontWeight: 500
                        }}
                      />
                    </FormField>

                    <FormField
                      icon={<FaGraduationCap />}
                      label="Course"
                      required
                      error={!form.course_id && form.course_id !== ""}
                    >
                      <select
                        value={form.course_id}
                        onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: `1px solid ${(!form.course_id && form.course_id !== "") ? BRAND_COLORS.danger.main : '#e2e8f0'}`,
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
                        <option value="">Select course</option>
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                      <FormField
                        icon={<FaLayerGroup />}
                        label="Semester"
                        required
                        error={!form.semester && form.semester !== ""}
                      >
                        <select
                          value={form.semester}
                          onChange={(e) => setForm({ ...form, semester: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.875rem 1.25rem',
                            borderRadius: '12px',
                            border: `1px solid ${(!form.semester && form.semester !== "") ? BRAND_COLORS.danger.main : '#e2e8f0'}`,
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
                          <option value="">Select semester</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <option key={s} value={s}>Semester {s}</option>
                          ))}
                        </select>
                      </FormField>

                      <FormField
                        icon={<FaClock />}
                        label="Academic Year"
                        required
                        error={!form.academicYear && form.academicYear !== ""}
                      >
                        <select
                          value={form.academicYear}
                          onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.875rem 1.25rem',
                            borderRadius: '12px',
                            border: `1px solid ${(!form.academicYear && form.academicYear !== "") ? BRAND_COLORS.danger.main : '#e2e8f0'}`,
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
                          <option value="">Select academic year</option>
                          <option value="2024-2025">2024–2025</option>
                          <option value="2025-2026">2025–2026</option>
                          <option value="2026-2027">2026–2027</option>
                          <option value="2027-2028">2027–2028</option>
                        </select>
                      </FormField>
                    </div>

                    <FormField
                      icon={<FaEdit />}
                      label="Timetable Name (Preview)"
                    >
                      <input
                        type="text"
                        value={previewName || "Complete form to generate preview"}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '1rem',
                          backgroundColor: '#f8fafc',
                          color: previewName ? BRAND_COLORS.primary.main : '#94a3b8',
                          fontWeight: previewName ? 600 : 400,
                          fontStyle: previewName ? 'normal' : 'italic'
                        }}
                      />
                    </FormField>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting || !previewName}
                      style={{
                        width: '100%',
                        padding: '1.125rem',
                        borderRadius: '14px',
                        border: 'none',
                        backgroundColor: (!previewName || submitting) ? '#cbd5e1' : BRAND_COLORS.primary.main,
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: (!previewName || submitting) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1rem',
                        boxShadow: (!previewName || submitting) ? 'none' : '0 4px 15px rgba(26, 75, 109, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {submitting ? (
                        <>
                          <motion.div variants={spinVariants} animate="animate">
                            <FaSyncAlt />
                          </motion.div>
                          Creating Timetable...
                        </>
                      ) : (
                        <>
                          <FaCalendarAlt /> Create Timetable
                        </>
                      )}
                    </motion.button>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Preview Card */}
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
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Timetable Preview</h2>
                </div>
                
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{
                    border: `2px dashed ${previewName ? BRAND_COLORS.primary.main : '#cbd5e1'}`,
                    borderRadius: '16px',
                    padding: '2.5rem',
                    backgroundColor: previewName ? `${BRAND_COLORS.primary.main}05` : '#f8fafc',
                    transition: 'all 0.3s ease'
                  }}>
                    {previewName ? (
                      <>
                        <div style={{
                          fontSize: '4rem',
                          marginBottom: '1.5rem',
                          color: BRAND_COLORS.primary.main,
                          opacity: 0.2
                        }}>
                          <FaCalendarAlt />
                        </div>
                        <h3 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: '#1e293b'
                        }}>
                          {previewName}
                        </h3>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginTop: '1.5rem'
                        }}>
                          <div style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '20px',
                            backgroundColor: `${BRAND_COLORS.success.main}15`,
                            color: BRAND_COLORS.success.main,
                            fontWeight: 600,
                            fontSize: '0.95rem'
                          }}>
                            Ready to Create
                          </div>
                          <p style={{ color: '#64748b', margin: 0, maxWidth: '80%' }}>
                            This timetable will be created for your department. You can add time slots after creation.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          fontSize: '4rem',
                          marginBottom: '1.5rem',
                          color: '#cbd5e1',
                          opacity: 0.3
                        }}>
                          <FaCalendarAlt />
                        </div>
                        <h3 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1.75rem',
                          fontWeight: 600,
                          color: '#64748b'
                        }}>
                          Complete Form to Preview
                        </h3>
                        <p style={{ color: '#94a3b8', margin: 0, maxWidth: '80%' }}>
                          Select course, semester, and academic year to see timetable preview
                        </p>
                      </>
                    )}
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
        {required && <span style={{ color: BRAND_COLORS.danger.main }}>*</span>}
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