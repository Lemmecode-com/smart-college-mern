import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../api/axios";
import { getExams } from "../../../api/exam";
import {
  generateResult,
  generateResultsForExam,
  getExamResultSummaries,
} from "../../../api/results";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import SearchableSelect from "../../../components/SearchableSelect";
import ApiError from "../../../components/ApiError";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaClipboardList,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGraduationCap,
  FaUserGraduate,
  FaEye,
  FaLayerGroup,
  FaUsers,
  FaCog,
  FaLock,
  FaClock,
  FaFilter,
  FaTimes,
  FaBookOpen,
  FaCalendarAlt,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaSyncAlt,
  FaCheck,
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

const styles = `
.rgen {
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

.rgen nav.erp-breadcrumb { margin-bottom: 1rem; }

.rgen .rgen-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-200);
  box-shadow: 0 2px 10px rgba(12, 43, 71, 0.05);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.rgen .rgen-card-header {
  padding: 1.1rem 1.4rem;
  border-bottom: 1px solid var(--edx-slate-100);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: #fff;
}

.rgen .rgen-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.rgen .rgen-card-header-icon {
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

.rgen .rgen-card-title {
  color: var(--edx-navy-900);
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
}

.rgen .rgen-card-body {
  padding: 1.4rem;
}

/* Filter bar */
.rgen .filter-bar {
  background: var(--edx-slate-100);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  margin-bottom: 1.25rem;
}

.rgen .filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  align-items: flex-end;
}

.rgen .filter-label {
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--edx-slate-600);
  margin-bottom: 0.35rem;
  display: block;
}

.rgen .filter-select {
  width: 100%;
  border: 1px solid var(--edx-slate-200);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  background: #fff;
  color: var(--edx-slate-900);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.rgen .filter-select:focus {
  outline: none;
  border-color: var(--edx-cyan-500);
}

.rgen .clear-filters-btn {
  border: none;
  background: transparent;
  color: var(--edx-cyan-600);
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0;
}

.rgen .clear-filters-btn:hover {
  text-decoration: underline;
}

/* Mode toggle */
.rgen .mode-toggle {
  display: flex;
  background: var(--edx-slate-100);
  border-radius: 11px;
  padding: 4px;
  margin-bottom: 1.25rem;
}

.rgen .mode-btn {
  flex: 1;
  padding: 0.65rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--edx-slate-600);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  transition: all 0.2s ease;
}

.rgen .mode-btn-active {
  background: #fff;
  color: var(--edx-navy-900);
  box-shadow: 0 2px 6px rgba(12, 43, 71, 0.08);
}

/* Alerts */
.rgen .alert-edx {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
  margin-bottom: 1rem;
}

.rgen .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }
.rgen .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229,72,77,0.25); }
.rgen .alert-edx-success { background: var(--edx-green-50); color: var(--edx-green-600); border-color: rgba(42,168,118,0.3); }
.rgen .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232,165,49,0.3); }
.rgen .alert-edx-info { background: var(--edx-cyan-50); color: var(--edx-cyan-600); border-color: rgba(23,174,203,0.3); }
.rgen .alert-edx-navy { background: #e8eef3; color: var(--edx-navy-900); border-color: rgba(12,43,71,0.2); }

/* Lifecycle status badge */
.rgen .status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.rgen .status-badge-draft { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.rgen .status-badge-locked { background: #e7f0f8; color: var(--edx-navy-800); }
.rgen .status-badge-published { background: var(--edx-green-50); color: var(--edx-green-600); }
.rgen .status-badge-none { background: var(--edx-slate-100); color: var(--edx-slate-600); }

/* Details grid */
.rgen .detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
}

.rgen .detail-item {
  background: var(--edx-slate-100);
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
}

.rgen .detail-label {
  color: var(--edx-slate-600);
  font-size: 0.74rem;
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 0.2rem;
}

.rgen .detail-value {
  color: var(--edx-slate-900);
  font-weight: 700;
  font-size: 0.95rem;
  display: block;
}

/* Validation checklist */
.rgen .validation-list { list-style: none; padding: 0; margin: 0; }
.rgen .validation-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.65rem 0;
  font-size: 0.88rem;
  border-bottom: 1px solid var(--edx-slate-100);
}
.rgen .validation-item:last-child { border-bottom: none; }
.rgen .validation-icon { margin-top: 0.2rem; flex-shrink: 0; }
.rgen .validation-ok { color: var(--edx-green-600); }
.rgen .validation-warn { color: var(--edx-amber-600); }
.rgen .validation-err { color: var(--edx-red-500); }

/* Results summary cards */
.rgen .result-summary-card {
  border: 1px solid var(--edx-slate-200);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 14px rgba(12, 43, 71, 0.06);
  margin-top: 1.5rem;
}

.rgen .result-summary-header {
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff;
  padding: 1rem 1.4rem;
  font-weight: 700;
  font-size: 1.05rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.rgen .result-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--edx-slate-200);
}

.rgen .stat-box {
  padding: 1.25rem 0.85rem;
  text-align: center;
  border-right: 1px solid var(--edx-slate-200);
}

.rgen .stat-box:last-child { border-right: none; }
.rgen .stat-box-label { font-size: 0.74rem; font-weight: 600; text-transform: uppercase; color: var(--edx-slate-600); display: block; margin-bottom: 0.35rem; }
.rgen .stat-box-value { font-size: 1.6rem; font-weight: 800; color: var(--edx-navy-950); line-height: 1; }
.rgen .stat-box-value.pass { color: var(--edx-green-600); }
.rgen .stat-box-value.fail { color: var(--edx-red-500); }
.rgen .stat-box-value.incomplete { color: var(--edx-amber-600); }

.rgen .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.rgen .pill-pass { background: var(--edx-green-50); color: var(--edx-green-600); }
.rgen .pill-fail { background: var(--edx-red-50); color: var(--edx-red-500); }
.rgen .pill-incomplete { background: var(--edx-amber-50); color: var(--edx-amber-600); }

/* Buttons */
.rgen .btn-edx-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.68rem 1.4rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(12, 43, 71, 0.18);
}
.rgen .btn-edx-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(23, 174, 203, 0.3);
  background: linear-gradient(135deg, var(--edx-navy-800), var(--edx-cyan-600));
}
.rgen .btn-edx-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

.rgen .btn-edx-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  color: var(--edx-navy-800);
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.68rem 1.3rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.rgen .btn-edx-outline:hover:not(:disabled) {
  border-color: var(--edx-navy-700);
  background: var(--edx-slate-100);
}
.rgen .btn-edx-outline:disabled { opacity: 0.65; cursor: not-allowed; }

.rgen .btn-edx-success {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-green-600), var(--edx-green-500));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.68rem 1.4rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(31, 138, 95, 0.2);
}
.rgen .btn-edx-success:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(31, 138, 95, 0.3);
}

.rgen .btn-edx-danger-soft {
  background: var(--edx-red-50);
  color: var(--edx-red-500);
  border: 1px solid rgba(229, 72, 77, 0.2);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.rgen .spin { animation: rgen-spin 0.8s linear infinite; }
@keyframes rgen-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Error breakdown table */
.rgen .error-details-box {
  background: #fff;
  border: 1px solid rgba(229, 72, 77, 0.2);
  border-radius: 10px;
  margin-top: 1rem;
  overflow: hidden;
}

.rgen .error-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}
.rgen .error-table th {
  background: var(--edx-red-50);
  color: var(--edx-red-500);
  font-weight: 700;
  text-align: left;
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid rgba(229, 72, 77, 0.2);
}
.rgen .error-table td {
  padding: 0.65rem 0.9rem;
  border-bottom: 1px solid var(--edx-slate-100);
  color: var(--edx-slate-900);
}
.rgen .error-table tr:last-child td { border-bottom: none; }

/* Empty state */
.rgen .empty-placeholder {
  text-align: center;
  padding: 2.5rem 1.5rem;
  background: var(--edx-slate-100);
  border-radius: 12px;
  border: 1px dashed var(--edx-slate-200);
}
.rgen .empty-placeholder-icon {
  font-size: 2.2rem;
  color: var(--edx-slate-400);
  margin-bottom: 0.75rem;
}

@media (max-width: 768px) {
  .rgen .result-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .rgen .detail-grid { grid-template-columns: 1fr; }
  .rgen .filter-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .rgen * { animation: none !important; transition: none !important; }
}
`;

export default function ResultGeneration() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState("exam");
  const [exams, setExams] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [students, setStudents] = useState([]);
  const [totalEligibleStudents, setTotalEligibleStudents] = useState(0);

  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [generatedResult, setGeneratedResult] = useState(null);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showErrorList, setShowErrorList] = useState(false);

  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Quick filters for exam selection
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [resultStatusFilter, setResultStatusFilter] = useState("ALL");

  const selectedExam = useMemo(() => exams.find((e) => e._id === examId), [exams, examId]);
  const selectedExamSummary = resultMap[examId]?.summary;

  // Initial load: Fetch exams + result summaries
  useEffect(() => {
    const preferredExamId = searchParams.get("examId");
    Promise.all([
      getExams().catch((err) => {
        logger.error("Failed to load exams:", err);
        return [];
      }),
      getExamResultSummaries().catch(() => []),
    ])
      .then(([examsRes, summariesRes]) => {
        const examsData = Array.isArray(examsRes)
          ? examsRes
          : Array.isArray(examsRes?.data)
          ? examsRes.data
          : [];
        setExams(examsData);

        const map = {};
        if (Array.isArray(summariesRes)) {
          for (const s of summariesRes) {
            map[s.examId] = { summary: s.summary };
          }
        }
        setResultMap(map);

        if (preferredExamId && examsData.some((e) => e._id === preferredExamId)) {
          setExamId(preferredExamId);
        }
      })
      .catch((err) => {
        logger.error("Error loading exams / summaries:", err);
        setExams([]);
      })
      .finally(() => setLoadingExams(false));
  }, [searchParams]);

  // When selected exam changes: fetch student roster / enrollment count
  useEffect(() => {
    if (!examId || !selectedExam) {
      setStudents([]);
      setTotalEligibleStudents(0);
      setStudentId("");
      return;
    }

    setLoadingStudents(true);
    setStudentId("");
    setGeneratedResult(null);
    setBulkSummary(null);
    setError(null);

    const courseId = selectedExam.course_id?._id || selectedExam.course_id;
    api.get("/students/approved-students", {
      params: {
        course_id: courseId,
        semester: selectedExam.semester,
        limit: 500,
      },
    })
      .then((r) => {
        const data = Array.isArray(r.data?.data)
          ? r.data.data
          : Array.isArray(r.data?.students)
          ? r.data.students
          : Array.isArray(r.data)
          ? r.data
          : [];
        setStudents(data);
        const total = r.data?.pagination?.total ?? data.length;
        setTotalEligibleStudents(total);
      })
      .catch(() => {
        setStudents([]);
        setTotalEligibleStudents(0);
      })
      .finally(() => setLoadingStudents(false));
  }, [examId, selectedExam]);

  // Distinct courses for filter dropdown
  const courseOptions = useMemo(() => {
    const map = new Map();
    for (const ex of exams) {
      const cid = ex.course_id?._id || ex.course_id;
      if (cid && !map.has(cid)) {
        const name = ex.course_id?.name || "Unknown Course";
        const code = ex.course_id?.code ? ` (${ex.course_id.code})` : "";
        map.set(cid, `${name}${code}`);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [exams]);

  // Distinct semesters for filter dropdown
  const semesterOptions = useMemo(() => {
    const sems = new Set();
    for (const ex of exams) {
      if (ex.semester) sems.add(Number(ex.semester));
    }
    return Array.from(sems).sort((a, b) => a - b);
  }, [exams]);

  const hasActiveFilters =
    courseFilter !== "ALL" ||
    semesterFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    resultStatusFilter !== "ALL";

  const clearFilters = () => {
    setCourseFilter("ALL");
    setSemesterFilter("ALL");
    setStatusFilter("ALL");
    setResultStatusFilter("ALL");
  };

  // Filtered exams according to top bar
  const filteredExams = useMemo(() => {
    return exams.filter((ex) => {
      const cid = String(ex.course_id?._id || ex.course_id || "");
      if (courseFilter !== "ALL" && cid !== String(courseFilter)) return false;
      if (semesterFilter !== "ALL" && String(ex.semester) !== String(semesterFilter)) return false;
      if (statusFilter !== "ALL" && ex.status !== statusFilter) return false;

      if (resultStatusFilter !== "ALL") {
        const info = resultMap[ex._id]?.summary;
        const total = info?.totalStudents || 0;
        if (resultStatusFilter === "NOT_GENERATED") {
          if (total > 0) return false;
        } else if (resultStatusFilter === "PUBLISHED") {
          if (!info || info.byStatus?.PUBLISHED !== total || total === 0) return false;
        } else if (resultStatusFilter === "LOCKED") {
          if (!info || (info.byStatus?.LOCKED || 0) === 0 || (info.byStatus?.DRAFT || 0) > 0) return false;
        } else if (resultStatusFilter === "DRAFT") {
          if (!info || (info.byStatus?.DRAFT || 0) === 0) return false;
        }
      }

      return true;
    });
  }, [exams, courseFilter, semesterFilter, statusFilter, resultStatusFilter, resultMap]);

  // Format options for SearchableSelect
  const examSelectOptions = useMemo(() => {
    return filteredExams.map((ex) => {
      const summary = resultMap[ex._id]?.summary;
      let resultTag = "Not Generated";
      let resultTagColor = "#64748b";
      let resultTagBg = "#f1f5f9";
      if (summary && summary.totalStudents > 0) {
        if (summary.byStatus?.PUBLISHED === summary.totalStudents) {
          resultTag = `Published (${summary.totalStudents})`;
          resultTagColor = "#1f8a5f";
          resultTagBg = "#e5f6ee";
        } else if ((summary.byStatus?.LOCKED || 0) > 0 && (summary.byStatus?.DRAFT || 0) === 0) {
          resultTag = `Locked (${summary.totalStudents})`;
          resultTagColor = "#123a5e";
          resultTagBg = "#e7f7fa";
        } else {
          resultTag = `Draft (${summary.totalStudents})`;
          resultTagColor = "#b6790d";
          resultTagBg = "#fdf1de";
        }
      }

      const courseName = ex.course_id?.name || "N/A";
      const courseCode = ex.course_id?.code ? ` (${ex.course_id.code})` : "";
      const typeLabel = ex.exam_type || "REGULAR";

      return {
        value: ex._id,
        label: ex.name,
        subLabel: `${courseName}${courseCode} · Sem ${ex.semester} · ${ex.academicYear}`,
        badge: `${typeLabel} · ${ex.status}`,
        badgeBg: ex.status === "PUBLISHED" ? "#e5f6ee" : "#fdf1de",
        badgeColor: ex.status === "PUBLISHED" ? "#1f8a5f" : "#b6790d",
        keywords: `${ex.name} ${courseName} ${ex.course_id?.code || ""} Sem ${ex.semester} ${ex.academicYear} ${typeLabel} ${ex.status} ${resultTag}`,
      };
    });
  }, [filteredExams, resultMap]);

  // Format student options for SearchableSelect (single mode)
  const studentSelectOptions = useMemo(() => {
    return students.map((s) => {
      const name = s.fullName || s.user_id?.name || s._id;
      const roll = s.rollNumber ? `Roll: ${s.rollNumber}` : null;
      const enroll = s.enrollmentNumber ? `Enroll: ${s.enrollmentNumber}` : null;
      const sub = [roll, enroll].filter(Boolean).join(" · ");
      return {
        value: s._id,
        label: name,
        subLabel: sub || "Student",
        keywords: `${name} ${s.rollNumber || ""} ${s.enrollmentNumber || ""} ${s.email || ""}`,
      };
    });
  }, [students]);

  const refreshSummaries = async () => {
    try {
      const res = await getExamResultSummaries();
      const map = {};
      if (Array.isArray(res)) {
        for (const s of res) {
          map[s.examId] = { summary: s.summary };
        }
      }
      setResultMap(map);
    } catch {
      /* ignore background refresh error */
    }
  };

  const validate = () => {
    const errs = {};
    if (!examId) errs.examId = "Please select an examination";
    if (mode === "single" && !studentId) errs.studentId = "Please select a student";
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerateSingle = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    setGeneratedResult(null);
    try {
      const res = await generateResult({ examId, studentId });
      setGeneratedResult(res);
      toast.success("Result generated successfully!");
      await refreshSummaries();
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || "Failed to generate result.";
      logger.error("generateResult error:", err.response?.status, code);
      if (AUTH_ERROR_CODES.has(code)) {
        setError({ isAuthError: true, statusCode: err.response?.status, errorCode: code, message: msg });
      } else {
        setError({ message: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateExam = () => {
    if (!validate()) return;
    setShowConfirm(true);
  };

  const confirmGenerateExam = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError(null);
    setBulkSummary(null);
    try {
      const res = await generateResultsForExam(examId);
      setBulkSummary(res);
      toast.success(`Results generated: ${res.generated} generated, ${res.skipped} skipped`);
      await refreshSummaries();
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || "Failed to generate results.";
      logger.error("generateResultsForExam error:", err.response?.status, code);
      if (AUTH_ERROR_CODES.has(code)) {
        setError({ isAuthError: true, statusCode: err.response?.status, errorCode: code, message: msg });
      } else {
        setError({ message: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const overallPillClass = (v) =>
    v === "PASS" ? "pill-pass" : v === "FAIL" ? "pill-fail" : "pill-incomplete";

  if (error?.isAuthError) {
    return <ApiError statusCode={error.statusCode} errorCode={error.errorCode} message={error.message} />;
  }

  const isExamLocked =
    selectedExamSummary &&
    (selectedExamSummary.byStatus?.LOCKED || 0) > 0 &&
    (selectedExamSummary.byStatus?.DRAFT || 0) === 0;

  const isExamAllPublished =
    selectedExamSummary &&
    selectedExamSummary.totalStudents > 0 &&
    selectedExamSummary.byStatus?.PUBLISHED === selectedExamSummary.totalStudents;

  return (
    <div className="rgen container-fluid p-4">
      <style>{styles}</style>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmGenerateExam}
        title="Generate Results for Entire Exam"
        message={`This will calculate results for all ${totalEligibleStudents || "approved"} students in "${selectedExam?.name || "this exam"}". Existing locked or published results will be skipped. Continue?`}
        type="warning"
        confirmText="Generate All Results"
        isLoading={submitting}
      />

      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard/exam" },
          { label: "Results Dashboard", path: "/dashboard/exam/results" },
          { label: "Generate Result" },
        ]}
      />

      <PageHeader
        icon={FaClipboardList}
        title="Generate Semester Results"
        subtitle="Calculate, compile, and regenerate semester examination results for students"
        onBack={() => navigate("/dashboard/exam/results")}
        backLabel="Results Dashboard"
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn-edx-outline"
              onClick={() => navigate("/dashboard/exam/results")}
            >
              <FaEye /> View Results Dashboard
            </button>
          </div>
        }
      />

      {error && !error.isAuthError && (
        <div className="alert-edx alert-edx-danger mt-3 mb-3">
          <FaExclamationTriangle />
          <div>
            <strong>Generation Error:</strong> {error.message}
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="row g-4 mt-1">
        {/* ================= LEFT COLUMN: Selection & Actions ================= */}
        <div className="col-xl-7 col-lg-6">
          {/* Card 1: Exam Selection & Filters */}
          <div className="rgen-card">
            <div className="rgen-card-header">
              <div className="rgen-card-header-left">
                <div className="rgen-card-header-icon">
                  <FaGraduationCap />
                </div>
                <h3 className="rgen-card-title">1. Select Examination</h3>
              </div>
              {selectedExam && (
                <button
                  type="button"
                  className="clear-filters-btn"
                  onClick={() => {
                    setExamId("");
                    setSearchParams({});
                  }}
                  title="Clear selected exam"
                >
                  <FaTimes /> Change Exam
                </button>
              )}
            </div>
            <div className="rgen-card-body">
              {/* Quick Filter Bar */}
              <div className="filter-bar">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="filter-label m-0">
                    <FaFilter className="me-1" /> Narrow Down Exams
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="clear-filters-btn p-0"
                      onClick={clearFilters}
                    >
                      <FaTimes /> Reset Filters
                    </button>
                  )}
                </div>
                <div className="filter-grid">
                  <div>
                    <label className="filter-label">Course</label>
                    <select
                      className="filter-select"
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                    >
                      <option value="ALL">All Courses ({courseOptions.length})</option>
                      {courseOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="filter-label">Semester</label>
                    <select
                      className="filter-select"
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                    >
                      <option value="ALL">All Semesters</option>
                      {semesterOptions.map((sem) => (
                        <option key={sem} value={sem}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="filter-label">Exam Status</label>
                    <select
                      className="filter-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="filter-label">Result Status</label>
                    <select
                      className="filter-select"
                      value={resultStatusFilter}
                      onChange={(e) => setResultStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Results</option>
                      <option value="NOT_GENERATED">Not Generated</option>
                      <option value="DRAFT">Draft Generated</option>
                      <option value="LOCKED">Locked</option>
                      <option value="PUBLISHED">Published</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SearchableSelect for Exam */}
              <div className="mb-3">
                <label className="form-label fw-bold text-dark d-flex align-items-center justify-content-between mb-2">
                  <span>
                    Exam Paper <span className="text-danger">*</span>
                  </span>
                  <span className="text-muted fw-normal" style={{ fontSize: "0.8rem" }}>
                    {filteredExams.length} available
                  </span>
                </label>

                {loadingExams ? (
                  <div className="d-flex align-items-center gap-2 p-3 bg-light rounded text-muted">
                    <FaSpinner className="spin text-primary" /> Loading examinations…
                  </div>
                ) : exams.length === 0 ? (
                  <div className="alert-edx alert-edx-warning mb-0">
                    <FaExclamationTriangle />
                    <div>
                      No examinations found in this college. Create an exam from the Exam Dashboard first.
                    </div>
                  </div>
                ) : filteredExams.length === 0 ? (
                  <div className="alert-edx alert-edx-info mb-0">
                    <FaInfoCircle />
                    <div>
                      No exams match your filter criteria.{" "}
                      <button
                        type="button"
                        className="btn-link p-0 border-0 bg-transparent text-primary fw-bold"
                        onClick={clearFilters}
                      >
                        Reset filters
                      </button>
                    </div>
                  </div>
                ) : (
                  <SearchableSelect
                    value={examId}
                    onChange={(e) => {
                      setExamId(e.target.value);
                      if (e.target.value) {
                        setSearchParams({ examId: e.target.value });
                      } else {
                        setSearchParams({});
                      }
                      setValidationErrors((prev) => ({ ...prev, examId: undefined }));
                    }}
                    options={examSelectOptions}
                    placeholder="Search exam by title, course, semester, or academic year…"
                    searchPlaceholder="Type to filter exams…"
                    aria-label="Select Examination"
                    disabled={submitting}
                    isInvalid={Boolean(validationErrors.examId)}
                  />
                )}
                {validationErrors.examId && (
                  <div className="text-danger small mt-1">{validationErrors.examId}</div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Generation Mode & Actions */}
          <div className="rgen-card">
            <div className="rgen-card-header">
              <div className="rgen-card-header-left">
                <div className="rgen-card-header-icon">
                  <FaCog />
                </div>
                <h3 className="rgen-card-title">2. Select Target &amp; Generate</h3>
              </div>
            </div>
            <div className="rgen-card-body">
              {/* Mode Toggle */}
              <div className="mode-toggle" role="tablist" aria-label="Generation mode">
                <button
                  type="button"
                  className={`mode-btn ${mode === "exam" ? "mode-btn-active" : ""}`}
                  onClick={() => {
                    setMode("exam");
                    setGeneratedResult(null);
                    setBulkSummary(null);
                    setError(null);
                  }}
                  role="tab"
                  aria-selected={mode === "exam"}
                  disabled={submitting}
                >
                  <FaUsers /> Whole Exam Batch
                </button>
                <button
                  type="button"
                  className={`mode-btn ${mode === "single" ? "mode-btn-active" : ""}`}
                  onClick={() => {
                    setMode("single");
                    setGeneratedResult(null);
                    setBulkSummary(null);
                    setError(null);
                  }}
                  role="tab"
                  aria-selected={mode === "single"}
                  disabled={submitting}
                >
                  <FaUserGraduate /> Individual Student
                </button>
              </div>

              {/* Mode Description */}
              {mode === "exam" ? (
                <div className="alert-edx alert-edx-info mb-3">
                  <FaInfoCircle />
                  <div>
                    Generates or recalculates results for <strong>all enrolled students</strong> in this examination.
                    Results that are already locked or published will be preserved and skipped automatically.
                  </div>
                </div>
              ) : (
                <div className="alert-edx alert-edx-info mb-3">
                  <FaInfoCircle />
                  <div>
                    Generates or recalculates result for an <strong>individual student</strong>. Useful for testing, single mark adjustments, or reviewing specific student outcomes.
                  </div>
                </div>
              )}

              {/* Student SearchableSelect (Single Student Mode) */}
              {mode === "single" && (
                <div className="mb-4">
                  <label className="form-label fw-bold text-dark d-flex align-items-center justify-content-between mb-2">
                    <span>
                      Select Student <span className="text-danger">*</span>
                    </span>
                    {selectedExam && (
                      <span className="text-muted fw-normal" style={{ fontSize: "0.8rem" }}>
                        {loadingStudents
                          ? "Loading students…"
                          : `${students.length} eligible students`}
                      </span>
                    )}
                  </label>

                  {!examId ? (
                    <div className="p-3 bg-light rounded text-muted small">
                      Please select an examination first to load enrolled students.
                    </div>
                  ) : loadingStudents ? (
                    <div className="d-flex align-items-center gap-2 p-3 bg-light rounded text-muted">
                      <FaSpinner className="spin text-primary" /> Loading enrolled students roster…
                    </div>
                  ) : students.length === 0 ? (
                    <div className="alert-edx alert-edx-warning mb-0">
                      <FaExclamationTriangle />
                      <div>No approved students found enrolled in this course and semester.</div>
                    </div>
                  ) : (
                    <SearchableSelect
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        setValidationErrors((prev) => ({ ...prev, studentId: undefined }));
                        setGeneratedResult(null);
                        setError(null);
                      }}
                      options={studentSelectOptions}
                      placeholder="Search student by name, roll no, or enrollment number…"
                      searchPlaceholder="Type name or roll number…"
                      aria-label="Select Student"
                      disabled={submitting}
                      isInvalid={Boolean(validationErrors.studentId)}
                    />
                  )}
                  {validationErrors.studentId && (
                    <div className="text-danger small mt-1">{validationErrors.studentId}</div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn-edx-outline"
                  onClick={() => navigate("/dashboard/exam/results")}
                  disabled={submitting}
                >
                  <FaArrowLeft /> Back
                </button>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {mode === "single" ? (
                    <>
                      <button
                        type="button"
                        className="btn-edx-primary"
                        onClick={handleGenerateSingle}
                        disabled={submitting || !examId || !studentId || loadingStudents}
                      >
                        {submitting ? (
                          <>
                            <FaSpinner className="spin" /> Calculating Result…
                          </>
                        ) : (
                          <>
                            <FaClipboardList />{" "}
                            {generatedResult ? "Recalculate Result" : "Generate Result"}
                          </>
                        )}
                      </button>
                      {generatedResult && (
                        <button
                          type="button"
                          className="btn-edx-success"
                          onClick={() => navigate(`/dashboard/exam/results/${generatedResult._id}`)}
                        >
                          <FaEye /> Review Result
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-edx-primary"
                        onClick={handleGenerateExam}
                        disabled={
                          submitting ||
                          !examId ||
                          loadingExams ||
                          loadingStudents ||
                          isExamLocked
                        }
                        title={
                          isExamLocked
                            ? "Results are currently locked. Unlock them from Results Dashboard first."
                            : undefined
                        }
                      >
                        {submitting ? (
                          <>
                            <FaSpinner className="spin" /> Calculating Batch Results…
                          </>
                        ) : (
                          <>
                            <FaUsers />{" "}
                            {selectedExamSummary?.totalStudents
                              ? "Regenerate All Results"
                              : "Generate All Results"}
                          </>
                        )}
                      </button>

                      {bulkSummary && bulkSummary.generated > 0 && (
                        <button
                          type="button"
                          className="btn-edx-success"
                          onClick={() => navigate(`/dashboard/exam/results/review/${examId}`)}
                        >
                          <FaEye /> Review Batch Results
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Readiness & Lifecycle ================= */}
        <div className="col-xl-5 col-lg-6">
          {selectedExam ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Card 1: Exam Overview & Metadata */}
              <div className="rgen-card">
                <div className="rgen-card-header">
                  <div className="rgen-card-header-left">
                    <div className="rgen-card-header-icon">
                      <FaBookOpen />
                    </div>
                    <h3 className="rgen-card-title">Exam Overview</h3>
                  </div>
                  <span
                    className={`status-badge ${
                      selectedExam.status === "PUBLISHED"
                        ? "status-badge-published"
                        : "status-badge-draft"
                    }`}
                  >
                    {selectedExam.status}
                  </span>
                </div>
                <div className="rgen-card-body">
                  <h4 className="fw-bold text-dark mb-1" style={{ fontSize: "1.1rem" }}>
                    {selectedExam.name}
                  </h4>
                  <p className="text-muted small mb-3">
                    {selectedExam.course_id?.name || "N/A"}{" "}
                    {selectedExam.course_id?.code ? `(${selectedExam.course_id.code})` : ""}
                  </p>

                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Semester</span>
                      <span className="detail-value">Semester {selectedExam.semester}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Academic Year</span>
                      <span className="detail-value">{selectedExam.academicYear}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Exam Type</span>
                      <span className="detail-value">{selectedExam.exam_type || "REGULAR"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Subjects</span>
                      <span className="detail-value">
                        {selectedExam.subjects?.length || 0} papers
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Eligible Students</span>
                      <span className="detail-value">
                        {loadingStudents ? (
                          <FaSpinner className="spin text-muted" />
                        ) : (
                          `${totalEligibleStudents} enrolled`
                        )}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Result Status</span>
                      <span className="detail-value">
                        {selectedExamSummary?.totalStudents
                          ? `${selectedExamSummary.totalStudents} generated`
                          : "Not generated"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Existing Result Lifecycle Status */}
              <div className="rgen-card">
                <div className="rgen-card-header">
                  <div className="rgen-card-header-left">
                    <div className="rgen-card-header-icon">
                      <FaClock />
                    </div>
                    <h3 className="rgen-card-title">Result Lifecycle State</h3>
                  </div>
                </div>
                <div className="rgen-card-body">
                  {isExamAllPublished ? (
                    <div className="alert-edx alert-edx-success mb-2">
                      <FaCheckCircle />
                      <div>
                        <strong>Results Published</strong>
                        <div className="small mt-1">
                          All {selectedExamSummary.totalStudents} student results for this examination are published. Published results are visible to students and cannot be overwritten.
                        </div>
                      </div>
                    </div>
                  ) : isExamLocked ? (
                    <div className="alert-edx alert-edx-navy mb-2">
                      <FaLock />
                      <div>
                        <strong>Results Locked</strong>
                        <div className="small mt-1">
                          Results are locked ({selectedExamSummary.totalStudents} students). Locked results cannot be regenerated until unlocked from the Results Dashboard.
                        </div>
                      </div>
                    </div>
                  ) : selectedExamSummary?.totalStudents > 0 ? (
                    <div className="alert-edx alert-edx-warning mb-2">
                      <FaClock />
                      <div>
                        <strong>Draft Results Exist</strong>
                        <div className="small mt-1">
                          {selectedExamSummary.byStatus?.DRAFT || 0} student results are in Draft. Generating will recalculate draft results using latest entered marks.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert-edx alert-edx-info mb-2">
                      <FaInfoCircle />
                      <div>
                        <strong>Not Yet Generated</strong>
                        <div className="small mt-1">
                          No results have been compiled for this exam yet. Ready to generate.
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedExamSummary?.totalStudents > 0 && (
                    <div className="d-flex align-items-center justify-content-between pt-2 mt-2 border-top">
                      <div className="small text-muted">
                        Passed: <strong>{selectedExamSummary.passed}</strong> · Failed:{" "}
                        <strong>{selectedExamSummary.failed}</strong> · Incomplete:{" "}
                        <strong>{selectedExamSummary.incomplete}</strong>
                      </div>
                      <button
                        type="button"
                        className="btn-link p-0 border-0 bg-transparent text-primary small fw-bold"
                        onClick={() => navigate(`/dashboard/exam/results/review/${examId}`)}
                      >
                        Review Existing
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Real Readiness Checklist */}
              <div className="rgen-card">
                <div className="rgen-card-header">
                  <div className="rgen-card-header-left">
                    <div className="rgen-card-header-icon">
                      <FaCheckCircle />
                    </div>
                    <h3 className="rgen-card-title">Readiness Checklist</h3>
                  </div>
                </div>
                <div className="rgen-card-body">
                  <ul className="validation-list">
                    {/* Check 1: Exam Status */}
                    <li className="validation-item">
                      {selectedExam.status === "PUBLISHED" ? (
                        <FaCheckCircle className="validation-icon validation-ok" />
                      ) : (
                        <FaExclamationTriangle className="validation-icon validation-warn" />
                      )}
                      <div>
                        <strong>Exam Setup: {selectedExam.status}</strong>
                        <div className="text-muted small">
                          {selectedExam.status === "PUBLISHED"
                            ? "Exam timetable and setup configuration are finalized."
                            : "Exam is currently in DRAFT status. Make sure marks are complete."}
                        </div>
                      </div>
                    </li>

                    {/* Check 2: Subjects Configured */}
                    <li className="validation-item">
                      {selectedExam.subjects?.length > 0 ? (
                        <FaCheckCircle className="validation-icon validation-ok" />
                      ) : (
                        <FaExclamationTriangle className="validation-icon validation-err" />
                      )}
                      <div>
                        <strong>
                          {selectedExam.subjects?.length || 0} Subject Papers Configured
                        </strong>
                        <div className="text-muted small">
                          {selectedExam.subjects?.length > 0
                            ? "Calculation engine will process pass/fail for each paper."
                            : "Exam has no subjects configured. Results cannot be calculated."}
                        </div>
                      </div>
                    </li>

                    {/* Check 3: Student Enrollment */}
                    <li className="validation-item">
                      {loadingStudents ? (
                        <FaSpinner className="validation-icon spin text-muted" />
                      ) : totalEligibleStudents > 0 ? (
                        <FaCheckCircle className="validation-icon validation-ok" />
                      ) : (
                        <FaExclamationTriangle className="validation-icon validation-warn" />
                      )}
                      <div>
                        <strong>
                          {loadingStudents
                            ? "Checking Student Roster…"
                            : `${totalEligibleStudents} Eligible Student(s) Enrolled`}
                        </strong>
                        <div className="text-muted small">
                          {totalEligibleStudents > 0
                            ? `Active enrolled students in Semester ${selectedExam.semester}.`
                            : "No students currently match this course and semester."}
                        </div>
                      </div>
                    </li>

                    {/* Check 4: Marks Reminder */}
                    <li className="validation-item">
                      <FaInfoCircle className="validation-icon text-primary" />
                      <div>
                        <strong>Marks Entry Prerequisite</strong>
                        <div className="text-muted small">
                          Pass/fail status evaluates teacher-entered marks. Any unentered subject marks will mark the student's result as <strong>INCOMPLETE</strong>.
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Placeholder when no exam is selected */
            <div className="rgen-card">
              <div className="rgen-card-body">
                <div className="empty-placeholder">
                  <FaGraduationCap className="empty-placeholder-icon" />
                  <h4 className="fw-bold text-dark mb-1" style={{ fontSize: "1.1rem" }}>
                    Select an Examination
                  </h4>
                  <p className="text-muted small mb-0">
                    Choose an exam from the left panel to inspect paper subjects, eligible student enrollment, and calculation readiness before running result generation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= BOTTOM SECTION: Generated Outcomes ================= */}
      {/* 1. Bulk Summary */}
      {bulkSummary && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="result-summary-card"
        >
          <div className="result-summary-header">
            <div className="d-flex align-items-center gap-2">
              <FaCheckCircle /> Batch Generation Complete
            </div>
            {examId && (
              <button
                type="button"
                className="btn-edx-success"
                onClick={() => navigate(`/dashboard/exam/results/review/${examId}`)}
              >
                <FaEye /> Review Results in Detail
              </button>
            )}
          </div>

          <div className="result-stats-grid">
            <div className="stat-box">
              <span className="stat-box-label">Total Students</span>
              <span className="stat-box-value">{bulkSummary.totalStudents}</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Generated</span>
              <span className="stat-box-value pass">{bulkSummary.generated}</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Skipped (Locked/Published)</span>
              <span className="stat-box-value incomplete">{bulkSummary.skipped}</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Errors</span>
              <span className={`stat-box-value ${bulkSummary.errors?.length ? "fail" : ""}`}>
                {bulkSummary.errors?.length || 0}
              </span>
            </div>
          </div>

          {bulkSummary.errors?.length > 0 && (
            <div className="p-3 bg-light border-top">
              <div className="d-flex align-items-center justify-content-between">
                <span className="text-danger fw-bold small d-flex align-items-center gap-2">
                  <FaExclamationTriangle /> {bulkSummary.errors.length} student(s) encountered calculation errors
                </span>
                <button
                  type="button"
                  className="btn-edx-danger-soft"
                  onClick={() => setShowErrorList(!showErrorList)}
                >
                  {showErrorList ? (
                    <>
                      Hide Error Details <FaChevronUp className="ms-1" />
                    </>
                  ) : (
                    <>
                      View Error Details <FaChevronDown className="ms-1" />
                    </>
                  )}
                </button>
              </div>

              {showErrorList && (
                <div className="error-details-box mt-2">
                  <table className="error-table">
                    <thead>
                      <tr>
                        <th>Student ID / Identifier</th>
                        <th>Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkSummary.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="font-monospace">{err.studentId}</td>
                          <td className="text-danger">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* 2. Single Student Result Summary */}
      {generatedResult && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="result-summary-card"
        >
          <div className="result-summary-header">
            <div className="d-flex align-items-center gap-2">
              <FaCheckCircle /> Single Student Result Generated
            </div>
            <button
              type="button"
              className="btn-edx-success"
              onClick={() => navigate(`/dashboard/exam/results/${generatedResult._id}`)}
            >
              <FaEye /> View Student Result Sheet
            </button>
          </div>

          <div className="result-stats-grid">
            <div className="stat-box">
              <span className="stat-box-label">Total Subjects</span>
              <span className="stat-box-value">{generatedResult.totalSubjects}</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Passed</span>
              <span className="stat-box-value pass">{generatedResult.passedSubjects}</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Failed</span>
              <span className="stat-box-value fail">{generatedResult.failedSubjects}</span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Incomplete</span>
              <span className="stat-box-value incomplete">
                {generatedResult.incompleteSubjects}
              </span>
            </div>
          </div>

          <div className="p-3 d-flex align-items-center justify-content-between bg-light">
            <span className="fw-bold text-muted small">Overall Academic Outcome:</span>
            <span className={`pill ${overallPillClass(generatedResult.overallResult)}`}>
              {generatedResult.overallResult}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
