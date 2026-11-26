import React, { useEffect, useState, useContext, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import ApiError from "../../../components/ApiError";
import Breadcrumb from "../../../components/Breadcrumb";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaUniversity,
  FaCalendarAlt,
  FaArrowLeft,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClipboardList,
  FaLayerGroup,
  FaBook,
  FaChalkboardTeacher,
  FaUsers,
  FaCheckCircle,
  FaQrcode,
  FaLink,
  FaCopy,
  FaPaperPlane,
  FaUserTie,
  FaExternalLinkAlt,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { getFrontendRegistrationUrl } from "../../../utils/urlHelpers";

const scopedStyles = `
/* ================= SCOPED THEME VARIABLES & BASE ================= */
.sa-view-college-wrapper {
  --sa-teal-dark: #0c2d3a;
  --sa-teal-base: #0f3a4a;
  --sa-teal-accent: #3db5e6;
  --sa-teal-accent-light: #4fc3f7;
  --sa-teal-text: #e6f2f5;
  --sa-teal-text-muted: rgba(255, 255, 255, 0.75);
  --sa-teal-border: rgba(255, 255, 255, 0.14);
  --sa-teal-hover: rgba(255, 255, 255, 0.08);
  --sa-teal-active: rgba(255, 255, 255, 0.16);

  --sa-bg-body: #f8fafc;
  --sa-card-bg: #ffffff;
  --sa-card-border: #e2e8f0;
  --sa-card-radius: 12px;
  --sa-card-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03);
  --sa-card-shadow-hover: 0 8px 20px -3px rgba(15, 23, 42, 0.08), 0 3px 6px -2px rgba(15, 23, 42, 0.04);
  --sa-text-main: #0f172a;
  --sa-text-muted: #64748b;
  --sa-accent-tint: rgba(61, 181, 230, 0.12);
  --sa-accent-tint-hover: rgba(61, 181, 230, 0.2);

  background-color: var(--sa-bg-body);
  min-height: 100vh;
  padding-bottom: 3rem;
  font-family: inherit;
  color: var(--sa-text-main);
}

.sa-view-college-wrapper * {
  box-sizing: border-box;
}

.sa-view-college-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 1.25rem;
}

@media (min-width: 768px) {
  .sa-view-college-container {
    padding: 1.5rem 2rem;
  }
}

/* ================= HEADER BAND ================= */
.sa-college-header-band {
  background: linear-gradient(135deg, var(--sa-teal-base) 0%, var(--sa-teal-dark) 100%);
  border-radius: var(--sa-card-radius);
  padding: 1.5rem;
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(12, 45, 58, 0.15);
  margin-top: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: all 0.2s ease;
}

@media (min-width: 768px) {
  .sa-college-header-band {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 1.75rem 2rem;
  }
}

.sa-college-header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  min-width: 0;
  flex: 1;
}

.sa-college-logo-tile {
  width: 64px;
  height: 64px;
  min-width: 64px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sa-teal-accent);
  overflow: hidden;
  flex-shrink: 0;
}

.sa-college-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sa-college-title-block {
  min-width: 0;
  flex: 1;
}

.sa-college-title {
  margin: 0 0 0.45rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.25;
  word-break: break-word;
  overflow-wrap: anywhere;
}

@media (min-width: 768px) {
  .sa-college-title {
    font-size: 1.625rem;
  }
}

.sa-college-meta-chips {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.sa-code-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.65rem;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.18s ease;
}

.sa-code-chip:hover {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.38);
  transform: translateY(-1px);
}

.sa-code-chip:focus-visible {
  outline: 2px solid var(--sa-teal-accent);
  outline-offset: 2px;
}

.sa-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--sa-teal-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

.sa-header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.sa-btn-header-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  padding: 0.625rem 1.15rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
  min-height: 42px;
}

.sa-btn-header-back:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}

.sa-btn-header-back:focus-visible {
  outline: 2px solid var(--sa-teal-accent);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .sa-btn-header-back {
    width: 100%;
  }
}

/* ================= COMMON CARD STYLES ================= */
.sa-card {
  background: var(--sa-card-bg);
  border: 1px solid var(--sa-card-border);
  border-radius: var(--sa-card-radius);
  box-shadow: var(--sa-card-shadow);
  margin-bottom: 1.5rem;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.sa-card-header {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-bottom: 1px solid var(--sa-card-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sa-card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--sa-teal-dark);
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.sa-card-title-icon {
  color: var(--sa-teal-accent);
  font-size: 1.1rem;
}

.sa-card-body {
  padding: 1.5rem;
}

/* ================= COLLEGE INFO GRID ================= */
.sa-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .sa-info-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.sa-info-tile {
  background: #f8fafc;
  border: 1px solid var(--sa-card-border);
  border-radius: 10px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 120px;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.sa-info-tile:hover {
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.sa-info-tile-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.sa-info-tile-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sa-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

.sa-icon-bubble {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  background: var(--sa-accent-tint);
  color: var(--sa-teal-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.sa-info-tile-val {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--sa-text-main);
  word-break: break-word;
  overflow-wrap: anywhere;
  margin-bottom: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sa-contact-link {
  color: var(--sa-teal-base);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s ease;
}

.sa-contact-link:hover {
  color: var(--sa-teal-accent);
  text-decoration: underline;
}

.sa-contact-link:focus-visible {
  outline: 2px solid var(--sa-teal-accent);
  outline-offset: 2px;
}

.sa-mini-copy-btn {
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: var(--sa-text-muted);
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.sa-mini-copy-btn:hover {
  background: #f1f5f9;
  color: var(--sa-teal-dark);
  border-color: var(--sa-teal-accent);
}

.sa-mini-copy-btn:focus-visible {
  outline: 2px solid var(--sa-teal-accent);
  outline-offset: 2px;
}

.sa-info-tile-sub {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

/* ================= STATISTICS SECTION ================= */
.sa-stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 576px) {
  .sa-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 992px) {
  .sa-stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.sa-stat-card {
  background: var(--sa-card-bg);
  border: 1px solid var(--sa-card-border);
  border-radius: 10px;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.sa-stat-card:hover {
  border-color: rgba(61, 181, 230, 0.5);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.sa-stat-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sa-stat-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--sa-accent-tint);
  color: var(--sa-teal-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
}

.sa-stat-num {
  font-size: 1.625rem;
  font-weight: 700;
  color: var(--sa-teal-dark);
  line-height: 1.1;
}

.sa-stat-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--sa-text-main);
  margin: 0;
}

.sa-stat-caption {
  font-size: 0.775rem;
  color: var(--sa-text-muted);
  margin: 0;
}

/* ================= REGISTRATION PORTAL ================= */
.sa-reg-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 992px) {
  .sa-reg-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.sa-reg-panel {
  background: #f8fafc;
  border: 1px solid var(--sa-card-border);
  border-radius: 10px;
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.sa-panel-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 1.15rem;
}

.sa-panel-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--sa-accent-tint);
  color: var(--sa-teal-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.sa-panel-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--sa-teal-dark);
}

.sa-panel-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--sa-text-muted);
}

.sa-url-display-box {
  background: #ffffff;
  border: 1px solid var(--sa-card-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  color: var(--sa-teal-dark);
  word-break: break-all;
  overflow-wrap: anywhere;
  margin-bottom: 1rem;
  min-height: 54px;
  display: flex;
  align-items: center;
}

.sa-recipient-box {
  background: #ffffff;
  border: 1px solid var(--sa-card-border);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  margin-bottom: 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.sa-recipient-avatar {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--sa-accent-tint);
  color: var(--sa-teal-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.sa-btn-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sa-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--sa-teal-base);
  color: #ffffff;
  border: 1px solid var(--sa-teal-base);
  border-radius: 8px;
  padding: 0.65rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  min-height: 42px;
}

.sa-btn-primary:hover:not(:disabled) {
  background: var(--sa-teal-dark);
  border-color: var(--sa-teal-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(15, 58, 74, 0.2);
}

.sa-btn-primary:focus-visible {
  outline: 2px solid var(--sa-teal-accent);
  outline-offset: 2px;
}

.sa-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sa-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #ffffff;
  color: var(--sa-teal-dark);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.65rem 1.15rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.18s ease;
  min-height: 42px;
}

.sa-btn-secondary:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: var(--sa-teal-base);
}

.sa-btn-secondary:focus-visible {
  outline: 2px solid var(--sa-teal-accent);
  outline-offset: 2px;
}

/* ================= EMAIL MODAL ================= */
.sa-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 45, 58, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.sa-modal-card {
  background: #ffffff;
  border-radius: 14px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 20px 40px rgba(12, 45, 58, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sa-modal-header {
  background: linear-gradient(135deg, var(--sa-teal-base) 0%, var(--sa-teal-dark) 100%);
  color: #ffffff;
  padding: 1.15rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sa-modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sa-modal-close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}

.sa-modal-close-btn:hover {
  color: #ffffff;
}

.sa-modal-close-btn:focus-visible {
  outline: 2px solid var(--sa-teal-accent);
  outline-offset: 2px;
}

.sa-modal-body {
  padding: 1.5rem;
  max-height: calc(85vh - 140px);
  overflow-y: auto;
}

.sa-form-group {
  margin-bottom: 1.25rem;
}

.sa-form-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--sa-text-main);
  margin-bottom: 0.4rem;
}

.sa-form-control {
  width: 100%;
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  color: var(--sa-text-main);
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
}

.sa-form-control:focus {
  border-color: var(--sa-teal-accent);
  box-shadow: 0 0 0 3px rgba(61, 181, 230, 0.15);
}

.sa-form-control:read-only {
  background-color: #f8fafc;
  color: var(--sa-text-muted);
}

.sa-char-count {
  display: block;
  text-align: right;
  font-size: 0.725rem;
  color: var(--sa-text-muted);
  margin-top: 0.25rem;
}

.sa-modal-footer {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid var(--sa-card-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* ================= SKELETON / LOADING ================= */
.sa-skeleton {
  background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: sa-shimmer 1.5s infinite;
  border-radius: 6px;
}

@keyframes sa-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes sa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sa-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: sa-spin 0.8s linear infinite;
  display: inline-block;
}

@media (prefers-reduced-motion: reduce) {
  .sa-skeleton {
    animation: none;
    background: #e2e8f0;
  }
  .sa-college-header-band,
  .sa-info-tile,
  .sa-stat-card,
  .sa-btn-primary,
  .sa-btn-secondary,
  .sa-code-chip {
    transition: none !important;
    transform: none !important;
  }
}
`;

export default function ViewCollegeDetails() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [college, setCollege] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Inline feedback key for copy actions ("code", "link", "email", "phone")
  const [copiedKey, setCopiedKey] = useState(null);
  const [logoLoadError, setLogoLoadError] = useState(false);

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

  const fetchCollege = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/master/${id}`);
      setCollege(res.data.college);
      setStats(res.data.stats);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to fetch college details";

      logger.error("Error fetching college details:", statusCode, errorCode);

      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setError(null);
    setLoading(true);
    setLogoLoadError(false);
    if (!id) {
      setError({ message: "Invalid College ID" });
      setLoading(false);
      return;
    }
    fetchCollege();
  }, [id, fetchCollege]);

  // Robust copy to clipboard with textarea fallback
  const handleCopy = async (text, key, successMsg) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopiedKey(key);
      toast.success(successMsg || "Copied to clipboard!", {
        position: "top-right",
        autoClose: 2000,
      });

      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch (err) {
      logger.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showEmailModal && !sendingEmail) {
        setShowEmailModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showEmailModal, sendingEmail]);

  // Send email to college admin
  const handleSendEmail = async (e) => {
    e.preventDefault();

    if (!emailData.subject.trim() || !emailData.message.trim()) {
      toast.error("Subject and message are required", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (emailData.subject.length > 200) {
      toast.error("Subject must be less than 200 characters", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (emailData.message.length > 5000) {
      toast.error("Message must be less than 5000 characters", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setSendingEmail(true);

    try {
      const res = await api.post(`/master/${id}/send-email`, {
        collegeId: id,
        subject:
          emailData.subject ||
          `Regarding ${college?.name || "College"} - Smart College Management`,
        message: emailData.message,
      });

      toast.success(res.data.message || "Email sent successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowEmailModal(false);
      setEmailData({ subject: "", message: "" });
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = backendMessage || "Failed to send email";

      logger.error("Error sending email:", statusCode, errorCode);

      const isAuthError =
        statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode));

      if (!isAuthError) {
        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } finally {
      setSendingEmail(false);
    }
  };

  // Security checks
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "SUPER_ADMIN")
    return <Navigate to="/super-admin/dashboard" />;

  const frontendRegistrationUrl = getFrontendRegistrationUrl(
    college?.registrationUrl
  );

  // ================= RENDER SKELETON LOADING STATE =================
  if (loading) {
    return (
      <div className="sa-view-college-wrapper">
        <style>{scopedStyles}</style>
        <div className="sa-view-college-container">
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/super-admin/dashboard" },
              { label: "Colleges", path: "/super-admin/colleges-list" },
              { label: "Loading..." },
            ]}
          />

          {/* Skeleton Header Band */}
          <div className="sa-college-header-band">
            <div className="sa-college-header-left">
              <div
                className="sa-skeleton"
                style={{ width: "64px", height: "64px", borderRadius: "12px" }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="sa-skeleton"
                  style={{ width: "40%", height: "26px", marginBottom: "8px" }}
                />
                <div
                  className="sa-skeleton"
                  style={{ width: "25%", height: "18px" }}
                />
              </div>
            </div>
            <div
              className="sa-skeleton"
              style={{ width: "140px", height: "42px", borderRadius: "8px" }}
            />
          </div>

          {/* Skeleton Info Card */}
          <div className="sa-card">
            <div className="sa-card-header">
              <div
                className="sa-skeleton"
                style={{ width: "180px", height: "20px" }}
              />
            </div>
            <div className="sa-card-body">
              <div className="sa-info-grid">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="sa-skeleton"
                    style={{ height: "110px", borderRadius: "10px" }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Skeleton Stat Cards */}
          <div className="sa-card">
            <div className="sa-card-header">
              <div
                className="sa-skeleton"
                style={{ width: "160px", height: "20px" }}
              />
            </div>
            <div className="sa-card-body">
              <div className="sa-stats-grid">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="sa-skeleton"
                    style={{ height: "115px", borderRadius: "10px" }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER ERROR STATE =================
  if (error) {
    return (
      <div className="sa-view-college-wrapper">
        <style>{scopedStyles}</style>
        <div className="sa-view-college-container">
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/super-admin/dashboard" },
              { label: "Colleges", path: "/super-admin/colleges-list" },
              { label: "Error" },
            ]}
          />
          <ApiError
            title="College Details Loading Error"
            message={error.message}
            statusCode={error.statusCode}
            errorCode={error.errorCode}
            onRetry={fetchCollege}
            onGoBack={() => navigate(-1)}
          />
        </div>
      </div>
    );
  }

  // ================= RENDER NOT FOUND STATE =================
  if (!college) {
    return (
      <div className="sa-view-college-wrapper">
        <style>{scopedStyles}</style>
        <div className="sa-view-college-container">
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/super-admin/dashboard" },
              { label: "Colleges", path: "/super-admin/colleges-list" },
              { label: "Not Found" },
            ]}
          />
          <div className="sa-card" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem 1.5rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(12, 45, 58, 0.08)",
                color: "var(--sa-teal-dark)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.75rem",
                marginBottom: "1rem",
              }}
            >
              <FaUniversity />
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--sa-teal-dark)", margin: "0 0 0.5rem" }}>
              College Not Found
            </h2>
            <p style={{ color: "var(--sa-text-muted)", maxWidth: "450px", margin: "0 auto 1.5rem", fontSize: "0.9rem" }}>
              The college you are looking for does not exist or may have been removed.
            </p>
            <button
              type="button"
              className="sa-btn-primary"
              onClick={() => navigate(-1)}
              style={{ margin: "0 auto" }}
            >
              <FaArrowLeft /> Back to Colleges
            </button>
          </div>
        </div>
      </div>
    );
  }

  // College logo resolution (with fallback to institution icon tile)
  const logoSrc = !logoLoadError && (college.logoUrl || college.logo);

  return (
    <div className="sa-view-college-wrapper">
      <style>{scopedStyles}</style>
      <div className="sa-view-college-container">
        {/* ================= (A) BREADCRUMB ================= */}
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/super-admin/dashboard" },
            { label: "Colleges", path: "/super-admin/colleges-list" },
            { label: college.name || "College Details" },
          ]}
        />

        {/* ================= (A) HEADER BAND ================= */}
        <header className="sa-college-header-band">
          <div className="sa-college-header-left">
            <div className="sa-college-logo-tile" aria-hidden="true">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={college.name}
                  className="sa-college-logo-img"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <FaUniversity size={28} />
              )}
            </div>

            <div className="sa-college-title-block">
              <h1 className="sa-college-title">{college.name}</h1>
              <div className="sa-college-meta-chips">
                {/* Copyable College Code Chip */}
                {college.code && (
                  <button
                    type="button"
                    className="sa-code-chip"
                    onClick={() =>
                      handleCopy(college.code, "code", "College code copied!")
                    }
                    title="Click to copy college code"
                    aria-label={`Copy college code ${college.code}`}
                  >
                    <span>CODE: {college.code}</span>
                    {copiedKey === "code" ? (
                      <FaCheck
                        size={12}
                        style={{ color: "var(--sa-teal-accent-light)" }}
                        aria-hidden="true"
                      />
                    ) : (
                      <FaCopy
                        size={11}
                        style={{ opacity: 0.8 }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )}

                {/* Established Year (Single appearance in Header) */}
                <span className="sa-meta-chip">
                  <FaCalendarAlt size={13} aria-hidden="true" />
                  <span>Est. {college.establishedYear || "N/A"}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="sa-header-actions">
            <button
              type="button"
              className="sa-btn-header-back"
              onClick={() => navigate(-1)}
              aria-label="Back to previous page"
            >
              <FaArrowLeft size={13} aria-hidden="true" />
              <span>Back to Colleges</span>
            </button>
          </div>
        </header>

        {/* ================= (B) COLLEGE INFORMATION ================= */}
        <section className="sa-card" aria-labelledby="section-college-info">
          <div className="sa-card-header">
            <h2 id="section-college-info" className="sa-card-title">
              <FaUniversity className="sa-card-title-icon" aria-hidden="true" />
              <span>College Information</span>
            </h2>
          </div>
          <div className="sa-card-body">
            <div className="sa-info-grid">
              {/* Tile 1: Official Email */}
              <div className="sa-info-tile">
                <div className="sa-info-tile-top">
                  <p className="sa-info-tile-label">Official Email</p>
                  <div className="sa-icon-bubble" aria-hidden="true">
                    <FaEnvelope />
                  </div>
                </div>
                <div>
                  <div className="sa-info-tile-val">
                    {college.email ? (
                      <>
                        <a
                          href={`mailto:${college.email}`}
                          className="sa-contact-link"
                          title={`Send email to ${college.email}`}
                        >
                          {college.email}
                        </a>
                        <button
                          type="button"
                          className="sa-mini-copy-btn"
                          onClick={() =>
                            handleCopy(
                              college.email,
                              "email",
                              "Email copied to clipboard!"
                            )
                          }
                          title="Copy email address"
                          aria-label="Copy official email"
                        >
                          {copiedKey === "email" ? (
                            <FaCheck size={11} style={{ color: "#10b981" }} />
                          ) : (
                            <FaCopy size={11} />
                          )}
                        </button>
                      </>
                    ) : (
                      <span style={{ color: "var(--sa-text-muted)" }}>
                        Not provided
                      </span>
                    )}
                  </div>
                  <p className="sa-info-tile-sub">Primary contact email</p>
                </div>
              </div>

              {/* Tile 2: Contact Number */}
              <div className="sa-info-tile">
                <div className="sa-info-tile-top">
                  <p className="sa-info-tile-label">Contact Number</p>
                  <div className="sa-icon-bubble" aria-hidden="true">
                    <FaPhone />
                  </div>
                </div>
                <div>
                  <div className="sa-info-tile-val">
                    {college.contactNumber ? (
                      <>
                        <a
                          href={`tel:${college.contactNumber}`}
                          className="sa-contact-link"
                          title={`Call ${college.contactNumber}`}
                        >
                          {college.contactNumber}
                        </a>
                        <button
                          type="button"
                          className="sa-mini-copy-btn"
                          onClick={() =>
                            handleCopy(
                              college.contactNumber,
                              "phone",
                              "Phone number copied to clipboard!"
                            )
                          }
                          title="Copy phone number"
                          aria-label="Copy contact number"
                        >
                          {copiedKey === "phone" ? (
                            <FaCheck size={11} style={{ color: "#10b981" }} />
                          ) : (
                            <FaCopy size={11} />
                          )}
                        </button>
                      </>
                    ) : (
                      <span style={{ color: "var(--sa-text-muted)" }}>
                        Not provided
                      </span>
                    )}
                  </div>
                  <p className="sa-info-tile-sub">Main phone line</p>
                </div>
              </div>

              {/* Tile 3: Address */}
              <div className="sa-info-tile">
                <div className="sa-info-tile-top">
                  <p className="sa-info-tile-label">Registered Address</p>
                  <div className="sa-icon-bubble" aria-hidden="true">
                    <FaMapMarkerAlt />
                  </div>
                </div>
                <div>
                  <div className="sa-info-tile-val">
                    {college.address ? (
                      <span>{college.address}</span>
                    ) : (
                      <span style={{ color: "var(--sa-text-muted)" }}>
                        Not provided
                      </span>
                    )}
                  </div>
                  <p className="sa-info-tile-sub">Registered campus location</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= (C) COLLEGE STATISTICS ================= */}
        {stats && (
          <section className="sa-card" aria-labelledby="section-college-stats">
            <div className="sa-card-header">
              <h2 id="section-college-stats" className="sa-card-title">
                <FaClipboardList
                  className="sa-card-title-icon"
                  aria-hidden="true"
                />
                <span>College Statistics</span>
              </h2>
            </div>
            <div className="sa-card-body">
              <div className="sa-stats-grid">
                {/* Stat 1: Departments */}
                <div className="sa-stat-card">
                  <div className="sa-stat-card-header">
                    <span className="sa-stat-label">Departments</span>
                    <div className="sa-stat-icon-wrap" aria-hidden="true">
                      <FaLayerGroup />
                    </div>
                  </div>
                  <div className="sa-stat-num">
                    {stats.totalDepartments ?? 0}
                  </div>
                  <p className="sa-stat-caption">
                    {stats.totalDepartments > 0
                      ? "Active academic departments"
                      : "No departments added yet"}
                  </p>
                </div>

                {/* Stat 2: Courses */}
                <div className="sa-stat-card">
                  <div className="sa-stat-card-header">
                    <span className="sa-stat-label">Courses</span>
                    <div className="sa-stat-icon-wrap" aria-hidden="true">
                      <FaBook />
                    </div>
                  </div>
                  <div className="sa-stat-num">{stats.totalCourses ?? 0}</div>
                  <p className="sa-stat-caption">
                    {stats.totalCourses > 0
                      ? "Available study programs"
                      : "No courses added yet"}
                  </p>
                </div>

                {/* Stat 3: Teachers */}
                <div className="sa-stat-card">
                  <div className="sa-stat-card-header">
                    <span className="sa-stat-label">Teachers</span>
                    <div className="sa-stat-icon-wrap" aria-hidden="true">
                      <FaChalkboardTeacher />
                    </div>
                  </div>
                  <div className="sa-stat-num">{stats.totalTeachers ?? 0}</div>
                  <p className="sa-stat-caption">
                    {stats.totalTeachers > 0
                      ? "Registered teaching staff"
                      : "No teachers added yet"}
                  </p>
                </div>

                {/* Stat 4: Total Students */}
                <div className="sa-stat-card">
                  <div className="sa-stat-card-header">
                    <span className="sa-stat-label">Total Students</span>
                    <div className="sa-stat-icon-wrap" aria-hidden="true">
                      <FaUsers />
                    </div>
                  </div>
                  <div className="sa-stat-num">{stats.totalStudents ?? 0}</div>
                  <p className="sa-stat-caption">
                    {stats.totalStudents > 0
                      ? "Total registered students"
                      : "No students registered yet"}
                  </p>
                </div>

                {/* Stat 5: Approved Students */}
                <div className="sa-stat-card">
                  <div className="sa-stat-card-header">
                    <span className="sa-stat-label">Approved Students</span>
                    <div className="sa-stat-icon-wrap" aria-hidden="true">
                      <FaCheckCircle />
                    </div>
                  </div>
                  <div className="sa-stat-num">
                    {stats.approvedStudents ?? 0}
                  </div>
                  <p className="sa-stat-caption">
                    {stats.approvedStudents > 0
                      ? "Enrolled active students"
                      : "No approved students yet"}
                  </p>
                </div>

                {/* Stat 6: Active Timetables */}
                <div className="sa-stat-card">
                  <div className="sa-stat-card-header">
                    <span className="sa-stat-label">Active Timetables</span>
                    <div className="sa-stat-icon-wrap" aria-hidden="true">
                      <FaCalendarAlt />
                    </div>
                  </div>
                  <div className="sa-stat-num">
                    {stats.totalTimetables ?? 0}
                  </div>
                  <p className="sa-stat-caption">
                    {stats.totalTimetables > 0
                      ? "Published class schedules"
                      : "No active timetables yet"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= (D) REGISTRATION PORTAL ================= */}
        <section className="sa-card" aria-labelledby="section-reg-portal">
          <div className="sa-card-header">
            <h2 id="section-reg-portal" className="sa-card-title">
              <FaQrcode className="sa-card-title-icon" aria-hidden="true" />
              <span>Registration Portal</span>
            </h2>
          </div>
          <div className="sa-card-body">
            <div className="sa-reg-grid">
              {/* Panel 1: Registration Link */}
              <div className="sa-reg-panel">
                <div>
                  <div className="sa-panel-head">
                    <div className="sa-panel-icon" aria-hidden="true">
                      <FaLink />
                    </div>
                    <div>
                      <h3 className="sa-panel-title">
                        College Registration Link
                      </h3>
                      <p className="sa-panel-desc">
                        Unique link for student registration
                      </p>
                    </div>
                  </div>

                  <div className="sa-url-display-box" title={frontendRegistrationUrl}>
                    {frontendRegistrationUrl || "No registration URL configured"}
                  </div>
                </div>

                <div className="sa-btn-row">
                  <button
                    type="button"
                    className="sa-btn-primary"
                    onClick={() =>
                      handleCopy(
                        frontendRegistrationUrl,
                        "link",
                        "Registration link copied to clipboard!"
                      )
                    }
                    disabled={!frontendRegistrationUrl}
                    aria-label="Copy student registration link"
                  >
                    {copiedKey === "link" ? (
                      <>
                        <FaCheck aria-hidden="true" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <FaCopy aria-hidden="true" />
                        <span>Copy Registration Link</span>
                      </>
                    )}
                  </button>

                  {frontendRegistrationUrl && (
                    <a
                      href={frontendRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sa-btn-secondary"
                      title="Open registration page in a new tab"
                      aria-label="Open registration page in a new tab"
                    >
                      <FaExternalLinkAlt size={12} aria-hidden="true" />
                      <span>Open Link</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Panel 2: College Admin Email */}
              <div className="sa-reg-panel">
                <div>
                  <div className="sa-panel-head">
                    <div className="sa-panel-icon" aria-hidden="true">
                      <FaEnvelope />
                    </div>
                    <div>
                      <h3 className="sa-panel-title">College Administrator</h3>
                      <p className="sa-panel-desc">
                        Send notifications to college administrator
                      </p>
                    </div>
                  </div>

                  <div className="sa-recipient-box">
                    <div className="sa-recipient-avatar" aria-hidden="true">
                      <FaUserTie />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.75rem",
                          color: "var(--sa-text-muted)",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        Recipient Email
                      </p>
                      <p
                        style={{
                          margin: "0.15rem 0 0",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "var(--sa-teal-dark)",
                          wordBreak: "break-all",
                        }}
                      >
                        {college.adminEmail || "admin@college.edu"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="sa-btn-row">
                  <button
                    type="button"
                    className="sa-btn-primary"
                    onClick={() => {
                      setEmailData({
                        subject: `Regarding ${college.name} - Smart College Management`,
                        message: "",
                      });
                      setShowEmailModal(true);
                    }}
                    aria-label="Open modal to send email to college admin"
                  >
                    <FaPaperPlane aria-hidden="true" />
                    <span>Send Email to College Admin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ================= (D) SEND EMAIL MODAL ================= */}
      {showEmailModal && (
        <div
          className="sa-modal-backdrop"
          onClick={() => {
            if (!sendingEmail) setShowEmailModal(false);
          }}
          role="presentation"
        >
          <div
            className="sa-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sa-email-modal-title"
          >
            <div className="sa-modal-header">
              <h2 id="sa-email-modal-title" className="sa-modal-title">
                <FaEnvelope aria-hidden="true" />
                <span>Send Email to College Admin</span>
              </h2>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => {
                  if (!sendingEmail) setShowEmailModal(false);
                }}
                disabled={sendingEmail}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSendEmail}>
              <div className="sa-modal-body">
                <div className="sa-form-group">
                  <label htmlFor="sa-email-to" className="sa-form-label">
                    To
                  </label>
                  <input
                    id="sa-email-to"
                    type="text"
                    value={college.adminEmail || ""}
                    readOnly
                    className="sa-form-control"
                    aria-readonly="true"
                  />
                </div>

                <div className="sa-form-group">
                  <label htmlFor="sa-email-subject" className="sa-form-label">
                    Subject *
                  </label>
                  <input
                    id="sa-email-subject"
                    type="text"
                    value={emailData.subject}
                    onChange={(e) =>
                      setEmailData({ ...emailData, subject: e.target.value })
                    }
                    placeholder="Enter email subject"
                    required
                    maxLength={200}
                    className="sa-form-control"
                    disabled={sendingEmail}
                  />
                  <small className="sa-char-count">
                    {emailData.subject.length}/200 characters
                  </small>
                </div>

                <div className="sa-form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="sa-email-message" className="sa-form-label">
                    Message *
                  </label>
                  <textarea
                    id="sa-email-message"
                    value={emailData.message}
                    onChange={(e) =>
                      setEmailData({ ...emailData, message: e.target.value })
                    }
                    placeholder="Type your message here..."
                    required
                    maxLength={5000}
                    rows={6}
                    className="sa-form-control"
                    style={{ resize: "vertical" }}
                    disabled={sendingEmail}
                  />
                  <small className="sa-char-count">
                    {emailData.message.length}/5000 characters
                  </small>
                </div>
              </div>

              <div className="sa-modal-footer">
                <button
                  type="button"
                  className="sa-btn-secondary"
                  onClick={() => setShowEmailModal(false)}
                  disabled={sendingEmail}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sa-btn-primary"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>
                      <span className="sa-spinner" aria-hidden="true" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane aria-hidden="true" />
                      <span>Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
