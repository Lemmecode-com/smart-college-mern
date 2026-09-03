import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  FaBook, FaLayerGroup, FaUserGraduate,
} from "react-icons/fa";
import { motion } from "framer-motion";

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

/* ---------- Breadcrumb spacing ---------- */
.rrev nav.erp-breadcrumb { margin-bottom: 1.1rem; }

.rrev .rrev-card {
  background: #fff; border-radius: 16px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 4px 18px rgba(12,43,71,0.08); overflow: hidden;
}
.rrev .rrev-card-header {
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  padding: 1.25rem 1.5rem; display: flex;
  justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
}
.rrev .rrev-card-header-left { display: flex; align-items: center; gap: 0.85rem; }
.rrev .rrev-card-header-icon {
  width: 42px; height: 42px; border-radius: 11px;
  background: rgba(255,255,255,0.12); color: var(--edx-cyan-500);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.05rem; flex-shrink: 0;
}
.rrev .rrev-card-title { color: #fff; font-size: 1.2rem; font-weight: 700; margin: 0; }
.rrev .rrev-card-body { padding: 1.75rem; }
.rrev .info-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;
}
.rrev .info-item {
  display: flex; align-items: center; gap: 0.85rem;
  background: var(--edx-bg); border: 1px solid var(--edx-slate-100);
  border-radius: 12px; padding: 0.85rem 1rem;
}
.rrev .info-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.95rem; flex-shrink: 0;
}
.rrev .info-icon-primary { background: var(--edx-cyan-50); color: var(--edx-navy-800); }
.rrev .info-icon-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.rrev .info-icon-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.rrev .info-label { color: var(--edx-slate-600); font-size: 0.78rem; display: block; }
.rrev .info-value { color: var(--edx-slate-900); font-weight: 600; font-size: 0.92rem; display: block; }
.rrev .section-title {
  display: flex; align-items: center; gap: 0.5rem;
  color: var(--edx-navy-950); font-weight: 700; font-size: 1rem; margin-bottom: 0.85rem;
}
.rrev .section-title svg { color: var(--edx-cyan-600); }
.rrev .table-card { border: 1px solid var(--edx-slate-100); border-radius: 12px; overflow: hidden; }
.rrev table { margin-bottom: 0; }
.rrev thead th {
  background: var(--edx-slate-100); color: var(--edx-navy-900);
  font-weight: 600; font-size: 0.8rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.75rem 1rem; white-space: nowrap;
}
.rrev tbody td {
  padding: 0.7rem 1rem; vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100); font-size: 0.88rem;
}
.rrev tbody tr { transition: background 0.12s ease; }
.rrev tbody tr:hover { background: var(--edx-cyan-50); }
.rrev tbody tr:last-child td { border-bottom: none; }
.rrev .subject-name { font-weight: 600; color: var(--edx-slate-900); }
.rrev .marks-val { font-weight: 600; color: var(--edx-slate-900); }
.rrev .marks-na { color: var(--edx-slate-400); font-style: italic; }
.rrev .pill {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.22rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
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
.rrev .lifecycle-bar {
  display: flex; align-items: center; gap: 0.75rem;
  background: var(--edx-bg); border: 1px solid var(--edx-slate-200);
  border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; flex-wrap: wrap;
}
.rrev .lifecycle-label { font-weight: 600; color: var(--edx-slate-600); font-size: 0.85rem; margin-right: 0.25rem; }
.rrev .lifecycle-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-left: auto; }
.rrev .unlock-form { margin-top: 0.75rem; }
.rrev .unlock-input {
  width: 100%; border: 1px solid var(--edx-slate-200); border-radius: 10px;
  padding: 0.55rem 0.85rem; font-size: 0.88rem; color: var(--edx-slate-900);
  background: #fff; transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.rrev .unlock-input:focus { outline: none; border-color: var(--edx-cyan-500); box-shadow: 0 0 0 3px var(--edx-cyan-50); }
.rrev .unlock-input.is-invalid { border-color: var(--edx-red-500); }
.rrev .field-feedback { color: var(--edx-red-500); font-size: 0.78rem; margin-top: 0.3rem; }
.rrev .alert-edx {
  display: flex; align-items: flex-start; gap: 0.6rem;
  border-radius: 10px; padding: 0.85rem 1rem; font-size: 0.88rem; border: 1px solid transparent;
}
.rrev .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }
.rrev .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229,72,77,0.25); }
.rrev .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232,165,49,0.3); }
.rrev .btn-edx-primary {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1.2rem;
  font-weight: 600; font-size: 0.88rem; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(12,43,71,0.18);
}
.rrev .btn-edx-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(23,174,203,0.28); }
.rrev .btn-edx-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
.rrev .btn-edx-outline {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: #fff; color: var(--edx-navy-800); border: 1px solid var(--edx-slate-200);
  border-radius: 10px; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.88rem;
  cursor: pointer; transition: all 0.15s ease;
}
.rrev .btn-edx-outline:hover:not(:disabled) { border-color: var(--edx-navy-700); background: var(--edx-slate-100); }
.rrev .btn-edx-outline:disabled { opacity: 0.65; cursor: not-allowed; }
.rrev .btn-edx-warning {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: var(--edx-amber-50); color: var(--edx-amber-600);
  border: 1px solid rgba(232,165,49,0.4); border-radius: 10px; padding: 0.6rem 1.2rem;
  font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.15s ease;
}
.rrev .btn-edx-warning:hover:not(:disabled) { background: var(--edx-amber-500); color: #fff; border-color: var(--edx-amber-500); }
.rrev .btn-edx-warning:disabled { opacity: 0.65; cursor: not-allowed; }
.rrev .btn-edx-success {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-green-600), var(--edx-green-500));
  color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1.2rem;
  font-weight: 600; font-size: 0.88rem; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(31,138,95,0.2);
}
.rrev .btn-edx-success:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(31,138,95,0.28); }
.rrev .btn-edx-success:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
.rrev .spin { animation: rrev-spin 0.8s linear infinite; }
@keyframes rrev-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .rrev .info-grid { grid-template-columns: 1fr; }
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
  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [unlockReasonError, setUnlockReasonError] = useState("");
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

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
      setFetchError({ message: msg, statusCode: err.response?.status, errorCode: code, isAuthError: AUTH_ERROR_CODES.has(code) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (resultId) load(); }, [resultId]);

  const runAction = async (fn, successMsg) => {
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fn();
      setResult(res);
      toast.success(successMsg);
    } catch (err) {
      const msg = err.response?.data?.message || "Action failed.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handleLock = () => setShowLockConfirm(true);

  const confirmLock = async () => {
    setShowLockConfirm(false);
    await runAction(() => lockResult(resultId), "Result locked successfully.");
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) { setUnlockReasonError("Unlock reason is required."); return; }
    setUnlockReasonError("");
    await runAction(() => unlockResult(resultId, unlockReason.trim()), "Result unlocked successfully.");
    setShowUnlockForm(false);
    setUnlockReason("");
  };

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

  const fmtMarks = (v) => (v === null || v === undefined ? <span className="marks-na">—</span> : <span className="marks-val">{v}</span>);

  if (loading) return <Loading message="Loading result…" />;
  if (fetchError?.isAuthError) return <ApiError statusCode={fetchError.statusCode} errorCode={fetchError.errorCode} message={fetchError.message} />;
  if (fetchError) {
    return (
      <div className="rrev container-fluid p-4">
        <style>{styles}</style>
        <div className="alert-edx alert-edx-danger mb-3"><FaExclamationTriangle />{fetchError.message}</div>
        <button className="btn-edx-outline" onClick={() => navigate("/dashboard/exam")}><FaArrowLeft />Back</button>
      </div>
    );
  }
  if (!result) return null;

  const isPublished = result.status === "PUBLISHED";
  const isLocked = result.status === "LOCKED";
  const isDraft = result.status === "DRAFT";

  const examName = result.exam_id?.name || "Exam";
  const studentName = result.student_id?.user_id?.name || result.student_id?.name || result.student_id?._id || "Student";

  return (
    <div className="rrev container-fluid p-4">
      <style>{styles}</style>

      <Breadcrumb items={[
        { label: "Exam Dashboard", path: "/dashboard/exam" },
        { label: "Generate Result", path: "/dashboard/exam/results/generate" },
        { label: "Review Result" },
      ]} />

      <ConfirmModal
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={confirmLock}
        title="Lock Result"
        message="Locking this result will prevent further marks modifications. Continue?"
        type="warning"
        confirmText="Lock"
        isLoading={actionBusy}
      />
      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={confirmPublish}
        title="Publish Result"
        message="Publishing this result will make it visible to eligible students. Continue?"
        type="success"
        confirmText="Publish"
        isLoading={actionBusy}
      />

      <div className="row justify-content-center">
        <div className="col-lg-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rrev-card mt-3"
          >
            {/* Header */}
            <div className="rrev-card-header">
              <div className="rrev-card-header-left">
                <div className="rrev-card-header-icon"><FaClipboardList /></div>
                <h4 className="rrev-card-title">Result Review</h4>
              </div>
              <span className={`pill ${statusPillClass(result.status)}`}>
                {result.status}
              </span>
            </div>

            <div className="rrev-card-body">

              {/* Action error */}
              {actionError && (
                <div className="alert-edx alert-edx-danger mb-3">
                  <FaExclamationTriangle />{actionError}
                </div>
              )}

              {/* Info grid */}
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon info-icon-primary"><FaClipboardList /></div>
                  <div>
                    <span className="info-label">Exam</span>
                    <span className="info-value">{examName}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-primary"><FaUserGraduate /></div>
                  <div>
                    <span className="info-label">Student</span>
                    <span className="info-value">{studentName}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-primary"><FaLayerGroup /></div>
                  <div>
                    <span className="info-label">Semester / Academic Year</span>
                    <span className="info-value">Sem {result.semester} · {result.academicYear}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className={`info-icon ${result.overallResult === "PASS" ? "info-icon-success" : "info-icon-warning"}`}>
                    <FaCheckCircle />
                  </div>
                  <div>
                    <span className="info-label">Overall Result</span>
                    <span className={`pill ${subjectStatusPill(result.overallResult)}`} style={{ marginTop: "0.2rem" }}>
                      <span className="pill-dot" />
                      {result.overallResult}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifecycle bar */}
              <div className="lifecycle-bar">
                <span className="lifecycle-label">Status:</span>
                <span className={`pill ${statusPillClass(result.status)}`}>{result.status}</span>
                <div className="lifecycle-actions">
                  {isDraft && (
                    <button className="btn-edx-primary" onClick={handleLock} disabled={actionBusy}>
                      {actionBusy ? <FaSpinner className="spin" /> : <FaLock />}
                      Lock
                    </button>
                  )}
                  {isLocked && !showUnlockForm && (
                    <>
                      <button className="btn-edx-warning" onClick={() => setShowUnlockForm(true)} disabled={actionBusy}>
                        <FaLockOpen />Unlock
                      </button>
                      <button className="btn-edx-success" onClick={handlePublish} disabled={actionBusy}>
                        {actionBusy ? <FaSpinner className="spin" /> : <FaGlobe />}
                        Publish
                      </button>
                    </>
                  )}
                  {isPublished && (
                    <span style={{ fontSize: "0.85rem", color: "var(--edx-green-600)", fontWeight: 600 }}>
                      <FaCheckCircle style={{ marginRight: "0.35rem" }} />
                      Published — no further changes allowed
                    </span>
                  )}
                </div>
              </div>

              {/* Unlock form */}
              {showUnlockForm && isLocked && (
                <div className="unlock-form mb-3">
                  <div className="alert-edx alert-edx-warning mb-2">
                    <FaExclamationTriangle />
                    Provide a reason for unlocking this result. This is recorded in the audit log.
                  </div>
                  <textarea
                    className={`unlock-input ${unlockReasonError ? "is-invalid" : ""}`}
                    rows={3}
                    placeholder="Enter unlock reason…"
                    value={unlockReason}
                    onChange={(e) => { setUnlockReason(e.target.value); setUnlockReasonError(""); }}
                  />
                  {unlockReasonError && <div className="field-feedback">{unlockReasonError}</div>}
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn-edx-warning" onClick={handleUnlock} disabled={actionBusy}>
                      {actionBusy ? <FaSpinner className="spin" /> : <FaLockOpen />}
                      Confirm Unlock
                    </button>
                    <button className="btn-edx-outline" onClick={() => { setShowUnlockForm(false); setUnlockReason(""); setUnlockReasonError(""); }} disabled={actionBusy}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Subject-wise table */}
              <h5 className="section-title"><FaBook />Subject-wise Results</h5>
              <div className="table-card table-responsive mb-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Internal</th>
                      <th>External</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subjects.map((s, i) => (
                      <tr key={s.subject?._id || i}>
                        <td className="subject-name">{s.subjectName || "—"}</td>
                        <td><span className="pill pill-draft" style={{ fontSize: "0.72rem" }}>{s.subjectCode || "—"}</span></td>
                        <td>{s.subjectType ? <span className={`pill ${typePill(s.subjectType)}`}>{s.subjectType}</span> : "—"}</td>
                        <td>{fmtMarks(s.internalMarks)}</td>
                        <td>{fmtMarks(s.externalMarks)}</td>
                        <td>{fmtMarks(s.totalMarks)}</td>
                        <td>
                          <span className={`pill ${subjectStatusPill(s.status)}`}>
                            <span className="pill-dot" />{s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary row */}
              <div className="d-flex gap-3 flex-wrap mb-4" style={{ fontSize: "0.88rem", color: "var(--edx-slate-600)" }}>
                <span>Total: <strong style={{ color: "var(--edx-slate-900)" }}>{result.totalSubjects}</strong></span>
                <span>Passed: <strong style={{ color: "var(--edx-green-600)" }}>{result.passedSubjects}</strong></span>
                <span>Failed: <strong style={{ color: "var(--edx-red-500)" }}>{result.failedSubjects}</strong></span>
                <span>Incomplete: <strong style={{ color: "var(--edx-amber-600)" }}>{result.incompleteSubjects}</strong></span>
              </div>

              {/* Back */}
              <button className="btn-edx-outline" onClick={() => navigate("/dashboard/exam/results/generate")}>
                <FaArrowLeft />Back to Generate
              </button>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
