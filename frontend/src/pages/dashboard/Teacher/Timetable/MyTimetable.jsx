// import { useContext, useEffect, useState } from "react";
// import { Navigate } from "react-router-dom";
// import { AuthContext } from "../../../../auth/AuthContext";
// import api from "../../../../api/axios";

// import {
//   FaCalendarAlt,
//   FaClock,
//   FaBookOpen,
//   FaDoorOpen
// } from "react-icons/fa";

// export default function MyTimetable() {
//   const { user } = useContext(AuthContext);

//   const [timetable, setTimetable] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   /* ================= SECURITY ================= */
//   if (!user) return <Navigate to="/login" />;
//   if (user.role !== "TEACHER")
//     return <Navigate to="/teacher/dashboard" />;

//   /* ================= FETCH TIMETABLE ================= */
//   useEffect(() => {
//     const fetchTimetable = async () => {
//       try {
//         const res = await api.get("/timetable/teacher");
//         setTimetable(res.data.timetable || []);
//       } catch (err) {
//         console.error(err);
//         setError("Failed to load timetable");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTimetable();
//   }, []);

//   /* ================= LOADING ================= */
//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-75">
//         <h5 className="text-muted">Loading My Timetable...</h5>
//       </div>
//     );
//   }

//   return (
//     <div className="container-fluid">

//       {/* ================= HEADER ================= */}
//       <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
//         <h3 className="fw-bold mb-1">
//           <FaCalendarAlt className="me-2 blink" />
//           My Timetable
//         </h3>
//         <p className="opacity-75 mb-0">
//           Weekly lecture schedule assigned to you
//         </p>
//       </div>

//       {/* ================= ERROR ================= */}
//       {error && (
//         <div className="alert alert-danger text-center">
//           {error}
//         </div>
//       )}

//       {/* ================= EMPTY ================= */}
//       {timetable.length === 0 && !error && (
//         <div className="alert alert-warning text-center">
//           No timetable slots assigned to you.
//         </div>
//       )}

//       {/* ================= TIMETABLE TABLE ================= */}
//       {timetable.length > 0 && (
//         <div className="card shadow-lg border-0 rounded-4 glass-card">
//           <div className="card-body">

//             <table className="table table-hover align-middle">
//               <thead className="table-dark">
//                 <tr>
//                   <th>#</th>
//                   <th>Day</th>
//                   <th>
//                     <FaBookOpen className="me-1" />
//                     Subject
//                   </th>
//                   <th>Code</th>
//                   <th>Course</th>
//                   <th>
//                     <FaClock className="me-1" />
//                     Time
//                   </th>
//                   <th>
//                     <FaDoorOpen className="me-1" />
//                     Room
//                   </th>
//                   <th>Semester</th>
//                   <th>Type</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {timetable.map((t, i) => (
//                   <tr key={t._id}>
//                     <td>{i + 1}</td>
//                     <td className="fw-bold">{t.dayOfWeek}</td>
//                     <td>{t.subject_id?.name}</td>
//                     <td>{t.subject_id?.code}</td>
//                     <td>{t.course_id?.name}</td>
//                     <td>
//                       {t.startTime} - {t.endTime}
//                     </td>
//                     <td>{t.room || "N/A"}</td>
//                     <td>{t.semester}</td>
//                     <td>
//                       <span className="badge bg-primary">
//                         {t.lectureType}
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>

//           </div>
//         </div>
//       )}

//       {/* ================= CSS ================= */}
//       <style>
//         {`
//         .gradient-header {
//           background: linear-gradient(180deg, #0f3a4a, #134952);
//         }

//         .glass-card {
//           background: rgba(255,255,255,0.96);
//           backdrop-filter: blur(8px);
//         }

//         .blink {
//           animation: blink 1.5s infinite;
//         }

//         @keyframes blink {
//           0% {opacity:1}
//           50% {opacity:0.4}
//           100% {opacity:1}
//         }
//         `}
//       </style>
//     </div>
//   );
// }




import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";

import {
  FaCalendarAlt,
  FaClock,
  FaBookOpen,
  FaDoorOpen,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaExclamationTriangle,
  FaSpinner,
  FaRedo
} from "react-icons/fa";
import { motion } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: {
    main: '#1a4b6d',
    gradient: 'linear-gradient(180deg, #0f3a4a, #134952)'
  },
  success: { main: '#28a745' },
  warning: { main: '#ffc107' },
  danger: { main: '#dc3545' }
};

// Animation Variants
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};

/**
 * Convert 24-hour format to 12-hour AM/PM format
 * @param {string} time24h - Time in 24-hour format (e.g., "13:00")
 * @returns {string} - Time in 12-hour format (e.g., "01:00 PM")
 */
const convertTo12Hour = (time24h) => {
  if (!time24h) return "";
  
  const [hours, minutes] = time24h.split(':');
  let h = parseInt(hours);
  const modifier = h >= 12 ? 'PM' : 'AM';
  
  h = h % 12;
  h = h ? h : 12; // hour '0' should be '12'
  
  return `${h.toString().padStart(2, '0')}:${minutes} ${modifier}`;
};

/**
 * Format time range for display
 * @param {string} startTime - Start time in 24-hour format
 * @param {string} endTime - End time in 24-hour format
 * @returns {string} - Formatted time range (e.g., "09:00 AM - 10:00 AM")
 */
const formatTimeRange = (startTime, endTime) => {
  return `${convertTo12Hour(startTime)} - ${convertTo12Hour(endTime)}`;
};

export default function MyTimetable() {
  const { user } = useContext(AuthContext);

  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH TIMETABLE ================= */
  useEffect(() => {
    fetchTimetable();
  }, [retryCount]);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/timetable/teacher");
      setTimetable(res.data.timetable || []);
    } catch (err) {
      console.error("Failed to load timetable:", err);
      setError("Failed to load your timetable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)'
      }}>
        <motion.div
          variants={spinVariants}
          animate="animate"
          style={{ textAlign: 'center' }}
        >
          <FaSpinner style={{ fontSize: '4rem', color: BRAND_COLORS.primary.main, marginBottom: '1rem' }} />
          <h3 style={{ color: '#1e293b', margin: 0 }}>Loading My Timetable...</h3>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0 0' }}>Fetching your weekly schedule</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* ================= HEADER ================= */}
        <motion.div
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          style={{
            marginBottom: '2rem',
            padding: '2rem',
            background: BRAND_COLORS.primary.gradient,
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(15, 58, 74, 0.3)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                width: '70px',
                height: '70px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                flexShrink: 0
              }}
            >
              <FaCalendarAlt />
            </motion.div>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                My Timetable
              </h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1.1rem' }}>
                Weekly lecture schedule assigned to you
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRetry}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease'
            }}
          >
            <FaRedo /> Refresh
          </motion.button>
        </motion.div>

        {/* ================= ERROR ================= */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: '2rem',
              padding: '1.25rem',
              borderRadius: '12px',
              backgroundColor: `${BRAND_COLORS.danger.main}0a`,
              border: `2px solid ${BRAND_COLORS.danger.main}`,
              color: BRAND_COLORS.danger.main,
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <FaExclamationTriangle size={24} />
            <div>
              <strong>Error:</strong> {error}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              style={{
                marginLeft: 'auto',
                padding: '0.5rem 1rem',
                backgroundColor: BRAND_COLORS.danger.main,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Try Again
            </motion.button>
          </motion.div>
        )}

        {/* ================= EMPTY ================= */}
        {timetable.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '3rem',
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem',
              backgroundColor: `${BRAND_COLORS.warning.main}15`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: BRAND_COLORS.warning.main,
              fontSize: '2.5rem'
            }}>
              <FaCalendarAlt />
            </div>
            <h3 style={{ color: '#1e293b', margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
              No Timetable Slots Assigned
            </h3>
            <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>
              You don't have any classes scheduled yet. Please contact your HOD for timetable assignment.
            </p>
          </motion.div>
        )}

        {/* ================= TIMETABLE TABLE ================= */}
        {timetable.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${BRAND_COLORS.primary.main}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: BRAND_COLORS.primary.main,
                fontSize: '1.5rem'
              }}>
                <FaBookOpen />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                  Your Weekly Schedule
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                  {timetable.length} slot{timetable.length !== 1 ? 's' : ''} assigned
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '900px'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: BRAND_COLORS.primary.main,
                    color: 'white'
                  }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>#</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
                      <FaCalendarAlt style={{ marginRight: '0.5rem' }} />
                      Day
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
                      <FaBookOpen style={{ marginRight: '0.5rem' }} />
                      Subject
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Code</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
                      <FaLayerGroup style={{ marginRight: '0.5rem' }} />
                      Course
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
                      <FaClock style={{ marginRight: '0.5rem' }} />
                      Time (12-Hour Format)
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>
                      <FaDoorOpen style={{ marginRight: '0.5rem' }} />
                      Room
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Semester</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {timetable.map((t, i) => (
                    <tr key={t._id} style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'white' : '#f8fafc'}
                    >
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: BRAND_COLORS.primary.main }}>
                        {t.dayOfWeek}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#1e293b' }}>
                        {t.subject_id?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                        {t.subject_id?.code || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', color: '#1e293b' }}>
                        {t.course_id?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.375rem 0.75rem',
                          backgroundColor: `${BRAND_COLORS.primary.main}15`,
                          color: BRAND_COLORS.primary.main,
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          fontFamily: 'monospace'
                        }}>
                          <FaClock style={{ marginRight: '0.375rem' }} />
                          {formatTimeRange(t.startTime, t.endTime)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#1e293b', fontWeight: 600 }}>
                        {t.room || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>N/A</span>}
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>
                        {t.semester || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: t.lectureType === 'LAB' ? `${BRAND_COLORS.danger.main}15` :
                                         t.lectureType === 'PRACTICAL' ? `${BRAND_COLORS.warning.main}15` :
                                         `${BRAND_COLORS.primary.main}15`,
                          color: t.lectureType === 'LAB' ? BRAND_COLORS.danger.main :
                                 t.lectureType === 'PRACTICAL' ? BRAND_COLORS.warning.main :
                                 BRAND_COLORS.primary.main
                        }}>
                          {t.lectureType || 'THEORY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}