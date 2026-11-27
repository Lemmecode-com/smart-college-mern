import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../api/axios";
import { publishExam } from "../../../api/exam";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import ActionIconButton from "../../../components/common/ActionIconButton";
import ConfirmModal from "../../../components/ConfirmModal";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";
import {
  FaClock,
  FaPlus,
  FaSearch,
   FaEye,
  FaEdit,
  FaFilter,
  FaCalendarAlt,
  FaBookOpen,
  FaLayerGroup,
  FaGraduationCap,
  FaExclamationTriangle,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";

/* =========================================================
   Internal CSS — scoped under .exam-list-page so nothing
   leaks into the rest of the app. Palette is pulled from
   the sidebar (deep navy + cyan accent).
   ========================================================= */
const listStyles = `
.exam-list-page {
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
.exam-list-page nav.erp-breadcrumb { margin-bottom: 1.1rem; }



/* ---------- Filter card ---------- */
.exam-list-page .filter-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.06);
  padding: 1.1rem 1.25rem;
}
.exam-list-page .filter-card-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--edx-navy-800);
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}
.exam-list-page .filter-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.exam-list-page .search-box {
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
.exam-list-page .search-box:focus-within {
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
  background: #fff;
}
.exam-list-page .search-box svg { color: var(--edx-slate-400); flex-shrink: 0; }
.exam-list-page .search-box input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.92rem;
  color: var(--edx-slate-900);
  min-width: 0;
}
.exam-list-page .search-clear {
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
.exam-list-page .search-clear:hover { background: var(--edx-slate-400); color: #fff; }

.exam-list-page .select-box {
  flex: 1 1 180px;
  min-width: 150px;
  position: relative;
}
.exam-list-page .select-box.is-disabled select {
  background: var(--edx-slate-100);
  color: var(--edx-slate-400);
  cursor: not-allowed;
  border-color: var(--edx-slate-200);
}
.exam-list-page .select-box.is-disabled::after {
  border-color: var(--edx-slate-300);
}
.exam-list-page .active-filters-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--edx-slate-100);
}
.exam-list-page .active-filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--edx-slate-600);
}
.exam-list-page .filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.65rem;
  background: var(--edx-cyan-50);
  border: 1px solid rgba(14, 147, 171, 0.25);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--edx-navy-800);
  font-weight: 500;
}
.exam-list-page .filter-chip-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--edx-cyan-600);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0.75rem;
  line-height: 1;
  transition: color 0.15s ease;
}
.exam-list-page .filter-chip-remove:hover {
  color: var(--edx-red-500);
}
.exam-list-page .btn-clear-filters {
  background: transparent;
  border: none;
  color: var(--edx-cyan-600);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  transition: background 0.15s ease, color 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}
.exam-list-page .btn-clear-filters:hover {
  color: var(--edx-navy-900);
  background: var(--edx-slate-100);
}
.exam-list-page .select-box select {
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
.exam-list-page .select-box select:focus {
  outline: none;
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
  background: #fff;
}
.exam-list-page .select-box::after {
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
.exam-list-page .table-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 1px 3px rgba(12, 43, 71, 0.06);
  overflow: hidden;
}
.exam-list-page table { margin-bottom: 0; }
.exam-list-page thead th {
  background: #0E3746;
  color: #fff;
  font-weight: 600;
  font-size: 0.82rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.85rem 1rem;
  white-space: nowrap;
}
.exam-list-page tbody td {
  padding: 0.8rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.9rem;
}
.exam-list-page tbody tr { transition: background 0.12s ease; }
.exam-list-page tbody tr:hover { background: var(--edx-cyan-50); }
.exam-list-page tbody tr:last-child td { border-bottom: none; }

.exam-list-page .row-icon {
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
.exam-list-page .row-title { font-weight: 600; color: var(--edx-slate-900); }
.exam-list-page .course-cell-icon { color: var(--edx-slate-400); font-size: 0.85rem; }
.exam-list-page .course-name { font-weight: 600; color: var(--edx-slate-900); font-size: 0.9rem; }
.exam-list-page .course-code { color: var(--edx-slate-600); font-size: 0.78rem; }
.exam-list-page .year-cell { color: var(--edx-slate-600); }

/* pills / badges */
.exam-list-page .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}
.exam-list-page .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.exam-list-page .pill-cyan { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.exam-list-page .pill-slate { background: var(--edx-slate-100); color: var(--edx-slate-600); }
.exam-list-page .pill-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.exam-list-page .pill-success .pill-dot { background: var(--edx-green-500); }
.exam-list-page .pill-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.exam-list-page .pill-warning .pill-dot { background: var(--edx-amber-500); }

/* action buttons */
.exam-list-page .icon-btn {
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
.exam-list-page .icon-btn-view:hover { border-color: var(--edx-cyan-500); color: var(--edx-cyan-600); background: var(--edx-cyan-50); }
.exam-list-page .icon-btn-edit:hover { border-color: var(--edx-navy-700); color: var(--edx-navy-800); background: var(--edx-slate-100); }
.exam-list-page .icon-btn:focus-visible { outline: 2px solid var(--edx-cyan-500); outline-offset: 2px; }
.exam-list-page .icon-btn[disabled] { opacity: 0.4; cursor: not-allowed; pointer-events: none; }

/* ---------- Empty state ---------- */
.exam-list-page .empty-state { text-align: center; padding: 3.5rem 1.5rem; }
.exam-list-page .empty-icon {
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
.exam-list-page .empty-title { color: var(--edx-navy-950); font-weight: 700; margin-bottom: 0.4rem; }
.exam-list-page .empty-text { color: var(--edx-slate-600); font-size: 0.92rem; max-width: 420px; margin: 0 auto; }

/* ---------- Error fallback ---------- */
.exam-list-page .edx-alert {
  background: var(--edx-red-50);
  color: var(--edx-red-500);
  border: 1px solid rgba(229, 72, 77, 0.25);
  border-radius: 10px;
  padding: 0.9rem 1.1rem;
  font-size: 0.92rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .exam-list-page .edx-header { flex-direction: column; align-items: stretch; }
  .exam-list-page .btn-edx-primary { justify-content: center; }
  .exam-list-page .filter-row { flex-direction: column; }
  .exam-list-page .search-box {
    flex: 0 1 auto;
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
  }
  .exam-list-page .search-box input { height: auto; }
  .exam-list-page .select-box { flex: 1 1 auto; }
}

@media (prefers-reduced-motion: reduce) {
  .exam-list-page * { animation: none !important; transition: none !important; }
}

/* Empty-state: Create Your First Exam button */
.create-first-exam-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 22px;
  margin-top: 8px;

  background: #0e3746;
  color: #ffffff;
  border: 1px solid #0e3746;
  border-radius: 9px;

  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;

  box-shadow: 0 3px 8px rgba(14, 55, 70, 0.15);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.create-first-exam-btn:hover {
  background: #164b5d;
  border-color: #164b5d;
  box-shadow: 0 5px 12px rgba(14, 55, 70, 0.22);
  transform: translateY(-1px);
}

.create-first-exam-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(14, 55, 70, 0.15);
}

.create-first-exam-btn:focus-visible {
  outline: 3px solid rgba(6, 182, 212, 0.4);
  outline-offset: 3px;
}

.create-first-exam-btn svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

`;

export default function ExamList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDept = searchParams.get("dept") || "";
  const initialCourse = searchParams.get("course") || "";
  const initialSem = searchParams.get("sem") || "";
  const initialStatus = searchParams.get("status") || "ALL";
  const initialSearch = searchParams.get("q") || "";

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedDept, setSelectedDept] = useState(initialDept);
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const [selectedSemester, setSelectedSemester] = useState(initialSem);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [, setCurrentPage] = useState(1);

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [actionBusy, setActionBusy] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);

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

  /* ================= DEBOUNCE SEARCH (300ms) ================= */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  /* ================= SYNC FROM URL PARAMS (Browser Back/Forward) ================= */
  useEffect(() => {
    const urlDept = searchParams.get("dept") || "";
    const urlCourse = searchParams.get("course") || "";
    const urlSem = searchParams.get("sem") || "";
    const urlStatus = searchParams.get("status") || "ALL";
    const urlQ = searchParams.get("q") || "";

    if (urlDept !== selectedDept) setSelectedDept(urlDept);
    if (urlCourse !== selectedCourse) setSelectedCourse(urlCourse);
    if (urlSem !== selectedSemester) setSelectedSemester(urlSem);
    if (urlStatus !== statusFilter) setStatusFilter(urlStatus);
    if (urlQ !== debouncedSearch) {
      setSearchTerm(urlQ);
      setDebouncedSearch(urlQ);
    }
  }, [searchParams]);

  /* ================= SYNC STATE TO URL PARAMS ================= */
  useEffect(() => {
    const params = {};
    if (selectedDept) params.dept = selectedDept;
    if (selectedCourse) params.course = selectedCourse;
    if (selectedSemester) params.sem = selectedSemester;
    if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
    if (debouncedSearch.trim()) params.q = debouncedSearch.trim();

    const currentDept = searchParams.get("dept") || "";
    const currentCourse = searchParams.get("course") || "";
    const currentSem = searchParams.get("sem") || "";
    const currentStatus = searchParams.get("status") || "ALL";
    const currentQ = searchParams.get("q") || "";

    if (
      currentDept !== (params.dept || "") ||
      currentCourse !== (params.course || "") ||
      currentSem !== (params.sem || "") ||
      currentStatus !== (params.status || "ALL") ||
      currentQ !== (params.q || "")
    ) {
      setSearchParams(params, { replace: true });
    }
  }, [
    selectedDept,
    selectedCourse,
    selectedSemester,
    statusFilter,
    debouncedSearch,
    searchParams,
    setSearchParams,
  ]);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    let isMounted = true;
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const res = await api.get("/departments");
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.departments)
          ? res.data.departments
          : [];
        if (isMounted) {
          setDepartments(
            list.filter((d) => d.status !== "INACTIVE" && d.isActive !== false),
          );
        }
      } catch (err) {
        logger.error("Failed to load departments:", err);
      } finally {
        if (isMounted) setLoadingDepartments(false);
      }
    };
    fetchDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ================= LOAD COURSES BY DEPARTMENT ================= */
  useEffect(() => {
    let isMounted = true;
    if (!selectedDept) {
      setCourses([]);
      return;
    }

    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await api.get("/courses", {
          params: { departmentId: selectedDept },
        });
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.courses)
          ? res.data.courses
          : [];
        if (isMounted) {
          setCourses(
            list.filter((c) => c.status !== "INACTIVE" && c.isActive !== false),
          );
        }
      } catch (err) {
        logger.error("Failed to load courses:", err);
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    };
    fetchCourses();
    return () => {
      isMounted = false;
    };
  }, [selectedDept]);

  /* ================= DYNAMIC SEMESTER OPTIONS ================= */
  const selectedCourseObj = useMemo(() => {
    return courses.find((c) => String(c._id) === String(selectedCourse));
  }, [courses, selectedCourse]);

  const semesterOptions = useMemo(() => {
    if (!selectedCourse) return [];
    const duration = selectedCourseObj?.durationSemesters || 8;
    return Array.from({ length: duration }, (_, i) => i + 1);
  }, [selectedCourse, selectedCourseObj]);

  /* ================= HANDLERS FOR CASCADING FILTERS ================= */
  const handleDeptChange = (e) => {
    const val = e.target.value;
    setSelectedDept(val);
    setSelectedCourse("");
    setSelectedSemester("");
    setCurrentPage(1);
  };

  const handleCourseChange = (e) => {
    const val = e.target.value;
    setSelectedCourse(val);
    setSelectedSemester("");
    setCurrentPage(1);
  };

  const handleSemesterChange = (e) => {
    const val = e.target.value;
    setSelectedSemester(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedDept("");
    setSelectedCourse("");
    setSelectedSemester("");
    setStatusFilter("ALL");
    setCourses([]);
    setCurrentPage(1);
  };

  /* ================= FETCH EXAMS (SERVER-SIDE FILTERING) ================= */
  useEffect(() => {
    let isMounted = true;
    const fetchExams = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedDept) params.departmentId = selectedDept;
        if (selectedCourse) params.courseId = selectedCourse;
        if (selectedSemester) params.semester = selectedSemester;
        if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

        const res = await api.get("/exam", { params });
        const examsData = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        if (isMounted) {
          setExams(examsData);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;
        const errorMessage =
          backendMessage || "Failed to load exams. Please try again.";

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
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExams();
    return () => {
      isMounted = false;
    };
  }, [
    selectedDept,
    selectedCourse,
    selectedSemester,
    statusFilter,
    debouncedSearch,
  ]);

  /* ================= CLIENT-SIDE FALLBACK / REFINED FILTERING ================= */
  const filteredExams = useMemo(() => {
    let result = exams;

    if (selectedDept) {
      result = result.filter((exam) => {
        const deptId =
          exam.course_id?.department_id?._id || exam.course_id?.department_id;
        return deptId ? String(deptId) === String(selectedDept) : true;
      });
    }

    if (selectedCourse) {
      result = result.filter((exam) => {
        const cId = exam.course_id?._id || exam.course_id;
        return cId ? String(cId) === String(selectedCourse) : true;
      });
    }

    if (selectedSemester) {
      result = result.filter(
        (exam) => String(exam.semester) === String(selectedSemester),
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((exam) => exam.status === statusFilter);
    }

    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter((exam) => {
        const courseName = exam.course_id?.name || "";
        const courseCode = exam.course_id?.code || "";
        const deptName =
          exam.course_id?.department_id?.name ||
          exam.course_id?.department_id?.code ||
          "";
        const matchesSubject = (exam.subjects || []).some((s) => {
          const subjectName = s.subject?.name || "";
          const subjectCode = s.subject?.code || "";
          return (
            subjectName.toLowerCase().includes(term) ||
            subjectCode.toLowerCase().includes(term)
          );
        });
        return (
          exam.name?.toLowerCase().includes(term) ||
          courseName.toLowerCase().includes(term) ||
          courseCode.toLowerCase().includes(term) ||
          deptName.toLowerCase().includes(term) ||
          matchesSubject
        );
      });
    }

    return result;
  }, [
    exams,
    selectedDept,
    selectedCourse,
    selectedSemester,
    statusFilter,
    debouncedSearch,
  ]);

  const selectedDeptName = useMemo(() => {
    if (!selectedDept) return "";
    const dept = departments.find((d) => String(d._id) === String(selectedDept));
    return dept ? dept.name : "Department";
  }, [departments, selectedDept]);

  const selectedCourseName = useMemo(() => {
    if (!selectedCourse) return "";
    const course = courses.find((c) => String(c._id) === String(selectedCourse));
    return course ? `${course.name} (${course.code})` : "Course";
  }, [courses, selectedCourse]);

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      selectedDept ||
      selectedCourse ||
      selectedSemester ||
      (statusFilter && statusFilter !== "ALL"),
  );

  /* ================= ACTIONS ================= */
  const handleViewExam = (examId) => {
    navigate(`/dashboard/exam/view/${examId}`);
  };

  const handleEditExam = (examId) => {
    navigate(`/dashboard/exam/edit/${examId}`);
  };

  const handleTimetable = (examId) => {
    navigate(`/dashboard/exam/timetable/${examId}`);
  };

  const handleCreateExam = () => {
    navigate("/dashboard/exam/create");
  };

  const handlePublishClick = (exam) => {
    if (exam.status === "PUBLISHED") {
      toast.info("Exam Timetable is already published");
      return;
    }
    setPublishTarget(exam);
    setShowPublishConfirm(true);
    setActionError(null);
  };

  const confirmPublish = async () => {
    if (!publishTarget) return;
    const examId = publishTarget._id;
    setShowPublishConfirm(false);
    setActionBusy(examId);
    setActionError(null);
    try {
      const res = await publishExam(examId);
      toast.success(res.message || "Exam published successfully");
      setExams((prev) =>
        prev.map((e) => (e._id === examId ? { ...e, status: "PUBLISHED" } : e)),
      );
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to publish exam.";
      if (msg.toLowerCase().includes("already published")) {
        toast.info("Exam Timetable is already published");
        setExams((prev) =>
          prev.map((e) => (e._id === examId ? { ...e, status: "PUBLISHED" } : e)),
        );
      } else {
        toast.error(msg);
      }
      setActionError(msg);
    } finally {
      setActionBusy(null);
      setPublishTarget(null);
    }
  };

  const getStatusBadge = (status) => {
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
      <div className="exam-list-page container-fluid p-4">
        <style>{listStyles}</style>
        <div className="edx-alert">{error.message}</div>
        <button className="btn-edx-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="exam-list-page container-fluid px-4 pb-4 pt-2">
      <style>{listStyles}</style>

      <Breadcrumb
        items={[
          { label: "Home", path: "/dashboard/exam" },
          { label: "Exam Dashboard", path: "/dashboard/exam" },
          { label: "Exam List" },
        ]}
      />

      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => { setShowPublishConfirm(false); setPublishTarget(null); }}
        onConfirm={confirmPublish}
        title="Publish Exam"
        message={`Are you sure you want to publish "${publishTarget?.name || "this exam"}"? Once published, the exam will be available as a published exam and should no longer be treated as a draft.`}
        type="success"
        confirmText="Publish Exam"
        isLoading={actionBusy === publishTarget?._id}
      />

      {actionError && (
        <div className="edx-alert mb-3">
          <FaExclamationTriangle /> {actionError}
        </div>
      )}

      
      {/* ================= PAGE HEADER ================= */}
        <PageHeader
          icon={FaClock}
          title="Exam Management"
          subtitle="Create, view and manage examinations for your college"
          actions={
            <button
              className="btn-edx-primary"
              onClick={handleCreateExam}
                 style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "white",
                    color: "#0E3746",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "9px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",       
                }}
                  onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 10px rgba(20, 27, 41, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
            >
              <FaPlus />
              Create Exam
            </button>
          }
        />

      {/* Filters */}
      <div className="filter-card mb-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="filter-card-label mb-0">
            <FaFilter />
            Search &amp; filter exams
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={handleClearAllFilters}
              title="Reset all filters"
            >
              <FaTimes size={10} />
              Clear filters
            </button>
          )}
        </div>
        <div className="filter-row">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search exams by name, course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear"
                onClick={handleClearSearch}
                title="Clear search"
                aria-label="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* 1. Department Filter */}
          <div className="select-box">
            <select
              value={selectedDept}
              onChange={handleDeptChange}
              aria-label="Filter by Department"
            >
              <option value="">All Departments</option>
              {loadingDepartments ? (
                <option value="" disabled>
                  Loading departments...
                </option>
              ) : (
                departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 2. Course Filter */}
          <div
            className={`select-box ${
              !selectedDept || loadingCourses ? "is-disabled" : ""
            }`}
          >
            <select
              value={selectedCourse}
              onChange={handleCourseChange}
              disabled={!selectedDept || loadingCourses}
              aria-label="Filter by Course"
            >
              <option value="">All Courses</option>
              {loadingCourses ? (
                <option value="" disabled>
                  Loading courses...
                </option>
              ) : (
                courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Semester Filter */}
          <div
            className={`select-box ${!selectedCourse ? "is-disabled" : ""}`}
          >
            <select
              value={selectedSemester}
              onChange={handleSemesterChange}
              disabled={!selectedCourse}
              aria-label="Filter by Semester"
            >
              <option value="">All Semesters</option>
              {semesterOptions.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div className="select-box">
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              aria-label="Filter by Status"
            >
              <option value="ALL">All status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="active-filters-bar">
            <span className="active-filter-label">Active filters:</span>
            {debouncedSearch.trim() && (
              <span className="filter-chip">
                Search: &quot;{debouncedSearch.trim()}&quot;
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={handleClearSearch}
                  title="Remove search filter"
                  aria-label="Remove search filter"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            {selectedDept && (
              <span className="filter-chip">
                Dept: {selectedDeptName}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => handleDeptChange({ target: { value: "" } })}
                  title="Remove department filter"
                  aria-label="Remove department filter"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            {selectedCourse && (
              <span className="filter-chip">
                Course: {selectedCourseName}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => handleCourseChange({ target: { value: "" } })}
                  title="Remove course filter"
                  aria-label="Remove course filter"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            {selectedSemester && (
              <span className="filter-chip">
                Semester: {selectedSemester}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => handleSemesterChange({ target: { value: "" } })}
                  title="Remove semester filter"
                  aria-label="Remove semester filter"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            {statusFilter !== "ALL" && (
              <span className="filter-chip">
                Status: {statusFilter === "DRAFT" ? "Draft" : "Published"}
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => handleStatusChange({ target: { value: "ALL" } })}
                  title="Remove status filter"
                  aria-label="Remove status filter"
                >
                  <FaTimes />
                </button>
              </span>
            )}
            <button
              type="button"
              className="btn-clear-filters"
              onClick={handleClearAllFilters}
            >
              <FaTimes size={10} />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Exams Table */}
      <div className="table-card">
        {filteredExams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaClock size={26} />
            </div>
            <h5 className="empty-title">
              {hasActiveFilters
                ? "No exams found for these filters"
                : "No examinations found"}
            </h5>
            <p className="empty-text">
              {hasActiveFilters
                ? "Try adjusting or clearing your filters to see more examinations."
                : exams.length === 0
                ? "Create an exam to get started."
                : "No exams match your search criteria."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className="create-first-exam-btn"
                onClick={handleClearAllFilters}
                style={{ marginTop: "1rem" }}
              >
                <FaTimes />
                Clear filters
              </button>
            ) : exams.length === 0 ? (
              <button
                className="create-first-exam-btn"
                onClick={handleCreateExam}
              >
                <FaPlus />
                Create Your First Exam
              </button>
            ) : null}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Course</th>
                  <th>Semester</th>
                  <th>Academic Year</th>
                  <th>Subjects</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => (
                  <tr key={exam._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="row-icon">
                          <FaClock />
                        </div>
                        <span className="row-title">{exam.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <FaGraduationCap className="course-cell-icon" />
                        <div>
                          <div className="course-name">
                            {exam.course_id?.name || "N/A"}
                          </div>
                          <div className="course-code">
                            {exam.course_id?.code &&
                            (exam.course_id?.department_id?.name ||
                              exam.course_id?.department_id?.code)
                              ? `${exam.course_id.code} · ${
                                  exam.course_id.department_id.name ||
                                  exam.course_id.department_id.code
                                }`
                              : exam.course_id?.code ||
                                exam.course_id?.department_id?.name ||
                                ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="pill pill-cyan">
                        <FaLayerGroup size={10} />
                        Sem {exam.semester}
                      </span>
                    </td>
                    <td>
                      <span className="year-cell">{exam.academicYear}</span>
                    </td>
                    <td>
                      <span className="pill pill-slate">
                        {exam.subjects?.length || 0} subjects
                      </span>
                    </td>
                    <td>{getStatusBadge(exam.status)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        {exam.status === "DRAFT" && (
                          <ActionIconButton
                            icon={FaCheckCircle}
                            className="icon-btn"
                            style={{ color: "var(--edx-green-600)", borderColor: "var(--edx-green-500)" }}
                            onClick={() => handlePublishClick(exam)}
                            tooltip={`Publish ${exam.name}`}
                            ariaLabel={`Publish ${exam.name}`}
                            disabled={actionBusy === exam._id}
                          />
                        )}
                        <ActionIconButton
                          icon={FaEye}
                          className="icon-btn icon-btn-view"
                          onClick={() => handleViewExam(exam._id)}
                          tooltip={`View ${exam.name}`}
                          ariaLabel={`View ${exam.name}`}
                        />
                        {(exam.status === "PUBLISHED" || exam.status === "LOCKED" || exam.status === "DRAFT") && (
                          <ActionIconButton
                            icon={FaCalendarAlt}
                            className="icon-btn icon-btn-schedule"
                            onClick={() => handleTimetable(exam._id)}
                            tooltip={
                              exam.status === "DRAFT"
                                ? "Manage Timetable"
                                : "View Timetable"
                            }
                            ariaLabel={
                              exam.status === "DRAFT"
                                ? `Manage timetable for ${exam.name}`
                                : `View timetable for ${exam.name}`
                            }
                          />
                        )}
                        {exam.status === "DRAFT" && (
                          <ActionIconButton
                            icon={FaEdit}
                            className="icon-btn icon-btn-edit"
                            onClick={() => handleEditExam(exam._id)}
                            tooltip={`Edit ${exam.name}`}
                            ariaLabel={`Edit ${exam.name}`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
