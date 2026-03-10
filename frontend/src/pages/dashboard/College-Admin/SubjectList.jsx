import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";

import {
  FaBook,
  FaTrash,
  FaEdit,
  FaLayerGroup,
  FaAward,
  FaChalkboardTeacher,
  FaSearch,
  FaFilter,
  FaPlus,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaUsers,
  FaGraduationCap,
  FaChevronDown,
  FaChevronUp,
  FaEye
} from "react-icons/fa";

export default function SubjectList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [searchTerm, setSearchTerm] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        // Handle different API response formats
        const departmentsData = Array.isArray(res.data) ? res.data :
                                Array.isArray(res.data.departments) ? res.data.departments :
                                Array.isArray(res.data.data) ? res.data.data : [];
        setDepartments(departmentsData);
      } catch (err) {
        setError("Failed to load departments. Please try again.");
        console.error("Departments fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  /* ================= FETCH COURSES BY DEPARTMENT ================= */
  const fetchCourses = async (deptId) => {
    try {
      const res = await api.get(`/courses/department/${deptId}`);
      // Handle different API response formats
      const coursesData = Array.isArray(res.data) ? res.data : 
                          Array.isArray(res.data.courses) ? res.data.courses : 
                          Array.isArray(res.data.data) ? res.data.data : [];
      setCourses(coursesData);
      setSelectedCourse("");
      setSubjects([]);
    } catch (err) {
      setError("Failed to load courses. Please try again.");
      console.error("Courses fetch error:", err);
      setCourses([]);
    }
  };

  /* ================= FETCH SUBJECTS BY COURSE ================= */
  const fetchSubjects = async (courseId) => {
    setLoadingSubjects(true);
    setError(null);
    try {
      const res = await api.get(`/subjects/course/${courseId}`);
      // Handle different API response formats
      const subjectsData = Array.isArray(res.data) ? res.data :
                           Array.isArray(res.data.subjects) ? res.data.subjects :
                           Array.isArray(res.data.data) ? res.data.data : [];
      setSubjects(subjectsData);
    } catch (err) {
      setError("Failed to load subjects. Please try again.");
      console.error("Subjects fetch error:", err);
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  /* ================= SORTING ================= */
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...subjects].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setSubjects(sorted);
  };

  /* ================= FILTERING ================= */
  const getFilteredSubjects = () => {
    return subjects.filter(subject => 
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.teacher_id?.name && subject.teacher_id.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  /* ================= DELETE SUBJECT ================= */
  const handleDeleteClick = (subject) => {
    setSubjectToDelete(subject);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;

    try {
      await api.delete(`/subjects/${subjectToDelete._id}`);
      setSubjects(subjects.filter(s => s._id !== subjectToDelete._id));
      setShowDeleteModal(false);
      setSubjectToDelete(null);
      setError(null);
    } catch (err) {
      setError("Failed to delete subject. Please try again.");
      console.error("Delete subject error:", err);
    }
  };

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-table">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-cell skeleton-text long"></div>
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-text medium"></div>
          <div className="skeleton-cell skeleton-badge"></div>
          <div className="skeleton-cell skeleton-actions">
            <div className="skeleton-action"></div>
            <div className="skeleton-action"></div>
          </div>
        </div>
      ))}
    </div>
  );

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="erp-error-container">
        <div className="erp-error-icon">
          <FaExclamationTriangle />
        </div>
        <h3>Oops! Something went wrong</h3>
        <p>{error}</p>
        <button 
          className="erp-btn erp-btn-primary" 
          onClick={() => window.location.reload()}
        >
          <FaSyncAlt className="erp-btn-icon" />
          Refresh Page
        </button>
      </div>
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading departments..." />;
  }

  const filteredSubjects = getFilteredSubjects();
  const selectedDeptName = Array.isArray(departments) ? departments.find(d => d._id === selectedDepartment)?.name || "Select Department" : "Select Department";
  const selectedCourseName = Array.isArray(courses) ? courses.find(c => c._id === selectedCourse)?.name || "Select Course" : "Select Course";

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Subject Management" }
        ]}
      />

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaBook />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Subject Management</h1>
            <p className="erp-page-subtitle">
              Manage academic subjects by department and course
            </p>
          </div>
        </div>
        <div className="erp-header-actions">
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate("/dashboard")}
          >
            <FaArrowLeft className="erp-btn-icon" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* FILTERS CARD */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaFilter className="erp-card-icon" />
            Filter Subjects
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="filter-grid">
            <div className="filter-group">
              <label className="filter-label">
                <FaLayerGroup className="filter-icon" />
                Department
              </label>
              <div className="filter-select-wrapper">
                <select
                  className="filter-select"
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedCourse("");
                    setSubjects([]);
                    if (e.target.value) fetchCourses(e.target.value);
                  }}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} {dept.code && `(${dept.code})`}
                    </option>
                  ))}
                </select>
                <div className="filter-select-arrow">
                  <FaChevronDown />
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <FaAward className="filter-icon" />
                Course
              </label>
              <div className="filter-select-wrapper">
                <select
                  className="filter-select"
                  value={selectedCourse}
                  disabled={!selectedDepartment}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    if (e.target.value) fetchSubjects(e.target.value);
                  }}
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
                <div className="filter-select-arrow">
                  <FaChevronDown />
                </div>
              </div>
            </div>

            {selectedCourse && (
              <div className="filter-actions">
                <button
                  className="add-subject-btn"
                  onClick={() => navigate(`/subjects/add?courseId=${selectedCourse}`)}
                >
                  <FaPlus className="erp-btn-icon" />
                  <span>Add Subject</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUBJECTS SECTION */}
      {selectedCourse && (
        <div className="erp-card animate-fade-in">
          <div className="erp-card-header">
            <div className="header-left">
              <h3>
                <FaBook className="erp-card-icon" />
                {selectedCourseName} Subjects
              </h3>
              <span className="subject-count">
                {filteredSubjects.length} {filteredSubjects.length === 1 ? "Subject" : "Subjects"}
              </span>
            </div>
            <div className="header-right">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="erp-card-body">
            {/* TABLE */}
            <div className="table-container">
              {loadingSubjects ? (
                renderSkeleton()
              ) : filteredSubjects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <FaBook />
                  </div>
                  <h3>No Subjects Found</h3>
                  <p className="empty-description">
                    {searchTerm 
                      ? "No subjects match your search criteria." 
                      : `No subjects found for ${selectedCourseName}.`}
                  </p>
                  {!searchTerm && (
                    <button
                      className="add-subject-btn large"
                      onClick={() => navigate(`/subjects/add?courseId=${selectedCourse}`)}
                    >
                      <FaPlus className="erp-btn-icon" />
                      Add Your First Subject
                    </button>
                  )}
                </div>
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')}>
                        Subject Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('code')}>
                        Code {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('semester')}>
                        Semester {sortConfig.key === 'semester' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('credits')}>
                        Credits {sortConfig.key === 'credits' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th>Teacher</th>
                      <th onClick={() => handleSort('status')}>
                        Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((subject) => (
                      <tr key={subject._id} className="table-row">
                        <td>
                          <div className="subject-name">
                            <div className="subject-icon">
                              <FaGraduationCap />
                            </div>
                            <div className="subject-details">
                              <div className="subject-title">{subject.name}</div>
                              <div className="subject-meta">
                                {subject.course_id?.name && (
                                  <>
                                    <span className="course-badge">{subject.course_id.name}</span>
                                    <span className="dept-badge">{selectedDeptName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="subject-code-badge">{subject.code}</span>
                        </td>
                        <td>
                          <span className="semester-badge">
                            <FaClock className="semester-icon" />
                            Sem {subject.semester}
                          </span>
                        </td>
                        <td>
                          <span className="credits-badge">
                            <FaAward className="credits-icon" />
                            {subject.credits}
                          </span>
                        </td>
                        <td>
                          {subject.teacher_id?.name ? (
                            <div className="teacher-info">
                              <div className="teacher-avatar">
                                {subject.teacher_id.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="teacher-details">
                                <div className="teacher-name">{subject.teacher_id.name}</div>
                                <div className="teacher-role">{subject.teacher_id.designation || "Faculty"}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="not-assigned">Not Assigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge status-${subject.status?.toLowerCase() || 'inactive'}`}>
                            {subject.status || "INACTIVE"}
                          </span>
                        </td>
                        <td className="action-cell">
                          <div className="action-buttons">
                            <button 
                              className="action-btn view-btn"
                              title="View Details"
                              onClick={() => navigate(`/subjects/view/${subject._id}`)}
                            >
                              <FaEye />
                            </button>
                            <button 
                              className="action-btn edit-btn"
                              title="Edit Subject"
                              onClick={() => navigate(`/subjects/edit/${subject._id}`)}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="action-btn delete-btn"
                              title="Delete Subject"
                              onClick={() => handleDeleteClick(subject)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && subjectToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Subject</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-warning">
                <FaExclamationTriangle className="warning-icon" />
                <div className="warning-text">
                  <h4>Are you sure you want to delete this subject?</h4>
                  <p>This action cannot be undone. All related data will be permanently deleted.</p>
                </div>
              </div>
              <div className="subject-preview">
                <div className="preview-item">
                  <span className="preview-label">Subject Name:</span>
                  <span className="preview-value">{subjectToDelete.name}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Subject Code:</span>
                  <span className="preview-value">{subjectToDelete.code}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Course:</span>
                  <span className="preview-value">{selectedCourseName}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Department:</span>
                  <span className="preview-value">{selectedDeptName}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="erp-btn erp-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="erp-btn erp-btn-danger"
                onClick={confirmDelete}
              >
                <FaTrash className="erp-btn-icon" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        /* CSS Custom Properties for consistent theming */
        :root {
          --sidebar-primary: #0f3a4a;
          --sidebar-secondary: #0c2d3a;
          --sidebar-accent: #3db5e6;
          --sidebar-accent-light: #4fc3f7;
          --sidebar-text: #e6f2f5;
          --sidebar-hover: rgba(61, 181, 230, 0.15);
          --sidebar-active: rgba(61, 181, 230, 0.2);
          --card-shadow: 0 4px 20px rgba(15, 58, 74, 0.08);
          --card-hover-shadow: 0 8px 30px rgba(15, 58, 74, 0.12);
        }

        .erp-container {
          padding: 1.5rem;
          background: linear-gradient(180deg, #f0f4f8 0%, #e8eef5 100%);
          min-height: 100vh;
          animation: fadeIn 0.6s ease;
        }

        .erp-page-header {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 50%, #3db5e6 100%);
          padding: 1.75rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 32px rgba(15, 58, 74, 0.4);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.6s ease;
          position: relative;
          overflow: hidden;
        }

        .erp-page-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(61, 181, 230, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .erp-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          position: relative;
          z-index: 1;
        }

        .erp-header-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.25) 0%, rgba(79, 195, 247, 0.15) 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .erp-page-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .erp-page-subtitle {
          margin: 0.375rem 0 0 0;
          opacity: 0.9;
          font-size: 1rem;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .erp-header-actions .erp-btn {
          background: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 1;
        }

        .erp-header-actions .erp-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(61, 181, 230, 0.5);
        }

        .erp-header-actions .erp-btn:active {
          transform: translateY(-1px);
        }
        
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: var(--card-shadow);
          margin-bottom: 1.5rem;
          overflow: hidden;
          animation: fadeIn 0.6s ease;
          border: 1px solid rgba(15, 58, 74, 0.08);
          transition: all 0.3s ease;
        }

        .erp-card:hover {
          box-shadow: var(--card-hover-shadow);
          transform: translateY(-2px);
        }

        .erp-card-header {
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
          border-bottom: 2px solid rgba(61, 181, 230, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 700;
          color: #0f3a4a;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .erp-card-icon {
          color: #3db5e6;
          font-size: 1.25rem;
        }

        .erp-card-body {
          padding: 1.75rem;
        }
        
        /* FILTERS */
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          position: relative;
        }

        .filter-label {
          font-weight: 600;
          color: #0f3a4a;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.25rem 0;
        }

        .filter-icon {
          color: #3db5e6;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .filter-select-wrapper {
          position: relative;
          width: 100%;
        }

        .filter-select {
          width: 100%;
          padding: 0.875rem 1.25rem;
          padding-right: 2.5rem;
          border: 2px solid #e0e8f0;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 500;
          color: #2c3e50;
          background: white;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
          appearance: none;
        }

        .filter-select:hover {
          border-color: #3db5e6;
        }

        .filter-select:focus {
          border-color: #3db5e6;
          box-shadow: 0 0 0 0.25rem rgba(61, 181, 230, 0.15);
        }

        .filter-select:disabled {
          background: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
          border-color: #e9ecef;
        }

        .filter-select-arrow {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #3db5e6;
          pointer-events: none;
          font-size: 0.875rem;
          transition: transform 0.3s ease, color 0.3s ease;
          z-index: 1;
        }

        .filter-select-wrapper:hover .filter-select-arrow {
          transform: translateY(-50%) scale(1.1);
          color: #0f3a4a;
        }

        .filter-actions {
          display: flex;
          align-items: center;
        }

        /* ADD SUBJECT BUTTON - Enhanced Design */
        .add-subject-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.4);
          position: relative;
          overflow: hidden;
          text-transform: none;
          letter-spacing: 0.3px;
        }

        .add-subject-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .add-subject-btn:hover::before {
          left: 100%;
        }

        .add-subject-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 25px rgba(61, 181, 230, 0.55);
          background: linear-gradient(135deg, #4fc3f7 0%, #0c2d3a 100%);
        }

        .add-subject-btn:active {
          transform: translateY(-1px) scale(1);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.35);
        }

        .add-subject-btn .erp-btn-icon {
          font-size: 1.1rem;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .add-subject-btn:hover .erp-btn-icon {
          transform: rotate(90deg) scale(1.1);
        }

        /* Add Subject Button - Large Variant (for empty state) */
        .add-subject-btn.large {
          padding: 1.125rem 2.5rem;
          font-size: 1.1rem;
          border-radius: 14px;
        }
        
        /* HEADER RIGHT SECTION */
        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .subject-count {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(79, 195, 247, 0.1) 100%);
          color: #0f3a4a;
          padding: 0.375rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 700;
          border: 1px solid rgba(61, 181, 230, 0.3);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .search-box {
          position: relative;
          min-width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #3db5e6;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 2px solid #e0e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
        }

        .search-box input:hover {
          border-color: #3db5e6;
        }

        .search-box input:focus {
          border-color: #3db5e6;
          box-shadow: 0 0 0 0.25rem rgba(61, 181, 230, 0.15);
        }

        .search-box input:focus + .search-icon {
          color: #0f3a4a;
        }
        
        /* TABLE */
        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(15, 58, 74, 0.08);
          background: white;
        }

        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .erp-table thead {
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          color: white;
          position: relative;
        }

        .erp-table thead::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #3db5e6 0%, transparent 100%);
        }

        .erp-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          user-select: none;
          position: relative;
          transition: all 0.3s ease;
        }

        .erp-table th:hover {
          background: rgba(61, 181, 230, 0.15);
        }

        .erp-table th::after {
          content: "";
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
        }

        .erp-table tbody tr {
          border-bottom: 1px solid #f0f4f8;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .erp-table tbody tr:hover {
          background: linear-gradient(90deg, rgba(61, 181, 230, 0.08) 0%, rgba(79, 195, 247, 0.05) 100%);
          transform: scale(1.005);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.1);
        }

        .erp-table td {
          padding: 1rem 1.25rem;
          color: #2c3e50;
          font-weight: 500;
        }
        
        .subject-name {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .subject-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .subject-details {
          flex: 1;
        }

        .subject-title {
          font-weight: 700;
          color: #0f3a4a;
          margin-bottom: 0.25rem;
        }

        .subject-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .course-badge,
        .dept-badge {
          font-size: 0.75rem;
          color: #0f3a4a;
          background: rgba(61, 181, 230, 0.1);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .dept-badge {
          background: rgba(15, 58, 74, 0.08);
          color: #0f3a4a;
        }

        .subject-code-badge {
          display: inline-block;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(79, 195, 247, 0.1) 100%);
          color: #0f3a4a;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.9rem;
          border: 1px solid rgba(61, 181, 230, 0.2);
        }

        .semester-badge,
        .credits-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
          padding: 0.375rem 0.875rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
          border: 1px solid rgba(61, 181, 230, 0.15);
        }

        .semester-icon,
        .credits-icon {
          font-size: 0.9rem;
          color: #3db5e6;
        }

        .teacher-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .teacher-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .teacher-details {
          flex: 1;
        }

        .teacher-name {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 0.95rem;
        }

        .teacher-role {
          font-size: 0.85rem;
          color: #666;
        }

        .not-assigned {
          color: #9e9e9e;
          font-style: italic;
        }

        .status-badge {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
          border: 1px solid;
        }

        .status-active {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(56, 142, 60, 0.1) 100%);
          color: #4CAF50;
          border-color: rgba(76, 175, 80, 0.3);
        }

        .status-inactive {
          background: rgba(158, 158, 158, 0.1);
          color: #9e9e9e;
          border-color: rgba(158, 158, 158, 0.2);
        }
        
        .action-cell {
          text-align: center;
          min-width: 150px;
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: white;
          font-size: 0.9rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .view-btn {
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
        }

        .edit-btn {
          background: linear-gradient(135deg, #ffb74d 0%, #f57c00 100%);
        }

        .delete-btn {
          background: linear-gradient(135deg, #ef5350 0%, #c62828 100%);
        }

        .action-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          filter: brightness(1.1);
        }

        .action-btn:active {
          transform: translateY(-1px) scale(1.02);
        }
        
        /* SKELETON LOADING */
        .skeleton-table {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .skeleton-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 2fr 1fr 1fr;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f0f4f8;
        }

        .skeleton-cell {
          height: 24px;
          background: linear-gradient(135deg, #e8eef5 0%, #d0d9e3 100%);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }

        .skeleton-cell::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(61, 181, 230, 0.2), transparent);
          animation: skeleton-loading 1.5s infinite;
        }

        .skeleton-text.long { width: 80%; }
        .skeleton-text.medium { width: 60%; }
        .skeleton-text.short { width: 40%; }
        .skeleton-badge { width: 50%; height: 20px; }
        .skeleton-actions { display: flex; gap: 0.5rem; }
        .skeleton-action { width: 36px; height: 36px; border-radius: 10px; }

        @keyframes skeleton-loading {
          to { left: 100%; }
        }

        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #666;
        }

        .empty-icon {
          width: 90px;
          height: 90px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.15) 0%, rgba(15, 58, 74, 0.1) 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3db5e6;
          font-size: 2.75rem;
          box-shadow: 0 4px 20px rgba(61, 181, 230, 0.2);
        }

        .empty-state h3 {
          font-size: 1.75rem;
          color: #0f3a4a;
          margin-bottom: 0.75rem;
          font-weight: 700;
        }

        .empty-description {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          color: #666;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 58, 74, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          animation: fadeIn 0.3s ease;
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          width: 90%;
          max-width: 550px;
          box-shadow: 0 20px 60px rgba(15, 58, 74, 0.4);
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(61, 181, 230, 0.2);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 2px solid rgba(61, 181, 230, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
          border-radius: 20px 20px 0 0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #0f3a4a;
          font-weight: 700;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #666;
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .modal-close:hover {
          background: rgba(61, 181, 230, 0.1);
          color: #3db5e6;
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 1.75rem;
        }

        .modal-warning {
          display: flex;
          gap: 1rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 183, 77, 0.08) 100%);
          border-radius: 12px;
          margin-bottom: 1.5rem;
          border-left: 4px solid #ffb74d;
        }

        .warning-icon {
          font-size: 2rem;
          color: #ffb74d;
          flex-shrink: 0;
        }

        .warning-text h4 {
          margin: 0 0 0.5rem 0;
          color: #0f3a4a;
          font-size: 1.25rem;
        }

        .warning-text p {
          margin: 0;
          color: #666;
          line-height: 1.6;
        }

        .subject-preview {
          background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid rgba(61, 181, 230, 0.15);
        }

        .preview-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(61, 181, 230, 0.1);
        }

        .preview-item:last-child {
          border-bottom: none;
        }

        .preview-label {
          font-weight: 600;
          color: #666;
        }

        .preview-value {
          font-weight: 700;
          color: #0f3a4a;
        }
        
        .modal-footer {
          padding: 1.25rem 1.75rem;
          border-top: 2px solid rgba(61, 181, 230, 0.1);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          background: linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%);
          border-radius: 0 0 20px 20px;
        }

        .erp-btn-danger {
          background: linear-gradient(135deg, #ef5350 0%, #c62828 100%);
          border: none;
        }

        .erp-btn-danger:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(239, 83, 80, 0.4);
        }

        /* ERROR CONTAINER */
        .erp-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(15, 58, 74, 0.1);
          margin: 2rem;
          border: 1px solid rgba(61, 181, 230, 0.1);
        }

        .erp-error-icon {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(239, 83, 80, 0.15) 0%, rgba(198, 40, 40, 0.1) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #ef5350;
          font-size: 3rem;
          box-shadow: 0 4px 20px rgba(239, 83, 80, 0.2);
        }

        .erp-error-container h3 {
          font-size: 1.8rem;
          color: #0f3a4a;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .erp-error-container p {
          color: #666;
          font-size: 1.1rem;
          max-width: 600px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
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
          border-top-color: #3db5e6;
          animation: spin 1s linear infinite;
        }

        .spinner-ring:nth-child(2) {
          border-top-color: #0f3a4a;
          animation-delay: 0.1s;
        }

        .spinner-ring:nth-child(3) {
          border-top-color: rgba(61, 181, 230, 0.5);
          animation-delay: 0.2s;
        }

        .erp-loading-text {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f3a4a;
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

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* RESPONSIVE DESIGN */
        @media (max-width: 992px) {
          .filter-grid {
            grid-template-columns: 1fr;
          }
          
          .filter-actions {
            width: 100%;
          }
          
          .erp-btn {
            width: 100%;
            justify-content: center;
          }
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
            margin-top: 0.5rem;
          }
          
          .erp-header-actions .erp-btn {
            width: 100%;
            justify-content: center;
          }
          
          .erp-card-body {
            padding: 1.25rem;
          }
          
          .erp-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .header-right {
            width: 100%;
          }
          
          .search-box {
            width: 100%;
            min-width: auto;
          }
          
          .erp-table {
            min-width: 700px;
          }
          
          .action-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .action-btn {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          
          .modal-content {
            width: 95%;
            margin: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .erp-table {
            min-width: 600px;
          }
          
          .subject-name {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .subject-meta {
            margin-left: 2.5rem;
          }
          
          .erp-card-header h3 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

/* CUSTOM ICONS */
const FaTimes = ({ size = 20, color = "#666" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const FaSyncAlt = ({ size = 16, color = "#3db5e6" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);