import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { toast } from "react-toastify";
import {
  FaCreditCard,
  FaArrowLeft,
  FaSave,
  FaCheckCircle,
  FaPlug,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaFlask,
  FaRocket,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaServer,
  FaCalendarAlt,
  FaToggleOn,
  FaToggleOff,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL is required for payment gateway configuration",
  );
}

const StripeConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isModified, setIsModified] = useState(false);

  const [formData, setFormData] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    testMode: true,
  });

  useEffect(() => {
    fetchStripeConfig();
  }, []);

  const fetchStripeConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/stripe/config");

      if (response.data.configured) {
        setConfig(response.data.config);
        setFormData({
          publishableKey: response.data.config.credentials.keyId || "",
          secretKey: "",
          webhookSecret: "",
          testMode: response.data.config.isTestMode,
        });
      } else {
        setConfig(null);
        setFormData({
          publishableKey: "",
          secretKey: "",
          webhookSecret: "",
          testMode: true,
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      if (error.response?.status !== 404) {
        toast.error(
          error.response?.data?.message || "Failed to load configuration",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setIsModified(true);
  };

  const validateKeys = () => {
    const { publishableKey, secretKey, testMode } = formData;

    if (!publishableKey || !secretKey) {
      toast.error("Both Publishable Key and Secret Key are required");
      return false;
    }

    const isTestKey = publishableKey.startsWith("pk_test_");
    const isLiveKey = publishableKey.startsWith("pk_live_");

    if (!isTestKey && !isLiveKey) {
      toast.error("Invalid publishable key format");
      return false;
    }

    if (testMode && !isTestKey) {
      toast.error("Test mode is enabled but live key was provided");
      return false;
    }

    if (!testMode && !isLiveKey) {
      toast.error("Live mode is enabled but test key was provided");
      return false;
    }

    if (
      !secretKey.startsWith("sk_test_") &&
      !secretKey.startsWith("sk_live_")
    ) {
      toast.error("Invalid secret key format");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateKeys()) return;

    try {
      setSaving(true);
      const response = await api.post("/admin/stripe/config", formData);

      toast.success(
        response.data.message || "Stripe configuration saved successfully!",
      );
      fetchStripeConfig();
      setIsModified(false);
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(
        error.response?.data?.message || "Failed to save configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const response = await api.post("/admin/stripe/verify");

      if (response.data.verified) {
        toast.success(
          response.data.message || "Stripe credentials verified successfully!",
        );
      } else {
        toast.warning(response.data.message || "Verification failed");
      }
      fetchStripeConfig();
    } catch (error) {
      console.error("Error verifying config:", error);
      toast.error(
        error.response?.data?.message || "Failed to verify credentials",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "⚠️ Are you sure you want to delete this configuration?\n\nStudents won't be able to make payments until you reconfigure Stripe.",
      )
    ) {
      return;
    }

    try {
      await api.delete("/admin/stripe/config");
      toast.success("Stripe configuration deleted successfully");
      setConfig(null);
      setFormData({
        publishableKey: "",
        secretKey: "",
        webhookSecret: "",
        testMode: true,
      });
      setIsModified(false);
    } catch (error) {
      console.error("Error deleting config:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete configuration",
      );
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await api.get("/admin/stripe/test");

      toast.success(
        `✅ Connected to Stripe! Balance: ${
          response.data.connection.balance.available
        } ${response.data.connection.balance.currency.toUpperCase()}`,
      );
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error(
        error.response?.data?.message || "Failed to connect to Stripe",
      );
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <FaSpinner className="loading-spinner" />
          <p className="loading-text">Loading Stripe Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Stripe Configuration - Enterprise SaaS Professional UI */
        :root {
          --sc-teal-dark: #0f3a4a;
          --sc-teal-medium: #0c2d3a;
          --sc-cyan-primary: #3db5e6;
          --sc-cyan-light: #4fc3f7;
          --sc-cyan-glow: rgba(61, 181, 230, 0.15);
          --sc-bg-primary: #f5f7fb;
          --sc-bg-card: #ffffff;
          --sc-bg-hover: #f8fafc;
          --sc-text-primary: #1a202c;
          --sc-text-secondary: #4a5568;
          --sc-text-muted: #718096;
          --sc-success: #38a169;
          --sc-warning: #ed8936;
          --sc-danger: #e53e3e;
          --sc-stripe-purple: #635bff;
          --sc-stripe-light: #f6f9fc;
          --sc-radius-md: 0.5rem;
          --sc-radius-lg: 0.75rem;
          --sc-radius-xl: 1rem;
          --sc-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --sc-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
          --sc-transition-base: 0.25s ease;
          --sc-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stripe-settings-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Loading State */
        .loading-container {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
        }

        .loading-content {
          text-align: center;
        }

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

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Settings Header */
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, var(--sc-teal-dark) 0%, var(--sc-teal-medium) 100%);
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
          background: linear-gradient(90deg, transparent, rgba(61, 181, 230, 0.1));
          pointer-events: none;
        }

        .header-content {
          position: relative;
          z-index: 1;
        }

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
          transition: all var(--sc-transition-base);
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
          font-weight: 400;
        }

        .header-badges {
          display: flex;
          gap: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: var(--sc-radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .status-badge.test {
          background: linear-gradient(135deg, #f6ad55, #ed8936);
          color: #ffffff;
        }

        .status-badge.live {
          background: linear-gradient(135deg, #68d391, #38a169);
          color: #ffffff;
        }

        .status-badge.active {
          background: linear-gradient(135deg, #63b3ed, #3182ce);
          color: #ffffff;
        }

        .status-badge.inactive {
          background: rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
        }

        /* Info Card */
        .info-card {
          background: linear-gradient(135deg, rgba(99, 91, 255, 0.05), rgba(61, 181, 230, 0.05));
          border: 1px solid rgba(99, 91, 255, 0.2);
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
          background: linear-gradient(135deg, var(--sc-stripe-purple), var(--sc-cyan-primary));
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

        /* Main Grid */
        .settings-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        /* Cards */
        .settings-card {
          background: var(--sc-bg-card);
          border-radius: var(--sc-radius-xl);
          box-shadow: var(--sc-shadow-md);
          overflow: hidden;
          transition: all var(--sc-transition-slow);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .settings-card:hover {
          box-shadow: var(--sc-shadow-lg);
        }

        .card-header-custom {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, var(--sc-stripe-purple), #7c73ff);
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

        /* Mode Toggle */
        .mode-toggle-card {
          background: linear-gradient(135deg, rgba(99, 91, 255, 0.05), rgba(61, 181, 230, 0.05));
          border: 1px solid rgba(99, 91, 255, 0.2);
          border-radius: var(--sc-radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mode-toggle-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mode-icon {
          font-size: 2rem;
        }

        .mode-text h6 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--sc-text-primary);
        }

        .mode-text p {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--sc-text-muted);
        }

        .mode-switch {
          position: relative;
        }

        .mode-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: var(--sc-radius-lg);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--sc-transition-base);
        }

        .mode-toggle-btn.test {
          background: linear-gradient(135deg, #f6ad55, #ed8936);
          color: #ffffff;
        }

        .mode-toggle-btn.live {
          background: linear-gradient(135deg, #68d391, #38a169);
          color: #ffffff;
        }

        .mode-toggle-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Form Styles */
        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--sc-text-primary);
          margin-bottom: 0.5rem;
        }

        .required-mark {
          color: var(--sc-danger);
        }

        .optional-mark {
          color: var(--sc-text-muted);
          font-weight: 400;
          font-size: 0.75rem;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          padding-right: 3rem;
          font-size: 0.9375rem;
          font-family: 'Consolas', 'Monaco', monospace;
          border: 2px solid #e2e8f0;
          border-radius: var(--sc-radius-md);
          transition: all var(--sc-transition-base);
          outline: none;
          background: #ffffff;
        }

        .form-input:hover {
          border-color: #cbd5e0;
        }

        .form-input:focus {
          border-color: var(--sc-stripe-purple);
          box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.15);
        }

        .form-input:disabled {
          background: #f7fafc;
          cursor: not-allowed;
        }

        .input-toggle-btn {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--sc-text-muted);
          cursor: pointer;
          padding: 0.25rem;
          transition: color var(--sc-transition-base);
        }

        .input-toggle-btn:hover {
          color: var(--sc-text-primary);
        }

        .form-hint {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--sc-text-muted);
          margin-top: 0.375rem;
        }

        .code-badge {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          background: #edf2f7;
          border-radius: var(--sc-radius-sm);
          font-family: 'Consolas', monospace;
          font-size: 0.75rem;
          color: var(--sc-text-primary);
        }

        /* Action Buttons */
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
          transition: all var(--sc-transition-base);
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--sc-stripe-purple), #7c73ff);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(99, 91, 255, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(99, 91, 255, 0.45);
          transform: translateY(-2px);
        }

        .btn-outline {
          background: #ffffff;
          color: var(--sc-text-secondary);
          border: 2px solid #e2e8f0;
        }

        .btn-outline:hover:not(:disabled) {
          border-color: var(--sc-cyan-primary);
          color: var(--sc-cyan-primary);
          transform: translateY(-1px);
        }

        .btn-success {
          background: linear-gradient(135deg, #68d391, #38a169);
          color: #ffffff;
        }

        .btn-info {
          background: linear-gradient(135deg, #63b3ed, #3182ce);
          color: #ffffff;
        }

        .btn-danger {
          background: linear-gradient(135deg, #fc8181, #e53e3e);
          color: #ffffff;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Sidebar Cards */
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

        .sidebar-body {
          padding: 1.25rem;
        }

        /* Status List */
        .status-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .status-item {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .status-item-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--sc-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-item-value {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--sc-text-primary);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.active {
          background: var(--sc-success);
          box-shadow: 0 0 8px var(--sc-success);
        }

        .status-dot.inactive {
          background: var(--sc-text-muted);
        }

        .status-dot.test {
          background: var(--sc-warning);
          box-shadow: 0 0 8px var(--sc-warning);
        }

        .status-dot.live {
          background: var(--sc-success);
          box-shadow: 0 0 8px var(--sc-success);
        }

        /* Quick Tips */
        .tips-card {
          background: linear-gradient(135deg, rgba(56, 161, 105, 0.05), rgba(104, 211, 145, 0.05));
          border: 1px solid rgba(56, 161, 105, 0.2);
          border-radius: var(--sc-radius-lg);
          padding: 1.25rem;
        }

        .tips-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .tips-header h6 {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--sc-success);
        }

        .tips-list {
          margin: 0;
          padding-left: 1.25rem;
          color: var(--sc-text-secondary);
          font-size: 0.8125rem;
          line-height: 1.8;
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
          background: linear-gradient(135deg, var(--sc-teal-dark), var(--sc-teal-medium));
          color: #ffffff;
          border-radius: var(--sc-radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s var(--sc-transition-slow) forwards;
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
          color: var(--sc-cyan-light);
          font-size: 1.125rem;
        }

        .btn-save-small {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: linear-gradient(135deg, var(--sc-stripe-purple), #7c73ff);
          color: #ffffff;
          border: none;
          border-radius: var(--sc-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--sc-transition-base);
          box-shadow: 0 2px 8px rgba(99, 91, 255, 0.3);
        }

        .btn-save-small:hover {
          box-shadow: 0 4px 16px rgba(99, 91, 255, 0.5);
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
          
          .settings-header {
            flex-direction: column;
            gap: 1rem;
          }
          
          .header-badges {
            align-self: flex-start;
          }
        }

        @media (max-width: 768px) {
          .stripe-settings-page {
            padding: 0.75rem;
          }
          
          .header-title {
            font-size: 1.5rem;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .btn-action {
            width: 100%;
            justify-content: center;
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

        .form-input:focus,
        .btn-action:focus,
        .btn-save-small:focus {
          outline: 2px solid var(--sc-stripe-purple);
          outline-offset: 2px;
        }
      `}</style>

      <div className="stripe-settings-page">
        {/* ================= PAGE HEADER ================= */}
        <div className="settings-header">
          <div className="header-content">
            <button
              className="btn-back"
              onClick={() => navigate("/system-settings/fees")}
            >
              <FaArrowLeft />
              <span>Back to Fee Settings</span>
            </button>
            <h1 className="header-title">Stripe Payment Configuration</h1>
            <p className="header-subtitle">
              Configure Stripe payment gateway for your college
            </p>
          </div>
          {config && (
            <div className="header-badges">
              <span
                className={`status-badge ${config.isTestMode ? "test" : "live"}`}
              >
                {config.isTestMode ? <FaFlask /> : <FaRocket />}
                {config.isTestMode ? "Test Mode" : "Live Mode"}
              </span>
              <span
                className={`status-badge ${config.isActive ? "active" : "inactive"}`}
              >
                {config.isActive ? <FaCheckCircle /> : <FaBan />}
                {config.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          )}
        </div>

        {/* ================= INFO CARD ================= */}
        <div className="info-card">
          <div className="info-card-icon">
            <FaCreditCard />
          </div>
          <div className="info-card-content">
            <h6>Stripe API Credentials</h6>
            <ul>
              <li>
                Get your API keys from the <strong>Stripe Dashboard</strong>{" "}
                (Dashboard → Developers → API Keys)
              </li>
              <li>
                Use <strong>Test Mode</strong> for development with test cards
                (4242 4242 4242 4242)
              </li>
              <li>
                Switch to <strong>Live Mode</strong> for production payments
              </li>
              <li>Webhook secret enables secure payment event verification</li>
            </ul>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="settings-grid">
          {/* LEFT - Configuration Form */}
          <div className="settings-card">
            <div className="card-header-custom">
              <FaKey className="card-icon" />
              <h5>Stripe Credentials</h5>
            </div>
            <div className="card-body-custom">
              {/* Mode Toggle */}
              <div className="mode-toggle-card">
                <div className="mode-toggle-content">
                  <span className="mode-icon">
                    {formData.testMode ? <FaFlask /> : <FaRocket />}
                  </span>
                  <div className="mode-text">
                    <h6>{formData.testMode ? "Test Mode" : "Live Mode"}</h6>
                    <p>
                      {formData.testMode
                        ? "Using test keys - no real charges will occur"
                        : "Using live keys - real payments will be processed"}
                    </p>
                  </div>
                </div>
                <button
                  className={`mode-toggle-btn ${formData.testMode ? "test" : "live"}`}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      testMode: !prev.testMode,
                    }));
                    setIsModified(true);
                  }}
                  disabled={
                    config !== null &&
                    formData.publishableKey.startsWith("pk_live_")
                  }
                >
                  {formData.testMode ? (
                    <>
                      <FaToggleOn />
                      <span>Switch to Live</span>
                    </>
                  ) : (
                    <>
                      <FaToggleOff />
                      <span>Switch to Test</span>
                    </>
                  )}
                </button>
              </div>

              {/* Publishable Key */}
              <div className="form-group">
                <label className="form-label">
                  <FaKey className="text-muted" />
                  Publishable Key
                  <span className="required-mark">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="form-input"
                    name="publishableKey"
                    value={formData.publishableKey}
                    onChange={handleInputChange}
                    placeholder={
                      formData.testMode ? "pk_test_..." : "pk_live_..."
                    }
                    disabled={saving}
                  />
                </div>
                <div className="form-hint">
                  <FaInfoCircle />
                  Starts with{" "}
                  <span className="code-badge">
                    {formData.testMode ? "pk_test_" : "pk_live_"}
                  </span>
                  <span className="ms-2">
                    This key is safe to use in frontend code
                  </span>
                </div>
              </div>

              {/* Secret Key */}
              <div className="form-group">
                <label className="form-label">
                  <FaLock className="text-muted" />
                  Secret Key
                  <span className="required-mark">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type={showSecret ? "text" : "password"}
                    className="form-input"
                    name="secretKey"
                    value={formData.secretKey}
                    onChange={handleInputChange}
                    placeholder={
                      formData.testMode ? "sk_test_..." : "sk_live_..."
                    }
                    disabled={saving}
                  />
                  <button
                    className="input-toggle-btn"
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    title={showSecret ? "Hide" : "Show"}
                  >
                    {showSecret ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className="form-hint">
                  <FaShieldAlt />
                  Starts with{" "}
                  <span className="code-badge">
                    {formData.testMode ? "sk_test_" : "sk_live_"}
                  </span>
                  <span className="ms-2">
                    Encrypted before storage - never share this key
                  </span>
                </div>
              </div>

              {/* Webhook Secret */}
              <div className="form-group">
                <label className="form-label">
                  <FaServer className="text-muted" />
                  Webhook Secret
                  <span className="optional-mark">
                    (Optional but recommended)
                  </span>
                </label>
                <div className="input-wrapper">
                  <input
                    type={showWebhookSecret ? "text" : "password"}
                    className="form-input"
                    name="webhookSecret"
                    value={formData.webhookSecret}
                    onChange={handleInputChange}
                    placeholder="whsec_..."
                    disabled={saving}
                  />
                  <button
                    className="input-toggle-btn"
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    title={showWebhookSecret ? "Hide" : "Show"}
                  >
                    {showWebhookSecret ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className="form-hint">
                  <FaInfoCircle />
                  Starts with <span className="code-badge">whsec_</span>
                  <span className="ms-2">
                    Enables secure webhook signature verification
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className="btn-action btn-primary"
                  onClick={handleSave}
                  disabled={saving || !isModified}
                >
                  {saving ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>
                        {config ? "Update Configuration" : "Save Configuration"}
                      </span>
                    </>
                  )}
                </button>

                <button
                  className="btn-action btn-outline"
                  onClick={handleVerify}
                  disabled={verifying || !config}
                  title={
                    !config ? "Save configuration first" : "Verify credentials"
                  }
                >
                  {verifying ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <FaCheckCircle />
                      <span>Verify</span>
                    </>
                  )}
                </button>

                <button
                  className="btn-action btn-info"
                  onClick={handleTestConnection}
                  disabled={testing || !config}
                  title={
                    !config
                      ? "Save configuration first"
                      : "Test Stripe connection"
                  }
                >
                  {testing ? (
                    <>
                      <span className="btn-spinner" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <FaPlug />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>

                {config && (
                  <button
                    className="btn-action btn-danger"
                    onClick={handleDelete}
                    title="Delete Stripe configuration"
                  >
                    <FaTrash />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT - Sidebar */}
          <div>
            {/* Configuration Status */}
            {config && (
              <div className="sidebar-card">
                <div className="sidebar-header">
                  <h6>
                    <FaInfoCircle />
                    Configuration Status
                  </h6>
                </div>
                <div className="sidebar-body">
                  <div className="status-list">
                    <div className="status-item">
                      <span className="status-item-label">Status</span>
                      <div className="status-item-value">
                        <span
                          className={`status-dot ${config.isActive ? "active" : "inactive"}`}
                        />
                        {config.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div className="status-item">
                      <span className="status-item-label">Mode</span>
                      <div className="status-item-value">
                        <span
                          className={`status-dot ${config.isTestMode ? "test" : "live"}`}
                        />
                        {config.isTestMode ? "Test" : "Live"}
                      </div>
                    </div>
                    {config.lastVerifiedAt && (
                      <div className="status-item">
                        <span className="status-item-label">Last Verified</span>
                        <div className="status-item-value">
                          <FaCalendarAlt
                            style={{
                              fontSize: "0.875rem",
                              color: "var(--sc-text-muted)",
                            }}
                          />
                          {new Date(config.lastVerifiedAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div className="status-item">
                      <span className="status-item-label">Created On</span>
                      <div className="status-item-value">
                        <FaCalendarAlt
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--sc-text-muted)",
                          }}
                        />
                        {new Date(config.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="sidebar-card tips-card">
              <div className="tips-header">
                <FaExclamationTriangle style={{ color: "var(--sc-success)" }} />
                <h6>Quick Tips</h6>
              </div>
              <ul className="tips-list">
                <li>Always test with test keys before going live</li>
                <li>Use webhook secret for payment confirmation</li>
                <li>Keep your secret keys secure and never commit to git</li>
                <li>
                  Test card: 4242 4242 4242 4242 (any future date, any CVC)
                </li>
              </ul>
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

export default StripeConfiguration;
