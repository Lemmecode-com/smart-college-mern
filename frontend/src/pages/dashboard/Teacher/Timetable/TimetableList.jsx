import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTrash,
  FaEye,
  FaEdit,
  FaArrowLeft,
  FaSyncAlt,
  FaExclamationTriangle,
  FaPlus,
  FaUniversity,
  FaGraduationCap,
  FaLayerGroup,
  FaClock,
  FaInfoCircle,
  FaLock,
  FaUnlock,
  FaUserTie,
  FaEyeSlash
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
    transition: { delay: i * 0.05, duration: 0.5, ease: "easeOut" }
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

// Stat Item Component
const StatItem = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      backgroundColor: `${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
      fontSize: '1.25rem'
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{label}</div>
    </div>
  </div>
);

export default function TimetableList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  
  // ✅ HOD Status
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [isHOD, setIsHOD] = useState(false);
  const [hodVerified, setHodVerified] = useState(false);

  /* ================= FETCH TIMETABLES ================= */
  useEffect(() => {
    loadTimetables();
  }, []);

  const loadTimetables = async () => {
    try {
      setLoading(true);
      setError("");

      // Step 1: Load teacher profile to check HOD status
      if (user?.role === "TEACHER") {
        const profileRes = await api.get("/teachers/my-profile");
        setTeacherProfile(profileRes.data);

        // Step 2: Check if teacher is HOD
        const teacherData = profileRes.data;
        const isTeacherHOD = teacherData.department_id?.hod_id?.toString() === teacherData._id.toString();
        
        console.log("📋 HOD Check:", {
          isHOD: isTeacherHOD,
          teacherId: teacherData._id,
          hodId: teacherData.department_id?.hod_id,
          department: teacherData.department_id?.name
        });
        
        setIsHOD(isTeacherHOD);
        setHodVerified(true);
        
        // Step 3: Load timetables AFTER HOD verification
        const res = await api.get("/timetable");
        console.log("✅ Timetables loaded:", res.data.length);
        setTimetables(res.data);
        
      } else if (user?.role === "COLLEGE_ADMIN") {
        setIsHOD(true); // Admin has full access
        setHodVerified(true);
        
        // Step 3: Load timetables
        const res = await api.get("/timetable");
        console.log("✅ Timetables loaded (Admin):", res.data.length);
        setTimetables(res.data);
      } else {
        // For other roles, just load timetables
        const res = await api.get("/timetable");
        setTimetables(res.data);
        setHodVerified(true);
      }
    } catch (err) {
      console.error("Failed to load timetables:", err);
      setError(err.response?.data?.message || "Failed to load timetables. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PUBLISH TIMETABLE ================= */
  const publishTimetable = async (id) => {
    if (!window.confirm("Are you sure you want to publish this timetable? Students will be able to view it immediately after publishing.")) return;

    setPublishingId(id);
    try {
      await api.put(`/timetable/${id}/publish`);
      loadTimetables();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to publish timetable. Please try again.");
    } finally {
      setPublishingId(null);
    }
  };

  /* ================= DELETE TIMETABLE ================= */
  const deleteTimetable = async (id) => {
    if (!window.confirm("Are you sure you want to delete this timetable? This action cannot be undone.")) return;

    setDeletingId(id);
    try {
      await api.delete(`/timetable/${id}`);
      loadTimetables();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete timetable. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ================= EDIT TIMETABLE ================= */
  const editTimetable = (id) => {
    navigate(`/timetable/${id}/edit`);
  };

  // Loading State
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
            Loading Timetables...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Fetching your academic schedules
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
          paddingTop: '1.5rem',
          paddingBottom: '2rem',
          paddingLeft: '1rem',
          paddingRight: '1rem'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
              onClick={() => navigate(-1)}
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
                borderRadius: '8px'
              }}
            >
              <FaArrowLeft /> Back
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600 }}>
              Timetable Management
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
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
              overflow: 'hidden'
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
                    fontSize: '2.5rem'
                  }}
                >
                  <FaCalendarAlt />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    Timetable Management
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.1rem'
                  }}>
                    View, manage, and publish academic schedules
                  </p>
                  {hodVerified && isHOD && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      padding: '0.375rem 0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      <FaUserTie /> HOD Access Enabled
                    </div>
                  )}
                </div>
              </div>
              
              {/* ✅ HOD Only: Create Timetable Button */}
              {hodVerified && isHOD && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/timetable/create-timetable')}
                  style={{
                    backgroundColor: 'white',
                    color: BRAND_COLORS.primary.main,
                    border: '2px solid white',
                    padding: '0.875rem 1.75rem',
                    borderRadius: '14px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 6px 20px rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <FaPlus /> Create Timetable
                </motion.button>
              )}
            </div>

            {/* Stats Bar */}
            <div style={{
              padding: '1.25rem 2rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <StatItem
                  icon={<FaCalendarAlt />}
                  label="Total Timetables"
                  value={timetables.length}
                  color={BRAND_COLORS.primary.main}
                />
                <StatItem
                  icon={<FaCheckCircle />}
                  label="Published"
                  value={timetables.filter(t => t.status === "PUBLISHED").length}
                  color={BRAND_COLORS.success.main}
                />
                <StatItem
                  icon={<FaClock />}
                  label="Draft"
                  value={timetables.filter(t => t.status === "DRAFT").length}
                  color={BRAND_COLORS.warning.main}
                />
              </div>
              <div style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '20px',
                backgroundColor: '#dbeafe',
                color: BRAND_COLORS.primary.main,
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {hodVerified && isHOD ? (
                  <>
                    <FaUnlock /> Full Access
                  </>
                ) : (
                  <>
                    <FaLock /> View Only
                  </>
                )}
              </div>
            </div>

            {/* Info Banner */}
            {!hodVerified && (
              <div style={{
                padding: '1rem 2rem',
                backgroundColor: '#fef3c7',
                borderTop: '1px solid #fcd34d',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <FaInfoCircle style={{ color: BRAND_COLORS.warning.main, fontSize: '1.25rem' }} />
                <span style={{ color: '#92400e', fontWeight: 500 }}>
                  Verifying your access permissions...
                </span>
              </div>
            )}
            {hodVerified && !isHOD && (
              <div style={{
                padding: '1rem 2rem',
                backgroundColor: '#dbeafe',
                borderTop: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <FaEye style={{ color: BRAND_COLORS.info.main, fontSize: '1.25rem' }} />
                <span style={{ color: '#1e40af', fontWeight: 500 }}>
                  You are viewing timetables as a <strong>Teacher</strong>. Contact your HOD for any changes.
                </span>
              </div>
            )}
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
              <span>{error}</span>
            </motion.div>
          )}

          {/* ================= EMPTY STATE ================= */}
          {timetables.length === 0 && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '4rem 2rem',
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
                No Timetables Found
              </h3>
              <p style={{ color: '#64748b', margin: '0 0 1.5rem 0' }}>
                {hodVerified && isHOD 
                  ? "Create your first timetable to get started!"
                  : "No timetables available for your department."}
              </p>
              {hodVerified && isHOD && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/timetable/create-timetable')}
                  style={{
                    padding: '0.875rem 2rem',
                    backgroundColor: BRAND_COLORS.primary.main,
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaPlus /> Create Timetable
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ================= TIMETABLE GRID ================= */}
          {timetables.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {timetables.map((t, index) => (
                <motion.div
                  key={t._id}
                  variants={fadeInVariants}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {/* Status Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: t.status === "PUBLISHED" ? '#dcfce7' : '#fef3c7',
                    color: t.status === "PUBLISHED" ? '#15803d' : '#a16207',
                    zIndex: 10
                  }}>
                    {t.status}
                  </div>

                  <div style={{
                    padding: '1.5rem',
                    background: t.status === "PUBLISHED" 
                      ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                      : 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        backgroundColor: t.status === "PUBLISHED" ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.5rem'
                      }}>
                        <FaGraduationCap />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                          {t.course_id?.name || t.name}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                          {t.department_id?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#1e293b'
                      }}>
                        <FaLayerGroup style={{ marginRight: '0.375rem' }} />
                        Sem {t.semester}
                      </div>
                      <div style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#1e293b'
                      }}>
                        <FaClock style={{ marginRight: '0.375rem' }} />
                        {t.academicYear}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Created By
                      </div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
                        {t.createdBy?.name || 'N/A'}
                      </div>
                    </div>

                    {/* 🔍 Debug Info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        HOD: {String(isHOD)} | Verified: {String(hodVerified)} | Status: {t.status || 'undefined'}
                        {console.log(`📋 Timetable Card: ${t.name}, Status: ${t.status}, HOD: ${isHOD}`)}
                      </div>
                    )}

                    {/* ✅ HOD Only: Action Buttons */}
                    {hodVerified && isHOD && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/timetable/${t._id}/weekly`)}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: BRAND_COLORS.info.main,
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <FaEye /> View
                        </motion.button>
                        {t.status !== "PUBLISHED" && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => publishTimetable(t._id)}
                            disabled={publishingId === t._id}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '10px',
                              border: 'none',
                              backgroundColor: publishingId === t._id ? '#cbd5e1' : BRAND_COLORS.success.main,
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              cursor: publishingId === t._id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            {publishingId === t._id ? <FaSyncAlt className="spin" /> : <FaCheckCircle />}
                            Publish
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => deleteTimetable(t._id)}
                          disabled={deletingId === t._id}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: deletingId === t._id ? '#cbd5e1' : BRAND_COLORS.danger.main,
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: deletingId === t._id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {deletingId === t._id ? <FaSyncAlt className="spin" /> : <FaTrash />}
                        </motion.button>
                      </div>
                    )}
                    
                    {/* Non-HOD: View Only */}
                    {(!hodVerified || !isHOD) && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/timetable/${t._id}/weekly`)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: BRAND_COLORS.primary.main,
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <FaEye /> View Timetable
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}