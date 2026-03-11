import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import Loading from "../../../../components/Loading";
import ConfirmModal from "../../../../components/ConfirmModal";
import Breadcrumb from "../../../../components/Breadcrumb";
import {
  FaBell,
  FaSave,
  FaArrowLeft,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserCheck,
  FaBullhorn,
  FaClipboardList,
  FaClock,
  FaStar,
  FaExpand,
  FaCompress
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

/* ================= CONFIGURATION ================= */
const CONFIG = {
  TOAST: {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored",
  },
  THEME: {
    PRIMARY: "#0f3a4a",
    PRIMARY_DARK: "#0c2d3a",
    PRIMARY_LIGHT: "#1a4b6d",
    SUCCESS: "#28a745",
    WARNING: "#ffc107",
    DANGER: "#dc3545",
    INFO: "#17a2b8",
  },
};

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
    LOW: { color: '#64748b', bg: '#f1f5f9', icon: FaStar, label: 'Low Priority' },
    NORMAL: { color: '#1e40af', bg: '#dbeafe', icon: FaInfoCircle, label: 'Normal Priority' },
    HIGH: { color: '#b91c1c', bg: '#fee2e2', icon: FaClock, label: 'High Priority' },
    URGENT: { color: '#dc2626', bg: '#fecaca', icon: FaExclamationTriangle, label: 'Urgent' }
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

export default function EditNotifications() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    expiresAt: ""
  });

  const [originalForm, setOriginalForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    expiresAt: ""
  });

  const [currentNotification, setCurrentNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Unsaved changes modal
  const [unsavedModal, setUnsavedModal] = useState({
    isOpen: false,
    action: null // 'navigate' or 'refresh'
  });

  /* ================= CHECK FOR UNSAVED CHANGES ================= */
  const hasUnsavedChanges = useCallback(() => {
    return (
      form.title !== originalForm.title ||
      form.message !== originalForm.message ||
      form.type !== originalForm.type ||
      form.expiresAt !== originalForm.expiresAt
    );
  }, [form, originalForm]);

  /* ================= LOAD EXISTING ================= */
  useEffect(() => {
    const loadNote = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/notifications/teacher/read");
        
        let all = [
          ...(res.data.myNotifications || []),
          ...(res.data.adminNotifications || [])
        ];

        const found = all.find(n => n._id === id);

        if (!found) {
          setError("Notification not found. It may have been deleted.");
          setLoading(false);
          return;
        }

        // Store full notification for reference
        setCurrentNotification(found);

        // Set form values
        const formData = {
          title: found.title || "",
          message: found.message || "",
          type: found.type || "GENERAL",
          expiresAt: found.expiresAt
            ? new Date(found.expiresAt).toISOString().slice(0, 16)
            : ""
        };
        
        setForm(formData);
        setOriginalForm(formData);
      } catch (err) {
        const errorMsg = err.response?.data?.message || "Failed to load notification";
        setError(errorMsg);
        toast.error("Failed to load notification", CONFIG.TOAST);
        
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
        }
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id, retryCount]);

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= HANDLE NAVIGATION WITH UNSAVED CHECK ================= */
  const handleBackClick = () => {
    if (hasUnsavedChanges()) {
      setUnsavedModal({ isOpen: true, action: 'navigate' });
    } else {
      navigate(-1);
    }
  };

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.title.trim()) {
      toast.error("Title is required", CONFIG.TOAST);
      return;
    }

    if (form.title.length > 100) {
      toast.error("Title must be less than 100 characters", CONFIG.TOAST);
      return;
    }

    if (!form.message.trim()) {
      toast.error("Message is required", CONFIG.TOAST);
      return;
    }

    if (form.message.length > 1000) {
      toast.error("Message must be less than 1000 characters", CONFIG.TOAST);
      return;
    }

    // Validate expiry date
    if (form.expiresAt && new Date(form.expiresAt) < new Date()) {
      toast.error("Expiry date cannot be in the past", CONFIG.TOAST);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.put(`/notifications/edit-note/${id}`, {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        expiresAt: form.expiresAt || null
      });

      toast.success("Notification updated successfully!", {
        ...CONFIG.TOAST,
        toastId: "notification-update-success",
      });

      // Update original form to match current (no longer unsaved)
      setOriginalForm({ ...form });

      // Navigate back after success
      setTimeout(() => {
        navigate("/teacher/notifications/list");
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update notification";
      setError(errorMsg);
      toast.error(errorMsg, CONFIG.TOAST);
    } finally {
      setSaving(false);
    }
  };

  /* ================= HANDLE UNSAVED MODAL CONFIRM ================= */
  const handleUnsavedConfirm = () => {
    if (unsavedModal.action === 'navigate') {
      navigate(-1);
    }
    setUnsavedModal({ isOpen: false, action: null });
  };

  const handleUnsavedCancel = () => {
    setUnsavedModal({ isOpen: false, action: null });
  };

  // Get notification type config
  const typeConfig = BRAND_COLORS.notificationTypes[form.type] || BRAND_COLORS.notificationTypes.GENERAL;
  const TypeIcon = typeConfig.icon;
  const priorityConfig = currentNotification?.priority
    ? BRAND_COLORS.priorities[currentNotification.priority]
    : BRAND_COLORS.priorities.NORMAL;

  /* ================= LOADING STATE ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Loading Notification..." />;
  }

  /* ================= ERROR STATE ================= */
  if (error && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)',
          padding: '2rem'
        }}
      >
        <div style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: `${BRAND_COLORS.danger.main}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: BRAND_COLORS.danger.main,
            fontSize: '3rem'
          }}>
            <FaTimesCircle />
          </div>
          <h2 style={{
            margin: '0 0 1rem 0',
            color: '#1e293b',
            fontWeight: 700,
            fontSize: '1.8rem'
          }}>
            Error Loading Notification
          </h2>
          <p style={{
            color: '#64748b',
            marginBottom: '2rem',
            fontSize: '1.1rem',
            lineHeight: 1.6
          }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                padding: '0.875rem 1.5rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              <FaArrowLeft /> Go Back
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (retryCount < 3) {
                  setRetryCount(prev => prev + 1);
                }
              }}
              disabled={retryCount >= 3}
              style={{
                backgroundColor: retryCount >= 3 ? '#cbd5e1' : BRAND_COLORS.primary.main,
                color: 'white',
                border: 'none',
                padding: '0.875rem 1.5rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: retryCount >= 3 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                opacity: retryCount >= 3 ? 0.7 : 1
              }}
            >
              <FaSyncAlt className={retryCount < 3 && retryCount > 0 ? "spinning" : ""} />
              {retryCount >= 3 ? "Max Retries" : `Retry (${retryCount}/3)`}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Fullscreen container styles
  const containerStyle = {
    minHeight: '100vh',
    background: isFullscreen
      ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
      : '#f5f7fa',
    paddingTop: isFullscreen ? '0' : '1.5rem',
    paddingBottom: isFullscreen ? '0' : '2rem',
    paddingLeft: isFullscreen ? '0' : '1rem',
    paddingRight: isFullscreen ? '0' : '1rem',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={containerStyle}
      >
        {!isFullscreen && (
          <>
            {/* ================= BREADCRUMB ================= */}
            <Breadcrumb
              items={[
                { label: "Dashboard", path: "/teacher/dashboard" },
                { label: "Notifications", path: "/teacher/notifications/list" },
                { label: "Edit Notification" },
              ]}
            />

            {/* ================= HEADER ================= */}
            <motion.div
              variants={slideDownVariants}
              initial="hidden"
              animate="visible"
              className="erp-page-header"
              style={{
                marginBottom: '2rem',
                backgroundColor: 'white',
                borderRadius: '1.5rem',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(26, 75, 109, 0.15)',
                maxWidth: '1200px',
                margin: '0 auto 2rem',
                width: 'calc(100% - 2rem)',
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
                      Edit Notification
                    </h1>
                    <p style={{
                      margin: '0.75rem 0 0 0',
                      opacity: 0.9,
                      fontSize: '1.25rem'
                    }}>
                      Update your announcement details
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsFullscreen(true)}
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
                    <FaExpand /> Full Screen Edit
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
                  You are editing notification: <strong>"{currentNotification?.title || 'Loading...'}"</strong>.
                  <span style={{ marginLeft: '0.5rem' }}>Changes will be reflected immediately for all recipients.</span>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ================= FULLSCREEN TOGGLE BAR ================= */}
        {isFullscreen && (
          <div style={{
            backgroundColor: BRAND_COLORS.primary.main,
            color: 'white',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            position: 'sticky',
            top: 0,
            zIndex: 1000
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FaBell size={24} />
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                Full Screen Edit: {currentNotification?.title || 'Notification'}
              </h1>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFullscreen(false)}
              style={{
                backgroundColor: BRAND_COLORS.danger.main,
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
              }}
            >
              <FaCompress /> Exit Full Screen
            </motion.button>
          </div>
        )}

        {/* ================= MAIN CONTENT AREA ================= */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          padding: isFullscreen ? '2rem' : '0',
          flex: 1,
          overflow: 'auto'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isFullscreen ? '2rem' : '2.5rem',
            width: '100%',
            maxWidth: isFullscreen ? '1400px' : '800px'
          }}>
            {/* ================= FORM CARD ================= */}
            <motion.div
              variants={fadeInVariants}
              custom={0}
              initial="hidden"
              animate="visible"
              className="erp-card"
              style={{
                backgroundColor: 'white',
                borderRadius: '24px',
                boxShadow: '0 15px 50px rgba(0, 0, 0, 0.12)',
                overflow: 'hidden',
                width: '100%'
              }}
            >
              <div style={{
                padding: '2rem',
                background: isFullscreen
                  ? 'linear-gradient(135deg, #0f3a4a 0%, #134952 100%)'
                  : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  backgroundColor: `${BRAND_COLORS.primary.main}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isFullscreen ? 'white' : BRAND_COLORS.primary.main,
                  fontSize: '1.75rem',
                  flexShrink: 0,
                  boxShadow: isFullscreen ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(26,75,109,0.15)'
                }}>
                  <FaBell />
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: isFullscreen ? 'white' : '#1e293b'
                }}>
                  {isFullscreen ? 'Edit Notification Details' : 'Update Notification Content'}
                </h2>
              </div>

              <div style={{ padding: '2.5rem' }}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginBottom: '1.75rem',
                      padding: '1.25rem',
                      borderRadius: '16px',
                      backgroundColor: `${BRAND_COLORS.danger.main}0a`,
                      border: `2px solid ${BRAND_COLORS.danger.main}`,
                      color: BRAND_COLORS.danger.main,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontSize: '1.05rem',
                      fontWeight: 500
                    }}
                  >
                    <FaTimesCircle size={24} />
                    <span>{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Title Field */}
                  <div className="mb-4" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label fw-semibold d-flex justify-content-between align-items-center" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontSize: '1.05rem'
                    }}>
                      <span>
                        <FaInfoCircle className="me-1" style={{ color: BRAND_COLORS.primary.main, marginRight: '0.5rem' }} />
                        Notification Title <span className="text-danger" style={{ color: BRAND_COLORS.danger.main }}>*</span>
                      </span>
                      <small className={`text-${form.title.length > 80 ? 'danger' : form.title.length > 60 ? 'warning' : 'muted'}`} style={{
                        color: form.title.length > 80 ? BRAND_COLORS.danger.main : form.title.length > 60 ? BRAND_COLORS.warning.main : '#64748b'
                      }}>
                        {form.title.length}/100 characters
                      </small>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g., Important Exam Schedule Update"
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        borderRadius: '18px',
                        border: `2px solid ${form.title.length > 100 ? BRAND_COLORS.danger.main : '#cbd5e1'}`,
                        fontSize: '1.1rem',
                        backgroundColor: 'white',
                        color: '#0f172a',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        boxSizing: 'border-box'
                      }}
                      maxLength="100"
                      required
                    />
                    <div className="form-text" style={{
                      fontSize: '0.85rem',
                      color: '#64748b',
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaInfoCircle size={12} style={{ color: BRAND_COLORS.primary.main }} />
                      Keep it concise and action-oriented.
                    </div>
                  </div>

                  {/* Message Field */}
                  <div className="mb-4" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label fw-semibold d-flex justify-content-between align-items-center" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontSize: '1.05rem'
                    }}>
                      <span>
                        <FaClipboardList className="me-1" style={{ color: BRAND_COLORS.info.main, marginRight: '0.5rem' }} />
                        Message Content <span className="text-danger" style={{ color: BRAND_COLORS.danger.main }}>*</span>
                      </span>
                      <small className={`text-${form.message.length > 800 ? 'danger' : form.message.length > 600 ? 'warning' : 'muted'}`} style={{
                        color: form.message.length > 800 ? BRAND_COLORS.danger.main : form.message.length > 600 ? BRAND_COLORS.warning.main : '#64748b'
                      }}>
                        {form.message.length}/1000 characters
                      </small>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Enter detailed notification message here..."
                      rows="8"
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        borderRadius: '18px',
                        border: `2px solid ${form.message.length > 1000 ? BRAND_COLORS.danger.main : '#cbd5e1'}`,
                        fontSize: '1.05rem',
                        lineHeight: 1.6,
                        backgroundColor: 'white',
                        color: '#0f172a',
                        fontWeight: 500,
                        resize: 'vertical',
                        minHeight: '220px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        boxSizing: 'border-box'
                      }}
                      maxLength="1000"
                      required
                    />
                    <div className="form-text" style={{
                      fontSize: '0.85rem',
                      color: '#64748b',
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaInfoCircle size={12} style={{ color: BRAND_COLORS.primary.main }} />
                      Use clear paragraphs. Include deadlines, contact info, or next steps.
                    </div>
                  </div>

                  {/* Type Field */}
                  <div className="mb-4" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label fw-semibold" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontSize: '1.05rem'
                    }}>
                      <TypeIcon style={{ color: BRAND_COLORS.primary.main, marginRight: '0.5rem' }} />
                      Notification Type
                    </label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        borderRadius: '18px',
                        border: '2px solid #cbd5e1',
                        fontSize: '1.1rem',
                        backgroundColor: 'white',
                        color: '#0f172a',
                        fontWeight: 500,
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 1.25rem center',
                        backgroundSize: '20px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        boxSizing: 'border-box'
                      }}
                    >
                      {Object.entries(BRAND_COLORS.notificationTypes).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <option key={key} value={key} style={{ padding: '0.75rem', fontSize: '1.05rem' }}>
                            {key.replace('_', ' ')} - {getNotificationDescription(key)}
                          </option>
                        );
                      })}
                    </select>
                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginTop: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      {Object.entries(BRAND_COLORS.notificationTypes).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <motion.button
                            key={key}
                            type="button"
                            whileHover={{ scale: 1.07 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setForm(prev => ({ ...prev, type: key }))}
                            style={{
                              padding: '0.75rem 1.25rem',
                              borderRadius: '12px',
                              backgroundColor: form.type === key ? config.bg : '#f8fafc',
                              border: `2px solid ${form.type === key ? config.color : '#e2e8f0'}`,
                              color: form.type === key ? config.color : '#4a5568',
                              fontWeight: form.type === key ? 700 : 500,
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.25s ease',
                              boxShadow: form.type === key ? `0 4px 12px ${config.color}25` : 'none'
                            }}
                          >
                            <Icon size={18} />
                            <span>{key.replace('_', ' ')}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expiry Field */}
                  <div className="mb-4" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label fw-semibold" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontSize: '1.05rem'
                    }}>
                      <FaCalendarAlt style={{ color: BRAND_COLORS.primary.main, marginRight: '0.5rem' }} />
                      Expiry Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      name="expiresAt"
                      value={form.expiresAt}
                      onChange={handleChange}
                      min={new Date().toISOString().slice(0, 16)}
                      style={{
                        width: '100%',
                        padding: '1rem 1.5rem',
                        borderRadius: '18px',
                        border: '2px solid #cbd5e1',
                        fontSize: '1.1rem',
                        backgroundColor: 'white',
                        color: '#0f172a',
                        fontWeight: 500,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        boxSizing: 'border-box'
                      }}
                    />
                    {form.expiresAt && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        backgroundColor: '#dcfce7',
                        border: `1px solid #86efac`,
                        color: '#166534',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <FaCheckCircle size={20} />
                        <div>
                          <div>Set to expire on:</div>
                          <div style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: '0.25rem' }}>
                            {new Date(form.expiresAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="form-text" style={{
                      fontSize: '0.85rem',
                      color: '#64748b',
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaInfoCircle size={12} style={{ color: BRAND_COLORS.primary.main }} />
                      Notification will be hidden after this date. Leave blank for no expiry.
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1.25rem',
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '2px solid #f1f5f9'
                  }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleBackClick}
                      disabled={saving}
                      style={{
                        padding: '1.125rem 1.5rem',
                        borderRadius: '18px',
                        border: '2px solid #e2e8f0',
                        backgroundColor: 'white',
                        color: '#1e293b',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.875rem',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}
                    >
                      <FaArrowLeft /> Cancel
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={saving || !form.title.trim() || !form.message.trim()}
                      style={{
                        padding: '1.125rem 1.5rem',
                        borderRadius: '18px',
                        border: 'none',
                        backgroundColor: (saving || !form.title.trim() || !form.message.trim()) ? '#cbd5e1' : BRAND_COLORS.primary.main,
                        color: 'white',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        cursor: (saving || !form.title.trim() || !form.message.trim()) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.875rem',
                        transition: 'all 0.3s ease',
                        boxShadow: (saving || !form.title.trim() || !form.message.trim()) ? 'none' : '0 8px 25px rgba(26, 75, 109, 0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {saving ? (
                        <>
                          <motion.span variants={spinVariants} animate="animate" className="spinner-border spinner-border-sm" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <FaSave /> Update Notification
                        </>
                      )}
                    </motion.button>
                  </div>

                  <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    backgroundColor: '#fffbeb',
                    border: '2px solid #f59e0b',
                    fontSize: '1.1rem',
                    color: '#92400e',
                    lineHeight: 1.7,
                    fontWeight: 500
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <FaExclamationTriangle style={{
                        marginTop: '0.25rem',
                        color: BRAND_COLORS.warning.main,
                        flexShrink: 0,
                        fontSize: '1.5rem'
                      }} />
                      <div>
                        <strong style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.5rem' }}>
                          Important Update Notice:
                        </strong>
                        <span>This update will be visible to all recipients immediately after saving. Please review all changes carefully before submitting.</span>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ================= FOOTER (NON-FULLSCREEN ONLY) ================= */}
        {!isFullscreen && (
          <div style={{
            maxWidth: '1200px',
            margin: '2rem auto 0',
            padding: '0 1rem',
            width: '100%',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.95rem'
          }}>
            <p style={{ margin: 0 }}>
              © {new Date().getFullYear()} NOVAA Attendance Management System • Professional Notification Editor
            </p>
          </div>
        )}
      </motion.div>

      {/* ================= UNSAVED CHANGES MODAL ================= */}
      <ConfirmModal
        isOpen={unsavedModal.isOpen}
        onClose={handleUnsavedCancel}
        onConfirm={handleUnsavedConfirm}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        type="warning"
        confirmText="Discard Changes"
        cancelText="Continue Editing"
        isLoading={false}
      />

      <style>{`
        .spinner-border {
          display: inline-block;
          width: 1em;
          height: 1em;
          border: 0.15em solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner-border 0.75s linear infinite;
        }

        @keyframes spinner-border {
          to { transform: rotate(360deg); }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </AnimatePresence>
  );
}

/* ================= HELPER FUNCTION ================= */
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
