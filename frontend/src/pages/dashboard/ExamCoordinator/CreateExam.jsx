import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { toast } from "react-toastify";
import { logger } from "../../../utils/logger";

import {
  FaBookOpen,
  FaSave,
  FaArrowLeft,
  FaLayerGroup,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaUsers,
  FaClock,
  FaAward,
  FaCalendarAlt,
  FaBook,
  FaTrash,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

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

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: "easeOut" },
  }),
};

/* =========================================================
   Internal CSS — same navy/cyan token set as the Exam
   Management dashboard, scoped under .exam-form so it
   never leaks into other pages.
   ========================================================= */
const formStyles = `
.exam-form {
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
.exam-form .exam-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--edx-slate-100);
  box-shadow: 0 4px 18px rgba(12, 43, 71, 0.08);
  overflow: hidden;
}
.exam-form .exam-card-header {
  background: linear-gradient(135deg, var(--edx-navy-900), var(--edx-navy-700));
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.exam-form .exam-card-header-icon {
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
.exam-form .exam-card-title {
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}
.exam-form .exam-card-body {
  padding: 1.75rem;
}

/* ---------- Fields ---------- */
.exam-form .field-group { margin-bottom: 1.35rem; }
.exam-form .field-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--edx-navy-900);
  margin-bottom: 0.45rem;
}
.exam-form .field-label-icon { color: var(--edx-cyan-600); font-size: 0.85rem; }

.exam-form .field-input {
  width: 100%;
  border: 1px solid var(--edx-slate-200);
  border-radius: 10px;
  padding: 0.62rem 0.9rem;
  font-size: 0.92rem;
  color: var(--edx-slate-900);
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.exam-form .field-input:focus {
  outline: none;
  border-color: var(--edx-cyan-500);
  box-shadow: 0 0 0 3px var(--edx-cyan-50);
}
.exam-form .field-input:disabled {
  background: var(--edx-slate-100);
  color: var(--edx-slate-400);
  cursor: not-allowed;
}
.exam-form .field-input.is-invalid {
  border-color: var(--edx-red-500);
}
.exam-form .field-input.is-invalid:focus {
  box-shadow: 0 0 0 3px var(--edx-red-50);
}
.exam-form select.field-input {
  appearance: none;
  background-image: none;
  cursor: pointer;
}
.exam-form .field-feedback {
  color: var(--edx-red-500);
  font-size: 0.8rem;
  margin-top: 0.35rem;
}

/* ---------- Alerts ---------- */
.exam-form .alert-edx {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
}
.exam-form .alert-edx-info { background: var(--edx-cyan-50); color: var(--edx-cyan-600); border-color: rgba(23, 174, 203, 0.25); }
.exam-form .alert-edx-warning { background: var(--edx-amber-50); color: var(--edx-amber-600); border-color: rgba(232, 165, 49, 0.3); }
.exam-form .alert-edx-danger { background: var(--edx-red-50); color: var(--edx-red-500); border-color: rgba(229, 72, 77, 0.25); }
.exam-form .alert-edx-success { background: var(--edx-green-50); color: var(--edx-green-600); border-color: rgba(42, 168, 118, 0.3); }
.exam-form .alert-edx svg { margin-top: 0.15rem; flex-shrink: 0; }

/* ---------- Subject list ---------- */
.exam-form .subject-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--edx-slate-200);
  border-radius: 12px;
  padding: 0.6rem;
  background: var(--edx-bg);
}
.exam-form .subject-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--edx-slate-200);
  background: #fff;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}
.exam-form .subject-item:last-child { margin-bottom: 0; }
.exam-form .subject-item:hover { border-color: var(--edx-cyan-500); }
.exam-form .subject-item.selected {
  border-color: var(--edx-cyan-500);
  background: var(--edx-cyan-50);
  box-shadow: 0 0 0 1px var(--edx-cyan-500);
}
.exam-form .subject-item input[type="checkbox"] {
  width: 17px;
  height: 17px;
  margin-top: 0.15rem;
  accent-color: var(--edx-navy-800);
  cursor: pointer;
  flex-shrink: 0;
}
.exam-form .subject-item-icon {
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
.exam-form .subject-main { flex: 1; min-width: 0; }
.exam-form .subject-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.exam-form .subject-name { font-weight: 600; color: var(--edx-slate-900); font-size: 0.92rem; }
.exam-form .subject-credits {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--edx-slate-600);
  font-size: 0.78rem;
  white-space: nowrap;
}
.exam-form .subject-teacher {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--edx-slate-600);
  font-size: 0.78rem;
  margin-top: 0.3rem;
}
.exam-form .pill {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  margin-left: 0.4rem;
}
.exam-form .pill-slate { background: var(--edx-slate-100); color: var(--edx-slate-600); }
.exam-form .pill-cyan { background: var(--edx-cyan-50); color: var(--edx-cyan-600); }

/* ---------- Buttons ---------- */
.exam-form .btn-edx-primary {
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
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 2px 6px rgba(12, 43, 71, 0.18);
}
.exam-form .btn-edx-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(23, 174, 203, 0.28);
  background: linear-gradient(135deg, var(--edx-navy-800), var(--edx-cyan-600));
}
.exam-form .btn-edx-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
.exam-form .btn-edx-primary:focus-visible { outline: 3px solid var(--edx-cyan-50); outline-offset: 2px; }

.exam-form .btn-edx-outline {
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
.exam-form .btn-edx-outline:hover:not(:disabled) {
  border-color: var(--edx-navy-700);
  background: var(--edx-slate-100);
}
.exam-form .btn-edx-outline:disabled { opacity: 0.6; cursor: not-allowed; }

.exam-form .form-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.exam-form .spin { animation: exam-form-spin 0.8s linear infinite; }
@keyframes exam-form-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.exam-form .success-screen {
  max-width: 520px;
  margin: 3rem auto;
  text-align: center;
}
.exam-form .success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--edx-green-50);
  color: var(--edx-green-600);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 1.6rem;
}

@media (max-width: 576px) {
  .exam-form .exam-card-body { padding: 1.25rem; }
  .exam-form .form-actions { flex-direction: column-reverse; }
  .exam-form .form-actions .btn-edx-primary,
  .exam-form .form-actions .btn-edx-outline { width: 100%; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .exam-form * { animation: none !important; transition: none !important; }
}
`;

export default function CreateExam() {
  const navigate = useNavigate();

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

  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    course_id: "",
    semester: "",
    academicYear: "",
    subjects: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  /* ================= LOAD COURSES ================= */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get("/courses");
        const coursesData = Array.isArray(res.data) ? res.data :
                            Array.isArray(res.data.data) ? res.data.data :
                            Array.isArray(res.data.courses) ? res.data.courses : [];
        setCourses(coursesData);
      } catch {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  /* ================= LOAD SUBJECTS WHEN COURSE/SEMESTER CHANGES ================= */
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!formData.course_id || !formData.semester) {
        setSubjects([]);
        return;
      }

      setLoadingSubjects(true);
      try {
        const res = await api.get(`/subjects/course/${formData.course_id}?semester=${formData.semester}`);
        const subjectsData = Array.isArray(res.data) ? res.data :
                             Array.isArray(res.data.data) ? res.data.data : [];
        setSubjects(subjectsData);
      } catch {
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [formData.course_id, formData.semester]);

  /* ================= HANDLERS ================= */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const resetsSubjects = name === "course_id" || name === "semester";
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(resetsSubjects ? { subjects: [] } : {}),
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (resetsSubjects && validationErrors.subjects) {
      setValidationErrors((prev) => ({ ...prev, subjects: "" }));
    }
  };

  const toggleSubject = (subjectId) => {
    setFormData((prev) => {
      const exists = prev.subjects.includes(subjectId);
      return {
        ...prev,
        subjects: exists
          ? prev.subjects.filter((id) => id !== subjectId)
          : [...prev.subjects, subjectId],
      };
    });
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Exam name is required";
    }

    if (!formData.course_id) {
      errors.course_id = "Course is required";
    }

    if (!formData.semester) {
      errors.semester = "Semester is required";
    }

    if (!formData.academicYear.trim()) {
      errors.academicYear = "Academic year is required";
    }

    if (formData.subjects.length === 0) {
      errors.subjects = "At least one subject must be selected";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/exam", {
        name: formData.name.trim(),
        course_id: formData.course_id,
        semester: Number(formData.semester),
        academicYear: formData.academicYear.trim(),
        subjects: formData.subjects,
      });

      toast.success("Exam created successfully!");
      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard/exam");
      }, 1500);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;

      logger.error("Error creating exam:", statusCode, errorCode);

      if (AUTH_ERROR_CODES.has(errorCode)) {
        setError({ message: backendMessage, statusCode, errorCode, isAuthError: true });
      } else {
        setError(backendMessage || "Failed to create exam. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses.find((c) => c._id === formData.course_id);

  /* ================= RENDER ================= */
  if (success) {
    return (
      <div className="exam-form container-fluid p-4">
        <style>{formStyles}</style>
        <div className="success-screen">
          <div className="success-icon">
            <FaCheckCircle />
          </div>
          <div className="alert-edx alert-edx-success" style={{ justifyContent: "center" }}>
            <FaCheckCircle />
            Exam created successfully! Redirecting...
          </div>
        </div>
      </div>
    );
  }

  if (error && typeof error === "object" && error.isAuthError) {
    return (
      <ApiError
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        message={error.message}
      />
    );
  }

  return (
    <div className="exam-form container-fluid p-4">
      <style>{formStyles}</style>

      <Breadcrumb
        items={[
          { label: "Exam Dashboard", path: "/dashboard/exam" },
          { label: "Create Exam", path: "/dashboard/exam/create" },
        ]}
      />

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="exam-card mt-3"
          >
            <div className="exam-card-header">
              <div className="exam-card-header-icon">
                <FaBookOpen />
              </div>
              <h4 className="exam-card-title">Create New Exam</h4>
            </div>
            <div className="exam-card-body">
              {error && typeof error === "string" && (
                <div className="alert-edx alert-edx-danger mb-3">
                  <FaExclamationTriangle />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Exam Name */}
                <motion.div
                  custom={0}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInVariants}
                  className="field-group"
                >
                  <label className="field-label">Exam Name *</label>
                  <input
                    type="text"
                    className={`field-input ${validationErrors.name ? "is-invalid" : ""}`}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Mid-Term Examination"
                    disabled={loading}
                  />
                  {validationErrors.name && (
                    <div className="field-feedback">{validationErrors.name}</div>
                  )}
                </motion.div>

                {/* Course Selection */}
                <motion.div
                  custom={1}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInVariants}
                  className="field-group"
                >
                  <label className="field-label">
                    <FaGraduationCap className="field-label-icon" />
                    Course *
                  </label>
                  <select
                    className={`field-input ${validationErrors.course_id ? "is-invalid" : ""}`}
                    name="course_id"
                    value={formData.course_id}
                    onChange={handleInputChange}
                    disabled={loading || loadingCourses}
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                  {validationErrors.course_id && (
                    <div className="field-feedback">{validationErrors.course_id}</div>
                  )}
                </motion.div>

                {/* Semester Selection */}
                <motion.div
                  custom={2}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInVariants}
                  className="field-group"
                >
                  <label className="field-label">
                    <FaLayerGroup className="field-label-icon" />
                    Semester *
                  </label>
                  <select
                    className={`field-input ${validationErrors.semester ? "is-invalid" : ""}`}
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    disabled={loading || !formData.course_id}
                  >
                    <option value="">Select Semester</option>
                    {selectedCourse &&
                      Array.from({ length: selectedCourse.durationSemesters }, (_, i) => i + 1).map(
                        (sem) => (
                          <option key={sem} value={sem}>
                            Semester {sem}
                          </option>
                        )
                      )}
                  </select>
                  {validationErrors.semester && (
                    <div className="field-feedback">{validationErrors.semester}</div>
                  )}
                </motion.div>

                {/* Academic Year */}
                <motion.div
                  custom={3}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInVariants}
                  className="field-group"
                >
                  <label className="field-label">
                    <FaCalendarAlt className="field-label-icon" />
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    className={`field-input ${validationErrors.academicYear ? "is-invalid" : ""}`}
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleInputChange}
                    placeholder="e.g. 2026-27"
                    disabled={loading}
                  />
                  {validationErrors.academicYear && (
                    <div className="field-feedback">{validationErrors.academicYear}</div>
                  )}
                </motion.div>

                {/* Subject Selection */}
                <motion.div
                  custom={4}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInVariants}
                  className="field-group"
                >
                  <label className="field-label">Subjects *</label>
                  {!formData.course_id || !formData.semester ? (
                    <div className="alert-edx alert-edx-info">
                      <FaInfoCircle />
                      Please select a course and semester first to load available subjects.
                    </div>
                  ) : loadingSubjects ? (
                    <div className="text-center py-4" style={{ color: "var(--edx-slate-600)" }}>
                      <FaSpinner className="spin me-2" />
                      Loading subjects...
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="alert-edx alert-edx-warning">
                      <FaExclamationTriangle />
                      No subjects found for the selected course and semester.
                    </div>
                  ) : (
                    <div className="subject-list">
                      {subjects.map((subject) => {
                        const isSelected = formData.subjects.includes(subject._id);
                        return (
                          <div
                            key={subject._id}
                            className={`subject-item ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleSubject(subject._id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSubject(subject._id)}
                              disabled={loading}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="subject-item-icon">
                              <FaBook />
                            </div>
                            <div className="subject-main">
                              <div className="subject-top-row">
                                <div>
                                  <span className="subject-name">{subject.name}</span>
                                  <span className="pill pill-slate">{subject.code}</span>
                                  <span className="pill pill-cyan">{subject.subjectType || "N/A"}</span>
                                </div>
                                <span className="subject-credits">
                                  <FaAward />
                                  {subject.credits} credits
                                </span>
                              </div>
                              {subject.teacher_id?.name && (
                                <div className="subject-teacher">
                                  <FaChalkboardTeacher />
                                  {subject.teacher_id.name}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {validationErrors.subjects && (
                    <div className="field-feedback">{validationErrors.subjects}</div>
                  )}
                </motion.div>

                {/* Actions */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-edx-outline"
                    onClick={() => navigate("/dashboard/exam")}
                    disabled={loading}
                  >
                    <FaArrowLeft />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-edx-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        Create Exam
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}