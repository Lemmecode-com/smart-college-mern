import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getResultsByExam,
  lockResultsForExam,
  publishResultsForExam,
  unlockResult,
} from "../../../api/results";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import Pagination from "../../../components/Pagination";
import ApiError from "../../../components/ApiError";
import Loading from "../../../components/Loading";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaClipboardList,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaGlobe,
  FaLockOpen,
  FaSearch,
  FaFilter,
  FaTimes,
  FaEye,
  FaChartBar,
  FaClock,
  FaUndo,
} from "react-icons/fa";
import { motion } from "framer-motion";

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

const MAX_UNLOCK_REASON_LENGTH = 500;

const styles = `
.err {
  --edx-bg: #f8fafc;
  --edx-primary: #0f3a4a;
  --edx-primary-hover: #0c2e3b;
  --edx-secondary: #1a4b6d;
  --edx-slate-900: #0f172a;
  --edx-slate-800: #1e293b;
  --edx-slate-700: #334155;
  --edx-slate-600: #475569;
  --edx-slate-500: #64748b;
  --edx-slate-400: #94a3b8;
  --edx-slate-300: #cbd5e1;
  --edx-slate-200: #e2e8f0;
  --edx-slate-100: #f1f5f9;
  --edx-slate-50: #f8fafc;
  
  --edx-green-700: #047857;
  --edx-green-600: #059669;
  --edx-green-500: #10b981;
  --edx-green-100: #d1fae5;
  --edx-green-50: #ecfdf5;

  --edx-red-700: #b91c1c;
  --edx-red-600: #dc2626;
  --edx-red-500: #ef4444;
  --edx-red-100: #fee2e2;
  --edx-red-50: #fef2f2;

  --edx-amber-700: #b45309;
  --edx-amber-600: #d97706;
  --edx-amber-500: #f59e0b;
  --edx-amber-100: #fef3c7;
  --edx-amber-50: #fffbeb;

  --edx-blue-700: #1d4ed8;
  --edx-blue-600: #2563eb;
  --edx-blue-500: #3b82f6;
  --edx-blue-100: #dbeafe;
  --edx-blue-50: #eff6ff;

  background: var(--edx-bg);
  min-height: 100%;
  color: var(--edx-slate-900);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.err nav.erp-breadcrumb {
  margin-bottom: 0.75rem;
}

/* PageHeader action button styling */
.err .btn-edx-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 38px;
  background: #ffffff;
  color: var(--edx-primary);
  border: 1px solid var(--edx-slate-300);
  border-radius: 8px;
  padding: 0.5rem 0.95rem;
  font-weight: 600;
  font-size: 0.84rem;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.err .btn-edx-outline:hover:not(:disabled) {
  border-color: var(--edx-primary);
  background: var(--edx-slate-50);
  color: var(--edx-primary);
  transform: translateY(-1px);
}
.err .btn-edx-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Primary Action Buttons */
.err .btn-edx-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 38px;
  background: linear-gradient(135deg, var(--edx-primary), var(--edx-secondary));
  color: #ffffff;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.5rem 1.1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 58, 74, 0.15);
  white-space: nowrap;
}
.err .btn-edx-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--edx-primary-hover), var(--edx-primary));
  box-shadow: 0 4px 12px rgba(15, 58, 74, 0.25);
  transform: translateY(-1px);
}
.err .btn-edx-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Success Button */
.err .btn-edx-success {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 38px;
  background: linear-gradient(135deg, var(--edx-green-600), var(--edx-green-700));
  color: #ffffff;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.5rem 1.1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(5, 150, 105, 0.15);
  white-space: nowrap;
}
.err .btn-edx-success:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--edx-green-700), #064e3b);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
  transform: translateY(-1px);
}
.err .btn-edx-success:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Warning Button */
.err .btn-edx-warning {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 38px;
  background: var(--edx-amber-50);
  color: var(--edx-amber-700);
  border: 1px solid var(--edx-amber-500);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.err .btn-edx-warning:hover:not(:disabled) {
  background: var(--edx-amber-100);
  color: #78350f;
  border-color: var(--edx-amber-600);
  transform: translateY(-1px);
}
.err .btn-edx-warning:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Spinner */
.err .spin {
  animation: err-spin 0.8s linear infinite;
}
@keyframes err-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Info Grid (Summary Cards) */
.err .info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.25rem;
  margin-bottom: 1.25rem;
}

.err .info-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: #ffffff;
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  padding: 1rem 1.15rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  min-height: 84px;
}
.err .info-item:hover {
  border-color: var(--edx-slate-300);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.err .info-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.err .info-icon-primary {
  background: #f0fdfa;
  color: var(--edx-primary);
  border: 1px solid #ccfbf1;
}
.err .info-icon-context {
  background: var(--edx-slate-50);
  color: var(--edx-secondary);
  border: 1px solid var(--edx-slate-200);
}
.err .info-icon-success {
  background: var(--edx-green-50);
  color: var(--edx-green-600);
  border: 1px solid var(--edx-green-100);
}
.err .info-icon-danger {
  background: var(--edx-red-50);
  color: var(--edx-red-600);
  border: 1px solid var(--edx-red-100);
}
.err .info-icon-warning {
  background: var(--edx-amber-50);
  color: var(--edx-amber-600);
  border: 1px solid var(--edx-amber-100);
}

.err .info-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.err .info-label {
  color: var(--edx-slate-500);
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.err .info-value {
  color: var(--edx-slate-900);
  font-weight: 700;
  font-size: 1.25rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.err .info-value.text-success { color: var(--edx-green-600); }
.err .info-value.text-danger { color: var(--edx-red-600); }
.err .info-value.text-warning { color: var(--edx-amber-600); }

.err .info-subtext {
  font-size: 0.75rem;
  color: var(--edx-slate-400);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Lifecycle Bar */
.err .lifecycle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #ffffff;
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  flex-wrap: wrap;
}

.err .lifecycle-status-group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.err .lifecycle-label {
  font-weight: 700;
  color: var(--edx-slate-600);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.err .lifecycle-pills-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.err .lifecycle-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.err .all-published-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--edx-green-700);
  background: var(--edx-green-50);
  border: 1px solid var(--edx-green-100);
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
}

/* Badges & Pills */
.err .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  white-space: nowrap;
}
.err .pill strong {
  font-weight: 700;
}
.err .pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.err .pill-draft {
  background: var(--edx-slate-100);
  color: var(--edx-slate-600);
  border-color: var(--edx-slate-200);
}
.err .pill-draft .pill-dot { background: var(--edx-slate-400); }

.err .pill-locked {
  background: var(--edx-blue-50);
  color: var(--edx-blue-700);
  border-color: var(--edx-blue-100);
}
.err .pill-locked .pill-dot { background: var(--edx-blue-500); }

.err .pill-published {
  background: var(--edx-green-50);
  color: var(--edx-green-700);
  border-color: var(--edx-green-100);
}
.err .pill-published .pill-dot { background: var(--edx-green-500); }

.err .pill-total {
  background: var(--edx-slate-50);
  color: var(--edx-slate-700);
  border-color: var(--edx-slate-200);
}

.err .pill-pass {
  background: var(--edx-green-50);
  color: var(--edx-green-700);
  border-color: var(--edx-green-100);
}
.err .pill-pass .pill-dot { background: var(--edx-green-500); }

.err .pill-fail {
  background: var(--edx-red-50);
  color: var(--edx-red-700);
  border-color: var(--edx-red-100);
}
.err .pill-fail .pill-dot { background: var(--edx-red-500); }

.err .pill-incomplete {
  background: var(--edx-amber-50);
  color: var(--edx-amber-700);
  border-color: var(--edx-amber-100);
}
.err .pill-incomplete .pill-dot { background: var(--edx-amber-500); }

/* Filter & Search Row */
.err .filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.err .search-box {
  flex: 1 1 300px;
  min-width: 240px;
  height: 40px;
  border: 1px solid var(--edx-slate-300);
  border-radius: 8px;
  background: #ffffff;
  padding: 0 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  transition: all 0.2s ease;
}
.err .search-box:focus-within {
  border-color: var(--edx-primary);
  box-shadow: 0 0 0 3px rgba(15, 58, 74, 0.1);
}
.err .search-box svg.search-icon {
  color: var(--edx-slate-400);
  flex-shrink: 0;
}
.err .search-box input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 0.88rem;
  color: var(--edx-slate-900);
}
.err .search-clear-btn {
  background: transparent;
  border: none;
  color: var(--edx-slate-400);
  cursor: pointer;
  padding: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.err .search-clear-btn:hover {
  color: var(--edx-slate-700);
}

.err .filter-selects-group {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.err .filter-select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.err .filter-select-wrapper .filter-icon {
  position: absolute;
  left: 0.85rem;
  color: var(--edx-slate-400);
  pointer-events: none;
  font-size: 0.8rem;
}
.err .filter-select-wrapper .filter-select {
  padding-left: 2.1rem;
}

.err .filter-select {
  height: 40px;
  border: 1px solid var(--edx-slate-300);
  border-radius: 8px;
  background: #ffffff;
  font-size: 0.85rem;
  color: var(--edx-slate-800);
  font-weight: 500;
  padding: 0 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 150px;
}
.err .filter-select:focus {
  outline: none;
  border-color: var(--edx-primary);
  box-shadow: 0 0 0 3px rgba(15, 58, 74, 0.1);
}
.err .page-size-select {
  min-width: 110px;
}

.err .clear-filters-btn {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--edx-slate-300);
  background: #ffffff;
  color: var(--edx-primary);
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.err .clear-filters-btn:hover {
  background: var(--edx-slate-50);
  border-color: var(--edx-primary);
}

/* Table Card & Modern Table */
.err .table-card {
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.err .er-table {
  width: 100%;
  margin-bottom: 0;
  border-collapse: separate;
  border-spacing: 0;
}
.err .er-table thead th {
  background: #f8fafc;
  color: var(--edx-slate-600);
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--edx-slate-200);
  border-top: none;
  padding: 0.9rem 1.15rem;
  white-space: nowrap;
}
.err .er-table tbody td {
  padding: 0.9rem 1.15rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.88rem;
  color: var(--edx-slate-800);
}
.err .er-table tbody tr:hover {
  background: #f8fafc;
}
.err .er-table tbody tr:last-child td {
  border-bottom: none;
}
.err .er-table tbody tr.row-blocked {
  background: #fff5f5;
  border-left: 3px solid var(--edx-red-500);
}

.err .student-name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.err .student-name-text {
  font-weight: 600;
  color: var(--edx-slate-900);
}
.err .blocked-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: var(--edx-red-100);
  color: var(--edx-red-700);
  border: 1px solid #fca5a5;
}
.err .student-id-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  color: var(--edx-slate-600);
  background: var(--edx-slate-100);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  display: inline-block;
  font-weight: 500;
}
.err .papers-count {
  font-weight: 700;
  color: var(--edx-slate-900);
  font-size: 0.9rem;
}
.err .breakdown-chips {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.err .breakdown-chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
}
.err .pass-chip {
  background: var(--edx-green-50);
  color: var(--edx-green-700);
  border: 1px solid var(--edx-green-100);
}
.err .fail-chip {
  background: var(--edx-red-50);
  color: var(--edx-red-700);
  border: 1px solid var(--edx-red-100);
}
.err .zero-chip {
  background: var(--edx-slate-50);
  color: var(--edx-slate-400);
  border: 1px solid var(--edx-slate-200);
}
.err .inc-chip {
  background: var(--edx-amber-50);
  color: var(--edx-amber-700);
  border: 1px solid var(--edx-amber-100);
}

.err .btn-sheet-view {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.42rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--edx-primary);
  background: #ffffff;
  border: 1.5px solid var(--edx-slate-300);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.err .btn-sheet-view:hover {
  background: #f0f9ff;
  border-color: #0284c7;
  color: #0369a1;
  transform: translateY(-1px);
}

/* Empty States */
.err .empty-state {
  text-align: center;
  padding: 3.5rem 1.5rem;
  color: var(--edx-slate-600);
}
.err .empty-state-icon {
  font-size: 2.5rem;
  color: var(--edx-slate-400);
  margin-bottom: 0.85rem;
}
.err .empty-state-title {
  font-weight: 700;
  color: var(--edx-slate-900);
  margin-bottom: 0.35rem;
  font-size: 1.1rem;
}
.err .empty-state-desc {
  font-size: 0.88rem;
  color: var(--edx-slate-500);
  max-width: 480px;
  margin: 0 auto 1.25rem auto;
}

/* Alerts */
.err .alert-edx {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 10px;
  padding: 1rem 1.2rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
  margin-bottom: 1.25rem;
}
.err .alert-edx svg {
  margin-top: 0.15rem;
  flex-shrink: 0;
}
.err .alert-edx-danger {
  background: var(--edx-red-50);
  color: var(--edx-red-700);
  border-color: rgba(229, 72, 77, 0.25);
}

/* Blocked issues scrollable list */
.err .blocked-issues-list {
  max-height: 200px;
  overflow-y: auto;
  margin: 0.75rem 0;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(229, 72, 77, 0.25);
  padding: 0.5rem 0.75rem;
}
.err .blocked-issue-item {
  padding: 0.45rem 0;
  border-bottom: 1px solid #fce8e8;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.err .blocked-issue-item:last-child {
  border-bottom: none;
}

/* Modal styling for unlock */
.err .modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(6, 25, 44, 0.55);
  backdrop-filter: blur(2px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.err .modal-box {
  background: #ffffff;
  border-radius: 14px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.err .modal-header-custom {
  padding: 1.1rem 1.4rem;
  background: var(--edx-slate-50);
  border-bottom: 1px solid var(--edx-slate-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.err .modal-body-custom {
  padding: 1.4rem;
}
.err .modal-footer-custom {
  padding: 1rem 1.4rem;
  background: var(--edx-slate-50);
  border-top: 1px solid var(--edx-slate-200);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Responsive Media Queries */
@media (max-width: 768px) {
  .err .info-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .err .lifecycle-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  .err .lifecycle-actions {
    justify-content: flex-start;
  }
  .err .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  .err .search-box {
    width: 100%;
  }
  .err .filter-selects-group {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .err .filter-select-wrapper {
    width: 100%;
  }
  .err .filter-select {
    width: 100%;
  }
  .err .clear-filters-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .err .info-grid {
    grid-template-columns: 1fr;
  }
  .err .lifecycle-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .err .lifecycle-actions button {
    width: 100%;
  }
}
`;

export default function ExamResultReview() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [publishBlockedDetails, setPublishBlockedDetails] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlockReasonError, setUnlockReasonError] = useState("");

  const load = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getResultsByExam(examId);
      setData(res);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || "Failed to load results.";
      logger.error("getResultsByExam error:", err.response?.status, code);
      setFetchError({
        message: msg,
        statusCode: err.response?.status,
        errorCode: code,
        isAuthError: AUTH_ERROR_CODES.has(code),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) load();
  }, [examId]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, resultFilter, statusFilter, pageSize]);

  // Derived filtered results
  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    let results = data.results;

    if (resultFilter !== "ALL") {
      results = results.filter((r) => r.overallResult === resultFilter);
    }

    if (statusFilter !== "ALL") {
      results = results.filter((r) => r.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter((r) => {
        const name = (r.student_id?.fullName || "").toLowerCase();
        const id = (
          r.student_id?.enrollmentNumber ||
          r.student_id?.rollNumber ||
          ""
        ).toLowerCase();
        return name.includes(term) || id.includes(term);
      });
    }

    return results;
  }, [data, resultFilter, statusFilter, searchTerm]);

  // Set of student IDs blocked by publish validation
  const blockedStudentIds = useMemo(() => {
    if (!publishBlockedDetails?.issues) return new Set();
    const set = new Set();
    for (const issue of publishBlockedDetails.issues) {
      if (issue.studentId) set.add(String(issue.studentId));
    }
    return set;
  }, [publishBlockedDetails]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;
  const paginatedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, page, pageSize]);

  const { summary } = data || {};
  const draftCount = summary?.byStatus?.DRAFT || 0;
  const lockedCount = summary?.byStatus?.LOCKED || 0;
  const publishedCount = summary?.byStatus?.PUBLISHED || 0;
  const totalStudents = summary?.totalStudents || 0;
  const passedCount = summary?.passed || 0;
  const failedCount = summary?.failed || 0;
  const incompleteCount = summary?.incomplete || 0;

  const hasActiveFilters =
    searchTerm.trim() !== "" || resultFilter !== "ALL" || statusFilter !== "ALL";

  const clearFilters = () => {
    setSearchTerm("");
    setResultFilter("ALL");
    setStatusFilter("ALL");
  };

  // Lock all DRAFT results
  const handleLockAll = async () => {
    setShowLockConfirm(false);
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await lockResultsForExam(examId);
      toast.success(`${res.modified} draft result(s) locked.`);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to lock results.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  // Publish all LOCKED results
  const handlePublishAll = async () => {
    setShowPublishConfirm(false);
    setActionBusy(true);
    setActionError(null);
    setPublishBlockedDetails(null);
    try {
      const res = await publishResultsForExam(examId);
      toast.success(`${res.modified} locked result(s) published successfully.`);
      await load();
    } catch (err) {
      const respData = err.response?.data;
      const code = respData?.error?.code;
      const msg =
        respData?.error?.message ||
        respData?.message ||
        "Failed to publish results.";

      if (code === "INCOMPLETE_MARKS" && respData?.error?.details) {
        setPublishBlockedDetails(respData.error.details);
      }
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  // Unlock all LOCKED results
  const validateUnlockReason = () => {
    const trimmed = unlockReason.trim();
    if (!trimmed) {
      setUnlockReasonError("Unlock reason is required.");
      return false;
    }
    if (trimmed.length > MAX_UNLOCK_REASON_LENGTH) {
      setUnlockReasonError(
        `Unlock reason cannot exceed ${MAX_UNLOCK_REASON_LENGTH} characters.`
      );
      return false;
    }
    setUnlockReasonError("");
    return true;
  };

  const handleUnlockAll = async () => {
    if (!validateUnlockReason()) return;
    setShowUnlockModal(false);
    setActionBusy(true);
    setActionError(null);
    try {
      const lockedResults = (data?.results || []).filter(
        (r) => r.status === "LOCKED"
      );
      for (const r of lockedResults) {
        await unlockResult(r._id, unlockReason.trim());
      }
      toast.success(`${lockedResults.length} result(s) unlocked to Draft.`);
      setUnlockReason("");
      setUnlockReasonError("");
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to unlock results.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const statusPillClass = (s) =>
    s === "PUBLISHED"
      ? "pill-published"
      : s === "LOCKED"
      ? "pill-locked"
      : "pill-draft";

  const overallPillClass = (s) =>
    s === "PASS"
      ? "pill-pass"
      : s === "FAIL"
      ? "pill-fail"
      : "pill-incomplete";

  if (loading) return <Loading message="Loading examination results…" />;
  if (fetchError?.isAuthError) {
    return (
      <ApiError
        statusCode={fetchError.statusCode}
        errorCode={fetchError.errorCode}
        message={fetchError.message}
      />
    );
  }

  if (fetchError) {
    return (
      <div className="err container-fluid p-4">
        <style>{styles}</style>
        <Breadcrumb
          items={[
            { label: "Home", path: "/dashboard/exam" },
            { label: "Results Dashboard", path: "/dashboard/exam/results" },
            { label: "Review Results" },
          ]}
        />
        <div className="alert-edx alert-edx-danger mb-3">
          <FaExclamationTriangle />
          <div>{fetchError.message}</div>
        </div>
        <button
          type="button"
          className="btn-edx-outline"
          onClick={() => navigate("/dashboard/exam/results")}
        >
          <FaArrowLeft /> Back to Results Dashboard
        </button>
      </div>
    );
  }

  if (!data) return null;

  const exam = data.exam;

  return (
    <div className="err container-fluid p-4">
      <style>{styles}</style>

      {/* Lock Confirmation Modal */}
      <ConfirmModal
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={handleLockAll}
        title="Lock All Draft Results"
        message={`Locking will transition all ${draftCount} DRAFT result(s) to LOCKED status and prevent further marks edits. Existing locked or published records remain unaffected. Continue?`}
        type="warning"
        confirmText="Lock All Drafts"
        isLoading={actionBusy}
      />

      {/* Publish Confirmation Modal */}
      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublishAll}
        title="Publish All Locked Results"
        message={`Publishing will transition all ${lockedCount} LOCKED result(s) to PUBLISHED status and make them immediately visible to students. Any draft records will remain in draft. Continue?`}
        type="success"
        confirmText="Publish All Locked"
        isLoading={actionBusy}
      />

      {/* Custom Unlock Modal with Reason Validation */}
      {showUnlockModal && (
        <div className="modal-backdrop-custom">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal-box"
          >
            <div className="modal-header-custom">
              <div className="d-flex align-items-center gap-2">
                <FaLockOpen className="text-warning" />
                <h5 className="m-0 fw-bold text-dark">Unlock Results to Draft</h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockReason("");
                  setUnlockReasonError("");
                }}
                disabled={actionBusy}
              />
            </div>
            <div className="modal-body-custom">
              <p className="text-muted small mb-3">
                This will unlock all <strong>{lockedCount} LOCKED</strong> result(s) back to <strong>DRAFT</strong> status so marks can be modified or recalculated.
              </p>

              <label className="form-label fw-bold text-dark small mb-1">
                Reason for Unlocking <span className="text-danger">*</span>
              </label>
              <textarea
                className={`form-control ${unlockReasonError ? "is-invalid" : ""}`}
                rows={3}
                placeholder="Enter authorized justification for unlocking results (e.g. Marks grievance revaluation, attendance discrepancy)..."
                value={unlockReason}
                onChange={(e) => {
                  setUnlockReason(e.target.value);
                  if (unlockReasonError) setUnlockReasonError("");
                }}
                disabled={actionBusy}
              />
              <div className="d-flex justify-content-between align-items-center mt-1">
                {unlockReasonError ? (
                  <span className="text-danger small">{unlockReasonError}</span>
                ) : (
                  <span className="text-muted small">Required for audit trail</span>
                )}
                <span
                  className={`small ${
                    unlockReason.length > MAX_UNLOCK_REASON_LENGTH
                      ? "text-danger fw-bold"
                      : "text-muted"
                  }`}
                >
                  {unlockReason.length}/{MAX_UNLOCK_REASON_LENGTH}
                </span>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn-edx-outline"
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockReason("");
                  setUnlockReasonError("");
                }}
                disabled={actionBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-edx-warning"
                onClick={handleUnlockAll}
                disabled={actionBusy || !unlockReason.trim()}
              >
                {actionBusy ? (
                  <>
                    <FaSpinner className="spin" /> Unlocking…
                  </>
                ) : (
                  <>
                    <FaLockOpen /> Confirm Unlock
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Clean Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard/exam" },
          { label: "Results Dashboard", path: "/dashboard/exam/results" },
          { label: "Review Results" },
        ]}
      />

      {/* Standard PageHeader */}
      <PageHeader
        icon={FaChartBar}
        title={`Exam Result Review — ${exam.name}`}
        subtitle={`${exam.course_id?.name || "Course"} (${exam.course_id?.code || "Code"}) · Semester ${exam.semester} · ${exam.academicYear} · ${totalStudents} Students`}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn-edx-outline"
              onClick={() => navigate("/dashboard/exam")}
              title="View all exams"
            >
              <FaClipboardList aria-hidden="true" />
              <span>All Exams</span>
            </button>
          </div>
        }
      />

      {actionError && (
        <div className="alert-edx alert-edx-danger mt-3 mb-3">
          <FaExclamationTriangle />
          <div>
            <strong>Action Error:</strong> {actionError}
          </div>
        </div>
      )}

      {/* Publish Blocker Banner with Actionable Remediation */}
      {publishBlockedDetails && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert-edx alert-edx-danger mt-3 mb-3"
        >
          <div style={{ flex: 1 }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
              <div className="fw-bold fs-6 d-flex align-items-center gap-2">
                <FaExclamationTriangle />
                Cannot Publish Results: Incomplete Marks Detected
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger fw-bold"
                  onClick={() => navigate(`/dashboard/exam/results/generate?examId=${examId}`)}
                >
                  Regenerate Results
                </button>
              </div>
            </div>

            <p className="small mb-2">
              Publishing is blocked because marks have not been entered or finalized for{" "}
              <strong>{publishBlockedDetails.totalAffectedStudents} student(s)</strong> across{" "}
              <strong>{publishBlockedDetails.totalIncompleteSubjects} paper(s)</strong>.
            </p>

            <div className="blocked-issues-list">
              {publishBlockedDetails.issues.map((issue, idx) => (
                <div key={idx} className="blocked-issue-item">
                  <div>
                    <span className="fw-bold text-dark me-2">
                      {issue.studentName || "Student"}
                    </span>
                    {issue.enrollmentNumber && (
                      <span className="text-muted font-monospace me-2">
                        ({issue.enrollmentNumber})
                      </span>
                    )}
                    <span className="text-secondary">— {issue.subjectName || "Subject"}</span>
                  </div>
                  <span className="badge bg-danger text-white">
                    {issue.issue === "MARKS_NOT_ENTERED" ? "Marks Missing" : "Incomplete"}
                  </span>
                </div>
              ))}
            </div>

            <div className="small text-muted mt-2">
              Tip: Teachers must complete subject marks entry before results can be published.
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= 1. SUMMARY METRICS GRID ================= */}
      <div className="info-grid mt-3">
        <div className="info-item">
          <div className="info-icon info-icon-success" aria-hidden="true">
            <FaCheckCircle />
          </div>
          <div className="info-content">
            <span className="info-label">Passed</span>
            <span className="info-value text-success">{passedCount}</span>
            <span className="info-subtext">
              {totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0}% pass rate
            </span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon info-icon-danger" aria-hidden="true">
            <FaExclamationTriangle />
          </div>
          <div className="info-content">
            <span className="info-label">Failed</span>
            <span className="info-value text-danger">{failedCount}</span>
            <span className="info-subtext">Requires backlog attempt</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon info-icon-warning" aria-hidden="true">
            <FaClock />
          </div>
          <div className="info-content">
            <span className="info-label">Incomplete</span>
            <span className="info-value text-warning">{incompleteCount}</span>
            <span className="info-subtext">Pending / unentered marks</span>
          </div>
        </div>
      </div>

      {/* ================= 2. LIFECYCLE STATUS & ACTIONS PANEL ================= */}
      <div className="lifecycle-bar">
        <div className="lifecycle-status-group">
          <span className="lifecycle-label">Result Status</span>
          <div className="lifecycle-pills-row">
            <span className="pill pill-draft" title={`${draftCount} Draft records`}>
              <span className="pill-dot" />
              <span>Draft:</span>
              <strong>{draftCount}</strong>
            </span>
            <span className="pill pill-locked" title={`${lockedCount} Locked records`}>
              <span className="pill-dot" />
              <span>Locked:</span>
              <strong>{lockedCount}</strong>
            </span>
            <span className="pill pill-published" title={`${publishedCount} Published records`}>
              <span className="pill-dot" />
              <span>Published:</span>
              <strong>{publishedCount}</strong>
            </span>
            <span className="pill pill-total" title={`${totalStudents} Total students`}>
              <span>Total:</span>
              <strong>{totalStudents}</strong>
            </span>
          </div>
        </div>

        {/* State-aware Action Controls: Never Deadlocked */}
        <div className="lifecycle-actions">
          {/* Action 1: Lock Draft Results */}
          {draftCount > 0 && (
            <button
              type="button"
              className="btn-edx-primary"
              onClick={() => setShowLockConfirm(true)}
              disabled={actionBusy}
              title="Lock all current draft results"
            >
              {actionBusy ? (
                <FaSpinner className="spin" />
              ) : (
                <FaLock />
              )}
              <span>Lock Draft ({draftCount})</span>
            </button>
          )}

          {/* Action 2: Publish Locked Results */}
          {lockedCount > 0 && (
            <button
              type="button"
              className="btn-edx-success"
              onClick={() => setShowPublishConfirm(true)}
              disabled={actionBusy}
              title="Publish all locked results to students"
            >
              {actionBusy ? (
                <FaSpinner className="spin" />
              ) : (
                <FaGlobe />
              )}
              <span>Publish Locked ({lockedCount})</span>
            </button>
          )}

          {/* Action 3: Unlock Locked Results */}
          {lockedCount > 0 && (
            <button
              type="button"
              className="btn-edx-warning"
              onClick={() => {
                setShowUnlockModal(true);
                setUnlockReason("");
                setUnlockReasonError("");
              }}
              disabled={actionBusy}
              title="Unlock locked results back to draft"
            >
              {actionBusy ? (
                <FaSpinner className="spin" />
              ) : (
                <FaLockOpen />
              )}
              <span>Unlock Locked ({lockedCount})</span>
            </button>
          )}

          {/* Indicator: All Published */}
          {publishedCount > 0 && publishedCount === totalStudents && (
            <span className="all-published-indicator">
              <FaCheckCircle /> All {totalStudents} results published
            </span>
          )}

          {/* If No Results exist at all */}
          {totalStudents === 0 && (
            <button
              type="button"
              className="btn-edx-primary"
              onClick={() => navigate(`/dashboard/exam/results/generate?examId=${examId}`)}
            >
              <FaUndo /> Generate Results Now
            </button>
          )}
        </div>
      </div>

      {/* ================= 3. FILTER & SEARCH CONTROLS ================= */}
      <div className="filter-row">
        <div className="search-box">
          <FaSearch className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search student by name, roll no, or enrollment no…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search student records"
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search term"
              title="Clear search"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div className="filter-selects-group">
          {/* Academic Outcome Filter */}
          <div className="filter-select-wrapper">
            <FaFilter className="filter-icon" aria-hidden="true" />
            <select
              className="filter-select"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              aria-label="Filter by academic outcome"
            >
              <option value="ALL">All Outcomes</option>
              <option value="PASS">Passed ({passedCount})</option>
              <option value="FAIL">Failed ({failedCount})</option>
              <option value="INCOMPLETE">Incomplete ({incompleteCount})</option>
            </select>
          </div>

          {/* Lifecycle Status Filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by lifecycle status"
          >
            <option value="ALL">All Lifecycle Statuses</option>
            <option value="DRAFT">Draft ({draftCount})</option>
            <option value="LOCKED">Locked ({lockedCount})</option>
            <option value="PUBLISHED">Published ({publishedCount})</option>
          </select>

          {/* Page Size Selector */}
          <select
            className="filter-select page-size-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Number of students per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={clearFilters}
              title="Reset all active filters"
            >
              <FaTimes />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= 4. STUDENT RESULTS TABLE ================= */}
      <div className="table-card table-responsive mb-3">
        {totalStudents === 0 ? (
          <div className="empty-state">
            <FaClipboardList className="empty-state-icon" />
            <h5 className="empty-state-title">No Results Generated Yet</h5>
            <p className="empty-state-desc">
              Results for this examination have not been compiled yet. Generate results for all enrolled students to review outcomes.
            </p>
            <button
              type="button"
              className="btn-edx-primary"
              onClick={() => navigate(`/dashboard/exam/results/generate?examId=${examId}`)}
            >
              <FaUndo /> Generate Results for This Exam
            </button>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="empty-state">
            <FaExclamationTriangle className="empty-state-icon text-warning" />
            <h5 className="empty-state-title">No Results Match Filter</h5>
            <p className="empty-state-desc">
              No student records matched your search query or filter selection.
            </p>
            <button type="button" className="btn-edx-outline" onClick={clearFilters}>
              <FaTimes /> Clear All Filters
            </button>
          </div>
        ) : (
          <table className="table er-table">
            <thead>
              <tr>
                <th scope="col">Student Name</th>
                <th scope="col">Roll / Enrollment</th>
                <th scope="col" className="text-center">Papers</th>
                <th scope="col">Academic Outcome</th>
                <th scope="col">Lifecycle Status</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedResults.map((r) => {
                const isBlocked = blockedStudentIds.has(String(r.student_id?._id || r.student_id));
                const studentName = r.student_id?.fullName || "—";
                const studentId =
                  r.student_id?.enrollmentNumber ||
                  r.student_id?.rollNumber ||
                  "—";
                const totalPapers = r.totalSubjects || (r.subjects || []).length;

                return (
                  <tr key={r._id} className={isBlocked ? "row-blocked" : ""}>
                    <td>
                      <div className="student-name-cell">
                        <span className="student-name-text">{studentName}</span>
                        {isBlocked && (
                          <span
                            className="blocked-badge"
                            title="Missing marks block publishing for this student"
                          >
                            Marks Incomplete
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="student-id-code">
                        {studentId}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="papers-count">{totalPapers}</span>
                    </td>
                    <td>
                      <span className={`pill ${overallPillClass(r.overallResult)}`}>
                        <span className="pill-dot" />
                        <span>{r.overallResult}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${statusPillClass(r.status)}`}>
                        <span className="pill-dot" />
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn-sheet-view"
                        onClick={() => navigate(`/dashboard/exam/results/${r._id}`)}
                        title="View individual result sheet"
                        aria-label={`View result sheet for ${studentName}`}
                      >
                        <FaEye aria-hidden="true" />
                        <span>View Sheet</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredResults.length > 0 && (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 mb-4">
          <div className="text-muted small fw-medium">
            Showing <strong className="text-dark">{(page - 1) * pageSize + 1}</strong>–
            <strong className="text-dark">{Math.min(page * pageSize, filteredResults.length)}</strong> of{" "}
            <strong className="text-dark">{filteredResults.length}</strong> students
          </div>
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
    </div>
  );
}
