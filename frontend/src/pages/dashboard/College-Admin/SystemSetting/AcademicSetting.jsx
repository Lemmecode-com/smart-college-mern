import React, { useState } from "react";
import {
  FaBookOpen,
  FaClipboardCheck,
  FaStar,
  FaClock,
  FaSave,
  FaUndo,
  FaInfoCircle,
  FaCheck,
} from "react-icons/fa";

const AcademicSetting = () => {
  const [formData, setFormData] = useState({
    // Attendance Rules
    minAttendance: "75",
    graceAttendance: "5",
    attendanceCalculation: "session-wise",
    autoBlockExam: "yes",
    lateAttendanceTime: "10",
    autoMarkAbsentAfter: "session-end",

    // Grading Rules
    gradingSystem: "cgpa",
    allowGraceMarks: "yes",
    maxGraceMarks: "5",
    internalExternalSplit: "30 + 70",
    roundOffMarks: "enabled",

    // Session & Timetable
    maxLecturesPerDay: "6",
    lectureDuration: "60",
    breakDuration: "15",
    autoCloseSession: "enabled",
    teacherSessionEdit: "before-session-end",
    studentAttendanceVisibility: "real-time",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsModified(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsModified(false);
    }, 1500);
  };

  const handleReset = () => {
    setFormData({
      minAttendance: "75",
      graceAttendance: "5",
      attendanceCalculation: "session-wise",
      autoBlockExam: "yes",
      lateAttendanceTime: "10",
      autoMarkAbsentAfter: "session-end",
      gradingSystem: "cgpa",
      allowGraceMarks: "yes",
      maxGraceMarks: "5",
      internalExternalSplit: "30 + 70",
      roundOffMarks: "enabled",
      maxLecturesPerDay: "6",
      lectureDuration: "60",
      breakDuration: "15",
      autoCloseSession: "enabled",
      teacherSessionEdit: "before-session-end",
      studentAttendanceVisibility: "real-time",
    });
    setIsModified(false);
  };

  return (
    <>
      <style>{`
        /* Academic Settings - Enterprise SaaS Professional UI */
        :root {
          --as-teal-dark: #0f3a4a;
          --as-teal-medium: #0c2d3a;
          --as-cyan-primary: #3db5e6;
          --as-cyan-light: #4fc3f7;
          --as-cyan-glow: rgba(61, 181, 230, 0.15);
          --as-bg-primary: #f5f7fb;
          --as-bg-card: #ffffff;
          --as-text-primary: #1a202c;
          --as-text-secondary: #4a5568;
          --as-text-muted: #718096;
          --as-attendance-accent: #38a169;
          --as-grading-accent: #ed8936;
          --as-session-accent: #805ad5;
          --as-radius-md: 0.5rem;
          --as-radius-lg: 0.75rem;
          --as-radius-xl: 1rem;
          --as-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --as-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
          --as-transition-base: 0.25s ease;
          --as-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .academic-settings-page {
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
          background: linear-gradient(135deg, var(--as-teal-dark) 0%, var(--as-teal-medium) 100%);
          border-radius: var(--as-radius-xl);
          box-shadow: var(--as-shadow-lg);
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
          border-radius: var(--as-radius-lg);
          background: linear-gradient(135deg, var(--as-cyan-primary), var(--as-cyan-light));
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

        .btn-reset,
        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--as-radius-md);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--as-transition-base);
          border: none;
          outline: none;
        }

        .btn-reset {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          backdrop-filter: blur(10px);
        }

        .btn-reset:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        .btn-save {
          background: linear-gradient(135deg, var(--as-cyan-primary), var(--as-cyan-light));
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
        }

        .btn-save:hover:not(:disabled) {
          box-shadow: 0 6px 25px rgba(61, 181, 230, 0.5);
          transform: translateY(-2px);
        }

        .btn-save-modified {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(61, 181, 230, 0.35);
          }
          50% {
            box-shadow: 0 4px 25px rgba(61, 181, 230, 0.6);
          }
        }

        .btn-reset:disabled,
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

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .settings-card {
          background: var(--as-bg-card);
          border-radius: var(--as-radius-xl);
          box-shadow: var(--as-shadow-md);
          overflow: hidden;
          transition: all var(--as-transition-slow);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .settings-card:hover {
          box-shadow: var(--as-shadow-lg);
          transform: translateY(-4px);
        }

        .card-attendance { border-top: 4px solid var(--as-attendance-accent); }
        .card-grading { border-top: 4px solid var(--as-grading-accent); }
        .card-session { border-top: 4px solid var(--as-session-accent); }

        .card-header-custom {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.5));
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }

        .card-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: var(--as-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--as-transition-base);
        }

        .card-icon {
          font-size: 1.25rem;
          color: #ffffff;
        }

        .icon-attendance {
          background: linear-gradient(135deg, var(--as-attendance-accent), #68d391);
          box-shadow: 0 4px 12px rgba(56, 161, 105, 0.3);
        }

        .icon-grading {
          background: linear-gradient(135deg, var(--as-grading-accent), #f6ad55);
          box-shadow: 0 4px 12px rgba(237, 137, 54, 0.3);
        }

        .icon-session {
          background: linear-gradient(135deg, var(--as-session-accent), #9f7aea);
          box-shadow: 0 4px 12px rgba(128, 90, 213, 0.3);
        }

        .settings-card:hover .card-icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--as-text-primary);
          margin: 0;
          letter-spacing: -0.3px;
        }

        .card-body-custom {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .form-row-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--as-text-primary);
          margin-bottom: 0.5rem;
        }

        .info-icon {
          color: var(--as-cyan-primary);
          cursor: help;
          transition: color 0.15s ease;
        }

        .info-icon:hover {
          color: var(--as-cyan-light);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          padding-right: 80px;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--as-text-primary);
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: var(--as-radius-md);
          transition: all 0.15s ease;
          outline: none;
        }

        .form-input:hover {
          border-color: #cbd5e0;
        }

        .form-input:focus {
          border-color: var(--as-cyan-primary);
          box-shadow: 0 0 0 4px var(--as-cyan-glow);
        }

        .input-suffix {
          position: absolute;
          right: 0.75rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--as-text-muted);
          pointer-events: none;
        }

        .select-wrapper {
          position: relative;
        }

        .form-select {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--as-text-primary);
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: var(--as-radius-md);
          transition: all 0.15s ease;
          outline: none;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23718096' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 40px;
        }

        .form-select:hover {
          border-color: #cbd5e0;
        }

        .form-select:focus {
          border-color: var(--as-cyan-primary);
          box-shadow: 0 0 0 4px var(--as-cyan-glow);
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--as-text-muted);
          margin-top: 0.25rem;
          font-weight: 400;
        }

        .badge-info {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: rgba(61, 181, 230, 0.1);
          color: var(--as-cyan-primary);
          border-radius: var(--as-radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .modified-indicator {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--as-teal-dark), var(--as-teal-medium));
          color: #ffffff;
          border-radius: var(--as-radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s var(--as-transition-slow) forwards;
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
          color: var(--as-cyan-light);
          font-size: 1.125rem;
        }

        .btn-save-small {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: linear-gradient(135deg, var(--as-cyan-primary), var(--as-cyan-light));
          color: #ffffff;
          border: none;
          border-radius: var(--as-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--as-transition-base);
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .btn-save-small:hover {
          box-shadow: 0 4px 16px rgba(61, 181, 230, 0.5);
          transform: translateY(-1px);
        }

        .btn-icon-small {
          font-size: 0.875rem;
        }

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
        }

        @media (max-width: 768px) {
          .academic-settings-page {
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
          
          .btn-reset,
          .btn-save {
            width: 100%;
            justify-content: center;
          }
          
          .form-row,
          .form-row-3,
          .form-row-4 {
            grid-template-columns: 1fr;
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
        .form-select:focus,
        .btn-reset:focus,
        .btn-save:focus,
        .btn-save-small:focus {
          outline: 2px solid var(--as-cyan-primary);
          outline-offset: 2px;
        }
      `}</style>

      <div className="academic-settings-page">
        {/* ================= PAGE HEADER ================= */}
        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <FaBookOpen className="header-icon" />
            </div>
            <div className="header-text">
              <h2 className="settings-title">Academic Settings</h2>
              <p className="settings-subtitle">
                Configure academic rules, attendance policies, grading, and
                session management
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-reset"
              onClick={handleReset}
              disabled={isSaving || !isModified}
            >
              <FaUndo className="btn-icon" />
              <span>Reset</span>
            </button>
            <button
              className={`btn-save ${isModified ? "btn-save-modified" : ""}`}
              onClick={handleSave}
              disabled={isSaving || !isModified}
            >
              {isSaving ? (
                <>
                  <span className="spinner-icon" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaCheck className="btn-icon" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= SETTINGS CARDS ================= */}
        <div className="settings-grid">
          {/* ================= ATTENDANCE RULES ================= */}
          <div className="settings-card card-attendance">
            <div className="card-header-custom">
              <div className="card-icon-wrapper icon-attendance">
                <FaClipboardCheck className="card-icon" />
              </div>
              <h3 className="card-title">Attendance Rules</h3>
            </div>
            <div className="card-body-custom">
              <div className="badge-info">
                <FaInfoCircle />
                <span>Student Attendance Configuration</span>
              </div>

              <div className="form-row-4">
                <div className="form-group">
                  <label className="form-label">
                    <span>Minimum Attendance (%)</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="minAttendance"
                      value={formData.minAttendance}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="75"
                      min="0"
                      max="100"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                  <small className="form-hint">
                    Required for exam eligibility
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Grace Attendance (%)</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="graceAttendance"
                      value={formData.graceAttendance}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="5"
                      min="0"
                      max="20"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                  <small className="form-hint">Condonation limit</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Calculation Type</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="attendanceCalculation"
                      value={formData.attendanceCalculation}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="daily">Daily</option>
                      <option value="session-wise">Session Wise</option>
                      <option value="subject-wise">Subject Wise</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Auto Block Exam</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="autoBlockExam"
                      value={formData.autoBlockExam}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="yes">Yes - Auto block</option>
                      <option value="no">No - Manual review</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span>Late Attendance Time</span>
                    <FaInfoCircle
                      className="info-icon"
                      title="Time window to mark late attendance"
                    />
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="lateAttendanceTime"
                      value={formData.lateAttendanceTime}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="10"
                      min="0"
                      max="60"
                    />
                    <span className="input-suffix">mins</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Auto Mark Absent After</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="autoMarkAbsentAfter"
                      value={formData.autoMarkAbsentAfter}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="session-end">Session End</option>
                      <option value="fixed-time">Fixed Time</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= GRADING RULES ================= */}
          <div className="settings-card card-grading">
            <div className="card-header-custom">
              <div className="card-icon-wrapper icon-grading">
                <FaStar className="card-icon" />
              </div>
              <h3 className="card-title">Grading Rules</h3>
            </div>
            <div className="card-body-custom">
              <div className="badge-info">
                <FaInfoCircle />
                <span>Examination & Grading Configuration</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span>Grading System</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="gradingSystem"
                      value={formData.gradingSystem}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="cgpa">CGPA (10-point)</option>
                      <option value="grade-based">Grade Based (A/B/C)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Allow Grace Marks</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="allowGraceMarks"
                      value={formData.allowGraceMarks}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="yes">Yes - Enable grace marks</option>
                      <option value="no">No - Strict grading</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span>Max Grace Marks</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="maxGraceMarks"
                      value={formData.maxGraceMarks}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="5"
                      min="0"
                      max="10"
                    />
                    <span className="input-suffix">marks</span>
                  </div>
                  <small className="form-hint">Per subject maximum</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Internal + External Split</span>
                  </label>
                  <input
                    type="text"
                    name="internalExternalSplit"
                    value={formData.internalExternalSplit}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="30 + 70"
                    style={{ paddingRight: "0.75rem" }}
                  />
                  <small className="form-hint">Marks distribution</small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Round Off Marks</span>
                </label>
                <div className="select-wrapper">
                  <select
                    name="roundOffMarks"
                    value={formData.roundOffMarks}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="enabled">
                      Enabled - Round to nearest integer
                    </option>
                    <option value="disabled">Disabled - Keep decimals</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ================= SESSION & TIMETABLE ================= */}
          <div className="settings-card card-session">
            <div className="card-header-custom">
              <div className="card-icon-wrapper icon-session">
                <FaClock className="card-icon" />
              </div>
              <h3 className="card-title">Session & Timetable</h3>
            </div>
            <div className="card-body-custom">
              <div className="badge-info">
                <FaInfoCircle />
                <span>Class Schedule & Session Management</span>
              </div>

              <div className="form-row-4">
                <div className="form-group">
                  <label className="form-label">
                    <span>Max Lectures/Day</span>
                  </label>
                  <input
                    type="number"
                    name="maxLecturesPerDay"
                    value={formData.maxLecturesPerDay}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="6"
                    min="1"
                    max="12"
                    style={{ paddingRight: "0.75rem" }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Lecture Duration</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="lectureDuration"
                      value={formData.lectureDuration}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="60"
                      min="15"
                      max="180"
                    />
                    <span className="input-suffix">mins</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Break Duration</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="breakDuration"
                      value={formData.breakDuration}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="15"
                      min="5"
                      max="120"
                    />
                    <span className="input-suffix">mins</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Auto Close Session</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="autoCloseSession"
                      value={formData.autoCloseSession}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span>Teacher Session Edit</span>
                    <FaInfoCircle
                      className="info-icon"
                      title="When teachers can modify attendance"
                    />
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="teacherSessionEdit"
                      value={formData.teacherSessionEdit}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="before-session-end">
                        Before Session End
                      </option>
                      <option value="after-session-end">
                        After Session End
                      </option>
                      <option value="not-allowed">Not Allowed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Student Attendance Visibility</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="studentAttendanceVisibility"
                      value={formData.studentAttendanceVisibility}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="real-time">Real Time</option>
                      <option value="end-of-day">End of Day</option>
                      <option value="end-of-term">End of Term</option>
                    </select>
                  </div>
                </div>
              </div>
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

export default AcademicSetting;
