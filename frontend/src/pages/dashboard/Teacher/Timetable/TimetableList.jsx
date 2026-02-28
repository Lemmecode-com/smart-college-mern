import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../auth/AuthContext";
import api from "../../../../api/axios";
import { toast } from "react-toastify";
import ConfirmModal from "../../../../components/ConfirmModal";

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
  FaUnlock
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

export default function TimetableList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isTeacher = user?.role === "TEACHER";

  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null,
    id: null,
    title: "",
    message: "",
    type: "warning"
  });

  /* ================= FETCH TIMETABLES ================= */
  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const res = await api.get("/timetable");
      setTimetables(res.data);
      setError("");
    } catch (err) {
      console.error("Failed to load timetables:", err);
      setError(err.response?.data?.message || "Failed to load timetables. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PUBLISH TIMETABLE ================= */
  const showPublishConfirm = (id) => {
    setConfirmModal({
      isOpen: true,
      action: "publish",
      id: id,
      title: "Publish Timetable?",
      message: "Are you sure you want to publish this timetable? Students will be able to view it immediately after publishing.",
      type: "warning"
    });
  };

  const confirmPublishTimetable = async () => {
    setPublishingId(confirmModal.id);
    try {
      await api.put(`/timetable/${confirmModal.id}/publish`);
      fetchTimetables();
      toast.success("Timetable published successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to publish timetable. Please try again.";
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
    } finally {
      setPublishingId(null);
      setConfirmModal({ isOpen: false, action: null, id: null, title: "", message: "", type: "warning" });
    }
  };

  /* ================= DELETE TIMETABLE ================= */
  const showDeleteConfirm = (id) => {
    setConfirmModal({
      isOpen: true,
      action: "delete",
      id: id,
      title: "Delete Timetable?",
      message: "Are you sure you want to delete this timetable? This action cannot be undone.",
      type: "danger"
    });
  };

  const confirmDeleteTimetable = async () => {
    setDeletingId(confirmModal.id);
    try {
      await api.delete(`/timetable/${confirmModal.id}`);
      fetchTimetables();
      toast.success("Timetable deleted successfully!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to delete timetable. Please try again.";
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
    } finally {
      setDeletingId(null);
      setConfirmModal({ isOpen: false, action: null, id: null, title: "", message: "", type: "warning" });
    }
  };

  /* ================= EDIT TIMETABLE ================= */
  const editTimetable = (id) => {
    navigate(`/timetable/${id}/edit`);
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
                    fontSize: '1.25rem'
                  }}>
                    View, manage, and publish academic schedules
                  </p>
                </div>
              </div>
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
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 20px rgba(255, 255, 255, 0.3)'
                }}
              >
                <FaPlus /> Create Timetable
              </motion.button>
            </div>
            
            {/* Stats Bar */}
            <div style={{
              padding: '1rem 2rem',
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
                fontWeight: 600,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FaInfoCircle size={14} />
                {isTeacher ? "Teacher View" : "Admin View"}
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
                onClick={fetchTimetables}
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

          {/* ================= TIMETABLES CARD ================= */}
          <motion.div
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}
          >
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
                Academic Timetables
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
                Click on any timetable to view weekly schedule
              </div>
            </div>
            
            {timetables.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={headerCellStyle}>Timetable Name</th>
                      <th style={headerCellStyle}>Semester</th>
                      <th style={headerCellStyle}>Academic Year</th>
                      <th style={headerCellStyle}>Status</th>
                      <th style={{ ...headerCellStyle, minWidth: '280px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetables.map((t, index) => (
                      <motion.tr
                        key={t._id}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: `${BRAND_COLORS.primary.main}10`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: BRAND_COLORS.primary.main,
                              flexShrink: 0
                            }}>
                              <FaCalendarAlt size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.name}</div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                                Created: {new Date(t.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td style={cellStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaLayerGroup size={16} style={{ color: BRAND_COLORS.warning.main }} />
                            <span>{t.semester || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={cellStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaClock size={16} style={{ color: BRAND_COLORS.info.main }} />
                            <span>{t.academicYear || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={cellStyle}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.375rem 0.875rem',
                            borderRadius: '20px',
                            backgroundColor: t.status === "PUBLISHED" ? `${BRAND_COLORS.success.main}15` : `${BRAND_COLORS.warning.main}15`,
                            color: t.status === "PUBLISHED" ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main,
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            border: `1px solid ${t.status === "PUBLISHED" ? BRAND_COLORS.success.main : BRAND_COLORS.warning.main}30`
                          }}>
                            {t.status === "PUBLISHED" ? <FaCheckCircle size={12} /> : <FaClock size={12} />}
                            {t.status}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'center', padding: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {/* VIEW BUTTON */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => navigate(`/timetable/${t._id}/weekly`)}
                              title="View Weekly Timetable"
                              style={{
                                padding: '0.5rem 0.875rem',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: 'white',
                                color: BRAND_COLORS.primary.main,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <FaEye size={14} /> View
                            </motion.button>
                            
                            {/* EDIT BUTTON */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => editTimetable(t._id)}
                              disabled={t.status === "PUBLISHED"}
                              title={t.status === "PUBLISHED" ? "Cannot edit published timetable" : "Edit Timetable"}
                              style={{
                                padding: '0.5rem 0.875rem',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: t.status === "PUBLISHED" ? '#f1f5f9' : '#dbeafe',
                                color: t.status === "PUBLISHED" ? '#94a3b8' : BRAND_COLORS.primary.main,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: t.status === "PUBLISHED" ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <FaEdit size={14} /> Edit
                            </motion.button>
                            
                            {/* PUBLISH BUTTON (TEACHERS ONLY) */}
                            {isTeacher && t.status === "DRAFT" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => showPublishConfirm(t._id)}
                                disabled={publishingId === t._id}
                                title="Publish Timetable"
                                style={{
                                  padding: '0.5rem 0.875rem',
                                  borderRadius: '10px',
                                  border: 'none',
                                  backgroundColor: publishingId === t._id ? '#94a3b8' : BRAND_COLORS.success.main,
                                  color: 'white',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: publishingId === t._id ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.375rem',
                                  transition: 'all 0.2s ease',
                                  boxShadow: publishingId === t._id ? 'none' : '0 2px 8px rgba(40, 167, 69, 0.3)'
                                }}
                              >
                                {publishingId === t._id ? (
                                  <motion.div variants={spinVariants} animate="animate">
                                    <FaSyncAlt size={14} />
                                  </motion.div>
                                ) : (
                                  <FaCheckCircle size={14} />
                                )}
                                {publishingId === t._id ? 'Publishing...' : 'Publish'}
                              </motion.button>
                            )}
                            
                            {/* DELETE BUTTON */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => showDeleteConfirm(t._id)}
                              disabled={deletingId === t._id}
                              title="Delete Timetable"
                              style={{
                                padding: '0.5rem 0.875rem',
                                borderRadius: '10px',
                                border: '1px solid #fecaca',
                                backgroundColor: deletingId === t._id ? '#94a3b8' : BRAND_COLORS.danger.main,
                                color: 'white',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: deletingId === t._id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {deletingId === t._id ? (
                                <motion.div variants={spinVariants} animate="animate">
                                  <FaSyncAlt size={14} />
                                </motion.div>
                              ) : (
                                <FaTrash size={14} />
                              )}
                              {deletingId === t._id ? 'Deleting...' : 'Delete'}
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState 
                icon={<FaCalendarAlt />} 
                title="No Timetables Found" 
                message="Create your first academic timetable to get started" 
                actionText="Create Timetable" 
                onAction={() => navigate('/timetable/create-timetable')} 
              />
            )}
            
            <div style={{ 
              padding: '1.5rem',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <FaInfoCircle style={{ color: BRAND_COLORS.primary.main }} />
              <div style={{ color: '#4a5568', fontSize: '0.95rem' }}>
                <strong>Tip:</strong> Timetables in <span style={{ color: BRAND_COLORS.success.main, fontWeight: 600 }}>Published</span> status are visible to students. 
                <span style={{ display: 'block', marginTop: '0.25rem' }}>
                  {isTeacher ? "As a teacher, you can publish draft timetables after finalizing the schedule." : "As an admin, you can manage all timetables across departments."}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ================= CONFIRM MODAL ================= */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null, id: null, title: "", message: "", type: "warning" })}
        onConfirm={confirmModal.action === "publish" ? confirmPublishTimetable : confirmDeleteTimetable}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.action === "publish" ? "Publish" : "Delete"}
        isLoading={confirmModal.action === "publish" ? publishingId === confirmModal.id : deletingId === confirmModal.id}
      />
    </AnimatePresence>
  );
}

/* ================= STAT ITEM COMPONENT ================= */
function StatItem({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        backgroundColor: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
      </div>
    </div>
  );
}

/* ================= EMPTY STATE COMPONENT ================= */
function EmptyState({ icon, title, message, actionText, onAction }) {
  return (
    <div style={{ 
      padding: '4rem 2rem',
      textAlign: 'center',
      color: '#64748b'
    }}>
      <div style={{
        fontSize: '6rem',
        marginBottom: '1.5rem',
        opacity: 0.2,
        color: '#e2e8f0'
      }}>
        {icon}
      </div>
      <h3 style={{
        margin: '0 0 0.75rem 0',
        color: '#1e293b',
        fontWeight: 700,
        fontSize: '1.75rem'
      }}>
        {title}
      </h3>
      <p style={{ 
        margin: '0 0 2rem 0', 
        fontSize: '1.1rem',
        maxWidth: '600px',
        margin: '0 auto 2rem'
      }}>
        {message}
      </p>
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: '0 8px 20px rgba(26, 75, 109, 0.3)' }}
        whileTap={{ scale: 0.95 }}
        onClick={onAction}
        style={{
          backgroundColor: BRAND_COLORS.primary.main,
          color: 'white',
          border: 'none',
          padding: '0.875rem 2rem',
          borderRadius: '14px',
          fontSize: '1.1rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)',
          transition: 'all 0.3s ease'
        }}
      >
        <FaPlus /> {actionText}
      </motion.button>
    </div>
  );
}

/* ================= STYLES ================= */
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '900px'
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