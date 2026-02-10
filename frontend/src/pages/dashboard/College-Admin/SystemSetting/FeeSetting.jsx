import React, { useState } from "react";

const FeeSetting = () => {
  const [activeGateway, setActiveGateway] = useState("paypal");

  const gateways = [
    { key: "paypal", label: "Paypal" },
    { key: "stripe", label: "Stripe" },
    { key: "razorpay", label: "Razorpay" },
    { key: "paytm", label: "Paytm" },
    { key: "payu", label: "PayU" },
    { key: "cashfree", label: "Cashfree" },
    { key: "instamojo", label: "InstaMojo" }
  ];

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

      case "stripe":
        return (
          <>
            <Input label="Stripe API Secret Key" />
            <Input label="Stripe Publishable Key" />
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
        {gateways.map(g => (
          <button
            key={g.key}
            onClick={() => setActiveGateway(g.key)}
            className={`btn btn-sm ${
              activeGateway === g.key
                ? "btn-primary"
                : "btn-outline-secondary"
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
          <div
            className="card"
            style={{
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
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
                  <label className="form-check-label">
                    Percentage (%)
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="feeType"
                  />
                  <label className="form-check-label">
                    Fixed Amount
                  </label>
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

              <button className="btn btn-primary px-4">
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="col-lg-4">
          <div
            className="card"
            style={{
              borderRadius: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}
          >
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                Select Payment Gateway
              </h6>

              {gateways.map(g => (
                <div
                  key={g.key}
                  className="form-check mb-2"
                  style={{ cursor: "pointer" }}
                >
                  <input
                    className="form-check-input"
                    type="radio"
                    checked={activeGateway === g.key}
                    onChange={() => setActiveGateway(g.key)}
                  />
                  <label className="form-check-label">
                    {g.label}
                  </label>
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