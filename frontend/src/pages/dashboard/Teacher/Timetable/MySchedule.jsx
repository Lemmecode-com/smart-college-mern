import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaPlay,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaClock,
  FaUniversity,
  FaLayerGroup,
  FaBook,
  FaArrowLeft,
  FaBell,
  FaSun,
  FaPauseCircle,
  FaHourglassStart,
  FaHourglassEnd,
  FaLightbulb,
  FaTimesCircle,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-3, 3, -3],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
};
const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" },
  },
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
const TIMES = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
];

// CSS Styles
const componentStyles = `
.schedule-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
  padding: 1.5rem;
}
.schedule-content {
  width: 100%;
  margin: 0 auto;
}
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}
.loading-spinner {
  text-align: center;
}
.spinner-icon {
  font-size: 4rem;
  color: #1a4b6d;
  margin-bottom: 1.5rem;
}
.loading-spinner h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-weight: 700;
  font-size: 1.5rem;
}
.loading-spinner p {
  color: #64748b;
  margin: 0;
}
.breadcrumb {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.btn-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1a4b6d;
  background: none;
  border: none;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
}
.btn-breadcrumb:hover {
  background-color: #f1f5f9;
}
.breadcrumb-separator {
  color: #94a3b8;
}
.breadcrumb-current {
  color: #1a4b6d;
  font-weight: 600;
  font-size: 1rem;
}
.schedule-header {
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(26, 75, 109, 0.15);
}
.header-top {
  padding: 1.75rem 2rem;
  background: linear-gradient(180deg, #0f3a4a, #134952);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.header-icon-wrapper {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3);
}
.header-title {
  margin: 0;
  font-weight: 700;
  line-height: 1.2;
}
.header-subtitle {
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.header-right {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}
.current-time-badge {
  background: rgba(255, 255, 255, 0.15);
  padding: 0.6rem 1rem;
  border-radius: 12px;
  text-align: center;
  min-width: 100px;
}
.time-label {
  font-size: 0.75rem;
  opacity: 0.85;
  margin-bottom: 0.25rem;
}
.time-value {
  font-size: 1.1rem;
  font-weight: 700;
}
.btn-refresh {
  background: white;
  color: #1a4b6d;
  border: 2px solid white;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}
.btn-refresh:hover {
  transform: translateY(-2px);
}
.btn-text {
  display: none;
}
@media (min-width: 768px) {
  .btn-text {
    display: inline;
  }
}
.stats-bar {
  padding: 1rem 2rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.stats-items {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  flex: 1;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
}
.stat-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
}
.day-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
  font-weight: 600;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}
.error-banner {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(220, 53, 69, 0.05);
  border: 1px solid #dc3545;
  color: #dc3545;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.error-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 1.25rem;
}
.schedule-card {
  background: white;
  border-radius: 1.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}
.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.sun-icon {
  color: #ffc107;
}
.info-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #dbeafe;
  color: #1a4b6d;
  padding: 0.4rem 0.875rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}
.info-text {
  display: inline;
}
@media (max-width: 480px) {
  .info-text {
    display: none;
  }
}
.slots-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.schedule-row {
  background: white;
  border: 1px solid;
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.schedule-row:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}
.active-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%);
  z-index: 1;
}
.time-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 8px;
  margin-bottom: 0;
}
.time-start {
  font-weight: 700;
  margin-bottom: 0.25rem;
}
.time-end {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}
.status-badge {
  margin-top: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  justify-content: center;
}
.status-active {
  background: rgba(26, 75, 109, 0.1);
  color: #1a4b6d;
}
.status-completed {
  background: #fee2e2;
  color: #b91c1c;
}
.status-session-active {
  background: #dcfce7;
  color: #166534;
}
.content-column {
  flex: 1;
  width: 100%;
}
.content-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.subject-info {
  flex: 1;
}
.subject-name {
  font-weight: 700;
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.subject-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.badge-type,
.badge-room,
.badge-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}
.badge-room {
  background: #f1f5f9;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}
.badge-status.published {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.badge-status.draft {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.timetable-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  min-width: 150px;
}
.timetable-name {
  font-size: 0.95rem;
  color: #4a5568;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.timetable-meta {
  font-size: 0.85rem;
  color: #64748b;
}
.content-bottom {
  padding-top: 0.75rem;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.teacher-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4a5568;
  font-size: 0.95rem;
}
.teacher-icon {
  color: #1a4b6d;
}
.btn-action {
  width: 100%;
  padding: 0.875rem;
  border-radius: 12px;
  border: none;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
}
.btn-action:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}
.btn-creating {
  background: #28a745;
  color: white;
}
.btn-active {
  background: #dcfce7;
  color: #166534;
  border: 2px solid #86efac;
}
.btn-ended {
  background: #cbd5e1;
  color: #64748b;
}
.btn-unpublished {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.btn-upcoming {
  background: #f0f9ff;
  color: #0c4a6e;
  border: 1px solid #bae6fd;
}
.btn-start {
  background: #28a745;
  color: white;
  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.35);
}
.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.45);
}
.info-message {
  padding: 0.75rem;
  border-radius: 10px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.info-error {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}
.info-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}
.info-info {
  background: #f0f9ff;
  color: #0c4a6e;
  border: 1px solid #bae6fd;
}
.info-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}
.info-banner {
  margin-top: 1.5rem;
  padding: 1.25rem;
  border-radius: 16px;
  background: #fffbeb;
  border: 1px solid #f59e0b;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.info-banner-icon {
  color: #ffc107;
  flex-shrink: 0;
  margin-top: 0.25rem;
  font-size: 1.5rem;
}
.info-banner-content {
  color: #92400e;
  font-size: 0.95rem;
  line-height: 1.6;
}
.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #64748b;
}
.empty-icon {
  margin-bottom: 1.5rem;
  opacity: 0.3;
  color: #e2e8f0;
}
.empty-title {
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-weight: 700;
  font-size: 1.75rem;
}
.empty-message {
  margin: 0;
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.02);
  }
}
@media (max-width: 1024px) {
  .schedule-container {
    padding: 1rem;
  }
  .header-top {
    padding: 1.25rem;
    flex-direction: column;
    text-align: center;
  }
  .header-left {
    flex-direction: column;
  }
  .header-right {
    width: 100%;
    justify-content: center;
  }
  .stats-bar {
    padding: 0.75rem 1rem;
  }
  .stats-items {
    gap: 0.75rem;
  }
}
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    text-align: center;
  }
  .content-top {
    flex-direction: column;
  }
  .timetable-info {
    align-items: flex-start;
    min-width: 100%;
    margin-top: 0.5rem;
  }
  .btn-action {
    font-size: 0.95rem;
    padding: 0.75rem;
  }
}
@media (max-width: 480px) {
  .header-title {
    font-size: 1.5rem;
  }
  .header-subtitle {
    font-size: 0.9rem;
  }
  .header-icon-wrapper {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
  .subject-name {
    font-size: 1.1rem;
  }
  .schedule-row {
    padding: 1rem;
  }
}
.Toastify__toast {
  border-radius: 10px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
.Toastify__toast--success {
  background: linear-gradient(135deg, #28a745, #1e7e34);
}
.Toastify__toast--error {
  background: linear-gradient(135deg, #dc3545, #c82333);
}
.Toastify__toast--warning {
  background: linear-gradient(135deg, #ffc107, #e0a800);
}
.Toastify__toast--info {
  background: linear-gradient(135deg, #17a2b8, #117a8b);
}
`;

export default function MySchedule() {
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSessions, setActiveSessions] = useState({});
  const [attendanceSessions, setAttendanceSessions] = useState({});
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sessionTimers, setSessionTimers] = useState({});
  const [todaySlotsData, setTodaySlotsData] = useState(null); // NEW: Today's slots with attendance status
  const navigate = useNavigate();
  const toastIds = useRef({});

  // Safe window check
  const isClient = typeof window !== "undefined";
  const getWindowWidth = () => (isClient ? window.innerWidth : 1024);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (!isClient) return;
    const today = new Date().toISOString().split("T")[0];
    const storedSessions = localStorage.getItem(`activeSessions_${today}`);
    const storedAttendance = localStorage.getItem(
      `attendanceSessions_${today}`
    );
    if (storedSessions) {
      try {
        setActiveSessions(JSON.parse(storedSessions));
      } catch (e) {
        console.error("Failed to parse stored sessions:", e);
      }
    }
    if (storedAttendance) {
      try {
        setAttendanceSessions(JSON.parse(storedAttendance));
      } catch (e) {
        console.error("Failed to parse stored attendance:", e);
      }
    }
    setSessionsLoaded(true);
  }, [isClient]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load weekly schedule (all slots for teacher)
        const res = await api.get("/timetable/weekly");
        setWeekly(res.data.weekly || {});
        
        // Fetch today's slots with attendance status (NEW)
        await loadTodaySlots();
        
        // Fetch active attendance sessions
        await loadActiveSessions();
        
        if (!toastIds.current.success) {
          toast.success("Schedule loaded successfully!", {
            toastId: "schedule-success",
            position: "top-right",
            autoClose: 3000,
            icon: <FaCheckCircle />,
          });
          toastIds.current.success = true;
        }
      } catch (err) {
        console.error("Failed to load schedule:", err);
        const errorMsg =
          err.response?.data?.message ||
          "Failed to load your schedule. Please try again.";
        setError(errorMsg);
        if (!toastIds.current.error) {
          toast.error(errorMsg, {
            toastId: "schedule-error",
            position: "top-right",
            autoClose: 5000,
            icon: <FaExclamationTriangle />,
          });
          toastIds.current.error = true;
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load today's slots with attendance status (NEW FUNCTION)
  const loadTodaySlots = async () => {
    try {
      const res = await api.get("/attendance/today-slots");
      setTodaySlotsData(res.data);
      // Store today's slots in localStorage for quick access
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(`todaySlots_${today}`, JSON.stringify(res.data));
    } catch (err) {
      console.error("Failed to load today's slots:", err);
      // Don't fail the entire load, just use weekly data
    }
  };

  // Load active attendance sessions
  const loadActiveSessions = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const res = await api.get("/attendance/sessions", {
        params: { date: todayStr, status: "active" },
      });
      // Map sessions by slot_id
      const sessionsMap = {};
      const attendanceMap = {};
      if (res.data.sessions) {
        res.data.sessions.forEach((session) => {
          if (session.slot_id) {
            const slotId =
              typeof session.slot_id === "object"
                ? session.slot_id._id
                : session.slot_id;
            sessionsMap[slotId] = session;
            attendanceMap[slotId] = session;
          }
        });
      }
      setActiveSessions(sessionsMap);
      setAttendanceSessions(attendanceMap);
      // Store in localStorage
      if (isClient) {
        localStorage.setItem(
          `activeSessions_${todayStr}`,
          JSON.stringify(sessionsMap)
        );
        localStorage.setItem(
          `attendanceSessions_${todayStr}`,
          JSON.stringify(attendanceMap)
        );
      }
    } catch (err) {
      console.error("Failed to load active sessions:", err);
      // Don't show error toast for this, just use empty state
    }
  };

  // Calculate time remaining for active sessions
  useEffect(() => {
    if (!isClient) return;
    const timer = setInterval(() => {
      const newTimers = {};
      Object.keys(activeSessions).forEach((slotId) => {
        const slot = findSlotById(slotId);
        if (slot) {
          const endTime = slot.endTime;
          const [endHour, endMin] = endTime.split(":").map(Number);
          const now = new Date();
          const endDateTime = new Date();
          endDateTime.setHours(endHour, endMin, 0, 0);
          const diffMs = endDateTime - now;
          const diffMins = Math.max(0, Math.floor(diffMs / 60000));
          const diffSecs = Math.max(0, Math.floor((diffMs % 60000) / 1000));
          newTimers[slotId] = {
            minutes: diffMins,
            seconds: diffSecs,
            isActive: diffMs > 0,
          };
        }
      });
      setSessionTimers(newTimers);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSessions, weekly, isClient]);

  // Find slot by ID
  const findSlotById = (slotId) => {
    for (const day of DAYS) {
      const slots = weekly[day] || [];
      const slot = slots.find((s) => s._id === slotId);
      if (slot) return slot;
    }
    return null;
  };

  /* ================= CREATE ATTENDANCE ================= */
  const startAttendance = async (slot, timeSlot) => {
    const today = new Date();
    
    // ✅ CORRECT: Get today's day abbreviation
    const dayMap = {
      0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT'
    };
    const currentDayAbbr = dayMap[today.getDay()];
    
    // Check if it's today's lecture
    if (slot.day !== currentDayAbbr) {
      toast.error("Attendance can only be started for today's lectures.", {
        toastId: "day-error",
        position: "top-right",
        autoClose: 4000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }
    
    // ✅ STRICT TIME CHECK: Verify current time is within slot time
    const [startTime, endTime] = timeSlot.split(" - ");
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // ✅ Check if class time has started
    if (currentMinutes < startMinutes) {
      toast.error(
        `Class hasn't started yet. Attendance can be started from ${startTime}.`,
        {
          toastId: "before-time",
          position: "top-right",
          autoClose: 5000,
          icon: <FaHourglassStart />,
        }
      );
      return;
    }
    
    // ✅ Check if class time has ended
    if (currentMinutes >= endMinutes) {
      toast.error(
        `Class has ended at ${endTime}. Attendance cannot be started after class time.`,
        {
          toastId: "after-time",
          position: "top-right",
          autoClose: 5000,
          icon: <FaHourglassEnd />,
        }
      );
      return;
    }
    
    // Check if attendance is already active (from backend data)
    if (slot.hasOpenSession) {
      toast.warning("Attendance session is already active for this lecture.", {
        toastId: "already-active",
        position: "top-right",
        autoClose: 4000,
        icon: <FaInfoCircle />,
      });
      return;
    }
    
    // Check if attendance already exists (closed session)
    if (slot.hasClosedSession) {
      toast.warning("Attendance session is already closed for this lecture.", {
        toastId: "already-closed",
        position: "top-right",
        autoClose: 4000,
        icon: <FaInfoCircle />,
      });
      return;
    }
    
    // Confirm before creating
    const confirmed = window.confirm(
      `Start attendance for ${slot.subject_id?.name}?\n` +
        `Time: ${timeSlot}\n` +
        `Room: ${slot.room || "N/A"}\n` +
        `This will create a new attendance session for today's lecture.`
    );
    if (!confirmed) return;
    
    try {
      setCreating(slot._id);
      const todayDate = today.toISOString().split("T")[0];
      
      const res = await api.post("/attendance/sessions", {
        slot_id: slot._id,
        lectureDate: todayDate,
        lectureNumber: 1,
      });
      
      const newSession = res.data.session;
      const slotId = slot._id;
      
      // Update state
      const newActiveSessions = {
        ...activeSessions,
        [slotId]: newSession,
      };
      const newAttendanceSessions = {
        ...attendanceSessions,
        [slotId]: newSession,
      };
      setActiveSessions(newActiveSessions);
      setAttendanceSessions(newAttendanceSessions);
      
      // Store in localStorage
      if (isClient) {
        const todayStr = today.toISOString().split("T")[0];
        localStorage.setItem(
          `activeSessions_${todayStr}`,
          JSON.stringify(newActiveSessions)
        );
        localStorage.setItem(
          `attendanceSessions_${todayStr}`,
          JSON.stringify(newAttendanceSessions)
        );
      }
      
      toast.success("Attendance session started successfully! Redirecting...", {
        toastId: "start-success",
        position: "top-right",
        autoClose: 2000,
        icon: <FaCheckCircle />,
      });
      
      // Refresh today's slots data
      await loadTodaySlots();
      
      // Navigate to session page
      setTimeout(() => {
        navigate(`/attendance/session/${newSession._id}`);
      }, 2000);
    } catch (err) {
      console.error("Failed to create attendance session:", err);
      const message =
        err.response?.data?.message ||
        "Failed to create attendance session. Please try again.";
      toast.error(message, {
        toastId: "start-error",
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
      
      // If error says attendance already exists, update the state
      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("exists") ||
        message.toLowerCase().includes("duplicate")
      ) {
        const slotId = slot._id;
        const newActiveSessions = {
          ...activeSessions,
          [slotId]: { _id: "existing", status: "active" },
        };
        const newAttendanceSessions = {
          ...attendanceSessions,
          [slotId]: { _id: "existing", status: "active" },
        };
        setActiveSessions(newActiveSessions);
        setAttendanceSessions(newAttendanceSessions);
        if (isClient) {
          const todayStr = today.toISOString().split("T")[0];
          localStorage.setItem(
            `activeSessions_${todayStr}`,
            JSON.stringify(newActiveSessions)
          );
          localStorage.setItem(
            `attendanceSessions_${todayStr}`,
            JSON.stringify(newAttendanceSessions)
          );
        }
      }
    } finally {
      setCreating(null);
    }
  };

  // Get current day and time for highlighting
  const today = new Date();
  
  // ✅ CORRECT: Get today's day abbreviation
  const dayMap = {
    0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT'
  };
  const currentDayAbbr = dayMap[today.getDay()];
  const currentDayName = DAY_NAMES[DAYS.indexOf(currentDayAbbr)] || currentDayAbbr;
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Filter today's slots only - Use todaySlotsData if available, otherwise fall back to weekly
  const todaysSlots = todaySlotsData?.slots || (weekly[currentDayAbbr] || []);

  // Responsive styles
  const getResponsiveStyles = () => {
    const width = getWindowWidth();
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    return {
      container: {
        maxWidth: isMobile ? "100%" : isTablet ? "95%" : "1200px",
        padding: isMobile ? "0.75rem" : "1.5rem",
      },
      headerTitle: {
        fontSize: isMobile ? "1.5rem" : "2rem",
      },
      headerSubtitle: {
        fontSize: isMobile ? "0.9rem" : "1.1rem",
      },
      headerIcon: {
        width: isMobile ? "50px" : "72px",
        height: isMobile ? "50px" : "72px",
        fontSize: isMobile ? "1.5rem" : "2rem",
      },
      statsLabel: {
        fontSize: isMobile ? "0.75rem" : "0.85rem",
      },
      statsValue: {
        fontSize: isMobile ? "1rem" : "1.15rem",
      },
      cardPadding: {
        padding: isMobile ? "1rem" : "1.5rem",
      },
      timeColumn: {
        minWidth: isMobile ? "90px" : "120px",
        fontSize: isMobile ? "1.2rem" : "1.5rem",
      },
      buttonPadding: {
        padding: isMobile ? "0.75rem" : "0.875rem",
      },
    };
  };
  const styles = getResponsiveStyles();

  if (loading || !sessionsLoaded) {
    return (
      <div className="schedule-container">
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
        <div className="loading-wrapper">
          <div className="loading-spinner">
            <motion.div
              variants={spinVariants}
              animate="animate"
              className="spinner-icon"
            >
              <FaSyncAlt />
            </motion.div>
            <h3>Loading Today's Schedule...</h3>
            <p>Fetching your teaching schedule for {currentDayName}</p>
          </div>
        </div>
        <style>{componentStyles}</style>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="schedule-container"
      >
        <style>{componentStyles}</style>
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
        <div
          className="schedule-content"
          style={{ maxWidth: styles.container.maxWidth }}
        >
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="breadcrumb"
          >
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/teacher/dashboard")}
              className="btn-breadcrumb"
            >
              <FaArrowLeft /> Back to Dashboard
            </motion.button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Today's Schedule</span>
          </motion.div>
          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="schedule-header"
          >
            <div className="header-top">
              <div className="header-left">
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  className="header-icon-wrapper"
                  style={{
                    width: styles.headerIcon.width,
                    height: styles.headerIcon.height,
                    fontSize: styles.headerIcon.fontSize,
                  }}
                >
                  <FaCalendarAlt />
                </motion.div>
                <div>
                  <h1
                    className="header-title"
                    style={{ fontSize: styles.headerTitle.fontSize }}
                  >
                    Today's Schedule
                  </h1>
                  <p
                    className="header-subtitle"
                    style={{ fontSize: styles.headerSubtitle.fontSize }}
                  >
                    <FaSun />{" "}
                    {currentDayName},{" "}
                    {today.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="header-right">
                <div className="current-time-badge">
                  <div className="time-label">Current Time</div>
                  <div className="time-value">
                    {currentTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                </div>
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 8px 20px rgba(26, 75, 109, 0.4)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setLoading(true);
                    await loadActiveSessions();
                    setLoading(false);
                    toast.info("Schedule refreshed!", {
                      position: "top-right",
                      autoClose: 2000,
                      icon: <FaSyncAlt />,
                    });
                  }}
                  className="btn-refresh"
                >
                  <FaSyncAlt className={loading ? "spin" : ""} />
                  <span className="btn-text">Refresh</span>
                </motion.button>
              </div>
            </div>
            {/* Stats Bar */}
            <div className="stats-bar">
              <div className="stats-items">
                <StatItem
                  icon={<FaUniversity />}
                  label="Total Classes"
                  value={todaysSlots.length}
                  color={BRAND_COLORS.primary.main}
                  styles={styles}
                />
                <StatItem
                  icon={<FaCheckCircle />}
                  label="Available for Attendance"
                  value={todaySlotsData?.availableForAttendance || todaysSlots.filter(
                    (s) => s.timetable_id?.status === "PUBLISHED"
                  ).length}
                  color={BRAND_COLORS.success.main}
                  styles={styles}
                />
                <StatItem
                  icon={<FaBell />}
                  label="Active Sessions"
                  value={Object.keys(activeSessions).length}
                  color={BRAND_COLORS.warning.main}
                  styles={styles}
                />
              </div>
              <div className="day-badge">
                <FaCalendarAlt size={14} />
                {currentDayName}
              </div>
            </div>
          </motion.div>
          {/* ================= ERROR STATE ================= */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="error-banner"
            >
              <FaExclamationTriangle
                size={getWindowWidth() < 768 ? 16 : 20}
              />
              <span>{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  toastIds.current.error = false;
                }}
                className="error-close"
              >
                <FaTimesCircle />
              </button>
            </motion.div>
          )}
          {/* ================= TODAY'S SCHEDULE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="schedule-card"
          >
            <div className="card-header">
              <h2>
                <FaSun className="sun-icon" /> Today's Classes
              </h2>
              <div className="info-badge">
                <FaInfoCircle />
                <span className="info-text">Only today's classes are shown</span>
              </div>
            </div>
            <div className="card-body" style={{ padding: styles.cardPadding.padding }}>
              {todaysSlots.length === 0 ? (
                <EmptyState
                  icon={<FaCalendarAlt />}
                  title="No Classes Today"
                  message={`You don't have any scheduled classes for ${currentDayName}. Enjoy your day off!`}
                />
              ) : (
                <div className="slots-list">
                  {todaysSlots.map((slot, idx) => {
                    const time = `${slot.startTime} - ${slot.endTime}`;
                    return (
                      <ScheduleRow
                        key={slot._id || time}
                        time={time}
                        slot={slot}
                        isCurrent={isCurrentTimeSlot(time)}
                        onStartAttendance={startAttendance}
                        creating={creating === slot._id}
                        delay={idx * 0.05}
                        hasActiveSession={!!activeSessions[slot._id] || slot.hasOpenSession}
                        hasAttendanceSession={!!attendanceSessions[slot._id] || slot.hasClosedSession}
                        sessionTimer={sessionTimers[slot._id]}
                        styles={styles}
                        attendanceMessage={slot.message}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
          {/* Info Banner */}
          <motion.div
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            className="info-banner"
          >
            <FaLightbulb className="info-banner-icon" />
            <div className="info-banner-content">
              <strong>Attendance Policy:</strong> You can only start attendance
              for currently active classes (between start and end time). The
              button will automatically enable at start time and disable after
              end time. Once started, attendance cannot be created again.
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= HELPER FUNCTIONS ================= */
function isCurrentTimeSlot(timeSlot) {
  const [startTime, endTime] = timeSlot.split(" - ");
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = currentHour * 60 + currentMinute;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/* ================= STAT ITEM ================= */
function StatItem({ icon, label, value, color, styles }) {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  return (
    <div className="stat-item">
      <div
        className="stat-icon"
        style={{
          width: isMobile ? "32px" : "36px",
          height: isMobile ? "32px" : "36px",
          backgroundColor: `${color}15`,
          color: color,
          fontSize: isMobile ? "1rem" : "1.1rem",
        }}
      >
        {icon}
      </div>
      <div className="stat-info">
        <div
          className="stat-label"
          style={{ fontSize: styles.statsLabel.fontSize }}
        >
          {label}
        </div>
        <div
          className="stat-value"
          style={{ fontSize: styles.statsValue.fontSize }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ================= SCHEDULE ROW ================= */
function ScheduleRow({
  time,
  slot,
  isCurrent,
  onStartAttendance,
  creating,
  delay = 0,
  hasActiveSession,
  hasAttendanceSession,
  sessionTimer,
  styles,
  attendanceMessage,
}) {
  const slotType =
    BRAND_COLORS.slotTypes[slot.slotType] || BRAND_COLORS.slotTypes.LECTURE;
  const isPublished = slot.timetable_id?.status === "PUBLISHED";
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  
  // Determine slot status
  const [startTime, endTime] = time.split(" - ");
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // ✅ Check backend status first (highest priority)
  const hasClosedSession = slot.hasClosedSession || hasAttendanceSession;
  const hasOpenSession = slot.hasOpenSession || hasActiveSession;
  
  let slotStatus = "upcoming";
  if (currentMinutes >= endMinutes) {
    slotStatus = "past";
  } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    slotStatus = "active";
  }
  
  // ✅ Button is enabled ONLY if ALL conditions are met:
  // 1. Timetable is published
  // 2. Currently within class time (not before, not after)
  // 3. No existing open session
  // 4. No existing closed session
  const canStartAttendance =
    isPublished && 
    slotStatus === "active" &&  // ✅ STRICT: Must be within time window
    !hasOpenSession && 
    !hasClosedSession;
  
  // Determine button state (priority order)
  let buttonState = "start";
  if (creating === slot._id) {
    buttonState = "creating";
  } else if (hasOpenSession) {
    buttonState = "active";  // ✅ Backend says session is open
  } else if (hasClosedSession) {
    buttonState = "ended";  // ✅ Backend says session is closed
  } else if (slotStatus === "past") {
    buttonState = "ended";  // ✅ Time-based: class ended
  } else if (!isPublished) {
    buttonState = "unpublished";
  } else if (slotStatus === "upcoming") {
    buttonState = "upcoming";
  }
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{
        y: isMobile ? 0 : -3,
        boxShadow: isMobile
          ? "0 2px 8px rgba(0, 0, 0, 0.06)"
          : "0 8px 20px rgba(0, 0, 0, 0.1)",
      }}
      className="schedule-row"
      style={{
        borderColor: slotType.border,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "1rem" : "1.5rem",
        padding: isMobile ? "1rem" : "1.25rem",
        boxShadow:
          isCurrent && !hasActiveSession
            ? `0 0 0 3px ${BRAND_COLORS.primary.main}20`
            : "0 2px 8px rgba(0, 0, 0, 0.06)",
        opacity: slotStatus === "past" ? 0.7 : 1,
      }}
    >
      {isCurrent && !hasActiveSession && <div className="active-indicator" />}
      {/* Time Column */}
      <div
        className="time-column"
        style={{
          minWidth: isMobile ? "100%" : styles.timeColumn.minWidth,
          fontSize: styles.timeColumn.fontSize,
          borderRight: isMobile
            ? "none"
            : `1px solid ${slotType.border}`,
          borderBottom: isMobile
            ? `1px solid ${slotType.border}`
            : "none",
          backgroundColor: `${slotType.bg}30`,
          marginBottom: isMobile ? "0.5rem" : "0",
        }}
      >
        <div className="time-start">{time.split(" - ")[0]}</div>
        <div className="time-end">to {time.split(" - ")[1]}</div>
        {isCurrent && !hasActiveSession && (
          <motion.div
            variants={floatVariants}
            initial="initial"
            animate="float"
            className="status-badge status-active"
          >
            <FaClock size={12} />
            Currently Active
          </motion.div>
        )}
        {slotStatus === "past" && (
          <div className="status-badge status-completed">
            <FaClock size={12} />
            Completed
          </div>
        )}
        {hasActiveSession && sessionTimer && sessionTimer.isActive && (
          <div className="status-badge status-session-active">
            <FaCheckCircle size={12} />
            {sessionTimer.minutes}m {sessionTimer.seconds}s remaining
          </div>
        )}
        {hasActiveSession && (!sessionTimer || !sessionTimer.isActive) && (
          <div className="status-badge status-session-active">
            <FaCheckCircle size={12} />
            Attendance Active
          </div>
        )}
      </div>
      {/* Content Column */}
      <div className="content-column">
        <div className="content-top">
          <div className="subject-info">
            <div className="subject-name">
              <FaBook size={isMobile ? 16 : 18} />
              {slot.subject_id?.name}
            </div>
            <div className="subject-meta">
              <span
                className="badge-type"
                style={{
                  backgroundColor: slotType.bg,
                  color: slotType.text,
                  borderColor: slotType.border,
                }}
              >
                <FaLayerGroup size={12} />
                {slot.slotType}
              </span>
              {slot.room && (
                <span className="badge-room">
                  <FaDoorOpen size={12} />
                  Room {slot.room}
                </span>
              )}
              <span
                className={`badge-status ${isPublished ? "published" : "draft"}`}
              >
                {isPublished ? (
                  <>
                    <FaCheckCircle size={12} />
                    Published
                  </>
                ) : (
                  <>
                    <FaExclamationTriangle size={12} />
                    Draft
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="timetable-info">
            <div className="timetable-name">{slot.timetable_id?.name}</div>
            <div className="timetable-meta">
              Sem {slot.timetable_id?.semester} •{" "}
              {slot.timetable_id?.academicYear}
            </div>
          </div>
        </div>
        <div className="content-bottom">
          <div className="teacher-info">
            <FaChalkboardTeacher
              size={isMobile ? 14 : 16}
              className="teacher-icon"
            />
            <span>{slot.teacher_id?.name || "N/A"}</span>
          </div>
          {buttonState === "creating" ? (
            <motion.button 
              disabled 
              className="btn-action btn-creating"
              style={{
                background: 'linear-gradient(135deg, #28a745, #1e7e34)',
                color: 'white',
                cursor: 'not-allowed',
                opacity: 0.8
              }}
            >
              <motion.div variants={spinVariants} animate="animate">
                <FaSyncAlt />
              </motion.div>
              Starting Session...
            </motion.button>
          ) : buttonState === "active" ? (
            <motion.div 
              className="btn-action btn-active"
              style={{
                background: 'linear-gradient(135deg, #28a745, #1e7e34)',
                color: 'white',
                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)',
                cursor: 'default'
              }}
            >
              <FaCheckCircle size={isMobile ? 18 : 20} />
              <span style={{ fontWeight: 600 }}>Attendance Active</span>
            </motion.div>
          ) : buttonState === "ended" ? (
            <motion.div 
              className="btn-action btn-ended"
              style={{
                background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                color: 'white',
                cursor: 'not-allowed',
                opacity: 0.7
              }}
            >
              <FaTimesCircle size={isMobile ? 18 : 20} />
              <span>Session Closed</span>
            </motion.div>
          ) : buttonState === "unpublished" ? (
            <div className="btn-action btn-unpublished"
              style={{
                cursor: 'not-allowed',
                opacity: 0.6
              }}
            >
              <FaExclamationTriangle size={16} />
              <span>Timetable Not Published</span>
            </div>
          ) : buttonState === "upcoming" ? (
            <div className="btn-action btn-upcoming"
              style={{
                cursor: 'not-allowed',
                opacity: 0.6
              }}
            >
              <FaHourglassStart size={16} />
              <span>Starts at {startTime}</span>
            </div>
          ) : canStartAttendance ? (
            <motion.button
              whileHover={{ 
                scale: 1.03,
                boxShadow: '0 6px 20px rgba(40, 167, 69, 0.45)'
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStartAttendance(slot, time)}
              className="btn-action btn-start"
              style={{
                background: 'linear-gradient(135deg, #28a745, #1e7e34)',
                color: 'white',
                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.35)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FaPlay />
              <span style={{ fontWeight: 600 }}>Start Attendance</span>
            </motion.button>
          ) : (
            <button 
              disabled 
              className="btn-action btn-start"
              style={{
                background: '#e9ecef',
                color: '#6c757d',
                cursor: 'not-allowed',
                opacity: 0.6,
                boxShadow: 'none'
              }}
            >
              <FaPlay />
              <span>Not Available</span>
            </button>
          )}
          {/* Info Messages */}
          {attendanceMessage && (
            <div className={`info-message info-${
              attendanceMessage.includes('already') ? 'warning' :
              attendanceMessage.includes('ended') || attendanceMessage.includes('closed') ? 'error' :
              'info'
            }`}>
              <FaInfoCircle size={16} />
              <span>{attendanceMessage}</span>
            </div>
          )}
          {buttonState === "ended" && isPublished && !attendanceMessage && (
            <div className="info-message info-error">
              <FaTimesCircle size={16} />
              <span>
                This class ended at {endTime}. Attendance session is closed.
              </span>
            </div>
          )}
          {buttonState === "active" && (
            <div className="info-message info-success">
              <FaCheckCircle size={16} />
              <span>
                Attendance is active. Click the button above to mark student attendance.
              </span>
            </div>
          )}
          {buttonState === "upcoming" && (
            <div className="info-message info-info">
              <FaInfoCircle size={16} />
              <span>
                Attendance will be available from {startTime} to {endTime}
              </span>
            </div>
          )}
          {buttonState === "unpublished" && (
            <div className="info-message info-warning">
              <FaExclamationTriangle size={16} />
              <span>Please ask HOD to publish the timetable to enable attendance.</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message }) {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="empty-state"
    >
      <div
        className="empty-icon"
        style={{ fontSize: isMobile ? "3.5rem" : "5rem" }}
      >
        {icon}
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
    </motion.div>
  );
}