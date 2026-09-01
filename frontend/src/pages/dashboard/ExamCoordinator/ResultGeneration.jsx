import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { generateResult } from "../../../api/results";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
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
} from "react-icons/fa";
import { motion } from "framer-motion";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING", "TOKEN_EXPIRED", "INVALID_TOKEN", "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED", "USER_NOT_FOUND", "ACCOUNT_DEACTIVATED", "UNAUTHORIZED",
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
.rgen .rgen-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 4px 18px rgba(12,43,71,0.08);
  overflow: hidden;
}
.rgen .rgen-card-header {
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.rgen .rgen-card-header-icon {
  width: 42px; height: 42px; border-radius: 11px;
  background: rgba(255,255,255,0.12); color: var(--edx-cyan-500);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.05rem; flex-shrink: 0;
}
.rgen .rgen-card-title { color: #fff; font-size: 1.2rem; font-weight: 700; margin: 0; }
.rgen .rgen-card-body { padding: 1.75rem; }
.rgen .field-group { margin-bottom: 1.35rem; }
.rgen .field-label {
  display: flex; align-items: center; gap: 0.45rem;
  font-weight: 600; font-size: 0.88rem; color: var(--edx-navy-900); margin-bottom: 0.45rem;
}
.rgen .field-label svg { color: var(--edx-cyan-600); font-size: 0.85rem; }
.rgen .field-input {
  width: 100%; border: 1px solid var(--edx-slate-200); border-radius: 10px;
  padding: 0.62rem 0.9rem; font-size: 0.92rem; color: var(--edx-slate-900);
  background: #fff; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  appearance: none;
}
.rgen .field-input:focus { outline: none; border-color: var(--edx-cyan-500); box-shadow: 0 0 0 3px var(--edx-cyan-50); }
.rgen .field-input:disabled { background: var(--edx-slate-100); color: var(--edx-slate-400); cursor: not-allowed; }
.rgen .field-input.is-invalid { border-color: var(--edx-red-500); }
.rgen .field-feedback { color: var(--edx-red-500); font-size: 0.8rem; margin-top: 0.35rem; }
.rgen .alert-edx {
  display: flex; align-items: flex-start; gap: 0.6rem;
  border-radius: 10px; padding: 0.85rem 1rem; font-size: 0.88rem; border: 1px solid transparent;
}
.rgen .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }
.rgen .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229,72,77,0.25); }
.rgen .alert-edx-success { background: var(--edx-green-50); color: var(--edx-green-600); border-color: rgba(42,168,118,0.3); }
.rgen .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232,165,49,0.3); }
.rgen .result-summary {
  border: 1px solid var(--edx-slate-200); border-radius: 12px; overflow: hidden; margin-top: 1.5rem;
}
.rgen .result-summary-header {
  background: var(--edx-slate-100); padding: 0.85rem 1.1rem;
  font-weight: 700; font-size: 0.95rem; color: var(--edx-navy-900);
  display: flex; align-items: center; gap: 0.5rem;
}
.rgen .result-summary-header svg { color: var(--edx-cyan-600); }
.rgen .result-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
  border-bottom: 1px solid var(--edx-slate-200);
}
.rgen .stat-cell {
  padding: 1rem; text-align: center; border-right: 1px solid var(--edx-slate-200);
}
.rgen .stat-cell:last-child { border-right: none; }
.rgen .stat-cell-label { font-size: 0.75rem; color: var(--edx-slate-600); display: block; margin-bottom: 0.25rem; }
.rgen .stat-cell-value { font-size: 1.4rem; font-weight: 700; color: var(--edx-navy-950); }
.rgen .stat-cell-value.pass { color: var(--edx-green-600); }
.rgen .stat-cell-value.fail { color: var(--edx-red-500); }
.rgen .stat-cell-value.incomplete { color: var(--edx-amber-600); }
.rgen .overall-row {
  padding: 0.85rem 1.1rem; display: flex; align-items: center; justify-content: space-between;
}
.rgen .overall-label { font-weight: 600; color: var(--edx-slate-600); font-size: 0.9rem; }
.rgen .pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.32rem 0.75rem; border-radius: 999px; font-size: 0.82rem; font-weight: 700;
}
.rgen .pill-pass { background: var(--edx-green-50); color: var(--edx-green-600); }
.rgen .pill-fail { background: var(--edx-red-50); color: var(--edx-red-500); }
.rgen .pill-incomplete { background: var(--edx-amber-50); color: var(--edx-amber-600); }
.rgen .form-actions {
  display: flex; justify-content: space-between; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap;
}
.rgen .btn-edx-primary {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  color: #fff; border: none; border-radius: 10px; padding: 0.65rem 1.4rem;
  font-weight: 600; font-size: 0.92rem; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(12,43,71,0.18);
}
.rgen .btn-edx-primary:hover:not(:disabled) {
  transform: translateY(-1px); box-shadow: 0 8px 18px rgba(23,174,203,0.28);
  background: linear-gradient(135deg, var(--edx-navy-800), var(--edx-cyan-600));
}
.rgen .btn-edx-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
.rgen .btn-edx-outline {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: #fff; color: var(--edx-navy-800); border: 1px solid var(--edx-slate-200);
  border-radius: 10px; padding: 0.65rem 1.4rem; font-weight: 600; font-size: 0.92rem;
  cursor: pointer; transition: all 0.15s ease;
}
.rgen .btn-edx-outline:hover { border-color: var(--edx-navy-700); background: var(--edx-slate-100); }
.rgen .btn-edx-success {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: linear-gradient(135deg, var(--edx-green-600), var(--edx-green-500));
  color: #fff; border: none; border-radius: 10px; padding: 0.65rem 1.4rem;
  font-weight: 600; font-size: 0.92rem; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 6px rgba(31,138,95,0.2);
}
.rgen .btn-edx-success:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(31,138,95,0.28); }
.rgen .spin { animation: rgen-spin 0.8s linear infinite; }
@keyframes rgen-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@media (max-width: 576px) {
  .rgen .rgen-card-body { padding: 1.25rem; }
  .rgen .result-stats { grid-template-columns: repeat(2, 1fr); }
  .rgen .form-actions { flex-direction: column-reverse; }
  .rgen .btn-edx-primary, .rgen .btn-edx-outline, .rgen .btn-edx-success { width: 100%; justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .rgen * { animation: none !important; transition: none !important; }
}
`;

export default function ResultGeneration() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "EXAM_COORDINATOR") return <Navigate to="/dashboard/exam" replace />;

  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);

  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  /* ── load exams ── */
  useEffect(() => {
    api.get("/exam")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data
          : Array.isArray(r.data?.data) ? r.data.data : [];
        setExams(data);
      })
      .catch(() => setExams([]))
      .finally(() => setLoadingExams(false));
  }, []);

  /* ── load students when exam changes ── */
  useEffect(() => {
    if (!examId) { setStudents([]); setStudentId(""); return; }
    const exam = exams.find((e) => e._id === examId);
    if (!exam) return;

    setLoadingStudents(true);
    setStudentId("");
    setGeneratedResult(null);

    api.get("/students/approved-students", {
      params: {
        course_id: exam.course_id?._id || exam.course_id,
        semester: exam.semester,
        limit: 500,
      },
    })
      .then((r) => {
        const data = Array.isArray(r.data?.data) ? r.data.data
          : Array.isArray(r.data?.students) ? r.data.students
          : Array.isArray(r.data) ? r.data : [];
        setStudents(data);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [examId, exams]);

  const validate = () => {
    const errs = {};
    if (!examId) errs.examId = "Please select an exam";
    if (!studentId) errs.studentId = "Please select a student";
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    setGeneratedResult(null);
    try {
      const res = await generateResult({ examId, studentId });
      setGeneratedResult(res.data);
      toast.success("Result generated successfully!");
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

  const overallPillClass = (v) =>
    v === "PASS" ? "pill-pass" : v === "FAIL" ? "pill-fail" : "pill-incomplete";

  if (error?.isAuthError) {
    return <ApiError statusCode={error.statusCode} errorCode={error.errorCode} message={error.message} />;
  }

  return (
    <div className="rgen container-fluid p-4">
      <style>{styles}</style>

      <Breadcrumb items={[
        { label: "Exam Dashboard", path: "/dashboard/exam" },
        { label: "Generate Result", path: "/dashboard/exam/results/generate" },
      ]} />

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rgen-card mt-3"
          >
            <div className="rgen-card-header">
              <div className="rgen-card-header-icon"><FaClipboardList /></div>
              <h4 className="rgen-card-title">Generate Semester Result</h4>
            </div>
            <div className="rgen-card-body">

              {error && !error.isAuthError && (
                <div className="alert-edx alert-edx-danger mb-3">
                  <FaExclamationTriangle />
                  {error.message}
                </div>
              )}

              {/* Exam select */}
              <div className="field-group">
                <label className="field-label">
                  <FaGraduationCap />
                  Exam
                </label>
                <select
                  className={`field-input ${validationErrors.examId ? "is-invalid" : ""}`}
                  value={examId}
                  onChange={(e) => { setExamId(e.target.value); setGeneratedResult(null); setError(null); }}
                  disabled={loadingExams || submitting}
                >
                  <option value="">
                    {loadingExams ? "Loading exams…" : "Select Exam"}
                  </option>
                  {exams.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.name} — {ex.course_id?.name || "N/A"} · Sem {ex.semester} · {ex.academicYear}
                    </option>
                  ))}
                </select>
                {validationErrors.examId && (
                  <div className="field-feedback">{validationErrors.examId}</div>
                )}
              </div>

              {/* Student select */}
              <div className="field-group">
                <label className="field-label">
                  <FaUserGraduate />
                  Student
                </label>
                <select
                  className={`field-input ${validationErrors.studentId ? "is-invalid" : ""}`}
                  value={studentId}
                  onChange={(e) => { setStudentId(e.target.value); setGeneratedResult(null); setError(null); }}
                  disabled={!examId || loadingStudents || submitting}
                >
                  <option value="">
                    {!examId ? "Select an exam first"
                      : loadingStudents ? "Loading students…"
                      : students.length === 0 ? "No eligible students found"
                      : "Select Student"}
                  </option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.fullName || s.user_id?.name || s._id}
                      {s.rollNumber ? ` (${s.rollNumber})` : ""}
                    </option>
                  ))}
                </select>
                {validationErrors.studentId && (
                  <div className="field-feedback">{validationErrors.studentId}</div>
                )}
              </div>

              {/* Generated result summary */}
              {generatedResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="result-summary"
                >
                  <div className="result-summary-header">
                    <FaCheckCircle />
                    Result Generated
                  </div>
                  <div className="result-stats">
                    <div className="stat-cell">
                      <span className="stat-cell-label">Total</span>
                      <span className="stat-cell-value">{generatedResult.totalSubjects}</span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-cell-label">Passed</span>
                      <span className="stat-cell-value pass">{generatedResult.passedSubjects}</span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-cell-label">Failed</span>
                      <span className="stat-cell-value fail">{generatedResult.failedSubjects}</span>
                    </div>
                    <div className="stat-cell">
                      <span className="stat-cell-label">Incomplete</span>
                      <span className="stat-cell-value incomplete">{generatedResult.incompleteSubjects}</span>
                    </div>
                  </div>
                  <div className="overall-row">
                    <span className="overall-label">Overall Result</span>
                    <span className={`pill ${overallPillClass(generatedResult.overallResult)}`}>
                      {generatedResult.overallResult}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="form-actions">
                <button
                  className="btn-edx-outline"
                  onClick={() => navigate("/dashboard/exam")}
                  disabled={submitting}
                >
                  <FaArrowLeft />
                  Back
                </button>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn-edx-primary"
                    onClick={handleGenerate}
                    disabled={submitting || loadingExams}
                  >
                    {submitting ? (
                      <><FaSpinner className="spin" /> Generating…</>
                    ) : (
                      <><FaClipboardList /> {generatedResult ? "Regenerate" : "Generate Result"}</>
                    )}
                  </button>
                  {generatedResult && (
                    <button
                      className="btn-edx-success"
                      onClick={() => navigate(`/dashboard/exam/results/${generatedResult._id}`)}
                    >
                      <FaEye />
                      Review Result
                    </button>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
