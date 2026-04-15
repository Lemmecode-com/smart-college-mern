import React, { useEffect, useState, useRef, useContext } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSun,
  FaBook,
  FaLayerGroup,
  FaArrowLeft,
  FaSyncAlt,
  FaGraduationCap,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Brand Color Palette
const BRAND_COLORS = {
  primary: "#1a4b6d",
  secondary: "#2d6f8f",
  accent: "#4fc3f7",
  success: "#28a745",
  warning: "#ffc107",
  danger: "#dc3545",
  slotTypes: {
    LECTURE: { bg: "#e3f2fd", text: "#1565c0", border: "#90caf9" },
    LAB: { bg: "#ffebee", text: "#c62828", border: "#ef9a9a" },
    TUTORIAL: { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" },
    PRACTICAL: { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8" },
  },
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// Day mapping constant (exported for reuse)
export const DAY_MAP = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Validation helper function
const validateTimetableSlot = (slot) => {
  if (!slot) return false;
  if (!slot.day || !slot.startTime || !slot.endTime) return false;
  if (!slot.subject_id?.name) return false;
  // Skip time validation for holiday slots (00:00-23:59)
  if (slot.status === "HOLIDAY") return true;
  if (slot.startTime >= slot.endTime) return false;
  return true;
};

// Helper function to format time in 12-hour format with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const TIME_SLOTS = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
];

/**
 * Convert 24-hour format to 12-hour AM/PM format
 */
const convertTo12Hour = (time24h) => {
  if (!time24h) return time24h;

  const [hours, minutes] = time24h.split(":");
  let h = parseInt(hours);
  const modifier = h >= 12 ? "PM" : "AM";

  h = h % 12;
  h = h ? h : 12;

  return `${h.toString().padStart(2, "0")}:${minutes} ${modifier}`;
};

/**
 * Format time range for display
 */
const formatTimeRange = (startTime, endTime) => {
  return `${convertTo12Hour(startTime)} - ${convertTo12Hour(endTime)}`;
};

/**
 * Format a Date as YYYY-MM-DD using LOCAL date parts (not toISOString which uses UTC).
 * This avoids off-by-one-day issues for timezones ahead of UTC (like IST).
 */
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Parse a YYYY-MM-DD string to a local Date object without timezone shift.
 * Using `new Date("2026-04-06")` interprets as UTC midnight, which shifts
 * the date for timezones ahead of UTC (like IST). This function avoids that.
 */
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d); // month is 0-indexed
};

export default function StudentTimetable() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [weekly, setWeekly] = useState({});
  const [todaySlots, setTodaySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); // Subtle loading for week nav
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toastShown, setToastShown] = useState({
    success: false,
    error: false,
  });
  const loadTimeoutRef = useRef(null);

  // Phase 1: Date range state for new schedule API
  const [scheduleData, setScheduleData] = useState(null);
  const [timetableId, setTimetableId] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    // Default to current week (Monday to Sunday) using LOCAL dates to avoid UTC shifts
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
  const [activePeriod, setActivePeriod] = useState({
    startDate: null,
    endDate: null,
  });
  const [isOutsideActiveRange, setIsOutsideActiveRange] = useState(false);

  // Security check
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  const isClient = typeof window !== "undefined";

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh timetable every 2 minutes to catch exception changes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Only auto-refresh if the page is visible (not in background tab)
      if (!document.hidden && hasLoadedRef.current) {
        loadTimetable(true); // Silent refresh
      }
    }, 120000); // 2 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Helper: Process old format slots (fallback when new API not available)
  const processOldFormatSlots = (slots) => {
    // Validate slots
    const validatedSlots = slots.filter(validateTimetableSlot);

    // Group by day
    const weeklyData = {};
    DAYS.forEach((day) => {
      weeklyData[day] = validatedSlots.filter((slot) => slot.day === day);
    });
    setWeekly(weeklyData);

    // Load today's slots
    const today = new Date();
    const currentDayAbbr = DAY_MAP[today.getDay()];
    setTodaySlots(weeklyData[currentDayAbbr] || []);

    setScheduleData(null);
    setScheduleSummary(null);
  };

  // Helper: Process new format schedule
  const processNewFormatSchedule = (schedule) => {
    // Convert new schedule format to existing weekly format
    const weeklyData = {};
    DAYS.forEach((day) => {
      weeklyData[day] = [];
    });

    let todaySlotsList = [];
    // Backend uses toISOString().split("T")[0] (UTC date), so we match that format
    // for comparison. This ensures today's slots match regardless of timezone.
    const todayStr = new Date().toISOString().split("T")[0];

    schedule.forEach((daySchedule) => {
      if (daySchedule.slots && daySchedule.slots.length > 0) {
        // Use parseLocalDate to get correct day-of-week for local timezone
        const date = parseLocalDate(daySchedule.date);
        const dayName = DAY_MAP[date.getDay()];

        if (weeklyData[dayName]) {
          // Add the date context AND day property to each slot
          const slotsWithDate = daySchedule.slots.map((slot) => ({
            ...slot,
            day: dayName, // CRITICAL: Set the day property for validation
            exceptionDate: daySchedule.date,
            isHolidayOnly: daySchedule.isHoliday || false,
          }));
          weeklyData[dayName].push(...slotsWithDate);
        }

        // Compare using backend's UTC date format (both sides use ISO string)
        if (daySchedule.date === todayStr) {
          todaySlotsList = daySchedule.slots.map((slot) => ({
            ...slot,
            day: dayName, // CRITICAL: Set the day property for today's slots too
            exceptionDate: daySchedule.date,
            isHolidayOnly: daySchedule.isHoliday || false,
          }));
        }
      }
    });

    // Validate slots
    const allWeeklySlots = Object.values(weeklyData).flat();
    const validatedSlots = allWeeklySlots.filter(validateTimetableSlot);

    // Update weekly data with validated slots
    DAYS.forEach((day) => {
      weeklyData[day] = validatedSlots.filter((slot) => slot.day === day);
    });

    // Validate today slots too
    todaySlotsList = todaySlotsList.filter(validateTimetableSlot);

    setWeekly(weeklyData);
    setTodaySlots(todaySlotsList);
  };

  // Load timetable function (Updated - uses date-wise schedule API)
  // @param {boolean} isNavLoad - If true, shows subtle overlay instead of full-screen loader
  const loadTimetable = async (isNavLoad = false) => {
    if (isNavLoad) {
      setIsNavigating(true);
    }
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set timeout for 30 seconds
    loadTimeoutRef.current = setTimeout(() => {
      setError(
        "Request timed out. Please check your connection and try again.",
      );
      setLoading(false);
      toast.error("Request timed out. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
    }, 30000);

    try {
      setLoading(true);
      setError(null);

      // First, fetch the student's timetable to get the timetable ID
      const timetableRes = await api.get("/timetable/student");
      // ApiResponse wraps as { success, message, data: { slots, count } }
      const responseData = timetableRes.data?.data || timetableRes.data || {};
      const allSlots = responseData.slots || responseData || [];

      if (!allSlots || allSlots.length === 0) {
        // No timetable available yet
        setWeekly({});
        setTodaySlots([]);
        setScheduleData(null);
        setTimetableId(null);
        setScheduleSummary(null);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        setLoading(false);
        return;
      }

      // Extract timetable ID
      const firstSlot = allSlots.find((s) => s.timetable_id);
      const tId =
        typeof firstSlot?.timetable_id === "object"
          ? firstSlot?.timetable_id?._id
          : firstSlot?.timetable_id;

      if (!tId) {
        // Fallback to old format if no timetable ID found
        processOldFormatSlots(allSlots);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        setLoading(false);
        return;
      }

      setTimetableId(tId);

      // Use the new date-wise schedule API
      const scheduleRes = await api.get(`/timetable/${tId}/schedule`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      // The API interceptor unwraps responses, so the data is already at the top level
      // Backend sends: { success: true, data: { timetable, schedule, summary } }
      // Interceptor transforms to: { timetable, schedule, summary, success, message }
      const scheduleData = scheduleRes.data || {};
      const schedule = scheduleData.schedule || [];
      const summary = scheduleData.summary || null;
      const timetableData = scheduleData.timetable || null;
      const responseMessage =
        scheduleData.message || scheduleRes.data?.message || "";

      // Extract active period from timetable data
      if (timetableData?.startDate && timetableData?.endDate) {
        setActivePeriod({
          startDate: timetableData.startDate,
          endDate: timetableData.endDate,
        });
      }

      // Only mark as outside active range if the backend explicitly says so
      const isOutsideActive = responseMessage.includes(
        "outside timetable active period",
      );

      // If timetable has no active dates set, don't restrict by date range
      const hasActivePeriod = !!(
        timetableData?.startDate && timetableData?.endDate
      );

      setIsOutsideActiveRange(hasActivePeriod && isOutsideActive);

      // Store timetable data and summary
      setScheduleData({ timetable: timetableData });
      setScheduleSummary(summary);

      if (hasActivePeriod && isOutsideActive) {
        // Date range is outside the timetable's active period - show banner but still display data
        // Fallback to old format so data still displays
        processOldFormatSlots(allSlots);
      } else if (schedule && schedule.length > 0) {
        // Process the new format schedule
        processNewFormatSchedule(schedule);
      } else {
        // No schedule data - fallback to old format (raw slots)
        processOldFormatSlots(allSlots);
      }

      // Clear timeout on success
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      // Show success toast
      if (!toastShown.success) {
        toast.success("Timetable loaded successfully!", {
          position: "top-right",
          autoClose: 3000,
          icon: <FaCheckCircle />,
        });
        setToastShown({ ...toastShown, success: true });
      }
    } catch (err) {
      // Clear timeout on error
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      const statusCode = err.response?.status;
      const errorMsg =
        err.response?.data?.message ||
        "Failed to load timetable. Please check your connection.";

      setError({ message: errorMsg, statusCode });

      if (!toastShown.error) {
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
        setToastShown({ ...toastShown, error: true });
      }
    } finally {
      setLoading(false);
      setIsNavigating(false);
    }
  };

  // Handle retry action
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await loadTimetable();
    setIsRetrying(false);
  };

  // Handle go back action
  const handleGoBack = () => {
    navigate("/student/dashboard");
  };

  // Phase 2: Week navigation handlers
  const isDateWithinActiveRange = (startDate, endDate) => {
    if (!activePeriod.startDate || !activePeriod.endDate) return true; // No active period set yet
    const activeStart = parseLocalDate(activePeriod.startDate);
    const activeEnd = parseLocalDate(activePeriod.endDate);
    const requestedStart = parseLocalDate(startDate);
    const requestedEnd = parseLocalDate(endDate);
    // Check if the requested week overlaps with the active period
    return requestedStart <= activeEnd && requestedEnd >= activeStart;
  };

  const goToPreviousWeek = () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() - 7);
    const newStartStr = toLocalDateStr(start);
    const newEndStr = toLocalDateStr(end);

    if (!isDateWithinActiveRange(newStartStr, newEndStr)) {
      toast.info("No timetable available for this week.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setDateRange({ startDate: newStartStr, endDate: newEndStr });
  };

  const goToNextWeek = () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() + 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() + 7);
    const newStartStr = toLocalDateStr(start);
    const newEndStr = toLocalDateStr(end);

    if (!isDateWithinActiveRange(newStartStr, newEndStr)) {
      toast.info("No timetable available for this week.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setDateRange({ startDate: newStartStr, endDate: newEndStr });
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setDateRange({
      startDate: toLocalDateStr(monday),
      endDate: toLocalDateStr(sunday),
    });
    // Reset toast so success shows
    setToastShown({ success: false, error: false });
  };

  const goToToday = () => {
    const todayStr = toLocalDateStr(new Date());
    setDateRange({ startDate: todayStr, endDate: todayStr });
    // Reset toast so success shows
    setToastShown({ success: false, error: false });
  };

  // Use a ref to track if timetable has been loaded
  const hasLoadedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Prevent double-loading in React 18 Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load once on mount

  // Separate effect for date range changes - re-fetches when user navigates weeks
  useEffect(() => {
    // Skip on first render (initial load is handled by the effect above)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (!hasLoadedRef.current) return; // Don't load if initial hasn't happened

    // Reset toast state when navigating to new week so success toast shows again
    setToastShown({ success: false, error: false });

    // Reload when date range changes (user navigates weeks)
    loadTimetable(true); // isNavLoad = true for subtle overlay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate]);

  // Get current day
  const today = new Date();
  const currentDayAbbr = DAY_MAP[today.getDay()];

  // Helper: Get the date for a specific day code within the current date range
  const getDateForDay = (dayCode) => {
    const dayIndex = DAYS.indexOf(dayCode);
    if (dayIndex === -1) return null;
    const [year, month, day] = dateRange.startDate.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day + dayIndex);
    return targetDate;
  };

  // Helper: Format date as DD/MM/YYYY
  const formatDateDDMMYYYY = (date) => {
    if (!date) return "";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const { timeRows: dynamicTimeRows, fullDayHolidays } = (() => {
    const timeSet = new Set();
    const fullDayHolidays = {}; // Track days with full-day holidays

    // First pass: Identify full-day holidays for each day
    DAYS.forEach((day) => {
      const daySlots = weekly[day] || [];
      const holidaySlot = daySlots.find(
        (s) =>
          s.status === "HOLIDAY" &&
          s.startTime === "00:00" &&
          s.endTime === "23:59",
      );
      if (holidaySlot) {
        fullDayHolidays[day] = holidaySlot;
      }
    });

    // Second pass: Collect all unique time ranges (excluding full-day holidays)
    Object.values(weekly).forEach((daySlots) => {
      daySlots.forEach((slot) => {
        if (slot.startTime && slot.endTime) {
          const timeKey = `${slot.startTime}-${slot.endTime}`;
          // Only add if it's not a full-day holiday time range
          if (timeKey !== "00:00-23:59") {
            timeSet.add(timeKey);
          }
        }
      });
    });

    // Generate sorted time rows
    const filteredTimeRows = Array.from(timeSet)
      .map((timeRange) => {
        const [start, end] = timeRange.split("-");
        return { start, end, key: timeRange };
      })
      .sort((a, b) => a.start.localeCompare(b.start));

    return { timeRows: filteredTimeRows, fullDayHolidays };
  })();

  // Get course info - Updated to use timetableId and scheduleData
  const renderFirstSlot =
    todaySlots.length > 0 ? todaySlots[0] : Object.values(weekly).flat()[0];
  const courseName =
    scheduleData?.timetable?.course_id?.name ||
    renderFirstSlot?.course_id?.name ||
    "";
  const semester =
    scheduleData?.timetable?.semester ||
    renderFirstSlot?.timetable_id?.semester ||
    "";
  const academicYear =
    scheduleData?.timetable?.academicYear ||
    renderFirstSlot?.timetable_id?.academicYear ||
    "";

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Your Timetable..." />;
  }

  return (
    <div className="st-container" role="main">
      <style>{componentStyles}</style>
      <ToastContainer position="top-right" theme="colored" />

      {/* Skip Link for Screen Readers */}
      <a href="#timetable-content" className="sr-only sr-only-focusable">
        Skip to timetable content
      </a>

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Dashboard", path: "/student/dashboard" },
          { label: "My Timetable" },
        ]}
      />

      {/* Header */}
      <motion.div
        variants={slideDownVariants}
        initial="hidden"
        animate="visible"
        className="st-header"
      >
        <div className="st-header-left">
          <div className="st-header-icon">
            <FaGraduationCap />
          </div>
          <div className="st-header-info">
            <h1 className="st-header-title">My Class Timetable</h1>
            <p className="st-header-subtitle">
              {courseName && (
                <>
                  <FaBook className="st-subtitle-icon" /> {courseName}
                  {semester && <span className="st-sep">•</span>}
                  {semester && <span>Sem {semester}</span>}
                  {academicYear && <span className="st-sep">•</span>}
                  {academicYear && <span>{academicYear}</span>}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="st-header-right">
          <div className="st-time-badge">
            <FaClock className="st-badge-icon" />
            <div className="st-badge-text">
              <span className="st-badge-label">Current Time</span>
              <span className="st-badge-value">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="st-refresh-btn"
          >
            <FaSyncAlt className={loading ? "st-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Phase 2: Date Navigation Bar */}
      <div className="st-date-nav">
        <div className="st-date-nav-left">
          <button
            onClick={goToPreviousWeek}
            className="st-nav-btn"
            title="Previous Week"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={goToCurrentWeek}
            className="st-nav-btn st-nav-today"
            title="Go to Current Week"
          >
            <FaCalendarAlt /> Current Week
          </button>
          <button
            onClick={goToNextWeek}
            className="st-nav-btn"
            title="Next Week"
          >
            <FaChevronRight />
          </button>
          <div className="st-date-range">
            <FaCalendarAlt className="st-date-icon" />
            <span>
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
        </div>
        <div className="st-date-nav-right">
          <button
            onClick={goToToday}
            className="st-nav-btn st-nav-today"
            title="View Today's Schedule"
          >
            <FaSun /> Today
          </button>
          <button
            onClick={() => window.location.reload()}
            className="st-nav-btn"
            title="Refresh"
          >
            <FaSyncAlt className={loading ? "st-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Outside Active Range Banner */}
      {isOutsideActiveRange && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="st-outside-range-banner"
          role="alert"
        >
          <FaExclamationTriangle
            className="st-banner-icon"
            aria-hidden="true"
          />
          <div className="st-banner-content">
            <strong>No Timetable for This Week</strong>
            <span>
              The selected week is outside your active timetable period.
              {activePeriod.startDate && activePeriod.endDate && (
                <>
                  {" "}
                  Your timetable is active from{" "}
                  {parseLocalDate(activePeriod.startDate).toLocaleDateString(
                    "en-US",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}{" "}
                  to{" "}
                  {parseLocalDate(activePeriod.endDate).toLocaleDateString(
                    "en-US",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                  .
                </>
              )}
            </span>
          </div>
          <button onClick={goToCurrentWeek} className="st-banner-btn">
            <FaCalendarAlt /> Go to Current Week
          </button>
        </motion.div>
      )}

      {/* Stats Bar - Phase 4: Updated with summary statistics */}
      <div className="st-stats-bar">
        <div className="st-stat">
          <div className="st-stat-icon st-stat-primary">
            <FaCalendarAlt />
          </div>
          <div className="st-stat-info">
            <span className="st-stat-value">
              {scheduleSummary?.totalScheduledSlots ||
                Object.values(weekly).flat().length}
            </span>
            <span className="st-stat-label">Classes This Week</span>
          </div>
        </div>
        <div className="st-stat">
          <div className="st-stat-icon st-stat-success">
            <FaSun />
          </div>
          <div className="st-stat-info">
            <span className="st-stat-value">{todaySlots.length}</span>
            <span className="st-stat-label">Today's Classes</span>
          </div>
        </div>
        <div className="st-stat">
          <div className="st-stat-icon st-stat-info">
            <FaClock />
          </div>
          <div className="st-stat-info">
            <span className="st-stat-value">
              {scheduleSummary?.workingDays ||
                DAYS.filter((day) => weekly[day]?.length > 0).length}
            </span>
            <span className="st-stat-label">Working Days</span>
          </div>
        </div>
        {/* Phase 4: New exception statistics */}
        {scheduleSummary && (
          <>
            {scheduleSummary.cancelledSlots > 0 && (
              <div className="st-stat">
                <div className="st-stat-icon st-stat-danger">
                  <FaExclamationTriangle />
                </div>
                <div className="st-stat-info">
                  <span className="st-stat-value">
                    {scheduleSummary.cancelledSlots}
                  </span>
                  <span className="st-stat-label">Cancelled</span>
                </div>
              </div>
            )}
            {scheduleSummary.extraClasses > 0 && (
              <div className="st-stat">
                <div className="st-stat-icon st-stat-success">
                  <FaCheckCircle />
                </div>
                <div className="st-stat-info">
                  <span className="st-stat-value">
                    {scheduleSummary.extraClasses}
                  </span>
                  <span className="st-stat-label">Extra Classes</span>
                </div>
              </div>
            )}
            {scheduleSummary.holidays > 0 && (
              <div className="st-stat">
                <div className="st-stat-icon st-stat-warning">
                  <FaCalendarAlt />
                </div>
                <div className="st-stat-info">
                  <span className="st-stat-value">
                    {scheduleSummary.holidays}
                  </span>
                  <span className="st-stat-label">Holidays</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="st-error-banner"
          role="alert"
          aria-live="assertive"
        >
          <FaExclamationTriangle className="st-error-icon" aria-hidden="true" />
          <span>{typeof error === "object" ? error.message : error}</span>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="st-error-close"
            aria-label="Retry loading timetable"
          >
            <FaSyncAlt /> {isRetrying ? "Loading..." : "Retry"}
          </button>
        </motion.div>
      )}

      {/* Today's Classes - Phase 4: Improved empty state */}
      {todaySlots.length === 0 ? (
        <motion.div
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className="st-section st-section-today"
        >
          <div className="st-empty-state">
            {scheduleSummary?.holidays > 0 ? (
              <>
                <FaCalendarAlt
                  className="st-empty-icon st-empty-icon-warning"
                  aria-hidden="true"
                />
                <h3>Holiday Today</h3>
                <p>Enjoy your holiday! No classes scheduled.</p>
              </>
            ) : scheduleSummary?.cancelledSlots > 0 ? (
              <>
                <FaExclamationTriangle
                  className="st-empty-icon st-empty-icon-danger"
                  aria-hidden="true"
                />
                <h3>All Classes Cancelled</h3>
                <p>
                  All classes for today have been cancelled. Check the weekly
                  schedule for updates.
                </p>
              </>
            ) : (
              <>
                <FaSun className="st-empty-icon" aria-hidden="true" />
                <h3>No Classes Today</h3>
                <p>Enjoy your free day or catch up on studies!</p>
                <button onClick={goToCurrentWeek} className="st-empty-cta-btn">
                  <FaCalendarAlt /> View Current Week
                </button>
              </>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className="st-section st-section-today"
        >
          <div className="st-section-header">
            <div className="st-section-title-wrapper">
              <FaSun
                className="st-section-icon st-sun-icon"
                aria-hidden="true"
              />
              <h2 id="todays-classes-heading">Today's Classes</h2>
            </div>
            <div
              className="st-section-badge"
              aria-label={`${todaySlots.length} classes today`}
            >
              <FaInfoCircle aria-hidden="true" />
              <span>
                {todaySlots.length === 1 &&
                todaySlots[0].status === "HOLIDAY" &&
                todaySlots[0].startTime === "00:00" &&
                todaySlots[0].endTime === "23:59"
                  ? "Full Day Holiday"
                  : `${todaySlots.length} ${
                      todaySlots.length === 1 ? "class" : "classes"
                    }`}
              </span>
            </div>
          </div>
          <div
            className="st-today-grid"
            aria-labelledby="todays-classes-heading"
          >
            {(() => {
              // Check if today is a full-day holiday
              const isFullDayHoliday =
                todaySlots.length === 1 &&
                todaySlots[0].status === "HOLIDAY" &&
                todaySlots[0].startTime === "00:00" &&
                todaySlots[0].endTime === "23:59";

              if (isFullDayHoliday) {
                // Render special full-day holiday card
                return <TodayHolidayCard slot={todaySlots[0]} index={0} />;
              }

              // Otherwise, render regular slot cards
              return todaySlots.map((slot, idx) => (
                <TodaySlotCard key={slot._id} slot={slot} index={idx} />
              ));
            })()}
          </div>
        </motion.div>
      )}

      {/* Weekly Timetable Table */}
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="st-section st-section-weekly"
        id="timetable-content"
        style={{ position: "relative" }}
      >
        {/* Subtle loading overlay during week navigation */}
        {isNavigating && (
          <div className="st-navigating-overlay">
            <FaSyncAlt className="st-navigating-spinner" />
            <span>Loading timetable...</span>
          </div>
        )}
        <div className="st-section-header">
          <div className="st-section-title-wrapper">
            <FaCalendarAlt className="st-section-icon" aria-hidden="true" />
            <h2 id="weekly-schedule-heading">Weekly Schedule</h2>
          </div>
          <div className="st-section-badge" aria-label="Full week view">
            <FaBook aria-hidden="true" />
            <span>Full Week View</span>
          </div>
        </div>
        <div
          className="st-table-container"
          role="region"
          aria-labelledby="weekly-schedule-heading"
          aria-label="Weekly timetable"
        >
          <table className="st-timetable-table" role="table">
            <thead>
              <tr>
                <th className="st-time-col-header" scope="col">
                  <FaClock aria-hidden="true" /> Time
                </th>
                {DAYS.map((day, idx) => {
                  const dayDate = getDateForDay(day);
                  const dateStr = formatDateDDMMYYYY(dayDate);
                  const isToday = day === currentDayAbbr;
                  return (
                    <th
                      key={day}
                      className={`st-day-col-header ${isToday ? "st-today-col" : ""}`}
                      scope="col"
                      aria-label={`${DAY_NAMES[idx]}${isToday ? " (Today)" : ""}`}
                    >
                      <div className="st-day-header-content">
                        <span className="st-day-name">{DAY_NAMES[idx]}</span>
                        {dateStr && (
                          <span className="st-day-date">
                            {dateStr}
                            {isToday && (
                              <span className="st-today-badge"> (Today)</span>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {dynamicTimeRows.length === 0 ? (
                <tr>
                  <td className="st-time-cell" colSpan={DAYS.length + 1}>
                    <div className="st-no-slots">
                      <FaCalendarAlt className="st-no-slots-icon" />
                      <span>No classes scheduled for this week</span>
                    </div>
                  </td>
                </tr>
              ) : (
                dynamicTimeRows.map((timeRow, rowIndex) => {
                  const timeStr = `${formatTime12Hour(timeRow.start)} - ${formatTime12Hour(timeRow.end)}`;
                  return (
                    <tr key={timeRow.key}>
                      <td className="st-time-cell" scope="row">
                        {timeStr}
                      </td>
                      {DAYS.map((day) => {
                        // Check if this day has a full-day holiday
                        const holidaySlot = fullDayHolidays[day];

                        if (holidaySlot) {
                          // Only render holiday card in the first row
                          if (rowIndex === 0) {
                            return (
                              <td
                                key={`${day}-${timeRow.key}`}
                                className="st-slot-cell"
                                rowSpan={dynamicTimeRows.length}
                                style={{ verticalAlign: "top" }}
                              >
                                <WeeklySlotCard slot={holidaySlot} />
                              </td>
                            );
                          } else {
                            // Skip this cell in subsequent rows (it's covered by rowSpan)
                            return null;
                          }
                        }

                        // Regular slot logic for non-holiday days
                        const slot = (weekly[day] || []).find(
                          (s) =>
                            s.startTime === timeRow.start &&
                            s.endTime === timeRow.end,
                        );
                        return (
                          <td
                            key={`${day}-${timeRow.key}`}
                            className="st-slot-cell"
                          >
                            {slot ? (
                              <WeeklySlotCard slot={slot} />
                            ) : (
                              <div
                                className="st-empty-cell"
                                aria-label="No class"
                              >
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

/* ================= TODAY'S SLOT CARD ================= */
function TodaySlotCard({ slot, index }) {
  // Phase 3: Check for exception status
  const exception = slot.exception;
  const isCancelled =
    slot.status === "CANCELLED" || exception?.type === "CANCELLED";
  const isExtra = slot.status === "EXTRA" || exception?.type === "EXTRA";
  const isRescheduled =
    slot.status === "RESCHEDULED" || exception?.type === "RESCHEDULED";
  const isHoliday = slot.status === "HOLIDAY";

  // Phase 3: Update colors based on exception
  let cardBorder =
    BRAND_COLORS.slotTypes[slot.slotType]?.text ||
    BRAND_COLORS.slotTypes.LECTURE.text;
  let bgColor =
    BRAND_COLORS.slotTypes[slot.slotType]?.bg ||
    BRAND_COLORS.slotTypes.LECTURE.bg;

  if (isCancelled) {
    cardBorder = "#dc3545";
    bgColor = "#fee2e2";
  } else if (isExtra) {
    cardBorder = "#28a745";
    bgColor = "#e8f5e9";
  } else if (isRescheduled) {
    cardBorder = "#007bff";
    bgColor = "#e3f2fd";
  } else if (isHoliday) {
    cardBorder = "#f59e0b";
    bgColor = "#fef3c7";
  }

  const slotType = {
    bg: bgColor,
    text: cardBorder,
    border: cardBorder,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="st-today-card"
      style={{
        borderLeft: `4px solid ${slotType.text}`,
        opacity: isCancelled ? 0.7 : 1,
      }}
    >
      <div className="st-today-card-header">
        <div className="st-today-time">
          <FaClock className="st-time-icon" />
          <span className="st-time-text">
            {formatTime12Hour(slot.startTime)} -{" "}
            {formatTime12Hour(slot.endTime)}
          </span>
        </div>
        <div className="st-badges">
          <span
            className="st-type-badge"
            style={{ backgroundColor: slotType.bg, color: slotType.text }}
          >
            <FaLayerGroup size={12} />
            {slot.slotType || "REGULAR"}
          </span>
          {/* Phase 3: Exception badges */}
          {isCancelled && (
            <span className="st-exception-badge st-cancelled">
              <FaExclamationTriangle size={10} />
              CANCELLED
            </span>
          )}
          {isExtra && (
            <span className="st-exception-badge st-extra">
              <FaCheckCircle size={10} />
              EXTRA
            </span>
          )}
          {isRescheduled && (
            <span className="st-exception-badge st-rescheduled">
              <FaCalendarAlt size={10} />
              RESCHEDULED
            </span>
          )}
          {isHoliday && (
            <span className="st-exception-badge st-holiday">
              <FaSun size={10} />
              HOLIDAY
            </span>
          )}
        </div>
      </div>
      <div className="st-today-card-body">
        <h4
          className="st-today-subject"
          style={{ opacity: isCancelled ? 0.6 : 1 }}
        >
          {slot.subject_id?.name}
        </h4>
        <div className="st-today-card-footer">
          <div className="st-today-detail">
            <FaChalkboardTeacher className="st-detail-icon" />
            <span>{slot.teacher_id?.name || "TBA"}</span>
          </div>
          {slot.room && (
            <div className="st-today-detail">
              <FaDoorOpen className="st-detail-icon" />
              <span>Room {slot.room}</span>
            </div>
          )}
        </div>
        {/* Phase 3: Exception reason display */}
        {exception?.reason && (
          <div
            className={`st-exception-reason st-${slot.status?.toLowerCase() || "info"}`}
          >
            <FaInfoCircle className="st-reason-icon" />
            <span>{exception.reason}</span>
            {exception.rescheduledTo && (
              <span className="st-rescheduled-info">
                →{" "}
                {new Date(exception.rescheduledTo).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================= TODAY HOLIDAY CARD ================= */
function TodayHolidayCard({ slot, index }) {
  const exception = slot.exception;
  const holidayReason = exception?.reason || slot.subject_id?.name || "Holiday";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="st-today-holiday-card"
    >
      {/* Holiday Banner */}
      <div className="st-holiday-banner">
        <div className="st-holiday-icon-wrapper">
          <FaSun className="st-holiday-main-icon" />
        </div>
        <div className="st-holiday-content">
          <h3 className="st-holiday-title">
            <FaCalendarAlt className="st-holiday-title-icon" />
            Full Day Holiday
          </h3>
          <p className="st-holiday-reason">
            <FaInfoCircle className="st-holiday-reason-icon" />
            {holidayReason}
          </p>
        </div>
      </div>

      {/* Holiday Details */}
      <div className="st-holiday-details">
        <div className="st-holiday-detail-item">
          <FaClock className="st-holiday-detail-icon" />
          <div>
            <span className="st-holiday-detail-label">Duration</span>
            <span className="st-holiday-detail-value">
              12:00 AM - 11:59 PM (Full Day)
            </span>
          </div>
        </div>
        {slot.teacher_id && (
          <div className="st-holiday-detail-item">
            <FaChalkboardTeacher className="st-holiday-detail-icon" />
            <div>
              <span className="st-holiday-detail-label">Contact</span>
              <span className="st-holiday-detail-value">
                {slot.teacher_id.name}
              </span>
            </div>
          </div>
        )}
        {exception?.approvedBy && (
          <div className="st-holiday-detail-item">
            <FaCheckCircle className="st-holiday-detail-icon" />
            <div>
              <span className="st-holiday-detail-label">Approved By</span>
              <span className="st-holiday-detail-value">
                {exception.approvedBy.name || "HOD"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Holiday Message */}
      <div className="st-holiday-message">
        <FaInfoCircle className="st-holiday-message-icon" />
        <span>
          Enjoy your holiday! No classes are scheduled for today. Use this time
          to rest and prepare for upcoming sessions.
        </span>
      </div>
    </motion.div>
  );
}

/* ================= WEEKLY SLOT CARD ================= */
function WeeklySlotCard({ slot }) {
  // Phase 3: Check for exception status
  const exception = slot.exception;
  const isCancelled =
    slot.status === "CANCELLED" || exception?.type === "CANCELLED";
  const isExtra = slot.status === "EXTRA" || exception?.type === "EXTRA";
  const isRescheduled =
    slot.status === "RESCHEDULED" || exception?.type === "RESCHEDULED";
  const isHoliday = slot.status === "HOLIDAY";

  // Phase 3: Update colors based on exception
  let cardBg =
    BRAND_COLORS.slotTypes[slot.slotType]?.bg ||
    BRAND_COLORS.slotTypes.LECTURE.bg;
  let cardBorder =
    BRAND_COLORS.slotTypes[slot.slotType]?.border ||
    BRAND_COLORS.slotTypes.LECTURE.border;
  let cardText =
    BRAND_COLORS.slotTypes[slot.slotType]?.text ||
    BRAND_COLORS.slotTypes.LECTURE.text;

  if (isCancelled) {
    cardBg = "#fee2e2";
    cardBorder = "#ef9a9a";
    cardText = "#c62828";
  } else if (isExtra) {
    cardBg = "#e8f5e9";
    cardBorder = "#a5d6a7";
    cardText = "#2e7d32";
  } else if (isRescheduled) {
    cardBg = "#e3f2fd";
    cardBorder = "#90caf9";
    cardText = "#1565c0";
  } else if (isHoliday) {
    cardBg = "#fef3c7";
    cardBorder = "#fcd34d";
    cardText = "#b45309";
  }

  return (
    <div
      className="st-weekly-slot"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        opacity: isCancelled ? 0.6 : 1,
        textDecoration: isCancelled ? "line-through" : "none",
      }}
    >
      <div className="st-weekly-slot-header">
        <div className="st-weekly-badges">
          <span className="st-weekly-type" style={{ color: cardText }}>
            {slot.slotType || "REGULAR"}
          </span>
          {/* Phase 3: Exception indicators */}
          {isCancelled && (
            <span className="st-weekly-exception st-cancelled">
              <FaExclamationTriangle size={8} />
            </span>
          )}
          {isExtra && (
            <span className="st-weekly-exception st-extra">
              <FaCheckCircle size={8} />
            </span>
          )}
          {isHoliday && (
            <span className="st-weekly-exception st-holiday">
              <FaSun size={8} />
            </span>
          )}
        </div>
      </div>
      <div
        className="st-weekly-slot-subject"
        style={{ opacity: isCancelled ? 0.5 : 1 }}
      >
        {slot.subject_id?.name}
      </div>
      <div className="st-weekly-slot-footer">
        <div className="st-weekly-detail">
          <FaChalkboardTeacher className="st-weekly-icon" />
          <span className="st-weekly-teacher">
            {slot.teacher_id?.name?.split(" ")[0]}
          </span>
        </div>
        {slot.room && (
          <div className="st-weekly-detail">
            <FaDoorOpen className="st-weekly-icon" />
            <span>{slot.room}</span>
          </div>
        )}
        {/* Phase 3: Exception reason tooltip */}
        {exception?.reason && (
          <div className="st-weekly-reason" title={exception.reason}>
            <FaInfoCircle size={8} />
            {exception.reason.length > 30
              ? exception.reason.substring(0, 30) + "..."
              : exception.reason}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= CSS STYLES ================= */
const componentStyles = `
  /* ================= CONTAINER ================= */
  .st-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
    padding: 1.5rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }

  /* ================= LOADING ================= */
  .st-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    gap: 1.5rem;
  }

  .st-loading-icon {
    font-size: 4rem;
    color: #1a4b6d;
  }

  .st-loading h3 {
    margin: 0;
    color: #1a4b6d;
    font-size: 1.5rem;
  }

  .st-loading p {
    margin: 0;
    color: #64748b;
  }

  /* ================= HEADER ================= */
  .st-header {
    background: linear-gradient(135deg, #1a4b6d 0%, #2d6f8f 100%);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.5rem;
    box-shadow: 0 10px 40px rgba(26, 75, 109, 0.3);
    color: white;
  }

  .st-header-left {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .st-header-icon {
    width: 64px;
    height: 64px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
  }

  .st-header-title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
  }

  .st-header-subtitle {
    margin: 0.5rem 0 0;
    opacity: 0.95;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.95rem;
  }

  .st-subtitle-icon {
    font-size: 0.9rem;
  }

  .st-sep {
    opacity: 0.6;
    margin: 0 0.25rem;
  }

  .st-header-right {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .st-time-badge {
    background: rgba(255, 255, 255, 0.15);
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    backdrop-filter: blur(10px);
  }

  .st-badge-icon {
    font-size: 1.5rem;
    opacity: 0.9;
  }

  .st-badge-text {
    display: flex;
    flex-direction: column;
  }

  .st-badge-label {
    font-size: 0.7rem;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .st-badge-value {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .st-refresh-btn {
    background: white;
    color: #1a4b6d;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
    font-size: 0.9rem;
  }

  .st-refresh-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
  }

  .st-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ================= DATE NAVIGATION ================= */
  .st-date-nav {
    background: white;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .st-date-nav-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .st-date-nav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .st-nav-btn {
    background: #f0f4f8;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #1a4b6d;
    transition: all 0.2s ease;
  }

  .st-nav-btn:hover {
    background: #e2e8f0;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .st-nav-btn:active {
    transform: translateY(0);
  }

  .st-nav-today {
    background: #1a4b6d;
    color: white;
  }

  .st-nav-today:hover {
    background: #2d6f8f;
  }

  .st-date-range {
    background: #e3f2fd;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #1565c0;
    font-size: 0.95rem;
  }

  .st-date-icon {
    font-size: 1.1rem;
  }

  /* ================= PHASE 3: EXCEPTION BADGES ================= */
  .st-badges {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .st-exception-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .st-exception-badge.st-cancelled {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .st-exception-badge.st-extra {
    background: #dcfce7;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  .st-exception-badge.st-rescheduled {
    background: #dbeafe;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .st-exception-badge.st-holiday {
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
  }

  .st-exception-reason {
    margin-top: 0.75rem;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    font-size: 0.85rem;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    line-height: 1.4;
  }

  .st-exception-reason.st-cancelled {
    background: #fee2e2;
    color: #991b1b;
    border-left: 3px solid #dc2626;
  }

  .st-exception-reason.st-extra {
    background: #dcfce7;
    color: #166534;
    border-left: 3px solid #16a34a;
  }

  .st-exception-reason.st-rescheduled {
    background: #dbeafe;
    color: #1e40af;
    border-left: 3px solid #2563eb;
  }

  .st-exception-reason.st-holiday {
    background: #fef3c7;
    color: #92400e;
    border-left: 3px solid #f59e0b;
  }

  .st-exception-reason.st-info {
    background: #f0f4f8;
    color: #475569;
    border-left: 3px solid #64748b;
  }

  .st-reason-icon {
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  .st-rescheduled-info {
    margin-left: 0.5rem;
    font-weight: 600;
    color: #2563eb;
  }

  /* Weekly slot badges */
  .st-weekly-badges {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    justify-content: flex-end;
  }

  .st-weekly-exception {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 0.7rem;
  }

  .st-weekly-exception.st-cancelled {
    background: #dc2626;
    color: white;
  }

  .st-weekly-exception.st-extra {
    background: #16a34a;
    color: white;
  }

  .st-weekly-exception.st-holiday {
    background: #f59e0b;
    color: white;
  }

  .st-weekly-reason {
    margin-top: 0.3rem;
    padding: 0.25rem 0.4rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    font-size: 0.6rem;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ================= STATS BAR ================= */
  .st-stats-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .st-stat {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .st-stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .st-stat-primary { background: #e3f2fd; color: #1976d2; }
  .st-stat-success { background: #e8f5e9; color: #388e3c; }
  .st-stat-info { background: #e0f7fa; color: #0097a7; }
  .st-stat-danger { background: #fee2e2; color: #dc2626; }
  .st-stat-warning { background: #fef3c7; color: #f59e0b; }

  .st-stat-info {
    display: flex;
    flex-direction: column;
    padding: 10px;
    border-radius: 12px;
  }

  .st-stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
  }

  .st-stat-label {
    font-size: 0.85rem;
    color: #64748b;
  }

  /* ================= ERROR BANNER ================= */
  .st-error-banner {
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 1rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .st-error-icon {
    font-size: 1.25rem;
  }

  .st-error-close {
    margin-left: auto;
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 1.5rem;
    padding: 0.25rem;
    line-height: 1;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  /* ================= OUTSIDE RANGE BANNER ================= */
  .st-outside-range-banner {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 1px solid #f59e0b;
    color: #92400e;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
  }

  .st-banner-icon {
    font-size: 1.5rem;
    color: #f59e0b;
    flex-shrink: 0;
  }

  .st-banner-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .st-banner-content strong {
    font-size: 1rem;
    font-weight: 700;
  }

  .st-banner-content span {
    font-size: 0.85rem;
    opacity: 0.9;
  }

  .st-banner-btn {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .st-banner-btn:hover {
    background: #d97706;
    transform: translateY(-1px);
  }

  /* ================= NAVIGATING OVERLAY ================= */
  .st-navigating-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    z-index: 10;
    border-radius: 16px;
    color: #1a4b6d;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .st-navigating-spinner {
    animation: st-spin 1s linear infinite;
    font-size: 1.25rem;
  }

  @keyframes st-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ================= EMPTY STATE ================= */
  .st-empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
  }

  .st-empty-icon {
    font-size: 4rem;
    color: #f59e0b;
    margin-bottom: 1rem;
    opacity: 0.8;
  }

  .st-empty-icon.st-empty-icon-warning {
    color: #f59e0b;
  }

  .st-empty-icon.st-empty-icon-danger {
    color: #dc2626;
  }

  .st-empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
    font-weight: 700;
    font-size: 1.5rem;
  }

  .st-empty-state p {
    margin: 0;
    color: #64748b;
    font-size: 1rem;
  }

  /* Phase 4: Empty state CTA button */
  .st-empty-cta-btn {
    margin-top: 1.5rem;
    background: #1a4b6d;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .st-empty-cta-btn:hover {
    background: #2d6f8f;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(26, 75, 109, 0.3);
  }

  /* ================= SCREEN READER ONLY ================= */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .sr-only-focusable:focus {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }

  /* ================= SECTIONS ================= */
  .st-section {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .st-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #f1f5f9;
  }

  .st-section-title-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .st-section-icon {
    font-size: 1.5rem;
    color: #1a4b6d;
  }

  .st-sun-icon {
    color: #f59e0b;
  }

  .st-section-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
  }

  .st-section-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    color: #64748b;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* ================= TODAY'S GRID ================= */
  .st-today-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .st-today-card {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 12px;
    padding: 1.25rem;
    transition: all 0.3s ease;
  }

  .st-today-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
  }

  .st-today-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px dashed #e2e8f0;
  }

  .st-today-time {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #1a4b6d;
  }

  .st-time-icon {
    color: #64748b;
  }

  .st-time-text {
    font-size: 0.95rem;
  }

  .st-type-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .st-today-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .st-today-subject {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.3;
  }

  .st-today-card-footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .st-today-detail {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #64748b;
  }

  .st-detail-icon {
    color: #1a4b6d;
    font-size: 0.9rem;
  }

  /* ================= WEEKLY TABLE ================= */
  .st-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .st-timetable-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1000px;
  }

  .st-timetable-table thead {
    background: linear-gradient(135deg, #1a4b6d, #2d6f8f);
    color: white;
  }

  .st-time-col-header {
    padding: 1rem;
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #0f3a4a;
    width: 140px;
    text-align: center;
  }

  .st-day-col-header {
    padding: 1rem;
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: 140px;
  }

  .st-day-header-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .st-day-name {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .st-day-date {
    font-size: 0.75rem;
    font-weight: 400;
    opacity: 0.85;
    text-transform: none;
    letter-spacing: 0;
  }

  .st-today-badge {
    font-size: 0.7rem;
    font-weight: 600;
    color: #4fc3f7;
    margin-left: 0.25rem;
  }

  .st-today-col {
    background: rgba(255, 255, 255, 0.15);
    position: relative;
  }

  .st-timetable-table tbody tr {
    border-bottom: 1px solid #e2e8f0;
    transition: background 0.3s ease;
  }

  .st-timetable-table tbody tr:hover {
    background: #f8fafc;
  }

  .st-time-cell {
    padding: 0.75rem;
    background: #f8fafc;
    font-weight: 600;
    font-size: 0.85rem;
    color: #1a4b6d;
    text-align: center;
    border: 1px solid #e2e8f0;
  }

  .st-slot-cell {
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    height: 140px;
  }

  .st-empty-cell {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #e2e8f0;
    font-size: 1.5rem;
  }

  .st-no-slots {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem 2rem;
    color: #94a3b8;
    font-size: 1.1rem;
  }

  .st-no-slots-icon {
    font-size: 2.5rem;
    opacity: 0.5;
  }

  /* ================= WEEKLY SLOT ================= */
  .st-weekly-slot {
    border-radius: 8px;
    padding: 0.4rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .st-weekly-slot:hover {
    transform: scale(1.03);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .st-weekly-slot-header {
    display: flex;
    justify-content: flex-end;
  }

  .st-weekly-type {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }

  .st-weekly-slot-subject {
    font-size: 0.7rem;
    font-weight: 700;
    color: #1a4b6d;
    line-height: 1.1;
    flex: 1;
    word-break: break-word;
    overflow: visible;
  }

  .st-weekly-slot-footer {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .st-weekly-detail {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .st-weekly-icon {
    color: #1a4b6d;
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  .st-weekly-teacher {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ================= RESPONSIVE ================= */
  @media (max-width: 768px) {
    .st-container {
      padding: 1rem;
    }

    .st-header {
      flex-direction: column;
      text-align: center;
    }

    .st-header-left {
      flex-direction: column;
      align-items: center;
    }

    .st-header-right {
      width: 100%;
      justify-content: center;
    }

    .st-header-title {
      font-size: 1.5rem;
    }

    /* Phase 2: Mobile responsive date navigation */
    .st-date-nav {
      flex-direction: column;
      align-items: stretch;
    }

    .st-date-nav-left {
      justify-content: center;
      flex-wrap: wrap;
    }

    .st-date-nav-right {
      justify-content: center;
      flex-wrap: wrap;
    }

    .st-nav-btn {
      font-size: 0.85rem;
      padding: 0.5rem 0.8rem;
    }

    .st-date-range {
      font-size: 0.85rem;
      padding: 0.5rem 0.8rem;
      width: 100%;
      justify-content: center;
    }

    .st-today-grid {
      grid-template-columns: 1fr;
    }

    .st-stats-bar {
      grid-template-columns: 1fr;
    }

    .st-section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }

  /* ================= TODAY HOLIDAY CARD ================= */
  .st-today-holiday-card {
    background: linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%);
    border: 2px solid #f59e0b;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15);
    transition: all 0.3s ease;
  }

  .st-today-holiday-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(245, 158, 11, 0.2);
  }

  .st-holiday-banner {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px dashed #fcd34d;
  }

  .st-holiday-icon-wrapper {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  .st-holiday-main-icon {
    font-size: 2rem;
    color: white;
  }

  .st-holiday-content {
    flex: 1;
  }

  .st-holiday-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #92400e;
  }

  .st-holiday-title-icon {
    font-size: 1.25rem;
    color: #f59e0b;
  }

  .st-holiday-reason {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.1rem;
    color: #b45309;
    font-weight: 500;
  }

  .st-holiday-reason-icon {
    color: #f59e0b;
    font-size: 1rem;
  }

  .st-holiday-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .st-holiday-detail-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.6);
    padding: 0.75rem 1rem;
    border-radius: 8px;
  }

  .st-holiday-detail-icon {
    font-size: 1.25rem;
    color: #f59e0b;
    flex-shrink: 0;
  }

  .st-holiday-detail-item > div {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .st-holiday-detail-label {
    font-size: 0.75rem;
    color: #92400e;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .st-holiday-detail-value {
    font-size: 0.95rem;
    color: #78350f;
    font-weight: 500;
  }

  .st-holiday-message {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.5);
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #f59e0b;
  }

  .st-holiday-message-icon {
    font-size: 1.25rem;
    color: #f59e0b;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .st-holiday-message span {
    font-size: 0.95rem;
    color: #78350f;
    line-height: 1.5;
  }

  /* Mobile responsive for holiday card */
  @media (max-width: 768px) {
    .st-holiday-banner {
      flex-direction: column;
      text-align: center;
    }

    .st-holiday-title {
      justify-content: center;
    }

    .st-holiday-reason {
      justify-content: center;
    }

    .st-holiday-details {
      grid-template-columns: 1fr;
    }
  }
`;
