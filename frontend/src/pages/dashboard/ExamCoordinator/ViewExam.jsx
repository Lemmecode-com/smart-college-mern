import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { publishExam } from "../../../api/exam";
import { logger } from "../../../utils/logger";
import ConfirmModal from "../../../components/ConfirmModal";

import {
  FaBookOpen,
  FaLayerGroup,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaClock,
  FaArrowLeft,
  FaEdit,
  FaBook,
  FaAward,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
} from "react-icons/fa";
import { motion } from "framer-motion";

const BRAND_COLORS = {
  primary: {
    main: "#1a4b6d",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)",
  },
  success: {
    main: "#28a745",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
  },
  info: {
    main: "#17a2b8",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
  },
  warning: {
    main: "#ffc107",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
  },
  danger: {
    main: "#dc3545",
    gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
  },
  secondary: {
    main: "#6c757d",
    gradient: "linear-gradient(135deg, #6c757d 0%, #545b62 100%)",
  },
};

/* =========================================================
   Internal CSS — same navy/cyan token set as the Exam
   Management dashboard and Create Exam form, scoped
   under .exam-view so it never leaks into other pages.
   ========================================================= */
const viewStyles = `
.exam-view {
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

/* ---------- Card shell ---------- */
.exam-view .exam-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 4px 18px rgba(12, 43, 71, 0.08);
  overflow: hidden;
}
.exam-view .exam-card-header {
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.exam-view .exam-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}
.exam-view .exam-card-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.12);
  color: var(--edx-cyan-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}
.exam-view .exam-card-title {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  overflow-wrap: anywhere;
}
.exam-view .exam-card-body { padding: 1.75rem; }

/* ---------- Status pill (header) ---------- */
.exam-view .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}
.exam-view .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.exam-view .pill-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.exam-view .pill-success .pill-dot { background: var(--edx-green-500); }
.exam-view .pill-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.exam-view .pill-warning .pill-dot { background: var(--edx-amber-500); }
.exam-view .pill-slate { background: var(--edx-slate-100); color: var(--edx-slate-600); }
.exam-view .pill-cyan { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.exam-view .pill-navy { background: rgba(12, 43, 71, 0.08); color: var(--edx-navy-800); }
.exam-view .pill-sm { padding: 0.2rem 0.6rem; font-size: 0.72rem; }

/* On the dark header, status pills need solid backgrounds to stay legible */
.exam-view .exam-card-header .pill-success { background: #fff; }
.exam-view .exam-card-header .pill-warning { background: #fff; }

/* ---------- Info grid ---------- */
.exam-view .info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.1rem;
  margin-bottom: 1.75rem;
}
.exam-view .info-item {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  background: var(--edx-bg);
  border: 1px solid var(--edx-slate-100);
  border-radius: 12px;
  padding: 0.9rem 1rem;
}
.exam-view .info-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.exam-view .info-icon-primary { background: var(--edx-cyan-50); color: var(--edx-navy-800); }
.exam-view .info-icon-info { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.exam-view .info-icon-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.exam-view .info-icon-success { background: var(--edx-green-50); color: var(--edx-green-600); }
.exam-view .info-label { color: var(--edx-slate-600); font-size: 0.8rem; display: block; }
.exam-view .info-value { color: var(--edx-slate-900); font-weight: 600; font-size: 0.95rem; display: block; }
.exam-view .info-sub { color: var(--edx-slate-400); font-size: 0.78rem; display: block; }

/* ---------- Section title ---------- */
.exam-view .section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--edx-navy-950);
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 1rem;
}
.exam-view .section-title svg { color: var(--edx-cyan-600); }

/* ---------- Table ---------- */
.exam-view .table-card {
  border: 1px solid var(--edx-slate-100);
  border-radius: 12px;
  overflow: hidden;
}
.exam-view table { margin-bottom: 0; }
.exam-view thead th {
  background: var(--edx-slate-100);
  color: var(--edx-navy-900);
  font-weight: 600;
  font-size: 0.82rem;
  border-bottom: 2px solid var(--edx-cyan-500) !important;
  padding: 0.8rem 1rem;
  white-space: nowrap;
}
.exam-view tbody td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--edx-slate-100);
  font-size: 0.88rem;
}
.exam-view tbody tr { transition: background 0.12s ease; }
.exam-view tbody tr:hover { background: var(--edx-cyan-50); }
.exam-view tbody tr:last-child td { border-bottom: none; }
.exam-view .subject-name-cell { font-weight: 600; color: var(--edx-slate-900); }
.exam-view .teacher-empty { color: var(--edx-slate-400); font-style: italic; }
.exam-view .marks-text { color: var(--edx-slate-600); font-size: 0.82rem; }

/* subject type variants */
.exam-view .type-theory { background: rgba(12, 43, 71, 0.08); color: var(--edx-navy-800); }
.exam-view .type-practical { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }
.exam-view .type-composite { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.exam-view .type-default { background: var(--edx-slate-100); color: var(--edx-slate-600); }

/* ---------- Alerts ---------- */
.exam-view .alert-edx {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
}
.exam-view .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232, 165, 49, 0.3); }
.exam-view .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229, 72, 77, 0.25); }
.exam-view .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }

/* ---------- Buttons ---------- */
.exam-view .btn-edx-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 2px 6px rgba(12, 43, 71, 0.18);
}
.exam-view .btn-edx-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(23, 174, 203, 0.28);
  background: linear-gradient(135deg, var(--edx-navy-800), var(--edx-cyan-600));
}
.exam-view .btn-edx-primary:focus-visible { outline: 3px solid var(--edx-cyan-50); outline-offset: 2px; }

.exam-view .btn-edx-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  color: var(--edx-navy-800);
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.exam-view .btn-edx-outline:hover {
  border-color: var(--edx-navy-700);
  background: var(--edx-slate-100);
}

.exam-view .fallback-wrap { max-width: 560px; margin: 2rem auto; }

@media (max-width: 640px) {
  .exam-view .info-grid { grid-template-columns: 1fr; }
  .exam-view .exam-card-body { padding: 1.25rem; }
  .exam-view .d-flex.justify-content-between.mt-4 { flex-direction: column-reverse; gap: 0.75rem; }
  .exam-view .btn-edx-primary,
  .exam-view .btn-edx-outline { width: 100%; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .exam-view * { animation: none !important; transition: none !important; }
}
`;

export default function ViewExam() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  /* ================= FETCH EXAM ================= */
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await api.get(`/exam/${id}`);
        const examData = res.data?.exam || res.data;
        setExam(examData);
      } catch (err) {
        const statusCode = err.response?.status;
        const errorCode = err.response?.data?.code;
        const backendMessage = err.response?.data?.message;
        setError({
          message: backendMessage || "Failed to load exam details.",
          statusCode,
          errorCode,
        });
        logger.error("Error fetching exam:", statusCode, errorCode);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchExam();
  }, [id]);

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

  const getSubjectTypeBadge = (type) => {
    const variants = {
      THEORY: "type-theory",
      PRACTICAL: "type-practical",
      COMPOSITE: "type-composite",
    };
    return <span className={`pill pill-sm ${variants[type] || "type-default"}`}>{type || "N/A"}</span>;
  };

  const handlePublishClick = () => {
    if (exam.status === "PUBLISHED") return;
    setShowPublishConfirm(true);
    setActionError(null);
  };

  const confirmPublish = async () => {
    setShowPublishConfirm(false);
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await publishExam(exam._id);
      toast.success(res.message || "Exam published successfully");
      setExam((prev) => ({ ...prev, status: "PUBLISHED" }));
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to publish exam.";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  /* ================= RENDER ================= */
  if (loading) {
    return <Loading message="Loading exam details..." />;
  }

  if (error) {
    if (error.statusCode === 401 || ["TOKEN_MISSING", "TOKEN_EXPIRED", "INVALID_TOKEN", "TOKEN_BLACKLISTED", "TOKEN_INVALIDATED", "USER_NOT_FOUND", "ACCOUNT_DEACTIVATED", "UNAUTHORIZED"].includes(error.errorCode)) {
      return (
        <ApiError
          statusCode={error.statusCode}
          errorCode={error.errorCode}
          message={error.message}
        />
      );
    }
    return (
      <div className="exam-view container-fluid p-4">
        <style>{viewStyles}</style>
        <div className="fallback-wrap">
          <div className="alert-edx alert-edx-danger mb-3">
            <FaExclamationTriangle />
            {error.message}
          </div>
          <button className="btn-edx-primary" onClick={() => navigate("/dashboard/exam")}>
            <FaArrowLeft />
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="exam-view container-fluid p-4">
        <style>{viewStyles}</style>
        <div className="fallback-wrap">
          <div className="alert-edx alert-edx-warning mb-3">
            <FaExclamationTriangle />
            Exam not found.
          </div>
          <button className="btn-edx-primary" onClick={() => navigate("/dashboard/exam")}>
            <FaArrowLeft />
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-view container-fluid p-4">
      <style>{viewStyles}</style>

      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={confirmPublish}
        title="Publish Exam"
        message={`Are you sure you want to publish "${exam.name}"? Once published, the exam will be available as a published exam and should no longer be treated as a draft.`}
        type="success"
        confirmText="Publish Exam"
        isLoading={actionBusy}
      />

      <Breadcrumb
        items={[
          { label: "Exam Dashboard", path: "/dashboard/exam" },
          { label: exam.name, path: `/dashboard/exam/view/${id}` },
        ]}
      />

      <div className="row justify-content-center">
        <div className="col-lg-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="exam-card mt-3"
          >
            <div className="exam-card-header">
              <div className="exam-card-header-left">
                <div className="exam-card-header-icon">
                  <FaBookOpen />
                </div>
                <h4 className="exam-card-title">{exam.name}</h4>
              </div>
              {getStatusBadge(exam.status)}
            </div>
            <div className="exam-card-body">
              {/* Exam Info */}
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon info-icon-primary">
                    <FaLayerGroup />
                  </div>
                  <div>
                    <span className="info-label">Course</span>
                    <span className="info-value">{exam.course_id?.name || "N/A"}</span>
                    <span className="info-sub">{exam.course_id?.code || ""}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-info">
                    <FaGraduationCap />
                  </div>
                  <div>
                    <span className="info-label">Semester</span>
                    <span className="info-value">Semester {exam.semester}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-warning">
                    <FaClock />
                  </div>
                  <div>
                    <span className="info-label">Academic Year</span>
                    <span className="info-value">{exam.academicYear}</span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-icon info-icon-success">
                    <FaBook />
                  </div>
                  <div>
                    <span className="info-label">Total Subjects</span>
                    <span className="info-value">{exam.subjects?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Subjects List */}
              <h5 className="section-title">
                <FaBook />
                Subjects
              </h5>
              {exam.subjects && exam.subjects.length > 0 ? (
                <div className="table-card table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Subject Name</th>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Teacher</th>
                        <th>Max Marks Config</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.subjects.map((examSubject, index) => {
                        const subject = examSubject.subject || {};
                        return (
                          <tr key={examSubject._id || index}>
                            <td className="subject-name-cell">{subject.name || "N/A"}</td>
                            <td>
                              <span className="pill pill-slate pill-sm">{subject.code || "N/A"}</span>
                            </td>
                            <td>{getSubjectTypeBadge(examSubject.subjectType)}</td>
                            <td>
                              {subject.teacher_id ? (
                                typeof subject.teacher_id === "object" ? (
                                  subject.teacher_id.name || "N/A"
                                ) : (
                                  subject.teacher_id
                                )
                              ) : (
                                <span className="teacher-empty">Not assigned</span>
                              )}
                            </td>
                            <td>
                              <span className="marks-text">
                                {examSubject.internalMaxMarks !== undefined && `Int: ${examSubject.internalMaxMarks}`}
                                {examSubject.externalMaxMarks !== undefined && ` / Ext: ${examSubject.externalMaxMarks}`}
                                {examSubject.passMarks !== undefined && ` / Pass: ${examSubject.passMarks}`}
                                {examSubject.internalMaxMarks === undefined && examSubject.externalMaxMarks === undefined && examSubject.passMarks === undefined && (
                                  "Not configured"
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert-edx alert-edx-warning">
                  <FaExclamationTriangle />
                  No subjects assigned to this exam.
                </div>
              )}

              {/* Actions */}
              <div className="d-flex justify-content-between mt-4">
                <button
                  className="btn-edx-outline"
                  onClick={() => navigate("/dashboard/exam")}
                >
                  <FaArrowLeft />
                  Back to Exams
                </button>
                <div className="d-flex gap-2">
                  {exam.status === "DRAFT" && (
                    <button className="btn-edx-primary" onClick={handlePublishClick} disabled={actionBusy}>
                      {actionBusy ? <FaSpinner className="spin" /> : <FaCheckCircle />}
                      {actionBusy ? "Publishing..." : "Publish Exam"}
                    </button>
                  )}
                  <button
                    className="btn-edx-primary"
                    onClick={() => navigate(`/dashboard/exam/edit/${id}`)}
                  >
                    <FaEdit />
                    Edit Exam
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}