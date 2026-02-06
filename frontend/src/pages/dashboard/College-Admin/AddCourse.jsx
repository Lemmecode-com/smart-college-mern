import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaSave,
  FaArrowLeft,
  FaLayerGroup,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaUsers,
  FaClock,
  FaAward
} from "react-icons/fa";

export default function AddCourse() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    department_id: "",
    name: "",
    code: "",
    type: "THEORY",
    status: "ACTIVE",
    programLevel: "UG",
    semester: "",
    credits: "",
    maxStudents: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch {
        setDepartments([]);
      } finally {
        setLoadingDeps(false);
      }
    };

    fetchDepartments();
  }, []);

  /* ================= AUTO-GENERATE COURSE CODE ================= */
  useEffect(() => {
    if (formData.department_id && formData.name) {
      const selectedDept = departments.find(
        (dep) => dep._id === formData.department_id
      );

      if (selectedDept) {
        // Get first 3 letters of department name
        const deptPrefix = selectedDept.name
          .replace(/\s+/g, "")
          .substring(0, 3)
          .toUpperCase();

        // Get first 2 letters of course name
        const coursePrefix = formData.name
          .replace(/\s+/g, "")
          .substring(0, 2)
          .toUpperCase();

        // Generate code: DEPT-CRSE
        const generatedCode = `${deptPrefix}-${coursePrefix}`;

        setFormData((prev) => ({
          ...prev,
          code: generatedCode
        }));

        setShowCodePreview(true);
        setTimeout(() => setShowCodePreview(false), 2000);
      }
    }
  }, [formData.department_id, formData.name, departments]);

  /* ================= HANDLER ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Reset code when department or name changes
    if (name === "department_id" || name === "name") {
      setFormData((prev) => ({
        ...prev,
        code: ""
      }));
    }
  };

  const handleDepartmentClick = () => {
    setDropdownOpen(true);
    setTimeout(() => setDropdownOpen(false), 500);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.department_id) {
      setError("Please select a department");
      return;
    }

    if (!formData.name.trim()) {
      setError("Please enter course name");
      return;
    }

    if (!formData.semester || !formData.credits || !formData.maxStudents) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/courses", {
        department_id: formData.department_id,
        name: formData.name.trim(),
        code: formData.code,
        type: formData.type,
        status: formData.status,
        programLevel: formData.programLevel,
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        maxStudents: Number(formData.maxStudents)
      });

      setSuccess(true);

      setTimeout(() => {
        navigate("/courses");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to create course. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOADING ================= */
  if (loadingDeps) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <FaSpinner className="spin-icon text-primary mb-3" size={48} />
          <h5>Loading departments...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* HEADER */}
      <div className="header-section mb-4">
        <div className="d-flex align-items-center justify-content-between">
          <div className="header-content">
            <h2 className="header-title">
              <FaBookOpen className="header-icon me-2" />
              Add New Course
            </h2>
            <p className="header-subtitle mb-0">
              Create and manage academic courses
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate("/courses")}
          >
            <FaArrowLeft className="me-1" />
            Back to Courses
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show animate-alert" role="alert">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" size={20} />
            <div>{error}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setError("")}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show animate-alert" role="alert">
          <div className="d-flex align-items-center">
            <FaCheckCircle className="me-2" size={20} />
            <div>Course created successfully! Redirecting...</div>
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="form-container">
        <form onSubmit={handleSubmit} className="form-wrapper">
          <div className="form-header">
            <h5 className="mb-0">
              <FaGraduationCap className="me-2 text-primary" />
              Course Details
            </h5>
          </div>

          <div className="form-body">
            <div className="row g-4">
              {/* DEPARTMENT DROPDOWN */}
              <div className="col-12">
                <div className="form-group">
                  <label className="form-label">
                    <FaLayerGroup className="me-2 label-icon" />
                    Select Department <span className="text-danger">*</span>
                  </label>
                  <div className={`dropdown-container ${dropdownOpen ? 'dropdown-open' : ''}`}>
                    <select
                      className="form-select form-control-lg"
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleChange}
                      onClick={handleDepartmentClick}
                      required
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dep) => (
                        <option key={dep._id} value={dep._id}>
                          {dep.name} {dep.code && `(${dep.code})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* COURSE NAME */}
              <div className="col-md-8">
                <div className="form-group">
                  <label className="form-label">
                    <FaChalkboardTeacher className="me-2 label-icon" />
                    Course Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter course name (e.g., Computer Science)"
                    required
                  />
                </div>
              </div>

              {/* AUTO-GENERATED CODE */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">
                    <FaAward className="me-2 label-icon" />
                    Course Code
                  </label>
                  <div className={`code-preview ${showCodePreview ? 'code-blink' : ''}`}>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      name="code"
                      value={formData.code}
                      readOnly
                      placeholder="Auto-generated"
                    />
                    {formData.code && (
                      <span className="code-badge">
                        Auto
                      </span>
                    )}
                  </div>
                  <small className="text-muted">
                    Auto-generated from department and course name
                  </small>
                </div>
              </div>

              {/* COURSE TYPE */}
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">
                    <FaUsers className="me-2 label-icon" />
                    Course Type <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-control-lg"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  >
                    <option value="THEORY">Theory</option>
                    <option value="PRACTICAL">Practical</option>
                    <option value="BOTH">Both Theory & Practical</option>
                  </select>
                </div>
              </div>

              {/* PROGRAM LEVEL */}
              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">
                    <FaGraduationCap className="me-2 label-icon" />
                    Program Level <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-control-lg"
                    name="programLevel"
                    value={formData.programLevel}
                    onChange={handleChange}
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="PHD">PhD</option>
                  </select>
                </div>
              </div>

              {/* SEMESTER */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">
                    <FaClock className="me-2 label-icon" />
                    Semester <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    placeholder="e.g., 1"
                    min="1"
                    max="10"
                    required
                  />
                </div>
              </div>

              {/* CREDITS */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">
                    <FaAward className="me-2 label-icon" />
                    Credits <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    name="credits"
                    value={formData.credits}
                    onChange={handleChange}
                    placeholder="e.g., 4"
                    min="1"
                    max="10"
                    required
                  />
                </div>
              </div>

              {/* MAX STUDENTS */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">
                    <FaUsers className="me-2 label-icon" />
                    Max Students <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    name="maxStudents"
                    value={formData.maxStudents}
                    onChange={handleChange}
                    placeholder="e.g., 60"
                    min="1"
                    max="200"
                    required
                  />
                </div>
              </div>

              {/* STATUS */}
              <div className="col-12">
                <div className="form-group">
                  <label className="form-label">
                    Status <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-control-lg"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-footer">
            <div className="d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-secondary px-4"
                onClick={() => navigate("/courses")}
                disabled={loading}
              >
                <FaArrowLeft className="me-1" />
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-lg px-5 shadow"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="spin-icon me-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FaSave className="me-2" />
                    Create Course
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .header-section {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(26, 75, 109, 0.3);
          color: white;
          animation: slideDown 0.6s ease;
        }

        .header-title {
          font-weight: 700;
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }

        .header-icon {
          animation: blink 2s infinite;
        }

        .header-subtitle {
          opacity: 0.85;
          font-size: 1rem;
        }

        .form-container {
          animation: fadeIn 0.8s ease;
        }

        .form-wrapper {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .form-header {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          padding: 1.5rem 2rem;
          color: white;
          border-bottom: 3px solid rgba(255, 255, 255, 0.2);
        }

        .form-body {
          padding: 2.5rem;
        }

        .form-footer {
          background: #f8f9fa;
          padding: 1.5rem 2.5rem;
          border-top: 1px solid #e9ecef;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
        }

        .label-icon {
          color: #1a4b6d;
        }

        .form-control,
        .form-select {
          border: 2px solid #e9ecef;
          border-radius: 10px;
          padding: 0.75rem 1.25rem;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.25);
          transform: translateY(-2px);
        }

        .dropdown-container {
          position: relative;
          transition: all 0.3s ease;
        }

        .dropdown-open {
          animation: dropdownBounce 0.5s ease;
        }

        .code-preview {
          position: relative;
        }

        .code-blink {
          animation: codeBlink 0.5s ease;
        }

        .code-badge {
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
          animation: badgeFloat 2s ease-in-out infinite;
        }

        .alert {
          border-radius: 12px;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .animate-alert {
          animation: slideIn 0.5s ease;
        }

        /* ANIMATIONS */
        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
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
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes dropdownBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        @keyframes codeBlink {
          0%, 100% { box-shadow: 0 0 0 0 rgba(26, 75, 109, 0.2); }
          50% { box-shadow: 0 0 0 8px rgba(26, 75, 109, 0.1); }
        }

        @keyframes badgeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        /* HOVER EFFECTS */
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.4);
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .header-section {
            padding: 1.5rem;
          }

          .header-title {
            font-size: 1.5rem;
          }

          .form-body {
            padding: 1.5rem;
          }

          .form-footer {
            padding: 1rem 1.5rem;
            flex-direction: column;
            gap: 1rem;
          }

          .form-footer .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}