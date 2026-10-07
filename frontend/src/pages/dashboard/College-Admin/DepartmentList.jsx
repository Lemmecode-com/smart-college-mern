import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import StandardListView from "../../../components/StandardListView/StandardListView";
import Pagination from "../../../components/Pagination";
import useRole from "../../../hooks/useRole";

import {
  FaBuilding,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaUserSlash,
  FaSearch,
  FaPlus,
  FaInfoCircle,
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaBook,
  FaFilter,
  FaDownload,
  FaPrint,
  FaEye,
  FaArrowLeft,
  FaTimes,
} from "react-icons/fa";

import ConfirmModal from "../../../components/ConfirmModal";
import HodSubjectReassign from "../../../components/HodSubjectReassign";
import ApiError from "../../../components/ApiError";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";

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

/* ==========================================================================
   Design tokens — same palette used across the department pages, so this
   list and the detail view read as one consistent product.
   ========================================================================== */
const T = {
  navy: "#1e3a5f",
  navyDark: "#14293f",
  navyTint: "#eaf0f6",
  teal: "#2d6e7e",
  tealTint: "#e5f1f3",
  amber: "#b56a1f",
  amberTint: "#fdf0e3",
  danger: "#b3261e",
  dangerTint: "#fbe9e7",
  bg: "#f6f7f9",
  surface: "#ffffff",
  border: "#e6e8ec",
  text: "#1f2530",
  textMuted: "#6b7280",
  success: "#157a4a",
  successBg: "#e3f6ec",
  inactive: "#6b7280",
  inactiveBg: "#eef0f2",
  headerTeal: "#0f4653",
  radiusLg: 14,
  radiusMd: 10,
  radiusSm: 7,
  shadow: "0 1px 2px rgba(20,27,41,0.04), 0 2px 8px rgba(20,27,41,0.05)",
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/* ================= small presentational helpers (inline styles only) ================= */

function useViewportWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

function Btn({ children, onClick, variant = "outline", color = T.navy, tint, disabled, title, type = "button" }) {
  const [hover, setHover] = useState(false);
  const solid = {
    background: hover ? T.navyDark : color,
    color: "#fff",
    border: `1px solid ${hover ? T.navyDark : color}`,
    boxShadow: hover ? "0 4px 10px rgba(20,27,41,0.18)" : "none",
  };
const outline = {
  background: hover ? (tint || T.navyTint) : (tint || T.surface),
  color,
  border: `1px solid ${hover ? color : T.border}`,
};
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.85rem",
        fontWeight: 600,
        borderRadius: T.radiusSm,
        padding: "0.6rem 1.1rem",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease",
        opacity: disabled ? 0.6 : 1,
        transform: hover && !disabled ? "translateY(-1px)" : "translateY(0)",
        whiteSpace: "nowrap",
        ...(variant === "solid" ? solid : outline),
      }}
    >
      {children}
    </button>
  );
}

function IconAction({ icon, onClick, title, color, tint }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: T.radiusSm,
        border: `1px solid ${hover ? color : T.border}`,
        background: hover ? tint : T.surface,
        color,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {icon}
    </button>
  );
}

function Chip({ children, bg, color, dot }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "0.28rem 0.65rem",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />}
      {children}
    </span>
  );
}

function Pill({ children, bg, color, mono }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 500,
        background: bg,
        color,
        whiteSpace: "nowrap",
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
      }}
    >
      {children}
    </span>
  );
}

function FilterBadge({ label, onClear }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "0.3rem 0.5rem 0.3rem 0.75rem",
        borderRadius: 999,
        fontSize: "0.78rem",
        fontWeight: 500,
        background: T.navyTint,
        color: T.navyDark,
      }}
    >
      {label}
      <button
        onClick={onClear}
        style={{
          width: 16,
          height: 16,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "rgba(20,41,63,0.12)",
          color: T.navyDark,
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <FaTimes size={8} />
      </button>
    </span>
  );
}

const inputStyle = {
  width: "100%",
  border: `1px solid ${T.border}`,
  borderRadius: T.radiusSm,
  padding: "0.55rem 0.75rem",
  fontSize: "0.88rem",
  color: T.text,
  background: T.surface,
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: T.textMuted,
  marginBottom: "0.4rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

export default function DepartmentList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete, hasAccess } = useRole();

  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Fixed at 5 records per page
  const [showRemoveHodModal, setShowRemoveHodModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [removingHod, setRemovingHod] = useState(false);
  const [hodSubjectCount, setHodSubjectCount] = useState(null);
  const [showReassignSubjectsModal, setShowReassignSubjectsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [deletingDepartment, setDeletingDepartment] = useState(false);

  const [hoveredRow, setHoveredRow] = useState(null);
  const [mounted, setMounted] = useState(false);
  const width = useViewportWidth();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL") return <Navigate to="/dashboard" replace />;

  /* ================= FETCH ================= */
  const fetchDepartments = async () => {
    try {
      logger.info('Fetching departments...');
      const res = await api.get("/departments");
      logger.info('Departments API response received');
      setDepartments(res.data || []);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load departments. Please try again later.";

      logger.error("Error fetching departments:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  /* ================= DELETE ================= */
  const handleDeleteClick = (department) => {
    setDepartmentToDelete(department);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!departmentToDelete) return;

    setDeletingDepartment(true);
    try {
      await api.delete(`/departments/${departmentToDelete._id}`);
      toast.success(
        `Department "${departmentToDelete.name}" deleted successfully.`,
        { position: "top-right", autoClose: 5000 },
      );
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
      fetchDepartments();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        "Failed to delete department. Please try again.";
      logger.error("Error deleting department:", err.response?.status, err.response?.data?.code);
      toast.error(errorMessage, { position: "top-right", autoClose: 5000 });
    } finally {
      setDeletingDepartment(false);
    }
  };

  /* ================= REMOVE HOD ================= */
  const fetchHodSubjectCount = async (hodTeacherId) => {
    try {
      const res = await api.get(
        `/teachers/${hodTeacherId}/reassignment-data`,
      );
      const payload = res.data?.data || res.data;
      const subjects = payload?.subjects || [];
      return subjects.length;
    } catch {
      return null;
    }
  };

  const handleRemoveHodClick = async (department) => {
    const hodId = department.hod_id?._id || department.hod_id;
    if (!hodId) return;

    setSelectedDepartment(department);
    setHodSubjectCount(null);
    const count = await fetchHodSubjectCount(hodId);
    setHodSubjectCount(count);
    setShowRemoveHodModal(true);
  };

  const handleRemoveHod = async () => {
    if (!selectedDepartment) return;

    setRemovingHod(true);
    try {
      await api.delete(`/departments/${selectedDepartment._id}/hod`);
      setShowRemoveHodModal(false);
      setSelectedDepartment(null);
      setHodSubjectCount(null);
      fetchDepartments();
    } catch (err) {
      const backendMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to remove HOD. Please try again.";
      toast.error(backendMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setRemovingHod(false);
    }
  };

  /* ================= REASSIGN HOD SUBJECTS =================
     Triggered from the blocked state of the Remove HOD confirmation
     (see the ConfirmModal below). This never removes or replaces the
     HOD — it only moves subjects/slots/sessions to another teacher so
     the admin can, in a separate explicit step, remove the HOD once
     the active subject count reaches zero. */
  const handleOpenReassignModal = () => {
    // Keep selectedDepartment set — the reassignment modal needs the
    // same department/HOD context. Just swap which dialog is visible.
    setShowRemoveHodModal(false);
    setShowReassignSubjectsModal(true);
  };

  const handleReassignModalClose = () => {
    setShowReassignSubjectsModal(false);
  };

  const handleReassignSuccess = () => {
    // Do NOT call handleRemoveHod here — removal must remain an explicit,
    // separate admin action. We just clear stale state so the next
    // "Remove HOD" click re-fetches a fresh (now lower/zero) count.
    setShowReassignSubjectsModal(false);
    setSelectedDepartment(null);
    setHodSubjectCount(null);
    fetchDepartments();
  };

  /* ================= FILTER LOGIC ================= */
  const filteredDepartments = departments.filter((d) => {
    const matchesSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.code?.toLowerCase().includes(search.toLowerCase()) ||
      d.type?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || d.status === statusFilter.toUpperCase();

    const matchesType = typeFilter === "All" || d.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  /* ================= PAGINATION LOGIC ================= */
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDepartments.slice(indexOfFirstItem, indexOfLastItem);

  const hasActiveFilters = search || statusFilter !== "All" || typeFilter !== "All";
  const columns = [
  {
    key: "srNo",
    label: "Sr.No",
    sortable: false,
    width: "50px",
    render: (department, index) => (
      <span className="department-index">
        {indexOfFirstItem + index + 1}
      </span>
    ),
  },

  {
    key: "name",
    label: "Department",
    sortable: true,
    width: "190px",
    render: (department) => (
      <div className="department-info">
        <div className="department-avatar">
          <FaGraduationCap size={15} />
        </div>

        <div className="department-details">
          <div className="department-name">
            {department.name}
          </div>

          <div className="department-year">
            {department.establishedYear}
          </div>
        </div>
      </div>
    ),
  },

  {
    key: "code",
    label: "Code",
    sortable: true,
    width: "90px",
    render: (department) => (
      <span className="department-code">
        {department.code}
      </span>
    ),
  },

  {
    key: "type",
    label: "Type",
    sortable: true,
    width: "100px",
    render: (department) => (
      <span className="department-type">
        {department.type}
      </span>
    ),
  },

  {
    key: "status",
    label: "Status",
    sortable: true,
    width: "105px",
    render: (department) => {
      const isActive = department.status === "ACTIVE";

      return (
        <span
          className={`department-status ${
            isActive ? "active" : "inactive"
          }`}
        >
          <span className="status-dot" />
          {department.status}
        </span>
      );
    },
  },

  {
    key: "programsOffered",
    label: "Programs",
    sortable: false,
    width: "145px",
    render: (department) => (
      <div className="department-programs">
        {(department.programsOffered || [])
          .slice(0, 2)
          .map((program, index) => (
            <span key={index} className="program-pill">
              {program}
            </span>
          ))}

        {(department.programsOffered || []).length > 2 && (
          <span className="program-pill more">
            +{department.programsOffered.length - 2}
          </span>
        )}
      </div>
    ),
  },

  {
    key: "startYear",
    label: "Start Year",
    sortable: true,
    width: "90px",
    render: (department) =>
      department.startYear || "N/A",
  },

  {
    key: "sanctionedFacultyCount",
    label: "Faculty",
    sortable: true,
    width: "90px",
    render: (department) => (
      <div className="department-count">
        <FaChalkboardTeacher />
        <span>
          {department.sanctionedFacultyCount || 0}
        </span>
      </div>
    ),
  },

  {
    key: "sanctionedStudentIntake",
    label: "Students",
    sortable: true,
    width: "90px",
    render: (department) => (
      <div className="department-count">
        <FaGraduationCap />
        <span>
          {department.sanctionedStudentIntake || 0}
        </span>
      </div>
    ),
  },
];

const tableActions = {
  label: "Actions",
  width: "170px",
  items: [
    {
      key: "view",
      label: "View Department",
      icon: FaEye,
      className: "view-btn",
      show: () =>
        hasAccess("departments") ||
        hasAccess("departments-view"),
      onClick: (department) =>
        navigate(`/departments/view/${department._id}`),
    },
    {
      key: "edit",
      label: "Edit Department",
      icon: FaEdit,
      className: "edit-btn",
      show: () => canEdit("departments"),
      onClick: (department) =>
        navigate(`/departments/edit/${department._id}`),
    },
    {
      key: "remove-hod",
      label: "Remove HOD",
      icon: FaUserSlash,
      className: "remove-btn",
      show: (department) =>
        canEdit("departments") && !!department.hod_id,
      onClick: (department) =>
        handleRemoveHodClick(department),
    },
    {
      key: "delete",
      label: "Delete Department",
      icon: FaTrash,
      className: "delete-btn",
      show: () => canDelete("departments"),
      onClick: (department) =>
        handleDeleteClick(department),
    },
  ],
};



  /* ================= EFFECTS FOR PAGINATION AND FILTERS ================= */

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter]);

  // Adjust current page when total pages change
  useEffect(() => {
    const calculatedTotalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(calculatedTotalPages);
    } else if (calculatedTotalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage, filteredDepartments.length, itemsPerPage]);

  /* ================= RESET FILTERS ================= */
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
  };

  /* ================= GET UNIQUE TYPES ================= */
  const getUniqueTypes = () => {
    const types = new Set();
    departments.forEach((d) => {
      if (d.type) types.add(d.type);
    });
    return Array.from(types);
  };

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
          text="Loading Departments..."
        />
      </div>
    </div>
  );
}

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <ApiError
        title="Department Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchDepartments}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  

  // Responsive column visibility — fixes the old CSS breakpoints, which
  // accidentally hid the Actions column on tablet widths.
  const showSrNo = width >= 576;
  const showCode = width >= 576;
  const showType = width >= 768;
  const showFaculty = width >= 768;
  const showPrograms = width >= 992;
  const showStartYear = width >= 992;
  const showStudents = width >= 992;

  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        fontFamily: T.font,
        color: T.text,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "1.5rem" }}>

        {/* ================= BREADCRUMB ================= */}
          <div
            style={{
              width: "100%",
              margin: "10px auto",
              paddingTop: "5px",
            }}
          >
            <div style={{ width: "100%" }}>
              <Breadcrumb
                items={[
                  { label: "Dashboard", path: "/dashboard" },
                  { label: "Department Management" },
                ]}
              />
            </div>
          </div>

        {/* ================= TOP BAR ================= */}
        <PageHeader
          title="Department Management"
          subtitle="Manage academic departments and faculty assignments"
          icon={FaBuilding}
          actions={
            <>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
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
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(20, 27, 41, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                <FaInfoCircle size={15} />
                Help
              </button>

              {canCreate("departments") && (
                <button
                  type="button"
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
                  onClick={() => navigate("/departments/add")}
                  onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(20, 27, 41, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                  <FaPlus size={14} />
                  Add Department
                </button>
              )}
            </>
          }
        />

        {/* ================= HELP TOOLTIP ================= */}
        {showHelp && (
          <div
            style={{
              background: T.tealTint,
              borderRadius: T.radiusLg,
              padding: "1.1rem 1.35rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <FaInfoCircle style={{ color: T.teal, marginTop: 3, flexShrink: 0 }} size={18} />
            <div>
              <h6 style={{ fontWeight: 700, margin: "0 0 0.5rem", fontSize: "0.92rem", color: T.text }}>
                Department Management Tips
              </h6>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.85rem", color: T.text, lineHeight: 1.9 }}>
                <li>Use search to find departments by name, code, or type</li>
                <li>Filter by status (Active/Inactive) or department type</li>
                <li>
                  Click <FaEdit style={{ margin: "0 4px" }} size={12} /> to edit department details
                </li>
                <li>Only departments with no students can be deleted</li>
              </ul>
              <div style={{ marginTop: "0.75rem" }}>
                <Btn onClick={() => setShowHelp(false)} color={T.teal} tint={T.surface}>
                  Got it!
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ================= SEARCH & FILTER BAR ================= */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            boxShadow: T.shadow,
            padding: "1.35rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
            <div style={{ flex: "2 1 260px", minWidth: 220 }}>
              <label style={labelStyle}>Search Departments</label>
              <div style={{ position: "relative" }}>
                <FaSearch
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textMuted, fontSize: 13 }}
                />
                <input
                  type="text"
                  placeholder="Search by name, code, or type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 34, paddingRight: search ? 34 : 12 }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: T.textMuted,
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: "1 1 160px", minWidth: 160 }}>
              <label style={labelStyle}>Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="All">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div style={{ flex: "1 1 160px", minWidth: 160 }}>
              <label style={labelStyle}>Filter by Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="All">All Types</option>
                {getUniqueTypes().map((type, idx) => (
                  <option key={idx} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: "0 0 auto" }}>
              <Btn onClick={resetFilters} color={T.textMuted}>
                <FaTimes size={12} /> Reset Filters
              </Btn>
            </div>
          </div>

          {/* ================= ACTIVE FILTERS BADGES ================= */}
          {hasActiveFilters && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", color: T.textMuted, marginRight: 4 }}>Active Filters:</span>
                {search && <FilterBadge label={`Search: "${search}"`} onClear={() => setSearch("")} />}
                {statusFilter !== "All" && <FilterBadge label={`Status: ${statusFilter}`} onClear={() => setStatusFilter("All")} />}
                {typeFilter !== "All" && <FilterBadge label={`Type: ${typeFilter}`} onClear={() => setTypeFilter("All")} />}
              </div>
            </div>
          )}
        </div>

        {/* ================= STANDARD DEPARTMENT LIST ================= */}

<StandardListView
  title="Department List"
  icon={FaBuilding}
  count={filteredDepartments.length}
  columns={columns}
  data={currentItems}
  loading={false}
  emptyState={{
    icon: FaBuilding,
    title: "No Departments Found",
    description: hasActiveFilters
      ? "Try adjusting your filters or search criteria."
      : "No departments available in the system.",

    action: hasActiveFilters
      ? {
          label: "Clear Filters",
          icon: FaTimes,
          onClick: resetFilters,
        }
      : canCreate("departments")
      ? {
          label: "Add Department",
          icon: FaPlus,
          onClick: () =>
            navigate("/departments/add"),
        }
      : null,
  }}
  actions={tableActions}
/>

{filteredDepartments.length > 0 && (
  <div className="department-pagination">
    <div className="department-list-showing">
      Showing {Math.min(indexOfLastItem, filteredDepartments.length)} of{" "}
      {filteredDepartments.length} departments
    </div>

    <Pagination
      page={currentPage}
      totalPages={totalPages}
      setPage={setCurrentPage}
    />
  </div>

  
)}



        {/* ================= FOOTER ================= */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            boxShadow: T.shadow,
            padding: "1.1rem 1.35rem",
            marginTop: "1.25rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", color: T.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
            <FaBuilding size={12} />
            Department Management System | Smart College ERP
          </p>
          <Btn onClick={() => navigate("/dashboard")} color={T.navy}>
            <FaArrowLeft size={12} /> Back to Dashboard
          </Btn>
        </div>
      </div>

      <ConfirmModal
        isOpen={showRemoveHodModal}
        onClose={() => {
          setShowRemoveHodModal(false);
          setSelectedDepartment(null);
          setHodSubjectCount(null);
        }}
        onConfirm={
          hodSubjectCount && hodSubjectCount > 0
            ? handleOpenReassignModal
            : handleRemoveHod
        }
        title={
          hodSubjectCount && hodSubjectCount > 0
            ? "Subjects Still Assigned"
            : "Remove HOD"
        }
        message={
          selectedDepartment
            ? hodSubjectCount === null
              ? "Checking assigned subjects..."
              : hodSubjectCount > 0
                ? `This HOD has ${hodSubjectCount} active subject(s) assigned. Reassign these subjects to another teacher before removing the HOD.`
                : `Are you sure you want to remove the HOD from "${selectedDepartment.name}"? The teacher will retain their TEACHER role and all assignments will remain intact.`
            : ""
        }
        type="warning"
        confirmText={
          hodSubjectCount && hodSubjectCount > 0 ? "Reassign Subjects" : "Remove HOD"
        }
        cancelText="Cancel"
        confirmDisabled={hodSubjectCount === null}
        isLoading={removingHod}
      />

      <HodSubjectReassign
        isOpen={showReassignSubjectsModal}
        onClose={handleReassignModalClose}
        departmentId={selectedDepartment?._id}
        hodTeacherId={
          selectedDepartment?.hod_id?._id || selectedDepartment?.hod_id
        }
        hodName={selectedDepartment?.hod_id?.name}
        onSuccess={handleReassignSuccess}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDepartmentToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Department"
        message={
          departmentToDelete
            ? `Are you sure you want to delete "${departmentToDelete.name}"? This action cannot be undone.`
            : ""
        }
        type="danger"
        confirmText="Delete Department"
        cancelText="Cancel"
        isLoading={deletingDepartment}
      />
    </div>
  );
}

const thStyle = (width) => ({
  width,
  textAlign: "left",
  padding: "0.7rem 0.75rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#495057",
  whiteSpace: "nowrap",
});

const tdStyle = {
  padding: "0.7rem 0.75rem",
  verticalAlign: "middle",
  color: "#1f2530",
};