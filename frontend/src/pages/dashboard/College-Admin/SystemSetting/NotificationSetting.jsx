import React from "react";

const NotificationSetting = () => {
  return (
    <div className="container-fluid p-4" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <h4 className="fw-bold mb-1">Notification Settings</h4>
      <p className="text-muted mb-4">Control how system notifications are sent</p>

      <div className="card shadow-sm border-0">
        <div className="card-body">

          {/* CHANNELS */}
          <h6 className="fw-bold mb-3">Notification Channels</h6>

          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Email Notifications</label>
              <select className="form-select">
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">SMS Notifications</label>
              <select className="form-select">
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">In-App Notifications</label>
              <select className="form-select">
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>

          {/* RULES */}
          <h6 className="fw-bold mt-4 mb-3">Notification Rules</h6>

          <div className="mb-3">
            <label className="form-label">Send Attendance Alerts</label>
            <select className="form-select">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Disabled</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Fee Due Reminders</label>
            <select className="form-select">
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </div>

          <button className="btn btn-primary mt-3 px-4">Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSetting;