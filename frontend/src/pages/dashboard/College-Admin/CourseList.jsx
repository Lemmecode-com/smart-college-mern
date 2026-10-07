import { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import StandardListView from "../../../components/StandardListView/StandardListView";
import useRole from "../../../hooks/useRole";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaBookOpen,
  FaEdit,
  FaTrash,
  FaPlus,
  FaLayerGroup,
  FaSearch,
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
  FaInfoCircle,
} from "react-icons/fa";

/* ================= SUB-COMPONENTS ================= */

// Stats Card Component
const StatCard = ({ icon: Icon, label, value, color, subValue }) => (
  <div className="stat-card">
    <div className={`stat-icon stat-icon-${color}`}>
      <Icon />
    </div>
    <div className="stat-card-details">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {subValue && <span className="stat-sub-value">{subValue}</span>}
    </div>
  </div>
);



// Delete Modal Component
const DeleteModal = ({
  course,
  departmentName,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
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
            Are you sure you want to delete this course? This action cannot be
            undone.
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





export default function CourseList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = useRole();

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL")
    return <Navigate to="/dashboard" replace />;

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    avgCredits: 0,
    totalCapacity: 0,
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
        const res = await api.get("/departments", {
          signal: abortController.signal,
        });
        setDepartments(res.data);
        setDepartmentsError(null);
      } catch (err) {
        const isCancelled =
          err?.name === "AbortError" || err?.code === "ERR_CANCELED";
        if (!isCancelled) {
          const statusCode = err.response?.status;
          const errorCode = err.response?.data?.code;
          const backendMessage = err.response?.data?.message;
          const errorMessage = backendMessage || "Failed to load departments.";

          logger.error("Error fetching departments:", {
            status: statusCode,
            code: errorCode,
            message: backendMessage,
            url: "/departments",
          });

          setDepartmentsError({
            message: errorMessage,
            statusCode,
            errorCode,
          });

          const isAuthError =
            statusCode === 401 ||
            (errorCode && AUTH_ERROR_CODES.has(errorCode));

          if (!isAuthError) {
            toast.error(errorMessage);
          }
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
          signal: abortController.signal,
        });
        const coursesData =
          res.data?.courses || res.data?.data?.courses || res.data || [];
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setCoursesError(null);
      } catch (err) {
        if (err.name !== "AbortError") {
          const statusCode = err.response?.status;
          const errorCode = err.response?.data?.code;
          const backendMessage = err.response?.data?.message;
          const errorMessage = backendMessage || "Failed to load courses.";

          logger.error("Error fetching courses:", {
            status: statusCode,
            code: errorCode,
            message: backendMessage,
            url: `/courses/department/${selectedDepartment}`,
          });

          setCoursesError({
            message: errorMessage,
            statusCode,
            errorCode,
          });

          const isAuthError =
            statusCode === 401 ||
            (errorCode && AUTH_ERROR_CODES.has(errorCode));

          if (!isAuthError) {
            toast.error(errorMessage);
          }
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
    const active = courseList.filter((c) => c.status === "ACTIVE").length;
    const inactive = total - active;
    const totalCredits = courseList.reduce(
      (sum, c) => sum + (c.credits || 0),
      0,
    );
    const avgCredits = total > 0 ? (totalCredits / total).toFixed(1) : 0;
    const totalCapacity = courseList.reduce(
      (sum, c) => sum + (c.maxStudents || 0),
      0,
    );

    return { total, active, inactive, avgCredits, totalCapacity };
  }, []);

  useEffect(() => {
    setStats(calculateStats(courses));
  }, [courses, calculateStats]);



 /* ================= FILTERED COURSES ================= */
const filteredCourses = useMemo(() => {
  const search = debouncedSearchTerm.toLowerCase();

  return courses.filter(
    (course) =>
      course.name?.toLowerCase().includes(search) ||
      course.code?.toLowerCase().includes(search)
  );
}, [courses, debouncedSearchTerm]);

const columns = [
  {
    key: "index",
    label: "Sr.No.",
    sortable: false,
    width: "60px",
    render: (_, rowIndex) => (
      <span className="index-badge">{rowIndex + 1}</span>
    ),
  },

  {
    key: "name",
    label: "Course Name",
    sortable: true,
    width: "220px",
    render: (course) => (
      <div className="course-info">
        <div className="course-avatar">
          <FaBookOpen />
        </div>

        <div className="course-text">
          <span className="course-name-text">
            {course.name}
          </span>

          <span className="course-level">
            {course.programLevel}
          </span>
        </div>
      </div>
    ),
  },

  {
    key: "code",
    label: "Code",
    sortable: true,
    width: "105px",
    render: (course) => (
      <span className="code-badge">
        {course.code}
      </span>
    ),
  },

  {
    key: "type",
    label: "Type",
    sortable: true,
    width: "100px",
    render: (course) => {
      const typeStyles = {
        THEORY: {
          bg: "rgba(59, 130, 246, 0.1)",
          color: "#3B82F6",
          border: "rgba(59, 130, 246, 0.2)",
        },

        PRACTICAL: {
          bg: "rgba(249, 115, 22, 0.1)",
          color: "#F97316",
          border: "rgba(249, 115, 22, 0.2)",
        },

        BOTH: {
          bg: "rgba(139, 92, 246, 0.1)",
          color: "#8B5CF6",
          border: "rgba(139, 92, 246, 0.2)",
        },
      };

      const styles =
        typeStyles[course.type?.toUpperCase()] ||
        typeStyles.THEORY;

      return (
        <span
          className="type-badge"
          style={{
            background: styles.bg,
            color: styles.color,
            borderColor: styles.border,
          }}
        >
          {course.type}
        </span>
      );
    },
  },

  {
    key: "status",
    label: "Status",
    sortable: true,
    width: "110px",
    render: (course) => {
      const isActive = course.status === "ACTIVE";

      return (
        <span
          className="status-indicator"
          style={{
            background: isActive
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(156, 163, 175, 0.1)",
            color: isActive
              ? "#22C55E"
              : "#9CA3AF",
            borderColor: isActive
              ? "rgba(34, 197, 94, 0.2)"
              : "rgba(156, 163, 175, 0.2)",
          }}
        >
          <span
            className="status-dot"
            style={{
              background: isActive
                ? "#22C55E"
                : "#9CA3AF",
            }}
          />

          {course.status}
        </span>
      );
    },
  },

  {
    key: "durationSemesters",
    label: "Duration",
    sortable: true,
    width: "105px",
    render: (course) => (
      <div className="duration-info">
        <span className="duration-value">
          {course.durationSemesters || "N/A"}
        </span>

        <span className="duration-label">
          semesters
        </span>
      </div>
    ),
  },

  {
    key: "credits",
    label: "Credits",
    sortable: true,
    width: "85px",
    render: (course) => (
      <div className="credits-info">
        <span className="credits-value">
          {course.credits}
        </span>

        <span className="credits-label">
          hrs
        </span>
      </div>
    ),
  },

  {
    key: "maxStudents",
    label: "Capacity",
    sortable: true,
    width: "125px",
    render: (course) => {
      const capacity = course.maxStudents || 0;

      return (
        <div className="capacity-info">
          <div className="capacity-bar-container">
            <div className="capacity-bar">
              <div
                className="capacity-fill"
                style={{
                  width: `${Math.min(
                    (capacity / 100) * 100,
                    100
                  )}%`,
                  background:
                    capacity >= 80
                      ? "linear-gradient(90deg, #22C55E, #16A34A)"
                      : capacity >= 50
                        ? "linear-gradient(90deg, #F59E0B, #D97706)"
                        : "linear-gradient(90deg, #3B82F6, #2563EB)",
                }}
              />
            </div>

            <span className="capacity-text">
              {capacity}
            </span>
          </div>
        </div>
      );
    },
  },
];



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
      setCourses((prev) => prev.filter((c) => c._id !== courseToDelete._id));
      setShowDeleteModal(false);
      setCourseToDelete(null);
      toast.success("Course deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete course. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  /* ================= EXPORT HANDLER ================= */
  const handleExport = useCallback(() => {
    if (courses.length === 0) {
      toast.error("No courses to export.");
      return;
    }

    const headers = [
      "Name",
      "Code",
      "Type",
      "Status",
      "Duration (Sem)",
      "Credits",
      "Max Students",
    ];
    const csvContent = [
      headers.join(","),
      ...courses.map((course) =>
        [
          course.name,
          course.code,
          course.type,
          course.status,
          course.durationSemesters || "N/A",
          course.credits,
          course.maxStudents,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `courses_${selectedDepartment}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Courses exported successfully!");
  }, [courses, selectedDepartment]);

  /* ================= NAVIGATION HANDLERS ================= */
  const handleViewCourse = useCallback(
    (courseId) => navigate(`/courses/view/${courseId}`),
    [navigate],
  );
  const handleEditCourse = useCallback(
    (courseId) => navigate(`/courses/edit/${courseId}`),
    [navigate],
  );
  const handleAddCourse = useCallback(
    () => navigate("/courses/add"),
    [navigate],
  );

  /* ================= TABLE ACTIONS ================= */

const tableActions = {
  label: "Actions",
  width: "140px",
  items: [
    {
      key: "view",
      label: "View Details",
      icon: FaEye,
      className: "action-view",
      onClick: (course) => handleViewCourse(course._id),
    },

    {
      key: "edit",
      label: "Edit Course",
      icon: FaEdit,
      className: "action-edit",
      show: () => canEdit("courses"),
      onClick: (course) => handleEditCourse(course._id),
    },

    {
      key: "delete",
      label: "Delete Course",
      icon: FaTrash,
      className: "action-delete",
      show: () => canDelete("courses"),
      onClick: handleDeleteClick,
    },
  ],
};

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
      <ApiError
        title="Course Loading Error"
        message={coursesError.message}
        statusCode={coursesError.statusCode}
        errorCode={coursesError.errorCode}
        onRetry={handleRetry}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  /* ================= LOADING STATE ================= */
if (loading) {
  return (
    <div className="parent-portal-wrapper">
      <div
        className="parent-portal-container parent-loading-container"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Loading Courses..."
        />
      </div>
    </div>
  );
}
  const selectedDeptName =
    departments.find((d) => d._id === selectedDepartment)?.name ||
    "Select Department";

  return (
    <div className="erp-page erp-viewport-min-100">
      {/* BREADCRUMBS */}
      <div className="course-breadcrumb-wrapper">
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Courses", },
            { label: "Course Management" },
          ]}
        />
      </div>

        {/* PAGE HEADER */}
{/* PAGE HEADER */}
<PageHeader
  icon={FaBookOpen}
  title="Course Management"
  subtitle="Manage academic courses, curriculum, and course offerings"
  actions={
    <>
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        aria-label="Back to Dashboard"
        style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",       
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 4px 10px rgba(0, 0, 0, 0.15)";
          e.currentTarget.style.background =
            "rgba(255, 255, 255, 0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.background =
            "rgba(255, 255, 255, 0.12)";
        }}
      >
        <FaArrowLeft size={16} />
        <span>Back</span>
      </button>

      {canCreate("courses") && (
        <button
          type="button"
          onClick={handleAddCourse}
          aria-label="Add New Course"
          style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "white",
                    color: "#0E3746",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",       
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 4px 10px rgba(0, 0, 0, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <FaPlus size={16} />
          <span>Add Course</span>
        </button>
      )}
    </>
  }
/>

      {/* DEPARTMENT SELECTOR CARD */}
      <div className="card department-card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon-bg">
              <FaLayerGroup className="card-icon" />
            </div>
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
                  <span className="quick-stat-value active">
                    {stats.active}
                  </span>
                  <span className="quick-stat-label">Active</span>
                </div>
                <div className="quick-stat-divider" />
                <div className="quick-stat">
                  <span className="quick-stat-value">
                    {stats.totalCapacity.toLocaleString()}
                  </span>
                  <span className="quick-stat-label">Capacity</span>
                </div>
              </div>
            )}
          </div>
          {departmentsError && (
            <div className="inline-error-message">
              <FaInfoCircle className="info-icon" />
              <span>
                Some departments may not be available. Please try refreshing the
                page.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN COURSE SECTION */}
      {selectedDepartment && (
        <div className="card course-card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon-bg">
                <FaBookOpen className="card-icon" />
              </div>
              <div>
                <h3 className="card-title">{selectedDeptName} Courses</h3>
                <span className="card-subtitle">
                  {stats.total} {stats.total === 1 ? "Course" : "Courses"}{" "}
                  available
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

           {/* STANDARD COURSE LIST */}
<StandardListView
  columns={columns}
  data={filteredCourses}
  loading={loadingCourses}
  emptyState={{
    icon: FaBookOpen,
    title: "No courses found",
    description:
      "There are no courses in this department yet. Get started by adding your first course.",
    action: canCreate("courses")
      ? {
          label: "Add Your First Course",
          icon: FaPlus,
          onClick: handleAddCourse,
        }
      : null,
  }}
  actions={tableActions}
/>
            
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
        /* ================= DESIGN TOKENS ================= */
        .erp-page {
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

          /* Consistent radius scale, reused everywhere instead of one-off values */
          --radius-sm: 8px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 16px;
          --radius-2xl: 20px;
          --radius-pill: 999px;

          /* Consistent spacing scale */
          --space-1: 4px;
          --space-2: 8px;
          --space-3: 12px;
          --space-4: 16px;
          --space-5: 20px;
          --space-6: 24px;
          --space-8: 32px;

          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

          --ease: cubic-bezier(0.4, 0, 0.2, 1);

          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
          background: linear-gradient(180deg, #f0f4f8 0%, #e8eef5 100%);
          color: var(--text-primary);
          -webkit-font-smoothing: antialiased;
        }

        .erp-page * {
          box-sizing: border-box;
        }

        .erp-page :focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .erp-page * {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
          }
        }

        /* ================= TOAST NOTIFICATIONS ================= */
        .toast {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4) var(--space-5);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          box-shadow: var(--shadow-xl);
          z-index: 9999;
          animation: slideInRight 0.35s var(--ease);
          min-width: 320px;
          border: 1px solid var(--border-light);
        }

        .toast-success { border-left: 4px solid var(--success); }
        .toast-error { border-left: 4px solid var(--danger); }

        .toast-icon { font-size: 1.25rem; flex-shrink: 0; }
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
          padding: var(--space-1);
          margin-left: var(--space-2);
          border-radius: var(--radius-sm);
          transition: color 0.2s var(--ease);
        }

        .toast-close:hover { color: var(--text-primary); }

        @keyframes slideInRight {
          from { transform: translateX(calc(100% + 2rem)); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        /* ================= BREADCRUMBS ================= */
        :global(.breadcrumb-container) {
          margin-bottom: var(--space-6);
        }
        /* ================= COURSE BREADCRUMB ================= */
        .course-breadcrumb-wrapper {
          width: 100%;
          padding-top: 25px;
        }

        /* ================= BUTTONS ================= */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 42px;
  padding: 0 1.1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  text-decoration: none;
  white-space: nowrap;
}

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

.btn-primary {
  background: white;
  color: #0E3746;
  border-color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  background: #ffffff;
  color: #0E3746;
  border-color: #ffffff;
}

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--border-light);
          border-color: var(--border-medium);
        }

        .btn-danger {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.35);
        }

        .btn-outline {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border-color: var(--border-medium);
        }

        .btn-outline:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
          background: rgba(79, 70, 229, 0.05);
        }

.btn-ghost-inverse {
  background: rgba(255, 255, 255, 0.12);
  color: white;
  border-color: rgba(255, 255, 255, 0.22);
}

.btn-ghost-inverse:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

        .btn-lg {
          height: 46px;
          padding: 0 1.5rem;
          font-size: 0.95rem;
        }

        .btn-icon {
          font-size: 15px;
        }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ================= CARDS ================= */
.card {
  background: var(--bg-secondary);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border: 1px solid var(--border-light);
  margin-bottom: 16px;
}

.card-header {
  padding: 14px 20px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}



        .card-title-group {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .card-icon-bg {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: rgba(79, 70, 229, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-icon {
          font-size: 1.05rem;
          color: var(--primary);
        }

        .card-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .card-subtitle {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-top: 2px;
          display: block;
        }

       .card-body {
  padding: 18px 20px;
}

        .department-error-badge {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--warning);
        }

        .department-error-badge .error-icon { font-size: 0.9rem; }

        .inline-error-message {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          margin-top: var(--space-4);
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .inline-error-message .info-icon {
          color: var(--danger);
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        /* ================= DEPARTMENT SELECTOR ================= */
        .department-selector {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: nowrap;
          gap: var(--space-4);
        }

.select-wrapper {
  position: relative;
  min-width: 280px;
  flex: 0 1 520px;
  max-width: 520px;
}

       
.modern-select {
  width: 100%;
  height: 44px;
  padding: 0 2.75rem 0 16px;
  border: 1.5px solid var(--border-light);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-secondary);
  cursor: pointer;
  appearance: none;
  transition: all 0.18s var(--ease);
}

        .modern-select:hover { border-color: var(--border-medium); }

        .modern-select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .select-arrow {
          position: absolute;
          right: var(--space-5);
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
          font-size: 0.8rem;
        }

.quick-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 16px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  flex-shrink: 0;
}

        .quick-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

.quick-stat-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

        .quick-stat-value.active { color: var(--success); }

 .quick-stat-label {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.quick-stat-divider {
  width: 1px;
  height: 26px;
  background: var(--border-medium);
}

        /* ================= COURSE CARD ================= */
.card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

        .search-wrapper {
          position: relative;
          width: 280px;
        }

        .search-icon {
          position: absolute;
          left: var(--space-4);
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 0.85rem;
          pointer-events: none;
        }

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 2.4rem 0 2.35rem;
  border: 1.5px solid var(--border-light);
  border-radius: 10px;
  font-size: 0.82rem;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-secondary);
  transition: all 0.18s var(--ease);
}

        .search-input::placeholder { color: var(--text-muted); }
        .search-input:hover { border-color: var(--border-medium); }

        .search-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .search-clear {
          position: absolute;
          right: var(--space-3);
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-sm);
          display: flex;
          transition: color 0.18s var(--ease);
        }

        .search-clear:hover { color: var(--text-primary); }

        /* ================= STATS GRID ================= */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 14px 16px;
  min-height: 76px;
  border: 1px solid var(--border-light);
  transition: box-shadow 0.2s var(--ease), border-color 0.2s var(--ease);
}

        .stat-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--border-medium);
        }
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

        .stat-icon-blue { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; }
        .stat-icon-green { background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); color: white; }
        .stat-icon-purple { background: linear-gradient(135deg, #A855F7 0%, #9333EA 100%); color: white; }
        .stat-icon-orange { background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; }

        .stat-card-details {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

        .stat-sub-value {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* ================= TABLE ================= */
        .table-wrapper {
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
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

        .modern-table thead { background: var(--bg-tertiary); }

        .modern-table th {
          padding: var(--space-4) var(--space-5);
          text-align: left;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-secondary);
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border-medium);
        }

        .modern-table th.sortable {
          cursor: pointer;
          user-select: none;
          transition: background 0.18s var(--ease);
        }

        .modern-table th.sortable:hover { background: var(--border-light); }

        .th-content {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .th-icon { font-size: 0.8rem; opacity: 0.65; }

        .modern-table tbody tr {
          border-bottom: 1px solid var(--border-light);
          transition: background 0.15s var(--ease);
        }

        .modern-table tbody tr:last-child { border-bottom: none; }
        .modern-table tbody tr:hover { background: rgba(79, 70, 229, 0.025); }

        .modern-table td {
          padding: var(--space-4) var(--space-5);
          vertical-align: middle;
        }

        /* Table Columns */
        .col-index { width: 60px; text-align: center; }

        .index-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .col-course { min-width: 250px; }

        .course-info {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .course-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--primary) 0%, #7C3AED 100%);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .course-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .course-name-text {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .course-level {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .col-code { width: 120px; }

        .code-badge {
          display: inline-block;
          padding: 0.3rem 0.7rem;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: 0.02em;
        }

        .col-type { width: 120px; }

        .type-badge {
          display: inline-block;
          padding: 0.3rem 0.8rem;
          border-radius: var(--radius-pill);
          font-size: 0.76rem;
          font-weight: 600;
          border: 1px solid;
        }

        .col-status { width: 130px; }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: 0.3rem 0.8rem;
          border-radius: var(--radius-pill);
          font-size: 0.76rem;
          font-weight: 600;
          border: 1px solid;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .col-duration { width: 120px; }

        .duration-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .duration-value {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .duration-label {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .col-credits { width: 100px; }

        .credits-info {
          display: flex;
          align-items: baseline;
          gap: var(--space-1);
        }

        .credits-value {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .credits-label {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .col-capacity { width: 150px; }

        .capacity-info {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .capacity-bar-container {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex: 1;
        }

        .capacity-bar {
          flex: 1;
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-pill);
          overflow: hidden;
        }

        .capacity-fill {
          height: 100%;
          border-radius: var(--radius-pill);
          transition: width 0.4s var(--ease);
        }

        .capacity-text {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.82rem;
          min-width: 30px;
        }

        .col-actions { width: 140px; text-align: right; }

        .action-group {
          display: flex;
          gap: var(--space-2);
          justify-content: flex-end;
        }

        .action-btn {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.18s var(--ease);
          color: white;
          font-size: 0.85rem;
        }

        .action-view { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); }
        .action-edit { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); }
        .action-delete { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); }

        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.15);
        }

        .action-btn:active { transform: translateY(0); }

        /* ================= SKELETON ================= */
        .skeleton-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--border-light);
        }

        .skeleton-row {
          display: grid;
          grid-template-columns: 60px 1fr 120px 120px 130px 120px 100px 150px 140px;
          gap: var(--space-4);
          padding: var(--space-4) var(--space-5);
          background: var(--bg-secondary);
        }

        .skeleton-cell {
          height: 22px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-sm);
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
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: skeleton-shimmer 1.4s infinite;
        }

        .skeleton-index { width: 26px; margin: 0 auto; }
        .skeleton-course { display: flex; align-items: center; gap: var(--space-3); }
        .skeleton-avatar { width: 40px; height: 40px; border-radius: var(--radius-sm); flex-shrink: 0; }
        .skeleton-text-group { flex: 1; display: flex; flex-direction: column; gap: var(--space-2); }
        .skeleton-title { width: 80%; height: 14px; }
        .skeleton-subtitle { width: 50%; height: 11px; }
        .skeleton-code { width: 80px; }
        .skeleton-type { width: 70px; }
        .skeleton-status { width: 80px; }
        .skeleton-duration { width: 60px; }
        .skeleton-credits { width: 40px; }
        .skeleton-capacity { width: 100px; }
        .skeleton-actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
        .skeleton-action-btn { width: 34px; height: 34px; border-radius: var(--radius-sm); }

        @keyframes skeleton-shimmer { to { left: 100%; } }

        /* ================= EMPTY STATE ================= */
        .empty-state-wrapper {
          text-align: center;
          padding: var(--space-8) var(--space-6);
        }

        .empty-icon-circle {
          width: 88px;
          height: 88px;
          margin: 0 auto var(--space-5);
          background: rgba(79, 70, 229, 0.08);
          border-radius: var(--radius-2xl);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          font-size: 2.25rem;
        }

        .empty-state-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--space-2) 0;
        }

        .empty-state-description {
          font-size: 0.925rem;
          color: var(--text-secondary);
          max-width: 440px;
          margin: 0 auto var(--space-6);
          line-height: 1.6;
        }

        /* ================= MODAL ================= */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-5);
          animation: modalFadeIn 0.2s var(--ease);
        }

        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-container {
          background: var(--bg-secondary);
          border-radius: var(--radius-2xl);
          width: 100%;
          max-width: 480px;
          box-shadow: var(--shadow-xl);
          animation: modalSlideUp 0.25s var(--ease);
          overflow: hidden;
        }

        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-header {
          padding: var(--space-5) var(--space-5) 0;
          display: flex;
          justify-content: flex-end;
        }

        .modal-icon-wrapper {
          position: absolute;
          top: var(--space-5);
          left: 50%;
          transform: translateX(-50%);
        }

        .modal-icon-bg {
          width: 52px;
          height: 52px;
          background: rgba(245, 158, 11, 0.12);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #D97706;
          font-size: 1.4rem;
        }

        .modal-close-btn {
          position: relative;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s var(--ease);
        }

        .modal-close-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .modal-close-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .modal-body { padding: var(--space-3) var(--space-6) var(--space-6); }

        .modal-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: var(--space-4) 0 var(--space-2) 0;
          text-align: center;
        }

        .modal-description {
          color: var(--text-secondary);
          text-align: center;
          margin: 0 0 var(--space-5) 0;
          line-height: 1.6;
          font-size: 0.9rem;
        }

        .course-info-card {
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--space-4) var(--space-5);
          margin-bottom: var(--space-5);
        }

        .info-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) 0;
        }

        .info-icon {
          width: 36px;
          height: 36px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          font-size: 0.95rem;
          flex-shrink: 0;
        }

        .info-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .info-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .info-value {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .info-divider {
          height: 1px;
          background: var(--border-medium);
          margin: var(--space-1) 0;
        }

        .warning-box {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-4);
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-md);
        }

        .warning-box .warning-icon {
          color: var(--warning);
          font-size: 1.1rem;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .warning-content {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-footer {
          padding: var(--space-5) var(--space-6);
          background: var(--bg-tertiary);
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          border-top: 1px solid var(--border-light);
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 1024px) {
          .skeleton-row {
            grid-template-columns: 60px 1fr 100px 100px 110px 100px 80px 120px 120px;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-5);
            padding: var(--space-6) var(--space-5);
          }

          .header-actions { width: 100%; }
          .header-actions .btn { flex: 1; }

          .department-selector {
            flex-direction: column;
            align-items: stretch;
          }

          .select-wrapper { min-width: auto; max-width: none; }
          .quick-stats { justify-content: center; }

          .card-header {
            flex-direction: column;
            gap: var(--space-4);
            align-items: stretch;
          }

          .card-actions { flex-direction: column; }
          .search-wrapper { width: 100%; }

          .stats-grid { grid-template-columns: repeat(2, 1fr); }

          .modern-table th,
          .modern-table td { padding: var(--space-3); }

          .course-avatar { width: 34px; height: 34px; font-size: 0.85rem; }

          .toast {
            left: 1rem;
            right: 1rem;
            top: auto;
            bottom: 1.5rem;
            min-width: auto;
          }

          .modal-container {
            margin: var(--space-4);
            max-height: calc(100vh - 2rem);
            overflow-y: auto;
          }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
          .action-group { gap: var(--space-2); }
          .action-btn { width: 30px; height: 30px; font-size: 0.78rem; }
          .page-title { font-size: 1.35rem; }
          .header-icon-bg { width: 52px; height: 52px; }
        }
      `}</style>
    </div>
  );
}
