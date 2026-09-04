import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { publishExam } from "../../../api/exam";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
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

/* ---------- Header ---------- */
.exam-list-page .edx-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}
.exam-list-page .edx-header-left {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.exam-list-page .edx-header-icon {
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
.exam-list-page .edx-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--edx-navy-950);
  margin: 0;
  line-height: 1.2;
}
.exam-list-page .edx-subtitle {
  color: var(--edx-slate-600);
  margin: 0.15rem 0 0;
  font-size: 0.92rem;
}
.exam-list-page .edx-divider {
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--edx-navy-900) 0%, var(--edx-cyan-500) 55%, transparent 100%);
  margin: 1.1rem 0 1.5rem;
}

.exam-list-page .btn-edx-primary {
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
.exam-list-page .btn-edx-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(23, 174, 203, 0.28);
  background: linear-gradient(135deg, var(--edx-navy-800), var(--edx-cyan-600));
}
.exam-list-page .btn-edx-primary:focus-visible {
  outline: 3px solid var(--edx-cyan-50);
  outline-offset: 2px;
}

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
  flex: 0 1 210px;
  position: relative;
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
  background: var(--edx-slate-100);
  color: var(--edx-navy-900);
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
  .exam-list-page .select-box { flex: 1 1 auto; }
}

@media (prefers-reduced-motion: reduce) {
  .exam-list-page * { animation: none !important; transition: none !important; }
}
`;

export default function ExamList() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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

  /* ================= FETCH EXAMS ================= */
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get("/exam");
        const examsData = Array.isArray(res.data) ? res.data :
                          Array.isArray(res.data.data) ? res.data.data : [];
        setExams(examsData);
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

  /* ================= FILTERED EXAMS ================= */
  const filteredExams = useMemo(() => {
    let result = exams;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((exam) => {
        const courseName = exam.course_id?.name || "";
        const courseCode = exam.course_id?.code || "";
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
          matchesSubject
        );
      });
    }

    if (statusFilter !== "ALL") {
      result = result.filter((exam) => exam.status === statusFilter);
    }

    return result;
  }, [exams, searchTerm, statusFilter]);

  /* ================= ACTIONS ================= */
  const handleViewExam = (examId) => {
    navigate(`/dashboard/exam/view/${examId}`);
  };

  const handleEditExam = (examId) => {
    navigate(`/dashboard/exam/edit/${examId}`);
  };

  const handleTimetable = (examId) => {
    navigate(`/dashboard/exam/schedule/${examId}`);
  };

  const handleCreateExam = () => {
    navigate("/dashboard/exam/create");
  };

  const handlePublishClick = (exam) => {
    if (exam.status === "PUBLISHED") return;
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
      setActionError(msg);
      toast.error(msg);
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
    <div className="exam-list-page container-fluid p-4">
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
            <h2 className="edx-title">Exam Management</h2>
            <p className="edx-subtitle">Create, view and manage examinations for your college</p>
          </div>
        </div>
        <button className="btn-edx-primary" onClick={handleCreateExam}>
          <FaPlus />
          Create Exam
        </button>
      </motion.div>
      <div className="edx-divider" />

      {/* Filters */}
      <div className="filter-card mb-4">
        <div className="filter-card-label">
          <FaFilter />
          Search &amp; filter exams
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
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
          <div className="select-box">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exams Table */}
      <div className="table-card">
        {filteredExams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaClock size={26} />
            </div>
            <h5 className="empty-title">No examinations found</h5>
            <p className="empty-text">
              {exams.length === 0
                ? "Create an exam to get started."
                : "No exams match your search criteria."}
            </p>
            {exams.length === 0 && (
              <button className="btn-edx-primary mt-3" onClick={handleCreateExam}>
                <FaPlus />
                Create Your First Exam
              </button>
            )}
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
                            {exam.course_id?.code || ""}
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
                          <button
                            className="icon-btn"
                            style={{ color: "var(--edx-green-600)", borderColor: "var(--edx-green-500)" }}
                            onClick={() => handlePublishClick(exam)}
                            title="Publish Exam"
                            disabled={actionBusy === exam._id}
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                        <button
                          className="icon-btn icon-btn-view"
                          onClick={() => handleViewExam(exam._id)}
                          title="View Exam"
                        >
                          <FaEye />
                        </button>
                        {(exam.status === "PUBLISHED" || exam.status === "LOCKED") && (
                          <button
                            className="icon-btn icon-btn-schedule"
                            onClick={() => handleTimetable(exam._id)}
                            title="View Timetable"
                          >
                            <FaCalendarAlt />
                          </button>
                        )}
                        {exam.status === "DRAFT" && (
                          <button
                            className="icon-btn icon-btn-edit"
                            onClick={() => handleEditExam(exam._id)}
                            title="Edit Exam"
                          >
                            <FaEdit />
                          </button>
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
