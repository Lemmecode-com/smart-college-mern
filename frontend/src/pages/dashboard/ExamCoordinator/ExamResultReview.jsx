import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResultsByExam, lockResultsForExam, publishResultsForExam, unlockResult } from "../../../api/results";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import Loading from "../../../components/Loading";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaClipboardList, FaArrowLeft, FaSpinner, FaCheckCircle,
  FaExclamationTriangle, FaLock, FaGlobe, FaLockOpen,
  FaBook, FaLayerGroup, FaUserGraduate, FaSearch,
  FaFilter, FaTimes, FaEye, FaChartBar,
} from "react-icons/fa";
import { motion } from "framer-motion";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING", "TOKEN_EXPIRED", "INVALID_TOKEN", "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED", "USER_NOT_FOUND", "ACCOUNT_DEACTIVATED", "UNAUTHORIZED",
]);

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
  --edx-slate-600: #55677c;
  --edx-slate-400: #8695a7;
  --edx-slate-200: #dfe6ec;
  --edx-slate-100: #eef2f6;
  background: var(--edx-bg);
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--edx-slate-900);
}
.err .err-card {
  background: #fff; border-radius: 16px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 4px 18px rgba(12,43,71,0.08); overflow: hidden;
}
.err .err-card-header {
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  padding: 1.25rem 1.5rem; display: flex;
  justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
}
.err .err-card-header-left { display: flex; align-items: center; gap: 0.85rem; }
.err .err-card-header-icon {
  width: 42px; height: 42px; border-radius: 11px;
  background: rgba(255,255,255,0.12); color: var(--edx-cyan-500);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.05rem; flex-shrink: 0;
}
.err .err-card-title { color: #fff; font-size: 1.2rem; font-weight: 700; margin: 0; }
.err .err-card-body { padding: 1.75rem; }
.err .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.err .info-item {
  display: flex; align-items: center; gap: 0.85rem;
  background: var(--edx-bg); border: 1px solid var(--edx-slate-100);
  border-radius: 12px; padding: 0.85rem 1rem;
}
.err .info-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.95rem; flex-shrink: 0;
}
.err .info-icon-primary { background: var(--edx-cyan-50); color: var(--edx-navy-800); }
.err .info-icon-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.err .info-icon-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.err .info-icon-danger { background: var(--edx-red-50); color: var(--edx-red-500); }
.err .info-label { color: var(--edx-slate-600); font-size: 0.78rem; display: block; }
.err .info-value { color: var(--edx-slate-900); font-weight: 600; font-size: 0.92rem; display: block; }
.err .section-title {
  display: flex; align-items: center; gap: 0.5rem;
  color: var(--edx-navy-950); font-weight: 700; font-size: 1rem; margin-bottom: 0.85rem;
}
.err .section-title svg { color: var(--edx-cyan-600); }
.err .table-card { border: 1px solid var(--edx-slate-100); border-radius: 12px; overflow: hidden; }
.err table { margin-bottom: 0; }
.err thead th {
  background: var(--edx-slate-100); color: var(--edx-navy-900);
  font-weight: 600; font-size: 0.8rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.75rem 1rem; white-space: nowrap;
}
.err tbody td {
  padding: 0.7rem 1rem; vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100); font-size: 0.88rem;
}
.err tbody tr { transition: background 0.12s ease; }
.err tbody tr:hover { background: var(--edx-cyan-50); }
.err tbody tr:last-child td { border-bottom: none; }
.err .student-name { font-weight: 600; color: var(--edx-slate-900); }
.err .student-id { color: var(--edx-slate-600); font-size: 0.78rem; }
.err .pill {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.22rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
}
.err .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.err .pill-pass { background: var(--edx-green-50); color: var(--edx-green-600); }
.err .pill-pass .pill-dot { background: var(--edx-green-500); }
.err .pill-fail { background: var(--edx-red-50); color: var(--edx-red-500); }
.err .pill-fail .pill-dot { background: var(--edx-red-500); }
.err .pill-incomplete { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.err .pill-incomplete .pill-dot { background: var(--edx-amber-500); }
.err .pill-draft { background: var(--edx-slate-100); color: var(--edx-slate-600); }
.err .pill-locked { background: rgba(12,43,71,0.08); color: var(--edx-navy-800); }
.err .pill-published { background: var(--edx-green-50); color: var(--edx-green-600); }
.err .pill-published .pill-dot { background: var(--edx-green-500); }
.err .lifecycle-bar {
  display: flex; align-items: center; gap: 0.75rem;
  background: var(--edx-bg); border: 1px solid var(--edx-slate-200);
  border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; flex-wrap: wrap;
}
.err .lifecycle-label { font-weight: 600; color: var(--edx-slate-600); font-size: 0.85rem; margin-right: 0.25rem; }
.err .lifecycle-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-left: auto; }
.err .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; align-items: center; }
.err .search-box { flex: 1 1 240px; display: flex; align-items: center; gap: 0.6rem; border: 1px solid var(--edx-slate-200); border-radius: 10px; padding: 0.55rem 0.85rem; background: var(--edx-bg); transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
.err .search-box:focus-within { border-color: var(--edx-cyan-500); box-shadow: 0 0 0 3px var(--edx-cyan-50); background: #fff; }
.err .search-box svg { color: var(--edx-slate-400); flex-shrink: 0; }
.err .search-box input { border: none; outline: none; background: transparent; flex: 1; font-size: 0.92rem; color: var(--edx-slate-900); min-width: 0; }
.err .filter-select { padding: 0.55rem 0.85rem; border: 1px solid var(--edx-slate-200); border-radius: 10px; font-size: 0.88rem; color: var(--edx-slate-900); background: var(--edx-bg); min-width: 140px; }
.err .btn-edx-primary {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1.2rem;
  font-weight: 600; font-size: 0.88rem; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(12,43,71,0.18);
}
.err .btn-edx-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(23,174,203,0.28); }
.err .btn-edx-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
.err .btn-edx-outline {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: #fff; color: var(--edx-navy-800); border: 1px solid var(--edx-slate-200);
  border-radius: 10px; padding: 0.6rem 1.2rem; font-weight: 600; font-size: 0.88rem;
  cursor: pointer; transition: all 0.15s ease;
}
.err .btn-edx-outline:hover:not(:disabled) { border-color: var(--edx-navy-700); background: var(--edx-slate-100); }
.err .btn-edx-outline:disabled { opacity: 0.65; cursor: not-allowed; }
.err .btn-edx-warning {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: var(--edx-amber-50); color: var(--edx-amber-600);
  border: 1px solid rgba(232,165,49,0.4); border-radius: 10px; padding: 0.6rem 1.2rem;
  font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.15s ease;
}
.err .btn-edx-warning:hover:not(:disabled) { background: var(--edx-amber-500); color: #fff; border-color: var(--edx-amber-500); }
.err .btn-edx-success {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-green-600), var(--edx-green-500));
  color: #fff; border: none; border-radius: 10px; padding: 0.6rem 1.2rem;
  font-weight: 600; font-size: 0.88rem; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(31,138,95,0.2);
}
.err .btn-edx-success:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(31,138,95,0.28); }
.err .btn-edx-success:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
.err .spin { animation: err-spin 0.8s linear infinite; }
@keyframes err-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.err .alert-edx {
  display: flex; align-items: flex-start; gap: 0.6rem;
  border-radius: 10px; padding: 0.85rem 1rem; font-size: 0.88rem; border: 1px solid transparent;
}
.err .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }
.err .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229,72,77,0.25); }
.err .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232,165,49,0.3); }
.err .alert-edx-success { background: var(--edx-green-50); color: var(--edx-green-600); border-color: rgba(42,168,118,0.3); }
.err .empty-state { text-align: center; padding: 3rem 1.5rem; color: var(--edx-slate-600); }
@media (max-width: 640px) {
  .err .info-grid { grid-template-columns: 1fr 1fr; }
  .err .err-card-body { padding: 1.25rem; }
  .err .lifecycle-actions { margin-left: 0; width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .err * { animation: none !important; transition: none !important; }
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
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");

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
      setFetchError({ message: msg, statusCode: err.response?.status, errorCode: code, isAuthError: AUTH_ERROR_CODES.has(code) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (examId) load(); }, [examId]);

  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    let results = data.results;
    if (resultFilter === "PASS") results = results.filter((r) => r.overallResult === "PASS");
    else if (resultFilter === "FAIL") results = results.filter((r) => r.overallResult === "FAIL");
    else if (resultFilter === "INCOMPLETE") results = results.filter((r) => r.overallResult === "INCOMPLETE");
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter((r) => {
        const name = r.student_id?.fullName || "";
        const id = r.student_id?.enrollmentNumber || r.student_id?.rollNumber || "";
        return name.toLowerCase().includes(term) || id.toLowerCase().includes(term);
      });
    }
    return results;
  }, [data, resultFilter, searchTerm]);

  const { summary } = data || {};
  const draftCount = summary?.byStatus?.DRAFT || 0;
  const lockedCount = summary?.byStatus?.LOCKED || 0;
  const publishedCount = summary?.byStatus?.PUBLISHED || 0;
  const totalStudents = summary?.totalStudents || 0;

  const handleLockAll = async () => {
    setShowLockConfirm(false);
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await lockResultsForExam(examId);
      toast.success(`${res.modified} result(s) locked.`);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to lock.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handlePublishAll = async () => {
    setShowPublishConfirm(false);
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await publishResultsForExam(examId);
      toast.success(`${res.modified} result(s) published.`);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to publish.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handleUnlockAll = async () => {
    if (!unlockReason.trim()) return;
    setShowUnlockConfirm(false);
    setActionBusy(true);
    setActionError(null);
    try {
      const lockedResults = data.results.filter((r) => r.status === "LOCKED");
      for (const r of lockedResults) {
        await unlockResult(r._id, unlockReason.trim());
      }
      toast.success(`${lockedResults.length} result(s) unlocked.`);
      setUnlockReason("");
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to unlock.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const statusPillClass = (s) =>
    s === "PUBLISHED" ? "pill-published" : s === "LOCKED" ? "pill-locked" : "pill-draft";

  const overallPillClass = (s) =>
    s === "PASS" ? "pill-pass" : s === "FAIL" ? "pill-fail" : "pill-incomplete";

  if (loading) return <Loading message="Loading results..." />;
  if (fetchError?.isAuthError) return <ApiError statusCode={fetchError.statusCode} errorCode={fetchError.errorCode} message={fetchError.message} />;
  if (fetchError) {
    return (
      <div className="err container-fluid p-4">
        <style>{styles}</style>
        <div className="alert-edx alert-edx-danger mb-3"><FaExclamationTriangle />{fetchError.message}</div>
        <button className="btn-edx-outline" onClick={() => navigate("/dashboard/exam/results")}><FaArrowLeft />Back</button>
      </div>
    );
  }
  if (!data) return null;

  const exam = data.exam;

  return (
    <div className="err container-fluid p-4">
      <style>{styles}</style>

      <ConfirmModal
        isOpen={showLockConfirm}
        onClose={() => setShowLockConfirm(false)}
        onConfirm={handleLockAll}
        title="Lock All Results"
        message="Locking these results will prevent further marks modifications. Continue?"
        type="warning"
        confirmText="Lock All"
        isLoading={actionBusy}
      />
      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublishAll}
        title="Publish All Results"
        message="Publishing these results will make them visible to eligible students. Continue?"
        type="success"
        confirmText="Publish All"
        isLoading={actionBusy}
      />

      <Breadcrumb items={[
        { label: "Exam Results", path: "/dashboard/exam/results" },
        { label: "Review Results" },
      ]} />

      <div className="row justify-content-center">
        <div className="col-lg-11">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="err-card mt-3"
          >
            <div className="err-card-header">
              <div className="err-card-header-left">
                <div className="err-card-header-icon"><FaChartBar /></div>
                <h4 className="err-card-title">Exam Result Review — {exam.name}</h4>
              </div>
              <span className="pill pill-published" style={{ fontSize: "0.85rem" }}>
                {totalStudents} Students
              </span>
            </div>

            <div className="err-card-body">

              {actionError && (
                <div className="alert-edx alert-edx-danger mb-3"><FaExclamationTriangle />{actionError}</div>
              )}

              {/* Info grid */}
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon info-icon-primary"><FaClipboardList /></div>
                  <div>
                    <span className="info-label">Course</span>
                    <span className="info-value">{exam.course_id?.name || "N/A"}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-primary"><FaLayerGroup /></div>
                  <div>
                    <span className="info-label">Semester / Year</span>
                    <span className="info-value">Sem {exam.semester} · {exam.academicYear}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-success"><FaCheckCircle /></div>
                  <div>
                    <span className="info-label">Passed</span>
                    <span className="info-value">{summary.passed}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-danger"><FaExclamationTriangle /></div>
                  <div>
                    <span className="info-label">Failed</span>
                    <span className="info-value">{summary.failed}</span>
                  </div>
                </div>
              </div>

              {/* Lifecycle bar */}
              <div className="lifecycle-bar">
                <span className="lifecycle-label">Status:</span>
                <span className="pill pill-draft"><span className="pill-dot" />Draft: {draftCount}</span>
                <span className="pill pill-locked"><span className="pill-dot" />Locked: {lockedCount}</span>
                <span className="pill pill-published"><span className="pill-dot" />Published: {publishedCount}</span>
                <div className="lifecycle-actions">
                  {draftCount > 0 && lockedCount === 0 && publishedCount === 0 && (
                    <button className="btn-edx-primary" onClick={() => setShowLockConfirm(true)} disabled={actionBusy}>
                      <FaLock /> Lock All
                    </button>
                  )}
                  {lockedCount > 0 && draftCount === 0 && (
                    <>
                      <button className="btn-edx-success" onClick={() => setShowPublishConfirm(true)} disabled={actionBusy}>
                        <FaGlobe /> Publish All
                      </button>
                      <button className="btn-edx-warning" onClick={() => setShowUnlockConfirm(true)} disabled={actionBusy}>
                        <FaLockOpen /> Unlock All
                      </button>
                    </>
                  )}
                  {publishedCount > 0 && publishedCount === totalStudents && (
                    <span style={{ fontSize: "0.85rem", color: "var(--edx-green-600)", fontWeight: 600 }}>
                      <FaCheckCircle style={{ marginRight: "0.35rem" }} />All results published
                    </span>
                  )}
                </div>
              </div>

              {/* Unlock reason modal */}
              {showUnlockConfirm && (
                <div className="alert-edx alert-edx-warning mb-3">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      <FaLockOpen style={{ marginRight: "0.4rem" }} />
                      Unlock All Locked Results
                    </div>
                    <textarea
                      className="unlock-input"
                      rows={3}
                      placeholder="Enter unlock reason (required)..."
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      style={{ width: "100%", border: "1px solid var(--edx-slate-200)", borderRadius: "10px", padding: "0.55rem 0.85rem", fontSize: "0.88rem", background: "#fff", marginBottom: "0.5rem" }}
                    />
                    <div className="d-flex gap-2">
                      <button className="btn-edx-warning" onClick={handleUnlockAll} disabled={actionBusy || !unlockReason.trim()}>
                        {actionBusy ? <FaSpinner className="spin" /> : <FaLockOpen />} Confirm Unlock
                      </button>
                      <button className="btn-edx-outline" onClick={() => { setShowUnlockConfirm(false); setUnlockReason(""); }} disabled={actionBusy}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="filter-row">
                <div className="search-box">
                  <FaSearch />
                  <input type="text" placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <FaFilter style={{ color: "var(--edx-slate-400)" }} />
                  <select className="filter-select" value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
                    <option value="ALL">All Results</option>
                    <option value="PASS">Passed</option>
                    <option value="FAIL">Failed</option>
                    <option value="INCOMPLETE">Incomplete</option>
                  </select>
                </div>
              </div>

              {/* Student results table */}
              <h5 className="section-title"><FaBook /> Student Results</h5>
              <div className="table-card table-responsive mb-4">
                {filteredResults.length === 0 ? (
                  <div className="empty-state">
                    <FaExclamationTriangle size={24} style={{ marginBottom: "0.5rem" }} />
                    <div>No results match the current filter.</div>
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>ID</th>
                        <th>Subjects</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Overall</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((r) => (
                        <tr key={r._id}>
                          <td>
                            <div className="student-name">{r.student_id?.fullName || "—"}</div>
                          </td>
                          <td>
                            <div className="student-id">{r.student_id?.enrollmentNumber || r.student_id?.rollNumber || "—"}</div>
                          </td>
                          <td>{r.totalSubjects}</td>
                          <td style={{ color: "var(--edx-green-600)", fontWeight: 600 }}>{r.passedSubjects}</td>
                          <td style={{ color: "var(--edx-red-500)", fontWeight: 600 }}>{r.failedSubjects}</td>
                          <td>
                            <span className={`pill ${overallPillClass(r.overallResult)}`}>
                              <span className="pill-dot" />{r.overallResult}
                            </span>
                          </td>
                          <td>
                            <span className={`pill ${statusPillClass(r.status)}`}>{r.status}</span>
                          </td>
                          <td>
                            <button
                              className="btn-edx-outline"
                              style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                              onClick={() => navigate(`/dashboard/exam/results/${r._id}`)}
                            >
                              <FaEye /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <button className="btn-edx-outline" onClick={() => navigate("/dashboard/exam/results")}>
                <FaArrowLeft /> Back to Dashboard
              </button>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
