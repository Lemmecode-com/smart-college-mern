import React, { useState } from "react";
import api from "../../../../api/axios";
import {
  FaBell,
  FaPaperPlane,
  FaExclamationTriangle,
  FaInfoCircle,
  FaGraduationCap,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaEye,
  FaClock,
  FaStar
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
    LOW: { color: '#64748b', bg: '#f1f5f9', label: 'Low Priority' },
    NORMAL: { color: '#1e40af', bg: '#dbeafe', label: 'Normal Priority' },
    HIGH: { color: '#b91c1c', bg: '#fee2e2', label: 'High Priority' },
    URGENT: { color: '#dc2626', bg: '#fecaca', label: 'Urgent' }
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

export default function CreateNotifications() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    priority: "NORMAL",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      setError("Title and Message are required fields");
      return;
    }

    if (form.title.length > 100) {
      setError("Title must be less than 100 characters");
      return;
    }

    if (form.message.length > 1000) {
      setError("Message must be less than 1000 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        priority: form.priority,
      };

      await api.post("/notifications/teacher/create", payload);

      setSuccess("Notification sent successfully to all students!");
      
      // Reset form after success
      setForm({
        title: "",
        message: "",
        type: "GENERAL",
        priority: "NORMAL",
      });
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error("Failed to send notification:", err);
      setError(err.response?.data?.message || "Failed to send notification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get notification type config
  const typeConfig = BRAND_COLORS.notificationTypes[form.type] || BRAND_COLORS.notificationTypes.GENERAL;
  const priorityConfig = BRAND_COLORS.priorities[form.priority] || BRAND_COLORS.priorities.NORMAL;
  const TypeIcon = typeConfig.icon;
  const PriorityIcon = form.priority === "URGENT" ? FaExclamationTriangle : 
                      form.priority === "HIGH" ? FaClock : 
                      form.priority === "LOW" ? FaStar : FaInfoCircle;

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
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            <span style={{ color: BRAND_COLORS.primary.main, fontWeight: 600, fontSize: '1rem' }}>Create Notification</span>
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
                  <FaBell />
                </motion.div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}>
                    Create Notification
                  </h1>
                  <p style={{
                    margin: '0.75rem 0 0 0',
                    opacity: 0.9,
                    fontSize: '1.25rem'
                  }}>
                    Send important announcements to your students
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPreview(!showPreview)}
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
                  <FaEye /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                </motion.button>
              </div>
            </div>
            
            {/* Info Banner */}
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: '#dbeafe',
              borderTop: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <FaInfoCircle style={{ color: BRAND_COLORS.primary.main, fontSize: '1.5rem', flexShrink: 0 }} />
              <div style={{ color: '#1e293b', fontWeight: 500, lineHeight: 1.5 }}>
                Notifications will be sent to all students enrolled in your courses. 
                <strong style={{ marginLeft: '0.5rem' }}>Students will receive email and in-app alerts.</strong>
              </div>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* ================= FORM CARD ================= */}
            <motion.div
              variants={fadeInVariants}
              custom={0}
              initial="hidden"
              animate="visible"
              style={{ gridColumn: showPreview ? '1 / 2' : '1 / -1' }}
            >
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.75rem',
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
                    fontSize: '1.5rem',
                    flexShrink: 0
                  }}>
                    <FaBell />
                  </div>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.5rem', 
                    fontWeight: 700,
                    color: '#1e293b'
                  }}>
                    Compose Notification
                  </h2>
                </div>
                
                <div style={{ padding: '2rem' }}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
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
                      <FaTimesCircle size={20} />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        backgroundColor: `${BRAND_COLORS.success.main}0a`,
                        border: `1px solid ${BRAND_COLORS.success.main}`,
                        color: BRAND_COLORS.success.main,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <FaCheckCircle size={20} />
                      <span>{success}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit}>
                    {/* Title Field */}
                    <FormField 
                      icon={<FaInfoCircle />} 
                      label="Notification Title" 
                      required
                      error={form.title.length > 100}
                      helperText={`${form.title.length}/100 characters`}
                    >
                      <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="e.g., Important Exam Schedule Update"
                        style={{
                          ...inputStyle,
                          borderColor: form.title.length > 100 ? BRAND_COLORS.danger.main : '#e2e8f0'
                        }}
                        maxLength="100"
                      />
                    </FormField>

                    {/* Message Field */}
                    <FormField 
                      icon={<FaClipboardList />} 
                      label="Message Content" 
                      required
                      error={form.message.length > 1000}
                      helperText={`${form.message.length}/1000 characters`}
                    >
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Enter detailed notification message here..."
                        rows="6"
                        style={{
                          ...inputStyle,
                          resize: 'vertical',
                          minHeight: '150px',
                          borderColor: form.message.length > 1000 ? BRAND_COLORS.danger.main : '#e2e8f0'
                        }}
                        maxLength="1000"
                      />
                    </FormField>

                    {/* Type Field */}
                    <FormField 
                      icon={<TypeIcon />} 
                      label="Notification Type" 
                      helperText="Select category for better organization"
                    >
                      <select
                        name="type"
                        value={form.type}
                        onChange={handleChange}
                        style={selectStyle}
                      >
                        {Object.entries(BRAND_COLORS.notificationTypes).map(([key, config]) => {
                          const Icon = config.icon;
                          return (
                            <option key={key} value={key} style={{ padding: '0.5rem' }}>
                              {key.replace('_', ' ')} - {getNotificationDescription(key)}
                            </option>
                          );
                        })}
                      </select>
                      <div style={{ 
                        display: 'flex', 
                        gap: '0.5rem', 
                        marginTop: '0.75rem',
                        flexWrap: 'wrap'
                      }}>
                        {Object.entries(BRAND_COLORS.notificationTypes).map(([key, config]) => {
                          const Icon = config.icon;
                          return (
                            <motion.div
                              key={key}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setForm(prev => ({ ...prev, type: key }))}
                              style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: form.type === key ? config.bg : '#f8fafc',
                                border: `1px solid ${form.type === key ? config.color : '#e2e8f0'}`,
                                color: form.type === key ? config.color : '#4a5568',
                                fontWeight: form.type === key ? 600 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Icon size={14} />
                              {key.slice(0, 3)}
                            </motion.div>
                          );
                        })}
                      </div>
                    </FormField>

                    {/* Priority Field */}
                    <FormField 
                      icon={<PriorityIcon />} 
                      label="Priority Level" 
                      helperText="Higher priority notifications appear at the top"
                    >
                      <select
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                        style={{
                          ...selectStyle,
                          backgroundColor: priorityConfig.bg,
                          color: priorityConfig.color,
                          fontWeight: 600
                        }}
                      >
                        {Object.entries(BRAND_COLORS.priorities).map(([key, config]) => (
                          <option 
                            key={key} 
                            value={key}
                            style={{ 
                              backgroundColor: config.bg, 
                              color: config.color,
                              fontWeight: 600,
                              padding: '0.75rem'
                            }}
                          >
                            {config.label}
                          </option>
                        ))}
                      </select>
                      <div style={{ 
                        display: 'flex', 
                        gap: '0.75rem', 
                        marginTop: '0.75rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        backgroundColor: priorityConfig.bg,
                        borderLeft: `3px solid ${priorityConfig.color}`
                      }}>
                        <PriorityIcon size={24} style={{ color: priorityConfig.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: priorityConfig.color, fontSize: '0.95rem' }}>
                            {priorityConfig.label}
                          </div>
                          <div style={{ color: '#4a5568', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                            {getPriorityDescription(form.priority)}
                          </div>
                        </div>
                      </div>
                    </FormField>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || !form.title.trim() || !form.message.trim()}
                      style={{
                        width: '100%',
                        padding: '1.25rem',
                        borderRadius: '16px',
                        border: 'none',
                        backgroundColor: (loading || !form.title.trim() || !form.message.trim()) ? '#cbd5e1' : BRAND_COLORS.primary.main,
                        color: 'white',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        cursor: (loading || !form.title.trim() || !form.message.trim()) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1rem',
                        boxShadow: (loading || !form.title.trim() || !form.message.trim()) ? 'none' : '0 6px 20px rgba(26, 75, 109, 0.35)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {loading ? (
                        <>
                          <motion.div variants={spinVariants} animate="animate">
                            <FaSyncAlt />
                          </motion.div>
                          Sending Notification...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane /> Send Notification to All Students
                        </>
                      )}
                    </motion.button>
                    
                    <div style={{ 
                      marginTop: '1.5rem', 
                      padding: '1rem', 
                      borderRadius: '12px', 
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      fontSize: '0.95rem',
                      color: '#4a5568',
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <FaInfoCircle style={{ marginTop: '0.25rem', color: BRAND_COLORS.primary.main, flexShrink: 0 }} />
                        <div>
                          <strong>Important:</strong> This notification will be sent to <span style={{ fontWeight: 600, color: BRAND_COLORS.primary.main }}>{form.type === 'URGENT' ? 'ALL' : 'all'}</span> students in your courses. 
                          Please review carefully before sending.
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* ================= PREVIEW CARD ================= */}
            {showPreview && (
              <motion.div
                variants={fadeInVariants}
                custom={1}
                initial="hidden"
                animate="visible"
                style={{ gridColumn: '1 / -1' }}
              >
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '1.75rem',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderBottom: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${BRAND_COLORS.success.main}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: BRAND_COLORS.success.main,
                      fontSize: '1.5rem',
                      flexShrink: 0
                    }}>
                      <FaEye />
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      Notification Preview
                    </h2>
                  </div>
                  
                  <div style={{ padding: '2rem' }}>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '16px',
                      border: `2px solid ${typeConfig.bg}`,
                      padding: '1.75rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Decorative corner element */}
                      <div style={{
                        position: 'absolute',
                        top: '-15px',
                        right: '-15px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: typeConfig.bg,
                        opacity: 0.3
                      }} />
                      
                      {/* Priority badge */}
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        left: '1rem',
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
                        {priorityConfig.label}
                      </div>
                      
                      {/* Notification type badge */}
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
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
                        {form.type.replace('_', ' ')}
                      </div>
                      
                      <div style={{ paddingTop: '1.5rem' }}>
                        <h3 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <TypeIcon size={24} style={{ color: typeConfig.color }} />
                          {form.title || 'Notification Title'}
                        </h3>
                        
                        <div style={{
                          color: '#4a5568',
                          fontSize: '1.05rem',
                          lineHeight: 1.7,
                          marginBottom: '1.5rem',
                          minHeight: '80px'
                        }}>
                          {form.message || 'This is a preview of your notification message. Students will see this content in their notification center and email.'}
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          borderRadius: '12px',
                          backgroundColor: '#edf2f7',
                          fontSize: '0.95rem',
                          color: '#4a5568'
                        }}>
                          <FaClock size={18} style={{ color: BRAND_COLORS.primary.main }} />
                          <span>Preview only • Actual notification will include timestamp and sender details</span>
                        </div>
                      </div>
                      
                      {/* Footer with action buttons */}
                      <div style={{
                        marginTop: '1.5rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px dashed #e2e8f0',
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'flex-end'
                      }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            color: '#4a5568',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <FaTimesCircle /> Dismiss
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: '0.625rem 1.25rem',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: BRAND_COLORS.primary.main,
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(26, 75, 109, 0.2)'
                          }}
                        >
                          <FaCheckCircle /> Mark as Read
                        </motion.button>
                      </div>
                    </div>
                    
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1.25rem',
                      borderRadius: '16px',
                      backgroundColor: '#dbeafe',
                      border: '1px solid #93c5fd',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem'
                    }}>
                      <FaInfoCircle size={24} style={{ color: BRAND_COLORS.primary.main, flexShrink: 0, marginTop: '0.25rem' }} />
                      <div style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        <strong>Preview Note:</strong> This is how students will see your notification in their dashboard. 
                        Email notifications will include additional branding and unsubscribe options.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= FORM FIELD COMPONENT ================= */
function FormField({ icon, label, children, required = false, error = false, helperText }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        fontWeight: 600,
        color: '#1e293b',
        fontSize: '1.05rem'
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          backgroundColor: `${BRAND_COLORS.primary.main}10`,
          color: BRAND_COLORS.primary.main,
          fontSize: '1rem'
        }}>
          {icon}
        </span>
        {label}
        {required && (
          <span style={{ 
            color: BRAND_COLORS.danger.main, 
            marginLeft: '0.25rem',
            fontSize: '1.1rem'
          }}>
            *
          </span>
        )}
      </label>
      
      {helperText && (
        <div style={{
          fontSize: '0.85rem',
          color: error ? BRAND_COLORS.danger.main : '#64748b',
          marginBottom: '0.75rem',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          {helperText}
        </div>
      )}
      
      {children}
    </div>
  );
}

/* ================= HELPER FUNCTIONS ================= */
function getNotificationDescription(type) {
  const descriptions = {
    GENERAL: "General announcements and updates",
    ACADEMIC: "Academic program updates and changes",
    EXAM: "Exam schedules, results, and updates",
    FEE: "Fee payment reminders and updates",
    ATTENDANCE: "Attendance alerts and summaries",
    EVENT: "College events and activities",
    ASSIGNMENT: "Assignment deadlines and submissions",
    URGENT: "Critical time-sensitive announcements"
  };
  return descriptions[type] || "Notification category";
}

function getPriorityDescription(priority) {
  const descriptions = {
    LOW: "Low priority notifications appear at the bottom of the list",
    NORMAL: "Standard priority for regular announcements",
    HIGH: "High priority notifications appear near the top",
    URGENT: "Urgent notifications appear at the very top with special highlighting"
  };
  return descriptions[priority] || "Priority level description";
}

/* ================= STYLES ================= */
const inputStyle = {
  width: '100%',
  padding: '0.875rem 1.25rem',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  fontSize: '1.05rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500,
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
};

const selectStyle = {
  width: '100%',
  padding: '0.875rem 1.25rem',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  fontSize: '1.05rem',
  backgroundColor: 'white',
  color: '#1e293b',
  fontWeight: 500,
  appearance: 'none',
  backgroundImage: `url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '16px',
  transition: 'all 0.3s ease',
  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
};