import { useContext, useEffect, useState, useRef } from "react";
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
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaSun,
} from "react-icons/fa";
import { motion } from "framer-motion";

/**
 * Format a Date as YYYY-MM-DD using LOCAL date parts (not toISOString which uses UTC).
 */
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Parse a YYYY-MM-DD string to a local Date object without timezone shift.
 */
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

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

  // Date range state for navigation
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: toLocalDateStr(monday),
      endDate: toLocalDateStr(sunday),
    };
  });
  const [scheduleSummary, setScheduleSummary] = useState(null);
  const [timetableId, setTimetableId] = useState(null);
  const hasLoadedRef = useRef(false);

  const MAX_RETRY = 3;

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH TIMETABLE ================= */
  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the teacher's weekly timetable to find the timetable ID
      const res = await api.get("/timetable/weekly");

      setTimetable(res.data.timetable || null);
      setWeekly(res.data.weekly || {});

      // Update date range from backend if available
      if (res.data.weekRange) {
        setDateRange({
          startDate: res.data.weekRange.start,
          endDate: res.data.weekRange.end,
        });
      }

      // Extract timetable ID from the weekly response slots
      const allSlots = Object.values(res.data.weekly || {}).flat();
      const firstSlotWithTimetable = allSlots.find((s) => s.timetable_id);
      if (firstSlotWithTimetable?.timetable_id?._id) {
        setTimetableId(firstSlotWithTimetable.timetable_id._id);
      }

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

  /* ================= FETCH SCHEDULE FOR DATE RANGE ================= */
  const fetchScheduleForDateRange = async (startDate, endDate) => {
    if (!timetableId) {
      // Fallback to regular weekly fetch
      await fetchTimetable();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/timetable/${timetableId}/schedule`, {
        params: { startDate, endDate },
      });

      const schedule = res.data?.data || [];

      if (schedule && schedule.length > 0) {
        // Convert schedule format to weekly format
        const weeklyData = {
          MON: [],
          TUE: [],
          WED: [],
          THU: [],
          FRI: [],
          SAT: [],
        };
        const todayStr = new Date().toISOString().split("T")[0];
        let todaySlotsList = [];

        schedule.forEach((daySchedule) => {
          if (daySchedule.slots && daySchedule.slots.length > 0) {
            const date = parseLocalDate(daySchedule.date);
            const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
            const dayName = days[date.getDay()];

            if (weeklyData[dayName]) {
              weeklyData[dayName].push(...daySchedule.slots);
            }

            if (daySchedule.date === todayStr) {
              todaySlotsList = daySchedule.slots;
            }
          }
        });

        setWeekly(weeklyData);

        // Compute schedule summary
        const totalSlots = Object.values(weeklyData).flat().length;
        const workingDays = schedule.filter((d) => d.isWorkingDay).length;
        const cancelledSlots = schedule.reduce(
          (acc, d) =>
            acc +
            (d.slots?.filter((s) => s.status === "CANCELLED")?.length || 0),
          0,
        );
        const extraClasses = schedule.reduce(
          (acc, d) =>
            acc + (d.slots?.filter((s) => s.status === "EXTRA")?.length || 0),
          0,
        );
        const holidays = schedule.filter((d) => !d.isWorkingDay).length;

        setScheduleSummary({
          totalScheduledSlots: totalSlots,
          workingDays,
          cancelledSlots,
          extraClasses,
          holidays,
        });
      } else {
        setWeekly({ MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [] });
        setScheduleSummary({
          totalScheduledSlots: 0,
          workingDays: 0,
          cancelledSlots: 0,
          extraClasses: 0,
          holidays: 0,
        });
      }

      setRetryCount(0);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load schedule. Please try again.";

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

  // Week navigation handlers
  const goToPreviousWeek = async () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() - 7);
    const newRange = {
      startDate: toLocalDateStr(start),
      endDate: toLocalDateStr(end),
    };
    setDateRange(newRange);
    await fetchScheduleForDateRange(newRange.startDate, newRange.endDate);
  };

  const goToNextWeek = async () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() + 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() + 7);
    const newRange = {
      startDate: toLocalDateStr(start),
      endDate: toLocalDateStr(end),
    };
    setDateRange(newRange);
    await fetchScheduleForDateRange(newRange.startDate, newRange.endDate);
  };

  const goToCurrentWeek = async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const newRange = {
      startDate: toLocalDateStr(monday),
      endDate: toLocalDateStr(sunday),
    };
    setDateRange(newRange);
    await fetchScheduleForDateRange(newRange.startDate, newRange.endDate);
  };

  useEffect(() => {
    // Prevent double-loading in React 18 Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    fetchTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        {/* Date Navigation */}
        <div
          className="px-4 py-3"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderTop: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="btn btn-sm btn-outline-primary"
                title="Previous Week"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={goToCurrentWeek}
                className="btn btn-sm btn-primary"
              >
                <FaCalendarAlt /> Current Week
              </button>
              <button
                onClick={goToNextWeek}
                className="btn btn-sm btn-outline-primary"
                title="Next Week"
              >
                <FaChevronRight />
              </button>
              <span className="text-muted fw-medium">
                {new Date(dateRange.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(dateRange.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaCheckCircle className="text-success" size={14} />
              <span className="text-muted small fw-medium">
                {totalSlots} Total Slots
              </span>
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

            // Skip days with no slots AND no holidays
            const hasHoliday = daySlots.some((s) => s.isHolidayOnly);
            if (daySlots.length === 0 && !hasHoliday) return null;

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
                      background: hasHoliday
                        ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
                        : BRAND_COLORS.primary.gradient,
                      color: "white",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="fw-bold mb-0">
                        {hasHoliday && "⚠️ "}
                        {DAY_NAMES[dayCode]}
                      </h6>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                          color: "white",
                          fontWeight: "600",
                        }}
                      >
                        {daySlots.filter((s) => !s.isHolidayOnly).length}{" "}
                        {daySlots.filter((s) => !s.isHolidayOnly).length === 1
                          ? "Slot"
                          : "Slots"}
                      </span>
                    </div>
                  </div>

                  {/* Slots List */}
                  <div className="card-body p-3">
                    <div className="d-flex flex-column gap-2">
                      {/* Holiday Placeholder */}
                      {daySlots
                        .filter((s) => s.isHolidayOnly)
                        .map((holiday, hIdx) => (
                          <div
                            key={`holiday-${hIdx}`}
                            className="p-3 rounded-3 text-center"
                            style={{
                              background: "#fee2e2",
                              border: "2px solid #fecaca",
                            }}
                          >
                            <FaExclamationTriangle
                              size={24}
                              className="text-danger mb-2"
                            />
                            <h6 className="fw-bold text-danger mb-1">
                              HOLIDAY
                            </h6>
                            <p className="small text-danger mb-0">
                              {holiday.exception?.reason ||
                                "No classes scheduled"}
                            </p>
                          </div>
                        ))}

                      {/* Regular/Exception Slots */}
                      {daySlots
                        .filter((s) => !s.isHolidayOnly)
                        .map((slot, slotIndex) => {
                          const slotTypeColors =
                            SLOT_TYPE_COLORS[slot.slotType || "LECTURE"] ||
                            SLOT_TYPE_COLORS.LECTURE;

                          // Check for exception status
                          const exception = slot.exception;
                          const isCancelled =
                            slot.status === "CANCELLED" ||
                            exception?.type === "CANCELLED";
                          const isExtra =
                            slot.status === "EXTRA" ||
                            exception?.type === "EXTRA";
                          const isRescheduled =
                            slot.status === "RESCHEDULED" ||
                            exception?.type === "RESCHEDULED";

                          // Update colors based on exception
                          let adjustedBg = slotTypeColors.bg;
                          let adjustedText = slotTypeColors.text;
                          let adjustedBorder = slotTypeColors.border;

                          if (isCancelled) {
                            adjustedBg = "#fee2e2";
                            adjustedText = "#dc2626";
                            adjustedBorder = "#fecaca";
                          } else if (isExtra) {
                            adjustedBg = "#dcfce7";
                            adjustedText = "#16a34a";
                            adjustedBorder = "#bbf7d0";
                          } else if (isRescheduled) {
                            adjustedBg = "#dbeafe";
                            adjustedText = "#2563eb";
                            adjustedBorder = "#bfdbfe";
                          }

                          return (
                            <motion.div
                              key={slot._id || slotIndex}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: slotIndex * 0.03 }}
                              className="border rounded-3 p-3 position-relative"
                              style={{
                                backgroundColor: adjustedBg,
                                borderColor: adjustedBorder,
                                borderLeftWidth: "4px",
                                opacity: isCancelled ? 0.7 : 1,
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
                              {/* Exception Badges */}
                              {(isCancelled || isExtra || isRescheduled) && (
                                <div className="mb-2">
                                  {isCancelled && (
                                    <span className="badge bg-danger me-1">
                                      <FaExclamationTriangle
                                        className="me-1"
                                        size={10}
                                      />
                                      CANCELLED
                                    </span>
                                  )}
                                  {isExtra && (
                                    <span className="badge bg-success me-1">
                                      <FaCheckCircle
                                        className="me-1"
                                        size={10}
                                      />
                                      EXTRA
                                    </span>
                                  )}
                                  {isRescheduled && (
                                    <span className="badge bg-primary me-1">
                                      <FaCalendarAlt
                                        className="me-1"
                                        size={10}
                                      />
                                      RESCHEDULED
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Subject */}
                              <div className="d-flex align-items-start gap-2 mb-2">
                                <FaBookOpen
                                  size={16}
                                  style={{
                                    color: adjustedText,
                                    marginTop: "3px",
                                    flexShrink: 0,
                                  }}
                                />
                                <div className="flex-grow-1">
                                  <h6
                                    className="fw-bold mb-1"
                                    style={{
                                      color: adjustedText,
                                      fontSize: "0.95rem",
                                      textDecoration: isCancelled
                                        ? "line-through"
                                        : "none",
                                      opacity: isCancelled ? 0.6 : 1,
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
                                        color: adjustedText,
                                        fontSize: "0.7rem",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {slot.subject_id.code}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Exception Reason */}
                              {exception?.reason && (
                                <div
                                  className={`small mb-2 p-2 rounded ${
                                    isCancelled
                                      ? "bg-danger bg-opacity-10 text-danger"
                                      : isExtra
                                        ? "bg-success bg-opacity-10 text-success"
                                        : "bg-primary bg-opacity-10 text-primary"
                                  }`}
                                >
                                  <FaInfoCircle className="me-1" size={10} />
                                  {exception.reason}
                                  {exception.rescheduledTo && (
                                    <span className="ms-1 fw-bold">
                                      →{" "}
                                      {new Date(
                                        exception.rescheduledTo,
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  )}
                                </div>
                              )}

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
                                      style={{ color: adjustedText }}
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
                                      style={{ color: adjustedText }}
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
                                      style={{ color: adjustedText }}
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
                                      backgroundColor: adjustedText,
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
