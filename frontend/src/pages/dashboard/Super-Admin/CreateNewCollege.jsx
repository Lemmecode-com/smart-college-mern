import { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

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
  FaGraduationCap
} from "react-icons/fa";

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
  const [formTouched, setFormTouched] = useState(false);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const errors = [];
    
    if (!formData.collegeName.trim()) errors.push("College name is required");
    if (!formData.collegeCode.trim()) errors.push("College code is required");
    if (!formData.collegeEmail.trim()) {
      errors.push("College email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.collegeEmail)) {
      errors.push("Invalid college email format");
    }
    if (!formData.contactNumber.trim()) errors.push("Contact number is required");
    if (!formData.address.trim()) errors.push("Address is required");
    if (!formData.establishedYear.trim()) {
      errors.push("Established year is required");
    } else if (formData.establishedYear < 1800 || formData.establishedYear > new Date().getFullYear()) {
      errors.push("Invalid established year");
    }
    if (!formData.adminName.trim()) errors.push("Admin name is required");
    if (!formData.adminEmail.trim()) {
      errors.push("Admin email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      errors.push("Invalid admin email format");
    }
    if (!formData.adminPassword.trim()) {
      errors.push("Admin password is required");
    } else if (formData.adminPassword.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    
    return errors;
  };

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormTouched(true);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormTouched(true);
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join("; "));
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await api.post("/master/create/college", {
        ...formData,
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

      setTimeout(() => {
        navigate("/super-admin/colleges-list");
      }, 2500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create college. Please try again."
      );
      console.error("College creation error:", err);
    } finally {
      setLoading(false);
    }
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
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/super-admin/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/super-admin/colleges-list">Colleges</a></li>
          <li className="breadcrumb-item active" aria-current="page">Create New College</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon blink-pulse">
            <FaUniversity />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Create New College</h1>
            <p className="erp-page-subtitle">
              Register a new educational institution and generate administrator credentials
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
          <strong>Important:</strong> This action will create a new college institution with a dedicated administrator account. 
          Please ensure all information is accurate before submission. Admin credentials will be displayed after successful creation.
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
              <div><strong>Admin Email:</strong> {success.collegeAdmin.email}</div>
              <div><strong>Admin Password:</strong> <span className="password-mask">••••••••</span></div>
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
            Fill in all required fields marked with <span className="required">*</span>. 
            All information is confidential and securely stored.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="erp-form">
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
                    className={`erp-input ${formTouched && !formData.collegeName.trim() ? 'erp-input-error' : ''}`}
                    value={formData.collegeName}
                    onChange={handleChange}
                    placeholder="Enter full college name"
                    required
                  />
                  {formTouched && !formData.collegeName.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      College name is required
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
                    className={`erp-input ${formTouched && !formData.collegeCode.trim() ? 'erp-input-error' : ''}`}
                    value={formData.collegeCode}
                    onChange={handleChange}
                    placeholder="e.g., ABC123"
                    required
                  />
                  {formTouched && !formData.collegeCode.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      College code is required
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Unique identifier for the college (alphanumeric)
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
                    className={`erp-input ${formTouched && !formData.collegeEmail.trim() ? 'erp-input-error' : ''}`}
                    value={formData.collegeEmail}
                    onChange={handleChange}
                    placeholder="admissions@college.edu"
                    required
                  />
                  {formTouched && !formData.collegeEmail.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      College email is required
                    </div>
                  )}
                  {formTouched && formData.collegeEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.collegeEmail) && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Invalid email format
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
                    className={`erp-input ${formTouched && !formData.contactNumber.trim() ? 'erp-input-error' : ''}`}
                    value={formData.contactNumber}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    required
                  />
                  {formTouched && !formData.contactNumber.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Contact number is required
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
                    className={`erp-input ${formTouched && !formData.establishedYear.trim() ? 'erp-input-error' : ''}`}
                    value={formData.establishedYear}
                    onChange={handleChange}
                    placeholder="e.g., 1995"
                    min="1800"
                    max={new Date().getFullYear()}
                    required
                  />
                  {formTouched && !formData.establishedYear.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Established year is required
                    </div>
                  )}
                  {formTouched && formData.establishedYear.trim() && (formData.establishedYear < 1800 || formData.establishedYear > new Date().getFullYear()) && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Please enter a valid year (1800 - {new Date().getFullYear()})
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
                    className={`erp-textarea ${formTouched && !formData.address.trim() ? 'erp-input-error' : ''}`}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Building, Street, Locality, City, State, PIN Code"
                    rows="3"
                    required
                  />
                  {formTouched && !formData.address.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Address is required
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Complete physical address of the college
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
              Create the primary administrator account for this college. Credentials will be displayed after successful creation.
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
                    className={`erp-input ${formTouched && !formData.adminName.trim() ? 'erp-input-error' : ''}`}
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="Full name of administrator"
                    required
                  />
                  {formTouched && !formData.adminName.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Admin name is required
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
                    className={`erp-input ${formTouched && !formData.adminEmail.trim() ? 'erp-input-error' : ''}`}
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="admin@college.edu"
                    required
                  />
                  {formTouched && !formData.adminEmail.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Admin email is required
                    </div>
                  )}
                  {formTouched && formData.adminEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail) && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Invalid email format
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Will be used for login and communications
                  </div>
                </div>
              </div>
              
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaLock className="erp-label-icon" />
                    Admin Password <span className="required">*</span>
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="adminPassword"
                      className={`erp-input ${formTouched && !formData.adminPassword.trim() ? 'erp-input-error' : ''}`}
                      value={formData.adminPassword}
                      onChange={handleChange}
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {formTouched && !formData.adminPassword.trim() && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Admin password is required
                    </div>
                  )}
                  {formTouched && formData.adminPassword.trim() && formData.adminPassword.length < 8 && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      Password must be at least 8 characters
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Strong password with minimum 8 characters required
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
      <style jsx>{`
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
        
        /* INFO BANNER */
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
        
        /* ALERTS */
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
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(76, 175, 80, 0.3);
          font-size: 0.95rem;
        }
        
        .password-mask {
          letter-spacing: 2px;
          font-size: 1.1em;
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
        
        /* FORM CARD */
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
          color: #1a4b6d;
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
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
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
          border-left: 3px solid #1a4b6d;
        }
        
        .erp-hint-icon {
          font-size: 0.875rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
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
        
        /* LOADING CONTAINER */
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
          font-size: 1.35rem;
          font-weight: 600;
          color: #1a4b6d;
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
          background: linear-gradient(90deg, #1a4b6d 0%, #0f3a4a 100%);
          width: 35%;
          animation: progressPulse 1.8s ease-in-out infinite;
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
            box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.5);
          }
          50% { 
            opacity: 0.7;
            box-shadow: 0 0 15px 5px rgba(26, 75, 109, 0.7);
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
          
          .info-banner {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
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
        }
      `}</style>
    </div>
  );
}