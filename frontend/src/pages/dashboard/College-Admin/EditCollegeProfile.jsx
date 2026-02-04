import { useEffect, useState } from "react";
import api from "../../../api/axios";
import {
  FaUniversity,
  FaSave,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaIdBadge,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUpload,
  FaImage
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function EditCollegeProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    code: "",
    email: "",
    contactNumber: "",
    address: "",
    establishedYear: "",
    logo: null
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [formTouched, setFormTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  /* ================= LOAD COLLEGE ================= */
  useEffect(() => {
    const fetchCollege = async () => {
      try {
        const res = await api.get("/college/my-college");
        setForm({
          name: res.data.name || "",
          code: res.data.code || "",
          email: res.data.email || "",
          contactNumber: res.data.contactNumber || "",
          address: res.data.address || "",
          establishedYear: res.data.establishedYear || "",
          logo: null
        });
        
        // Set logo preview if exists in response
        if (res.data.logoUrl) {
          setLogoPreview(res.data.logoUrl);
        }
      } catch (err) {
        setError("Failed to load college profile. Please try again.");
        console.error("Error loading college profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollege();
  }, []);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const errors = {};
    
    if (!form.name.trim()) {
      errors.name = "College name is required";
    } else if (form.name.trim().length < 3) {
      errors.name = "College name must be at least 3 characters";
    }
    
    if (!form.code.trim()) {
      errors.code = "College code is required";
    } else if (form.code.trim().length < 2) {
      errors.code = "College code must be at least 2 characters";
    }
    
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Invalid email format";
    }
    
    if (!form.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required";
    } else if (!/^\d{10,15}$/.test(form.contactNumber.replace(/\D/g, ''))) {
      errors.contactNumber = "Invalid phone number format";
    }
    
    if (!form.establishedYear) {
      errors.establishedYear = "Established year is required";
    } else if (form.establishedYear < 1800 || form.establishedYear > new Date().getFullYear()) {
      errors.establishedYear = `Year must be between 1800 and ${new Date().getFullYear()}`;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ================= CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormTouched(true);
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /* ================= LOGO HANDLER ================= */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setError("Please upload a valid image file (JPG, PNG, GIF)");
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError("Logo size must be less than 2MB");
        return;
      }
      
      setForm(prev => ({ ...prev, logo: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setError("");
    }
  };


 /* ================= SUBMIT ================= */
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    setError("Please fix the errors before submitting");
    return;
  }
  
  setSaving(true);
  setError("");
  setSuccess("");

  try {
    // Create FormData for file upload if logo is present
    const payload = new FormData();
    payload.append('name', form.name.trim());
    payload.append('code', form.code.trim());
    payload.append('email', form.email.trim());
    payload.append('contactNumber', form.contactNumber.trim());
    payload.append('address', form.address.trim());
    payload.append('establishedYear', Number(form.establishedYear));
    
    if (form.logo) {
      payload.append('logo', form.logo);
    }

    // ✅ FIXED ENDPOINT: Removed "/edit" from path
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };

    // ✅ CORRECT ENDPOINT PATH
    const res = await api.put("/college/my-college", payload, config);

    setSuccess(res.data.message || "Profile updated successfully!");
    
    // Reset form touched state after successful save
    setFormTouched(false);
    
    // Refresh the page after 2 seconds to show updated logo
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (err) {
    setError(
      err.response?.data?.message || "Failed to update college profile. Please try again."
    );
    console.error("Error updating college profile:", err);
  } finally {
    setSaving(false);
  }
};

  /* ================= LOADING STATE ================= */
  if (loading) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading college profile...</h4>
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
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/college/profile">College Profile</a></li>
          <li className="breadcrumb-item active" aria-current="page">Edit Profile</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaUniversity />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Edit College Profile</h1>
            <p className="erp-page-subtitle">
              Update your institution's details and branding
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back to Profile</span>
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
            <strong>Success!</strong> {success}
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="erp-form-card animate-fade-in">
        <div className="erp-form-header">
          <div className="erp-form-title">
            <FaUniversity className="erp-form-icon" />
            <h3>College Information</h3>
          </div>
          <div className="erp-form-subtitle">
            Update your college details below. All fields marked with <span className="required">*</span> are required.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="erp-form">
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaUniversity className="erp-section-icon" />
              Basic Information
            </h4>
            
            <div className="erp-row">
              {/* COLLEGE NAME */}
              <div className="erp-col-12">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaUniversity className="erp-label-icon" />
                    College Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className={`erp-input ${validationErrors.name ? 'erp-input-error' : ''}`}
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g., Stanford University"
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
                    Official registered name of your institution
                  </div>
                </div>
              </div>
              
              {/* COLLEGE CODE */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaIdBadge className="erp-label-icon" />
                    College Code <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    className={`erp-input ${validationErrors.code ? 'erp-input-error' : ''}`}
                    value={form.code}
                    onChange={handleChange}
                    placeholder="e.g., STAN"
                    required
                  />
                  {validationErrors.code && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.code}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Short unique identifier for your college
                  </div>
                </div>
              </div>
              
              {/* ESTABLISHED YEAR */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaCalendarAlt className="erp-label-icon" />
                    Established Year <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    name="establishedYear"
                    className={`erp-input ${validationErrors.establishedYear ? 'erp-input-error' : ''}`}
                    value={form.establishedYear}
                    onChange={handleChange}
                    placeholder={`e.g., ${new Date().getFullYear() - 50}`}
                    min="1800"
                    max={new Date().getFullYear()}
                    required
                  />
                  {validationErrors.establishedYear && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.establishedYear}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Year your institution was founded
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaEnvelope className="erp-section-icon" />
              Contact Information
            </h4>
            
            <div className="erp-row">
              {/* EMAIL */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaEnvelope className="erp-label-icon" />
                    Official Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={`erp-input ${validationErrors.email ? 'erp-input-error' : ''}`}
                    value={form.email}
                    onChange={handleChange}
                    placeholder="admissions@college.edu"
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
                    Primary contact email for official communications
                  </div>
                </div>
              </div>
              
              {/* PHONE */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaPhone className="erp-label-icon" />
                    Contact Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    className={`erp-input ${validationErrors.contactNumber ? 'erp-input-error' : ''}`}
                    value={form.contactNumber}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                  {validationErrors.contactNumber && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.contactNumber}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Include country code for international numbers
                  </div>
                </div>
              </div>
              
              {/* ADDRESS */}
              <div className="erp-col-12">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaMapMarkerAlt className="erp-label-icon" />
                    College Address
                  </label>
                  <textarea
                    name="address"
                    className="erp-textarea"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="123 University Avenue, City, State, ZIP, Country"
                    rows="3"
                  />
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Full physical address of your main campus
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaImage className="erp-section-icon" />
              Branding
            </h4>
            
            <div className="erp-row">
              <div className="erp-col-12">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaUpload className="erp-label-icon" />
                    College Logo
                  </label>
                  <div className="logo-upload-container">
                    <div className="logo-preview">
                      {logoPreview ? (
                        <img src={logoPreview} alt="College logo preview" className="logo-image" />
                      ) : (
                        <div className="logo-placeholder">
                          <FaUniversity size={48} />
                          <p>No logo uploaded</p>
                        </div>
                      )}
                    </div>
                    <label className="logo-upload-btn">
                      <FaUpload className="me-2" />
                      {form.logo ? "Change Logo" : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="logo-input"
                      />
                    </label>
                    <div className="erp-hint-text logo-hint">
                      <FaInfoCircle className="erp-hint-icon" />
                      Recommended size: 200x200px. Max size: 2MB. Formats: JPG, PNG, GIF
                    </div>
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
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                <FaArrowLeft className="erp-btn-icon" />
                <span>Cancel</span>
              </button>
            </div>
            <div className="erp-footer-right">
              <button
                type="submit"
                className="erp-btn erp-btn-primary erp-btn-lg erp-btn-shadow"
                disabled={saving || !formTouched}
              >
                {saving ? (
                  <>
                    <FaSpinner className="erp-btn-icon erp-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="erp-btn-icon" />
                    <span>Save Changes</span>
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
          padding: 2rem;
        }
        
        .erp-form-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .erp-form-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        
        .erp-section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a4b6d;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f2f5;
        }
        
        .erp-section-icon {
          color: #1a4b6d;
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
        
        .erp-textarea {
          min-height: 100px;
          resize: vertical;
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
        
        .logo-hint {
          margin-top: 0.75rem;
          background: #e3f2fd;
          border-left-color: #2196F3;
        }
        
        .erp-hint-icon {
          font-size: 0.875rem;
        }
        
        /* LOGO UPLOAD STYLES */
        .logo-upload-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .logo-preview {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 150px;
          border: 2px dashed #e9ecef;
          border-radius: 12px;
          background: #f8f9fa;
          overflow: hidden;
        }
        
        .logo-image {
          max-width: 100%;
          max-height: 150px;
          object-fit: contain;
          padding: 1rem;
        }
        
        .logo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6c757d;
          text-align: center;
          padding: 1rem;
        }
        
        .logo-placeholder svg {
          opacity: 0.3;
          margin-bottom: 0.5rem;
        }
        
        .logo-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          width: fit-content;
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.3);
        }
        
        .logo-upload-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }
        
        .logo-input {
          display: none;
        }
        
        .erp-form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
          margin-top: 2rem;
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
        
        .loading-progress {
          width: 250px;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
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
        
        @keyframes progressPulse {
          0%, 100% { width: 35%; }
          50% { width: 65%; }
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
          .erp-form,
          .erp-form-footer {
            padding: 1.5rem;
          }
          
          .erp-form-footer {
            flex-direction: column;
            gap: 1rem;
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
          
          .logo-preview {
            min-height: 120px;
          }
          
          .logo-image {
            max-height: 120px;
          }
        }
        
        @media (max-width: 480px) {
          .erp-section-title {
            font-size: 1.1rem;
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
        }
      `}</style>
    </div>
  );
}