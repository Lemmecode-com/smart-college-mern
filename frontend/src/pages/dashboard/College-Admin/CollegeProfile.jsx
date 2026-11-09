import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import useRole from "../../../hooks/useRole";

// Authentication / session error codes that must NOT surface a toast.
// These are routed exclusively to ApiError for a friendly mapped screen.
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

import {
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBuilding,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaLayerGroup,
  FaBook,
  FaUserGraduate,
  FaEdit,
  FaEye,
  FaDownload,
  FaPrint,
  FaArrowLeft,
  FaStar,
  FaShieldAlt,
  FaInfoCircle,
  FaBell,
  FaChartLine,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaClipboardList,
  FaMoneyBillWave,
  FaFileInvoice,
  FaCogs,
  FaSync,
  FaBolt,
  FaRedo,
  FaSyncAlt,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import LogoImage from "../../../components/common/LogoImage";

// Brand Color Palette
const BRAND_COLORS = {
  primary: {
    main: "#0E3746",
    dark: "#0E3746",
    light: "#0E3746",
    gradient: "none",
  },
  success: {
    main: "#1e6f5c",
    dark: "#155447",
    light: "#2a8f7c",
    gradient: "linear-gradient(135deg, #1e6f5c 0%, #155447 100%)",
  },
  info: {
    main: "#17a2b8",
    dark: "#138496",
    light: "#37b2d8",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
  },
  warning: {
    main: "#ffc107",
    dark: "#e0a800",
    light: "#ffce3d",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
  },
  danger: {
    main: "#dc3545",
    dark: "#c82333",
    light: "#e4606d",
    gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
  },
  secondary: {
    main: "#6c757d",
    dark: "#545b62",
    light: "#868e96",
    gradient: "linear-gradient(135deg, #6c757d 0%, #545b62 100%)",
  },
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-10, 10, -10],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canEdit } = useRole();

  const [college, setCollege] = useState(null);
  const [stats, setStats] = useState({
    departments: 0,
    courses: 0,
    students: 0,
    teachers: 0,
    activeSessions: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN" && user.role !== "PRINCIPAL") return <Navigate to="/dashboard" replace />;

  /* ================= FETCH PROFILE ================= */
  const fetchCollegeProfile = async () => {
    try {
      setError(null);
      const collegeRes = await api.get("/college/my-college");
      setCollege(collegeRes.data);

      setStats({
        departments: collegeRes.data?.departments?.length || 0,
        courses: collegeRes.data?.courses?.length || 0,
        students: collegeRes.data?.studentCount || 0,
        teachers: collegeRes.data?.teacherCount || 0,
        activeSessions: collegeRes.data?.activeSessions || 0,
      });
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;

      logger.error("College profile load error:", {
        statusCode,
        errorCode,
        backendMessage,
        page: "CollegeProfile",
      });

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

      setError({
        message: isAuthError
          ? "Your session has expired. Please sign in again."
          : "Failed to load college profile. Please try again.",
        statusCode,
        errorCode,
      });
      setCollege(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollegeProfile();
     
  }, []);

  // Handle retry action
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await fetchCollegeProfile();
    setIsRetrying(false);
  };

  // Handle go back action
  const handleGoBack = () => {
    navigate(-1);
  };

  /* ================= QUICK ACTIONS ================= */
  const quickActions = [
    {
      icon: <FaUsers />,
      label: "Students",
      description: "Manage student records",
      path: "/students/pending-approvals",
      accent: "#2563eb",
      accentBg: "#eff6ff",
      accentBorder: "#bfdbfe",
      accentBgHover: "#dbeafe",
    },
    {
      icon: <FaLayerGroup />,
      label: "Departments",
      description: "Manage academic departments",
      path: "/departments",
      accent: "#7c3aed",
      accentBg: "#f5f3ff",
      accentBorder: "#ddd6fe",
      accentBgHover: "#ede9fe",
    },
    {
      icon: <FaBook />,
      label: "Courses",
      description: "Manage academic courses",
      path: "/courses",
      accent: "#0d9488",
      accentBg: "#f0fdfa",
      accentBorder: "#99f6e4",
      accentBgHover: "#ccfbf1",
    },
    {
      icon: <FaChalkboardTeacher />,
      label: "Staff",
      description: "Manage faculty and employees",
      path: "/college/staff",
      accent: "#16a34a",
      accentBg: "#f0fdf4",
      accentBorder: "#bbf7d0",
      accentBgHover: "#dcfce7",
    },
    {
      icon: <FaMoneyBillWave />,
      label: "Fee Structures",
      description: "Manage fee plans",
      path: "/fees/list",
      accent: "#d97706",
      accentBg: "#fffbeb",
      accentBorder: "#fde68a",
      accentBgHover: "#fef3c7",
    },
    ...(user?.role === "COLLEGE_ADMIN"
      ? [
          {
            icon: <FaCogs />,
            label: "Settings",
            description: "Institution preferences",
            path: "/system-settings/general",
            accent: "#4f46e5",
            accentBg: "#eef2ff",
            accentBorder: "#c7d2fe",
            accentBgHover: "#e0e7ff",
          },
        ]
      : []),
  ];

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
          text="Loading College Profile..."
        />
      </div>
    </div>
  );
}

  if (error) {
    return (
      <ApiError
        title="Error Loading Profile"
        message={
          error.message || "Failed to load college profile. Please try again."
        }
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
    );
  }

  if (!college) return <EmptyState onBack={() => navigate("/dashboard")} />;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-viewport-min-100 college-profile-responsive"
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          paddingTop: "0.5rem",
          paddingBottom: "1.5rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        {/* Success Toast Notification */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: "1rem",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#10b981",
              color: "white",
              padding: "1rem 2rem",
              borderRadius: "9999px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              maxWidth: "90%",
            }}
          >
            <FaCheckCircle size={20} />
            <span>Profile updated successfully!</span>
          </motion.div>
        )}

        <div style={{ maxWidth: "100%", margin: "0 auto" }}>

         {/* ================= BREADCRUMB ================= */}
          <div
            style={{
              width: "100%",
              margin: "0 auto",
              paddingTop: 0,
              height: "auto",
            }}
          >
            <div style={{ width: "100%" }}>
              <Breadcrumb
                items={[
                  { label: "Dashboard", path: "/dashboard" },
                  { label: "College Profile" },
                ]}
              />
            </div>
          </div>

          {/* ================= PROFILE HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="college-profile-banner"
            style={{
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              background: "linear-gradient(135deg, #0f3a4a 0%, #164e63 100%)",
              padding: "1.25rem 1.5rem",
              borderRadius: "14px",
              boxShadow: "0 8px 24px rgba(14, 55, 70, 0.16)",
              color: "#ffffff",
            }}
          >
            <div
              className="college-profile-banner-main"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flex: "1 1 320px",
                minWidth: 0,
              }}
            >
              <div
                className="college-profile-banner-logo"
                style={{
                  width: "64px",
                  height: "64px",
                  minWidth: "64px",
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <LogoImage
                  documentId={
                    college?.documentRefs?.logo?.documentId ||
                    college?.logoDocumentId
                  }
                  size={52}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  className="college-profile-banner-title"
                  style={{
                    margin: 0,
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#ffffff",
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                  }}
                >
                  {college.name}
                </h1>
                <div
                  className="college-profile-banner-badges"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    marginTop: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      padding: "0.2rem 0.65rem",
                      borderRadius: "999px",
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "rgba(255, 255, 255, 0.95)",
                      minHeight: "26px",
                    }}
                  >
                    {college.code}
                  </span>
                  <span
                    style={{
                      background: college.isActive
                        ? "rgba(34, 197, 94, 0.18)"
                        : "rgba(239, 68, 68, 0.18)",
                      color: college.isActive ? "#86efac" : "#fca5a5",
                      border: `1px solid ${college.isActive ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
                      fontWeight: 600,
                      borderRadius: "999px",
                      padding: "0.2rem 0.65rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.75rem",
                      minHeight: "26px",
                    }}
                  >
                    {college.isActive ? (
                      <>
                        <FaCheckCircle aria-hidden="true" size={12} /> Active
                      </>
                    ) : (
                      <>
                        <FaTimesCircle aria-hidden="true" size={12} /> Inactive
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            {canEdit("college") && (
              <motion.button
                whileHover={{ y: -1, boxShadow: "0 6px 16px rgba(14,55,70,0.18)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/college/edit-profile")}
                className="college-profile-edit-btn"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0f3a4a",
                  border: "1px solid rgba(255,255,255,0.9)",
                  padding: "0.65rem 1.15rem",
                  borderRadius: "10px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <FaEdit size={16} style={{ color: "#0f3a4a" }} /> Edit Profile
              </motion.button>
            )}
          </motion.div>

          {/* ================= MAIN CONTENT GRID ================= */}
          <div className="row g-4">
            {/* LEFT COLUMN - PROFILE DETAILS */}
            <div className="col-12">
              <div className="row g-4">
                {/* ================= INSTITUTE INFORMATION ================= */}
                <motion.div
                  variants={fadeInVariants}
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  className="col-12"
                >
                  <section
                    className="college-profile-section"
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #dfe7ee",
                      borderRadius: "14px",
                      boxShadow: "0 2px 10px rgba(15, 58, 74, 0.04)",
                      marginBottom: "1.25rem",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "1.1rem 1.25rem 0.9rem",
                        borderBottom: "1px solid #edf2f6",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.65rem",
                        }}
                      >
                        <span
                          style={{
                            width: "36px",
                            height: "36px",
                            minWidth: "36px",
                            borderRadius: "10px",
                            background: "rgba(15, 58, 74, 0.08)",
                            color: "#0f3a4a",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-hidden="true"
                        >
                          <FaBuilding size={16} />
                        </span>
                        <div>
                          <h2
                            style={{
                              margin: 0,
                              fontSize: "1.1rem",
                              fontWeight: 700,
                              color: "#153f50",
                              lineHeight: 1.25,
                            }}
                          >
                            Institute Information
                          </h2>
                          <p
                            style={{
                              margin: "0.2rem 0 0",
                              fontSize: "0.84rem",
                              color: "#64748b",
                              lineHeight: 1.4,
                            }}
                          >
                            Official institutional details and contact information
                          </p>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
                      <div className="row g-3 college-institute-grid">
                        <div className="col-12 col-md-6 col-lg-4 d-flex">
                          <InfoItem
                            icon={<FaEnvelope />}
                            label="Official Email"
                            value={college.email}
                            copyable
                          />
                        </div>
                        <div className="col-12 col-md-6 col-lg-4 d-flex">
                          <InfoItem
                            icon={<FaPhoneAlt />}
                            label="Contact Number"
                            value={college.contactNumber}
                            copyable
                          />
                        </div>
                        <div className="col-12 col-md-6 col-lg-4 d-flex">
                          <InfoItem
                            icon={<FaMapMarkerAlt />}
                            label="Full Address"
                            value={college.address}
                          />
                        </div>
                        <div className="col-12 col-md-6 col-lg-4 d-flex">
                          <InfoItem
                            icon={<FaCalendarAlt />}
                            label="Established Year"
                            value={college.establishedYear?.toString() || "N/A"}
                          />
                        </div>
                        <div className="col-12 col-md-6 col-lg-4 d-flex">
                          <InfoItem
                            icon={<FaBuilding />}
                            label="College Type"
                            value={college.collegeType || "Private"}
                          />
                        </div>
                        <div className="col-12 col-md-6 col-lg-4 d-flex">
                          <InfoItem
                            icon={<FaCalendarAlt />}
                            label="Member Since"
                            value={
                              college.createdAt
                                ? new Date(college.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    },
                                  )
                                : "N/A"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </motion.div>

                {/* ================= QUICK ACTIONS ================= */}
                <motion.div
                  variants={fadeInVariants}
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  className="col-12"
                >
                  <section
                    className="college-profile-section"
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #dfe7ee",
                      borderRadius: "14px",
                      boxShadow: "0 2px 10px rgba(15, 58, 74, 0.04)",
                      overflow: "hidden",
                      marginTop: "-1.6rem",
                    }}
                  >
                    <div
                      style={{
                        padding: "1.1rem 1.25rem 0.9rem",
                        borderBottom: "1px solid #edf2f6",
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "#153f50",
                          lineHeight: 1.25,
                        }}
                      >
                        Quick Action
                      </h2>
                      <p
                        style={{
                          margin: "0.2rem 0 0",
                          fontSize: "0.84rem",
                          color: "#64748b",
                          lineHeight: 1.4,
                        }}
                      >
                        Access frequently used administrative areas
                      </p>
                    </div>
                    <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
                      <div className="row g-3 college-quick-actions-grid">
                        {quickActions.map((action, idx) => (
                          <div key={idx} className="col-12 col-md-6 col-lg-4">
                            <QuickActionCard
                              icon={action.icon}
                              label={action.label}
                              description={action.description}
                              onClick={() => navigate(action.path)}
                              accent={action.accent}
                              accentBg={action.accentBg}
                              accentBorder={action.accentBorder}
                              accentBgHover={action.accentBgHover}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </motion.div>
              </div>
            </div>

            {/* RIGHT COLUMN - SIDEBAR */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ position: "sticky", top: "20px" }}>
                {/* ================= RECENT ACTIVITY =================
                <motion.div
                  variants={fadeInVariants}
                  custom={2}
                  initial="hidden"
                  animate="visible"
                >
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    marginBottom: '1.5rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '1.5rem',
                      background: BRAND_COLORS.info.gradient,
                      color: 'white'
                    }}>
                      <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaBell /> Recent Activity
                      </h2>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: BRAND_COLORS.primary.main,
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaUserGraduate size={16} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>New student enrolled</p>
                            <small style={{ color: '#64748b' }}>2 hours ago</small>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: BRAND_COLORS.success.main,
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaBook size={16} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>Course added</p>
                            <small style={{ color: '#64748b' }}>Yesterday</small>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: BRAND_COLORS.warning.main,
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaMoneyBillWave size={16} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>Fee structure updated</p>
                            <small style={{ color: '#64748b' }}>2 days ago</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div> */}
              </div>
            </div>
          </div>

          {/* ================= FOOTER ================= */}
          {/* <motion.div
            variants={fadeInVariants}
            custom={3}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              marginTop: '1.5rem',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0' }}>
                  <small style={{ color: '#64748b' }}>
                    <FaInfoCircle style={{ marginRight: '0.5rem', color: BRAND_COLORS.primary.main }} /> 
                    System Version: <strong style={{ color: '#1e293b' }}>v2.1.0</strong>
                  </small>
                </p>
                <p style={{ margin: 0 }}>
                  <small style={{ color: '#64748b' }}>
                    Last Sync: <strong style={{ color: '#1e293b' }}>{new Date().toLocaleTimeString()}</strong>
                  </small>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/dashboard")}
                  style={{
                    backgroundColor: 'white',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaArrowLeft /> Back to Dashboard
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.reload()}
                  style={{
                    backgroundColor: BRAND_COLORS.primary.main,
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <motion.div variants={spinVariants} animate="animate">
                    <FaSyncAlt />
                  </motion.div>
                  Refresh Data
                </motion.button>
              </div>
            </div>
          </motion.div> */}
        </div>
        <style>{`
  .college-profile-responsive .college-profile-section { scroll-margin-top: 1rem; }
  .college-profile-edit-btn:focus-visible,
  .college-quick-action-card:focus-visible,
  .college-info-item:focus-visible {
    outline: 2px solid #0f3a4a;
    outline-offset: 2px;
    
  }
  .college-quick-action-card:hover {
    border-color: var(--qa-border, #b8c8d3) !important;
    box-shadow: 0 8px 18px rgba(15, 58, 74, 0.08);
  }
  .college-quick-action-card:hover .college-quick-action-icon {
    background: var(--qa-bg-hover, #e2e8f0) !important;
  }
  .college-quick-action-card:hover .college-quick-action-arrow {
    opacity: 1;
    transform: translate(1px, -1px);
  }
  /* Institute Information: equal-height grid, consistent alignment, no overflow */
  .college-institute-grid > [class*="col-"] { min-width: 0; }
  .college-institute-grid .college-info-item {
    flex: 1 1 auto;
    width: 100%;
  }
  @media (max-width: 767px) {
    .college-profile-banner { padding: 1rem !important; align-items: stretch !important; }
    .college-profile-banner-main { flex: 1 1 100% !important; }
    .college-profile-edit-btn { width: 100%; }
    .college-info-item { padding: 14px 16px !important; min-height: 84px !important; }
    .college-info-item-icon { width: 44px !important; height: 44px !important; min-width: 44px !important; }
  }

/* =========================================================
   COLLEGE PROFILE - RESPONSIVE DESIGN
   DESKTOP REMAINS UNCHANGED
   ========================================================= */


/* =========================================================
   TABLET
   768px - 1199px
   ========================================================= */

@media (min-width: 768px) and (max-width: 1199px) {

  .college-profile-responsive {
    width: 100% !important;
    max-width: 100% !important;

    min-height: 100vh !important;
    height: auto !important;

    padding: 0.5rem 1.25rem 1.25rem !important;

    box-sizing: border-box !important;

    overflow-x: hidden !important;
    overflow-y: visible !important;
  }


  /* Main content wrapper */

  .college-profile-responsive > div {
    width: 100% !important;
    max-width: 1100px !important;

    margin: 0 auto !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     PROFILE HEADER
     ===================================================== */

  .college-profile-responsive
  > div
  > div:nth-child(2) {

    width: 100% !important;

    margin-bottom: 1.25rem !important;

    display: flex !important;

    align-items: center !important;

    justify-content: space-between !important;

    gap: 1rem !important;

    box-sizing: border-box !important;
  }


  .college-profile-responsive
  > div
  > div:nth-child(2)
  > div:first-child {

    flex: 1 1 auto !important;

    min-width: 0 !important;

    display: flex !important;

    align-items: center !important;

    gap: 1rem !important;
  }


  /* Logo */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  img {

    width: 78px !important;
    height: 78px !important;

    max-width: 78px !important;
    max-height: 78px !important;

    flex: 0 0 78px !important;

    object-fit: contain !important;
  }


  /* College name */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  h1 {

    margin: 0 0 0.4rem !important;

    font-size: 1.55rem !important;

    line-height: 1.2 !important;

    color: #0f172a !important;

    white-space: normal !important;

    overflow-wrap: anywhere !important;
  }


  /* Status/code badges */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  h1 + div {

    display: flex !important;

    flex-wrap: wrap !important;

    gap: 0.45rem !important;
  }


  .college-profile-responsive
  > div
  > div:nth-child(2)
  h1 + div span {

    padding: 0.35rem 0.7rem !important;

    font-size: 0.72rem !important;
  }


  /* Edit button */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  > button {

    flex: 0 0 auto !important;

    min-height: 44px !important;

    padding: 0.7rem 1.15rem !important;

    border-radius: 0.7rem !important;

    font-size: 0.85rem !important;

    white-space: nowrap !important;
  }


  /* =====================================================
     BOOTSTRAP ROW RESET
     ===================================================== */

  .college-profile-responsive .row {
    height: auto !important;

    min-height: 0 !important;
  }


  .college-profile-responsive
  .row.g-4 {

    margin-top: 0 !important;

    margin-bottom: 0 !important;
  }


  /* =====================================================
     INSTITUTE CARD
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  > .col-12 {

    width: 100% !important;

    height: auto !important;

    min-height: 0 !important;
  }


  /* Institute outer card */

  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div {

    width: 100% !important;

    height: auto !important;

    min-height: 0 !important;

    margin-bottom: 1rem !important;

    border-radius: 1.15rem !important;

    overflow: hidden !important;

    box-sizing: border-box !important;
  }


  /* Institute header */

  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:first-child {

    padding: 1rem 1.25rem !important;

    min-height: 54px !important;

    display: flex !important;

    align-items: center !important;

    box-sizing: border-box !important;
  }


  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:first-child
  h2 {

    margin: 0 !important;

    font-size: 1.05rem !important;

    line-height: 1.2 !important;
  }


  /* Institute body */

  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:last-child {

    padding: 1rem !important;

    height: auto !important;

    min-height: 0 !important;

    overflow: visible !important;

    box-sizing: border-box !important;
  }


  /* Information grid */

  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:last-child
  > .row {

    margin: 0 !important;

    row-gap: 0.75rem !important;
  }


  /* =====================================================
     INFORMATION ITEMS
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4 {

    height: auto !important;

    min-height: 0 !important;

    box-sizing: border-box !important;
  }


  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div {

    width: 100% !important;

    height: auto !important;

    min-height: 78px !important;

    padding: 0.8rem !important;

    border-radius: 0.85rem !important;

    box-sizing: border-box !important;

    overflow: visible !important;
  }


  /* Inner content */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div {

    display: flex !important;

    align-items: flex-start !important;

    gap: 0.75rem !important;

    width: 100% !important;

    box-sizing: border-box !important;
  }


  /* Icon */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:first-child {

    width: 38px !important;

    min-width: 38px !important;

    max-width: 38px !important;

    height: 38px !important;

    min-height: 38px !important;

    flex: 0 0 38px !important;

    display: flex !important;

    align-items: center !important;

    justify-content: center !important;

    border-radius: 0.65rem !important;
  }


  /* Text */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child {

    flex: 1 1 auto !important;

    min-width: 0 !important;

    width: auto !important;

    max-width: 100% !important;

    overflow: visible !important;
  }


  /* Label */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child
  h6 {

    margin: 0 0 0.2rem !important;

    font-size: 0.67rem !important;

    line-height: 1.15 !important;

    letter-spacing: 0.45px !important;

    color: #64748b !important;
  }


  /* Value */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child
  h5 {

    margin: 0 !important;

    font-size: 0.88rem !important;

    line-height: 1.35 !important;

    color: #1e293b !important;

    font-weight: 600 !important;

    white-space: normal !important;

    word-break: normal !important;

    overflow-wrap: anywhere !important;
  }
}


/* =========================================================
   MOBILE
   0 - 767px
   ========================================================= */

@media (max-width: 767px) {

  /* =====================================================
     PAGE
     ===================================================== */

  .college-profile-responsive {

    width: 100% !important;

    max-width: 100% !important;

    min-height: 100vh !important;

    height: auto !important;

    padding: 0.65rem !important;

    box-sizing: border-box !important;

    overflow-x: hidden !important;

    overflow-y: visible !important;
  }


  .college-profile-responsive > div {

    width: 100% !important;

    max-width: 100% !important;

    margin: 0 !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     PROFILE HEADER
     ===================================================== */

  .college-profile-responsive
  > div
  > div:nth-child(2) {

    width: 100% !important;

    margin-bottom: 0.9rem !important;

    display: flex !important;

    flex-direction: column !important;

    align-items: stretch !important;

    gap: 0.7rem !important;

    box-sizing: border-box !important;
  }


  /* Logo + details */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  > div:first-child {

    width: 100% !important;

    min-width: 0 !important;

    display: flex !important;

    align-items: center !important;

    gap: 0.75rem !important;
  }


  /* Logo */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  img {

    width: 62px !important;

    height: 62px !important;

    max-width: 62px !important;

    max-height: 62px !important;

    flex: 0 0 62px !important;

    object-fit: contain !important;
  }


  /* College details */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  > div:first-child
  > div:last-child {

    flex: 1 1 auto !important;

    min-width: 0 !important;

    max-width: 100% !important;

    overflow: visible !important;
  }


  /* College name */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  h1 {

    margin: 0 0 0.3rem !important;

    font-size: 1.08rem !important;

    line-height: 1.2 !important;

    white-space: normal !important;
    overflow-wrap: anywhere !important;
  }


  /* Code + status */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  h1 + div {

    display: flex !important;

    align-items: center !important;

    flex-wrap: wrap !important;

    gap: 0.3rem !important;
  }


  .college-profile-responsive
  > div
  > div:nth-child(2)
  h1 + div span {

    padding: 0.25rem 0.55rem !important;

    font-size: 0.62rem !important;

    line-height: 1.2 !important;
  }


  /* =====================================================
     EDIT PROFILE
     ===================================================== */

  .college-profile-responsive
  > div
  > div:nth-child(2)
  > button {

    width: 100% !important;

    min-height: 42px !important;

    padding: 0.65rem 1rem !important;

    border-radius: 0.7rem !important;

    justify-content: center !important;

    font-size: 0.82rem !important;

    box-shadow: 0 4px 12px rgba(26, 75, 109, 0.18) !important;
  }


  /* =====================================================
     BOOTSTRAP RESET
     ===================================================== */

  .college-profile-responsive .row {

    width: 100% !important;

    height: auto !important;

    min-height: 0 !important;

    margin-top: 0 !important;

    margin-bottom: 0 !important;
  }


  .college-profile-responsive
  .row.g-4 {

    --bs-gutter-x: 0 !important;

    --bs-gutter-y: 0 !important;
  }


  /* =====================================================
     INSTITUTE OUTER CARD
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  > .col-12 {

    width: 100% !important;

    max-width: 100% !important;

    padding: 0 !important;

    height: auto !important;

    min-height: 0 !important;
  }


  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12 {

    width: 100% !important;

    max-width: 100% !important;

    padding: 0 !important;

    margin: 0 !important;
  }


  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div {

    width: 100% !important;

    max-width: 100% !important;

    height: auto !important;

    min-height: 0 !important;

    margin: 0 0 0.9rem !important;

    border-radius: 1rem !important;

    overflow: hidden !important;

    box-sizing: border-box !important;

    box-shadow: 0 5px 20px rgba(15, 23, 42, 0.06) !important;
  }


  /* =====================================================
     INSTITUTE HEADER
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:first-child {

    width: 100% !important;

    min-height: 50px !important;

    padding: 0.8rem 0.9rem !important;

    box-sizing: border-box !important;

    display: flex !important;

    align-items: center !important;
  }


  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:first-child
  h2 {

    margin: 0 !important;

    font-size: 0.98rem !important;

    line-height: 1.2 !important;

    white-space: nowrap !important;
  }


  /* =====================================================
     INSTITUTE BODY
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:last-child {

    width: 100% !important;

    height: auto !important;

    min-height: 0 !important;

    padding: 0.75rem !important;

    margin: 0 !important;

    overflow: visible !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     INFORMATION GRID
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:last-child
  > .row {

    width: 100% !important;

    margin: 0 !important;

    display: flex !important;

    flex-direction: column !important;

    gap: 0.55rem !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     INFORMATION COLUMN
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4 {

    width: 100% !important;

    max-width: 100% !important;

    flex: 0 0 100% !important;

    padding: 0 !important;

    margin: 0 !important;

    height: auto !important;

    min-height: 0 !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     INFORMATION CARD
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div {

    width: 100% !important;

    min-height: 65px !important;

    height: auto !important;

    padding: 0.65rem 0.7rem !important;

    margin: 0 !important;

    border-radius: 0.8rem !important;

    box-sizing: border-box !important;

    overflow: visible !important;

    box-shadow: none !important;

    border: 1px solid #e2e8f0 !important;
  }


  /* =====================================================
     INFO INNER CONTENT
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div {

    width: 100% !important;

    display: flex !important;

    flex-direction: row !important;

    align-items: flex-start !important;

    gap: 0.65rem !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     ICON
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:first-child {

    width: 34px !important;

    min-width: 34px !important;

    max-width: 34px !important;

    height: 34px !important;

    min-height: 34px !important;

    flex: 0 0 34px !important;

    display: flex !important;

    align-items: center !important;

    justify-content: center !important;

    border-radius: 0.6rem !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     TEXT
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child {

    flex: 1 1 auto !important;

    width: auto !important;

    min-width: 0 !important;

    max-width: calc(100% - 42px) !important;

    overflow: visible !important;

    box-sizing: border-box !important;
  }


  /* Label */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child
  h6 {

    margin: 0 0 0.15rem !important;

    padding: 0 !important;

    font-size: 0.62rem !important;

    line-height: 1.15 !important;

    letter-spacing: 0.4px !important;

    color: #64748b !important;

    white-space: normal !important;
  }


  /* Value */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child
  h5 {

    margin: 0 !important;

    padding: 0 !important;

    font-size: 0.78rem !important;

    line-height: 1.3 !important;

    font-weight: 600 !important;

    color: #1e293b !important;

    white-space: normal !important;

    word-break: normal !important;

    overflow-wrap: anywhere !important;

    display: block !important;
  }


  /* =====================================================
     ADDRESS CARD
     ===================================================== */

  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child
  h5 {

    max-width: 100% !important;

    overflow: visible !important;

    text-overflow: unset !important;
  }


  /* =====================================================
     QUICK ACTIONS
     ===================================================== */

  .college-profile-responsive
  .row.g-3 {

    display: flex !important;

    flex-wrap: wrap !important;

    width: 100% !important;

    margin: 0 !important;
  }


  .college-profile-responsive
  .row.g-3
  > [class*="col-"] {

    padding: 0.2rem !important;

    margin-bottom: 0.35rem !important;
  }


  .college-profile-responsive
  .row.g-3
  button {

    width: 100% !important;

    min-height: 72px !important;

    padding: 0.65rem 0.4rem !important;

    border-radius: 0.7rem !important;

    font-size: 0.7rem !important;
  }
}


/* =========================================================
   VERY SMALL MOBILE
   <= 400px
   ========================================================= */

@media (max-width: 400px) {

  .college-profile-responsive {

    padding: 0.5rem !important;
  }


  .college-profile-responsive
  > div
  > div:nth-child(2)
  > div:first-child {

    gap: 0.6rem !important;
  }


  .college-profile-responsive
  > div
  > div:nth-child(2)
  img {

    width: 56px !important;

    height: 56px !important;

    max-width: 56px !important;

    max-height: 56px !important;

    flex-basis: 56px !important;
  }


  .college-profile-responsive
  > div
  > div:nth-child(2)
  h1 {

    font-size: 1rem !important;
  }


  .college-profile-responsive
  .row.g-4
  > .col-12
  > .row.g-4
  > .col-12
  > div
  > div:first-child {

    padding: 0.75rem !important;
  }


  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div {

    min-height: 62px !important;

    padding: 0.6rem !important;
  }


  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div {

    gap: 0.55rem !important;
  }


  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:first-child {

    width: 32px !important;

    min-width: 32px !important;

    max-width: 32px !important;

    height: 32px !important;

    min-height: 32px !important;

    flex-basis: 32px !important;
  }


  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child {

    max-width: calc(100% - 40px) !important;
  }


  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child
  h6 {

    font-size: 0.6rem !important;
  }


  .college-profile-responsive
  .row.g-4
  .col-12.col-md-6.col-lg-4
  > div
  > div
  > div:last-child
  h5 {

    font-size: 0.76rem !important;
  }
}
`}</style>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ onBack }) {
  return (
    <div
       style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        padding: "2rem",
      }}
      className="erp-viewport-min-100"
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1.5rem",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
          maxWidth: "500px",
          width: "100%",
          padding: "2.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ color: "#64748b", marginBottom: "1rem", fontSize: "3rem" }}>
          <FaUniversity />
        </div>
        <h4
          style={{ margin: "0 0 0.5rem 0", fontWeight: 700, color: "#1e293b" }}
        >
          No College Data Found
        </h4>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
          Please contact your system administrator to set up college profile.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          style={{
            backgroundColor: "white",
            color: "#64748b",
            border: "2px solid #e2e8f0",
            padding: "0.875rem 2rem",
            borderRadius: "0.75rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0 auto",
          }}
        >
          <FaArrowLeft /> Go Back
        </motion.button>
      </div>
    </div>
  );
}

/* ================= QUICK ACTION CARD ================= */
function QuickActionCard({
  icon,
  label,
  description,
  onClick,
  accent = "#0f3a4a",
  accentBg = "#f1f5f9",
  accentBorder = "#cbd5e1",
  accentBgHover = "#e2e8f0",
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="college-quick-action-card"
      aria-label={`${label}: ${description}`}
      style={{
        "--qa-accent": accent,
        "--qa-bg": accentBg,
        "--qa-border": accentBorder,
        "--qa-bg-hover": accentBgHover,
        width: "100%",
        minHeight: "132px",
        backgroundColor: "#ffffff",
        border: "1px solid #dfe7ee",
        borderTop: `3px solid ${accent}`,
        padding: "1rem",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        textAlign: "left",
        cursor: "pointer",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
        position: "relative",
        boxShadow: "0 1px 2px rgba(15, 58, 74, 0.03)",
      }}
    >
      <span
        aria-hidden="true"
        className="college-quick-action-arrow"
        style={{
          position: "absolute",
          top: "0.85rem",
          right: "0.85rem",
          color: accent,
          display: "inline-flex",
          opacity: 0.75,
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
      >
        <FaExternalLinkAlt size={12} />
      </span>
      <span
        aria-hidden="true"
        className="college-quick-action-icon"
        style={{
          width: "46px",
          height: "46px",
          minWidth: "46px",
          borderRadius: "12px",
          background: accentBg,
          color: accent,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.2rem",
          marginBottom: "0.85rem",
          transition: "background-color 0.2s ease",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: "0.98rem",
          fontWeight: 600,
          color: "#153f50",
          lineHeight: 1.25,
          paddingRight: "1.25rem",
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginTop: "0.3rem",
          fontSize: "0.82rem",
          color: "#64748b",
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
    </motion.button>
  );
}

/* ================= INFO ITEM ================= */
function InfoItem({ icon, label, value, copyable = false }) {
  const [copied, setCopied] = React.useState(false);
  const displayValue = value || "N/A";

  const handleCopy = () => {
    if (copyable && value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (copyable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleCopy();
    }
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: "#f8fafc" }}
      className="college-info-item"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "88px",
        padding: "16px",
        border: "1px solid #dfe7ee",
        borderRadius: "12px",
        backgroundColor: "#fcfdfe",
        cursor: copyable ? "pointer" : "default",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
      }}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
      role={copyable ? "button" : undefined}
      tabIndex={copyable ? 0 : undefined}
      aria-label={copyable ? `Copy ${label}: ${displayValue}` : undefined}
    >
      <div
        className="college-info-item-inner"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          width: "100%",
          minWidth: 0,
        }}
      >
        <div
          className="college-info-item-icon"
          style={{
            width: "44px",
            height: "44px",
            minWidth: "44px",
            backgroundColor: "rgba(15, 58, 74, 0.08)",
            color: "#0f3a4a",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div
          className="college-info-item-text"
          style={{ flex: 1, minWidth: 0, alignSelf: "center" }}
        >
          <div
            style={{
              margin: 0,
              marginBottom: "4px",
              color: "#64748b",
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              lineHeight: 1.2,
            }}
          >
            {label}
          </div>
          <div
            style={{
              margin: 0,
              fontWeight: 600,
              color: "#153f50",
              fontSize: "0.94rem",
              lineHeight: 1.4,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              whiteSpace: "normal",
            }}
          >
            {displayValue}
            {copyable && copied && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  marginLeft: "0.4rem",
                  color: "#15803d",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <FaCheckCircle size={12} /> Copied
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Add this CSS to your global stylesheet or index.html
/*
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
*/
