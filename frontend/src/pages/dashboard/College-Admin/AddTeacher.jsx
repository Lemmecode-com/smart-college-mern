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
} from "react-icons/fa";

export default function AddTeacher() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]); // ✅ NEW

  const [documents, setDocuments] = useState({
    aadhar: null,
    pan: null,
    degree: null,
    photo: null,
  });
  const [documentPreviews, setDocumentPreviews] = useState({
    aadhar: null,
    pan: null,
    degree: null,
    photo: null,
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "", // Will be auto-generated
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: "",
    course_id: "", // ✅ single course
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
  const [showPassword, setShowPassword] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [activeSection, setActiveSection] = useState("basic");
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  /* ================= LOAD DEPARTMENTS ================= */
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

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    if (!formData.department_id) {
      setCourses([]);
      setFormData((p) => ({ ...p, course_id: "" }));
      return;
    }

    api
      .get(`/courses/department/${formData.department_id}`)
      .then((res) => setCourses(res.data))
      .catch(() => setCourses([]));
  }, [formData.department_id]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });
    setFormTouched(true);

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Special handling: Clear employeeId when department changes
    if (name === "department_id" && value === "") {
      setFormData((prev) => ({ ...prev, employeeId: "" }));
    }
  };

  // ✅ MULTI COURSE SELECT HANDLER
  const handleCourseChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setFormData({ ...formData, courses: selected });
  };

  const handleFile = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      const file = files[0];

      // Validate file type and size
      if (!file.type.startsWith("image/") && name !== "degree") {
        setError("Please upload a valid image file (JPG, PNG, GIF)");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        setError("File size must be less than 2MB");
        return;
      }

      setDocuments({ ...documents, [name]: file });

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDocumentPreviews((prev) => ({ ...prev, [name]: reader.result }));
        };
        reader.readAsDataURL(file);
      } else {
        setDocumentPreviews((prev) => ({ ...prev, [name]: file.name }));
      }

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

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await api.post("/teachers", {
        ...formData,
        experienceYears: Number(formData.experienceYears),
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
        state: "",
      });
      setDocuments({
        aadhar: null,
        pan: null,
        degree: null,
        photo: null,
      });
      setDocumentPreviews({
        aadhar: null,
        pan: null,
        degree: null,
        photo: null,
      });

      setTimeout(() => navigate("/teachers"), 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create teacher. Please try again.",
      );
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
    <div className="container-fluid">
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
            <strong>Success!</strong> Teacher created successfully. Redirecting
            to teachers list...
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body p-4">
            {/* BASIC INFO */}
            <h5 className="fw-bold mb-3">
              <FaUserTie className="me-2" /> Basic Info
            </h5>
            <div className="row g-3 mb-4">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
              <Input
                label="Employee ID"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
              />
              <Input
                label="Designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
              />
              <Input
                label="Qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
              />
              <Input
                label="Experience (Years)"
                name="experienceYears"
                type="number"
                value={formData.experienceYears}
                onChange={handleChange}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* PERSONAL */}
            <h5 className="fw-bold mb-3">
              <FaIdCard className="me-2" /> Personal Info
            </h5>
            <div className="row g-3 mb-4">
              <Select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                options={["Male", "Female", "Other"]}
              />
              <Select
                label="Blood Group"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                options={["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"]}
              />
              <Select
                label="Employment Type"
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                options={["FULL_TIME", "PART_TIME", "VISITING"]}
              />
            </div>
          </div>

          <div>
            {/* ADDRESS */}
            <h5 className="fw-bold mb-3">
              <FaMapMarkerAlt className="me-2" /> Address
            </h5>
            <div className="row g-3 mb-4">
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
              <Input
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            {/* DOCUMENTS */}
            <h5 className="fw-bold mb-3">
              <FaUpload className="me-2" /> Upload Documents
            </h5>
            <div className="row g-3 mb-4">
              <File label="Aadhar" name="aadhar" onChange={handleFile} />
              <File label="PAN" name="pan" onChange={handleFile} />
              <File
                label="Degree Certificate"
                name="degree"
                onChange={handleFile}
              />
              <File label="Photo" name="photo" onChange={handleFile} />
            </div>
          </div>

          <div>
            {/* DEPARTMENT */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Department</label>
                <select
                  className="form-select"
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">Course</label>
                <select
                  className="form-select"
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.department_id}
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center p-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/teachers")}
            >
              <FaArrowLeft className="me-1" /> Back
            </button>
            <button
              className="btn btn-success px-4 rounded-pill"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Teacher"}
            </button>
          </div>
        </div>
      </form>

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
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
          border-left: 4px solid #f44336;
          color: #f44336;
        }

        .erp-alert-success {
          background: rgba(76, 175, 80, 0.1);
          border-left: 4px solid #4caf50;
          color: #4caf50;
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

        .erp-col-12 {
          grid-column: span 12;
        }
        .erp-col-6 {
          grid-column: span 6;
        }
        .erp-col-4 {
          grid-column: span 4;
        }

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
          color: #f44336;
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
          border-color: #f44336 !important;
          background: rgba(244, 67, 54, 0.05);
        }

        .erp-select-error {
          border-color: #f44336 !important;
          background: rgba(244, 67, 54, 0.05)
            url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3e%3cpath fill='%23F44336' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e")
            no-repeat right 0.75rem center/8px 10px;
        }

        .erp-error-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #f44336;
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
          border-left-color: #2196f3;
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
          border-color: #f44336 !important;
          background: rgba(244, 67, 54, 0.05);
        }

        .employee-id-display.generating {
          border-color: #2196f3;
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
          color: #2196f3;
          font-size: 1.2rem;
          animation: spin 1s linear infinite;
        }

        .employee-id-error {
          margin-top: 0.5rem;
        }

        .employee-id-hint {
          background: #e8f5e9;
          border-left-color: #4caf50;
          margin-top: 0.75rem;
        }

        /* ANIMATIONS */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
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

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
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

/* ================= REUSABLE INPUTS ================= */

function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input className="form-control" {...props} required />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div className="col-md-4">
      <label className="form-label fw-semibold">{label}</label>
      <select className="form-select" {...props}>
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function File({ label, ...props }) {
  return (
    <div className="col-md-3">
      <label className="form-label fw-semibold">{label}</label>
      <input type="file" className="form-control" {...props} />
    </div>
  );
}
