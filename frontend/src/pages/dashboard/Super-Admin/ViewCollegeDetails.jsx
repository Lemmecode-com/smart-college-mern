import React, { useEffect, useState, useContext } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaEnvelope,
  FaPhone,
  FaSearch,
  FaEye,
  FaToggleOff,
  FaToggleOn,
  FaSyncAlt,
  FaInfoCircle,
  FaDownload,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaChevronRight,
  FaPlus,
  FaListOl,
  FaFileExcel,
  FaFilePdf,
  FaChevronLeft,
  FaCalendarAlt,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaClipboardList,
  FaLayerGroup,
  FaBook,
  FaChalkboardTeacher,
  FaUsers,
  FaQrcode,
  FaCopy,
  FaPaperPlane,
  FaUserTie,
  FaLink,
} from "react-icons/fa";
import { getFrontendRegistrationUrl } from "../../../utils/urlHelpers";
import { motion, AnimatePresence } from "framer-motion";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 12, stiffness: 100 },
  },
};

const pulseVariants = {
  initial: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const gradientColors = {
  "from-blue-400 to-cyan-400": "linear-gradient(135deg, #0f3a4a, #3db5e6)",
  "from-green-400 to-emerald-400": "linear-gradient(135deg, #065f46, #10b981)",
  "from-amber-400 to-orange-400": "linear-gradient(135deg, #92400e, #f59e0b)",
  "from-purple-400 to-pink-400": "linear-gradient(135deg, #7c3aed, #ec4899)",
  "from-blue-500 to-cyan-400": "linear-gradient(135deg, #0f3a4a, #3db5e6)",
  "from-indigo-500 to-purple-500": "linear-gradient(135deg, #4f46e5, #a78bfa)",
  "from-amber-500 to-orange-400": "linear-gradient(135deg, #b45309, #f97316)",
  "from-green-500 to-emerald-400": "linear-gradient(135deg, #047857, #10b981)",
  "from-teal-500 to-cyan-500": "linear-gradient(135deg, #0f3a4a, #3db5e6)",
  "from-pink-500 to-rose-400": "linear-gradient(135deg, #be185d, #f43f5e)",
  "from-blue-600 to-cyan-500": "linear-gradient(135deg, #0f3a4a, #3db5e6)",
  "primary-gradient": "linear-gradient(135deg, #0f3a4a, #0c4a6e)",
  "success-gradient": "linear-gradient(135deg, #047857, #065f46)",
  "header-gradient": "linear-gradient(135deg, #0f3a4a, #0c2d3a)",
};

export default function ViewCollegeDetails() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [college, setCollege] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copying, setCopying] = useState(false);

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

  // Add global styles for text wrapping and responsive design
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Text wrapping utility */
      .text-wrap-break {
        word-break: break-word;
        overflow-wrap: break-word;
        white-space: normal;
      }

      /* =========================================================
        COLLEGE DETAILS - TABLET
        ========================================================= */

      @media (min-width: 769px) and (max-width: 991.98px) {

        .college-details-page {
          padding: 1.25rem !important;
        }

        .college-details-header {
          border-radius: 18px !important;
          margin-bottom: 1.25rem !important;
        }

        .college-details-header > div {
          padding: 1.25rem !important;
        }

        .college-details-header-content {
          gap: 1.1rem !important;
        }

        .college-details-header-content > div:first-child {
          width: 68px !important;
          height: 68px !important;
          min-width: 68px !important;
        }

        .college-details-header-content > div:first-child svg {
          width: 28px !important;
          height: 28px !important;
        }

        .college-details-header h1 {
          font-size: 1.55rem !important;
          line-height: 1.25 !important;
          overflow-wrap: anywhere;
        }

        .college-details-header span {
          font-size: 0.82rem !important;
        }

        .college-details-header button {
          padding: 0.7rem 1.2rem !important;
          font-size: 0.88rem !important;
          white-space: nowrap;
        }

        .college-information-card {
          border-radius: 16px !important;
        }

        .college-information-card > div:first-child {
          padding: 0.9rem 1.25rem !important;
        }

        .college-information-card > div:last-child {
          padding: 1.25rem !important;
        }

        .college-information-card .row {
          --bs-gutter-x: 1rem;
          --bs-gutter-y: 1rem;
        }

        .info-item-container {
          padding: 0.9rem !important;
          border-radius: 14px !important;
        }

        .info-item-container > div:first-child {
          min-width: 44px !important;
          min-height: 44px !important;
          padding: 0.65rem !important;
        }

        .info-item-container .info-item-value {
          font-size: 0.9rem !important;
          line-height: 1.4 !important;
        }
      }


      /* =========================================================
        COLLEGE DETAILS - MOBILE
        ========================================================= */

      @media (max-width: 768px) {

        .college-details-page {
          padding: 0.75rem !important;
          min-height: 100vh;
          overflow-x: hidden;
        }


        /* ================= HEADER ================= */

        .college-details-header {
          border-radius: 16px !important;
          margin-bottom: 1rem !important;
        }

        .college-details-header > div {
          padding: 1rem !important;
        }

        .college-details-header > div > div {
          gap: 0.85rem !important;
        }

        .college-details-header-content {
          gap: 0.85rem !important;
          width: 100% !important;
        }

        .college-details-header-content > div:first-child {
          width: 58px !important;
          height: 58px !important;
          min-width: 58px !important;
          border-radius: 14px !important;
        }

        .college-details-header-content > div:first-child svg {
          width: 24px !important;
          height: 24px !important;
        }


        /* College name */

        .college-details-header h1 {
          font-size: 1.35rem !important;
          line-height: 1.2 !important;
          margin-bottom: 0.35rem !important;

          word-break: break-word;
          overflow-wrap: anywhere;
        }


        /* Code + established year */

        .college-details-header-content span {
          font-size: 0.75rem !important;
        }

        .college-details-header-content span:first-child {
          padding: 0.4rem 0.7rem !important;
        }

        .college-details-header-content span:last-child {
          gap: 0.25rem !important;
        }


        /* Back button */

        .college-details-header button {
          width: 100% !important;
          justify-content: center !important;

          padding: 0.7rem 1rem !important;
          min-height: 44px;

          font-size: 0.85rem !important;
          border-radius: 10px !important;

          margin-top: 0.15rem;
        }


        /* ================= INFORMATION CARD ================= */

        .college-information-card {
          border-radius: 15px !important;
        }

        .college-information-card > div:first-child {
          padding: 0.85rem 1rem !important;
        }

        .college-information-card h2 {
          font-size: 1.05rem !important;
          line-height: 1.3 !important;
        }

        .college-information-card > div:last-child {
          padding: 1rem !important;
        }

        .college-information-card .row {
          --bs-gutter-x: 0;
          --bs-gutter-y: 0.85rem;
        }


        /* ================= INFO ITEMS ================= */

        .info-item-container {
          padding: 0.85rem !important;

          border-radius: 14px !important;

          min-height: auto !important;
        }

        .info-item-container > div:first-child {
          min-width: 42px !important;
          min-height: 42px !important;

          padding: 0.6rem !important;

          border-radius: 11px !important;

          margin-right: 0 !important;
          margin-bottom: 0.65rem !important;
        }

        .info-item-container > div:first-child svg {
          width: 18px !important;
          height: 18px !important;
        }

        .info-item-container small {
          font-size: 0.72rem !important;
        }

        .info-item-container .info-item-value {
          font-size: 0.88rem !important;
          line-height: 1.4 !important;

          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }


        /* ================= STATISTICS ================= */

        .college-details-page .card h2 {
          font-size: 1.05rem !important;
        }


        /* ================= REGISTRATION ================= */

        .college-details-page input[type="text"] {
          min-width: 0 !important;
          font-size: 0.8rem !important;
        }

        .college-details-page button {
          touch-action: manipulation;
        }
      }


      /* =========================================================
        SMALL MOBILE
        ========================================================= */

      @media (max-width: 480px) {

        .college-details-page {
          padding: 0.55rem !important;
        }


        /* Header */

        .college-details-header > div {
          padding: 0.85rem !important;
        }

        .college-details-header-content {
          gap: 0.7rem !important;
        }

        .college-details-header-content > div:first-child {
          width: 52px !important;
          height: 52px !important;
          min-width: 52px !important;
          border-radius: 12px !important;
        }

        .college-details-header h1 {
          font-size: 1.2rem !important;
        }

        .college-details-header-content span {
          font-size: 0.7rem !important;
        }

        .college-details-header-content span:first-child {
          padding: 0.35rem 0.6rem !important;
        }

        .college-details-header button {
          min-height: 42px;
          padding: 0.65rem 0.85rem !important;
          font-size: 0.8rem !important;
        }


        /* Information */

        .college-information-card > div:first-child {
          padding: 0.75rem 0.85rem !important;
        }

        .college-information-card h2 {
          font-size: 0.98rem !important;
        }

        .college-information-card > div:last-child {
          padding: 0.8rem !important;
        }

        .info-item-container {
          padding: 0.75rem !important;
        }

        .info-item-container > div:first-child {
          min-width: 40px !important;
          min-height: 40px !important;
          padding: 0.55rem !important;
        }

        .info-item-container small {
          font-size: 0.68rem !important;
        }

        .info-item-container .info-item-value {
          font-size: 0.82rem !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup - remove style on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const frontendRegistrationUrl = getFrontendRegistrationUrl(
    college?.registrationUrl,
  );

  // Security checks
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;

  // Fetch college data with error reset
  useEffect(() => {
    setError(""); // Reset error on mount/id change
    setLoading(true);
    if (!id) {
      setError("Invalid College ID");
      setLoading(false);
      return;
    }
    fetchCollege();
  }, [id]);

  const fetchCollege = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/master/${id}`);
      setCollege(res.data.college);
      setStats(res.data.stats);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to fetch college details";

      logger.error("Error fetching college details:", statusCode, errorCode);

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

  // Send email to college admin with validation
  const handleSendEmail = async (e) => {
    e.preventDefault();

    // Input validation
    if (!emailData.subject.trim() || !emailData.message.trim()) {
      toast.error("Subject and message are required", {
        position: "top-right",
        autoClose: 3000,
      });
      setError("Subject and message are required");
      return;
    }

    if (emailData.subject.length > 200) {
      toast.error("Subject must be less than 200 characters", {
        position: "top-right",
        autoClose: 3000,
      });
      setError("Subject must be less than 200 characters");
      return;
    }

    if (emailData.message.length > 5000) {
      toast.error("Message must be less than 5000 characters", {
        position: "top-right",
        autoClose: 3000,
      });
      setError("Message must be less than 5000 characters");
      return;
    }

    setSendingEmail(true);
    setError(""); // Clear previous errors

    try {
      const res = await api.post(`/master/${id}/send-email`, {
        collegeId: id,
        subject:
          emailData.subject ||
          `Regarding ${college.name} - Smart College Management`,
        message: emailData.message,
      });

      toast.success(res.data.message || "Email sent successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowEmailModal(false);
      setEmailData({ subject: "", message: "" });
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to send email";

      logger.error("Error sending email:", statusCode, errorCode);

      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        });
      }
      setError(errorMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  // Loading state with animated spinner
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
            text="Loading college details..."
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ApiError
        title="College Details Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchCollege}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (!college) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="college-details-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        <div style={{ maxWidth: "100%", margin: "0 auto" }}>
          {/* Header Card with Animated Icon */}
          <motion.div
            className="college-details-header"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
              marginBottom: "1.5rem",
              overflow: "hidden",
              border: "1px solid #DCE6EF",
            }}
          >
            <div
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div
                  className="college-details-header-content"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: "68px",
                      height: "68px",
                      background: "#103D4B",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FaUniversity size={28} style={{ color: "white" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1
                      style={{
                        margin: 0,
                        marginBottom: "0.375rem",
                        fontSize: "1.625rem",
                        fontWeight: 700,
                        color: "#142235",
                        lineHeight: 1.25,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {college.name}
                    </h1>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "#EAF5FB",
                          color: "#164E63",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "9999px",
                          fontSize: "0.8125rem",
                          fontWeight: 500,
                          border: "1px solid #C9DFEC",
                        }}
                      >
                        CODE: {college.code}
                      </span>
                      <span
                        style={{
                          color: "#64748B",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.875rem",
                        }}
                      >
                        <FaCalendarAlt style={{ marginRight: "0.3125rem", fontSize: "0.75rem" }} />
                        Est. {college.establishedYear}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(-1)}
                  style={{
                    background: "#103D4B",
                    color: "white",
                    border: "none",
                    padding: "0.625rem 1.25rem",
                    borderRadius: "10px",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.18s ease",
                    boxShadow: "0 2px 6px rgba(16, 61, 75, 0.15)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    height: "44px",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#0E3746";
                    e.target.style.boxShadow = "0 4px 12px rgba(16, 61, 75, 0.2)";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#103D4B";
                    e.target.style.boxShadow = "0 2px 6px rgba(16, 61, 75, 0.15)";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  <FaArrowLeft size={14} /> Back to Colleges
                </button>
              </div>
            </div>
          </motion.div>

          <div className="row g-4">
            {/* College Information Card */}
            <motion.div variants={itemVariants} className="col-12">
              <div
                className="card border-0 shadow-sm college-information-card"
                style={{ borderRadius: "16px", overflow: "hidden" }}
              >
                <div
                  className="px-4 py-3"
                  style={{
                    background: "#F5F9FC",
                    borderBottom: "1px solid #DCE6EF",
                  }}
                >
                  <h2
                    className="mb-0 fw-bold"
                    style={{ fontSize: "1.125rem", color: "#0E3746" }}
                  >
                    <FaUniversity className="me-2" style={{ color: "#22B8E6" }} /> College
                    Information
                  </h2>
                </div>
                <div className="p-4">
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <InfoItem
                        icon={<FaEnvelope />}
                        label="Official Email"
                        value={college.email}
                        supportingText="Primary contact email"
                        iconColor="#22B8E6"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <InfoItem
                        icon={<FaPhone />}
                        label="Contact Number"
                        value={college.contactNumber}
                        supportingText="Main phone line"
                        iconColor="#16A879"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <InfoItem
                        icon={<FaMapMarkerAlt />}
                        label="Address"
                        value={college.address}
                        supportingText="Registered location"
                        iconColor="#8964E8"
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <InfoItem
                        icon={<FaCalendarAlt />}
                        label="Established Year"
                        value={college.establishedYear?.toString() || "N/A"}
                        supportingText="Year of inception"
                        iconColor="#F59E0B"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Statistics Section */}
            {stats && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="col-12"
              >
                <div
                  className="card border-0 shadow-sm"
                  style={{ borderRadius: "16px", overflow: "hidden" }}
                >
                  <div
                    className="px-4 py-3"
                    style={{
                      background: "#F5F9FC",
                      borderBottom: "1px solid #DCE6EF",
                    }}
                  >
                    <h2
                      className="mb-0 fw-bold"
                      style={{ fontSize: "1.125rem", color: "#0E3746" }}
                    >
                      <FaClipboardList className="me-2" style={{ color: "#22B8E6" }} /> College
                      Statistics
                    </h2>
                  </div>
                  <div className="p-2">
                    <div className="row g-2">
                      <div className="col-12 col-md-6 col-lg-4">
                        <StatCard
                          icon={<FaLayerGroup />}
                          label="Departments"
                          value={stats.totalDepartments}
                          iconColor="#22B8E6"
                        />
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <StatCard
                          icon={<FaBook />}
                          label="Courses"
                          value={stats.totalCourses}
                          iconColor="#16A879"
                        />
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <StatCard
                          icon={<FaChalkboardTeacher />}
                          label="Teachers"
                          value={stats.totalTeachers}
                          iconColor="#8964E8"
                        />
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <StatCard
                          icon={<FaUsers />}
                          label="Total Students"
                          value={stats.totalStudents}
                          iconColor="#F59E0B"
                        />
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <StatCard
                          icon={<FaCheckCircle />}
                          label="Approved Students"
                          value={stats.approvedStudents}
                          iconColor="#0891B2"
                        />
                      </div>
                      <div className="col-12 col-md-6 col-lg-4">
                        <StatCard
                          icon={<FaCalendarAlt />}
                          label="Active Timetables"
                          value={stats.totalTimetables}
                          iconColor="#EC4899"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Registration Details Card */}
            <motion.div
              variants={itemVariants}
              style={{ gridColumn: "1 / -1" }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.05)",
                  height: "100%",
                  overflow: "hidden",
                  border: "1px solid #DCE6EF",
                }}
              >
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    background: "#F5F9FC",
                    borderBottom: "1px solid #DCE6EF",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      color: "#0E3746",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FaQrcode style={{ color: "#22B8E6" }} /> Registration
                    Portal
                  </h2>
                </div>
                <div className="vcd-registration-portal" style={{ padding: "1.5rem" }}>
                  <div
                    className="vcd-reg-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: "24px",
                      width: "100%",
                    }}
                  >
                    {/* Left Column - College Registration Link */}
                    <div className="vcd-reg-col">
                      <div
                        className="vcd-reg-panel"
                        style={{
                          backgroundColor: "#F3F6F9",
                          border: "1px solid #DCE6EF",
                          borderRadius: "12px",
                          padding: "1.25rem",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#22B8E615",
                                color: "#22B8E6",
                                flexShrink: 0,
                              }}
                            >
                              <FaLink size={18} style={{ color: "#22B8E6" }} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0E3746" }}>
                                College Registration Link
                              </h3>
                              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                                Unique link for student registration
                              </p>
                            </div>
                          </div>
                          <div style={{ marginBottom: "0.75rem" }}>
                            <div
                              className="vcd-url-box"
                              style={{
                                backgroundColor: "white",
                                border: "1px solid #DCE6EF",
                                borderRadius: "10px",
                                padding: "0.875rem 1rem",
                                fontSize: "0.875rem",
                                color: "#0E3746",
                                fontFamily: "monospace",
                                wordBreak: "break-all",
                                overflowWrap: "break-word",
                                maxWidth: "100%",
                                minHeight: "64px",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {frontendRegistrationUrl}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            setCopying(true);
                            try {
                              await navigator.clipboard.writeText(frontendRegistrationUrl);
                              toast.success("Registration URL copied to clipboard!", {
                                position: "top-right",
                                autoClose: 2000,
                              });
                            } catch (err) {
                              toast.error("Failed to copy URL", {
                                position: "top-right",
                                autoClose: 3000,
                              });
                              setError("Failed to copy URL");
                            } finally {
                              setCopying(false);
                            }
                          }}
                          disabled={copying}
                          style={{
                            width: "100%",
                            backgroundColor: copying ? "#9ca3af" : "#22B8E6",
                            color: "white",
                            border: "none",
                            padding: "0.75rem 1rem",
                            borderRadius: "10px",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            cursor: copying ? "not-allowed" : "pointer",
                            transition: "all 0.18s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                          }}
                          onMouseOver={(e) => {
                            if (!copying) {
                              e.target.style.backgroundColor = "#0891B2";
                              e.target.style.transform = "translateY(-1px)";
                              e.target.style.boxShadow = "0 2px 8px rgba(34, 184, 230, 0.3)";
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!copying) {
                              e.target.style.backgroundColor = "#22B8E6";
                              e.target.style.transform = "translateY(0)";
                              e.target.style.boxShadow = "none";
                            }
                          }}
                        >
                          {copying ? (
                            <>
                              <span
                                className="spinner"
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  border: "2px solid rgba(255,255,255,0.3)",
                                  borderTopColor: "white",
                                  borderRadius: "50%",
                                  animation: "spin 1s linear infinite",
                                  display: "inline-block",
                                }}
                              />
                              Copying...
                            </>
                          ) : (
                            <>
                              <FaCopy size={14} /> Copy Registration Link
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Right Column - College Admin Email */}
                    <div className="vcd-reg-col">
                      <div
                        className="vcd-reg-panel"
                        style={{
                          backgroundColor: "#F3F6F9",
                          border: "1px solid #DCE6EF",
                          borderRadius: "12px",
                          padding: "1.25rem",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#16A87915",
                                color: "#16A879",
                                flexShrink: 0,
                              }}
                            >
                              <FaEnvelope size={18} style={{ color: "#16A879" }} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0E3746" }}>
                                College Admin Email
                              </h3>
                              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                                Send notifications to college administrator
                              </p>
                            </div>
                          </div>
                          <div
                            className="vcd-url-box"
                            style={{
                              backgroundColor: "white",
                              border: "1px solid #DCE6EF",
                              borderRadius: "10px",
                              padding: "1rem",
                              marginBottom: "1rem",
                              minHeight: "64px",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}>
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#16A87915",
                                  color: "#16A879",
                                }}
                              >
                                <FaUserTie size={16} style={{ color: "#16A879" }} />
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                                  Recipient
                                </p>
                                <p style={{ margin: "0.125rem 0 0 0", fontSize: "0.875rem", fontWeight: 500, color: "#0E3746" }}>
                                  {college.adminEmail || "admin@college.edu"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEmailData({
                              subject: `Regarding ${college.name} - Smart College Management`,
                              message: "",
                            });
                            setShowEmailModal(true);
                          }}
                          style={{
                            width: "100%",
                            backgroundColor: "#16A879",
                            color: "white",
                            border: "none",
                            padding: "0.75rem 1rem",
                            borderRadius: "10px",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#138F6B";
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 2px 8px rgba(22, 168, 121, 0.3)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#16A879";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          <FaPaperPlane size={14} /> Send Email to College Admin
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Email Modal */}
      {showEmailModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setShowEmailModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h2
              style={{
                margin: "0 0 1.5rem 0",
                fontSize: "1.5rem",
                color: "#0f3a4a",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: "1.75rem" }}>📧</span>
              Send Email to College Admin
            </h2>

            <form onSubmit={handleSendEmail}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "#334155",
                    fontSize: "0.875rem",
                  }}
                >
                  To
                </label>
                <input
                  type="text"
                  value={college?.adminEmail || ""}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    backgroundColor: "#f8fafc",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "#334155",
                    fontSize: "0.875rem",
                  }}
                >
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) =>
                    setEmailData({ ...emailData, subject: e.target.value })
                  }
                  placeholder="Enter email subject"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                    color: "#334155",
                    fontSize: "0.875rem",
                  }}
                >
                  Message
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) =>
                    setEmailData({ ...emailData, message: e.target.value })
                  }
                  placeholder="Type your message here..."
                  required
                  rows="6"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#f1f5f9",
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    cursor: sendingEmail ? "not-allowed" : "pointer",
                    opacity: sendingEmail ? 0.6 : 1,
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!sendingEmail) {
                      e.target.style.backgroundColor = "#e2e8f0";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!sendingEmail) {
                      e.target.style.backgroundColor = "#f1f5f9";
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  style={{
                    padding: "0.75rem 2rem",
                    background: sendingEmail
                      ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                      : "linear-gradient(135deg, #047857, #10b981)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: sendingEmail ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s ease",
                    boxShadow: sendingEmail
                      ? "none"
                      : "0 4px 6px rgba(4, 120, 87, 0.3)",
                  }}
                  onMouseOver={(e) => {
                    if (!sendingEmail) {
                      e.target.style.background =
                        "linear-gradient(135deg, #065f46, #059669)";
                      e.target.style.boxShadow =
                        "0 6px 12px rgba(4, 120, 87, 0.4)";
                      e.target.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!sendingEmail) {
                      e.target.style.background =
                        "linear-gradient(135deg, #047857, #10b981)";
                      e.target.style.boxShadow =
                        "0 4px 6px rgba(4, 120, 87, 0.3)";
                      e.target.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {sendingEmail ? (
                    <>
                      <span
                        className="spinner"
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "white",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Sending...
                    </>
                  ) : (
                    <>📧 Send Email</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Enhanced InfoItem Component with Animations and Text Wrapping
const InfoItem = ({ icon, label, value, supportingText, iconColor }) => {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="info-item-container"
      style={{
        padding: "0.875rem",
        borderRadius: "12px",
        backgroundColor: "#F3F6F9",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #DCE6EF",
        overflow: "hidden",
        wordWrap: "break-word",
        overflowWrap: "break-word",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <small
          style={{
            display: "block",
            color: "#64748b",
            fontWeight: 500,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            lineHeight: 1.3,
          }}
        >
          {label}
        </small>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${iconColor}15`,
            color: iconColor,
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { size: 18, style: { color: iconColor } })}
        </div>
      </div>
      <div style={{ marginTop: "0.5rem" }}>
        <div
          className="info-item-value text-wrap-break"
          style={{
            fontWeight: 600,
            color: "#0E3746",
            fontSize: "1.125rem",
            lineHeight: "1.4",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            whiteSpace: "normal",
            maxWidth: "100%",
            marginBottom: "0.25rem",
          }}
        >
          {value || "N/A"}
        </div>
        {supportingText && (
          <small
            style={{
              display: "block",
              color: "#94A3B8",
              fontWeight: 400,
              fontSize: "0.75rem",
              lineHeight: 1.4,
            }}
          >
            {supportingText}
          </small>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced StatCard Component with Animations
const StatCard = ({ icon, label, value, iconColor }) => {
  return (
    <div
      style={{
        cursor: "default",
        height: "100%",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "14px",
          height: "100%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #DCE6EF",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "border-color 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = iconColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#DCE6EF";
        }}
      >
        <div
          style={{
            padding: "0.875rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0.375rem",
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "38px",
              minHeight: "38px",
              background: `${iconColor}15`,
              color: iconColor,
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, { size: 18, style: { color: iconColor } })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0rem" }}>
            <div
              style={{
                fontWeight: 700,
                color: "#0E3746",
                fontSize: "1.625rem",
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
            <small
              style={{
                color: "#64748b",
                fontWeight: 500,
                fontSize: "0.8125rem",
                lineHeight: 1.2,
              }}
            >
              {label}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};
