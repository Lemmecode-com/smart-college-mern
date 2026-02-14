import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTrash,
  FaEye,
  FaArrowLeft,
  FaSyncAlt,
  FaExclamationTriangle,
  FaPlus,
  FaUniversity,
  FaLayerGroup,
  FaClock,
  FaInfoCircle,
  FaBell,
  FaEdit,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    dark: "#0f3a4a",
    light: "#2a6b8d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
    dark: "#218838",
    light: "#28a745",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
  },
  info: {
    main: "#17a2b8",
    dark: "#138496",
    light: "#17a2b8",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
  },
  warning: {
    main: "#ffc107",
    dark: "#e0a800",
    light: "#ffc107",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
  },
  danger: {
    main: "#dc3545",
    dark: "#c82333",
    light: "#dc3545",
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
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" },
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

const blinkVariants = {
  initial: { opacity: 1 },
  blink: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-5, 5, -5],
    transition: {
      duration: 2,
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

export default function TimetableList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const isTeacher = user?.role === "TEACHER";

  useEffect(() => {
    fetchTimetables();
  }, []);

  /* ================= FETCH ================= */
  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const res = await api.get("/timetable");
      setTimetables(res.data);
    } catch (err) {
      setError("Failed to load timetables. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PUBLISH ================= */
  const publishTimetable = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to publish this timetable? Students will be able to view it.",
      )
    )
      return;

    try {
      setPublishingId(id);
      await api.put(`/timetable/${id}/publish`);
      fetchTimetables();
    } catch {
      alert("Failed to publish timetable. Please try again.");
    } finally {
      setPublishingId(null);
    }
  };

  /* ================= DELETE ================= */
  const deleteTimetable = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this timetable? This action cannot be undone.",
      )
    )
      return;

    try {
      setDeletingId(id);
      await api.delete(`/timetable/${id}`);
      fetchTimetables();
    } catch {
      alert("Failed to delete timetable. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <motion.div
            variants={spinVariants}
            animate="animate"
            style={{
              marginBottom: "1.5rem",
              color: BRAND_COLORS.primary.main,
              fontSize: "4rem",
            }}
          >
            <FaSyncAlt />
          </motion.div>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: "1.5rem",
            }}
          >
            Loading Timetables...
          </h3>
          <p style={{ color: "#64748b", margin: 0 }}>
            Please wait while we fetch your timetable data
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        <div style={{ maxWidth: "100%", margin: "0 auto" }}>
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: "1.5rem",
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "0.75rem 1.5rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                style={{
                  color: "#64748b",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/teacher/dashboard")}
              >
                Dashboard
              </span>
              <span style={{ color: "#94a3b8" }}>›</span>
              <span
                style={{
                  color: BRAND_COLORS.primary.main,
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Timetables
              </span>
            </div>
          </motion.div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: "1.5rem",
              backgroundColor: "white",
              borderRadius: "1.5rem",
              overflow: "hidden",
              boxShadow: "0 10px 40px rgba(26, 75, 109, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1.75rem 2rem",
                background: BRAND_COLORS.primary.gradient,
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.5rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}
              >
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  style={{
                    width: "72px",
                    height: "72px",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    flexShrink: 0,
                    boxShadow: "0 8px 25px rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <FaCalendarAlt />
                </motion.div>
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "2rem",
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    Timetable Management
                  </h1>
                  <p
                    style={{
                      margin: "0.5rem 0 0 0",
                      opacity: 0.9,
                      fontSize: "1.1rem",
                    }}
                  >
                    Manage and publish academic schedules
                  </p>
                </div>
              </div>
              <div
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
              >
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 8px 20px rgba(26, 75, 109, 0.4)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/timetable/create")}
                  style={{
                    backgroundColor: "white",
                    color: BRAND_COLORS.primary.main,
                    border: "2px solid white",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <FaPlus /> Create New Timetable
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchTimetables}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s ease",
                  }}
                >
                  <FaSyncAlt /> Refresh
                </motion.button>
              </div>
            </div>

            {/* Stats Bar */}
            <div
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "2rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaCalendarAlt style={{ color: BRAND_COLORS.primary.main }} />
                  <span style={{ color: "#4a5568", fontWeight: 500 }}>
                    Total: <strong>{timetables.length}</strong> timetables
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaCheckCircle style={{ color: BRAND_COLORS.success.main }} />
                  <span style={{ color: "#4a5568", fontWeight: 500 }}>
                    Published:{" "}
                    <strong>
                      {
                        timetables.filter((t) => t.status === "PUBLISHED")
                          .length
                      }
                    </strong>
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaEdit style={{ color: BRAND_COLORS.warning.main }} />
                  <span style={{ color: "#4a5568", fontWeight: 500 }}>
                    Draft:{" "}
                    <strong>
                      {timetables.filter((t) => t.status === "DRAFT").length}
                    </strong>
                  </span>
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/teacher/dashboard")}
                  style={{
                    backgroundColor: "white",
                    color: BRAND_COLORS.primary.main,
                    border: "2px solid " + BRAND_COLORS.primary.main,
                    padding: "0.5rem 1.25rem",
                    borderRadius: "12px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s ease",
                  }}
                >
                  <FaArrowLeft /> Back to Dashboard
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ================= ERROR STATE ================= */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                borderRadius: "12px",
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `1px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <FaExclamationTriangle size={20} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* ================= TIMETABLES GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            {timetables.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {timetables.map((timetable, idx) => (
                  <TimetableCard
                    key={timetable._id}
                    timetable={timetable}
                    isTeacher={isTeacher}
                    onPublish={publishTimetable}
                    onDelete={deleteTimetable}
                    deletingId={deletingId}
                    publishingId={publishingId}
                    delay={idx * 0.05}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                onRefresh={fetchTimetables}
                onCreate={() => navigate("/timetable/create")}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= TIMETABLE CARD ================= */
function TimetableCard({
  timetable,
  isTeacher,
  onPublish,
  onDelete,
  deletingId,
  publishingId,
  delay = 0,
}) {
  const navigate = useNavigate();
  const getStatusColor = (status) => {
    switch (status) {
      case "PUBLISHED":
        return BRAND_COLORS.success;
      case "DRAFT":
        return BRAND_COLORS.warning;
      default:
        return BRAND_COLORS.secondary;
    }
  };

  const statusColor = getStatusColor(timetable.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15)" }}
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        transition: "all 0.3s ease",
        border: `1px solid ${statusColor.main}20`,
      }}
    >
      {/* Header with Status Badge */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
          borderBottom: "1px solid #eaeaea",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: "0.25rem",
            }}
          >
            {timetable.name}
          </h3>
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
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "#64748b",
                fontSize: "0.9rem",
              }}
            >
              <FaLayerGroup size={14} />
              Semester {timetable.semester}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "#64748b",
                fontSize: "0.9rem",
              }}
            >
              <FaClock size={14} />
              {timetable.academicYear}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "#64748b",
                fontSize: "0.9rem",
              }}
            >
              <FaUniversity size={14} />
              {timetable.department_id?.name || "N/A"}
            </span>
          </div>
        </div>
        <motion.span
          variants={blinkVariants}
          initial="initial"
          animate="blink"
          style={{
            padding: "0.375rem 0.875rem",
            borderRadius: "20px",
            backgroundColor: `${statusColor.main}15`,
            color: statusColor.main,
            fontWeight: 600,
            fontSize: "0.85rem",
            border: `1px solid ${statusColor.main}30`,
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          {timetable.status === "PUBLISHED" && <FaCheckCircle size={12} />}
          {timetable.status === "DRAFT" && <FaEdit size={12} />}
          {timetable.status}
        </motion.span>
      </div>

      {/* Body */}
      <div style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              padding: "1rem",
              borderRadius: "12px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <FaInfoCircle
                size={16}
                style={{ color: BRAND_COLORS.primary.main }}
              />
              <span
                style={{
                  fontWeight: 600,
                  color: "#1e293b",
                  fontSize: "0.95rem",
                }}
              >
                Timetable Details
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.75rem",
                fontSize: "0.9rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Course:</span>
                <div
                  style={{
                    fontWeight: 500,
                    color: "#1e293b",
                    marginTop: "0.25rem",
                  }}
                >
                  {timetable.course_id?.name || "N/A"}
                </div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Department:</span>
                <div
                  style={{
                    fontWeight: 500,
                    color: "#1e293b",
                    marginTop: "0.25rem",
                  }}
                >
                  {timetable.department_id?.name || "N/A"}
                </div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Created:</span>
                <div
                  style={{
                    fontWeight: 500,
                    color: "#1e293b",
                    marginTop: "0.25rem",
                  }}
                >
                  {new Date(timetable.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Updated:</span>
                <div
                  style={{
                    fontWeight: 500,
                    color: "#1e293b",
                    marginTop: "0.25rem",
                  }}
                >
                  {new Date(timetable.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/timetable/${timetable._id}/weekly`)}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "10px",
                border: "none",
                backgroundColor: BRAND_COLORS.primary.main,
                color: "white",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 10px rgba(26, 75, 109, 0.3)",
              }}
            >
              <FaEye /> View Weekly Schedule
            </motion.button>

            {isTeacher && timetable.status === "DRAFT" && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPublish(timetable._id)}
                  disabled={publishingId === timetable._id}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor:
                      publishingId === timetable._id
                        ? "#94a3b8"
                        : BRAND_COLORS.success.main,
                    color: "white",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor:
                      publishingId === timetable._id
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    transition: "all 0.3s ease",
                    boxShadow:
                      publishingId === timetable._id
                        ? "none"
                        : "0 4px 10px rgba(40, 167, 69, 0.3)",
                  }}
                >
                  {publishingId === timetable._id ? (
                    <>
                      <motion.div variants={spinVariants} animate="animate">
                        <FaSyncAlt size={14} />
                      </motion.div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Publish
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDelete(timetable._id)}
                  disabled={deletingId === timetable._id}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor:
                      deletingId === timetable._id
                        ? "#94a3b8"
                        : BRAND_COLORS.danger.main,
                    color: "white",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor:
                      deletingId === timetable._id ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                    boxShadow:
                      deletingId === timetable._id
                        ? "none"
                        : "0 4px 10px rgba(220, 53, 69, 0.3)",
                  }}
                >
                  {deletingId === timetable._id ? (
                    <motion.div variants={spinVariants} animate="animate">
                      <FaSyncAlt size={14} />
                    </motion.div>
                  ) : (
                    <FaTrash />
                  )}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ onRefresh, onCreate }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1.5rem",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
        padding: "3rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "5rem",
          marginBottom: "1.5rem",
          opacity: 0.6,
          color: "#e2e8f0",
        }}
      >
        <FaCalendarAlt />
      </div>
      <h3
        style={{
          margin: "0 0 0.75rem 0",
          color: "#1e293b",
          fontWeight: 700,
          fontSize: "1.75rem",
        }}
      >
        No Timetables Found
      </h3>
      <p
        style={{
          color: "#64748b",
          marginBottom: "2rem",
          fontSize: "1.05rem",
          maxWidth: "600px",
          margin: "0 auto 2rem",
        }}
      >
        You haven't created any timetables yet. Create your first timetable to
        start managing your academic schedule.
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreate}
          style={{
            backgroundColor: BRAND_COLORS.primary.main,
            color: "white",
            border: "none",
            padding: "0.875rem 2rem",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 15px rgba(26, 75, 109, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <FaPlus /> Create Timetable
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          style={{
            backgroundColor: "white",
            color: BRAND_COLORS.primary.main,
            border: `2px solid ${BRAND_COLORS.primary.main}`,
            padding: "0.875rem 2rem",
            borderRadius: "12px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.3s ease",
          }}
        >
          <FaSyncAlt /> Refresh
        </motion.button>
      </div>
    </div>
  );
}
