import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
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

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper function to format time in 12-hour format with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
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
  
  const [hours, minutes] = time24h.split(':');
  let h = parseInt(hours);
  const modifier = h >= 12 ? 'PM' : 'AM';
  
  h = h % 12;
  h = h ? h : 12;
  
  return `${h.toString().padStart(2, '0')}:${minutes} ${modifier}`;
};

/**
 * Format time range for display
 */
const formatTimeRange = (startTime, endTime) => {
  return `${convertTo12Hour(startTime)} - ${convertTo12Hour(endTime)}`;
};

export default function StudentTimetable() {
  const navigate = useNavigate();
  const [weekly, setWeekly] = useState({});
  const [todaySlots, setTodaySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const toastIds = useRef({});

  const isClient = typeof window !== "undefined";

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load weekly schedule
        const weeklyRes = await api.get("/timetable/student");
        const allSlots = weeklyRes.data || [];

        // Group by day
        const weeklyData = {};
        DAYS.forEach((day) => {
          weeklyData[day] = allSlots.filter((slot) => slot.day === day);
        });
        setWeekly(weeklyData);

        // Load today's slots
        const today = new Date();
        const dayMap = {
          0: "SUN",
          1: "MON",
          2: "TUE",
          3: "WED",
          4: "THU",
          5: "FRI",
          6: "SAT",
        };
        const currentDayAbbr = dayMap[today.getDay()];
        setTodaySlots(weeklyData[currentDayAbbr] || []);

        if (!toastIds.current.success && allSlots.length > 0) {
          toast.success("Timetable loaded successfully!", {
            toastId: "schedule-success",
            position: "top-right",
            autoClose: 3000,
            icon: <FaCheckCircle />,
          });
          toastIds.current.success = true;
        }
      } catch (err) {
        console.error("Failed to load timetable:", err);
        const errorMsg = err.response?.data?.message || "Failed to load timetable.";
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

  // Get current day
  const today = new Date();
  const dayMap = {
    0: "SUN",
    1: "MON",
    2: "TUE",
    3: "WED",
    4: "THU",
    5: "FRI",
    6: "SAT",
  };
  const currentDayAbbr = dayMap[today.getDay()];

  // Get course info
  const courseName = todaySlots.length > 0 ? todaySlots[0]?.course_id?.name : "";
  const semester = todaySlots.length > 0 ? todaySlots[0]?.timetable_id?.semester : "";
  const academicYear = todaySlots.length > 0 ? todaySlots[0]?.timetable_id?.academicYear : "";

  if (loading) {
    return (
      <div className="st-container">
        <ToastContainer position="top-right" theme="colored" />
        <div className="st-loading">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="st-loading-icon"
          >
            <FaSyncAlt />
          </motion.div>
          <h3>Loading Your Timetable...</h3>
          <p>Fetching your course schedule</p>
        </div>
        <style>{componentStyles}</style>
      </div>
    );
  }

  return (
    <div className="st-container">
      <style>{componentStyles}</style>
      <ToastContainer position="top-right" theme="colored" />
      
      {/* Breadcrumb */}
      <motion.div
        variants={slideDownVariants}
        initial="hidden"
        animate="visible"
        className="st-breadcrumb"
      >
        <button onClick={() => navigate("/student/dashboard")} className="st-breadcrumb-btn">
          <FaArrowLeft /> Back to Dashboard
        </button>
        <span className="st-breadcrumb-sep">›</span>
        <span className="st-breadcrumb-current">My Timetable</span>
      </motion.div>

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
          <button onClick={() => window.location.reload()} className="st-refresh-btn">
            <FaSyncAlt className={loading ? "st-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="st-stats-bar">
        <div className="st-stat">
          <div className="st-stat-icon st-stat-primary">
            <FaCalendarAlt />
          </div>
          <div className="st-stat-info">
            <span className="st-stat-value">{Object.values(weekly).flat().length}</span>
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
              {DAYS.filter((day) => weekly[day]?.length > 0).length}
            </span>
            <span className="st-stat-label">Active Days</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="st-error-banner"
        >
          <FaExclamationTriangle className="st-error-icon" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="st-error-close">×</button>
        </motion.div>
      )}

      {/* Today's Classes */}
      {todaySlots.length > 0 && (
        <motion.div
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className="st-section st-section-today"
        >
          <div className="st-section-header">
            <div className="st-section-title-wrapper">
              <FaSun className="st-section-icon st-sun-icon" />
              <h2 className="st-section-title">Today's Classes</h2>
            </div>
            <div className="st-section-badge">
              <FaInfoCircle />
              <span>{todaySlots.length} {todaySlots.length === 1 ? 'class' : 'classes'}</span>
            </div>
          </div>
          <div className="st-today-grid">
            {todaySlots.map((slot, idx) => (
              <TodaySlotCard key={slot._id} slot={slot} index={idx} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly Timetable Table */}
      <motion.div
        variants={fadeInVariants}
        initial="hidden"
        animate="visible"
        className="st-section st-section-weekly"
      >
        <div className="st-section-header">
          <div className="st-section-title-wrapper">
            <FaCalendarAlt className="st-section-icon" />
            <h2 className="st-section-title">Weekly Schedule</h2>
          </div>
          <div className="st-section-badge">
            <FaBook />
            <span>Full Week View</span>
          </div>
        </div>
        <div className="st-table-container">
          <table className="st-timetable-table">
            <thead>
              <tr>
                <th className="st-time-col-header">
                  <FaClock /> Time
                </th>
                {DAYS.map((day, idx) => (
                  <th key={day} className={`st-day-col-header ${day === currentDayAbbr ? 'st-today-col' : ''}`}>
                    {DAY_NAMES[idx]}
                    {day === currentDayAbbr && <span className="st-today-marker"> (Today)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((timeSlot, idx) => {
                const timeStr = `${formatTime12Hour(timeSlot.start)} - ${formatTime12Hour(timeSlot.end)}`;
                return (
                  <tr key={timeSlot.start}>
                    <td className="st-time-cell">{timeStr}</td>
                    {DAYS.map((day) => {
                      const slot = (weekly[day] || []).find(
                        (s) => s.startTime === timeSlot.start
                      );
                      return (
                        <td key={`${day}-${timeSlot.start}`} className="st-slot-cell">
                          {slot ? <WeeklySlotCard slot={slot} /> : <div className="st-empty-cell">—</div>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

/* ================= TODAY'S SLOT CARD ================= */
function TodaySlotCard({ slot, index }) {
  const slotType = BRAND_COLORS.slotTypes[slot.slotType] || BRAND_COLORS.slotTypes.LECTURE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="st-today-card"
      style={{ borderLeft: `4px solid ${slotType.text}` }}
    >
      <div className="st-today-card-header">
        <div className="st-today-time">
          <FaClock className="st-time-icon" />
          <span className="st-time-text">
            {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
          </span>
        </div>
        <span
          className="st-type-badge"
          style={{ backgroundColor: slotType.bg, color: slotType.text }}
        >
          <FaLayerGroup size={12} />
          {slot.slotType}
        </span>
      </div>
      <div className="st-today-card-body">
        <h4 className="st-today-subject">{slot.subject_id?.name}</h4>
        <div className="st-today-card-footer">
          <div className="st-today-detail">
            <FaChalkboardTeacher className="st-detail-icon" />
            <span>{slot.teacher_id?.name}</span>
          </div>
          {slot.room && (
            <div className="st-today-detail">
              <FaDoorOpen className="st-detail-icon" />
              <span>Room {slot.room}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= WEEKLY SLOT CARD ================= */
function WeeklySlotCard({ slot }) {
  const slotType = BRAND_COLORS.slotTypes[slot.slotType] || BRAND_COLORS.slotTypes.LECTURE;

  return (
    <div
      className="st-weekly-slot"
      style={{ backgroundColor: slotType.bg, border: `1px solid ${slotType.border}` }}
    >
      <div className="st-weekly-slot-header">
        <span className="st-weekly-type" style={{ color: slotType.text }}>
          {slot.slotType}
        </span>
      </div>
      <div className="st-weekly-slot-subject">{slot.subject_id?.name}</div>
      <div className="st-weekly-slot-footer">
        <div className="st-weekly-detail">
          <FaChalkboardTeacher className="st-weekly-icon" />
          <span className="st-weekly-teacher">{slot.teacher_id?.name?.split(' ')[0]}</span>
        </div>
        {slot.room && (
          <div className="st-weekly-detail">
            <FaDoorOpen className="st-weekly-icon" />
            <span>{slot.room}</span>
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

  /* ================= BREADCRUMB ================= */
  .st-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .st-breadcrumb-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: #1a4b6d;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .st-breadcrumb-btn:hover {
    background: rgba(26, 75, 109, 0.1);
  }

  .st-breadcrumb-sep {
    color: #94a3b8;
  }

  .st-breadcrumb-current {
    color: #1a4b6d;
    font-weight: 600;
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

  .st-today-col {
    background: rgba(255, 255, 255, 0.15);
    position: relative;
  }

  .st-today-marker {
    font-size: 0.75rem;
    opacity: 0.9;
    font-weight: 400;
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
`;
