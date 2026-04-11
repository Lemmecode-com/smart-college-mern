import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { AuthContext } from "../../../../auth/AuthContext";
import Loading from "../../../../components/Loading";
import ApiError from "../../../../components/ApiError";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ConfirmModal from "../../../../components/ConfirmModal";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaArrowLeft,
  FaUniversity,
  FaLayerGroup,
  FaBook,
  FaClock,
  FaLock,
  FaUserShield,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaStar,
  FaLightbulb,
  FaGraduationCap,
  FaShieldAlt,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

/**
 * Format a Date as YYYY-MM-DD using LOCAL date parts (not toISOString which uses UTC).
 * This avoids off-by-one-day issues for timezones ahead of UTC (like IST).
 */
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Parse a YYYY-MM-DD string to a local Date object without timezone shift.
 */
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d); // month is 0-indexed
};

// Brand Color Palette
const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
  },
  info: {
    main: "#17a2b8",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
  },
  warning: {
    main: "#ffc107",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
  },
  danger: {
    main: "#dc3545",
    gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
  },
  secondary: {
    main: "#6c757d",
    gradient: "linear-gradient(135deg, #6c757d 0%, #545b62 100%)",
  },
  slotTypes: {
    LECTURE: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    LAB: { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
    TUTORIAL: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    PRACTICAL: { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  },
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.6, ease: "easeOut" },
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
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" },
  },
};

const scaleVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
  exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2 } },
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_MAP = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Helper function to format time in 12-hour format with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const TIMES = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
];

export default function WeeklyTimetable() {
  const { timetableId } = useParams();
  const navigate = useNavigate();

  // ✅ Validate timetableId - redirect if missing
  useEffect(() => {
    if (!timetableId) {
      toast.error(
        "Timetable ID is required. Redirecting to timetable list...",
        {
          position: "top-right",
          autoClose: 3000,
          icon: <FaExclamationTriangle />,
        },
      );
      setTimeout(() => {
        navigate("/timetable");
      }, 3000);
      return;
    }
  }, [timetableId, navigate]);
  const { user } = useContext(AuthContext);
  const [timetable, setTimetable] = useState(null);
  const [weekly, setWeekly] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isHOD, setIsHOD] = useState(false);
  const [form, setForm] = useState({
    timetable_id: "",
    day: "MON",
    startTime: "",
    endTime: "",
    subject_id: "",
    teacher_id: "",
    room: "",
    slotType: "LECTURE",
  });
  const [showTooltip, setShowTooltip] = useState(null);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoContent, setInfoContent] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    slotId: null,
    title: "Delete Slot?",
    message:
      "Are you sure you want to delete this timetable slot? This action cannot be undone.",
    type: "danger",
  });

  // Date range state for week navigation
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
  const [timetableIdForSchedule, setTimetableIdForSchedule] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false); // Subtle loading for week nav

  /* ================= LOAD WEEKLY ================= */
  useEffect(() => {
    // If no timetableId, fetch teacher's weekly timetable instead
    if (!timetableId) {
      const loadTeacherWeekly = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await api.get("/timetable/weekly");
          setTimetable(res.data.timetable || null);
          setWeekly(res.data.weekly || {});

          if (res.data.timetable) {
            setForm((f) => ({ ...f, timetable_id: res.data.timetable._id }));
          }

          setIsHOD(user?.role === "COLLEGE_ADMIN" || user?.role === "TEACHER");
        } catch (err) {
          const errorMessage =
            err.response?.data?.message ||
            "Failed to load weekly timetable. Please try again.";
          const statusCode = err.response?.status;
          setError({ message: errorMessage, statusCode });
        } finally {
          setLoading(false);
        }
      };

      loadTeacherWeekly();
      return;
    }

    const load = async () => {
      // ✅ Don't load if timetableId is missing
      if (!timetableId) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/timetable/${timetableId}/weekly`);
        setTimetable(res.data.timetable);
        setWeekly(res.data.weekly || {});
        setForm((f) => ({ ...f, timetable_id: res.data.timetable._id }));

        // Set HOD status based on user role
        setIsHOD(user?.role === "COLLEGE_ADMIN" || user?.role === "TEACHER");

        const [subRes, teachRes] = await Promise.all([
          api.get(`/subjects/course/${res.data.timetable.course_id}`),
          api.get(`/teachers/department/${res.data.timetable.department_id}`),
        ]);

        setSubjects(subRes.data.subjects || subRes.data || []);
        setTeachers(teachRes.data.teachers || teachRes.data || []);
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          "Failed to load weekly timetable. Please try again.";
        const statusCode = err.response?.status;
        setError({ message: errorMessage, statusCode });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [timetableId, user]);

  // Handle retry action
  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);

    try {
      if (!timetableId) {
        const res = await api.get("/timetable/weekly");
        setTimetable(res.data.timetable || null);
        setWeekly(res.data.weekly || {});
        if (res.data.timetable) {
          setForm((f) => ({ ...f, timetable_id: res.data.timetable._id }));
        }
      } else {
        const res = await api.get(`/timetable/${timetableId}/weekly`);
        setTimetable(res.data.timetable);
        setWeekly(res.data.weekly || {});
        setForm((f) => ({ ...f, timetable_id: res.data.timetable._id }));

        const [subRes, teachRes] = await Promise.all([
          api.get(`/subjects/course/${res.data.timetable.course_id}`),
          api.get(`/teachers/department/${res.data.timetable.department_id}`),
        ]);
        setSubjects(subRes.data.subjects || subRes.data || []);
        setTeachers(teachRes.data.teachers || teachRes.data || []);
      }
      setError(null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        "Failed to load weekly timetable. Please try again.";
      const statusCode = err.response?.status;
      setError({ message: errorMessage, statusCode });
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  // Handle go back action
  const handleGoBack = () => {
    navigate(-1);
  };

  /* ================= REFRESH WEEKLY ================= */
  const refreshWeekly = async () => {
    try {
      if (!timetableId) {
        const res = await api.get("/timetable/weekly");
        setTimetable(res.data.timetable || null);
        setWeekly(res.data.weekly || {});
        if (res.data.timetable) {
          setForm((f) => ({ ...f, timetable_id: res.data.timetable._id }));
        }
      } else {
        const res = await api.get(`/timetable/${timetableId}/weekly`);
        setTimetable(res.data.timetable);
        setWeekly(res.data.weekly || {});
        setForm((f) => ({ ...f, timetable_id: res.data.timetable._id }));

        const [subRes, teachRes] = await Promise.all([
          api.get(`/subjects/course/${res.data.timetable.course_id}`),
          api.get(`/teachers/department/${res.data.timetable.department_id}`),
        ]);
        setSubjects(subRes.data.subjects || subRes.data || []);
        setTeachers(teachRes.data.teachers || teachRes.data || []);
      }
    } catch (err) {
      console.error("Failed to refresh weekly timetable:", err);
    }
  };

  /* ================= FETCH SCHEDULE FOR DATE RANGE ================= */
  const fetchScheduleForDateRange = async (startDate, endDate) => {
    if (!timetableId && !timetableIdForSchedule) {
      // No timetable ID available — fall back to static weekly
      await refreshWeekly();
      return;
    }

    const effectiveTimetableId = timetableId || timetableIdForSchedule;

    try {
      setIsNavigating(true);
      setLoading(true);
      setError(null);

      const res = await api.get(`/timetable/${effectiveTimetableId}/schedule`, {
        params: { startDate, endDate },
      });

      const scheduleObj = res.data?.data || {};
      const schedule = scheduleObj.schedule || [];
      const timetableData = scheduleObj.timetable || null;

      if (timetableData) {
        setTimetable(timetableData);
        // Update form timetable_id if not already set
        if (!form.timetable_id) {
          setForm((f) => ({ ...f, timetable_id: timetableData._id }));
        }
      }

      if (schedule && schedule.length > 0) {
        // Convert schedule format to weekly format (MON-SAT grid)
        const weeklyData = {
          MON: [],
          TUE: [],
          WED: [],
          THU: [],
          FRI: [],
          SAT: [],
        };

        schedule.forEach((daySchedule) => {
          if (daySchedule.slots && daySchedule.slots.length > 0) {
            const date = parseLocalDate(daySchedule.date);
            const dayName = DAY_MAP[date.getDay()];

            if (weeklyData[dayName]) {
              const slotsWithContext = daySchedule.slots.map((slot) => ({
                ...slot,
                exceptionDate: daySchedule.date,
                isHolidayOnly: daySchedule.isHoliday || false,
              }));
              weeklyData[dayName].push(...slotsWithContext);
            }
          }
        });

        setWeekly(weeklyData);
      } else {
        // No schedule for this date range — show empty grid
        setWeekly({ MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [] });
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        "Failed to load schedule. Please try again.";
      console.error("Schedule fetch error:", err);
      // On error, fall back to static weekly
      await refreshWeekly();
    } finally {
      setLoading(false);
      setIsNavigating(false);
    }
  };

  /* ================= WEEK NAVIGATION ================= */
  const goToPreviousWeek = async () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() - 7);
    const newStartStr = toLocalDateStr(start);
    const newEndStr = toLocalDateStr(end);
    setDateRange({ startDate: newStartStr, endDate: newEndStr });
    await fetchScheduleForDateRange(newStartStr, newEndStr);
  };

  const goToNextWeek = async () => {
    const start = new Date(dateRange.startDate.replace(/-/g, "/"));
    start.setDate(start.getDate() + 7);
    const end = new Date(dateRange.endDate.replace(/-/g, "/"));
    end.setDate(end.getDate() + 7);
    const newStartStr = toLocalDateStr(start);
    const newEndStr = toLocalDateStr(end);
    setDateRange({ startDate: newStartStr, endDate: newEndStr });
    await fetchScheduleForDateRange(newStartStr, newEndStr);
  };

  const goToCurrentWeek = async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const newStartStr = toLocalDateStr(monday);
    const newEndStr = toLocalDateStr(sunday);
    setDateRange({ startDate: newStartStr, endDate: newEndStr });
    await fetchScheduleForDateRange(newStartStr, newEndStr);
  };

  const formatDateRange = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const endYear = end.toLocaleDateString("en-US", { year: "numeric" });

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${endYear}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${endYear}`;
  };

  /* ================= AUTO SET TEACHER ================= */
  useEffect(() => {
    if (!form.subject_id) return;
    const subject = subjects.find((s) => s._id === form.subject_id);
    if (subject?.teacher_id?._id) {
      setForm((prev) => ({ ...prev, teacher_id: subject.teacher_id._id }));
    }
  }, [form.subject_id, subjects]);

  /* ================= ACTIONS ================= */
  const openCreate = (day, time) => {
    setEditSlot(null);
    setForm({
      timetable_id: timetable?._id || "",
      day,
      startTime: time.start,
      endTime: time.end,
      subject_id: "",
      teacher_id: "",
      room: "",
      slotType: "LECTURE",
    });
    setShowModal(true);
  };

  const openEdit = (slot, day) => {
    setEditSlot(slot);
    setForm({
      timetable_id: timetable?._id || "",
      day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject_id: slot.subject_id?._id || "",
      teacher_id: slot.teacher_id?._id || "",
      room: slot.room || "",
      slotType: slot.slotType || "LECTURE",
    });
    setShowModal(true);
  };

  const submitSlot = async () => {
    if (!form.subject_id) {
      setError("Please select a subject");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (editSlot) {
        await api.put(`/timetable/slot/${editSlot._id}`, form);
      } else {
        await api.post("/timetable/slot", form);
      }

      setShowModal(false);
      toast.success(
        editSlot ? "Slot updated successfully!" : "Slot added successfully!",
        {
          position: "top-right",
          autoClose: 3000,
          icon: <FaCheckCircle />,
        },
      );
      await refreshWeekly();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Cannot modify published timetable or only HOD has access.";
      setError(errorMsg);
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const showDeleteConfirm = (slotId) => {
    setConfirmModal({
      isOpen: true,
      slotId: slotId,
      title: "Delete Slot?",
      message:
        "Are you sure you want to delete this timetable slot? This action cannot be undone.",
      type: "danger",
    });
  };

  const confirmDeleteSlot = async () => {
    try {
      await api.delete(`/timetable/slot/${confirmModal.slotId}`);
      toast.success("Slot deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />,
      });
      await refreshWeekly();
      setConfirmModal({ ...confirmModal, slotId: null, isOpen: false });
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Delete failed. Only HOD can delete slots or timetable may be published.";
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
    }
  };

  /* ================= INFO TOOLTIP ================= */
  const handleTooltip = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipContent(content);
    setTooltipPosition({
      top: rect.top + window.scrollY + 30,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setShowTooltip(true);
  };

  const handleTooltipLeave = () => {
    setShowTooltip(false);
  };

  /* ================= INFO MODAL ================= */
  const openInfoModal = (content) => {
    setInfoContent(content);
    setShowInfoModal(true);
  };

  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Timetable..." />;
  }

  if (error) {
    return (
      <ApiError
        title="Error Loading Timetable"
        message={error.message || "Failed to load timetable. Please try again."}
        statusCode={error.statusCode}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
        retryCount={retryCount}
        maxRetry={3}
        isRetryLoading={isRetrying}
      />
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
          paddingBottom: "2rem",
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
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: BRAND_COLORS.primary.main,
                background: "none",
                border: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                cursor: "pointer",
                padding: "0.5rem",
                borderRadius: "8px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f1f5f9")}
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "transparent")
              }
            >
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: "#94a3b8" }}>›</span>
            <span
              style={{
                color: BRAND_COLORS.primary.main,
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              Weekly Timetable
            </span>
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
                    {timetable?.name || "Weekly Timetable"}
                  </h1>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5rem",
                      flexWrap: "wrap",
                      marginTop: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FaUniversity />
                      <span style={{ opacity: 0.9 }}>
                        Semester {timetable?.semester}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <FaClock />
                      <span style={{ opacity: 0.9 }}>
                        {timetable?.academicYear}
                      </span>
                    </div>
                    {timetable?.department_id?.name && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <FaLayerGroup />
                        <span style={{ opacity: 0.9 }}>
                          {timetable?.department_id?.name}
                        </span>
                      </div>
                    )}
                    <motion.div
                      style={{
                        padding: "0.375rem 1rem",
                        borderRadius: "20px",
                        backgroundColor:
                          timetable?.status === "PUBLISHED"
                            ? `${BRAND_COLORS.success.main}20`
                            : `${BRAND_COLORS.warning.main}20`,
                        color:
                          timetable?.status === "PUBLISHED"
                            ? BRAND_COLORS.success.main
                            : BRAND_COLORS.warning.main,
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        border: `1px solid ${timetable?.status === "PUBLISHED" ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main}40`,
                      }}
                    >
                      {timetable?.status === "PUBLISHED" ? (
                        <FaCheckCircle size={14} />
                      ) : (
                        <FaLock size={14} />
                      )}
                      {timetable?.status}
                    </motion.div>
                  </div>
                </div>
              </div>
              {isHOD && (
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 8px 20px rgba(26, 75, 109, 0.4)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/timetable/create-timetable`)}
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
              )}
            </div>

            {/* Info Banner */}
            <div
              style={{
                padding: "1rem 2rem",
                backgroundColor:
                  timetable?.status === "PUBLISHED" ? "#dcfce7" : "#ffedd5",
                borderTop: "1px solid",
                borderColor:
                  timetable?.status === "PUBLISHED" ? "#bbf7d0" : "#fed7aa",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flex: 1,
                }}
              >
                <FaInfoCircle
                  style={{
                    color:
                      timetable?.status === "PUBLISHED"
                        ? BRAND_COLORS.success.main
                        : BRAND_COLORS.warning.main,
                    fontSize: "1.25rem",
                  }}
                />
                <span style={{ color: "#1e293b", fontWeight: 500 }}>
                  {timetable?.status === "PUBLISHED"
                    ? "This timetable is published and visible to students. Only HOD can modify it."
                    : "This timetable is in draft mode. Complete it and publish when ready."}
                </span>
              </div>
              {isHOD && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    backgroundColor:
                      timetable?.status === "PUBLISHED" ? "#bbf7d0" : "#fed7aa",
                    color:
                      timetable?.status === "PUBLISHED" ? "#166534" : "#92400e",
                    padding: "0.375rem 1rem",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  <FaUserShield size={14} />
                  HOD Access: {isHOD ? "Enabled" : "Restricted"}
                </div>
              )}
            </div>
          </motion.div>

          {/* ================= TIMETABLE GRID ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: "white",
              borderRadius: "1.5rem",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Subtle loading overlay during week navigation */}
            {isNavigating && (
              <div className="wt-navigating-overlay">
                <FaSyncAlt className="wt-navigating-spinner" />
                <span>Loading timetable...</span>
              </div>
            )}
            <div
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <FaCalendarAlt style={{ color: BRAND_COLORS.primary.main }} />{" "}
                Weekly Schedule
              </h2>
              <div className="d-flex align-items-center gap-2">
                {/* Week Navigation */}
                <button
                  onClick={goToPreviousWeek}
                  className="btn btn-sm btn-outline-secondary"
                  title="Previous Week"
                >
                  <FaArrowLeft size={12} />
                </button>
                <button
                  onClick={goToCurrentWeek}
                  className="btn btn-sm btn-primary"
                >
                  <FaCalendarAlt size={12} /> Current Week
                </button>
                <button
                  onClick={goToNextWeek}
                  className="btn btn-sm btn-outline-secondary"
                  title="Next Week"
                >
                  <FaArrowLeft
                    size={12}
                    style={{ transform: "rotate(180deg)" }}
                  />
                </button>
                <span
                  className="text-muted fw-medium small ms-2"
                  style={{ fontSize: "0.85rem" }}
                >
                  {formatDateRange()}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#dbeafe",
                  color: BRAND_COLORS.primary.main,
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                <FaInfoCircle /> {Object.values(weekly).flat().length} slots
                scheduled
              </div>
            </div>
            <div className="table-responsive">
              <table
                className="table table-bordered align-middle mb-0"
                style={{ minWidth: "900px" }}
              >
                <thead className="table-light">
                  <tr>
                    <th
                      className="py-3 px-3 fw-semibold text-center"
                      style={headerCellStyle}
                    >
                      Time
                    </th>
                    {DAYS.map((day, idx) => (
                      <th
                        key={day}
                        className="py-3 px-3 fw-semibold text-center position-relative"
                        style={{ ...headerCellStyle, overflow: "hidden" }}
                      >
                        <div>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            {day}
                            <motion.span
                              whileHover={{ scale: 1.2 }}
                              className="text-info"
                              style={{ cursor: "pointer", fontSize: "0.85rem" }}
                              onMouseEnter={(e) =>
                                handleTooltip(
                                  e,
                                  `${DAY_NAMES[idx]} is day ${idx + 1} of the academic week. Timetable slots for ${DAY_NAMES[idx]} are displayed in this column.`,
                                )
                              }
                              onMouseLeave={handleTooltipLeave}
                            >
                              <FaInfoCircle />
                            </motion.span>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMES.map((timeSlot, timeIdx) => (
                    <motion.tr
                      key={timeSlot.start}
                      variants={fadeInVariants}
                      custom={timeIdx + 1}
                      initial="hidden"
                      animate="visible"
                      className="bg-white"
                    >
                      <td
                        className="py-3 px-3 fw-semibold border-end"
                        style={{ color: "#1e293b", fontSize: "0.95rem" }}
                      >
                        {formatTime12Hour(timeSlot.start)} -{" "}
                        {formatTime12Hour(timeSlot.end)}
                      </td>
                      {DAYS.map((day) => {
                        const slots = weekly[day] || [];
                        const slot = slots.find(
                          (s) =>
                            s.startTime === timeSlot.start &&
                            s.endTime === timeSlot.end,
                        );
                        return (
                          <td
                            key={`${day}-${timeSlot.start}`}
                            className="py-2 px-2 align-top"
                            style={{
                              ...cellStyle,
                              padding: "0.5rem",
                              backgroundColor: slot ? "white" : "#f8fafc",
                              borderLeft: slot
                                ? `3px solid ${BRAND_COLORS.primary.main}`
                                : "1px solid #e2e8f0",
                            }}
                          >
                            {slot ? (
                              <TimetableSlot
                                slot={slot}
                                isHOD={isHOD}
                                onEdit={() => openEdit(slot, day)}
                                onDelete={() => showDeleteConfirm(slot._id)}
                                handleTooltip={handleTooltip}
                                handleTooltipLeave={handleTooltipLeave}
                              />
                            ) : isHOD ? (
                              <AddSlotButton
                                onClick={() => openCreate(day, timeSlot)}
                                time={timeSlot}
                                day={day}
                                handleTooltip={handleTooltip}
                                handleTooltipLeave={handleTooltipLeave}
                              />
                            ) : (
                              <div
                                style={{
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#cbd5e1",
                                  fontSize: "2rem",
                                }}
                              >
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div
              style={{
                padding: "1.5rem",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                flexWrap: "wrap",
                gap: "1.5rem",
                justifyContent: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    backgroundColor: BRAND_COLORS.slotTypes.LECTURE.bg,
                    border: `1px solid ${BRAND_COLORS.slotTypes.LECTURE.border}`,
                  }}
                />
                <span style={{ fontSize: "0.85rem", color: "#4a5568" }}>
                  Lecture
                </span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: "pointer",
                    color: BRAND_COLORS.info.main,
                    fontSize: "0.85rem",
                  }}
                  onMouseEnter={(e) =>
                    handleTooltip(
                      e,
                      "Lecture slots are for theoretical instruction. They typically involve the teacher presenting concepts to students in a classroom setting.",
                    )
                  }
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaInfoCircle />
                </motion.span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    backgroundColor: BRAND_COLORS.slotTypes.LAB.bg,
                    border: `1px solid ${BRAND_COLORS.slotTypes.LAB.border}`,
                  }}
                />
                <span style={{ fontSize: "0.85rem", color: "#4a5568" }}>
                  Lab
                </span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: "pointer",
                    color: BRAND_COLORS.info.main,
                    fontSize: "0.85rem",
                  }}
                  onMouseEnter={(e) =>
                    handleTooltip(
                      e,
                      "Lab slots are for hands-on practical sessions. They typically involve students working with equipment or software in a lab environment.",
                    )
                  }
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaInfoCircle />
                </motion.span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    backgroundColor: BRAND_COLORS.slotTypes.TUTORIAL.bg,
                    border: `1px solid ${BRAND_COLORS.slotTypes.TUTORIAL.border}`,
                  }}
                />
                <span style={{ fontSize: "0.85rem", color: "#4a5568" }}>
                  Tutorial
                </span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: "pointer",
                    color: BRAND_COLORS.info.main,
                    fontSize: "0.85rem",
                  }}
                  onMouseEnter={(e) =>
                    handleTooltip(
                      e,
                      "Tutorial slots are for small-group discussions and problem-solving sessions. They typically involve guided learning with the teacher.",
                    )
                  }
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaInfoCircle />
                </motion.span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    backgroundColor: BRAND_COLORS.slotTypes.PRACTICAL.bg,
                    border: `1px solid ${BRAND_COLORS.slotTypes.PRACTICAL.border}`,
                  }}
                />
                <span style={{ fontSize: "0.85rem", color: "#4a5568" }}>
                  Practical
                </span>
                <motion.span
                  whileHover={{ scale: 1.2 }}
                  style={{
                    cursor: "pointer",
                    color: BRAND_COLORS.info.main,
                    fontSize: "0.85rem",
                  }}
                  onMouseEnter={(e) =>
                    handleTooltip(
                      e,
                      "Practical slots are for real-world application of concepts. They typically involve students working on projects or experiments.",
                    )
                  }
                  onMouseLeave={handleTooltipLeave}
                >
                  <FaInfoCircle />
                </motion.span>
              </div>
              {isHOD && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: BRAND_COLORS.primary.main,
                      border: "2px dashed white",
                      boxShadow: "0 0 0 2px #1a4b6d",
                    }}
                  />
                  <span style={{ fontSize: "0.85rem", color: "#4a5568" }}>
                    Click to add slot (HOD only)
                  </span>
                  <motion.span
                    whileHover={{ scale: 1.2 }}
                    style={{
                      cursor: "pointer",
                      color: BRAND_COLORS.info.main,
                      fontSize: "0.85rem",
                    }}
                    onMouseEnter={(e) =>
                      handleTooltip(
                        e,
                        "Only HODs can add new slots to published timetables. For draft timetables, all teachers can add slots.",
                      )
                    }
                    onMouseLeave={handleTooltipLeave}
                  >
                    <FaInfoCircle />
                  </motion.span>
                </div>
              )}
            </div>
          </motion.div>

          {/* ================= MODAL ================= */}
          <AnimatePresence>
            {showModal && (
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
                onClick={() => setShowModal(false)}
              >
                <motion.div
                  variants={scaleVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
                    width: "100%",
                    maxWidth: "500px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: "1.75rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        {editSlot ? <FaEdit /> : <FaPlus />}
                        {editSlot
                          ? "Edit Timetable Slot"
                          : "Add New Timetable Slot"}
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowModal(false)}
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
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#f1f5f9")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                      >
                        &times;
                      </motion.button>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
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
                        <FaTimesCircle size={20} />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                      }}
                    >
                      <FormField label="Subject" icon={<FaBook />}>
                        <select
                          value={form.subject_id}
                          onChange={(e) =>
                            setForm({ ...form, subject_id: e.target.value })
                          }
                          style={inputStyle}
                        >
                          <option value="">Select subject</option>
                          {subjects.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </FormField>

                      <FormField
                        label="Assigned Teacher"
                        icon={<FaChalkboardTeacher />}
                      >
                        <input
                          type="text"
                          value={
                            teachers.find((t) => t._id === form.teacher_id)
                              ?.name ||
                            "Select a subject to auto-assign teacher"
                          }
                          disabled
                          style={{
                            ...inputStyle,
                            backgroundColor: form.teacher_id
                              ? "#f0fdf4"
                              : "#f8fafc",
                            color: form.teacher_id
                              ? BRAND_COLORS.success.main
                              : "#94a3b8",
                            fontWeight: form.teacher_id ? 600 : 400,
                            fontStyle: form.teacher_id ? "normal" : "italic",
                          }}
                        />
                      </FormField>

                      <FormField label="Room Number" icon={<FaDoorOpen />}>
                        <input
                          type="text"
                          placeholder="e.g., A-101, Lab-2"
                          value={form.room}
                          onChange={(e) =>
                            setForm({ ...form, room: e.target.value })
                          }
                          style={inputStyle}
                        />
                      </FormField>

                      <FormField label="Slot Type" icon={<FaLayerGroup />}>
                        <select
                          value={form.slotType}
                          onChange={(e) =>
                            setForm({ ...form, slotType: e.target.value })
                          }
                          style={inputStyle}
                        >
                          <option value="LECTURE">Lecture</option>
                          <option value="LAB">Lab</option>
                          <option value="TUTORIAL">Tutorial</option>
                          <option value="PRACTICAL">Practical</option>
                        </select>
                      </FormField>

                      <div
                        style={{
                          padding: "1rem",
                          borderRadius: "12px",
                          backgroundColor: "#dbeafe",
                          border: "1px solid #93c5fd",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <FaInfoCircle
                          style={{
                            color: BRAND_COLORS.primary.main,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: "0.9rem", color: "#1e293b" }}>
                          <strong>Time:</strong> {form.startTime} -{" "}
                          {form.endTime} • <strong>Day:</strong> {form.day}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        marginTop: "1.5rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowModal(false)}
                        style={{
                          padding: "0.75rem 1.5rem",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "white",
                          color: "#1e293b",
                          fontSize: "1rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                        }}
                      >
                        Cancel
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={submitSlot}
                        disabled={submitting || !form.subject_id}
                        style={{
                          padding: "0.75rem 1.5rem",
                          borderRadius: "12px",
                          border: "none",
                          backgroundColor:
                            !form.subject_id || submitting
                              ? "#cbd5e1"
                              : BRAND_COLORS.primary.main,
                          color: "white",
                          fontSize: "1rem",
                          fontWeight: 600,
                          cursor:
                            !form.subject_id || submitting
                              ? "not-allowed"
                              : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          transition: "all 0.3s ease",
                          boxShadow:
                            !form.subject_id || submitting
                              ? "none"
                              : "0 4px 15px rgba(26, 75, 109, 0.3)",
                        }}
                      >
                        {submitting ? (
                          <>
                            <motion.div
                              variants={spinVariants}
                              animate="animate"
                            >
                              <FaSyncAlt size={16} />
                            </motion.div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaCheckCircle />{" "}
                            {editSlot ? "Update Slot" : "Add Slot"}
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= INFO TOOLTIP ================= */}
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: "fixed",
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: "translateX(-50%)",
                backgroundColor: "white",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                zIndex: 1001,
                maxWidth: "300px",
                fontSize: "0.9rem",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FaInfoCircle style={{ color: BRAND_COLORS.primary.main }} />
                <span>{tooltipContent}</span>
              </div>
            </motion.div>
          )}

          {/* ================= INFO MODAL ================= */}
          <AnimatePresence>
            {showInfoModal && (
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
                  zIndex: 1001,
                  padding: "1rem",
                }}
                onClick={() => setShowInfoModal(false)}
              >
                <motion.div
                  variants={scaleVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
                    width: "100%",
                    maxWidth: "500px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: "1.75rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <FaInfoCircle /> Information
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowInfoModal(false)}
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
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#f1f5f9")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                      >
                        &times;
                      </motion.button>
                    </div>

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
                          marginBottom: "0.75rem",
                        }}
                      >
                        <FaLightbulb
                          style={{ color: BRAND_COLORS.warning.main }}
                        />
                        <h4
                          style={{
                            margin: 0,
                            color: "#1e293b",
                            fontWeight: 600,
                          }}
                        >
                          Timetable Information
                        </h4>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "#4a5568",
                          lineHeight: 1.6,
                        }}
                      >
                        {infoContent}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ================= TOAST CONTAINER ================= */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* ================= CONFIRM MODAL ================= */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({
            isOpen: false,
            slotId: null,
            title: "",
            message: "",
            type: "danger",
          })
        }
        onConfirm={confirmDeleteSlot}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
        isLoading={submitting}
      />

      {/* ================= NAVIGATION LOADING OVERLAY CSS ================= */}
      <style>{`
        .wt-navigating-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          z-index: 10;
          border-radius: 1.5rem;
          color: #1a4b6d;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .wt-navigating-spinner {
          animation: wt-spin 1s linear infinite;
          font-size: 1.25rem;
        }
        @keyframes wt-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD ================= */
function FormField({ label, icon, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontWeight: 600,
          color: "#1e293b",
          fontSize: "0.95rem",
        }}
      >
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

/* ================= TIMETABLE SLOT ================= */
function TimetableSlot({
  slot,
  isHOD,
  onEdit,
  onDelete,
  handleTooltip,
  handleTooltipLeave,
}) {
  const slotType =
    BRAND_COLORS.slotTypes[slot.slotType] || BRAND_COLORS.slotTypes.LECTURE;

  // Check for exception status
  const exception = slot.exception;
  const isCancelled =
    slot.status === "CANCELLED" || exception?.type === "CANCELLED";
  const isExtra = slot.status === "EXTRA" || exception?.type === "EXTRA";
  const isRescheduled =
    slot.status === "RESCHEDULED" || exception?.type === "RESCHEDULED";
  const isHoliday = slot.status === "HOLIDAY" || exception?.type === "HOLIDAY";

  // Adjust colors based on exception
  let adjustedBg = slotType.bg;
  let adjustedText = slotType.text;
  let adjustedBorder = slotType.border;
  let borderColor = slotType.border;

  if (isCancelled) {
    adjustedBg = "#fee2e2";
    adjustedText = "#dc2626";
    adjustedBorder = "#fecaca";
    borderColor = "#dc2626";
  } else if (isExtra) {
    adjustedBg = "#dcfce7";
    adjustedText = "#16a34a";
    adjustedBorder = "#bbf7d0";
    borderColor = "#16a34a";
  } else if (isRescheduled) {
    adjustedBg = "#dbeafe";
    adjustedText = "#2563eb";
    adjustedBorder = "#bfdbfe";
    borderColor = "#2563eb";
  } else if (isHoliday) {
    adjustedBg = "#fef2f2";
    adjustedText = "#dc2626";
    adjustedBorder = "#fecaca";
    borderColor = "#dc2626";
  }

  return (
    <motion.div
      whileHover={{
        y: -2,
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
        scale: 1.02,
      }}
      style={{
        backgroundColor: adjustedBg,
        border: `1px solid ${adjustedBorder}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "12px",
        padding: "0.875rem",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
        opacity: isCancelled || isHoliday ? 0.7 : 1,
        textDecoration: isCancelled ? "line-through" : "none",
      }}
    >
      {/* Exception Badges */}
      {(isCancelled || isExtra || isRescheduled || isHoliday) && (
        <div className="mb-1">
          {isCancelled && (
            <span
              className="badge bg-danger me-1 mb-1"
              style={{ fontSize: "0.65rem" }}
            >
              <FaExclamationTriangle size={8} className="me-1" />
              CANCELLED
            </span>
          )}
          {isExtra && (
            <span
              className="badge bg-success me-1 mb-1"
              style={{ fontSize: "0.65rem" }}
            >
              <FaCheckCircle size={8} className="me-1" />
              EXTRA
            </span>
          )}
          {isRescheduled && (
            <span
              className="badge bg-primary me-1 mb-1"
              style={{ fontSize: "0.65rem" }}
            >
              <FaCalendarAlt size={8} className="me-1" />
              RESCHEDULED
            </span>
          )}
          {isHoliday && (
            <span
              className="badge bg-danger me-1 mb-1"
              style={{ fontSize: "0.65rem" }}
            >
              <FaCalendarAlt size={8} className="me-1" />
              HOLIDAY
            </span>
          )}
        </div>
      )}

      <div
        style={{
          fontWeight: 700,
          color: adjustedText,
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
        }}
      >
        <FaBook size={14} />
        {slot.subject_id?.name || "Subject not assigned"}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
          fontSize: "0.8rem",
          color: "#64748b",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <FaChalkboardTeacher size={12} />
          {slot.teacher_id?.name || "Teacher not assigned"}
          <motion.span
            whileHover={{ scale: 1.2 }}
            style={{
              cursor: "pointer",
              color: BRAND_COLORS.info.main,
              fontSize: "0.85rem",
            }}
            onMouseEnter={(e) =>
              handleTooltip(
                e,
                "The teacher assigned to this subject. Click to view teacher details or contact information.",
              )
            }
            onMouseLeave={handleTooltipLeave}
          >
            <FaInfoCircle />
          </motion.span>
        </span>
        {slot.room && (
          <span
            style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <FaDoorOpen size={12} />
            Room {slot.room}
            <motion.span
              whileHover={{ scale: 1.2 }}
              style={{
                cursor: "pointer",
                color: BRAND_COLORS.info.main,
                fontSize: "0.85rem",
              }}
              onMouseEnter={(e) =>
                handleTooltip(
                  e,
                  "The room where this class will be held. Click to view room details or location on campus map.",
                )
              }
              onMouseLeave={handleTooltipLeave}
            >
              <FaInfoCircle />
            </motion.span>
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.375rem",
          marginTop: "0.25rem",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.625rem",
            borderRadius: "6px",
            backgroundColor: adjustedBg,
            color: adjustedText,
            fontSize: "0.75rem",
            fontWeight: 600,
            border: `1px solid ${adjustedBorder}`,
          }}
        >
          <FaLayerGroup size={10} />
          {slot.slotType}
        </span>
      </div>

      {/* Exception Reason */}
      {exception?.reason && (
        <div
          style={{
            padding: "0.375rem 0.5rem",
            borderRadius: "6px",
            backgroundColor: isCancelled
              ? "#fee2e2"
              : isExtra
                ? "#dcfce7"
                : isRescheduled
                  ? "#dbeafe"
                  : "#fef2f2",
            border: `1px solid ${isCancelled ? "#fecaca" : isExtra ? "#bbf7d0" : isRescheduled ? "#bfdbfe" : "#fecaca"}`,
            fontSize: "0.7rem",
            color: adjustedText,
            marginTop: "0.25rem",
          }}
        >
          <FaInfoCircle size={8} className="me-1" />
          {exception.reason}
          {exception.rescheduledTo && (
            <span className="ms-1 fw-bold">
              →{" "}
              {new Date(exception.rescheduledTo).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {isHOD && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "0.5rem",
            paddingTop: "0.5rem",
            borderTop: "1px dashed #e2e8f0",
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "white",
              color: BRAND_COLORS.primary.main,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              transition: "all 0.2s ease",
            }}
          >
            <FaEdit size={14} /> Edit
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              backgroundColor: "#fee2e2",
              color: BRAND_COLORS.danger.main,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              transition: "all 0.2s ease",
            }}
          >
            <FaTrash size={14} /> Delete
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ================= ADD SLOT BUTTON ================= */
function AddSlotButton({
  onClick,
  time,
  day,
  handleTooltip,
  handleTooltipLeave,
}) {
  return (
    <motion.button
      whileHover={{
        scale: 1.05,
        backgroundColor: "#dbeafe",
        transform: "translateY(-3px)",
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        width: "100%",
        height: "100%",
        border: "2px dashed #93c5fd",
        borderRadius: "12px",
        backgroundColor: "#eff6ff",
        color: BRAND_COLORS.primary.main,
        fontSize: "2.5rem",
        fontWeight: 300,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        transition: "all 0.3s ease",
        padding: "0.5rem",
      }}
    >
      <FaPlus size={24} />
      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: 500,
          marginTop: "-0.5rem",
        }}
      >
        Add Slot
      </span>
      <motion.div
        whileHover={{ scale: 1.2 }}
        style={{
          cursor: "pointer",
          color: BRAND_COLORS.info.main,
          fontSize: "0.85rem",
          position: "absolute",
          bottom: "8px",
          right: "8px",
        }}
        onMouseEnter={(e) =>
          handleTooltip(
            e,
            "Click to add a new timetable slot for this time period. Only HODs can add slots to published timetables.",
          )
        }
        onMouseLeave={handleTooltipLeave}
      >
        <FaInfoCircle size={16} />
      </motion.div>
    </motion.button>
  );
}

/* ================= STYLES ================= */
const headerCellStyle = {
  padding: "1rem",
  textAlign: "center",
  fontWeight: 700,
  color: "#1e293b",
  fontSize: "0.9rem",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  position: "sticky",
  top: 0,
  zIndex: 10,
  backgroundColor: "#f1f5f9",
};

const cellStyle = {
  padding: "0.75rem",
  fontSize: "0.95rem",
  color: "#1e293b",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "middle",
  minWidth: "150px",
};

const inputStyle = {
  width: "100%",
  padding: "0.875rem 1.25rem",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  fontSize: "1rem",
  backgroundColor: "white",
  color: "#1e293b",
  fontWeight: 500,
};
