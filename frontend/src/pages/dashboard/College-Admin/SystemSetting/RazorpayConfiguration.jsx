import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { toast } from "react-toastify";
import { logger } from "../../../../utils/logger";
import ApiError from "../../../../components/ApiError";
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
  FaFlask,
  FaRocket,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaServer,
  FaToggleOn,
  FaToggleOff,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import {
  buildWebhookUrl,
  isInsecureOrLocalWebhookUrl,
  WEBHOOK_LOCALHOST_WARNING_MESSAGE,
} from "../../../../utils/webhookUrl";
import "react-toastify/dist/ReactToastify.css";
import "./RazorpayConfiguration.css";

const RazorpayConfiguration = () => {
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
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [config, setConfig] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isGatewayActive, setIsGatewayActive] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [backendWebhookUrl, setBackendWebhookUrl] = useState(null);

  const [formData, setFormData] = useState({
    keyId: "",
    keySecret: "",
    webhookSecret: "",
    testMode: true,
  });

  useEffect(() => {
    fetchRazorpayConfig();
  }, []);

  const fetchRazorpayConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/razorpay/config");

      const isActive = response.data.isActive || false;
      setIsGatewayActive(isActive);

      const incomingWebhookUrl =
        response.data?.webhookUrl || response.data?.config?.webhookUrl;
      if (incomingWebhookUrl) {
        setBackendWebhookUrl(incomingWebhookUrl);
      }

      if (response.data.configured && response.data.config) {
        setConfig(response.data.config);
        setFormData({
          keyId: response.data.config.credentials?.keyId || "",
          keySecret: "",
          webhookSecret: "",
          testMode: response.data.config.isTestMode ?? true,
        });
      } else {
        setConfig(null);
        setFormData({
          keyId: "",
          keySecret: "",
          webhookSecret: "",
          testMode: true,
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
        toast.error(
          error.response?.data?.message || "Failed to load configuration",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const webhookUrl = buildWebhookUrl(backendWebhookUrl || api.defaults.baseURL);
  const showWebhookWarning = isInsecureOrLocalWebhookUrl(webhookUrl);

  const copyToClipboard = async (text) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2000);
      toast.success("Webhook URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleToggleGateway = async () => {
    try {
      setToggling(true);
      const newStatus = !isGatewayActive;
      const response = await api.patch("/admin/razorpay/config/status", {
        isActive: newStatus,
      });

      setIsGatewayActive(newStatus);
      toast.success(response.data.message);
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Error toggling gateway:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(error.response?.data?.message || "Failed to toggle gateway");
    } finally {
      setToggling(false);
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
    const { keyId, keySecret, webhookSecret, testMode } = formData;

    if (!keyId || !keySecret || !webhookSecret) {
      toast.error("Key ID, Secret Key, and Webhook Secret are required");
      return false;
    }

    const isTestKey = keyId.startsWith("rzp_test_");
    const isLiveKey = keyId.startsWith("rzp_live_");

    if (!isTestKey && !isLiveKey) {
      toast.error(
        "Invalid Key ID format. Must start with rzp_test_ or rzp_live_",
      );
      return false;
    }

    if (testMode && !isTestKey) {
      toast.error("Test mode enabled but live key provided");
      return false;
    }

    if (!testMode && !isLiveKey) {
      toast.error("Live mode enabled but test key provided");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateKeys()) return;

    try {
      setSaving(true);
      await api.post("/admin/razorpay/config", formData);

      toast.success("Razorpay configuration saved successfully!", {
        icon: <FaCheckCircle />,
      });

      fetchRazorpayConfig();
      setIsModified(false);
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Save error:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(
        error.response?.data?.message || "Failed to save configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!config) {
      toast.error("Please save configuration first");
      return;
    }

    try {
      setVerifying(true);
      const response = await api.post("/admin/razorpay/verify");

      if (response.data.verified) {
        toast.success(response.data.message, {
          icon: <FaCheckCircle />,
        });
        fetchRazorpayConfig();
      } else {
        toast.error(response.data.message, {
          icon: <FaExclamationTriangle />,
        });
      }
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Verify error:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await api.get("/admin/razorpay/test");

      if (response.data.success) {
        toast.success(response.data.message, {
          icon: <FaCheckCircle />,
        });
      } else {
        toast.error("Connection test failed");
      }
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Test error:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(error.response?.data?.message || "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete Razorpay configuration? This will stop all Razorpay payments.",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      await api.delete("/admin/razorpay/config");

      toast.success("Configuration deleted", {
        icon: <FaCheckCircle />,
      });

      setConfig(null);
      setFormData({
        keyId: "",
        keySecret: "",
        webhookSecret: "",
        testMode: true,
      });
    } catch (error) {
      const statusCode = error.response?.status;
      const errorCode = error.response?.data?.code;
      logger.error("Delete error:", statusCode, errorCode);
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        return;
      }
      toast.error(
        error.response?.data?.message || "Failed to delete configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  if (pageError) {
    return (
      <ApiError
        statusCode={pageError.statusCode}
        errorCode={pageError.errorCode}
        onRetry={fetchRazorpayConfig}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="text-center">
          <FaSpinner className="spin fa-3x text-primary mb-3" />
          <p className="text-muted">Loading Razorpay configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="razorpay-config-page">
    <header className="rp-header">
      <div className="rp-heading">
        <span className="rp-heading-icon" aria-hidden="true">
          <FaCreditCard />
        </span>
        <div>
          <h1>Razorpay Configuration</h1>
          <p>Manage payment credentials, mode, and webhook settings.</p>
        </div>
      </div>
      <div className="rp-header-actions">
        <div className="rp-status-list" aria-label="Gateway status">
          <span
            className={`rp-status ${isGatewayActive ? "rp-status--active" : "rp-status--disabled"}`}
          >
            {isGatewayActive ? <FaCheckCircle /> : <FaToggleOff />}
            {isGatewayActive ? "Active" : "Disabled"}
          </span>
          {config && (
            <span
              className={`rp-status ${formData.testMode ? "rp-status--test" : "rp-status--live"}`}
            >
              {formData.testMode ? <FaFlask /> : <FaRocket />}
              {formData.testMode ? "Test Mode" : "Live Mode"}
            </span>
          )}
        </div>
        <button
          className={`btn ${isGatewayActive ? "btn-outline-danger" : "btn-success"}`}
          onClick={handleToggleGateway}
          disabled={toggling}
        >
          {toggling ? (
            <FaSpinner className="spin me-1" />
          ) : isGatewayActive ? (
            <FaToggleOff className="me-1" />
          ) : (
            <FaToggleOn className="me-1" />
          )}
          {isGatewayActive ? "Disable" : "Enable"}
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)} 
        >
          <FaArrowLeft className="me-1"/>
          Back
        </button>
      </div>
      {showWebhookWarning && (
        <div
          className="alert alert-warning py-2 px-3 mb-0 small d-flex align-items-center gap-2"
          data-testid="webhook-warning-header"
        >
          <FaExclamationTriangle className="flex-shrink-0" />
          <span>{WEBHOOK_LOCALHOST_WARNING_MESSAGE}</span>
        </div>
      )}
    </header>

    {isGatewayActive ? (
      <div className="rp-content-grid">
        <section className="card rp-card">
          <div className="card-body">
            <h2 className="rp-card-heading">
              <FaKey aria-hidden="true" />
              API Credentials
            </h2>

            <div className="rp-field">
              <label className="form-label fw-semibold">Payment mode</label>
              <div className="rp-mode-selector" role="group" aria-label="Payment mode">
                <button
                  type="button"
                  className={`rp-mode-option ${formData.testMode ? "is-selected" : ""}`}
                  aria-pressed={formData.testMode}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, testMode: true }));
                    setIsModified(true);
                  }}
                >
                  <FaFlask aria-hidden="true" />
                  Test mode
                </button>
                <button
                  type="button"
                  className={`rp-mode-option ${!formData.testMode ? "is-selected" : ""}`}
                  aria-pressed={!formData.testMode}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, testMode: false }));
                    setIsModified(true);
                  }}
                >
                  <FaRocket aria-hidden="true" />
                  Live mode
                </button>
              </div>
              <small className="rp-help">
                <FaInfoCircle className="me-1" aria-hidden="true" />
                {formData.testMode
                  ? "Test keys are used; no real transactions are processed."
                  : "Live keys are used for real transactions."}
              </small>
            </div>

            <div className="rp-field">
              <label className="form-label fw-semibold" htmlFor="razorpay-key-id">
                Key ID <span className="text-danger">*</span>
              </label>
              <input
                id="razorpay-key-id"
                type="text"
                className="form-control"
                name="keyId"
                value={formData.keyId}
                onChange={handleInputChange}
                placeholder={formData.testMode ? "rzp_test_xxxxx" : "rzp_live_xxxxx"}
                disabled={saving}
              />
              <small className="rp-help">
                Must start with {formData.testMode ? "rzp_test_" : "rzp_live_"}.
              </small>
            </div>

            <div className="rp-field">
              <label className="form-label fw-semibold" htmlFor="razorpay-key-secret">
                Key Secret <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="razorpay-key-secret"
                  type={showSecret ? "text" : "password"}
                  className="form-control"
                  name="keySecret"
                  value={formData.keySecret}
                  onChange={handleInputChange}
                  placeholder="Enter secret key"
                  disabled={saving}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  aria-label={showSecret ? "Hide key secret" : "Show key secret"}
                >
                  {showSecret ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <small className="rp-help">
                <FaLock className="me-1" aria-hidden="true" />
                Encrypted before storage.
              </small>
            </div>

            <div className="rp-field">
              <label className="form-label fw-semibold" htmlFor="razorpay-webhook-secret">
                Webhook Secret <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  id="razorpay-webhook-secret"
                  type={showWebhookSecret ? "text" : "password"}
                  className="form-control"
                  name="webhookSecret"
                  value={formData.webhookSecret}
                  onChange={handleInputChange}
                  placeholder="Enter webhook secret (required)"
                  disabled={saving}
                  required
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  aria-label={showWebhookSecret ? "Hide webhook secret" : "Show webhook secret"}
                >
                  {showWebhookSecret ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <small className="rp-help">Used to verify webhook signatures.</small>
            </div>

            <div className="rp-form-actions">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !isModified}
              >
                {saving ? <FaSpinner className="spin me-2" /> : <FaSave className="me-2" />}
                {saving ? "Saving..." : "Save Configuration"}
              </button>

              {config && (
                <>
                  <button
                    className="btn btn-outline-primary"
                    onClick={handleVerify}
                    disabled={verifying}
                  >
                    {verifying ? <FaSpinner className="spin me-2" /> : <FaCheckCircle className="me-2" />}
                    {verifying ? "Verifying..." : "Verify"}
                  </button>
                  <button
                    className="btn btn-outline-info"
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    {testing ? <FaSpinner className="spin me-2" /> : <FaPlug className="me-2" />}
                    {testing ? "Testing..." : "Test Connection"}
                  </button>
                  <button
                    className="btn btn-outline-danger ms-auto"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    <FaTrash className="me-2" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {config && (
          <>
            <section className="card rp-card">
              <div className="card-body">
                <h2 className="rp-card-heading">
                  <FaServer aria-hidden="true" />
                  Connection status
                </h2>
                <div className="rp-details-grid">
                  <div className="rp-detail">
                    <div className="rp-detail-label">Key ID</div>
                    <div className="rp-detail-value">{config.credentials.keyId}</div>
                  </div>
                  <div className="rp-detail">
                    <div className="rp-detail-label">Gateway</div>
                    <div className="rp-detail-value">
                      <span className={`rp-status ${isGatewayActive ? "rp-status--active" : "rp-status--disabled"}`}>
                        {isGatewayActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                  <div className="rp-detail">
                    <div className="rp-detail-label">Mode</div>
                    <div className="rp-detail-value">
                      <span className={`rp-status ${formData.testMode ? "rp-status--test" : "rp-status--live"}`}>
                        {formData.testMode ? <FaFlask /> : <FaRocket />}
                        {formData.testMode ? "Test" : "Live"}
                      </span>
                    </div>
                  </div>
                  <div className="rp-detail">
                    <div className="rp-detail-label">Last verified</div>
                    <div className="rp-detail-value">
                      {config.lastVerifiedAt
                        ? new Date(config.lastVerifiedAt).toLocaleString()
                        : "Not verified"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card rp-card rp-webhook-card">
              <div className="card-body">
                <h2 className="rp-card-heading">
                  <FaInfoCircle aria-hidden="true" />
                  Webhook configuration
                </h2>
                <p className="text-muted mb-3">
                  Add this endpoint in your Razorpay dashboard to receive payment notifications.
                </p>
                <div className="rp-webhook-field">
                  <code className="rp-webhook-url">{webhookUrl}</code>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                    onClick={() => copyToClipboard(webhookUrl)}
                    title="Copy webhook URL"
                    aria-label="Copy webhook URL"
                  >
                    {copiedCard ? <FaCheck className="text-success" /> : <FaCopy />}
                    {copiedCard ? "Copied" : "Copy"}
                  </button>
                </div>
                {showWebhookWarning && (
                  <div
                    className="alert alert-warning py-2 px-3 mt-3 mb-0 small d-flex align-items-center gap-2"
                    data-testid="webhook-warning-card"
                  >
                    <FaExclamationTriangle className="flex-shrink-0" />
                    <span>{WEBHOOK_LOCALHOST_WARNING_MESSAGE}</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    ) : (
      <section className="rp-disabled-state">
        <FaToggleOff className="text-muted" style={{ fontSize: "3rem" }} />
        <h2>Razorpay Gateway is Disabled</h2>
        <p>Enable the gateway to configure payment settings.</p>
        <button
          className="btn btn-success"
          onClick={handleToggleGateway}
          disabled={toggling}
        >
          {toggling ? <FaSpinner className="spin me-2" /> : <FaToggleOn className="me-2" />}
          Enable Razorpay Gateway
        </button>
      </section>
    )}
    </div>
  );
};

export default RazorpayConfiguration;
