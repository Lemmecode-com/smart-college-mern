import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaEdit,
  FaTrash,
  FaPlus,
  FaLayerGroup,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaEye,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaUpload,
  FaInfoCircle,
  FaClock,
  FaUsers,
  FaAward
} from "react-icons/fa";

export default function CourseList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    avgCredits: 0,
    totalCapacity: 0
  });

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch (err) {
        setError("Failed to load departments. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  /* ================= LOAD COURSES ================= */
  useEffect(() => {
    if (!selectedDepartment) {
      setCourses([]);
      updateStats([]);
      return;
    }

    const fetchCourses = async () => {
      setLoadingCourses(true);
      setError(null);
      try {
        const res = await api.get(`/courses/department/${selectedDepartment}`);
        setCourses(res.data);
        updateStats(res.data);
      } catch (err) {
        setError("Failed to load courses. Please try again.");
        console.error(err);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [selectedDepartment]);

  /* ================= STATS CALCULATION ================= */
  const updateStats = (courseList) => {
    const total = courseList.length;
    const active = courseList.filter(c => c.status === "ACTIVE").length;
    const inactive = total - active;
    const totalCredits = courseList.reduce((sum, c) => sum + (c.credits || 0), 0);
    const avgCredits = total > 0 ? (totalCredits / total).toFixed(1) : 0;
    const totalCapacity = courseList.reduce((sum, c) => sum + (c.maxStudents || 0), 0);

    setStats({
      total,
      active,
      inactive,
      avgCredits,
      totalCapacity
    });
  };

  /* ================= SORTING ================= */
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...courses].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setCourses(sorted);
  };

  /* ================= FILTERING ================= */
  const getFilteredCourses = () => {
    return courses
      .filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(course => 
        filterStatus === "ALL" || course.status === filterStatus
      );
  };

  /* ================= DELETE HANDLER ================= */
  const handleDeleteClick = (course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      await api.delete(`/courses/${courseToDelete._id}`);
      setCourses(courses.filter(c => c._id !== courseToDelete._id));
      updateStats(courses.filter(c => c._id !== courseToDelete._id));
      setShowDeleteModal(false);
      setCourseToDelete(null);
      
      // Show success toast
      setError(null);
    } catch (err) {
      setError("Failed to delete course. Please try again.");
      console.error(err);
    }
  };

  /* ================= EXPORT HANDLER ================= */
  const handleExport = () => {
    if (courses.length === 0) return;
    
    const headers = ["Name", "Code", "Type", "Status", "Semester", "Credits", "Max Students"];
    const csvContent = [
      headers.join(","),
      ...courses.map(course => 
        [
          course.name,
          course.code,
          course.type,
          course.status,
          course.semester,
          course.credits,
          course.maxStudents
        ].join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `courses_${selectedDepartment}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= LOADING SKELETON ================= */
  const renderSkeleton = () => (
    <div className="skeleton-container">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-text long"></div>
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-text medium"></div>
          <div className="skeleton-cell skeleton-badge"></div>
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-text short"></div>
          <div className="skeleton-cell skeleton-actions">
            <div className="skeleton-action"></div>
            <div className="skeleton-action"></div>
          </div>
        </div>
      ))}
    </div>
  );

  /* ================= EMPTY STATE ================= */
  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">
        <FaBookOpen />
      </div>
      <h3>No Courses Found</h3>
      <p className="empty-description">
        {selectedDepartment 
          ? "There are no courses in this department yet." 
          : "Please select a department to view courses"}
      </p>
      {selectedDepartment && (
        <button 
          className="btn btn-primary btn-lg empty-action"
          onClick={() => navigate("/courses/add")}
        >
          <FaPlus className="me-2" />
          Add Your First Course
        </button>
      )}
    </div>
  );

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <FaExclamationTriangle />
        </div>
        <h3>Oops! Something went wrong</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <FaSyncAlt className="me-2" />
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

  const filteredCourses = getFilteredCourses();
  const selectedDeptName = departments.find(d => d._id === selectedDepartment)?.name || "Select Department";

  return (
    <div className="erp-container">
      {/* BREADCRUMBS */}
      <nav aria-label="breadcrumb" className="erp-breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
          <li className="breadcrumb-item active" aria-current="page">Course Management</li>
        </ol>
      </nav>

      {/* HEADER */}
      <div className="erp-page-header">
        <div className="erp-header-content">
          <div className="erp-header-icon">
            <FaBookOpen />
          </div>
          <div className="erp-header-text">
            <h1 className="erp-page-title">Course Management</h1>
            <p className="erp-page-subtitle">
              Manage academic courses by department
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
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate("/courses/add")}
          >
            <FaPlus className="erp-btn-icon" />
            <span>Add New Course</span>
          </button>
        </div>
      </div>

      {/* DEPARTMENT SELECTION CARD */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-header">
          <h3>
            <FaLayerGroup className="erp-card-icon" />
            Select Department
          </h3>
        </div>
        <div className="erp-card-body">
          <div className="department-selector">
            <div className="department-select-wrapper">
              <select
                className="department-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">-- Select Department --</option>
                {departments.map((dep) => (
                  <option key={dep._id} value={dep._id}>
                    {dep.name} {dep.code && `(${dep.code})`}
                  </option>
                ))}
              </select>
              <div className="department-select-arrow">
                <FaChevronDown />
              </div>
            </div>
            <div className="department-stats">
              {selectedDepartment && (
                <>
                  <div className="stat-item">
                    <div className="stat-label">Total Courses</div>
                    <div className="stat-value">{stats.total}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Active</div>
                    <div className="stat-value" style={{color: '#4CAF50'}}>{stats.active}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Capacity</div>
                    <div className="stat-value">{stats.totalCapacity.toLocaleString()}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COURSES SECTION */}
      {selectedDepartment && (
        <div className="erp-card animate-fade-in">
          <div className="erp-card-header">
            <div className="header-left">
              <h3>
                <FaBookOpen className="erp-card-icon" />
                {selectedDeptName} Courses
              </h3>
              <span className="course-count">
                {stats.total} {stats.total === 1 ? "Course" : "Courses"}
              </span>
            </div>
            <div className="header-right">
              <div className="search-filter-group">
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <button className="filter-btn">
                    <FaFilter className="filter-icon" />
                    <span>Filter</span>
                    <FaChevronDown className="filter-arrow" />
                  </button>
                  <div className="filter-dropdown">
                    <div className="filter-section">
                      <label>Status</label>
                      <div className="filter-options">
                        {["ALL", "ACTIVE", "INACTIVE"].map(status => (
                          <label key={status} className="filter-option">
                            <input
                              type="radio"
                              name="status"
                              value={status}
                              checked={filterStatus === status}
                              onChange={(e) => setFilterStatus(e.target.value)}
                            />
                            <span>{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button className="erp-btn erp-btn-outline" onClick={handleExport}>
                  <FaDownload className="erp-btn-icon" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="erp-card-body">
            {/* STATS CARDS */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                  <FaBookOpen />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Total Courses</div>
                  <div className="stat-card-value">{stats.total}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
                  <FaCheckCircle />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Active Courses</div>
                  <div className="stat-card-value">{stats.active}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
                  <FaAward />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Avg. Credits</div>
                  <div className="stat-card-value">{stats.avgCredits}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'}}>
                  <FaUsers />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Total Capacity</div>
                  <div className="stat-card-value">{stats.totalCapacity.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="table-container">
              {loadingCourses ? (
                renderSkeleton()
              ) : filteredCourses.length === 0 ? (
                renderEmptyState()
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('_id')}>#</th>
                      <th onClick={() => handleSort('name')}>
                        Course Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('code')}>
                        Code {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('type')}>
                        Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('status')}>
                        Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('semester')}>
                        Semester {sortConfig.key === 'semester' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('credits')}>
                        Credits {sortConfig.key === 'credits' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th onClick={() => handleSort('maxStudents')}>
                        Capacity {sortConfig.key === 'maxStudents' && (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />)}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course, index) => (
                      <tr key={course._id} className="table-row">
                        <td>{index + 1}</td>
                        <td>
                          <div className="course-name">
                            <div className="course-icon">
                              <FaBookOpen />
                            </div>
                            <div className="course-details">
                              <div className="course-title">{course.name}</div>
                              <div className="course-meta">{course.programLevel} • {course.type}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="course-code-badge">{course.code}</span>
                        </td>
                        <td>
                          <span className={`type-badge type-${course.type.toLowerCase()}`}>
                            {course.type}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${course.status.toLowerCase()}`}>
                            {course.status}
                          </span>
                        </td>
                        <td>{course.semester}</td>
                        <td>
                          <span className="credits-badge">
                            <FaAward className="credits-icon" />
                            {course.credits}
                          </span>
                        </td>
                        <td>
                          <span className="capacity-badge">
                            <FaUsers className="capacity-icon" />
                            {course.maxStudents}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn view-btn"
                              title="View Details"
                              onClick={() => navigate(`/courses/view/${course._id}`)}
                            >
                              <FaEye />
                            </button>
                            <button 
                              className="action-btn edit-btn"
                              title="Edit Course"
                              onClick={() => navigate(`/courses/edit/${course._id}`)}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="action-btn delete-btn"
                              title="Delete Course"
                              onClick={() => handleDeleteClick(course)}
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
      {showDeleteModal && courseToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Course</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-warning">
                <FaExclamationTriangle className="warning-icon" />
                <div className="warning-text">
                  <h4>Are you sure you want to delete this course?</h4>
                  <p>This action cannot be undone. All related data will be permanently deleted.</p>
                </div>
              </div>
              <div className="course-preview">
                <div className="preview-item">
                  <span className="preview-label">Course Name:</span>
                  <span className="preview-value">{courseToDelete.name}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Course Code:</span>
                  <span className="preview-value">{courseToDelete.code}</span>
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

        .breadcrumb-item + .breadcrumb-item::before {
          color: #6c757d;
        }

        /* PAGE HEADER */
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

        .erp-header-actions {
          display: flex;
          gap: 0.75rem;
        }

        /* CARDS */
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

        /* DEPARTMENT SELECTOR */
        .department-selector {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .department-select-wrapper {
          position: relative;
          min-width: 300px;
          flex: 1;
          max-width: 500px;
        }

        .department-select {
          width: 100%;
          padding: 1rem 1.5rem;
          padding-right: 3rem;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 500;
          color: #2c3e50;
          background: white;
          transition: all 0.3s ease;
          outline: none;
          appearance: none;
        }

        .department-select:focus {
          border-color: #1a4b6d;
          box-shadow: 0 0 0 0.2rem rgba(26, 75, 109, 0.15);
        }

        .department-select-arrow {
          position: absolute;
          right: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
          pointer-events: none;
        }

        .department-stats {
          display: flex;
          gap: 2rem;
        }

        .stat-item {
          text-align: center;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a4b6d;
        }

        /* HEADER RIGHT SECTION */
        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .course-count {
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

        .search-filter-group {
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

        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-weight: 500;
          color: #2c3e50;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-btn:hover {
          border-color: #1a4b6d;
          background: #f8f9fa;
        }

        .filter-icon {
          font-size: 1rem;
        }

        .filter-arrow {
          font-size: 0.75rem;
          transition: transform 0.3s ease;
        }

        .filter-btn:hover .filter-arrow {
          transform: rotate(180deg);
        }

        /* STATS GRID */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.75rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-left: 4px solid transparent;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          border-left-color: #1a4b6d;
        }

        .stat-card-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          font-size: 1.5rem;
        }

        .stat-card-content {
          flex: 1;
        }

        .stat-card-label {
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.25rem;
        }

        .stat-card-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a4b6d;
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

        .erp-table th:nth-child(1)::after {
          display: none;
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

        .course-name {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .course-icon {
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

        .course-details {
          flex: 1;
        }

        .course-title {
          font-weight: 600;
          color: #1a4b6d;
          margin-bottom: 0.25rem;
        }

        .course-meta {
          font-size: 0.85rem;
          color: #666;
        }

        .course-code-badge {
          display: inline-block;
          background: rgba(26, 75, 109, 0.1);
          color: #1a4b6d;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .type-badge {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .type-theory {
          background: rgba(33, 150, 243, 0.1);
          color: #2196F3;
        }

        .type-practical {
          background: rgba(255, 152, 0, 0.1);
          color: #FF9800;
        }

        .type-both {
          background: rgba(156, 39, 176, 0.1);
          color: #9C27B0;
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

        .credits-badge,
        .capacity-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8f9fa;
          padding: 0.375rem 0.875rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .credits-icon,
        .capacity-icon {
          font-size: 0.9rem;
          color: #1a4b6d;
        }

        .action-buttons {
          display: flex;
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
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .skeleton-row {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
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

        .skeleton-text.short { width: 40%; }
        .skeleton-text.medium { width: 60%; }
        .skeleton-text.long { width: 80%; }
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

        .course-preview {
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

        /* ANIMATIONS */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }

        /* LOADING SPINNER */
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

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* RESPONSIVE */
        @media (max-width: 992px) {
          .department-stats {
            gap: 1rem;
          }
          
          .stat-item {
            min-width: 100px;
          }
          
          .stat-value {
            font-size: 1.25rem;
          }
        }

        @media (max-width: 768px) {
          .erp-container {
            padding: 1rem;
          }
          
          .erp-page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.5rem;
          }
          
          .erp-header-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          
          .erp-header-actions .erp-btn {
            flex: 1;
            min-width: 150px;
            justify-content: center;
          }
          
          .department-selector {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .department-select-wrapper {
            width: 100%;
            min-width: auto;
          }
          
          .department-stats {
            width: 100%;
            justify-content: space-around;
            padding-top: 1rem;
          }
          
          .header-right {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-filter-group {
            flex-direction: column;
            width: 100%;
          }
          
          .search-box {
            width: 100%;
            min-width: auto;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .erp-card-body {
            padding: 1.25rem;
          }
          
          .erp-table th,
          .erp-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }
          
          .course-name {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .course-meta {
            margin-left: 2.5rem;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
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
      `}</style>
    </div>
  );
}

/* CUSTOM ICONS */
const FaArrowLeft = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);