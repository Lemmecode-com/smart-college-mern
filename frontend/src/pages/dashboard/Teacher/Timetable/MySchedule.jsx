// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../../../../api/axios";
// import {
//   FaCalendarAlt,
//   FaChalkboardTeacher,
//   FaDoorOpen,
//   FaPlay,
//   FaSyncAlt,
//   FaCheckCircle,
//   FaExclamationTriangle,
//   FaInfoCircle,
//   FaClock,
//   FaUniversity,
//   FaLayerGroup,
//   FaBook,
//   FaArrowLeft,
//   FaBell,
//   FaSun,
//   FaPauseCircle
// } from "react-icons/fa";
// import { motion, AnimatePresence } from "framer-motion";

// // Brand Color Palette
// const BRAND_COLORS = {
//   primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
//   success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
//   info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
//   warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
//   danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
//   secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' },
//   slotTypes: {
//     LECTURE: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
//     LAB: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
//     TUTORIAL: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
//     PRACTICAL: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' }
//   }
// };

// // Animation Variants
// const fadeInVariants = {
//   hidden: { opacity: 0, y: 20 },
//   visible: (i) => ({
//     opacity: 1,
//     y: 0,
//     transition: { delay: i * 0.05, duration: 0.6, ease: "easeOut" }
//   })
// };

// const slideDownVariants = {
//   hidden: { opacity: 0, y: -30 },
//   visible: {
//     opacity: 1,
//     y: 0,
//     transition: { duration: 0.5, ease: "easeOut" }
//   }
// };

// const pulseVariants = {
//   initial: { scale: 1 },
//   pulse: {
//     scale: [1, 1.05, 1],
//     transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
//   }
// };

// const blinkVariants = {
//   initial: { opacity: 1 },
//   blink: {
//     opacity: [1, 0.7, 1],
//     transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
//   }
// };

// const floatVariants = {
//   initial: { y: 0 },
//   float: {
//     y: [-3, 3, -3],
//     transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
//   }
// };

// const spinVariants = {
//   animate: {
//     rotate: 360,
//     transition: { duration: 1, repeat: Infinity, ease: "linear" }
//   }
// };

// const scaleVariants = {
//   hidden: { scale: 0.95, opacity: 0 },
//   visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
//   exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } }
// };

// const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
// const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// const TIMES = [
//   "09:00 - 10:00",
//   "10:00 - 11:00",
//   "11:00 - 12:00",
//   "12:00 - 13:00",
//   "13:00 - 14:00",
//   "14:00 - 15:00",
//   "15:00 - 16:00",
//   "16:00 - 17:00",
// ];

// export default function MySchedule() {
//   const [weekly, setWeekly] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [creating, setCreating] = useState(null);
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [activeSessions, setActiveSessions] = useState({});
//   const [attendanceSessions, setAttendanceSessions] = useState({});
//   const [sessionsLoaded, setSessionsLoaded] = useState(false);
//   const navigate = useNavigate();

//   // Update current time every minute
//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date());
//     }, 60000);
//     return () => clearInterval(timer);
//   }, []);

//   // Load from localStorage on mount
//   useEffect(() => {
//     const today = new Date().toISOString().split("T")[0];
//     const storedSessions = localStorage.getItem(`activeSessions_${today}`);
//     const storedAttendance = localStorage.getItem(`attendanceSessions_${today}`);
    
//     if (storedSessions) {
//       try {
//         setActiveSessions(JSON.parse(storedSessions));
//       } catch (e) {
//         console.error("Failed to parse stored sessions:", e);
//       }
//     }
    
//     if (storedAttendance) {
//       try {
//         setAttendanceSessions(JSON.parse(storedAttendance));
//       } catch (e) {
//         console.error("Failed to parse stored attendance:", e);
//       }
//     }
    
//     setSessionsLoaded(true);
//   }, []);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         setLoading(true);
//         const res = await api.get("/timetable/weekly");
//         setWeekly(res.data.weekly || {});
        
//         // Fetch active attendance sessions
//         await loadActiveSessions();
//       } catch (err) {
//         console.error("Failed to load schedule:", err);
//         setError("Failed to load your schedule. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, []);

//   // Load active attendance sessions
//   const loadActiveSessions = async () => {
//     try {
//       const today = new Date();
//       const todayStr = today.toISOString().split("T")[0];
      
//       const res = await api.get("/attendance/sessions", {
//         params: { date: todayStr, status: 'active' }
//       });
      
//       // Map sessions by slot_id
//       const sessionsMap = {};
//       const attendanceMap = {};
      
//       if (res.data.sessions) {
//         res.data.sessions.forEach(session => {
//           if (session.slot_id) {
//             const slotId = typeof session.slot_id === 'object' 
//               ? session.slot_id._id 
//               : session.slot_id;
//             sessionsMap[slotId] = session;
//             attendanceMap[slotId] = session;
//           }
//         });
//       }
      
//       setActiveSessions(sessionsMap);
//       setAttendanceSessions(attendanceMap);
      
//       // Store in localStorage
//       localStorage.setItem(`activeSessions_${todayStr}`, JSON.stringify(sessionsMap));
//       localStorage.setItem(`attendanceSessions_${todayStr}`, JSON.stringify(attendanceMap));
//     } catch (err) {
//       console.error("Failed to load active sessions:", err);
//       // Don't throw error, just use localStorage data
//     }
//   };

//   /* ================= CREATE ATTENDANCE ================= */
//   const startAttendance = async (slot) => {
//     const today = new Date();
//     const currentDayAbbr = DAYS[today.getDay() - 1] || "MON";
    
//     if (slot.day !== currentDayAbbr) {
//       alert("Attendance can only be started for today's lectures.");
//       return;
//     }

//     // Check if already active
//     if (activeSessions[slot._id]) {
//       alert("Attendance session is already active for this lecture.");
//       return;
//     }

//     // Check if attendance already exists
//     if (attendanceSessions[slot._id]) {
//       alert("Attendance already created for this lecture");
//       return;
//     }

//     if (!window.confirm(`Start attendance for ${slot.subject_id?.name}?\n\nThis will create a new attendance session for today's lecture.`)) return;

//     try {
//       setCreating(slot._id);
//       const todayDate = today.toISOString().split("T")[0];

//       const res = await api.post("/attendance/sessions", {
//         slot_id: slot._id,
//         lectureDate: todayDate,
//         lectureNumber: 1,
//       });

//       const newSession = res.data.session;
//       const slotId = slot._id;
      
//       // Update state
//       const newActiveSessions = {
//         ...activeSessions,
//         [slotId]: newSession
//       };
//       const newAttendanceSessions = {
//         ...attendanceSessions,
//         [slotId]: newSession
//       };
      
//       setActiveSessions(newActiveSessions);
//       setAttendanceSessions(newAttendanceSessions);
      
//       // Store in localStorage
//       const todayStr = today.toISOString().split("T")[0];
//       localStorage.setItem(`activeSessions_${todayStr}`, JSON.stringify(newActiveSessions));
//       localStorage.setItem(`attendanceSessions_${todayStr}`, JSON.stringify(newAttendanceSessions));

//       navigate(`/attendance/session/${newSession._id}`);
//     } catch (err) {
//       const message = err.response?.data?.message || "Failed to create attendance session. Please try again.";
//       alert(message);
      
//       // If error says attendance already exists, update the state
//       if (message.includes("already") || message.includes("exists")) {
//         const slotId = slot._id;
//         const newActiveSessions = {
//           ...activeSessions,
//           [slotId]: { _id: 'existing', status: 'active' }
//         };
//         const newAttendanceSessions = {
//           ...attendanceSessions,
//           [slotId]: { _id: 'existing', status: 'active' }
//         };
        
//         setActiveSessions(newActiveSessions);
//         setAttendanceSessions(newAttendanceSessions);
        
//         const todayStr = today.toISOString().split("T")[0];
//         localStorage.setItem(`activeSessions_${todayStr}`, JSON.stringify(newActiveSessions));
//         localStorage.setItem(`attendanceSessions_${todayStr}`, JSON.stringify(newAttendanceSessions));
//       }
//     } finally {
//       setCreating(null);
//     }
//   };

//   // Get current day and time for highlighting
//   const today = new Date();
//   const currentDayAbbr = DAYS[today.getDay() - 1] || "MON";
//   const currentDayName = DAY_NAMES[DAYS.indexOf(currentDayAbbr)];
//   const currentHour = currentTime.getHours();
//   const currentMinute = currentTime.getMinutes();

//   // Filter today's slots only
//   const todaysSlots = weekly[currentDayAbbr] || [];

//   if (loading || !sessionsLoaded) {
//     return (
//       <div style={{
//         minHeight: '100vh',
//         display: 'flex',
//         justifyContent: 'center',
//         alignItems: 'center',
//         background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
//         padding: '2rem'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <motion.div
//             variants={spinVariants}
//             animate="animate"
//             style={{ marginBottom: '1.5rem', color: BRAND_COLORS.primary.main, fontSize: '4rem' }}
//           >
//             <FaSyncAlt />
//           </motion.div>
//           <h3 style={{ 
//             margin: '0 0 0.5rem 0', 
//             color: '#1e293b', 
//             fontWeight: 700,
//             fontSize: '1.5rem'
//           }}>
//             Loading Today's Schedule...
//           </h3>
//           <p style={{ color: '#64748b', margin: 0 }}>
//             Fetching your teaching schedule for {currentDayName}
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <AnimatePresence mode="wait">
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         style={{
//           minHeight: '100vh',
//           background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
//           paddingTop: '1.5rem',
//           paddingBottom: '2rem',
//           paddingLeft: '1rem',
//           paddingRight: '1rem',
//           display: 'flex',
//           justifyContent: 'center'
//         }}
//       >
//         <div style={{ 
//           maxWidth: '800px', 
//           width: '100%',
//           margin: '0 auto'
//         }}>
//           {/* ================= BREADCRUMB ================= */}
//           <motion.div
//             variants={slideDownVariants}
//             initial="hidden"
//             animate="visible"
//             style={{
//               marginBottom: '1.5rem',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.75rem',
//               flexWrap: 'wrap'
//             }}
//           >
//             <motion.button
//               whileHover={{ x: -5 }}
//               whileTap={{ scale: 0.95 }}
//               onClick={() => navigate('/teacher/dashboard')}
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '0.5rem',
//                 color: BRAND_COLORS.primary.main,
//                 background: 'none',
//                 border: 'none',
//                 fontSize: '0.95rem',
//                 fontWeight: 500,
//                 cursor: 'pointer',
//                 padding: '0.5rem',
//                 borderRadius: '8px',
//                 transition: 'all 0.3s ease'
//               }}
//               onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
//               onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//             >
//               <FaArrowLeft /> Back to Dashboard
//             </motion.button>
//             <span style={{ color: '#94a3b8' }}>›</span>
//             <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>Today's Schedule</span>
//           </motion.div>

//           {/* ================= HEADER ================= */}
//           <motion.div
//             variants={slideDownVariants}
//             initial="hidden"
//             animate="visible"
//             style={{
//               marginBottom: '1.5rem',
//               backgroundColor: 'white',
//               borderRadius: '1.5rem',
//               overflow: 'hidden',
//               boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
//               display: 'flex',
//               flexDirection: 'column',
//               gap: '1.5rem'
//             }}
//           >
//             <div style={{
//               padding: '1.75rem 2rem',
//               background: BRAND_COLORS.primary.gradient,
//               color: 'white',
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               flexWrap: 'wrap',
//               gap: '1.5rem'
//             }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
//                 <motion.div
//                   variants={pulseVariants}
//                   initial="initial"
//                   animate="pulse"
//                   style={{
//                     width: '72px',
//                     height: '72px',
//                     backgroundColor: 'rgba(255, 255, 255, 0.15)',
//                     borderRadius: '50%',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     fontSize: '2rem',
//                     flexShrink: 0,
//                     boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)'
//                   }}
//                 >
//                   <FaCalendarAlt />
//                 </motion.div>
//                 <div>
//                   <h1 style={{
//                     margin: 0,
//                     fontSize: '2rem',
//                     fontWeight: 700,
//                     lineHeight: 1.2
//                   }}>
//                     Today's Schedule
//                   </h1>
//                   <p style={{
//                     margin: '0.5rem 0 0 0',
//                     opacity: 0.9,
//                     fontSize: '1.1rem',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '0.5rem'
//                   }}>
//                     <FaSun /> {currentDayName}, {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
//                   </p>
//                 </div>
//               </div>
//               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
//                 <div style={{
//                   backgroundColor: 'rgba(255, 255, 255, 0.15)',
//                   padding: '0.75rem 1.5rem',
//                   borderRadius: '12px',
//                   textAlign: 'center',
//                   minWidth: '120px'
//                 }}>
//                   <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: '0.25rem' }}>Current Time</div>
//                   <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
//                     {currentTime.toLocaleTimeString('en-US', { 
//                       hour: '2-digit', 
//                       minute: '2-digit',
//                       hour12: true 
//                     })}
//                   </div>
//                 </div>
//                 <motion.button
//                   whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(26, 75, 109, 0.4)' }}
//                   whileTap={{ scale: 0.95 }}
//                   onClick={async () => {
//                     await loadActiveSessions();
//                     window.location.reload();
//                   }}
//                   style={{
//                     backgroundColor: 'white',
//                     color: BRAND_COLORS.primary.main,
//                     border: '2px solid white',
//                     padding: '0.75rem 1.5rem',
//                     borderRadius: '12px',
//                     fontSize: '0.95rem',
//                     fontWeight: 600,
//                     cursor: 'pointer',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '0.5rem',
//                     transition: 'all 0.3s ease',
//                     boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
//                   }}
//                 >
//                   <FaSyncAlt /> Refresh
//                 </motion.button>
//               </div>
//             </div>
            
//             {/* Stats Bar */}
//             <div style={{
//               padding: '1rem 2rem',
//               backgroundColor: '#f8fafc',
//               borderTop: '1px solid #e2e8f0',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//               flexWrap: 'wrap',
//               gap: '1rem'
//             }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
//                 <StatItem
//                   icon={<FaUniversity />}
//                   label="Total Classes"
//                   value={todaysSlots.length}
//                   color={BRAND_COLORS.primary.main}
//                 />
//                 <StatItem
//                   icon={<FaCheckCircle />}
//                   label="Published"
//                   value={todaysSlots.filter(s => s.timetable_id?.status === "PUBLISHED").length}
//                   color={BRAND_COLORS.success.main}
//                 />
//                 <StatItem
//                   icon={<FaBell />}
//                   label="Active Sessions"
//                   value={Object.keys(activeSessions).length}
//                   color={BRAND_COLORS.warning.main}
//                 />
//               </div>
//               <div style={{ 
//                 padding: '0.5rem 1rem',
//                 borderRadius: '20px',
//                 backgroundColor: `${BRAND_COLORS.success.main}15`,
//                 color: BRAND_COLORS.success.main,
//                 fontWeight: 600,
//                 fontSize: '0.95rem',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '0.5rem'
//               }}>
//                 <FaCalendarAlt size={14} />
//                 {currentDayName}
//               </div>
//             </div>
//           </motion.div>

//           {/* ================= ERROR STATE ================= */}
//           {error && (
//             <motion.div
//               initial={{ opacity: 0, y: -20 }}
//               animate={{ opacity: 1, y: 0 }}
//               style={{
//                 marginBottom: '1.5rem',
//                 padding: '1rem',
//                 borderRadius: '12px',
//                 backgroundColor: `${BRAND_COLORS.danger.main}0a`,
//                 border: `1px solid ${BRAND_COLORS.danger.main}`,
//                 color: BRAND_COLORS.danger.main,
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '0.75rem'
//               }}
//             >
//               <FaExclamationTriangle size={20} />
//               <span>{error}</span>
//             </motion.div>
//           )}

//           {/* ================= TODAY'S SCHEDULE ================= */}
//           <motion.div
//             variants={fadeInVariants}
//             custom={0}
//             initial="hidden"
//             animate="visible"
//             style={{
//               backgroundColor: 'white',
//               borderRadius: '1.5rem',
//               boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
//               overflow: 'hidden'
//             }}
//           >
//             <div style={{
//               padding: '1.5rem',
//               borderBottom: '1px solid #e2e8f0',
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               flexWrap: 'wrap',
//               gap: '1rem',
//               background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
//             }}>
//               <h2 style={{
//                 margin: 0,
//                 fontSize: '1.5rem',
//                 fontWeight: 700,
//                 color: '#1e293b',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '0.75rem'
//               }}>
//                 <FaSun style={{ color: BRAND_COLORS.warning.main }} /> Today's Classes
//               </h2>
//               <div style={{ 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 gap: '0.5rem',
//                 backgroundColor: '#dbeafe',
//                 color: BRAND_COLORS.primary.main,
//                 padding: '0.5rem 1rem',
//                 borderRadius: '20px',
//                 fontSize: '0.9rem',
//                 fontWeight: 500
//               }}>
//                 <FaInfoCircle /> Only today's classes are shown
//               </div>
//             </div>
            
//             <div style={{ padding: '1.5rem' }}>
//               {todaysSlots.length === 0 ? (
//                 <EmptyState 
//                   icon={<FaCalendarAlt />} 
//                   title="No Classes Today" 
//                   message={`You don't have any scheduled classes for ${currentDayName}. Enjoy your day off!`}
//                 />
//               ) : (
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
//                   {TIMES.map((time, idx) => {
//                     const slot = todaysSlots.find(s => {
//                       const slotTime = `${s.startTime} - ${s.endTime}`;
//                       return slotTime === time;
//                     });
                    
//                     if (!slot) return null;
                    
//                     return (
//                       <ScheduleRow
//                         key={time}
//                         time={time}
//                         slot={slot}
//                         isCurrent={isCurrentTimeSlot(time)}
//                         onStartAttendance={startAttendance}
//                         creating={creating === slot._id}
//                         delay={idx * 0.05}
//                         hasActiveSession={!!activeSessions[slot._id]}
//                         hasAttendanceSession={!!attendanceSessions[slot._id]}
//                       />
//                     );
//                   })}
//                 </div>
//               )}
//             </div>
//           </motion.div>
          
//           {/* Info Banner */}
//           <motion.div
//             variants={fadeInVariants}
//             custom={1}
//             initial="hidden"
//             animate="visible"
//             style={{
//               marginTop: '1.5rem',
//               padding: '1.25rem',
//               borderRadius: '16px',
//               backgroundColor: '#fffbeb',
//               border: '1px solid #f59e0b',
//               display: 'flex',
//               alignItems: 'flex-start',
//               gap: '1rem'
//             }}
//           >
//             <FaInfoCircle size={24} style={{ color: BRAND_COLORS.warning.main, flexShrink: 0, marginTop: '0.25rem' }} />
//             <div style={{ color: '#92400e', fontSize: '0.95rem', lineHeight: 1.6 }}>
//               <strong>Attendance Policy:</strong> You can only start attendance for currently active classes (between start and end time). 
//               The button will automatically enable at start time and disable after end time. Once started, attendance cannot be created again.
//             </div>
//           </motion.div>
//         </div>
//       </motion.div>
//     </AnimatePresence>
//   );
// }

// /* ================= HELPER FUNCTIONS ================= */
// function isCurrentTimeSlot(timeSlot) {
//   const [startTime, endTime] = timeSlot.split(' - ');
//   const [startHour, startMin] = startTime.split(':').map(Number);
//   const [endHour, endMin] = endTime.split(':').map(Number);
  
//   const now = new Date();
//   const currentHour = now.getHours();
//   const currentMinute = now.getMinutes();
  
//   const startMinutes = startHour * 60 + startMin;
//   const endMinutes = endHour * 60 + endMin;
//   const currentMinutes = currentHour * 60 + currentMinute;
  
//   return currentMinutes >= startMinutes && currentMinutes < endMinutes;
// }

// /* ================= STAT ITEM ================= */
// function StatItem({ icon, label, value, color }) {
//   return (
//     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//       <div style={{
//         width: '36px',
//         height: '36px',
//         borderRadius: '10px',
//         backgroundColor: `${color}15`,
//         color: color,
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         fontSize: '1.1rem',
//         flexShrink: 0
//       }}>
//         {icon}
//       </div>
//       <div>
//         <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
//         <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
//       </div>
//     </div>
//   );
// }

// /* ================= SCHEDULE ROW ================= */
// function ScheduleRow({ time, slot, isCurrent, onStartAttendance, creating, delay = 0, hasActiveSession, hasAttendanceSession }) {
//   const slotType = BRAND_COLORS.slotTypes[slot.slotType] || BRAND_COLORS.slotTypes.LECTURE;
//   const isPublished = slot.timetable_id?.status === "PUBLISHED";
  
//   // Determine slot status
//   const [startTime, endTime] = time.split(' - ');
//   const [startHour, startMin] = startTime.split(':').map(Number);
//   const [endHour, endMin] = endTime.split(':').map(Number);
  
//   const now = new Date();
//   const currentMinutes = now.getHours() * 60 + now.getMinutes();
//   const startMinutes = startHour * 60 + startMin;
//   const endMinutes = endHour * 60 + endMin;
  
//   let slotStatus = 'upcoming';
//   if (currentMinutes >= endMinutes) {
//     slotStatus = 'past';
//   } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
//     slotStatus = 'active';
//   }
  
//   // Button is enabled ONLY if: published AND currently active AND no existing session
//   const canStartAttendance = isPublished && isCurrent && !hasActiveSession && !hasAttendanceSession;
  
//   // Determine button state
//   let buttonState = 'start';
//   if (creating === slot._id) {
//     buttonState = 'creating';
//   } else if (hasActiveSession || hasAttendanceSession) {
//     buttonState = 'active';
//   } else if (slotStatus === 'past') {
//     buttonState = 'ended';
//   } else if (!isPublished) {
//     buttonState = 'unpublished';
//   }
  
//   return (
//     <motion.div
//       initial={{ opacity: 0, x: -20 }}
//       animate={{ opacity: 1, x: 0 }}
//       transition={{ delay: delay, duration: 0.5 }}
//       whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)' }}
//       style={{
//         backgroundColor: 'white',
//         border: `1px solid ${slotType.border}`,
//         borderRadius: '16px',
//         padding: '1.25rem',
//         display: 'flex',
//         gap: '1.5rem',
//         transition: 'all 0.3s ease',
//         position: 'relative',
//         overflow: 'hidden',
//         boxShadow: isCurrent && !hasActiveSession ? `0 0 0 3px ${BRAND_COLORS.primary.main}20` : '0 2px 8px rgba(0, 0, 0, 0.06)',
//         opacity: slotStatus === 'past' ? 0.7 : 1
//       }}
//     >
//       {isCurrent && !hasActiveSession && (
//         <div style={{
//           position: 'absolute',
//           top: 0,
//           left: 0,
//           right: 0,
//           height: '4px',
//           background: BRAND_COLORS.primary.gradient,
//           zIndex: 1
//         }} />
//       )}
      
//       {/* Time Column */}
//       <div style={{ 
//         minWidth: '120px', 
//         display: 'flex', 
//         flexDirection: 'column', 
//         alignItems: 'center',
//         justifyContent: 'center',
//         padding: '0.5rem',
//         borderRight: `1px solid ${slotType.border}`,
//         backgroundColor: `${slotType.bg}30`
//       }}>
//         <div style={{ 
//           fontSize: '1.5rem', 
//           fontWeight: 700, 
//           color: slotType.text,
//           marginBottom: '0.25rem'
//         }}>
//           {time.split(' - ')[0]}
//         </div>
//         <div style={{ 
//           fontSize: '0.9rem', 
//           color: '#64748b',
//           fontWeight: 500
//         }}>
//           to {time.split(' - ')[1]}
//         </div>
//         {isCurrent && !hasActiveSession && (
//           <motion.div
//             variants={floatVariants}
//             initial="initial"
//             animate="float"
//             style={{
//               marginTop: '0.75rem',
//               padding: '0.25rem 0.75rem',
//               borderRadius: '20px',
//               backgroundColor: `${BRAND_COLORS.primary.main}15`,
//               color: BRAND_COLORS.primary.main,
//               fontSize: '0.85rem',
//               fontWeight: 600,
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.375rem'
//             }}
//           >
//             <FaClock size={12} />
//             Currently Active
//           </motion.div>
//         )}
//         {slotStatus === 'past' && (
//           <div
//             style={{
//               marginTop: '0.75rem',
//               padding: '0.25rem 0.75rem',
//               borderRadius: '20px',
//               backgroundColor: '#fee2e2',
//               color: '#b91c1c',
//               fontSize: '0.85rem',
//               fontWeight: 600,
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.375rem'
//             }}
//           >
//             <FaClock size={12} />
//             Completed
//           </div>
//         )}
//         {hasActiveSession && (
//           <div
//             style={{
//               marginTop: '0.75rem',
//               padding: '0.25rem 0.75rem',
//               borderRadius: '20px',
//               backgroundColor: '#dcfce7',
//               color: '#166534',
//               fontSize: '0.85rem',
//               fontWeight: 600,
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.375rem'
//             }}
//           >
//             <FaCheckCircle size={12} />
//             Attendance Active
//           </div>
//         )}
//       </div>
      
//       {/* Content Column */}
//       <div style={{ flex: 1 }}>
//         <div style={{ 
//           display: 'flex', 
//           justifyContent: 'space-between', 
//           alignItems: 'flex-start',
//           gap: '1rem',
//           marginBottom: '1rem'
//         }}>
//           <div style={{ flex: 1 }}>
//             <div style={{ 
//               fontWeight: 700, 
//               color: slotType.text, 
//               fontSize: '1.25rem',
//               marginBottom: '0.25rem',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem'
//             }}>
//               <FaBook size={18} />
//               {slot.subject_id?.name}
//             </div>
            
//             <div style={{ 
//               display: 'flex', 
//               alignItems: 'center', 
//               gap: '0.75rem',
//               flexWrap: 'wrap'
//             }}>
//               <span style={{ 
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 gap: '0.375rem',
//                 padding: '0.375rem 0.875rem',
//                 borderRadius: '8px',
//                 backgroundColor: slotType.bg,
//                 color: slotType.text,
//                 fontSize: '0.85rem',
//                 fontWeight: 600,
//                 border: `1px solid ${slotType.border}`
//               }}>
//                 <FaLayerGroup size={12} />
//                 {slot.slotType}
//               </span>
              
//               {slot.room && (
//                 <span style={{ 
//                   display: 'inline-flex',
//                   alignItems: 'center',
//                   gap: '0.375rem',
//                   padding: '0.375rem 0.875rem',
//                   borderRadius: '8px',
//                   backgroundColor: '#f1f5f9',
//                   color: '#4a5568',
//                   fontSize: '0.85rem',
//                   fontWeight: 500,
//                   border: '1px solid #e2e8f0'
//                 }}>
//                   <FaDoorOpen size={12} />
//                   Room {slot.room}
//                 </span>
//               )}
              
//               <span style={{ 
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 gap: '0.375rem',
//                 padding: '0.375rem 0.875rem',
//                 borderRadius: '8px',
//                 backgroundColor: isPublished ? '#dcfce7' : '#fee2e2',
//                 color: isPublished ? '#166534' : '#b91c1c',
//                 fontSize: '0.85rem',
//                 fontWeight: 600,
//                 border: `1px solid ${isPublished ? '#bbf7d0' : '#fecaca'}`
//               }}>
//                 {isPublished ? (
//                   <>
//                     <FaCheckCircle size={12} />
//                     Published
//                   </>
//                 ) : (
//                   <>
//                     <FaExclamationTriangle size={12} />
//                     Draft
//                   </>
//                 )}
//               </span>
//             </div>
//           </div>
          
//           <div style={{ 
//             display: 'flex', 
//             flexDirection: 'column', 
//             alignItems: 'flex-end',
//             flexShrink: 0,
//             minWidth: '150px'
//           }}>
//             <div style={{ 
//               fontSize: '0.95rem', 
//               color: '#4a5568', 
//               fontWeight: 600,
//               marginBottom: '0.25rem'
//             }}>
//               {slot.timetable_id?.name}
//             </div>
//             <div style={{ 
//               fontSize: '0.85rem', 
//               color: '#64748b'
//             }}>
//               Sem {slot.timetable_id?.semester} • {slot.timetable_id?.academicYear}
//             </div>
//           </div>
//         </div>
        
//         <div style={{ 
//           paddingTop: '0.75rem', 
//           borderTop: '1px dashed #e2e8f0',
//           display: 'flex',
//           flexDirection: 'column',
//           gap: '0.75rem'
//         }}>
//           <div style={{ 
//             display: 'flex', 
//             alignItems: 'center', 
//             gap: '0.5rem',
//             color: '#4a5568',
//             fontSize: '0.95rem'
//           }}>
//             <FaChalkboardTeacher size={16} style={{ color: BRAND_COLORS.primary.main }} />
//             <span>{slot.teacher_id?.name || 'N/A'}</span>
//           </div>
          
//           {buttonState === 'creating' ? (
//             <motion.button
//               disabled
//               style={{
//                 width: '100%',
//                 padding: '0.875rem',
//                 borderRadius: '12px',
//                 border: 'none',
//                 backgroundColor: BRAND_COLORS.success.main,
//                 color: 'white',
//                 fontSize: '1.05rem',
//                 fontWeight: 600,
//                 cursor: 'not-allowed',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 gap: '0.75rem',
//                 opacity: 0.8
//               }}
//             >
//               <motion.div variants={spinVariants} animate="animate">
//                 <FaSyncAlt />
//               </motion.div>
//               Starting Session...
//             </motion.button>
//           ) : buttonState === 'active' ? (
//             <div style={{
//               width: '100%',
//               padding: '0.875rem',
//               borderRadius: '12px',
//               backgroundColor: '#dcfce7',
//               color: '#166534',
//               fontSize: '1.05rem',
//               fontWeight: 600,
//               textAlign: 'center',
//               border: `2px solid #86efac`,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               gap: '0.75rem'
//             }}>
//               <FaCheckCircle size={20} />
//               Attendance Session Active
//             </div>
//           ) : buttonState === 'ended' ? (
//             <button
//               disabled
//               style={{
//                 width: '100%',
//                 padding: '0.875rem',
//                 borderRadius: '12px',
//                 border: 'none',
//                 backgroundColor: '#cbd5e1',
//                 color: '#64748b',
//                 fontSize: '1.05rem',
//                 fontWeight: 600,
//                 cursor: 'not-allowed',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 gap: '0.75rem'
//               }}
//             >
//               <FaPauseCircle /> 
//               Class Ended
//             </button>
//           ) : buttonState === 'unpublished' ? (
//             <div style={{ 
//               padding: '0.875rem', 
//               borderRadius: '12px', 
//               backgroundColor: '#fee2e2',
//               color: '#b91c1c',
//               fontSize: '0.95rem',
//               fontWeight: 500,
//               textAlign: 'center',
//               border: '1px solid #fecaca'
//             }}>
//               <FaExclamationTriangle size={16} style={{ marginRight: '0.5rem' }} />
//               Timetable not published - Attendance unavailable
//             </div>
//           ) : (
//             <motion.button
//               whileHover={{ scale: 1.03 }}
//               whileTap={{ scale: 0.98 }}
//               onClick={() => onStartAttendance(slot)}
//               style={{
//                 width: '100%',
//                 padding: '0.875rem',
//                 borderRadius: '12px',
//                 border: 'none',
//                 backgroundColor: BRAND_COLORS.success.main,
//                 color: 'white',
//                 fontSize: '1.05rem',
//                 fontWeight: 600,
//                 cursor: 'pointer',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 gap: '0.75rem',
//                 boxShadow: '0 4px 15px rgba(40, 167, 69, 0.35)'
//               }}
//             >
//               <FaPlay /> 
//               Start Attendance Now
//             </motion.button>
//           )}
          
//           {buttonState === 'ended' && isPublished && (
//             <div style={{ 
//               padding: '0.75rem', 
//               borderRadius: '10px', 
//               backgroundColor: '#fee2e2',
//               color: '#b91c1c',
//               fontSize: '0.9rem',
//               border: '1px solid #fecaca',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem'
//             }}>
//               <FaInfoCircle size={16} />
//               <span>This class ended at {endTime}. Attendance cannot be started for past classes.</span>
//             </div>
//           )}
          
//           {buttonState === 'active' && (
//             <div style={{ 
//               padding: '0.75rem', 
//               borderRadius: '10px', 
//               backgroundColor: '#dcfce7',
//               color: '#166534',
//               fontSize: '0.9rem',
//               border: '1px solid #86efac',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem'
//             }}>
//               <FaInfoCircle size={16} />
//               <span>Attendance is currently active for this class. You can now mark Student's attendance.</span>
//             </div>
//           )}
          
//           {!canStartAttendance && buttonState !== 'active' && buttonState !== 'ended' && buttonState !== 'unpublished' && buttonState !== 'creating' && (
//             <div style={{ 
//               padding: '0.75rem', 
//               borderRadius: '10px', 
//               backgroundColor: '#f0f9ff',
//               color: '#0c4a6e',
//               fontSize: '0.9rem',
//               border: '1px solid #bae6fd',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '0.5rem'
//             }}>
//               <FaInfoCircle size={16} />
//               <span>Attendance will be available from {startTime} to {endTime}</span>
//             </div>
//           )}
//         </div>
//       </div>
//     </motion.div>
//   );
// }

// /* ================= EMPTY STATE ================= */
// function EmptyState({ icon, title, message }) {
//   return (
//     <motion.div
//       initial={{ opacity: 0, scale: 0.95 }}
//       animate={{ opacity: 1, scale: 1 }}
//       style={{
//         padding: '3rem 1.5rem',
//         textAlign: 'center',
//         color: '#64748b'
//       }}
//     >
//       <div style={{
//         fontSize: '5rem',
//         marginBottom: '1.5rem',
//         opacity: 0.3,
//         color: '#e2e8f0'
//       }}>
//         {icon}
//       </div>
//       <h3 style={{
//         margin: '0 0 0.75rem 0',
//         color: '#1e293b',
//         fontWeight: 700,
//         fontSize: '1.75rem'
//       }}>
//         {title}
//       </h3>
//       <p style={{ 
//         margin: 0, 
//         fontSize: '1.1rem',
//         maxWidth: '600px',
//         margin: '0 auto',
//         lineHeight: 1.6
//       }}>
//         {message}
//       </p>
//     </motion.div>
//   );
// }




import React, { useEffect, useState } from "react";
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
  FaPauseCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' },
  slotTypes: {
    LECTURE: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    LAB: { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
    TUTORIAL: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    PRACTICAL: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' }
  }
};

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

const blinkVariants = {
  initial: { opacity: 1 },
  blink: {
    opacity: [1, 0.7, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
  }
};

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-3, 3, -3],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};

const scaleVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } }
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

export default function MySchedule() {
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSessions, setActiveSessions] = useState({});
  const [attendanceSessions, setAttendanceSessions] = useState({});
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const navigate = useNavigate();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const storedSessions = localStorage.getItem(`activeSessions_${today}`);
    const storedAttendance = localStorage.getItem(`attendanceSessions_${today}`);
    
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
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/timetable/weekly");
        setWeekly(res.data.weekly || {});
        
        // Fetch active attendance sessions
        await loadActiveSessions();
      } catch (err) {
        console.error("Failed to load schedule:", err);
        setError("Failed to load your schedule. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load active attendance sessions
  const loadActiveSessions = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      
      const res = await api.get("/attendance/sessions", {
        params: { date: todayStr, status: 'active' }
      });
      
      // Map sessions by slot_id
      const sessionsMap = {};
      const attendanceMap = {};
      
      if (res.data.sessions) {
        res.data.sessions.forEach(session => {
          if (session.slot_id) {
            const slotId = typeof session.slot_id === 'object' 
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
      localStorage.setItem(`activeSessions_${todayStr}`, JSON.stringify(sessionsMap));
      localStorage.setItem(`attendanceSessions_${todayStr}`, JSON.stringify(attendanceMap));
    } catch (err) {
      console.error("Failed to load active sessions:", err);
      // Don't throw error, just use localStorage data
    }
  };

  /* ================= CREATE ATTENDANCE ================= */
  const startAttendance = async (slot) => {
    const today = new Date();
    const currentDayAbbr = DAYS[today.getDay() - 1] || "MON";
    
    if (slot.day !== currentDayAbbr) {
      alert("Attendance can only be started for today's lectures.");
      return;
    }

    // Check if already active
    if (activeSessions[slot._id]) {
      alert("Attendance session is already active for this lecture.");
      return;
    }

    // Check if attendance already exists
    if (attendanceSessions[slot._id]) {
      alert("Attendance already created for this lecture");
      return;
    }

    if (!window.confirm(`Start attendance for ${slot.subject_id?.name}?\n\nThis will create a new attendance session for today's lecture.`)) return;

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
        [slotId]: newSession
      };
      const newAttendanceSessions = {
        ...attendanceSessions,
        [slotId]: newSession
      };
      
      setActiveSessions(newActiveSessions);
      setAttendanceSessions(newAttendanceSessions);
      
      // Store in localStorage
      const todayStr = today.toISOString().split("T")[0];
      localStorage.setItem(`activeSessions_${todayStr}`, JSON.stringify(newActiveSessions));
      localStorage.setItem(`attendanceSessions_${todayStr}`, JSON.stringify(newAttendanceSessions));

      navigate(`/attendance/session/${newSession._id}`);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create attendance session. Please try again.";
      alert(message);
      
      // If error says attendance already exists, update the state
      if (message.includes("already") || message.includes("exists")) {
        const slotId = slot._id;
        const newActiveSessions = {
          ...activeSessions,
          [slotId]: { _id: 'existing', status: 'active' }
        };
        const newAttendanceSessions = {
          ...attendanceSessions,
          [slotId]: { _id: 'existing', status: 'active' }
        };
        
        setActiveSessions(newActiveSessions);
        setAttendanceSessions(newAttendanceSessions);
        
        const todayStr = today.toISOString().split("T")[0];
        localStorage.setItem(`activeSessions_${todayStr}`, JSON.stringify(newActiveSessions));
        localStorage.setItem(`attendanceSessions_${todayStr}`, JSON.stringify(newAttendanceSessions));
      }
    } finally {
      setCreating(null);
    }
  };

  // Get current day and time for highlighting
  const today = new Date();
  const currentDayAbbr = DAYS[today.getDay() - 1] || "MON";
  const currentDayName = DAY_NAMES[DAYS.indexOf(currentDayAbbr)];
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Filter today's slots only
  const todaysSlots = weekly[currentDayAbbr] || [];

  // Responsive styles
  const getResponsiveStyles = () => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    
    return {
      container: {
        maxWidth: isMobile ? '100%' : isTablet ? '95%' : '1200px',
        padding: isMobile ? '0.75rem' : '1.5rem'
      },
      headerTitle: {
        fontSize: isMobile ? '1.5rem' : '2rem'
      },
      headerSubtitle: {
        fontSize: isMobile ? '0.9rem' : '1.1rem'
      },
      headerIcon: {
        width: isMobile ? '50px' : '72px',
        height: isMobile ? '50px' : '72px',
        fontSize: isMobile ? '1.5rem' : '2rem'
      },
      statsLabel: {
        fontSize: isMobile ? '0.75rem' : '0.85rem'
      },
      statsValue: {
        fontSize: isMobile ? '1rem' : '1.15rem'
      },
      cardPadding: {
        padding: isMobile ? '1rem' : '1.5rem'
      },
      timeColumn: {
        minWidth: isMobile ? '90px' : '120px',
        fontSize: isMobile ? '1.2rem' : '1.5rem'
      },
      buttonPadding: {
        padding: isMobile ? '0.75rem' : '0.875rem'
      }
    };
  };

  const styles = getResponsiveStyles();

  if (loading || !sessionsLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div
            variants={spinVariants}
            animate="animate"
            style={{ marginBottom: '1.5rem', color: BRAND_COLORS.primary.main, fontSize: '4rem' }}
          >
            <FaSyncAlt />
          </motion.div>
          <h3 style={{ 
            margin: '0 0 0.5rem 0', 
            color: '#1e293b', 
            fontWeight: 700,
            fontSize: '1.5rem'
          }}>
            Loading Today's Schedule...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Fetching your teaching schedule for {currentDayName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: styles.container.padding,
          paddingBottom: '2rem',
          paddingLeft: styles.container.padding,
          paddingRight: styles.container.padding,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <div style={{ 
          maxWidth: styles.container.maxWidth,
          width: '100%',
          margin: '0 auto'
        }}>
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}
          >
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/teacher/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: BRAND_COLORS.primary.main,
                background: 'none',
                border: 'none',
                fontSize: window.innerWidth < 768 ? '0.85rem' : '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaArrowLeft /> Back to Dashboard
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: window.innerWidth < 768 ? '0.9rem' : '1rem' }}>Today's Schedule</span>
          </motion.div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            <div style={{
              padding: window.innerWidth < 768 ? '1.25rem' : '1.75rem 2rem',
              background: BRAND_COLORS.primary.gradient,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: window.innerWidth < 768 ? '1rem' : '1.5rem', flexWrap: 'wrap' }}>
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  style={{
                    width: styles.headerIcon.width,
                    height: styles.headerIcon.height,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: styles.headerIcon.fontSize,
                    flexShrink: 0,
                    boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <FaCalendarAlt />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: styles.headerTitle.fontSize,
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    Today's Schedule
                  </h1>
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9,
                    fontSize: styles.headerSubtitle.fontSize,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <FaSun /> {currentDayName}, {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', width: window.innerWidth < 768 ? '100%' : 'auto', justifyContent: window.innerWidth < 768 ? 'center' : 'flex-end' }}>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.6rem 1rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  minWidth: '100px',
                  flex: window.innerWidth < 768 ? '1' : 'none'
                }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.85, marginBottom: '0.25rem' }}>Current Time</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(26, 75, 109, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await loadActiveSessions();
                    window.location.reload();
                  }}
                  style={{
                    backgroundColor: 'white',
                    color: BRAND_COLORS.primary.main,
                    border: '2px solid white',
                    padding: '0.6rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FaSyncAlt /> <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>Refresh</span>
                </motion.button>
              </div>
            </div>
            
            {/* Stats Bar */}
            <div style={{
              padding: window.innerWidth < 768 ? '0.75rem 1rem' : '1rem 2rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: window.innerWidth < 768 ? '0.75rem' : '1.5rem', flexWrap: 'wrap', flex: 1 }}>
                <StatItem
                  icon={<FaUniversity />}
                  label="Total Classes"
                  value={todaysSlots.length}
                  color={BRAND_COLORS.primary.main}
                  styles={styles}
                />
                <StatItem
                  icon={<FaCheckCircle />}
                  label="Published"
                  value={todaysSlots.filter(s => s.timetable_id?.status === "PUBLISHED").length}
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
              <div style={{ 
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                backgroundColor: `${BRAND_COLORS.success.main}15`,
                color: BRAND_COLORS.success.main,
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}>
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
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `1px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <FaExclamationTriangle size={window.innerWidth < 768 ? 16 : 20} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* ================= TODAY'S SCHEDULE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: window.innerWidth < 768 ? '1rem' : '1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: window.innerWidth < 768 ? '1.25rem' : '1.5rem',
                fontWeight: 700,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <FaSun style={{ color: BRAND_COLORS.warning.main }} /> Today's Classes
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: '#dbeafe',
                color: BRAND_COLORS.primary.main,
                padding: '0.4rem 0.875rem',
                borderRadius: '20px',
                fontSize: window.innerWidth < 768 ? '0.8rem' : '0.9rem',
                fontWeight: 500
              }}>
                <FaInfoCircle /> <span style={{ display: window.innerWidth < 480 ? 'none' : 'inline' }}>Only today's classes are shown</span>
              </div>
            </div>
            
            <div style={styles.cardPadding}>
              {todaysSlots.length === 0 ? (
                <EmptyState 
                  icon={<FaCalendarAlt />} 
                  title="No Classes Today" 
                  message={`You don't have any scheduled classes for ${currentDayName}. Enjoy your day off!`}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {TIMES.map((time, idx) => {
                    const slot = todaysSlots.find(s => {
                      const slotTime = `${s.startTime} - ${s.endTime}`;
                      return slotTime === time;
                    });
                    
                    if (!slot) return null;
                    
                    return (
                      <ScheduleRow
                        key={time}
                        time={time}
                        slot={slot}
                        isCurrent={isCurrentTimeSlot(time)}
                        onStartAttendance={startAttendance}
                        creating={creating === slot._id}
                        delay={idx * 0.05}
                        hasActiveSession={!!activeSessions[slot._id]}
                        hasAttendanceSession={!!attendanceSessions[slot._id]}
                        styles={styles}
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
            style={{
              marginTop: '1.5rem',
              padding: window.innerWidth < 768 ? '1rem' : '1.25rem',
              borderRadius: '16px',
              backgroundColor: '#fffbeb',
              border: '1px solid #f59e0b',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem'
            }}
          >
            <FaInfoCircle size={window.innerWidth < 768 ? 18 : 24} style={{ color: BRAND_COLORS.warning.main, flexShrink: 0, marginTop: '0.25rem' }} />
            <div style={{ color: '#92400e', fontSize: window.innerWidth < 768 ? '0.85rem' : '0.95rem', lineHeight: 1.6 }}>
              <strong>Attendance Policy:</strong> You can only start attendance for currently active classes (between start and end time). 
              The button will automatically enable at start time and disable after end time. Once started, attendance cannot be created again.
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= HELPER FUNCTIONS ================= */
function isCurrentTimeSlot(timeSlot) {
  const [startTime, endTime] = timeSlot.split(' - ');
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
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
  const isMobile = window.innerWidth < 768;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
      <div style={{
        width: isMobile ? '32px' : '36px',
        height: isMobile ? '32px' : '36px',
        borderRadius: '10px',
        backgroundColor: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? '1rem' : '1.1rem',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: styles.statsLabel.fontSize, color: '#64748b', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: styles.statsValue.fontSize, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

/* ================= SCHEDULE ROW ================= */
function ScheduleRow({ time, slot, isCurrent, onStartAttendance, creating, delay = 0, hasActiveSession, hasAttendanceSession, styles }) {
  const slotType = BRAND_COLORS.slotTypes[slot.slotType] || BRAND_COLORS.slotTypes.LECTURE;
  const isPublished = slot.timetable_id?.status === "PUBLISHED";
  const isMobile = window.innerWidth < 768;
  
  // Determine slot status
  const [startTime, endTime] = time.split(' - ');
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  let slotStatus = 'upcoming';
  if (currentMinutes >= endMinutes) {
    slotStatus = 'past';
  } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    slotStatus = 'active';
  }
  
  // Button is enabled ONLY if: published AND currently active AND no existing session
  const canStartAttendance = isPublished && isCurrent && !hasActiveSession && !hasAttendanceSession;
  
  // Determine button state
  let buttonState = 'start';
  if (creating === slot._id) {
    buttonState = 'creating';
  } else if (hasActiveSession || hasAttendanceSession) {
    buttonState = 'active';
  } else if (slotStatus === 'past') {
    buttonState = 'ended';
  } else if (!isPublished) {
    buttonState = 'unpublished';
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: isMobile ? 0 : -3, boxShadow: isMobile ? '0 2px 8px rgba(0, 0, 0, 0.06)' : '0 8px 20px rgba(0, 0, 0, 0.1)' }}
      style={{
        backgroundColor: 'white',
        border: `1px solid ${slotType.border}`,
        borderRadius: '16px',
        padding: isMobile ? '1rem' : '1.25rem',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1rem' : '1.5rem',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isCurrent && !hasActiveSession ? `0 0 0 3px ${BRAND_COLORS.primary.main}20` : '0 2px 8px rgba(0, 0, 0, 0.06)',
        opacity: slotStatus === 'past' ? 0.7 : 1
      }}
    >
      {isCurrent && !hasActiveSession && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: BRAND_COLORS.primary.gradient,
          zIndex: 1
        }} />
      )}
      
      {/* Time Column */}
      <div style={{ 
        minWidth: isMobile ? '100%' : styles.timeColumn.minWidth,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        borderRight: isMobile ? 'none' : `1px solid ${slotType.border}`,
        borderBottom: isMobile ? `1px solid ${slotType.border}` : 'none',
        backgroundColor: `${slotType.bg}30`,
        marginBottom: isMobile ? '0.5rem' : '0'
      }}>
        <div style={{ 
          fontSize: styles.timeColumn.fontSize, 
          fontWeight: 700, 
          color: slotType.text,
          marginBottom: '0.25rem'
        }}>
          {time.split(' - ')[0]}
        </div>
        <div style={{ 
          fontSize: isMobile ? '0.85rem' : '0.9rem', 
          color: '#64748b',
          fontWeight: 500
        }}>
          to {time.split(' - ')[1]}
        </div>
        {isCurrent && !hasActiveSession && (
          <motion.div
            variants={floatVariants}
            initial="initial"
            animate="float"
            style={{
              marginTop: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: `${BRAND_COLORS.primary.main}15`,
              color: BRAND_COLORS.primary.main,
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              justifyContent: isMobile ? 'flex-start' : 'center'
            }}
          >
            <FaClock size={12} />
            Currently Active
          </motion.div>
        )}
        {slotStatus === 'past' && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              justifyContent: isMobile ? 'flex-start' : 'center'
            }}
          >
            <FaClock size={12} />
            Completed
          </div>
        )}
        {hasActiveSession && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              justifyContent: isMobile ? 'flex-start' : 'center'
            }}
          >
            <FaCheckCircle size={12} />
            Attendance Active
          </div>
        )}
      </div>
      
      {/* Content Column */}
      <div style={{ flex: 1, width: '100%' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ flex: 1, width: '100%' }}>
            <div style={{ 
              fontWeight: 700, 
              color: slotType.text, 
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <FaBook size={isMobile ? 16 : 18} />
              {slot.subject_id?.name}
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: isMobile ? '0.5rem' : '0'
            }}>
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.875rem',
                borderRadius: '8px',
                backgroundColor: slotType.bg,
                color: slotType.text,
                fontSize: '0.85rem',
                fontWeight: 600,
                border: `1px solid ${slotType.border}`
              }}>
                <FaLayerGroup size={12} />
                {slot.slotType}
              </span>
              
              {slot.room && (
                <span style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.875rem',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#4a5568',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  border: '1px solid #e2e8f0'
                }}>
                  <FaDoorOpen size={12} />
                  Room {slot.room}
                </span>
              )}
              
              <span style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.875rem',
                borderRadius: '8px',
                backgroundColor: isPublished ? '#dcfce7' : '#fee2e2',
                color: isPublished ? '#166534' : '#b91c1c',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: `1px solid ${isPublished ? '#bbf7d0' : '#fecaca'}`
              }}>
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
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: isMobile ? 'flex-start' : 'flex-end',
            flexShrink: 0,
            minWidth: isMobile ? '100%' : '150px',
            marginTop: isMobile ? '0.5rem' : '0'
          }}>
            <div style={{ 
              fontSize: isMobile ? '0.9rem' : '0.95rem', 
              color: '#4a5568', 
              fontWeight: 600,
              marginBottom: '0.25rem'
            }}>
              {slot.timetable_id?.name}
            </div>
            <div style={{ 
              fontSize: isMobile ? '0.8rem' : '0.85rem', 
              color: '#64748b'
            }}>
              Sem {slot.timetable_id?.semester} • {slot.timetable_id?.academicYear}
            </div>
          </div>
        </div>
        
        <div style={{ 
          paddingTop: '0.75rem', 
          borderTop: '1px dashed #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: '#4a5568',
            fontSize: isMobile ? '0.9rem' : '0.95rem',
            flexWrap: 'wrap'
          }}>
            <FaChalkboardTeacher size={isMobile ? 14 : 16} style={{ color: BRAND_COLORS.primary.main }} />
            <span>{slot.teacher_id?.name || 'N/A'}</span>
          </div>
          
          {buttonState === 'creating' ? (
            <motion.button
              disabled
              style={{
                width: '100%',
                padding: styles.buttonPadding,
                borderRadius: '12px',
                border: 'none',
                backgroundColor: BRAND_COLORS.success.main,
                color: 'white',
                fontSize: isMobile ? '0.95rem' : '1.05rem',
                fontWeight: 600,
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                opacity: 0.8
              }}
            >
              <motion.div variants={spinVariants} animate="animate">
                <FaSyncAlt />
              </motion.div>
              Starting Session...
            </motion.button>
          ) : buttonState === 'active' ? (
            <div style={{
              width: '100%',
              padding: styles.buttonPadding,
              borderRadius: '12px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontSize: isMobile ? '0.95rem' : '1.05rem',
              fontWeight: 600,
              textAlign: 'center',
              border: `2px solid #86efac`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem'
            }}>
              <FaCheckCircle size={isMobile ? 18 : 20} />
              Attendance Session Active
            </div>
          ) : buttonState === 'ended' ? (
            <button
              disabled
              style={{
                width: '100%',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#cbd5e1',
                color: '#64748b',
                fontSize: isMobile ? '0.95rem' : '1.05rem',
                fontWeight: 600,
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '10px 0px'
              }}
            >
              <FaPauseCircle /> 
              Class Ended
            </button>
          ) : buttonState === 'unpublished' ? (
            <div style={{ 
              padding: styles.buttonPadding, 
              borderRadius: '12px', 
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '0.95rem',
              fontWeight: 500,
              textAlign: 'center',
              border: '1px solid #fecaca'
            }}>
              <FaExclamationTriangle size={16} style={{ marginRight: '0.5rem' }} />
              Timetable not published - Attendance unavailable
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStartAttendance(slot)}
              style={{
                width: '100%',
                padding: styles.buttonPadding,
                borderRadius: '12px',
                border: 'none',
                backgroundColor: BRAND_COLORS.success.main,
                color: 'white',
                fontSize: isMobile ? '0.95rem' : '1.05rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 15px rgba(40, 167, 69, 0.35)'
              }}
            >
              <FaPlay /> 
              Start Attendance Now
            </motion.button>
          )}
          
          {buttonState === 'ended' && isPublished && (
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: '10px', 
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaInfoCircle size={16} />
              <span>This class ended at {endTime}. Attendance cannot be started for past classes.</span>
            </div>
          )}
          
          {buttonState === 'active' && (
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: '10px', 
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              border: '1px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaInfoCircle size={16} />
              <span>Attendance is currently active for this class. You can now mark Student's attendance.</span>
            </div>
          )}
          
          {!canStartAttendance && buttonState !== 'active' && buttonState !== 'ended' && buttonState !== 'unpublished' && buttonState !== 'creating' && (
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: '10px', 
              backgroundColor: '#f0f9ff',
              color: '#0c4a6e',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaInfoCircle size={16} />
              <span>Attendance will be available from {startTime} to {endTime}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message }) {
  const isMobile = window.innerWidth < 768;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        padding: isMobile ? '2rem 1rem' : '3rem 1.5rem',
        textAlign: 'center',
        color: '#64748b'
      }}
    >
      <div style={{
        fontSize: isMobile ? '3.5rem' : '5rem',
        marginBottom: '1.5rem',
        opacity: 0.3,
        color: '#e2e8f0'
      }}>
        {icon}
      </div>
      <h3 style={{
        margin: '0 0 0.75rem 0',
        color: '#1e293b',
        fontWeight: 700,
        fontSize: isMobile ? '1.5rem' : '1.75rem'
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: 0, 
        fontSize: isMobile ? '1rem' : '1.1rem',
        maxWidth: '600px',
        margin: '0 auto',
        lineHeight: 1.6
      }}>
        {message}
      </p>
    </motion.div>
  );
}