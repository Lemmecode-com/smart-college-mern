import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { getResultsByExam, getExamResultSummaries, lockResultsForExam, unlockResult, publishResultsForExam } from "../../../api/results";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaClipboardList,
  FaPlus,
  FaSearch,
  FaEye,
  FaCog,
  FaLock,
  FaGlobe,
  FaLockOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaGraduationCap,
  FaLayerGroup,
  FaChartBar,
  FaPencilAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING", "TOKEN_EXPIRED", "INVALID_TOKEN", "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED", "USER_NOT_FOUND", "ACCOUNT_DEACTIVATED", "UNAUTHORIZED",
]);

const styles = `
.erd {
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
.erd nav.erp-breadcrumb { margin-bottom: 1.1rem; }

.erd .edx-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.erd .erd-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: var(--edx-cyan-500); font-size: 1.15rem; flex-shrink: 0;
}
.erd .edx-title { font-size: 1.5rem; font-weight: 700; color: var(--edx-navy-950); margin: 0; line-height: 1.2; }
.erd .edx-subtitle { color: var(--edx-slate-600); margin: 0.15rem 0 0; font-size: 0.92rem; }
.erd .edx-divider { height: 3px; border-radius: 3px; background: linear-gradient(90deg, var(--edx-navy-900) 0%, var(--edx-cyan-500) 55%, transparent 100%); margin: 1.1rem 0 1.5rem; }
.erd .btn-edx-primary {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff; border: none; border-radius: 10px; padding: 0.65rem 1.3rem;
  font-weight: 600; font-size: 0.92rem; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 2px 6px rgba(12,43,71,0.18);
}
.erd .btn-edx-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(23,174,203,0.28); background: linear-gradient(135deg, var(--edx-navy-800), var(--edx-cyan-600)); }
.erd .stat-card { background: #fff; border-radius: 14px; border: 1px solid var(--edx-slate-100); box-shadow: 0 1px 3px rgba(12,43,71,0.06); padding: 1.15rem 1.25rem; height: 100%; }
.erd .stat-card-header { display: flex; align-items: center; gap: 0.9rem; }
.erd .stat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; flex-shrink: 0; }
.erd .stat-icon-primary { background: var(--edx-cyan-50); color: var(--edx-navy-800); border-left: 3px solid var(--edx-navy-800); }
.erd .stat-icon-success { background: var(--edx-green-50); color: var(--edx-green-600); border-left: 3px solid var(--edx-green-500); }
.erd .stat-icon-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-left: 3px solid var(--edx-amber-500); }
.erd .stat-icon-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-left: 3px solid var(--edx-red-500); }
.erd .stat-label { color: var(--edx-slate-600); font-size: 0.85rem; }
.erd .stat-value { color: var(--edx-navy-950); font-size: 1.65rem; font-weight: 700; line-height: 1.2; }
.erd .filter-card { background: #fff; border-radius: 14px; border: 1px solid var(--edx-slate-100); box-shadow: 0 1px 3px rgba(12,43,71,0.06); padding: 1.1rem 1.25rem; }
.erd .filter-card-label { display: flex; align-items: center; gap: 0.45rem; color: var(--edx-navy-800); font-weight: 600; font-size: 0.85rem; margin-bottom: 0.75rem; }
.erd .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.erd .search-box { flex: 1 1 260px; display: flex; align-items: center; gap: 0.6rem; border: 1px solid var(--edx-slate-200); border-radius: 10px; padding: 0.55rem 0.85rem; background: var(--edx-bg); transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
.erd .search-box:focus-within { border-color: var(--edx-cyan-500); box-shadow: 0 0 0 3px var(--edx-cyan-50); background: #fff; }
.erd .search-box svg { color: var(--edx-slate-400); flex-shrink: 0; }
.erd .search-box input { border: none; outline: none; background: transparent; flex: 1; font-size: 0.92rem; color: var(--edx-slate-900); min-width: 0; }
.erd .search-clear { border: none; background: var(--edx-slate-200); color: var(--edx-slate-600); width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; cursor: pointer; flex-shrink: 0; }
.erd .search-clear:hover { background: var(--edx-slate-400); color: #fff; }
.erd .select-box { flex: 0 1 210px; position: relative; }
.erd .select-box select { width: 100%; appearance: none; border: 1px solid var(--edx-slate-200); border-radius: 10px; padding: 0.6rem 2.1rem 0.6rem 0.85rem; font-size: 0.92rem; color: var(--edx-slate-900); background: var(--edx-bg); cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
.erd .select-box select:focus { outline: none; border-color: var(--edx-cyan-500); box-shadow: 0 0 0 3px var(--edx-cyan-50); background: #fff; }
.erd .select-box::after { content: ""; position: absolute; right: 0.9rem; top: 50%; width: 7px; height: 7px; border-right: 2px solid var(--edx-slate-400); border-bottom: 2px solid var(--edx-slate-400); transform: translateY(-65%) rotate(45deg); pointer-events: none; }
.erd .table-card { background: #fff; border-radius: 14px; border: 1px solid var(--edx-slate-100); box-shadow: 0 1px 3px rgba(12,43,71,0.06); overflow: hidden; }
.erd table { margin-bottom: 0; }
.erd thead th { background: var(--edx-slate-100); color: var(--edx-navy-900); font-weight: 600; font-size: 0.82rem; border-bottom: 2px solid var(--edx-cyan-500) !important; padding: 0.85rem 1rem; white-space: nowrap; }
.erd tbody td { padding: 0.8rem 1rem; vertical-align: middle; border-bottom: 1px solid var(--edx-slate-100); font-size: 0.9rem; }
.erd tbody tr { transition: background 0.12s ease; }
.erd tbody tr:hover { background: var(--edx-cyan-50); }
.erd tbody tr:last-child td { border-bottom: none; }
.erd .row-icon { width: 30px; height: 30px; border-radius: 8px; background: var(--edx-cyan-50); color: var(--edx-navy-800); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0; }
.erd .row-title { font-weight: 600; color: var(--edx-slate-900); }
.erd .course-name { font-weight: 600; color: var(--edx-slate-900); font-size: 0.9rem; }
.erd .course-code { color: var(--edx-slate-600); font-size: 0.78rem; }
.erd .pill { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.28rem 0.65rem; border-radius: 999px; font-size: 0.78rem; font-weight: 600; white-space: nowrap; }
.erd .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.erd .pill-cyan { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.erd .pill-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.erd .pill-success .pill-dot { background: var(--edx-green-500); }
.erd .pill-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.erd .pill-warning .pill-dot { background: var(--edx-amber-500); }
.erd .pill-danger { background: var(--edx-red-50); color: var(--edx-red-500); }
.erd .pill-danger .pill-dot { background: var(--edx-red-500); }
.erd .pill-draft { background: var(--edx-slate-100); color: var(--edx-slate-600); }
.erd .pill-locked { background: rgba(12,43,71,0.08); color: var(--edx-navy-800); }
.erd .pill-published { background: var(--edx-green-50); color: var(--edx-green-600); }
.erd .pill-published .pill-dot { background: var(--edx-green-500); }
.erd .icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--edx-slate-200); background: #fff; color: var(--edx-slate-600); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; font-size: 0.85rem; }
.erd .icon-btn:hover { border-color: var(--edx-cyan-500); color: var(--edx-cyan-600); background: var(--edx-cyan-50); }
.erd .icon-btn[disabled] { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
.erd .icon-btn-locked:hover { border-color: var(--edx-navy-700); color: var(--edx-navy-800); background: var(--edx-slate-100); }
.erd .icon-btn-publish:hover { border-color: var(--edx-green-500); color: var(--edx-green-600); background: var(--edx-green-50); }
.erd .icon-btn-unlock:hover { border-color: var(--edx-amber-500); color: var(--edx-amber-600); background: var(--edx-amber-50); }
.erd .empty-state { text-align: center; padding: 3.5rem 1.5rem; }
.erd .empty-icon { width: 72px; height: 72px; border-radius: 50%; background: var(--edx-slate-100); color: var(--edx-slate-400); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.6rem; }
.erd .empty-title { color: var(--edx-navy-950); font-weight: 700; margin-bottom: 0.4rem; }
.erd .empty-text { color: var(--edx-slate-600); font-size: 0.92rem; max-width: 420px; margin: 0 auto; }
.erd .erd-alert { background: var(--edx-red-50); color: var(--edx-red-500); border: 1px solid rgba(229,72,77,0.25); border-radius: 10px; padding: 0.9rem 1.1rem; font-size: 0.92rem; margin-bottom: 1rem; }
.erd .result-meta { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.78rem; color: var(--edx-slate-600); }
.erd .result-meta span { display: inline-flex; align-items: center; gap: 0.3rem; }
@media (max-width: 768px) {
  .erd .edx-header { flex-direction: column; align-items: stretch; }
  .erd .btn-edx-primary { justify-content: center; }
  .erd .filter-row { flex-direction: column; }
  .erd .select-box { flex: 1 1 auto; }
}
@media (prefers-reduced-motion: reduce) {
  .erd * { animation: none !important; transition: none !important; }
}
`;

export default function ExamResultsDashboard() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionBusy, setActionBusy] = useState(null);

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const fetchExamsAndSummaries = async () => {
      try {
        const res = await api.get("/exam");
        const examsData = Array.isArray(res.data) ? res.data :
                        Array.isArray(res.data.data) ? res.data.data : [];
        setExams(examsData);

        const summaries = await getExamResultSummaries();
        setResultMap(buildResultMap(summaries));
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;
        const errorMessage = backendMessage || "Failed to load exams.";
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
    fetchExamsAndSummaries();
  }, []);

  const buildResultMap = (summaries) => {
    const map = {};
    for (const s of summaries) {
      map[s.examId] = { summary: s.summary };
    }
    return map;
  };

  const filteredExams = useMemo(() => {
    let result = exams;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((exam) => {
        const courseName = exam.course_id?.name || "";
        return exam.name?.toLowerCase().includes(term) || courseName.toLowerCase().includes(term);
      });
    }
    if (statusFilter !== "ALL") {
      result = result.filter((exam) => {
        const info = resultMap[exam._id];
        if (!info || info.summary.totalStudents === 0) return statusFilter === "NOT_GENERATED";
        const { byStatus } = info.summary;
        const dominant = byStatus.PUBLISHED === info.summary.totalStudents ? "PUBLISHED"
          : byStatus.LOCKED > 0 && byStatus.DRAFT === 0 ? "LOCKED"
          : byStatus.DRAFT > 0 && byStatus.LOCKED === 0 && byStatus.PUBLISHED === 0 ? "DRAFT"
          : "MIXED";
        return dominant === statusFilter;
      });
    }
    return result;
  }, [exams, searchTerm, statusFilter, resultMap]);

  const refreshResult = async () => {
    try {
      const summaries = await getExamResultSummaries();
      setResultMap(buildResultMap(summaries));
    } catch { /* ignore refresh error */ }
  };

  const handleGenerate = (examId) => {
    navigate(`/dashboard/exam/results/generate?examId=${examId}`);
  };

  const handleReview = (examId) => {
    navigate(`/dashboard/exam/results/review/${examId}`);
  };

  const handleLock = async (examId) => {
    setActionBusy(examId);
    try {
      await lockResultsForExam(examId);
      toast.success("All draft results locked.");
      await refreshResult(examId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to lock results.");
    } finally {
      setActionBusy(null);
    }
  };

  const handleUnlock = async (examId) => {
    const reason = window.prompt("Unlock reason (required):");
    if (!reason || !reason.trim()) return;
    setActionBusy(examId);
    try {
      const info = await getResultsByExam(examId);
      const lockedResults = info.results.filter((r) => r.status === "LOCKED");
      for (const r of lockedResults) {
        await unlockResult(r._id, reason.trim());
      }
      toast.success(`${lockedResults.length} result(s) unlocked.`);
      await refreshResult(examId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unlock results.");
    } finally {
      setActionBusy(null);
    }
  };

  const handlePublish = async (examId) => {
    setActionBusy(examId);
    try {
      await publishResultsForExam(examId);
      toast.success("All locked results published.");
      await refreshResult(examId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish results.");
    } finally {
      setActionBusy(null);
    }
  };

  const getDominantStatus = (examId) => {
    const info = resultMap[examId];
    if (!info || info.summary.totalStudents === 0) return null;
    const { byStatus, totalStudents } = info.summary;
    if (byStatus.PUBLISHED === totalStudents) return "PUBLISHED";
    if (byStatus.LOCKED > 0 && byStatus.DRAFT === 0) return "LOCKED";
    if (byStatus.DRAFT > 0 && byStatus.LOCKED === 0 && byStatus.PUBLISHED === 0) return "DRAFT";
    return "MIXED";
  };

  const statusPill = (status) => {
    if (status === "PUBLISHED") return <span className="pill pill-published"><span className="pill-dot" />Published</span>;
    if (status === "LOCKED") return <span className="pill pill-locked"><span className="pill-dot" />Locked</span>;
    if (status === "DRAFT") return <span className="pill pill-draft"><span className="pill-dot" />Draft</span>;
    if (status === "MIXED") return <span className="pill pill-warning"><span className="pill-dot" />In Progress</span>;
    return <span className="pill pill-cyan"><span className="pill-dot" />Not Generated</span>;
  };

  const totalGenerated = Object.values(resultMap).reduce((acc, info) => acc + (info ? info.summary.totalStudents : 0), 0);
  const totalPassed = Object.values(resultMap).reduce((acc, info) => acc + (info ? info.summary.passed : 0), 0);
  const totalFailed = Object.values(resultMap).reduce((acc, info) => acc + (info ? info.summary.failed : 0), 0);
  const totalPublished = Object.values(resultMap).reduce((acc, info) => acc + (info ? info.summary.byStatus.PUBLISHED : 0), 0);

  if (loading) return <Loading message="Loading exam results..." />;

  if (error) {
    if (error.isAuthError) {
      return <ApiError statusCode={error.statusCode} errorCode={error.errorCode} message={error.message} />;
    }
    return (
      <div className="erd container-fluid p-4">
        <style>{styles}</style>
        <div className="erd-alert">{error.message}</div>
        <button className="btn-edx-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="erd container-fluid p-4">
      <style>{styles}</style>

      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard/exam" },
          { label: "Exam Dashboard", path: "/dashboard/exam" },
          { label: "Results Dashboard" },
        ]}
      />

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="edx-header"
      >
        <div className="d-flex align-items-center gap-3">
          <div className="erd-icon"><FaChartBar /></div>
          <div>
            <h2 className="edx-title">Exam Results Dashboard</h2>
            <p className="edx-subtitle">Manage result generation, review, lock and publish</p>
          </div>
        </div>
        <button className="btn-edx-primary" onClick={() => navigate("/dashboard/exam/results/generate")}>
          <FaPlus /> Generate Result
        </button>
      </motion.div>
      <div className="edx-divider" />

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        className="row mb-4 g-3"
      >
        <div className="col-md-3 col-sm-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-primary"><FaClipboardList /></div>
              <div><span className="stat-label">Total Results</span><span className="stat-value">{totalGenerated}</span></div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-success"><FaCheckCircle /></div>
              <div><span className="stat-label">Passed</span><span className="stat-value">{totalPassed}</span></div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-danger"><FaExclamationTriangle /></div>
              <div><span className="stat-label">Failed</span><span className="stat-value">{totalFailed}</span></div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon stat-icon-warning"><FaGlobe /></div>
              <div><span className="stat-label">Published</span><span className="stat-value">{totalPublished}</span></div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="filter-card mb-4">
        <div className="filter-card-label"><FaSearch /> Search &amp; filter exams</div>
        <div className="filter-row">
          <div className="search-box">
            <FaSearch />
            <input type="text" placeholder="Search by exam or course..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button type="button" className="search-clear" onClick={() => setSearchTerm("")} title="Clear"><FaTimes /></button>}
          </div>
          <div className="select-box">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All status</option>
              <option value="NOT_GENERATED">Not Generated</option>
              <option value="DRAFT">Draft</option>
              <option value="LOCKED">Locked</option>
              <option value="PUBLISHED">Published</option>
              <option value="MIXED">In Progress</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-card">
        {filteredExams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FaChartBar size={26} /></div>
            <h5 className="empty-title">No exam results found</h5>
            <p className="empty-text">
              {exams.length === 0
                ? "No exams available. Create an exam first to generate results."
                : "No exams match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Course</th>
                  <th>Sem</th>
                  <th>Year</th>
                  <th>Result Status</th>
                  <th>Students</th>
                  <th>Passed / Failed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => {
                  const info = resultMap[exam._id];
                  const dominant = getDominantStatus(exam._id);
                  const totalStudents = info ? info.summary.totalStudents : 0;
                  const passed = info ? info.summary.passed : 0;
                  const failed = info ? info.summary.failed : 0;
                  const published = info ? info.summary.byStatus.PUBLISHED : 0;
                  const locked = info ? info.summary.byStatus.LOCKED : 0;
                  const draft = info ? info.summary.byStatus.DRAFT : 0;
                  const canReview = totalStudents > 0;
                  const canGenerate = true;
                  const canLock = draft > 0 && locked === 0 && published === 0;
                  const canPublish = locked > 0 && draft === 0;
                  const canUnlock = locked > 0;
                  return (
                    <tr key={exam._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="row-icon"><FaClipboardList /></div>
                          <span className="row-title">{exam.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="course-name">{exam.course_id?.name || "N/A"}</div>
                        <div className="course-code">{exam.course_id?.code || ""}</div>
                      </td>
                      <td><span className="pill pill-cyan"><FaLayerGroup size={10} /> Sem {exam.semester}</span></td>
                      <td><span style={{ color: "var(--edx-slate-600)" }}>{exam.academicYear}</span></td>
                      <td>
                        <div>{statusPill(dominant)}</div>
                        {info && totalStudents > 0 && (
                          <div className="result-meta mt-1">
                            <span><FaCog size={9} /> {totalStudents} results</span>
                            {published > 0 && <span><FaGlobe size={9} /> {published}</span>}
                            {locked > 0 && <span><FaLock size={9} /> {locked}</span>}
                            {draft > 0 && <span><FaPencilAlt size={9} /> {draft}</span>}
                          </div>
                        )}
                      </td>
                      <td>{totalStudents > 0 ? totalStudents : <span style={{ color: "var(--edx-slate-400)" }}>—</span>}</td>
                      <td>
                        {totalStudents > 0 ? (
                          <span style={{ fontSize: "0.85rem" }}>
                            <span style={{ color: "var(--edx-green-600)", fontWeight: 600 }}>{passed}</span>
                            {" / "}
                            <span style={{ color: "var(--edx-red-500)", fontWeight: 600 }}>{failed}</span>
                          </span>
                        ) : <span style={{ color: "var(--edx-slate-400)" }}>—</span>}
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="icon-btn" title="Generate Result" disabled={actionBusy === exam._id} onClick={() => handleGenerate(exam._id)}>
                            <FaCog />
                          </button>
                          <button className="icon-btn" title="Review Results" disabled={!canReview} onClick={() => handleReview(exam._id)}>
                            <FaEye />
                          </button>
                          <button className="icon-btn icon-btn-locked" title="Lock All" disabled={!canLock || actionBusy === exam._id} onClick={() => handleLock(exam._id)}>
                            <FaLock />
                          </button>
                          <button className="icon-btn icon-btn-unlock" title="Unlock All" disabled={!canUnlock || actionBusy === exam._id} onClick={() => handleUnlock(exam._id)}>
                            <FaLockOpen />
                          </button>
                          <button className="icon-btn icon-btn-publish" title="Publish All" disabled={!canPublish || actionBusy === exam._id} onClick={() => handlePublish(exam._id)}>
                            <FaGlobe />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
