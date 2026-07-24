import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { toast } from "react-toastify";
import { logger } from "../../../../utils/logger";
import ApiError from "../../../../components/ApiError";
import {
  FaEnvelope,
  FaArrowLeft,
  FaSave,
  FaCheckCircle,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaServer,
  FaInfoCircle,
  FaSpinner,
  FaToggleOn,
  FaToggleOff,
  FaPaperPlane,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is required for email configuration");
}

const EmailConfigurations = () => {
  const navigate = useNavigate();

  const AUTH_ERROR_CODES = new Set([
    "TOKEN_MISSING",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "TOKEN_BLACKLISTED",
    "TOKEN_INVALIDATED",
    "USER_NOT_FOUND",
    "ACCOUNT_DEACTIVATED",
    "UNAUTHORIZED",
  ]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [config, setConfig] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [fromEmailTouched, setFromEmailTouched] = useState(false);
  const [hostError, setHostError] = useState("");
  const [portError, setPortError] = useState("");
  const [userError, setUserError] = useState("");
  const [passError, setPassError] = useState("");
  const [nameError, setNameError] = useState("");
  const [testEmailError, setTestEmailError] = useState("");
  const [testEmailTouched, setTestEmailTouched] = useState(false);

  const [formData, setFormData] = useState({
    smtp: {
      host: "",
      port: 587,
      secure: false,
    },
    credentials: {
      user: "",
      pass: "",
    },
    fromName: "",
    fromEmail: "",
  });

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/email/config");

      if (response.data.configured && response.data.config) {
        setConfig(response.data.config);
        setIsConfigured(true);
        setFormData({
          smtp: {
            host: response.data.config.smtp?.host || "",
            port: response.data.config.smtp?.port || 587,
            secure: response.data.config.smtp?.secure || false,
          },
          credentials: {
            user: response.data.config.credentials?.user || "",
            pass: "",
          },
          fromName: response.data.config.fromName || "",
          fromEmail: response.data.config.fromEmail || "",
        });
      } else {
        setConfig(null);
        setIsConfigured(false);
        setFormData({
          smtp: { host: "", port: 587, secure: false },
          credentials: { user: "", pass: "" },
          fromName: "",
          fromEmail: "",
        });
      }
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Error fetching config:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        setPageError({ statusCode, errorCode });
        return;
      }
      if (statusCode !== 404) {
        toast.error(error.response?.data?.message || "Failed to load configuration");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith("smtp.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        smtp: { ...prev.smtp, [field]: type === "checkbox" ? checked : value },
      }));
      if (field === "host" && hostError) setHostError("");
      if (field === "port" && portError) setPortError("");
    } else if (name.startsWith("credentials.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        credentials: { ...prev.credentials, [field]: value },
      }));
      if (field === "user" && userError) setUserError("");
      if (field === "pass" && passError) setPassError("");
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (name === "fromName" && nameError) setNameError("");
      if (name === "fromEmail" && emailError) setEmailError("");
    }
    setIsModified(true);
  };

  const validateFromEmail = (email) => {
    if (!email || !email.trim()) {
      return "From email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const validateTestEmail = (email) => {
    if (!email || !email.trim()) {
      return "";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return "Please enter a valid test email address";
    }
    return "";
  };

  const validateSmtpHost = (host) => {
    if (!host || !host.trim()) {
      return "SMTP host is required";
    }
    if (host.trim().length < 3 || host.trim().length > 255) {
      return "SMTP host must be between 3 and 255 characters";
    }
    return "";
  };

  const validateSmtpPort = (port) => {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return "SMTP port must be a number between 1 and 65535";
    }
    return "";
  };

  const validateCredentialsUser = (user) => {
    if (!user || !user.trim()) {
      return "SMTP username/email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.trim())) {
      return "SMTP username must be a valid email address";
    }
    return "";
  };

  const validateCredentialsPass = (pass) => {
    if (!pass || !pass.trim()) {
      if (!isConfigured || !config?.hasPassword) {
        return "SMTP password is required";
      }
      return "";
    }
    if (pass.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return "";
  };

  const validateFromName = (name) => {
    if (!name || !name.trim()) {
      return "From name is required";
    }
    if (name.trim().length < 2 || name.trim().length > 100) {
      return "From name must be between 2 and 100 characters";
    }
    return "";
  };

  const handleFromEmailBlur = () => {
    setFromEmailTouched(true);
    const error = validateFromEmail(formData.fromEmail);
    setEmailError(error);
  };

  const handleHostBlur = () => {
    const error = validateSmtpHost(formData.smtp.host);
    setHostError(error);
  };

  const handlePortBlur = () => {
    const error = validateSmtpPort(formData.smtp.port);
    setPortError(error);
  };

  const handleUserBlur = () => {
    const error = validateCredentialsUser(formData.credentials.user);
    setUserError(error);
  };

  const handlePassBlur = () => {
    const error = validateCredentialsPass(formData.credentials.pass);
    setPassError(error);
  };

  const handleNameBlur = () => {
    const error = validateFromName(formData.fromName);
    setNameError(error);
  };

  const handleTestEmailBlur = () => {
    setTestEmailTouched(true);
    const error = validateTestEmail(testEmail);
    setTestEmailError(error);
  };

  const validateForm = () => {
    const { smtp, credentials, fromName, fromEmail } = formData;
    
    const hostErr = validateSmtpHost(smtp.host);
    const portErr = validateSmtpPort(smtp.port);
    const userErr = validateCredentialsUser(credentials.user);
    const passErr = validateCredentialsPass(credentials.pass);
    const nameErr = validateFromName(fromName);
    const emailErr = validateFromEmail(fromEmail);

    setHostError(hostErr);
    setPortError(portErr);
    setUserError(userErr);
    setPassError(passErr);
    setNameError(nameErr);
    setEmailError(emailErr);
    setFromEmailTouched(true);

    const errors = [hostErr, portErr, userErr, passErr, nameErr, emailErr].filter(Boolean);
    if (errors.length > 0) {
      toast.error(errors[0]);
      const fieldMap = [
        { error: hostErr, id: "smtp-host" },
        { error: portErr, id: "smtp-port" },
        { error: userErr, id: "credentials-user" },
        { error: passErr, id: "credentials-pass" },
        { error: nameErr, id: "from-name" },
        { error: emailErr, id: "from-email" },
      ];
      const firstInvalid = fieldMap.find((f) => f.error);
      if (firstInvalid) {
        const el = document.getElementById(firstInvalid.id);
        if (el) el.focus();
      }
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const response = await api.post("/admin/email/config", formData);

      toast.success(response.data.message || "Email configuration saved successfully!");
      fetchEmailConfig();
      setIsModified(false);
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Error saving config:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(error.response?.data?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    const testEmailErr = validateTestEmail(testEmail);
    setTestEmailError(testEmailErr);
    setTestEmailTouched(true);

    if (testEmailErr) {
      toast.error(testEmailErr);
      const el = document.getElementById("test-email");
      if (el) el.focus();
      return;
    }

    try {
      setVerifying(true);
      const response = await api.post("/admin/email/verify", {
        ...formData,
        testEmail,
      });

      if (response.data.verified) {
        toast.success(response.data.message || "Email configuration verified successfully!");
      } else {
        toast.warning(response.data.message || "Verification failed");
      }
      fetchEmailConfig();
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Error verifying config:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(error.response?.data?.message || "Failed to verify configuration");
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this configuration? Emails will be sent from the platform email.")) {
      return;
    }

    try {
      await api.delete("/admin/email/config");
      toast.success("Email configuration deleted successfully");
      setConfig(null);
      setIsConfigured(false);
      setFormData({
        smtp: { host: "", port: 587, secure: false },
        credentials: { user: "", pass: "" },
        fromName: "",
        fromEmail: "",
      });
      setIsModified(false);
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Error deleting config:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(error.response?.data?.message || "Failed to delete configuration");
    }
  };

  if (pageError) {
    return (
      <ApiError
        statusCode={pageError.statusCode}
        errorCode={pageError.errorCode}
        onRetry={fetchEmailConfig}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <FaSpinner className="loading-spinner" />
          <p className="loading-text">Loading Email Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root {
          --sc-teal-dark: #0f3a4a;
          --sc-teal-medium: #0c2d3a;
          --sc-cyan-primary: #3db5e6;
          --sc-cyan-light: #4fc3f7;
          --sc-bg-primary: #f5f7fb;
          --sc-bg-card: #ffffff;
          --sc-text-primary: #1a202c;
          --sc-text-secondary: #4a5568;
          --sc-text-muted: #718096;
          --sc-success: #38a169;
          --sc-warning: #ed8936;
          --sc-danger: #e53e3e;
          --sc-email-teal: #0d9488;
          --sc-radius-md: 0.5rem;
          --sc-radius-lg: 0.75rem;
          --sc-radius-xl: 1rem;
          --sc-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --sc-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
        }

        .email-settings-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .loading-container {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
        }

        .loading-content { text-align: center; }

        .loading-spinner {
          font-size: 3rem;
          color: var(--sc-cyan-primary);
          animation: spin 1s linear infinite;
        }

        .loading-text {
          margin-top: 1rem;
          font-size: 1rem;
          color: var(--sc-text-muted);
          font-weight: 500;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, var(--sc-email-teal) 0%, #115e59 100%);
          border-radius: var(--sc-radius-xl);
          box-shadow: var(--sc-shadow-lg);
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
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1));
          pointer-events: none;
        }

        .header-content { position: relative; z-index: 1; }

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: var(--sc-radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          margin-bottom: 0.75rem;
        }

        .btn-back:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateX(-2px);
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.25rem 0;
        }

        .header-subtitle {
          font-size: 0.9375rem;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: var(--sc-radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .info-card {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.05), rgba(20, 184, 166, 0.05));
          border: 1px solid rgba(13, 148, 136, 0.2);
          border-radius: var(--sc-radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .info-card-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--sc-radius-md);
          background: linear-gradient(135deg, var(--sc-email-teal), var(--sc-cyan-primary));
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
          color: var(--sc-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .info-card-content ul {
          margin: 0;
          padding-left: 1.25rem;
          color: var(--sc-text-secondary);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .settings-card {
          background: var(--sc-bg-card);
          border-radius: var(--sc-radius-xl);
          box-shadow: var(--sc-shadow-md);
          overflow: hidden;
        }

        .card-header-custom {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, var(--sc-email-teal), #14b8a6);
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

        .card-body-custom { padding: 1.5rem; }

        .form-group { margin-bottom: 1.25rem; }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--sc-text-primary);
          margin-bottom: 0.5rem;
        }

        .required-mark { color: var(--sc-danger); }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          border: 2px solid #e2e8f0;
          border-radius: var(--sc-radius-md);
          transition: all 0.25s ease;
          outline: none;
          background: #ffffff;
        }

        .form-input:hover { border-color: #cbd5e0; }
        .form-input:focus {
          border-color: var(--sc-email-teal);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
        }

        .form-input.error {
          border-color: var(--sc-danger);
        }
        .form-input.error:focus {
          border-color: var(--sc-danger);
          box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.15);
        }

        .error-message {
          color: var(--sc-danger);
          font-size: 0.8125rem;
          margin-top: 0.375rem;
          font-weight: 500;
        }

        .input-wrapper { position: relative; display: flex; align-items: center; }

        .input-wrapper .form-input { padding-right: 3rem; }

        .input-toggle-btn {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: var(--sc-text-muted);
          cursor: pointer;
        }

        .input-toggle-btn:hover { color: var(--sc-text-primary); }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--sc-text-secondary);
          cursor: pointer;
        }

        .checkbox-label input { width: 18px; height: 18px; }

        .row { display: flex; gap: 1rem; }
        .row .form-group { flex: 1; }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: var(--sc-radius-md);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--sc-email-teal), #14b8a6);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.45);
          transform: translateY(-2px);
        }

        .btn-success {
          background: linear-gradient(135deg, #68d391, #38a169);
          color: #ffffff;
        }

        .btn-danger {
          background: linear-gradient(135deg, #fc8181, #e53e3e);
          color: #ffffff;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sidebar-card {
          background: var(--sc-bg-card);
          border-radius: var(--sc-radius-xl);
          box-shadow: var(--sc-shadow-md);
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
          color: var(--sc-text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sidebar-body { padding: 1.25rem; }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          margin-bottom: 1rem;
        }

        .status-item:last-child { margin-bottom: 0; }

        .status-item-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--sc-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-item-value {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--sc-text-primary);
        }

        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }

        .status-dot.active {
          background: var(--sc-success);
          box-shadow: 0 0 8px var(--sc-success);
        }

        .status-dot.inactive { background: var(--sc-text-muted); }

        .modified-indicator {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--sc-email-teal), #115e59);
          color: #ffffff;
          border-radius: var(--sc-radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s ease forwards;
          z-index: 1000;
        }

        @keyframes slideUp {
          to { transform: translateX(-50%) translateY(0); }
        }

        .indicator-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        .btn-save-small {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: #ffffff;
          color: var(--sc-email-teal);
          border: none;
          border-radius: var(--sc-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-save-small:hover {
          background: #f0fdfa;
        }

        @media (max-width: 1024px) {
          .settings-header { flex-direction: column; gap: 1rem; }
        }

        @media (max-width: 768px) {
          .email-settings-page { padding: 0.75rem; }
          .header-title { font-size: 1.5rem; }
          .row { flex-direction: column; }
          .action-buttons { flex-direction: column; }
          .btn-action { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="email-settings-page">
        <div className="settings-header">
          <div className="header-content">
            <button className="btn-back" onClick={() => navigate("/system-settings/fees")}>
              <FaArrowLeft />
              <span>Back to System Settings</span>
            </button>
            <h1 className="header-title">Email Configuration</h1>
            <p className="header-subtitle">Configure custom SMTP for your college emails</p>
          </div>
          <div className="header-badge">
            {isConfigured ? (
              <>
                <span className="status-dot active" />
                Configured
              </>
            ) : (
              <>
                <span className="status-dot inactive" />
                Using Platform Email
              </>
            )}
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-icon">
            <FaInfoCircle />
          </div>
          <div className="info-card-content">
            <h6>SMTP Configuration</h6>
            <ul>
              <li>Configure your own SMTP server to send emails from your college domain</li>
              <li>Common ports: <strong>587</strong> (TLS) or <strong>465</strong> (SSL)</li>
              <li>If not configured, platform email will be used as fallback</li>
              <li>Use <strong>Verify</strong> to test your configuration before saving</li>
            </ul>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header-custom">
            <FaServer />
            <h5>SMTP Settings</h5>
          </div>
          <div className="card-body-custom">
            <div className="row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">
                  <FaServer className="text-muted" />
                  SMTP Host <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  id="smtp-host"
                  name="smtp.host"
                  className={`form-input${hostError ? " error" : ""}`}
                  placeholder="smtp.gmail.com or smtp.college.edu"
                  value={formData.smtp.host}
                  onChange={handleInputChange}
                  onBlur={handleHostBlur}
                />
                {hostError && <div className="error-message">{hostError}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">
                  <FaKey className="text-muted" />
                  Port <span className="required-mark">*</span>
                </label>
                <input
                  type="number"
                  id="smtp-port"
                  name="smtp.port"
                  className={`form-input${portError ? " error" : ""}`}
                  placeholder="587"
                  value={formData.smtp.port}
                  onChange={handleInputChange}
                  onBlur={handlePortBlur}
                />
                {portError && <div className="error-message">{portError}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="smtp.secure"
                  checked={formData.smtp.secure}
                  onChange={handleInputChange}
                />
                Use SSL/TLS (Enable for port 465, disable for port 587)
              </label>
            </div>

            <div className="row">
              <div className="form-group">
                <label className="form-label">
                  <FaKey className="text-muted" />
                  Username/Email <span className="required-mark">*</span>
                </label>
                  <input
                    type="text"
                    id="credentials-user"
                    name="credentials.user"
                    className={`form-input${userError ? " error" : ""}`}
                    placeholder="your-email@college.edu"
                    value={formData.credentials.user}
                    onChange={handleInputChange}
                    onBlur={handleUserBlur}
                  />
                {userError && <div className="error-message">{userError}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  <FaLock className="text-muted" />
                  Password/App Password <span className="required-mark">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="credentials-pass"
                    name="credentials.pass"
                    className={`form-input${passError ? " error" : ""}`}
                    placeholder={config?.hasPassword ? "Leave empty to keep current" : "Enter password"}
                    value={formData.credentials.pass}
                    onChange={handleInputChange}
                    onBlur={handlePassBlur}
                  />
                  <button
                    type="button"
                    className="input-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {passError && <div className="error-message">{passError}</div>}
              </div>
            </div>

            <div className="row">
              <div className="form-group">
                <label className="form-label">
                  <FaEnvelope className="text-muted" />
                  From Name <span className="required-mark">*</span>
                </label>
                  <input
                    type="text"
                    id="from-name"
                    name="fromName"
                    className={`form-input${nameError ? " error" : ""}`}
                    placeholder="College Name - Admissions"
                    value={formData.fromName}
                    onChange={handleInputChange}
                    onBlur={handleNameBlur}
                  />
                {nameError && <div className="error-message">{nameError}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  <FaEnvelope className="text-muted" />
                  From Email <span className="required-mark">*</span>
                </label>
                <input
                  type="email"
                  id="from-email"
                  name="fromEmail"
                  className={`form-input${emailError && fromEmailTouched ? " error" : ""}`}
                  placeholder="admissions@college.edu"
                  value={formData.fromEmail}
                  onChange={handleInputChange}
                  onBlur={handleFromEmailBlur}
                />
                {emailError && fromEmailTouched && (
                  <div className="error-message">{emailError}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaPaperPlane className="text-muted" />
                Test Email Address
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="test-email"
                  className={`form-input${testEmailError && testEmailTouched ? " error" : ""}`}
                  placeholder="Enter email to receive test message"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  onBlur={handleTestEmailBlur}
                />
              </div>
              {testEmailError && testEmailTouched && (
                <div className="error-message">{testEmailError}</div>
              )}
            </div>

            <div className="action-buttons">
              <button className="btn-action btn-primary" onClick={handleSave} disabled={saving || !isModified}>
                {saving ? <FaSpinner className="spin" /> : <FaSave />}
                {saving ? "Saving..." : "Save Configuration"}
              </button>
              <button className="btn-action btn-success" onClick={handleVerify} disabled={verifying}>
                {verifying ? <FaSpinner className="spin" /> : <FaCheckCircle />}
                {verifying ? "Verifying..." : "Verify & Send Test"}
              </button>
              {isConfigured && (
                <button className="btn-action btn-danger" onClick={handleDelete}>
                  <FaTrash />
                  Delete Configuration
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModified && (
        <div className="modified-indicator">
          <div className="indicator-content">
            <FaInfoCircle />
            <span>You have unsaved changes</span>
          </div>
          <button className="btn-save-small" onClick={handleSave}>
            <FaSave />
            <span>Save Now</span>
          </button>
        </div>
      )}
    </>
  );
};

export default EmailConfigurations;