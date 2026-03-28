import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const FeeSetting = () => {
  const navigate = useNavigate();
  const [activeGateway, setActiveGateway] = useState("razorpay");

  const gateways = [
    { key: "paypal", label: "Paypal" },
    { key: "stripe", label: "Stripe" },
    { key: "razorpay", label: "Razorpay" },
    { key: "paytm", label: "Paytm" },
    { key: "payu", label: "PayU" },
    { key: "cashfree", label: "Cashfree" },
    { key: "instamojo", label: "InstaMojo" },
  ];

  // Gateway status: 'active' = functional, 'coming-soon' = not yet implemented
  const GATEWAY_STATUS = {
    stripe: "active",
    razorpay: "coming-soon",
    paypal: "coming-soon",
    paytm: "coming-soon",
    payu: "coming-soon",
    cashfree: "coming-soon",
    instamojo: "coming-soon",
  };

  // Handle gateway selection
  const handleGatewaySelect = (gatewayKey) => {
    if (gatewayKey === "stripe") {
      navigate("/system-settings/stripe-configuration");
    } else {
      setActiveGateway(gatewayKey);
    }
  };

  const renderGatewayFields = () => {
    switch (activeGateway) {
      case "paypal":
        return (
          <>
            <Input label="Paypal Username" />
            <Input label="Paypal Password" type="password" />
            <Input label="Paypal Signature" />
          </>
        );

      case "razorpay":
        return (
          <>
            <Input label="Razorpay Key ID" />
            <Input label="Razorpay Key Secret" />
          </>
        );

      case "paytm":
        return (
          <>
            <Input label="Paytm Merchant ID" />
            <Input label="Paytm Merchant Key" />
          </>
        );

      case "payu":
        return (
          <>
            <Input label="PayU Money Key" />
            <Input label="PayU Money Salt" />
          </>
        );

      case "cashfree":
        return (
          <>
            <Input label="App ID" />
            <Input label="Secret Key" />
          </>
        );

      case "instamojo":
        return (
          <>
            <Input label="Private API Key" />
            <Input label="Private Auth Token" />
            <Input label="Private Salt" />
          </>
        );

      default:
        return null;
    }
  };

  // Coming Soon Card Component
  const ComingSoonCard = ({ gatewayName }) => (
    <div
      className="card"
      style={{
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        border: "2px dashed #dee2e6",
      }}
    >
      <div className="card-body text-center py-5">
        <div className="mb-3">
          <i
            className="fas fa-tools"
            style={{ fontSize: "3rem", color: "#ffc107" }}
          ></i>
        </div>
        <h5 className="fw-bold mb-2">{gatewayName} Coming Soon!</h5>
        <p className="text-muted mb-4">
          We're working on integrating {gatewayName}. Stay tuned!
        </p>
        <button className="btn btn-outline-secondary" disabled>
          <i className="fas fa-ban me-2"></i>Not Available Yet
        </button>
      </div>
    </div>
  );

  // Check if gateway is coming soon
  const isComingSoon = GATEWAY_STATUS[activeGateway] === "coming-soon";

  return (
    <div
      className="container-fluid"
      style={{ background: "#f5f7fb", minHeight: "100vh", padding: "24px" }}
    >
      {/* HEADER */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Fee & Payment Settings</h4>
        <p className="text-muted mb-0">
          Configure payment gateways and processing fees
        </p>
      </div>

      {/* GATEWAY TABS */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {gateways.map((g) => (
          <button
            key={g.key}
            onClick={() => handleGatewaySelect(g.key)}
            className={`btn btn-sm ${
              activeGateway === g.key ? "btn-primary" : "btn-outline-secondary"
            }`}
            style={{ borderRadius: "6px" }}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="row">
        {/* LEFT FORM */}
        <div className="col-lg-8">
          {isComingSoon ? (
            <ComingSoonCard
              gatewayName={
                gateways.find((g) => g.key === activeGateway)?.label ||
                activeGateway
              }
            />
          ) : (
            <div
              className="card"
              style={{
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div className="card-body">
                <h6 className="fw-bold mb-3">
                  {activeGateway.toUpperCase()} Configuration
                </h6>

                {/* CONDITIONAL FIELDS */}
                {renderGatewayFields()}

                <hr />

                {/* FEES */}
                <h6 className="fw-bold mb-2">Processing Fees</h6>

                <div className="d-flex gap-4 mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="feeType"
                      defaultChecked
                    />
                    <label className="form-check-label">None</label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="feeType"
                    />
                    <label className="form-check-label">Percentage (%)</label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="feeType"
                    />
                    <label className="form-check-label">Fixed Amount</label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">
                    Percentage / Fixed Amount
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter value"
                  />
                </div>

                <button className="btn btn-primary px-4">Save Settings</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="col-lg-4">
          <div
            className="card"
            style={{
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div className="card-body">
              <h6 className="fw-bold mb-3">Select Payment Gateway</h6>

              {gateways.map((g) => (
                <div
                  key={g.key}
                  onClick={() => handleGatewaySelect(g.key)}
                  className="d-flex align-items-center justify-content-between p-2 mb-2 rounded"
                  style={{
                    cursor: "pointer",
                    background:
                      activeGateway === g.key ? "#e9ecef" : "transparent",
                  }}
                >
                  <div className="form-check" style={{ cursor: "pointer" }}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="gatewayRadio"
                      checked={activeGateway === g.key}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleGatewaySelect(g.key);
                      }}
                    />
                    <label
                      className="form-check-label"
                      style={{ cursor: "pointer" }}
                    >
                      {g.label}
                    </label>
                  </div>
                  {GATEWAY_STATUS[g.key] === "active" ? (
                    <span className="badge bg-success">Active</span>
                  ) : (
                    <span className="badge bg-warning text-dark">
                      Coming Soon
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, type = "text" }) => (
  <div className="mb-3">
    <label className="form-label">
      {label} <span style={{ color: "red" }}>*</span>
    </label>
    <input
      type={type}
      className="form-control"
      placeholder={`Enter ${label}`}
    />
  </div>
);

export default FeeSetting;
