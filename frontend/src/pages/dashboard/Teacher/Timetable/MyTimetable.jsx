import { useContext, useEffect, useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ApiError from "../../../../components/ApiError";
import Breadcrumb from "../../../../components/Breadcrumb";
import PageHeader from "../../../../components/PageHeader";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  FaPlay,
  FaTimesCircle,
  FaSyncAlt,
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
  SUN: "Sunday", 
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

const WEEKDAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const groupScheduleByWeekday = (schedule, assignedTeacherId, startDate, endDate) => {
  const grouped = Object.fromEntries(WEEKDAY_CODES.map((day) => [day, []]));
  schedule.forEach((daySchedule) => {
    if (typeof daySchedule?.date !== "string" || !Array.isArray(daySchedule.slots)) return;
    const dateKey = daySchedule.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
    const date = parseLocalDate(dateKey);
    if (Number.isNaN(date.getTime()) || toLocalDateStr(date) !== dateKey) return;
    if (dateKey < startDate || dateKey > endDate) return;
    const dayCode = WEEKDAY_CODES[date.getDay()];
    daySchedule.slots.forEach((slot) => {
      if (!slot?._id) return;
      if (assignedTeacherId && !slot.isHolidayOnly) {
        const slotTeacherId = typeof slot.teacher_id === "string"
          ? slot.teacher_id
          : slot.teacher_id?._id;
        if (String(slotTeacherId || "") !== String(assignedTeacherId)) return;
      }
      grouped[dayCode].push(slot);
    });
  });
  return grouped;
};

const timeToMinutes = (time) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time || "");
  if (!match) return Number.POSITIVE_INFINITY;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : Number.POSITIVE_INFINITY;
};

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

export default function MyTimetable() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [weekly, setWeekly] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Date range state for navigation
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    return {
      startDate: toLocalDateStr(sunday),
      endDate: toLocalDateStr(saturday),
    };
  });
  const [scheduleSummary, setScheduleSummary] = useState(null);
  const [timetableId, setTimetableId] = useState(null);
  const [timetableIds, setTimetableIds] = useState([]);
  const [assignedTeacherId, setAssignedTeacherId] = useState(null);
  const [openSessions, setOpenSessions] = useState({});
  const [closedSessions, setClosedSessions] = useState({});
  const [creatingAttendance, setCreatingAttendance] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceConfirmModal, setAttendanceConfirmModal] = useState({
    isOpen: false,
    slot: null,
    timeSlot: null,
  });
  const hasLoadedRef = useRef(false);

  const MAX_RETRY = 3;

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/teacher/dashboard" />;

  /* ================= CURRENT TIME UPDATER ================= */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  /* ================= LOAD ATTENDANCE SESSIONS ================= */
  useEffect(() => {
    const loadAttendanceSessions = async () => {
      if (!timetableId) return;
      try {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const res = await api.get("/attendance/sessions", {
          params: { date: todayStr, limit: 100 },
        });
        const openMap = {};
        const closedMap = {};
        if (res.data.sessions) {
          res.data.sessions.forEach((session) => {
            const slotId =
              typeof session.slot_id === "object"
                ? session.slot_id._id
                : session.slot_id;
            if (session.status === "CLOSED") {
              closedMap[slotId] = session;
            } else {
              openMap[slotId] = session;
            }
          });
        }
        setOpenSessions(openMap);
        setClosedSessions(closedMap);
      } catch (err) {
        // Silently fail - use empty state
      }
    };

    if (user?.role === "TEACHER" && timetableId) {
      loadAttendanceSessions();
    }
  }, [timetableId, user?.role]);

  /* ================= ATTENDANCE HELPERS ================= */
  const DAY_MAP_JS = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };

  const getTodayDayAbbr = () => {
    return DAY_MAP_JS[new Date().getDay()];
  };

  const isTimeWithinSlot = (slot) => {
    if (!slot.startTime || !slot.endTime) return false;
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  const getAttendanceButtonState = (slot, dayCode) => {
    const isToday = dayCode === getTodayDayAbbr();
    const isPublished = slot.timetable_id?.status === "PUBLISHED";

    if (!isPublished) return "unpublished";
    if (!isToday) return "not_today";

    const exception = slot.exception;
    const isCancelled = slot.status === "CANCELLED" || exception?.type === "CANCELLED";
    const isHoliday = slot.status === "HOLIDAY" || exception?.type === "HOLIDAY";
    const isRescheduled = slot.status === "RESCHEDULED" || exception?.type === "RESCHEDULED";

    if (isCancelled) return "cancelled";
    if (isHoliday) return "holiday";
    if (isRescheduled) return "rescheduled";

    const [endH, endM] = slot.endTime.split(":").map(Number);
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const endMinutes = endH * 60 + endM;
    if (currentMinutes >= endMinutes) return "ended";

    if (!isTimeWithinSlot(slot)) return "upcoming";

    const slotId = slot._id;
    const hasOpenSession = !!openSessions[slotId] || slot.hasOpenSession;
    const hasClosedSession = !!closedSessions[slotId] || slot.hasClosedSession;

    if (hasOpenSession) return "completed";
    if (hasClosedSession) return "ended";

    return "start";
  };

  /* ================= FETCH TIMETABLE ================= */
  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/timetable/weekly");

      const weeklyData = res.data.weekly || {};
      const allSlots = Object.values(weeklyData).flat();
      const currentTimetableIds = [...new Set(allSlots
        .map((slot) => typeof slot.timetable_id === "string" ? slot.timetable_id : slot.timetable_id?._id)
        .filter(Boolean))];
      const firstAssignedSlot = allSlots.find((slot) => slot.timetable_id);
      if (currentTimetableIds.length > 0) {
        const currentTimetableId = currentTimetableIds[0];
        const currentTeacherId = typeof firstAssignedSlot.teacher_id === "string"
          ? firstAssignedSlot.teacher_id
          : firstAssignedSlot.teacher_id?._id;
        setTimetableId(currentTimetableId);
        setTimetableIds(currentTimetableIds);
        setAssignedTeacherId(currentTeacherId || null);
        await fetchScheduleForDateRange(
          dateRange.startDate,
          dateRange.endDate,
          { timetableIds: currentTimetableIds, teacherId: currentTeacherId },
        );
      } else {
        setWeekly(Object.fromEntries(WEEKDAY_CODES.map((day) => [day, []])));
        setTimetableId(null);
        setTimetableIds([]);
        setAssignedTeacherId(null);
        setScheduleSummary(null);
        setRetryCount(0);
      }

    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load timetable. Please try again.";

      setError({
        message: errorMsg,
        statusCode: err.response?.status,
        errorCode: err.response?.data?.code,
      });

      if (retryCount < MAX_RETRY) {
        setRetryCount((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduleForDateRange = async (startDate, endDate, timetableInfo = null) => {
    try {
      setLoading(true);
      setError(null);

      let currentTimetableIds = timetableInfo?.timetableIds || timetableIds;
      let currentTimetableId = timetableInfo?.timetableId || currentTimetableIds[0] || timetableId;
      let currentTeacherId = timetableInfo?.teacherId || assignedTeacherId;

      if (currentTimetableIds.length === 0 && !currentTimetableId) {
        const weeklyRes = await api.get("/timetable/weekly");
        const weeklyData = weeklyRes.data.weekly || {};
        const allSlots = Object.values(weeklyData).flat();
        currentTimetableIds = [...new Set(allSlots
          .map((slot) => typeof slot.timetable_id === "string" ? slot.timetable_id : slot.timetable_id?._id)
          .filter(Boolean))];
        const firstAssignedSlot = allSlots.find((slot) => slot.timetable_id);
        if (currentTimetableIds.length > 0) {
          currentTimetableId = currentTimetableIds[0];
          currentTeacherId = typeof firstAssignedSlot.teacher_id === "string"
            ? firstAssignedSlot.teacher_id
            : firstAssignedSlot.teacher_id?._id;
          setTimetableId(currentTimetableId);
          setTimetableIds(currentTimetableIds);
          setAssignedTeacherId(currentTeacherId || null);
        }
      }

      if (currentTimetableIds.length === 0 && !currentTimetableId) {
        setWeekly(Object.fromEntries(WEEKDAY_CODES.map((day) => [day, []])));
        setTimetableId(null);
        setTimetableIds([]);
        setAssignedTeacherId(null);
        setScheduleSummary({
          totalScheduledSlots: 0,
          workingDays: 0,
          cancelledSlots: 0,
          extraClasses: 0,
          holidays: 0,
        });
        setRetryCount(0);
        return;
      }

      if (currentTimetableIds.length === 0) currentTimetableIds = [currentTimetableId];
      const responses = await Promise.all(currentTimetableIds.map((id) =>
        api.get(`/timetable/${id}/schedule`, { params: { startDate, endDate } })
      ));
      const scheduleData = responses.map((response) => response.data);
      const schedule = scheduleData.flatMap((data) => (data?.schedule || []).map((day) => ({
        ...day,
        slots: (day.slots || []).map((slot) => ({
          ...slot,
          timetable_id: slot.timetable_id?.status ? slot.timetable_id : data.timetable,
        })),
      })));
      const selectedWeek = groupScheduleByWeekday(schedule, currentTeacherId, startDate, endDate);
      setWeekly(selectedWeek);
      setScheduleSummary({
        timetable: scheduleData[0]?.timetable,
        timetables: scheduleData.map((data) => data?.timetable).filter(Boolean),
      });

      setRetryCount(0);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load schedule. Please try again.";

      setError({
        message: errorMsg,
        statusCode: err.response?.status,
        errorCode: err.response?.data?.code,
      });

      if (retryCount < MAX_RETRY) {
        setRetryCount((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = async () => {
    const start = parseLocalDate(dateRange.startDate);
    start.setDate(start.getDate() - 7);
    const end = parseLocalDate(dateRange.endDate);
    end.setDate(end.getDate() - 7);
    const newRange = {
      startDate: toLocalDateStr(start),
      endDate: toLocalDateStr(end),
    };
    setDateRange(newRange);
    await fetchScheduleForDateRange(newRange.startDate, newRange.endDate);
  };

  const goToNextWeek = async () => {
    const start = parseLocalDate(dateRange.startDate);
    start.setDate(start.getDate() + 7);
    const end = parseLocalDate(dateRange.endDate);
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
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const newRange = { startDate: toLocalDateStr(sunday), endDate: toLocalDateStr(saturday) };
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

  /* ================= ATTENDANCE HANDLERS ================= */
  const openAttendanceConfirm = (slot, dayCode) => {
    const today = new Date();
    const currentDayAbbr = DAY_MAP_JS[today.getDay()];

    if (slot.day !== currentDayAbbr) {
      toast.error("Attendance can only be started for today's lectures.", {
        position: "top-right",
        autoClose: 4000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    setAttendanceConfirmModal({
      isOpen: true,
      slot,
      timeSlot: `${slot.startTime} - ${slot.endTime}`,
    });
  };

  const createAttendanceSession = async () => {
    const { slot } = attendanceConfirmModal;
    if (!slot) return;

    setCreatingAttendance(slot._id);
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const res = await api.post("/attendance/sessions", {
        slot_id: slot._id,
        lectureDate: todayDate,
        lectureNumber: 1,
      });

      const newSession = res.data.session;
      const slotId = slot._id;

      setOpenSessions((prev) => ({ ...prev, [slotId]: newSession }));

      toast.success("Attendance session started! Redirecting...", {
        position: "top-right",
        autoClose: 2000,
        icon: <FaCheckCircle />,
      });

      setAttendanceConfirmModal({ isOpen: false, slot: null, timeSlot: null });

      setTimeout(() => {
        navigate(`/attendance/session/${newSession._id}`);
      }, 1500);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to create attendance session. Please try again.";
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const isAuthError =
        statusCode === 401 ||
        (errorCode && AUTH_ERROR_CODES.has(errorCode));
      if (!isAuthError) {
        toast.error(message, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
      }

      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("exists") ||
        message.toLowerCase().includes("duplicate")
      ) {
        const slotId = slot._id;
        setOpenSessions((prev) => ({
          ...prev,
          [slotId]: { _id: "existing", status: "active" },
        }));
        setClosedSessions((prev) => ({
          ...prev,
          [slotId]: { _id: "existing", status: "active" },
        }));
      }

      setAttendanceConfirmModal({ isOpen: false, slot: null, timeSlot: null });
    } finally {
      setCreatingAttendance(null);
    }
  };

  /* ================= HELPER FUNCTIONS ================= */
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
    <div className="parent-portal-wrapper">
      <div
        className="parent-portal-container parent-loading-container"
        style={{ minHeight: "70vh" }}
      >
        <Loading
          size="md"
          color="primary"
          text="Loading My Timetable..."
        />
      </div>
    </div>
  );
}

  /* ================= ERROR STATE ================= */
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
        maxRetry={MAX_RETRY}
        isRetryLoading={isRetrying}
      />
    );
  }

  const selectedDates = WEEKDAY_CODES.map((dayCode, offset) => {
    const date = parseLocalDate(dateRange.startDate);
    date.setDate(date.getDate() + offset);
    return { dayCode, date, key: toLocalDateStr(date), slots: weekly[dayCode] || [] };
  });
  const weekdayGroups = selectedDates
    .map((day) => {
      const slots = [...new Map(day.slots
        .filter((slot) => slot?._id)
        .map((slot) => [slot._id, slot])).values()]
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      return { ...day, slots };
    })
    .filter(({ slots }) => slots.length > 0);
  const uniqueSlots = [...new Map(weekdayGroups
    .flatMap((day) => day.slots)
    .filter((slot) => !slot.isHolidayOnly && slot.status !== "HOLIDAY")
    .map((slot) => [slot._id, slot])).values()];
  const totalSlots = uniqueSlots.length;
  const teachingDays = new Set(weekdayGroups
    .filter(({ slots }) => slots.some((slot) => !slot.isHolidayOnly && slot.status !== "HOLIDAY"))
    .map(({ key }) => key)).size;
  const assignedSubjects = new Set(uniqueSlots.map((slot) => {
    const subject = slot.subject_id;
    return typeof subject === "string" ? subject : subject?._id || subject?.code || subject?.name;
  }).filter(Boolean)).size;
  const scheduledMinutes = uniqueSlots.reduce((total, slot) => {
    if (!/^\d{1,2}:\d{2}$/.test(slot.startTime || "") || !/^\d{1,2}:\d{2}$/.test(slot.endTime || "")) return total;
    const [startHour, startMinute] = slot.startTime.split(":").map(Number);
    const [endHour, endMinute] = slot.endTime.split(":").map(Number);
    if (startHour > 23 || startMinute > 59 || endHour > 23 || endMinute > 59) return total;
    const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    return total + (duration > 0 ? duration : 0);
  }, 0);
  const noClassDays = selectedDates.filter(({ slots }) =>
    !slots.some((slot) => slot?._id && !slot.isHolidayOnly && slot.status !== "HOLIDAY")
  );
  const academicYear = uniqueSlots.find((slot) => slot.timetable_id?.academicYear)?.timetable_id?.academicYear
    || scheduleSummary?.timetable?.academicYear;
  const rangeStart = parseLocalDate(dateRange.startDate);
  const rangeEnd = parseLocalDate(dateRange.endDate);
  const weekRangeLabel = `${rangeStart.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(rangeStart.getFullYear() !== rangeEnd.getFullYear() && { year: "numeric" }) })} – ${rangeEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="container-fluid teacher-my-timetable"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        padding: "1.5rem",
      }}
    >
      {/* ================= BREADCRUMB ================= */}   
                <div
            style={{
              width: "100%",
              margin: "0 auto",
              paddingTop: 0,
            }}
          >
            <div style={{ width: "100%" }}>
              <Breadcrumb
                items={[
                  { label: "Dashboard", path: "/teacher/dashboard" },
                  { label: "My Timetable" },
                ]}
              />
            </div>
          </div>
      <PageHeader
        icon={FaCalendarAlt}
        title="My Timetable"
        subtitle="Your weekly teaching schedule."
        className="teacher-timetable-header"
        actions={
          <div className="timetable-header-week">
            <span>Selected week</span>
            <strong>{weekRangeLabel}</strong>
            {academicYear && <small>Academic year {academicYear}</small>}
          </div>
        }
      >
        <div className="timetable-overview-stats">
          <div><strong>{totalSlots}</strong><span>Lecture slots</span></div>
          <div><strong>{teachingDays}</strong><span>Teaching days</span></div>
          <div><strong>{assignedSubjects}</strong><span>Assigned subjects</span></div>
          <div><strong>{Math.floor(scheduledMinutes / 60)}h {scheduledMinutes % 60}m</strong><span>Scheduled hours</span></div>
        </div>
      </PageHeader>

      <section className="timetable-toolbar" aria-label="Week navigation">
        <div className="timetable-week-controls">
          <button
            type="button"
            onClick={goToPreviousWeek}
            className="timetable-week-arrow"
            title="Previous Week"
            aria-label="Previous week"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            onClick={goToCurrentWeek}
            className="timetable-current-week"
          >
            <FaCalendarAlt /> Current Week
          </button>
          <button
            type="button"
            onClick={goToNextWeek}
            className="timetable-week-arrow"
            title="Next Week"
            aria-label="Next week"
          >
            <FaChevronRight />
          </button>
          <span className="timetable-week-date">
            {weekRangeLabel}
          </span>
        </div>
      </section>

      <nav className="timetable-day-navigator" aria-label="Days of the selected week">
        {selectedDates.map(({ dayCode, date, key, slots }) => {
          const count = new Set(slots
            .filter((slot) => slot?._id && !slot.isHolidayOnly && slot.status !== "HOLIDAY")
            .map((slot) => slot._id)).size;
          return (
            <a
              key={key}
              href={`#timetable-day-${dayCode}`}
              className={`timetable-day-nav-item${count ? " has-slots" : ""}${key === toLocalDateStr(new Date()) ? " is-today" : ""}`}
            >
              <span>{dayCode}</span>
              <strong>{date.getDate()}</strong>
              {count > 0
                ? <small>{count} {count === 1 ? "slot" : "slots"}</small>
                : <small className="no-slot-label">No classes</small>}
            </a>
          );
        })}
      </nav>

      <div className="timetable-info">
        <FaInfoCircle aria-hidden="true" />
        <span>
          This timetable shows only your assigned lectures from published timetables
        </span>
      </div>
      <style>{`
        .teacher-my-timetable {
          min-width: 0;
          overflow-x: hidden;
        }
        .teacher-my-timetable .timetable-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          padding: 12px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(15,58,74,.04);
        }
        .teacher-my-timetable .timetable-week-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
        }
        .teacher-my-timetable .timetable-week-arrow,
        .teacher-my-timetable .timetable-current-week {
          height: 38px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          transition: background-color .15s ease, box-shadow .15s ease;
        }
        .teacher-my-timetable .timetable-week-arrow {
          width: 38px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #244b63;
        }
        .teacher-my-timetable .timetable-week-arrow:hover {
          background: #f1f5f9;
        }
        .teacher-my-timetable .timetable-current-week {
          padding: 0 13px;
          border: 1px solid #0f3a4a;
          background: #0f3a4a;
          color: #fff;
          font-size: .85rem;
          font-weight: 600;
        }
        .teacher-my-timetable .timetable-current-week:hover {
          background: #164e63;
          box-shadow: 0 2px 7px rgba(15,58,74,.18);
        }
        .teacher-my-timetable .timetable-week-date {
          margin-left: 4px;
          color: #334155;
          font-size: .9rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .teacher-my-timetable .timetable-info {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 16px;
          padding: 10px 13px;
          border: 1px solid #dce8f0;
          border-radius: 10px;
          background: #f8fbfd;
          color: #526579;
          font-size: .82rem;
        }
        .teacher-my-timetable .timetable-info svg {
          flex: 0 0 auto;
          color: #1a4b6d;
        }
        .teacher-my-timetable .timetable-day-card {
          overflow: hidden;
          border: 1px solid #dfe7ed !important;
          border-radius: 12px !important;
          box-shadow: 0 3px 12px rgba(15,58,74,.06) !important;
          transition: box-shadow .18s ease, transform .18s ease !important;
          cursor: default !important;
        }
        .teacher-my-timetable .timetable-day-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 7px 18px rgba(15,58,74,.1) !important;
        }
        .teacher-my-timetable .timetable-day-header {
          min-height: 44px;
          padding: 10px 13px !important;
        }
        .teacher-my-timetable .timetable-day-header h6 {
          font-size: .92rem;
          letter-spacing: .01em;
        }
        .teacher-my-timetable .timetable-day-header .badge {
          padding: 4px 8px;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 999px;
          font-size: .68rem;
        }
        .teacher-my-timetable .timetable-day-body {
          padding: 12px !important;
        }
        .teacher-my-timetable .timetable-lecture-card {
          padding: 11px !important;
          border-radius: 10px !important;
          box-shadow: 0 1px 3px rgba(15,58,74,.04);
          transition: box-shadow .16s ease, transform .16s ease;
        }
        .teacher-my-timetable .timetable-lecture-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(15,58,74,.1);
        }
        .teacher-my-timetable .timetable-subject-name {
          font-size: .94rem !important;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }
        .teacher-my-timetable .timetable-subject-code {
          display: inline-block;
          margin-top: 2px;
          padding: 3px 7px;
          border: 1px solid rgba(26,75,109,.12);
          border-radius: 5px;
          font-size: .67rem !important;
          letter-spacing: .02em;
        }
        .teacher-my-timetable .timetable-slot-details {
          row-gap: 8px !important;
        }
        .teacher-my-timetable .timetable-slot-details > div > div {
          min-width: 0;
          font-size: .76rem !important;
        }
        .teacher-my-timetable .timetable-slot-details span {
          overflow-wrap: anywhere;
        }
        .teacher-my-timetable .timetable-attendance-note {
          color: #748395 !important;
          background: #f8fafc !important;
        }
        .teacher-my-timetable .timetable-days { align-items: start; }
        .teacher-my-timetable .timetable-day-column { align-self: start; }
        .teacher-my-timetable .timetable-day-card { height: auto !important; }
        .teacher-my-timetable .timetable-day-heading {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .teacher-my-timetable .timetable-day-heading-title { min-width: 0; }
        .teacher-my-timetable .timetable-day-heading-title h6 { overflow-wrap: anywhere; }
        .teacher-my-timetable .timetable-day-date {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,.76);
          font-size: .72rem;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .teacher-my-timetable .timetable-day-header .badge {
          flex: 0 0 auto;
          white-space: nowrap;
        }
        .teacher-my-timetable .timetable-slot-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px 12px;
          min-width: 0;
          margin: 0;
        }
        .teacher-my-timetable .timetable-metadata-item {
          min-width: 0;
          max-width: 100%;
        }
        .teacher-my-timetable .timetable-metadata-content {
          display: flex;
          min-width: 0;
          align-items: flex-start;
          gap: 6px;
          line-height: 1.35;
        }
        .teacher-my-timetable .timetable-metadata-content svg {
          flex: 0 0 13px;
          margin-top: 2px;
        }
        .teacher-my-timetable .timetable-metadata-content span {
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: normal;
        }
        .teacher-my-timetable .timetable-metadata-item > .badge {
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .teacher-my-timetable .timetable-subject-name { min-width: 0; overflow-wrap: anywhere; }
        .teacher-my-timetable .timetable-subject-code { max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
        .teacher-my-timetable .timetable-lecture-card { min-width: 0; flex: 0 0 auto; padding: 12px !important; }
        .teacher-my-timetable .timetable-day-body > .d-flex { min-width: 0; }
        @media (max-width: 1024px) {
          .teacher-my-timetable .timetable-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }
        }
        @media (max-width: 575px) {
          .teacher-my-timetable {
            padding: 1rem !important;
          }
          .teacher-my-timetable .timetable-toolbar {
            padding: 10px;
            gap: 9px;
          }
          .teacher-my-timetable .timetable-week-controls {
            display: grid;
            width: 100%;
            grid-template-columns: 38px minmax(0, 1fr) 38px;
          }
          .teacher-my-timetable .timetable-week-date {
            grid-column: 1 / -1;
            margin: 2px 0 0;
            text-align: center;
            font-size: .82rem;
          }
          .teacher-my-timetable .timetable-current-week {
            width: 100%;
          }
          .teacher-my-timetable .timetable-day-column {
            padding-right: calc(var(--bs-gutter-x) * .5);
            padding-left: calc(var(--bs-gutter-x) * .5);
          }
          .teacher-my-timetable .timetable-slot-details { grid-template-columns: minmax(0, 1fr); gap: 8px; }
          .teacher-my-timetable .timetable-day-heading { align-items: flex-start; gap: 8px; }
        }
        .teacher-my-timetable .teacher-timetable-header { margin-bottom: 14px; }
        .teacher-my-timetable .teacher-timetable-header .standard-page-header-content {
          position: relative;
          min-height: 0;
          padding: 22px 26px 22px;
          align-items: flex-start;
          flex-wrap: wrap;
          row-gap: 16px;
        }
        .teacher-my-timetable .teacher-timetable-header .standard-page-header-main { align-self: flex-start; }
        .teacher-my-timetable .teacher-timetable-header .standard-page-header-actions {
          align-self: flex-start;
          justify-content: flex-end;
          min-width: 220px;
          padding-top: 2px;
        }
        .teacher-my-timetable .teacher-timetable-header .standard-page-header-meta {
          position: static;
          flex: 1 0 100%;
          margin: 0;
          padding: 12px 0 0;
          border-top: 1px solid rgba(255,255,255,.2);
        }
        .teacher-my-timetable .timetable-header-week {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          text-align: right;
        }
        .teacher-my-timetable .timetable-header-week span {
          color: rgba(235,247,250,.68);
          font-size: .66rem;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .teacher-my-timetable .timetable-header-week strong { color: #fff; font-size: .98rem; }
        .teacher-my-timetable .timetable-header-week small { color: rgba(235,247,250,.68); font-size: .68rem; }
        .teacher-my-timetable .timetable-overview-stats {
          display: grid;
          width: 100%;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
          gap: .6rem;
        }
        .teacher-my-timetable .timetable-overview-stats > div { display: flex; flex-direction: column; gap: .1rem; padding-left: .8rem; border-left: 1px solid rgba(255,255,255,.16); }
        .teacher-my-timetable .timetable-overview-stats > div:first-child { padding-left: 0; border-left: 0; }
        .teacher-my-timetable .timetable-overview-stats strong { color: #fff; font-size: 1.28rem; line-height: 1.15; white-space: nowrap; }
        .teacher-my-timetable .timetable-overview-stats span { color: rgba(235,247,250,.68); font-size: .64rem; }
        .teacher-my-timetable .timetable-toolbar { margin-bottom: 8px; }
        .teacher-my-timetable .timetable-navigator-label { color: #83929b; font-size: .7rem; }
        .teacher-my-timetable .timetable-day-navigator { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .55rem; margin-bottom: 10px; padding: .7rem; border: 1px solid #e1e9ed; border-radius: 12px; background: #fff; box-shadow: 0 2px 8px rgba(15,58,74,.035); }
        .teacher-my-timetable .timetable-day-nav-item { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: .12rem; padding: .45rem .25rem; border: 1px solid transparent; border-radius: 9px; color: #70818a; text-decoration: none; transition: background .15s ease, border-color .15s ease; }
        .teacher-my-timetable .timetable-day-nav-item > span { font-size: .62rem; font-weight: 750; letter-spacing: .06em; }
        .teacher-my-timetable .timetable-day-nav-item > strong { color: #425b66; font-size: 1rem; }
        .teacher-my-timetable .timetable-day-nav-item > small { color: #84949b; font-size: .58rem; }
        .teacher-my-timetable .timetable-day-nav-item.has-slots { border-color: #d7e9ed; background: #f3f9fa; }
        .teacher-my-timetable .timetable-day-nav-item.has-slots > span, .teacher-my-timetable .timetable-day-nav-item.has-slots > strong { color: #14566a; }
        .teacher-my-timetable .timetable-day-nav-item.is-today { box-shadow: inset 0 0 0 1px #247e91; }
        .teacher-my-timetable .timetable-day-nav-item:hover { border-color: #b8d7de; background: #eef7f8; }
        .teacher-my-timetable .timetable-day-nav-item .no-slot-label { color: #a0adb3; }
        .teacher-my-timetable .timetable-days { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        .teacher-my-timetable .timetable-day-column { min-width: 0; scroll-margin-top: 85px; }
        .teacher-my-timetable .timetable-day-card { height: auto !important; background: #fff; }
        .teacher-my-timetable .timetable-day-header { display: flex; align-items: center; background: linear-gradient(135deg, #0f3a4a 0%, #164e63 100%) !important; }
        .teacher-my-timetable .timetable-day-header h6 { color: #fff; }
        .teacher-my-timetable .timetable-day-date { display: block; margin-top: .15rem; color: rgba(255,255,255,.7); font-size: .68rem; }
        .teacher-my-timetable .timetable-lecture-card { min-width: 0; background-color: #f5fafb !important; border-color: #dce9ec !important; border-left-color: #39879a !important; }
        .teacher-my-timetable .timetable-lecture-card .timetable-subject-name { color: #174b5b !important; }
        .teacher-my-timetable .timetable-no-class-days { display: flex; align-items: center; flex-wrap: wrap; gap: .45rem; margin: 10px 0 20px; padding: .55rem .75rem; border: 1px solid #e5ecef; border-radius: 9px; background: rgba(255,255,255,.72); color: #82919a; font-size: .69rem; }
        .teacher-my-timetable .timetable-no-class-days strong { margin-right: .25rem; color: #627681; }
        .teacher-my-timetable .timetable-no-class-days span { padding: .18rem .42rem; border-radius: 99px; background: #f0f4f5; color: #72838b; }
        @media (max-width: 1024px) {
          .teacher-my-timetable .teacher-timetable-header .standard-page-header-content {
            min-height: 0;
            padding: 18px 20px 20px;
          }
          .teacher-my-timetable .teacher-timetable-header .standard-page-header-actions {
            min-width: 0;
            justify-content: flex-start;
          }
          .teacher-my-timetable .teacher-timetable-header .standard-page-header-meta { right: auto; left: auto; }
          .teacher-my-timetable .timetable-header-week { align-items: flex-start; text-align: left; }
        }
        @media (max-width: 700px) { .teacher-my-timetable .timetable-days { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 575px) {
          .teacher-my-timetable { padding: .75rem !important; }
          .teacher-my-timetable .teacher-timetable-header .standard-page-header-content {
            min-height: 0;
            padding: 16px;
            gap: 10px;
          }
          .teacher-my-timetable .teacher-timetable-header .standard-page-header-meta { right: auto; left: auto; padding-top: 9px; }
          .teacher-my-timetable .timetable-overview-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: .55rem; }
          .teacher-my-timetable .timetable-overview-stats > div:nth-child(odd) { border-left: 0; padding-left: 0; }
          .teacher-my-timetable .timetable-overview-stats strong { font-size: 1.05rem; }
          .teacher-my-timetable .timetable-overview-stats span { font-size: .58rem; }
          .teacher-my-timetable .timetable-header-week strong { font-size: .88rem; }
          .teacher-my-timetable .timetable-day-navigator { gap: .2rem; padding: .4rem; }
          .teacher-my-timetable .timetable-day-nav-item { padding: .35rem .1rem; }
          .teacher-my-timetable .timetable-day-nav-item > small { font-size: .52rem; }
        }
      `}</style>

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
            {timetableId ? "No Lectures This Week" : "No Timetable Assigned"}
          </h4>
          <p className="text-muted mb-3">
            {timetableId
              ? "There are no lecture slots assigned during this week."
              : "You don't have any lecture slots assigned yet."}
          </p>
          <p className="text-muted small">
            {timetableId
              ? "Use the week navigation to check your schedule for another week."
              : "Once the HOD assigns lectures to you, they will appear here."}
          </p>
        </motion.div>
      )}

      {/* ================= TIMETABLE BY DAY ================= */}
      {totalSlots > 0 && (
        <div className="timetable-days">
          {weekdayGroups.map(({ dayCode, date, key, slots: daySlots }, index) => {

            // Skip days with no slots AND no holidays
            const hasHoliday = daySlots.some((slot) => slot.isHolidayOnly || slot.status === "HOLIDAY");
            const dayLectureCount = daySlots.filter((slot) =>
              !slot.isHolidayOnly && slot.status !== "HOLIDAY"
            ).length;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="timetable-day-column"
              >
                <div
                  id={`timetable-day-${dayCode}`}
                  className={`timetable-day-card card${hasHoliday ? " has-holiday" : ""}`}
                  style={{
                    background: "white",
                  }}
                >
                  {/* Day Header */}
                  <div
                    className={`timetable-day-header px-3 py-2${hasHoliday ? " is-holiday" : ""}`}
                    style={{
                      background: hasHoliday
                        ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
                        : BRAND_COLORS.primary.gradient,
                      color: "white",
                    }}
                  >
                    <div className="timetable-day-heading">
                      <div className="timetable-day-heading-title">
                        <h6 className="fw-bold mb-0">
                          {hasHoliday && "⚠️ "}
                          {DAY_NAMES[dayCode]}
                        </h6>
                      <small className="timetable-day-date">
                        {date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                      </small>
                      </div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                          color: "white",
                          fontWeight: "600",
                        }}
                      >
                        {dayLectureCount}{" "}
                        {dayLectureCount === 1
                          ? "Slot"
                          : "Slots"}
                      </span>
                    </div>
                  </div>

                  {/* Slots List */}
                  <div className="timetable-day-body card-body p-3">
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
                          const subjectName = typeof slot.subject_id === "string"
                            ? slot.subject_id
                            : slot.subject_id?.name;
                          const subjectCode = typeof slot.subject_id === "object"
                            ? slot.subject_id?.code
                            : null;
                          const division = slot.division || slot.timetable_id?.division;
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
                              key={slot._id || slot.startTime || `slot-${slotIndex}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: slotIndex * 0.03 }}
                              className="timetable-lecture-card rounded-3 p-3 position-relative"
                              style={{
                                backgroundColor: adjustedBg,
                                borderColor: adjustedBorder,
                                borderStyle: "solid",
                                borderWidth: "1px",
                                borderLeftWidth: "4px",
                                opacity: isCancelled ? 0.7 : 1,
                                transition: "all 0.16s ease",
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
                                  {subjectName && <h6
                                    className="timetable-subject-name fw-bold mb-1"
                                    style={{
                                      color: adjustedText,
                                      fontSize: "0.95rem",
                                      textDecoration: isCancelled
                                        ? "line-through"
                                        : "none",
                                      opacity: isCancelled ? 0.6 : 1,
                                    }}
                                  >
                                    {subjectName}
                                  </h6>}
                                  {subjectCode && (
                                    <span
                                      className="timetable-subject-code badge"
                                      style={{
                                        backgroundColor:
                                          "rgba(255, 255, 255, 0.7)",
                                        color: adjustedText,
                                        fontSize: "0.7rem",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {subjectCode}
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
                              <div className="timetable-slot-details">
                                {/* Time */}
                                {slot.startTime && slot.endTime && <div className="timetable-metadata-item">
                                  <div
                                    className="timetable-metadata-content"
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
                                </div>}

                                {slot.room && (
                                  <div className="timetable-metadata-item">
                                    <div className="timetable-metadata-content" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                      <FaDoorOpen size={12} style={{ color: adjustedText }} />
                                      <span>{slot.room}</span>
                                    </div>
                                  </div>
                                )}

                                {(slot.timetable_id?.course_id?.name || slot.timetable_id?.course_id?.code) && (
                                  <div className="timetable-metadata-item">
                                    <div className="timetable-metadata-content" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                      <FaUniversity size={12} style={{ color: adjustedText }} />
                                      <span>
                                        {[slot.timetable_id.course_id.name, slot.timetable_id.course_id.code].filter(Boolean).join(" · ")}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {slot.timetable_id?.semester != null && (
                                  <div className="timetable-metadata-item">
                                    <div className="timetable-metadata-content" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                      <FaLayerGroup size={12} style={{ color: adjustedText }} />
                                      <span>Semester {slot.timetable_id.semester}</span>
                                    </div>
                                  </div>
                                )}

                                {division && (
                                  <div className="timetable-metadata-item">
                                    <div className="timetable-metadata-content" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                      <FaChalkboardTeacher size={12} style={{ color: adjustedText }} />
                                      <span>{division}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Type */}
                                <div className="timetable-metadata-item">
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

                              {/* ================= ATTENDANCE BUTTON ================= */}
                              {(() => {
                                const btnState = getAttendanceButtonState(slot, dayCode);

                                if (btnState === "cancelled" || btnState === "holiday" || btnState === "rescheduled") {
                                  return null;
                                }

                                if (btnState === "unpublished") {
                                  return (
                                    <div
                                      style={{
                                        marginTop: "0.75rem",
                                        padding: "0.5rem 0.75rem",
                                        borderRadius: "8px",
                                        background: "#f1f5f9",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "0.75rem",
                                        color: "#64748b",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.375rem",
                                      }}
                                    >
                                      <FaExclamationTriangle size={12} />
                                      <span>Timetable not published</span>
                                    </div>
                                  );
                                }

                                if (btnState === "not_today") {
                                  return (
                                    <div
                                      className="timetable-attendance-note"
                                      style={{
                                        marginTop: "0.75rem",
                                        padding: "0.5rem 0.75rem",
                                        borderRadius: "8px",
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "0.75rem",
                                        color: "#94a3b8",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.375rem",
                                      }}
                                    >
                                      <FaClock size={12} />
                                      <span>Mark attendance only on class day</span>
                                    </div>
                                  );
                                }

                                if (btnState === "upcoming") {
                                  return (
                                    <div
                                      style={{
                                        marginTop: "0.75rem",
                                        padding: "0.5rem 0.75rem",
                                        borderRadius: "8px",
                                        background: "#eff6ff",
                                        border: "1px solid #bfdbfe",
                                        fontSize: "0.75rem",
                                        color: "#2563eb",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.375rem",
                                      }}
                                    >
                                      <FaSyncAlt size={12} />
                                      <span>Available at {formatTime12Hour(slot.startTime)}</span>
                                    </div>
                                  );
                                }

                                if (btnState === "creating") {
                                  return (
                                    <motion.button
                                      disabled
                                      style={{
                                        marginTop: "0.75rem",
                                        width: "100%",
                                        padding: "0.6rem",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "linear-gradient(135deg, #28a745, #1e7e34)",
                                        color: "white",
                                        fontSize: "0.85rem",
                                        fontWeight: 600,
                                        cursor: "not-allowed",
                                        opacity: 0.8,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                      }}
                                    >
                                      <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      >
                                        <FaSyncAlt size={14} />
                                      </motion.div>
                                      Starting Session...
                                    </motion.button>
                                  );
                                }

                                if (btnState === "completed") {
                                  const session = openSessions[slot._id];
                                  const sessionId = session?._id;
                                  return (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      onClick={() => sessionId && navigate(`/attendance/session/${sessionId}`)}
                                      style={{
                                        marginTop: "0.75rem",
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "8px",
                                        background: "#dcfce7",
                                        border: "1px solid #86efac",
                                        fontSize: "0.85rem",
                                        color: "#166534",
                                        fontWeight: 600,
                                        cursor: sessionId ? "pointer" : "default",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                        boxShadow: "0 4px 12px rgba(40, 167, 69, 0.35)",
                                      }}
                                    >
                                      <FaCheckCircle size={14} />
                                      <span>Attendance Marked</span>
                                    </motion.div>
                                  );
                                }

                                if (btnState === "ended") {
                                  const session = closedSessions[slot._id];
                                  const sessionId = session?._id;
                                  return (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      onClick={() => sessionId && navigate(`/attendance/session/${sessionId}`)}
                                      style={{
                                        marginTop: "0.75rem",
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "8px",
                                        background: "#f1f5f9",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "0.85rem",
                                        color: "#64748b",
                                        fontWeight: 600,
                                        cursor: sessionId ? "pointer" : "default",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                      }}
                                    >
                                      <FaTimesCircle size={14} />
                                      <span>Session Ended</span>
                                    </motion.div>
                                  );
                                }

                                if (btnState === "start") {
                                  return (
                                    <motion.button
                                      whileHover={{ scale: 1.02, boxShadow: "0 6px 20px rgba(40, 167, 69, 0.4)" }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => openAttendanceConfirm(slot, dayCode)}
                                      style={{
                                        marginTop: "0.75rem",
                                        width: "100%",
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "linear-gradient(135deg, #28a745, #1e7e34)",
                                        color: "white",
                                        fontSize: "0.85rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.5rem",
                                        boxShadow: "0 4px 15px rgba(40, 167, 69, 0.35)",
                                      }}
                                    >
                                      <FaPlay size={13} />
                                      <span>Mark Attendance</span>
                                    </motion.button>
                                  );
                                }

                                return null;
                              })()}
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

      {totalSlots > 0 && noClassDays.length > 0 && (
        <div className="timetable-no-class-days">
          <strong>Other Days · No Assigned Lectures</strong>
          {noClassDays.map(({ dayCode }) => <span key={dayCode}>{DAY_NAMES[dayCode]}</span>)}
        </div>
      )}

      {/* ================= ATTENDANCE CONFIRM MODAL ================= */}
      {attendanceConfirmModal.isOpen && (
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
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() =>
            setAttendanceConfirmModal({ isOpen: false, slot: null, timeSlot: null })
          }
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
              width: "100%",
              maxWidth: "450px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.75rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <FaCheckCircle style={{ color: "#28a745" }} /> Start Attendance
              </h3>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() =>
                  setAttendanceConfirmModal({ isOpen: false, slot: null, timeSlot: null })
                }
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  color: "#64748b",
                  cursor: "pointer",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                }}
              >
                &times;
              </motion.button>
            </div>

            {attendanceConfirmModal.slot && (
              <div>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "12px",
                    backgroundColor: "#dbeafe",
                    border: "1px solid #93c5fd",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <FaBookOpen style={{ color: BRAND_COLORS.primary.main }} />
                    <strong>
                      {attendanceConfirmModal.slot.subject_id?.name}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#4a5568",
                    }}
                  >
                    <FaClock size={12} />
                    <span>{attendanceConfirmModal.timeSlot}</span>
                  </div>
                  {attendanceConfirmModal.slot.room && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.9rem",
                        color: "#4a5568",
                        marginTop: "0.25rem",
                      }}
                    >
                      <FaDoorOpen size={12} />
                      <span>Room {attendanceConfirmModal.slot.room}</span>
                    </div>
                  )}
                </div>

                <p
                  style={{
                    color: "#4a5568",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    marginBottom: "1.5rem",
                  }}
                >
                  This will create a new attendance session for{" "}
                  <strong>
                    {attendanceConfirmModal.slot.subject_id?.name}
                  </strong>{" "}
                  today. Students will be able to mark their attendance.
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      setAttendanceConfirmModal({
                        isOpen: false,
                        slot: null,
                        timeSlot: null,
                      })
                    }
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "white",
                      color: "#1e293b",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={createAttendanceSession}
                    disabled={creatingAttendance === attendanceConfirmModal.slot?._id}
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "12px",
                      border: "none",
                      background: creatingAttendance === attendanceConfirmModal.slot?._id
                        ? "#cbd5e1"
                        : "linear-gradient(135deg, #28a745, #1e7e34)",
                      color: "white",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: creatingAttendance === attendanceConfirmModal.slot?._id
                        ? "not-allowed"
                        : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {creatingAttendance === attendanceConfirmModal.slot?._id ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <FaSyncAlt size={16} />
                      </motion.div>
                    ) : (
                      <FaPlay size={14} />
                    )}
                    {creatingAttendance === attendanceConfirmModal.slot?._id
                      ? "Starting..."
                      : "Start Attendance"}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
