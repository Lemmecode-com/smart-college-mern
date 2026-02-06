import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaChalkboardTeacher,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaIdCard,
  FaUserTie,
  FaUpload,
  FaMapMarkerAlt,
  FaVenusMars,
  FaTint,
  FaBriefcase,
  FaEnvelope,
  FaKey,
  FaGraduationCap,
  FaClock,
  FaBuilding,
  FaCity,
  FaFileAlt,
  FaImage,
  FaSave,
  FaSpinner,
  FaInfoCircle,
  FaEye,
  FaEyeSlash,
  FaSyncAlt
} from "react-icons/fa";

export default function AddTeacher() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  const [departments, setDepartments] = useState([]);
  const [documents, setDocuments] = useState({
    aadhar: null,
    pan: null,
    degree: null,
    photo: null
  });
  const [documentPreviews, setDocumentPreviews] = useState({
    aadhar: null,
    pan: null,
    degree: null,
    photo: null
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "", // Will be auto-generated
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: "",
    password: "",
    gender: "",
    bloodGroup: "",
    employmentType: "FULL_TIME",
    address: "",
    city: "",
    state: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [activeSection, setActiveSection] = useState('basic');
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch {
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  /* ================= AUTO-GENERATE EMPLOYEE ID ================= */
  useEffect(() => {
    if (!formData.department_id || departments.length === 0) {
      setFormData(prev => ({ ...prev, employeeId: "" }));
      return;
    }

    // Generate ID only when department changes
    const generateEmployeeId = () => {
      setIsGeneratingId(true);
      
      try {
        const dept = departments.find(d => d._id === formData.department_id);
        if (!dept) {
          setFormData(prev => ({ ...prev, employeeId: "" }));
          return;
        }

        // Clean and extract department code (prioritize official code)
        const deptSource = dept.code || dept.name;
        const cleanDept = deptSource
          .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric
          .substring(0, 3)                // Take first 3 characters
          .toUpperCase() || 'DEP';        // Fallback

        // Current year (last 2 digits)
        const year = new Date().getFullYear().toString().slice(-2);
        
        // Generate pseudo-unique sequence using timestamp hash
        const timestamp = Date.now();
        const hash = Array.from(String(timestamp)).reduce((sum, char) => 
          sum + char.charCodeAt(0), timestamp
        );
        const sequence = (Math.abs(hash) % 900 + 100).toString().padStart(3, '0');
        
        const newEmployeeId = `${cleanDept}-${year}-${sequence}`;
        
        setFormData(prev => ({ ...prev, employeeId: newEmployeeId }));
      } finally {
        setIsGeneratingId(false);
      }
    };

    // Small delay for visual feedback
    const timer = setTimeout(generateEmployeeId, 300);
    return () => clearTimeout(timer);
  }, [formData.department_id, departments]);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    if (!formData.employeeId.trim()) errors.employeeId = "Employee ID will auto-generate when department is selected";
    if (!formData.designation.trim()) errors.designation = "Designation is required";
    if (!formData.qualification.trim()) errors.qualification = "Qualification is required";
    if (!formData.experienceYears) errors.experienceYears = "Experience is required";
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (!formData.department_id) errors.department_id = "Department is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.bloodGroup) errors.bloodGroup = "Blood group is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.state.trim()) errors.state = "State is required";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({ ...formData, [name]: value });
    setFormTouched(true);
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Special handling: Clear employeeId when department changes
    if (name === "department_id" && value === "") {
      setFormData(prev => ({ ...prev, employeeId: "" }));
    }
  };

  const handleFile = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      const file = files[0];
      
      // Validate file type and size
      if (!file.type.startsWith('image/') && name !== 'degree') {
        setError("Please upload a valid image file (JPG, PNG, GIF)");
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError("File size must be less than 2MB");
        return;
      }
      
      setDocuments({ ...documents, [name]: file });
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDocumentPreviews(prev => ({ ...prev, [name]: reader.result }));
        };
        reader.readAsDataURL(file);
      } else {
        setDocumentPreviews(prev => ({ ...prev, [name]: file.name }));
      }
      
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError("Please fix the errors before submitting");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await api.post("/teachers", {
        ...formData,
        experienceYears: Number(formData.experienceYears)
      });

      setSuccess(true);
      setError("");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        employeeId: "",
        designation: "",
        qualification: "",
        experienceYears: "",
        department_id: "",
        password: "",
        gender: "",
        bloodGroup: "",
        employmentType: "FULL_TIME",
        address: "",
        city: "",
        state: ""
      });
      setDocuments({
        aadhar: null,
        pan: null,
        degree: null,
        photo: null
      });
      setDocumentPreviews({
        aadhar: null,
        pan: null,
        degree: null,
        photo: null
      });
      
      setTimeout(() => navigate("/teachers"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create teacher. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOADING STATE ================= */
  if (!departments.length) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading departments...</h4>
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/teachers">Teachers</a></li>
          <li className="breadcrumb-item active" aria-current="page">Add Teacher</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaChalkboardTeacher />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Add New Teacher</h1>
            <p className="erp-page-subtitle">
              Register a new faculty member for your institution
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate("/teachers")}
            disabled={loading}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back to Teachers</span>
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="erp-alert erp-alert-danger animate-slide-in">
          <div className="erp-alert-icon">
            <FaExclamationTriangle />
          </div>
          <div className="erp-alert-content">
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="erp-alert-close"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="erp-alert erp-alert-success animate-slide-in">
          <div className="erp-alert-icon">
            <FaCheckCircle />
          </div>
          <div className="erp-alert-content">
            <strong>Success!</strong> Teacher created successfully. Redirecting to teachers list...
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="erp-form-card animate-fade-in">
        <div className="erp-form-header">
          <div className="erp-form-title">
            <FaChalkboardTeacher className="erp-form-icon" />
            <h3>Teacher Registration Form</h3>
          </div>
          <div className="erp-form-subtitle">
            Fill in all required fields marked with <span className="required">*</span>. All information is confidential.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="erp-form">
          {/* FORM SECTIONS NAVIGATION */}
          <div className="form-sections-nav">
            <button
              type="button"
              className={`section-nav-btn ${activeSection === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveSection('basic')}
            >
              <FaUserTie className="nav-icon" />
              <span>Basic Info</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveSection('personal')}
            >
              <FaIdCard className="nav-icon" />
              <span>Personal Info</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === 'address' ? 'active' : ''}`}
              onClick={() => setActiveSection('address')}
            >
              <FaMapMarkerAlt className="nav-icon" />
              <span>Address</span>
            </button>
            <button
              type="button"
              className={`section-nav-btn ${activeSection === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveSection('documents')}
            >
              <FaFileAlt className="nav-icon" />
              <span>Documents</span>
            </button>
          </div>

          {/* BASIC INFO SECTION */}
          <div className={`form-section ${activeSection === 'basic' ? 'active' : ''}`}>
            <h4 className="erp-section-title">
              <FaUserTie className="erp-section-icon" />
              Basic Information
            </h4>
            
            <div className="erp-row">
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaUserTie className="erp-label-icon" />
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className={`erp-input ${validationErrors.name ? 'erp-input-error' : ''}`}
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                  {validationErrors.name && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.name}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    As per official records
                  </div>
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaEnvelope className="erp-label-icon" />
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={`erp-input ${validationErrors.email ? 'erp-input-error' : ''}`}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="teacher@college.edu"
                    required
                  />
                  {validationErrors.email && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.email}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Will be used for login and communications
                  </div>
                </div>
              </div>
              
              {/* AUTO-GENERATED EMPLOYEE ID FIELD */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaIdCard className="erp-label-icon" />
                    Employee ID <span className="required">*</span>
                  </label>
                  <div className="employee-id-container">
                    <div className={`employee-id-display ${validationErrors.employeeId ? 'error' : ''} ${isGeneratingId ? 'generating' : ''}`}>
                      <div className="id-prefix">EMP</div>
                      <input
                        type="text"
                        className="id-input"
                        value={formData.employeeId}
                        readOnly
                        placeholder={formData.department_id ? "Auto-generating..." : "Select department first"}
                      />
                      {formData.employeeId && (
                        <span className="auto-badge">
                          <FaSyncAlt className="auto-icon" />
                          Auto
                        </span>
                      )}
                      {isGeneratingId && (
                        <div className="generating-spinner">
                          <FaSyncAlt className="spin-icon" />
                        </div>
                      )}
                    </div>
                    {validationErrors.employeeId && (
                      <div className="erp-error-text employee-id-error">
                        <FaExclamationTriangle className="erp-error-icon" />
                        {validationErrors.employeeId}
                      </div>
                    )}
                    <div className="erp-hint-text employee-id-hint">
                      <FaInfoCircle className="erp-hint-icon" />
                      <span>
                        Auto-generated format: <strong>DEPT-YY-SEQ</strong> (e.g., CSE-24-127). 
                        Generated when department is selected.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaBriefcase className="erp-label-icon" />
                    Designation <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    className={`erp-input ${validationErrors.designation ? 'erp-input-error' : ''}`}
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="e.g., Professor, Assistant Professor"
                    required
                  />
                  {validationErrors.designation && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.designation}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaGraduationCap className="erp-label-icon" />
                    Qualification <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    className={`erp-input ${validationErrors.qualification ? 'erp-input-error' : ''}`}
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="e.g., Ph.D, M.Tech"
                    required
                  />
                  {validationErrors.qualification && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.qualification}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaClock className="erp-label-icon" />
                    Experience (Years) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    className={`erp-input ${validationErrors.experienceYears ? 'erp-input-error' : ''}`}
                    value={formData.experienceYears}
                    onChange={handleChange}
                    placeholder="e.g., 5"
                    min="0"
                    required
                  />
                  {validationErrors.experienceYears && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.experienceYears}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaKey className="erp-label-icon" />
                    Password <span className="required">*</span>
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className={`erp-input ${validationErrors.password ? 'erp-input-error' : ''}`}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.password}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Minimum 6 characters required
                  </div>
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaBuilding className="erp-label-icon" />
                    Department <span className="required">*</span>
                  </label>
                  <select
                    className={`erp-select ${validationErrors.department_id ? 'erp-select-error' : ''}`}
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} {dept.code && `(${dept.code})`}
                      </option>
                    ))}
                  </select>
                  {validationErrors.department_id && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.department_id}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PERSONAL INFO SECTION (unchanged) */}
          <div className={`form-section ${activeSection === 'personal' ? 'active' : ''}`}>
            <h4 className="erp-section-title">
              <FaIdCard className="erp-section-icon" />
              Personal Information
            </h4>
            
            <div className="erp-row">
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaVenusMars className="erp-label-icon" />
                    Gender <span className="required">*</span>
                  </label>
                  <select
                    className={`erp-select ${validationErrors.gender ? 'erp-select-error' : ''}`}
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {validationErrors.gender && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.gender}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaTint className="erp-label-icon" />
                    Blood Group <span className="required">*</span>
                  </label>
                  <select
                    className={`erp-select ${validationErrors.bloodGroup ? 'erp-select-error' : ''}`}
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Blood Group --</option>
                    {["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"].map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                  {validationErrors.bloodGroup && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.bloodGroup}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-4">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaBriefcase className="erp-label-icon" />
                    Employment Type <span className="required">*</span>
                  </label>
                  <select
                    className="erp-select"
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    required
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="VISITING">Visiting Faculty</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ADDRESS SECTION (unchanged) */}
          <div className={`form-section ${activeSection === 'address' ? 'active' : ''}`}>
            <h4 className="erp-section-title">
              <FaMapMarkerAlt className="erp-section-icon" />
              Address Details
            </h4>
            
            <div className="erp-row">
              <div className="erp-col-12">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaMapMarkerAlt className="erp-label-icon" />
                    Full Address <span className="required">*</span>
                  </label>
                  <textarea
                    name="address"
                    className={`erp-textarea ${validationErrors.address ? 'erp-input-error' : ''}`}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="House No., Street, Locality"
                    rows="3"
                    required
                  />
                  {validationErrors.address && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.address}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaCity className="erp-label-icon" />
                    City <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    className={`erp-input ${validationErrors.city ? 'erp-input-error' : ''}`}
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g., Mumbai"
                    required
                  />
                  {validationErrors.city && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.city}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaMapMarkerAlt className="erp-label-icon" />
                    State <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    className={`erp-input ${validationErrors.state ? 'erp-input-error' : ''}`}
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g., Maharashtra"
                    required
                  />
                  {validationErrors.state && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.state}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENTS SECTION (unchanged) */}
          <div className={`form-section ${activeSection === 'documents' ? 'active' : ''}`}>
            <h4 className="erp-section-title">
              <FaFileAlt className="erp-section-icon" />
              Document Upload
            </h4>
            <p className="section-description">
              Upload required documents. Maximum file size: 2MB per document. Supported formats: JPG, PNG, PDF
            </p>
            
            <div className="erp-row">
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaFileAlt className="erp-label-icon" />
                    Aadhar Card
                  </label>
                  <div className="document-upload">
                    <input
                      type="file"
                      name="aadhar"
                      className="document-input"
                      onChange={handleFile}
                      accept="image/*,.pdf"
                    />
                    <div className="document-preview">
                      {documentPreviews.aadhar ? (
                        typeof documentPreviews.aadhar === 'string' && documentPreviews.aadhar.startsWith('data:') ? (
                          <img src={documentPreviews.aadhar} alt="Aadhar preview" className="preview-image" />
                        ) : (
                          <div className="file-name">{documentPreviews.aadhar}</div>
                        )
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload className="upload-icon" />
                          <p>Click to upload Aadhar</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="erp-hint-text document-hint">
                    <FaInfoCircle className="erp-hint-icon" />
                    Government ID proof (PDF or image)
                  </div>
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaFileAlt className="erp-label-icon" />
                    PAN Card
                  </label>
                  <div className="document-upload">
                    <input
                      type="file"
                      name="pan"
                      className="document-input"
                      onChange={handleFile}
                      accept="image/*,.pdf"
                    />
                    <div className="document-preview">
                      {documentPreviews.pan ? (
                        typeof documentPreviews.pan === 'string' && documentPreviews.pan.startsWith('data:') ? (
                          <img src={documentPreviews.pan} alt="PAN preview" className="preview-image" />
                        ) : (
                          <div className="file-name">{documentPreviews.pan}</div>
                        )
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload className="upload-icon" />
                          <p>Click to upload PAN</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="erp-hint-text document-hint">
                    <FaInfoCircle className="erp-hint-icon" />
                    Tax ID proof (PDF or image)
                  </div>
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaFileAlt className="erp-label-icon" />
                    Degree Certificate
                  </label>
                  <div className="document-upload">
                    <input
                      type="file"
                      name="degree"
                      className="document-input"
                      onChange={handleFile}
                      accept=".pdf,.doc,.docx"
                    />
                    <div className="document-preview">
                      {documentPreviews.degree ? (
                        typeof documentPreviews.degree === 'string' && documentPreviews.degree.startsWith('data:') ? (
                          <img src={documentPreviews.degree} alt="Degree preview" className="preview-image" />
                        ) : (
                          <div className="file-name">{documentPreviews.degree}</div>
                        )
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload className="upload-icon" />
                          <p>Click to upload Degree</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="erp-hint-text document-hint">
                    <FaInfoCircle className="erp-hint-icon" />
                    Highest qualification certificate (PDF preferred)
                  </div>
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaImage className="erp-label-icon" />
                    Passport Photo
                  </label>
                  <div className="document-upload">
                    <input
                      type="file"
                      name="photo"
                      className="document-input"
                      onChange={handleFile}
                      accept="image/*"
                    />
                    <div className="document-preview">
                      {documentPreviews.photo ? (
                        typeof documentPreviews.photo === 'string' && documentPreviews.photo.startsWith('data:') ? (
                          <img src={documentPreviews.photo} alt="Photo preview" className="preview-image photo-preview" />
                        ) : (
                          <div className="file-name">{documentPreviews.photo}</div>
                        )
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload className="upload-icon" />
                          <p>Click to upload Photo</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="erp-hint-text document-hint">
                    <FaInfoCircle className="erp-hint-icon" />
                    Recent passport size photograph (JPG/PNG)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM ACTIONS (unchanged) */}
          <div className="erp-form-footer">
            <div className="erp-footer-left">
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-lg"
                onClick={() => navigate("/teachers")}
                disabled={loading}
              >
                <FaArrowLeft className="erp-btn-icon" />
                <span>Cancel</span>
              </button>
            </div>
            <div className="erp-footer-right">
              <button
                type="submit"
                className="erp-btn erp-btn-primary erp-btn-lg erp-btn-shadow"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="erp-btn-icon erp-spin" />
                    <span>Creating Teacher...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="erp-btn-icon" />
                    <span>Create Teacher</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* STYLES */}
      <style jsx>{`
        /* Existing styles remain unchanged... */
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-breadcrumb {
          background: transparent;
          padding: 0;
          margin-bottom: 1.5rem;
        }
        
        .breadcrumb {
          background: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .breadcrumb-item a {
          color: #1a4b6d;
          text-decoration: none;
        }
        
        .breadcrumb-item a:hover {
          text-decoration: underline;
        }
        
        .erp-page-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.6s ease;
        }
        
        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .erp-header-icon {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }
        
        .erp-page-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
        }
        
        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.85;
          font-size: 1rem;
        }
        
        .erp-header-actions .erp-btn {
          background: white;
          color: #1a4b6d;
          border: none;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        
        .erp-header-actions .erp-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }
        
        .erp-alert {
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          animation: slideIn 0.5s ease;
        }
        
        .erp-alert-danger {
          background: rgba(244, 67, 54, 0.1);
          border-left: 4px solid #F44336;
          color: #F44336;
        }
        
        .erp-alert-success {
          background: rgba(76, 175, 80, 0.1);
          border-left: 4px solid #4CAF50;
          color: #4CAF50;
        }
        
        .erp-alert-icon {
          font-size: 1.5rem;
        }
        
        .erp-alert-content {
          flex: 1;
        }
        
        .erp-alert-close {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          color: inherit;
        }
        
        .erp-form-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-form-header {
          padding: 2rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
        }
        
        .erp-form-title {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .erp-form-icon {
          color: #1a4b6d;
          font-size: 1.5rem;
        }
        
        .erp-form-title h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
        }
        
        .erp-form-subtitle {
          font-size: 0.9rem;
          color: #666;
        }
        
        .erp-form {
          padding: 0 2rem 2rem;
        }
        
        /* FORM SECTIONS NAVIGATION */
        .form-sections-nav {
          display: flex;
          border-bottom: 1px solid #e9ecef;
          margin-bottom: 2rem;
          padding: 0 0 1rem;
          overflow-x: auto;
        }
        
        .section-nav-btn {
          background: none;
          border: none;
          padding: 0.75rem 1.5rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: #6c757d;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .section-nav-btn:hover {
          color: #1a4b6d;
          background: #f8f9fa;
        }
        
        .section-nav-btn.active {
          color: #1a4b6d;
          font-weight: 600;
          border-bottom-color: #1a4b6d;
          background: #f0f5ff;
        }
        
        .nav-icon {
          font-size: 1.1rem;
        }
        
        /* FORM SECTIONS */
        .form-section {
          display: none;
          animation: fadeIn 0.4s ease;
        }
        
        .form-section.active {
          display: block;
        }
        
        .erp-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a4b6d;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f2f5;
        }
        
        .erp-section-icon {
          color: #1a4b6d;
        }
        
        .section-description {
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        
        .erp-row {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 1.5rem;
        }
        
        .erp-col-12 { grid-column: span 12; }
        .erp-col-6 { grid-column: span 6; }
        .erp-col-4 { grid-column: span 4; }
        
        @media (max-width: 768px) {
          .erp-col-12,
          .erp-col-6,
          .erp-col-4 {
            grid-column: span 12;
          }
        }
        
        .erp-form-group {
          margin-bottom: 1.5rem;
        }
        
        .erp-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
          margin-bottom: 0.75rem;
        }
        
        .erp-label-icon {
          color: #1a4b6d;
          font-size: 1rem;
        }
        
        .required {
          color: #F44336;
          margin-left: 0.25rem;
        }
        
        .erp-input,
        .erp-select,
        .erp-textarea {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 500;
          color: #2c3e50;
          background: white;
          transition: all 0.3s ease;
          outline: none;
        }
        
        .erp-textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .erp-input:focus,
        .erp-select:focus,
        .erp-textarea:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
          transform: translateY(-1px);
        }
        
        .erp-input-error {
          border-color: #F44336 !important;
          background: rgba(244, 67, 54, 0.05);
        }
        
        .erp-select-error {
          border-color: #F44336 !important;
          background: rgba(244, 67, 54, 0.05) url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3e%3cpath fill='%23F44336' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") no-repeat right 0.75rem center/8px 10px;
        }
        
        .erp-error-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #F44336;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(244, 67, 54, 0.05);
          border-radius: 6px;
        }
        
        .erp-error-icon {
          font-size: 0.875rem;
        }
        
        .erp-hint-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #666;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #1a4b6d;
        }
        
        .document-hint {
          background: #e3f2fd;
          border-left-color: #2196F3;
        }
        
        .erp-hint-icon {
          font-size: 0.875rem;
        }
        
        /* PASSWORD FIELD */
        .password-wrapper {
          position: relative;
        }
        
        .toggle-password {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }
        
        .toggle-password:hover {
          color: #1a4b6d;
        }
        
        /* DOCUMENT UPLOAD */
        .document-upload {
          border: 2px dashed #e9ecef;
          border-radius: 12px;
          padding: 1.25rem;
          background: #f8f9fa;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        
        .document-upload:hover {
          border-color: #1a4b6d;
          background: #f0f5ff;
        }
        
        .document-input {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          opacity: 0;
          cursor: pointer;
        }
        
        .document-preview {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 120px;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .preview-image {
          max-width: 100%;
          max-height: 120px;
          object-fit: contain;
          border-radius: 8px;
        }
        
        .photo-preview {
          border-radius: 50%;
          object-fit: cover;
        }
        
        .file-name {
          font-size: 0.9rem;
          color: #1a4b6d;
          font-weight: 500;
          text-align: center;
          padding: 0.5rem;
        }
        
        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6c757d;
          text-align: center;
          padding: 1rem;
        }
        
        .upload-icon {
          font-size: 2.5rem;
          opacity: 0.3;
          margin-bottom: 0.5rem;
        }
        
        .upload-placeholder p {
          font-size: 0.9rem;
          margin: 0;
        }
        
        /* FORM FOOTER */
        .erp-form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
          margin-top: 2rem;
          border-radius: 0 0 16px 16px;
        }
        
        .erp-footer-left,
        .erp-footer-right {
          display: flex;
          gap: 1rem;
        }
        
        .erp-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.75rem;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }
        
        .erp-btn-icon {
          font-size: 1.125rem;
        }
        
        .erp-btn-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }
        
        .erp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(26, 75, 109, 0.4);
        }
        
        .erp-btn-secondary {
          background: white;
          color: #1a4b6d;
          border: 2px solid #e9ecef;
        }
        
        .erp-btn-secondary:hover {
          border-color: #1a4b6d;
          background: #f8f9fa;
          transform: translateY(-2px);
        }
        
        .erp-btn-lg {
          padding: 1rem 2rem;
          font-size: 1.05rem;
        }
        
        .erp-btn-shadow {
          box-shadow: 0 4px 16px rgba(26, 75, 109, 0.3);
        }
        
        .erp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .erp-spin {
          animation: spin 1s linear infinite;
        }
        
        /* LOADING CONTAINER */
        .erp-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 2rem;
        }
        
        .erp-loading-spinner {
          position: relative;
          width: 70px;
          height: 70px;
        }
        
        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: #1a4b6d;
          animation: spin 1s linear infinite;
        }
        
        .spinner-ring:nth-child(2) {
          border-top-color: #0f3a4a;
          animation-delay: 0.1s;
        }
        
        .spinner-ring:nth-child(3) {
          border-top-color: rgba(26, 75, 109, 0.5);
          animation-delay: 0.2s;
        }
        
        .erp-loading-text {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a4b6d;
        }
        
        /* EMPLOYEE ID AUTO-GENERATION STYLES */
        .employee-id-container {
          position: relative;
        }
        
        .employee-id-display {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          padding: 0.25rem;
          transition: all 0.3s ease;
        }
        
        .employee-id-display.error {
          border-color: #F44336 !important;
          background: rgba(244, 67, 54, 0.05);
        }
        
        .employee-id-display.generating {
          border-color: #2196F3;
          box-shadow: 0 0 0 0.2rem rgba(33, 150, 243, 0.2);
        }
        
        .employee-id-display:hover {
          border-color: #1a4b6d;
        }
        
        .id-prefix {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          padding: 0.625rem 0.875rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(26, 75, 109, 0.2);
        }
        
        .id-input {
          flex: 1;
          background: white;
          border: none;
          padding: 0.875rem 1.25rem;
          font-size: 1.15rem;
          font-weight: 700;
          color: #1a4b6d;
          letter-spacing: 1px;
          text-align: center;
          min-width: 0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(26, 75, 109, 0.08);
        }
        
        .id-input::placeholder {
          color: #9e9e9e;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        .auto-badge {
          position: absolute;
          top: -10px;
          right: 10px;
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
          display: flex;
          align-items: center;
          gap: 0.375rem;
          animation: float 2s ease-in-out infinite;
        }
        
        .auto-icon {
          font-size: 0.75rem;
          animation: spin 2s linear infinite;
        }
        
        .generating-spinner {
          position: absolute;
          top: 50%;
          right: 15px;
          transform: translateY(-50%);
          color: #2196F3;
          font-size: 1.2rem;
          animation: spin 1s linear infinite;
        }
        
        .employee-id-error {
          margin-top: 0.5rem;
        }
        
        .employee-id-hint {
          background: #e8f5e9;
          border-left-color: #4CAF50;
          margin-top: 0.75rem;
        }
        
        /* ANIMATIONS */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        .animate-slide-in {
          animation: slideIn 0.5s ease;
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 768px) {
          .erp-container {
            padding: 1rem;
          }
          
          .erp-page-header {
            padding: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .erp-header-actions {
            width: 100%;
            margin-top: 0.5rem;
          }
          
          .erp-header-actions .erp-btn {
            width: 100%;
            justify-content: center;
          }
          
          .erp-form-header,
          .erp-form {
            padding: 1.5rem;
          }
          
          .erp-form-footer {
            flex-direction: column;
            gap: 1rem;
            padding: 1.5rem;
          }
          
          .erp-footer-left,
          .erp-footer-right {
            width: 100%;
            justify-content: center;
          }
          
          .erp-btn {
            width: 100%;
            justify-content: center;
          }
          
          .form-sections-nav {
            flex-wrap: wrap;
          }
          
          .section-nav-btn {
            padding: 0.75rem;
            font-size: 0.85rem;
          }
          
          .document-preview {
            min-height: 100px;
          }
          
          .preview-image {
            max-height: 100px;
          }
          
          /* Employee ID responsive */
          .employee-id-display {
            flex-direction: column;
            padding: 0.75rem;
          }
          
          .id-prefix {
            width: 100%;
            justify-content: center;
          }
          
          .id-input {
            width: 100%;
            text-align: center;
          }
          
          .auto-badge {
            position: static;
            margin-top: 0.5rem;
          }
          
          .generating-spinner {
            position: static;
            transform: none;
            margin-top: 0.5rem;
          }
        }
        
        @media (max-width: 480px) {
          .erp-section-title {
            font-size: 1.15rem;
          }
          
          .erp-label {
            font-size: 0.9rem;
          }
          
          .erp-input,
          .erp-select,
          .erp-textarea {
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
          }
          
          .erp-btn-lg {
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
          }
          
          .upload-icon {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}