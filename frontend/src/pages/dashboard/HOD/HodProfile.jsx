import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaBriefcase,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaCalendarAlt,
  FaLayerGroup,
  FaBuilding,
  FaIdCard,
  FaInfoCircle,
  FaUniversity,
  FaUserTie,
} from "react-icons/fa";
/* eslint-disable-next-line no-unused-vars */
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

// ============================================================
// BRAND PALETTE (aligned with NOVAA ERP design system)
// ============================================================
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

// ============================================================
// ANIMATION VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" },
  }),
};

const slideDown = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ============================================================
// HELPERS
// ============================================================
const getInitials = (name) => {
  if (!name) return "HOD";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

const safeString = (value, fallback = "—") => {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  return String(value);
};

// ============================================================
// EMPTY STATE
// ============================================================
const EmptyState = ({ onRetry }) => (
  <div
    style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}
  >
    <div style={{ textAlign: "center", maxWidth: 380 }}>
      <div
        style={{
          width: 68,
          height: 68,
          margin: "0 auto 1rem",
          background: BRAND.primaryLight,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.6rem",
          color: BRAND.primary,
        }}
      >
        <FaUserTie />
      </div>
      <h4 style={{ color: BRAND.ink, fontWeight: 700, marginBottom: "0.5rem" }}>
        Profile not found
      </h4>
      <p style={{ color: BRAND.muted, marginBottom: "1.5rem", fontSize: "0.88rem" }}>
        We couldn't load your HOD profile. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          background: BRAND.primary,
          color: "#fff",
          border: "none",
          padding: "0.6rem 1.4rem",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: "0.88rem",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = BRAND.primaryDark;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = BRAND.primary;
        }}
      >
        Retry
      </button>
    </div>
  </div>
);

// ============================================================
// SHARED: Card Surface
// ============================================================
const CardSurface = ({ children, style = {} }) => (
  <div
    style={{
      background: BRAND.card,
      borderRadius: 14,
      border: `1px solid ${BRAND.border}`,
      boxShadow: "0 1px 3px rgba(15,23,42,0.03), 0 4px 12px rgba(15,23,42,0.03)",
      height: "100%",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

// ============================================================
// SHARED: Section Header
// ============================================================
// eslint-disable-next-line no-unused-vars
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: BRAND.primaryLight,
        color: BRAND.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.9rem",
        flexShrink: 0,
      }}
    >
      <Icon />
    </div>
    <div style={{ minWidth: 0 }}>
      <h5
        style={{
          margin: 0,
          fontWeight: 700,
          color: BRAND.ink,
          fontSize: "0.92rem",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h5>
      {subtitle && (
        <p style={{ margin: 0, color: BRAND.muted, fontSize: "0.76rem" }}>{subtitle}</p>
      )}
    </div>
  </div>
);

// ============================================================
// COMPONENT: InfoRow
// ============================================================
const InfoRow = ({ icon: Icon, label, value }) => {
  const displayValue = safeString(value, "—");
  const isFallback = displayValue === "—";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem 1.25rem",
        borderBottom: `1px solid ${BRAND.border}`,
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = BRAND.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {Icon && (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: BRAND.primaryLight,
              color: BRAND.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
              flexShrink: 0,
            }}
          >
            <Icon />
          </div>
        )}
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            color: BRAND.muted,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: "0.86rem",
          fontWeight: isFallback ? 500 : 600,
          color: isFallback ? BRAND.muted : BRAND.ink,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "60%",
        }}
      >
        {displayValue}
      </span>
    </div>
  );
};


// ============================================================
// MAIN PROFILE PAGE
// ============================================================
export default function HodProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hod/profile");
      const teacherData =
        res.data?.data?.teacher ||
        res.data?.teacher ||
        res.data?.data ||
        res.data;
      setProfile(teacherData || null);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to load profile";

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      logger.error("Failed to fetch HOD profile:", statusCode, errorCode);

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

  const handleGoBack = () => {
    navigate("/hod/dashboard");
  };

  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading size="md" color="primary" text="Loading HOD Profile..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ApiError
        title="Profile Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchProfile}
        onGoBack={handleGoBack}
      />
    );
  }

  if (!profile) return <EmptyState onRetry={fetchProfile} />;

  // ============================================================
  // BULLETPROOF DATA EXTRACTION & DEFAULTS
  // ============================================================
  const resolveDepartment = () => {
    const dept = profile?.department;
    if (typeof dept === "object" && dept !== null) {
      return dept;
    }
    return {};
  };

  const dept = resolveDepartment();
  const initials = getInitials(profile?.name);
  const avatarUrl =
    profile?.avatar ||
    profile?.profilePicture ||
    profile?.photo ||
    null;

  // Status mapping
  const isActive = profile?.status === "ACTIVE";
  const statusColor = isActive ? BRAND.success : BRAND.danger;
  const statusLabel = isActive ? "Active" : profile?.status ? "Inactive" : "Active";

  // Build full address safely
  const fullAddress = [profile?.address, profile?.city, profile?.state, profile?.pincode]
    .filter(Boolean)
    .join(", ");

  // Professional information fields (filtered to valid values only)
  const professionalFields = [
    profile?.qualification
      ? { label: "Qualification", value: profile.qualification, icon: FaBriefcase }
      : null,
    profile?.dateOfJoining || profile?.joiningDate
      ? {
          label: "Date of Joining",
          value: formatDate(profile.dateOfJoining || profile.joiningDate),
          icon: FaCalendarAlt,
        }
      : null,
    profile?.phone || profile?.mobileNumber
      ? {
          label: "Phone Number",
          value: profile.phone || profile.mobileNumber,
          icon: FaPhone,
        }
      : null,
    fullAddress
      ? { label: "Address", value: fullAddress, icon: FaMapMarkerAlt }
      : null,
    profile?.specialization
      ? {
          label: "Specialization",
          value: profile.specialization,
          icon: FaGraduationCap,
        }
      : null,
  ].filter(Boolean);


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
      <style>{`
        @media (min-width: 768px) {
          .hod-header-contact {
            align-items: flex-end !important;
          }
        }
        @media (max-width: 767.98px) {
          .hod-header-contact {
            align-items: flex-start !important;
            width: 100%;
          }
        }
      `}</style>

      <div className="erp-page-content" style={{ maxWidth: 1120 }}>
        {/* Navigation / Header Bar */}
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
              { label: "My Profile" },
            ]}
          />
          <button
            type="button"
            onClick={handleGoBack}
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

        {/* ==================================================
             1. COMPACT PROFILE HEADER
        ================================================== */}
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
          {/* Decorative subtle ambient highlight */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 240,
              height: "100%",
              background: `linear-gradient(120deg, transparent, ${BRAND.accent}20)`,
              borderTopRightRadius: 16,
              pointerEvents: "none",
            }}
          />

          <div
            className="row align-items-center g-3"
            style={{ position: "relative", zIndex: 1 }}
          >
            {/* Left: Avatar + Identity + Key Badges */}
            <div className="col-12 col-md-8">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                {/* Avatar / Photo */}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.name || "HOD Profile"}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid rgba(255,255,255,0.3)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.18)",
                      backdropFilter: "blur(8px)",
                      border: "2px solid rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.35rem",
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {initials}
                  </div>
                )}

                <div style={{ minWidth: 0, flex: "1 1 240px" }}>
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
                        lineHeight: 1.25,
                        color: "#fff",
                        wordBreak: "break-word",
                      }}
                    >
                      {safeString(profile.name, "HOD")}
                    </h2>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "0.2rem 0.65rem",
                        background: statusColor + "25",
                        border: `1px solid ${statusColor}55`,
                        borderRadius: 20,
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: 0.3,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: statusColor,
                        }}
                      />
                      {statusLabel}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "0.15rem 0 0.5rem",
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: 500,
                    }}
                  >
                    Head of Department
                  </p>

                  {/* Badges Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "0.25rem 0.65rem",
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: 16,
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        color: "#fff",
                      }}
                    >
                      <FaBuilding style={{ fontSize: "0.68rem", opacity: 0.85 }} />
                      {safeString(dept.name, "Department")}
                    </span>
                    {dept.code && (
                      <span
                        style={{
                          padding: "0.25rem 0.65rem",
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          borderRadius: 16,
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          color: "#fff",
                          letterSpacing: 0.3,
                        }}
                      >
                        {dept.code}
                      </span>
                    )}
                    {profile.employeeId && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "0.25rem 0.65rem",
                          background: BRAND.accent + "25",
                          border: `1px solid ${BRAND.accent}45`,
                          borderRadius: 16,
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          color: "#ffedd5",
                        }}
                      >
                        <FaIdCard style={{ fontSize: "0.68rem" }} />
                        {profile.employeeId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact Information */}
            <div className="col-12 col-md-4 text-md-end">
              <div
                className="hod-header-contact"
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  alignItems: "flex-start",
                }}
              >
                {profile.email && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0.3rem 0.75rem",
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.92)",
                      wordBreak: "break-all",
                    }}
                  >
                    <FaEnvelope style={{ opacity: 0.8, fontSize: "0.72rem" }} />
                    {profile.email}
                  </span>
                )}
                {(profile.phone || profile.mobileNumber) && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0.3rem 0.75rem",
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.92)",
                    }}
                  >
                    <FaPhone style={{ opacity: 0.8, fontSize: "0.72rem" }} />
                    {profile.phone || profile.mobileNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ==================================================
             2. MAIN 2-COLUMN BALANCED GRID
        ================================================== */}
        <div className="row g-3">
          {/* LEFT COLUMN: Department & Professional Information */}
          <div className="col-12 col-lg-7">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Department Information / Administrative Scope */}
              <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible">
                <CardSurface>
                  <div style={{ padding: "1.1rem 1.25rem 0.85rem" }}>
                    <SectionHeader
                      icon={FaBuilding}
                      title="Department Information"
                      subtitle="Departmental affiliation & administrative scope"
                    />
                  </div>
                  <div style={{ borderTop: `1px solid ${BRAND.border}` }}>
                    <InfoRow
                      icon={FaUniversity}
                      label="Department Name"
                      value={dept.name}
                    />
                    <InfoRow
                      icon={FaIdCard}
                      label="Department Code"
                      value={dept.code}
                    />
                    <InfoRow
                      icon={FaUserTie}
                      label="Role"
                      value="Head of Department"
                    />
                    {dept.type && (
                      <InfoRow
                        icon={FaLayerGroup}
                        label="Department Type"
                        value={
                          dept.type === "ACADEMIC"
                            ? "Academic Department"
                            : dept.type === "ADMINISTRATIVE"
                            ? "Administrative Department"
                            : dept.type
                        }
                      />
                    )}
                  </div>
                </CardSurface>
              </motion.div>

              {/* Professional Information */}
              <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
                <CardSurface>
                  <div style={{ padding: "1.1rem 1.25rem 0.85rem" }}>
                    <SectionHeader
                      icon={FaBriefcase}
                      title="Professional Information"
                      subtitle="Academic credentials & contact details"
                    />
                  </div>
                  <div style={{ borderTop: `1px solid ${BRAND.border}` }}>
                    {professionalFields.length > 0 ? (
                      professionalFields.map((field) => (
                        <InfoRow
                          key={field.label}
                          icon={field.icon}
                          label={field.label}
                          value={field.value}
                        />
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "1.5rem 1.25rem",
                          textAlign: "center",
                          color: BRAND.muted,
                        }}
                      >
                        <FaInfoCircle
                          style={{
                            fontSize: "1.25rem",
                            color: BRAND.muted,
                            opacity: 0.6,
                            marginBottom: "0.35rem",
                            display: "inline-block",
                          }}
                        />
                        <p style={{ margin: 0, fontSize: "0.82rem", color: BRAND.muted }}>
                          No additional professional details on record.
                        </p>
                      </div>
                    )}
                  </div>
                </CardSurface>
              </motion.div>
            </div>
          </div>

          {/* RIGHT COLUMN: Scope Context */}
          <div className="col-12 col-lg-5">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Department Responsibilities Overview */}
              <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible">
                <CardSurface>
                  <div style={{ padding: "1.1rem 1.25rem 0.85rem" }}>
                    <SectionHeader
                      icon={FaUserTie}
                      title="Administrative Scope"
                      subtitle="Key departmental oversight responsibilities"
                    />
                  </div>
                  <div
                    style={{
                      padding: "0 1.25rem 1.1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.65rem",
                        padding: "0.65rem 0.8rem",
                        background: BRAND.bg,
                        borderRadius: 10,
                        border: `1px solid ${BRAND.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: BRAND.primary,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: BRAND.ink }}>
                          Faculty & Staff Coordination
                        </div>
                        <div style={{ fontSize: "0.75rem", color: BRAND.muted, marginTop: 1 }}>
                          Oversee departmental teachers, course allocations, and workloads.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.65rem",
                        padding: "0.65rem 0.8rem",
                        background: BRAND.bg,
                        borderRadius: 10,
                        border: `1px solid ${BRAND.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: BRAND.info,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: BRAND.ink }}>
                          Academic Timetables
                        </div>
                        <div style={{ fontSize: "0.75rem", color: BRAND.muted, marginTop: 1 }}>
                          Review, schedule, and publish weekly departmental lecture sessions.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.65rem",
                        padding: "0.65rem 0.8rem",
                        background: BRAND.bg,
                        borderRadius: 10,
                        border: `1px solid ${BRAND.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: BRAND.accent,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: BRAND.ink }}>
                          Exception & Request Approvals
                        </div>
                        <div style={{ fontSize: "0.75rem", color: BRAND.muted, marginTop: 1 }}>
                          Review schedule exceptions, holiday slots, and faculty substitutes.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardSurface>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}