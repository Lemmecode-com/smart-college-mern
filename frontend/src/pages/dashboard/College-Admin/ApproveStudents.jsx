import { useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Pagination from "../../../components/Pagination";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import StandardListView from "../../../components/StandardListView/StandardListView";
import { FaSearch, FaEye, FaCheckCircle, FaGraduationCap, FaBuilding, FaBookOpen, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaSyncAlt, FaUserCheck, FaUserTimes, FaEnvelope, FaUsers, FaCheckDouble, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import ConfirmModal from "../../../components/ConfirmModal";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

const STUDENT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  OFFER_MADE: "OFFER_MADE",
  SEAT_CONFIRMED: "SEAT_CONFIRMED",
  ENROLLED: "ENROLLED",
  REJECTED: "REJECTED",
  DELETED: "DELETED",
  ALUMNI: "ALUMNI",
  DEACTIVATED: "DEACTIVATED",
};

const PAGE_SIZE = 5;

export default function ApproveStudents({ admissionOfficerMode = false, principalMode = false }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

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

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    byDepartment: {},
    byCourse: {},
    byYear: {},
  });
  const [processingId, setProcessingId] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState(null);
  const [parentCreds, setParentCreds] = useState(null);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [validDivisions, setValidDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [assigningDivision, setAssigningDivision] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [assigningStudentId, setAssigningStudentId] = useState(null);
  const [divisionError, setDivisionError] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (principalMode && user.role !== "PRINCIPAL") {
    return <Navigate to="/dashboard" />;
  }
  if (!admissionOfficerMode && !principalMode && user.role !== "COLLEGE_ADMIN") {
    return <Navigate to="/dashboard" />;
  }
  // When admissionOfficerMode is true, we allow ADMISSION_OFFICER (ProtectedRoute already validated)

  /* ================= FETCH APPROVED STUDENTS ================= */
  const fetchApprovedStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch the full set (not just the default page of 20) so the
      // Total Approved / Departments / Courses stat cards reflect all
      // approved students instead of only the first paginated page.
      const res = await api.get("/students/approved-students?limit=10000");

      let data;
      if (res.data.data) {
        data = res.data.data;
      } else if (Array.isArray(res.data)) {
        data = res.data;
      } else {
        data = [];
      }

      setStudents(data);
      calculateStats(data);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load approved students.";

      logger.error("Error fetching approved students:", statusCode, errorCode);

      setError({
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
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH ALL STUDENTS (PRINCIPAL) ================= */
  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/students/approved");
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];
      setStudents(data);
      calculateStats(data);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load students.";

      logger.error("Error fetching students:", statusCode, errorCode);

      setError({
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
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch on mount
  useEffect(() => {
    principalMode ? fetchAllStudents() : fetchApprovedStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when navigating from approval action
  useEffect(() => {
    if (location.state?.refresh) {
      principalMode ? fetchAllStudents() : fetchApprovedStudents();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refresh]);

  // Refresh on page focus (when user returns to tab) - with debounce to prevent excessive calls
  useEffect(() => {
    let lastRefreshTime = 0;
    const MIN_REFRESH_INTERVAL = 30000; // Minimum 30 seconds between refreshes

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (
        document.visibilityState === "visible" &&
        now - lastRefreshTime > MIN_REFRESH_INTERVAL
      ) {
        lastRefreshTime = now;
        principalMode ? fetchAllStudents() : fetchApprovedStudents();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    principalMode ? fetchAllStudents() : fetchApprovedStudents();
  };

  /* ================= CALCULATE STATS ================= */
  const calculateStats = (studentList) => {
    const byDepartment = {};
    const byCourse = {};
    const byYear = {};

    studentList.forEach((student) => {
      const dept = student.department_id?.name || "Unknown";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;

      const course = student.course_id?.name || "Unknown";
      byCourse[course] = (byCourse[course] || 0) + 1;

      const year = student.admissionYear || "Unknown";
      byYear[year] = (byYear[year] || 0) + 1;
    });

    setStats({
      total: studentList.length,
      byDepartment,
      byCourse,
      byYear,
    });
  };

  /* ================= SEARCH ================= */
  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      `${s.fullName} ${s.email} ${s.department_id?.name || ""} ${s.course_id?.name || ""} ${s.admissionYear || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [students, search]);

  /* ================= DEACTIVATE / REACTIVATE ================= */
  const handleToggleActive = async (student) => {
    if (student.status === STUDENT_STATUS.DEACTIVATED) {
      if (!window.confirm(`Reactivate "${student.fullName}"?`)) return;
      try {
        await api.put(`/users/${student.user_id}/reactivate`);
        toast.success(`${student.fullName} reactivated`, {
          position: "top-right",
        });
        principalMode ? fetchAllStudents() : fetchApprovedStudents();
      } catch (e) {
        toast.error(e.response?.data?.message || "Failed to reactivate", {
          position: "top-right",
        });
      }
    } else {
      if (
        !window.confirm(
          `Deactivate "${student.fullName}"? They will lose access.`,
        )
      )
        return;
      try {
        await api.put(`/users/${student.user_id}/deactivate`);
        toast.success(`${student.fullName} deactivated`, {
          position: "top-right",
        });
        principalMode ? fetchAllStudents() : fetchApprovedStudents();
      } catch (e) {
        toast.error(e.response?.data?.message || "Failed to deactivate", {
          position: "top-right",
        });
      }
    }
  };

  /* ================= CONFIRM ENROLLMENT ================= */
  const handleConfirmEnrollment = (studentId) => {
    setEnrollStudentId(studentId);
    setShowEnrollModal(true);
  };

  const executeConfirmEnrollment = async () => {
    if (!enrollStudentId) return;

    setProcessingId(enrollStudentId);
    try {
      const { data } = await api.put(`/students/${enrollStudentId}/confirm-enrollment`);
      toast.success("Enrollment confirmed successfully!", {
        position: "top-right",
      });
      if (data?.parentAccounts?.parents?.length) {
        setParentCreds(data.parentAccounts.parents);
      }
      fetchApprovedStudents();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to confirm enrollment", {
        position: "top-right",
      });
    } finally {
      setShowEnrollModal(false);
      setEnrollStudentId(null);
      setProcessingId(null);
    }
  };

  /* ================= DIVISION ASSIGNMENT HANDLERS ================= */
  const handleOpenDivisionModal = async (studentId) => {
    setShowDivisionModal(true);
    setAssigningStudentId(studentId);
    setSelectedDivision("");
    setDivisionError(null);
    setLoadingDivisions(true);
    try {
      const res = await api.get(`/students/${studentId}/valid-divisions`);
      const divisions = Array.isArray(res.data) ? res.data : [];
      setValidDivisions(divisions);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load valid divisions";
      setDivisionError(message);
      setValidDivisions([]);
    } finally {
      setLoadingDivisions(false);
    }
  };

  const handleAssignDivisionFromPending = async () => {
    if (!assigningStudentId || !selectedDivision) return;
    try {
      setAssigningDivision(true);
      await api.put(`/students/${assigningStudentId}`, {
        division: selectedDivision,
      });
      toast.success("Division assigned successfully", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowDivisionModal(false);
      principalMode ? fetchAllStudents() : fetchApprovedStudents();
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to assign division";
      toast.error(message, { position: "top-right", autoClose: 5000 });
    } finally {
      setAssigningDivision(false);
      setAssigningStudentId(null);
      setSelectedDivision("");
    }
  };

  const tableActions = {
  label: "Actions",
  width: "670px",
  text: "Actions",

  items: [
    {
      key: "view",
      label: "View Student",
      icon: FaEye,
      className: "view-btn",
      text: "View Student",
      style: {fontSize: "11px", fontWeight: "500",},
      show: () => !principalMode,
      onClick: (student) =>
        navigate(`/college/view-approved-student/${student._id}`),
    },

    {
      key: "assign-division",
      label: "Assign Division",
      icon: FaEdit,
      className: "edit-btn",
      text: "Assign Division",
      style: {fontSize: "11px", fontWeight: "500"},

      show: (student) =>
        !principalMode &&
        (
          student.status === STUDENT_STATUS.APPROVED ||
          student.status === STUDENT_STATUS.OFFER_MADE ||
          student.status === STUDENT_STATUS.SEAT_CONFIRMED
        ) &&
        !student.division,

      onClick: (student) =>
        handleOpenDivisionModal(student._id),
    },

    {
      key: "confirm-enrollment",
      label: "Confirm Enrollment",
      icon: FaCheckDouble,
      className: "approve-btn",
      text: "Confirm Enrollment",
      style: {fontSize: "11px", fontWeight: "500"},
      show: (student) =>
        !principalMode &&
        (
          student.status === STUDENT_STATUS.APPROVED ||
          student.status === STUDENT_STATUS.OFFER_MADE ||
          student.status === STUDENT_STATUS.SEAT_CONFIRMED
        ),

      onClick: (student) =>
        handleConfirmEnrollment(student._id),

      disabled: (student) =>
        processingId === student._id || !student.division,

      title: (student) =>
        !student.division
          ? "Assign division before enrollment"
          : processingId === student._id
          ? "Processing..."
          : "Confirm Enrollment",
    },

    {
      key: "toggle-active",
      label: "Deactivate",
      icon: FaUserTimes,
      className: "warning-btn",
      text: "Deactivate",
      style: {fontSize: "11px", fontWeight: "500"},
      show: (student) =>
        !principalMode && !!student.user_id,

      onClick: (student) =>
        handleToggleActive(student),

      getLabel: (student) =>
        student.status === STUDENT_STATUS.DEACTIVATED
          ? "Reactivate"
          : "Deactivate",

      getIcon: (student) =>
        student.status === STUDENT_STATUS.DEACTIVATED
          ? FaUserCheck
          : FaUserTimes,
    },
  ],
};

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const columns = [
  {
    key: "fullName",
    label: "Student Name",
    sortable: false,
    width: "240px",
    render: (student) => (
      <div className="student-info">
        <span className="student-name-cell" style={{ fontSize: "14px" }}>
          {student.fullName}
        </span>

        <span className="student-email" style={{ fontSize: "12px" }}>
          {student.email}
        </span>
      </div>
    ),
  },

  {
    key: "course",
    label: "Course",
    sortable: false,
    width: "185px",

    render: (student) => (
      <span className="badge badge-course" style={{ fontSize: "10px" }}>
        {student.course_id?.name || "N/A"}
      </span>
    ),
  },

  {
    key: "department",
    label: "Department",
    sortable: false,
    width: "180px",
    render: (student) => (
      <span className="department-name" style={{ fontSize: "12px" }}>
        {student.department_id?.name || "N/A"}
      </span>
    ),
  },

  {
    key: "admissionYear",
    label: "Admission Year",
    sortable: false,
    width: "120px",
    render: (student) => (
      <span className="badge badge-graduation-year" style={{ fontSize: "10px" }}>
        <FaCalendarAlt className="badge-icon" />
        {student.admissionYear || "N/A"}
      </span>
    ),
  },

  {
    key: "status",
    label: "Status",
    sortable: false,
    width: "130px",
    render: (student) => {
      if (student.status === STUDENT_STATUS.OFFER_MADE) {
        return (
          <span className="badge badge-offer-made" >
            <FaEnvelope className="badge-icon" />
            OFFER MADE
          </span>
        );
      }

      if (student.status === STUDENT_STATUS.ENROLLED) {
        return (
          <span className="badge badge-enrolled">
            <FaCheckDouble className="badge-icon" />
            ENROLLED
          </span>
        );
      }

      return (
        <span className="badge badge-status">
          <FaCheckCircle className="badge-icon" />
          APPROVED
        </span>
      );
    },
  },
];

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <ApiError
        title="Approved Students Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
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
            text="Loading approved students..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="erp-container">
        {/* BREADCRUMBS */}
        <Breadcrumb
          items={principalMode
            ? [
                { label: "Dashboard", path: "/dashboard/principal" },
                { label: "Students",},
                { label: "All Students" },
              ]
            : admissionOfficerMode
            ? [
                { label: "Dashboard", path: "/dashboard/admission" },
                { label: "Admissions",},
                { label: "Approved Students" },
              ]
            : [
                { label: "Dashboard", path: "/dashboard" },
                { label: "Students", },
                { label: "Approved Students" },
              ]
          }
        />

        {/* HEADER */}
        <PageHeader
          icon={principalMode ? FaUsers : FaCheckCircle}
          title={principalMode ? "All Students" : "Approved Students"}
          subtitle={
            principalMode
              ? "View all students across the college"
              : "View and manage students approved for admission"
          }
        />

        {/* STATS CARDS */}
        <div className="stats-grid animate-fade-in">
          <div className="stat-card">
            <div
              className="stat-card-icon"
              style={{
                background: "linear-gradient(135deg, #4CAF50 0%, #43A047 100%)",
              }}
            >
              <FaUserCheck />
            </div>
            <div className="stat-card-content">
              <div className="stat-card-label">
                {principalMode ? "Total Students" : "Total Approved"}
              </div>
              <div className="stat-card-value">{stats.total}</div>
            </div>
          </div>
        <div className="stat-card">
          <div
            className="stat-card-icon"
            style={{
              background: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
            }}
          >
            <FaBuilding />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Departments</div>
            <div className="stat-card-value">
              {Object.keys(stats.byDepartment).length}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-card-icon"
            style={{
              background: "linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)",
            }}
          >
            <FaBookOpen />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Courses</div>
            <div className="stat-card-value">
              {Object.keys(stats.byCourse).length}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="erp-card animate-fade-in">
        <div className="erp-card-body">
          <div className="controls-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search approved students by name, email, department, or course..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search approved students"
              />
            </div>
          </div>
        </div>
      </div>

{/* ================= STANDARD STUDENT LIST ================= */}

<StandardListView
  className="approve-students-list"
  title={principalMode ? "Student Records" : "Approved Student Records"}
  icon={FaGraduationCap}
  count={filteredStudents.length}
  columns={columns}
  data={paginatedStudents}
  loading={false}
  emptyState={{
    icon: FaCheckCircle,

    title: principalMode
      ? "No Students Found"
      : "No Approved Students Found",

    description: search
      ? "No approved students match your search criteria."
      : "There are no approved students yet. Students will appear here after approval.",
  }}
  actions={tableActions}
/>

{totalPages > 1 && (
  <div className="erp-pagination">
    <Pagination
      page={page}
      totalPages={totalPages}
      setPage={setPage}
    />
  </div>
)}
      {/* STYLES */}
      <style>{`
        /* ================= GLOBAL TYPOGRAPHY ================= */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

        .erp-container {
          padding: 1.5rem;
          background: #f5f7fa;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          animation: fadeIn 0.6s ease;
        }

/* ================= APPROVED STUDENTS TABLE ACTIONS ================= */

.approve-students-list .standard-table-actions-cell {
  min-width: 420px;
  padding: 18px 20px;
}

.approve-students-list .standard-table-actions-cell > div {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  flex-wrap: nowrap;
}

/* Common action button */
.approve-students-list .standard-action-btn {
  min-height: 38px;
  padding: 0 22px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: -3rem;
  border: none;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

/* Icon */
.approve-students-list .standard-action-btn svg {
  font-size: 12px;
  margin-right: 14px;
  
}

/* View */
.approve-students-list .standard-action-btn.view-btn {
  min-width: 140px;
  background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(61, 181, 230, 0.28);
}

.approve-students-list .standard-action-btn.view-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(61, 181, 230, 0.35);
}

/* Assign Division */
.approve-students-list .standard-action-btn.edit-btn {
  min-width: 155px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.28);
}

.approve-students-list .standard-action-btn.edit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.35);
}

/* Confirm Enrollment */
.approve-students-list .standard-action-btn.approve-btn {
  min-width: 169px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.28);
}

.approve-students-list .standard-action-btn.approve-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(59, 130, 246, 0.35);
}

/* Disabled Confirm Enrollment */
.approve-students-list .standard-action-btn.approve-btn:disabled {
  background: #6b9ee8;
  color: #64748b;
  opacity: 0.85;
  cursor: not-allowed;
  box-shadow: none;
}

/* Deactivate */
.approve-students-list .standard-action-btn.warning-btn {
  min-width: 125px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.28);
}

.approve-students-list .standard-action-btn.warning-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(245, 158, 11, 0.35);
}

/* Reactivate */
.approve-students-list .standard-action-btn.warning-btn.reactivate {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

/* Active press */
.approve-students-list .standard-action-btn:active:not(:disabled) {
  transform: translateY(0);
}

/* Small screen */
@media (max-width: 768px) {
  .approve-students-list .standard-table-actions-cell > div {
    gap: 8px;
  }

  .approve-students-list .standard-action-btn {
    min-height: 44px;
    padding: 0 16px;
    font-size: 13px;
  }
}
        /* ================= STATS GRID ================= */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          padding: 1.75rem;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #3db5e6;
          transition: all 0.3s ease;
          height: 100px;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 28px rgba(15, 58, 74, 0.15);
          border-color: #3db5e6;
        }

        .stat-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
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
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 0.375rem;
          font-family: 'Inter', sans-serif;
        }

        .stat-card-value {
          font-size: 2rem;
          font-weight: 700;
          color: #0f3a4a;
          line-height: 1;
          font-family: 'Poppins', sans-serif;
        }
        
        /* ================= CONTROLS CARD ================= */
        .erp-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 1.5rem;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .erp-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .erp-card-header {
          padding: 1.5rem 2rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .erp-card-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f3a4a;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: 'Poppins', sans-serif;
        }

        .erp-card-icon {
          color: #3db5e6;
          font-size: 1.25rem;
        }

        .record-count {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          padding: 0.375rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
        }

        .erp-card-body {
          padding: 0;
        }

        .controls-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 320px;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 1rem;
        }

        .search-box input {
          width: 100%;
          padding: 0.875rem 1.25rem 0.875rem 2.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          font-family: 'Inter', sans-serif;
        }

        .search-box input:focus {
          border-color: #3db5e6;
          box-shadow: 0 0 0 0.25rem rgba(61, 181, 230, 0.1);
          outline: none;
        }

        .search-box input::placeholder {
          color: #94a3b8;
        }

        /* ================= TABLE ================= */
        .table-container {
          overflow-x: auto;
          border-radius: 12px;
        }

        .erp-table {
          width: 100%;
          border-collapse: collapse;
        }

        .erp-table thead {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
        }

        .erp-table th {
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: none;
          white-space: nowrap;
          opacity: 0.95;
          font-family: 'Inter', sans-serif;
        }

        .erp-table th:first-child {
          border-top-left-radius: 12px;
        }

        .erp-table th:last-child {
          border-top-right-radius: 12px;
        }

        .header-icon {
          margin-right: 0.5rem;
          font-size: 0.9rem;
          color: #3db5e6;
        }

        .erp-table tbody tr {
          transition: all 0.25s ease;
          border-bottom: 1px solid #e2e8f0;
        }

        .erp-table tbody tr:hover {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.1);
        }

        .erp-table td {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
          font-family: 'Inter', sans-serif;
        }

        /* Table Cell Styles */
        .th-student,
        .cell-student {
          min-width: 240px;
        }

        .th-course,
        .cell-course {
          min-width: 180px;
        }

        .th-department,
        .cell-department {
          min-width: 200px;
        }

        .th-year,
        .cell-year {
          min-width: 150px;
        }

        .th-status,
        .cell-status {
          min-width: 140px;
        }

        .th-actions,
        .cell-actions {
          min-width: 140px;
        }

        /* Student Info Cell */
        .student-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .student-name-cell {
          font-weight: 700;
          color: #0f3a4a;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
        }

        .student-email {
          font-size: 13px;
          color: #64748b;
          font-family: 'Inter', sans-serif;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 24px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
        }

        .badge-icon {
          font-size: 12px;
        }

        .badge-course {
          background: linear-gradient(135deg, #0f3a4a 0%, #1a5263 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(15, 58, 74, 0.3);
        }

        .badge-graduation-year {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .badge-status {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
        }

        .department-name {
          color: #475569;
          font-weight: 600;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
        }

        .text-center {
          text-align: center;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .btn:active {
          transform: translateY(-1px);
        }

        .btn-action {
          padding: 10px 18px;
          font-size: 13px;
          border-radius: 8px;
          transition: all 0.25s ease;
        }

        .btn-action svg {
          font-size: 14px;
        }

        .btn-view-student {
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(61, 181, 230, 0.3);
        }

        .btn-view-student:hover {
          background: linear-gradient(135deg, #0f3a4a 0%, #3db5e6 100%);
          box-shadow: 0 5px 15px rgba(61, 181, 230, 0.4);
        }

        .btn-deactivate-student {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(245, 158, 11, 0.3);
        }

        .btn-deactivate-student:hover {
          background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
          box-shadow: 0 5px 15px rgba(245, 158, 11, 0.4);
        }

        .btn-reactivate-student {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
        }

        .btn-reactivate-student:hover {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
        }

        .btn-text {
          margin-left: 4px;
        }
        
        /* ================= PAGINATION ================= */
        .erp-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          gap: 0.5rem;
        }

        .page-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #0f3a4a;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
        }

        .page-btn:hover:not(:disabled) {
          background: #f6fbff;
          border-color: #3db5e6;
          transform: translateY(-1px);
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-btn.active {
          background: linear-gradient(135deg, #3db5e6 0%, #0f3a4a 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 3px 10px rgba(61, 181, 230, 0.3);
        }

        .page-numbers {
          display: flex;
          gap: 0.375rem;
        }

        /* ================= EMPTY STATE ================= */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          width: 96px;
          height: 96px;
          margin: 0 auto 2rem;
          background: linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(4, 120, 87, 0.08) 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
          font-size: 3rem;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          color: #0f3a4a;
          margin-bottom: 0.75rem;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
        }

        .empty-description {
          font-size: 1rem;
          margin-bottom: 1.5rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
          color: #64748b;
          line-height: 1.6;
          font-family: 'Inter', sans-serif;
        }

        /* ================= ERROR CONTAINER ================= */
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
          background: rgba(239, 68, 68, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #ef4444;
          font-size: 3rem;
        }

        .erp-error-container h3 {
          font-size: 1.75rem;
          color: #0f3a4a;
          margin-bottom: 1rem;
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
        }

        .erp-error-container p {
          color: #64748b;
          font-size: 1rem;
          max-width: 500px;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          font-family: 'Inter', sans-serif;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        /* ================= ANIMATIONS ================= */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease;
        }

        /* ================= RESPONSIVE DESIGN ================= */
        @media (max-width: 992px) {
          .controls-container {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: auto;
            max-width: 100%;
          }

          .erp-table {
            min-width: 750px;
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

          .erp-header-content {
            gap: 1rem;
          }

          .erp-header-icon {
            width: 56px;
            height: 56px;
            font-size: 1.75rem;
          }

          .erp-page-title {
            font-size: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 1rem;
          }

          .stat-card {
            padding: 1.25rem;
            height: auto;
          }

          .stat-card-icon {
            width: 48px;
            height: 48px;
            font-size: 1.25rem;
          }

          .stat-card-value {
            font-size: 1.75rem;
          }

          .erp-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem 1.5rem;
          }

          .record-count {
            align-self: flex-end;
          }

          .controls-container {
            padding: 1.25rem 1.5rem;
          }

          .search-box {
            min-width: 100%;
          }

          .erp-table {
            min-width: 650px;
          }

          .erp-table th {
            padding: 14px 16px;
            font-size: 11px;
          }

          .erp-table td {
            padding: 16px 16px;
          }

          .page-numbers {
            flex-wrap: wrap;
          }

          .page-btn {
            width: 36px;
            height: 36px;
            font-size: 0.85rem;
          }

          .empty-icon {
            width: 80px;
            height: 80px;
            font-size: 2.5rem;
          }

          .empty-state h3 {
            font-size: 1.25rem;
          }

          .btn-action {
            padding: 8px 14px;
            font-size: 12px;
          }
        }

        @media (max-width: 480px) {
          .erp-table {
            min-width: 550px;
          }

          .erp-card-header h3 {
            font-size: 1.125rem;
          }

          .erp-card-header .erp-card-icon {
            font-size: 1.1rem;
          }

          .student-name-cell {
            font-size: 14px;
          }

          .student-email {
            font-size: 12px;
          }

          .department-name {
            font-size: 13px;
          }

          .badge {
            font-size: 11px;
            padding: 6px 12px;
          }

          .stat-card-label {
            font-size: 0.85rem;
          }

          .stat-card-value {
            font-size: 1.5rem;
          }

          .erp-page-title {
            font-size: 1.375rem;
          }

          .erp-table th {
            padding: 12px 14px;
            font-size: 10px;
          }

          .erp-table td {
            padding: 14px 14px;
          }
        }

        /* Badge styles for new statuses */
        .badge-offer-made {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .badge-enrolled {
          background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(13, 110, 253, 0.3);
        }

        .btn-confirm-enrollment {
          background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);
          color: white;
          box-shadow: 0 3px 10px rgba(13, 110, 253, 0.3);
        }

        .btn-confirm-enrollment:hover {
          background: linear-gradient(135deg, #0b5ed7 0%, #0d6efd 100%);
          box-shadow: 0 5px 15px rgba(13, 110, 253, 0.4);
        }

        .parent-creds-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 16px;
        }

        .parent-creds-modal {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 460px;
          padding: 22px 24px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
          max-height: 85vh;
          overflow-y: auto;
        }

        .parent-creds-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .parent-creds-header h3 {
          margin: 0;
          font-size: 18px;
          color: #1f2d3d;
        }

        .parent-creds-close {
          border: none;
          background: transparent;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
          color: #6c757d;
        }

        .parent-creds-note {
          font-size: 13px;
          color: #6c757d;
          margin: 8px 0 16px;
        }

        .parent-creds-card {
          border: 1px solid #e3e6ea;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 12px;
          background: #f8f9fb;
        }

        .parent-creds-relation {
          font-weight: 600;
          color: #0d6efd;
          margin-bottom: 8px;
        }

        .parent-creds-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
          font-size: 14px;
        }

        .parent-creds-label {
          font-weight: 600;
          color: #495057;
          min-width: 70px;
        }

        .parent-creds-value {
          flex: 1;
          word-break: break-all;
          color: #212529;
        }

        .parent-creds-copy {
          border: none;
          background: #0d6efd;
          color: #fff;
          border-radius: 6px;
          padding: 3px 10px;
          cursor: pointer;
          font-size: 12px;
        }

        .parent-creds-done {
          width: 100%;
          margin-top: 6px;
          border: none;
          background: #198754;
          color: #fff;
          border-radius: 8px;
          padding: 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
        }

        .btn-assign-division {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .btn-assign-division:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .modal-header--info {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .modal-header-icon {
          margin-right: 8px;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 16px;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
          max-height: 85vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
        }

        .btn-close {
          border: none;
          background: transparent;
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
          color: white;
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .btn-close:hover {
          opacity: 1;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #374151;
        }

        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .text-muted {
          color: #6b7280;
          font-size: 14px;
        }


      `}</style>

      {/* CONFIRM ENROLLMENT MODAL */}
      <ConfirmModal
        isOpen={showEnrollModal}
        onClose={() => {
          setShowEnrollModal(false);
          setEnrollStudentId(null);
        }}
        onConfirm={executeConfirmEnrollment}
        title="Confirm Enrollment"
        message="Are you sure you want to confirm enrollment for this student? This will finalize their admission status."
        type="success"
        confirmText="Confirm Enrollment"
        cancelText="Cancel"
        isLoading={processingId === enrollStudentId}
      />

      {/* ASSIGN DIVISION MODAL */}
      {showDivisionModal && (
        <div className="modal-overlay" onClick={() => setShowDivisionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header modal-header--info">
              <h3>
                <FaEdit className="modal-header-icon" />
                Assign Division
              </h3>
              <button
                className="btn-close"
                onClick={() => setShowDivisionModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {loadingDivisions ? (
                <p>Loading valid divisions...</p>
              ) : divisionError ? (
                <p className="text-danger">
                  Failed to load divisions: {divisionError}
                </p>
              ) : validDivisions.length > 0 ? (
                <div className="form-group">
                  <label>Select Division</label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="form-control"
                  >
                    <option value="">-- Select Division --</option>
                    {validDivisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-muted">No valid divisions available for this student.</p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDivisionModal(false)}
                disabled={assigningDivision}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAssignDivisionFromPending}
                disabled={assigningDivision || loadingDivisions || !selectedDivision}
              >
                {assigningDivision ? (
                  <>
                    <FaSyncAlt className="spin" /> Saving…
                  </>
                ) : (
                  "Save Division"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARENT CREDENTIALS MODAL */}
      {parentCreds && (
        <div className="parent-creds-overlay" onClick={() => setParentCreds(null)}>
          <div className="parent-creds-modal" onClick={(e) => e.stopPropagation()}>
            <div className="parent-creds-header">
              <h3>Parent/Guardian Account Credentials</h3>
              <button className="parent-creds-close" onClick={() => setParentCreds(null)}>
                ×
              </button>
            </div>
            <p className="parent-creds-note">
              Share these credentials with the respective parent/guardian. They must change the password on first login.
            </p>
            {parentCreds.map((p, i) => (
              <div className="parent-creds-card" key={i}>
                <div className="parent-creds-relation">
                  {p.relation ? p.relation.charAt(0).toUpperCase() + p.relation.slice(1) : "Parent"} — {p.name}
                </div>
                <div className="parent-creds-row">
                  <span className="parent-creds-label">Email:</span>
                  <span className="parent-creds-value">{p.email}</span>
                  <button
                    className="parent-creds-copy"
                    onClick={() => navigator.clipboard.writeText(p.email)}
                  >
                    Copy
                  </button>
                </div>
                {p.tempPassword && (
                  <div className="parent-creds-row">
                    <span className="parent-creds-label">Password:</span>
                    <span className="parent-creds-value">{p.tempPassword}</span>
                    <button
                      className="parent-creds-copy"
                      onClick={() => navigator.clipboard.writeText(p.tempPassword)}
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button className="parent-creds-done" onClick={() => setParentCreds(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
