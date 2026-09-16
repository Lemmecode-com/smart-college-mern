import React, { useState, useEffect, useCallback } from "react";
import {
  FaUsers,
  FaShieldAlt,
  FaDatabase,
  FaPalette,
  FaSave,
  FaUndo,
  FaInfoCircle,
  FaCheck,
} from "react-icons/fa";
import { getGeneralSettings, updateGeneralSettings } from "../../../../api/generalSettings";
import { showSuccess, showError } from "../../../../utils/toast";
import Breadcrumb from "../../../../components/Breadcrumb";

const GeneralSetting = () => {
  const [formData, setFormData] = useState({
    autoDisableInactiveDays: "180",
    allowMultipleLogins: "restricted",
    passwordExpiryDays: "90",
    minPasswordLength: "8",
    maxLoginAttempts: "5",
    allowDataExport: "restricted",
    backupFrequency: "daily",
    defaultTheme: "light",
    dateFormat: "DD-MM-YYYY",
    currency: "INR",
    itemsPerPage: "25",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await getGeneralSettings();
      const settings = data;
      setFormData({
        autoDisableInactiveDays: String(settings.autoDisableInactiveDays ?? 180),
        allowMultipleLogins: settings.allowMultipleLogins ?? "restricted",
        passwordExpiryDays: String(settings.passwordExpiryDays ?? 90),
        minPasswordLength: String(settings.minPasswordLength ?? 8),
        maxLoginAttempts: String(settings.maxLoginAttempts ?? 5),
        allowDataExport: settings.allowDataExport ?? "restricted",
        backupFrequency: settings.backupFrequency ?? "daily",
        defaultTheme: settings.defaultTheme ?? "light",
        dateFormat: settings.dateFormat ?? "DD-MM-YYYY",
        currency: settings.currency ?? "INR",
        itemsPerPage: String(settings.itemsPerPage ?? 25),
      });
      setIsModified(false);
    } catch (err) {
      setFetchError(err?.response?.data?.error?.message || "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsModified(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        allowMultipleLogins: formData.allowMultipleLogins,
        autoDisableInactiveDays: Number(formData.autoDisableInactiveDays),
        passwordExpiryDays: Number(formData.passwordExpiryDays),
        minPasswordLength: Number(formData.minPasswordLength),
        maxLoginAttempts: Number(formData.maxLoginAttempts),
        allowDataExport: formData.allowDataExport,
        backupFrequency: formData.backupFrequency,
        defaultTheme: formData.defaultTheme,
        dateFormat: formData.dateFormat,
        currency: formData.currency,
        itemsPerPage: Number(formData.itemsPerPage),
      };
      await updateGeneralSettings(payload);
      showSuccess("Settings saved successfully");
      setIsModified(false);
    } catch (err) {
      showError(err?.response?.data?.error?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      autoDisableInactiveDays: "180",
      allowMultipleLogins: "restricted",
      passwordExpiryDays: "90",
      minPasswordLength: "8",
      maxLoginAttempts: "5",
      allowDataExport: "restricted",
      backupFrequency: "daily",
      defaultTheme: "light",
      dateFormat: "DD-MM-YYYY",
      currency: "INR",
      itemsPerPage: "25",
    });
    setIsModified(false);
  };

  if (isLoading) {
    return (
      <div className="general-settings-page">
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#718096" }}>
          Loading settings...
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="general-settings-page">
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#e53e3e" }}>
          {fetchError}
          <button
            onClick={fetchSettings}
            style={{
              marginLeft: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "none",
              background: "#3db5e6",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* General Settings - Enterprise SaaS Professional UI */
        :root {
          --gs-teal-dark: #0f3a4a;
          --gs-teal-medium: #0c2d3a;
          --gs-cyan-primary: #3db5e6;
          --gs-cyan-light: #4fc3f7;
          --gs-cyan-glow: rgba(61, 181, 230, 0.15);
          --gs-bg-primary: #f5f7fb;
          --gs-bg-card: #ffffff;
          --gs-text-primary: #1a202c;
          --gs-text-secondary: #4a5568;
          --gs-text-muted: #718096;
          --gs-users-accent: #3db5e6;
          --gs-security-accent: #e53e3e;
          --gs-data-accent: #38a169;
          --gs-ui-accent: #3182ce;
          --gs-radius-md: 0.5rem;
          --gs-radius-lg: 0.75rem;
          --gs-radius-xl: 1rem;
          --gs-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --gs-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.12);
          --gs-transition-base: 0.25s ease;
          --gs-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .general-settings-page {
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
          background: linear-gradient(135deg, var(--gs-teal-dark) 0%, var(--gs-teal-medium) 100%);
          border-radius: var(--gs-radius-xl);
          box-shadow: var(--gs-shadow-lg);
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
          border-radius: var(--gs-radius-lg);
          background: linear-gradient(135deg, var(--gs-cyan-primary), var(--gs-cyan-light));
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
          border-radius: var(--gs-radius-md);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--gs-transition-base);
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
          background: linear-gradient(135deg, var(--gs-cyan-primary), var(--gs-cyan-light));
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
          background: var(--gs-bg-card);
          border-radius: var(--gs-radius-xl);
          box-shadow: var(--gs-shadow-md);
          overflow: hidden;
          transition: all var(--gs-transition-slow);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .settings-card:hover {
          box-shadow: var(--gs-shadow-lg);
          transform: translateY(-4px);
        }

        .card-users { border-top: 4px solid var(--gs-users-accent); }
        .card-security { border-top: 4px solid var(--gs-security-accent); }
        .card-data { border-top: 4px solid var(--gs-data-accent); }
        .card-ui { border-top: 4px solid var(--gs-ui-accent); }

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
          border-radius: var(--gs-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--gs-transition-base);
        }

        .card-icon {
          font-size: 1.25rem;
          color: #ffffff;
        }

        .icon-users {
          background: linear-gradient(135deg, var(--gs-users-accent), var(--gs-cyan-light));
          box-shadow: 0 4px 12px rgba(61, 181, 230, 0.3);
        }

        .icon-security {
          background: linear-gradient(135deg, var(--gs-security-accent), #fc8181);
          box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3);
        }

        .icon-data {
          background: linear-gradient(135deg, var(--gs-data-accent), #68d391);
          box-shadow: 0 4px 12px rgba(56, 161, 105, 0.3);
        }

        .icon-ui {
          background: linear-gradient(135deg, var(--gs-ui-accent), #63b3ed);
          box-shadow: 0 4px 12px rgba(49, 130, 206, 0.3);
        }

        .settings-card:hover .card-icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--gs-text-primary);
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

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gs-text-primary);
          margin-bottom: 0.5rem;
        }

        .info-icon {
          color: var(--gs-cyan-primary);
          cursor: help;
          transition: color 0.15s ease;
        }

        .info-icon:hover {
          color: var(--gs-cyan-light);
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
          color: var(--gs-text-primary);
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: var(--gs-radius-md);
          transition: all 0.15s ease;
          outline: none;
        }

        .form-input:hover {
          border-color: #cbd5e0;
        }

        .form-input:focus {
          border-color: var(--gs-cyan-primary);
          box-shadow: 0 0 0 4px var(--gs-cyan-glow);
        }

        .input-suffix {
          position: absolute;
          right: 0.75rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--gs-text-muted);
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
          color: var(--gs-text-primary);
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: var(--gs-radius-md);
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
          border-color: var(--gs-cyan-primary);
          box-shadow: 0 0 0 4px var(--gs-cyan-glow);
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--gs-text-muted);
          margin-top: 0.25rem;
          font-weight: 400;
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
          background: linear-gradient(135deg, var(--gs-teal-dark), var(--gs-teal-medium));
          color: #ffffff;
          border-radius: var(--gs-radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s var(--gs-transition-slow) forwards;
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
          color: var(--gs-cyan-light);
          font-size: 1.125rem;
        }

        .btn-save-small {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.75rem;
          background: linear-gradient(135deg, var(--gs-cyan-primary), var(--gs-cyan-light));
          color: #ffffff;
          border: none;
          border-radius: var(--gs-radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--gs-transition-base);
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
          .general-settings-page {
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
          
          .form-row {
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
          outline: 2px solid var(--gs-cyan-primary);
          outline-offset: 2px;
        }
/* =========================================================
   GENERAL SETTINGS - MOBILE & TABLET RESPONSIVE
   Desktop remains completely unchanged
   ========================================================= */


/* =========================================================
   TABLET : 769px - 1024px
   ========================================================= */

@media (min-width: 769px) and (max-width: 1024px) {

  .general-settings-page {
    padding: 1rem;
    overflow-x: hidden;
  }

  /* ---------- Breadcrumb ---------- */

  .general-settings-page > div:first-of-type {
    overflow: hidden;
  }

  .general-settings-page > div:first-of-type > div {
    width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .general-settings-page > div:first-of-type > div::-webkit-scrollbar {
    display: none;
  }


  /* ---------- Page Banner ---------- */

  .settings-header {
    width: 100%;
    box-sizing: border-box;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 1.25rem;

    padding: 1.25rem;

    border-radius: 1rem;

    overflow: hidden;
  }

  .header-content {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 0.85rem;
  }

  .header-icon-wrapper {
    width: 58px;
    height: 58px;
    min-width: 58px;

    border-radius: 0.75rem;
  }

  .header-icon {
    font-size: 1.45rem;
  }

  .header-text {
    min-width: 0;
  }

  .settings-title {
    font-size: 1.5rem;
    line-height: 1.2;

    white-space: normal;
  }

  .settings-subtitle {
    max-width: 420px;

    font-size: 0.85rem;
    line-height: 1.45;
  }

  .header-actions {
    flex-shrink: 0;

    display: flex;
    gap: 0.6rem;

    width: auto;
  }

  .btn-reset,
  .btn-save {
    min-height: 44px;

    padding: 0.65rem 0.8rem;

    font-size: 0.8rem;

    white-space: nowrap;

    justify-content: center;
  }


  /* ---------- Settings Cards ---------- */

  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 1rem;
  }

  .settings-card {
    min-width: 0;
  }

  .card-header-custom {
    padding: 0.9rem 1rem;

    gap: 0.65rem;
  }

  .card-icon-wrapper {
    width: 42px;
    height: 42px;

    min-width: 42px;
  }

  .card-icon {
    font-size: 1.1rem;
  }

  .card-title {
    font-size: 1rem;
    line-height: 1.3;
  }

  .card-body-custom {
    padding: 1rem;
  }

  .form-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 0.65rem;
  }

  .form-group {
    min-width: 0;
  }

  .form-label {
    font-size: 0.8rem;
  }

  .form-input,
  .form-select {
    font-size: 0.85rem;

    padding: 0.65rem 0.7rem;
  }

  .form-input {
    padding-right: 60px;
  }

  .input-suffix {
    right: 0.65rem;
    font-size: 0.75rem;
  }

  .form-hint {
    font-size: 0.7rem;
  }
}


/* =========================================================
   MOBILE : 0px - 768px
   ========================================================= */

@media (max-width: 768px) {

  .general-settings-page {
    padding: 0.75rem;

    overflow-x: hidden;
  }


  /* ---------- Breadcrumb ---------- */

  .general-settings-page > div:first-of-type {
    width: 100% !important;

    height: auto !important;

    margin: 0.5rem auto 1rem !important;

    overflow: hidden;
  }

  .general-settings-page > div:first-of-type > div {
    width: 100% !important;

    overflow-x: auto;

    scrollbar-width: none;
  }

  .general-settings-page > div:first-of-type > div::-webkit-scrollbar {
    display: none;
  }


  /* ---------- Page Banner ---------- */

  .settings-header {
    width: 100%;
    box-sizing: border-box;

    display: flex;
    flex-direction: column;

    align-items: stretch;

    gap: 1rem;

    padding: 1rem;

    margin-bottom: 1rem;

    border-radius: 0.9rem;

    overflow: hidden;
  }

  .header-content {
    width: 100%;

    display: flex;
    flex-direction: column;

    align-items: center;

    gap: 0.65rem;

    text-align: center;
  }

  .header-icon-wrapper {
    width: 54px;
    height: 54px;

    min-width: 54px;

    border-radius: 0.75rem;
  }

  .header-icon {
    font-size: 1.35rem;
  }

  .header-text {
    width: 100%;
  }

  .settings-title {
    margin: 0;

    font-size: 1.35rem;

    line-height: 1.2;

    text-align: center;
  }

  .settings-subtitle {
    max-width: 100%;

    margin-top: 0.35rem;

    font-size: 0.8rem;

    line-height: 1.45;

    text-align: center;
  }


  /* ---------- Banner Buttons ---------- */

  .header-actions {
    width: 100%;

    display: grid;

    grid-template-columns: repeat(2, minmax(0, 1fr));

    gap: 0.6rem;
  }

  .btn-reset,
  .btn-save {
    width: 100%;

    min-height: 44px;

    padding: 0.6rem 0.4rem;

    font-size: 0.72rem;

    gap: 0.35rem;

    justify-content: center;

    white-space: nowrap;
  }

  .btn-icon {
    font-size: 0.8rem;
  }


  /* ---------- Cards ---------- */

  .settings-grid {
    display: grid;

    grid-template-columns: 1fr;

    gap: 0.9rem;

    margin-bottom: 1rem;
  }

  .settings-card {
    width: 100%;

    min-width: 0;

    border-radius: 0.9rem;
  }

  .card-header-custom {
    padding: 0.85rem 1rem;

    gap: 0.65rem;
  }

  .card-icon-wrapper {
    width: 42px;
    height: 42px;

    min-width: 42px;

    border-radius: 0.65rem;
  }

  .card-icon {
    font-size: 1.05rem;
  }

  .card-title {
    font-size: 1rem;

    line-height: 1.25;
  }

  .card-body-custom {
    padding: 1rem;
  }


  /* ---------- Forms ---------- */

  .form-row {
    grid-template-columns: 1fr;

    gap: 0;

    margin-bottom: 0;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-label {
    font-size: 0.8rem;

    line-height: 1.35;

    margin-bottom: 0.4rem;
  }

  .form-input,
  .form-select {
    width: 100%;

    min-height: 42px;

    box-sizing: border-box;

    font-size: 0.85rem;

    padding: 0.65rem 0.7rem;
  }

  .form-input {
    padding-right: 58px;
  }

  .form-select {
    padding-right: 36px;
  }

  .input-suffix {
    right: 0.65rem;

    font-size: 0.72rem;
  }

  .form-hint {
    font-size: 0.7rem;

    margin-top: 0.2rem;
  }


  /* ---------- Modified Indicator ---------- */

  .modified-indicator {
    left: 0.75rem;
    right: 0.75rem;

    bottom: 0.75rem;

    width: auto;

    box-sizing: border-box;

    padding: 0.7rem 0.85rem;

    gap: 0.65rem;

    justify-content: space-between;

    border-radius: 0.75rem;

    transform: none;

    flex-direction: row;

    text-align: left;
  }

  .indicator-content {
    min-width: 0;

    font-size: 0.75rem;
  }

  .btn-save-small {
    flex-shrink: 0;

    padding: 0.45rem 0.65rem;

    font-size: 0.72rem;
  }
}


/* =========================================================
   SMALL MOBILE : 0px - 420px
   ========================================================= */

@media (max-width: 420px) {

  .general-settings-page {
    padding: 0.6rem;
  }

  .settings-header {
    padding: 0.85rem;

    gap: 0.85rem;

    border-radius: 0.8rem;
  }

  .header-icon-wrapper {
    width: 48px;
    height: 48px;

    min-width: 48px;
  }

  .header-icon {
    font-size: 1.2rem;
  }

  .settings-title {
    font-size: 1.2rem;
  }

  .settings-subtitle {
    font-size: 0.72rem;

    line-height: 1.4;
  }

  .header-actions {
    gap: 0.45rem;
  }

  .btn-reset,
  .btn-save {
    min-height: 40px;

    padding: 0.5rem 0.3rem;

    font-size: 0.65rem;
  }

  .btn-icon {
    font-size: 0.7rem;
  }

  .card-header-custom {
    padding: 0.75rem 0.85rem;
  }

  .card-icon-wrapper {
    width: 38px;
    height: 38px;

    min-width: 38px;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .card-body-custom {
    padding: 0.85rem;
  }

  .form-input,
  .form-select {
    min-height: 40px;

    font-size: 0.8rem;
  }

  .modified-indicator {
    left: 0.6rem;
    right: 0.6rem;
    bottom: 0.6rem;
  }
}

      `}</style>

      <div className="general-settings-page">
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
                { label: "General Settings" },
              ]}
            />
          </div>
        </div>

        {/* ================= PAGE HEADER ================= */}
        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <FaPalette className="header-icon" />
            </div>
            <div className="header-text">
              <h2 className="settings-title">General Settings</h2>
              <p className="settings-subtitle">
                Configure global system behavior, security policies, and default
                preferences
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
          {/* ================= USER & ACCESS RULES ================= */}
          <div className="settings-card card-users">
            <div className="card-header-custom">
              <div className="card-icon-wrapper icon-users">
                <FaUsers className="card-icon" />
              </div>
              <h3 className="card-title">User & Access Rules</h3>
            </div>
            <div className="card-body-custom">
              <div className="form-group">
                <label className="form-label">
                  <span>Auto Disable Inactive Users (Days)</span>
                  <FaInfoCircle
                    className="info-icon"
                    title="Users will be disabled after this many days of inactivity"
                  />
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    name="autoDisableInactiveDays"
                    value={formData.autoDisableInactiveDays}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. 180"
                    min="1"
                    max="365"
                  />
                  <span className="input-suffix">days</span>
                </div>
                <small className="form-hint">Range: 1-365 days</small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Allow Multiple Logins</span>
                </label>
                <div className="select-wrapper">
                  <select
                    name="allowMultipleLogins"
                    value={formData.allowMultipleLogins}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="allowed">Allowed - Multiple devices</option>
                    <option value="restricted">
                      Restricted - Single session
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ================= SECURITY POLICIES ================= */}
          <div className="settings-card card-security">
            <div className="card-header-custom">
              <div className="card-icon-wrapper icon-security">
                <FaShieldAlt className="card-icon" />
              </div>
              <h3 className="card-title">Security Policies</h3>
            </div>
            <div className="card-body-custom">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span>Password Expiry</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="passwordExpiryDays"
                      value={formData.passwordExpiryDays}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="90"
                      min="1"
                      max="365"
                    />
                    <span className="input-suffix">days</span>
                  </div>
                  <small className="form-hint">Force password change</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Min Password Length</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      name="minPasswordLength"
                      value={formData.minPasswordLength}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="8"
                      min="6"
                      max="128"
                    />
                    <span className="input-suffix">chars</span>
                  </div>
                  <small className="form-hint">6-128 characters</small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Max Login Attempts</span>
                  <FaInfoCircle
                    className="info-icon"
                    title="Account locks after this many failed attempts"
                  />
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    name="maxLoginAttempts"
                    value={formData.maxLoginAttempts}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="5"
                    min="3"
                    max="10"
                  />
                  <span className="input-suffix">attempts</span>
                </div>
                <small className="form-hint">
                  Attempts before account lockout
                </small>
              </div>
            </div>
          </div>

          {/* ================= DATA & AUDIT CONTROLS ================= */}
          <div className="settings-card card-data">
            <div className="card-header-custom">
              <div className="card-icon-wrapper icon-data">
                <FaDatabase className="card-icon" />
              </div>
              <h3 className="card-title">Data & Audit Controls</h3>
            </div>
            <div className="card-body-custom">
              <div className="form-group">
                <label className="form-label">
                  <span>Allow Data Export</span>
                </label>
                <div className="select-wrapper">
                  <select
                    name="allowDataExport"
                    value={formData.allowDataExport}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="allowed">Allowed - Users can export</option>
                    <option value="restricted">
                      Restricted - Admin approval
                    </option>
                    <option value="disabled">Disabled - No exports</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Auto Backup Frequency</span>
                  <FaInfoCircle
                    className="info-icon"
                    title="Automated system backups schedule"
                  />
                </label>
                <div className="select-wrapper">
                  <select
                    name="backupFrequency"
                    value={formData.backupFrequency}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="hourly">Hourly - Every hour</option>
                    <option value="daily">
                      Daily - Once per day (Recommended)
                    </option>
                    <option value="weekly">Weekly - Once per week</option>
                    <option value="monthly">Monthly - Once per month</option>
                  </select>
                </div>
                <small className="form-hint">Automated system backups</small>
              </div>
            </div>
          </div>

          {/* ================= UI DEFAULTS & PREFERENCES ================= */}
          <div className="settings-card card-ui">
            <div className="card-header-custom">
              <div className="card-icon-wrapper icon-ui">
                <FaPalette className="card-icon" />
              </div>
              <h3 className="card-title">UI Defaults & Preferences</h3>
            </div>
            <div className="card-body-custom">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span>Default Theme</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="defaultTheme"
                      value={formData.defaultTheme}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="light">☀️ Light</option>
                      <option value="dark">🌙 Dark</option>
                      <option value="system">💻 System</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Date Format</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="dateFormat"
                      value={formData.dateFormat}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                      <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <span>Currency</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                      <option value="GBP">£ GBP</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Items Per Page</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      name="itemsPerPage"
                      value={formData.itemsPerPage}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="10">10 items</option>
                      <option value="25">25 items</option>
                      <option value="50">50 items</option>
                      <option value="100">100 items</option>
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

export default GeneralSetting;
