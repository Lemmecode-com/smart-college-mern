import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCreditCard,
  FaWallet,
  FaMoneyBillWave,
  FaCog,
  FaSave,
  FaInfoCircle,
  FaCheckCircle,
  FaLock,
  FaPercentage,
  FaDollarSign,
  FaBan,
  FaTools,
  FaArrowRight,
  FaKey,
  FaShieldAlt,
  FaServer,
  FaExternalLinkAlt,
} from "react-icons/fa";

const FeeSetting = () => {
  const navigate = useNavigate();
  const [activeGateway, setActiveGateway] = useState("stripe");
  const [feeType, setFeeType] = useState("none");
  const [feeValue, setFeeValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const gateways = [
    { key: "stripe", label: "Stripe", icon: "💳" },
    { key: "razorpay", label: "Razorpay", icon: "🔷" },
    { key: "paypal", label: "PayPal", icon: "🅿️" },
    { key: "paytm", label: "Paytm", icon: "📱" },
    { key: "payu", label: "PayU", icon: "🚀" },
    { key: "cashfree", label: "Cashfree", icon: "💰" },
    { key: "instamojo", label: "InstaMojo", icon: "🛒" },
  ];

  const GATEWAY_STATUS = {
    stripe: "active",
    razorpay: "coming-soon",
    paypal: "coming-soon",
    paytm: "coming-soon",
    payu: "coming-soon",
    cashfree: "coming-soon",
    instamojo: "coming-soon",
  };

  const handleGatewaySelect = (gatewayKey) => {
    if (gatewayKey === "stripe") {
      // Navigate to Stripe Configuration page
      navigate("/system-settings/stripe-configuration");
    } else {
      setActiveGateway(gatewayKey);
    }
  };

  const handleOpenStripeConfig = () => {
    navigate("/system-settings/stripe-configuration");
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1500);
  };

  const activeGatewayData = gateways.find((g) => g.key === activeGateway);

  return (
    <>
      <style>{`
        /* Fee Settings - Enterprise SaaS Professional UI */
        :root {
          --fs-teal-dark: #0f3a4a;
          --fs-teal-medium: #0c2d3a;
          --fs-cyan-primary: #3db5e6;
          --fs-cyan-light: #4fc3f7;
          --fs-cyan-glow: rgba(61, 181, 230, 0.15);
          --fs-bg-primary: #f5f7fb;
          --fs-bg-card: #ffffff;
          --fs-bg-hover: #f8fafc;
          --fs-text-primary: #1a202c;
          --fs-text-secondary: #4a5568;
          --fs-text-muted: #718096;
          --fs-success: #38a169;
          --fs-warning: #ed8936;
          --fs-danger: #e53e3e;
          --fs-radius-md: 0.5rem;
          --fs-radius-lg: 0.75rem;
          --fs-radius-xl: 1rem;
          --fs-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --fs-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
          --fs-transition-base: 0.25s ease;
          --fs-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fee-settings-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f0f4f8 0%, #f5f7fb 100%);
          padding: 1.5rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, var(--fs-teal-dark) 0%, var(--fs-teal-medium) 100%);
          border-radius: var(--fs-radius-xl);
          box-shadow: var(--fs-shadow-lg);
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
          border-radius: var(--fs-radius-lg);
          background: linear-gradient(135deg, var(--fs-cyan-primary), var(--fs-cyan-light));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.4);
        }

        .header-icon {
          font-size: 1.5rem;
          color: #ffffff;
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

        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.25rem;
          background: linear-gradient(135deg, var(--fs-cyan-primary), var(--fs-cyan-light));
          color: #ffffff;
          border: none;
          border-radius: var(--fs-radius-md);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--fs-transition-base);
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
        }

        .btn-save:hover:not(:disabled) {
          box-shadow: 0 6px 25px rgba(61, 181, 230, 0.5);
          transform: translateY(-2px);
        }

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
          to {
            transform: rotate(360deg);
          }
        }

        /* Gateway Tabs */
        .gateway-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .gateway-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--fs-bg-card);
          border: 2px solid #e2e8f0;
          border-radius: var(--fs-radius-lg);
          cursor: pointer;
          transition: all var(--fs-transition-base);
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--fs-text-secondary);
        }

        .gateway-tab:hover {
          border-color: var(--fs-cyan-primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.15);
        }

        .gateway-tab.active {
          background: linear-gradient(135deg, var(--fs-cyan-primary), var(--fs-cyan-light));
          border-color: var(--fs-cyan-primary);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
        }

        .gateway-tab.coming-soon {
          opacity: 0.7;
        }

        .gateway-tab-icon {
          font-size: 1.25rem;
        }

        .gateway-tab-status {
          font-size: 0.625rem;
          padding: 0.125rem 0.5rem;
          border-radius: var(--fs-radius-md);
          font-weight: 600;
          text-transform: uppercase;
        }

        .gateway-tab-status.active {
          background: rgba(56, 161, 105, 0.2);
          color: var(--fs-success);
        }

        .gateway-tab-status.coming-soon {
          background: rgba(237, 137, 54, 0.2);
          color: var(--fs-warning);
        }

        /* Main Content Grid */
        .settings-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        /* Cards */
        .settings-card {
          background: var(--fs-bg-card);
          border-radius: var(--fs-radius-xl);
          box-shadow: var(--fs-shadow-md);
          overflow: hidden;
          transition: all var(--fs-transition-slow);
        }

        .settings-card:hover {
          box-shadow: var(--fs-shadow-lg);
        }

        .card-header-custom {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, var(--fs-teal-dark), var(--fs-teal-medium));
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

        /* Gateway Status Banner */
        .status-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: var(--fs-radius-lg);
          margin-bottom: 1.5rem;
        }

        .status-banner.active {
          background: linear-gradient(135deg, rgba(56, 161, 105, 0.1), rgba(104, 211, 145, 0.1));
          border: 1px solid rgba(56, 161, 105, 0.3);
          color: var(--fs-success);
        }

        .status-banner.coming-soon {
          background: linear-gradient(135deg, rgba(237, 137, 54, 0.1), rgba(246, 173, 85, 0.1));
          border: 1px solid rgba(237, 137, 54, 0.3);
          color: var(--fs-warning);
        }

        .status-banner-icon {
          font-size: 1.5rem;
        }

        .status-banner-content h6 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 700;
        }

        .status-banner-content p {
          margin: 0;
          font-size: 0.875rem;
          opacity: 0.9;
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
          color: var(--fs-text-primary);
          margin-bottom: 0.5rem;
        }

        .required-mark {
          color: var(--fs-danger);
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          border: 2px solid #e2e8f0;
          border-radius: var(--fs-radius-md);
          transition: all var(--fs-transition-base);
          outline: none;
        }

        .form-input:hover {
          border-color: #cbd5e0;
        }

        .form-input:focus {
          border-color: var(--fs-cyan-primary);
          box-shadow: 0 0 0 3px var(--fs-cyan-glow);
        }

        .input-group {
          position: relative;
        }

        .input-suffix {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--fs-text-muted);
          font-weight: 500;
          pointer-events: none;
        }

        /* Fee Type Selection */
        .fee-type-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .fee-type-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.25rem;
          background: var(--fs-bg-hover);
          border: 2px solid #e2e8f0;
          border-radius: var(--fs-radius-lg);
          cursor: pointer;
          transition: all var(--fs-transition-base);
        }

        .fee-type-option:hover {
          border-color: var(--fs-cyan-primary);
          transform: translateY(-2px);
        }

        .fee-type-option.selected {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.1), rgba(79, 195, 247, 0.1));
          border-color: var(--fs-cyan-primary);
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.2);
        }

        .fee-type-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .fee-type-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--fs-text-primary);
        }

        .fee-type-radio {
          display: none;
        }

        /* Sidebar */
        .sidebar-card {
          background: var(--fs-bg-card);
          border-radius: var(--fs-radius-xl);
          box-shadow: var(--fs-shadow-md);
          overflow: hidden;
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
          color: var(--fs-text-primary);
        }

        .sidebar-body {
          padding: 1.25rem;
        }

        .gateway-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: var(--fs-radius-md);
          cursor: pointer;
          transition: all var(--fs-transition-base);
          margin-bottom: 0.5rem;
        }

        .gateway-list-item:hover {
          background: var(--fs-bg-hover);
        }

        .gateway-list-item.active {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.1), rgba(79, 195, 247, 0.1));
          border: 1px solid var(--fs-cyan-primary);
        }

        .gateway-list-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .gateway-list-icon {
          font-size: 1.25rem;
        }

        .gateway-list-label {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--fs-text-primary);
        }

        .gateway-list-status {
          font-size: 0.6875rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--fs-radius-sm);
          font-weight: 600;
          text-transform: uppercase;
        }

        .gateway-list-status.active {
          background: rgba(56, 161, 105, 0.2);
          color: var(--fs-success);
        }

        .gateway-list-status.coming-soon {
          background: rgba(237, 137, 54, 0.2);
          color: var(--fs-warning);
        }

        /* Coming Soon Card */
        .coming-soon-card {
          text-align: center;
          padding: 3rem 2rem;
          background: linear-gradient(135deg, rgba(237, 137, 54, 0.05), rgba(246, 173, 85, 0.05));
          border: 2px dashed rgba(237, 137, 54, 0.4);
          border-radius: var(--fs-radius-xl);
        }

        .coming-soon-icon {
          font-size: 4rem;
          color: var(--fs-warning);
          margin-bottom: 1rem;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .coming-soon-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--fs-text-primary);
          margin-bottom: 0.5rem;
        }

        .coming-soon-text {
          color: var(--fs-text-muted);
          margin-bottom: 1.5rem;
        }

        .btn-disabled {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: #e2e8f0;
          color: var(--fs-text-muted);
          border: none;
          border-radius: var(--fs-radius-md);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: not-allowed;
        }

        /* Stripe Preview Card */
        .stripe-preview-card {
          padding: 1rem;
          background: linear-gradient(135deg, rgba(99, 91, 255, 0.02), rgba(61, 181, 230, 0.02));
          border: 1px solid rgba(99, 91, 255, 0.1);
          border-radius: var(--fs-radius-lg);
        }

        .code-badge {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          background: #edf2f7;
          border-radius: var(--fs-radius-sm);
          font-family: 'Consolas', monospace;
          font-size: 0.75rem;
          color: var(--fs-text-primary);
        }

        .optional-mark {
          color: var(--fs-text-muted);
          font-weight: 400;
          font-size: 0.75rem;
        }

        .form-hint {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: var(--fs-text-muted);
          margin-top: 0.375rem;
        }

        /* Info Card */
        .info-card {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.05), rgba(79, 195, 247, 0.05));
          border: 1px solid rgba(61, 181, 230, 0.2);
          border-radius: var(--fs-radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .info-card-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--fs-radius-md);
          background: linear-gradient(135deg, var(--fs-cyan-primary), var(--fs-cyan-light));
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
          color: var(--fs-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .info-card-content ul {
          margin: 0;
          padding-left: 1.25rem;
          color: var(--fs-text-secondary);
          font-size: 0.875rem;
          line-height: 1.6;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .settings-grid {
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
          
          .fee-type-selector {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .fee-settings-page {
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
          
          .btn-save {
            width: 100%;
            justify-content: center;
          }
          
          .gateway-tabs {
            flex-direction: column;
          }
          
          .gateway-tab {
            width: 100%;
            justify-content: space-between;
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
        .btn-save:focus {
          outline: 2px solid var(--fs-cyan-primary);
          outline-offset: 2px;
        }
      `}</style>

      <div className="fee-settings-page">
        {/* ================= PAGE HEADER ================= */}
        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <FaCreditCard className="header-icon" />
            </div>
            <div className="header-text">
              <h2 className="settings-title">Fee & Payment Settings</h2>
              <p className="settings-subtitle">
                Configure payment gateways and processing fees
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={isSaving}
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
            <h6>Payment Gateway Configuration</h6>
            <ul>
              <li>Select a payment gateway from the options below</li>
              <li>Configure API credentials for the selected gateway</li>
              <li>Set processing fees (percentage or fixed amount)</li>
              <li>
                Only Stripe is currently active. Other gateways coming soon!
              </li>
            </ul>
          </div>
        </div>

        {/* ================= GATEWAY TABS ================= */}
        <div className="gateway-tabs">
          {gateways.map((g) => (
            <button
              key={g.key}
              onClick={() => handleGatewaySelect(g.key)}
              className={`gateway-tab ${
                activeGateway === g.key ? "active" : ""
              } ${GATEWAY_STATUS[g.key] === "coming-soon" ? "coming-soon" : ""}`}
            >
              <span className="gateway-tab-icon">{g.icon}</span>
              <span>{g.label}</span>
              <span className={`gateway-tab-status ${GATEWAY_STATUS[g.key]}`}>
                {GATEWAY_STATUS[g.key] === "active" ? "✓ Active" : "⏳ Soon"}
              </span>
            </button>
          ))}
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="settings-grid">
          {/* LEFT - Configuration Form */}
          <div className="settings-card">
            <div className="card-header-custom">
              <FaCog className="card-icon" />
              <h5>{activeGatewayData?.label} Configuration</h5>
            </div>
            <div className="card-body-custom">
              {/* Status Banner */}
              <div className={`status-banner ${GATEWAY_STATUS[activeGateway]}`}>
                <span className="status-banner-icon">
                  {GATEWAY_STATUS[activeGateway] === "active" ? (
                    <FaCheckCircle />
                  ) : (
                    <FaTools />
                  )}
                </span>
                <div className="status-banner-content">
                  <h6>
                    {GATEWAY_STATUS[activeGateway] === "active"
                      ? "Gateway Active & Ready"
                      : "Coming Soon"}
                  </h6>
                  <p>
                    {GATEWAY_STATUS[activeGateway] === "active"
                      ? `${activeGatewayData?.label} is configured and ready to accept payments`
                      : `We're working on integrating ${activeGatewayData?.label}. Stay tuned!`}
                  </p>
                </div>
              </div>

              {GATEWAY_STATUS[activeGateway] === "coming-soon" ? (
                <div className="coming-soon-card">
                  <div className="coming-soon-icon">
                    <FaTools />
                  </div>
                  <h3 className="coming-soon-title">
                    {activeGatewayData?.label} Coming Soon!
                  </h3>
                  <p className="coming-soon-text">
                    We're working on integrating {activeGatewayData?.label}.
                    You'll be notified when it's available.
                  </p>
                  <button className="btn-disabled">
                    <FaBan />
                    Not Available Yet
                  </button>
                </div>
              ) : activeGateway === "stripe" ? (
                /* Stripe - Simple Card with Button Only */
                <div className="stripe-preview-card">
                  <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        margin: "0 auto 1.5rem",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #635bff, #7c73ff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        color: "#ffffff",
                      }}
                    >
                      <FaCreditCard />
                    </div>
                    <h3
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        color: "var(--fs-text-primary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Stripe Payment Gateway
                    </h3>
                    <p
                      style={{
                        fontSize: "0.9375rem",
                        color: "var(--fs-text-muted)",
                        marginBottom: "1.5rem",
                      }}
                    >
                      Configure Stripe API credentials, webhook settings, and
                      test connection
                    </p>
                    <button
                      className="btn-action btn-primary"
                      onClick={handleOpenStripeConfig}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.875rem 2rem",
                        fontSize: "1rem",
                        fontWeight: "600",
                      }}
                    >
                      <FaCog />
                      <span>Open Stripe Configuration</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Gateway Credentials for other active gateways */}
                  <h6
                    className="fw-bold mb-3"
                    style={{
                      color: "var(--fs-text-primary)",
                      fontSize: "1rem",
                    }}
                  >
                    API Credentials
                  </h6>

                  <div className="form-group">
                    <label className="form-label">
                      <FaLock className="text-muted" />
                      Publishable Key <span className="required-mark">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="pk_test_..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaLock className="text-muted" />
                      Secret Key <span className="required-mark">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="sk_test_..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FaLock className="text-muted" />
                      Webhook Secret
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="whsec_..."
                    />
                  </div>

                  <hr
                    style={{
                      margin: "1.5rem 0",
                      border: "none",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  />

                  {/* Processing Fees */}
                  <h6
                    className="fw-bold mb-3"
                    style={{
                      color: "var(--fs-text-primary)",
                      fontSize: "1rem",
                    }}
                  >
                    Processing Fees
                  </h6>

                  <div className="fee-type-selector">
                    <label className="fee-type-option selected">
                      <input
                        type="radio"
                        name="feeType"
                        className="fee-type-radio"
                        checked={feeType === "none"}
                        onChange={() => setFeeType("none")}
                      />
                      <span className="fee-type-icon">🚫</span>
                      <span className="fee-type-label">None</span>
                    </label>

                    <label className="fee-type-option">
                      <input
                        type="radio"
                        name="feeType"
                        className="fee-type-radio"
                        checked={feeType === "percentage"}
                        onChange={() => setFeeType("percentage")}
                      />
                      <span className="fee-type-icon">
                        <FaPercentage
                          style={{
                            fontSize: "1.5rem",
                            color: "var(--fs-warning)",
                          }}
                        />
                      </span>
                      <span className="fee-type-label">Percentage (%)</span>
                    </label>

                    <label className="fee-type-option">
                      <input
                        type="radio"
                        name="feeType"
                        className="fee-type-radio"
                        checked={feeType === "fixed"}
                        onChange={() => setFeeType("fixed")}
                      />
                      <span className="fee-type-icon">
                        <FaDollarSign
                          style={{
                            fontSize: "1.5rem",
                            color: "var(--fs-success)",
                          }}
                        />
                      </span>
                      <span className="fee-type-label">Fixed Amount</span>
                    </label>
                  </div>

                  {feeType !== "none" && (
                    <div className="form-group">
                      <label className="form-label">
                        {feeType === "percentage" ? (
                          <>
                            <FaPercentage className="text-warning" />
                            Fee Percentage
                          </>
                        ) : (
                          <>
                            <FaDollarSign className="text-success" />
                            Fixed Fee Amount
                          </>
                        )}
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-input"
                          placeholder={
                            feeType === "percentage" ? "e.g. 2.5" : "e.g. 50"
                          }
                          value={feeValue}
                          onChange={(e) => setFeeValue(e.target.value)}
                        />
                        <span className="input-suffix">
                          {feeType === "percentage" ? "%" : "₹"}
                        </span>
                      </div>
                      <small
                        style={{
                          color: "var(--fs-text-muted)",
                          fontSize: "0.75rem",
                          marginTop: "0.25rem",
                          display: "block",
                        }}
                      >
                        {feeType === "percentage"
                          ? "Percentage of transaction amount (e.g., 2.5%)"
                          : "Fixed amount per transaction (e.g., ₹50)"}
                      </small>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT - Gateway Selector Sidebar */}
          <div className="sidebar-card">
            <div className="sidebar-header">
              <h6>
                <FaWallet className="me-2" />
                Quick Select
              </h6>
            </div>
            <div className="sidebar-body">
              {gateways.map((g) => (
                <div
                  key={g.key}
                  onClick={() => handleGatewaySelect(g.key)}
                  className={`gateway-list-item ${
                    activeGateway === g.key ? "active" : ""
                  }`}
                >
                  <div className="gateway-list-content">
                    <span className="gateway-list-icon">{g.icon}</span>
                    <span className="gateway-list-label">{g.label}</span>
                  </div>
                  <span
                    className={`gateway-list-status ${GATEWAY_STATUS[g.key]}`}
                  >
                    {GATEWAY_STATUS[g.key] === "active" ? "Active" : "Soon"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeeSetting;
