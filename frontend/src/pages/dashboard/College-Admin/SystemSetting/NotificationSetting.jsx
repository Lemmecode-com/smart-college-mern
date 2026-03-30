import React, { useState } from "react";
import {
  FaBell,
  FaEnvelope,
  FaSms,
  FaMobileAlt,
  FaSave,
  FaUndo,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFlask,
  FaRocket,
  FaCog,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaChartBar,
  FaClipboardCheck,
  FaUmbrellaBeach,
} from "react-icons/fa";

const NotificationSetting = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState("email");

  const [formData, setFormData] = useState({
    // Channels
    emailNotifications: "enabled",
    smsNotifications: "enabled",
    inAppNotifications: "enabled",
    pushNotifications: "disabled",

    // Rules
    attendanceAlerts: "daily",
    feeDueReminders: "enabled",
    examNotifications: "enabled",
    timetableUpdates: "enabled",
    eventNotifications: "disabled",
    holidayAnnouncements: "enabled",

    // Email Settings
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpEmail: "",
    smtpPassword: "",

    // SMS Settings
    smsProvider: "twilio",
    smsApiKey: "",
    smsSenderId: "COLLEGE",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsModified(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsModified(false);
    }, 1500);
  };

  const handleReset = () => {
    setFormData({
      emailNotifications: "enabled",
      smsNotifications: "enabled",
      inAppNotifications: "enabled",
      pushNotifications: "disabled",
      attendanceAlerts: "daily",
      feeDueReminders: "enabled",
      examNotifications: "enabled",
      timetableUpdates: "enabled",
      eventNotifications: "disabled",
      holidayAnnouncements: "enabled",
      smtpHost: "smtp.gmail.com",
      smtpPort: "587",
      smtpEmail: "",
      smtpPassword: "",
      smsProvider: "twilio",
      smsApiKey: "",
      smsSenderId: "COLLEGE",
    });
    setIsModified(false);
  };

  const toggleSetting = (name, currentValue) => {
    const newValue = currentValue === "enabled" ? "disabled" : "enabled";
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
    setIsModified(true);
  };

  return (
    <>
      <style>{`
        /* Notification Settings - Enterprise SaaS Professional UI */
        :root {
          --ns-teal-dark: #0f3a4a;
          --ns-teal-medium: #0c2d3a;
          --ns-cyan-primary: #3db5e6;
          --ns-cyan-light: #4fc3f7;
          --ns-cyan-glow: rgba(61, 181, 230, 0.15);
          --ns-bg-primary: #f5f7fb;
          --ns-bg-card: #ffffff;
          --ns-bg-hover: #f8fafc;
          --ns-text-primary: #1a202c;
          --ns-text-secondary: #4a5568;
          --ns-text-muted: #718096;
          --ns-success: #38a169;
          --ns-warning: #ed8936;
          --ns-danger: #e53e3e;
          --ns-purple: #805ad5;
          --ns-pink: #ec4899;
          --ns-radius-md: 0.5rem;
          --ns-radius-lg: 0.75rem;
          --ns-radius-xl: 1rem;
          --ns-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --ns-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
          --ns-transition-base: 0.25s ease;
          --ns-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .notification-settings-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Settings Header */
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, var(--ns-teal-dark) 0%, var(--ns-teal-medium) 100%);
          border-radius: var(--ns-radius-xl);
          box-shadow: var(--ns-shadow-lg);
          position: relative;
          overflow: hidden;
        }

        .settings-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 400px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(61, 181, 230, 0.1));
          pointer-events: none;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .header-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: var(--ns-radius-lg);
          background: linear-gradient(135deg, var(--ns-cyan-primary), var(--ns-cyan-light));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.4);
        }

        .header-icon {
          font-size: 1.5rem;
          color: #ffffff;
          animation: ring 2s ease-in-out infinite;
        }

        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(-10deg); }
          20%, 40% { transform: rotate(10deg); }
          50% { transform: rotate(0deg); }
        }

        .header-text {
          color: #ffffff;
        }

        .settings-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .settings-subtitle {
          font-size: 0.9375rem;
          margin: 0.25rem 0 0 0;
          opacity: 0.85;
          font-weight: 400;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          position: relative;
          z-index: 1;
        }

        .btn-reset,
        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--ns-radius-md);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--ns-transition-base);
          border: none;
          outline: none;
        }

        .btn-reset {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          backdrop-filter: blur(10px);
        }

        .btn-reset:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        .btn-save {
          background: linear-gradient(135deg, var(--ns-cyan-primary), var(--ns-cyan-light));
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
        }

        .btn-save:hover:not(:disabled) {
          box-shadow: 0 6px 25px rgba(61, 181, 230, 0.5);
          transform: translateY(-2px);
        }

        .btn-save-modified {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
          }
          50% {
            box-shadow: 0 4px 25px rgba(61, 181, 230, 0.6);
          }
        }

        .btn-reset:disabled,
        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-icon {
          font-size: 1rem;
        }

        .spinner-icon {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Info Card */
        .info-card {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05), rgba(79, 195, 247, 0.05));
          border: 1px solid rgba(61, 181, 230, 0.2);
          border-radius: var(--ns-radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .info-card-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--ns-radius-md);
          background: linear-gradient(135deg, var(--ns-cyan-primary), var(--ns-cyan-light));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .info-card-content h6 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ns-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .info-card-content ul {
          margin: 0;
          padding-left: 1.25rem;
          color: var(--ns-text-secondary);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        /* Main Grid */
        .settings-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        /* Cards */
        .settings-card {
          background: var(--ns-bg-card);
          border-radius: var(--ns-radius-xl);
          box-shadow: var(--ns-shadow-md);
          overflow: hidden;
          transition: all var(--ns-transition-slow);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .settings-card:hover {
          box-shadow: var(--ns-shadow-lg);
        }

        .card-header-custom {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, var(--ns-teal-dark), var(--ns-teal-medium));
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-header-custom h5 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .card-icon {
          font-size: 1.25rem;
          opacity: 0.9;
        }

        .card-body-custom {
          padding: 1.5rem;
        }

        /* Channel Cards Grid */
        .channels-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .channel-card {
          background: var(--ns-bg-hover);
          border: 2px solid #e2e8f0;
          border-radius: var(--ns-radius-lg);
          padding: 1.25rem;
          transition: all var(--ns-transition-base);
          cursor: pointer;
        }

        .channel-card:hover {
          border-color: var(--ns-cyan-primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.15);
        }

        .channel-card.enabled {
          background: linear-gradient(135deg, rgba(56, 161, 105, 0.05), rgba(104, 211, 145, 0.05));
          border-color: var(--ns-success);
        }

        .channel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .channel-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--ns-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .channel-icon-wrapper.email {
          background: linear-gradient(135deg, #63b3ed, #3182ce);
          color: #ffffff;
        }

        .channel-icon-wrapper.sms {
          background: linear-gradient(135deg, #f6ad55, #ed8936);
          color: #ffffff;
        }

        .channel-icon-wrapper.inapp {
          background: linear-gradient(135deg, #f687b3, #d53f8c);
          color: #ffffff;
        }

        .channel-icon-wrapper.push {
          background: linear-gradient(135deg, #9f7aea, #805ad5);
          color: #ffffff;
        }

        .channel-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ns-text-primary);
          margin: 0;
        }

        .channel-status {
          font-size: 0.75rem;
          padding: 0.25rem 0.625rem;
          border-radius: var(--ns-radius-md);
          font-weight: 600;
          text-transform: uppercase;
        }

        .channel-status.enabled {
          background: rgba(56, 161, 105, 0.2);
          color: var(--ns-success);
        }

        .channel-status.disabled {
          background: rgba(113, 128, 150, 0.2);
          color: var(--ns-text-muted);
        }

        .channel-description {
          font-size: 0.8125rem;
          color: var(--ns-text-muted);
          margin: 0;
        }

        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          width: 52px;
          height: 28px;
          background: #cbd5e0;
          border-radius: 14px;
          cursor: pointer;
          transition: background var(--ns-transition-base);
        }

        .toggle-switch.enabled {
          background: linear-gradient(135deg, var(--ns-success), #68d391);
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform var(--ns-transition-base);
        }

        .toggle-switch.enabled::after {
          transform: translateX(24px);
        }

        /* Notification Rules */
        .rules-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rule-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: var(--ns-bg-hover);
          border-radius: var(--ns-radius-lg);
          border: 1px solid #e2e8f0;
          transition: all var(--ns-transition-base);
        }

        .rule-item:hover {
          border-color: var(--ns-cyan-primary);
          background: #f8fafc;
        }

        .rule-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .rule-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--ns-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.125rem;
        }

        .rule-icon.attendance {
          background: linear-gradient(135deg, #68d391, #38a169);
          color: #ffffff;
        }

        .rule-icon.fee {
          background: linear-gradient(135deg, #f6ad55, #ed8936);
          color: #ffffff;
        }

        .rule-icon.exam {
          background: linear-gradient(135deg, #f687b3, #d53f8c);
          color: #ffffff;
        }

        .rule-icon.timetable {
          background: linear-gradient(135deg, #63b3ed, #3182ce);
          color: #ffffff;
        }

        .rule-icon.event {
          background: linear-gradient(135deg, #9f7aea, #805ad5);
          color: #ffffff;
        }

        .rule-icon.holiday {
          background: linear-gradient(135deg, #fc8181, #e53e3e);
          color: #ffffff;
        }

        .rule-text {
          flex: 1;
        }

        .rule-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--ns-text-primary);
          margin: 0 0 0.125rem 0;
        }

        .rule-description {
          font-size: 0.75rem;
          color: var(--ns-text-muted);
          margin: 0;
        }

        .rule-select {
          min-width: 140px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 2px solid #e2e8f0;
          border-radius: var(--ns-radius-md);
          background: #ffffff;
          cursor: pointer;
          transition: all var(--ns-transition-base);
        }

        .rule-select:hover {
          border-color: #cbd5e0;
        }

        .rule-select:focus {
          border-color: var(--ns-cyan-primary);
          outline: none;
          box-shadow: 0 0 0 3px var(--ns-cyan-glow);
        }

        /* Sidebar */
        .sidebar-card {
          background: var(--ns-bg-card);
          border-radius: var(--ns-radius-xl);
          box-shadow: var(--ns-shadow-md);
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .sidebar-header {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e2e8f0;
        }

        .sidebar-header h6 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--ns-text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sidebar-body {
          padding: 1.25rem;
        }

        /* Test Tabs */
        .test-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .test-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.625rem;
          background: var(--ns-bg-hover);
          border: 2px solid #e2e8f0;
          border-radius: var(--ns-radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--ns-text-secondary);
          cursor: pointer;
          transition: all var(--ns-transition-base);
        }

        .test-tab:hover {
          border-color: var(--ns-cyan-primary);
        }

        .test-tab.active {
          background: linear-gradient(135deg, var(--ns-cyan-primary), var(--ns-cyan-light));
          border-color: var(--ns-cyan-primary);
          color: #ffffff;
        }

        .test-preview {
          background: var(--ns-bg-hover);
          border-radius: var(--ns-radius-lg);
          padding: 1.25rem;
          text-align: center;
        }

        .test-preview-icon {
          font-size: 3rem;
          margin-bottom: 0.75rem;
        }

        .test-preview-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ns-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .test-preview-text {
          font-size: 0.875rem;
          color: var(--ns-text-muted);
          margin: 0;
        }

        .btn-test {
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, var(--ns-cyan-primary), var(--ns-cyan-light));
          color: #ffffff;
          border: none;
          border-radius: var(--ns-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--ns-transition-base);
        }

        .btn-test:hover {
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.35);
          transform: translateY(-1px);
        }

        /* Stats */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .stat-item {
          background: var(--ns-bg-hover);
          padding: 1rem;
          border-radius: var(--ns-radius-md);
          text-align: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ns-cyan-primary);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--ns-text-muted);
          margin-top: 0.25rem;
          font-weight: 500;
        }

        /* Modified Indicator */
        .modified-indicator {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--ns-teal-dark), var(--ns-teal-medium));
          color: #ffffff;
          border-radius: var(--ns-radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s var(--ns-transition-slow) forwards;
          z-index: 1000;
        }

        @keyframes slideUp {
          to {
            transform: translateX(-50%) translateY(0);
          }
        }

        .indicator-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .indicator-icon {
          color: var(--ns-cyan-light);
          font-size: 1.125rem;
        }

        .btn-save-small {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: linear-gradient(135deg, var(--ns-cyan-primary), var(--ns-cyan-light));
          color: #ffffff;
          border: none;
          border-radius: var(--ns-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--ns-transition-base);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .btn-save-small:hover {
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.5);
          transform: translateY(-1px);
        }

        .btn-icon-small {
          font-size: 0.875rem;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
          
          .channels-grid {
            grid-template-columns: 1fr;
          }
          
          .settings-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }

        @media (max-width: 768px) {
          .notification-settings-page {
            padding: 0.75rem;
          }
          
          .settings-title {
            font-size: 1.5rem;
          }
          
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-actions {
            flex-direction: column;
          }
          
          .btn-reset,
          .btn-save {
            width: 100%;
            justify-content: center;
          }
          
          .rule-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .rule-select {
            width: 100%;
          }
          
          .modified-indicator {
            left: 0.75rem;
            right: 0.75rem;
            transform: none;
            bottom: 0.75rem;
            flex-direction: column;
            text-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }

        .rule-select:focus,
        .btn-test:focus,
        .btn-save-small:focus {
          outline: 2px solid var(--ns-cyan-primary);
          outline-offset: 2px;
        }
      `}</style>

      <div className="notification-settings-page">
        {/* ================= PAGE HEADER ================= */}
        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <FaBell className="header-icon" />
            </div>
            <div className="header-text">
              <h2 className="settings-title">Notification Settings</h2>
              <p className="settings-subtitle">
                Control how system notifications are sent to students, teachers,
                and staff
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-reset"
              onClick={handleReset}
              disabled={isSaving || !isModified}
            >
              <FaUndo className="btn-icon" />
              <span>Reset</span>
            </button>
            <button
              className={`btn-save ${isModified ? "btn-save-modified" : ""}`}
              onClick={handleSave}
              disabled={isSaving || !isModified}
            >
              {isSaving ? (
                <>
                  <span className="spinner-icon" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaSave className="btn-icon" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= INFO CARD ================= */}
        <div className="info-card">
          <div className="info-card-icon">
            <FaInfoCircle />
          </div>
          <div className="info-card-content">
            <h6>Notification Configuration</h6>
            <ul>
              <li>
                Enable/disable notification channels (Email, SMS, In-App, Push)
              </li>
              <li>Configure notification rules for different events</li>
              <li>Test notifications before enabling for all users</li>
              <li>
                Recipients only get notifications through enabled channels
              </li>
            </ul>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="settings-grid">
          {/* LEFT - Main Configuration */}
          <div className="settings-card">
            <div className="card-header-custom">
              <FaCog className="card-icon" />
              <h5>Notification Channels</h5>
            </div>
            <div className="card-body-custom">
              <div className="channels-grid">
                {/* Email */}
                <div
                  className={`channel-card ${formData.emailNotifications === "enabled" ? "enabled" : ""}`}
                  onClick={() =>
                    toggleSetting(
                      "emailNotifications",
                      formData.emailNotifications,
                    )
                  }
                >
                  <div className="channel-header">
                    <div className="channel-icon-wrapper email">
                      <FaEnvelope />
                    </div>
                    <div
                      className={`channel-status ${formData.emailNotifications}`}
                    >
                      {formData.emailNotifications === "enabled"
                        ? "✓ Enabled"
                        : "✕ Disabled"}
                    </div>
                  </div>
                  <h6 className="channel-name">Email Notifications</h6>
                  <p className="channel-description">
                    Send notifications via email to all users
                  </p>
                </div>

                {/* SMS */}
                <div
                  className={`channel-card ${formData.smsNotifications === "enabled" ? "enabled" : ""}`}
                  onClick={() =>
                    toggleSetting("smsNotifications", formData.smsNotifications)
                  }
                >
                  <div className="channel-header">
                    <div className="channel-icon-wrapper sms">
                      <FaSms />
                    </div>
                    <div
                      className={`channel-status ${formData.smsNotifications}`}
                    >
                      {formData.smsNotifications === "enabled"
                        ? "✓ Enabled"
                        : "✕ Disabled"}
                    </div>
                  </div>
                  <h6 className="channel-name">SMS Notifications</h6>
                  <p className="channel-description">
                    Send text messages for urgent alerts
                  </p>
                </div>

                {/* In-App */}
                <div
                  className={`channel-card ${formData.inAppNotifications === "enabled" ? "enabled" : ""}`}
                  onClick={() =>
                    toggleSetting(
                      "inAppNotifications",
                      formData.inAppNotifications,
                    )
                  }
                >
                  <div className="channel-header">
                    <div className="channel-icon-wrapper inapp">
                      <FaMobileAlt />
                    </div>
                    <div
                      className={`channel-status ${formData.inAppNotifications}`}
                    >
                      {formData.inAppNotifications === "enabled"
                        ? "✓ Enabled"
                        : "✕ Disabled"}
                    </div>
                  </div>
                  <h6 className="channel-name">In-App Notifications</h6>
                  <p className="channel-description">
                    Show notifications inside the application
                  </p>
                </div>

                {/* Push */}
                <div
                  className={`channel-card ${formData.pushNotifications === "enabled" ? "enabled" : ""}`}
                  onClick={() =>
                    toggleSetting(
                      "pushNotifications",
                      formData.pushNotifications,
                    )
                  }
                >
                  <div className="channel-header">
                    <div className="channel-icon-wrapper push">
                      <FaBell />
                    </div>
                    <div
                      className={`channel-status ${formData.pushNotifications}`}
                    >
                      {formData.pushNotifications === "enabled"
                        ? "✓ Enabled"
                        : "✕ Disabled"}
                    </div>
                  </div>
                  <h6 className="channel-name">Push Notifications</h6>
                  <p className="channel-description">
                    Browser/mobile push notifications
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT - Sidebar */}
          <div>
            {/* Test Notification */}
            <div className="sidebar-card">
              <div className="sidebar-header">
                <h6>
                  <FaFlask />
                  Test Notifications
                </h6>
              </div>
              <div className="sidebar-body">
                <div className="test-tabs">
                  <div
                    className={`test-tab ${activeTestTab === "email" ? "active" : ""}`}
                    onClick={() => setActiveTestTab("email")}
                  >
                    <FaEnvelope />
                    Email
                  </div>
                  <div
                    className={`test-tab ${activeTestTab === "sms" ? "active" : ""}`}
                    onClick={() => setActiveTestTab("sms")}
                  >
                    <FaSms />
                    SMS
                  </div>
                </div>

                <div className="test-preview">
                  <div
                    className="test-preview-icon"
                    style={{
                      background:
                        activeTestTab === "email"
                          ? "linear-gradient(135deg, #63b3ed, #3182ce)"
                          : "linear-gradient(135deg, #f6ad55, #ed8936)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {activeTestTab === "email" ? <FaEnvelope /> : <FaSms />}
                  </div>
                  <h6 className="test-preview-title">
                    Send Test {activeTestTab === "email" ? "Email" : "SMS"}
                  </h6>
                  <p className="test-preview-text">
                    {activeTestTab === "email"
                      ? "A test email will be sent to the admin email address"
                      : "A test SMS will be sent to the admin phone number"}
                  </p>
                  <button className="btn-test">
                    <FaRocket className="me-2" />
                    Send Test
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="sidebar-card">
              <div className="sidebar-header">
                <h6>
                  <FaChartBar />
                  Quick Stats
                </h6>
              </div>
              <div className="sidebar-body">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">4</div>
                    <div className="stat-label">Channels</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {
                        Object.values(formData).filter((v) => v === "enabled")
                          .length
                      }
                    </div>
                    <div className="stat-label">Enabled</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">6</div>
                    <div className="stat-label">Rules</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">24/7</div>
                    <div className="stat-label">Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= NOTIFICATION RULES ================= */}
        <div className="settings-card" style={{ marginTop: "1.5rem" }}>
          <div className="card-header-custom">
            <FaBell className="card-icon" />
            <h5>Notification Rules</h5>
          </div>
          <div className="card-body-custom">
            <div className="rules-list">
              {/* Attendance Alerts */}
              <div className="rule-item">
                <div className="rule-content">
                  <div className="rule-icon attendance">
                    <FaClipboardCheck />
                  </div>
                  <div className="rule-text">
                    <h6 className="rule-name">Attendance Alerts</h6>
                    <p className="rule-description">
                      Notify students/parents about low attendance
                    </p>
                  </div>
                </div>
                <select
                  name="attendanceAlerts"
                  value={formData.attendanceAlerts}
                  onChange={handleChange}
                  className="rule-select"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Fee Due Reminders */}
              <div className="rule-item">
                <div className="rule-content">
                  <div className="rule-icon fee">
                    <FaMoneyBillWave />
                  </div>
                  <div className="rule-text">
                    <h6 className="rule-name">Fee Due Reminders</h6>
                    <p className="rule-description">
                      Send payment reminders to students
                    </p>
                  </div>
                </div>
                <select
                  name="feeDueReminders"
                  value={formData.feeDueReminders}
                  onChange={handleChange}
                  className="rule-select"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Exam Notifications */}
              <div className="rule-item">
                <div className="rule-content">
                  <div className="rule-icon exam">
                    <FaUserGraduate />
                  </div>
                  <div className="rule-text">
                    <h6 className="rule-name">Exam Notifications</h6>
                    <p className="rule-description">
                      Exam schedules and result announcements
                    </p>
                  </div>
                </div>
                <select
                  name="examNotifications"
                  value={formData.examNotifications}
                  onChange={handleChange}
                  className="rule-select"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Timetable Updates */}
              <div className="rule-item">
                <div className="rule-content">
                  <div className="rule-icon timetable">
                    <FaCalendarAlt />
                  </div>
                  <div className="rule-text">
                    <h6 className="rule-name">Timetable Updates</h6>
                    <p className="rule-description">
                      Notify about schedule changes
                    </p>
                  </div>
                </div>
                <select
                  name="timetableUpdates"
                  value={formData.timetableUpdates}
                  onChange={handleChange}
                  className="rule-select"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Event Notifications */}
              <div className="rule-item">
                <div className="rule-content">
                  <div className="rule-icon event">
                    <FaChalkboardTeacher />
                  </div>
                  <div className="rule-text">
                    <h6 className="rule-name">Event Notifications</h6>
                    <p className="rule-description">
                      College events and announcements
                    </p>
                  </div>
                </div>
                <select
                  name="eventNotifications"
                  value={formData.eventNotifications}
                  onChange={handleChange}
                  className="rule-select"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Holiday Announcements */}
              <div className="rule-item">
                <div className="rule-content">
                  <div className="rule-icon holiday">
                    <FaUmbrellaBeach />
                  </div>
                  <div className="rule-text">
                    <h6 className="rule-name">Holiday Announcements</h6>
                    <p className="rule-description">
                      Holiday and break notifications
                    </p>
                  </div>
                </div>
                <select
                  name="holidayAnnouncements"
                  value={formData.holidayAnnouncements}
                  onChange={handleChange}
                  className="rule-select"
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MODIFIED INDICATOR ================= */}
        {isModified && (
          <div className="modified-indicator">
            <div className="indicator-content">
              <FaInfoCircle className="indicator-icon" />
              <span>You have unsaved changes</span>
            </div>
            <button className="btn-save-small" onClick={handleSave}>
              <FaSave className="btn-icon-small" />
              <span>Save Now</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationSetting;
