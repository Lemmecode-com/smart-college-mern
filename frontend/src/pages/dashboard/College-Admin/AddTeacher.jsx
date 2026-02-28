import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaChalkboardTeacher,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserTie,
  FaMapMarkerAlt,
  FaSyncAlt,
  FaInfoCircle,
  FaGraduationCap,
  FaVial,
  FaUniversity,
  FaBriefcase,
  FaEnvelope,
  FaKey,
  FaTransgender,
  FaBuilding,
  FaCity,
  FaMapMarkedAlt,
  FaUsers,
  FaRegClock,
  FaBookOpen
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

export default function AddTeacher() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: "",
    course_id: "", // CRITICAL: Added course_id to state
    password: "",
    gender: "",
    bloodGroup: "",
    employmentType: "FULL_TIME",
    address: "",
    city: "",
    state: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
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
      setFormData(prev => ({ ...prev, course_id: "" })); // Reset course when department changes
      return;
    }

    const fetchCourses = async () => {
      try {
        const res = await api.get(`/courses/department/${formData.department_id}`);
        setCourses(res.data);
      } catch (err) {
        console.error("Failed to load courses:", err);
        setCourses([]);
        setError("Failed to load courses for selected department.");
      }
    };
    fetchCourses();
  }, [formData.department_id]);

  /* ================= FORM VALIDATION ================= */
  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Required fields validation - INCLUDING course_id
    const requiredFields = [
      'name', 'email', 'designation', 'qualification', 
      'experienceYears', 'department_id', 'course_id', // CRITICAL: Added course_id
      'password', 'gender', 'bloodGroup', 'address', 'city', 'state'
    ];
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
        isValid = false;
      }
    });

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    // Password validation
    if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    // Experience years validation
    const expYears = Number(formData.experienceYears);
    if (isNaN(expYears) || expYears < 0 || expYears > 50) {
      errors.experienceYears = 'Experience must be between 0-50 years';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Special handling: Reset course when department changes
    if (name === "department_id" && value === "") {
      setFormData(prev => ({ ...prev, course_id: "" }));
    }
  };
  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix the errors before submitting");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // CRITICAL FIXES:
      // 1. Include course_id in payload (required by backend)
      // 2. Provide temporary employeeId that follows expected format
      // 3. Backend will replace employeeId with proper auto-generated value
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        designation: formData.designation.trim(),
        qualification: formData.qualification.trim(),
        experienceYears: Number(formData.experienceYears),
        department_id: formData.department_id,
        course_id: formData.course_id, // CRITICAL: Include course assignment
        password: formData.password,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        employmentType: formData.employmentType,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        // Temporary employeeId that satisfies backend validation
        employeeId: `TEMP-T-${Date.now().toString().slice(-4)}`
      };

      const response = await api.post("/teachers", payload);
      
      setSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          designation: "",
          qualification: "",
          experienceYears: "",
          department_id: "",
          course_id: "", // Reset course
          password: "",
          gender: "",
          bloodGroup: "",
          employmentType: "FULL_TIME",
          address: "",
          city: "",
          state: ""
        });
        setValidationErrors({});
        navigate("/teachers");
      }, 2000);
    } catch (err) {
      console.error("Teacher creation failed:", err);
      
      let errorMessage = "Failed to create teacher. Please try again.";
      
      if (err.response) {
        if (err.response.status === 500) {
          errorMessage = "Server error. Please contact system administrator.";
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.message || "Invalid data submitted. Please check all fields.";
        } else if (err.response.status === 409) {
          errorMessage = "Teacher with this email already exists.";
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
        console.warn("Backend error details:", err.response.data);
      } else if (err.request) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      setError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOADING STATE ================= */
  if (!departments.length) {
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
            Loading Departments...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Fetching department list for teacher registration
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
              onClick={() => navigate("/teachers")}
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
              <FaArrowLeft /> Back to Teachers
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>
              Add New Teacher
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
                  <FaChalkboardTeacher />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    Add New Teacher
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    Register a new faculty member for your institution
                  </p>
                </div>
              </div>
            </div>
            
            {/* Info Banner - EMPLOYEE ID AUTO-GENERATION NOTICE */}
            <div style={{
              padding: '1.25rem 2rem',
              backgroundColor: '#dcfce7',
              borderTop: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <FaCheckCircle style={{ color: BRAND_COLORS.success.main, fontSize: '1.5rem', flexShrink: 0 }} />
              <div style={{ color: '#064e3b', fontWeight: 600, lineHeight: 1.5 }}>
                <strong>Department & Course Assignment:</strong> Select department first, then choose the course this teacher will be assigned to. 
                Employee ID will be auto-generated after submission.
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
              <div>
                <strong>Success!</strong> Teacher created successfully with department and course assignment. 
                Redirecting to teachers list...
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* ================= BASIC INFO CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={0}
                initial="hidden"
                animate="visible"
                className="col-12"
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
                      <FaUserTie />
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Basic Information
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="row g-4">
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaUserTie />}
                          label="Full Name"
                          required
                          error={validationErrors.name}
                        >
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., Dr. Rajesh Kumar"
                            required
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaGraduationCap />}
                          label="Designation"
                          required
                          error={validationErrors.designation}
                        >
                          <input
                            type="text"
                            name="designation"
                            value={formData.designation}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., Associate Professor"
                            required
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaUniversity />}
                          label="Qualification"
                          required
                          error={validationErrors.qualification}
                        >
                          <input
                            type="text"
                            name="qualification"
                            value={formData.qualification}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., Ph.D. Computer Science"
                            required
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaRegClock />}
                          label="Experience (Years)"
                          required
                          error={validationErrors.experienceYears}
                          helperText="Total teaching experience in years"
                        >
                          <input
                            type="number"
                            name="experienceYears"
                            value={formData.experienceYears}
                            onChange={handleChange}
                            min="0"
                            max="50"
                            className="form-control"
                            placeholder="e.g., 12"
                            required
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaVial />}
                          label="Blood Group"
                          required
                          error={validationErrors.bloodGroup}
                        >
                          <select
                            name="bloodGroup"
                            value={formData.bloodGroup}
                            onChange={handleChange}
                            className="form-select"
                            required
                          >
                            <option value="">Select blood group</option>
                            {["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"].map(group => (
                              <option key={group} value={group}>{group}</option>
                            ))}
                          </select>
                        </FormField>
                      </div>

                      <FormField
                        icon={<FaTransgender />} 
                        label="Gender" 
                        required
                        error={validationErrors.gender}
                      >
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          style={selectStyle}
                          required
                        >
                          <option value="">Select gender</option>
                          {["Male", "Female", "Other"].map(gender => (
                            <option key={gender} value={gender}>{gender}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* ================= CONTACT INFO CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={1}
                initial="hidden"
                animate="visible"
                className="col-12"
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
                      <FaEnvelope />
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Contact & Security
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="row g-4">
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaEnvelope />}
                          label="Email Address"
                          required
                          error={validationErrors.email}
                          helperText="Will be used for login and notifications"
                        >
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., rajesh.kumar@college.edu"
                            required
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaKey />}
                          label="Password"
                          required
                          error={validationErrors.password}
                          helperText="Minimum 8 characters required"
                        >
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="Create secure password"
                            required
                          />
                        </FormField>
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaBriefcase />}
                          label="Employment Type"
                          required
                        >
                          <select
                            name="employmentType"
                            value={formData.employmentType}
                            onChange={handleChange}
                            className="form-select"
                            required
                          >
                            <option value="FULL_TIME">Full Time</option>
                            <option value="PART_TIME">Part Time</option>
                            <option value="VISITING">Visiting Faculty</option>
                          </select>
                        </FormField>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* ================= DEPARTMENT & COURSE CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={2}
                initial="hidden"
                animate="visible"
                className="col-12"
              >
                <div className="card border-0 shadow-sm" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                  <div
                    className="px-4 py-3 d-flex align-items-center gap-3"
                    style={{ background: 'linear-gradient(135deg, #ffedd5 0%, #ffeddb 100%)', borderBottom: '1px solid #fed7aa' }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: `${BRAND_COLORS.warning.main}15`,
                        color: BRAND_COLORS.warning.main,
                        fontSize: '1.5rem'
                      }}
                    >
                      <FaUsers />
                    </div>
                    <h2 className="mb-0 fw-bold" style={{ fontSize: '1.5rem', color: '#1e293b' }}>
                      Department & Course Assignment
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="row g-4">
                      <div className="col-12 col-md-6 col-lg-6">
                        <FormField
                          icon={<FaUniversity />}
                          label="Department"
                          required
                          error={validationErrors.department_id}
                          helperText="Select department first to load available courses"
                        >
                          <select
                            name="department_id"
                            value={formData.department_id}
                            onChange={handleChange}
                            className="form-select"
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
                      </div>

                      <div className="col-12 col-md-6 col-lg-6">
                        <FormField
                          icon={<FaBookOpen />}
                          label="Course"
                          required
                          error={validationErrors.course_id}
                          helperText={formData.department_id ? `${courses.length} courses available` : "Select department first"}
                        >
                          <select
                            name="course_id"
                            value={formData.course_id}
                            onChange={handleChange}
                            className="form-select"
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
                      </div>
                    </div>
                    
                    <div style={{ 
                      marginTop: '1.5rem', 
                      padding: '1.25rem', 
                      borderRadius: '16px', 
                      backgroundColor: '#fffbeb',
                      border: '1px solid #f59e0b'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <FaInfoCircle size={20} style={{ color: BRAND_COLORS.warning.main, flexShrink: 0, marginTop: '0.25rem' }} />
                        <div>
                          <strong>Note:</strong> Teacher will be assigned to the selected course in the chosen department. 
                          Employee ID will be auto-generated using department code and sequence number (e.g., CS-T-001).
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* ================= ADDRESS CARD ================= */}
              <motion.div
                variants={fadeInVariants}
                custom={3}
                initial="hidden"
                animate="visible"
                className="col-12"
              >
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1.75rem',
                    background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
                    borderBottom: '1px solid #ddd6fe',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${BRAND_COLORS.secondary.main}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: BRAND_COLORS.secondary.main,
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      <FaMapMarkedAlt />
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Address Details
                    </h2>
                  </div>

                  <div className="p-4">
                    <div className="row g-4">
                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaMapMarkedAlt />}
                          label="Address Line"
                          required
                          error={validationErrors.address}
                        >
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="Street address, building name"
                            required
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaCity />}
                          label="City"
                          required
                          error={validationErrors.city}
                        >
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., Mumbai"
                            required
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaBuilding />}
                          label="State"
                          required
                          error={validationErrors.state}
                        >
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., Maharashtra"
                            required
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* ================= SUBMIT BUTTON ================= */}
            <motion.div
              variants={fadeInVariants}
              custom={4}
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
                onClick={() => navigate("/teachers")}
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
                    Creating Teacher...
                  </>
                ) : (
                  <>
                    <FaChalkboardTeacher size={20} /> Create Teacher Account
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