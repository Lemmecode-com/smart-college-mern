import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaQrcode,
  FaUsers,
  FaChartBar,
  FaCalendarAlt,
  FaEdit,
  FaLock,
  FaUniversity,
  FaChalkboardTeacher,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSyncAlt,
  FaBell,
  FaFileAlt,
  FaGraduationCap,
  FaAward,
  FaStar,
  FaEye,
  FaArrowRight,
  FaInfoCircle,
  FaShieldAlt,
  FaDatabase
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: {
    main: '#1a4b6d',
    dark: '#0f3a4a',
    light: '#2a6b8d',
    gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)'
  },
  success: {
    main: '#28a745',
    dark: '#218838',
    light: '#28a745',
    gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
  },
  info: {
    main: '#17a2b8',
    dark: '#138496',
    light: '#17a2b8',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    light: '#ffc107',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    light: '#dc3545',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
  },
  secondary: {
    main: '#6c757d',
    dark: '#545b62',
    light: '#868e96',
    gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)'
  }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" }
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
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const blinkVariants = {
  initial: { opacity: 1 },
  blink: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-5, 5, -5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weeklySchedule, setWeeklySchedule] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dashboard/teacher");
        setData(res.data);
      } catch (err) {
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    let active = true;
    api.get("/timetable/weekly")
      .then((res) => {
        if (active) setWeeklySchedule(res.data?.weekly || {});
      })
      .catch((err) => {
        if (active) {
          setScheduleError(
            err.response?.data?.message || "Today's teaching schedule is unavailable."
          );
        }
      });
    return () => { active = false; };
  }, []);

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
          text="Loading Teacher Dashboard..."
        />
      </div>
    </div>
  );
}

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  }

  if (!data) return null;

  const { teacher, stats, recentLectures } = data;
  const todayKey = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][currentTime.getDay()];
  const todaySchedule = [...(weeklySchedule?.[todayKey] || [])]
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const nextScheduledIndex = todaySchedule.findIndex((slot) => {
    if (!slot.startTime || !slot.endTime || ["CANCELLED", "HOLIDAY"].includes(slot.status)) return false;
    const [hour, minute] = slot.startTime.split(":").map(Number);
    return currentTime.getHours() * 60 + currentTime.getMinutes() < hour * 60 + minute;
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-page erp-viewport-min-100 teacher-dashboard-page"
        style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' }}
      >
        <div className="container-fluid px-3 px-md-4 pt-2 pb-3 pb-md-4">
          {/* ================= BREADCRUMB ================= */}
        <motion.div
          variants={slideDownVariants}
          initial="hidden"
          animate="visible"
        >
          <Breadcrumb
            items={[
              { label: "Dashboard" },
              { label: "Teacher Overview" }
            ]}
          />
        </motion.div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="card shadow-lg border-0 mb-3 mb-md-4 overflow-hidden teacher-dashboard-banner"
          >
            <div
              className="p-3 p-md-4 text-white teacher-banner-hero"
              style={{ background: "linear-gradient(135deg, #0f3a4a 0%, #164e63 100%)"}}
            >
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3 teacher-banner-main">
                <div className="d-flex align-items-center gap-3 teacher-welcome">
                  <motion.div
                    variants={pulseVariants}
                    initial="initial"
                    animate="pulse"
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 teacher-banner-icon"
                    style={{
                      width: '72px',
                      height: '72px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      fontSize: '2rem',
                      // boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <FaChalkboardTeacher />
                  </motion.div>
                  <div>
                    <h1 className="mb-0 fw-bold teacher-banner-title" style={{ fontSize: '1.75rem' }}>
                      Welcome, {teacher.name}
                    </h1>
                    <p className="mb-0 mt-1 teacher-banner-description" style={{ opacity: 0.9, fontSize: '1rem' }}>
                      Empowering Education Through Technology
                    </p>
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-center teacher-banner-metadata">
                  <div
                    className="text-center px-3 py-2 teacher-banner-stat"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}
                  >
                    <div className="small mb-1" style={{ opacity: 0.85, fontSize: '0.75rem' }}>Current Time</div>
                    <div className="fw-bold" style={{ fontSize: '1.125rem' }}>
                      {currentTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                  <div
                    className="text-center px-3 py-2 teacher-banner-stat"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px'
                    }}
                  >
                    <div className="small mb-1" style={{ opacity: 0.85, fontSize: '0.75rem' }}>Employee ID</div>
                    <div className="fw-bold" style={{ fontSize: '1.125rem' }}>
                      {teacher.employeeId}
                    </div>
                  </div>
                </div>
              </div>
              <div className="teacher-banner-footer">
               <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                 <div className="d-flex align-items-center gap-2 teacher-designation">
                   <FaShieldAlt />
                   <span
                     className="px-3 py-1 rounded-pill fw-semibold small"
                     style={{
                       backgroundColor: 'rgba(255,255,255,.13)',
                       color: '#f1fbff',
                       fontSize: '0.8rem'
                     }}
                   >
                     {teacher.isHod ? 'Head of Department' : teacher.designation || 'Active Faculty'}
                   </span>
                 </div>
                 <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/profile/edit-profile")}
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                  style={{
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,.55)',
                    background: 'rgba(255,255,255,.08)'
                  }}
                >
                  <FaEdit /> <span>Edit Profile</span>
                </motion.button>
              </div>
            </div>
            </div>
          </motion.div>

<style>{`
  .teacher-dashboard-page {
    padding-left: .7rem !important;
    padding-right: .7rem !important;
  }
  .teacher-dashboard-page > .container-fluid {
    padding-right: .7rem !important;
    padding-left: .7rem !important;
  }
  .teacher-dashboard-banner {
    border: 1px solid #d9e5eb !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 24px rgba(15, 58, 74, 0.11) !important;
    margin-top: -5px;
  }
  .teacher-banner-hero {
    position: relative;
    overflow: hidden;
    padding: 1.4rem 1.6rem 1.1rem !important;
    background: linear-gradient(135deg, #0f3a4a 0%, #164e63 100%) !important;
  }
  .teacher-banner-main { position: relative; z-index: 1; gap: 1rem !important; }
  .teacher-welcome { min-width: 0; gap: 1rem !important; }
  .teacher-banner-icon {
    width: 58px !important;
    height: 58px !important;
    min-width: 58px !important;
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 15px !important;
    background: rgba(255,255,255,.1) !important;
    font-size: 1.45rem !important;
  }
  .teacher-banner-title { font-size: 1.65rem !important; letter-spacing: -.025em; }
  .teacher-banner-description { color: rgba(237,247,250,.77); font-size: .88rem !important; }
  .teacher-banner-metadata {
    flex-shrink: 0;
    padding: .4rem;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 11px;
    background: rgba(2,27,38,.22);
  }
  .teacher-banner-stat {
    min-width: 112px;
    padding: .45rem .7rem !important;
    border-radius: 7px !important;
    background: transparent !important;
    text-align: left !important;
  }
  .teacher-banner-stat + .teacher-banner-stat { border-left: 1px solid rgba(255,255,255,.18); }
  .teacher-banner-stat .small { color: rgba(237,247,250,.7); font-size: .65rem !important; text-transform: uppercase; letter-spacing: .07em; }
  .teacher-banner-stat .fw-bold { font-size: .95rem !important; }
  .teacher-banner-footer {
    position: relative;
    z-index: 1;
    margin-top: 1rem;
    padding-top: .8rem;
    border-top: 1px solid rgba(255,255,255,.18);
  }
  .teacher-designation { color: rgba(241,251,255,.82); font-size: .8rem; }
  .teacher-dashboard-banner .teacher-designation .rounded-pill {
    padding: .4rem .8rem !important;
    border: 1px solid rgba(255,255,255,.22);
    font-size: .74rem !important;
    letter-spacing: .01em;
  }
  .teacher-dashboard-banner .teacher-banner-footer button {
    min-height: 36px;
    padding: .4rem .8rem !important;
    border-radius: 8px !important;
    color: #fff !important;
    border-color: rgba(255,255,255,.55) !important;
    background: rgba(255,255,255,.08);
  }
  .teacher-dashboard-banner .teacher-banner-footer button:hover {
    color: #0f3a4a !important;
    background: #fff !important;
  }
  .teacher-dashboard-stats {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: .85rem;
    margin: 0 0 1.25rem !important;
  }
  .teacher-dashboard-stats > [class*="col-"],
  .teacher-dashboard-stats > div { width: auto; min-width: 0; max-width: none; padding: 0; }
  .teacher-stat-card {
    height: 12px;
    min-height: 90px;
    padding: 14px !important;
    border: 1px solid #e0e9ee;
    border-radius: 15px !important;
    background: linear-gradient(145deg, #fff 0%, #fbfdfe 100%);
    box-shadow: 0 4px 14px rgba(15,58,74,.06) !important;
    transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    font-weight: 400;
  }
  .teacher-stat-card:hover { transform: translateY(-4px); border-color: #b7d1d9; box-shadow: 0 12px 24px rgba(15,58,74,.11) !important; }
  .teacher-stat-card .card-body { display: flex; align-items: center; min-width: 0; padding: 0 !important; }
  .teacher-stat-card .card-body > .d-flex { width: 100%; min-width: 0; gap: .7rem !important; }
  .teacher-stat-card .teacher-stat-icon {
    width: 47px !important;
    height: 47px !important;
    flex: 0 0 47px;
    border-radius: 14px !important;
    box-shadow: none !important;
    font-size: 1.1rem !important;
  }
  .teacher-stat-card .card-body .flex-grow-1 { min-width: 0; }
  .teacher-stat-card .teacher-stat-label { margin: 0 0 .1rem !important; color: #627681; font-size: .66rem !important; font-weight: 600 !important; letter-spacing: .025em; line-height: 1.15; text-transform: uppercase; white-space: nowrap; }
  .teacher-stat-card .teacher-stat-value { margin: 0 !important; color: #163d4b !important; font-size: 1.55rem !important; line-height: 1; letter-spacing: -.035em; white-space: nowrap; }
  .teacher-stat-card .teacher-stat-subtitle { margin-top: .15rem !important; color: #82929a; font-size: .72rem !important; line-height: 1.2; }
  .teacher-dashboard-quick-section,
  .teacher-dashboard-recent {
    overflow: hidden;
    border: 1px solid #dfe8ed !important;
    border-radius: 14px !important;
    background: #fff;
    box-shadow: 0 4px 16px rgba(15,58,74,.055) !important;
  }
  .teacher-dashboard-quick-section > div:first-child,
  .teacher-dashboard-recent > div:first-child {
    padding: .85rem 1.1rem !important;
    background: #fff !important;
    border-bottom: 1px solid #e9eff2 !important;
  }
  .teacher-dashboard-quick-section > div:first-child h3,
  .teacher-dashboard-recent > div:first-child h3 { color: #173f4e !important; font-size: 1rem !important; }
  .teacher-dashboard-actions {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: .8rem !important;
    padding: .9rem !important;
    margin: 0 !important;
  }
  .teacher-dashboard-actions > [class*="col-"] {
    width: auto;
    max-width: none;
    min-width: 0;
    padding: 0;
  }
  .teacher-action-card {
    position: relative;
    min-height: 218px;
    height: 100%;
    padding: 1.1rem !important;
    border: 1px solid #e1e9ed !important;
    border-radius: 15px !important;
    background: linear-gradient(145deg, #fff 0%, #fbfdfe 100%);
    text-align: left !important;
    box-shadow: 0 3px 12px rgba(15,58,74,.045);
    cursor: pointer;
    transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
  }
  .teacher-action-card:hover { border-color: #9ccbd5 !important; background: #fbfefe; box-shadow: 0 11px 22px rgba(15,58,74,.1); }
  .teacher-action-accent { height: 3px !important; opacity: .58; }
  .teacher-action-icon {
    width: 46px !important;
    height: 46px !important;
    margin: .15rem 0 .85rem !important;
    border-radius: 13px !important;
    box-shadow: none !important;
    font-size: 1.2rem !important;
  }
  .teacher-action-title {
    min-height: 2.55rem !important;
    margin-bottom: .45rem !important;
    color: #193e4c !important;
    font-size: .98rem !important;
    line-height: 1.4;
    text-align: left;
  }
  .teacher-action-description {
    min-height: 2.4rem !important;
    margin-bottom: .8rem !important;
    color: #667b86 !important;
    font-size: .8rem !important;
    line-height: 1.5 !important;
  }
  .teacher-action-link {
    align-self: flex-start;
    margin-top: auto;
    padding: .4rem .65rem !important;
    border-radius: 8px !important;
    background: #eef6f7 !important;
    font-size: .76rem !important;
    transition: background .2s ease, color .2s ease;
  }
  .teacher-action-card:hover .teacher-action-link { background: #dceef1 !important; }
  .teacher-dashboard-recent .teacher-recent-body { padding: .35rem .85rem .85rem !important; }
  .teacher-dashboard-recent .table-responsive { border-radius: 0 0 12px 12px; }
  .teacher-dashboard-recent table { min-width: 790px; border-collapse: separate; border-spacing: 0; }
  .teacher-dashboard-recent thead th {
    padding: .75rem .85rem !important;
    background: #f5f8fa !important;
    color: #657985 !important;
    border-bottom: 1px solid #e3eaee !important;
    font-size: .66rem !important;
    letter-spacing: .06em;
    white-space: nowrap;
  }
  .teacher-dashboard-recent tbody td { padding: .75rem .85rem !important; border-color: #edf1f4; color: #3e5661; font-size: .8rem; }
  .teacher-dashboard-recent tbody tr:hover { background: #f7fafb; }
  .teacher-dashboard-recent .lecture-action-button { width: 34px !important; height: 34px !important; border-radius: 9px !important; box-shadow: none !important; }

  @media (max-width: 991px) {
    .teacher-dashboard-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .teacher-dashboard-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 767px) {
    .teacher-banner-hero { padding: 1rem !important; }
    .teacher-banner-main { align-items: stretch !important; flex-direction: column !important; }
    .teacher-banner-metadata { width: 100%; }
    .teacher-banner-stat { flex: 1; min-width: 0; }
    .teacher-banner-footer { margin-top: .8rem; padding-top: .7rem; }
    .teacher-dashboard-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 575px) {
    .teacher-dashboard-actions,
    .teacher-dashboard-stats { grid-template-columns: minmax(0, 1fr); }
    .teacher-action-card { min-height: 0; }
    .teacher-action-title,
    .teacher-action-description { min-height: 0 !important; }
    .teacher-banner-title { max-width: none !important; font-size: 1.3rem !important; }
    .teacher-banner-description { font-size: .78rem !important; }
    .teacher-dashboard-recent table { min-width: 740px; }
  }
  .teacher-content-section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    margin: .15rem 0 .75rem;
  }
  .teacher-content-section-heading span {
    color: #173f4e;
    font-size: 1.05rem;
    font-weight: 750;
    letter-spacing: -.015em;
  }
  .teacher-content-section-heading p {
    margin: .2rem 0 0;
    color: #748792;
    font-size: .78rem;
  }
  .teacher-dashboard-stats { margin-bottom: 1.15rem !important; }
  .teacher-dashboard-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, .9fr);
    gap: 1rem;
    align-items: stretch;
    margin-bottom: 1rem;
  }
  .teacher-dashboard-lower-grid {
    display: grid;
    grid-template-columns: minmax(260px, .78fr) minmax(0, 1.75fr);
    gap: 1rem;
    align-items: stretch;
    margin-top: 1rem;
  }
  .teacher-dashboard-page .teacher-dashboard-panel {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #dfe8ed !important;
    border-radius: 14px !important;
    background: #fff;
    box-shadow: 0 4px 16px rgba(15,58,74,.055) !important;
  }
  .teacher-dashboard-page .teacher-section-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .75rem;
    padding: .85rem 1rem !important;
    background: #fff !important;
    border-bottom: 1px solid #e8eef1 !important;
  }
  .teacher-dashboard-page .teacher-section-card-header h3 {
    color: #173f4e !important;
    font-size: .96rem !important;
  }
  .teacher-dashboard-page .teacher-section-card-header p { color: #7a8c96; font-size: .72rem; }
  .teacher-panel-link {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    flex-shrink: 0;
    color: #17647a;
    font-size: .73rem;
    font-weight: 700;
    text-decoration: none;
  }
  .teacher-panel-link:hover { color: #0f3a4a; }
  .teacher-panel-link svg { font-size: .65rem; }
  .teacher-schedule-body { padding: .35rem 1rem .75rem; }
  .teacher-schedule-timeline { position: relative; }
  .teacher-schedule-timeline::before {
    position: absolute;
    top: 1.1rem;
    bottom: 1.1rem;
    left: 91px;
    width: 1px;
    background: #dce7eb;
    content: "";
  }
  .teacher-schedule-item {
    position: relative;
    display: grid;
    grid-template-columns: 72px 22px minmax(0, 1fr);
    gap: .65rem;
    align-items: start;
    min-height: 76px;
    padding: .8rem 0;
  }
  .teacher-schedule-time { display: flex; flex-direction: column; gap: .15rem; padding-top: .05rem; text-align: right; }
  .teacher-schedule-time strong { color: #244b59; font-size: .78rem; }
  .teacher-schedule-time span { color: #8a9aa2; font-size: .68rem; }
  .teacher-schedule-marker { z-index: 1; display: flex; justify-content: center; padding-top: .25rem; }
  .teacher-schedule-marker span { width: 10px; height: 10px; border: 2px solid #fff; border-radius: 50%; background: #4aa3b5; box-shadow: 0 0 0 2px #b8dce2; }
  .teacher-schedule-item.is-completed .teacher-schedule-marker span { background: #3a9a70; box-shadow: 0 0 0 2px #c5e7d5; }
  .teacher-schedule-item.is-upcoming .teacher-schedule-marker span,
  .teacher-schedule-item.is-in-progress .teacher-schedule-marker span { background: #d19a2c; box-shadow: 0 0 0 2px #f4e3ba; }
  .teacher-schedule-item.is-cancelled .teacher-schedule-marker span,
  .teacher-schedule-item.is-holiday .teacher-schedule-marker span { background: #c56b70; box-shadow: 0 0 0 2px #f0d1d2; }
  .teacher-schedule-details { min-width: 0; }
  .teacher-schedule-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; }
  .teacher-schedule-heading h4 { margin: 0; color: #183f4d; font-size: .84rem; font-weight: 700; line-height: 1.35; }
  .teacher-schedule-status { flex-shrink: 0; padding: .2rem .45rem; border-radius: 999px; background: #edf5f6; color: #397888; font-size: .62rem; font-weight: 700; white-space: nowrap; }
  .is-completed .teacher-schedule-status { background: #eaf5ee; color: #39805b; }
  .is-upcoming .teacher-schedule-status,
  .is-in-progress .teacher-schedule-status { background: #fbf3df; color: #946e1c; }
  .is-cancelled .teacher-schedule-status,
  .is-holiday .teacher-schedule-status { background: #f9eded; color: #a64c55; }
  .teacher-schedule-meta { display: flex; flex-wrap: wrap; gap: .25rem .75rem; margin-top: .4rem; }
  .teacher-schedule-meta span { display: inline-flex; align-items: center; gap: .3rem; color: #7b8d96; font-size: .67rem; }
  .teacher-schedule-meta svg { color: #7fa8b2; font-size: .65rem; }
  .teacher-schedule-message { display: flex; align-items: center; justify-content: center; gap: .55rem; min-height: 120px; color: #7b8d96; font-size: .8rem; text-align: center; }
  .teacher-schedule-message svg { color: #85aab4; }
  .teacher-schedule-error { color: #a64c55; }
  .teacher-action-list { padding: .3rem .85rem .55rem; }
  .teacher-dashboard-action-item {
    display: flex;
    align-items: center;
    gap: .7rem;
    padding: .68rem .25rem;
    border-bottom: 1px solid #edf1f3;
    color: inherit;
    text-decoration: none;
    transition: padding .16s ease, background .16s ease;
  }
  .teacher-dashboard-action-item:last-child { border-bottom: 0; }
  .teacher-dashboard-action-item:hover { padding-right: .4rem; padding-left: .4rem; border-radius: 8px; background: #f6fafb; }
  .teacher-dashboard-action-icon { display: grid; flex: 0 0 34px; width: 34px; height: 34px; place-items: center; border-radius: 9px; background: #eaf3f5; color: #17647a; font-size: .88rem; }
  .teacher-dashboard-action-item:nth-child(2) .teacher-dashboard-action-icon { background: #eef4f7; color: #39738a; }
  .teacher-dashboard-action-item:nth-child(3) .teacher-dashboard-action-icon { background: #f1f3f8; color: #66779b; }
  .teacher-dashboard-action-item:nth-child(4) .teacher-dashboard-action-icon { background: #f4f1f8; color: #78689a; }
  .teacher-dashboard-action-copy { flex: 1; min-width: 0; }
  .teacher-dashboard-action-copy strong { display: block; color: #244b59; font-size: .78rem; }
  .teacher-dashboard-action-copy small { display: block; margin-top: .12rem; color: #84939a; font-size: .66rem; }
  .teacher-dashboard-action-arrow { color: #8aa0a8; font-size: .7rem; }
  .teacher-academic-work { margin-top: .15rem; }
  .teacher-academic-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; }
  .teacher-academic-link {
    display: flex;
    align-items: center;
    gap: .75rem;
    min-width: 0;
    padding: .85rem .95rem;
    border: 1px solid #e1e9ed;
    border-radius: 12px;
    background: rgba(255,255,255,.92);
    box-shadow: 0 3px 11px rgba(15,58,74,.04);
    color: inherit;
    text-decoration: none;
    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  }
  .teacher-academic-link:hover { transform: translateY(-2px); border-color: #b7d5dd; box-shadow: 0 8px 18px rgba(15,58,74,.08); }
  .teacher-academic-link-icon { display: grid; flex: 0 0 38px; width: 38px; height: 38px; place-items: center; border-radius: 10px; background: #eaf3f5; color: #17647a; }
  .teacher-academic-link-copy { min-width: 0; flex: 1; }
  .teacher-academic-link-copy strong { display: block; color: #244b59; font-size: .8rem; }
  .teacher-academic-link-copy small { display: block; margin-top: .15rem; color: #82929a; font-size: .67rem; }
  .teacher-academic-link > svg:last-child { color: #8aa0a8; font-size: .7rem; }
  .teacher-activity-list { padding: .25rem .9rem; }
  .teacher-activity-item { display: flex; align-items: center; gap: .6rem; padding: .75rem 0; border-bottom: 1px solid #edf1f3; }
  .teacher-activity-item:last-child { border-bottom: 0; }
  .teacher-activity-icon { display: grid; flex: 0 0 32px; width: 32px; height: 32px; place-items: center; border-radius: 9px; background: #eaf3f5; color: #24788a; font-size: .8rem; }
  .teacher-activity-item > div { min-width: 0; flex: 1; }
  .teacher-activity-item strong,
  .teacher-activity-item span:not(.teacher-activity-icon) { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .teacher-activity-item strong { color: #244b59; font-size: .75rem; }
  .teacher-activity-item > div span { margin-top: .12rem; color: #87969d; font-size: .66rem; }
  .teacher-activity-item time { color: #8998a0; font-size: .63rem; white-space: nowrap; }
  @media (max-width: 991px) {
    .teacher-dashboard-main-grid { grid-template-columns: minmax(0, 1fr); }
    .teacher-dashboard-lower-grid { grid-template-columns: minmax(0, 1fr); }
    .teacher-academic-links { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 575px) {
    .teacher-dashboard-stats { grid-template-columns: minmax(0, 1fr); }
    .teacher-academic-links { grid-template-columns: minmax(0, 1fr); }
    .teacher-schedule-timeline::before { left: 75px; }
    .teacher-schedule-item { grid-template-columns: 58px 18px minmax(0, 1fr); gap: .45rem; }
    .teacher-schedule-heading { flex-direction: column; gap: .3rem; }
    .teacher-dashboard-page .teacher-section-card-header { padding: .75rem .8rem !important; }
  }
`}</style>

          <div className="teacher-content-section-heading">
            <div>
              <span>Teaching Overview</span>
              <p>Your teaching activity at a glance</p>
            </div>
          </div>

          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            <div className="teacher-dashboard-stats">
              <div>
                <StatCard
                  icon={FaCalendarAlt}
                  label="Total Lectures"
                  value={stats.totalLecturesTaken || 0}
                  color={BRAND_COLORS.primary.main}
                  gradient={BRAND_COLORS.primary.gradient}
                  subtitle="Lectures conducted"
                />
              </div>
              <div>
                <StatCard
                  icon={FaQrcode}
                  label="Open Sessions"
                  value={stats.openSessions || 0}
                  color={BRAND_COLORS.success.main}
                  gradient={BRAND_COLORS.success.gradient}
                  subtitle="Active attendance sessions"
                />
              </div>
              <div>
                <StatCard
                  icon={FaCheckCircle}
                  label="Closed Sessions"
                  value={stats.closedSessions || 0}
                  color={BRAND_COLORS.info.main}
                  gradient={BRAND_COLORS.info.gradient}
                  subtitle="Completed sessions"
                />
              </div>
              <div>
                <StatCard
                  icon={FaChartBar}
                  label="Attendance Percentage"
                  value={`${stats.attendancePercentage || 0}%`}
                  color={BRAND_COLORS.warning.main}
                  gradient={BRAND_COLORS.warning.gradient}
                  subtitle="Overall attendance rate"
                />
              </div>
            </div>
          </motion.div>

          <div className="teacher-dashboard-main-grid">
            <SectionCard
              className="teacher-dashboard-schedule"
              title="Today's Teaching Schedule"
              icon={<FaCalendarAlt />}
              subtitle={currentTime.toLocaleDateString(undefined, {
                weekday: "long", month: "long", day: "numeric"
              })}
              color={BRAND_COLORS.primary.main}
              action={<Link className="teacher-panel-link" to="/timetable/weekly-timetable">Full Timetable <FaArrowRight /></Link>}
            >
              <div className="teacher-schedule-body">
                {scheduleError ? (
                  <div className="teacher-schedule-message teacher-schedule-error"><FaInfoCircle />{scheduleError}</div>
                ) : weeklySchedule === null ? (
                  <div className="teacher-schedule-message">Loading today's schedule…</div>
                ) : todaySchedule.length === 0 ? (
                  <div className="teacher-schedule-message">
                    <FaCalendarAlt />
                    <span>No lectures are scheduled for today.</span>
                  </div>
                ) : (
                  <div className="teacher-schedule-timeline">
                    {todaySchedule.map((slot, index) => {
                      const status = getScheduleStatus(slot, index, nextScheduledIndex, currentTime);
                      const courseName = slot.timetable_id?.course_id?.name
                        || slot.course_id?.name
                        || slot.timetable_id?.name;
                      const departmentName = slot.department_id?.name || slot.department_id?.code;
                      return (
                        <article className={`teacher-schedule-item is-${status.key}`} key={slot._id || `${slot.startTime}-${index}`}>
                          <div className="teacher-schedule-time">
                            <strong>{formatScheduleTime(slot.startTime)}</strong>
                            <span>{formatScheduleTime(slot.endTime)}</span>
                          </div>
                          <div className="teacher-schedule-marker"><span /></div>
                          <div className="teacher-schedule-details">
                            <div className="teacher-schedule-heading">
                              <h4>{slot.subject_id?.name || "Subject details unavailable"}</h4>
                              <span className="teacher-schedule-status">{status.label}</span>
                            </div>
                            <div className="teacher-schedule-meta">
                              {courseName && <span><FaGraduationCap />{courseName}</span>}
                              {departmentName && <span><FaUniversity />{departmentName}</span>}
                              {slot.room && <span><FaDatabase />Room {slot.room}</span>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              className="teacher-dashboard-action-centre"
              title="Action Centre"
              icon={<FaArrowRight />}
              subtitle="Frequently used teaching tools"
              color={BRAND_COLORS.info.main}
            >
              <div className="teacher-action-list">
                <DashboardAction icon={FaUsers} title="Mark Attendance" description="Record attendance for a class" to="/timetable/weekly-timetable" />
                <DashboardAction icon={FaEdit} title="Enter Marks" description="Open the student marks roster" to="/teacher/marks-entry" />
                <DashboardAction icon={FaCalendarAlt} title="Manage Exceptions" description="Review timetable changes" to="/timetable/exceptions" />
                <DashboardAction icon={FaBell} title="Notifications" description="Communicate with students and parents" to="/teacher/notifications/create" />
                <DashboardAction icon={FaQrcode} title="Create Attendance Session" description="Start a new lecture attendance session" to="/attendance/my-sessions-list" />
              </div>
            </SectionCard>
          </div>

          <section className="teacher-academic-work">
            <div className="teacher-content-section-heading">
              <div>
                <span>Academic Work</span>
                <p>Quick access to assessment and attendance tools</p>
              </div>
            </div>
            <div className="teacher-academic-links">
              <AcademicLink icon={FaCalendarAlt} title="Exam Timetable" description="View published exam schedules" to="/teacher/exam-timetable" />
              <AcademicLink icon={FaEdit} title="Marks Entry" description="Enter and review student marks" to="/teacher/marks-entry" />
              <AcademicLink icon={FaChartBar} title="Attendance Report" description="Review attendance records and trends" to="/attendance/report" />
            </div>
          </section>

          <div className="teacher-dashboard-lower-grid">
            <SectionCard
              className="teacher-dashboard-activity"
              title="Recent Teaching Activity"
              icon={<FaClock />}
              subtitle="Latest teaching sessions"
              color={BRAND_COLORS.info.main}
            >
              <div className="teacher-activity-list">
                {recentLectures?.length ? recentLectures.slice(0, 4).map((lecture) => (
                  <div className="teacher-activity-item" key={`activity-${lecture._id}`}>
                    <span className="teacher-activity-icon"><FaChalkboardTeacher /></span>
                    <div>
                      <strong>{lecture.subject_id?.name || lecture.course_id?.name || "Teaching session"}</strong>
                      <span>{lecture.course_id?.name || lecture.department_id?.name || "Recent session"}</span>
                    </div>
                    <time>{lecture.lectureDate ? new Date(lecture.lectureDate).toLocaleDateString() : ""}</time>
                  </div>
                )) : (
                  <div className="teacher-schedule-message">No recent teaching activity is available.</div>
                )}
              </div>
            </SectionCard>

            {/* ================= RECENT LECTURES ================= */}
            <SectionCard
              className="teacher-dashboard-recent"
              title="Recent Sessions"
              icon={<FaCalendarAlt />}
              subtitle="Your latest attendance sessions"
              color={BRAND_COLORS.info.main}
              action={<Link className="teacher-panel-link" to="/attendance/my-sessions-list">View All <FaArrowRight /></Link>}
            >
              <div className="p-3 p-md-4 teacher-recent-body">
                {recentLectures && recentLectures.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Date</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Course</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Subject</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Department</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Status</th>
                          <th className="py-3 px-3 fw-semibold text-uppercase small">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentLectures.map((lec, idx) => (
                          <LectureRow
                            key={lec._id}
                            lecture={lec}
                            delay={idx * 0.05}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    icon={<FaCalendarAlt style={{ color: BRAND_COLORS.info.main }} />}
                    title="No Recent Lectures"
                    message="You haven't conducted any lectures yet. Start by creating your first attendance session!"
                  />
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STYLES ================= */
const tableHeaderStyle = {
  padding: '1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#4a5568',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

/* ================= ERROR DISPLAY ================= */
function ErrorDisplay({ message, onRetry }) {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4"
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' }}>
      <div className="card border-0 shadow-lg text-center p-4 p-md-5" style={{ maxWidth: '500px', width: '100%', borderRadius: '1.5rem' }}>
        <div
          className="d-flex align-items-center justify-content-center rounded-circle mb-4 mx-auto"
          style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            color: BRAND_COLORS.danger.main,
            fontSize: '3rem'
          }}
        >
          <FaTimesCircle />
        </div>
        <h3 className="fw-bold mb-2" style={{ color: '#1e293b', fontSize: '1.75rem' }}>
          Dashboard Error
        </h3>
        <p className="text-muted mb-4" style={{ lineHeight: 1.6 }}>
          {message}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="btn btn-primary d-flex align-items-center gap-2 mx-auto px-4 py-3"
          style={{
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)'
          }}
        >
          <motion.div variants={spinVariants} animate="animate">
            <FaSyncAlt />
          </motion.div>
          Refresh Dashboard
        </motion.button>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ icon: Icon, label, value, color, gradient, subtitle }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="card h-100 border-0 teacher-stat-card"
      style={{
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        borderLeft: `4px solid ${color}`,
        cursor: 'default'
      }}
    >
      <div className="card-body p-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0 teacher-stat-icon"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: `${color}18`,
              color: color === BRAND_COLORS.warning.main ? '#8a6500' : color,
              fontSize: '1.75rem',
              boxShadow: 'none'
            }}
          >
            <Icon />
          </div>
          <div className="flex-grow-1">
            <div className="small fw-semibold text-muted mb-1 teacher-stat-label" style={{ fontSize: '0.875rem' }}>
              {label}
            </div>
            <div className="h2 mb-0 fw-bold teacher-stat-value" style={{ fontSize: '1.75rem', color: '#1e293b' }}>
              {value}
            </div>
            {subtitle && (
              <div className="small text-muted mt-1 teacher-stat-subtitle" style={{ fontSize: '0.8rem' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================= SECTION CARD ================= */
function SectionCard({ title, icon, subtitle, color, children, className = "", action }) {
  return (
    <div
      className={`card border-0 h-100 teacher-dashboard-panel ${className}`}
      style={{
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden'
      }}
    >
      <div
        className="px-4 py-3 teacher-section-card-header"
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderBottom: '1px solid #eaeaea'
        }}
      >
        <div className="teacher-section-card-title">
          <h3 className="mb-0 fw-bold" style={{ fontSize: '1.125rem', color: '#1e293b' }}>
            <span className="me-2" style={{ color: color, fontSize: '1.1rem' }}>{icon}</span>
            {title}
          </h3>
          {subtitle && <p className="text-muted small mb-0 mt-1 ms-4">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function DashboardAction({ icon: Icon, title, description, to }) {
  return (
    <Link className="teacher-dashboard-action-item" to={to}>
      <span className="teacher-dashboard-action-icon"><Icon /></span>
      <span className="teacher-dashboard-action-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <FaArrowRight className="teacher-dashboard-action-arrow" />
    </Link>
  );
}

function AcademicLink({ icon: Icon, title, description, to }) {
  return (
    <Link className="teacher-academic-link" to={to}>
      <span className="teacher-academic-link-icon"><Icon /></span>
      <span className="teacher-academic-link-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <FaArrowRight />
    </Link>
  );
}

function formatScheduleTime(value) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return "--";
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getScheduleStatus(slot, index, nextIndex, now) {
  if (slot.status === "CANCELLED") return { key: "cancelled", label: "Cancelled" };
  if (slot.status === "HOLIDAY") return { key: "holiday", label: "Holiday" };
  const [startHour, startMinute] = (slot.startTime || "").split(":").map(Number);
  const [endHour, endMinute] = (slot.endTime || "").split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  if (slot.startTime && slot.endTime && currentMinutes >= endMinutes) return { key: "completed", label: "Completed" };
  if (slot.startTime && slot.endTime && currentMinutes >= startMinutes) return { key: "in-progress", label: "In progress" };
  if (index === nextIndex) return { key: "upcoming", label: "Upcoming" };
  return { key: "scheduled", label: "Scheduled" };
}

/* ================= ACTION CARD ================= */
function ActionCard({ icon: Icon, title, desc, link, color, gradient }) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(link)}
      className="card border-0 h-100 text-center cursor-pointer d-flex flex-column teacher-action-card"
      style={{
        borderRadius: '16px',
        padding: '1.75rem',
        transition: 'all 0.3s ease',
        border: '2px solid transparent',
        overflow: 'hidden'
      }}
    >
      <div
        className="position-absolute top-0 start-0 w-100 teacher-action-accent"
        style={{
        height: '4px',
        background: color,
        zIndex: 1
        }}
      />

      <motion.div
        className="d-flex align-items-center justify-content-center mb-3 teacher-action-icon"
        style={{
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: `${color}18`,
        color: color === BRAND_COLORS.warning.main ? '#8a6500' : color,
        fontSize: '2rem',
        margin: '0 auto',
        boxShadow: 'none'
        }}
      >
        <Icon />
      </motion.div>

      <h4
          className="fw-bold mb-2 teacher-action-title"
          style={{
            fontSize: '1.125rem',
            color: '#1e293b',
            minHeight: '54px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
        {title}
      </h4>

        <p
          className="text-muted mb-3 teacher-action-description"
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.5,
            minHeight: '63px',
          }}
        >
        {desc}
      </p>

      <span
       className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold small mt-auto teacher-action-link"
        style={{
          backgroundColor: `${color}12`,
          color: color === BRAND_COLORS.warning.main ? '#8a6500' : color,
          fontSize: '0.8rem'
        }}
      >
        <FaArrowRight size={12} />
        Get Started
      </span>
    </motion.div>
  );
}

/* ================= LECTURE ROW ================= */
function LectureRow({ lecture, delay = 0 }) {
  const navigate = useNavigate();
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return BRAND_COLORS.success.main;
      case "CLOSED":
        return BRAND_COLORS.secondary.main;
      default:
        return BRAND_COLORS.warning.main;
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      className="table-row-hover"
    >
      <td className="py-3 px-3 align-middle">
        {new Date(lecture.lectureDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })}
      </td>
      <td className="py-3 px-3 align-middle">
        <div className="fw-semibold" style={{ color: '#1e293b' }}>
          {lecture.course_id?.name || 'N/A'}
        </div>
        <div className="small text-muted mt-1">
          {lecture.course_id?.code || ''}
        </div>
      </td>
      <td className="py-3 px-3 align-middle">
        <div className="fw-semibold" style={{ color: '#1e293b' }}>
          {lecture.subject_id?.name || 'N/A'}
        </div>
        <div className="small text-muted mt-1">
          {lecture.subject_id?.code || ''}
        </div>
      </td>
      <td className="py-3 px-3 align-middle">
        {lecture.department_id?.name || lecture.course_id?.name || "N/A"}
      </td>
      <td className="py-3 px-3 align-middle">
        <motion.span
          variants={blinkVariants}
          initial="initial"
          animate="blink"
          className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold small"
          style={{
            backgroundColor: `${getStatusColor(lecture.status)}15`,
            color: getStatusColor(lecture.status),
            border: `1px solid ${getStatusColor(lecture.status)}30`,
            fontSize: '0.8rem'
          }}
        >
          {lecture.status === "OPEN" && <FaQrcode size={12} />}
          {lecture.status === "CLOSED" && <FaCheckCircle size={12} />}
          {lecture.status}
        </motion.span>
      </td>
      <td className="py-3 px-3 align-middle">
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/timetable/weekly-timetable`);
            }}
            className="d-flex align-items-center justify-content-center flex-shrink-0 lecture-action-button"
            aria-label="View attendance"
            title="View attendance"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(15, 58, 74, 0.25)',
              cursor: 'pointer'
            }}
          >
            <FaEye
              size={16}
              color="#ffffff"
              style={{
                display: 'block',
                color: '#ffffff'
              }}
            />
          </motion.button>
      </td>
    </motion.tr>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message }) {
  return (
    <div className="text-center py-5" style={{ color: '#64748b' }}>
      <div className="mb-4" style={{ fontSize: '4rem', opacity: 0.6, color: '#e2e8f0' }}>
        {icon}
      </div>
      <h4 className="fw-bold mb-3" style={{ color: '#1e293b', fontSize: '1.5rem' }}>
        {title}
      </h4>
      <p className="mb-0" style={{ fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
        {message}
      </p>
    </div>
  );
}