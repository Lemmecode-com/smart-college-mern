import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaUsers,
  FaUserTie,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaBriefcase,
  FaSearch,
  FaArrowLeft,
  FaTimes,
} from "react-icons/fa";
/* eslint-disable-next-line no-unused-vars */
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";

// Brand Color Palette (NOVAA ERP design system)
const BRAND = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  primaryLight: "#e8f1f8",
  accent: "#f97316",
  accentLight: "#fff7ed",
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  info: "#0891b2",
  infoLight: "#cffafe",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
  surface: "#f1f5f9",
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: "easeOut" },
  }),
};

const slideDown = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// Helpers
const getInitials = (name) => {
  if (!name) return "T";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function HodTeachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hod/teachers");
      const rawTeachers =
        res.data?.data?.teachers ||
        res.data?.teachers ||
        (Array.isArray(res.data?.data) ? res.data.data : null) ||
        (Array.isArray(res.data) ? res.data : []);
      setTeachers(Array.isArray(rawTeachers) ? rawTeachers : []);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load teachers";

      logger.error("Error fetching teachers:", statusCode, errorCode);

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

  // Loading State
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
            text="Loading Department Teachers..."
          />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <ApiError
        title="Teachers Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchTeachers}
        onGoBack={() => navigate("/hod/dashboard")}
      />
    );
  }

  // Filtered teachers list (case-insensitive search across name, email, employeeId)
  const query = search.trim().toLowerCase();
  const filtered = teachers.filter((t) => {
    if (!query) return true;
    const nameMatch = t.name?.toLowerCase().includes(query);
    const emailMatch = t.email?.toLowerCase().includes(query);
    const idMatch = t.employeeId?.toLowerCase().includes(query);
    return Boolean(nameMatch || emailMatch || idMatch);
  });

  const isSearching = Boolean(search.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="erp-page erp-viewport-min-100"
      style={{
        background: `linear-gradient(180deg, ${BRAND.bg} 0%, #eef4fb 100%)`,
        padding: "1.25rem 1rem 2.5rem",
      }}
    >
      <div className="erp-page-content" style={{ maxWidth: 1200 }}>
        {/* ================= BREADCRUMB & BACK ================= */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/hod/dashboard" },
              { label: "Department Teachers" },
            ]}
          />
          <button
            type="button"
            onClick={() => navigate("/hod/dashboard")}
            className="btn btn-sm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              padding: "0.4rem 0.85rem",
              borderRadius: "8px",
              border: `1px solid ${BRAND.border}`,
              color: BRAND.ink,
              background: BRAND.card,
              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = BRAND.primary;
              e.currentTarget.style.color = BRAND.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = BRAND.border;
              e.currentTarget.style.color = BRAND.ink;
            }}
          >
            <FaArrowLeft style={{ fontSize: "0.72rem" }} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* ================= COMPACT PAGE HEADER ================= */}
        <motion.div
          variants={slideDown}
          initial="hidden"
          animate="visible"
          style={{
            background: "linear-gradient(135deg, #0e3746 0%, #164e63 100%)",
            borderRadius: 16,
            padding: "1.25rem 1.5rem",
            color: "#fff",
            boxShadow: "0 10px 30px -10px rgba(14, 55, 70, 0.4)",
            marginBottom: "1.25rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle decorative glow */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 220,
              height: "100%",
              background: `linear-gradient(120deg, transparent, ${BRAND.accent}20)`,
              borderTopRightRadius: 16,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <FaUsers />
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    flexWrap: "wrap",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "clamp(1.15rem, 2vw, 1.45rem)",
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.25,
                    }}
                  >
                    Department Teachers
                  </h2>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "0.2rem 0.65rem",
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: 20,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: 0.3,
                    }}
                  >
                    {teachers.length} {teachers.length === 1 ? "teacher" : "teachers"}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0.2rem 0 0",
                    fontSize: "0.84rem",
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 500,
                  }}
                >
                  Manage and view teachers in your department
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ================= COMPACT SEARCH TOOLBAR ================= */}
        <motion.div
          variants={fadeInVariants}
          custom={0}
          initial="hidden"
          animate="visible"
          style={{
            background: BRAND.card,
            borderRadius: 12,
            border: `1px solid ${BRAND.border}`,
            padding: "0.65rem 1rem",
            marginBottom: "1.25rem",
            boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {/* Search Input Container */}
          <div
            style={{
              position: "relative",
              flex: "1 1 280px",
              minWidth: 0,
              maxWidth: 520,
            }}
          >
            <FaSearch
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: BRAND.muted,
                fontSize: "0.82rem",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: "2.1rem",
                paddingRight: search ? "2.2rem" : "0.75rem",
                paddingTop: "0.45rem",
                paddingBottom: "0.45rem",
                fontSize: "0.85rem",
                borderRadius: 8,
                border: `1px solid ${BRAND.border}`,
                background: BRAND.bg,
                color: BRAND.ink,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: BRAND.muted,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  padding: "0.2rem 0.4rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Result Count Indicator */}
          <div
            style={{
              fontSize: "0.8rem",
              color: BRAND.muted,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {isSearching ? (
              <span>
                Showing <strong>{filtered.length}</strong> of <strong>{teachers.length}</strong> teachers
              </span>
            ) : (
              <span>
                Total: <strong>{teachers.length}</strong> {teachers.length === 1 ? "teacher" : "teachers"}
              </span>
            )}
          </div>
        </motion.div>

        {/* ================= TEACHERS GRID ================= */}
        {teachers.length === 0 ? (
          /* Empty State: No Teachers in Department */
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            style={{
              background: BRAND.card,
              borderRadius: 14,
              border: `1px solid ${BRAND.border}`,
              padding: "3rem 1.5rem",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: BRAND.primaryLight,
                color: BRAND.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                margin: "0 auto 1rem",
              }}
            >
              <FaUserTie />
            </div>
            <h4
              style={{
                color: BRAND.ink,
                fontWeight: 700,
                fontSize: "1.1rem",
                marginBottom: "0.35rem",
              }}
            >
              No teachers assigned
            </h4>
            <p style={{ color: BRAND.muted, fontSize: "0.85rem", margin: 0 }}>
              There are currently no teachers assigned to this department.
            </p>
          </motion.div>
        ) : filtered.length === 0 ? (
          /* Empty Search Results State */
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            style={{
              background: BRAND.card,
              borderRadius: 14,
              border: `1px solid ${BRAND.border}`,
              padding: "3rem 1.5rem",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: BRAND.warningLight,
                color: BRAND.warning,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                margin: "0 auto 1rem",
              }}
            >
              <FaSearch />
            </div>
            <h4
              style={{
                color: BRAND.ink,
                fontWeight: 700,
                fontSize: "1.1rem",
                marginBottom: "0.35rem",
              }}
            >
              No teachers match your search
            </h4>
            <p
              style={{
                color: BRAND.muted,
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              No results found for "{search}". Try searching by another name, email, or employee ID.
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="btn btn-sm btn-primary"
              style={{
                background: BRAND.primary,
                borderColor: BRAND.primary,
                padding: "0.45rem 1.1rem",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.82rem",
              }}
            >
              Clear Search
            </button>
          </motion.div>
        ) : (
          /* Responsive 3-Column Teacher Card Grid */
          <div className="row g-3">
            {filtered.map((teacher, index) => {
              const initials = getInitials(teacher.name);
              const isActive = teacher.status === "ACTIVE";
              const hasStatus = Boolean(teacher.status);
              const statusColor = isActive ? BRAND.success : BRAND.danger;
              const statusLabel = isActive ? "Active" : "Inactive";

              return (
                <motion.div
                  key={teacher._id || teacher.id || teacher.employeeId || index}
                  variants={fadeInVariants}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  className="col-12 col-md-6 col-lg-4"
                >
                  <div
                    style={{
                      background: BRAND.card,
                      borderRadius: 14,
                      border: `1px solid ${BRAND.border}`,
                      boxShadow: "0 1px 3px rgba(15,23,42,0.03), 0 4px 12px rgba(15,23,42,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      overflow: "hidden",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(15,23,42,0.06), 0 12px 24px rgba(15,23,42,0.05)";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 1px 3px rgba(15,23,42,0.03), 0 4px 12px rgba(15,23,42,0.03)";
                      e.currentTarget.style.borderColor = BRAND.border;
                    }}
                  >
                    {/* Top Row: Avatar, Name, Employee ID, Status Pill */}
                    <div
                      style={{
                        padding: "1.1rem 1.15rem 0.85rem",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        borderBottom: `1px solid ${BRAND.border}`,
                        background: BRAND.bg,
                      }}
                    >
                      {/* Avatar initials badge */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: BRAND.primaryLight,
                          color: BRAND.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          letterSpacing: "0.02em",
                          flexShrink: 0,
                          border: `1px solid ${BRAND.primary}20`,
                        }}
                      >
                        {initials}
                      </div>

                      {/* Name & ID */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                          }}
                        >
                          <h5
                            title={teacher.name}
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              color: BRAND.ink,
                              fontSize: "0.92rem",
                              lineHeight: 1.3,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {teacher.name || "Teacher"}
                          </h5>

                          {hasStatus && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "0.15rem 0.5rem",
                                background: statusColor + "15",
                                border: `1px solid ${statusColor}35`,
                                borderRadius: 12,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                color: statusColor,
                                flexShrink: 0,
                                textTransform: "uppercase",
                                letterSpacing: 0.3,
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  background: statusColor,
                                }}
                              />
                              {statusLabel}
                            </span>
                          )}
                        </div>

                        {teacher.employeeId && (
                          <div
                            style={{
                              fontSize: "0.76rem",
                              color: BRAND.muted,
                              fontWeight: 600,
                              marginTop: 2,
                            }}
                          >
                            ID: {teacher.employeeId}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Body: Contact and Credentials */}
                    <div
                      style={{
                        padding: "0.85rem 1.15rem 1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        flex: 1,
                      }}
                    >
                      {/* Email */}
                      {teacher.email && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.82rem",
                            color: BRAND.ink,
                            minWidth: 0,
                          }}
                        >
                          <FaEnvelope
                            style={{
                              color: BRAND.primary,
                              fontSize: "0.75rem",
                              flexShrink: 0,
                              opacity: 0.8,
                            }}
                          />
                          <span
                            title={teacher.email}
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: BRAND.ink,
                            }}
                          >
                            {teacher.email}
                          </span>
                        </div>
                      )}

                      {/* Phone */}
                      {teacher.phone && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.82rem",
                            color: BRAND.ink,
                            minWidth: 0,
                          }}
                        >
                          <FaPhone
                            style={{
                              color: BRAND.success,
                              fontSize: "0.75rem",
                              flexShrink: 0,
                              opacity: 0.8,
                            }}
                          />
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {teacher.phone}
                          </span>
                        </div>
                      )}

                      {/* Specialization */}
                      {teacher.specialization && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.82rem",
                            color: BRAND.ink,
                            minWidth: 0,
                          }}
                        >
                          <FaGraduationCap
                            style={{
                              color: BRAND.accent,
                              fontSize: "0.8rem",
                              flexShrink: 0,
                              opacity: 0.85,
                            }}
                          />
                          <span
                            title={teacher.specialization}
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {teacher.specialization}
                          </span>
                        </div>
                      )}

                      {/* Qualification (only if provided) */}
                      {teacher.qualification && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.82rem",
                            color: BRAND.ink,
                            minWidth: 0,
                          }}
                        >
                          <FaBriefcase
                            style={{
                              color: BRAND.info,
                              fontSize: "0.75rem",
                              flexShrink: 0,
                              opacity: 0.8,
                            }}
                          />
                          <span
                            title={teacher.qualification}
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {teacher.qualification}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}