import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FaGraduationCap,
  FaSave,
  FaUndo,
  FaInfoCircle,
  FaCheck,
  FaClipboardCheck,
} from "react-icons/fa";
import {
  getPromotionPolicy,
  updatePromotionPolicy,
} from "../../../../api/promotion";

const PromotionSetting = () => {
  const [formData, setFormData] = useState({
    minAttendancePercentage: "75",
    scopedSemesters: [],
    effectiveFrom: "",
    isActive: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [loading, setLoading] = useState(true);

  const [semesterOptions] = useState([
    { value: 1, label: "Semester 1" },
    { value: 2, label: "Semester 2" },
    { value: 3, label: "Semester 3" },
    { value: 4, label: "Semester 4" },
    { value: 5, label: "Semester 5" },
    { value: 6, label: "Semester 6" },
    { value: 7, label: "Semester 7" },
    { value: 8, label: "Semester 8" },
  ]);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const res = await getPromotionPolicy();
      if (res.data) {
        const policy = res.data;
        setFormData({
          minAttendancePercentage: String(policy.minAttendancePercentage ?? 75),
          scopedSemesters: policy.scopedSemesters || [],
          effectiveFrom: policy.effectiveFrom
            ? new Date(policy.effectiveFrom).toISOString().split("T")[0]
            : "",
          isActive: policy.isActive ?? true,
        });
      }
    } catch (err) {
      toast.error("Failed to load promotion policy");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setIsModified(true);
  };

  const handleSemesterToggle = (semester) => {
    setFormData((prev) => {
      const current = prev.scopedSemesters || [];
      const updated = current.includes(semester)
        ? current.filter((s) => s !== semester)
        : [...current, semester];
      return { ...prev, scopedSemesters: updated };
    });
    setIsModified(true);
  };

  const handleSave = async () => {
    const percentage = parseInt(formData.minAttendancePercentage, 10);

    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Attendance percentage must be between 0 and 100");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        minAttendancePercentage: percentage,
        scopedSemesters: formData.scopedSemesters,
        isActive: formData.isActive,
      };

      if (formData.effectiveFrom) {
        payload.effectiveFrom = formData.effectiveFrom;
      }

      await updatePromotionPolicy(payload);
      toast.success("Promotion policy updated successfully");
      setIsModified(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update policy");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      minAttendancePercentage: "75",
      scopedSemesters: [],
      effectiveFrom: "",
      isActive: true,
    });
    setIsModified(false);
  };

  return (
    <>
      <style>{`
        .promotion-setting-page {
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
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          border-radius: 1rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
          position: relative;
          overflow: hidden;
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
          border-radius: 0.75rem;
          background: linear-gradient(135deg, #3db5e6, #4fc3f7);
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
          border-radius: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          border: none;
        }

        .btn-reset {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .btn-reset:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .btn-save {
          background: linear-gradient(135deg, #3db5e6, #4fc3f7);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.3);
        }

        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.4);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .settings-card {
          background: #ffffff;
          border-radius: 1rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          transition: box-shadow 0.25s ease;
        }

        .settings-card:hover {
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .card-icon {
          width: 40px;
          height: 40px;
          border-radius: 0.5rem;
          background: linear-gradient(135deg, #3db5e6, #4fc3f7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 1.125rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4a5568;
          margin-bottom: 0.375rem;
        }

        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.9375rem;
          transition: all 0.25s ease;
          outline: none;
        }

        .form-input:focus {
          border-color: #3db5e6;
          box-shadow: 0 0 0 3px rgba(61, 181, 230, 0.15);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .checkbox-group input[type="checkbox"] {
          width: 1.125rem;
          height: 1.125rem;
          accent-color: #3db5e6;
        }

        .semester-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }

        .semester-chip {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          text-align: center;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.25s ease;
          background: #ffffff;
          color: #4a5568;
        }

        .semester-chip:hover {
          border-color: #3db5e6;
          background: #f7fafc;
        }

        .semester-chip.active {
          background: linear-gradient(135deg, #3db5e6, #4fc3f7);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.3);
        }

        .info-box {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #ebf8ff;
          border-radius: 0.5rem;
          margin-top: 1rem;
          font-size: 0.875rem;
          color: #2c5282;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #718096;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3db5e6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className="promotion-setting-page">
        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <FaGraduationCap className="header-icon" />
            </div>
            <div className="header-text">
              <h1 className="settings-title">Promotion Settings</h1>
              <p className="settings-subtitle">
                Configure attendance rules for student promotion eligibility
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-reset" onClick={handleReset}>
              <FaUndo /> Reset
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={isSaving || !isModified}
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <FaSave /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading promotion policy...</p>
          </div>
        ) : (
          <div className="settings-grid">
            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon">
                  <FaGraduationCap />
                </div>
                <h3 className="card-title">Attendance Threshold</h3>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Minimum Attendance Percentage (%)
                </label>
                <input
                  type="number"
                  name="minAttendancePercentage"
                  value={formData.minAttendancePercentage}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                  max="100"
                  placeholder="75"
                />
                <div className="info-box">
                  <FaInfoCircle style={{ marginTop: 2 }} />
                  <span>
                    Students must have at least <strong>{formData.minAttendancePercentage}%</strong> attendance
                    to be eligible for promotion. Those below this threshold cannot be promoted
                    (unless an override is applied).
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Policy Effective From</label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>
                    Policy is active
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="card-header">
                <div className="card-icon">
                  <FaClipboardCheck />
                </div>
                <h3 className="card-title">Semester Scope (Optional)</h3>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Apply this policy only to selected semesters (leave empty for all)
                </label>
                <div className="semester-grid">
                  {semesterOptions.map((sem) => (
                    <div
                      key={sem.value}
                      className={`semester-chip ${
                        (formData.scopedSemesters || []).includes(sem.value)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleSemesterToggle(sem.value)}
                    >
                      {sem.label}
                    </div>
                  ))}
                </div>
                <div className="info-box">
                  <FaInfoCircle style={{ marginTop: 2 }} />
                  <span>
                    If semesters are selected, this attendance threshold applies only
                    to promotions from those semesters. When empty, it applies to all
                    semesters.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PromotionSetting;
