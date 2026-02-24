import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import {
  FaUserTie,
  FaEnvelope,
  FaIdBadge,
  FaGraduationCap,
  FaBriefcase,
  FaSave,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUniversity,
  FaChalkboardTeacher,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Brand Colors
const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
  },
  info: {
    main: "#17a2b8",
  },
  warning: {
    main: "#ffc107",
  },
  danger: {
    main: "#dc3545",
  },
};

export default function EditTeacherProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    employeeId: "",
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: "",
    department_name: "",
    courses: [],
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/teacher/dashboard" />;

  // Load profile
  useEffect(() => {
    fetchProfile();
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (!loading) {
      const editableFields = ["name", "email", "experienceYears"];
      const hasChanges = editableFields.some(
        (key) => form[key] !== "" && form[key] !== null
      );
      setUnsavedChanges(hasChanges);
    }
  }, [form, loading]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/teachers/my-profile");
      const data = res.data;

      setForm({
        name: data.name || "",
        email: data.email || "",
        employeeId: data.employeeId || "",
        designation: data.designation || "",
        qualification: data.qualification || "",
        experienceYears: data.experienceYears?.toString() || "",
        department_id: data.department_id?._id || "",
        department_name: data.department_id?.name || "",
        courses: data.courses?.map((c) => ({ _id: c._id, name: c.name })) || [],
      });
    } catch (err) {
      console.error("Fetch profile error:", err);
      toast.error("Failed to load profile", {
        position: "top-right",
        icon: <FaExclamationTriangle />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value || value.trim().length < 3)
          return "Name must be at least 3 characters";
        break;
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !emailRegex.test(value))
          return "Please enter a valid email address";
        break;
      case "experienceYears":
        const exp = parseInt(value);
        if (isNaN(exp) || exp < 0 || exp > 50)
          return "Experience must be between 0 and 50 years";
        break;
      default:
        break;
    }
    return "";
  };

  const validateForm = () => {
    const errors = {};
    const editableFields = ["name", "email", "experienceYears"];
    
    editableFields.forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) errors[key] = error;
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (touchedFields[name]) {
      const error = validateField(name, value);
      setValidationErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, form[name]);
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstError = Object.keys(validationErrors)[0];
      if (firstError) {
        const input = document.querySelector(`[name="${firstError}"]`);
        if (input) input.focus();
      }
      toast.error("Please fix the form errors", {
        position: "top-right",
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        experienceYears: parseInt(form.experienceYears) || 0,
      };

      const res = await api.put("/teachers/my-profile", payload);

      toast.success(res.data.message || "Profile updated successfully!", {
        position: "top-right",
        icon: <FaCheckCircle />,
        onClose: () => navigate("/profile/my-profile"),
      });
    } catch (err) {
      console.error("Update error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update profile",
        {
          position: "top-right",
          icon: <FaExclamationTriangle />,
        }
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return <LoadingDisplay />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        padding: "2rem 1rem",
      }}
    >
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

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          style={{
            marginBottom: "1.5rem",
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={handleBack}
              disabled={saving}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.25rem",
                color: BRAND_COLORS.primary.main,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <FaArrowLeft />
            </button>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <FaUserTie style={{ color: BRAND_COLORS.primary.main }} />
                Edit My Profile
              </h2>
              <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                Update your personal and professional details
              </p>
            </div>
          </div>
          {unsavedChanges && (
            <div
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: `${BRAND_COLORS.warning.main}15`,
                color: BRAND_COLORS.warning.main,
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "currentColor", display: "inline-block" }} />
              Unsaved Changes
            </div>
          )}
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            padding: "2rem",
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Personal Info Section */}
            <div style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  paddingBottom: "0.75rem",
                  borderBottom: `2px solid ${BRAND_COLORS.primary.main}20`,
                }}
              >
                <FaUserTie style={{ color: BRAND_COLORS.primary.main }} />
                Personal Information
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Full Name <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={saving}
                    className={`form-control ${
                      validationErrors.name && touchedFields.name ? "is-invalid" : ""
                    }`}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: `1px solid ${
                        validationErrors.name && touchedFields.name ? "#dc3545" : "#e2e8f0"
                      }`,
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      transition: "border-color 0.2s",
                    }}
                    placeholder="Enter your full name"
                  />
                  {validationErrors.name && touchedFields.name && (
                    <div style={{ color: "#dc3545", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      {validationErrors.name}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Email Address <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={saving}
                    className={`form-control ${
                      validationErrors.email && touchedFields.email ? "is-invalid" : ""
                    }`}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: `1px solid ${
                        validationErrors.email && touchedFields.email ? "#dc3545" : "#e2e8f0"
                      }`,
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                    placeholder="your.email@example.com"
                  />
                  {validationErrors.email && touchedFields.email && (
                    <div style={{ color: "#dc3545", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      {validationErrors.email}
                    </div>
                  )}
                </div>

                {/* Employee ID - Read Only */}
                <div>
                  <label
                    htmlFor="employeeId"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Employee ID <span style={{ color: "#64748b", fontWeight: 400 }}>(Read-only)</span>
                  </label>
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    value={form.employeeId}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                    }}
                  />
                </div>

                {/* Designation - Read Only */}
                <div>
                  <label
                    htmlFor="designation"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Designation <span style={{ color: "#64748b", fontWeight: 400 }}>(Read-only)</span>
                  </label>
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={form.designation}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                    }}
                  />
                  <small style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem", display: "block" }}>
                    Contact college admin to change designation
                  </small>
                </div>

                {/* Qualification - Read Only */}
                <div>
                  <label
                    htmlFor="qualification"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Qualification <span style={{ color: "#64748b", fontWeight: 400 }}>(Read-only)</span>
                  </label>
                  <input
                    type="text"
                    id="qualification"
                    name="qualification"
                    value={form.qualification}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                    }}
                  />
                  <small style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem", display: "block" }}>
                    Contact college admin to update qualification
                  </small>
                </div>

                {/* Experience */}
                <div>
                  <label
                    htmlFor="experienceYears"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Years of Experience <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="number"
                    id="experienceYears"
                    name="experienceYears"
                    value={form.experienceYears}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={saving}
                    min="0"
                    max="50"
                    className={`form-control ${
                      validationErrors.experienceYears && touchedFields.experienceYears
                        ? "is-invalid"
                        : ""
                    }`}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: `1px solid ${
                        validationErrors.experienceYears && touchedFields.experienceYears
                          ? "#dc3545"
                          : "#e2e8f0"
                      }`,
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                    placeholder="e.g., 5"
                  />
                  {validationErrors.experienceYears && touchedFields.experienceYears && (
                    <div style={{ color: "#dc3545", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      {validationErrors.experienceYears}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Info Section - Read Only */}
            <div style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  paddingBottom: "0.75rem",
                  borderBottom: `2px solid ${BRAND_COLORS.info.main}20`,
                }}
              >
                <FaUniversity style={{ color: BRAND_COLORS.info.main }} />
                Academic Details (Contact Admin to Change)
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {/* Department - Read Only */}
                <div>
                  <label
                    htmlFor="department_id"
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Department
                  </label>
                  <input
                    type="text"
                    id="department_id"
                    name="department_id"
                    value={form.department_name}
                    disabled
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                    }}
                  />
                  <small style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem", display: "block" }}>
                    Contact college admin to change department
                  </small>
                </div>
              </div>

              {/* Courses - Read Only */}
              {form.courses && form.courses.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#4a5568",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <FaChalkboardTeacher style={{ marginRight: "0.5rem" }} />
                    Assigned Courses
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      padding: "1rem",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {form.courses.map((course) => (
                      <div
                        key={course._id}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "white",
                          border: `1px solid ${BRAND_COLORS.primary.main}`,
                          borderRadius: "6px",
                          color: BRAND_COLORS.primary.main,
                          fontSize: "0.9rem",
                          fontWeight: 500,
                        }}
                      >
                        {course.name}
                      </div>
                    ))}
                  </div>
                  <small style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}>
                    Contact college admin to modify assigned courses
                  </small>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                paddingTop: "1.5rem",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                style={{
                  padding: "0.875rem 2rem",
                  backgroundColor: "white",
                  color: BRAND_COLORS.primary.main,
                  border: `2px solid ${BRAND_COLORS.primary.main}`,
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.3s",
                }}
              >
                <FaArrowLeft /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.875rem 2.5rem",
                  background: BRAND_COLORS.primary.gradient,
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.3s",
                  boxShadow: saving ? "none" : "0 4px 15px rgba(26, 75, 109, 0.3)",
                }}
              >
                {saving ? (
                  <>
                    <FaSpinner className="spin" /> Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .form-control:focus {
          outline: none;
          border-color: ${BRAND_COLORS.primary.main};
          box-shadow: 0 0 0 3px ${BRAND_COLORS.primary.main}20;
        }
        .form-control.is-invalid {
          border-color: #dc3545 !important;
        }
        .form-control.is-invalid:focus {
          box-shadow: 0 0 0 3px #dc354520 !important;
        }
      `}</style>
    </motion.div>
  );
}

function LoadingDisplay() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="spin"
          style={{
            fontSize: "3rem",
            color: BRAND_COLORS.primary.main,
            marginBottom: "1rem",
          }}
        >
          <FaSpinner />
        </div>
        <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e293b", fontWeight: 700 }}>
          Loading Profile...
        </h3>
        <p style={{ color: "#64748b", margin: 0 }}>Please wait</p>
        <style>{`
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
