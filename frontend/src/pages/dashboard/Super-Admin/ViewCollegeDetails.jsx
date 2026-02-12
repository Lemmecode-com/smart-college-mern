import React, { useEffect, useState, useContext } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import {
  FaUniversity,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaBook,
  FaClipboardList,
  FaArrowLeft,
  FaQrcode,
  FaSyncAlt,
  FaCheckCircle
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 12, stiffness: 100 }
  }
};

const pulseVariants = {
  initial: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const gradientColors = {
  'from-blue-400 to-cyan-400': 'linear-gradient(135deg, #3b82f6, #22d3ee)',
  'from-green-400 to-emerald-400': 'linear-gradient(135deg, #22c55e, #10b981)',
  'from-amber-400 to-orange-400': 'linear-gradient(135deg, #f59e0b, #f97316)',
  'from-purple-400 to-pink-400': 'linear-gradient(135deg, #a78bfa, #f472b6)',
  'from-blue-500 to-cyan-400': 'linear-gradient(135deg, #3b82f6, #22d3ee)',
  'from-indigo-500 to-purple-500': 'linear-gradient(135deg, #6366f1, #a78bfa)',
  'from-amber-500 to-orange-400': 'linear-gradient(135deg, #f59e0b, #f97316)',
  'from-green-500 to-emerald-400': 'linear-gradient(135deg, #22c55e, #10b981)',
  'from-teal-500 to-cyan-500': 'linear-gradient(135deg, #14b8a6, #22d3ee)',
  'from-pink-500 to-rose-400': 'linear-gradient(135deg, #ec4899, #f43f5e)',
  'from-blue-600 to-cyan-500': 'linear-gradient(135deg, #2563eb, #06b6d4)',
  'primary-gradient': 'linear-gradient(135deg, #1e40af, #0c4a6e)',
  'success-gradient': 'linear-gradient(135deg, #047857, #065f46)',
  'header-gradient': 'linear-gradient(135deg, #1a4b6d, #0f3a4a)'
};

export default function ViewCollegeDetails() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [college, setCollege] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Security checks
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;

  // Fetch college data
  useEffect(() => {
    if (!id) {
      setError("Invalid College ID");
      setLoading(false);
      return;
    }
    fetchCollege();
  }, [id]);

  const fetchCollege = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/master/${id}`);
      setCollege(res.data.college);
      setStats(res.data.stats);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Error fetching college:", err);
      setError(err?.response?.data?.message || "Failed to fetch college details");
    } finally {
      setLoading(false);
    }
  };

  // Loading state with animated spinner
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ color: '#3b82f6' }}
        >
          <FaSyncAlt size={48} />
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'inline-block',
            padding: '1rem 1.5rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}
        >
          <h5 style={{ margin: 0, fontWeight: 500 }}>{error}</h5>
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
          }}
        >
          <FaArrowLeft style={{ marginRight: '0.5rem' }} /> Go Back
        </motion.button>
      </div>
    );
  }

  if (!college) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(to bottom right, #f8fafc, #dbeafe)',
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        {/* Success Notification */}
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
              maxWidth: '90%',
              width: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaCheckCircle size={20} style={{ marginRight: '0.5rem' }} />
              <span>College details loaded successfully!</span>
            </div>
          </motion.div>
        )}

        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* Header Card with Animated Icon */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              marginBottom: '1.5rem',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                flexWrap: 'wrap',
                gap: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                  <motion.div
                    variants={pulseVariants}
                    initial="initial"
                    animate="pulse"
                    style={{
                      width: '72px',
                      height: '72px',
                      background: gradientColors['header-gradient'],
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 25px rgba(37, 99, 235, 0.4)',
                      flexShrink: 0
                    }}
                  >
                    <FaUniversity size={32} style={{ color: 'white' }} />
                  </motion.div>
                  <div style={{ flex: 1 }}>
                    <h1 style={{
                      margin: 0,
                      marginBottom: '0.25rem',
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      lineHeight: 1.2
                    }}>
                      {college.name}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '0.5rem 1rem',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}>
                        CODE: {college.code}
                      </span>
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                        <FaCalendarAlt style={{ marginRight: '0.25rem' }} />
                        Est. {college.establishedYear}
                      </span>
                    </div>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ x: -5, boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(-1)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#3b82f6',
                    border: '2px solid #3b82f6',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaArrowLeft /> Back to Colleges
                </motion.button>
              </div>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {/* College Information Card */}
            <motion.div
              variants={itemVariants}
              style={{ gridColumn: '1 / -1' }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '18px',
                boxShadow: '0 2px 15px rgba(0, 0, 0, 0.05)',
                height: '100%',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(to right, #eff6ff, #e0e7ff)',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <FaUniversity style={{ color: '#3b82f6' }} /> College Information
                  </h2>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <InfoItem 
                      icon={<FaEnvelope />}
                      label="Official Email"
                      value={college.email}
                      gradient={gradientColors['from-blue-400 to-cyan-400']}
                    />
                    <InfoItem 
                      icon={<FaPhone />}
                      label="Contact Number"
                      value={college.contactNumber}
                      gradient={gradientColors['from-green-400 to-emerald-400']}
                    />
                    <InfoItem 
                      icon={<FaMapMarkerAlt />}
                      label="Address"
                      value={college.address}
                      gradient={gradientColors['from-amber-400 to-orange-400']}
                    />
                    <InfoItem 
                      icon={<FaCalendarAlt />}
                      label="Established Year"
                      value={college.establishedYear?.toString() || 'N/A'}
                      gradient={gradientColors['from-purple-400 to-pink-400']}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Statistics Section */}
            {stats && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ gridColumn: '1 / -1' }}
              >
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '18px',
                  boxShadow: '0 2px 15px rgba(0, 0, 0, 0.05)',
                  marginBottom: '1.5rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(to right, #f0f9ff, #ede9fe)',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <h2 style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaClipboardList style={{ color: '#4f46e5' }} /> College Statistics
                    </h2>
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      <StatCard 
                        icon={<FaLayerGroup />}
                        label="Departments"
                        value={stats.totalDepartments}
                        gradient={gradientColors['from-blue-500 to-cyan-400']}
                        delay={0.1}
                      />
                      <StatCard 
                        icon={<FaBook />}
                        label="Courses"
                        value={stats.totalCourses}
                        gradient={gradientColors['from-indigo-500 to-purple-500']}
                        delay={0.2}
                      />
                      <StatCard 
                        icon={<FaChalkboardTeacher />}
                        label="Teachers"
                        value={stats.totalTeachers}
                        gradient={gradientColors['from-amber-500 to-orange-400']}
                        delay={0.3}
                      />
                      <StatCard 
                        icon={<FaUsers />}
                        label="Total Students"
                        value={stats.totalStudents}
                        gradient={gradientColors['from-green-500 to-emerald-400']}
                        delay={0.4}
                      />
                      <StatCard 
                        icon={<FaCheckCircle />}
                        label="Approved Students"
                        value={stats.approvedStudents}
                        gradient={gradientColors['from-teal-500 to-cyan-500']}
                        delay={0.5}
                      />
                      <StatCard 
                        icon={<FaCalendarAlt />}
                        label="Active Timetables"
                        value={stats.totalTimetables}
                        gradient={gradientColors['from-pink-500 to-rose-400']}
                        delay={0.6}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Registration Details Card */}
            <motion.div
              variants={itemVariants}
              style={{ gridColumn: '1 / -1' }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '18px',
                boxShadow: '0 2px 15px rgba(0, 0, 0, 0.05)',
                height: '100%',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(to right, #ecfdf5, #f0fdfa)',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <FaQrcode style={{ color: '#0d9488' }} /> Registration Portal
                  </h2>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: 500,
                      color: '#334155',
                      fontSize: '0.875rem'
                    }}>
                      Registration URL
                    </label>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
                      <input
                        type="text"
                        value={college.registrationUrl}
                        readOnly
                        style={{
                          flex: 1,
                          padding: '0.75rem 1rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.75rem 0 0 0.75rem',
                          backgroundColor: '#f8fafc',
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(college.registrationUrl);
                          setShowSuccess(true);
                          setTimeout(() => setShowSuccess(false), 3000);
                        }}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '0 1.5rem',
                          borderRadius: '0 0.75rem 0.75rem 0',
                          fontSize: '0.95rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                      >
                        Copy
                      </button>
                    </div>
                    <a
                      href={college.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                      }}
                    >
                      Open Registration Portal <span style={{ marginLeft: '0.25rem' }}>↗</span>
                    </a>
                  </div>

                  {college.registrationQr && (
                    <div style={{
                      textAlign: 'center',
                      marginTop: '1.5rem',
                      paddingTop: '1.5rem',
                      borderTop: '1px solid #e2e8f0'
                    }}>
                      <h5 style={{
                        fontWeight: 700,
                        marginBottom: '1rem',
                        color: '#1e293b',
                        fontSize: '1.125rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaQrcode style={{ color: '#3b82f6' }} /> Scan to Register
                      </h5>
                      <motion.div
                        variants={pulseVariants}
                        initial="initial"
                        animate="pulse"
                        style={{
                          display: 'inline-block',
                          padding: '1.25rem',
                          backgroundColor: 'white',
                          borderRadius: '16px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                          border: '3px solid',
                          backgroundImage: gradientColors['primary-gradient']
                        }}
                      >
                        <img
                          src={`/${college.registrationQr}`}
                          alt="College Registration QR Code"
                          style={{
                            width: '180px',
                            height: '180px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </motion.div>
                      <p style={{
                        marginTop: '1rem',
                        color: '#64748b',
                        fontSize: '0.9rem'
                      }}>
                        Students can scan this QR code to access the registration portal
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Enhanced InfoItem Component with Animations
const InfoItem = ({ icon, label, value, gradient }) => {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
      transition={{ type: "spring", damping: 10 }}
      style={{
        padding: '1rem',
        borderRadius: '16px',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'flex-start',
        border: '1px solid #eaeaea',
        height: '100%'
      }}
    >
      <div
        style={{
          marginRight: '1rem',
          padding: '0.75rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '48px',
          minHeight: '48px',
          background: gradient,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          flexShrink: 0
        }}
      >
        {React.cloneElement(icon, { size: 20, style: { color: 'white' } })}
      </div>
      <div style={{ flex: 1 }}>
        <small style={{
          display: 'block',
          marginBottom: '0.25rem',
          color: '#64748b',
          fontWeight: 500,
          fontSize: '0.75rem'
        }}>{label}</small>
        <div style={{
          fontWeight: 600,
          color: '#0f172a',
          fontSize: '1.1rem'
        }}>{value || 'N/A'}</div>
      </div>
    </motion.div>
  );
};

// Enhanced StatCard Component with Animations
const StatCard = ({ icon, label, value, gradient, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay || 0, type: "spring", damping: 15 }}
      whileHover={{ y: -8, boxShadow: '0 15px 35px rgba(0,0,0,0.12)' }}
      style={{
        padding: '0.5rem',
        cursor: 'default'
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        height: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1rem',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div
            style={{
              marginRight: '1rem',
              padding: '0.75rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              background: gradient,
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
              flexShrink: 0
            }}
          >
            {React.cloneElement(icon, { size: 20, style: { color: 'white' } })}
          </div>
          <div>
            <div style={{
              fontWeight: 700,
              color: '#0f172a',
              fontSize: '1.5rem'
            }}>{value}</div>
            <small style={{
              color: '#64748b',
              fontWeight: 500,
              fontSize: '0.75rem'
            }}>{label}</small>
          </div>
        </div>
      </div>
    </motion.div>
  );
};