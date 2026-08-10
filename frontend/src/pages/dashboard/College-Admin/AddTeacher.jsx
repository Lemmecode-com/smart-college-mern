import { useContext, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

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
  FaBookOpen,
  FaCalendarAlt,
  FaPhoneAlt,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaUpload,
  FaFileAlt
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: "",
    course_id: "",
    gender: "",
    bloodGroup: "",
    dateOfBirth: "",
    employmentType: "FULL_TIME",
    address: "",
    city: "",
    state: "",
    pincode: "",
    mobileNumber: "",
    joiningDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const resultRef = useRef(null);

  const [documents, setDocuments] = useState({
    aadhaarCard: null,
    panCard: null,
    degreeCertificate: null,
    passportPhoto: null,
  });
  const [documentErrors, setDocumentErrors] = useState({});

  const DOCUMENT_TYPES = [
    { type: 'aadhaarCard', label: 'Aadhaar Card', maxSizeMB: 2 },
    { type: 'panCard', label: 'PAN Card', maxSizeMB: 2 },
    { type: 'degreeCertificate', label: 'Degree Certificate', maxSizeMB: 5 },
    { type: 'passportPhoto', label: 'Passport Photo', maxSizeMB: 2 },
  ];

  const handleDocumentChange = (type, file) => {
    const config = DOCUMENT_TYPES.find(d => d.type === type);
    const maxSize = (config?.maxSizeMB || 2) * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    if (!file) {
      setDocuments(prev => ({ ...prev, [type]: null }));
      setDocumentErrors(prev => ({ ...prev, [type]: '' }));
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setDocumentErrors(prev => ({ ...prev, [type]: 'Only PDF, JPG, JPEG, PNG files are allowed' }));
      setDocuments(prev => ({ ...prev, [type]: null }));
      return;
    }

    if (file.size > maxSize) {
      setDocumentErrors(prev => ({ ...prev, [type]: `File size must be less than ${config?.maxSizeMB || 2}MB` }));
      setDocuments(prev => ({ ...prev, [type]: null }));
      return;
    }

    setDocuments(prev => ({ ...prev, [type]: file }));
    setDocumentErrors(prev => ({ ...prev, [type]: '' }));
  };

  const removeDocument = (type) => {
    setDocuments(prev => ({ ...prev, [type]: null }));
    setDocumentErrors(prev => ({ ...prev, [type]: '' }));
  };

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

  /* ================= LOAD DEPARTMENTS ================= */
  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments");
      setDepartments(res.data);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
        ? "Authentication error occurred."
        : backendMessage || "Failed to load departments. Please try again later.";

      logger.error("Error fetching departments:", statusCode, errorCode);
      setDepartmentsError({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    } finally {
      setDepartmentsLoading(false);
    }
  };

  useEffect(() => {
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
        // Handle different API response formats
        const coursesData = Array.isArray(res.data?.courses) ? res.data.courses :
                            Array.isArray(res.data) ? res.data : [];
        setCourses(coursesData);
      } catch (err) {
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
      'experienceYears', 'department_id', 'course_id',
      'gender', 'bloodGroup', 'dateOfBirth', 'address', 'city', 'state', 'pincode'
    ];
    
    requiredFields.forEach(field => {
      if (!formData[field] || formData[field].trim() === '') {
        errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
        isValid = false;
      }
    });

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    // Experience years validation
    const expYears = Number(formData.experienceYears);
    if (isNaN(expYears) || expYears < 0 || expYears > 50) {
      errors.experienceYears = 'Experience must be between 0-50 years';
      isValid = false;
    }

    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth + "T00:00:00");
      if (isNaN(birthDate.getTime())) {
        errors.dateOfBirth = 'Invalid Date of Birth';
        isValid = false;
      } else if (birthDate > new Date()) {
        errors.dateOfBirth = 'Date of Birth cannot be in the future';
        isValid = false;
      } else {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 14 || age > 100) {
          errors.dateOfBirth = 'Age must be between 14 and 100 years';
          isValid = false;
        }
      }
    }

    if (formData.joiningDate && new Date(formData.joiningDate + "T00:00:00") > new Date()) {
      errors.joiningDate = 'Joining Date cannot be in the future';
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
      const fd = new FormData();
      fd.append("name", formData.name.trim());
      fd.append("email", formData.email.trim());
      fd.append("designation", formData.designation.trim());
      fd.append("qualification", formData.qualification.trim());
      fd.append("experienceYears", String(formData.experienceYears));
      fd.append("department_id", formData.department_id);
      fd.append("course_id", formData.course_id);
      fd.append("employeeId", `TEMP-${Date.now().toString().slice(-6)}`);
      fd.append("gender", formData.gender);
      fd.append("bloodGroup", formData.bloodGroup);
      fd.append("dateOfBirth", formData.dateOfBirth);
      fd.append("employmentType", formData.employmentType);
      fd.append("address", formData.address.trim());
      fd.append("city", formData.city.trim());
      fd.append("state", formData.state.trim());
      fd.append("pincode", formData.pincode.trim());
      fd.append("mobileNumber", formData.mobileNumber.trim());
      fd.append("joiningDate", formData.joiningDate || "");

      for (const [type, file] of Object.entries(documents)) {
        if (file) {
          fd.append(type, file);
        }
      }

      const response = await api.post("/teachers", fd);
      setResult(response.data);
      setSuccess(true);

      // Reset form (but don't navigate away — let user see popup first)
      setFormData({
        name: "",
        email: "",
        designation: "",
        qualification: "",
        experienceYears: "",
        department_id: "",
        course_id: "",
        gender: "",
        bloodGroup: "",
        dateOfBirth: "",
        employmentType: "FULL_TIME",
        address: "",
        city: "",
        state: "",
        pincode: "",
        mobileNumber: "",
        joiningDate: "",
      });
      setDocuments({
        aadhaarCard: null,
        panCard: null,
        degreeCertificate: null,
        passportPhoto: null,
      });
      setValidationErrors({});
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error creating teacher:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
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
        } else if (err.request) {
          errorMessage = "Network error. Please check your internet connection.";
        }

        setError(errorMessage);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.temporaryPassword) {
      navigator.clipboard.writeText(result.temporaryPassword);
      toast.success("Password copied to clipboard!");
    }
  };

  /* ================= LOADING STATE ================= */
  if (departmentsLoading) {
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

  if (departmentsError) {
    return (
      <ApiError
        title="Departments Loading Error"
        message={departmentsError.message}
        statusCode={departmentsError.statusCode}
        errorCode={departmentsError.errorCode}
        onRetry={fetchDepartments}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (error && typeof error === 'object' && !loading) {
    return (
      <ApiError
        title="Teacher Creation Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onGoBack={() => navigate(-1)}
      />
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
          <Breadcrumb
            items={[
              { label: "Teachers", path: "/teachers" },
              { label: "Add New Teacher" }
            ]}
          />

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
          
          <form onSubmit={handleSubmit} noValidate>
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
                          >
                            <option value="">Select blood group</option>
                            {["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"].map(group => (
                              <option key={group} value={group}>{group}</option>
                            ))}
                          </select>
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaCalendarAlt />}
                          label="Date of Birth"
                          required
                          error={validationErrors.dateOfBirth}
                        >
                           <input
                             type="date"
                             name="dateOfBirth"
                             value={formData.dateOfBirth}
                             onChange={handleChange}
                             className="form-control"
                             max={new Date().toISOString().split("T")[0]}
                           />
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
                           >
                          <option value="">Select gender</option>
                          {["Male", "Female", "Other", "Prefer not to say"].map(gender => (
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
                           >
                            <option value="FULL_TIME">Full Time</option>
                            <option value="PART_TIME">Part Time</option>
                            <option value="VISITING">Visiting Faculty</option>
                          </select>
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaPhoneAlt />}
                          label="Mobile Number"
                          required
                          error={validationErrors.mobileNumber}
                          helperText="10-digit Indian mobile number"
                        >
                          <input
                            type="tel"
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., 9876543210"
                            pattern="[0-9]{10}"
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaCalendarAlt />}
                          label="Joining Date"
                          error={validationErrors.joiningDate}
                          helperText="Date of joining the institution"
                        >
                          <input
                            type="date"
                            name="joiningDate"
                            value={formData.joiningDate}
                            onChange={handleChange}
                            className="form-control"
                            max={new Date().toISOString().split("T")[0]}
                          />
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
                           >
                            <option value="">Select course</option>
                            {Array.isArray(courses) && courses.map(course => (
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
                          />
                        </FormField>
                      </div>

                      <div className="col-12 col-md-6 col-lg-4">
                        <FormField
                          icon={<FaMapMarkerAlt />}
                          label="Pincode"
                          required
                          error={validationErrors.pincode}
                        >
                          <input
                            type="text"
                            name="pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                            className="form-control"
                            placeholder="e.g., 400001"
                            pattern="[0-9]{6}"
                          />
                        </FormField>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* ================= DOCUMENT UPLOAD CARD ================= */}
            <motion.div
              variants={fadeInVariants}
              custom={3.5}
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
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #dbe4ff 100%)',
                  borderBottom: '1px solid #d4dbf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(26, 75, 109, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1a4b6d',
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
                    Upload Documents
                  </h2>
                </div>

                <div className="p-4">
                  <div className="row g-4">
                    {DOCUMENT_TYPES.map((doc) => (
                      <div className="col-12 col-md-6 col-lg-3" key={doc.type}>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            fontSize: '1rem'
                          }}>
                            {doc.label}
                          <span style={{
                            color: BRAND_COLORS.danger.main,
                            fontSize: '0.9rem'
                          }}>*</span>
                          </label>
                          
                          <div 
                            onClick={() => document.getElementById(`upload-${doc.type}`).click()}
                            style={{
                              position: 'relative',
                              border: `2px dashed ${documentErrors[doc.type] ? '#dc3545' : '#e2e8f0'}`,
                              borderRadius: '12px',
                              background: documents[doc.type] ? 'rgba(16, 185, 129, 0.04)' : '#f8fafc',
                              padding: '1.5rem',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minHeight: '120px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <input 
                              id={`upload-${doc.type}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleDocumentChange(doc.type, e.target.files[0] || null)}
                              style={{ display: 'none' }}
                            />
                            
                            {documents[doc.type] ? (
                              <>
                                <FaCheckCircle style={{ color: '#28a745', fontSize: '1.5rem' }} />
                                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                  {documents[doc.type].name}
                                </span>
                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                  {(documents[doc.type].size / 1024).toFixed(1)} KB
                                </span>
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeDocument(doc.type); }}
                                  style={{
                                    marginTop: '0.5rem',
                                    background: 'none',
                                    border: '1px solid #dc3545',
                                    color: '#dc3545',
                                    borderRadius: '6px',
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <>
                                <FaUpload style={{ color: '#1a4b6d', fontSize: '1.5rem', opacity: 0.6 }} />
                                <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                  Click to upload
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                                  PDF, JPG, PNG — max {doc.maxSizeMB}MB
                                </span>
                              </>
                            )}
                          </div>
                          
                          {documentErrors[doc.type] && (
                            <div style={{
                              color: BRAND_COLORS.danger.main,
                              fontSize: '0.85rem',
                              marginTop: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <FaExclamationTriangle size={14} />
                              <span>{documentErrors[doc.type]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

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
        
        {result && (
          <div ref={resultRef} style={{
            background: 'white', borderRadius: '12px', padding: '2rem',
            maxWidth: '600px', margin: '2rem auto 0', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            border: '2px solid #28a745'
          }}>
            <h3 style={{ color: '#28a745', textAlign: 'center', marginBottom: '1.5rem' }}>
              ✓ Teacher Created Successfully!
            </h3>
            <p style={{ color: '#6c757d', textAlign: 'center', marginBottom: '1.5rem' }}>
              Share these credentials with the teacher
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 'bold' }}>Teacher Name:</label>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginTop: '4px', fontSize: '16px' }}>
                {result?.teacher?.name}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 'bold' }}>Employee ID:</label>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginTop: '4px', fontSize: '16px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1a4b6d' }}>
                {result?.teacher?.employeeId || 'N/A'}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 'bold' }}>Email:</label>
              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px', marginTop: '4px', fontSize: '16px' }}>
                {result?.teacher?.email}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 'bold' }}>Temporary Password:</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                <input type="text" readOnly
                  value={showPassword ? result?.temporaryPassword : '••••••••••••'}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '6px', border: '2px solid #ffc107',
                    fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: '#856404',
                    background: 'white'
                  }} />
                <button onClick={() => setShowPassword(!showPassword)}
                  style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '18px' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
                <button onClick={handleCopy}
                  style={{ padding: '10px 14px', borderRadius: '6px', border: 'none', background: '#1a4b6d', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                  Copy
                </button>
              </div>
            </div>

            <div style={{
              background: '#fff3cd', border: '1px solid #ffc107', padding: '12px',
              borderRadius: '6px', marginBottom: '1.5rem', fontSize: '14px', color: '#856404'
            }}>
              ⚠️ <strong>Important:</strong> Teacher must change this password on first login.
            </div>

            <button onClick={() => { setResult(null); setSuccess(false); navigate("/teachers"); }}
              style={{
                width: '100%', padding: '12px', border: 'none', borderRadius: '8px',
                background: '#28a745', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
              }}>
              Go to Teachers List
            </button>
          </div>
        )}

        {error && !result && (
          <div style={{
            marginTop: '1rem', padding: '1rem', borderRadius: '12px',
            backgroundColor: '#fef2f2', border: '1px solid #dc3545', color: '#dc3545',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <FaExclamationTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

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
};

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

function SuccessModal({ result, showPassword, setShowPassword, onCopy, onNavigate }) {
  logger.error("SUCCESS MODAL RENDERING!", result);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white rounded-3 p-4 shadow-lg"
        style={{ maxWidth: '500px', width: '90%' }}
      >
        <div className="text-center mb-4">
          <div className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3"
            style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)', color: 'white' }}>
            <FaCheckCircle size={30} />
          </div>
          <h4 className="mb-2" style={{ color: '#28a745' }}>Teacher Account Created Successfully!</h4>
          <p className="text-muted mb-0">Share these credentials with the teacher</p>
        </div>

        <div className="mb-4">
          <div className="row g-3">
            <div className="col-12">
              <div className="p-3 bg-light rounded-2">
                <div className="row">
                  <div className="col-4 text-muted">Name:</div>
                  <div className="col-8 fw-semibold">{result?.teacher?.name}</div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="p-3 bg-light rounded-2">
                <div className="row">
                  <div className="col-4 text-muted">Email:</div>
                  <div className="col-8 fw-semibold">{result?.teacher?.email}</div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="p-3 bg-light rounded-2">
                <div className="row align-items-center">
                  <div className="col-4 text-muted">Password:</div>
                  <div className="col-8">
                    <div className="d-flex align-items-center gap-2">
                      <code className="bg-white px-2 py-1 rounded border">
                        {showPassword ? result?.temporaryPassword : '••••••••••••'}
                      </code>
                      <button onClick={() => setShowPassword(!showPassword)}
                        className="btn btn-sm btn-outline-secondary">
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <button onClick={onCopy} className="btn btn-sm btn-outline-primary" title="Copy password">
                        <FaCopy />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-warning py-2 mb-4">
          <small><strong>Security Notice:</strong> Share the temporary password securely. Teacher must change it on first login.</small>
        </div>

        <div className="d-flex gap-2">
          <button onClick={onNavigate} className="btn flex-fill"
            style={{ background: 'linear-gradient(135deg, #28a745 0%, #218838 100%)', color: 'white', border: 'none' }}>
            Go to Teachers List
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ErrorDisplay({ message }) {
  return (
    <div className="alert alert-danger d-flex align-items-center gap-3" style={{ borderRadius: '0.75rem' }}>
      <div className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle"
        style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: 'white' }}>
        <FaExclamationTriangle />
      </div>
      <div className="flex-grow-1"><strong>Error:</strong> {message}</div>
    </div>
  );
}

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