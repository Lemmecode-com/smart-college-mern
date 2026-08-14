import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
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
    background: hover ? (tint || T.navyTint) : T.surface,
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
  const handleRemoveHod = async () => {
    if (!selectedDepartment) return;

    setRemovingHod(true);
    try {
      await api.delete(`/departments/${selectedDepartment._id}/hod`);
      setShowRemoveHodModal(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch {
      alert("Failed to remove HOD. Please try again.");
    } finally {
      setRemovingHod(false);
    }
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
    return <Loading fullScreen size="lg" text="Loading Departments..." />;
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

  const hasActiveFilters = search || statusFilter !== "All" || typeFilter !== "All";

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
        {/* ================= TOP BAR ================= */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            boxShadow: T.shadow,
            padding: "1.5rem 1.75rem",
            marginBottom: "1.25rem",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: T.navy }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: T.radiusMd,
                background: T.navyTint,
                color: T.navy,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.35rem",
                flexShrink: 0,
              }}
            >
              <FaBuilding />
            </div>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: T.text }}>
                Department Management
              </h1>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: T.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                <FaGraduationCap size={13} />
                Manage academic departments and faculty assignments
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <Btn onClick={() => setShowHelp(!showHelp)} color={T.teal} tint={T.tealTint} title="Department Management Help">
              <FaInfoCircle size={15} /> Help
            </Btn>
            {canCreate('departments') && (
              <Btn onClick={() => navigate("/departments/add")} variant="solid" color={T.navy}>
                <FaPlus size={14} /> Add Department
              </Btn>
            )}
          </div>
        </div>

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

        {/* ================= DEPARTMENTS TABLE ================= */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            boxShadow: T.shadow,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "1.1rem 1.35rem",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <FaBuilding style={{ color: T.navy }} />
            <h2 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0, color: T.text }}>Department List</h2>
            <Pill bg={T.navyTint} color={T.navyDark}>
              {currentItems.length} of {filteredDepartments.length} departments
            </Pill>
          </div>

          {filteredDepartments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
              <FaBuilding style={{ color: T.textMuted, opacity: 0.4 }} size={56} />
              <h5 style={{ color: T.textMuted, margin: "1rem 0 0.4rem", fontWeight: 600 }}>No Departments Found</h5>
              <p style={{ color: T.textMuted, marginBottom: "1.5rem", fontSize: "0.88rem" }}>
                {hasActiveFilters
                  ? "Try adjusting your filters or search criteria"
                  : "No departments available in the system"}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                {hasActiveFilters && (
                  <Btn onClick={resetFilters} color={T.navy}>
                    <FaTimes size={13} /> Clear Filters
                  </Btn>
                )}
                {canCreate('departments') && (
                  <Btn onClick={() => navigate("/departments/add")} variant="solid" color={T.navy}>
                    <FaPlus size={13} /> Add Department
                  </Btn>
                )}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem" }}>
                <thead>
                  <tr style={{ background: "#fafbfc", borderBottom: `1px solid ${T.border}` }}>
                    {showSrNo && <th style={thStyle("3.5rem")}>Sr.No</th>}
                    <th style={thStyle("20%")}>Department</th>
                    {showCode && <th style={thStyle("10%")}>Code</th>}
                    {showType && <th style={thStyle("10%")}>Type</th>}
                    <th style={thStyle("10%")}>Status</th>
                    {showPrograms && <th style={thStyle("14%")}>Programs</th>}
                    {showStartYear && <th style={thStyle("7%")}>Start Year</th>}
                    {showFaculty && <th style={thStyle("7%")}>Faculty</th>}
                    {showStudents && <th style={thStyle("7%")}>Students</th>}
                    <th style={{ ...thStyle("10%"), textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((d, index) => {
                    const globalIndex = indexOfFirstItem + index;
                    const isActive = d.status === "ACTIVE";
                    const isHovered = hoveredRow === d._id;
                    return (
                      <tr
                        key={d._id}
                        onMouseEnter={() => setHoveredRow(d._id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          background: isHovered ? "#f7f9fb" : "transparent",
                          borderBottom: `1px solid ${T.border}`,
                          transition: "background 0.15s ease",
                        }}
                      >
                        {showSrNo && <td style={tdStyle}>{globalIndex + 1}</td>}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: T.tealTint,
                                color: T.teal,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <FaGraduationCap size={15} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: T.text }}>{d.name}</div>
                              <div style={{ fontSize: "0.76rem", color: T.textMuted }}>{d.establishedYear}</div>
                            </div>
                          </div>
                        </td>
                        {showCode && (
                          <td style={tdStyle}>
                            <Pill bg={T.navyTint} color={T.navyDark} mono>
                              {d.code}
                            </Pill>
                          </td>
                        )}
                        {showType && (
                          <td style={tdStyle}>
                            <Chip bg={T.tealTint} color={T.teal}>
                              {d.type}
                            </Chip>
                          </td>
                        )}
                        <td style={tdStyle}>
                          <Chip bg={isActive ? T.successBg : T.inactiveBg} color={isActive ? T.success : T.inactive} dot>
                            {d.status}
                          </Chip>
                        </td>
                        {showPrograms && (
                          <td style={tdStyle}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {(d.programsOffered || []).slice(0, 2).map((prog, i) => (
                                <Pill key={i} bg="#f1f2f4" color={T.text}>
                                  {prog}
                                </Pill>
                              ))}
                              {(d.programsOffered || []).length > 2 && (
                                <Pill bg={T.inactiveBg} color={T.textMuted}>
                                  +{(d.programsOffered || []).length - 2}
                                </Pill>
                              )}
                            </div>
                          </td>
                        )}
                        {showStartYear && <td style={tdStyle}>{d.startYear || "N/A"}</td>}
                        {showFaculty && (
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <FaChalkboardTeacher style={{ color: T.teal }} size={13} />
                              <span>{d.sanctionedFacultyCount || 0}</span>
                            </div>
                          </td>
                        )}
                        {showStudents && (
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <FaGraduationCap style={{ color: T.navy }} size={13} />
                              <span>{d.sanctionedStudentIntake || 0}</span>
                            </div>
                          </td>
                        )}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem" }}>
                            {(hasAccess('departments') || hasAccess('departments-view')) && (
                              <IconAction
                                icon={<FaEye size={13} />}
                                title="View Department"
                                color={T.teal}
                                tint={T.tealTint}
                                onClick={() => navigate(`/departments/view/${d._id}`)}
                              />
                            )}
                            {canEdit('departments') && (
                              <IconAction
                                icon={<FaEdit size={13} />}
                                title="Edit Department"
                                color={T.navy}
                                tint={T.navyTint}
                                onClick={() => navigate(`/departments/edit/${d._id}`)}
                              />
                            )}
                            {canEdit('departments') && d.hod_id && (
                              <IconAction
                                icon={<FaUserSlash size={13} />}
                                title="Remove HOD"
                                color={T.textMuted}
                                tint={T.inactiveBg}
                                onClick={() => {
                                  setSelectedDepartment(d);
                                  setShowRemoveHodModal(true);
                                }}
                              />
                            )}
                            {canDelete('departments') && (
                              <IconAction
                                icon={<FaTrash size={13} />}
                                title="Delete Department"
                                color={T.danger}
                                tint={T.dangerTint}
                                onClick={() => handleDeleteClick(d)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TABLE FOOTER ================= */}
          {filteredDepartments.length > 0 && (
            <div
              style={{
                background: "#fafbfc",
                borderTop: `1px solid ${T.border}`,
                padding: "1rem 1.35rem",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: T.textMuted }}>
                Showing <strong style={{ color: T.text }}>{Math.min(indexOfLastItem, filteredDepartments.length)}</strong> of{" "}
                <strong style={{ color: T.text }}>{filteredDepartments.length}</strong> departments
              </div>
              <Pagination page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
            </div>
          )}
        </div>

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
        }}
        onConfirm={handleRemoveHod}
        title="Remove HOD"
        message={
          selectedDepartment
            ? `Are you sure you want to remove the HOD from "${selectedDepartment.name}"? The teacher will retain their TEACHER role and all assignments will remain intact.`
            : ""
        }
        type="warning"
        confirmText="Remove HOD"
        cancelText="Cancel"
        isLoading={removingHod}
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
  padding: "0.85rem 1rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#495057",
  whiteSpace: "nowrap",
});

const tdStyle = {
  padding: "0.85rem 1rem",
  verticalAlign: "middle",
  color: "#1f2530",
};