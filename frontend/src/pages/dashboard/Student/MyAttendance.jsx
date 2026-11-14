/* eslint-disable no-unused-vars */
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaBook,
  FaFilter,
  FaSyncAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaClock,
  FaChartBar,
  FaUniversity,
  FaDownload,
  FaQuestionCircle,
  FaLightbulb,
  FaTimes,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaHourglassHalf
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
/* eslint-enable no-unused-vars */

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' }
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
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.6, ease: "easeOut" }
  })
};

const slideDownVariants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

// Timetable helpers (same data-source logic as StudentTimetable.jsx)
const DAY_MAP_TT = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };
const toLocalDateStrTT = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const formatTime12HourTT = (time24) => {
  if (!time24 || time24 === "N/A") return time24 || "";
  const parts = String(time24).split(":").map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0])) return time24;
  const [hours, minutes] = parts;
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
};
const validateTimetableSlotTT = (slot) => {
  if (!slot) return false;
  if (!slot.day || !slot.startTime || !slot.endTime) return false;
  if (!slot.subject_id?.name) return false;
  if (slot.status === "HOLIDAY") return true;
  if (slot.startTime >= slot.endTime) return false;
  return true;
};

export default function StudentAttendanceReport() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const loadTimeoutRef = useRef(null);
  const timetableReqIdRef = useRef(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRangeError, setDateRangeError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    subjectId: "",
    startDate: "",
    endDate: ""
  });
  const [toasts, setToasts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showTooltip, setShowTooltip] = useState(null);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [todayTimetable, setTodayTimetable] = useState([]);
  const [todayTimetableLoading, setTodayTimetableLoading] = useState(true);
  const [todayTimetableError, setTodayTimetableError] = useState(null);
/* ================= DATA VALIDATION HELPER ================= */
  const validateAttendanceData = (data) => {
    const errors = [];
    
    if (!data) return ["Attendance data is missing"];
    
    if (!data.summary) {
      errors.push("Summary data is missing");
    } else {
      if (typeof data.summary.totalLectures === 'undefined') {
        errors.push("Total lectures count is missing");
      }
      if (typeof data.summary.percentage === 'undefined') {
        errors.push("Attendance percentage is missing");
      }
    }
    
    if (!Array.isArray(data.sessions)) {
      errors.push("Sessions array is missing");
    }
    
    return errors;
  };

  /* ================= TOAST MANAGEMENT ================= */
  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setTodayTimetableError(null);
    setTodayTimetableLoading(true);
    addToast("Retrying...", "info");

    setFilters(prev => ({
      ...prev,
      _retry: Date.now()
    }));
  };

  const refreshData = () => {
    setLoading(true);
    setTodayTimetableError(null);
    setTodayTimetableLoading(true);
    addToast("Refreshing attendance and timetable data...", "info");

    setFilters(prev => ({
      ...prev,
      _timestamp: Date.now()
    }));
  };

/* ================= DOWNLOAD HANDLER ================= */
  const handleDownloadReport = async () => {
    try {
      addToast("Generating PDF report...", "info");
      
      const response = await api.get("/attendance/student/report", {
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      addToast("Report downloaded successfully!", "success");
    } catch {
      addToast("Failed to download report. Please try again.", "error");
    }
  };

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    let cancelled = false;
    const fetchSubjects = async () => {
      try {
        const res = await api.get("/attendance/student");
        const subjectsFromAttendance = (res.data.subjectWise || []).map((subj, index) => ({
          _id: subj._id || `subject-${index}`,
          name: subj.subject || subj.name,
          code: subj.code,
        }));
        if (!cancelled) setSubjects(subjectsFromAttendance);
      } catch {
        // ignore
      }
    };
    fetchSubjects();
    return () => { cancelled = true; };
  }, []);

  const fetchTodayTimetable = useCallback(async () => {
    const reqId = ++timetableReqIdRef.current;
    const today = new Date();
    const todayStr = toLocalDateStrTT(today);
    const todayDay = DAY_MAP_TT[today.getDay()];

    setTodayTimetableLoading(true);
    setTodayTimetableError(null);

    try {
      // Same established student-specific source as StudentTimetable.jsx
      const timetableRes = await api.get("/timetable/student");
      const responseData = timetableRes.data?.data || timetableRes.data || {};
      const allSlots = Array.isArray(responseData.slots) ? responseData.slots : (Array.isArray(responseData) ? responseData : []);

      if (!allSlots || allSlots.length === 0) {
        if (reqId === timetableReqIdRef.current) setTodayTimetable([]);
        return;
      }

      const firstSlot = allSlots.find((s) => s.timetable_id);
      const tId = typeof firstSlot?.timetable_id === "object" ? firstSlot?.timetable_id?._id : firstSlot?.timetable_id;

      let slotsForToday = [];
      if (tId) {
        const scheduleRes = await api.get(`/timetable/${tId}/schedule`, {
          params: { startDate: todayStr, endDate: todayStr },
        });
        const schedulePayload = scheduleRes.data || {};
        const schedule = schedulePayload.schedule || [];
        const dayEntry = schedule.find((d) => d.date === todayStr) || schedule[0];
        if (dayEntry && dayEntry.date === todayStr && Array.isArray(dayEntry.slots)) {
          slotsForToday = dayEntry.slots
            .map((slot) => ({ ...slot, day: todayDay, exceptionDate: dayEntry.date, isHolidayOnly: !!dayEntry.isHoliday }))
            .filter(validateTimetableSlotTT);
        } else {
          // fallback to old-format slots filtered to today
          slotsForToday = allSlots
            .filter((s) => (s.day || DAY_MAP_TT[today.getDay()]) === todayDay)
            .map((s) => ({ ...s, day: s.day || todayDay }))
            .filter(validateTimetableSlotTT);
        }
      } else {
        slotsForToday = allSlots
          .filter((s) => (s.day || todayDay) === todayDay)
          .map((s) => ({ ...s, day: s.day || todayDay }))
          .filter(validateTimetableSlotTT);
      }

      // Hide holiday-only placeholders from class list
      slotsForToday = slotsForToday.filter((s) => s.status !== "HOLIDAY" && !s.isHolidayOnly);

      slotsForToday.sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")) || String(a.endTime || "").localeCompare(String(b.endTime || "")));

      if (reqId === timetableReqIdRef.current) setTodayTimetable(slotsForToday);
    } catch (err) {
      if (reqId === timetableReqIdRef.current) {
        setTodayTimetable([]);
        setTodayTimetableError("Unable to load today's timetable. Please refresh to try again.");
        logger.warn("Today's timetable load error:", { page: "MyAttendance", error: err?.response?.data || err?.message });
      }
    } finally {
      if (reqId === timetableReqIdRef.current) setTodayTimetableLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set timeout for 30 seconds
    loadTimeoutRef.current = setTimeout(() => {
      logger.warn("Student attendance request timed out", {
        page: "MyAttendance",
        role: user?.role,
      });
      setError({
        message: "Request timed out. Please check your connection and try again.",
        statusCode: undefined,
        errorCode: undefined,
      });
      setLoading(false);
      addToast("Request timed out. Please try again.", "error");
    }, 30000);

    const fetchData = async () => {
      try {
        // Single API call - attendance data already includes subjectWise info
        const reportRes = await api.get("/attendance/student", { params: filters });

        // Validate data
        const validation = validateAttendanceData(reportRes.data);
        if (validation.length > 0) {
          throw new Error(`Invalid attendance data: ${validation.join(', ')}`);
        }

        setData(reportRes.data);
        setError(null);

        // Clear timeout on success
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      } catch (err) {
        // Clear timeout on error
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }

        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;

        logger.error("Student attendance load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "MyAttendance",
          role: user?.role,
        });

        setError({
          message: "Failed to load attendance report. Please try again later.",
          statusCode,
          errorCode,
        });

        const isAuthError =
          statusCode === 401 ||
          (errorCode && AUTH_ERROR_CODES.has(errorCode));

        if (!isAuthError) {
          addToast("Failed to load attendance report. Please try again later.", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    // Load attendance and today's timetable together (timetable unaffected by attendance filters)
    fetchData();
    fetchTodayTimetable();

    // Cleanup timeout on unmount
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [filters, fetchTodayTimetable]);

  /* ================= HANDLE FILTERS ================= */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    if (name === "startDate" || name === "endDate") {
      setDateRangeError("");
    }
  };

  const applyFilters = () => {
    if (filters.startDate && filters.endDate && new Date(filters.startDate) > new Date(filters.endDate)) {
      setDateRangeError("Start date must be before or equal to end date");
      addToast("Invalid date range: start date must be before or equal to end date", "error");
      return;
    }
    setDateRangeError("");
    addToast("Filters applied successfully!", "success");
  };

  const resetFilters = () => {
    setFilters({
      subjectId: "",
      startDate: "",
      endDate: ""
    });
addToast("Filters reset successfully!", "info");
  };

  /* ================= TOOLTIP HANDLERS WITH BOUNDARY CHECKS ================= */
  const handleTooltip = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 300; // Approximate tooltip width
    
    // Calculate position with boundary checks
    let left = rect.left + window.scrollX + (rect.width / 2);
    
    // Prevent tooltip from going off-screen
    if (left + tooltipWidth / 2 > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - 20;
    } else if (left - tooltipWidth / 2 < 0) {
      left = 20;
    }
    
    setTooltipContent(content);
    setTooltipPosition({
      top: rect.top + window.scrollY - 40,
      left: left
    });
    setShowTooltip(true);
  };

  const handleTooltipLeave = () => {
    setShowTooltip(false);
  };

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
            text="Loading Attendance Report..."
          />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <ApiError
        title="Attendance Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={handleRetry}
        onGoBack={() => navigate("/student/dashboard")}
      />
    );
  }

  const summary = data?.summary || {
    totalLectures: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  };

  const sessions = data?.sessions || [];
  const attendanceToday = data?.today || [];
  const subjectWise = data?.subjectWise || [];

  const now = new Date();
  const todayDateLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const normalizeText = (v) => String(v || "").trim().toLowerCase();
  const getSlotSubjectName = (slot) => slot?.subject_id?.name || slot?.subject || slot?.subjectName || "Subject";
  const getSlotSubjectCode = (slot) => slot?.subject_id?.code || slot?.subjectCode || slot?.code || "";
  const getSlotTeacher = (slot) => slot?.teacher_id?.name || slot?.teacher || slot?.faculty_name || slot?.teacherName || "";
  const getSlotRoom = (slot) => slot?.room || slot?.classroom || "";

  // Build today's schedule from timetable (source of truth) and attach actual attendance record status only when present
  const todaySchedule = [...todayTimetable]
    .sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || "")) || String(a.endTime || "").localeCompare(String(b.endTime || "")))
    .map((slot) => {
      const slotStart = String(slot.startTime || "");
      const slotEnd = String(slot.endTime || "");
      const slotSubject = normalizeText(getSlotSubjectName(slot));
      const slotCode = normalizeText(getSlotSubjectCode(slot));
      const record = attendanceToday.find((r) => {
        const rStart = String(r.startTime || "");
        const rEnd = String(r.endTime || "");
        const rSubject = normalizeText(r.subject);
        const rCode = normalizeText(r.subjectCode);
        const timeMatch = rStart && rEnd ? (rStart === slotStart && rEnd === slotEnd) : (rStart === slotStart);
        if (!timeMatch) return false;
        if (slotCode && rCode) return slotCode === rCode;
        if (slotSubject && rSubject) return slotSubject === rSubject || slotSubject.includes(rSubject) || rSubject.includes(slotSubject);
        return timeMatch;
      });

      let statusInfo = { key: "upcoming", label: "Upcoming", tone: "info" };
      if (record) {
        const recStatus = String(record.status || "").toUpperCase();
        if (recStatus === "PRESENT") statusInfo = { key: "present", label: "Present", tone: "success" };
        else if (recStatus === "ABSENT") statusInfo = { key: "absent", label: "Absent", tone: "danger" };
        else statusInfo = { key: "recorded", label: recStatus || "Recorded", tone: "neutral" };
      } else {
        const [sh, sm] = slotStart.split(":").map(Number);
        const [eh, em] = slotEnd.split(":").map(Number);
        if (!Number.isNaN(sh) && !Number.isNaN(eh)) {
          const startDt = new Date(now); startDt.setHours(sh, sm || 0, 0, 0);
          const endDt = new Date(now); endDt.setHours(eh, em || 0, 0, 0);
          if (now > endDt) statusInfo = { key: "not-recorded", label: "Attendance not yet recorded", tone: "warning" };
          else if (now >= startDt && now <= endDt) statusInfo = { key: "in-progress", label: "In progress", tone: "info" };
          else statusInfo = { key: "upcoming", label: "Upcoming", tone: "info" };
        }
      }

      return {
        slotId: slot._id || slot.slotId || `${slotStart}-${slotEnd}-${getSlotSubjectName(slot)}`,
        startTime: slotStart,
        endTime: slotEnd,
        subject: record?.subject || getSlotSubjectName(slot),
        teacher: record?.teacher && record.teacher !== "N/A" ? record.teacher : (getSlotTeacher(slot) || ""),
        room: record?.room && record.room !== "N/A" ? record.room : (getSlotRoom(slot) || ""),
        statusInfo,
        hasRecord: !!record,
      };
    });

  const formatPercent = (p) => {
    const n = Number(p);
    if (Number.isNaN(n)) return p ?? 0;
    return Number.isInteger(n) ? n : n.toFixed(2).replace(/\.00$/, "");
  };

  return (
    <AnimatePresence mode="wait">
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="erp-page erp-viewport-min-100"
         style={{
           background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '0.5rem',
          paddingBottom: '2rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
        role="main"
        aria-label="Attendance report"
      >
        {/* Skip Link for Screen Readers */}
        <a href="#attendance-content" className="sr-only sr-only-focusable" style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0
        }}>
          Skip to attendance content
        </a>

        <div style={{ width: '100%', maxWidth: 'none', margin: '0 auto' }} id="attendance-content">
          <style>{`
            .student-attendance-report-hero,
            .student-attendance-report-hero-content,
            .student-attendance-report-hero-copy,
            .student-attendance-report-hero-actions {
              min-width: 0;
              max-width: 100%;
              box-sizing: border-box;
            }

            .att-page-section { margin-bottom: 1.5rem; }
            .att-card { background: #fff; border-radius: 18px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); overflow: hidden; border: 1px solid #e8edf3; }
            .att-section-head { padding: 1rem 1.25rem; background: linear-gradient(135deg, #0E3746 0%, #164E63 100%); color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
            .att-section-head-left { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
            .att-section-title { margin: 0; font-size: 1.1rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.55rem; color: #fff; }
            .att-section-sub { margin: 0; font-size: 0.82rem; color: rgba(255,255,255,0.82); }
            .att-head-meta { display: inline-flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
            .att-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 999px; font-size: 0.78rem; font-weight: 600; background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.18); white-space: nowrap; }

            .att-today-body { padding: 1rem 1.1rem; }
            .att-timeline { display: flex; flex-direction: column; gap: 0.65rem; }
            .att-slot-row { display: grid; grid-template-columns: 132px 1fr auto; gap: 0.85rem; align-items: center; padding: 0.75rem 0.85rem; border: 1px solid #e6edf3; border-radius: 14px; background: #fbfdff; }
            .att-slot-time { display: flex; flex-direction: column; gap: 0.15rem; padding-right: 0.75rem; border-right: 1px solid #e6edf3; min-width: 0; }
            .att-time-main { font-weight: 700; color: #0f3a4a; font-size: 0.92rem; line-height: 1.2; }
            .att-time-sub { font-size: 0.75rem; color: #64748b; }
            .att-slot-main { min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
            .att-slot-subject { font-weight: 700; color: #0f172a; font-size: 0.98rem; line-height: 1.25; overflow-wrap: anywhere; }
            .att-slot-meta { display: flex; flex-wrap: wrap; gap: 0.4rem 0.85rem; color: #475569; font-size: 0.8rem; }
            .att-meta-item { display: inline-flex; align-items: center; gap: 0.35rem; min-width: 0; }
            .att-slot-status { display: flex; justify-content: flex-end; }
            .att-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.32rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; border: 1px solid transparent; white-space: nowrap; }
            .att-badge.present { background: rgba(40,167,69,0.12); color: #1f7a34; border-color: rgba(40,167,69,0.2); }
            .att-badge.absent { background: rgba(220,53,69,0.1); color: #b4232c; border-color: rgba(220,53,69,0.18); }
            .att-badge.upcoming, .att-badge.in-progress { background: rgba(23,162,184,0.12); color: #0f6674; border-color: rgba(23,162,184,0.2); }
            .att-badge.not-recorded { background: rgba(255,193,7,0.16); color: #8a6500; border-color: rgba(255,193,7,0.28); }
            .att-badge.neutral { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
            .att-empty { text-align: center; padding: 1.25rem 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
            .att-empty.compact { padding: 1rem 0.5rem; }
            .att-empty-icon { width: 44px; height: 44px; border-radius: 12px; background: #eef4f7; color: #0f4c5c; display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem; margin-bottom: 0.1rem; }
            .att-empty h3 { margin: 0; font-size: 1rem; color: #0f172a; font-weight: 700; }
            .att-empty p { margin: 0; color: #64748b; font-size: 0.88rem; max-width: 520px; }
            .att-inline-state { display: flex; align-items: center; justify-content: center; gap: 0.6rem; padding: 1.1rem; color: #475569; font-size: 0.9rem; }
            .att-inline-error { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff8f8; border: 1px solid #fde2e2; color: #991b1b; border-radius: 12px; font-size: 0.88rem; }
            .att-retry-btn { padding: 0.45rem 0.75rem; border-radius: 8px; border: 1px solid #fecaca; background: #fff; color: #991b1b; font-weight: 600; cursor: pointer; }

            .att-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            .att-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 760px; }
            .att-table th { padding: 0.85rem 1rem; text-align: left; font-weight: 700; color: #334155; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
            .att-table td { padding: 0.85rem 1rem; font-size: 0.9rem; color: #0f172a; border-bottom: 1px solid #eef2f6; vertical-align: middle; }
            .att-table tbody tr:hover { background: #f8fbfd; }
            .att-subject-cell { font-weight: 600; color: #0f172a; }
            .att-code-pill { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 7px; background: #f1f5f9; color: #475569; font-size: 0.78rem; font-weight: 700; }
            .att-num { font-weight: 600; color: #334155; }
            .att-present { color: #1f7a34; font-weight: 700; }
            .att-absent { color: #b4232c; font-weight: 700; }
            .att-pct-wrap { display: flex; align-items: center; gap: 0.55rem; min-width: 150px; }
            .att-pct-bar { flex: 1; height: 8px; border-radius: 999px; background: #e8eef4; overflow: hidden; min-width: 70px; }
            .att-pct-fill { height: 100%; border-radius: 999px; }
            .att-pct-val { font-weight: 800; font-size: 0.95rem; min-width: 52px; text-align: right; }
            .att-status-good { display: inline-flex; align-items: center; gap: 0.35rem; color: #1f7a34; font-weight: 700; font-size: 0.85rem; }
            .att-status-low { display: inline-flex; align-items: center; gap: 0.35rem; color: #b4232c; font-weight: 700; font-size: 0.85rem; }
            .att-session-date { font-weight: 600; color: #0f172a; }
            .att-session-sub { font-size: 0.8rem; color: #64748b; margin-top: 0.15rem; }
            .att-record-badge { padding: 0.32rem 0.65rem; border-radius: 999px; font-weight: 700; font-size: 0.78rem; border: 1px solid; display: inline-flex; align-items: center; gap: 0.3rem; }
            .att-record-badge.present { background: rgba(40,167,69,0.12); color: #1f7a34; border-color: rgba(40,167,69,0.2); }
            .att-record-badge.absent { background: rgba(220,53,69,0.1); color: #b4232c; border-color: rgba(220,53,69,0.18); }
            .att-card-footer { padding: 0.9rem 1.2rem; border-top: 1px solid #e9eef4; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
            .att-foot-note { display: inline-flex; align-items: center; gap: 0.5rem; color: #475569; font-size: 0.88rem; }
            .att-btn-secondary { padding: 0.55rem 1rem; border-radius: 10px; border: 1px solid #cbd5e1; background: #fff; color: #0f3a4a; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem; }
            .att-filters-wrap { padding: 1.1rem 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; }
            .att-filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; align-items: end; }
            .att-filter-actions { display: flex; gap: 0.6rem; justify-content: flex-end; flex-wrap: wrap; margin-top: 0.75rem; }
            .att-btn { padding: 0.65rem 1.1rem; border-radius: 10px; font-size: 0.92rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; }
            .att-btn.ghost { background: #fff; border-color: #d7e0ea; color: #334155; }
            .att-btn.primary { background: #1a4b6d; color: #fff; box-shadow: 0 4px 12px rgba(26,75,109,0.25); }
            .att-row-warning { background: #fff8f6; }

            @media (max-width: 1024px) {
              .student-attendance-report-hero-content {
                padding: 1.35rem !important;
                gap: 1rem !important;
              }
              .student-attendance-report-hero-copy h1 {
                font-size: 1.75rem !important;
                line-height: 1.15 !important;
              }
              .student-attendance-report-hero-copy p {
                font-size: 1rem !important;
                line-height: 1.45 !important;
              }
              .att-slot-row { grid-template-columns: 118px 1fr; }
              .att-slot-status { grid-column: 1 / -1; justify-content: flex-start; }
            }

            @media (max-width: 767.98px) {
              .student-attendance-report-hero-content {
                flex-direction: column !important;
                align-items: center !important;
                text-align: center;
                padding: 1.25rem !important;
              }
              .student-attendance-report-hero-copy { width: 100%; }
              .student-attendance-report-hero-copy h1 { font-size: 1.55rem !important; overflow-wrap: anywhere; }
              .student-attendance-report-hero-copy p { margin-top: 0.5rem !important; font-size: 0.9rem !important; }
              .student-attendance-report-hero-actions { width: 100%; justify-content: center; flex-direction: column; }
              .student-attendance-report-hero-actions button { width: 100%; justify-content: center; }
              .att-section-head { padding: 0.9rem 1rem; }
              .att-today-body { padding: 0.85rem; }
              .att-slot-row { grid-template-columns: 1fr; gap: 0.5rem; padding: 0.7rem 0.75rem; }
              .att-slot-time { border-right: none; padding-right: 0; padding-bottom: 0.35rem; border-bottom: 1px dashed #e2e8f0; flex-direction: row; align-items: baseline; gap: 0.5rem; }
              .att-slot-status { justify-content: flex-start; }
              .att-table { min-width: 680px; }
              .att-filter-actions { justify-content: stretch; }
              .att-filter-actions .att-btn { flex: 1; }
              .att-card-footer { flex-direction: column; align-items: stretch; }
              .att-btn-secondary { justify-content: center; }
            }
          `}</style>
          {/* ================= TOAST CONTAINER ================= */}
          <div style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxWidth: '350px'
          }}>
            <AnimatePresence>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  style={{
                    backgroundColor: toast.type === 'success' ? BRAND_COLORS.success.main : 
                                   toast.type === 'error' ? BRAND_COLORS.danger.main : 
                                   BRAND_COLORS.info.main,
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => removeToast(toast.id)}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '4px',
                    background: 'rgba(255, 255, 255, 0.3)'
                  }} />
                  
                  {toast.type === 'success' && <FaCheckCircle size={20} />}
                  {toast.type === 'error' && <FaExclamationTriangle size={20} />}
                  {toast.type === 'info' && <FaInfoCircle size={20} />}
                  
                  <span>{toast.message}</span>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'white',
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                      padding: '4px'
                    }}
                  >
                    <FaTimes />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/student/dashboard" },
              { label: "My Attendance Report" }
            ]}
          />

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="student-attendance-report-hero"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: "white",
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              height: '90px',
            }}
          >
            <div className="student-attendance-report-hero-content" style={{
              padding: '1.2rem 1.75rem',
              background: "linear-gradient(135deg, #0f3a4a 0%, #164e63 100%)",
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
              height: '100px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  style={{
                    width: '52px',
                    height: '52px',
                    minWidth: '52px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.7rem',
                  }}
                >
                  <FaClipboardList />
                </motion.div>
                <div className="student-attendance-report-hero-copy">
                  <h1 style={{
                    margin: 0,
                    fontSize: '1.625rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                  }}>
                    My Attendance Report
                  </h1>
                  <p style={{
                    margin: 0,
                    opacity: 0.8,
                    fontSize: '0.9rem',
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}>
                    Track your attendance across all subjects and sessions
                  </p>
                </div>
              </div>
              <div className="student-attendance-report-hero-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
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

                  aria-expanded={showFilters}
                  aria-label={showFilters ? "Hide filters" : "Apply filters"}
                >
                  <FaFilter aria-hidden="true" /> {showFilters ? 'Hide Filters' : 'Apply Filters'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={refreshData}
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

                  aria-label="Refresh attendance data"
                >
                  <FaSyncAlt aria-hidden="true" /> Refresh
                </motion.button>
              </div>
            </div>
            
            {/* Filters Section */}
            {showFilters && (
              <div className="att-filters-wrap">
                <div className="att-filters-grid">
                  <FormField
                    icon={<FaBook />}
                    label="Subject"
                  >
                    <select
                      name="subjectId"
                      value={filters.subjectId}
                      onChange={handleFilterChange}
                      style={selectStyle}
                    >
                      <option value="">All Subjects</option>
                      {subjects.map(subject => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    icon={<FaCalendarAlt />}
                    label="Start Date"
                  >
                    <input
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      style={inputStyle}
                    />
                  </FormField>

                  <FormField
                    icon={<FaCalendarAlt />}
                    label="End Date"
                  >
                    <input
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      style={inputStyle}
                    />
                  </FormField>
                </div>
                {dateRangeError && (
                  <div className="erp-alert erp-alert-danger" style={{ marginTop: "0.75rem" }}>
                    {dateRangeError}
                  </div>
                )}
                <div className="att-filter-actions">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetFilters}
                    className="att-btn ghost"
                    type="button"
                  >
                    Reset Filters
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={applyFilters}
                    className="att-btn primary"
                    type="button"
                  >
                    Apply Filters
                  </motion.button>
                </div>
              </div>
            )}
            
            {/* Summary Stats */}
            <div style={{
              padding: '1.5rem 2rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem'
            }}>
              <SummaryCard 
                title="Total Lectures" 
                value={summary.totalLectures} 
                icon={<FaUniversity />} 
                color={BRAND_COLORS.primary.main}
                tooltip="Total number of lectures conducted across all subjects"
                onTooltip={handleTooltip}
                onTooltipLeave={handleTooltipLeave}
              />
              <SummaryCard 
                title="Present" 
                value={summary.present} 
                icon={<FaCheckCircle />} 
                color={BRAND_COLORS.success.main}
                tooltip="Number of lectures you attended"
                onTooltip={handleTooltip}
                onTooltipLeave={handleTooltipLeave}
              />
              <SummaryCard 
                title="Absent" 
                value={summary.absent} 
                icon={<FaTimesCircle />} 
                color={BRAND_COLORS.danger.main}
                tooltip="Number of lectures you missed"
                onTooltip={handleTooltip}
                onTooltipLeave={handleTooltipLeave}
              />
              <SummaryCard 
                title="Attendance %" 
                value={`${summary.percentage}%`} 
                icon={<FaChartBar />} 
                color={summary.percentage >= 75 ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main}
                tooltip="Your overall attendance percentage. Minimum 75% required to be eligible for exams."
                onTooltip={handleTooltip}
                onTooltipLeave={handleTooltipLeave}
              />
            </div>
          </motion.div>

          {/* ================= TODAY'S ATTENDANCE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="att-page-section"
          >
            <div className="att-card">
              <div className="att-section-head">
                <div className="att-section-head-left">
                  <h2 className="att-section-title">
                    <FaCalendarAlt /> Today's Attendance
                  </h2>
                  <p className="att-section-sub">{todayDateLabel}</p>
                </div>
                <div className="att-head-meta">
                  <span className="att-chip">
                    <FaClock size={12} /> {todaySchedule.length} scheduled {todaySchedule.length === 1 ? "class" : "classes"}
                  </span>
                  {!todayTimetableLoading && !todayTimetableError && (
                    <span className="att-chip">
                      <FaClipboardList size={12} /> Timetable for today
                    </span>
                  )}
                </div>
              </div>

              <div className="att-today-body">
                {todayTimetableLoading ? (
                  <div className="att-inline-state" role="status" aria-live="polite">
                    <FaSyncAlt className="fa-spin" /> Loading today's timetable...
                  </div>
                ) : todayTimetableError ? (
                  <div className="att-inline-error" role="alert">
                    <span><FaExclamationTriangle /> {todayTimetableError}</span>
                    <button type="button" className="att-retry-btn" onClick={fetchTodayTimetable}>Retry</button>
                  </div>
                ) : todaySchedule.length === 0 ? (
                  <div className="att-empty compact">
                    <div className="att-empty-icon"><FaCalendarAlt /></div>
                    <h3>No classes scheduled today</h3>
                    <p>Your timetable confirms there are no classes scheduled for today.</p>
                  </div>
                ) : (
                  <div className="att-timeline" role="list" aria-label="Today's scheduled classes">
                    {todaySchedule.map((item) => {
                      const status = item.statusInfo;
                      const icon = status.key === "present" ? <FaCheckCircle /> :
                        status.key === "absent" ? <FaTimesCircle /> :
                        status.key === "not-recorded" ? <FaHourglassHalf /> :
                        status.key === "in-progress" ? <FaClock /> : <FaInfoCircle />;
                      return (
                        <div key={item.slotId} className="att-slot-row" role="listitem">
                          <div className="att-slot-time">
                            <span className="att-time-main">
                              {formatTime12HourTT(item.startTime)} – {formatTime12HourTT(item.endTime)}
                            </span>
                            <span className="att-time-sub">{item.endTime ? "Scheduled" : "Time TBD"}</span>
                          </div>
                          <div className="att-slot-main">
                            <div className="att-slot-subject">{item.subject}</div>
                            <div className="att-slot-meta">
                              <span className="att-meta-item"><FaChalkboardTeacher size={12} /> {item.teacher || "Faculty not specified"}</span>
                              <span className="att-meta-item"><FaDoorOpen size={12} /> {item.room || "Room not specified"}</span>
                            </div>
                          </div>
                          <div className="att-slot-status">
                            <span className={`att-badge ${status.tone === "success" ? "present" : status.tone === "danger" ? "absent" : status.key}`}>
                              {icon} {status.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ================= SUBJECT-WISE BREAKDOWN ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            className="att-page-section"
          >
            <div className="att-card">
              <div className="att-section-head">
                <div className="att-section-head-left">
                  <h2 className="att-section-title">
                    <FaBook /> Subject-wise Attendance
                  </h2>
                  <p className="att-section-sub">Performance by subject (75% eligibility threshold)</p>
                </div>
                <div className="att-head-meta">
                  <span className="att-chip"><FaInfoCircle size={12} /> {subjectWise.length} subjects</span>
                </div>
              </div>

              <div className="att-table-wrap">
                <table className="att-table" role="table" aria-label="Subject-wise attendance">
                  <thead>
                    <tr>
                      <th scope="col">Subject</th>
                      <th scope="col">Code</th>
                      <th scope="col">Total</th>
                      <th scope="col">Present</th>
                      <th scope="col">Absent</th>
                      <th scope="col">Percentage</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectWise.map((sub, index) => {
                      const pct = Number(sub.percentage) || 0;
                      const ok = pct >= 75;
                      const fillColor = ok ? BRAND_COLORS.success.main : (pct >= 60 ? BRAND_COLORS.warning.main : BRAND_COLORS.danger.main);
                      return (
                        <motion.tr
                          key={sub._id || `${sub.subject}-${index}`}
                          variants={fadeInVariants}
                          custom={index * 0.03}
                          initial="hidden"
                          animate="visible"
                          className={sub.warning ? "att-row-warning" : ""}
                        >
                          <td><div className="att-subject-cell">{sub.subject}</div></td>
                          <td><span className="att-code-pill">{sub.code || "—"}</span></td>
                          <td className="att-num">{sub.total}</td>
                          <td className="att-present"><FaCheckCircle size={12} style={{ marginRight: 4 }} />{sub.present}</td>
                          <td className="att-absent"><FaTimesCircle size={12} style={{ marginRight: 4 }} />{sub.absent}</td>
                          <td>
                            <div className="att-pct-wrap">
                              <div className="att-pct-bar" aria-hidden="true">
                                <div className="att-pct-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: fillColor }} />
                              </div>
                              <span className="att-pct-val" style={{ color: fillColor }}>{formatPercent(sub.percentage)}%</span>
                            </div>
                          </td>
                          <td>
                            {sub.warning ? (
                              <span className="att-status-low">
                                <FaExclamationTriangle size={14} /> Low Attendance
                                <motion.span
                                  whileHover={{ scale: 1.15 }}
                                  style={{ cursor: "pointer", color: BRAND_COLORS.info.main, fontSize: "0.85rem", marginLeft: 2 }}
                                  onMouseEnter={(e) => handleTooltip(e, "Your attendance is below 75%. Please attend more classes to maintain eligibility for exams.")}
                                  onMouseLeave={handleTooltipLeave}
                                >
                                  <FaQuestionCircle />
                                </motion.span>
                              </span>
                            ) : (
                              <span className="att-status-good"><FaCheckCircle size={14} /> Good</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}

                    {subjectWise.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "2rem 1rem" }}>
                          <div className="att-empty">
                            <div className="att-empty-icon"><FaBook /></div>
                            <h3>No Attendance Data</h3>
                            <p>Attendance records will appear here once classes begin.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="att-card-footer">
                <div className="att-foot-note">
                  <FaLightbulb style={{ color: BRAND_COLORS.warning.main }} aria-hidden="true" />
                  <span><strong>Important:</strong> Minimum 75% attendance required in each subject to be eligible for exams.</span>
                </div>
                <div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDownloadReport}
                    className="att-btn-secondary"
                    aria-label="Download attendance report as PDF"
                    type="button"
                  >
                    <FaDownload size={14} aria-hidden="true" /> Download Report
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= SESSION-WISE REPORT ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={2}
            initial="hidden"
            animate="visible"
            className="att-page-section"
          >
            <div className="att-card">
              <div className="att-section-head">
                <div className="att-section-head-left">
                  <h2 className="att-section-title">
                    <FaClipboardList /> Session-wise Report
                  </h2>
                  <p className="att-section-sub">Detailed attendance records by session</p>
                </div>
                <div className="att-head-meta">
                  <span className="att-chip"><FaInfoCircle size={12} /> {sessions.length} sessions recorded</span>
                </div>
              </div>

              <div className="att-table-wrap">
                <table className="att-table" role="table" aria-label="Session-wise attendance records">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Lecture</th>
                      <th scope="col">Time</th>
                      <th scope="col">Room</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, index) => {
                      const sStatus = String(session.status || "").toUpperCase();
                      const isPresent = sStatus === "PRESENT";
                      const isAbsent = sStatus === "ABSENT";
                      const dateObj = session.date ? new Date(session.date) : null;
                      const validDate = dateObj && !Number.isNaN(dateObj.getTime());
                      return (
                        <motion.tr
                          key={session._id || session.sessionId || `${session.date}-${index}`}
                          variants={fadeInVariants}
                          custom={index * 0.03}
                          initial="hidden"
                          animate="visible"
                        >
                          <td>
                            <div className="att-session-date">
                              {validDate ? dateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : (session.date || "—")}
                            </div>
                            <div className="att-session-sub">
                              {validDate ? dateObj.toLocaleDateString("en-IN") : ""}
                            </div>
                          </td>
                          <td>
                            <div className="att-subject-cell">{session.subject || "—"}</div>
                            <div className="att-session-sub">{session.teacher && session.teacher !== "N/A" ? session.teacher : "Faculty not specified"}</div>
                          </td>
                          <td className="att-num">{session.lectureNumber ? `Lecture ${session.lectureNumber}` : "—"}</td>
                          <td>
                            <div className="att-num">
                              {session.startTime && session.endTime ? `${formatTime12HourTT(session.startTime)} – ${formatTime12HourTT(session.endTime)}` : (session.startTime || "—")}
                            </div>
                          </td>
                          <td><span className="att-code-pill">{session.room && session.room !== "N/A" ? session.room : "N/A"}</span></td>
                          <td>
                            <span className={`att-record-badge ${isPresent ? "present" : isAbsent ? "absent" : ""}`}>
                              {isPresent ? <FaCheckCircle size={12} /> : isAbsent ? <FaTimesCircle size={12} /> : <FaInfoCircle size={12} />}
                              {sStatus || "N/A"}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}

                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "2rem 1rem" }}>
                          <div className="att-empty">
                            <div className="att-empty-icon"><FaClipboardList /></div>
                            <h3>No Attendance Records</h3>
                            <p>Your attendance records will appear here once classes begin.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="att-card-footer" style={{ justifyContent: "center" }}>
                <div className="att-foot-note">
                  <FaInfoCircle style={{ color: BRAND_COLORS.primary.main }} />
                  <span><strong>Tip:</strong> Use filters above to view attendance for specific subjects or date ranges.</span>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* ================= TOOLTIP ================= */}
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'fixed',
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1001,
                maxWidth: '300px',
                fontSize: '0.9rem',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaInfoCircle style={{ color: BRAND_COLORS.primary.main }} />
                <span>{tooltipContent}</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({ icon, label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '0.95rem'
      }}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

/* ================= SUMMARY CARD COMPONENT ================= */
function SummaryCard({ title, value, icon, color, tooltip, onTooltip, onTooltipLeave }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      borderRadius: '16px',
      backgroundColor: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: `1px solid #e2e8f0`,
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        borderRadius: '14px',
        backgroundColor: `${color}10`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        fontSize: '1.5rem',
        flexShrink: 0
      }} aria-hidden="true">
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '0.85rem',
          color: '#64748b',
          fontWeight: 500,
          marginBottom: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem'
        }}>
          {title}
          <motion.span
            whileHover={{ scale: 1.2 }}
            style={{
              cursor: 'pointer',
              color: BRAND_COLORS.info.main,
              fontSize: '0.85rem'
            }}
            onMouseEnter={(e) => onTooltip(e, tooltip)}
            onMouseLeave={onTooltipLeave}
            onMouseMove={(e) => onTooltip(e, tooltip)}
            aria-label={`More information about ${title}`}
            role="button"
            tabIndex={0}
          >
            <FaQuestionCircle aria-hidden="true" />
          </motion.span>
        </div>
        <div style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#0f172a',
          lineHeight: 1
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.875rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  fontSize: '1rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500,
  transition: 'all 0.3s ease'
};

const selectStyle = {
  width: '100%',
  padding: '0.875rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  fontSize: '1rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500,
  appearance: 'none',
  backgroundImage: `url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1.25rem center',
  backgroundSize: '20px',
  transition: 'all 0.3s ease'
};