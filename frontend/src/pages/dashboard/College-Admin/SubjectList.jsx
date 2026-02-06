import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

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
  FaSpinner,
  FaInfoCircle,
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
        setDepartments(res.data || []);
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
      setCourses(res.data || []);
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
      setSubjects(res.data || []);
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

  const filteredSubjects = getFilteredSubjects();
  const selectedDeptName = departments.find(d => d._id === selectedDepartment)?.name || "Select Department";
  const selectedCourseName = courses.find(c => c._id === selectedCourse)?.name || "Select Course";

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item active" aria-current="page">Subject Management</li>
        </ol>
      </nav>

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
                  className="erp-btn erp-btn-primary"
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
                      className="erp-btn erp-btn-primary empty-action"
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
        
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
          animation: fadeIn 0.6s ease;
        }
        
        .erp-card-header {
          padding: 1.5rem 1.75rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .erp-card-header h3 {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 700;
          color: #1a4b6d;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .erp-card-icon {
          color: #1a4b6d;
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
          gap: 0.5rem;
        }
        
        .filter-label {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .filter-icon {
          color: #1a4b6d;
          font-size: 1rem;
        }
        
        .filter-select-wrapper {
          position: relative;
        }
        
        .filter-select {
          width: 100%;
          padding: 0.875rem 1.25rem;
          padding-right: 2.5rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 500;
          color: #2c3e50;
          background: white;
          transition: all 0.3s ease;
          outline: none;
          appearance: none;
        }
        
        .filter-select:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
        }
        
        .filter-select:disabled {
          background: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
        }
        
        .filter-select-arrow {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          pointer-events: none;
          font-size: 0.875rem;
        }
        
        .filter-actions {
          display: flex;
          align-items: center;
        }
        
        /* HEADER RIGHT SECTION */
        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .subject-count {
          background: rgba(26, 75, 109, 0.1);
          color: #1a4b6d;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
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
          color: #666;
          font-size: 1rem;
        }
        
        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }
        
        .search-box input:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
        }
        
        /* TABLE */
        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        
        .erp-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        
        .erp-table thead {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          color: white;
        }
        
        .erp-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          user-select: none;
          position: relative;
        }
        
        .erp-table th:hover {
          background: rgba(255, 255, 255, 0.1);
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
          border-bottom: 1px solid #f0f2f5;
          transition: all 0.2s ease;
        }
        
        .erp-table tbody tr:hover {
          background: #f8f9ff;
          transform: translateX(5px);
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
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        
        .subject-details {
          flex: 1;
        }
        
        .subject-title {
          font-weight: 600;
          color: #1a4b6d;
          margin-bottom: 0.25rem;
        }
        
        .subject-meta {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .course-badge,
        .dept-badge {
          font-size: 0.8rem;
          color: #666;
          background: #f0f2f5;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }
        
        .dept-badge {
          background: rgba(26, 75, 109, 0.08);
          color: #1a4b6d;
        }
        
        .subject-code-badge {
          display: inline-block;
          background: rgba(26, 75, 109, 0.1);
          color: #1a4b6d;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .semester-badge,
        .credits-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8f9fa;
          padding: 0.375rem 0.875rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
        }
        
        .semester-icon,
        .credits-icon {
          font-size: 0.9rem;
          color: #1a4b6d;
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
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        
        .teacher-details {
          flex: 1;
        }
        
        .teacher-name {
          font-weight: 600;
          color: #1a4b6d;
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
          font-weight: 600;
        }
        
        .status-active {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
        }
        
        .status-inactive {
          background: rgba(158, 158, 158, 0.1);
          color: #9e9e9e;
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
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
          font-size: 0.9rem;
        }
        
        .view-btn {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        }
        
        .edit-btn {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
        }
        
        .delete-btn {
          background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
        }
        
        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .action-btn:active {
          transform: translateY(0);
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
          border-bottom: 1px solid #f0f2f5;
        }
        
        .skeleton-cell {
          height: 24px;
          background: #f0f2f5;
          border-radius: 6px;
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
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: skeleton-loading 1.5s infinite;
        }
        
        .skeleton-text.long { width: 80%; }
        .skeleton-text.medium { width: 60%; }
        .skeleton-text.short { width: 40%; }
        .skeleton-badge { width: 50%; height: 20px; }
        .skeleton-actions { display: flex; gap: 0.5rem; }
        .skeleton-action { width: 36px; height: 36px; border-radius: 8px; }
        
        @keyframes skeleton-loading {
          to { left: 100%; }
        }
        
        /* EMPTY STATE */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }
        
        .empty-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(26, 75, 109, 0.1) 0%, rgba(15, 58, 74, 0.1) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a4b6d;
          font-size: 2.5rem;
        }
        
        .empty-state h3 {
          font-size: 1.75rem;
          color: #2c3e50;
          margin-bottom: 0.75rem;
        }
        
        .empty-description {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .empty-action {
          background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
          border: none;
          padding: 0.875rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(26, 75, 109, 0.4);
        }
        
        .empty-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(26, 75, 109, 0.5);
        }
        
        /* MODAL */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          animation: fadeIn 0.3s ease;
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 550px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.4s ease;
        }
        
        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #1a4b6d;
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
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .modal-close:hover {
          background: #f0f2f5;
          color: #1a4b6d;
        }
        
        .modal-body {
          padding: 1.75rem;
        }
        
        .modal-warning {
          display: flex;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 152, 0, 0.1);
          border-radius: 12px;
          margin-bottom: 1.5rem;
          border-left: 4px solid #FF9800;
        }
        
        .warning-icon {
          font-size: 2rem;
          color: #FF9800;
          flex-shrink: 0;
        }
        
        .warning-text h4 {
          margin: 0 0 0.5rem 0;
          color: #2c3e50;
          font-size: 1.25rem;
        }
        
        .warning-text p {
          margin: 0;
          color: #666;
          line-height: 1.5;
        }
        
        .subject-preview {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.25rem;
        }
        
        .preview-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #e9ecef;
        }
        
        .preview-item:last-child {
          border-bottom: none;
        }
        
        .preview-label {
          font-weight: 500;
          color: #666;
        }
        
        .preview-value {
          font-weight: 600;
          color: #1a4b6d;
        }
        
        .modal-footer {
          padding: 1.25rem 1.75rem;
          border-top: 1px solid #e9ecef;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        
        .erp-btn-danger {
          background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
          border: none;
        }
        
        .erp-btn-danger:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
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
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin: 2rem;
        }
        
        .erp-error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(244, 67, 54, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #F44336;
          font-size: 3rem;
        }
        
        .erp-error-container h3 {
          font-size: 1.8rem;
          color: #1a4b6d;
          margin-bottom: 1rem;
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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease;
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

const FaSyncAlt = ({ size = 16, color = "#1a4b6d" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);