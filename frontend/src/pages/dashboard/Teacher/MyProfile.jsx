import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";
import Breadcrumb from "../../../components/Breadcrumb";
import {
  FaUserTie,
  FaEnvelope,
  FaUniversity,
  FaIdBadge,
  FaGraduationCap,
  FaBriefcase,
  FaCheckCircle,
  FaBuilding,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaEdit,
  FaSyncAlt,
  FaUsers,
  FaChalkboardTeacher,
  FaClock,
  FaAward,
  FaStar,
  FaEye,
  FaArrowLeft,
  FaShieldAlt,
  FaInfoCircle,
  FaDatabase
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

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

export default function MyProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/teacher/dashboard" />;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/teachers/my-profile");

        // Backend returns { data: { teacher: {...} } }, axios interceptor unwraps it
        const profileData = res.data?.teacher || res.data?.data?.teacher || null;
        setProfile(profileData);
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode =
          err.response?.data?.code || (!err.response ? "NETWORK_ERROR" : undefined);
        const backendMessage = err.response?.data?.message;

        logger.error("Teacher profile load error:", {
          statusCode,
          errorCode,
          backendMessage,
          page: "MyProfile",
        });

        setError({
          message: "Failed to load profile data. Please try again.",
          statusCode,
          errorCode,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
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
          text="Loading Teacher Profile..."
        />
      </div>
    </div>
  );
}

  if (error) {
    return (
      <ApiError
        title="Profile Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={() => window.location.reload()}
        onGoBack={() => navigate("/teacher/dashboard")}
        retryCount={0}
        maxRetry={3}
      />
    );
  }

  if (!profile) {
    return <EmptyState />;
  }

  return (
    <AnimatePresence mode="wait">

<style>{`
        /* =========================================
          TEACHER PROFILE - MOBILE & TABLET
          ========================================= */

        @media (max-width: 991px) {

          /* ================= PROFILE BANNER ================= */

          .teacher-profile-banner {
            padding: 1.25rem !important;
            gap: 1rem !important;
          }

          .teacher-profile-icon {
            width: 75px !important;
            height: 75px !important;
            font-size: 2.5rem !important;
          }

          .teacher-profile-banner h1 {
            font-size: 1.8rem !important;
            margin-bottom: 0.5rem !important;
          }

          .teacher-profile-banner > div:nth-child(2) > div {
            gap: 0.5rem !important;
          }

          .teacher-profile-banner > div:nth-child(2) span {
            font-size: 1rem !important;
          }

          /* Buttons side by side */
          .teacher-profile-banner > div:nth-child(3) {
            width: 100% !important;
            display: flex !important;
            gap: 0.6rem !important;
          }

          .teacher-profile-banner > div:nth-child(3) button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 0.65rem 0.4rem !important;
            font-size: 0.85rem !important;
            white-space: nowrap !important;
          }


          /* ================= PERSONAL INFORMATION ================= */

          .teacher-personal-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
            margin: 0 !important;
          }

          /* Remove Bootstrap column sizing */
          .teacher-personal-grid > div {
            width: auto !important;
            flex: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Information card */
          .teacher-personal-grid > div > div {
            width: 100% !important;
            min-height: 82px !important;
            padding: 12px !important;
            gap: 10px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          /* Icon */
          .teacher-personal-grid > div > div > div:first-child {
            width: 38px !important;
            height: 38px !important;
            min-width: 38px !important;
            font-size: 1rem !important;
          }

          /* Text container */
          .teacher-personal-grid > div > div > div:last-child {
            min-width: 0 !important;
            flex: 1 !important;
            overflow: hidden !important;
          }

          /* Label */
          .teacher-personal-grid h6 {
            font-size: 0.72rem !important;
            line-height: 1.2 !important;
            letter-spacing: 0.4px !important;
            margin-bottom: 5px !important;
          }

          /* Value */
          .teacher-personal-grid h6 + div {
            font-size: 0.9rem !important;
            line-height: 1.3 !important;
            font-weight: 600 !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }

          /* Email */
          .teacher-personal-grid > div:nth-child(1) h6 + div {
            font-size: 0.82rem !important;
            white-space: nowrap !important;
          }

          /* Contact */
          .teacher-personal-grid > div:nth-child(2) h6 + div {
            font-size: 0.85rem !important;
            white-space: nowrap !important;
          }

          /* Personal Information section padding */
          .erp-page .row .p-4 {
            padding: 0.75rem !important;
          }
        }


        /* =========================================
          SMALL MOBILE
          ========================================= */

        @media (max-width: 575px) {

          .teacher-profile-banner {
            padding: 1rem !important;
            gap: 0.75rem !important;
          }

          .teacher-profile-icon {
            width: 65px !important;
            height: 65px !important;
            font-size: 2.1rem !important;
          }

          .teacher-profile-banner h1 {
            font-size: 1.55rem !important;
          }

          .teacher-profile-banner > div:nth-child(2) span {
            font-size: 0.9rem !important;
          }

          .teacher-profile-banner > div:nth-child(3) {
            gap: 0.5rem !important;
          }

          .teacher-profile-banner > div:nth-child(3) button {
            font-size: 0.75rem !important;
            padding: 0.6rem 0.25rem !important;
          }


          /* Personal Information */
          .teacher-personal-grid {
            gap: 8px !important;
          }

          .teacher-personal-grid > div > div {
            min-height: 80px !important;
            padding: 9px !important;
            gap: 7px !important;
          }

          .teacher-personal-grid > div > div > div:first-child {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            font-size: 0.8rem !important;
          }

          .teacher-personal-grid h6 {
            font-size: 0.63rem !important;
            line-height: 1.2 !important;
            margin-bottom: 4px !important;
          }

          .teacher-personal-grid h6 + div {
            font-size: 0.78rem !important;
            line-height: 1.25 !important;
          }

          .teacher-personal-grid > div:nth-child(1) h6 + div {
            font-size: 0.65rem !important;
          }

          .teacher-personal-grid > div:nth-child(2) h6 + div {
            font-size: 0.68rem !important;
          }
        }
        .teacher-profile-page > div { max-width: 100%; }
        .teacher-profile-header {
          margin: 0 0 1.25rem;
          overflow: hidden;
          border: 1px solid rgba(15, 58, 74, .15);
          border-radius: 18px;
          background: linear-gradient(135deg, #0f3a4a 0%, #164e63 100%);
          color: #fff;
          box-shadow: 0 12px 30px rgba(15, 58, 74, .15);
        }
        .teacher-profile-banner {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          padding: 1.5rem 1.7rem 1.25rem;
          background: transparent;
        }
        .teacher-profile-icon {
          display: flex;
          flex: 0 0 64px;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 16px;
          background: rgba(255,255,255,.11);
          font-size: 1.8rem;
        }
        .teacher-profile-identity { flex: 1 1 auto; min-width: 220px; }
        .teacher-profile-identity h1 {
          margin: 0 0 .65rem;
          color: #fff;
          font-size: clamp(1.45rem, 2.2vw, 2rem);
          font-weight: 750;
          letter-spacing: -.03em;
          line-height: 1.15;
          overflow-wrap: anywhere;
        }
        .teacher-profile-credentials { display: flex; flex-wrap: wrap; gap: .45rem; }
        .teacher-profile-credentials span {
          display: inline-flex;
          align-items: center;
          gap: .45rem;
          padding: .36rem .62rem;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 7px;
          background: rgba(255,255,255,.07);
          color: rgba(245,251,253,.86);
          font-size: .78rem;
        }
        .teacher-profile-credentials svg { color: #8dd4e3; }
        .teacher-profile-actions { display: flex; flex: 0 0 auto; gap: .55rem; }
        .teacher-profile-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .45rem;
          min-height: 40px;
          padding: .55rem .8rem;
          border: 1px solid rgba(255,255,255,.4);
          border-radius: 9px;
          color: #fff;
          font-size: .8rem;
          font-weight: 650;
          white-space: nowrap;
          cursor: pointer;
          transition: background .18s ease, color .18s ease, border-color .18s ease;
        }
        .teacher-profile-back { background: rgba(255,255,255,.07); }
        .teacher-profile-edit { border-color: #fff !important; background: #fff; color: #0f3a4a !important; }
        .teacher-profile-back:hover { background: rgba(255,255,255,.16); }
        .teacher-profile-edit:hover { background: #e8f5f8; }
        .teacher-profile-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
          align-items: center;
          gap: .7rem;
          margin: 0 1.7rem;
          padding: .85rem 0 1rem;
          border-top: 1px solid rgba(255,255,255,.18);
        }
        .teacher-profile-meta-item { display: flex; align-items: center; gap: .6rem; min-width: 0; }
        .teacher-profile-meta-item > svg { flex: 0 0 auto; color: #8dd4e3; font-size: .95rem; }
        .teacher-profile-meta-item > span { min-width: 0; color: #f3fbfd; font-size: .78rem; font-weight: 600; overflow-wrap: anywhere; }
        .teacher-profile-meta-item small { display: block; margin-bottom: .15rem; color: rgba(226,242,247,.62); font-size: .62rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .teacher-profile-status {
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          padding: .45rem .7rem;
          border: 1px solid rgba(121,225,171,.35);
          border-radius: 8px;
          background: rgba(46,167,105,.17);
          color: #c3f4d8;
          font-size: .75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .teacher-profile-section {
          height: 100%;
          overflow: hidden;
          border: 1px solid #e0e9ee !important;
          border-radius: 15px !important;
          background: #fff;
          box-shadow: 0 5px 18px rgba(15,58,74,.055) !important;
          transition: box-shadow .2s ease, transform .2s ease;
        }
        .teacher-profile-section-heading {
          padding: .95rem 1.2rem !important;
          background: #fff !important;
          border-bottom: 1px solid #e9eff2 !important;
        }
        .teacher-profile-section-heading h3 { color: #183f4d !important; font-size: 1rem !important; }
        .teacher-profile-section-heading h3 span { color: #16738a !important; }
        .teacher-profile-section-heading > span { font-size: .75rem !important; }
        .teacher-profile-panel-body { padding: 1rem !important; }
        .teacher-profile-personal-panel .teacher-personal-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: .7rem !important;
          margin: 0 !important;
        }
        .teacher-profile-personal-panel .teacher-personal-grid > div {
          width: auto !important;
          min-width: 0;
          padding: 0 !important;
        }
        .teacher-profile-personal-panel .teacher-personal-grid > div > div {
          height: 100%;
          min-height: 92px;
          padding: .8rem !important;
          gap: .7rem !important;
          border: 1px solid #e6edf0 !important;
          border-radius: 11px !important;
          background: #fbfdfe !important;
          align-items: center !important;
          transition: border-color .18s ease, background .18s ease;
        }
        .teacher-profile-personal-panel .teacher-personal-grid > div > div:hover { border-color: #b7d5dd !important; background: #f7fbfc !important; }
        .teacher-profile-personal-panel .teacher-personal-grid > div > div > div:first-child {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 38px;
          width: 38px !important;
          height: 38px !important;
          border-radius: 10px !important;
          background: #e8f3f5 !important;
          color: #17647a !important;
          font-size: 1rem !important;
        }
        .teacher-profile-personal-panel .teacher-personal-grid > div > div > div:last-child { min-width: 0; }
        .teacher-profile-personal-panel .teacher-personal-grid h6 {
          margin-bottom: .25rem !important;
          color: #758792 !important;
          font-size: .64rem !important;
          font-weight: 700 !important;
          letter-spacing: .055em !important;
        }
        .teacher-profile-personal-panel .teacher-personal-grid h6 + div {
          color: #183f4d !important;
          font-size: .88rem !important;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .teacher-profile-courses-panel .row,
        .teacher-profile-subjects-panel .row {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: .75rem !important;
          margin: 0 !important;
        }
        .teacher-profile-courses-panel .row > div,
        .teacher-profile-subjects-panel .row > div { width: auto; min-width: 0; padding: 0; }
        .teacher-profile-course-card,
        .teacher-profile-subject-card {
          height: 100%;
          min-height: 112px;
          padding: .95rem !important;
          border: 1px solid #e3eaee !important;
          border-radius: 12px !important;
          background: #fff;
          box-shadow: 0 2px 8px rgba(15,58,74,.035);
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .teacher-profile-course-card:hover,
        .teacher-profile-subject-card:hover { border-color: #b5d3dc !important; box-shadow: 0 8px 18px rgba(15,58,74,.09) !important; }
        .teacher-profile-course-icon,
        .teacher-profile-subject-icon {
          width: 38px !important;
          height: 38px !important;
          border-radius: 10px !important;
          background: #eaf4f6 !important;
          color: #17647a !important;
          font-size: 1rem !important;
        }
        .teacher-profile-subject-icon { background: #eef4f4 !important; color: #227c7b !important; }
        .teacher-profile-course-name,
        .teacher-profile-subject-name { color: #173f4e !important; font-size: .92rem !important; line-height: 1.35; overflow-wrap: anywhere; }
        .teacher-profile-course-code,
        .teacher-profile-subject-code { padding: .22rem .5rem !important; border-radius: 6px !important; background: #edf5f7 !important; color: #286879 !important; font-size: .7rem !important; }
        .teacher-profile-subject-card > div > div:last-child > div > span:last-child { font-size: .75rem !important; }

        @media (max-width: 991px) {
          .teacher-profile-banner { flex-wrap: wrap; }
          .teacher-profile-actions { margin-left: auto; }
          .teacher-profile-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .teacher-profile-personal-panel .teacher-personal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .teacher-profile-courses-panel .row,
          .teacher-profile-subjects-panel .row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 575px) {
          .teacher-profile-banner { padding: 1rem !important; gap: .75rem; }
          .teacher-profile-icon { flex-basis: 48px; width: 48px; height: 48px; border-radius: 12px; font-size: 1.35rem; }
          .teacher-profile-identity { min-width: calc(100% - 64px); }
          .teacher-profile-identity h1 { font-size: 1.35rem; }
          .teacher-profile-credentials { gap: .3rem; }
          .teacher-profile-credentials span { padding: .3rem .45rem; font-size: .69rem; }
          .teacher-profile-actions { width: 100%; margin: 0; }
          .teacher-profile-actions button { flex: 1; padding: .5rem .35rem; font-size: .72rem; }
          .teacher-profile-meta { grid-template-columns: 1fr; gap: .65rem; margin: 0 1rem; padding: .75rem 0; }
          .teacher-profile-status { justify-self: start; }
          .teacher-profile-personal-panel .teacher-personal-grid { grid-template-columns: 1fr; }
          .teacher-profile-courses-panel .row,
          .teacher-profile-subjects-panel .row { grid-template-columns: 1fr; }
        }
      `}</style>


      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="erp-page erp-viewport-min-100 teacher-profile-page"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '0.5rem',
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* ================= BREADCRUMB ================= */}
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/teacher/dashboard" },
              { label: "My Profile" },
            ]}
          />

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            className="teacher-profile-header"
          >
            <div className="teacher-profile-banner">
              <motion.div 
                className="teacher-profile-icon"
                variants={pulseVariants}
                initial="initial"
                animate="pulse"
              >
                <FaUserTie />
              </motion.div>

              <div className="teacher-profile-identity">
                <h1>{profile.name}</h1>
                <div className="teacher-profile-credentials">
                  <span><FaChalkboardTeacher />{profile.designation || 'Faculty Member'}</span>
                  <span><FaGraduationCap />{profile.qualification || 'N/A'}</span>
                  <span><FaBriefcase />{profile.experienceYears || 0} years experience</span>
                </div>
              </div>

              <div className="teacher-profile-actions">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={() => navigate('/teacher/dashboard')}
                  className="teacher-profile-back"
                >
                  <FaArrowLeft /> Back to Dashboard
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={() => navigate('/profile/edit-profile')}
                  className="teacher-profile-edit"
                >
                  <FaEdit /> Edit Profile
                </motion.button>
              </div>
            </div>

            <div className="teacher-profile-meta">
              <div className="teacher-profile-meta-item">
                <FaIdBadge />
                <span><small>Employee ID</small>{profile.employeeId}</span>
              </div>
              <div className="teacher-profile-meta-item">
                <FaUniversity />
                <span><small>Department</small>{profile.department_id?.name || profile.department_id?.code || "Not Assigned"}</span>
              </div>
              <div className="teacher-profile-meta-item">
                <FaBuilding />
                <span><small>College</small>{profile.college_id?.name || 'N/A'}</span>
              </div>
              <motion.div
                variants={blinkVariants}
                initial="initial"
                animate="blink"
                className="teacher-profile-status"
              >
                <FaCheckCircle /> {profile.status || 'ACTIVE'}
              </motion.div>
            </div>
          </motion.div>

          {/* ================= MAIN CONTENT GRID - Bootstrap ================= */}
          <div className="row g-4">
            {/* LEFT COLUMN - PERSONAL INFO */}
            <motion.div
              variants={fadeInVariants}
              custom={0}
              initial="hidden"
              animate="visible"
              className="col-12"
            >
              <SectionCard
                className="teacher-profile-personal-panel"
                title="Personal Information"
                icon={<FaUserTie />}
                color={BRAND_COLORS.primary.main}
              >
                <div className="p-4 teacher-profile-panel-body">
                  <div className="row g-3 teacher-personal-grid">
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaEnvelope />}
                        label="Email Address"
                        value={profile.email}
                        copyable
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaPhoneAlt />}
                        label="Contact Number"
                        value={profile.mobileNumber || 'Not Set'}
                        copyable
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaMapMarkerAlt />}
                        label="Address"
                        value={profile.address || 'Not Set'}
                        fullWidth
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaCalendarAlt />}
                        label="Date of Birth"
                        value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not Set'}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaGraduationCap />}
                        label="Highest Qualification"
                        value={profile.qualification || 'N/A'}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaBriefcase />}
                        label="Total Experience"
                        value={`${profile.experienceYears || 0} years`}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaClock />}
                        label="Joining Date"
                        value={profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : (profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Not Set')}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaShieldAlt />}
                        label="Employment Type"
                        value={profile.employmentType || 'Permanent'}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </motion.div>

            {/* MIDDLE COLUMN - ASSIGNED COURSES */}
            <motion.div
              variants={fadeInVariants}
              custom={1}
              initial="hidden"
              animate="visible"
              className="col-12"
            >
              <SectionCard
                className="teacher-profile-courses-panel"
                title="Assigned Courses"
                icon={<FaGraduationCap />}
                color={BRAND_COLORS.info.main}
                subtitle={`${profile.courses?.length || 0} course${(profile.courses?.length || 0) !== 1 ? 's' : ''} assigned`}
              >
                <div className="p-4 teacher-profile-panel-body">
                  {profile.courses && profile.courses.length > 0 ? (
                    <div className="row g-3">
                      {profile.courses.map((course, idx) => (
                        <div className="col-12 col-sm-6 col-lg-4" key={course._id}>
                          <CourseCard
                            key={course._id}
                            course={course}
                            delay={idx * 0.05}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySection
                      icon={<FaGraduationCap style={{ color: BRAND_COLORS.info.main }} />}
                      title="No Courses Assigned"
                      message="You haven't been assigned any courses yet. Contact your college admin for course allocation."
                    />
                  )}
                </div>
              </SectionCard>
            </motion.div>

            {/* RIGHT COLUMN - TEACHING SUBJECTS */}
            <motion.div
              variants={fadeInVariants}
              custom={2}
              initial="hidden"
              animate="visible"
              className="col-12"
            >
              <SectionCard
                className="teacher-profile-subjects-panel"
                title="Teaching Subjects"
                icon={<FaChalkboardTeacher />}
                color={BRAND_COLORS.warning.main}
                subtitle={`${profile.subjects?.length || 0} subject${(profile.subjects?.length || 0) !== 1 ? 's' : ''} taught`}
              >
                <div className="p-4 teacher-profile-panel-body">
                  {profile.subjects && profile.subjects.length > 0 ? (
                    <div className="row g-3">
                      {profile.subjects.map((subject, idx) => (
                        <div className="col-12 col-sm-6 col-lg-4" key={subject._id}>
                          <SubjectCard
                            key={subject._id}
                            subject={subject}
                            delay={idx * 0.05}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySection 
                      icon={<FaChalkboardTeacher style={{ color: BRAND_COLORS.warning.main }} />} 
                      title="No Subjects Assigned" 
                      message="You haven't been assigned any teaching subjects yet."
                    />
                  )}
                </div>
              </SectionCard>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
        maxWidth: '500px',
        width: '100%',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        <div style={{ 
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(108, 117, 125, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: BRAND_COLORS.secondary.main,
          fontSize: '3rem'
        }}>
          <FaUserTie />
        </div>
        <h3 style={{ 
          margin: '0 0 0.5rem 0', 
          fontWeight: 700, 
          color: '#1e293b',
          fontSize: '1.75rem'
        }}>
          No Profile Data
        </h3>
        <p style={{ 
          color: '#64748b', 
          marginBottom: '1.5rem',
          lineHeight: 1.6
        }}>
          Your profile data could not be loaded. Please contact support.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: BRAND_COLORS.primary.main,
            color: 'white',
            border: 'none',
            padding: '0.875rem 2rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0 auto',
            boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)'
          }}
        >
          <FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> Refresh
        </motion.button>
      </div>
    </div>
  );
}

/* ================= SECTION CARD ================= */
function SectionCard({ title, icon, color, subtitle, children, className = "" }) {
  return (
    <div className={`teacher-profile-section ${className}`} style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div className="teacher-profile-section-heading" style={{
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        borderBottom: '1px solid #eaeaea'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ color: color, fontSize: '1.2rem' }}>{icon}</span>
          {title}
        </h3>
        {subtitle && (
          <span style={{
            fontSize: '0.875rem',
            color: '#64748b',
            marginLeft: '1.9rem',
            display: 'block',
            marginTop: '0.25rem'
          }}>
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ================= INFO ITEM ================= */
function InfoItem({ icon, label, value, copyable = false, fullWidth = false }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (copyable && value && value !== 'N/A') {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      whileHover={{ x: 5, backgroundColor: '#f8fafc' }}
      style={{
        gridColumn: fullWidth ? '1 / -1' : 'span 1',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        backgroundColor: 'white',
        cursor: copyable && value !== 'N/A' ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}
      onClick={handleCopy}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: `${BRAND_COLORS.primary.main}10`,
        color: BRAND_COLORS.primary.main,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '1.25rem'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h6 style={{
          margin: 0,
          marginBottom: '0.5rem',
          color: '#64748b',
          fontSize: '0.85rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>{label}</h6>
        <div style={{
          fontWeight: 600,
          color: '#1e293b',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {value}
          {copyable && value !== 'N/A' && copied && (
            <span style={{ color: BRAND_COLORS.success.main, fontSize: '0.85rem' }}>
              <FaCheckCircle size={14} /> Copied!
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= COURSE CARD ================= */
function CourseCard({ course, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}
      className="teacher-profile-course-card"
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div className="teacher-profile-course-icon" style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: `${BRAND_COLORS.info.main}15`,
          color: BRAND_COLORS.info.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1.25rem'
        }}>
          <FaGraduationCap />
        </div>
        <div style={{ flex: 1 }}>
          <h5 className="teacher-profile-course-name" style={{
            margin: '0 0 0.25rem 0',
            color: '#1e293b',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            {course.name}
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="teacher-profile-course-code" style={{
              backgroundColor: `${BRAND_COLORS.info.main}15`,
              color: BRAND_COLORS.info.main,
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {course.code}
            </span>
            {/* <span style={{
              color: '#64748b',
              fontSize: '0.9rem'
            }}>
              {course.credits ? `${course.credits} Credits` : 'N/A'}
            </span> */}
          </div>
          {course.description && (
            <p style={{
              margin: '0.75rem 0 0 0',
              color: '#64748b',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              {course.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= SUBJECT CARD ================= */
function SubjectCard({ subject, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}
      className="teacher-profile-subject-card"
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div className="teacher-profile-subject-icon" style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: `${BRAND_COLORS.warning.main}15`,
          color: BRAND_COLORS.warning.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1.25rem'
        }}>
          <FaChalkboardTeacher />
        </div>
        <div style={{ flex: 1 }}>
          <h5 className="teacher-profile-subject-name" style={{
            margin: '0 0 0.25rem 0',
            color: '#1e293b',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            {subject.name}
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="teacher-profile-subject-code" style={{
              backgroundColor: `${BRAND_COLORS.warning.main}15`,
              color: BRAND_COLORS.warning.main,
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {subject.code}
            </span>
            <span style={{
              color: '#64748b',
              fontSize: '0.9rem'
            }}>
              {subject.semester ? `Sem ${subject.semester}` : 'N/A'}
            </span>
          </div>
          {subject.description && (
            <p style={{
              margin: '0.75rem 0 0 0',
              color: '#64748b',
              fontSize: '0.9rem',
              lineHeight: 1.5
            }}>
              {subject.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= EMPTY SECTION ================= */
function EmptySection({ icon, title, message }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1.5rem',
      color: '#64748b'
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1.5rem',
        opacity: 0.6,
        color: '#e2e8f0'
      }}>
        {icon}
      </div>
      <h4 style={{
        margin: '0 0 0.75rem 0',
        color: '#1e293b',
        fontWeight: 700,
        fontSize: '1.5rem'
      }}>
        {title}
      </h4>
      <p style={{ 
        margin: '0 auto', 
        fontSize: '1rem',
        maxWidth: '600px',
        lineHeight: 1.6
      }}>
        {message}
      </p>
    </div>
  );
}