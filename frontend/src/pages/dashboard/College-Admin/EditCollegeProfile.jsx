import { useEffect, useState, useRef } from "react";
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
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function EditCollegeProfile() {
  const navigate = useNavigate();
  const formRef = useRef(null);

  // ================= FORM STATE =================
  const [form, setForm] = useState({
    name: "",
    code: "",
    email: "",
    contactNumber: "",
    address: "",
    establishedYear: "",
    logo: null,
  });

  // ================= UI STATE =================
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // ================= LOAD COLLEGE =================
  useEffect(() => {
    fetchCollege();
    return () => {
      // Cleanup: warn about unsaved changes on unmount
      if (unsavedChanges && !saving) {
        // Could show confirm dialog here if needed
      }
    };
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (!loading) {
      const hasChanges = Object.keys(form).some(
        (key) => form[key] !== "" && form[key] !== null
      );
      setUnsavedChanges(hasChanges);
    }
  }, [form, loading]);

  const fetchCollege = async () => {
    try {
      setLoading(true);
      const res = await api.get("/college/my-college");

      if (res.data) {
        setForm({
          name: res.data.name || "",
          code: res.data.code || "",
          email: res.data.email || "",
          contactNumber: res.data.contactNumber || "",
          address: res.data.address || "",
          establishedYear: res.data.establishedYear?.toString() || "",
          logo: null,
        });
      }
    } catch (err) {
      console.error("Fetch college error:", err);
      toast.error(err.response?.data?.message || "Failed to load college profile", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        icon: <FaExclamationTriangle />,
      });
    } finally {
      setLoading(false);
    }
  };

  // ================= VALIDATION =================
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value || value.trim().length < 3) {
          return "College name must be at least 3 characters";
        }
        break;
      case "code":
        if (!value || value.trim().length < 3) {
          return "College code must be at least 3 characters";
        }
        if (!/^[A-Z0-9-]+$/i.test(value)) {
          return "Code can only contain letters, numbers, and hyphens";
        }
        break;
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !emailRegex.test(value)) {
          return "Please enter a valid email address";
        }
        break;
      case "contactNumber":
        const phoneRegex = /^[6-9]\d{9}$/;
        const cleaned = value.replace(/\s/g, "");
        if (!value || !phoneRegex.test(cleaned)) {
          return "Please enter a valid 10-digit Indian mobile number";
        }
        break;
      case "address":
        if (!value || value.trim().length < 10) {
          return "Address must be at least 10 characters";
        }
        break;
      case "establishedYear":
        const currentYear = new Date().getFullYear();
        const year = parseInt(value);
        if (!value || isNaN(year) || year < 1900 || year > currentYear) {
          return `Please enter a valid year (1900-${currentYear})`;
        }
        break;
      default:
        break;
    }
    return "";
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(form).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) errors[key] = error;
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ================= CHANGE HANDLER =================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Real-time validation after field is touched
    if (touchedFields[name]) {
      const error = validateField(name, value);
      setValidationErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, form[name]);
    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  // Format phone number as user types
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 10) value = value.slice(0, 10);
    // Add spaces for readability: XXXXX XXXXX
    if (value.length > 5) {
      value = `${value.slice(0, 5)} ${value.slice(5)}`;
    }
    setForm((prev) => ({ ...prev, contactNumber: value }));
    if (touchedFields.contactNumber) {
      const error = validateField("contactNumber", value);
      setValidationErrors((prev) => ({
        ...prev,
        contactNumber: error,
      }));
    }
  };

  // ================= SUBMIT HANDLER =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus first error field
      const firstError = Object.keys(validationErrors)[0];
      if (firstError && formRef.current) {
        const input = formRef.current.querySelector(`[name="${firstError}"]`);
        if (input) input.focus();
      }
      toast.error("Please fix the form errors before submitting", {
        position: "top-right",
        autoClose: 4000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        email: form.email.trim().toLowerCase(),
        contactNumber: form.contactNumber.replace(/\s/g, ""),
        address: form.address.trim(),
        establishedYear: Number(form.establishedYear),
        logo: null,
      };

      const res = await api.put("/college/edit/my-college", payload);

      toast.success(res.data.message || "Profile updated successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />,
        progressStyle: { background: "#28a745" },
        onClose: () => {
          setUnsavedChanges(false);
          navigate("/college/profile");
        },
      });
    } catch (err) {
      console.error("Update college error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update college profile",
        {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
          progressStyle: { background: "#dc3545" },
        }
      );
    } finally {
      setSaving(false);
    }
  };

  // ================= NAVIGATION GUARD =================
  const handleBack = () => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  // ================= LOADING STATE =================
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-card">
            <div className="skeleton-row">
              <div className="skeleton-label" />
              <div className="skeleton-input" />
            </div>
            <div className="skeleton-row">
              <div className="skeleton-label" />
              <div className="skeleton-input" />
            </div>
            <div className="skeleton-row">
              <div className="skeleton-label" />
              <div className="skeleton-input" />
            </div>
            <div className="skeleton-row">
              <div className="skeleton-label" />
              <div className="skeleton-input" />
            </div>
            <div className="skeleton-buttons">
              <div className="skeleton-btn" />
              <div className="skeleton-btn" />
            </div>
          </div>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    );
  }

  return (
    <div className="edit-college-profile-container">
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* HEADER */}
      <header className="glass-header mb-4">
        <div className="header-content">
          <div className="header-left">
            <button
              className="btn-back"
              onClick={handleBack}
              aria-label="Go back"
              disabled={saving}
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="header-title">
                <FaUniversity className="header-icon blink" aria-hidden="true" />
                Edit Institute Profile
              </h1>
              <p className="header-subtitle">Update your institute details</p>
            </div>
          </div>
          {unsavedChanges && (
            <div className="unsaved-badge">
              <span className="dot" /> Unsaved Changes
            </div>
          )}
        </div>
      </header>

      {/* FORM */}
      <main className="form-wrapper">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="glass-card">
              <form ref={formRef} onSubmit={handleSubmit} noValidate>
                {/* NAME */}
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    <FaUniversity className="me-2 text-primary blink" aria-hidden="true" />
                    College Name <span className="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className={`form-control ${validationErrors.name && touchedFields.name ? "is-invalid" : ""} ${
                        touchedFields.name && !validationErrors.name ? "is-valid" : ""
                      }`}
                      value={form.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter college name"
                      disabled={saving}
                      required
                      aria-required="true"
                      aria-invalid={!!(validationErrors.name && touchedFields.name)}
                      aria-describedby={validationErrors.name ? "name-error" : undefined}
                    />
                    {touchedFields.name && !validationErrors.name && (
                      <FaCheckCircle className="validation-icon valid" aria-hidden="true" />
                    )}
                  </div>
                  {validationErrors.name && touchedFields.name && (
                    <div id="name-error" className="invalid-feedback" role="alert">
                      <FaExclamationTriangle className="me-1" aria-hidden="true" />
                      {validationErrors.name}
                    </div>
                  )}
                </div>

                {/* CODE */}
                <div className="form-group">
                  <label htmlFor="code" className="form-label">
                    <FaIdBadge className="me-2 text-warning blink" aria-hidden="true" />
                    College Code <span className="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      id="code"
                      name="code"
                      className={`form-control ${validationErrors.code && touchedFields.code ? "is-invalid" : ""} ${
                        touchedFields.code && !validationErrors.code ? "is-valid" : ""
                      }`}
                      value={form.code}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g., NOVAA-2024"
                      disabled={saving}
                      required
                      aria-required="true"
                      aria-invalid={!!(validationErrors.code && touchedFields.code)}
                      aria-describedby={validationErrors.code ? "code-error" : undefined}
                    />
                    {touchedFields.code && !validationErrors.code && (
                      <FaCheckCircle className="validation-icon valid" aria-hidden="true" />
                    )}
                  </div>
                  {validationErrors.code && touchedFields.code && (
                    <div id="code-error" className="invalid-feedback" role="alert">
                      <FaExclamationTriangle className="me-1" aria-hidden="true" />
                      {validationErrors.code}
                    </div>
                  )}
                  <small className="form-hint">Use letters, numbers, and hyphens only</small>
                </div>

                {/* EMAIL */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <FaEnvelope className="me-2 text-success blink" aria-hidden="true" />
                    Official Email <span className="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className={`form-control ${validationErrors.email && touchedFields.email ? "is-invalid" : ""} ${
                        touchedFields.email && !validationErrors.email ? "is-valid" : ""
                      }`}
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="college@example.com"
                      disabled={saving}
                      required
                      aria-required="true"
                      aria-invalid={!!(validationErrors.email && touchedFields.email)}
                      aria-describedby={validationErrors.email ? "email-error" : undefined}
                    />
                    {touchedFields.email && !validationErrors.email && (
                      <FaCheckCircle className="validation-icon valid" aria-hidden="true" />
                    )}
                  </div>
                  {validationErrors.email && touchedFields.email && (
                    <div id="email-error" className="invalid-feedback" role="alert">
                      <FaExclamationTriangle className="me-1" aria-hidden="true" />
                      {validationErrors.email}
                    </div>
                  )}
                </div>

                {/* PHONE */}
                <div className="form-group">
                  <label htmlFor="contactNumber" className="form-label">
                    <FaPhone className="me-2 text-info blink" aria-hidden="true" />
                    Contact Number <span className="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      id="contactNumber"
                      name="contactNumber"
                      className={`form-control ${
                        validationErrors.contactNumber && touchedFields.contactNumber
                          ? "is-invalid"
                          : ""
                      } ${
                        touchedFields.contactNumber && !validationErrors.contactNumber
                          ? "is-valid"
                          : ""
                      }`}
                      value={form.contactNumber}
                      onChange={handlePhoneChange}
                      onBlur={handleBlur}
                      placeholder="98765 43210"
                      maxLength={11}
                      disabled={saving}
                      required
                      aria-required="true"
                      aria-invalid={!!(
                        validationErrors.contactNumber && touchedFields.contactNumber
                      )}
                      aria-describedby={
                        validationErrors.contactNumber ? "phone-error" : undefined
                      }
                    />
                    {touchedFields.contactNumber && !validationErrors.contactNumber && (
                      <FaCheckCircle className="validation-icon valid" aria-hidden="true" />
                    )}
                  </div>
                  {validationErrors.contactNumber && touchedFields.contactNumber && (
                    <div id="phone-error" className="invalid-feedback" role="alert">
                      <FaExclamationTriangle className="me-1" aria-hidden="true" />
                      {validationErrors.contactNumber}
                    </div>
                  )}
                  <small className="form-hint">Indian mobile number (10 digits)</small>
                </div>

                {/* ADDRESS */}
                <div className="form-group">
                  <label htmlFor="address" className="form-label">
                    <FaMapMarkerAlt className="me-2 text-danger blink" aria-hidden="true" />
                    Full Address <span className="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div className="input-wrapper">
                    <textarea
                      id="address"
                      name="address"
                      className={`form-control ${
                        validationErrors.address && touchedFields.address ? "is-invalid" : ""
                      } ${
                        touchedFields.address && !validationErrors.address ? "is-valid" : ""
                      }`}
                      rows="4"
                      value={form.address}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter complete address with city, state, and PIN"
                      disabled={saving}
                      required
                      aria-required="true"
                      aria-invalid={!!(validationErrors.address && touchedFields.address)}
                      aria-describedby={
                        validationErrors.address ? "address-error" : "address-hint"
                      }
                    />
                    {touchedFields.address && !validationErrors.address && (
                      <FaCheckCircle className="validation-icon valid" aria-hidden="true" />
                    )}
                  </div>
                  <div className="form-footer">
                    {validationErrors.address && touchedFields.address ? (
                      <div id="address-error" className="invalid-feedback" role="alert">
                        <FaExclamationTriangle className="me-1" aria-hidden="true" />
                        {validationErrors.address}
                      </div>
                    ) : (
                      <small id="address-hint" className="form-hint">
                        {form.address.length}/10 characters minimum
                      </small>
                    )}
                  </div>
                </div>

                {/* YEAR */}
                <div className="form-group">
                  <label htmlFor="establishedYear" className="form-label">
                    <FaCalendarAlt className="me-2 text-secondary blink" aria-hidden="true" />
                    Established Year <span className="text-danger" aria-hidden="true">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      id="establishedYear"
                      name="establishedYear"
                      className={`form-control ${
                        validationErrors.establishedYear && touchedFields.establishedYear
                          ? "is-invalid"
                          : ""
                      } ${
                        touchedFields.establishedYear && !validationErrors.establishedYear
                          ? "is-valid"
                          : ""
                      }`}
                      value={form.establishedYear}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g., 2010"
                      min="1900"
                      max={new Date().getFullYear()}
                      disabled={saving}
                      required
                      aria-required="true"
                      aria-invalid={!!(
                        validationErrors.establishedYear && touchedFields.establishedYear
                      )}
                      aria-describedby={
                        validationErrors.establishedYear ? "year-error" : "year-hint"
                      }
                    />
                    {touchedFields.establishedYear && !validationErrors.establishedYear && (
                      <FaCheckCircle className="validation-icon valid" aria-hidden="true" />
                    )}
                  </div>
                  <div className="form-footer">
                    {validationErrors.establishedYear && touchedFields.establishedYear ? (
                      <div id="year-error" className="invalid-feedback" role="alert">
                        <FaExclamationTriangle className="me-1" aria-hidden="true" />
                        {validationErrors.establishedYear}
                      </div>
                    ) : (
                      <small id="year-hint" className="form-hint">
                        Year college was founded (1900-{new Date().getFullYear()})
                      </small>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleBack}
                    disabled={saving}
                  >
                    <FaArrowLeft className="me-2" aria-hidden="true" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || Object.keys(validationErrors).length > 0}
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="spin me-2" aria-hidden="true" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" aria-hidden="true" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* CSS */}
      <style>{`
        /* ================= CONTAINER ================= */
        .edit-college-profile-container {
          padding: 2rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
          min-height: 100vh;
        }

        /* ================= LOADING SKELETON ================= */
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
        }

        .loading-skeleton {
          width: 100%;
          max-width: 700px;
        }

        .skeleton-header {
          height: 80px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 16px;
          margin-bottom: 1.5rem;
        }

        .skeleton-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }

        .skeleton-row {
          margin-bottom: 1.5rem;
        }

        .skeleton-label {
          height: 16px;
          width: 120px;
          background: #e0e0e0;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .skeleton-input {
          height: 44px;
          background: #f0f0f0;
          border-radius: 10px;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .skeleton-btn {
          flex: 1;
          height: 48px;
          background: #e0e0e0;
          border-radius: 50px;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* ================= HEADER ================= */
        .glass-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
          color: white;
          padding: 1.5rem 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15, 58, 74, 0.3);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .btn-back {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-back:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: translateX(-3px);
        }

        .btn-back:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .header-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-icon {
          color: #4fc3f7;
        }

        .header-subtitle {
          margin: 0.25rem 0 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .unsaved-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .unsaved-badge .dot {
          width: 8px;
          height: 8px;
          background: #ffc107;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* ================= FORM WRAPPER ================= */
        .form-wrapper {
          padding: 0 1rem;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.98);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          animation: fadeUp 0.6s ease;
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 2rem;
        }

        /* ================= FORM GROUPS ================= */
        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          font-weight: 600;
          color: #1a4b6d;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          font-size: 0.95rem;
        }

        .form-label .blink {
          animation: blink 2s infinite;
        }

        .input-wrapper {
          position: relative;
        }

        .form-control {
          width: 100%;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          background: white;
        }

        .form-control:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
          outline: none;
        }

        .form-control:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .form-control.is-invalid {
          border-color: #dc3545;
        }

        .form-control.is-invalid:focus {
          box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.15);
        }

        .form-control.is-valid {
          border-color: #28a745;
        }

        .form-control.is-valid:focus {
          box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.15);
        }

        .validation-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
        }

        .validation-icon.valid {
          color: #28a745;
        }

        .invalid-feedback {
          color: #dc3545;
          font-size: 0.85rem;
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          font-weight: 500;
        }

        .form-hint {
          font-size: 0.8rem;
          color: #6c757d;
          margin-top: 0.25rem;
          display: block;
        }

        .form-footer {
          margin-top: 0.25rem;
          min-height: 20px;
        }

        /* ================= BUTTONS ================= */
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e9ecef;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          transition: all 0.3s ease;
          border-radius: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          flex: 1;
          max-width: 200px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
          border: none;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a4b6d 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-outline-secondary {
          background: white;
          border: 2px solid #6c757d;
          color: #6c757d;
        }

        .btn-outline-secondary:hover:not(:disabled) {
          background: #6c757d;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(108, 117, 125, 0.3);
        }

        .btn-outline-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ================= ANIMATIONS ================= */
        .blink {
          animation: blink 2s infinite;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.9);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ================= TOASTIFY OVERRIDES ================= */
        .Toastify__toast {
          border-radius: 10px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .Toastify__toast--success {
          background: linear-gradient(135deg, #28a745, #1e7e34);
        }

        .Toastify__toast--error {
          background: linear-gradient(135deg, #dc3545, #c82333);
        }

        .Toastify__progress-bar {
          background: rgba(255, 255, 255, 0.5);
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .edit-college-profile-container {
            padding: 1rem;
          }

          .glass-header {
            padding: 1rem;
            border-radius: 12px;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .header-subtitle {
            font-size: 0.85rem;
          }

          .glass-card {
            padding: 1.5rem;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn {
            max-width: 100%;
          }

          .unsaved-badge {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .header-title {
            font-size: 1.1rem;
          }

          .header-subtitle {
            font-size: 0.8rem;
          }

          .form-control {
            font-size: 0.9rem;
          }

          .form-label {
            font-size: 0.9rem;
          }

          .glass-card {
            padding: 1.25rem;
          }
        }

        /* ================= ACCESSIBILITY ================= */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .form-control:focus-visible,
        .btn:focus-visible {
          outline: 2px solid #1a4b6d;
          outline-offset: 2px;
        }

        /* Hide visually but keep for screen readers */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}