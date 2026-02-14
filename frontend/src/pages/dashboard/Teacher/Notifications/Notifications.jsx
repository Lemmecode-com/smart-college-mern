import React, { useEffect, useState } from "react";
import api from "../../../../api/axios";
import {
  FaBell,
  FaUserTie,
  FaChalkboardTeacher,
  FaClock,
  FaTrash,
  FaEdit,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaInfoCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaStar,
  FaEye
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Brand Color Palette
const BRAND_COLORS = {
  primary: { main: '#1a4b6d', gradient: 'linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)' },
  success: { main: '#28a745', gradient: 'linear-gradient(135deg, #28a745 0%, #218838 100%)' },
  info: { main: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)' },
  warning: { main: '#ffc107', gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)' },
  danger: { main: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' },
  secondary: { main: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)' },
  notificationTypes: {
    GENERAL: { icon: FaInfoCircle, color: '#3b82f6', bg: '#dbeafe' },
    ACADEMIC: { icon: FaGraduationCap, color: '#8b5cf6', bg: '#ede9fe' },
    EXAM: { icon: FaCalendarAlt, color: '#ec4899', bg: '#fce7f3' },
    FEE: { icon: FaMoneyBillWave, color: '#f59e0b', bg: '#ffedd5' },
    ATTENDANCE: { icon: FaUserCheck, color: '#10b981', bg: '#dcfce7' },
    EVENT: { icon: FaBullhorn, color: '#ef4444', bg: '#fee2e2' },
    ASSIGNMENT: { icon: FaClipboardList, color: '#6366f1', bg: '#eef2ff' },
    URGENT: { icon: FaExclamationTriangle, color: '#dc2626', bg: '#fee2e2' }
  },
  priorities: {
    LOW: { color: '#64748b', bg: '#f1f5f9', icon: FaStar },
    NORMAL: { color: '#1e40af', bg: '#dbeafe', icon: FaInfoCircle },
    HIGH: { color: '#b91c1c', bg: '#fee2e2', icon: FaClock },
    URGENT: { color: '#dc2626', bg: '#fecaca', icon: FaExclamationTriangle }
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

export default function Notifications() {
  const [myNotes, setMyNotes] = useState([]);
  const [adminNotes, setAdminNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications/teacher/read");
      setMyNotes(res.data.myNotifications || []);
      setAdminNotes(res.data.adminNotifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(err.response?.data?.message || "Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const deleteNote = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification? This action cannot be undone.")) return;
    
    setDeletingId(id);
    try {
      await api.delete(`/notifications/delete-note/${id}`);
      fetchNotes();
    } catch (err) {
      console.error("Failed to delete notification:", err);
      alert(err.response?.data?.message || "Failed to delete notification. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate stats
  const totalMyNotes = myNotes.length;
  const totalAdminNotes = adminNotes.length;
  const unreadMyNotes = myNotes.filter(n => !n.read).length;
  const unreadAdminNotes = adminNotes.filter(n => !n.read).length;
  const urgentNotes = [...myNotes, ...adminNotes].filter(n => n.priority === "URGENT").length;

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
            Loading Notifications...
          </h3>
          <p style={{ color: '#64748b', margin: 0 }}>
            Fetching your latest announcements and updates
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          margin: '2rem',
          padding: '1.5rem',
          borderRadius: '12px',
          backgroundColor: `${BRAND_COLORS.danger.main}0a`,
          border: `1px solid ${BRAND_COLORS.danger.main}`,
          color: BRAND_COLORS.danger.main,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <FaTimesCircle size={24} />
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Error Loading Notifications</h4>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </motion.div>
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
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
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
              onClick={() => navigate('/teacher/dashboard')}
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
              <FaArrowLeft /> Back to Dashboard
            </motion.button>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>Notifications</span>
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
              padding: '1.75rem 2rem',
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
                    width: '72px',
                    height: '72px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    flexShrink: 0,
                    boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <FaBell />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    fontWeight: 700,
                    lineHeight: 1.2
                  }}>
                    Notifications Center
                  </h1>
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.1rem'
                  }}>
                    Your announcements and college updates
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchNotes}
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
                  <FaSyncAlt /> Refresh
                </motion.button>
              </div>
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
                  icon={<FaChalkboardTeacher />}
                  label="My Notifications"
                  value={totalMyNotes}
                  unread={unreadMyNotes}
                  color={BRAND_COLORS.primary.main}
                />
                <StatItem
                  icon={<FaUserTie />}
                  label="Admin Notifications"
                  value={totalAdminNotes}
                  unread={unreadAdminNotes}
                  color={BRAND_COLORS.info.main}
                />
                <StatItem
                  icon={<FaExclamationTriangle />}
                  label="Urgent Alerts"
                  value={urgentNotes}
                  color={BRAND_COLORS.danger.main}
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
                Total: {totalMyNotes + totalAdminNotes} notifications
              </div>
            </div>
          </motion.div>

          {/* ================= MY NOTIFICATIONS ================= */}
          <Section
            title="My Notifications"
            icon={<FaChalkboardTeacher />}
            notes={myNotes}
            isOwner
            onEdit={(id) => navigate(`/notifications/edit/${id}`)}
            onDelete={deleteNote}
            deletingId={deletingId}
            delay={0}
          />

          {/* ================= ADMIN NOTIFICATIONS ================= */}
          <Section
            title="From College Admin"
            icon={<FaUserTie />}
            notes={adminNotes}
            delay={1}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= STAT ITEM ================= */
function StatItem({ icon, label, value, unread = 0, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        backgroundColor: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {value}
          {unread > 0 && (
            <span style={{
              backgroundColor: BRAND_COLORS.danger.main,
              color: 'white',
              padding: '0.125rem 0.5rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {unread} new
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= SECTION ================= */
function Section({ title, icon, notes, isOwner = false, onEdit, onDelete, deletingId, delay = 0 }) {
  const isEmpty = notes.length === 0;
  
  return (
    <motion.div
      variants={fadeInVariants}
      custom={delay}
      initial="hidden"
      animate="visible"
      style={{ marginBottom: '2rem' }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {icon}
          {title}
          <span style={{
            backgroundColor: '#e2e8f0',
            color: '#4a5568',
            padding: '0.125rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            {notes.length}
          </span>
        </h2>
        {isOwner && notes.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            backgroundColor: '#dbeafe',
            color: BRAND_COLORS.primary.main,
            padding: '0.375rem 1rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            <FaInfoCircle size={14} />
            Click notification to view details
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyState 
          icon={isOwner ? <FaChalkboardTeacher /> : <FaUserTie />}
          title={isOwner ? "No Personal Notifications" : "No Admin Notifications"}
          message={isOwner 
            ? "You haven't created any notifications yet. Create your first announcement to keep students informed."
            : "No announcements from college administration at this time."
          }
          actionText={isOwner ? "Create Notification" : null}
          onAction={isOwner ? () => window.location.href = '/teacher/notifications/create' : null}
        />
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '1.5rem'
        }}>
          {notes.map((note, idx) => (
            <NotificationCard 
              key={note._id} 
              note={note} 
              isOwner={isOwner}
              onEdit={onEdit}
              onDelete={onDelete}
              deletingId={deletingId}
              delay={idx * 0.05}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ================= NOTIFICATION CARD ================= */
function NotificationCard({ note, isOwner, onEdit, onDelete, deletingId, delay = 0 }) {
  // Get type and priority config
  const typeConfig = BRAND_COLORS.notificationTypes[note.type] || BRAND_COLORS.notificationTypes.GENERAL;
  const priorityConfig = BRAND_COLORS.priorities[note.priority] || BRAND_COLORS.priorities.NORMAL;
  const TypeIcon = typeConfig.icon;
  const PriorityIcon = priorityConfig.icon;
  
  // Check if notification is expired
  const isExpired = note.expiresAt && new Date(note.expiresAt) < new Date();
  const isUrgent = note.priority === "URGENT";
  
  // Format date
  const formattedDate = new Date(note.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay, duration: 0.5 }}
      whileHover={{ y: -5, boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)' }}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        border: isUrgent ? `2px solid ${BRAND_COLORS.danger.main}` : '1px solid #e2e8f0',
        position: 'relative'
      }}
    >
      {/* Urgent ribbon */}
      {isUrgent && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '-28px',
          backgroundColor: BRAND_COLORS.danger.main,
          color: 'white',
          padding: '0.25rem 2rem',
          transform: 'rotate(45deg)',
          fontWeight: 700,
          fontSize: '0.85rem',
          boxShadow: '0 3px 10px rgba(220, 53, 69, 0.4)',
          zIndex: 10
        }}>
          URGENT
        </div>
      )}
      
      {/* Header with badges */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '20px',
            backgroundColor: typeConfig.bg,
            color: typeConfig.color,
            fontSize: '0.85rem',
            fontWeight: 600,
            border: `1px solid ${typeConfig.color}30`
          }}>
            <TypeIcon size={12} />
            {note.type.replace('_', ' ')}
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '20px',
            backgroundColor: priorityConfig.bg,
            color: priorityConfig.color,
            fontSize: '0.85rem',
            fontWeight: 600,
            border: `1px solid ${priorityConfig.color}30`
          }}>
            <PriorityIcon size={12} />
            {note.priority}
          </div>
          
          {!note.read && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.875rem',
              borderRadius: '20px',
              backgroundColor: `${BRAND_COLORS.success.main}15`,
              color: BRAND_COLORS.success.main,
              fontSize: '0.85rem',
              fontWeight: 600,
              border: `1px solid ${BRAND_COLORS.success.main}30`
            }}>
              <FaEye size={12} />
              Unread
            </div>
          )}
        </div>
        
        {isOwner && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: isExpired ? '0.5rem' : '0' }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onEdit(note._id); }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: 'white',
                color: BRAND_COLORS.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              title="Edit notification"
            >
              <FaEdit size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onDelete(note._id); }}
              disabled={deletingId === note._id}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                backgroundColor: deletingId === note._id ? '#94a3b8' : '#fee2e2',
                color: deletingId === note._id ? '#64748b' : BRAND_COLORS.danger.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: deletingId === note._id ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              title="Delete notification"
            >
              {deletingId === note._id ? (
                <motion.div variants={spinVariants} animate="animate">
                  <FaSyncAlt size={14} />
                </motion.div>
              ) : (
                <FaTrash size={16} />
              )}
            </motion.button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{
          margin: '0 0 0.75rem 0',
          fontSize: '1.35rem',
          fontWeight: 700,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <TypeIcon size={24} style={{ color: typeConfig.color }} />
          {note.title}
        </h3>
        
        <p style={{
          margin: 0,
          color: '#4a5568',
          fontSize: '1.05rem',
          lineHeight: 1.6,
          marginBottom: '1.25rem',
          minHeight: '60px'
        }}>
          {note.message}
        </p>
        
        {/* Meta information */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingTop: '1rem',
          borderTop: '1px dashed #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.95rem' }}>
            <FaClock size={16} />
            <span>{formattedDate}</span>
          </div>
          
          {note.expiresAt && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: isExpired ? BRAND_COLORS.danger.main : '#64748b',
              fontSize: '0.95rem',
              fontWeight: isExpired ? 600 : 500
            }}>
              <FaCalendarAlt size={16} />
              <span>Expires: {new Date(note.expiresAt).toLocaleDateString()}</span>
              {isExpired && (
                <span style={{
                  backgroundColor: `${BRAND_COLORS.danger.main}15`,
                  color: BRAND_COLORS.danger.main,
                  padding: '0.125rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginLeft: '0.5rem'
                }}>
                  EXPIRED
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Expired overlay */}
      {isExpired && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(220, 53, 69, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          borderRadius: '16px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <FaTimesCircle size={32} style={{ color: BRAND_COLORS.danger.main, marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600, color: '#1e293b' }}>Notification Expired</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>This notification is no longer active</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ================= EMPTY STATE ================= */
function EmptyState({ icon, title, message, actionText, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        padding: '3rem',
        textAlign: 'center'
      }}
    >
      <div style={{
        fontSize: '5rem',
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
        fontSize: '1.75rem'
      }}>
        {title}
      </h3>
      <p style={{ 
        color: '#64748b', 
        marginBottom: '2rem',
        fontSize: '1.05rem',
        maxWidth: '600px',
        margin: '0 auto 2rem'
      }}>
        {message}
      </p>
      {actionText && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          style={{
            backgroundColor: BRAND_COLORS.primary.main,
            color: 'white',
            border: 'none',
            padding: '0.875rem 2rem',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(26, 75, 109, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          <FaBell /> {actionText}
        </motion.button>
      )}
    </motion.div>
  );
}