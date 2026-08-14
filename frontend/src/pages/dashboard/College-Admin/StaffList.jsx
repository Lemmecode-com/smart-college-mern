import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../../api/axios";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import Pagination from "../../../components/Pagination";
import { logger } from "../../../utils/logger";
import "./StaffList.css";

import {
  FaUser,
  FaUserPlus,
  FaSearch,
  FaSyncAlt,
  FaEye,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaKey,
  FaCheckCircle,
  FaUserCheck,
  FaUserTimes,
  FaStar,
  FaCircle,
} from "react-icons/fa";

const BRAND = {
  primary: "#1a4b6d",
  dark: "#0f3a4a",
  light: "#2a6b8d",
  teal: "#3db5e6",
  success: "#28a745",
  warning: "#ffc107",
  danger: "#dc3545",
  muted: "#6c757d",
  text: "#1e293b",
  "text-muted": "#64748b",
  border: "#e2e8f0",
};

const ROLE_LABELS = {
  SUPER_ADMIN: "System Administrator",
  COLLEGE_ADMIN: "College Administrator",
  PRINCIPAL: "Principal",
  HOD: "Head of Department",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
  ADMISSION_OFFICER: "Admission Officer",
  EXAM_COORDINATOR: "Exam Coordinator",
  PLATFORM_SUPPORT: "Platform Support",
};

const ITEMS_PER_PAGE = 10;

const ROLE_OPTIONS = [
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "ADMISSION_OFFICER", label: "Admission Officer" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "HOD", label: "Head of Department" },
  { value: "EXAM_COORDINATOR", label: "Exam Coordinator" },
  { value: "PLATFORM_SUPPORT", label: "Platform Support" },
];

const formatRole = (role) => {
  if (!role) return "Staff";
  return ROLE_LABELS[role] || role.replace(/_/g, " ");
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getInitials = (name) => {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
  }),
};

// Opacity-only stagger for table rows (transforms on <tr> are not
// reliably supported across browsers).
const fadeInRow = {
  hidden: { opacity: 0 },
  visible: (i) => ({
    opacity: 1,
    transition: { delay: i * 0.04, duration: 0.35, ease: "easeOut" },
  }),
};

function StatCard({ icon, label, value, valueClass = "" }) {
  return (
    <div className="erp-staff-stat-card" role="figure">
      <div className="erp-staff-stat-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="erp-staff-stat-content">
        <div className="erp-staff-stat-label">{label}</div>
        <div className={`erp-staff-stat-value ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}

function StaffTableSkeleton({ rows = 7 }) {
  const cells = (n) =>
     Array.from({ length: n }).map((_, i) => (
       <span key={i} className="erp-staff-skeleton-cell" />
     ));
  return (
    <div className="erp-staff-skeleton" role="status" aria-label="Loading staff data">
      <div className="erp-staff-skeleton-row erp-staff-skeleton-head">
        {cells(7)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="erp-staff-skeleton-row">
          {cells(7)}
        </div>
      ))}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="erp-staff-stat-skeleton" role="status" aria-label="Loading statistics">
      <div className="erp-staff-stat-skeleton__icon" />
      <div className="erp-staff-stat-skeleton__content">
        <div className="erp-staff-stat-skeleton__label" />
        <div className="erp-staff-stat-skeleton__value" />
      </div>
    </div>
  );
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="erp-staff-empty">
      <div className="erp-staff-empty-icon" aria-hidden="true">
        <FaUser />
      </div>
      <h3 className="erp-staff-empty-title">{title}</h3>
      <p className="erp-staff-empty-message">{message}</p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="erp-staff-btn erp-staff-btn--outline"
        >
          <FaSyncAlt />
          <span>{actionLabel}</span>
        </motion.button>
      )}
    </div>
  );
}

export default function StaffList() {
  const navigate = useNavigate();

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

  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/college/staff");
      const data = res.data || [];
      setStaff(data);
      setFilteredStaff(data);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load staff list";

      logger.error("Error fetching staff:", statusCode, errorCode);

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
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    let filtered = staff;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(term)) ||
          (s.email && s.email.toLowerCase().includes(term)) ||
          (s.designation && s.designation.toLowerCase().includes(term))
      );
    }

    if (roleFilter) {
      filtered = filtered.filter((s) => s.role === roleFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((s) =>
        statusFilter === "active" ? s.isActive : !s.isActive
      );
    }

    setFilteredStaff(filtered);
  }, [staff, searchTerm, roleFilter, statusFilter]);

  // Reset to first page whenever the active filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Pagination is performed client-side over the filtered list because
  // GET /college/staff does not accept page/limit query parameters.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const pageEnd = Math.min(pageStart + ITEMS_PER_PAGE, filteredStaff.length);
  const paginatedStaff = filteredStaff.slice(pageStart, pageEnd);
  const showPagination = totalPages > 1 && !loading;

  const hasFilters = !!searchTerm || !!roleFilter || !!statusFilter;

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("");
  };

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.isActive).length,
    inactive: staff.filter((s) => !s.isActive).length,
    roles: new Set(staff.map((s) => s.role).filter(Boolean)).size,
  };

  if (error && !loading) {
    return (
      <ApiError
        title="Staff Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchStaff}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="erp-staff-page erp-viewport-min-100"
    >
      <div className="erp-staff-page-content">
        {/* ================= HEADER ================= */}
        <motion.header
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="erp-staff-header"
        >
          <div className="erp-staff-header__inner">
            <div className="erp-staff-header__start">
              <motion.div
                className="erp-staff-header__icon"
                aria-hidden="true"
                initial={{ rotate: -5 }}
                animate={{ rotate: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <FaUser />
              </motion.div>
              <div className="erp-staff-header__text">
                <h1 className="erp-staff-header__title">Staff Accounts</h1>
                <p className="erp-staff-header__subtitle">
                  Manage staff members and their account information
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/college/staff/create")}
              className="erp-staff-btn erp-staff-btn--primary"
              aria-label="Add new staff member"
            >
              <FaUserPlus />
              <span>Add New Staff</span>
            </motion.button>
          </div>
        </motion.header>

        {/* ================= SUMMARY STATS ================= */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="erp-staff-stats"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : (<>
                <StatCard
                  icon={<FaUser />}
                  label="Total Staff"
                  value={stats.total}
                />
                <StatCard
                  icon={<FaUserCheck style={{ color: BRAND.success }} />}
                  label="Active"
                  value={stats.active}
                  valueClass="erp-staff-stat--success"
                />
                <StatCard
                  icon={<FaUserTimes style={{ color: BRAND.danger }} />}
                  label="Inactive"
                  value={stats.inactive}
                  valueClass="erp-staff-stat--danger"
                />
                <StatCard
                  icon={<FaStar style={{ color: BRAND.teal }} />}
                  label="Roles"
                  value={stats.roles}
                  valueClass="erp-staff-stat--teal"
                />
              </>)}
        </motion.div>

        {/* ================= SEARCH & FILTERS ================= */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="erp-staff-filters"
        >
          <div className="erp-staff-search">
            <FaSearch className="erp-staff-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="erp-staff-search-input"
              placeholder="Search by name, email, designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search staff by name, email or designation"
            />
          </div>

          <div className="erp-staff-filter-group">
            <label htmlFor="erp-staff-role-filter" className="erp-staff-filter-label">
              Role
            </label>
            <select
              id="erp-staff-role-filter"
              className="erp-staff-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="erp-staff-filter-group">
            <label htmlFor="erp-staff-status-filter" className="erp-staff-filter-label">
              Status
            </label>
            <select
              id="erp-staff-status-filter"
              className="erp-staff-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: hasFilters ? 1.03 : 1 }}
            whileTap={{ scale: 0.97 }}
            onClick={clearFilters}
            disabled={!hasFilters}
            className="erp-staff-btn erp-staff-btn--clear"
            aria-label="Clear all filters"
          >
            <FaSyncAlt aria-hidden="true" />
            <span>Clear</span>
          </motion.button>
        </motion.div>

        {/* ================= STAFF DIRECTORY ================= */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="erp-staff-directory"
        >
          <div className="erp-staff-directory__head">
            <h2 className="erp-staff-directory__title">
              <FaUser className="erp-staff-directory__icon" aria-hidden="true" />
              Staff Directory
            </h2>
            <div className="erp-staff-directory__count">
              {filteredStaff.length === 0
                ? `Showing 0 of ${staff.length} staff members`
                : `Showing ${pageStart + 1} to ${pageEnd} of ${filteredStaff.length} staff members`}
            </div>
          </div>

          <div className="erp-staff-table-wrap">
            {loading ? (
              <StaffTableSkeleton rows={ITEMS_PER_PAGE} />
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                title="No Staff Members Found"
                message={
                  staff.length === 0
                    ? "No staff accounts have been created yet."
                    : "No staff members match your search or filters."
                }
                actionLabel={hasFilters ? "Clear Filters" : undefined}
                onAction={hasFilters ? clearFilters : undefined}
              />
            ) : (
              <table className="erp-staff-table" role="table">
                <thead>
                  <tr>
                    <th scope="col" className="erp-staff-th erp-staff-th--staff">
                      Staff Member
                    </th>
                    <th scope="col" className="erp-staff-th erp-staff-th--role">
                      Role
                    </th>
                    <th scope="col" className="erp-staff-th erp-staff-th--contact">
                      Contact
                    </th>
                    <th scope="col" className="erp-staff-th erp-staff-th--employment">
                      Employment
                    </th>
                    <th scope="col" className="erp-staff-th erp-staff-th--status">
                      Status
                    </th>
                    <th scope="col" className="erp-staff-th erp-staff-th--account">
                      Account
                    </th>
                    <th
                      scope="col"
                      className="erp-staff-th erp-staff-th--actions"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                 <tbody>
                  {paginatedStaff.map((s, idx) => (
                    <motion.tr
                      key={s.id}
                      variants={fadeInRow}
                      custom={idx}
                      initial="hidden"
                      animate="visible"
                      className="erp-staff-tr"
                    >
                      <td className="erp-staff-td erp-staff-td--staff">
                        <div className="erp-staff-identity">
                          <div
                            className="erp-staff-avatar"
                            aria-label={`Avatar for ${s.name || "staff"}`}
                          >
                            {getInitials(s.name)}
                          </div>
                          <div className="erp-staff-identity-details">
                            <div
                              className="erp-staff-name"
                              title={s.name || undefined}
                            >
                              {s.name || "Unnamed Staff"}
                            </div>
                            <div
                              className="erp-staff-designation"
                              title={s.designation || undefined}
                            >
                              {s.designation || "Not Provided"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="erp-staff-td">
                        <span
                          className="erp-staff-role-badge"
                          title={formatRole(s.role)}
                        >
                          {formatRole(s.role)}
                        </span>
                      </td>
                      <td className="erp-staff-td">
                        <div className="erp-staff-contact">
                          <div
                            className="erp-staff-contact-item"
                            title={s.email || undefined}
                          >
                            <FaEnvelope
                              className="erp-staff-contact-icon"
                              aria-hidden="true"
                            />
                            <span className="erp-staff-contact-text">
                              {s.email || "Not Provided"}
                            </span>
                          </div>
                          <div className="erp-staff-contact-item">
                            <FaPhone
                              className="erp-staff-contact-icon"
                              aria-hidden="true"
                            />
                            <span className="erp-staff-contact-text">
                              {s.mobileNumber || "Not Provided"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="erp-staff-td">
                        <div className="erp-staff-employment">
                          <div className="erp-staff-employment-type">
                            {s.employmentType
                              ? s.employmentType.replace(/_/g, " ")
                              : "Not Provided"}
                          </div>
                          <div className="erp-staff-joining">
                            <FaCalendarAlt
                              className="erp-staff-joining-icon"
                              aria-hidden="true"
                            />
                            Joining:{" "}
                            {formatDate(s.joiningDate) || "date not provided"}
                          </div>
                        </div>
                      </td>
                      <td className="erp-staff-td">
                        <span
                          className={`erp-staff-status ${
                            s.isActive
                              ? "erp-staff-status--active"
                              : "erp-staff-status--inactive"
                          }`}
                        >
                          <FaCircle
                            className="erp-staff-status-dot"
                            aria-hidden="true"
                          />
                          <span className="erp-staff-status-text">
                            {s.isActive ? "Active" : "Inactive"}
                          </span>
                        </span>
                      </td>
                      <td className="erp-staff-td">
                        <span
                          className={`erp-staff-account ${
                            s.mustChangePassword
                              ? "erp-staff-account--pending"
                              : "erp-staff-account--set"
                          }`}
                          title={
                            s.mustChangePassword
                              ? "Temporary password set — user must change it"
                              : "Password is set"
                          }
                        >
                          {s.mustChangePassword ? (
                            <FaKey
                              className="erp-staff-account-icon"
                              aria-hidden="true"
                            />
                          ) : (
                            <FaCheckCircle
                              className="erp-staff-account-icon"
                              aria-hidden="true"
                            />
                          )}
                          <span className="erp-staff-account-text">
                            {s.mustChangePassword
                              ? "Temporary Password"
                              : "Set"}
                          </span>
                        </span>
                      </td>
                      <td className="erp-staff-td erp-staff-td--actions">
                        <div className="erp-staff-actions">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => {
                              logger.info(
                                "[StaffList] View profile for id:",
                                s.id
                              );
                              navigate(`/staff/profile/${s.id}`);
                            }}
                            className="erp-staff-btn erp-staff-btn--icon erp-staff-btn--view"
                            aria-label={`View profile for ${s.name || "staff"}`}
                            title="View Profile"
                          >
                            <FaEye aria-hidden="true" />
                            <span>View</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => {
                              logger.info(
                                "[StaffList] Edit profile for id:",
                                s.id
                              );
                              navigate(`/staff/profile/edit/${s.id}`);
                            }}
                            className="erp-staff-btn erp-staff-btn--icon erp-staff-btn--edit"
                            aria-label={`Edit profile for ${s.name || "staff"}`}
                            title="Edit Profile"
                          >
                            <FaEdit aria-hidden="true" />
                            <span>Edit</span>
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {showPagination && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              setPage={setCurrentPage}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
