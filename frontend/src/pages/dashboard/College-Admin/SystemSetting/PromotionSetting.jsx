import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import ApiError from "../../../../components/ApiError";
import { logger } from "../../../../utils/logger";
import Breadcrumb from "../../../../components/Breadcrumb";

const PromotionSetting = () => {
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
  const [formData, setFormData] = useState({
    minAttendancePercentage: "75",
    scopedSemesters: [],
    effectiveFrom: "",
    isActive: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    setError(null);
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
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      logger.error("Error fetching promotion policy:", statusCode, errorCode);
      setError({
        message: backendMessage || "Failed to load promotion policy.",
        statusCode,
        errorCode,
      });
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
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error updating promotion policy:", statusCode, errorCode);
        return;
      }
      logger.error("Error updating promotion policy:", statusCode, errorCode);
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

        /* =========================================================
   PROMOTION SETTINGS
   MOBILE & TABLET RESPONSIVE
   DESKTOP REMAINS UNCHANGED
   ========================================================= */


/* =========================================================
   TABLET
   768px - 1024px
   ========================================================= */

@media (min-width: 768px) and (max-width: 1024px) {

  .promotion-setting-page {
    width: 100% !important;
    max-width: 100% !important;
    padding: 1rem !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  /* ---------- Breadcrumb ---------- */

  .promotion-setting-page > div:first-child {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    margin: 0 0 1rem !important;
    padding: 0 !important;
  }

  .promotion-setting-page .breadcrumb {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    white-space: nowrap !important;
    scrollbar-width: none !important;
  }

  .promotion-setting-page .breadcrumb::-webkit-scrollbar {
    display: none !important;
  }


  /* ---------- Header ---------- */

  .settings-header {
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 1.25rem !important;
    gap: 1.25rem !important;
    margin-bottom: 1.25rem !important;
  }

  .header-content {
    min-width: 0 !important;
    flex: 1 1 auto !important;
  }

  .header-text {
    min-width: 0 !important;
  }

  .settings-title {
    font-size: 1.5rem !important;
  }

  .settings-subtitle {
    font-size: 0.85rem !important;
    line-height: 1.4 !important;
  }

  .header-actions {
    flex-shrink: 0 !important;
  }

  .btn-reset,
  .btn-save {
    min-height: 40px !important;
    padding: 0.55rem 0.85rem !important;
    font-size: 0.85rem !important;
  }


  /* ---------- Settings Grid ---------- */

  .settings-grid {
    width: 100% !important;
    grid-template-columns: 1fr !important;
    gap: 1rem !important;
  }

  .settings-card {
    width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
    padding: 1.25rem !important;
  }


  /* ---------- Card Header ---------- */

  .card-header {
    margin-bottom: 1rem !important;
    padding-bottom: 0.7rem !important;
  }

  .card-icon {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    font-size: 1rem !important;
  }

  .card-title {
    font-size: 1rem !important;
  }


  /* ---------- Form ---------- */

  .form-group {
    margin-bottom: 0.9rem !important;
  }

  .form-label {
    font-size: 0.82rem !important;
  }

  .form-input {
    width: 100% !important;
    box-sizing: border-box !important;
    min-height: 42px !important;
    padding: 0.6rem 0.75rem !important;
    font-size: 0.9rem !important;
  }


  /* ---------- Semester ---------- */

  .semester-grid {
    grid-template-columns: repeat(4, 1fr) !important;
    gap: 0.5rem !important;
  }

  .semester-chip {
    padding: 0.55rem 0.35rem !important;
    font-size: 0.8rem !important;
  }


  /* ---------- Info Box ---------- */

  .info-box {
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 0.75rem !important;
    gap: 0.6rem !important;
    font-size: 0.8rem !important;
    line-height: 1.45 !important;
  }
}


/* =========================================================
   MOBILE
   0 - 767px
   ========================================================= */

@media (max-width: 767px) {

  .promotion-setting-page {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100vh !important;
    padding: 0.65rem !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }


  /* =====================================================
     BREADCRUMB
     ===================================================== */

  .promotion-setting-page > div:first-child {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 0 0.75rem !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }

  .promotion-setting-page .breadcrumb {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 44px !important;
    box-sizing: border-box !important;

    overflow-x: auto !important;
    overflow-y: hidden !important;

    white-space: nowrap !important;

    font-size: 0.78rem !important;

    scrollbar-width: none !important;
  }

  .promotion-setting-page .breadcrumb::-webkit-scrollbar {
    display: none !important;
  }


  /* =====================================================
     HEADER
     ===================================================== */

  .settings-header {
    width: 100% !important;
    box-sizing: border-box !important;

    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;

    gap: 1rem !important;

    padding: 1rem !important;
    margin-bottom: 1rem !important;

    border-radius: 14px !important;
  }


  /* Header content */

  .header-content {
    width: 100% !important;
    min-width: 0 !important;

    display: flex !important;
    align-items: center !important;

    gap: 0.75rem !important;
  }


  /* Header icon */

  .header-icon-wrapper {
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;

    border-radius: 12px !important;
  }

  .header-icon {
    font-size: 1.25rem !important;
  }


  /* Header text */

  .header-text {
    min-width: 0 !important;
    flex: 1 !important;
  }

  .settings-title {
    font-size: 1.25rem !important;
    line-height: 1.2 !important;
    letter-spacing: -0.2px !important;
  }

  .settings-subtitle {
    margin-top: 0.25rem !important;

    font-size: 0.75rem !important;
    line-height: 1.4 !important;

    opacity: 0.85 !important;
  }


  /* =====================================================
     HEADER ACTIONS
     Fixes Reset / Save overflow
     ===================================================== */

  .header-actions {
    width: 100% !important;

    display: grid !important;
    grid-template-columns: 1fr 1fr !important;

    gap: 0.6rem !important;

    box-sizing: border-box !important;
  }

  .btn-reset,
  .btn-save {
    width: 100% !important;
    min-width: 0 !important;

    min-height: 42px !important;

    padding: 0.65rem 0.75rem !important;

    justify-content: center !important;

    font-size: 0.82rem !important;

    border-radius: 9px !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     SETTINGS GRID
     Main horizontal overflow fix
     ===================================================== */

  .settings-grid {
    width: 100% !important;
    max-width: 100% !important;

    display: grid !important;
    grid-template-columns: minmax(0, 1fr) !important;

    gap: 0.85rem !important;

    box-sizing: border-box !important;
  }


  /* =====================================================
     SETTINGS CARD
     ===================================================== */

  .settings-card {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    box-sizing: border-box !important;

    padding: 0.95rem !important;

    border-radius: 14px !important;

    overflow: hidden !important;
  }


  /* =====================================================
     CARD HEADER
     ===================================================== */

  .card-header {
    width: 100% !important;
    min-width: 0 !important;

    display: flex !important;
    align-items: center !important;

    gap: 0.65rem !important;

    margin-bottom: 0.9rem !important;
    padding-bottom: 0.65rem !important;

    box-sizing: border-box !important;
  }


  .card-icon {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;

    border-radius: 9px !important;

    font-size: 1rem !important;
  }


  .card-title {
    min-width: 0 !important;

    font-size: 1rem !important;
    line-height: 1.25 !important;

    word-break: break-word !important;
  }


  /* =====================================================
     FORM
     ===================================================== */

  .form-group {
    width: 100% !important;
    max-width: 100% !important;

    margin-bottom: 0.85rem !important;

    box-sizing: border-box !important;
  }


  .form-label {
    width: 100% !important;

    font-size: 0.82rem !important;
    line-height: 1.35 !important;

    margin-bottom: 0.4rem !important;
  }


  .form-input {
    display: block !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    min-height: 44px !important;

    box-sizing: border-box !important;

    padding: 0.65rem 0.75rem !important;

    font-size: 0.88rem !important;

    border-radius: 9px !important;
  }


  /* =====================================================
     SEMESTER GRID
     ===================================================== */

  .semester-grid {
    width: 100% !important;
    max-width: 100% !important;

    display: grid !important;

    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;

    gap: 0.5rem !important;

    box-sizing: border-box !important;
  }


  .semester-chip {
    min-width: 0 !important;

    padding: 0.6rem 0.35rem !important;

    font-size: 0.76rem !important;

    line-height: 1.2 !important;

    box-sizing: border-box !important;

    overflow: hidden !important;

    text-overflow: ellipsis !important;

    white-space: nowrap !important;
  }


  /* =====================================================
     INFO BOX
     ===================================================== */

  .info-box {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    display: flex !important;
    align-items: flex-start !important;

    gap: 0.55rem !important;

    padding: 0.7rem !important;

    margin-top: 0.75rem !important;

    font-size: 0.76rem !important;

    line-height: 1.45 !important;

    box-sizing: border-box !important;

    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .info-box svg {
    flex-shrink: 0 !important;
  }

  .info-box span {
    min-width: 0 !important;
    overflow-wrap: anywhere !important;
  }


  /* =====================================================
     CHECKBOX
     ===================================================== */

  .checkbox-group {
    gap: 0.5rem !important;
  }

  .checkbox-group input[type="checkbox"] {
    width: 1rem !important;
    height: 1rem !important;
    flex-shrink: 0 !important;
  }

  .checkbox-group .form-label {
    margin: 0 !important;
    width: auto !important;
  }


  /* =====================================================
     LOADING
     ===================================================== */

  .loading-container {
    padding: 2rem 1rem !important;
    text-align: center !important;
  }

}


/* =========================================================
   SMALL MOBILE
   <= 400px
   ========================================================= */

@media (max-width: 400px) {

  .promotion-setting-page {
    padding: 0.5rem !important;
  }


  .settings-header {
    padding: 0.85rem !important;
    border-radius: 12px !important;
  }


  .header-icon-wrapper {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
  }


  .settings-title {
    font-size: 1.12rem !important;
  }


  .settings-subtitle {
    font-size: 0.7rem !important;
  }


  .header-actions {
    gap: 0.5rem !important;
  }


  .btn-reset,
  .btn-save {
    min-height: 40px !important;
    padding: 0.55rem 0.5rem !important;
    font-size: 0.76rem !important;
  }


  .settings-card {
    padding: 0.8rem !important;
    border-radius: 12px !important;
  }


  .card-icon {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    font-size: 0.9rem !important;
  }


  .card-title {
    font-size: 0.92rem !important;
  }


  .form-label {
    font-size: 0.78rem !important;
  }


  .form-input {
    min-height: 42px !important;
    font-size: 0.84rem !important;
  }


  .semester-chip {
    padding: 0.55rem 0.25rem !important;
    font-size: 0.7rem !important;
  }


  .info-box {
    padding: 0.6rem !important;
    font-size: 0.7rem !important;
  }

}
      `}</style>

      <div className="promotion-setting-page">
        {/* ================= BREADCRUMB ================= */}
        <div
          style={{
            width: "100%",
            margin: "10px auto",
            paddingTop: "2px",
            height: "60px",
          }}
        >
          <div style={{ width: "100%" }}>
            <Breadcrumb
              items={[
                { label: "Dashboard", path: "/dashboard" },
                { label: "System Settings" },
                { label: "Promotion Settings" },
              ]}
            />
          </div>
        </div>
      

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
