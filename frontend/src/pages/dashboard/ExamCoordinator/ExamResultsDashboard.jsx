import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  getExamResultSummaries,
  lockResultsForExam,
  publishResultsForExam,
} from "../../../api/results";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import ConfirmModal from "../../../components/ConfirmModal";
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
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaRedo,
  FaClock,
  FaInfoCircle,
  FaCalendarAlt,
  FaPencilAlt,
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

.erd nav.erp-breadcrumb { margin-bottom: 1.1rem; }

/* ---------- Primary Buttons ---------- */
.erd .btn-edx-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #0E3746;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1.3rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 2px 6px rgba(12,43,71,0.18);
}
.erd .btn-edx-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  background: #123a5e;
  color: #fff;
}

.erd .btn-edx-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: #fff;
  color: var(--edx-navy-800);
  border: 1px solid var(--edx-slate-200);
  border-radius: 9px;
  padding: 0.45rem 0.85rem;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.erd .btn-edx-outline:hover {
  border-color: var(--edx-navy-700);
  background: var(--edx-slate-100);
  color: var(--edx-navy-950);
}

/* ---------- 5 Stat Metric Cards ---------- */
.erd .stat-grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}
.erd .stat-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-200);
  box-shadow: 0 1px 4px rgba(12,43,71,0.05);
  padding: 1.1rem 1.25rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.erd .stat-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.erd .stat-card-navy::before { background: var(--edx-navy-800); }
.erd .stat-card-cyan::before { background: var(--edx-cyan-600); }
.erd .stat-card-green::before { background: var(--edx-green-500); }
.erd .stat-card-red::before { background: var(--edx-red-500); }
.erd .stat-card-amber::before { background: var(--edx-amber-500); }

.erd .stat-card-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.erd .stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.erd .stat-icon-navy { background: rgba(12,43,71,0.08); color: var(--edx-navy-800); }
.erd .stat-icon-cyan { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.erd .stat-icon-green { background: var(--edx-green-50); color: var(--edx-green-600); }
.erd .stat-icon-red { background: var(--edx-red-50); color: var(--edx-red-500); }
.erd .stat-icon-amber { background: var(--edx-amber-50); color: var(--edx-amber-600); }

.erd .stat-label {
  color: var(--edx-slate-600);
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.erd .stat-value {
  color: var(--edx-navy-950);
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.15;
  margin-top: 0.2rem;
}
.erd .stat-sub {
  color: var(--edx-slate-400);
  font-size: 0.76rem;
  margin-top: 0.45rem;
}

/* ---------- Filter Card ---------- */
.erd .filter-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-200);
  box-shadow: 0 1px 4px rgba(12,43,71,0.04);
  padding: 1.25rem 1.4rem;
}
.erd .filter-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.9rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.erd .filter-card-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--edx-navy-950);
  font-weight: 700;
  font-size: 0.92rem;
}
.erd .filter-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr;
  gap: 0.75rem;
}
.erd .search-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.55rem 0.85rem;
  background: var(--edx-bg);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.erd .search-box:focus-within {
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
  background: #fff;
}
.erd .search-box svg { color: var(--edx-slate-400); flex-shrink: 0; }
.erd .search-box input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.88rem;
  color: var(--edx-slate-900);
  min-width: 0;
}
.erd .search-clear {
  border: none;
  background: var(--edx-slate-200);
  color: var(--edx-slate-600);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  cursor: pointer;
  flex-shrink: 0;
}
.erd .select-box { position: relative; }
.erd .select-box select {
  width: 100%;
  appearance: none;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.55rem 2rem 0.55rem 0.75rem;
  font-size: 0.88rem;
  color: var(--edx-slate-900);
  background: var(--edx-bg);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.erd .select-box select:focus {
  outline: none;
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
  background: #fff;
}
.erd .select-box::after {
  content: "";
  position: absolute;
  right: 0.85rem;
  top: 50%;
  width: 6px;
  height: 6px;
  border-right: 2px solid var(--edx-slate-400);
  border-bottom: 2px solid var(--edx-slate-400);
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
}

/* ---------- Table Styles ---------- */
.erd .table-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-200);
  box-shadow: 0 1px 4px rgba(12,43,71,0.05);
  overflow: hidden;
}
.erd table { margin-bottom: 0; }
.erd thead th {
  background: var(--edx-slate-100);
  color: var(--edx-navy-900);
  font-weight: 700;
  font-size: 0.8rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.85rem 1rem;
  white-space: nowrap;
}
.erd tbody td {
  padding: 0.85rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.88rem;
}
.erd tbody tr { transition: background 0.12s ease; }
.erd tbody tr:hover { background: var(--edx-cyan-50); }
.erd tbody tr:last-child td { border-bottom: none; }

.erd .row-title { font-weight: 700; color: var(--edx-slate-900); font-size: 0.95rem; }
.erd .course-name { font-weight: 600; color: var(--edx-slate-900); font-size: 0.88rem; }
.erd .course-code { color: var(--edx-slate-600); font-size: 0.76rem; font-family: monospace; }

/* ---------- Pills & Badges ---------- */
.erd .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.24rem 0.65rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}
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
.erd .pill-unified { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }

/* ---------- Action Buttons in Table ---------- */
.erd .btn-table-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--edx-navy-900);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.42rem 0.8rem;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.erd .btn-table-primary:hover:not(:disabled) {
  background: var(--edx-navy-800);
  transform: translateY(-1px);
  color: #fff;
}
.erd .btn-table-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.erd .btn-table-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #fff;
  color: var(--edx-navy-800);
  border: 1px solid var(--edx-slate-200);
  border-radius: 8px;
  padding: 0.42rem 0.8rem;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.erd .btn-table-secondary:hover:not(:disabled) {
  background: var(--edx-slate-100);
  border-color: var(--edx-navy-700);
}
.erd .btn-table-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.erd .icon-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--edx-slate-200);
  background: #fff;
  color: var(--edx-slate-600);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  font-size: 0.82rem;
}
.erd .icon-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.erd .icon-action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}
.erd .icon-action-lock:hover {
  background: rgba(12,43,71,0.08);
  color: var(--edx-navy-900);
  border-color: var(--edx-navy-700);
}
.erd .icon-action-publish:hover {
  background: var(--edx-green-50);
  color: var(--edx-green-600);
  border-color: var(--edx-green-500);
}
.erd .icon-action-unlock:hover {
  background: var(--edx-amber-50);
  color: var(--edx-amber-600);
  border-color: var(--edx-amber-500);
}

.erd .action-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--edx-navy-900);
  color: #fff;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.05rem 0.3rem;
  line-height: 1;
}

/* ---------- Pagination Controls ---------- */
.erd .pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #fff;
  border-top: 1px solid var(--edx-slate-200);
  flex-wrap: wrap;
  gap: 0.75rem;
}
.erd .pagination-info {
  font-size: 0.85rem;
  color: var(--edx-slate-600);
}
.erd .pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.erd .page-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--edx-slate-200);
  background: #fff;
  color: var(--edx-slate-900);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.erd .page-btn:hover:not(:disabled) {
  border-color: var(--edx-navy-700);
  background: var(--edx-slate-100);
}
.erd .page-btn.active {
  background: var(--edx-navy-900);
  color: #fff;
  border-color: var(--edx-navy-900);
}
.erd .page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ---------- Empty & Alerts ---------- */
.erd .empty-state {
  text-align: center;
  padding: 4rem 1.5rem;
}
.erd .empty-icon {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--edx-slate-100);
  color: var(--edx-slate-400);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.2rem;
  font-size: 1.6rem;
}
.erd .erd-alert {
  background: var(--edx-red-50);
  color: var(--edx-red-500);
  border: 1px solid rgba(229,72,77,0.25);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  font-size: 0.9rem;
}
.erd .result-meta {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  font-size: 0.74rem;
  color: var(--edx-slate-600);
  margin-top: 0.35rem;
}

@media (max-width: 1200px) {
  .erd .stat-grid-5 { grid-template-columns: repeat(3, 1fr); }
  .erd .filter-row { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .erd .stat-grid-5 { grid-template-columns: 1fr 1fr; }
  .erd .filter-row { grid-template-columns: 1fr; }
}
@media (max-width: 576px) {
  .erd .stat-grid-5 { grid-template-columns: 1fr; }
}
`;

export default function ExamResultsDashboard() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Multi-Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedSemester, setSelectedSemester] = useState("ALL");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [examStatusFilter, setExamStatusFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action busy indicator & error banners
  const [actionBusy, setActionBusy] = useState(null);
  const [publishBlocked, setPublishBlocked] = useState(null);

  // Confirmation Modals State
  const [pendingLockExam, setPendingLockExam] = useState(null);
  const [pendingPublishExam, setPendingPublishExam] = useState(null);
  const [pendingUnlockExam, setPendingUnlockExam] = useState(null);

  useEffect(() => {
    const fetchExamsAndSummaries = async () => {
      try {
        const res = await api.get("/exam");
        const examsData = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : [];
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
          setError({
            message: errorMessage,
            statusCode,
            errorCode,
            isAuthError: true,
          });
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
    for (const s of summaries || []) {
      map[s.examId] = { summary: s.summary };
    }
    return map;
  };

  const refreshResult = async () => {
    try {
      const summaries = await getExamResultSummaries();
      setResultMap(buildResultMap(summaries));
    } catch {
      /* ignore background refresh error */
    }
  };

  // Derive filter choices from actual data
  const availableCourses = useMemo(() => {
    const map = new Map();
    for (const e of exams) {
      if (e.course_id?._id) {
        map.set(String(e.course_id._id), {
          id: String(e.course_id._id),
          name: e.course_id.name,
          code: e.course_id.code,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [exams]);

  const availableSemesters = useMemo(() => {
    const sems = new Set();
    for (const e of exams) {
      if (e.semester !== undefined && e.semester !== null) {
        sems.add(Number(e.semester));
      }
    }
    return Array.from(sems).sort((a, b) => a - b);
  }, [exams]);

  const availableAcademicYears = useMemo(() => {
    const years = new Set();
    for (const e of exams) {
      if (e.academicYear) {
        years.add(String(e.academicYear).trim());
      }
    }
    return Array.from(years).sort().reverse();
  }, [exams]);

  const getDominantStatus = (examId) => {
    const info = resultMap[examId];
    if (!info || !info.summary || info.summary.totalStudents === 0)
      return "NOT_GENERATED";
    const { byStatus, totalStudents } = info.summary;
    if (byStatus?.PUBLISHED === totalStudents) return "PUBLISHED";
    if (byStatus?.LOCKED === totalStudents) return "LOCKED";
    if (byStatus?.DRAFT === totalStudents) return "DRAFT";
    return "MIXED";
  };

  // Multi-Criteria Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const examName = exam.name?.toLowerCase() || "";
        const courseName = exam.course_id?.name?.toLowerCase() || "";
        const courseCode = exam.course_id?.code?.toLowerCase() || "";
        const year = exam.academicYear?.toLowerCase() || "";
        const matches =
          examName.includes(term) ||
          courseName.includes(term) ||
          courseCode.includes(term) ||
          year.includes(term);
        if (!matches) return false;
      }

      // Course Filter
      if (selectedCourse !== "ALL") {
        const cId = exam.course_id?._id || exam.course_id;
        if (String(cId) !== String(selectedCourse)) return false;
      }

      // Semester Filter
      if (selectedSemester !== "ALL") {
        if (Number(exam.semester) !== Number(selectedSemester)) return false;
      }

      // Academic Year Filter
      if (selectedAcademicYear !== "ALL") {
        if (String(exam.academicYear).trim() !== String(selectedAcademicYear).trim())
          return false;
      }

      // Exam Timetable Status Filter
      if (examStatusFilter !== "ALL") {
        if (exam.status !== examStatusFilter) return false;
      }

      // Result Status Filter
      if (statusFilter !== "ALL") {
        const dominant = getDominantStatus(exam._id);
        if (dominant !== statusFilter) return false;
      }

      return true;
    });
  }, [
    exams,
    searchTerm,
    selectedCourse,
    selectedSemester,
    selectedAcademicYear,
    examStatusFilter,
    statusFilter,
    resultMap,
  ]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCourse,
    selectedSemester,
    selectedAcademicYear,
    examStatusFilter,
    statusFilter,
  ]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredExams.length / pageSize) || 1;
  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExams.slice(start, start + pageSize);
  }, [filteredExams, currentPage, pageSize]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedCourse !== "ALL" ||
    selectedSemester !== "ALL" ||
    selectedAcademicYear !== "ALL" ||
    statusFilter !== "ALL" ||
    examStatusFilter !== "ALL";

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCourse("ALL");
    setSelectedSemester("ALL");
    setSelectedAcademicYear("ALL");
    setStatusFilter("ALL");
    setExamStatusFilter("ALL");
  };

  // Global KPI Aggregates
  const totalExamsCount = exams.length;
  const examsWithResults = Object.values(resultMap).filter(
    (info) => info && info.summary && info.summary.totalStudents > 0
  ).length;
  const examsPendingResults = totalExamsCount - examsWithResults;

  const totalGenerated = Object.values(resultMap).reduce(
    (acc, info) => acc + (info?.summary?.totalStudents || 0),
    0
  );
  const totalPassed = Object.values(resultMap).reduce(
    (acc, info) => acc + (info?.summary?.passed || 0),
    0
  );
  const totalFailed = Object.values(resultMap).reduce(
    (acc, info) => acc + (info?.summary?.failed || 0),
    0
  );
  const totalIncomplete = Object.values(resultMap).reduce(
    (acc, info) => acc + (info?.summary?.incomplete || 0),
    0
  );

  const overallPassRate =
    totalGenerated > 0 ? Math.round((totalPassed / totalGenerated) * 100) : 0;
  const overallFailRate =
    totalGenerated > 0 ? Math.round((totalFailed / totalGenerated) * 100) : 0;

  // Workflow Handlers
  const handleGenerate = (examId) => {
    navigate(`/dashboard/exam/results/generate?examId=${examId}`);
  };

  const handleReview = (examId) => {
    navigate(`/dashboard/exam/results/review/${examId}`);
  };

  // Lock Confirmation Execution
  const handleLockClick = (exam) => {
    setPendingLockExam(exam);
  };

  const confirmLock = async () => {
    if (!pendingLockExam) return;
    const examId = pendingLockExam._id;
    setActionBusy(examId);
    try {
      const res = await lockResultsForExam(examId);
      toast.success(
        res.data?.message ||
          `Draft results for "${pendingLockExam.name}" locked successfully.`
      );
      await refreshResult();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to lock results.");
    } finally {
      setActionBusy(null);
      setPendingLockExam(null);
    }
  };

  // Publish Confirmation Execution
  const handlePublishClick = (exam) => {
    setPendingPublishExam(exam);
  };

  const confirmPublish = async () => {
    if (!pendingPublishExam) return;
    const examId = pendingPublishExam._id;
    setActionBusy(examId);
    setPublishBlocked(null);
    try {
      const res = await publishResultsForExam(examId);
      toast.success(
        res.data?.message ||
          `Results for "${pendingPublishExam.name}" published successfully.`
      );
      await refreshResult();
    } catch (err) {
      const data = err.response?.data;
      const code = data?.code || data?.error?.code;
      const details = data?.details || data?.error?.details;
      const msg =
        data?.message || data?.error?.message || "Failed to publish results.";

      if (code === "INCOMPLETE_MARKS" && details) {
        setPublishBlocked(details);
      }
      toast.error(msg);
    } finally {
      setActionBusy(null);
      setPendingPublishExam(null);
    }
  };

  // Safe Unlock Redirection
  const handleUnlockClick = (exam) => {
    setPendingUnlockExam(exam);
  };

  const confirmUnlockRedirect = () => {
    if (!pendingUnlockExam) return;
    const examId = pendingUnlockExam._id;
    setPendingUnlockExam(null);
    navigate(`/dashboard/exam/results/review/${examId}`);
  };

  const statusPill = (status) => {
    if (status === "PUBLISHED")
      return (
        <span className="pill pill-published">
          <span className="pill-dot" />
          Published
        </span>
      );
    if (status === "LOCKED")
      return (
        <span className="pill pill-locked">
          <span className="pill-dot" />
          Locked
        </span>
      );
    if (status === "DRAFT")
      return (
        <span className="pill pill-draft">
          <span className="pill-dot" />
          Draft
        </span>
      );
    if (status === "MIXED")
      return (
        <span className="pill pill-warning">
          <span className="pill-dot" />
          In Progress
        </span>
      );
    return (
      <span className="pill pill-cyan">
        <span className="pill-dot" />
        Not Generated
      </span>
    );
  };

  const examStatusPill = (status) => {
    if (status === "PUBLISHED")
      return <span className="pill pill-success">Timetable Published</span>;
    if (status === "COMPLETED")
      return <span className="pill pill-cyan">Exam Completed</span>;
    return <span className="pill pill-draft">Timetable Draft</span>;
  };

  if (loading) return <Loading message="Loading exam results dashboard..." />;

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
      <div className="erd container-fluid p-4">
        <style>{styles}</style>
        <div className="erd-alert">{error.message}</div>
        <button
          className="btn-edx-primary"
          onClick={() => window.location.reload()}
        >
          <FaRedo /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="erd container-fluid p-4">
      <style>{styles}</style>

      {/* Lock Confirmation Modal */}
      <ConfirmModal
        isOpen={!!pendingLockExam}
        onClose={() => setPendingLockExam(null)}
        onConfirm={confirmLock}
        title="Lock Draft Results"
        message={`Are you sure you want to lock the draft results for "${pendingLockExam?.name}"? Locking prevents further marks modifications until unlocked.`}
        type="warning"
        confirmText="Lock Draft Results"
        isLoading={actionBusy === pendingLockExam?._id}
      />

      {/* Publish Confirmation Modal */}
      <ConfirmModal
        isOpen={!!pendingPublishExam}
        onClose={() => setPendingPublishExam(null)}
        onConfirm={confirmPublish}
        title="Publish Locked Results"
        message={`Are you sure you want to publish the locked results for "${pendingPublishExam?.name}"? Once published, results are immediately visible to students and marks become immutable.`}
        type="success"
        confirmText="Publish Results"
        isLoading={actionBusy === pendingPublishExam?._id}
      />

      {/* Safe Unlock Redirection Modal */}
      <ConfirmModal
        isOpen={!!pendingUnlockExam}
        onClose={() => setPendingUnlockExam(null)}
        onConfirm={confirmUnlockRedirect}
        title="Review & Unlock Results"
        message={`Unlocking results changes their status back to DRAFT and requires individual audit justification. To safely inspect student records and unlock them with a mandatory reason, proceed to the Exam Review screen.`}
        type="warning"
        confirmText="Go to Exam Review"
      />

      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard/exam" },
          { label: "Exam Dashboard", path: "/dashboard/exam" },
          { label: "Result Dashboard" },
        ]}
      />

      {/* ================= PAGE HEADER ================= */}
      <PageHeader
        icon={FaChartBar}
        title="Exam Results Dashboard"
        subtitle="Manage result generation, review, lock, and publish across college examinations"
        actions={
          <button
            className="btn-edx-primary"
            onClick={() => navigate("/dashboard/exam/results/generate")}
          >
            <FaPlus />
            Generate Result
          </button>
        }
      />

      {/* ================= 5 KPI STAT CARDS ================= */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="stat-grid-5 mb-4"
      >
        <div className="stat-card stat-card-navy">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-navy">
              <FaClipboardList />
            </div>
            <div>
              <div className="stat-label">Total Exams</div>
              <div className="stat-value">{totalExamsCount}</div>
            </div>
          </div>
          <div className="stat-sub">
            {examsWithResults} with results · {examsPendingResults} pending
          </div>
        </div>

        <div className="stat-card stat-card-cyan">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-cyan">
              <FaLayerGroup />
            </div>
            <div>
              <div className="stat-label">Results Generated</div>
              <div className="stat-value">{totalGenerated}</div>
            </div>
          </div>
          <div className="stat-sub">
            Across {examsWithResults} evaluated exam(s)
          </div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-green">
              <FaCheckCircle />
            </div>
            <div>
              <div className="stat-label">Passed</div>
              <div
                className="stat-value"
                style={{ color: "var(--edx-green-600)" }}
              >
                {totalPassed}
              </div>
            </div>
          </div>
          <div className="stat-sub">{overallPassRate}% college pass rate</div>
        </div>

        <div className="stat-card stat-card-red">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-red">
              <FaExclamationTriangle />
            </div>
            <div>
              <div className="stat-label">Failed</div>
              <div
                className="stat-value"
                style={{ color: "var(--edx-red-500)" }}
              >
                {totalFailed}
              </div>
            </div>
          </div>
          <div className="stat-sub">{overallFailRate}% backlog eligible</div>
        </div>

        <div className="stat-card stat-card-amber">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-amber">
              <FaClock />
            </div>
            <div>
              <div className="stat-label">Incomplete</div>
              <div
                className="stat-value"
                style={{ color: "var(--edx-amber-600)" }}
              >
                {totalIncomplete}
              </div>
            </div>
          </div>
          <div className="stat-sub">
            {totalIncomplete > 0 ? "Pending marks completion" : "All marks recorded"}
          </div>
        </div>
      </motion.div>

      {/* ================= MULTI-CRITERIA FILTER CARD ================= */}
      <div className="filter-card mb-4">
        <div className="filter-card-header">
          <div className="filter-card-label">
            <FaFilter /> Search &amp; Multi-Dimensional Filters
          </div>
          {hasActiveFilters && (
            <button
              className="btn-edx-outline"
              onClick={clearAllFilters}
              title="Reset all filters"
            >
              <FaRedo size={11} /> Reset Filters
            </button>
          )}
        </div>

        <div className="filter-row">
          {/* Search Box */}
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by exam name, course code, year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchTerm("")}
                title="Clear Search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* Course Select */}
          <div className="select-box">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="ALL">All Courses</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Semester Select */}
          <div className="select-box">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              <option value="ALL">All Semesters</option>
              {availableSemesters.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Select */}
          <div className="select-box">
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
            >
              <option value="ALL">All Academic Years</option>
              {availableAcademicYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Result Lifecycle Status Select */}
          <div className="select-box">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Result Status</option>
              <option value="NOT_GENERATED">Not Generated</option>
              <option value="DRAFT">Draft</option>
              <option value="LOCKED">Locked</option>
              <option value="PUBLISHED">Published</option>
              <option value="MIXED">In Progress (Mixed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= PUBLISH BLOCKED ALERT ================= */}
      {publishBlocked && (
        <div className="erd-alert mb-4">
          <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>
            <FaExclamationTriangle style={{ marginRight: "0.4rem" }} />
            Cannot Publish Result — Incomplete Marks Found
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            Affected Students: {publishBlocked.totalAffectedStudents} ·
            Incomplete Subjects: {publishBlocked.totalIncompleteSubjects}
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "0.75rem",
              border: "1px solid rgba(229,72,77,0.3)",
              marginBottom: "0.75rem",
            }}
          >
            {publishBlocked.issues?.map((issue, idx) => (
              <div
                key={idx}
                className="d-flex justify-content-between py-1 border-bottom last-border-0"
                style={{ fontSize: "0.82rem" }}
              >
                <span>
                  <strong>{issue.subjectName || issue.subjectId || "Subject"}</strong>{" "}
                  {issue.studentName ? `(${issue.studentName})` : ""}
                </span>
                <span style={{ color: "var(--edx-red-500)", fontWeight: 600 }}>
                  {issue.issue === "MARKS_NOT_ENTERED"
                    ? "Marks Not Entered"
                    : "Incomplete Marks"}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.82rem" }}>
            Please enter missing marks in the Marks Entry screen, regenerate the
            result, and verify before publishing.
          </div>
        </div>
      )}

      {/* ================= RESULTS TABLE CARD ================= */}
      <div className="table-card">
        {filteredExams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaChartBar />
            </div>
            <h5 className="empty-title">No exam results found</h5>
            <p className="empty-text">
              {exams.length === 0
                ? "No examinations found for this college. Create an exam to begin."
                : "No examinations match your active filter criteria."}
            </p>
            {hasActiveFilters && (
              <button
                className="btn-edx-outline mt-2"
                onClick={clearAllFilters}
              >
                <FaRedo size={11} /> Reset Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "42px" }}>#</th>
                    <th>Exam &amp; Category</th>
                    <th>Course &amp; Academic Session</th>
                    <th>Result Lifecycle</th>
                    <th className="text-center">Results</th>
                    <th className="text-center">Pass / Fail / Incomplete</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedExams.map((exam, index) => {
                    const info = resultMap[exam._id];
                    const dominant = getDominantStatus(exam._id);

                    const totalStudents = info?.summary?.totalStudents || 0;
                    const passed = info?.summary?.passed || 0;
                    const failed = info?.summary?.failed || 0;
                    const incomplete = info?.summary?.incomplete || 0;

                    const published = info?.summary?.byStatus?.PUBLISHED || 0;
                    const locked = info?.summary?.byStatus?.LOCKED || 0;
                    const draft = info?.summary?.byStatus?.DRAFT || 0;

                    const hasBacklogs = exam.subjects?.some(
                      (s) => s.category === "BACKLOG"
                    );

                    // Resolved lifecycle rules (no deadlock)
                    const canReview = totalStudents > 0;
                    const canLock = draft > 0;
                    const canPublish = locked > 0;
                    const canUnlock = locked > 0;

                    const rowNum = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr key={exam._id}>
                        <td style={{ color: "var(--edx-slate-400)", fontWeight: 600 }}>
                          {rowNum}
                        </td>

                        {/* Exam Name & Category Badges */}
                        <td>
                          <div className="row-title">{exam.name}</div>
                          <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                            {examStatusPill(exam.status)}
                            {hasBacklogs && (
                              <span className="pill pill-unified">
                                <FaLayerGroup size={10} /> Unified (Reg + Backlog)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Course & Academic Session */}
                        <td>
                          <div className="course-name">
                            {exam.course_id?.name || "N/A"}
                          </div>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <span className="course-code">
                              {exam.course_id?.code || "—"}
                            </span>
                            <span className="pill pill-cyan">
                              Sem {exam.semester}
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "var(--edx-slate-600)" }}>
                              {exam.academicYear}
                            </span>
                          </div>
                        </td>

                        {/* Result Lifecycle Status */}
                        <td>
                          <div>{statusPill(dominant)}</div>
                          {totalStudents > 0 && (
                            <div className="result-meta">
                              {published > 0 && (
                                <span style={{ color: "var(--edx-green-600)" }}>
                                  <FaGlobe size={9} /> {published} Pub
                                </span>
                              )}
                              {locked > 0 && (
                                <span style={{ color: "var(--edx-navy-800)" }}>
                                  <FaLock size={9} /> {locked} Lock
                                </span>
                              )}
                              {draft > 0 && (
                                <span style={{ color: "var(--edx-slate-600)" }}>
                                  <FaPencilAlt size={9} /> {draft} Draft
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Student Count */}
                        <td className="text-center">
                          {totalStudents > 0 ? (
                            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                              {totalStudents}
                            </span>
                          ) : (
                            <span style={{ color: "var(--edx-slate-400)" }}>—</span>
                          )}
                        </td>

                        {/* Pass / Fail / Incomplete */}
                        <td className="text-center">
                          {totalStudents > 0 ? (
                            <div style={{ fontSize: "0.85rem" }}>
                              <span
                                style={{
                                  color: "var(--edx-green-600)",
                                  fontWeight: 700,
                                }}
                              >
                                {passed}
                              </span>
                              {" / "}
                              <span
                                style={{
                                  color: "var(--edx-red-500)",
                                  fontWeight: 700,
                                }}
                              >
                                {failed}
                              </span>
                              {incomplete > 0 && (
                                <span
                                  style={{
                                    color: "var(--edx-amber-600)",
                                    fontWeight: 700,
                                    marginLeft: "0.3rem",
                                  }}
                                  title={`${incomplete} student(s) incomplete`}
                                >
                                  ({incomplete} inc)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--edx-slate-400)" }}>—</span>
                          )}
                        </td>

                        {/* Action Controls */}
                        <td className="text-end">
                          <div className="d-flex justify-content-end align-items-center gap-1 flex-wrap">
                            {/* Primary Workflow CTA */}
                            {canReview ? (
                              <button
                                className="btn-table-primary"
                                onClick={() => handleReview(exam._id)}
                                title="Review and manage student results"
                              >
                                <FaEye /> Review
                              </button>
                            ) : (
                              <button
                                className="btn-table-secondary"
                                onClick={() => handleGenerate(exam._id)}
                                title="Generate results for this exam"
                              >
                                <FaCog /> Generate
                              </button>
                            )}

                            {/* Secondary Lifecycle Action Buttons */}
                            {canLock && (
                              <button
                                className="icon-action-btn icon-action-lock"
                                title={`Lock ${draft} Draft Result(s)`}
                                disabled={actionBusy === exam._id}
                                onClick={() => handleLockClick(exam)}
                              >
                                <FaLock />
                                {draft > 0 && (
                                  <span className="action-badge">{draft}</span>
                                )}
                              </button>
                            )}

                            {canPublish && (
                              <button
                                className="icon-action-btn icon-action-publish"
                                title={`Publish ${locked} Locked Result(s)`}
                                disabled={actionBusy === exam._id}
                                onClick={() => handlePublishClick(exam)}
                              >
                                <FaGlobe />
                                {locked > 0 && (
                                  <span className="action-badge">{locked}</span>
                                )}
                              </button>
                            )}

                            {canUnlock && (
                              <button
                                className="icon-action-btn icon-action-unlock"
                                title="Review and unlock locked results"
                                onClick={() => handleUnlockClick(exam)}
                              >
                                <FaLockOpen />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-wrapper">
              <div className="pagination-info">
                Showing{" "}
                <strong>
                  {Math.min(
                    (currentPage - 1) * pageSize + 1,
                    filteredExams.length
                  )}
                </strong>{" "}
                to{" "}
                <strong>
                  {Math.min(currentPage * pageSize, filteredExams.length)}
                </strong>{" "}
                of <strong>{filteredExams.length}</strong> exam(s)
              </div>

              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-1">
                  <span style={{ fontSize: "0.82rem", color: "var(--edx-slate-600)" }}>
                    Rows:
                  </span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "70px", borderRadius: "8px" }}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="pagination-controls">
                  <button
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    title="Previous Page"
                  >
                    <FaChevronLeft size={10} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      return (
                        <span key={page} className="d-flex align-items-center">
                          {prevPage && page - prevPage > 1 && (
                            <span style={{ padding: "0 0.25rem", color: "var(--edx-slate-400)" }}>
                              …
                            </span>
                          )}
                          <button
                            className={`page-btn ${
                              currentPage === page ? "active" : ""
                            }`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </span>
                      );
                    })}

                  <button
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    title="Next Page"
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
