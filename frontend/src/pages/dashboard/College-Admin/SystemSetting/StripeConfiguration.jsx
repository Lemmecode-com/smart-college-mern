import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../api/axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * StripeConfiguration Component
 *
 * Allows college admins to configure Stripe payment gateway
 * for their institution with test/live mode support
 */
const StripeConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [config, setConfig] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [formData, setFormData] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    testMode: true,
  });

  // Fetch existing configuration on mount
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
          secretKey: "", // Don't populate secret for security
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
  };

  const validateKeys = () => {
    const { publishableKey, secretKey, testMode } = formData;

    if (!publishableKey || !secretKey) {
      toast.error("Both Publishable Key and Secret Key are required");
      return false;
    }

    // Validate key format
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
        "Are you sure you want to delete this configuration? Students won't be able to make payments.",
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
    } catch (error) {
      console.error("Error deleting config:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete configuration",
      );
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await api.get("/admin/stripe/test");

      toast.success(
        `Connected to Stripe! Balance: ${
          response.data.connection.balance.available
        } ${response.data.connection.balance.currency.toUpperCase()}`,
      );
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error(
        error.response?.data?.message || "Failed to connect to Stripe",
      );
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container-fluid"
      style={{ background: "#f5f7fb", minHeight: "100vh", padding: "24px" }}
    >
      {/* HEADER */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="d-flex align-items-center mb-2">
              <button
                className="btn btn-outline-secondary btn-sm me-2"
                onClick={() => navigate("/system-settings/fees")}
                style={{ borderRadius: "6px" }}
              >
                <i className="fas fa-arrow-left me-1"></i> Back
              </button>
            </div>
            <h4 className="fw-bold mb-1">Stripe Payment Configuration</h4>
            <p className="text-muted mb-0">
              Configure Stripe payment gateway for your college
            </p>
          </div>
          {config && (
            <div>
              <span
                className={`badge ${
                  config.isTestMode ? "bg-warning" : "bg-success"
                } me-2`}
              >
                {config.isTestMode ? "Test Mode" : "Live Mode"}
              </span>
              <span
                className={`badge ${
                  config.isActive ? "bg-success" : "bg-secondary"
                }`}
              >
                {config.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="row">
        {/* MAIN CONFIGURATION CARD */}
        <div className="col-lg-8">
          <div
            className="card"
            style={{
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div className="card-body">
              <h6 className="fw-bold mb-4">Stripe Credentials</h6>

              {/* Test/Live Mode Toggle */}
              <div className="form-check form-switch mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="testMode"
                  name="testMode"
                  checked={formData.testMode}
                  onChange={handleInputChange}
                  disabled={
                    config !== null &&
                    formData.publishableKey.startsWith("pk_live_")
                  }
                />
                <label className="form-check-label" htmlFor="testMode">
                  <strong>Test Mode</strong>
                  <small className="d-block text-muted">
                    Enable to use test keys (pk_test_*, sk_test_*). Disable for
                    live payments.
                  </small>
                </label>
              </div>

              {/* Publishable Key */}
              <div className="mb-3">
                <label className="form-label">
                  Publishable Key <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="publishableKey"
                  value={formData.publishableKey}
                  onChange={handleInputChange}
                  placeholder={
                    formData.testMode ? "pk_test_..." : "pk_live_..."
                  }
                  disabled={saving}
                />
                <small className="text-muted">
                  Starts with <code>pk_test_</code> or <code>pk_live_</code>
                </small>
              </div>

              {/* Secret Key */}
              <div className="mb-3">
                <label className="form-label">
                  Secret Key <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    type={showSecret ? "text" : "password"}
                    className="form-control"
                    name="secretKey"
                    value={formData.secretKey}
                    onChange={handleInputChange}
                    placeholder={
                      formData.testMode ? "sk_test_..." : "sk_live_..."
                    }
                    disabled={saving}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    <i
                      className={`fas ${
                        showSecret ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                <small className="text-muted">
                  Starts with <code>sk_test_</code> or <code>sk_live_</code>.
                  Encrypted before storage.
                </small>
              </div>

              {/* Webhook Secret (Optional) */}
              <div className="mb-4">
                <label className="form-label">
                  Webhook Secret{" "}
                  <span className="text-muted">(Optional but recommended)</span>
                </label>
                <div className="input-group">
                  <input
                    type={showWebhookSecret ? "text" : "password"}
                    className="form-control"
                    name="webhookSecret"
                    value={formData.webhookSecret}
                    onChange={handleInputChange}
                    placeholder="whsec_..."
                    disabled={saving}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  >
                    <i
                      className={`fas ${
                        showWebhookSecret ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                <small className="text-muted">
                  Starts with <code>whsec_</code>. Enables secure webhook
                  signature verification.
                </small>
              </div>

              {/* Action Buttons */}
              <div className="d-flex gap-2 flex-wrap">
                <button
                  className="btn btn-primary px-4"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>Save Configuration
                    </>
                  )}
                </button>

                <button
                  className="btn btn-outline-primary px-4"
                  onClick={handleVerify}
                  disabled={verifying || !config}
                >
                  {verifying ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check-circle me-2"></i>Verify
                    </>
                  )}
                </button>

                <button
                  className="btn btn-outline-info px-4"
                  onClick={handleTestConnection}
                  disabled={!config}
                >
                  <i className="fas fa-plug me-2"></i>Test Connection
                </button>

                {config && (
                  <button
                    className="btn btn-outline-danger px-4"
                    onClick={handleDelete}
                  >
                    <i className="fas fa-trash me-2"></i>Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR - STATUS & HELP */}
        <div className="col-lg-4">
          {/* Configuration Status */}
          {config && (
            <div className="card mb-3" style={{ borderRadius: "10px" }}>
              <div className="card-body">
                <h6 className="fw-bold mb-3">Configuration Status</h6>
                <div className="mb-2">
                  <small className="text-muted">Status</small>
                  <div className="d-flex align-items-center mt-1">
                    <span
                      className={`badge ${
                        config.isActive ? "bg-success" : "bg-secondary"
                      } me-2`}
                    ></span>
                    {config.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
                <div className="mb-2">
                  <small className="text-muted">Mode</small>
                  <div className="d-flex align-items-center mt-1">
                    <span
                      className={`badge ${
                        config.isTestMode
                          ? "bg-warning text-dark"
                          : "bg-success"
                      } me-2`}
                    ></span>
                    {config.isTestMode ? "Test" : "Live"}
                  </div>
                </div>
                {config.lastVerifiedAt && (
                  <div className="mb-2">
                    <small className="text-muted">Last Verified</small>
                    <div className="mt-1">
                      {new Date(config.lastVerifiedAt).toLocaleString()}
                    </div>
                  </div>
                )}
                <div className="mb-2">
                  <small className="text-muted">Created</small>
                  <div className="mt-1">
                    {new Date(config.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeConfiguration;
