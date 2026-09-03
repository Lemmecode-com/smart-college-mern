import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { getExamResultSummaries } from "../../../api/results";
import { logger } from "../../../utils/logger";

import {
  FaClock,
  FaPlus,
  FaEye,
  FaEdit,
  FaBookOpen,
  FaLayerGroup,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCog,
  FaLock,
  FaGlobe,
  FaChevronRight,
  FaStream,
  FaTasks,
  FaClipboardCheck,
  FaBullhorn,
  FaChartBar,
  FaBolt,
} from "react-icons/fa";
import { motion } from "framer-motion";

/* =========================================================
   Internal CSS — scoped under .exam-dashboard so nothing
   leaks into the rest of the app. Palette is pulled from
   the sidebar (deep navy + cyan accent).
   ========================================================= */
const dashboardStyles = `
.exam-dashboard {
  --edx-bg: #f4f7fa;
  --edx-navy-950: #06192c;
  --edx-navy-900: #0c2b47;
  --edx-navy-800: #123a5e;
  --edx-navy-700: #1a4a73;
  --edx-cyan-600: #0e93ab;
  --edx-cyan-500: #17aecb;
  --edx-cyan-50: #e7f7fa;
  --edx-amber-600: #b6790d;
  --edx-amber-500: #e8a531;
  --edx-amber-50: #fdf1de;
  --edx-green-600: #1f8a5f;
  --edx-green-500: #2aa876;
  --edx-green-50: #e5f6ee;
  --edx-red-500: #e5484d;
  --edx-red-50: #fdecec;
  --edx-slate-900: #1d2733;
  --edx-slate-600: #55677c;
  --edx-slate-400: #8695a7;
  --edx-slate-200: #dfe6ec;
  --edx-slate-100: #eef2f6;

  background: var(--edx-bg);
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--edx-slate-900);
}

/* ---------- Breadcrumb spacing ---------- */
.exam-dashboard nav.erp-breadcrumb { margin-bottom: 1.1rem; }

/* ---------- Header ---------- */
.exam-dashboard .edx-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}
.exam-dashboard .edx-header-left {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.exam-dashboard .edx-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: var(--edx-cyan-500);
  font-size: 1.15rem;
  flex-shrink: 0;
}
.exam-dashboard .edx-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--edx-navy-950);
  margin: 0;
  line-height: 1.2;
}
.exam-dashboard .edx-subtitle {
  color: var(--edx-slate-600);
  margin: 0.15rem 0 0;
  font-size: 0.92rem;
}
.exam-dashboard .edx-divider {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--edx-navy-900) 0%, var(--edx-cyan-500) 55%, transparent 100%);
  margin: 1.1rem 0 1.5rem;
}

.exam-dashboard .btn-edx-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1.3rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 2px 6px rgba(12, 43, 71, 0.18);
}
.exam-dashboard .btn-edx-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(23, 174, 203, 0.28);
  background: linear-gradient(135deg, var(--edx-navy-800), var(--edx-cyan-600));
}
.exam-dashboard .btn-edx-primary:focus-visible {
  outline: 3px solid var(--edx-cyan-50);
  outline-offset: 2px;
}

/* ---------- Stat cards ---------- */
.exam-dashboard .stat-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.06);
  padding: 1.15rem 1.25rem;
  height: 100%;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.exam-dashboard .stat-card:hover {
  box-shadow: 0 8px 20px rgba(12, 43, 71, 0.08);
  transform: translateY(-2px);
}
.exam-dashboard .stat-card-header {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.exam-dashboard .stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}
.exam-dashboard .stat-icon-primary { background: var(--edx-cyan-50); color: var(--edx-navy-800); border-left: 3px solid var(--edx-navy-800); }
.exam-dashboard .stat-icon-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-left: 3px solid var(--edx-amber-500); }
.exam-dashboard .stat-icon-success { background: var(--edx-green-50); color: var(--edx-green-600); border-left: 3px solid var(--edx-green-500); }
.exam-dashboard .stat-icon-info { background: rgba(12,43,71,0.08); color: var(--edx-navy-800); border-left: 3px solid var(--edx-cyan-500); }
.exam-dashboard .stat-card-details { display: flex; flex-direction: column; }
.exam-dashboard .stat-label { color: var(--edx-slate-600); font-size: 0.85rem; }
.exam-dashboard .stat-value { color: var(--edx-navy-950); font-size: 1.65rem; font-weight: 700; line-height: 1.2; }

/* ---------- Lifecycle + Action Required cards ---------- */
.exam-dashboard .overview-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.06);
  padding: 1.25rem 1.4rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.exam-dashboard .overview-card-header {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1rem;
}
.exam-dashboard .overview-card-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: var(--edx-cyan-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}
.exam-dashboard .overview-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--edx-navy-950);
  margin: 0;
  line-height: 1.2;
}
.exam-dashboard .overview-card-subtitle {
  color: var(--edx-slate-600);
  font-size: 0.8rem;
  margin: 0.1rem 0 0;
}

/* Lifecycle track */
.exam-dashboard .lifecycle-track {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  align-items: stretch;
  flex: 1;
}
.exam-dashboard .lifecycle-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--edx-slate-100);
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.75rem 0.4rem;
  position: relative;
  min-height: 88px;
}
.exam-dashboard .lifecycle-step.is-active {
  background: var(--edx-cyan-50);
  border-color: var(--edx-cyan-500);
}
.exam-dashboard .lifecycle-step-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  background: #fff;
  color: var(--edx-slate-400);
  margin-bottom: 0.4rem;
  border: 1px solid var(--edx-slate-200);
}
.exam-dashboard .lifecycle-step.is-active .lifecycle-step-icon {
  background: var(--edx-navy-900);
  color: var(--edx-cyan-500);
  border-color: var(--edx-navy-900);
}
.exam-dashboard .lifecycle-step-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--edx-slate-600);
  line-height: 1.15;
}
.exam-dashboard .lifecycle-step.is-active .lifecycle-step-label {
  color: var(--edx-navy-900);
}
.exam-dashboard .lifecycle-step-count {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--edx-navy-950);
  margin-top: 0.15rem;
  line-height: 1;
}
.exam-dashboard .lifecycle-step.is-active .lifecycle-step-count {
  color: var(--edx-navy-900);
}
.exam-dashboard .lifecycle-legend {
  margin-top: 0.85rem;
  font-size: 0.75rem;
  color: var(--edx-slate-600);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Action required list */
.exam-dashboard .action-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  flex: 1;
}
.exam-dashboard .action-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  background: var(--edx-slate-100);
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: inherit;
  color: inherit;
}
.exam-dashboard .action-item:hover {
  background: var(--edx-cyan-50);
  border-color: var(--edx-cyan-500);
  transform: translateY(-1px);
}
.exam-dashboard .action-item:focus-visible {
  outline: 2px solid var(--edx-cyan-500);
  outline-offset: 2px;
}
.exam-dashboard .action-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--edx-cyan-50);
  color: var(--edx-navy-800);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.exam-dashboard .action-item-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.exam-dashboard .action-item-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--edx-slate-900);
  line-height: 1.2;
}
.exam-dashboard .action-item-sub {
  color: var(--edx-slate-600);
  font-size: 0.78rem;
  margin-top: 0.15rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.exam-dashboard .action-item-chevron {
  color: var(--edx-slate-400);
  font-size: 0.75rem;
  flex-shrink: 0;
}
.exam-dashboard .action-item:hover .action-item-chevron { color: var(--edx-cyan-600); }

.exam-dashboard .action-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.5rem 0.75rem;
  color: var(--edx-slate-600);
}
.exam-dashboard .action-empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--edx-green-50);
  color: var(--edx-green-600);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.7rem;
  font-size: 1.2rem;
}
.exam-dashboard .action-empty-title {
  font-weight: 700;
  color: var(--edx-navy-950);
  margin-bottom: 0.25rem;
}
.exam-dashboard .action-empty-text {
  font-size: 0.82rem;
  max-width: 360px;
  margin: 0 auto;
}

@media (max-width: 991.98px) {
  .exam-dashboard .lifecycle-track {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 575.98px) {
  .exam-dashboard .lifecycle-track {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ---------- Recent / Active Exams card ---------- */
.exam-dashboard .recent-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.06);
  overflow: hidden;
}
.exam-dashboard .recent-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.4rem;
  border-bottom: 1px solid var(--edx-slate-100);
  flex-wrap: wrap;
}
.exam-dashboard .recent-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.exam-dashboard .recent-card-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: var(--edx-cyan-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}
.exam-dashboard .recent-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--edx-navy-950);
  margin: 0;
  line-height: 1.2;
}
.exam-dashboard .recent-card-subtitle {
  color: var(--edx-slate-600);
  font-size: 0.8rem;
  margin: 0.1rem 0 0;
}
.exam-dashboard .recent-view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1px solid var(--edx-slate-200);
  color: var(--edx-navy-800);
  font-weight: 600;
  font-size: 0.82rem;
  padding: 0.4rem 0.85rem;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
}
.exam-dashboard .recent-view-all:hover {
  background: var(--edx-cyan-50);
  border-color: var(--edx-cyan-500);
  color: var(--edx-cyan-600);
}
.exam-dashboard .recent-view-all:focus-visible {
  outline: 2px solid var(--edx-cyan-500);
  outline-offset: 2px;
}
.exam-dashboard .recent-table {
  margin-bottom: 0;
}
.exam-dashboard .recent-table thead th {
  background: var(--edx-slate-100);
  color: var(--edx-navy-900);
  font-weight: 600;
  font-size: 0.78rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.7rem 1rem;
  white-space: nowrap;
}
.exam-dashboard .recent-table tbody td {
  padding: 0.7rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.88rem;
}
.exam-dashboard .recent-table tbody tr { transition: background 0.12s ease; }
.exam-dashboard .recent-table tbody tr:hover { background: var(--edx-cyan-50); }
.exam-dashboard .recent-table tbody tr:last-child td { border-bottom: none; }
.exam-dashboard .recent-row-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--edx-cyan-50);
  color: var(--edx-navy-800);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}
.exam-dashboard .recent-row-title {
  font-weight: 600;
  color: var(--edx-slate-900);
  font-size: 0.88rem;
  line-height: 1.2;
}
.exam-dashboard .recent-course-name {
  font-weight: 600;
  color: var(--edx-slate-900);
  font-size: 0.85rem;
  line-height: 1.2;
}
.exam-dashboard .recent-course-code {
  color: var(--edx-slate-600);
  font-size: 0.72rem;
}
.exam-dashboard .recent-year {
  color: var(--edx-slate-600);
  font-size: 0.85rem;
}
.exam-dashboard .recent-actions {
  display: flex;
  gap: 0.4rem;
}
.exam-dashboard .recent-mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: #fff;
  border: 1px solid var(--edx-slate-200);
  color: var(--edx-slate-600);
  border-radius: 8px;
  padding: 0.32rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
}
.exam-dashboard .recent-mini-btn:hover {
  border-color: var(--edx-cyan-500);
  color: var(--edx-cyan-600);
  background: var(--edx-cyan-50);
}
.exam-dashboard .recent-mini-btn-edit:hover {
  border-color: var(--edx-navy-700);
  color: var(--edx-navy-800);
  background: var(--edx-slate-100);
}
.exam-dashboard .recent-mini-btn:focus-visible {
  outline: 2px solid var(--edx-cyan-500);
  outline-offset: 2px;
}
.exam-dashboard .recent-empty {
  text-align: center;
  padding: 2.25rem 1rem;
  color: var(--edx-slate-600);
}
.exam-dashboard .recent-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--edx-slate-100);
  color: var(--edx-slate-400);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.7rem;
  font-size: 1.25rem;
}
.exam-dashboard .recent-empty-title {
  font-weight: 700;
  color: var(--edx-navy-950);
  margin-bottom: 0.2rem;
}
.exam-dashboard .recent-empty-text {
  font-size: 0.85rem;
  margin: 0;
}

/* Mobile card treatment (replaces table) */
.exam-dashboard .recent-mobile-list {
  display: none;
  flex-direction: column;
}
.exam-dashboard .recent-mobile-item {
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid var(--edx-slate-100);
}
.exam-dashboard .recent-mobile-item:last-child { border-bottom: none; }
.exam-dashboard .recent-mobile-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.45rem;
}
.exam-dashboard .recent-mobile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  font-size: 0.78rem;
  color: var(--edx-slate-600);
  margin-bottom: 0.6rem;
}
.exam-dashboard .recent-mobile-actions {
  display: flex;
  gap: 0.45rem;
}

@media (max-width: 767.98px) {
  .exam-dashboard .recent-table-wrap { display: none; }
  .exam-dashboard .recent-mobile-list { display: flex; }
  .exam-dashboard .recent-card-header { padding: 0.95rem 1.1rem; }
  .exam-dashboard .recent-card-header-left { flex: 1; min-width: 0; }
}

/* ---------- Result Processing + Quick Actions ---------- */
.exam-dashboard .rproc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.45rem;
}
.exam-dashboard .rproc-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--edx-slate-900);
  font-size: 0.88rem;
  font-weight: 600;
}
.exam-dashboard .rproc-label .rproc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.exam-dashboard .rproc-label .rproc-dot-draft { background: var(--edx-amber-500); }
.exam-dashboard .rproc-label .rproc-dot-locked { background: var(--edx-navy-800); }
.exam-dashboard .rproc-label .rproc-dot-published { background: var(--edx-green-500); }
.exam-dashboard .rproc-value {
  color: var(--edx-navy-950);
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.exam-dashboard .rproc-bar {
  width: 100%;
  height: 8px;
  background: var(--edx-slate-100);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.9rem;
}
.exam-dashboard .rproc-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.exam-dashboard .rproc-bar-fill-draft { background: linear-gradient(90deg, var(--edx-amber-500), var(--edx-amber-600)); }
.exam-dashboard .rproc-bar-fill-locked { background: linear-gradient(90deg, var(--edx-navy-800), var(--edx-navy-900)); }
.exam-dashboard .rproc-bar-fill-published { background: linear-gradient(90deg, var(--edx-green-500), var(--edx-green-600)); }
.exam-dashboard .rproc-empty {
  text-align: center;
  padding: 1.5rem 0.5rem;
  color: var(--edx-slate-600);
}
.exam-dashboard .rproc-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--edx-slate-100);
  color: var(--edx-slate-400);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.6rem;
  font-size: 1.05rem;
}
.exam-dashboard .rproc-empty-title {
  font-weight: 700;
  color: var(--edx-navy-950);
  margin-bottom: 0.2rem;
}
.exam-dashboard .rproc-empty-text {
  font-size: 0.82rem;
  margin: 0;
}
.exam-dashboard .rproc-footer {
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid var(--edx-slate-100);
  display: flex;
  justify-content: flex-end;
}
.exam-dashboard .rproc-view-all {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  border: 1px solid var(--edx-slate-200);
  color: var(--edx-navy-800);
  font-weight: 600;
  font-size: 0.82rem;
  padding: 0.4rem 0.85rem;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
}
.exam-dashboard .rproc-view-all:hover {
  background: var(--edx-cyan-50);
  border-color: var(--edx-cyan-500);
  color: var(--edx-cyan-600);
}
.exam-dashboard .rproc-view-all:focus-visible {
  outline: 2px solid var(--edx-cyan-500);
  outline-offset: 2px;
}

/* Quick action rows reuse action-item styling; minor variant */
.exam-dashboard .qa-icon {
  background: var(--edx-cyan-50);
  color: var(--edx-navy-800);
}
.exam-dashboard .qa-icon-warning {
  background: var(--edx-amber-50);
  color: var(--edx-amber-600);
}
.exam-dashboard .qa-icon-success {
  background: var(--edx-green-50);
  color: var(--edx-green-600);
}
.exam-dashboard .qa-icon-info {
  background: rgba(12, 43, 71, 0.08);
  color: var(--edx-navy-800);
}

/* ---------- Filter card ---------- */
.exam-dashboard .filter-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.06);
  padding: 1.1rem 1.25rem;
}
.exam-dashboard .filter-card-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--edx-navy-800);
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}
.exam-dashboard .filter-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.exam-dashboard .search-box {
  flex: 1 1 260px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.55rem 0.85rem;
  background: var(--edx-bg);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.exam-dashboard .search-box:focus-within {
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
  background: #fff;
}
.exam-dashboard .search-box svg { color: var(--edx-slate-400); flex-shrink: 0; }
.exam-dashboard .search-box input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.92rem;
  color: var(--edx-slate-900);
  min-width: 0;
}
.exam-dashboard .search-clear {
  border: none;
  background: var(--edx-slate-200);
  color: var(--edx-slate-600);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  cursor: pointer;
  flex-shrink: 0;
}
.exam-dashboard .search-clear:hover { background: var(--edx-slate-400); color: #fff; }

.exam-dashboard .select-box {
  flex: 0 1 210px;
  position: relative;
}
.exam-dashboard .select-box select {
  width: 100%;
  appearance: none;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.6rem 2.1rem 0.6rem 0.85rem;
  font-size: 0.92rem;
  color: var(--edx-slate-900);
  background: var(--edx-bg);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.exam-dashboard .select-box select:focus {
  outline: none;
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
  background: #fff;
}
.exam-dashboard .select-box::after {
  content: "";
  position: absolute;
  right: 0.9rem;
  top: 50%;
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--edx-slate-400);
  border-bottom: 2px solid var(--edx-slate-400);
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
}

/* ---------- Table card ---------- */
.exam-dashboard .table-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.06);
  overflow: hidden;
}
.exam-dashboard table { margin-bottom: 0; }
.exam-dashboard thead th {
  background: var(--edx-slate-100);
  color: var(--edx-navy-900);
  font-weight: 600;
  font-size: 0.82rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.85rem 1rem;
  white-space: nowrap;
}
.exam-dashboard tbody td {
  padding: 0.8rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.9rem;
}
.exam-dashboard tbody tr { transition: background 0.12s ease; }
.exam-dashboard tbody tr:hover { background: var(--edx-cyan-50); }
.exam-dashboard tbody tr:last-child td { border-bottom: none; }

.exam-dashboard .row-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--edx-cyan-50);
  color: var(--edx-navy-800);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  flex-shrink: 0;
}
.exam-dashboard .row-title { font-weight: 600; color: var(--edx-slate-900); }
.exam-dashboard .course-cell-icon { color: var(--edx-slate-400); font-size: 0.85rem; }
.exam-dashboard .course-name { font-weight: 600; color: var(--edx-slate-900); font-size: 0.9rem; }
.exam-dashboard .course-code { color: var(--edx-slate-600); font-size: 0.78rem; }
.exam-dashboard .year-cell { color: var(--edx-slate-600); }

/* pills / badges */
.exam-dashboard .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}
.exam-dashboard .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.exam-dashboard .pill-cyan { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.exam-dashboard .pill-slate { background: var(--edx-slate-100); color: var(--edx-slate-600); }
.exam-dashboard .pill-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.exam-dashboard .pill-success .pill-dot { background: var(--edx-green-500); }
.exam-dashboard .pill-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.exam-dashboard .pill-warning .pill-dot { background: var(--edx-amber-500); }

/* action buttons */
.exam-dashboard .icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: 1px solid var(--edx-slate-200);
  background: #fff;
  color: var(--edx-slate-600);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.85rem;
}
.exam-dashboard .icon-btn-view:hover { border-color: var(--edx-cyan-500); color: var(--edx-cyan-600); background: var(--edx-cyan-50); }
.exam-dashboard .icon-btn-edit:hover { border-color: var(--edx-navy-700); color: var(--edx-navy-800); background: var(--edx-slate-100); }
.exam-dashboard .icon-btn:focus-visible { outline: 2px solid var(--edx-cyan-500); outline-offset: 2px; }

/* ---------- Empty state ---------- */
.exam-dashboard .empty-state { text-align: center; padding: 3.5rem 1.5rem; }
.exam-dashboard .empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--edx-slate-100);
  color: var(--edx-slate-400);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 1.6rem;
}
.exam-dashboard .empty-title { color: var(--edx-navy-950); font-weight: 700; margin-bottom: 0.4rem; }
.exam-dashboard .empty-text { color: var(--edx-slate-600); font-size: 0.92rem; max-width: 420px; margin: 0 auto; }

/* ---------- Error fallback ---------- */
.exam-dashboard .edx-alert {
  background: var(--edx-red-50);
  color: var(--edx-red-500);
  border: 1px solid rgba(229, 72, 77, 0.25);
  border-radius: 10px;
  padding: 0.9rem 1.1rem;
  font-size: 0.92rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .exam-dashboard .edx-header { flex-direction: column; align-items: stretch; }
  .exam-dashboard .btn-edx-primary { justify-content: center; }
  .exam-dashboard .filter-row { flex-direction: column; }
  .exam-dashboard .select-box { flex: 1 1 auto; }
}

@media (prefers-reduced-motion: reduce) {
  .exam-dashboard * { animation: none !important; transition: none !important; }
}
`;

export default function ExamDashboard() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= FETCH EXAMS ================= */
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get("/exam");
        const examsData = Array.isArray(res.data) ? res.data :
                          Array.isArray(res.data.data) ? res.data.data : [];
        setExams(examsData);

        // Best-effort: load exam-level result summaries so the
        // "Processing" KPI can reflect exams that have started
        // generating results. Failures are non-fatal — KPI will
        // fall back to zero rather than blocking the page.
        try {
          const summaries = await getExamResultSummaries();
          const map = {};
          for (const s of Array.isArray(summaries) ? summaries : []) {
            map[s.examId] = s.summary;
          }
          setResultMap(map);
        } catch (summaryErr) {
          logger.error("Error fetching exam result summaries:", summaryErr?.response?.status);
          setResultMap({});
        }
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;
        const errorMessage = backendMessage || "Failed to load exams. Please try again.";

        logger.error("Error fetching exams:", statusCode, errorCode);

        if (AUTH_ERROR_CODES.has(errorCode)) {
          setError({ message: errorMessage, statusCode, errorCode, isAuthError: true });
        } else {
          setError({ message: errorMessage, statusCode, errorCode });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  /* ================= LIFECYCLE COUNTS =================
     The exam model exposes only DRAFT / PUBLISHED. There is
     no marks-entry progress or start/end date in the API, so
     each lifecycle bucket is mapped ONLY to fields that are
     reliably available. Counts are derived from the exam list
     + the per-exam result summary (byStatus).
       DRAFT              -> exam.status === "DRAFT"
       MARKS ENTRY        -> PUBLISHED exam that has NO results yet
       RESULT GENERATION  -> PUBLISHED exam with DRAFT results
       REVIEW             -> PUBLISHED exam with LOCKED results
                             (and no DRAFT or PUBLISHED results)
       LOCKED             -> PUBLISHED exam that is fully LOCKED
       PUBLISHED          -> PUBLISHED exam that is fully PUBLISHED
     "Processing" KPI (top of page) and the cards below stay
     consistent with the same source of truth.
  */
  const lifecycleCounts = useMemo(() => {
    const counts = {
      draft: 0,
      marksEntry: 0,
      generation: 0,
      review: 0,
      locked: 0,
      published: 0,
    };
    for (const exam of exams) {
      const summary = resultMap[exam._id];
      const total = summary ? summary.totalStudents : 0;
      const by = summary ? summary.byStatus || {} : {};
      const draft = by.DRAFT || 0;
      const locked = by.LOCKED || 0;
      const published = by.PUBLISHED || 0;

      if (exam.status === "DRAFT") {
        counts.draft += 1;
        continue;
      }
      // exam.status === "PUBLISHED" from here on
      if (total === 0) {
        counts.marksEntry += 1;
      } else if (draft > 0) {
        counts.generation += 1;
      } else if (published === total) {
        counts.published += 1;
      } else if (locked === total) {
        counts.locked += 1;
      } else if (locked > 0 && draft === 0 && published === 0) {
        counts.review += 1;
      } else {
        // Mixed-state (e.g. some locked + some published):
        // group under REVIEW as the active review stage.
        counts.review += 1;
      }
    }
    return counts;
  }, [exams, resultMap]);

  /* ================= ACTION REQUIRED =================
     Built from real, currently-actionable items. Order of
     priority (most urgent first), capped at 6 entries.
       1. Draft exams awaiting publish       -> /dashboard/exam
       2. PUBLISHED exams with no results    -> generate results
       3. PUBLISHED exams with DRAFT results -> review results
       4. PUBLISHED exams fully LOCKED       -> publish results
     Uses existing routes only; no new APIs.
  */
  const actionItems = useMemo(() => {
    const items = [];
    for (const exam of exams) {
      const summary = resultMap[exam._id];
      const total = summary ? summary.totalStudents : 0;
      const by = summary ? summary.byStatus || {} : {};
      const draft = by.DRAFT || 0;
      const locked = by.LOCKED || 0;
      const published = by.PUBLISHED || 0;
      const courseName = exam.course_id?.name || "Course";
      const courseLine = `${courseName} · Sem ${exam.semester} · ${exam.academicYear}`;

      if (exam.status === "DRAFT") {
        items.push({
          key: `draft-${exam._id}`,
          priority: 1,
          icon: "edit",
          title: `Review draft exam: ${exam.name}`,
          sub: courseLine,
          to: `/dashboard/exam/edit/${exam._id}`,
        });
        continue;
      }
      if (exam.status === "PUBLISHED") {
        if (total === 0) {
          items.push({
            key: `gen-${exam._id}`,
            priority: 2,
            icon: "cog",
            title: `Generate results for ${exam.name}`,
            sub: courseLine,
            to: `/dashboard/exam/results/generate?examId=${exam._id}`,
          });
        } else if (draft > 0) {
          items.push({
            key: `rev-${exam._id}`,
            priority: 3,
            icon: "eye",
            title: `Review results for ${exam.name}`,
            sub: `${draft} draft result${draft === 1 ? "" : "s"} pending`,
            to: `/dashboard/exam/results/review/${exam._id}`,
          });
        } else if (locked === total && published < total) {
          items.push({
            key: `pub-${exam._id}`,
            priority: 4,
            icon: "globe",
            title: `Publish results for ${exam.name}`,
            sub: `${locked} locked result${locked === 1 ? "" : "s"} ready to publish`,
            to: `/dashboard/exam/results`,
          });
        }
      }
    }
    items.sort((a, b) => a.priority - b.priority);
    return items.slice(0, 6);
  }, [exams, resultMap]);

  const actionIcon = (kind) => {
    if (kind === "edit") return <FaEdit />;
    if (kind === "cog") return <FaCog />;
    if (kind === "eye") return <FaEye />;
    if (kind === "globe") return <FaGlobe />;
    return <FaChevronRight />;
  };

  /* ================= RECENT EXAMS =================
     The exam API does not expose a date or "active" flag,
     so we surface the most recent/relevant exams using only
     what the GET /exam payload already gives us. DRAFT exams
     are prioritised (they need attention), then PUBLISHED
     exams, taking the first 5 records (server's existing
     order, no fabrication of dates or status).
  */
  const recentExams = useMemo(() => {
    if (!Array.isArray(exams) || exams.length === 0) return [];
    const ordered = [...exams].sort((a, b) => {
      const aDraft = a.status === "DRAFT" ? 0 : 1;
      const bDraft = b.status === "DRAFT" ? 0 : 1;
      return aDraft - bDraft;
    });
    return ordered.slice(0, 5);
  }, [exams]);

  const getRecentStatusPill = (status) => {
    if (status === "PUBLISHED") {
      return (
        <span className="pill pill-success">
          <span className="pill-dot" />
          Published
        </span>
      );
    }
    return (
      <span className="pill pill-warning">
        <span className="pill-dot" />
        Draft
      </span>
    );
  };

  /* ================= RESULT TOTALS =================
     Sum DRAFT / LOCKED / PUBLISHED result counts across
     every exam, derived from the existing
     getExamResultSummaries() payload (byStatus per exam).
     The maximum is used only to scale the bar widths
     (no percentages or invented ratios are shown).
  */
  const resultTotals = useMemo(() => {
    let draft = 0;
    let locked = 0;
    let published = 0;
    let total = 0;
    for (const examId in resultMap) {
      const summary = resultMap[examId];
      if (!summary) continue;
      const by = summary.byStatus || {};
      draft += by.DRAFT || 0;
      locked += by.LOCKED || 0;
      published += by.PUBLISHED || 0;
      total += summary.totalStudents || 0;
    }
    return { draft, locked, published, total };
  }, [resultMap]);

  const resultBarWidth = (value) => {
    if (resultTotals.total <= 0) return 0;
    return Math.max(0, Math.min(100, (value / resultTotals.total) * 100));
  };

  const quickActions = [
    {
      key: "create-exam",
      title: "Create Exam",
      sub: "Set up a new examination",
      icon: <FaPlus />,
      iconClass: "qa-icon",
      to: "/dashboard/exam/create",
    },
    {
      key: "manage-exams",
      title: "Manage Exams",
      sub: "View and manage exams",
      icon: <FaClipboardCheck />,
      iconClass: "qa-icon qa-icon-info",
      to: "/dashboard/exam",
    },
    {
      key: "review-results",
      title: "Review Results",
      sub: "Review examination results",
      icon: <FaEye />,
      iconClass: "qa-icon qa-icon-success",
      to: "/dashboard/exam/results",
    },
    {
      key: "generate-results",
      title: "Generate Results",
      sub: "Generate examination results",
      icon: <FaCog />,
      iconClass: "qa-icon qa-icon-warning",
      to: "/dashboard/exam/results/generate",
    },
  ];

  /* ================= ACTIONS ================= */
  const handleCreateExam = () => {
    navigate("/dashboard/exam/create");
  };

  /* ================= RENDER ================= */
  if (loading) {
    return <Loading message="Loading exams..." />;
  }

  if (error) {
    if (error.isAuthError) {
      return (
        <ApiError
          statusCode={error.statusCode}
          errorCode={error.errorCode}
          message={error.message}
        />
      );
    }
    return (
      <div className="exam-dashboard container-fluid p-4">
        <style>{dashboardStyles}</style>
        <div className="edx-alert">{error.message}</div>
        <button className="btn-edx-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="exam-dashboard container-fluid p-4">
      <style>{dashboardStyles}</style>

      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard" },
          { label: "Exam Dashboard" },
        ]}
      />

      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="edx-header"
      >
        <div className="edx-header-left">
          <div className="edx-header-icon">
            <FaClock />
          </div>
          <div>
            <h2 className="edx-title">Exam Coordinator Overview</h2>
            <p className="edx-subtitle">Monitor examinations, marks and result processing</p>
          </div>
        </div>
      </motion.div>
      <div className="edx-divider" />

      {/* Stats */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        className="row mb-4 g-3"
      >
        <div className="col-xl-3 col-md-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-primary">
                <FaClock />
              </div>
              <div className="stat-card-details">
                <span className="stat-label">Total exams</span>
                <span className="stat-value">{exams.length}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-warning">
                <FaExclamationTriangle />
              </div>
              <div className="stat-card-details">
                <span className="stat-label">Draft exams</span>
                <span className="stat-value">
                  {exams.filter((e) => e.status === "DRAFT").length}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-info">
                <FaCog />
              </div>
              <div className="stat-card-details">
                <span className="stat-label">Processing</span>
                <span className="stat-value">
                  {exams.filter((e) => {
                    const summary = resultMap[e._id];
                    if (!summary) return false;
                    if (summary.totalStudents === 0) return false;
                    const { byStatus } = summary;
                    if (byStatus.PUBLISHED === summary.totalStudents) return false;
                    const draft = byStatus.DRAFT || 0;
                    const locked = byStatus.LOCKED || 0;
                    const published = byStatus.PUBLISHED || 0;
                    return draft > 0 || (locked > 0 && published > 0) || (locked > 0 && draft > 0);
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-success">
                <FaBookOpen />
              </div>
              <div className="stat-card-details">
                <span className="stat-label">Published exams</span>
                <span className="stat-value">
                  {exams.filter((e) => e.status === "PUBLISHED").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Result Processing + Quick Actions */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
        className="row mb-4 g-3"
      >
        <div className="col-lg-6">
          <div className="overview-card">
            <div className="overview-card-header">
              <div className="overview-card-icon"><FaChartBar /></div>
              <div>
                <h3 className="overview-card-title">Result Processing</h3>
                <p className="overview-card-subtitle">
                  Totals across all exam results
                </p>
              </div>
            </div>

            {resultTotals.total === 0 ? (
              <div className="rproc-empty">
                <div className="rproc-empty-icon"><FaClipboardCheck /></div>
                <div className="rproc-empty-title">No results yet</div>
                <p className="rproc-empty-text">
                  Generate results for a published exam to see processing totals here.
                </p>
              </div>
            ) : (
              <>
                <div className="rproc-row">
                  <span className="rproc-label">
                    <span className="rproc-dot rproc-dot-draft" />
                    Draft Results
                  </span>
                  <span className="rproc-value">{resultTotals.draft}</span>
                </div>
                <div className="rproc-bar">
                  <div
                    className="rproc-bar-fill rproc-bar-fill-draft"
                    style={{ width: `${resultBarWidth(resultTotals.draft)}%` }}
                  />
                </div>

                <div className="rproc-row">
                  <span className="rproc-label">
                    <span className="rproc-dot rproc-dot-locked" />
                    Locked Results
                  </span>
                  <span className="rproc-value">{resultTotals.locked}</span>
                </div>
                <div className="rproc-bar">
                  <div
                    className="rproc-bar-fill rproc-bar-fill-locked"
                    style={{ width: `${resultBarWidth(resultTotals.locked)}%` }}
                  />
                </div>

                <div className="rproc-row">
                  <span className="rproc-label">
                    <span className="rproc-dot rproc-dot-published" />
                    Published Results
                  </span>
                  <span className="rproc-value">{resultTotals.published}</span>
                </div>
                <div className="rproc-bar">
                  <div
                    className="rproc-bar-fill rproc-bar-fill-published"
                    style={{ width: `${resultBarWidth(resultTotals.published)}%` }}
                  />
                </div>
              </>
            )}

            <div className="rproc-footer">
              <button
                type="button"
                className="rproc-view-all"
                onClick={() => navigate("/dashboard/exam/results")}
              >
                View Results <FaChevronRight />
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="overview-card">
            <div className="overview-card-header">
              <div className="overview-card-icon"><FaBolt /></div>
              <div>
                <h3 className="overview-card-title">Quick Actions</h3>
                <p className="overview-card-subtitle">
                  Jump to common examination tasks
                </p>
              </div>
            </div>
            <ul className="action-list">
              {quickActions.map((qa) => (
                <li key={qa.key}>
                  <button
                    type="button"
                    className="action-item"
                    onClick={() => navigate(qa.to)}
                  >
                    <span className={`action-item-icon ${qa.iconClass}`}>{qa.icon}</span>
                    <span className="action-item-body">
                      <span className="action-item-title">{qa.title}</span>
                      <span className="action-item-sub">{qa.sub}</span>
                    </span>
                    <span className="action-item-chevron"><FaChevronRight /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Lifecycle + Action Required */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
        className="row mb-4 g-3"
      >
        <div className="col-lg-6">
          <div className="overview-card">
            <div className="overview-card-header">
              <div className="overview-card-icon"><FaStream /></div>
              <div>
                <h3 className="overview-card-title">Exam Lifecycle</h3>
                <p className="overview-card-subtitle">Current state across all exams</p>
              </div>
            </div>
            <div className="lifecycle-track" role="list">
              <div className="lifecycle-step" role="listitem" title="Exams saved as draft, not yet published">
                <div className="lifecycle-step-icon"><FaEdit /></div>
                <div className="lifecycle-step-label">DRAFT</div>
                <div className="lifecycle-step-count">{lifecycleCounts.draft}</div>
              </div>
              <div className="lifecycle-step" role="listitem" title="Published exams awaiting marks entry / result generation">
                <div className="lifecycle-step-icon"><FaTasks /></div>
                <div className="lifecycle-step-label">MARKS ENTRY</div>
                <div className="lifecycle-step-count">{lifecycleCounts.marksEntry}</div>
              </div>
              <div className="lifecycle-step" role="listitem" title="Published exams with draft results (generation in progress)">
                <div className="lifecycle-step-icon"><FaCog /></div>
                <div className="lifecycle-step-label">RESULT GENERATION</div>
                <div className="lifecycle-step-count">{lifecycleCounts.generation}</div>
              </div>
              <div className="lifecycle-step" role="listitem" title="Exams with locked or mixed results awaiting review">
                <div className="lifecycle-step-icon"><FaClipboardCheck /></div>
                <div className="lifecycle-step-label">REVIEW</div>
                <div className="lifecycle-step-count">{lifecycleCounts.review}</div>
              </div>
              <div className="lifecycle-step" role="listitem" title="Exams whose results are fully locked, ready to publish">
                <div className="lifecycle-step-icon"><FaLock /></div>
                <div className="lifecycle-step-label">LOCKED</div>
                <div className="lifecycle-step-count">{lifecycleCounts.locked}</div>
              </div>
              <div className="lifecycle-step" role="listitem" title="Exams whose results are fully published">
                <div className="lifecycle-step-icon"><FaBullhorn /></div>
                <div className="lifecycle-step-label">PUBLISHED</div>
                <div className="lifecycle-step-count">{lifecycleCounts.published}</div>
              </div>
            </div>
            <div className="lifecycle-legend">
              <FaCheckCircle style={{ color: "var(--edx-cyan-600)" }} />
              Buckets are derived from exam status and per-exam result status counts.
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="overview-card">
            <div className="overview-card-header">
              <div className="overview-card-icon"><FaTasks /></div>
              <div>
                <h3 className="overview-card-title">Action Required</h3>
                <p className="overview-card-subtitle">
                  {actionItems.length > 0
                    ? `${actionItems.length} item${actionItems.length === 1 ? "" : "s"} need your attention`
                    : "Nothing requires your attention right now"}
                </p>
              </div>
            </div>
            {actionItems.length === 0 ? (
              <div className="action-empty">
                <div className="action-empty-icon"><FaCheckCircle /></div>
                <div className="action-empty-title">All caught up</div>
                <p className="action-empty-text">
                  There are no examination actions requiring your attention.
                </p>
              </div>
            ) : (
              <ul className="action-list">
                {actionItems.map((a) => (
                  <li key={a.key}>
                    <button
                      type="button"
                      className="action-item"
                      onClick={() => navigate(a.to)}
                    >
                      <span className="action-item-icon">{actionIcon(a.icon)}</span>
                      <span className="action-item-body">
                        <span className="action-item-title">{a.title}</span>
                        <span className="action-item-sub">{a.sub}</span>
                      </span>
                      <span className="action-item-chevron"><FaChevronRight /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recent / Active Exams */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
        className="recent-card mb-4"
      >
        <div className="recent-card-header">
          <div className="recent-card-header-left">
            <div className="recent-card-icon"><FaClipboardCheck /></div>
            <div>
              <h3 className="recent-card-title">Recent / Active Exams</h3>
              <p className="recent-card-subtitle">Quick access to your most recent exams</p>
            </div>
          </div>
          <button
            type="button"
            className="recent-view-all"
            onClick={() => navigate("/dashboard/exam/list")}
          >
            View All <FaChevronRight />
          </button>
        </div>

        {recentExams.length === 0 ? (
          <div className="recent-empty">
            <div className="recent-empty-icon"><FaClock size={22} /></div>
            <div className="recent-empty-title">No examinations available</div>
            <p className="recent-empty-text">Create an exam to see it appear here.</p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="table-responsive recent-table-wrap">
              <table className="table recent-table mb-0">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Course</th>
                    <th>Semester</th>
                    <th>Academic Year</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExams.map((exam) => (
                    <tr key={exam._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="recent-row-icon"><FaClock /></div>
                          <span className="recent-row-title">{exam.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="recent-course-name">
                          {exam.course_id?.name || "N/A"}
                        </div>
                        <div className="recent-course-code">
                          {exam.course_id?.code || ""}
                        </div>
                      </td>
                      <td>
                        <span className="pill pill-cyan">
                          <FaLayerGroup size={10} />
                          Sem {exam.semester}
                        </span>
                      </td>
                      <td>
                        <span className="recent-year">{exam.academicYear}</span>
                      </td>
                      <td>{getRecentStatusPill(exam.status)}</td>
                      <td>
                        <div className="recent-actions">
                          {exam.status === "DRAFT" ? (
                            <button
                              type="button"
                              className="recent-mini-btn recent-mini-btn-edit"
                              onClick={() => navigate(`/dashboard/exam/edit/${exam._id}`)}
                            >
                              <FaEdit /> Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="recent-mini-btn"
                              onClick={() => navigate(`/dashboard/exam/view/${exam._id}`)}
                            >
                              <FaEye /> View
                            </button>
                          )}
                          <button
                            type="button"
                            className="recent-mini-btn"
                            onClick={() => navigate(`/dashboard/exam/view/${exam._id}`)}
                          >
                            <FaEye /> Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list (replaces table) */}
            <div className="recent-mobile-list">
              {recentExams.map((exam) => (
                <div key={exam._id} className="recent-mobile-item">
                  <div className="recent-mobile-head">
                    <div className="recent-row-icon"><FaClock /></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="recent-row-title">{exam.name}</div>
                      <div className="recent-course-name" style={{ fontSize: "0.78rem" }}>
                        {exam.course_id?.name || "N/A"}
                        {exam.course_id?.code ? ` · ${exam.course_id.code}` : ""}
                      </div>
                    </div>
                    {getRecentStatusPill(exam.status)}
                  </div>
                  <div className="recent-mobile-meta">
                    <span><FaLayerGroup size={10} /> Sem {exam.semester}</span>
                    <span>{exam.academicYear}</span>
                  </div>
                  <div className="recent-mobile-actions">
                    {exam.status === "DRAFT" ? (
                      <button
                        type="button"
                        className="recent-mini-btn recent-mini-btn-edit"
                        onClick={() => navigate(`/dashboard/exam/edit/${exam._id}`)}
                      >
                        <FaEdit /> Edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="recent-mini-btn"
                        onClick={() => navigate(`/dashboard/exam/view/${exam._id}`)}
                      >
                        <FaEye /> View
                      </button>
                    )}
                    <button
                      type="button"
                      className="recent-mini-btn"
                      onClick={() => navigate(`/dashboard/exam/view/${exam._id}`)}
                    >
                      <FaEye /> Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}