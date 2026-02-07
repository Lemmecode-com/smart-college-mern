import React from "react";

const GeneralSetting = () => {
  return (
    <div
      className="container-fluid p-4"
      style={{ background: "#f5f7fb", minHeight: "100vh" }}
    >
      {/* HEADER */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1">General Settings</h4>
        <p className="text-muted mb-0">
          Configure global system behavior, security rules, and default preferences
        </p>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">

         

          {/* ================= USER & ACCESS RULES ================= */}
          <h6 className="fw-bold mb-3">User & Access Rules</h6>

          <div className="row mb-3">
           

            <div className="col-md-4">
              <label className="form-label">Auto Disable Inactive Users (Days)</label>
              <input type="number" className="form-control" placeholder="e.g. 180" />
            </div>

            <div className="col-md-4">
              <label className="form-label">Allow Multiple Logins</label>
              <select className="form-select">
                <option>Allowed</option>
                <option>Restricted</option>
              </select>
            </div>
          </div>

          <hr />

          {/* ================= SECURITY POLICIES ================= */}
          <h6 className="fw-bold mb-3">Security Policies</h6>

          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Password Expiry (Days)</label>
              <input type="number" className="form-control" placeholder="90" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Minimum Password Length</label>
              <input type="number" className="form-control" placeholder="8" />
            </div>

            <div className="col-md-3">
              <label className="form-label">Max Login Attempts</label>
              <input type="number" className="form-control" placeholder="5" />
            </div>

           
          </div>

          <hr />

          {/* ================= DATA & AUDIT ================= */}
          <h6 className="fw-bold mb-3">Data & Audit Controls</h6>

          <div className="row mb-3">
            

            <div className="col-md-4">
              <label className="form-label">Allow Data Export</label>
              <select className="form-select">
                <option>Allowed</option>
                <option>Restricted</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Auto Backup Frequency</label>
              <select className="form-select">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>

          <hr />

          {/* ================= UI & DEFAULTS ================= */}
          <h6 className="fw-bold mb-3">UI Defaults & Preferences</h6>

          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Default Theme</label>
              <select className="form-select">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Date Format</label>
              <select className="form-select">
                <option>DD-MM-YYYY</option>
                <option>MM-DD-YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Currency</label>
              <select className="form-select">
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Items Per Page</label>
              <select className="form-select">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
          </div>

          {/* SAVE */}
          <div className="text-end mt-4">
            <button className="btn btn-primary px-4">
              Save General Settings
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GeneralSetting;