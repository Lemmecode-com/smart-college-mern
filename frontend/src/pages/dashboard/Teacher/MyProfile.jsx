import React, { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
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
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <LoadingDisplay />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  }

  if (!profile) {
    return <EmptyState />;
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
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* ================= BREADCRUMB ================= */}
          <motion.div
            variants={slideDownVariants}
            initial="hidden"
            animate="visible"
            style={{
              marginBottom: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span 
                style={{ 
                  color: '#64748b', 
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/teacher/dashboard')}
              >
                Dashboard
              </span>
              <span style={{ color: '#94a3b8' }}>›</span>
              <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '0.9rem' }}>My Profile</span>
            </div>
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
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)'
            }}
          >
            <div style={{
              padding: '2rem',
              background: BRAND_COLORS.primary.gradient,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              flexWrap: 'wrap'
            }}>
              <motion.div
                variants={pulseVariants}
                initial="initial"
                animate="pulse"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '4rem',
                  flexShrink: 0,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                  border: '4px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                <FaUserTie />
              </motion.div>
              
              <div style={{ flex: 1 }}>
                <h1 style={{
                  margin: 0,
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                }}>
                  {profile.name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaChalkboardTeacher />
                    <span style={{ fontSize: '1.2rem', opacity: 0.9 }}>{profile.designation || 'Faculty Member'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaGraduationCap />
                    <span style={{ fontSize: '1.2rem', opacity: 0.9 }}>{profile.qualification || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaBriefcase />
                    <span style={{ fontSize: '1.2rem', opacity: 0.9 }}>{profile.experienceYears || 0} years experience</span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(26, 75, 109, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/teacher/dashboard')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
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
                  whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(255, 255, 255, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/profile/edit-profile')}
                  style={{
                    backgroundColor: 'white',
                    color: BRAND_COLORS.primary.main,
                    border: '2px solid white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <FaEdit /> Edit Profile
                </motion.button>
              </div>
            </div>
            
            {/* Status Bar */}
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaIdBadge style={{ color: BRAND_COLORS.primary.main }} />
                  <span style={{ color: '#4a5568', fontWeight: 500 }}>Employee ID: {profile.employeeId}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaUniversity style={{ color: BRAND_COLORS.info.main }} />
                  <span style={{ color: '#4a5568', fontWeight: 500 }}>Department: {profile.department_id?.name || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaBuilding style={{ color: BRAND_COLORS.success.main }} />
                  <span style={{ color: '#4a5568', fontWeight: 500 }}>College: {profile.college_id?.name || 'N/A'}</span>
                </div>
              </div>
              <motion.div
                variants={blinkVariants}
                initial="initial"
                animate="blink"
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '20px',
                  backgroundColor: `${BRAND_COLORS.success.main}15`,
                  color: BRAND_COLORS.success.main,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: `1px solid ${BRAND_COLORS.success.main}30`
                }}
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
                title="Personal Information"
                icon={<FaUserTie />}
                color={BRAND_COLORS.primary.main}
              >
                <div className="p-4">
                  <div className="row g-3">
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
                        value={profile.contactNumber || 'N/A'}
                        copyable
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaMapMarkerAlt />}
                        label="Address"
                        value={profile.address || 'N/A'}
                        fullWidth
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-4">
                      <InfoItem
                        icon={<FaCalendarAlt />}
                        label="Date of Birth"
                        value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'N/A'}
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
                        icon={<FaAward />}
                        label="Specialization"
                        value={profile.specialization || 'N/A'}
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
                        value={profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}
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
                title="Assigned Courses"
                icon={<FaGraduationCap />}
                color={BRAND_COLORS.info.main}
                subtitle={`${profile.courses?.length || 0} course${(profile.courses?.length || 0) !== 1 ? 's' : ''} assigned`}
              >
                <div className="p-4">
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
                title="Teaching Subjects"
                icon={<FaChalkboardTeacher />}
                color={BRAND_COLORS.warning.main}
                subtitle={`${profile.subjects?.length || 0} subject${(profile.subjects?.length || 0) !== 1 ? 's' : ''} taught`}
              >
                <div className="p-4">
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

/* ================= LOADING DISPLAY ================= */
function LoadingDisplay() {
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
          Loading Profile...
        </h3>
        <p style={{ color: '#64748b', margin: 0 }}>
          Please wait while we fetch your profile data
        </p>
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
        <div style={{ 
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: BRAND_COLORS.danger.main,
          fontSize: '3rem'
        }}>
          <FaSyncAlt />
        </div>
        <h3 style={{ 
          margin: '0 0 0.5rem 0', 
          fontWeight: 700, 
          color: '#1e293b',
          fontSize: '1.75rem'
        }}>
          Profile Error
        </h3>
        <p style={{ 
          color: '#64748b', 
          marginBottom: '1.5rem',
          lineHeight: 1.6
        }}>
          {message}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
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
          <motion.div variants={spinVariants} animate="animate">
            <FaSyncAlt />
          </motion.div>
          Retry Loading
        </motion.button>
      </div>
    </div>
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
function SectionCard({ title, icon, color, subtitle, children }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
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
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
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
          <h5 style={{
            margin: '0 0 0.25rem 0',
            color: '#1e293b',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            {course.name}
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: `${BRAND_COLORS.info.main}15`,
              color: BRAND_COLORS.info.main,
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {course.code}
            </span>
            <span style={{
              color: '#64748b',
              fontSize: '0.9rem'
            }}>
              {course.credits ? `${course.credits} Credits` : 'N/A'}
            </span>
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
      style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
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
          <h5 style={{
            margin: '0 0 0.25rem 0',
            color: '#1e293b',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            {subject.name}
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
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
        margin: 0, 
        fontSize: '1rem',
        maxWidth: '600px',
        margin: '0 auto',
        lineHeight: 1.6
      }}>
        {message}
      </p>
    </div>
  );
}