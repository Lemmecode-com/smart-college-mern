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

const RazorpayConfiguration = () => {
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

      if (response.data.configured) {
        setConfig(response.data.config);
        setFormData({
          keyId: response.data.config.credentials.keyId || "",
          keySecret: "",
          webhookSecret: "",
          testMode: response.data.config.isTestMode,
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
      console.error("Save error:", error);
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
      console.error("Verify error:", error);
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
      console.error("Test error:", error);
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
      console.error("Delete error:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete configuration",
      );
    } finally {
      setSaving(false);
    }
  };

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
    <div
      className="razorpay-config-page"
      style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft className="me-2" />
            Back
          </button>
          <div>
            <h2 className="fw-bold mb-1">
              <FaCreditCard className="me-2 text-primary" />
              Razorpay Configuration
            </h2>
            <p className="text-muted mb-0">
              Configure Razorpay payment gateway for your college
            </p>
          </div>
        </div>

        {config && (
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success">
              <FaCheckCircle className="me-1" />
              Active
            </span>
            {config.isTestMode && (
              <span className="badge bg-warning text-dark">
                <FaFlask className="me-1" />
                Test Mode
              </span>
            )}
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-4">
            <FaKey className="me-2 text-primary" />
            API Credentials
          </h5>

          {/* Mode Toggle */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Mode</label>
            <div className="d-flex align-items-center gap-3">
              <button
                className={`btn ${formData.testMode ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, testMode: true }));
                  setIsModified(true);
                }}
              >
                <FaFlask className="me-2" />
                Test Mode
              </button>
              <button
                className={`btn ${!formData.testMode ? "btn-success" : "btn-outline-secondary"}`}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, testMode: false }));
                  setIsModified(true);
                }}
              >
                <FaRocket className="me-2" />
                Live Mode
              </button>
              <FaInfoCircle className="text-muted" />
              <span className="text-muted small">
                {formData.testMode
                  ? "Using test keys - no real transactions"
                  : "Using live keys - real transactions"}
              </span>
            </div>
          </div>

          {/* Key ID */}
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Key ID
              <span className="text-danger ms-1">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              name="keyId"
              value={formData.keyId}
              onChange={handleInputChange}
              placeholder={
                formData.testMode ? "rzp_test_xxxxx" : "rzp_live_xxxxx"
              }
              disabled={saving}
            />
            <small className="text-muted">
              {formData.testMode
                ? "Starts with rzp_test_"
                : "Starts with rzp_live_"}
            </small>
          </div>

          {/* Key Secret */}
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Key Secret
              <span className="text-danger ms-1">*</span>
            </label>
            <div className="input-group">
              <input
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
              >
                {showSecret ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <small className="text-muted">
              <FaLock className="me-1" />
              Encrypted before storage
            </small>
          </div>

          {/* Webhook Secret */}
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Webhook Secret
              <span className="text-danger ms-1">*</span>
            </label>
            <div className="input-group">
              <input
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
              >
                {showWebhookSecret ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <small className="text-muted">
              Used to verify webhook signatures
            </small>
          </div>

          {/* Action Buttons */}
          <div className="d-flex gap-2 mt-4">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !isModified}
            >
              {saving ? (
                <>
                  <FaSpinner className="spin me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  Save Configuration
                </>
              )}
            </button>

            {config && (
              <>
                <button
                  className="btn btn-outline-primary"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <FaSpinner className="spin me-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="me-2" />
                      Verify
                    </>
                  )}
                </button>

                <button
                  className="btn btn-outline-info"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <>
                      <FaSpinner className="spin me-2" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <FaPlug className="me-2" />
                      Test Connection
                    </>
                  )}
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
      </div>

      {/* Configuration Info */}
      {config && (
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">
              <FaServer className="me-2 text-primary" />
              Configuration Details
            </h5>

            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="text-muted small">Key ID</div>
                <div className="fw-semibold">{config.credentials.keyId}</div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="text-muted small">Status</div>
                <div>
                  <span className="badge bg-success">
                    <FaCheckCircle className="me-1" />
                    Active
                  </span>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="text-muted small">Mode</div>
                <div>
                  {config.isTestMode ? (
                    <span className="badge bg-warning text-dark">
                      <FaFlask className="me-1" />
                      Test
                    </span>
                  ) : (
                    <span className="badge bg-success">
                      <FaRocket className="me-1" />
                      Live
                    </span>
                  )}
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="text-muted small">Last Verified</div>
                <div className="fw-semibold">
                  {config.lastVerifiedAt ? (
                    <>
                      <FaCalendarAlt className="me-2 text-muted" />
                      {new Date(config.lastVerifiedAt).toLocaleString()}
                    </>
                  ) : (
                    <span className="text-muted">Not verified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook URL Info */}
      <div className="card shadow-sm mt-4 border-info">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3 text-info">
            <FaInfoCircle className="me-2" />
            Webhook Configuration
          </h5>
          <p className="mb-2">
            Configure this webhook URL in your Razorpay dashboard:
          </p>
          <div className="bg-light p-3 rounded font-monospace">
            {API_BASE_URL}/razorpay/webhook
          </div>
          <p className="text-muted small mt-2 mb-0">
            This allows Razorpay to send payment notifications to your
            application.
          </p>
        </div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RazorpayConfiguration;
