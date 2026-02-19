import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import {
  FaUserGraduate,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaBook,
  FaFilter,
  FaSyncAlt,
  FaExclamationTriangle,
  FaArrowLeft,
  FaInfoCircle,
  FaClock,
  FaChartBar,
  FaUniversity,
  FaLayerGroup,
  FaDownload,
  FaPrint,
  FaQuestionCircle,
  FaLightbulb,
  FaBell,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' }
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

const spinVariants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: "linear" }
  }
};

const scaleVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.3 } },
  exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2 } }
};

export default function StudentAttendanceReport() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reportRes, subjectRes] = await Promise.all([
          api.get("/attendance/student", { params: filters }),
          api.get("/subjects/student").catch(() => ({ data: [] })) // Fallback if endpoint not ready
        ]);
        
        setData(reportRes.data);
        setSubjects(subjectRes.data || []);
        setError("");
        
        // Show success toast only on subsequent loads (not initial)
        if (data) {
          addToast("Attendance report updated successfully!", "success");
        }
      } catch (err) {
        console.error("Failed to load attendance report:", err);
        const errorMsg = err.response?.data?.message || "Failed to load attendance report. Please try again later.";
        setError(errorMsg);
        addToast(errorMsg, "error");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [filters]);

  /* ================= HANDLE FILTERS ================= */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    // Data will reload automatically due to useEffect dependency
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

  const refreshData = () => {
    setLoading(true);
    addToast("Refreshing attendance data...", "info");
    
    // Trigger reload by resetting loading state
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  /* ================= TOOLTIP HANDLERS ================= */
  const handleTooltip = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipContent(content);
    setTooltipPosition({
      top: rect.top + window.scrollY - 40,
      left: rect.left + window.scrollX + rect.width / 2
    });
    setShowTooltip(true);
  };

  const handleTooltipLeave = () => {
    setShowTooltip(false);
  };

  if (loading) {
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
            Loading Attendance Report...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Fetching your attendance records and statistics
          </p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalLectures: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  };

  const sessions = data?.sessions || [];
  const today = data?.today || [];
  const subjectWise = data?.subjectWise || [];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          paddingTop: '1.5rem',
          paddingBottom: '2rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <motion.button
              whileHover={{ x: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: BRAND_COLORS.primary.main,
                background: 'none',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>
              My Attendance Report
            </span>
          </motion.div>

          {/* ================= HEADER ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '2rem',
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
              padding: '2rem',
              background: BRAND_COLORS.primary.gradient,
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <motion.div
                  variants={pulseVariants}
                  initial="initial"
                  animate="pulse"
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    flexShrink: 0,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <FaClipboardList />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    My Attendance Report
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    Track your attendance across all subjects and sessions
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: '0.75rem 1.5rem',
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
                  <FaFilter /> {showFilters ? 'Hide Filters' : 'Apply Filters'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={refreshData}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: '0.75rem 1.5rem',
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
                  <FaSyncAlt /> Refresh
                </motion.button>
              </div>
            </div>
            
            {/* Filters Section */}
            {showFilters && (
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0'
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
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
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetFilters}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      color: '#1e293b',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Reset Filters
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={applyFilters}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: BRAND_COLORS.primary.main,
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)'
                    }}
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

          {/* ================= ERROR STATE ================= */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '1.5rem',
                padding: '1.25rem',
                borderRadius: '16px',
                backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                border: `1px solid ${BRAND_COLORS.danger.main}`,
                color: BRAND_COLORS.danger.main,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '1.05rem',
                fontWeight: 500
              }}
            >
              <FaExclamationTriangle size={24} />
              <div style={{ flex: 1 }}>{error}</div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                style={{
                  background: BRAND_COLORS.danger.main,
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FaSyncAlt /> Retry
              </motion.button>
            </motion.div>
          )}

          {/* ================= TODAY'S ATTENDANCE ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: '2rem' }}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <FaCalendarAlt style={{ color: BRAND_COLORS.primary.main }} /> 
                  Today's Attendance
                </h2>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  backgroundColor: '#dbeafe',
                  color: BRAND_COLORS.primary.main,
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  <FaInfoCircle size={14} />
                  {today.length} sessions today
                </div>
              </div>
              
              <div style={{ padding: '2rem' }}>
                {today.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{
                      fontSize: '4rem',
                      marginBottom: '1.5rem',
                      opacity: 0.3,
                      color: '#e2e8f0'
                    }}>
                      <FaClipboardList />
                    </div>
                    <h3 style={{
                      margin: '0 0 0.75rem 0',
                      color: '#1e293b',
                      fontWeight: 700,
                      fontSize: '1.75rem'
                    }}>
                      No Sessions Today
                    </h3>
                    <p style={{ 
                      color: '#64748b', 
                      margin: 0,
                      maxWidth: '600px',
                      margin: '0 auto'
                    }}>
                      You don't have any scheduled classes today. Enjoy your day off!
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '1.5rem'
                  }}>
                    {today.map((session, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                        style={{
                          backgroundColor: 'white',
                          border: `2px solid ${
                            session.status === "PRESENT" ? BRAND_COLORS.success.main :
                            session.status === "ABSENT" ? BRAND_COLORS.danger.main :
                            '#cbd5e1'
                          }`,
                          borderRadius: '16px',
                          padding: '1.5rem',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {session.status === "PRESENT" && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: BRAND_COLORS.success.gradient
                          }} />
                        )}
                        {session.status === "ABSENT" && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: BRAND_COLORS.danger.gradient
                          }} />
                        )}
                        
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <div style={{ 
                              fontWeight: 700, 
                              fontSize: '1.25rem', 
                              color: '#1e293b',
                              marginBottom: '0.25rem'
                            }}>
                              {session.subject}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              color: '#64748b',
                              fontSize: '0.95rem'
                            }}>
                              <FaClock size={14} />
                              <span>{session.startTime} - {session.endTime}</span>
                            </div>
                          </div>
                          <span style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '20px',
                            backgroundColor: 
                              session.status === "PRESENT" ? `${BRAND_COLORS.success.main}15` :
                              session.status === "ABSENT" ? `${BRAND_COLORS.danger.main}15` :
                              '#f1f5f9',
                            color: 
                              session.status === "PRESENT" ? BRAND_COLORS.success.main :
                              session.status === "ABSENT" ? BRAND_COLORS.danger.main :
                              '#4a5568',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            border: `1px solid ${
                              session.status === "PRESENT" ? BRAND_COLORS.success.main :
                              session.status === "ABSENT" ? BRAND_COLORS.danger.main :
                              '#e2e8f0'
                            }`
                          }}>
                            {session.status}
                          </span>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '12px',
                          marginTop: '1rem'
                        }}>
                          <FaUniversity size={16} style={{ color: BRAND_COLORS.primary.main }} />
                          <span style={{ fontSize: '0.95rem', color: '#4a5568' }}>
                            {session.room || 'Room not assigned'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
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
            style={{ marginBottom: '2rem' }}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <FaBook style={{ color: BRAND_COLORS.primary.main }} /> 
                  Subject-wise Attendance
                </h2>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  backgroundColor: '#dbeafe',
                  color: BRAND_COLORS.primary.main,
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  <FaInfoCircle size={14} />
                  {subjectWise.length} subjects
                </div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={headerCellStyle}>Subject</th>
                      <th style={headerCellStyle}>Code</th>
                      <th style={headerCellStyle}>Total</th>
                      <th style={headerCellStyle}>Present</th>
                      <th style={headerCellStyle}>Absent</th>
                      <th style={headerCellStyle}>Percentage</th>
                      <th style={headerCellStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectWise.map((sub, index) => (
                      <motion.tr
                        key={index}
                        variants={fadeInVariants}
                        custom={index * 0.03}
                        initial="hidden"
                        animate="visible"
                        style={{ 
                          backgroundColor: sub.warning ? '#fff5f5' : 'white',
                          transition: 'background-color 0.3s ease'
                        }}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                      >
                        <td style={cellStyle}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{sub.subject}</div>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#4a5568',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}>
                            {sub.code}
                          </span>
                        </td>
                        <td style={cellStyle}>{sub.total}</td>
                        <td style={cellStyle}>
                          <span style={{ 
                            color: BRAND_COLORS.success.main,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem'
                          }}>
                            <FaCheckCircle size={14} /> {sub.present}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ 
                            color: BRAND_COLORS.danger.main,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem'
                          }}>
                            <FaTimesCircle size={14} /> {sub.absent}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem'
                          }}>
                            <div style={{ 
                              width: '60px', 
                              height: '8px', 
                              borderRadius: '4px', 
                              backgroundColor: '#e2e8f0',
                              overflow: 'hidden'
                            }}>
                              <div 
                                style={{ 
                                  width: `${sub.percentage}%`, 
                                  height: '100%', 
                                  borderRadius: '4px',
                                  backgroundColor: sub.percentage >= 75 ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main
                                }} 
                              />
                            </div>
                            <span style={{ 
                              fontWeight: 700,
                              color: sub.percentage >= 75 ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main
                            }}>
                              {sub.percentage}%
                            </span>
                          </div>
                        </td>
                        <td style={cellStyle}>
                          {sub.warning ? (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              color: BRAND_COLORS.danger.main,
                              fontWeight: 600
                            }}>
                              <FaExclamationTriangle size={16} />
                              <span>Low Attendance</span>
                              <motion.span
                                whileHover={{ scale: 1.2 }}
                                style={{
                                  cursor: 'pointer',
                                  color: BRAND_COLORS.info.main,
                                  fontSize: '0.85rem'
                                }}
                                onMouseEnter={(e) => handleTooltip(e, "Your attendance is below 75%. Please attend more classes to maintain eligibility for exams.")}
                                onMouseLeave={handleTooltipLeave}
                              >
                                <FaQuestionCircle />
                              </motion.span>
                            </div>
                          ) : (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              color: BRAND_COLORS.success.main,
                              fontWeight: 600
                            }}>
                              <FaCheckCircle size={16} />
                              <span>Good</span>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                    
                    {subjectWise.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ ...cellStyle, textAlign: 'center', padding: '3rem 1rem' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '4rem',
                              marginBottom: '1.5rem',
                              opacity: 0.3,
                              color: '#e2e8f0'
                            }}>
                              <FaBook />
                            </div>
                            <h3 style={{
                              margin: '0 0 0.75rem 0',
                              color: '#1e293b',
                              fontWeight: 700,
                              fontSize: '1.75rem'
                            }}>
                              No Attendance Data
                            </h3>
                            <p style={{ color: '#64748b', margin: 0 }}>
                              Attendance records will appear here once classes begin
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div style={{ 
                padding: '1.5rem',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FaLightbulb style={{ color: BRAND_COLORS.warning.main }} />
                  <span style={{ color: '#4a5568', fontSize: '0.95rem' }}>
                    <strong>Important:</strong> Minimum 75% attendance required in each subject to be eligible for exams
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: 'white',
                      color: BRAND_COLORS.primary.main,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FaDownload size={16} /> Download Report
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '0.625rem 1.25rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: 'white',
                      color: BRAND_COLORS.primary.main,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FaPrint size={16} /> Print Report
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
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <FaClipboardList style={{ color: BRAND_COLORS.primary.main }} /> 
                  Session-wise Report
                </h2>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  backgroundColor: '#dbeafe',
                  color: BRAND_COLORS.primary.main,
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  <FaInfoCircle size={14} />
                  {sessions.length} sessions recorded
                </div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={headerCellStyle}>Date</th>
                      <th style={headerCellStyle}>Subject</th>
                      <th style={headerCellStyle}>Lecture</th>
                      <th style={headerCellStyle}>Time</th>
                      <th style={headerCellStyle}>Room</th>
                      <th style={headerCellStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, index) => (
                      <motion.tr
                        key={index}
                        variants={fadeInVariants}
                        custom={index * 0.03}
                        initial="hidden"
                        animate="visible"
                        style={{ 
                          backgroundColor: 'white',
                          transition: 'background-color 0.3s ease'
                        }}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                      >
                        <td style={cellStyle}>
                          <div style={{ fontWeight: 600 }}>
                            {new Date(session.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                            {new Date(session.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={cellStyle}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{session.subject}</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                            {session.teacher}
                          </div>
                        </td>
                        <td style={cellStyle}>Lecture {session.lectureNumber}</td>
                        <td style={cellStyle}>
                          <div>{session.startTime} - {session.endTime}</div>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#4a5568',
                            fontSize: '0.85rem',
                            fontWeight: 600
                          }}>
                            {session.room || 'N/A'}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          <span style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '20px',
                            backgroundColor: 
                              session.status === "PRESENT" ? `${BRAND_COLORS.success.main}15` :
                              session.status === "ABSENT" ? `${BRAND_COLORS.danger.main}15` :
                              '#f1f5f9',
                            color: 
                              session.status === "PRESENT" ? BRAND_COLORS.success.main :
                              session.status === "ABSENT" ? BRAND_COLORS.danger.main :
                              '#4a5568',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            border: `1px solid ${
                              session.status === "PRESENT" ? BRAND_COLORS.success.main :
                              session.status === "ABSENT" ? BRAND_COLORS.danger.main :
                              '#e2e8f0'
                            }`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem'
                          }}>
                            {session.status === "PRESENT" ? <FaCheckCircle size={14} /> : <FaTimesCircle size={14} />}
                            {session.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ ...cellStyle, textAlign: 'center', padding: '3rem 1rem' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{
                              fontSize: '4rem',
                              marginBottom: '1.5rem',
                              opacity: 0.3,
                              color: '#e2e8f0'
                            }}>
                              <FaClipboardList />
                            </div>
                            <h3 style={{
                              margin: '0 0 0.75rem 0',
                              color: '#1e293b',
                              fontWeight: 700,
                              fontSize: '1.75rem'
                            }}>
                              No Attendance Records
                            </h3>
                            <p style={{ color: '#64748b', margin: 0 }}>
                              Your attendance records will appear here once classes begin
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div style={{ 
                padding: '1.5rem',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <FaInfoCircle style={{ color: BRAND_COLORS.primary.main }} />
                <span style={{ color: '#4a5568', fontSize: '0.95rem' }}>
                  <strong>Tip:</strong> Use filters above to view attendance for specific subjects or date ranges
                </span>
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
      }}>
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
            onMouseEnter={onTooltip}
            onMouseLeave={onTooltipLeave}
            onMouseMove={(e) => onTooltip(e, tooltip)}
          >
            <FaQuestionCircle />
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

/* ================= STYLES ================= */
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '800px'
};

const headerCellStyle = {
  padding: '1rem 1.25rem',
  textAlign: 'left',
  fontWeight: 700,
  color: '#1e293b',
  fontSize: '0.95rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  backgroundColor: '#f8fafc',
  borderBottom: '2px solid #e2e8f0'
};

const cellStyle = {
  padding: '1rem 1.25rem',
  fontSize: '0.95rem',
  color: '#1e293b',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle'
};

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