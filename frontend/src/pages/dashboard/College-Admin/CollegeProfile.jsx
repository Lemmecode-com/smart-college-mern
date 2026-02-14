import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBuilding,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaLayerGroup,
  FaBook,
  FaUserGraduate,
  FaEdit,
  FaEye,
  FaDownload,
  FaPrint,
  FaArrowLeft,
  FaStar,
  FaShieldAlt,
  FaInfoCircle,
  FaBell,
  FaChartLine,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaClipboardList,
  FaMoneyBillWave,
  FaFileInvoice,
  FaCogs,
  FaSync,
  FaBolt,
  FaRedo,
  FaSyncAlt
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
    main: '#1e6f5c',
    dark: '#155447',
    light: '#2a8f7c',
    gradient: 'linear-gradient(135deg, #1e6f5c 0%, #155447 100%)'
  },
  info: {
    main: '#17a2b8',
    dark: '#138496',
    light: '#37b2d8',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  },
  warning: {
    main: '#ffc107',
    dark: '#e0a800',
    light: '#ffce3d',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  danger: {
    main: '#dc3545',
    dark: '#c82333',
    light: '#e4606d',
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
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" }
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

const floatVariants = {
  initial: { y: 0 },
  float: {
    y: [-10, 10, -10],
    transition: {
      duration: 3,
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

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [college, setCollege] = useState(null);
  const [stats, setStats] = useState({
    departments: 0,
    courses: 0,
    students: 0,
    teachers: 0,
    activeSessions: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const collegeRes = await api.get("/college/my-college");
        setCollege(collegeRes.data);
        
        setStats({
          departments: collegeRes.data?.departments?.length || 0,
          courses: collegeRes.data?.courses?.length || 0,
          students: collegeRes.data?.studentCount || 0,
          teachers: collegeRes.data?.teacherCount || 0,
          activeSessions: collegeRes.data?.activeSessions || 0
        });
      } catch (err) {
        console.error("Error loading college profile:", err);
        setError("Failed to load college profile data");
        setCollege(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ================= QUICK ACTIONS ================= */
  const quickActions = [
    { icon: <FaUsers />, label: "Students", path: "/students", color: "primary", gradient: BRAND_COLORS.primary.gradient },
    { icon: <FaLayerGroup />, label: "Departments", path: "/departments", color: "success", gradient: BRAND_COLORS.success.gradient },
    { icon: <FaBook />, label: "Courses", path: "/courses", color: "info", gradient: BRAND_COLORS.info.gradient },
    { icon: <FaChalkboardTeacher />, label: "Teachers", path: "/teachers", color: "warning", gradient: BRAND_COLORS.warning.gradient },
    { icon: <FaMoneyBillWave />, label: "Fee Structures", path: "/fees/list", color: "danger", gradient: BRAND_COLORS.danger.gradient },
    { icon: <FaCogs />, label: "Settings", path: "/college/profile", color: "secondary", gradient: BRAND_COLORS.secondary.gradient }
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  if (!college) return <EmptyState onBack={() => navigate("/dashboard")} />;

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
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        {/* Success Toast Notification */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '9999px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              maxWidth: '90%'
            }}
          >
            <FaCheckCircle size={20} />
            <span>Profile updated successfully!</span>
          </motion.div>
        )}

        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* ================= TOP NAVIGATION BAR ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
              <motion.div
                variants={pulseVariants}
                initial="initial"
                animate="pulse"
                style={{
                  width: '80px',
                  height: '80px',
                  background: BRAND_COLORS.primary.gradient,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 30px rgba(26, 75, 109, 0.4)',
                  flexShrink: 0
                }}
              >
                <FaUniversity size={36} style={{ color: 'white' }} />
              </motion.div>
              
              <div style={{ flex: 1 }}>
                <h1 style={{
                  margin: 0,
                  marginBottom: '0.25rem',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.2
                }}>
                  {college.name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    backgroundColor: '#e2e8f0',
                    color: '#4a5568',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    {college.code}
                  </span>
                  <span style={{
                    backgroundColor: college.isActive ? '#dcfce7' : '#fee2e2',
                    color: college.isActive ? '#166534' : '#b91c1c',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {college.isActive ? (
                      <>
                        <FaCheckCircle /> Active
                      </>
                    ) : (
                      <>
                        <FaTimesCircle /> Inactive
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(26, 75, 109, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/college/edit-profile")}
              style={{
                backgroundColor: BRAND_COLORS.primary.main,
                color: 'white',
                border: 'none',
                padding: '0.875rem 1.75rem',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <FaEdit /> Edit Profile
            </motion.button>
          </motion.div>

          {/* ================= MAIN CONTENT GRID ================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* LEFT COLUMN - PROFILE DETAILS */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* ================= BASIC INFO CARD ================= */}
                <motion.div
                  variants={fadeInVariants}
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    marginBottom: '1.5rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '1.5rem',
                      background: BRAND_COLORS.primary.gradient,
                      color: 'white'
                    }}>
                      <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaInfoCircle /> Institute Information
                      </h2>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <InfoItem 
                          icon={<FaEnvelope />} 
                          label="Official Email" 
                          value={college.email} 
                          copyable 
                          color={BRAND_COLORS.primary.main}
                        />
                        <InfoItem 
                          icon={<FaPhoneAlt />} 
                          label="Contact Number" 
                          value={college.contactNumber} 
                          copyable 
                          color={BRAND_COLORS.success.main}
                        />
                        <InfoItem 
                          icon={<FaMapMarkerAlt />} 
                          label="Full Address" 
                          value={college.address} 
                          fullWidth 
                          color={BRAND_COLORS.danger.main}
                        />
                        <InfoItem 
                          icon={<FaCalendarAlt />} 
                          label="Established Year" 
                          value={college.establishedYear?.toString() || "N/A"} 
                          color={BRAND_COLORS.warning.main}
                        />
                        <InfoItem 
                          icon={<FaShieldAlt />} 
                          label="College Type" 
                          value={college.collegeType || "Private"} 
                          color={BRAND_COLORS.info.main}
                        />
                        <InfoItem 
                          icon={<FaCalendarAlt />} 
                          label="Member Since" 
                          value={new Date(college.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} 
                          color={BRAND_COLORS.secondary.main}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ================= QUICK ACTIONS CARD ================= */}
                <motion.div
                  variants={fadeInVariants}
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '1.5rem',
                      background: BRAND_COLORS.success.gradient,
                      color: 'white'
                    }}>
                      <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaBolt /> Quick Actions
                      </h2>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {quickActions.map((action, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
                            whileTap={{ scale: 0.98 }}
                            style={{ gridColumn: 'span 1' }}
                          >
                            <button
                              onClick={() => navigate(action.path)}
                              style={{
                                width: '100%',
                                backgroundColor: 'white',
                                border: `2px solid ${action.color}`,
                                padding: '1.25rem 1rem',
                                borderRadius: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                color: action.color,
                                fontWeight: 600,
                                fontSize: '0.95rem'
                              }}
                            >
                              <div style={{
                                fontSize: '1.75rem',
                                color: action.color
                              }}>{action.icon}</div>
                              <span>{action.label}</span>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* RIGHT COLUMN - SIDEBAR */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ position: 'sticky', top: '20px' }}>
                {/* ================= RECENT ACTIVITY =================
                <motion.div
                  variants={fadeInVariants}
                  custom={2}
                  initial="hidden"
                  animate="visible"
                >
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    marginBottom: '1.5rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '1.5rem',
                      background: BRAND_COLORS.info.gradient,
                      color: 'white'
                    }}>
                      <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaBell /> Recent Activity
                      </h2>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: BRAND_COLORS.primary.main,
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaUserGraduate size={16} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>New student enrolled</p>
                            <small style={{ color: '#64748b' }}>2 hours ago</small>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: BRAND_COLORS.success.main,
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaBook size={16} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>Course added</p>
                            <small style={{ color: '#64748b' }}>Yesterday</small>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: BRAND_COLORS.warning.main,
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaMoneyBillWave size={16} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>Fee structure updated</p>
                            <small style={{ color: '#64748b' }}>2 days ago</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div> */}
              </div>
            </div>
          </div>

          {/* ================= FOOTER ================= */}
          {/* <motion.div
            variants={fadeInVariants}
            custom={3}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '1.5rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              marginTop: '1.5rem',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0' }}>
                  <small style={{ color: '#64748b' }}>
                    <FaInfoCircle style={{ marginRight: '0.5rem', color: BRAND_COLORS.primary.main }} /> 
                    System Version: <strong style={{ color: '#1e293b' }}>v2.1.0</strong>
                  </small>
                </p>
                <p style={{ margin: 0 }}>
                  <small style={{ color: '#64748b' }}>
                    Last Sync: <strong style={{ color: '#1e293b' }}>{new Date().toLocaleTimeString()}</strong>
                  </small>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/dashboard")}
                  style={{
                    backgroundColor: 'white',
                    color: '#64748b',
                    border: '2px solid #e2e8f0',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaArrowLeft /> Back to Dashboard
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.reload()}
                  style={{
                    backgroundColor: BRAND_COLORS.primary.main,
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <motion.div variants={spinVariants} animate="animate">
                    <FaSyncAlt />
                  </motion.div>
                  Refresh Data
                </motion.button>
              </div>
            </div>
          </motion.div> */}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= LOADING SKELETON ================= */
function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ color: '#1a4b6d', fontSize: '3rem' }}
        >
          <FaSyncAlt />
        </motion.div>
        <div style={{ fontSize: '1.25rem', color: '#64748b', fontWeight: 500 }}>
          Loading college profile...
        </div>
      </div>
    </div>
  );
}

/* ================= ERROR DISPLAY ================= */
function ErrorDisplay({ message, onRetry }) {
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
        <div style={{ color: '#dc3545', marginBottom: '1rem', fontSize: '3rem' }}>
          <FaTimesCircle />
        </div>
        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#1e293b' }}>Error Loading Profile</h4>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{message}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          style={{
            backgroundColor: '#1a4b6d',
            color: 'white',
            border: 'none',
            padding: '0.875rem 2rem',
            borderRadius: '0.75rem',
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
          <FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> Retry
        </motion.button>
        </div>
      </div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ onBack }) {
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
        <div style={{ color: '#64748b', marginBottom: '1rem', fontSize: '3rem' }}>
          <FaUniversity />
        </div>
        <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#1e293b' }}>No College Data Found</h4>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          Please contact your system administrator to set up college profile.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          style={{
            backgroundColor: 'white',
            color: '#64748b',
            border: '2px solid #e2e8f0',
            padding: '0.875rem 2rem',
            borderRadius: '0.75rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0 auto'
          }}
        >
          <FaArrowLeft /> Go Back
        </motion.button>
      </div>
    </div>
  );
}

/* ================= INFO ITEM ================= */
function InfoItem({ icon, label, value, copyable = false, fullWidth = false, color }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (copyable && value) {
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
        padding: '1rem',
        border: '1px solid #e2e8f0',
        borderRadius: '1rem',
        backgroundColor: 'white',
        cursor: copyable ? 'pointer' : 'default',
        transition: 'all 0.3s ease'
      }}
      onClick={handleCopy}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: `${color}15`,
          color: color,
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div style={{ flex: 1 }}>
          <h6 style={{
            margin: 0,
            marginBottom: '0.25rem',
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>{label}</h6>
          <h5 style={{
            margin: 0,
            fontWeight: 600,
            color: '#1e293b',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {value || "-"}
            {copyable && copied && (
              <span style={{ color: '#10b981', fontSize: '0.75rem' }}>
                <FaCheckCircle size={14} /> Copied!
              </span>
            )}
          </h5>
        </div>
      </div>
    </motion.div>
  );
}

// Add this CSS to your global stylesheet or index.html
/*
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
*/