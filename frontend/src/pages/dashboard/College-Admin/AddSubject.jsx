import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaUniversity,
  FaChalkboardTeacher,
  FaAward,
  FaClock,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaSave,
  FaSpinner,
  FaInfoCircle
} from "react-icons/fa";

export default function AddSubject() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    department_id: "",
    course_id: "",
    teacher_id: "",
    name: "",
    code: "",
    semester: "",
    credits: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  /* ================= LOAD DEPARTMENTS & TEACHERS ================= */
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [deptRes, teacherRes] = await Promise.all([
          api.get("/departments"),
          api.get("/teachers")
        ]);
        setDepartments(deptRes.data);
        setTeachers(teacherRes.data.filter(t => t.status === "ACTIVE"));
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setDepartments([]);
        setTeachers([]);
      } finally {
        setLoadingDeps(false);
      }
    };
    fetchInitial();
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    if (!formData.department_id) {
      setCourses([]);
      setFormData(prev => ({ ...prev, course_id: "" }));
      return;
    }

    const fetchCourses = async () => {
      try {
        const res = await api.get(`/courses/department/${formData.department_id}`);
        setCourses(res.data);
      } catch (err) {
        console.error("Failed to load courses:", err);
        setCourses([]);
      }
    };
    fetchCourses();
  }, [formData.department_id]);

  /* ================= AUTO-GENERATE SUBJECT CODE ================= */
  useEffect(() => {
    // Only generate code if course and subject name are selected AND code is empty
    if (formData.course_id && formData.name && !formData.code) {
      const selectedCourse = courses.find(c => c._id === formData.course_id);
      
      if (selectedCourse) {
        // Get first 2 letters of course name (cleaned)
        const coursePrefix = selectedCourse.name
          .replace(/\s+/g, "")
          .substring(0, 2)
          .toUpperCase() || "XX";
        
        // Get first 2 letters of subject name (cleaned)
        const subjectPrefix = formData.name
          .replace(/\s+/g, "")
          .substring(0, 2)
          .toUpperCase() || "XX";
        
        // Generate code: CRS-SUBJ
        const generatedCode = `${coursePrefix}-${subjectPrefix}`;
        
        setFormData(prev => ({
          ...prev,
          code: generatedCode
        }));
        
        setShowCodePreview(true);
        setTimeout(() => setShowCodePreview(false), 1500);
      }
    }
  }, [formData.course_id, formData.name, courses]); // ✅ CRITICAL: Removed formData.code from dependencies

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const errors = {};
    
    if (!formData.department_id) errors.department_id = "Department is required";
    if (!formData.course_id) errors.course_id = "Course is required";
    if (!formData.teacher_id) errors.teacher_id = "Teacher is required";
    if (!formData.name.trim()) {
      errors.name = "Subject name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Subject name must be at least 3 characters";
    }
    if (!formData.semester) {
      errors.semester = "Semester is required";
    } else if (formData.semester < 1 || formData.semester > 10) {
      errors.semester = "Semester must be between 1 and 10";
    }
    if (!formData.credits) {
      errors.credits = "Credits are required";
    } else if (formData.credits < 1 || formData.credits > 10) {
      errors.credits = "Credits must be between 1 and 10";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    setFormTouched(true);
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Reset code when course or subject name changes
    if (name === "course_id" || name === "name") {
      setFormData(prev => ({
        ...prev,
        code: ""
      }));
    }
  };

  const handleDepartmentClick = () => {
    setDropdownOpen(true);
    setTimeout(() => setDropdownOpen(false), 500);
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
      await api.post("/subjects", {
        course_id: formData.course_id,
        name: formData.name.trim(),
        code: formData.code,
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        teacher_id: formData.teacher_id
      });
      
      setSuccess(true);
      setError("");
      
      // Reset form
      setFormData({
        department_id: "",
        course_id: "",
        teacher_id: "",
        name: "",
        code: "",
        semester: "",
        credits: ""
      });
      
      setTimeout(() => {
        navigate("/subjects/course/" + formData.course_id);
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || 
        "Failed to create subject. Please try again."
      );
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOADING ================= */
  if (loadingDeps) {
    return (
      <div className="erp-loading-container">
        <div className="erp-loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h4 className="erp-loading-text">Loading departments and teachers...</h4>
      </div>
    );
  }

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item"><a href="/subjects">Subjects</a></li>
          <li className="breadcrumb-item active" aria-current="page">Add Subject</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaBookOpen />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Add New Subject</h1>
            <p className="erp-page-subtitle">
              Create academic subjects for courses
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back</span>
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
            <strong>Success!</strong> Subject created successfully. Redirecting...
          </div>
        </div>
      )}

      {/* FORM CARD */}
      <div className="erp-form-card animate-fade-in">
        <div className="erp-form-header">
          <div className="erp-form-title">
            <FaBookOpen className="erp-form-icon" />
            <h3>Subject Details</h3>
          </div>
          <div className="erp-form-subtitle">
            Fill in all required fields marked with <span className="required">*</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="erp-form">
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaUniversity className="erp-section-icon" />
              Academic Hierarchy
            </h4>
            
            <div className="erp-row">
              {/* DEPARTMENT */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaUniversity className="erp-label-icon" />
                    Department <span className="required">*</span>
                  </label>
                  <div className={`erp-select-wrapper ${dropdownOpen ? 'erp-select-open' : ''}`}>
                    <select
                      className={`erp-select ${validationErrors.department_id ? 'erp-select-error' : ''}`}
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleChange}
                      onClick={handleDepartmentClick}
                      required
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} {dept.code && `(${dept.code})`}
                        </option>
                      ))}
                    </select>
                    <div className="erp-select-arrow">
                      <FaChevronDown />
                    </div>
                  </div>
                  {validationErrors.department_id && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.department_id}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Select the department offering this subject
                  </div>
                </div>
              </div>
              
              {/* COURSE */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaAward className="erp-label-icon" />
                    Course <span className="required">*</span>
                  </label>
                  <select
                    className={`erp-select ${validationErrors.course_id ? 'erp-select-error' : ''}`}
                    name="course_id"
                    value={formData.course_id}
                    onChange={handleChange}
                    required
                    disabled={!formData.department_id}
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                  {validationErrors.course_id && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.course_id}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Course must be selected before adding subjects
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="erp-form-section">
            <h4 className="erp-section-title">
              <FaChalkboardTeacher className="erp-section-icon" />
              Subject Information
            </h4>
            
            <div className="erp-row">
              {/* TEACHER */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaChalkboardTeacher className="erp-label-icon" />
                    Assigned Teacher <span className="required">*</span>
                  </label>
                  <select
                    className={`erp-select ${validationErrors.teacher_id ? 'erp-select-error' : ''}`}
                    name="teacher_id"
                    value={formData.teacher_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name} - {teacher.designation || "Faculty"}
                      </option>
                    ))}
                  </select>
                  {validationErrors.teacher_id && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.teacher_id}
                    </div>
                  )}
                  <div className="erp-hint-text">
                    <FaInfoCircle className="erp-hint-icon" />
                    Teacher responsible for this subject
                  </div>
                </div>
              </div>
              
              {/* SUBJECT NAME */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaBookOpen className="erp-label-icon" />
                    Subject Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`erp-input ${validationErrors.name ? 'erp-input-error' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Data Structures, Calculus"
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
                    Full name of the subject
                  </div>
                </div>
              </div>
              
              {/* AUTO-GENERATED CODE */}
              <div className="erp-col-6">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaAward className="erp-label-icon" />
                    Subject Code
                  </label>
                  <div className={`erp-code-wrapper ${showCodePreview ? 'erp-code-animate' : ''}`}>
                    <input
                      type="text"
                      className="erp-input erp-input-readonly"
                      name="code"
                      value={formData.code}
                      readOnly
                      placeholder="Auto-generated"
                    />
                    {formData.code && (
                      <span className="erp-code-badge">
                        <FaSyncAlt className="erp-badge-icon" />
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="erp-hint-text erp-hint-success">
                    <FaCheckCircle className="erp-hint-icon" />
                    Auto-generated from course and subject name (e.g., CS-DS)
                  </div>
                </div>
              </div>
              
              {/* SEMESTER */}
              <div className="erp-col-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaClock className="erp-label-icon" />
                    Semester <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className={`erp-input ${validationErrors.semester ? 'erp-input-error' : ''}`}
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    placeholder="1-10"
                    min="1"
                    max="10"
                    required
                  />
                  {validationErrors.semester && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.semester}
                    </div>
                  )}
                </div>
              </div>
              
              {/* CREDITS */}
              <div className="erp-col-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    <FaAward className="erp-label-icon" />
                    Credits <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className={`erp-input ${validationErrors.credits ? 'erp-input-error' : ''}`}
                    name="credits"
                    value={formData.credits}
                    onChange={handleChange}
                    placeholder="1-10"
                    min="1"
                    max="10"
                    required
                  />
                  {validationErrors.credits && (
                    <div className="erp-error-text">
                      <FaExclamationTriangle className="erp-error-icon" />
                      {validationErrors.credits}
                    </div>
                  )}
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
                    <span>Creating Subject...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="erp-btn-icon" />
                    <span>Create Subject</span>
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
        .erp-col-3 { grid-column: span 3; }
        
        @media (max-width: 768px) {
          .erp-col-12,
          .erp-col-6,
          .erp-col-3 {
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
        .erp-select {
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
        .erp-select:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
          transform: translateY(-1px);
        }
        
        .erp-input-error {
          border-color: #F44336 !important;
          background: rgba(244, 67, 54, 0.05);
        }
        
        .erp-input-readonly {
          background: #f8f9fa;
          cursor: not-allowed;
        }
        
        .erp-select-wrapper {
          position: relative;
        }
        
        .erp-select-arrow {
          position: absolute;
          right: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          pointer-events: none;
          transition: transform 0.3s ease;
        }
        
        .erp-select-open .erp-select-arrow {
          transform: translateY(-50%) rotate(180deg);
        }
        
        .erp-code-wrapper {
          position: relative;
        }
        
        .erp-code-badge {
          position: absolute;
          top: -10px;
          right: 10px;
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          padding: 0.375rem 1rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
          display: flex;
          align-items: center;
          gap: 0.375rem;
          animation: float 2s ease-in-out infinite;
        }
        
        .erp-code-animate {
          animation: codePulse 0.5s ease;
        }
        
        .erp-badge-icon {
          font-size: 0.75rem;
          animation: spin 2s linear infinite;
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
        
        .erp-hint-success {
          border-left-color: #4CAF50;
          color: #4CAF50;
        }
        
        .erp-hint-icon {
          font-size: 0.875rem;
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
        
        @keyframes codePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(26, 75, 109, 0); }
          50% { box-shadow: 0 0 0 8px rgba(26, 75, 109, 0.15); }
        }
        
        .erp-spin {
          animation: spin 1s linear infinite;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }
        
        .animate-slide-in {
          animation: slideIn 0.5s ease;
        }
        
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
          }
          
          .erp-header-actions .erp-btn {
            width: 100%;
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
        }
      `}</style>
    </div>
  );
}

/* CUSTOM ICONS */
const FaChevronDown = ({ size = 16, color = "#666" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);