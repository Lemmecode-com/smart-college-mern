import { useContext, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";

import {
  FaUniversity,
  FaUserShield,
  FaArrowLeft,
  FaCheckCircle,
  FaRegBuilding,
  FaUserCog,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaLock,
  FaInfoCircle,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaCheck,
  FaTimes,
  FaCopy,
} from "react-icons/fa";

/* ================= CONSTANTS ================= */
const VALIDATION = {
  CODE_PATTERN: /^[A-Z0-9]{3,10}$/,
  PHONE_PATTERN: /^(\+91|0)?[6-9]\d{9}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_PATTERN:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  MIN_YEAR: 1800,
  MAX_YEAR: new Date().getFullYear(),
  ADDRESS_MIN_LENGTH: 20,
};

const MESSAGES = {
  COLLEGE_NAME_REQUIRED: "College name is required",
  COLLEGE_CODE_REQUIRED: "College code is required",
  COLLEGE_CODE_INVALID:
    "College code must be 3-10 alphanumeric characters (A-Z, 0-9)",
  COLLEGE_EMAIL_REQUIRED: "College email is required",
  COLLEGE_EMAIL_INVALID: "Invalid college email format",
  PHONE_REQUIRED: "Contact number is required",
  PHONE_INVALID:
    "Enter valid 10-digit Indian mobile number (e.g., +91 9876543210)",
  ADDRESS_REQUIRED: "Address is required",
  ADDRESS_TOO_SHORT: "Address must be at least 20 characters",
  ESTABLISHED_YEAR_REQUIRED: "Established year is required",
  ESTABLISHED_YEAR_INVALID: "Invalid established year (1800 - current year)",
  ADMIN_NAME_REQUIRED: "Admin name is required",
  ADMIN_EMAIL_REQUIRED: "Admin email is required",
  ADMIN_EMAIL_INVALID: "Invalid admin email format",
  PASSWORD_REQUIRED: "Admin password is required",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
  PASSWORD_WEAK:
    "Password must contain uppercase, lowercase, number & special character (@$!%*?&)",
};

export default function CreateNewCollege() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;

  /* ================= FORM STATE ================= */
  const [formData, setFormData] = useState({
    collegeName: "",
    collegeCode: "",
    collegeEmail: "",
    contactNumber: "",
    address: "",
    establishedYear: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [touched, setTouched] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  /* ================= VALIDATION ================= */
  const validateField = useCallback((name, value) => {
    switch (name) {
      case "collegeName":
        if (!value.trim()) return MESSAGES.COLLEGE_NAME_REQUIRED;
        return "";
      case "collegeCode":
        if (!value.trim()) return MESSAGES.COLLEGE_CODE_REQUIRED;
        if (!VALIDATION.CODE_PATTERN.test(value.toUpperCase()))
          return MESSAGES.COLLEGE_CODE_INVALID;
        return "";
      case "collegeEmail":
        if (!value.trim()) return MESSAGES.COLLEGE_EMAIL_REQUIRED;
        if (!VALIDATION.EMAIL_PATTERN.test(value))
          return MESSAGES.COLLEGE_EMAIL_INVALID;
        return "";
      case "contactNumber":
        if (!value.trim()) return MESSAGES.PHONE_REQUIRED;
        if (!VALIDATION.PHONE_PATTERN.test(value))
          return MESSAGES.PHONE_INVALID;
        return "";
      case "address":
        if (!value.trim()) return MESSAGES.ADDRESS_REQUIRED;
        if (value.trim().length < VALIDATION.ADDRESS_MIN_LENGTH)
          return MESSAGES.ADDRESS_TOO_SHORT;
        return "";
      case "establishedYear":
        if (!value.trim()) return MESSAGES.ESTABLISHED_YEAR_REQUIRED;
        const year = Number(value);
        if (year < VALIDATION.MIN_YEAR || year > VALIDATION.MAX_YEAR)
          return MESSAGES.ESTABLISHED_YEAR_INVALID;
        return "";
      case "adminName":
        if (!value.trim()) return MESSAGES.ADMIN_NAME_REQUIRED;
        return "";
      case "adminEmail":
        if (!value.trim()) return MESSAGES.ADMIN_EMAIL_REQUIRED;
        if (!VALIDATION.EMAIL_PATTERN.test(value))
          return MESSAGES.ADMIN_EMAIL_INVALID;
        return "";
      case "adminPassword":
        if (!value.trim()) return MESSAGES.PASSWORD_REQUIRED;
        if (value.length < VALIDATION.PASSWORD_MIN_LENGTH)
          return MESSAGES.PASSWORD_TOO_SHORT;
        if (!VALIDATION.PASSWORD_PATTERN.test(value))
          return MESSAGES.PASSWORD_WEAK;
        return "";
      default:
        return "";
    }
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) errors[key] = error;
    });
    return errors;
  }, [formData, validateField]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (error) setError("");
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const getFieldError = (name) => {
    if (!touched[name]) return "";
    return validateField(name, formData[name]);
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setError(firstError);
      // Mark all fields as touched
      const allTouched = Object.keys(formData).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      setTouched(allTouched);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError("");
    setSuccess(null);
    setShowConfirm(false);

    try {
      const res = await api.post("/master/create/college", {
        ...formData,
        collegeCode: formData.collegeCode.toUpperCase(),
        establishedYear: Number(formData.establishedYear),
      });

      setSuccess(res.data);
      setFormData({
        collegeName: "",
        collegeCode: "",
        collegeEmail: "",
        contactNumber: "",
        address: "",
        establishedYear: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
      });
      setTouched({});

      toast.success("College created successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create college. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard!", {
        position: "top-right",
        autoClose: 2000,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error("Failed to copy", {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const handleResetForm = () => {
    setFormData({
      collegeName: "",
      collegeCode: "",
      collegeEmail: "",
      contactNumber: "",
      address: "",
      establishedYear: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    });
    setTouched({});
    setError("");
    setSuccess(null);
  };

  /* ================= PASSWORD STRENGTH ================= */
  const getPasswordStrength = () => {
    const password = formData.adminPassword;
    const checks = [
      { label: "8+ characters", met: password.length >= 8 },
      { label: "Uppercase letter", met: /[A-Z]/.test(password) },
      { label: "Lowercase letter", met: /[a-z]/.test(password) },
      { label: "Number", met: /\d/.test(password) },
      { label: "Special character", met: /[@$!%*?&]/.test(password) },
    ];
    const strength = checks.filter((c) => c.met).length;
    return { strength, checks };
  };

  const { strength, checks } = getPasswordStrength();

  const getStrengthColor = () => {
    if (strength <= 2) return "#dc3545";
    if (strength <= 4) return "#ffc107";
    return "#28a745";
  };

  const getStrengthLabel = () => {
    if (strength === 0) return "";
    if (strength <= 2) return "Weak";
    if (strength <= 4) return "Medium";
    return "Strong";
  };

  /* ================= LOADING STATE ================= */
  if (loading && !success) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Creating college...</h4>
        <div className="loading-progress">
          <div className="progress-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm College Creation"
        message={`Are you sure you want to create college "${formData.collegeName}" with code "${formData.collegeCode.toUpperCase()}"? This action will create a new administrator account.`}
        type="info"
        confirmText="Create College"
        cancelText="Cancel"
        isLoading={loading}
      />

      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/super-admin/dashboard" },
          { label: "Colleges", path: "/super-admin/colleges-list" },
          { label: "Create New College" },
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaUniversity />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Create New College</h1>
            <p className="erp-page-subtitle">
              Register a new educational institution and generate administrator
              credentials
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate("/super-admin/colleges-list")}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back to Colleges</span>
          </button>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="info-banner animate-fade-in">
        <div className="info-icon">
          <FaGraduationCap className="pulse" />
        </div>
        <div className="info-content">
          <strong>Important:</strong> This action will create a new college
          institution with a dedicated administrator account. Please ensure all
          information is accurate before submission. Admin credentials will be
          displayed after successful creation.
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="erp-alert erp-alert-danger animate-slide-in">
          <div className="erp-alert-icon">
            <FaExclamationTriangle className="shake" />
          </div>
          <div className="erp-alert-content">
            <strong>Validation Error:</strong> {error}
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
            <FaCheckCircle className="pulse" />
          </div>
          <div className="erp-alert-content">
            <strong>Success!</strong> {success.message}
            <div className="success-details">
              <div className="success-detail-row">
                <span>
                  <strong>College Name:</strong>{" "}
                  {success.college?.name || "N/A"}
                </span>
                <span>
                  <strong>College Code:</strong>{" "}
                  {success.college?.code || "N/A"}
                </span>
              </div>
              <div className="success-detail-row">
                <span>
                  <strong>Admin Email:</strong>{" "}
                  {success.collegeAdmin?.email || "N/A"}
                </span>
                <button
                  className="copy-btn"
                  onClick={() =>
                    handleCopyToClipboard(success.collegeAdmin?.email, "email")
                  }
                  aria-label="Copy email"
                >
                  {copiedField === "email" ? <FaCheck /> : <FaCopy />}
                </button>
              </div>
              <div className="success-detail-row">
                <span>
                  <strong>Admin Password:</strong>{" "}
                  <span className="password-mask">••••••••</span>
                </span>
                <button
                  className="copy-btn"
                  onClick={() =>
                    handleCopyToClipboard(
                      formData.adminPassword || "",
                      "password",
                    )
                  }
                  aria-label="Copy password"
                >
                  {copiedField === "password" ? <FaCheck /> : <FaCopy />}
                </button>
              </div>
              <div className="success-actions">
                <button
                  className="erp-btn erp-btn-primary"
                  onClick={() => navigate("/super-admin/colleges-list")}
                >
                  <FaCheckCircle className="erp-btn-icon" />
                  <span>Go to Colleges List</span>
                </button>
                <button
                  className="erp-btn erp-btn-secondary"
                  onClick={handleResetForm}
                >
                  <FaSyncAlt className="erp-btn-icon" />
                  <span>Create Another College</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="erp-form-card animate-fade-in">
        <div className="erp-form-header">
          <div className="erp-form-title">
            <FaRegBuilding className="erp-form-icon" />
            <h3>College Registration Form</h3>
          </div>
          <div className="erp-form-subtitle">
            Fill in all required fields marked with{" "}
            <span className="required">*</span>. All information is confidential
            and securely stored.
          </div>
        </div>

        <form onSubmit={handleSubmitClick} className="erp-form">
          {/* COLLEGE INFORMATION SECTION */}
          <div className="form-section">
            <h4 className="erp-section-title">
              <FaRegBuilding className="erp-section-icon" />
              College Information
            </h4>

            <div className="erp-row">
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaUniversity className="erp-label-icon" />
                    College Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="collegeName"
                    className={`erp-input ${getFieldError("collegeName") ? "erp-input-error" : ""}`}
                    value={formData.collegeName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter full college name"
                    autoComplete="off"
                  />
                  {getFieldError("collegeName") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("collegeName")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Official registered name of the institution
                  </div>
                </div>
              </div>

              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaGraduationCap className="erp-label-icon" />
                    College Code <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="collegeCode"
                    className={`erp-input ${getFieldError("collegeCode") ? "erp-input-error" : ""}`}
                    value={formData.collegeCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., ABC123"
                    autoComplete="off"
                    style={{ textTransform: "uppercase" }}
                  />
                  {getFieldError("collegeCode") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("collegeCode")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Unique identifier (3-10 alphanumeric characters)
                  </div>
                </div>
              </div>

              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaEnvelope className="erp-label-icon" />
                    College Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="collegeEmail"
                    className={`erp-input ${getFieldError("collegeEmail") ? "erp-input-error" : ""}`}
                    value={formData.collegeEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="admissions@college.edu"
                    autoComplete="off"
                  />
                  {getFieldError("collegeEmail") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("collegeEmail")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Official communication email address
                  </div>
                </div>
              </div>

              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaPhone className="erp-label-icon" />
                    Contact Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    className={`erp-input ${getFieldError("contactNumber") ? "erp-input-error" : ""}`}
                    value={formData.contactNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="+91 9876543210"
                    autoComplete="off"
                  />
                  {getFieldError("contactNumber") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("contactNumber")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Primary contact number with country code
                  </div>
                </div>
              </div>

              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaCalendarAlt className="erp-label-icon" />
                    Established Year <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    name="establishedYear"
                    className={`erp-input ${getFieldError("establishedYear") ? "erp-input-error" : ""}`}
                    value={formData.establishedYear}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={`e.g., ${new Date().getFullYear() - 50}`}
                    min={VALIDATION.MIN_YEAR}
                    max={VALIDATION.MAX_YEAR}
                    autoComplete="off"
                  />
                  {getFieldError("establishedYear") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("establishedYear")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Year the college was officially established
                  </div>
                </div>
              </div>

              <div className="erp-col-12">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaMapMarkerAlt className="erp-label-icon" />
                    Address <span className="required">*</span>
                  </label>
                  <textarea
                    name="address"
                    className={`erp-textarea ${getFieldError("address") ? "erp-input-error" : ""}`}
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Building, Street, Locality, City, State, PIN Code"
                    rows="3"
                    autoComplete="off"
                  />
                  {getFieldError("address") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("address")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Complete physical address of the college (min 20 characters)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ADMIN CREDENTIALS SECTION */}
          <div className="form-section">
            <h4 className="erp-section-title">
              <FaUserCog className="erp-section-icon" />
              College Admin Credentials
            </h4>
            <p className="section-description">
              Create the primary administrator account for this college.
              Credentials will be displayed after successful creation.
            </p>

            <div className="erp-row">
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaUserShield className="erp-label-icon" />
                    Admin Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminName"
                    className={`erp-input ${getFieldError("adminName") ? "erp-input-error" : ""}`}
                    value={formData.adminName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Full name of administrator"
                    autoComplete="off"
                  />
                  {getFieldError("adminName") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("adminName")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Full name of the college administrator
                  </div>
                </div>
              </div>

              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaEnvelope className="erp-label-icon" />
                    Admin Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    className={`erp-input ${getFieldError("adminEmail") ? "erp-input-error" : ""}`}
                    value={formData.adminEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="admin@college.edu"
                    autoComplete="off"
                  />
                  {getFieldError("adminEmail") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("adminEmail")}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Will be used for login and communications
                  </div>
                </div>
              </div>

              <div className="erp-col-12">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaLock className="erp-label-icon" />
                    Admin Password <span className="required">*</span>
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="adminPassword"
                      className={`erp-input ${getFieldError("adminPassword") ? "erp-input-error" : ""}`}
                      value={formData.adminPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Minimum 8 characters with uppercase, lowercase, number & special character"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {getFieldError("adminPassword") && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {getFieldError("adminPassword")}
                    </div>
                  )}

                  {/* Password Strength Meter */}
                  {formData.adminPassword && (
                    <div className="password-strength-meter">
                      <div className="strength-bar-container">
                        <div
                          className="strength-bar"
                          style={{
                            width: `${(strength / 5) * 100}%`,
                            background: getStrengthColor(),
                          }}
                        />
                      </div>
                      <div className="strength-info">
                        <span
                          className="strength-label"
                          style={{ color: getStrengthColor() }}
                        >
                          {getStrengthLabel()}
                        </span>
                        <span className="strength-text">{strength}/5</span>
                      </div>
                      <ul className="requirements-list">
                        {checks.map((check, idx) => (
                          <li key={idx} className={check.met ? "met" : ""}>
                            {check.met ? (
                              <FaCheck className="check-icon" />
                            ) : (
                              <FaTimes className="check-icon" />
                            )}
                            <span>{check.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Strong password required for security
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM ACTIONS */}
          <div className="erp-form-footer">
            <div className="erp-footer-left">
              <button
                type="button"
                className="erp-btn erp-btn-secondary erp-btn-lg"
                onClick={() => navigate("/super-admin/colleges-list")}
              >
                <FaArrowLeft className="erp-btn-icon" />
                <span>Cancel</span>
              </button>
            </div>
            <div className="erp-footer-right">
              <button
                type="submit"
                className="erp-btn erp-btn-primary erp-btn-lg erp-btn-shadow pulse-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSyncAlt className="erp-btn-icon spin" />
                    <span>Creating College...</span>
                  </>
                ) : (
                  <>
                    <FaUniversity className="erp-btn-icon" />
                    <span>Create College</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* STYLES */}
      <style>{`
        /* ================= CONTAINER ================= */
        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }

        /* ================= PAGE HEADER ================= */
        .erp-page-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.3);
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
          background: rgba(61, 181, 230, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          color: #3db5e6;
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
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .erp-header-actions .erp-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        /* ================= INFO BANNER ================= */
        .info-banner {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-left: 4px solid #2196F3;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
        }

        .info-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(33, 150, 243, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2196F3;
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
          font-size: 0.95rem;
          color: #0d47a1;
          line-height: 1.5;
        }

        .info-content strong {
          font-weight: 600;
        }

        /* ================= ALERTS ================= */
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
          flex-shrink: 0;
        }

        .erp-alert-content {
          flex: 1;
          line-height: 1.6;
        }

        .success-details {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(76, 175, 80, 0.3);
          font-size: 0.95rem;
        }

        .success-detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0;
          gap: 1rem;
        }

        .success-detail-row:not(:last-child) {
          border-bottom: 1px solid rgba(76, 175, 80, 0.15);
        }

        .copy-btn {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          color: #4CAF50;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .copy-btn:hover {
          background: rgba(76, 175, 80, 0.2);
          border-color: #4CAF50;
          transform: scale(1.05);
        }

        .success-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(76, 175, 80, 0.3);
        }

        .password-mask {
          letter-spacing: 2px;
          font-size: 1.1em;
          font-family: monospace;
        }

        .erp-alert-close {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          color: inherit;
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
        }

        /* ================= FORM CARD ================= */
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
          color: #0f3a4a;
          font-size: 1.5rem;
        }

        .erp-form-title h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f3a4a;
        }

        .erp-form-subtitle {
          font-size: 0.9rem;
          color: #666;
        }

        .erp-form {
          padding: 0 2rem 2rem;
        }

        .form-section {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f0f2f5;
        }

        .form-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .erp-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f3a4a;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f2f5;
        }

        .erp-section-icon {
          color: #0f3a4a;
        }

        .section-description {
          color: #666;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .erp-row {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 1.5rem;
        }

        .erp-col-12 { grid-column: span 12; }
        .erp-col-6 { grid-column: span 6; }

        @media (max-width: 768px) {
          .erp-col-12,
          .erp-col-6 {
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
          color: #0f3a4a;
          font-size: 1rem;
        }

        .required {
          color: #F44336;
          margin-left: 0.25rem;
        }

        .erp-input,
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

        .erp-input:focus,
        .erp-textarea:focus {
          border-color: #0f3a4a;
          box-shadow: 0 0 0 0.2rem rgba(15, 58, 74, 0.15);
          transform: translateY(-1px);
        }

        .erp-input-error {
          border-color: #F44336 !important;
          background: rgba(244, 67, 54, 0.05);
        }

        .erp-textarea {
          min-height: 100px;
          resize: vertical;
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
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #666;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #0f3a4a;
        }

        .erp-hint-icon {
          font-size: 0.875rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }

        /* ================= PASSWORD FIELD ================= */
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
          z-index: 10;
        }

        .toggle-password:hover {
          color: #0f3a4a;
        }

        /* ================= PASSWORD STRENGTH METER ================= */
        .password-strength-meter {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 10px;
          border: 1px solid #e9ecef;
        }

        .strength-bar-container {
          width: 100%;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }

        .strength-bar {
          height: 100%;
          transition: width 0.3s ease, background 0.3s ease;
          border-radius: 3px;
        }

        .strength-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .strength-label {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .strength-text {
          font-size: 0.875rem;
          color: #666;
        }

        .requirements-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.5rem;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .requirements-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          padding: 0.375rem 0.5rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .requirements-list li.met {
          color: #28a745;
          background: rgba(40, 167, 69, 0.05);
        }

        .requirements-list li:not(.met) {
          color: #6c757d;
        }

        .check-icon {
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        /* ================= FORM FOOTER ================= */
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
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          color: white;
        }

        .erp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 58, 74, 0.4);
        }

        .erp-btn-secondary {
          background: white;
          color: #0f3a4a;
          border: 2px solid #e9ecef;
        }

        .erp-btn-secondary:hover {
          border-color: #0f3a4a;
          background: #f8f9fa;
          transform: translateY(-2px);
        }

        .erp-btn-lg {
          padding: 1rem 2rem;
          font-size: 1.05rem;
        }

        .erp-btn-shadow {
          box-shadow: 0 4px 16px rgba(15, 58, 74, 0.3);
        }

        .erp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* ================= LOADING CONTAINER ================= */
        .erp-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 2rem;
          position: relative;
        }

        .erp-loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: #0f3a4a;
          animation: spin 1s linear infinite;
        }

        .spinner-ring:nth-child(2) {
          border-top-color: #0c2d3a;
          animation-delay: 0.1s;
        }

        .spinner-ring:nth-child(3) {
          border-top-color: rgba(15, 58, 74, 0.5);
          animation-delay: 0.2s;
        }

        .erp-loading-text {
          font-size: 1.35rem;
          font-weight: 600;
          color: #0f3a4a;
        }

        .loading-progress {
          width: 250px;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-top: -1rem;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #0f3a4a 0%, #0c2d3a 100%);
          width: 35%;
          animation: progressPulse 1.8s ease-in-out infinite;
        }

        /* ================= ANIMATIONS ================= */
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

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes blink-pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(15, 58, 74, 0.5);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 15px 5px rgba(15, 58, 74, 0.7);
          }
        }

        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        .blink-pulse {
          animation: blink-pulse 2s ease-in-out infinite;
        }

        .pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }

        .shake {
          animation: shake 0.5s ease-in-out;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .pulse-btn {
          animation: pulse 2s infinite;
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }

        .animate-slide-in {
          animation: slideIn 0.5s ease;
        }

        /* ================= RESPONSIVE DESIGN ================= */
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

          .info-banner {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .success-actions {
            flex-direction: column;
          }

          .success-detail-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .copy-btn {
            align-self: flex-end;
          }
        }

        @media (max-width: 480px) {
          .erp-page-title {
            font-size: 1.5rem;
          }

          .erp-section-title {
            font-size: 1.15rem;
          }

          .erp-label {
            font-size: 0.9rem;
          }

          .erp-input,
          .erp-textarea {
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
          }

          .erp-btn-lg {
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
          }

          .erp-form-title h3 {
            font-size: 1.35rem;
          }

          .requirements-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
