import React, { useEffect, useState, useContext } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import {
  FaUniversity,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaBook,
  FaClipboardList,
  FaArrowLeft,
  FaQrcode,
  FaSyncAlt,
  FaCheckCircle,
} from "react-icons/fa";
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
  const [error, setError] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copying, setCopying] = useState(false);

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

      /* Responsive card adjustments */
      @media (max-width: 768px) {
        .info-item-container {
          padding: 0.75rem !important;
        }
        .info-item-value {
          font-size: 0.875rem !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup - remove style on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fix registration URL to use frontend URL from env instead of backend URL
  const getFrontendRegistrationUrl = (url) => {
    if (!url) return "";
    const frontendUrl =
      import.meta.env.VITE_FRONTEND_URL || window.location.origin;
    // Replace backend URL with frontend URL from environment
    return url
      .replace(/https?:\/\/localhost:\d+/, frontendUrl)
      .replace(/https?:\/\/127\.0\.0\.1:\d+/, frontendUrl)
      .replace(/https?:\/\/[a-zA-Z0-9.-]+:\d+/, frontendUrl);
  };

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
      const res = await api.get(`/master/${id}`);
      setCollege(res.data.college);
      setStats(res.data.stats);
      // No success toast on page load - it's unnecessary
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to fetch college details",
        {
          position: "top-right",
          autoClose: 5000,
        },
      );
      setError(
        err?.response?.data?.message || "Failed to fetch college details",
      );
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
      toast.error(err?.response?.data?.message || "Failed to send email", {
        position: "top-right",
        autoClose: 5000,
      });
      setError(err?.response?.data?.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Loading state with animated spinner
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading college details..." />;
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: "3rem 0", textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: "inline-block",
            padding: "1rem 1.5rem",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            border: "2px solid #fecaca",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
          }}
        >
          <h5 style={{ margin: 0, fontWeight: 500 }}>{error}</h5>
        </motion.div>
        <motion.button
          whileHover={{
            scale: 1.05,
            boxShadow: "0 6px 15px rgba(15, 58, 74, 0.3)",
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(-1)}
          style={{
            background: "linear-gradient(135deg, #0f3a4a, #3db5e6)",
            color: "white",
            border: "none",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 4px 6px rgba(15, 58, 74, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <FaArrowLeft style={{ marginRight: "0.5rem" }} /> Go Back
        </motion.button>
      </div>
    );
  }

  if (!college) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
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
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
              marginBottom: "1.5rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  flexWrap: "wrap",
                  gap: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5rem",
                    flex: 1,
                  }}
                >
                  <motion.div
                    variants={pulseVariants}
                    initial="initial"
                    animate="pulse"
                    style={{
                      width: "72px",
                      height: "72px",
                      background: gradientColors["header-gradient"],
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 25px rgba(15, 58, 74, 0.4)",
                      flexShrink: 0,
                    }}
                  >
                    <FaUniversity size={32} style={{ color: "white" }} />
                  </motion.div>
                  <div style={{ flex: 1 }}>
                    <h1
                      style={{
                        margin: 0,
                        marginBottom: "0.25rem",
                        fontSize: "1.75rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        lineHeight: 1.2,
                      }}
                    >
                      {college.name}
                    </h1>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#0f3a4a",
                          padding: "0.5rem 1rem",
                          borderRadius: "9999px",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          border: "1px solid rgba(15, 58, 74, 0.2)",
                        }}
                      >
                        CODE: {college.code}
                      </span>
                      <span
                        style={{
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.875rem",
                        }}
                      >
                        <FaCalendarAlt style={{ marginRight: "0.25rem" }} />
                        Est. {college.establishedYear}
                      </span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{
                    x: -5,
                    boxShadow: "0 4px 15px rgba(15, 58, 74, 0.2)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(-1)}
                  style={{
                    background: "linear-gradient(135deg, #0f3a4a, #3db5e6)",
                    color: "white",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 6px rgba(15, 58, 74, 0.1)",
                  }}
                >
                  <FaArrowLeft /> Back to Colleges
                </motion.button>
              </div>
            </div>
          </motion.div>

          <div className="row g-4">
            {/* College Information Card */}
            <motion.div variants={itemVariants} className="col-12">
              <div
                className="card border-0 shadow-sm"
                style={{ borderRadius: "18px", overflow: "hidden" }}
              >
                <div
                  className="px-4 py-3"
                  style={{
                    background: "linear-gradient(to right, #e0f2fe, #f0f9ff)",
                    borderBottom: "1px solid #bae6fd",
                  }}
                >
                  <h2
                    className="mb-0 fw-bold"
                    style={{ fontSize: "1.25rem", color: "#0f3a4a" }}
                  >
                    <FaUniversity className="text-primary me-2" /> College
                    Information
                  </h2>
                </div>
                <div className="p-4">
                  <div className="row g-4">
                    <div className="col-12 col-sm-6 col-lg-3">
                      <InfoItem
                        icon={<FaEnvelope />}
                        label="Official Email"
                        value={college.email}
                        gradient={gradientColors["from-blue-400 to-cyan-400"]}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                      <InfoItem
                        icon={<FaPhone />}
                        label="Contact Number"
                        value={college.contactNumber}
                        gradient={
                          gradientColors["from-green-400 to-emerald-400"]
                        }
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                      <InfoItem
                        icon={<FaMapMarkerAlt />}
                        label="Address"
                        value={college.address}
                        gradient={
                          gradientColors["from-amber-400 to-orange-400"]
                        }
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                      <InfoItem
                        icon={<FaCalendarAlt />}
                        label="Established Year"
                        value={college.establishedYear?.toString() || "N/A"}
                        gradient={gradientColors["from-purple-400 to-pink-400"]}
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
                  className="card border-0 shadow-sm mb-4"
                  style={{ borderRadius: "18px", overflow: "hidden" }}
                >
                  <div
                    className="px-4 py-3"
                    style={{
                      background: "linear-gradient(to right, #f0f9ff, #ede9fe)",
                      borderBottom: "1px solid #bae6fd",
                    }}
                  >
                    <h2
                      className="mb-0 fw-bold"
                      style={{ fontSize: "1.25rem", color: "#0f3a4a" }}
                    >
                      <FaClipboardList className="text-indigo me-2" /> College
                      Statistics
                    </h2>
                  </div>
                  <div className="p-2">
                    <div className="row g-3">
                      <div className="col-6 col-md-4 col-lg-2">
                        <StatCard
                          icon={<FaLayerGroup />}
                          label="Departments"
                          value={stats.totalDepartments}
                          gradient={gradientColors["from-blue-500 to-cyan-400"]}
                          delay={0.1}
                        />
                      </div>
                      <div className="col-6 col-md-4 col-lg-2">
                        <StatCard
                          icon={<FaBook />}
                          label="Courses"
                          value={stats.totalCourses}
                          gradient={
                            gradientColors["from-indigo-500 to-purple-500"]
                          }
                          delay={0.2}
                        />
                      </div>
                      <div className="col-6 col-md-4 col-lg-2">
                        <StatCard
                          icon={<FaChalkboardTeacher />}
                          label="Teachers"
                          value={stats.totalTeachers}
                          gradient={
                            gradientColors["from-amber-500 to-orange-400"]
                          }
                          delay={0.3}
                        />
                      </div>
                      <div className="col-6 col-md-4 col-lg-2">
                        <StatCard
                          icon={<FaUsers />}
                          label="Total Students"
                          value={stats.totalStudents}
                          gradient={
                            gradientColors["from-green-500 to-emerald-400"]
                          }
                          delay={0.4}
                        />
                      </div>
                      <div className="col-6 col-md-4 col-lg-2">
                        <StatCard
                          icon={<FaCheckCircle />}
                          label="Approved Students"
                          value={stats.approvedStudents}
                          gradient={gradientColors["from-teal-500 to-cyan-500"]}
                          delay={0.5}
                        />
                      </div>
                      <div className="col-6 col-md-4 col-lg-2">
                        <StatCard
                          icon={<FaCalendarAlt />}
                          label="Active Timetables"
                          value={stats.totalTimetables}
                          gradient={gradientColors["from-pink-500 to-rose-400"]}
                          delay={0.6}
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
                  borderRadius: "18px",
                  boxShadow: "0 2px 15px rgba(0, 0, 0, 0.05)",
                  height: "100%",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    background: "linear-gradient(to right, #ecfdf5, #f0f9ff)",
                    borderBottom: "1px solid #bae6fd",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#0f3a4a",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FaQrcode style={{ color: "#0d9488" }} /> Registration
                    Portal
                  </h2>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                        color: "#334155",
                        fontSize: "0.875rem",
                      }}
                    >
                      Registration URL
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.25rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <input
                        type="text"
                        value={frontendRegistrationUrl}
                        readOnly
                        style={{
                          flex: 1,
                          padding: "0.75rem 1rem",
                          border: "1px solid #e2e8f0",
                          borderRadius: "0.75rem 0 0 0.75rem",
                          backgroundColor: "#f8fafc",
                          fontSize: "0.95rem",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={async () => {
                          setCopying(true);
                          try {
                            await navigator.clipboard.writeText(
                              frontendRegistrationUrl,
                            );
                            toast.success(
                              "Registration URL copied to clipboard!",
                              {
                                position: "top-right",
                                autoClose: 2000,
                              },
                            );
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
                          backgroundColor: copying ? "#9ca3af" : "#3b82f6",
                          color: "white",
                          border: "none",
                          padding: "0 1.5rem",
                          borderRadius: "0 0.75rem 0.75rem 0",
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          cursor: copying ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease",
                        }}
                        onMouseOver={(e) => {
                          if (!copying)
                            e.target.style.backgroundColor = "#2563eb";
                        }}
                        onMouseOut={(e) => {
                          if (!copying)
                            e.target.style.backgroundColor = "#3b82f6";
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
                                marginRight: "0.5rem",
                              }}
                            />
                            Copying...
                          </>
                        ) : (
                          "Copy"
                        )}
                      </button>
                    </div>
                    {/* <a
                      href={frontendRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                      }}
                    >
                      Open Registration Portal <span style={{ marginLeft: '0.25rem' }}>↗</span>
                    </a>

                    {/* Send Email to College Admin Button */}
                    <button
                      onClick={() => {
                        setEmailData({
                          subject: `Regarding ${college.name} - Smart College Management`,
                          message: "",
                        });
                        setShowEmailModal(true);
                      }}
                      style={{
                        display: "inline-block",
                        background: "linear-gradient(135deg, #047857, #10b981)",
                        color: "white",
                        textDecoration: "none",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "0.75rem",
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        border: "none",
                        marginLeft: "0.75rem",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 6px rgba(4, 120, 87, 0.3)",
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow =
                          "0 6px 12px rgba(4, 120, 87, 0.4)";
                        e.target.style.background =
                          "linear-gradient(135deg, #065f46, #059669)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow =
                          "0 4px 6px rgba(4, 120, 87, 0.3)";
                        e.target.style.background =
                          "linear-gradient(135deg, #047857, #10b981)";
                      }}
                    >
                      📧 Send Email to College Admin
                    </button>
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
                  value={college?.email}
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
const InfoItem = ({ icon, label, value, gradient }) => {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 10px 25px rgba(0,0,0,0.08)" }}
      transition={{ type: "spring", damping: 10 }}
      className="info-item-container h-100"
      style={{
        padding: "1rem",
        borderRadius: "16px",
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        border: "1px solid #eaeaea",
        height: "100%",
        overflow: "hidden",
        wordWrap: "break-word",
        overflowWrap: "break-word",
      }}
    >
      <div
        style={{
          marginRight: "1rem",
          padding: "0.75rem",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "48px",
          minHeight: "48px",
          background: gradient,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon, { size: 20, style: { color: "white" } })}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", width: "100%" }}>
        <small
          style={{
            display: "block",
            marginBottom: "0.25rem",
            color: "#64748b",
            fontWeight: 500,
            fontSize: "0.75rem",
          }}
        >
          {label}
        </small>
        <div
          className="info-item-value text-wrap-break"
          style={{
            fontWeight: 600,
            color: "#0f172a",
            fontSize: "0.95rem",
            lineHeight: "1.5",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            whiteSpace: "normal",
            maxWidth: "100%",
          }}
        >
          {value || "N/A"}
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced StatCard Component with Animations
const StatCard = ({ icon, label, value, gradient, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay || 0, type: "spring", damping: 15 }}
      whileHover={{ y: -8, boxShadow: "0 15px 35px rgba(0,0,0,0.12)" }}
      className="h-100"
      style={{
        padding: "0.5rem",
        cursor: "default",
        height: "100%",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          height: "100%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              marginRight: "1rem",
              padding: "0.75rem",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "48px",
              minHeight: "48px",
              background: gradient,
              boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, { size: 20, style: { color: "white" } })}
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                color: "#0f172a",
                fontSize: "1.5rem",
              }}
            >
              {value}
            </div>
            <small
              style={{
                color: "#64748b",
                fontWeight: 500,
                fontSize: "0.75rem",
              }}
            >
              {label}
            </small>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
