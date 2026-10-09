import { useEffect, useState, useMemo } from "react";
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
  FaBook,
  FaLayerGroup,
  FaUserGraduate,
  FaSearch,
  FaFilter,
  FaTimes,
  FaEye,
  FaChartBar,
  FaClock,
  FaExclamationCircle,
  FaCalendarAlt,
  FaUndo,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

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
  --edx-slate-700: #334155;
  --edx-slate-600: #55677c;
  --edx-slate-400: #8695a7;
  --edx-slate-200: #dfe6ec;
  --edx-slate-100: #eef2f6;
  background: var(--edx-bg);
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--edx-slate-900);
}

.err nav.erp-breadcrumb { margin-bottom: 1rem; }

.err .err-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-200);
  box-shadow: 0 2px 10px rgba(12, 43, 71, 0.05);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.err .err-card-header {
  padding: 1.1rem 1.4rem;
  border-bottom: 1px solid var(--edx-slate-100);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: #fff;
  flex-wrap: wrap;
}

.err .err-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.err .err-card-header-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--edx-cyan-50);
  color: var(--edx-cyan-600);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.err .err-card-title {
  color: var(--edx-navy-900);
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.err .err-card-body {
  padding: 1.4rem;
}

/* Info grid */
.err .info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.err .info-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: #fff;
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.04);
}

.err .info-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.err .info-icon-primary { background: var(--edx-cyan-50); color: var(--edx-navy-800); }
.err .info-icon-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.err .info-icon-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.err .info-icon-danger { background: var(--edx-red-50); color: var(--edx-red-500); }
.err .info-label { color: var(--edx-slate-600); font-size: 0.76rem; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 0.2rem; }
.err .info-value { color: var(--edx-slate-900); font-weight: 700; font-size: 1.15rem; display: block; }
.err .info-subtext { font-size: 0.74rem; color: var(--edx-slate-600); }

/* Lifecycle status bar */
.err .lifecycle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--edx-slate-100);
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.err .lifecycle-status-group {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.err .lifecycle-label {
  font-weight: 700;
  color: var(--edx-navy-900);
  font-size: 0.86rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-right: 0.25rem;
}

.err .lifecycle-actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  align-items: center;
}

/* Pills */
.err .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.err .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.err .pill-pass { background: var(--edx-green-50); color: var(--edx-green-600); }
.err .pill-pass .pill-dot { background: var(--edx-green-500); }
.err .pill-fail { background: var(--edx-red-50); color: var(--edx-red-500); }
.err .pill-fail .pill-dot { background: var(--edx-red-500); }
.err .pill-incomplete { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.err .pill-incomplete .pill-dot { background: var(--edx-amber-500); }
.err .pill-draft { background: #eef2f6; color: var(--edx-slate-600); }
.err .pill-draft .pill-dot { background: var(--edx-slate-400); }
.err .pill-locked { background: #e7f0f8; color: var(--edx-navy-800); }
.err .pill-locked .pill-dot { background: var(--edx-navy-700); }
.err .pill-published { background: var(--edx-green-50); color: var(--edx-green-600); }
.err .pill-published .pill-dot { background: var(--edx-green-500); }

/* Filter row */
.err .filter-row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  align-items: center;
}

.err .search-box {
  flex: 1 1 240px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.55rem 0.85rem;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.err .search-box:focus-within {
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
}

.err .search-box svg { color: var(--edx-slate-400); flex-shrink: 0; }
.err .search-box input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.9rem;
  color: var(--edx-slate-900);
  min-width: 0;
}

.err .filter-select {
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  font-size: 0.86rem;
  color: var(--edx-slate-900);
  background: #fff;
  min-width: 140px;
  cursor: pointer;
}

.err .filter-select:focus {
  outline: none;
  border-color: var(--edx-cyan-500);
}

.err .clear-btn {
  border: none;
  background: transparent;
  color: var(--edx-cyan-600);
  font-weight: 600;
  font-size: 0.84rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.err .clear-btn:hover { text-decoration: underline; }

/* Table card */
.err .table-card {
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.err table { margin-bottom: 0; }
.err thead th {
  background: var(--edx-slate-100);
  color: var(--edx-navy-900);
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.85rem 1rem;
  white-space: nowrap;
}

.err tbody td {
  padding: 0.8rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.88rem;
}

.err tbody tr:hover { background: #f8fafc; }
.err tbody tr:last-child td { border-bottom: none; }
.err tbody tr.row-blocked { background: #fff5f5; }

.err .student-name { font-weight: 600; color: var(--edx-navy-900); }
.err .student-id { color: var(--edx-slate-600); font-size: 0.78rem; font-family: monospace; }

/* Buttons */
.err .btn-edx-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(12, 43, 71, 0.18);
}
.err .btn-edx-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(23, 174, 203, 0.28);
}
.err .btn-edx-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

.err .btn-edx-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  color: var(--edx-navy-800);
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.err .btn-edx-outline:hover:not(:disabled) {
  border-color: var(--edx-navy-700);
  background: var(--edx-slate-100);
}
.err .btn-edx-outline:disabled { opacity: 0.65; cursor: not-allowed; }

.err .btn-edx-warning {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--edx-amber-50);
  color: var(--edx-amber-600);
  border: 1px solid rgba(232, 165, 49, 0.4);
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.err .btn-edx-warning:hover:not(:disabled) {
  background: var(--edx-amber-500);
  color: #fff;
  border-color: var(--edx-amber-500);
}
.err .btn-edx-warning:disabled { opacity: 0.65; cursor: not-allowed; }

.err .btn-edx-success {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-green-600), var(--edx-green-500));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(31, 138, 95, 0.2);
}
.err .btn-edx-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(31, 138, 95, 0.28);
}
.err .btn-edx-success:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

.err .spin { animation: err-spin 0.8s linear infinite; }
@keyframes err-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Alerts */
.err .alert-edx {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  border-radius: 10px;
  padding: 0.9rem 1.1rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
  margin-bottom: 1.25rem;
}
.err .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }
.err .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229,72,77,0.25); }
.err .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232,165,49,0.3); }
.err .alert-edx-info { background: var(--edx-cyan-50); color: var(--edx-cyan-600); border-color: rgba(23,174,203,0.3); }

/* Blocked issues scrollable list */
.err .blocked-issues-list {
  max-height: 200px;
  overflow-y: auto;
  margin: 0.75rem 0;
  border-radius: 8px;
  background: #fff;
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
.err .blocked-issue-item:last-child { border-bottom: none; }

/* Empty state */
.err .empty-state {
  text-align: center;
  padding: 3.5rem 1.5rem;
  color: var(--edx-slate-600);
}
.err .empty-state-icon {
  font-size: 2.4rem;
  color: var(--edx-slate-400);
  margin-bottom: 0.75rem;
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
  background: #fff;
  border-radius: 14px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.err .modal-header-custom {
  padding: 1.1rem 1.4rem;
  background: var(--edx-slate-100);
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
  background: var(--edx-slate-100);
  border-top: 1px solid var(--edx-slate-200);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .err .info-grid { grid-template-columns: repeat(2, 1fr); }
  .err .lifecycle-bar { flex-direction: column; align-items: stretch; }
  .err .lifecycle-actions { justify-content: flex-start; }
  .err .filter-row { flex-direction: column; align-items: stretch; }
  .err .filter-select { width: 100%; }
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
        onBack={() => navigate("/dashboard/exam/results")}
        backLabel="Results Dashboard"
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn-edx-outline"
              onClick={() => navigate(`/dashboard/exam/results/generate?examId=${examId}`)}
            >
              <FaUndo /> Result Generation
            </button>
            <button
              type="button"
              className="btn-edx-outline"
              onClick={() => navigate("/dashboard/exam/results")}
            >
              <FaClipboardList /> All Exams
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
          <div className="info-icon info-icon-primary">
            <FaBook />
          </div>
          <div>
            <span className="info-label">Exam Paper</span>
            <span className="info-value text-truncate" style={{ maxWidth: "200px" }}>
              {exam.name}
            </span>
            <span className="info-subtext">
              {exam.subjectCount || 0} configured papers
            </span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon info-icon-primary">
            <FaLayerGroup />
          </div>
          <div>
            <span className="info-label">Academic Context</span>
            <span className="info-value">Sem {exam.semester}</span>
            <span className="info-subtext">{exam.academicYear}</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon info-icon-success">
            <FaCheckCircle />
          </div>
          <div>
            <span className="info-label">Passed</span>
            <span className="info-value text-success">{passedCount}</span>
            <span className="info-subtext">
              {totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0}% pass rate
            </span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon info-icon-danger">
            <FaExclamationTriangle />
          </div>
          <div>
            <span className="info-label">Failed</span>
            <span className="info-value text-danger">{failedCount}</span>
            <span className="info-subtext">Students requiring backlog</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon info-icon-warning">
            <FaClock />
          </div>
          <div>
            <span className="info-label">Incomplete</span>
            <span className="info-value text-warning">{incompleteCount}</span>
            <span className="info-subtext">Pending / unentered marks</span>
          </div>
        </div>
      </div>

      {/* ================= 2. LIFECYCLE BAR (RESOLVED DEADLOCK) ================= */}
      <div className="lifecycle-bar">
        <div className="lifecycle-status-group">
          <span className="lifecycle-label">Result Status:</span>
          <span className="pill pill-draft">
            <span className="pill-dot" /> Draft: {draftCount}
          </span>
          <span className="pill pill-locked">
            <span className="pill-dot" /> Locked: {lockedCount}
          </span>
          <span className="pill pill-published">
            <span className="pill-dot" /> Published: {publishedCount}
          </span>
          <span className="text-muted small ms-2">Total: {totalStudents}</span>
        </div>

        {/* State-aware Action Controls: Never Deadlocked */}
        <div className="lifecycle-actions">
          {/* Action 1: Lock Draft Results (available whenever Draft results exist) */}
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
              Lock Draft ({draftCount})
            </button>
          )}

          {/* Action 2: Publish Locked Results (available whenever Locked results exist) */}
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
              Publish Locked ({lockedCount})
            </button>
          )}

          {/* Action 3: Unlock Locked Results (available whenever Locked results exist) */}
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
              Unlock Locked ({lockedCount})
            </button>
          )}

          {/* Indicator: All Published */}
          {publishedCount > 0 && publishedCount === totalStudents && (
            <span className="text-success fw-bold small d-inline-flex align-items-center gap-1">
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
          <FaSearch />
          <input
            type="text"
            placeholder="Search student by name, roll no, or enrollment no…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="btn-close"
              style={{ fontSize: "0.75rem" }}
              onClick={() => setSearchTerm("")}
            />
          )}
        </div>

        {/* Academic Outcome Filter */}
        <div className="d-flex align-items-center gap-2">
          <FaFilter className="text-muted" />
          <select
            className="filter-select"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
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
        >
          <option value="ALL">All Lifecycle Statuses</option>
          <option value="DRAFT">Draft ({draftCount})</option>
          <option value="LOCKED">Locked ({lockedCount})</option>
          <option value="PUBLISHED">Published ({publishedCount})</option>
        </select>

        {/* Page Size Selector */}
        <select
          className="filter-select"
          style={{ minWidth: "110px" }}
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>

        {hasActiveFilters && (
          <button type="button" className="clear-btn" onClick={clearFilters}>
            <FaTimes /> Reset Filters
          </button>
        )}
      </div>

      {/* ================= 4. STUDENT RESULTS TABLE ================= */}
      <div className="table-card table-responsive mb-3">
        {totalStudents === 0 ? (
          <div className="empty-state">
            <FaClipboardList className="empty-state-icon" />
            <h5 className="fw-bold text-dark mb-1">No Results Generated Yet</h5>
            <p className="text-muted small mb-3">
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
            <h5 className="fw-bold text-dark mb-1">No Results Match Filter</h5>
            <p className="text-muted small mb-3">
              No student records matched your search query or filter selection.
            </p>
            <button type="button" className="btn-edx-outline" onClick={clearFilters}>
              <FaTimes /> Clear All Filters
            </button>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll / Enrollment</th>
                <th>Papers</th>
                <th>Breakdown</th>
                <th>Academic Outcome</th>
                <th>Lifecycle Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedResults.map((r) => {
                const isBlocked = blockedStudentIds.has(String(r.student_id?._id || r.student_id));
                return (
                  <tr key={r._id} className={isBlocked ? "row-blocked" : ""}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="student-name">
                          {r.student_id?.fullName || "—"}
                        </div>
                        {isBlocked && (
                          <span
                            className="badge bg-danger"
                            title="Missing marks block publishing for this student"
                          >
                            Marks Incomplete
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="student-id">
                        {r.student_id?.enrollmentNumber ||
                          r.student_id?.rollNumber ||
                          "—"}
                      </div>
                    </td>
                    <td>{r.totalSubjects || (r.subjects || []).length}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2 small">
                        <span className="text-success fw-bold">
                          {r.passedSubjects}P
                        </span>
                        <span className="text-danger fw-bold">
                          {r.failedSubjects}F
                        </span>
                        {r.incompleteSubjects > 0 && (
                          <span className="text-warning fw-bold">
                            {r.incompleteSubjects}Inc
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${overallPillClass(r.overallResult)}`}>
                        <span className="pill-dot" />
                        {r.overallResult}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${statusPillClass(r.status)}`}>
                        <span className="pill-dot" />
                        {r.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn-edx-outline"
                        style={{ padding: "0.38rem 0.85rem", fontSize: "0.82rem" }}
                        onClick={() => navigate(`/dashboard/exam/results/${r._id}`)}
                        title="View individual result sheet"
                      >
                        <FaEye /> View Sheet
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
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
          <div className="text-muted small">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredResults.length)} of{" "}
            {filteredResults.length} students
          </div>
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
    </div>
  );
}
