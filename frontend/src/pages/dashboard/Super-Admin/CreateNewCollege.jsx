import { useContext, useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import ConfirmModal from "../../../components/ConfirmModal";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";

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
  FaImage,
  FaUpload,
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
  LOGO_MAX_SIZE: 5 * 1024 * 1024,
  LOGO_ALLOWED_TYPES: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  COLLEGE_NAME_PATTERN: /^[a-zA-Z0-9\s\-.,&()'/]+$/,
};

const MESSAGES = {
  COLLEGE_NAME_REQUIRED: "College name is required",
  COLLEGE_NAME_INVALID: "College name contains invalid characters. Only letters, numbers, spaces, and basic punctuation (-.,&'/) are allowed.",
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
  LOGO_INVALID_TYPE: "Only PNG, JPG, JPEG, and WEBP formats are allowed",
  LOGO_TOO_LARGE: "Logo file size must be less than 5MB",
};

export default function CreateNewCollege() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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
    logo: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [touched, setTouched] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [logoError, setLogoError] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);

  /* ================= SECURITY ================= */
  const isAuthorized = user && user.role === "SUPER_ADMIN";
  const needsLogin = !user;

  /* ================= VALIDATION ================= */
  const validateField = useCallback((name, value) => {
    switch (name) {
      case "collegeName":
        if (!value.trim()) return MESSAGES.COLLEGE_NAME_REQUIRED;
        if (!VALIDATION.COLLEGE_NAME_PATTERN.test(value))
          return MESSAGES.COLLEGE_NAME_INVALID;
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
      case "establishedYear": {
        if (!value.trim()) return MESSAGES.ESTABLISHED_YEAR_REQUIRED;
        const year = Number(value);
        if (year < VALIDATION.MIN_YEAR || year > VALIDATION.MAX_YEAR)
          return MESSAGES.ESTABLISHED_YEAR_INVALID;
        return "";
      }
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

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    setLogoError("");
    setLogoPreview(null);

    if (!file) {
      setFormData((prev) => ({ ...prev, logo: null }));
      return;
    }

    if (!VALIDATION.LOGO_ALLOWED_TYPES.includes(file.type)) {
      setLogoError(MESSAGES.LOGO_INVALID_TYPE);
      setFormData((prev) => ({ ...prev, logo: null }));
      return;
    }

    if (file.size > VALIDATION.LOGO_MAX_SIZE) {
      setLogoError(MESSAGES.LOGO_TOO_LARGE);
      setFormData((prev) => ({ ...prev, logo: null }));
      return;
    }

    setFormData((prev) => ({ ...prev, logo: file }));
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logo: null }));
    setLogoPreview(null);
    setLogoError("");
  };

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

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
      const payload = new FormData();
      payload.append("collegeName", formData.collegeName);
      payload.append("collegeCode", formData.collegeCode.toUpperCase());
      payload.append("collegeEmail", formData.collegeEmail);
      payload.append("contactNumber", formData.contactNumber);
      payload.append("address", formData.address);
      payload.append("establishedYear", formData.establishedYear);
      payload.append("adminName", formData.adminName);
      payload.append("adminEmail", formData.adminEmail);
      payload.append("adminPassword", formData.adminPassword);
      if (formData.logo) {
        payload.append("logo", formData.logo);
      }

      const res = await api.post("/master/create/college", payload);

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
        logo: null,
      });
      setTouched({});
      setLogoPreview(null);
      setLogoError("");

      toast.success("College created successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to create college. Please try again.";

      logger.error("Error creating college:", statusCode, errorCode);

      setError(errorMessage);

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage);
      }
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
    } catch {
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
      logo: null,
    });
    setTouched({});
    setError("");
    setSuccess(null);
    setLogoPreview(null);
    setLogoError("");
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
  if (needsLogin) {
    return <Navigate to="/login" />;
  }
  if (!isAuthorized) {
    return <Navigate to="/super-admin/dashboard" />;
  }
  if (loading && !success) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading
            size="md"
            color="primary"
            text="Creating college..."
          />
        </div>
      </div>
    );
  }


  return (
    <div className="erp-container" style={{ paddingTop: "0.5rem" }}>
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

      {/* FORM SECTIONS */}
      <div className="cnc-section-card animate-fade-in">
        <div className="cnc-section-header">
          <div className="cnc-section-icon-wrapper">
            <FaRegBuilding className="cnc-section-icon" />
          </div>
          <div className="cnc-section-text">
            <h2 className="cnc-section-title">College Information</h2>
            <p className="cnc-section-subtitle">Enter the institution's official details</p>
          </div>
        </div>
        <div className="cnc-section-body">
          <form onSubmit={handleSubmitClick} className="cnc-form">
            <div className="cnc-row">
              <div className="cnc-col cnc-col-6">
                <div className="cnc-form-group">
                  <label className="cnc-label">
                    <FaUniversity className="cnc-label-icon" />
                    College Name <span className="cnc-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="collegeName"
                    className={`cnc-input ${getFieldError("collegeName") ? "cnc-input-error" : ""}`}
                    value={formData.collegeName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter full college name"
                    autoComplete="off"
                  />
                  {getFieldError("collegeName") && (
                    <div className="cnc-error-text">
                      <FaExclamationTriangle className="cnc-error-icon" />
                      {getFieldError("collegeName")}
                    </div>
                  )}
                  <div className="cnc-hint-text">
                    <FaInfoCircle className="cnc-hint-icon" />
                    Official registered name of the institution
                  </div>
                </div>
              </div>

              <div className="cnc-col cnc-col-6">
                <div className="cnc-form-group">
                  <label className="cnc-label">
                    <FaGraduationCap className="cnc-label-icon" />
                    College Code <span className="cnc-required">*</span>
                  </label>
                  <input
                    type="text"
                    name="collegeCode"
                    className={`cnc-input ${getFieldError("collegeCode") ? "cnc-input-error" : ""}`}
                    value={formData.collegeCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., ABC123"
                    autoComplete="off"
                    style={{ textTransform: "uppercase" }}
                  />
                  {getFieldError("collegeCode") && (
                    <div className="cnc-error-text">
                      <FaExclamationTriangle className="cnc-error-icon" />
                      {getFieldError("collegeCode")}
                    </div>
                  )}
                  <div className="cnc-hint-text">
                    <FaInfoCircle className="cnc-hint-icon" />
                    Unique identifier (3-10 alphanumeric characters)
                  </div>
                </div>
              </div>

              <div className="cnc-col cnc-col-6">
                <div className="cnc-form-group">
                  <label className="cnc-label">
                    <FaEnvelope className="cnc-label-icon" />
                    College Email <span className="cnc-required">*</span>
                  </label>
                  <input
                    type="email"
                    name="collegeEmail"
                    className={`cnc-input ${getFieldError("collegeEmail") ? "cnc-input-error" : ""}`}
                    value={formData.collegeEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="admissions@college.edu"
                    autoComplete="off"
                  />
                  {getFieldError("collegeEmail") && (
                    <div className="cnc-error-text">
                      <FaExclamationTriangle className="cnc-error-icon" />
                      {getFieldError("collegeEmail")}
                    </div>
                  )}
                  <div className="cnc-hint-text">
                    <FaInfoCircle className="cnc-hint-icon" />
                    Official communication email address
                  </div>
                </div>
              </div>

              <div className="cnc-col cnc-col-6">
                <div className="cnc-form-group">
                  <label className="cnc-label">
                    <FaPhone className="cnc-label-icon" />
                    Contact Number <span className="cnc-required">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    className={`cnc-input ${getFieldError("contactNumber") ? "cnc-input-error" : ""}`}
                    value={formData.contactNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="+91 9876543210"
                    autoComplete="off"
                  />
                  {getFieldError("contactNumber") && (
                    <div className="cnc-error-text">
                      <FaExclamationTriangle className="cnc-error-icon" />
                      {getFieldError("contactNumber")}
                    </div>
                  )}
                  <div className="cnc-hint-text">
                    <FaInfoCircle className="cnc-hint-icon" />
                    Primary contact number with country code
                  </div>
                </div>
              </div>

              <div className="cnc-col cnc-col-4">
                <div className="cnc-form-group">
                  <label className="cnc-label">
                    <FaCalendarAlt className="cnc-label-icon" />
                    Established Year <span className="cnc-required">*</span>
                  </label>
                  <input
                    type="number"
                    name="establishedYear"
                    className={`cnc-input ${getFieldError("establishedYear") ? "cnc-input-error" : ""}`}
                    value={formData.establishedYear}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={`e.g., ${new Date().getFullYear() - 50}`}
                    min={VALIDATION.MIN_YEAR}
                    max={VALIDATION.MAX_YEAR}
                    autoComplete="off"
                  />
                  {getFieldError("establishedYear") && (
                    <div className="cnc-error-text">
                      <FaExclamationTriangle className="cnc-error-icon" />
                      {getFieldError("establishedYear")}
                    </div>
                  )}
                  <div className="cnc-hint-text">
                    <FaInfoCircle className="cnc-hint-icon" />
                    Year the college was officially established
                  </div>
                </div>
              </div>

              <div className="cnc-col cnc-col-12">
                <div className="cnc-form-group">
                  <label className="cnc-label">
                    <FaMapMarkerAlt className="cnc-label-icon" />
                    Address <span className="cnc-required">*</span>
                  </label>
                  <textarea
                    name="address"
                    className={`cnc-textarea ${getFieldError("address") ? "cnc-input-error" : ""}`}
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Building, Street, Locality, City, State, PIN Code"
                    rows="3"
                    autoComplete="off"
                  />
                  {getFieldError("address") && (
                    <div className="cnc-error-text">
                      <FaExclamationTriangle className="cnc-error-icon" />
                      {getFieldError("address")}
                    </div>
                  )}
                  <div className="cnc-hint-text">
                    <FaInfoCircle className="cnc-hint-icon" />
                    Complete physical address of the college (min 20 characters)
                  </div>
                </div>
              </div>

              {/* COLLEGE LOGO UPLOAD */}
              <div className="cnc-col cnc-col-12">
                <div className="cnc-form-group">
                  <label className="cnc-label">
                    <FaImage className="cnc-label-icon" />
                    College Logo
                  </label>
                  <div className="cnc-logo-upload-area">
                    {logoPreview ? (
                      <div className="cnc-logo-preview-container">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="cnc-logo-preview-img"
                        />
                        <button
                          type="button"
                          className="cnc-logo-remove-btn"
                          onClick={removeLogo}
                          aria-label="Remove logo"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className="cnc-logo-upload-placeholder">
                        <FaUpload className="cnc-logo-upload-icon" />
                        <span>Click to upload or drag and drop</span>
                        <span className="cnc-logo-upload-hint">
                          PNG, JPG, JPEG, WEBP (max 5MB)
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      className="cnc-logo-file-input"
                      onChange={handleLogoChange}
                      aria-label="Upload college logo"
                    />
                  </div>
                  {logoError && (
                    <div className="cnc-error-text">
                      <FaExclamationTriangle className="cnc-error-icon" />
                      {logoError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ADMIN CREDENTIALS SECTION */}
      <div className="cnc-section-card animate-fade-in">
        <div className="cnc-section-header">
          <div className="cnc-section-icon-wrapper">
            <FaUserCog className="cnc-section-icon" />
          </div>
          <div className="cnc-section-text">
            <h2 className="cnc-section-title">College Admin Credentials</h2>
            <p className="cnc-section-subtitle">Create the primary administrator account for this college</p>
          </div>
        </div>
        <div className="cnc-section-body">
          <div className="cnc-row">
            <div className="cnc-col cnc-col-6">
              <div className="cnc-form-group">
                <label className="cnc-label">
                  <FaUserShield className="cnc-label-icon" />
                  Admin Name <span className="cnc-required">*</span>
                </label>
                <input
                  type="text"
                  name="adminName"
                  className={`cnc-input ${getFieldError("adminName") ? "cnc-input-error" : ""}`}
                  value={formData.adminName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Full name of administrator"
                  autoComplete="off"
                />
                {getFieldError("adminName") && (
                  <div className="cnc-error-text">
                    <FaExclamationTriangle className="cnc-error-icon" />
                    {getFieldError("adminName")}
                  </div>
                )}
                <div className="cnc-hint-text">
                  <FaInfoCircle className="cnc-hint-icon" />
                  Full name of the college administrator
                </div>
              </div>
            </div>

            <div className="cnc-col cnc-col-6">
              <div className="cnc-form-group">
                <label className="cnc-label">
                  <FaEnvelope className="cnc-label-icon" />
                  Admin Email <span className="cnc-required">*</span>
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  className={`cnc-input ${getFieldError("adminEmail") ? "cnc-input-error" : ""}`}
                  value={formData.adminEmail}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="admin@college.edu"
                  autoComplete="off"
                />
                {getFieldError("adminEmail") && (
                  <div className="cnc-error-text">
                    <FaExclamationTriangle className="cnc-error-icon" />
                    {getFieldError("adminEmail")}
                  </div>
                )}
                <div className="cnc-hint-text">
                  <FaInfoCircle className="cnc-hint-icon" />
                  Will be used for login and communications
                </div>
              </div>
            </div>

            <div className="cnc-col cnc-col-12">
              <div className="cnc-form-group">
                <label className="cnc-label">
                  <FaLock className="cnc-label-icon" />
                  Admin Password <span className="cnc-required">*</span>
                </label>
                <div className="cnc-password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="adminPassword"
                    className={`cnc-input ${getFieldError("adminPassword") ? "cnc-input-error" : ""}`}
                    value={formData.adminPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Minimum 8 characters with uppercase, lowercase, number & special character"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cnc-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {getFieldError("adminPassword") && (
                  <div className="cnc-error-text">
                    <FaExclamationTriangle className="cnc-error-icon" />
                    {getFieldError("adminPassword")}
                  </div>
                )}

                {/* Password Strength Meter */}
                {formData.adminPassword && (
                  <div className="cnc-password-strength-meter">
                    <div className="cnc-strength-bar-container">
                      <div
                        className="cnc-strength-bar"
                        style={{
                          width: `${(strength / 5) * 100}%`,
                          background: getStrengthColor(),
                        }}
                      />
                    </div>
                    <div className="cnc-strength-info">
                      <span
                        className="cnc-strength-label"
                        style={{ color: getStrengthColor() }}
                      >
                        {getStrengthLabel()}
                      </span>
                      <span className="cnc-strength-text">{strength}/5</span>
                    </div>
                    <ul className="cnc-requirements-list">
                      {checks.map((check, idx) => (
                        <li key={idx} className={check.met ? "cnc-met" : ""}>
                          {check.met ? (
                            <FaCheck className="cnc-check-icon" />
                          ) : (
                            <FaTimes className="cnc-check-icon" />
                          )}
                          <span>{check.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="cnc-hint-text">
                  <FaInfoCircle className="cnc-hint-icon" />
                  Strong password required for security
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FORM ACTIONS */}
      <div className="cnc-form-footer animate-fade-in">
        <div className="cnc-footer-left">
          <button
            type="button"
            className="cnc-btn cnc-btn-secondary"
            onClick={() => navigate("/super-admin/colleges-list")}
          >
            <FaArrowLeft className="cnc-btn-icon" />
            <span>Cancel</span>
          </button>
        </div>
        <div className="cnc-footer-right">
          <button
            type="button"
            className="cnc-btn cnc-btn-primary cnc-btn-shadow"
            onClick={handleSubmitClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSyncAlt className="cnc-btn-icon cnc-spin" />
                <span>Creating College...</span>
              </>
            ) : (
              <>
                <FaUniversity className="cnc-btn-icon" />
                <span>Create College</span>
              </>
            )}
          </button>
        </div>
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
          opacity: 0.6;
          transition: opacity 0.2s ease;
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
        }

        .erp-alert-close:hover {
          opacity: 1;
        }

        /* ================= SECTION CARDS (NOVAA ERP) ================= */
        .cnc-section-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(14, 55, 70, 0.06);
          border: 1px solid #DCE6EF;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .cnc-section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: #F0F7FA;
          border-bottom: 1px solid #DCE6EF;
        }

        .cnc-section-icon-wrapper {
          width: 44px;
          height: 44px;
          background: #E8F4FA;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cnc-section-icon {
          font-size: 1.25rem;
          color: #164E63;
        }

        .cnc-section-text {
          flex: 1;
          min-width: 0;
        }

        .cnc-section-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #0E3746;
          line-height: 1.3;
        }

        .cnc-section-subtitle {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          color: #64748B;
          line-height: 1.4;
        }

        .cnc-section-body {
          padding: 1.5rem;
        }

        /* ================= FORM GRID ================= */
        .cnc-row {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 1.25rem;
        }

        .cnc-col-12 { grid-column: span 12; }
        .cnc-col-6 { grid-column: span 6; }
        .cnc-col-4 { grid-column: span 4; }

        @media (max-width: 768px) {
          .cnc-col-12,
          .cnc-col-6,
          .cnc-col-4 {
            grid-column: span 12;
          }
        }

        /* ================= FORM GROUPS ================= */
        .cnc-form-group {
          margin-bottom: 1.25rem;
        }

        .cnc-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #142235;
          font-size: 0.9rem;
          margin-bottom: 0.625rem;
        }

        .cnc-label-icon {
          color: #164E63;
          font-size: 0.95rem;
        }

        .cnc-required {
          color: #dc3545;
          margin-left: 0.125rem;
        }

        .cnc-input,
        .cnc-textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #DCE6EF;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 500;
          color: #142235;
          background: #fff;
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
          min-height: 44px;
        }

        .cnc-input:focus,
        .cnc-textarea:focus {
          border-color: #103B4A;
          box-shadow: 0 0 0 3px rgba(16, 59, 74, 0.12);
        }

        .cnc-input-error {
          border-color: #dc3545 !important;
          background: rgba(220, 53, 69, 0.04);
        }

        .cnc-textarea {
          min-height: 100px;
          resize: vertical;
          font-family: inherit;
        }

        .cnc-error-text {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #dc3545;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(220, 53, 69, 0.06);
          border-radius: 6px;
        }

        .cnc-error-icon {
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .cnc-hint-text {
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #64748B;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #F8FAFC;
          border-radius: 6px;
          border-left: 3px solid #22B8E6;
        }

        .cnc-hint-icon {
          font-size: 0.75rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }

        /* ================= PASSWORD FIELD ================= */
        .cnc-password-wrapper {
          position: relative;
        }

        .cnc-toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748B;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
          z-index: 10;
        }

        .cnc-toggle-password:hover {
          color: #103B4A;
        }

        /* ================= PASSWORD STRENGTH METER ================= */
        .cnc-password-strength-meter {
          margin-top: 1rem;
          padding: 1rem;
          background: #F8FAFC;
          border-radius: 10px;
          border: 1px solid #DCE6EF;
        }

        .cnc-strength-bar-container {
          width: 100%;
          height: 6px;
          background: #DCE6EF;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }

        .cnc-strength-bar {
          height: 100%;
          transition: width 0.3s ease, background 0.3s ease;
          border-radius: 3px;
        }

        .cnc-strength-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .cnc-strength-label {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .cnc-strength-text {
          font-size: 0.85rem;
          color: #64748B;
        }

        .cnc-requirements-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.5rem;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .cnc-requirements-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          padding: 0.375rem 0.5rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .cnc-requirements-list li.cnc-met {
          color: #28a745;
          background: rgba(40, 167, 69, 0.06);
        }

        .cnc-requirements-list li:not(.cnc-met) {
          color: #64748B;
        }

        .cnc-check-icon {
          font-size: 0.7rem;
          flex-shrink: 0;
        }

        /* ================= LOGO UPLOAD ================= */
        .cnc-logo-upload-area {
          position: relative;
          border: 2px dashed #DCE6EF;
          border-radius: 12px;
          padding: 1.5rem;
          background: #F8FAFC;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .cnc-logo-upload-area:hover {
          border-color: #103B4A;
          background: rgba(16, 59, 74, 0.02);
        }

        .cnc-logo-file-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .cnc-logo-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.625rem;
          padding: 1rem;
          pointer-events: none;
          text-align: center;
        }

        .cnc-logo-upload-icon {
          font-size: 1.75rem;
          color: #103B4A;
          opacity: 0.5;
        }

        .cnc-logo-upload-placeholder span:first-of-type {
          font-size: 0.9rem;
          color: #475569;
        }

        .cnc-logo-upload-hint {
          font-size: 0.75rem !important;
          color: #94A3B8 !important;
        }

        .cnc-logo-preview-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 0.5rem;
        }

        .cnc-logo-preview-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 10px;
          border: 2px solid #DCE6EF;
        }

        .cnc-logo-remove-btn {
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          color: #dc3545;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .cnc-logo-remove-btn:hover {
          background: rgba(220, 53, 69, 0.2);
          border-color: #dc3545;
          transform: scale(1.1);
        }

        /* ================= FORM FOOTER ================= */
        .cnc-form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: #F8FAFC;
          border-top: 1px solid #DCE6EF;
          margin-top: 1.5rem;
        }

        .cnc-footer-left,
        .cnc-footer-right {
          display: flex;
          gap: 0.75rem;
        }

        .cnc-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0 1.5rem;
          height: 50px;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
          text-decoration: none;
        }

        .cnc-btn-icon {
          font-size: 1rem;
        }

        .cnc-btn-primary {
          background: #0E3746;
          color: #fff;
          box-shadow: 0 2px 8px rgba(14, 55, 70, 0.2);
        }

        .cnc-btn-primary:hover:not(:disabled) {
          background: #164E63;
        }

        .cnc-btn-secondary {
          background: #fff;
          color: #0E3746;
          border: 1px solid #DCE6EF;
        }

        .cnc-btn-secondary:hover:not(:disabled) {
          background: #F0F8FA;
          border-color: #0E3746;
        }

        .cnc-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cnc-btn-shadow {
          box-shadow: 0 4px 16px rgba(14, 55, 70, 0.25);
        }

        .cnc-spin {
          animation: spin 1s linear infinite;
        }

        /* ================= ANIMATIONS ================= */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
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
          animation: fadeIn 0.5s ease;
        }

        .animate-slide-in {
          animation: slideIn 0.4s ease;
        }

        /* =========================================================
           RESPONSIVE DESIGN - CNC SECTION CARDS
           ========================================================= */

        /* TABLET: 769px - 991px */
        @media (min-width: 769px) and (max-width: 991.98px) {
          .cnc-section-header {
            padding: 1.1rem 1.25rem;
          }

          .cnc-section-icon-wrapper {
            width: 40px;
            height: 40px;
          }

          .cnc-section-icon {
            font-size: 1.1rem;
          }

          .cnc-section-title {
            font-size: 1.05rem;
          }

          .cnc-section-subtitle {
            font-size: 0.8rem;
          }

          .cnc-section-body {
            padding: 1.25rem;
          }

          .cnc-row {
            gap: 1rem;
          }

          .cnc-form-group {
            margin-bottom: 1.1rem;
          }

          .cnc-label {
            font-size: 0.85rem;
            margin-bottom: 0.55rem;
          }

          .cnc-input,
          .cnc-textarea {
            font-size: 0.9rem;
            padding: 0.7rem 0.9rem;
            min-height: 42px;
          }

          .cnc-error-text,
          .cnc-hint-text {
            font-size: 0.75rem;
            padding: 0.45rem 0.65rem;
          }

          .cnc-password-strength-meter {
            padding: 0.9rem;
          }

          .cnc-strength-label,
          .cnc-strength-text {
            font-size: 0.8rem;
          }

          .cnc-requirements-list li {
            font-size: 0.75rem;
          }

          .cnc-logo-upload-area {
            padding: 1.15rem;
          }

          .cnc-logo-preview-img {
            width: 70px;
            height: 70px;
          }

          .cnc-form-footer {
            padding: 1.25rem;
            gap: 1rem;
          }

          .cnc-btn {
            padding: 0.8rem 1.25rem;
            font-size: 0.9rem;
          }
        }

        /* MOBILE: 0px - 768px */
        @media (max-width: 768px) {
          .cnc-section-card {
            border-radius: 14px;
            margin-bottom: 1rem;
          }

          .cnc-section-header {
            padding: 0.9rem 1rem;
            flex-wrap: wrap;
            gap: 0.75rem;
          }

          .cnc-section-icon-wrapper {
            width: 36px;
            height: 36px;
            min-width: 36px;
            border-radius: 8px;
          }

          .cnc-section-icon {
            font-size: 1rem;
          }

          .cnc-section-text {
            min-width: 0;
            flex: 1;
          }

          .cnc-section-title {
            font-size: 1rem;
            line-height: 1.3;
          }

          .cnc-section-subtitle {
            font-size: 0.75rem;
            line-height: 1.4;
            margin-top: 0.15rem;
          }

          .cnc-section-body {
            padding: 1rem;
          }

          .cnc-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0;
          }

          .cnc-col-6,
          .cnc-col-4,
          .cnc-col-12 {
            grid-column: span 12;
          }

          .cnc-form-group {
            margin-bottom: 0.875rem;
          }

          .cnc-label {
            gap: 0.4rem;
            font-size: 0.78rem;
            margin-bottom: 0.45rem;
          }

          .cnc-label-icon {
            font-size: 0.8rem;
          }

          .cnc-input,
          .cnc-textarea {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            padding: 0.65rem 0.8rem;
            font-size: 0.82rem;
            border-radius: 9px;
            min-height: 42px;
          }

          .cnc-textarea {
            min-height: 85px;
          }

          .cnc-input:focus,
          .cnc-textarea:focus {
            transform: none;
          }

          .cnc-hint-text,
          .cnc-error-text {
            gap: 0.35rem;
            padding: 0.4rem 0.55rem;
            margin-top: 0.35rem;
            font-size: 0.66rem;
            line-height: 1.35;
          }

          .cnc-hint-icon,
          .cnc-error-icon {
            font-size: 0.65rem;
          }

          .cnc-password-wrapper .cnc-input {
            padding-right: 2.6rem;
          }

          .cnc-toggle-password {
            right: 10px;
            width: 26px;
            height: 26px;
            font-size: 0.9rem;
          }

          .cnc-password-strength-meter {
            margin-top: 0.7rem;
            padding: 0.7rem;
          }

          .cnc-strength-info {
            margin-bottom: 0.6rem;
          }

          .cnc-strength-label,
          .cnc-strength-text {
            font-size: 0.7rem;
          }

          .cnc-requirements-list {
            grid-template-columns: 1fr;
            gap: 0.25rem;
          }

          .cnc-requirements-list li {
            font-size: 0.66rem;
            padding: 0.25rem 0.35rem;
          }

          .cnc-check-icon {
            font-size: 0.6rem;
          }

          .cnc-logo-upload-area {
            padding: 0.75rem;
            border-radius: 10px;
          }

          .cnc-logo-upload-placeholder {
            padding: 0.55rem 0.35rem;
          }

          .cnc-logo-upload-icon {
            font-size: 1.4rem;
          }

          .cnc-logo-upload-placeholder span:first-of-type {
            font-size: 0.7rem;
            line-height: 1.35;
          }

          .cnc-logo-upload-hint {
            font-size: 0.62rem !important;
          }

          .cnc-logo-preview-img {
            width: 56px;
            height: 56px;
          }

          .cnc-logo-remove-btn {
            width: 28px;
            height: 28px;
          }

          .cnc-form-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding: 0.875rem;
            margin-top: 1rem;
          }

          .cnc-footer-left,
          .cnc-footer-right {
            width: 100%;
            display: flex;
          }

          .cnc-btn {
            width: 100%;
            min-height: 44px;
            justify-content: center;
            padding: 0.65rem 0.875rem;
            font-size: 0.8rem;
          }
        }

        /* SMALL MOBILE: 0px - 480px */
        @media (max-width: 480px) {
          .cnc-section-header {
            padding: 0.75rem 0.85rem;
          }

          .cnc-section-icon-wrapper {
            width: 32px;
            height: 32px;
          }

          .cnc-section-icon {
            font-size: 0.9rem;
          }

          .cnc-section-title {
            font-size: 0.9rem;
          }

          .cnc-section-subtitle {
            font-size: 0.68rem;
          }

          .cnc-section-body {
            padding: 0.85rem;
          }

          .cnc-label {
            font-size: 0.72rem;
          }

          .cnc-input,
          .cnc-textarea {
            font-size: 0.76rem;
            padding: 0.6rem 0.7rem;
            min-height: 40px;
          }

          .cnc-textarea {
            min-height: 80px;
          }

          .cnc-hint-text,
          .cnc-error-text {
            font-size: 0.62rem;
          }

          .cnc-btn {
            min-height: 40px;
            padding: 0.55rem 0.75rem;
            font-size: 0.74rem;
          }

          .cnc-logo-upload-area {
            padding: 0.6rem;
          }

          .cnc-logo-upload-icon {
            font-size: 1.25rem;
          }

          .cnc-logo-upload-placeholder span:first-of-type {
            font-size: 0.64rem;
          }

          .cnc-logo-preview-img {
            width: 48px;
            height: 48px;
          }
        }
      `}</style>
    </div>
  );
}