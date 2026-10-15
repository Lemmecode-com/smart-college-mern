import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getResult, lockResult, unlockResult, publishResult } from "../../../api/results";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import Loading from "../../../components/Loading";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaClipboardList, FaArrowLeft, FaSpinner, FaCheckCircle,
  FaExclamationTriangle, FaLock, FaLockOpen, FaGlobe,
  FaBook, FaLayerGroup, FaUserGraduate, FaIdCard, FaGraduationCap,
  FaCalendarAlt, FaTimesCircle, FaClock, FaHistory, FaCheck,
  FaInfoCircle, FaTimes, FaChartBar, FaPercent
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING", "TOKEN_EXPIRED", "INVALID_TOKEN", "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED", "USER_NOT_FOUND", "ACCOUNT_DEACTIVATED", "UNAUTHORIZED",
]);

const styles = `
.rrev {
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

.rrev nav.erp-breadcrumb { margin-bottom: 1.1rem; }

.rrev .rrev-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 4px 18px rgba(12,43,71,0.08);
  overflow: hidden;
}

.rrev .rrev-card-header {
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  padding: 1.25rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.rrev .rrev-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.rrev .rrev-card-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255,255,255,0.12);
  color: var(--edx-cyan-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.rrev .rrev-card-title {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.rrev .rrev-card-subtitle {
  color: rgba(255,255,255,0.75);
  font-size: 0.82rem;
  margin: 0.15rem 0 0 0;
}

.rrev .rrev-card-body { padding: 1.75rem; }

/* ---------- Lifecycle Control Bar ---------- */
.rrev .lifecycle-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--edx-bg);
  border: 1px solid var(--edx-slate-200);
  border-radius: 14px;
  padding: 1.1rem 1.4rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.rrev .lifecycle-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.rrev .lifecycle-label {
  font-weight: 700;
  color: var(--edx-slate-600);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rrev .lifecycle-hint {
  font-size: 0.82rem;
  color: var(--edx-slate-600);
}

.rrev .lifecycle-actions {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-left: auto;
}

/* ---------- Info Grid (Academic & Student Profile) ---------- */
.rrev .info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.rrev .info-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  background: var(--edx-bg);
  border: 1px solid var(--edx-slate-100);
  border-radius: 12px;
  padding: 0.9rem 1.1rem;
  transition: border-color 0.15s ease;
}

.rrev .info-item:hover {
  border-color: var(--edx-slate-200);
}

.rrev .info-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.rrev .info-icon-primary { background: var(--edx-cyan-50); color: var(--edx-navy-800); }
.rrev .info-icon-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.rrev .info-icon-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.rrev .info-icon-danger  { background: var(--edx-red-50); color: var(--edx-red-500); }
.rrev .info-icon-navy    { background: rgba(12,43,71,0.08); color: var(--edx-navy-900); }

.rrev .info-label {
  color: var(--edx-slate-600);
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: block;
  margin-bottom: 0.2rem;
}

.rrev .info-value {
  color: var(--edx-slate-900);
  font-weight: 700;
  font-size: 0.95rem;
  display: block;
  word-break: break-word;
}

.rrev .info-subvalue {
  color: var(--edx-slate-600);
  font-size: 0.78rem;
  display: block;
  margin-top: 0.15rem;
}

/* ---------- Summary Stat Cards (5 KPI Metrics) ---------- */
.rrev .stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.85rem;
  margin-bottom: 1.75rem;
}

.rrev .stat-card {
  background: #fff;
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(12,43,71,0.04);
}

.rrev .stat-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.rrev .stat-card-navy::before { background: var(--edx-navy-700); }
.rrev .stat-card-green::before { background: var(--edx-green-500); }
.rrev .stat-card-red::before { background: var(--edx-red-500); }
.rrev .stat-card-amber::before { background: var(--edx-amber-500); }
.rrev .stat-card-cyan::before { background: var(--edx-cyan-600); }

.rrev .stat-title {
  color: var(--edx-slate-600);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.35rem;
}

.rrev .stat-val {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--edx-slate-900);
  line-height: 1.2;
}

.rrev .stat-sub {
  font-size: 0.75rem;
  color: var(--edx-slate-400);
  margin-top: 0.25rem;
}

/* ---------- Subject Table ---------- */
.rrev .section-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--edx-navy-950);
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 0.9rem;
}

.rrev .section-title svg { color: var(--edx-cyan-600); }

.rrev .table-card {
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.rrev table { margin-bottom: 0; }

.rrev thead th {
  background: var(--edx-slate-100);
  color: var(--edx-navy-900);
  font-weight: 700;
  font-size: 0.8rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.85rem 1rem;
  white-space: nowrap;
}

.rrev tbody td {
  padding: 0.8rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.88rem;
}

.rrev tbody tr { transition: background 0.12s ease; }
.rrev tbody tr:hover { background: var(--edx-cyan-50); }
.rrev tbody tr:last-child td { border-bottom: none; }

.rrev .subject-name { font-weight: 700; color: var(--edx-slate-900); }
.rrev .subject-code { font-size: 0.75rem; color: var(--edx-slate-600); font-family: monospace; }
.rrev .marks-val { font-weight: 700; color: var(--edx-slate-900); font-size: 0.92rem; }
.rrev .marks-na { color: var(--edx-slate-400); font-style: italic; }

/* ---------- Pills & Badges ---------- */
.rrev .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.rrev .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.rrev .pill-pass { background: var(--edx-green-50); color: var(--edx-green-600); }
.rrev .pill-pass .pill-dot { background: var(--edx-green-500); }
.rrev .pill-fail { background: var(--edx-red-50); color: var(--edx-red-500); }
.rrev .pill-fail .pill-dot { background: var(--edx-red-500); }
.rrev .pill-incomplete { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.rrev .pill-incomplete .pill-dot { background: var(--edx-amber-500); }

.rrev .pill-draft { background: var(--edx-slate-100); color: var(--edx-slate-600); }
.rrev .pill-locked { background: rgba(12,43,71,0.08); color: var(--edx-navy-800); }
.rrev .pill-published { background: var(--edx-green-50); color: var(--edx-green-600); }

.rrev .pill-theory { background: rgba(12,43,71,0.08); color: var(--edx-navy-800); }
.rrev .pill-practical { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.rrev .pill-composite { background: var(--edx-amber-50); color: var(--edx-amber-600); }

/* ---------- Alerts & Notices ---------- */
.rrev .alert-edx {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 12px;
  padding: 0.95rem 1.15rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
}

.rrev .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }
.rrev .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229,72,77,0.25); }
.rrev .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232,165,49,0.3); }
.rrev .alert-edx-info { background: var(--edx-cyan-50); color: var(--edx-navy-800); border-color: rgba(23,174,203,0.3); }

/* ---------- Buttons ---------- */
.rrev .btn-edx-primary {
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
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(12,43,71,0.18);
  text-decoration: none;
}
.rrev .btn-edx-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(23,174,203,0.28); color: #fff; }
.rrev .btn-edx-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

.rrev .btn-edx-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  color: var(--edx-navy-800);
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}
.rrev .btn-edx-outline:hover:not(:disabled) { border-color: var(--edx-navy-700); background: var(--edx-slate-100); color: var(--edx-navy-900); }
.rrev .btn-edx-outline:disabled { opacity: 0.65; cursor: not-allowed; }

.rrev .btn-edx-warning {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--edx-amber-50);
  color: var(--edx-amber-600);
  border: 1px solid rgba(232,165,49,0.4);
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.rrev .btn-edx-warning:hover:not(:disabled) { background: var(--edx-amber-500); color: #fff; border-color: var(--edx-amber-500); }
.rrev .btn-edx-warning:disabled { opacity: 0.65; cursor: not-allowed; }

.rrev .btn-edx-success {
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
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(31,138,95,0.2);
}
.rrev .btn-edx-success:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(31,138,95,0.28); color: #fff; }
.rrev .btn-edx-success:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

/* ---------- Modal Backdrop & Dialog ---------- */
.rrev-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(6, 25, 44, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.rrev-modal-dialog {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(6, 25, 44, 0.25);
  width: 100%;
  max-width: 520px;
  overflow: hidden;
  border: 1px solid var(--edx-slate-100);
}

.rrev-modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--edx-slate-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--edx-bg);
}

.rrev-modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--edx-navy-950);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rrev-modal-close {
  background: none;
  border: none;
  color: var(--edx-slate-400);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.2rem;
  line-height: 1;
  transition: color 0.15s ease;
}
.rrev-modal-close:hover { color: var(--edx-slate-900); }

.rrev-modal-body { padding: 1.5rem; }

.rrev-modal-footer {
  padding: 1rem 1.5rem;
  background: var(--edx-bg);
  border-top: 1px solid var(--edx-slate-200);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.rrev-textarea {
  width: 100%;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  font-size: 0.88rem;
  color: var(--edx-slate-900);
  background: #fff;
  resize: vertical;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.rrev-textarea:focus {
  outline: none;
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
}
.rrev-textarea.is-invalid { border-color: var(--edx-red-500); }

.rrev-char-counter {
  font-size: 0.75rem;
  color: var(--edx-slate-400);
  text-align: right;
  margin-top: 0.35rem;
}

.rrev .spin { animation: rrev-spin 0.8s linear infinite; }
@keyframes rrev-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 992px) {
  .rrev .info-grid { grid-template-columns: repeat(2, 1fr); }
  .rrev .stats-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 640px) {
  .rrev .info-grid { grid-template-columns: 1fr; }
  .rrev .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .rrev .rrev-card-body { padding: 1.25rem; }
  .rrev .lifecycle-actions { margin-left: 0; width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .rrev * { animation: none !important; transition: none !important; }
}
`;

export default function ResultReview() {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [publishBlockedDetails, setPublishBlockedDetails] = useState(null);

  // Modals state
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlockReasonError, setUnlockReasonError] = useState("");

  const load = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getResult(resultId);
      setResult(res);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || "Failed to load result.";
      logger.error("getResult error:", err.response?.status, code);
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
    if (resultId) load();
  }, [resultId]);

  const runAction = async (fn, successMsg) => {
    setActionBusy(true);
    setActionError(null);
    setPublishBlockedDetails(null);
    try {
      await fn();
      await load();
      toast.success(successMsg);
    } catch (err) {
      const data = err.response?.data;
      const code = data?.code || data?.error?.code;
      const details = data?.details || data?.error?.details;
      const msg = data?.message || data?.error?.message || "Action failed.";

      if (code === "INCOMPLETE_MARKS" && details) {
        setPublishBlockedDetails(details);
      }
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  // Lock Action Handlers
  const handleLock = () => setShowLockConfirm(true);
  const confirmLock = async () => {
    setShowLockConfirm(false);
    await runAction(() => lockResult(resultId), "Result locked successfully.");
  };

  // Unlock Action Handlers
  const handleOpenUnlock = () => {
    setUnlockReason("");
    setUnlockReasonError("");
    setShowUnlockModal(true);
  };

  const handleUnlockSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = unlockReason.trim();
    if (!trimmed) {
      setUnlockReasonError("Unlock reason is mandatory (1-500 characters).");
      return;
    }
    if (trimmed.length > 500) {
      setUnlockReasonError("Unlock reason cannot exceed 500 characters.");
      return;
    }
    setUnlockReasonError("");
    setShowUnlockModal(false);
    await runAction(() => unlockResult(resultId, trimmed), "Result unlocked successfully.");
    setUnlockReason("");
  };

  // Publish Action Handlers
  const handlePublish = () => setShowPublishConfirm(true);
  const confirmPublish = async () => {
    setShowPublishConfirm(false);
    await runAction(() => publishResult(resultId), "Result published successfully.");
  };

  const statusPillClass = (s) =>
    s === "PUBLISHED" ? "pill-published" : s === "LOCKED" ? "pill-locked" : "pill-draft";

  const subjectStatusPill = (s) =>
    s === "PASS" ? "pill-pass" : s === "FAIL" ? "pill-fail" : "pill-incomplete";

  const typePill = (t) =>
    t === "THEORY" ? "pill-theory" : t === "PRACTICAL" ? "pill-practical" : "pill-composite";

  const fmtMarks = (v) =>
    v === null || v === undefined ? <span className="marks-na">—</span> : <span className="marks-val">{v}</span>;

  if (loading) return <Loading message="Loading result sheet…" />;
  if (fetchError?.isAuthError)
    return <ApiError statusCode={fetchError.statusCode} errorCode={fetchError.errorCode} message={fetchError.message} />;
  if (fetchError) {
    return (
      <div className="rrev container-fluid p-4">
        <style>{styles}</style>
        <div className="alert-edx alert-edx-danger mb-3">
          <FaExclamationTriangle />
          {fetchError.message}
        </div>
        <button className="btn-edx-outline" onClick={() => navigate("/dashboard/exam")}>
          <FaArrowLeft />
          Back to Exam Dashboard
        </button>
      </div>
    );
  }
  if (!result) return null;

  const isPublished = result.status === "PUBLISHED";
  const isLocked = result.status === "LOCKED";
  const isDraft = result.status === "DRAFT";

  // Data mapping with robust population fallbacks
  const examId = result.exam_id?._id || result.exam_id;
  const examName = result.exam_id?.name || "Exam";
  const studentName =
    result.student_id?.fullName ||
    result.student_id?.name ||
    result.student_id?.user_id?.name ||
    "Student";
  const enrollmentNumber = result.student_id?.enrollmentNumber || null;
  const rollNumber = result.student_id?.rollNumber || null;
  const studentEmail = result.student_id?.email || null;

  const courseName = result.course_id?.name
    ? `${result.course_id.name}${result.course_id.code ? ` (${result.course_id.code})` : ""}`
    : result.course_id?.code || "—";

  const semesterNumber = result.semester || result.exam_id?.semester || "—";
  const academicYear = result.academicYear || result.exam_id?.academicYear || "—";

  // Metric aggregates
  const totalSubjects = result.totalSubjects || result.subjects?.length || 0;
  const passedSubjects = result.passedSubjects || 0;
  const failedSubjects = result.failedSubjects || 0;
  const incompleteSubjects = result.incompleteSubjects || 0;

  const totalMarksObtained = (result.subjects || []).reduce((acc, s) => {
    return typeof s.totalMarks === "number" ? acc + s.totalMarks : acc;
  }, 0);

  const subjectsWithMarks = (result.subjects || []).filter(
    (s) => typeof s.totalMarks === "number"
  ).length;

  const passPercentage =
    totalSubjects > 0 ? Math.round((passedSubjects / totalSubjects) * 100) : 0;

  // Breadcrumbs definition
  const breadcrumbItems = [
    { label: "Home", path: "/dashboard/exam" },
    { label: "Results Dashboard", path: "/dashboard/exam/results" },
  ];
  if (examId) {
    breadcrumbItems.push({
      label: `${examName} (Review)`,
      path: `/dashboard/exam/results/review/${examId}`,
    });
  } else {
    breadcrumbItems.push({
      label: "Generate Result",
      path: "/dashboard/exam/results/generate",
    });
  }
  breadcrumbItems.push({ label: `${studentName} Result` });

  return (
    <div className="rrev container-fluid p-4">
      <style>{styles}</style>

      <Breadcrumb items={breadcrumbItems} />

      {/* Lock Confirmation Modal */}
      <ConfirmModal
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={confirmLock}
        title="Lock Semester Result"
        message="Locking this result finalizes its calculation and prevents further marks modifications until an authorized unlock is performed. Continue?"
        type="warning"
        confirmText="Lock Result"
        isLoading={actionBusy}
      />

      {/* Publish Confirmation Modal */}
      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={confirmPublish}
        title="Publish Semester Result"
        message="Publishing this result makes it immediately visible to the student on their portal. Ensure marks and grades are verified. Continue?"
        type="success"
        confirmText="Publish Result"
        isLoading={actionBusy}
      />

      {/* Standardized Unlock Modal */}
      <AnimatePresence>
        {showUnlockModal && (
          <div className="rrev-modal-backdrop" onClick={() => !actionBusy && setShowUnlockModal(false)}>
            <motion.div
              className="rrev-modal-dialog"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rrev-modal-header">
                <h5 className="rrev-modal-title">
                  <FaLockOpen style={{ color: "var(--edx-amber-600)" }} />
                  Unlock Result for Correction
                </h5>
                <button
                  type="button"
                  className="rrev-modal-close"
                  onClick={() => !actionBusy && setShowUnlockModal(false)}
                  disabled={actionBusy}
                >
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleUnlockSubmit}>
                <div className="rrev-modal-body">
                  <div className="alert-edx alert-edx-warning mb-3">
                    <FaInfoCircle />
                    <div>
                      Unlocking this result will change its status back to <strong>DRAFT</strong>, allowing teachers or coordinators to modify marks and regenerate the result.
                    </div>
                  </div>

                  <label className="form-label" style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                    Mandatory Reason for Unlock <span style={{ color: "var(--edx-red-500)" }}>*</span>
                  </label>
                  <textarea
                    className={`rrev-textarea ${unlockReasonError ? "is-invalid" : ""}`}
                    rows={4}
                    maxLength={500}
                    placeholder="Specify the reason for unlocking (e.g., re-evaluation requested for Theory component, correction of internal marks)..."
                    value={unlockReason}
                    onChange={(e) => {
                      setUnlockReason(e.target.value);
                      if (unlockReasonError) setUnlockReasonError("");
                    }}
                    disabled={actionBusy}
                    autoFocus
                  />
                  <div className="d-flex justify-content-between align-items-center mt-1">
                    {unlockReasonError ? (
                      <span style={{ color: "var(--edx-red-500)", fontSize: "0.78rem" }}>
                        {unlockReasonError}
                      </span>
                    ) : <span />}
                    <span className="rrev-char-counter">
                      {unlockReason.length} / 500 characters
                    </span>
                  </div>
                </div>

                <div className="rrev-modal-footer">
                  <button
                    type="button"
                    className="btn-edx-outline"
                    onClick={() => setShowUnlockModal(false)}
                    disabled={actionBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-edx-warning"
                    disabled={actionBusy || !unlockReason.trim()}
                  >
                    {actionBusy ? <FaSpinner className="spin" /> : <FaLockOpen />}
                    Confirm Unlock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="row justify-content-center">
        <div className="col-xl-11 col-lg-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rrev-card"
          >
            {/* Header */}
            <div className="rrev-card-header">
              <div className="rrev-card-header-left">
                <div className="rrev-card-header-icon"><FaClipboardList /></div>
                <div>
                  <h4 className="rrev-card-title">Student Result Sheet</h4>
                  <p className="rrev-card-subtitle">
                    {studentName} {enrollmentNumber ? `(${enrollmentNumber})` : ""} · {examName}
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className={`pill ${statusPillClass(result.status)}`}>
                  <span className="pill-dot" />
                  {result.status}
                </span>

                {examId ? (
                  <button
                    className="btn-edx-outline"
                    onClick={() => navigate(`/dashboard/exam/results/review/${examId}`)}
                    style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
                  >
                    <FaArrowLeft />
                    Exam Review
                  </button>
                ) : (
                  <button
                    className="btn-edx-outline"
                    onClick={() => navigate("/dashboard/exam/results/generate")}
                    style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
                  >
                    <FaArrowLeft />
                    Generate
                  </button>
                )}
              </div>
            </div>

            <div className="rrev-card-body">

              {/* Action Error Banner */}
              {actionError && (
                <div className="alert-edx alert-edx-danger mb-4">
                  <FaExclamationTriangle />
                  <div>
                    <strong>Action Error:</strong> {actionError}
                  </div>
                </div>
              )}

              {/* Publish Blocked Breakdown */}
              {publishBlockedDetails && (
                <div className="alert-edx alert-edx-danger mb-4">
                  <FaExclamationTriangle />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.35rem" }}>
                      Publication Blocked — Incomplete Marks Found
                    </div>
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>
                      This result cannot be published because one or more subjects have missing or incomplete marks:
                    </p>
                    <div style={{ background: "#fff", borderRadius: 8, padding: "0.75rem", border: "1px solid rgba(229,72,77,0.3)" }}>
                      {publishBlockedDetails.issues?.map((issue, idx) => (
                        <div key={idx} className="d-flex justify-content-between py-1 border-bottom last-border-0" style={{ fontSize: "0.82rem" }}>
                          <span>
                            <strong>{issue.subjectName || issue.subjectId || "Subject"}</strong>
                          </span>
                          <span style={{ color: "var(--edx-red-500)", fontWeight: 600 }}>
                            {issue.issue === "MARKS_NOT_ENTERED" ? "Marks Not Entered" : "Incomplete Marks"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.8rem", marginTop: "0.5rem", color: "var(--edx-slate-600)" }}>
                      Please unlock the result, enter all required marks in the Marks Entry screen, and regenerate the result before publishing.
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Unlock Reason Notice */}
              {result.unlockReason && (
                <div className="alert-edx alert-edx-warning mb-4">
                  <FaHistory />
                  <div>
                    <strong>Previous Unlock Reason:</strong> "{result.unlockReason}"
                  </div>
                </div>
              )}

              {/* Lifecycle Control Bar */}
              <div className="lifecycle-bar">
                <div className="lifecycle-info">
                  <span className="lifecycle-label">Result Status:</span>
                  <span className={`pill ${statusPillClass(result.status)}`}>
                    <span className="pill-dot" />
                    {result.status}
                  </span>
                  <span className="lifecycle-hint">
                    {isDraft && "Result is in DRAFT. You may verify marks and lock to finalize."}
                    {isLocked && "Result is LOCKED. Marks cannot be edited unless unlocked."}
                    {isPublished && "Result is PUBLISHED. Visible to students and immutable."}
                  </span>
                </div>

                <div className="lifecycle-actions">
                  {isDraft && (
                    <button className="btn-edx-primary" onClick={handleLock} disabled={actionBusy}>
                      {actionBusy ? <FaSpinner className="spin" /> : <FaLock />}
                      Lock Result
                    </button>
                  )}
                  {isLocked && (
                    <>
                      <button className="btn-edx-warning" onClick={handleOpenUnlock} disabled={actionBusy}>
                        <FaLockOpen />
                        Unlock Result
                      </button>
                      <button className="btn-edx-success" onClick={handlePublish} disabled={actionBusy}>
                        {actionBusy ? <FaSpinner className="spin" /> : <FaGlobe />}
                        Publish Result
                      </button>
                    </>
                  )}
                  {isPublished && (
                    <span style={{ fontSize: "0.85rem", color: "var(--edx-green-600)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <FaCheckCircle />
                      Published — Visible to Student
                    </span>
                  )}
                </div>
              </div>

              {/* Academic & Student Profile Grid */}
              <div className="info-grid">
                {/* Student Info */}
                <div className="info-item">
                  <div className="info-icon info-icon-primary"><FaUserGraduate /></div>
                  <div>
                    <span className="info-label">Student</span>
                    <span className="info-value">{studentName}</span>
                    <span className="info-subvalue">
                      {enrollmentNumber && <span>Enrollment: <strong>{enrollmentNumber}</strong></span>}
                      {rollNumber && <span className="ms-2">Roll: <strong>{rollNumber}</strong></span>}
                    </span>
                  </div>
                </div>

                {/* Exam Info */}
                <div className="info-item">
                  <div className="info-icon info-icon-navy"><FaClipboardList /></div>
                  <div>
                    <span className="info-label">Exam Name</span>
                    <span className="info-value">{examName}</span>
                    <span className="info-subvalue">
                      Sem {semesterNumber} · Academic Year {academicYear}
                    </span>
                  </div>
                </div>

                {/* Course / Program */}
                <div className="info-item">
                  <div className="info-icon info-icon-primary"><FaGraduationCap /></div>
                  <div>
                    <span className="info-label">Program / Course</span>
                    <span className="info-value">{courseName}</span>
                    <span className="info-subvalue">
                      Semester {semesterNumber}
                    </span>
                  </div>
                </div>

                {/* Overall Result Outcome */}
                <div className="info-item">
                  <div className={`info-icon ${
                    result.overallResult === "PASS"
                      ? "info-icon-success"
                      : result.overallResult === "FAIL"
                      ? "info-icon-danger"
                      : "info-icon-warning"
                  }`}>
                    {result.overallResult === "PASS" ? <FaCheckCircle /> : <FaTimesCircle />}
                  </div>
                  <div>
                    <span className="info-label">Overall Result</span>
                    <div style={{ marginTop: "0.2rem" }}>
                      <span className={`pill ${subjectStatusPill(result.overallResult)}`}>
                        <span className="pill-dot" />
                        {result.overallResult}
                      </span>
                    </div>
                    <span className="info-subvalue">
                      {result.overallResult === "PASS" && "All subjects cleared successfully"}
                      {result.overallResult === "FAIL" && "One or more subjects marked as Failed"}
                      {result.overallResult === "INCOMPLETE" && "Requires marks completion"}
                    </span>
                  </div>
                </div>

                {/* Calculation Metadata */}
                <div className="info-item">
                  <div className="info-icon info-icon-navy"><FaClock /></div>
                  <div>
                    <span className="info-label">Calculated At</span>
                    <span className="info-value" style={{ fontSize: "0.85rem" }}>
                      {result.calculatedAt ? new Date(result.calculatedAt).toLocaleString() : "—"}
                    </span>
                    <span className="info-subvalue">Server-evaluated snapshot</span>
                  </div>
                </div>

                {/* Lifecycle Audit Trail */}
                <div className="info-item">
                  <div className="info-icon info-icon-navy"><FaHistory /></div>
                  <div>
                    <span className="info-label">Lifecycle Trail</span>
                    <span className="info-value" style={{ fontSize: "0.85rem" }}>
                      {isPublished
                        ? `Published ${result.publishedAt ? new Date(result.publishedAt).toLocaleDateString() : ""}`
                        : isLocked
                        ? `Locked ${result.lockedAt ? new Date(result.lockedAt).toLocaleDateString() : ""}`
                        : "Draft State"}
                    </span>
                    <span className="info-subvalue">
                      {result.publishedBy?.name && `By: ${result.publishedBy.name}`}
                      {!result.publishedBy?.name && result.lockedBy?.name && `By: ${result.lockedBy.name}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 KPI Metric Stat Cards */}
              <div className="stats-grid">
                <div className="stat-card stat-card-navy">
                  <span className="stat-title">Total Subjects</span>
                  <span className="stat-val">{totalSubjects}</span>
                  <span className="stat-sub">Applicable in Exam</span>
                </div>

                <div className="stat-card stat-card-green">
                  <span className="stat-title">Passed</span>
                  <span className="stat-val" style={{ color: "var(--edx-green-600)" }}>{passedSubjects}</span>
                  <span className="stat-sub">{passPercentage}% pass rate</span>
                </div>

                <div className="stat-card stat-card-red">
                  <span className="stat-title">Failed</span>
                  <span className="stat-val" style={{ color: "var(--edx-red-500)" }}>{failedSubjects}</span>
                  <span className="stat-sub">{failedSubjects > 0 ? "Backlog eligible" : "Zero backlogs"}</span>
                </div>

                <div className="stat-card stat-card-amber">
                  <span className="stat-title">Incomplete</span>
                  <span className="stat-val" style={{ color: "var(--edx-amber-600)" }}>{incompleteSubjects}</span>
                  <span className="stat-sub">{incompleteSubjects > 0 ? "Pending entries" : "All marks recorded"}</span>
                </div>

                <div className="stat-card stat-card-cyan">
                  <span className="stat-title">Total Score</span>
                  <span className="stat-val" style={{ color: "var(--edx-cyan-600)" }}>{totalMarksObtained}</span>
                  <span className="stat-sub">Across {subjectsWithMarks} subject(s)</span>
                </div>
              </div>

              {/* Subject-Wise Table */}
              <h5 className="section-title">
                <FaBook />
                Subject-wise Examination Performance
              </h5>

              <div className="table-card table-responsive mb-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "48px" }}>#</th>
                      <th>Subject Name</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th className="text-center">Internal</th>
                      <th className="text-center">External</th>
                      <th className="text-center">Total Marks</th>
                      <th className="text-center">Subject Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.subjects || []).map((s, idx) => (
                      <tr key={s.subject?._id || s.subject || idx}>
                        <td style={{ color: "var(--edx-slate-400)", fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <div className="subject-name">{s.subjectName || "—"}</div>
                        </td>
                        <td>
                          <span className="subject-code">{s.subjectCode || "—"}</span>
                        </td>
                        <td>
                          {s.subjectType ? (
                            <span className={`pill ${typePill(s.subjectType)}`}>
                              {s.subjectType}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            {fmtMarks(s.internalMarks)}
                            {s.internalPassed === false && (
                              <span title="Internal component failed" style={{ color: "var(--edx-red-500)", fontSize: "0.75rem" }}>*</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            {fmtMarks(s.externalMarks)}
                            {s.externalPassed === false && (
                              <span title="External component failed" style={{ color: "var(--edx-red-500)", fontSize: "0.75rem" }}>*</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          {fmtMarks(s.totalMarks)}
                        </td>
                        <td className="text-center">
                          <span className={`pill ${subjectStatusPill(s.status)}`}>
                            <span className="pill-dot" />
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Actions & Navigation */}
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                <div className="d-flex gap-2 flex-wrap">
                  {examId ? (
                    <button
                      className="btn-edx-outline"
                      onClick={() => navigate(`/dashboard/exam/results/review/${examId}`)}
                    >
                      <FaArrowLeft />
                      Back to Exam Review
                    </button>
                  ) : (
                    <button
                      className="btn-edx-outline"
                      onClick={() => navigate("/dashboard/exam/results/generate")}
                    >
                      <FaArrowLeft />
                      Back to Generate
                    </button>
                  )}

                  <Link to="/dashboard/exam/results" className="btn-edx-outline">
                    <FaClipboardList />
                    Results Dashboard
                  </Link>
                </div>

                <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                  Record ID: <code style={{ color: "var(--edx-slate-600)" }}>{result._id}</code>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
