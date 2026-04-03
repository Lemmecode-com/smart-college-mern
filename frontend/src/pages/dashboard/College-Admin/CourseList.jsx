import { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";

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
  FaClock,
  FaUsers,
  FaAward,
  FaCalendarAlt,
  FaArrowLeft,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaUniversity,
  FaInfoCircle
} from "react-icons/fa";

/* ================= SUB-COMPONENTS ================= */

// Stats Card Component
const StatCard = ({ icon: Icon, label, value, color, subValue }) => (
  <div className="stat-card">
    <div className="stat-card-header">
      <div className={`stat-icon stat-icon-${color}`}>
        <Icon />
      </div>
      <div className="stat-card-details">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {subValue && <span className="stat-sub-value">{subValue}</span>}
      </div>
    </div>
    <div className="stat-card-footer">
      <div className={`stat-progress stat-progress-${color}`}>
        <div className={`stat-progress-bar stat-progress-bar-${color}`} style={{width: '70%'}}></div>
      </div>
    </div>
  </div>
);

// Course Table Component
const CourseTable = ({ courses, sortConfig, onSort, onEdit, onView, onDelete }) => {
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />;
  };

  const getTypeStyles = (type) => {
    const styles = {
      THEORY: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
      PRACTICAL: { bg: 'rgba(249, 115, 22, 0.1)', color: '#F97316', border: 'rgba(249, 115, 22, 0.2)' },
      BOTH: { bg: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', border: 'rgba(139, 92, 246, 0.2)' }
    };
    return styles[type?.toUpperCase()] || styles.THEORY;
  };

  const getStatusStyles = (status) => {
    return status === 'ACTIVE' 
      ? { bg: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: 'rgba(34, 197, 94, 0.2)' }
      : { bg: 'rgba(156, 163, 175, 0.1)', color: '#9CA3AF', border: 'rgba(156, 163, 175, 0.2)' };
  };

  return (
    <div className="table-responsive">
      <table className="modern-table">
        <thead>
          <tr>
            <th className="col-index">#</th>
            <th className="col-course sortable" onClick={() => onSort('name')}>
              <div className="th-content">
                <FaGraduationCap className="th-icon" />
                <span>Course Name</span>
                {getSortIcon('name')}
              </div>
            </th>
            <th className="col-code sortable" onClick={() => onSort('code')}>
              <div className="th-content">
                <span>Code</span>
                {getSortIcon('code')}
              </div>
            </th>
            <th className="col-type sortable" onClick={() => onSort('type')}>
              <div className="th-content">
                <FaChalkboardTeacher className="th-icon" />
                <span>Type</span>
                {getSortIcon('type')}
              </div>
            </th>
            <th className="col-status sortable" onClick={() => onSort('status')}>
              <div className="th-content">
                <span>Status</span>
                {getSortIcon('status')}
              </div>
            </th>
            <th className="col-duration sortable" onClick={() => onSort('durationSemesters')}>
              <div className="th-content">
                <FaClock className="th-icon" />
                <span>Duration</span>
                {getSortIcon('durationSemesters')}
              </div>
            </th>
            <th className="col-credits sortable" onClick={() => onSort('credits')}>
              <div className="th-content">
                <FaAward className="th-icon" />
                <span>Credits</span>
                {getSortIcon('credits')}
              </div>
            </th>
            <th className="col-capacity sortable" onClick={() => onSort('maxStudents')}>
              <div className="th-content">
                <FaUsers className="th-icon" />
                <span>Capacity</span>
                {getSortIcon('maxStudents')}
              </div>
            </th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course, index) => {
            const typeStyles = getTypeStyles(course.type);
            const statusStyles = getStatusStyles(course.status);
            
            return (
              <tr key={course._id} className="table-row">
                <td className="col-index">
                  <span className="index-badge">{index + 1}</span>
                </td>
                <td className="col-course">
                  <div className="course-info">
                    <div className="course-avatar">
                      <FaBookOpen />
                    </div>
                    <div className="course-text">
                      <span className="course-name-text">{course.name}</span>
                      <span className="course-level">{course.programLevel}</span>
                    </div>
                  </div>
                </td>
                <td className="col-code">
                  <span className="code-badge">{course.code}</span>
                </td>
                <td className="col-type">
                  <span 
                    className="type-badge"
                    style={{ 
                      background: typeStyles.bg, 
                      color: typeStyles.color,
                      borderColor: typeStyles.border
                    }}
                  >
                    {course.type}
                  </span>
                </td>
                <td className="col-status">
                  <span 
                    className="status-indicator"
                    style={{ 
                      background: statusStyles.bg, 
                      color: statusStyles.color,
                      borderColor: statusStyles.border
                    }}
                  >
                    <span 
                      className="status-dot"
                      style={{ 
                        background: course.status === 'ACTIVE' ? '#22C55E' : '#9CA3AF' 
                      }}
                    />
                    {course.status}
                  </span>
                </td>
                <td className="col-duration">
                  <div className="duration-info">
                    <span className="duration-value">{course.durationSemesters || 'N/A'}</span>
                    <span className="duration-label">semesters</span>
                  </div>
                </td>
                <td className="col-credits">
                  <div className="credits-info">
                    <span className="credits-value">{course.credits}</span>
                    <span className="credits-label">hrs</span>
                  </div>
                </td>
                <td className="col-capacity">
                  <div className="capacity-info">
                    <div className="capacity-bar-container">
                      <div className="capacity-bar">
                        <div 
                          className="capacity-fill"
                          style={{ 
                            width: `${Math.min((course.maxStudents / 100) * 100, 100)}%`,
                            background: course.maxStudents >= 80 
                              ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                              : course.maxStudents >= 50
                              ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                              : 'linear-gradient(90deg, #3B82F6, #2563EB)'
                          }}
                        />
                      </div>
                      <span className="capacity-text">{course.maxStudents}</span>
                    </div>
                  </div>
                </td>
                <td className="col-actions">
                  <div className="action-group">
                    <button
                      className="action-btn action-view"
                      title="View Details"
                      aria-label={`View ${course.name} details`}
                      onClick={() => onView(course._id)}
                    >
                      <FaEye />
                    </button>
                    <button
                      className="action-btn action-edit"
                      title="Edit Course"
                      aria-label={`Edit ${course.name}`}
                      onClick={() => onEdit(course._id)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="action-btn action-delete"
                      title="Delete Course"
                      aria-label={`Delete ${course.name}`}
                      onClick={() => onDelete(course)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Delete Modal Component
const DeleteModal = ({ course, departmentName, onConfirm, onCancel, isDeleting }) => {
  if (!course) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-wrapper">
            <div className="modal-icon-bg">
              <FaExclamationTriangle />
            </div>
          </div>
          <button 
            className="modal-close-btn" 
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <h3 className="modal-title">Delete Course</h3>
          <p className="modal-description">
            Are you sure you want to delete this course? This action cannot be undone.
          </p>
          
          <div className="course-info-card">
            <div className="info-row">
              <FaBookOpen className="info-icon" />
              <div className="info-content">
                <span className="info-label">Course Name</span>
                <span className="info-value">{course.name}</span>
              </div>
            </div>
            <div className="info-divider" />
            <div className="info-row">
              <FaGraduationCap className="info-icon" />
              <div className="info-content">
                <span className="info-label">Course Code</span>
                <span className="info-value">{course.code}</span>
              </div>
            </div>
            <div className="info-divider" />
            <div className="info-row">
              <FaUniversity className="info-icon" />
              <div className="info-content">
                <span className="info-label">Department</span>
                <span className="info-value">{departmentName}</span>
              </div>
            </div>
          </div>

          <div className="warning-box">
            <FaExclamationTriangle className="warning-icon" />
            <div className="warning-content">
              <strong>Warning:</strong> All related data including enrollments, 
              assessments, and records will be permanently deleted.
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <FaSyncAlt className="btn-icon spinning" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FaTrash className="btn-icon" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Filter Dropdown Component
const FilterDropdown = ({ filterStatus, setFilterStatus }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dropdown-container">
      <button 
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <FaFilter className="dropdown-icon" />
        <span>Filter</span>
        <FaChevronDown className={`dropdown-arrow ${isOpen ? 'is-open' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
          <div className="dropdown-menu">
            <div className="dropdown-header">
              <span>Filter by Status</span>
            </div>
            <div className="dropdown-options" role="radiogroup">
              {[
                { value: 'ALL', label: 'All Courses', icon: FaBookOpen, color: '#6B7280' },
                { value: 'ACTIVE', label: 'Active', icon: FaCheckCircle, color: '#22C55E' },
                { value: 'INACTIVE', label: 'Inactive', icon: FaTimes, color: '#9CA3AF' }
              ].map(({ value, label, icon: Icon, color }) => (
                <label 
                  key={value} 
                  className={`dropdown-option ${filterStatus === value ? 'is-selected' : ''}`}
                  role="radio"
                  aria-checked={filterStatus === value}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setFilterStatus(value);
                      setIsOpen(false);
                    }
                  }}
                  onClick={() => {
                    setFilterStatus(value);
                    setIsOpen(false);
                  }}
                >
                  <Icon className="option-icon" style={{ color }} />
                  <span className="option-label">{label}</span>
                  {filterStatus === value && (
                    <FaCheckCircle className="option-check" style={{ color }} />
                  )}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Skeleton Loader Component
const SkeletonLoader = () => (
  <div className="skeleton-wrapper">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton-cell skeleton-index"></div>
        <div className="skeleton-cell skeleton-course">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-text-group">
            <div className="skeleton-text skeleton-title"></div>
            <div className="skeleton-text skeleton-subtitle"></div>
          </div>
        </div>
        <div className="skeleton-cell skeleton-code"></div>
        <div className="skeleton-cell skeleton-type"></div>
        <div className="skeleton-cell skeleton-status"></div>
        <div className="skeleton-cell skeleton-duration"></div>
        <div className="skeleton-cell skeleton-credits"></div>
        <div className="skeleton-cell skeleton-capacity"></div>
        <div className="skeleton-cell skeleton-actions">
          <div className="skeleton-action-btn"></div>
          <div className="skeleton-action-btn"></div>
          <div className="skeleton-action-btn"></div>
        </div>
      </div>
    ))}
  </div>
);

// Empty State Component
const EmptyState = ({ hasDepartment, onAddCourse }) => (
  <div className="empty-state-wrapper">
    <div className="empty-state-icon">
      <div className="empty-icon-circle">
        <FaBookOpen />
      </div>
    </div>
    <h3 className="empty-state-title">
      {hasDepartment ? "No courses found" : "Select a department"}
    </h3>
    <p className="empty-state-description">
      {hasDepartment
        ? "There are no courses in this department yet. Get started by adding your first course."
        : "Choose a department from the dropdown above to view and manage courses."}
    </p>
    {hasDepartment && (
      <button
        className="btn btn-primary btn-lg"
        onClick={onAddCourse}
      >
        <FaPlus className="btn-icon" />
        <span>Add Your First Course</span>
      </button>
    )}
  </div>
);

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        {type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
      </div>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        <FaTimes />
      </button>
    </div>
  );
};

/* ================= MAIN COMPONENT ================= */
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
  const [deleting, setDeleting] = useState(false);
  const [coursesError, setCoursesError] = useState(null);
  const [departmentsError, setDepartmentsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    avgCredits: 0,
    totalCapacity: 0
  });

  /* ================= DEBOUNCED SEARCH ================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const abortController = new AbortController();

    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments", { signal: abortController.signal });
        setDepartments(res.data);
        setDepartmentsError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setDepartmentsError("Failed to load departments");
          // Show toast instead of blocking the page
          setToast({ 
            type: 'error', 
            message: 'Unable to load departments. Please select a department manually.' 
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();

    return () => abortController.abort();
  }, []);

  /* ================= LOAD COURSES ================= */
  useEffect(() => {
    if (!selectedDepartment) {
      setCourses([]);
      setCoursesError(null);
      return;
    }

    const abortController = new AbortController();

    const fetchCourses = async () => {
      setLoadingCourses(true);
      setCoursesError(null);
      try {
        const res = await api.get(`/courses/department/${selectedDepartment}`, {
          signal: abortController.signal
        });
        const coursesData = res.data?.courses || res.data?.data?.courses || res.data || [];
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setCoursesError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setCoursesError("Failed to load courses. Please try again.");
          setToast({ type: 'error', message: 'Unable to load courses for this department.' });
        }
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();

    return () => abortController.abort();
  }, [selectedDepartment]);

  /* ================= STATS CALCULATION ================= */
  const calculateStats = useCallback((courseList) => {
    const total = courseList.length;
    const active = courseList.filter(c => c.status === "ACTIVE").length;
    const inactive = total - active;
    const totalCredits = courseList.reduce((sum, c) => sum + (c.credits || 0), 0);
    const avgCredits = total > 0 ? (totalCredits / total).toFixed(1) : 0;
    const totalCapacity = courseList.reduce((sum, c) => sum + (c.maxStudents || 0), 0);

    return { total, active, inactive, avgCredits, totalCapacity };
  }, []);

  useEffect(() => {
    setStats(calculateStats(courses));
  }, [courses, calculateStats]);

  /* ================= SORTING ================= */
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  }, []);

  /* ================= FILTERED & SORTED COURSES ================= */
  const filteredCourses = useMemo(() => {
    let result = courses
      .filter(course =>
        course.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        course.code?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      .filter(course =>
        filterStatus === "ALL" || course.status === filterStatus
      );

    result = [...result].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [courses, debouncedSearchTerm, filterStatus, sortConfig]);

  /* ================= DELETE HANDLER ================= */
  const handleDeleteClick = (course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/courses/${courseToDelete._id}`);
      setCourses(prev => prev.filter(c => c._id !== courseToDelete._id));
      setShowDeleteModal(false);
      setCourseToDelete(null);
      setToast({ type: 'success', message: 'Course deleted successfully!' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete course. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  /* ================= EXPORT HANDLER ================= */
  const handleExport = useCallback(() => {
    if (courses.length === 0) {
      setToast({ type: 'error', message: 'No courses to export.' });
      return;
    }

    const headers = ["Name", "Code", "Type", "Status", "Duration (Sem)", "Credits", "Max Students"];
    const csvContent = [
      headers.join(","),
      ...courses.map(course =>
        [
          course.name,
          course.code,
          course.type,
          course.status,
          course.durationSemesters || 'N/A',
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
    
    setToast({ type: 'success', message: 'Courses exported successfully!' });
  }, [courses, selectedDepartment]);

  /* ================= NAVIGATION HANDLERS ================= */
  const handleViewCourse = useCallback((courseId) => navigate(`/courses/view/${courseId}`), [navigate]);
  const handleEditCourse = useCallback((courseId) => navigate(`/courses/edit/${courseId}`), [navigate]);
  const handleAddCourse = useCallback(() => navigate("/courses/add"), [navigate]);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = useCallback(() => {
    if (selectedDepartment) {
      setCoursesError(null);
      // Trigger the courses fetch effect by temporarily clearing and re-setting department
      const currentDept = selectedDepartment;
      setSelectedDepartment("");
      setTimeout(() => setSelectedDepartment(currentDept), 100);
    }
  }, [selectedDepartment]);

  /* ================= COURSES ERROR STATE ================= */
  if (coursesError && selectedDepartment && !loadingCourses) {
    return (
      <div className="error-page-wrapper">
        <div className="error-page-content">
          <div className="error-page-icon">
            <FaExclamationTriangle />
          </div>
          <h3>Something went wrong</h3>
          <p>{coursesError}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={handleRetry}>
              <FaSyncAlt className="btn-icon" />
              Try Again
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedDepartment("")}>
              Select Different Department
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading courses..." />;
  }

  const selectedDeptName = departments.find(d => d._id === selectedDepartment)?.name || "Select Department";

  return (
    <div className="dashboard-container">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* BREADCRUMBS */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Academics", icon: FaGraduationCap },
          { label: "Course Management" }
        ]}
      />

      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="header-icon-wrapper">
            <div className="header-icon-bg">
              <FaBookOpen size={28} />
            </div>
          </div>
          <div className="header-text-content">
            <h1 className="page-title">Course Management</h1>
            <p className="page-subtitle">Manage academic courses, curriculum, and course offerings</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-ghost"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to Dashboard"
          >
            <FaArrowLeft className="btn-icon" />
            <span>Back</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAddCourse}
            aria-label="Add New Course"
          >
            <FaPlus className="btn-icon" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* DEPARTMENT SELECTOR CARD */}
      <div className="card department-card">
        <div className="card-header">
          <div className="card-title-group">
            <FaLayerGroup className="card-icon" />
            <h3 className="card-title">Select Department</h3>
          </div>
          {departmentsError && (
            <div className="department-error-badge">
              <FaExclamationTriangle className="error-icon" />
              <span>Limited data</span>
            </div>
          )}
        </div>
        <div className="card-body">
          <div className="department-selector">
            <div className="select-wrapper">
              <select
                className="modern-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                aria-label="Select department"
                disabled={departmentsError && departments.length === 0}
              >
                <option value="">-- Select Department --</option>
                {departments.map((dep) => (
                  <option key={dep._id} value={dep._id}>
                    {dep.name} {dep.code && `(${dep.code})`}
                  </option>
                ))}
                {departmentsError && departments.length === 0 && (
                  <option disabled>Unable to load departments</option>
                )}
              </select>
              <div className="select-arrow">
                <FaChevronDown />
              </div>
            </div>
            {selectedDepartment && (
              <div className="quick-stats">
                <div className="quick-stat">
                  <span className="quick-stat-value">{stats.total}</span>
                  <span className="quick-stat-label">Total</span>
                </div>
                <div className="quick-stat-divider" />
                <div className="quick-stat">
                  <span className="quick-stat-value active">{stats.active}</span>
                  <span className="quick-stat-label">Active</span>
                </div>
                <div className="quick-stat-divider" />
                <div className="quick-stat">
                  <span className="quick-stat-value">{stats.totalCapacity.toLocaleString()}</span>
                  <span className="quick-stat-label">Capacity</span>
                </div>
              </div>
            )}
          </div>
          {departmentsError && (
            <div className="inline-error-message">
              <FaInfoCircle className="info-icon" />
              <span>Some departments may not be available. Please try refreshing the page.</span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN COURSE SECTION */}
      {selectedDepartment && (
        <div className="card course-card">
          <div className="card-header">
            <div className="card-title-group">
              <FaBookOpen className="card-icon" />
              <div>
                <h3 className="card-title">{selectedDeptName} Courses</h3>
                <span className="card-subtitle">
                  {stats.total} {stats.total === 1 ? "Course" : "Courses"} available
                </span>
              </div>
            </div>
            <div className="card-actions">
              <div className="search-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search courses"
                />
                {searchTerm && (
                  <button 
                    className="search-clear"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <FilterDropdown 
                filterStatus={filterStatus} 
                setFilterStatus={setFilterStatus} 
              />
              <button 
                className="btn btn-outline" 
                onClick={handleExport}
                aria-label="Export courses to CSV"
              >
                <FaDownload className="btn-icon" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* STATS GRID */}
            <div className="stats-grid">
              <StatCard 
                icon={FaBookOpen}
                label="Total Courses"
                value={stats.total}
                color="blue"
              />
              <StatCard 
                icon={FaCheckCircle}
                label="Active Courses"
                value={stats.active}
                color="green"
                subValue={`${stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(0) : 0}% of total`}
              />
              <StatCard 
                icon={FaAward}
                label="Avg. Credits"
                value={stats.avgCredits}
                color="purple"
              />
              <StatCard 
                icon={FaUsers}
                label="Total Capacity"
                value={stats.totalCapacity.toLocaleString()}
                color="orange"
              />
            </div>

            {/* TABLE */}
            <div className="table-wrapper">
              {loadingCourses ? (
                <SkeletonLoader />
              ) : filteredCourses.length === 0 ? (
                <EmptyState 
                  hasDepartment={true} 
                  onAddCourse={handleAddCourse} 
                />
              ) : (
                <CourseTable
                  courses={filteredCourses}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onView={handleViewCourse}
                  onEdit={handleEditCourse}
                  onDelete={handleDeleteClick}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <DeleteModal
        course={courseToDelete}
        departmentName={selectedDeptName}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={deleting}
      />

      {/* STYLES */}
      <style>{`
        /* ================= CSS VARIABLES ================= */
        :root {
          --primary: #4F46E5;
          --primary-dark: #4338CA;
          --primary-light: #818CF8;
          --secondary: #64748B;
          --success: #22C55E;
          --warning: #F59E0B;
          --danger: #EF4444;
          --info: #3B82F6;
          
          --bg-primary: #F8FAFC;
          --bg-secondary: #FFFFFF;
          --bg-tertiary: #F1F5F9;
          
          --text-primary: #1E293B;
          --text-secondary: #64748B;
          --text-muted: #94A3B8;
          
          --border-light: #E2E8F0;
          --border-medium: #CBD5E1;
          
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        /* ================= BASE STYLES ================= */
        * {
          box-sizing: border-box;
        }

        .dashboard-container {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 1.5rem;
        }

        /* ================= TOAST NOTIFICATIONS ================= */
        .toast {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          background: var(--bg-secondary);
          box-shadow: var(--shadow-xl);
          z-index: 9999;
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          min-width: 320px;
          border: 1px solid var(--border-light);
        }

        .toast-success {
          border-left: 4px solid var(--success);
        }

        .toast-error {
          border-left: 4px solid var(--danger);
        }

        .toast-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .toast-success .toast-icon { color: var(--success); }
        .toast-error .toast-icon { color: var(--danger); }

        .toast-message {
          flex: 1;
          color: var(--text-primary);
          font-weight: 500;
        }

        .toast-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          margin-left: 0.5rem;
          transition: color 0.2s;
        }

        .toast-close:hover {
          color: var(--text-primary);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(calc(100% + 2rem));
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* ================= BREADCRUMBS ================= */
        :global(.breadcrumb-container) {
          margin-bottom: 1.5rem;
        }

        /* ================= PAGE HEADER ================= */
        .page-header {
          background: linear-gradient(180deg, #0f3a4a 0%, #0c2d3a 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 40px rgba(15, 58, 74, 0.4);
          color: white;
        }

        .page-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .header-icon-wrapper {
          position: relative;
        }

        .header-icon-bg {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .header-text-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .page-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.025em;
        }

        .page-subtitle {
          margin: 0;
          opacity: 0.85;
          font-size: 0.95rem;
          font-weight: 400;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        /* ================= BUTTONS ================= */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: white;
          color: var(--primary);
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--border-medium);
        }

        .btn-danger {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }

        .btn-outline {
          background: transparent;
          color: var(--text-secondary);
          border: 1.5px solid var(--border-medium);
        }

        .btn-outline:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
          background: rgba(79, 70, 229, 0.05);
        }

        .btn-ghost {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .btn-ghost:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        .btn-lg {
          padding: 0.875rem 1.75rem;
          font-size: 1rem;
        }

        .btn-icon {
          font-size: 1rem;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ================= CARDS ================= */
        .card {
          background: var(--bg-secondary);
          border-radius: 16px;
          box-shadow: var(--shadow);
          overflow: hidden;
          border: 1px solid var(--border-light);
          margin-bottom: 1.5rem;
          transition: box-shadow 0.3s ease;
        }

        .card:hover {
          box-shadow: var(--shadow-md);
        }

        .card-header {
          padding: 1.25rem 1.5rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .department-error-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--warning);
        }

        .department-error-badge .error-icon {
          font-size: 0.9rem;
        }

        .inline-error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          margin-top: 1rem;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 10px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .inline-error-message .info-icon {
          color: var(--danger);
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .card-title-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-icon {
          font-size: 1.25rem;
          color: var(--primary);
        }

        .card-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .card-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-top: 0.125rem;
          display: block;
        }

        .card-body {
          padding: 1.5rem;
        }

        /* ================= DEPARTMENT SELECTOR ================= */
        .department-card {
          animation: fadeInUp 0.5s ease;
        }

        .department-selector {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .select-wrapper {
          position: relative;
          min-width: 320px;
          flex: 1;
          max-width: 480px;
        }

        .modern-select {
          width: 100%;
          padding: 0.875rem 3rem 0.875rem 1.25rem;
          border: 2px solid var(--border-light);
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-primary);
          background: var(--bg-secondary);
          cursor: pointer;
          appearance: none;
          transition: all 0.2s;
        }

        .modern-select:hover {
          border-color: var(--border-medium);
        }

        .modern-select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .select-arrow {
          position: absolute;
          right: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
        }

        .quick-stats {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--bg-tertiary);
          border-radius: 12px;
        }

        .quick-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
        }

        .quick-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .quick-stat-value.active {
          color: var(--success);
        }

        .quick-stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .quick-stat-divider {
          width: 1px;
          height: 32px;
          background: var(--border-medium);
        }

        /* ================= COURSE CARD ================= */
        .course-card {
          animation: fadeInUp 0.5s ease 0.1s backwards;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .search-wrapper {
          position: relative;
          width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 0.9rem;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 2.5rem;
          border: 2px solid var(--border-light);
          border-radius: 10px;
          font-size: 0.9rem;
          color: var(--text-primary);
          background: var(--bg-secondary);
          transition: all 0.2s;
        }

        .search-input:hover {
          border-color: var(--border-medium);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .search-clear {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          transition: color 0.2s;
        }

        .search-clear:hover {
          color: var(--text-primary);
        }

        /* ================= DROPDOWN ================= */
        .dropdown-container {
          position: relative;
        }

        .dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-light);
          border-radius: 10px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .dropdown-trigger:hover {
          border-color: var(--border-medium);
          color: var(--text-primary);
        }

        .dropdown-icon {
          font-size: 0.9rem;
        }

        .dropdown-arrow {
          font-size: 0.7rem;
          transition: transform 0.2s;
        }

        .dropdown-arrow.is-open {
          transform: rotate(180deg);
        }

        .dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 200px;
          background: var(--bg-secondary);
          border-radius: 12px;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-light);
          z-index: 100;
          animation: dropdownSlideIn 0.2s ease;
          overflow: hidden;
        }

        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-header {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-light);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dropdown-options {
          padding: 0.5rem;
        }

        .dropdown-option {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          color: var(--text-secondary);
        }

        .dropdown-option:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .dropdown-option.is-selected {
          background: rgba(79, 70, 229, 0.1);
          color: var(--primary);
        }

        .option-icon {
          font-size: 1rem;
        }

        .option-label {
          flex: 1;
          font-weight: 500;
        }

        .option-check {
          font-size: 1rem;
        }

        /* ================= STATS GRID ================= */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: var(--bg-secondary);
          border-radius: 14px;
          padding: 1.25rem;
          border: 1px solid var(--border-light);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .stat-card-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .stat-icon-blue {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          color: white;
        }

        .stat-icon-green {
          background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
          color: white;
        }

        .stat-icon-purple {
          background: linear-gradient(135deg, #A855F7 0%, #9333EA 100%);
          color: white;
        }

        .stat-icon-orange {
          background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
          color: white;
        }

        .stat-card-details {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat-sub-value {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .stat-card-footer {
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-light);
        }

        .stat-progress {
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          overflow: hidden;
        }

        .stat-progress-bar {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        .stat-progress-bar-blue { background: var(--info); }
        .stat-progress-bar-green { background: var(--success); }
        .stat-progress-bar-purple { background: #A855F7; }
        .stat-progress-bar-orange { background: var(--warning); }

        /* ================= TABLE ================= */
        .table-wrapper {
          border-radius: 12px;
          overflow: hidden;
        }

        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        .modern-table thead {
          background: var(--bg-tertiary);
        }

        .modern-table th {
          padding: 1rem 1.25rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border-medium);
        }

        .modern-table th.sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.2s;
        }

        .modern-table th.sortable:hover {
          background: var(--border-light);
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .th-icon {
          font-size: 0.85rem;
          opacity: 0.7;
        }

        .modern-table tbody tr {
          border-bottom: 1px solid var(--border-light);
          transition: all 0.2s;
        }

        .modern-table tbody tr:last-child {
          border-bottom: none;
        }

        .modern-table tbody tr:hover {
          background: rgba(79, 70, 229, 0.02);
        }

        .modern-table td {
          padding: 1rem 1.25rem;
          vertical-align: middle;
        }

        /* Table Columns */
        .col-index {
          width: 60px;
          text-align: center;
        }

        .index-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .col-course {
          min-width: 250px;
        }

        .course-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .course-avatar {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--primary) 0%, #7C3AED 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .course-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .course-name-text {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .course-level {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .col-code {
          width: 120px;
        }

        .code-badge {
          display: inline-block;
          padding: 0.375rem 0.75rem;
          background: var(--bg-tertiary);
          border-radius: 8px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: 0.025em;
        }

        .col-type {
          width: 120px;
        }

        .type-badge {
          display: inline-block;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid;
        }

        .col-status {
          width: 130px;
        }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .col-duration {
          width: 120px;
        }

        .duration-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .duration-value {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .duration-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .col-credits {
          width: 100px;
        }

        .credits-info {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .credits-value {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .credits-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .col-capacity {
          width: 150px;
        }

        .capacity-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .capacity-bar-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .capacity-bar {
          flex: 1;
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          overflow: hidden;
        }

        .capacity-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .capacity-text {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.85rem;
          min-width: 32px;
        }

        .col-actions {
          width: 140px;
          text-align: right;
        }

        .action-group {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
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
          transition: all 0.2s;
          color: white;
          font-size: 0.9rem;
        }

        .action-view {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        }

        .action-edit {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        .action-delete {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .action-btn:active {
          transform: translateY(0);
        }

        /* ================= SKELETON ================= */
        .skeleton-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--border-light);
          border-radius: 12px;
          overflow: hidden;
        }

        .skeleton-row {
          display: grid;
          grid-template-columns: 60px 1fr 120px 120px 130px 120px 100px 150px 140px;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--bg-secondary);
        }

        .skeleton-cell {
          height: 24px;
          background: var(--bg-tertiary);
          border-radius: 6px;
          position: relative;
          overflow: hidden;
        }

        .skeleton-cell::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: skeleton-shimmer 1.5s infinite;
        }

        .skeleton-index { width: 28px; margin: 0 auto; }
        .skeleton-course { display: flex; align-items: center; gap: 1rem; }
        .skeleton-avatar { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; }
        .skeleton-text-group { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
        .skeleton-title { width: 80%; height: 16px; }
        .skeleton-subtitle { width: 50%; height: 12px; }
        .skeleton-code { width: 80px; }
        .skeleton-type { width: 70px; }
        .skeleton-status { width: 80px; }
        .skeleton-duration { width: 60px; }
        .skeleton-credits { width: 40px; }
        .skeleton-capacity { width: 100px; }
        .skeleton-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .skeleton-action-btn { width: 36px; height: 36px; border-radius: 10px; }

        @keyframes skeleton-shimmer {
          to { left: 100%; }
        }

        /* ================= EMPTY STATE ================= */
        .empty-state-wrapper {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-state-icon {
          margin-bottom: 1.5rem;
        }

        .empty-icon-circle {
          width: 96px;
          height: 96px;
          margin: 0 auto;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          font-size: 2.5rem;
        }

        .empty-state-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.75rem 0;
        }

        .empty-state-description {
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 480px;
          margin: 0 auto 2rem;
          line-height: 1.6;
        }

        /* ================= MODAL ================= */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
          animation: modalFadeIn 0.2s ease;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          background: var(--bg-secondary);
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          box-shadow: var(--shadow-xl);
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
        }

        .modal-icon-wrapper {
          position: absolute;
          top: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
        }

        .modal-icon-bg {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #D97706;
          font-size: 1.5rem;
        }

        .modal-close-btn {
          position: relative;
          z-index: 1;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .modal-close-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .modal-close-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-body {
          padding: 0 1.5rem 1.5rem;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
          text-align: center;
        }

        .modal-description {
          color: var(--text-secondary);
          text-align: center;
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .course-info-card {
          background: var(--bg-tertiary);
          border-radius: 14px;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0;
        }

        .info-icon {
          width: 40px;
          height: 40px;
          background: var(--bg-secondary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          font-size: 1rem;
          flex-shrink: 0;
        }

        .info-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .info-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
          text-transform: uppercase;
        }

        .info-value {
          font-weight: 600;
          color: var(--text-primary);
        }

        .info-divider {
          height: 1px;
          background: var(--border-medium);
          margin: 0.5rem 0;
        }

        .warning-box {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 12px;
        }

        .warning-box .warning-icon {
          color: var(--warning);
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .warning-content {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-footer {
          padding: 1.25rem 1.5rem;
          background: var(--bg-tertiary);
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          border-top: 1px solid var(--border-light);
        }

        /* ================= ERROR PAGE ================= */
        .error-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 2rem;
        }

        .error-page-content {
          text-align: center;
          max-width: 480px;
        }

        .error-page-icon {
          width: 96px;
          height: 96px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--danger);
          font-size: 2.5rem;
        }

        .error-page-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.75rem 0;
        }

        .error-page-content p {
          color: var(--text-secondary);
          margin: 0 0 1.5rem 0;
        }

        .error-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ================= ANIMATIONS ================= */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 1024px) {
          .skeleton-row {
            grid-template-columns: 60px 1fr 100px 100px 110px 100px 80px 120px 120px;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.25rem;
            padding: 1.5rem;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions .btn {
            flex: 1;
          }

          .department-selector {
            flex-direction: column;
            align-items: stretch;
          }

          .select-wrapper {
            min-width: auto;
            max-width: none;
          }

          .quick-stats {
            justify-content: center;
          }

          .card-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .card-actions {
            flex-direction: column;
          }

          .search-wrapper {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .modern-table th,
          .modern-table td {
            padding: 0.75rem;
          }

          .course-info {
            gap: 0.75rem;
          }

          .course-avatar {
            width: 36px;
            height: 36px;
            font-size: 0.9rem;
          }

          .toast {
            left: 1rem;
            right: 1rem;
            top: auto;
            bottom: 1.5rem;
            min-width: auto;
          }

          .modal-container {
            margin: 1rem;
            max-height: calc(100vh - 2rem);
            overflow-y: auto;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .action-group {
            gap: 0.375rem;
          }

          .action-btn {
            width: 32px;
            height: 32px;
            font-size: 0.8rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .header-icon-bg {
            width: 56px;
            height: 56px;
          }
        }
      `}</style>
    </div>
  );
}
