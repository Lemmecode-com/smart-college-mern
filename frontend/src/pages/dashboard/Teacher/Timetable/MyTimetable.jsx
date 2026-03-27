import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ApiError from "../../../../components/ApiError";

import {
  FaCalendarAlt,
  FaClock,
  FaBookOpen,
  FaDoorOpen,
  FaUniversity,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaCheckCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";

// Brand Colors
const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
  },
  warning: {
    main: "#ffc107",
  },
};

// Day display names
const DAY_NAMES = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

// Slot type colors
const SLOT_TYPE_COLORS = {
  LECTURE: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  LAB: { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
  TUTORIAL: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
  PRACTICAL: { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
};

// Days array for iteration
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function MyTimetable() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState(null);
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const MAX_RETRY = 3;

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH TIMETABLE ================= */
  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/timetable/weekly");

      setTimetable(res.data.timetable || null);
      setWeekly(res.data.weekly || {});
      setRetryCount(0);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load timetable. Please try again.";

      setError({
        message: errorMsg,
        statusCode: err.response?.status,
      });

      if (retryCount < MAX_RETRY) {
        setRetryCount((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  /* ================= RETRY HANDLER ================= */
  const handleRetry = async () => {
    if (retryCount >= MAX_RETRY || isRetrying) return;
    setIsRetrying(true);
    await fetchTimetable();
    setIsRetrying(false);
  };

  const handleGoBack = () => {
    navigate("/teacher/dashboard");
  };

  /* ================= HELPER FUNCTIONS ================= */
  const getTotalSlots = () => {
    return Object.values(weekly).reduce(
      (acc, daySlots) => acc + daySlots.length,
      0,
    );
  };

  const formatTime12Hour = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <Loading
        fullScreen
        size="lg"
        text="Loading My Timetable..."
        color="primary"
      />
    );
  }

  /* ================= ERROR STATE ================= */
  if (error) {
    return (
      <ApiError
        title="Timetable Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={MAX_RETRY}
        isRetryLoading={isRetrying}
      />
    );
  }

  const totalSlots = getTotalSlots();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="container-fluid"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        padding: "1.5rem",
      }}
    >
      {/* ================= HEADER ================= */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-4 shadow-lg mb-4 overflow-hidden"
        style={{
          background: BRAND_COLORS.primary.gradient,
        }}
      >
        <div className="p-4 text-white">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "50%",
                  fontSize: "1.75rem",
                  boxShadow: "0 8px 25px rgba(255, 255, 255, 0.3)",
                }}
              >
                <FaCalendarAlt />
              </motion.div>
              <div>
                <h3 className="fw-bold mb-1">My Timetable</h3>
                <p className="mb-0 opacity-75">
                  Weekly lecture schedule assigned to you
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="px-3 py-2 rounded-3"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <div className="d-flex align-items-center gap-2 text-white">
                  <FaCheckCircle size={16} />
                  <span className="fw-semibold">{totalSlots} Total Slots</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div
          className="px-4 py-3"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderTop: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <div
            className="d-flex align-items-center gap-2"
            style={{ color: BRAND_COLORS.primary.main }}
          >
            <FaInfoCircle size={18} />
            <span className="fw-medium" style={{ fontSize: "0.9rem" }}>
              This timetable shows only your assigned lectures from published
              timetables
            </span>
          </div>
        </div>
      </motion.div>

      {/* ================= EMPTY STATE ================= */}
      {totalSlots === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card shadow-lg border-0 rounded-4 mb-4"
          style={{
            background: "white",
            padding: "3rem 2rem",
            textAlign: "center",
          }}
        >
          <div
            className="mb-3"
            style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 1.5rem",
              backgroundColor: "#f1f5f9",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaCalendarAlt size={40} style={{ color: "#94a3b8" }} />
          </div>
          <h4
            className="fw-bold mb-2"
            style={{ color: BRAND_COLORS.primary.main }}
          >
            No Timetable Assigned
          </h4>
          <p className="text-muted mb-3">
            You don't have any lecture slots assigned yet.
          </p>
          <p className="text-muted small">
            Once the HOD assigns lectures to you, they will appear here.
          </p>
        </motion.div>
      )}

      {/* ================= TIMETABLE BY DAY ================= */}
      {totalSlots > 0 && (
        <div className="row g-4">
          {DAYS.map((dayCode, index) => {
            const daySlots = weekly[dayCode] || [];
            if (daySlots.length === 0) return null;

            return (
              <motion.div
                key={dayCode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="col-12 col-lg-6 col-xl-4"
              >
                <div
                  className="card shadow-sm border-0 rounded-4 h-100"
                  style={{
                    background: "white",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 12px 35px rgba(26, 75, 109, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 15px rgba(0, 0, 0, 0.08)";
                  }}
                >
                  {/* Day Header */}
                  <div
                    className="px-3 py-2"
                    style={{
                      background: BRAND_COLORS.primary.gradient,
                      color: "white",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="fw-bold mb-0">{DAY_NAMES[dayCode]}</h6>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                          color: "white",
                          fontWeight: "600",
                        }}
                      >
                        {daySlots.length}{" "}
                        {daySlots.length === 1 ? "Slot" : "Slots"}
                      </span>
                    </div>
                  </div>

                  {/* Slots List */}
                  <div className="card-body p-3">
                    <div className="d-flex flex-column gap-2">
                      {daySlots.map((slot, slotIndex) => {
                        const slotTypeColors =
                          SLOT_TYPE_COLORS[slot.slotType || "LECTURE"] ||
                          SLOT_TYPE_COLORS.LECTURE;

                        return (
                          <motion.div
                            key={slot._id || slotIndex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: slotIndex * 0.03 }}
                            className="border rounded-3 p-3"
                            style={{
                              backgroundColor: slotTypeColors.bg,
                              borderColor: slotTypeColors.border,
                              borderLeftWidth: "4px",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scale(1.02)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(0, 0, 0, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            {/* Subject */}
                            <div className="d-flex align-items-start gap-2 mb-2">
                              <FaBookOpen
                                size={16}
                                style={{
                                  color: slotTypeColors.text,
                                  marginTop: "3px",
                                  flexShrink: 0,
                                }}
                              />
                              <div className="flex-grow-1">
                                <h6
                                  className="fw-bold mb-1"
                                  style={{
                                    color: slotTypeColors.text,
                                    fontSize: "0.95rem",
                                  }}
                                >
                                  {slot.subject_id?.name || "N/A"}
                                </h6>
                                {slot.subject_id?.code && (
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.7)",
                                      color: slotTypeColors.text,
                                      fontSize: "0.7rem",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {slot.subject_id.code}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="row g-2">
                              {/* Time */}
                              <div className="col-6">
                                <div
                                  className="d-flex align-items-center gap-1"
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#64748b",
                                  }}
                                >
                                  <FaClock
                                    size={12}
                                    style={{ color: BRAND_COLORS.primary.main }}
                                  />
                                  <span>
                                    {formatTime12Hour(slot.startTime)} -{" "}
                                    {formatTime12Hour(slot.endTime)}
                                  </span>
                                </div>
                              </div>

                              {/* Room */}
                              <div className="col-6">
                                <div
                                  className="d-flex align-items-center gap-1"
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#64748b",
                                  }}
                                >
                                  <FaDoorOpen
                                    size={12}
                                    style={{ color: BRAND_COLORS.primary.main }}
                                  />
                                  <span>{slot.room || "N/A"}</span>
                                </div>
                              </div>

                              {/* Course/Semester */}
                              <div className="col-6">
                                <div
                                  className="d-flex align-items-center gap-1"
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#64748b",
                                  }}
                                >
                                  <FaUniversity
                                    size={12}
                                    style={{ color: BRAND_COLORS.primary.main }}
                                  />
                                  <span>
                                    Sem {slot.timetable_id?.semester || "N/A"}
                                  </span>
                                </div>
                              </div>

                              {/* Type */}
                              <div className="col-6">
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: slotTypeColors.text,
                                    color: "white",
                                    fontSize: "0.7rem",
                                    fontWeight: "600",
                                    padding: "0.25rem 0.5rem",
                                  }}
                                >
                                  {slot.slotType || "LECTURE"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>{`
        .card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .badge {
          transition: all 0.2s ease;
        }

        @media (max-width: 768px) {
          .container-fluid {
            padding: 1rem;
          }
        }
      `}</style>
    </motion.div>
  );
}
