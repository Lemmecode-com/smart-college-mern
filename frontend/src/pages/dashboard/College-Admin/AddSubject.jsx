import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaUniversity,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaInfoCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaCreditCard,
  FaCode,
  FaRobot,
  FaKeyboard,
  FaShieldAlt,
  FaCalendarAlt,
  FaRegClock
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

export default function AddSubject() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // College Code Generation State
  const [codeGenerationMode, setCodeGenerationMode] = useState('auto'); // 'auto' or 'manual'
  const [generatedCodePreview, setGeneratedCodePreview] = useState('');
  
  const [formData, setFormData] = useState({
    department_id: "",
    course_id: "",
    teacher_id: "",
    name: "",
    code: "",
    semester: "",
    credits: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch (err) {
        console.error("Failed to load departments:", err);
        setError("Failed to load departments. Please try again later.");
      }
    };
    fetchDepartments();
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    if (!formData.department_id) {
      setCourses([]);
      setTeachers([]);
      setFormData(prev => ({ ...prev, course_id: "", teacher_id: "" }));
      return;
    }

    const fetchCourses = async () => {
      try {
        const res = await api.get(`/courses/department/${formData.department_id}`);
        setCourses(res.data);
      } catch (err) {
        console.error("Failed to load courses:", err);
        setCourses([]);
      }
    };
    fetchCourses();
  }, [formData.department_id]);

  /* ================= LOAD TEACHERS BY COURSE ================= */
  useEffect(() => {
    if (!formData.course_id) {
      setTeachers([]);
      setFormData(prev => ({ ...prev, teacher_id: "" }));
      return;
    }

    const fetchTeachers = async () => {
      try {
        const res = await api.get(`/teachers/course/${formData.course_id}`);
        setTeachers(res.data);
      } catch (err) {
        console.error("Failed to load teachers:", err);
        setTeachers([]);
      }
    };
    fetchTeachers();
  }, [formData.course_id]);

  /* ================= AUTO-GENERATE CODE PREVIEW ================= */
  useEffect(() => {
    if (codeGenerationMode === 'auto' && formData.name && formData.course_id) {
      const course = courses.find(c => c._id === formData.course_id);
      const courseCode = course?.code?.substring(0, 3).toUpperCase() || 'SUB';
      const subjectInitials = formData.name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 4)
        .toUpperCase();
      
      const semesterPart = formData.semester ? `S${formData.semester}` : 'S0';
      const timestampPart = Date.now().toString().slice(-4);
      
      const generatedCode = `${courseCode}-${subjectInitials}-${semesterPart}-${timestampPart}`;
      setGeneratedCodePreview(generatedCode);
      setFormData(prev => ({ ...prev, code: generatedCode }));
    } else if (codeGenerationMode === 'manual') {
      setGeneratedCodePreview('');
    }
  }, [formData.name, formData.course_id, formData.semester, codeGenerationMode, courses]);

  /* ================= FORM VALIDATION ================= */
  const validateForm = () => {
    const errors = {};
    let isValid = true;

    const requiredFields = ['department_id', 'course_id', 'name', 'code', 'semester', 'credits'];
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
        isValid = false;
      }
    });

    // Semester validation
    const semesterNum = Number(formData.semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      errors.semester = 'Semester must be between 1-8';
      isValid = false;
    }

    // Credits validation
    const creditsNum = Number(formData.credits);
    if (isNaN(creditsNum) || creditsNum < 1 || creditsNum > 6) {
      errors.credits = 'Credits must be between 1-6';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Special handling for code field in manual mode
    if (name === 'code' && codeGenerationMode === 'manual') {
      setGeneratedCodePreview('');
    }
  };

  const handleCodeModeChange = (mode) => {
    setCodeGenerationMode(mode);
    if (mode === 'auto') {
      // Trigger auto-generation
      setFormData(prev => ({ ...prev, code: generatedCodePreview }));
    } else {
      // Clear preview but keep current code value for manual editing
      setGeneratedCodePreview('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError("Please fix the errors before submitting");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/subjects", {
        course_id: formData.course_id,
        name: formData.name.trim(),
        code: formData.code.trim(),
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        teacher_id: formData.teacher_id || null // Allow null if not assigned
      });

      setSuccess("Subject created successfully!");
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          department_id: "",
          course_id: "",
          teacher_id: "",
          name: "",
          code: "",
          semester: "",
          credits: ""
        });
        setCodeGenerationMode('auto');
        setGeneratedCodePreview('');
        navigate("/subjects");
      }, 2000);
    } catch (err) {
      console.error("Subject creation failed:", err);
      
      let errorMessage = "Failed to create subject. Please try again.";
      
      if (err.response) {
        if (err.response.status === 500) {
          errorMessage = "Server error. Please contact system administrator.";
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.message || "Invalid data submitted. Please check all fields.";
        } else if (err.response.status === 409) {
          errorMessage = "Subject with this code already exists.";
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      }
      
      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

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
              onClick={() => navigate("/subjects")}
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
              <FaArrowLeft /> Back to Subjects
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>
              Add New Subject
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
                  <FaBookOpen />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    Add New Subject
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    Create academic subject with department and course assignment
                  </p>
                </div>
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
                <strong>Workflow:</strong> Select Department → Choose Course → Assign Teacher → Enter Subject Details → Generate/Enter Subject Code
              </div>
            </div>
          </motion.div>

          {/* ================= ALERTS ================= */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '1.5rem',
                padding: '1.25rem',
                borderRadius: '16px',
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `1px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '1.05rem',
                fontWeight: 500
              }}
            >
              <FaExclamationTriangle size={24} />
              <div>{error}</div>
              <button
                onClick={() => setError("")}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: 'inherit',
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                ×
              </button>
            </motion.div>
          )}
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '1.5rem',
                padding: '1.25rem',
                borderRadius: '16px',
                backgroundColor: `${BRAND_COLORS.success.main}0a`,
                border: `1px solid ${BRAND_COLORS.success.main}`,
                color: BRAND_COLORS.success.main,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '1.05rem',
                fontWeight: 500
              }}
            >
              <FaCheckCircle size={24} />
              <div>{success}</div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '2rem'
            }}>
              {/* ================= ACADEMIC HIERARCHY CARD ================= */}
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
                      <FaUniversity />
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Academic Hierarchy
                    </h2>
                  </div>
                  
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      <FormField 
                        icon={<FaUniversity />} 
                        label="Department" 
                        required
                        error={validationErrors.department_id}
                        helperText="Select the academic department"
                      >
                        <select
                          name="department_id"
                          value={formData.department_id}
                          onChange={handleChange}
                          style={selectStyle}
                          required
                        >
                          <option value="">Select department</option>
                          {departments.map(dept => (
                            <option key={dept._id} value={dept._id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      
                      <FormField 
                        icon={<FaGraduationCap />} 
                        label="Course" 
                        required
                        error={validationErrors.course_id}
                        helperText={formData.department_id ? `${courses.length} courses available` : "Select department first"}
                      >
                        <select
                          name="course_id"
                          value={formData.course_id}
                          onChange={handleChange}
                          style={selectStyle}
                          disabled={!formData.department_id}
                          required
                        >
                          <option value="">Select course</option>
                          {courses.map(course => (
                            <option key={course._id} value={course._id}>
                              {course.name} ({course.code})
                            </option>
                          ))}
                        </select>
                      </FormField>
                      
                      <FormField 
                        icon={<FaChalkboardTeacher />} 
                        label="Teacher (Optional)" 
                        helperText="Assign a teacher now or later"
                      >
                        <select
                          name="teacher_id"
                          value={formData.teacher_id}
                          onChange={handleChange}
                          style={selectStyle}
                          disabled={!formData.course_id}
                        >
                          <option value="">Select teacher (optional)</option>
                          {teachers.map(teacher => (
                            <option key={teacher._id} value={teacher._id}>
                              {teacher.name} - {teacher.designation}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* ================= SUBJECT DETAILS CARD ================= */}
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
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1.75rem',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderBottom: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${BRAND_COLORS.success.main}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: BRAND_COLORS.success.main,
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      <FaBookOpen />
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Subject Details
                    </h2>
                  </div>
                  
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      <FormField 
                        icon={<FaBookOpen />} 
                        label="Subject Name" 
                        required
                        error={validationErrors.name}
                      >
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          style={inputStyle}
                          placeholder="e.g., Data Structures and Algorithms"
                          required
                        />
                      </FormField>
                      
                      <FormField 
                        icon={<FaLayerGroup />} 
                        label="Semester" 
                        required
                        error={validationErrors.semester}
                        helperText="Academic semester (1-8)"
                      >
                        <select
                          name="semester"
                          value={formData.semester}
                          onChange={handleChange}
                          style={selectStyle}
                          required
                        >
                          <option value="">Select semester</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                          ))}
                        </select>
                      </FormField>
                      
                      <FormField 
                        icon={<FaCreditCard />} 
                        label="Credits" 
                        required
                        error={validationErrors.credits}
                        helperText="Academic credits (1-6)"
                      >
                        <select
                          name="credits"
                          value={formData.credits}
                          onChange={handleChange}
                          style={selectStyle}
                          required
                        >
                          <option value="">Select credits</option>
                          {[1, 2, 3, 4, 5, 6].map(credit => (
                            <option key={credit} value={credit}>{credit} Credit{credit > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* ================= SUBJECT CODE CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={2}
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
                    background: 'linear-gradient(135deg, #ffedd5 0%, #ffeddb 100%)',
                    borderBottom: '1px solid #fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${BRAND_COLORS.warning.main}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: BRAND_COLORS.warning.main,
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      <FaCode />
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Subject Code Configuration
                    </h2>
                  </div>
                  
                  <div style={{ padding: '2rem' }}>
                    {/* Code Generation Mode Toggle */}
                    <div style={{ 
                      marginBottom: '1.5rem', 
                      padding: '1.25rem', 
                      borderRadius: '16px', 
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 1rem 0', 
                        fontSize: '1.1rem', 
                        fontWeight: 700,
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaInfoCircle size={18} style={{ color: BRAND_COLORS.primary.main }} />
                        Code Generation Method
                      </h4>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: codeGenerationMode === 'auto' ? `2px solid ${BRAND_COLORS.success.main}` : '1px solid #cbd5e1',
                            backgroundColor: codeGenerationMode === 'auto' ? `${BRAND_COLORS.success.main}08` : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            flex: 1,
                            minWidth: '150px'
                          }}
                          onClick={() => handleCodeModeChange('auto')}
                        >
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `2px solid ${BRAND_COLORS.success.main}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: codeGenerationMode === 'auto' ? BRAND_COLORS.success.main : 'transparent'
                          }}>
                            {codeGenerationMode === 'auto' && (
                              <div style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                backgroundColor: 'white' 
                              }} />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FaRobot /> Auto-Generate
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                              System creates unique code based on course and subject
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: codeGenerationMode === 'manual' ? `2px solid ${BRAND_COLORS.primary.main}` : '1px solid #cbd5e1',
                            backgroundColor: codeGenerationMode === 'manual' ? `${BRAND_COLORS.primary.main}08` : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            flex: 1,
                            minWidth: '150px'
                          }}
                          onClick={() => handleCodeModeChange('manual')}
                        >
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `2px solid ${BRAND_COLORS.primary.main}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: codeGenerationMode === 'manual' ? BRAND_COLORS.primary.main : 'transparent'
                          }}>
                            {codeGenerationMode === 'manual' && (
                              <div style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                backgroundColor: 'white' 
                              }} />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FaKeyboard /> Manual Entry
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                              Enter custom subject code manually
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {codeGenerationMode === 'auto' && generatedCodePreview && (
                        <div style={{ 
                          marginTop: '1rem', 
                          padding: '1rem', 
                          borderRadius: '12px', 
                          backgroundColor: '#dcfce7',
                          border: '1px solid #bbf7d0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <FaRobot size={20} style={{ color: BRAND_COLORS.success.main }} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#064e3b', fontSize: '0.95rem' }}>
                              Auto-Generated Code Preview:
                            </div>
                            <div style={{ 
                              marginTop: '0.25rem', 
                              fontSize: '1.5rem', 
                              fontWeight: 800, 
                              color: BRAND_COLORS.success.main,
                              letterSpacing: '1px',
                              fontFamily: 'monospace'
                            }}>
                              {generatedCodePreview}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Subject Code Field */}
                    <FormField 
                      icon={<FaCode />} 
                      label="Subject Code" 
                      required
                      error={validationErrors.code}
                      helperText={
                        codeGenerationMode === 'auto' 
                          ? "Code auto-generated based on course and subject name. Click 'Manual Entry' to customize." 
                          : "Enter unique subject code (e.g., CS301-DSA)"
                      }
                    >
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          name="code"
                          value={formData.code}
                          onChange={handleChange}
                          style={{
                            ...inputStyle,
                            backgroundColor: codeGenerationMode === 'auto' ? '#f1f5f9' : 'white',
                            borderColor: codeGenerationMode === 'auto' ? '#cbd5e1' : '#e2e8f0',
                            color: codeGenerationMode === 'auto' ? '#64748b' : '#1e293b',
                            fontWeight: codeGenerationMode === 'auto' ? 600 : 500
                          }}
                          placeholder={
                            codeGenerationMode === 'auto' 
                              ? 'Auto-generated code will appear here' 
                              : 'Enter subject code (e.g., CS301)'
                          }
                          required
                          disabled={codeGenerationMode === 'auto'}
                        />
                        {codeGenerationMode === 'auto' && (
                          <div style={{
                            position: 'absolute',
                            right: '15px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: BRAND_COLORS.success.main,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}>
                            <FaRobot size={14} />
                            AUTO
                          </div>
                        )}
                      </div>
                      
                      <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.75rem', 
                        borderRadius: '10px', 
                        backgroundColor: '#f8fafc',
                        borderLeft: `3px solid ${BRAND_COLORS.info.main}`,
                        fontSize: '0.85rem',
                        color: '#4a5568'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <FaShieldAlt size={16} style={{ marginTop: '0.25rem', flexShrink: 0 }} />
                          <div>
                            <strong>Security Note:</strong> Subject codes must be unique within the course. 
                            Auto-generation ensures no duplicates. Manual entries are validated before submission.
                          </div>
                        </div>
                      </div>
                    </FormField>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* ================= SUBMIT BUTTON ================= */}
            <motion.div
              variants={fadeInVariants}
              custom={3}
              initial="hidden"
              animate="visible"
              style={{ 
                marginTop: '2rem', 
                display: 'flex', 
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => navigate("/subjects")}
                disabled={loading}
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '16px',
                  border: '2px solid #e2e8f0',
                  backgroundColor: 'white',
                  color: '#1e293b',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                <FaArrowLeft /> Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: loading ? '#94a3b8' : BRAND_COLORS.primary.main,
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.3s ease',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(26, 75, 109, 0.35)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {loading ? (
                  <>
                    <motion.div variants={spinVariants} animate="animate">
                      <FaSyncAlt size={20} />
                    </motion.div>
                    Creating Subject...
                  </>
                ) : (
                  <>
                    <FaBookOpen size={20} /> Create Subject
                  </>
                )}
                {!loading && (
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
            </motion.div>
          </form>
        </div>
        
        {/* ================= STYLES ================= */}
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
function FormField({ icon, label, children, required = false, error, helperText }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
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
      
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: BRAND_COLORS.danger.main,
          marginTop: '0.5rem',
          paddingLeft: '2.5rem'
        }}>
          <FaExclamationTriangle size={14} />
          <span>{error}</span>
        </div>
      )}
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
  backgroundImage: `url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1.25rem center',
  backgroundSize: '20px',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
};