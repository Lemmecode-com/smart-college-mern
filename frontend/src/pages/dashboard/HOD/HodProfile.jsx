import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
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
  FaUsers,
  FaCalendarCheck,
  FaCogs,
  FaInfoCircle,
  FaUniversity,
  FaUserTie,
  FaArrowRight,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

// ============================================================
// BRAND PALETTE (aligned with HodDashboard)
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
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" },
  }),
};

const slideDown = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
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
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

const safeString = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

// ============================================================
// LOADING STATE
// ============================================================
const LoadingState = () => (
  <div
    style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${BRAND.bg} 0%, ${BRAND.primaryLight} 100%)`,
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 48,
          height: 48,
          margin: "0 auto 1rem",
          border: `4px solid ${BRAND.border}`,
          borderTopColor: BRAND.accent,
          borderRadius: "50%",
          animation: "profile-spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: BRAND.muted, fontWeight: 500, margin: 0 }}>
        Loading profile…
      </p>
      <style>{`@keyframes profile-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

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
          width: 72,
          height: 72,
          margin: "0 auto 1rem",
          background: BRAND.primaryLight,
          borderRadius: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.75rem",
          color: BRAND.primary,
        }}
      >
        <FaUserTie />
      </div>
      <h4 style={{ color: BRAND.ink, fontWeight: 700, marginBottom: "0.5rem" }}>
        Profile not found
      </h4>
      <p style={{ color: BRAND.muted, marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        We couldn't load your HOD profile. Please try again.
      </p>
      <button
        onClick={onRetry}
        style={{
          background: BRAND.primary,
          color: "#fff",
          border: "none",
          padding: "0.6rem 1.4rem",
          borderRadius: 10,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = BRAND.primaryDark;
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = BRAND.primary;
          e.currentTarget.style.transform = "translateY(0)";
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
      borderRadius: 16,
      border: `1px solid ${BRAND.border}`,
      boxShadow: "0 1px 3px rgba(15,23,42,0.03), 0 6px 16px rgba(15,23,42,0.03)",
      height: "100%",
      ...style,
    }}
  >
    {children}
  </div>
);

// ============================================================
// SHARED: Section Header
// ============================================================
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: BRAND.primaryLight,
        color: BRAND.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.95rem",
        flexShrink: 0,
      }}
    >
      <Icon />
    </div>
    <div>
      <h5 style={{ margin: 0, fontWeight: 700, color: BRAND.ink, fontSize: "0.95rem", lineHeight: 1.3 }}>
        {title}
      </h5>
      {subtitle && (
        <p style={{ margin: 0, color: BRAND.muted, fontSize: "0.78rem" }}>{subtitle}</p>
      )}
    </div>
  </div>
);

// ============================================================
// COMPONENT: OverviewCard
// ============================================================
const OverviewCard = ({ icon: Icon, label, value, sub, color, bg, index }) => (
  <motion.div
    variants={fadeUp}
    custom={index}
    initial="hidden"
    animate="visible"
    style={{ height: "100%" }}
  >
    <div
      style={{
        background: BRAND.card,
        borderRadius: 14,
        padding: "1rem 1.05rem",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.03), 0 4px 12px rgba(15,23,42,0.03)",
        height: "100%",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 2px 6px rgba(15,23,42,0.05), 0 10px 24px rgba(15,23,42,0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 1px 2px rgba(15,23,42,0.03), 0 4px 12px rgba(15,23,42,0.03)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.65rem" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: bg,
            color: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
          }}
        >
          <Icon />
        </div>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: BRAND.muted,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "clamp(1.1rem, 2vw, 1.3rem)",
          fontWeight: 800,
          color: BRAND.ink,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          wordBreak: "break-word",
        }}
      >
        {safeString(value, "Not available")}
      </div>
      {sub && (
        <div style={{ fontSize: "0.72rem", color: BRAND.muted, marginTop: 3, fontWeight: 500 }}>
          {safeString(sub, "")}
        </div>
      )}
    </div>
  </motion.div>
);

// ============================================================
// COMPONENT: InfoRow (Enhanced with hover effects)
// ============================================================
const InfoRow = ({ icon: Icon, label, value, color = BRAND.muted }) => {
  const hasValue = value && String(value).trim() !== "" && String(value) !== "—";
  
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.65rem 1.25rem",
        borderBottom: `1px solid ${BRAND.border}`,
        transition: "background 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = BRAND.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: BRAND.primaryLight,
            color: BRAND.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            flexShrink: 0,
          }}
        >
          <Icon />
        </div>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: BRAND.muted, whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: "0.88rem",
          fontWeight: 700,
          color: hasValue ? BRAND.ink : BRAND.muted,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontStyle: hasValue ? "normal" : "italic",
          maxWidth: "60%",
        }}
      >
        {hasValue ? value : "Not available"}
      </span>
    </div>
  );
};

// ============================================================
// COMPONENT: QuickActionCard
// ============================================================
const QuickActionCard = ({ label, icon: Icon, route, color, navigate, index }) => (
  <motion.button
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ scale: 1.02, y: -1 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => navigate(route)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      padding: "0.85rem 1rem",
      background: BRAND.bg,
      border: `1px solid ${BRAND.border}`,
      borderRadius: 12,
      cursor: "pointer",
      textAlign: "left",
      transition: "all 0.2s ease",
      width: "100%",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color + "50";
      e.currentTarget.style.background = color + "08";
      e.currentTarget.style.boxShadow = `0 2px 8px ${color}15`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = BRAND.border;
      e.currentTarget.style.background = BRAND.bg;
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        background: color + "15",
        color: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.9rem",
        flexShrink: 0,
      }}
    >
      <Icon />
    </div>
    <span
      style={{
        fontSize: "0.85rem",
        fontWeight: 600,
        color: BRAND.ink,
        flex: 1,
      }}
    >
      {label}
    </span>
    <FaArrowRight
      style={{
        fontSize: "0.7rem",
        color: BRAND.muted,
        opacity: 0.6,
        flexShrink: 0,
      }}
    />
  </motion.button>
);

// ============================================================
// MAIN PROFILE PAGE
// ============================================================
export default function HodProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hod/profile");
      console.log("🔍 HOD Profile Response:", JSON.stringify(res.data, null, 2));
      const teacherData = res.data?.teacher || res.data;
      setProfile(teacherData || null);
    } catch (error) {
      console.error("Error fetching HOD profile:", error);
      toast.error(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!profile) return <EmptyState onRetry={fetchProfile} />;

  // ============================================================
  // BULLETPROOF DATA EXTRACTION
  // ============================================================
  
  // Smart department resolver - handles populated, unpopulated, or missing
  const resolveDepartment = () => {
    const dept = profile.department;
    
    // If it's already a populated object, use it
    if (typeof dept === "object" && dept !== null) {
      return dept;
    }
    
    // If it's an ObjectId string or missing, return empty object
    return {};
  };

  const dept = resolveDepartment();
  const initials = getInitials(profile.name);

  // Derived status with safe defaults
  const statusColor = profile.status === "ACTIVE" ? BRAND.success : BRAND.danger;
  const statusLabel = profile.status === "ACTIVE" ? "Active" : "Inactive";
  const deptTypeLabel = dept.type === "ACADEMIC" 
    ? "Academic Department" 
    : dept.type === "ADMINISTRATIVE" 
    ? "Administrative Department" 
    : "Department";

  // Overview cards data with enhanced fallbacks
  const overviewCards = [
    {
      label: "Department",
      value: dept.name || "Not assigned",
      sub: dept.code || "",
      icon: FaBuilding,
      color: BRAND.primary,
      bg: BRAND.primaryLight,
    },
    {
      label: "Employee ID",
      value: profile.employeeId || "Not available",
      sub: "Official ID",
      icon: FaIdCard,
      color: BRAND.info,
      bg: BRAND.infoLight,
    },
    {
      label: "Specialization",
      value: profile.specialization || "Not specified",
      sub: "Academic focus",
      icon: FaGraduationCap,
      color: BRAND.accent,
      bg: BRAND.accentLight,
    },
    {
      label: "Contact",
      value: profile.email || "No email",
      sub: profile.phone || "No phone",
      icon: FaEnvelope,
      color: BRAND.success,
      bg: BRAND.successLight,
    },
  ];

  // Quick actions
  const quickActions = [
    { label: "View Department", icon: FaLayerGroup, route: "/hod/department", color: BRAND.primary },
    { label: "Manage Teachers", icon: FaUsers, route: "/hod/teachers", color: BRAND.info },
    { label: "Manage Timetable", icon: FaCalendarCheck, route: "/timetable/list", color: BRAND.accent },
  ];

  // Build full address safely
  const fullAddress = [profile.address, profile.city, profile.state, profile.pincode]
    .filter(Boolean)
    .join(", ");

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${BRAND.bg} 0%, #eef4fb 100%)`,
        padding: "1.25rem 1rem 2.5rem",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ==================================================
             1. PROFILE HEADER
        ================================================== */}
        <motion.div
          variants={slideDown}
          initial="hidden"
          animate="visible"
          style={{
            background: `linear-gradient(120deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 55%, #091f2b 100%)`,
            borderRadius: 20,
            padding: "1.75rem 2rem",
            color: "#fff",
            boxShadow: "0 18px 45px -15px rgba(15, 58, 74, 0.45)",
            marginBottom: "1.25rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 280,
              height: "100%",
              background: `linear-gradient(120deg, transparent, ${BRAND.accent}22)`,
              borderTopRightRadius: 20,
              pointerEvents: "none",
            }}
          />

          <div
            className="row align-items-center g-3"
            style={{ position: "relative", zIndex: 1 }}
          >
            {/* Avatar + Identity */}
            <div className="col-md-7">
              <div style={{ display: "flex", alignItems: "center", gap: "1.1rem", marginBottom: "0.75rem" }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.16)",
                    backdropFilter: "blur(12px)",
                    border: "2px solid rgba(255,255,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.6rem",
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                    letterSpacing: "0.02em",
                  }}
                >
                  {initials}
                </div>
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "clamp(1.2rem, 2.2vw, 1.6rem)",
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    {safeString(profile.name, "HOD")}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.88rem",
                      opacity: 0.9,
                      fontWeight: 500,
                    }}
                  >
                    Head of Department
                  </p>
                </div>
              </div>

              {/* Badges Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0.35rem 0.85rem",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 20,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  <FaBuilding style={{ fontSize: "0.7rem", opacity: 0.85 }} />
                  {safeString(dept.name, "Department")}
                </span>
                {dept.code && (
                  <span
                    style={{
                      padding: "0.35rem 0.85rem",
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 20,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      letterSpacing: 0.3,
                    }}
                  >
                    {dept.code}
                  </span>
                )}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "0.35rem 0.85rem",
                    background: BRAND.accent + "30",
                    border: `1px solid ${BRAND.accent}50`,
                    borderRadius: 20,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  <FaIdCard style={{ fontSize: "0.7rem" }} />
                  {safeString(profile.employeeId, "EMP")}
                </span>
              </div>
            </div>

            {/* Right: Contact + Status */}
            <div className="col-md-5 text-md-end">
              <div
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0.4rem 0.9rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 10,
                    fontSize: "0.82rem",
                    fontWeight: 500,
                  }}
                >
                  <FaEnvelope style={{ opacity: 0.85, fontSize: "0.75rem" }} />
                  {safeString(profile.email, "No email")}
                </span>
                {profile.phone && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0.4rem 0.9rem",
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 10,
                      fontSize: "0.82rem",
                      fontWeight: 500,
                    }}
                  >
                    <FaPhone style={{ opacity: 0.85, fontSize: "0.75rem" }} />
                    {profile.phone}
                  </span>
                )}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0.4rem 0.9rem",
                    background: statusColor + "30",
                    border: `1px solid ${statusColor}50`,
                    borderRadius: 20,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: statusColor,
                    }}
                  />
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ==================================================
             2. OVERVIEW CARDS
        ================================================== */}
        <div className="row g-3 mb-3">
          {overviewCards.map((card, idx) => (
            <OverviewCard
              key={card.label}
              index={idx}
              label={card.label}
              value={card.value}
              sub={card.sub}
              icon={card.icon}
              color={card.color}
              bg={card.bg}
            />
          ))}
        </div>

        {/* ==================================================
             3. MAIN GRID
        ================================================== */}
        <div className="row g-3">

          {/* LEFT COLUMN */}
          <div className="col-12 col-lg-7">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Department Responsibility */}
              <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible">
                <CardSurface>
                  <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
                    <SectionHeader
                      icon={FaBuilding}
                      title="Department Responsibility"
                      subtitle="Your administrative scope"
                    />
                  </div>
                  <div
                    style={{
                      borderTop: `1px solid ${BRAND.border}`,
                    }}
                  >
                    <InfoRow
                      icon={FaUniversity}
                      label="Department Name"
                      value={dept.name}
                      color={BRAND.primary}
                    />
                    <InfoRow
                      icon={FaIdCard}
                      label="Department Code"
                      value={dept.code}
                      color={BRAND.info}
                    />
                    <InfoRow
                      icon={FaUserTie}
                      label="Role"
                      value="Head of Department"
                      color={BRAND.accent}
                    />
                    <InfoRow
                      icon={FaLayerGroup}
                      label="Department Type"
                      value={deptTypeLabel}
                      color={BRAND.muted}
                    />
                  </div>
                </CardSurface>
              </motion.div>

              {/* Personal Details */}
              <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible">
                <CardSurface>
                  <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
                    <SectionHeader
                      icon={FaInfoCircle}
                      title="Personal & Professional Details"
                      subtitle="Additional information"
                    />
                  </div>
                  <div
                    style={{
                      borderTop: `1px solid ${BRAND.border}`,
                    }}
                  >
                    <InfoRow
                      icon={FaGraduationCap}
                      label="Specialization"
                      value={profile.specialization}
                    />
                    <InfoRow
                      icon={FaBriefcase}
                      label="Qualification"
                      value={profile.qualification}
                    />
                    <InfoRow
                      icon={FaCalendarAlt}
                      label="Date of Joining"
                      value={formatDate(profile.dateOfJoining)}
                    />
                    <InfoRow
                      icon={FaPhone}
                      label="Phone"
                      value={profile.phone}
                    />
                    <InfoRow
                      icon={FaMapMarkerAlt}
                      label="Address"
                      value={fullAddress}
                    />
                  </div>
                </CardSurface>
              </motion.div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-12 col-lg-5">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Quick Actions */}
              <motion.div variants={fadeUp} custom={7} initial="hidden" animate="visible">
                <CardSurface>
                  <div style={{ padding: "1.25rem 1.25rem 1rem" }}>
                    <SectionHeader
                      icon={FaCogs}
                      title="Quick Actions"
                      subtitle="Navigate to related sections"
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                      padding: "0 1.25rem 1.25rem",
                    }}
                  >
                    {quickActions.map((action, idx) => (
                      <QuickActionCard
                        key={action.label}
                        label={action.label}
                        icon={action.icon}
                        route={action.route}
                        color={action.color}
                        navigate={navigate}
                        index={idx}
                      />
                    ))}
                  </div>
                </CardSurface>
              </motion.div>

              {/* Navigation Back */}
              <motion.div variants={fadeUp} custom={8} initial="hidden" animate="visible">
                <div
                  style={{
                    background: BRAND.card,
                    borderRadius: 16,
                    border: `1px solid ${BRAND.border}`,
                    boxShadow: "0 1px 3px rgba(15,23,42,0.03), 0 6px 16px rgba(15,23,42,0.03)",
                    padding: "1.25rem",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.75rem",
                      fontSize: "0.82rem",
                      color: BRAND.muted,
                      fontWeight: 500,
                    }}
                  >
                    Need to go back?
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/hod/dashboard")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0.6rem 1.4rem",
                      background: BRAND.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontSize: "0.85rem",
                      fontWeight: 600,
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
                    <FaArrowLeft style={{ fontSize: "0.75rem" }} />
                    Back to Dashboard
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}