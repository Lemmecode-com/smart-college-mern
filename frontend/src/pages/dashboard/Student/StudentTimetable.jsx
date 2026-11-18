import React, { useEffect, useState, useRef, useContext, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
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
  FaSyncAlt,
  FaGraduationCap,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars -- used as motion.div in JSX
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PAGE_LOAD_TOAST_ID = "student-timetable-load";

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

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// Day mapping constant (exported for reuse)
// eslint-disable-next-line react-refresh/only-export-components
export const DAY_MAP = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const ALL_DAYS = DAYS;
const DAY_NAMES_FULL = DAY_NAMES;

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

const getCurrentWeekDateRange = () => {
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
  const [dateRange, setDateRange] = useState(() => {
    return getCurrentWeekDateRange();
  });
  const [activePeriod, setActivePeriod] = useState({
    startDate: null,
    endDate: null,
  });
  const [isOutsideActiveRange, setIsOutsideActiveRange] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Track load state across renders/effects (hooks must be unconditional)
  const hasLoadedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  const displayDays = ALL_DAYS;

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

  // Cleanup timeout and page-load toast on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      toast.dismiss(PAGE_LOAD_TOAST_ID);
    };
  }, []);

  // Helper: Process old format slots (fallback when new API not available)
  const processOldFormatSlots = (slots) => {
    // Validate slots
    const validatedSlots = slots.filter(validateTimetableSlot);

    // Group by day
    const weeklyData = {};
    ALL_DAYS.forEach((day) => {
      weeklyData[day] = validatedSlots.filter((slot) => slot.day === day);
    });
    setWeekly(weeklyData);

    // Load today's slots
    const today = new Date();
    const currentDayAbbr = DAY_MAP[today.getDay()];
    setTodaySlots(weeklyData[currentDayAbbr] || []);

    setScheduleData(null);
  };

  // Helper: Process new format schedule
  const processNewFormatSchedule = (schedule) => {
    // Convert new schedule format to existing weekly format
    const weeklyData = {};
    ALL_DAYS.forEach((day) => {
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
    ALL_DAYS.forEach((day) => {
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
      logger.warn("Student timetable request timed out", {
        page: "StudentTimetable",
        role: user?.role,
      });
      setError({
        message:
          "Request timed out. Please check your connection and try again.",
        statusCode: undefined,
        errorCode: undefined,
      });
      setLoading(false);
      if (!toastShown.error) {
        toast.error("Request timed out. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
        setToastShown({ ...toastShown, error: true });
      }
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
      const schedulePayload = scheduleRes.data || {};
      const schedule = schedulePayload.schedule || [];
      const timetableData = schedulePayload.timetable || null;
      const responseMessage =
        schedulePayload.message || scheduleRes.data?.message || "";

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

      // Store timetable data
      setScheduleData({ timetable: timetableData });

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
          toastId: PAGE_LOAD_TOAST_ID,
        });
        setToastShown({ ...toastShown, success: true });
      }
    } catch (err) {
      // Clear timeout on error
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;

      logger.error("Student timetable load error:", {
        statusCode,
        errorCode,
        backendMessage,
        page: "StudentTimetable",
        role: user?.role,
      });

      setError({
        message:
          "Failed to load timetable. Please check your connection and try again.",
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError && !toastShown.error) {
        toast.error("Failed to load timetable. Please try again.", {
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
  const goToPreviousWeek = () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() - 7);
    const newStartStr = toLocalDateStr(start);
    const newEndStr = toLocalDateStr(end);

    setDateRange({ startDate: newStartStr, endDate: newEndStr });
  };

  const goToNextWeek = () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() + 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() + 7);
    const newStartStr = toLocalDateStr(start);
    const newEndStr = toLocalDateStr(end);

    setDateRange({ startDate: newStartStr, endDate: newEndStr });
  };

  const goToCurrentWeek = () => {
    setDateRange(getCurrentWeekDateRange());
    // Reset toast so success shows
    setToastShown({ success: false, error: false });
  };

  const goToToday = () => {
    goToCurrentWeek();
    const todayCode = DAY_MAP[new Date().getDay()];
    if (todayCode) setSelectedDay(todayCode);
  };

  // Helper: Get the date for a specific day code within the current date range
  const getDateForDay = (dayCode) => {
    const dayIndex = displayDays.indexOf(dayCode);
    if (dayIndex === -1) return null;
    const [year, month, day] = dateRange.startDate.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day + dayIndex);
    return targetDate;
  };

  const isCurrentWeek = (() => {
    const current = getCurrentWeekDateRange();
    return (
      current.startDate === dateRange.startDate &&
      current.endDate === dateRange.endDate
    );
  })();

  // Keep selected day in sync with the viewed week and available data
  useEffect(() => {
    const days = ALL_DAYS;
    setSelectedDay((prev) => {
      if (prev && days.includes(prev)) return prev;
      if (isCurrentWeek) {
        const todayCode = DAY_MAP[new Date().getDay()];
        if (todayCode && days.includes(todayCode)) return todayCode;
      }
      const firstWithClasses = days.find((d) => (weekly[d] || []).length > 0);
      return firstWithClasses || days[0] || "MON";
    });
  }, [dateRange.startDate, dateRange.endDate, weekly]);

  const selectedDaySlots = useMemo(() => {
    if (!selectedDay) return [];
    const slots = [...(weekly[selectedDay] || [])];
    return slots.sort((a, b) => {
      const aStart = a.startTime || "99:99";
      const bStart = b.startTime || "99:99";
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      const aEnd = a.endTime || "99:99";
      const bEnd = b.endTime || "99:99";
      return aEnd.localeCompare(bEnd);
    });
  }, [weekly, selectedDay]);

  const totalWeekClasses = useMemo(
    () => ALL_DAYS.reduce((sum, day) => sum + (weekly[day]?.length || 0), 0),
    [weekly]
  );
  const workingDaysCount = useMemo(
    () => ALL_DAYS.filter((day) => (weekly[day]?.length || 0) > 0).length,
    [weekly]
  );
  const todayDayCode = DAY_MAP[new Date().getDay()];
  const isCurrentWeekRange = isCurrentWeek;
  const selectedDayDate = selectedDay ? getDateForDay(selectedDay) : null;
  const selectedDayLabel = selectedDayDate
    ? selectedDayDate.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : selectedDay || "";

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
  const division =
    scheduleData?.timetable?.division ||
    renderFirstSlot?.timetable_id?.division ||
    "";
  const yearLabel =
    scheduleData?.timetable?.yearLabel ||
    renderFirstSlot?.yearLabel ||
    "";

  // Security checks (after hooks to satisfy rules-of-hooks)
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/student/dashboard" />;

  // Loading State
  if (loading) {
    return (
      <div className="st-container" role="main">
        <style>{componentStyles}</style>
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/student/dashboard" },
            { label: "My Timetable" },
          ]}
        />
        <PageHeader
          icon={FaGraduationCap}
          title="My Class Timetable"
          actions={
            <>
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
                onClick={() => {
                  setToastShown({ success: false, error: false });
                  loadTimetable(true);
                }}
                style={{
                  minHeight: "48px",
                  padding: "0 20px",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(20, 27, 41, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <FaSyncAlt className={loading ? "st-spin" : ""} />
                <span>Refresh</span>
              </button>
            </>
          }
        />
        <div className="st-state-card">
          <Loading size="md" color="primary" text="Loading Your Timetable..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ApiError
        title="Timetable Loading Error"
        message={error.message}
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

{/* Page Header */}
<PageHeader
  icon={FaGraduationCap}
  title="My Class Timetable"
  subtitle={
    <>
      {courseName && (
        <>
          <FaBook className="st-subtitle-icon" /> {courseName}
          {yearLabel && <span className="st-sep">•</span>}
          {yearLabel && <span>{yearLabel}</span>}
          {semester && <span className="st-sep">•</span>}
          {semester && <span>Sem {semester}</span>}
          {division && <span className="st-sep">•</span>}
          {division && <span>Div {division}</span>}
          {academicYear && <span className="st-sep">•</span>}
          {academicYear && <span>{academicYear}</span>}
        </>
      )}
    </>
  }
  actions={
    <>
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
        onClick={() => {
          setToastShown({ success: false, error: false });
          loadTimetable(true);
        }}
        style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",       
                }}
                  onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(20, 27, 41, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}

      >
        <FaSyncAlt className={loading ? "st-spin" : ""} />
        <span>Refresh</span>
      </button>
    </>
  }
/>

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
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}{" "}
                  to{" "}
                  {parseLocalDate(activePeriod.endDate).toLocaleDateString(
                    "en-IN",
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

      {/* Summary KPI Cards */}
      <div className="st-kpi-grid">
        <div className="st-kpi-card">
          <div className="st-kpi-icon st-kpi-icon--week" aria-hidden="true">
            <FaCalendarAlt />
          </div>
          <div className="st-kpi-content">
            <div className="st-kpi-value">{totalWeekClasses}</div>
            <div className="st-kpi-label">Classes This Week</div>
          </div>
        </div>
        <div className="st-kpi-card">
          <div className="st-kpi-icon st-kpi-icon--today" aria-hidden="true">
            <FaSun />
          </div>
          <div className="st-kpi-content">
            <div className="st-kpi-value">{todaySlots.length}</div>
            <div className="st-kpi-label">Today&apos;s Classes</div>
          </div>
        </div>
        <div className="st-kpi-card">
          <div className="st-kpi-icon st-kpi-icon--days" aria-hidden="true">
            <FaClock />
          </div>
          <div className="st-kpi-content">
            <div className="st-kpi-value">{workingDaysCount}</div>
            <div className="st-kpi-label">Working Days</div>
          </div>
        </div>
      </div>

      {/* Weekly Planner */}
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="st-planner-card"
        style={{ position: "relative" }}
      >
        {isNavigating && (
          <div className="st-navigating-overlay">
            <FaSyncAlt className="st-navigating-spinner" />
            <span>Loading timetable...</span>
          </div>
        )}
        <div className="st-planner-header">
          <div className="st-planner-title-block">
            <h2 className="st-planner-title">
              <FaCalendarAlt aria-hidden="true" />
              <span>Weekly Planner</span>
            </h2>
            <div className="st-planner-range">
              {parseLocalDate(dateRange.startDate).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {parseLocalDate(dateRange.endDate).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="st-planner-nav">
            <button
              type="button"
              onClick={goToPreviousWeek}
              className="st-planner-nav-btn"
              title="Previous Week"
              aria-label="Previous week"
            >
              <FaChevronLeft />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="st-planner-today-btn"
              title="Today"
            >
              <FaSun aria-hidden="true" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={goToNextWeek}
              className="st-planner-nav-btn"
              title="Next Week"
              aria-label="Next week"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        <div className="st-day-selector" role="tablist" aria-label="Select day">
          {ALL_DAYS.map((day, idx) => {
            const dayDate = getDateForDay(day);
            const slots = weekly[day] || [];
            const hasClasses = slots.length > 0;
            const isSelected = selectedDay === day;
            const isToday = isCurrentWeekRange && day === todayDayCode;
            const dateLabel = dayDate
              ? dayDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : "";
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`st-day-card ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${hasClasses ? "has-classes" : ""}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="st-day-card-name">{DAY_NAMES_FULL[idx].slice(0, 3)}</span>
                <span className="st-day-card-date">{dateLabel}</span>
                <span className="st-day-card-count">{slots.length}</span>
                {hasClasses && <span className="st-day-card-dot" aria-hidden="true" />}
                {isToday && <span className="st-day-card-today">Today</span>}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Selected Day Schedule */}
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="st-schedule-card"
        id="timetable-content"
      >
        <div className="st-schedule-header">
          <div className="st-schedule-title-wrap">
            <h2 className="st-schedule-title">Selected Day Schedule</h2>
            <p className="st-schedule-subtitle">{selectedDayLabel}</p>
          </div>
          <div className="st-schedule-count">
            {selectedDaySlots.length} {selectedDaySlots.length === 1 ? "class" : "classes"}
          </div>
        </div>

        {totalWeekClasses === 0 && !isOutsideActiveRange ? (
          <div className="st-empty-state st-empty-state--week">
            <FaCalendarAlt className="st-empty-icon" aria-hidden="true" />
            <h3>No Classes This Week</h3>
            <p>There are no classes scheduled for the selected week. Try navigating to another week.</p>
          </div>
        ) : isOutsideActiveRange ? (
          <div className="st-empty-state st-empty-state--week">
            <FaExclamationTriangle className="st-empty-icon st-empty-icon-warning" aria-hidden="true" />
            <h3>No Timetable for This Week</h3>
            <p>Use &quot;Go to Current Week&quot; above or navigate to a week within the active timetable period.</p>
          </div>
        ) : selectedDaySlots.length === 0 ? (
          <div className="st-empty-state st-empty-state--day">
            <FaSun className="st-empty-icon" aria-hidden="true" />
            <h3>No Classes on This Day</h3>
            <p>There are no classes scheduled for {selectedDayLabel}. Select another day to view its schedule.</p>
          </div>
        ) : (
          <div className="st-day-timeline">
            {selectedDaySlots.map((slot, idx) => {
              const typeKey = (slot.slotType || "LECTURE").toUpperCase();
              const typeColors = BRAND_COLORS.slotTypes[typeKey] || BRAND_COLORS.slotTypes.LECTURE;
              const isCancelled = slot.status === "CANCELLED" || slot.exception?.type === "CANCELLED";
              const isExtra = slot.status === "EXTRA" || slot.exception?.type === "EXTRA";
              const isRescheduled = slot.status === "RESCHEDULED" || slot.exception?.type === "RESCHEDULED";
              const isHoliday = slot.status === "HOLIDAY" || slot.exception?.type === "HOLIDAY";
              const isFullDayHoliday = isHoliday && slot.startTime === "00:00" && slot.endTime === "23:59";

              if (isFullDayHoliday) {
                return (
                  <div key={slot._id || `holiday-${idx}`} className="st-timeline-item">
                    <div className="st-timeline-card st-timeline-card--holiday">
                      <TodayHolidayCard slot={slot} index={idx} />
                    </div>
                  </div>
                );
              }

              const courseLabel = slot.course_id?.name || slot.timetable_id?.course_id?.name || courseName || "";
              const semVal = slot.timetable_id?.semester || semester;
              const metaLine = [courseLabel, semVal ? `Semester ${semVal}` : "", slot.timetable_id?.division || division]
                .filter(Boolean)
                .join(" • ");

              return (
                <div key={slot._id || `${slot.subject_id?.name}-${slot.startTime}-${idx}`} className="st-timeline-item">
                  <div className={`st-timeline-card ${isCancelled ? "is-cancelled" : ""}`}>
                    <div className="st-timeline-card-top">
                      <div className="st-timeline-time">
                        <FaClock aria-hidden="true" />
                        <span>{formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}</span>
                      </div>
                      <div className="st-timeline-badges">
                        <span className="st-timeline-type" style={{ color: typeColors.text, background: typeColors.bg, borderColor: typeColors.border }}>
                          {slot.slotType || "LECTURE"}
                        </span>
                        {isCancelled && <span className="st-timeline-status st-timeline-status--cancelled">Cancelled</span>}
                        {isExtra && <span className="st-timeline-status st-timeline-status--extra">Extra</span>}
                        {isRescheduled && <span className="st-timeline-status st-timeline-status--rescheduled">Rescheduled</span>}
                      </div>
                    </div>
                    <h3 className="st-timeline-subject">{slot.subject_id?.name || slot.subject_id?.code || "Subject"}</h3>
                    {metaLine && <div className="st-timeline-meta">{metaLine}</div>}
                    <div className="st-timeline-details">
                      {slot.teacher_id?.name && (
                        <div className="st-timeline-detail">
                          <FaChalkboardTeacher aria-hidden="true" />
                          <span>{slot.teacher_id.name}</span>
                        </div>
                      )}
                      {slot.room && (
                        <div className="st-timeline-detail">
                          <FaDoorOpen aria-hidden="true" />
                          <span>{slot.room}</span>
                        </div>
                      )}
                      {slot.subject_id?.code && (
                        <div className="st-timeline-detail">
                          <FaBook aria-hidden="true" />
                          <span>{slot.subject_id.code}</span>
                        </div>
                      )}
                    </div>
                    {slot.exception?.reason && (
                      <div className={`st-timeline-reason st-timeline-reason--${String(slot.status || slot.exception?.type || "info").toLowerCase()}`}>
                        <FaInfoCircle aria-hidden="true" />
                        <span>{slot.exception.reason}</span>
                        {slot.exception.rescheduledTo && (
                          <span className="st-timeline-rescheduled-to">
                            → {new Date(slot.exception.rescheduledTo).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                {new Date(exception.rescheduledTo).toLocaleDateString("en-IN", {
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
      <div
        className="st-weekly-slot-time"
        style={{ opacity: isCancelled ? 0.5 : 1 }}
      >
        <FaClock className="st-weekly-icon" />
        <span>
          {formatTime12Hour(slot.startTime)} -{" "}
          {formatTime12Hour(slot.endTime)}
        </span>
      </div>
      <div className="st-weekly-slot-footer">
        <div className="st-weekly-detail">
          <FaChalkboardTeacher className="st-weekly-icon" />
          <span className="st-weekly-teacher">
            {slot.teacher_id?.name || "TBA"}
          </span>
        </div>
        {slot.room && (
          <div className="st-weekly-detail">
            <FaDoorOpen className="st-weekly-icon" />
            <span>Room {slot.room}</span>
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
  .st-container {
    min-height: 100vh;
    background: linear-gradient(180deg, #f1f5f9 0%, #e8eef5 100%);
    padding: 0.5rem 1.5rem 1.5rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }

  .st-spin { animation: st-spin 1s linear infinite; }
  @keyframes st-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .st-time-badge {
    background: rgba(255, 255, 255, 0.15);
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    backdrop-filter: blur(10px);
  }
  .st-badge-icon { font-size: 1.5rem; opacity: 0.9; }
  .st-badge-text { display: flex; flex-direction: column; }
  .st-badge-label { font-size: 0.7rem; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px; }
  .st-badge-value { font-size: 1.1rem; font-weight: 700; }
  .st-subtitle-icon { font-size: 0.9rem; }
  .st-sep { opacity: 0.6; margin: 0 0.25rem; }

  .st-state-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  }

  /* KPI cards */
  .st-kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .st-kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 1rem 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.9rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }
  .st-kpi-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
  }
  .st-kpi-icon--week { background: #e0f2fe; color: #0369a1; }
  .st-kpi-icon--today { background: #dcfce7; color: #15803d; }
  .st-kpi-icon--days { background: #e0e7ff; color: #4338ca; }
  .st-kpi-content { min-width: 0; }
  .st-kpi-value { font-size: 1.55rem; font-weight: 700; color: #0f172a; line-height: 1.1; }
  .st-kpi-label { font-size: 0.85rem; color: #64748b; font-weight: 500; margin-top: 0.15rem; }

  /* Outside range */
  .st-outside-range-banner {
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    padding: 0.9rem 1rem;
    border-radius: 12px;
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    margin-bottom: 1.25rem;
  }
  .st-banner-icon { font-size: 1.25rem; color: #d97706; flex-shrink: 0; margin-top: 0.1rem; }
  .st-banner-content { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.9rem; }
  .st-banner-content strong { color: #78350f; }
  .st-banner-btn {
    background: #d97706; color: #fff; border: none; padding: 0.5rem 0.85rem; border-radius: 8px;
    font-size: 0.82rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;
    flex-shrink: 0; white-space: nowrap;
  }

  /* Planner */
  .st-planner-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 1.15rem 1.25rem;
    margin-bottom: 1.25rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
  }
  .st-planner-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .st-planner-title-block { min-width: 0; }
  .st-planner-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .st-planner-title svg { color: #0e7490; }
  .st-planner-range { margin-top: 0.2rem; font-size: 0.85rem; color: #64748b; font-weight: 500; }
  .st-planner-nav { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .st-planner-nav-btn, .st-planner-today-btn {
    border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; border-radius: 10px;
    min-height: 38px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    gap: 0.4rem; font-size: 0.85rem; font-weight: 600; transition: all 0.15s ease;
  }
  .st-planner-nav-btn { width: 38px; padding: 0; }
  .st-planner-today-btn { padding: 0 0.85rem; color: #0f766e; background: #f0fdfa; border-color: #99f6e4; }
  .st-planner-nav-btn:hover, .st-planner-today-btn:hover { background: #e2e8f0; }
  .st-planner-today-btn:hover { background: #ccfbf1; }

  .st-day-selector {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.6rem;
  }
  .st-day-card {
    position: relative;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 12px;
    padding: 0.7rem 0.5rem 0.65rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 0;
  }
  .st-day-card:hover { border-color: #94a3b8; background: #ffffff; }
  .st-day-card.is-selected {
    background: linear-gradient(180deg, #0f766e 0%, #0e7490 100%);
    border-color: #0f766e;
    color: #ffffff;
    box-shadow: 0 6px 14px rgba(14, 116, 144, 0.25);
  }
  .st-day-card.is-today:not(.is-selected) { border-color: #5eead4; background: #f0fdfa; }
  .st-day-card-name { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #334155; }
  .st-day-card.is-selected .st-day-card-name { color: rgba(255,255,255,0.95); }
  .st-day-card-date { font-size: 0.74rem; color: #64748b; }
  .st-day-card.is-selected .st-day-card-date { color: rgba(255,255,255,0.88); }
  .st-day-card-count { font-size: 0.82rem; font-weight: 700; color: #0f172a; margin-top: 0.1rem; }
  .st-day-card.is-selected .st-day-card-count { color: #ffffff; }
  .st-day-card-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #0ea5e9; margin-top: 0.1rem;
  }
  .st-day-card.is-selected .st-day-card-dot { background: #ffffff; }
  .st-day-card-today {
    margin-top: 0.15rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
    color: #0f766e; background: #ccfbf1; padding: 0.1rem 0.35rem; border-radius: 999px;
  }
  .st-day-card.is-selected .st-day-card-today { color: #0f766e; background: #ffffff; }

  .st-navigating-overlay {
    position: absolute; inset: 0; background: rgba(255,255,255,0.72); backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center; gap: 0.6rem; z-index: 5;
    border-radius: 16px; color: #0f766e; font-weight: 600; font-size: 0.9rem;
  }
  .st-navigating-spinner { animation: st-spin 1s linear infinite; }

  /* Schedule */
  .st-schedule-card {
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.15rem 1.25rem;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
  }
  .st-schedule-header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
    margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px solid #e2e8f0;
  }
  .st-schedule-title { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
  .st-schedule-subtitle { margin: 0.2rem 0 0; font-size: 0.85rem; color: #64748b; }
  .st-schedule-count {
    background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 999px;
    padding: 0.3rem 0.65rem; font-size: 0.78rem; font-weight: 700; white-space: nowrap;
  }

  .st-day-timeline { display: flex; flex-direction: column; gap: 0.85rem; }
  .st-timeline-item { display: flex; align-items: stretch; }
  .st-timeline-card {
    flex: 1; min-width: 0; background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #38bdf8;
    border-radius: 12px; padding: 0.9rem 1rem;
  }
  .st-timeline-card.is-cancelled { opacity: 0.8; }
  .st-timeline-card--holiday { padding: 0.9rem 1rem; }
  .st-timeline-card--holiday .st-today-holiday-card { margin: 0; }
  .st-timeline-card-top {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.35rem; flex-wrap: wrap;
  }
  .st-timeline-time { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.84rem; font-weight: 700; color: #0f172a; }
  .st-timeline-time svg { color: #64748b; }
  .st-timeline-badges { display: inline-flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
  .st-timeline-type {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    padding: 0.2rem 0.45rem; border-radius: 999px; border: 1px solid #bfdbfe;
  }
  .st-timeline-status {
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.45rem; border-radius: 999px; border: 1px solid transparent;
  }
  .st-timeline-status--cancelled { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
  .st-timeline-status--extra { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
  .st-timeline-status--rescheduled { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
  .st-timeline-subject { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 700; color: #0f172a; line-height: 1.3; }
  .st-timeline-meta { margin-top: 0.2rem; font-size: 0.8rem; color: #64748b; }
  .st-timeline-details { margin-top: 0.55rem; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
  .st-timeline-detail { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; color: #334155; }
  .st-timeline-detail svg { color: #64748b; font-size: 0.78rem; }
  .st-timeline-reason {
    margin-top: 0.6rem; padding: 0.5rem 0.65rem; border-radius: 8px; font-size: 0.8rem;
    display: flex; align-items: flex-start; gap: 0.4rem; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;
  }
  .st-timeline-reason--cancelled { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .st-timeline-reason--extra { background: #ecfdf5; color: #166534; border-color: #bbf7d0; }
  .st-timeline-reason--rescheduled { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
  .st-timeline-reason--holiday { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .st-timeline-rescheduled-to { font-weight: 600; margin-left: 0.25rem; }

  /* Empty states */
  .st-empty-state { text-align: center; padding: 1.75rem 1rem; color: #64748b; }
  .st-empty-state--day { padding: 1.25rem 1rem; }
  .st-empty-state--week { padding: 1.5rem 1rem; }
  .st-empty-icon { font-size: 2.4rem; color: #0ea5e9; margin-bottom: 0.6rem; opacity: 0.85; }
  .st-empty-icon-warning { color: #d97706; }
  .st-empty-state h3 { margin: 0 0 0.3rem; color: #0f172a; font-size: 1.05rem; font-weight: 700; }
  .st-empty-state p { margin: 0 auto; max-width: 46ch; font-size: 0.88rem; line-height: 1.5; }

  /* Holiday card (reused) */
  .st-today-holiday-card {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border: 1px solid #fcd34d; border-radius: 12px; padding: 1.1rem;
  }
  .st-holiday-banner { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px dashed #fcd34d; }
  .st-holiday-icon-wrapper {
    width: 48px; height: 48px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .st-holiday-main-icon { font-size: 1.4rem; color: white; }
  .st-holiday-content { flex: 1; min-width: 0; }
  .st-holiday-title { display: flex; align-items: center; gap: 0.45rem; margin: 0 0 0.25rem; font-size: 1.05rem; font-weight: 700; color: #92400e; }
  .st-holiday-title-icon { color: #d97706; }
  .st-holiday-reason { display: flex; align-items: center; gap: 0.4rem; margin: 0; font-size: 0.9rem; color: #b45309; }
  .st-holiday-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.6rem; margin-bottom: 0.85rem; }
  .st-holiday-detail-item { display: flex; align-items: center; gap: 0.6rem; background: rgba(255,255,255,0.55); padding: 0.6rem 0.75rem; border-radius: 8px; }
  .st-holiday-detail-icon { color: #d97706; flex-shrink: 0; }
  .st-holiday-detail-item > div { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .st-holiday-detail-label { font-size: 0.68rem; color: #92400e; font-weight: 700; text-transform: uppercase; }
  .st-holiday-detail-value { font-size: 0.84rem; color: #78350f; font-weight: 500; }
  .st-holiday-message { display: flex; align-items: flex-start; gap: 0.6rem; background: rgba(255,255,255,0.5); padding: 0.75rem; border-radius: 8px; border-left: 3px solid #f59e0b; font-size: 0.85rem; color: #78350f; }
  .st-holiday-message-icon { color: #d97706; margin-top: 0.1rem; }

  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

  @media (max-width: 991.98px) {
    .st-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .st-day-selector { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  @media (max-width: 767.98px) {
    .st-container { padding: 0.5rem 0.75rem 1rem; }
    .st-kpi-grid { grid-template-columns: 1fr; }
    .st-planner-header, .st-schedule-header { flex-direction: column; align-items: stretch; }
    .st-planner-nav { width: 100%; justify-content: space-between; }
    .st-planner-today-btn { flex: 1; }
    .st-day-selector {
      display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 0.55rem;
      padding-bottom: 0.25rem; scroll-snap-type: x proximity;
    }
    .st-day-card { flex: 0 0 96px; scroll-snap-align: start; }
    .st-timeline-item { gap: 0.55rem; }
    .st-outside-range-banner { flex-direction: column; }
    .st-banner-btn { width: 100%; justify-content: center; }
  }
  @media (max-width: 479.98px) {
    .st-day-card { flex-basis: 88px; }
    .st-timeline-card { padding: 0.8rem 0.85rem; }
    .st-timeline-details { flex-direction: column; gap: 0.35rem; }
  }
`;
