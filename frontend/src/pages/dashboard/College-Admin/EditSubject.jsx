import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import { FaBookOpen, FaSave, FaArrowLeft, FaGraduationCap } from "react-icons/fa";

export default function EditSubject() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

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

  /* ================= STATE ================= */
  const [formData, setFormData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departmentId, setDepartmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD DATA ================= */
  const fetchData = async () => {
    try {
      const subjectRes = await api.get(`/subjects/${id}`);
      const subject = subjectRes.data;

      if (!subject) {
        setFormData(null);
        return;
      }

      const departmentId =
        subject.department_id?._id || subject.department_id;

      setDepartmentId(departmentId || null);

      const [courseRes, teacherRes] = await Promise.all([
        departmentId
          ? api.get(`/courses/department/${departmentId}`)
          : Promise.resolve({ data: [] }),
        departmentId
          ? api.get(`/teachers/department/${departmentId}`)
          : Promise.resolve({ data: { teachers: [] } }),
      ]);

      const coursesData = Array.isArray(courseRes.data)
        ? courseRes.data
        : courseRes.data?.courses || [];

      const teachersData =
        teacherRes.data?.teachers || teacherRes.data || [];

      setFormData({
        course_id: subject.course_id?._id || subject.course_id,
        name: subject.name || "",
        code: subject.code || "",
        semester: subject.semester || "",
        credits: subject.credits || "",
        teacher_id: subject.teacher_id?._id || subject.teacher_id || "",
        subjectType: subject.subjectType || "",
        internalMaxMarks: subject.internalMaxMarks ?? "",
        externalMaxMarks: subject.externalMaxMarks ?? "",
        internalPassMarks: subject.internalPassMarks ?? "",
        externalPassMarks: subject.externalPassMarks ?? "",
        passMarks: subject.passMarks ?? "",
      });

      setCourses(coursesData);
      setTeachers(teachersData);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
        ? "Authentication error occurred."
        : backendMessage || "Failed to load subject data";

      logger.error("Error fetching subject:", statusCode, errorCode);
      setError({
        message: errorMessage,
        statusCode,
        errorCode,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  /* ================= HANDLER ================= */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        course_id: formData.course_id,
        name: formData.name,
        code: formData.code,
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        teacher_id: formData.teacher_id || undefined,
      };

      // Only include exam / marks configuration when a subjectType is set,
      // so subjects without config keep their existing (empty) state.
      if (formData.subjectType) {
        payload.subjectType = formData.subjectType;
        if (formData.internalMaxMarks !== "")
          payload.internalMaxMarks = Number(formData.internalMaxMarks);
        if (formData.externalMaxMarks !== "")
          payload.externalMaxMarks = Number(formData.externalMaxMarks);
        if (formData.internalPassMarks !== "")
          payload.internalPassMarks = Number(formData.internalPassMarks);
        if (formData.externalPassMarks !== "")
          payload.externalPassMarks = Number(formData.externalPassMarks);
        if (formData.passMarks !== "")
          payload.passMarks = Number(formData.passMarks);
      }

      await api.put(`/subjects/${id}`, payload);

      navigate(`/subjects/view/${id}`);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error updating subject:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        setError(err.response?.data?.message || "Failed to update subject");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div
          className="parent-portal-container parent-loading-container"
          style={{ minHeight: "70vh" }}
        >
          <Loading
            size="md"
            color="primary"
            text="Loading Subject Details..."
          />
        </div>
      </div>
    );
  }

  if (error && typeof error === 'object') {
    return (
      <ApiError
        title="Subject Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchData}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (!formData) {
    return <div className="text-danger text-center mt-5">Subject not found</div>;
  }

  /* ================= MARKS SUMMARY (derived, no API) ================= */
  const marksSummary = (() => {
    const st = formData.subjectType;
    const toNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    const iMax = toNum(formData.internalMaxMarks);
    const eMax = toNum(formData.externalMaxMarks);
    const iPass = toNum(formData.internalPassMarks);
    const ePass = toNum(formData.externalPassMarks);
    const pPass = toNum(formData.passMarks);
    if (st === "THEORY") {
      if (iMax === null || eMax === null || iPass === null || ePass === null) return null;
      const totalMax = iMax + eMax;
      const totalPass = iPass + ePass;
      return { totalMax, totalPass, remaining: totalMax - totalPass };
    }
    if (st === "PRACTICAL") {
      if (iMax === null || pPass === null) return null;
      return { totalMax: iMax, totalPass: pPass, remaining: iMax - pPass };
    }
    return null;
  })();

  return (
    <div className="container-fluid pt-2 edit-subject-page">
       <div
      className="edit-subject-breadcrumb"
      style={{
        width: "100%",
        margin: "0 auto",
        paddingTop: 0,
      }}
    >
      <div style={{ width: "100%" }}>
        <Breadcrumb
          items={[
            { label: "Dashboard", path: "/dashboard/college-admin" },
            { label: "Subjects", path: "/subjects" },
            { label: "Edit Subject" },
          ]}
        />
      </div>
    </div>


{/* HEADER */}


<PageHeader
  icon={FaBookOpen}
  title="Edit Subject"
  subtitle="Update subject details"
/>

      {error && typeof error === 'string' && 
      <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="es-form">
        {/* ============ BASIC SUBJECT INFORMATION ============ */}
        <section className="es-section">
          <header className="es-section-head">
            <span className="es-section-icon"><FaBookOpen /></span>
            <div className="es-section-text">
              <h3 className="es-section-title">Basic Subject Information</h3>
              <p className="es-section-subtitle">Course assignment and subject details</p>
            </div>
          </header>
          <div className="es-divider" />
          <div className="es-grid">
            <Select
              label="Course"
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              options={courses.map((c) => ({
                value: c._id,
                label: `${c.name} (${c.code})`,
              }))}
            />

            <Input
              label="Subject Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />

            <Input
              label="Subject Code"
              name="code"
              value={formData.code}
              onChange={handleChange}
            />

            <Input
              label="Semester"
              type="number"
              name="semester"
              value={formData.semester}
              onChange={handleChange}
            />

            <Input
              label="Credits"
              type="number"
              name="credits"
              value={formData.credits}
              onChange={handleChange}
            />

            <Select
              label="Teacher"
              name="teacher_id"
              value={formData.teacher_id}
              onChange={handleChange}
              options={(() => {
                const list = Array.isArray(teachers) ? teachers : [];
                const assignedId = formData.teacher_id;
                const assignedTeacher = list.find((t) => t._id === assignedId);
                const missingAssigned =
                  assignedId && !assignedTeacher
                    ? { _id: assignedId, name: "Currently Assigned Teacher", designation: "" }
                    : null;
                return [
                  ...list,
                  ...(missingAssigned ? [missingAssigned] : []),
                ].map((t) => ({
                  value: t._id,
                  label: `${t.name} (${t.designation})`,
                }));
              })()}
            />
          </div>
        </section>

        {/* ============ EXAM / MARKS CONFIGURATION ============ */}
        <section className="es-section">
          <header className="es-section-head">
            <span className="es-section-icon es-section-icon--config"><FaGraduationCap /></span>
            <div className="es-section-text">
              <h3 className="es-section-title">Exam &amp; Marks Configuration</h3>
              <p className="es-section-subtitle">Configure subject type and evaluation criteria</p>
            </div>
          </header>
          <div className="es-divider" />
          <div className="es-grid">
            <div className="es-field">
              <label className="es-label">Subject Type</label>
              <select
                className="es-select"
                name="subjectType"
                value={formData.subjectType}
                onChange={handleChange}
              >
                <option value="">Not configured</option>
                <option value="THEORY">THEORY</option>
                <option value="PRACTICAL">PRACTICAL</option>
              </select>
            </div>

            {formData.subjectType === "THEORY" && (
              <>
                <div className="es-field">
                  <label className="es-label">Internal Max Marks</label>
                  <input className="es-input" type="number" min="0" name="internalMaxMarks" value={formData.internalMaxMarks} onChange={handleChange} />
                </div>
                <div className="es-field">
                  <label className="es-label">External Max Marks</label>
                  <input className="es-input" type="number" min="0" name="externalMaxMarks" value={formData.externalMaxMarks} onChange={handleChange} />
                </div>
                <div className="es-field">
                  <label className="es-label">Internal Pass Marks</label>
                  <input className="es-input" type="number" min="0" name="internalPassMarks" value={formData.internalPassMarks} onChange={handleChange} />
                </div>
                <div className="es-field">
                  <label className="es-label">External Pass Marks</label>
                  <input className="es-input" type="number" min="0" name="externalPassMarks" value={formData.externalPassMarks} onChange={handleChange} />
                </div>
              </>
            )}

            {formData.subjectType === "PRACTICAL" && (
              <>
                <div className="es-field">
                  <label className="es-label">Applicable Maximum Marks</label>
                  <input className="es-input" type="number" min="0" name="internalMaxMarks" value={formData.internalMaxMarks} onChange={handleChange} />
                </div>
                <div className="es-field">
                  <label className="es-label">Pass Marks</label>
                  <input className="es-input" type="number" min="0" name="passMarks" value={formData.passMarks} onChange={handleChange} />
                </div>
              </>
            )}
          </div>

          {marksSummary && (
            <div className="es-summary">
              <div className="es-summary-item">
                <span className="es-summary-label">Total Maximum Marks</span>
                <span className="es-summary-value">{marksSummary.totalMax}</span>
              </div>
              <div className="es-summary-item">
                <span className="es-summary-label">Total Passing Marks</span>
                <span className="es-summary-value-green">{marksSummary.totalPass}</span>
              </div>
              <div className="es-summary-item">
                <span className="es-summary-label">Remaining Marks</span>
                <span className="es-summary-value">{marksSummary.remaining}</span>
              </div>
            </div>
          )}
        </section>

        {/* ============ ACTIONS ============ */}
        <div className="es-actions">
          <button
            type="button"
            className="es-btn es-btn-back"
            onClick={() => navigate(`/subjects/course/${formData.course_id}`)}
          >
            <FaArrowLeft />
            Back
          </button>

          <button className="es-btn es-btn-update" disabled={saving}>
            <FaSave />
            {saving ? "Updating..." : "Update Subject"}
          </button>
        </div>
      </form>

      <style>{`
        .edit-subject-page {
          --es-navy: #0E3746;
          --es-navy-2: #164E63;
          --es-accent: #22B8E6;
          --es-accent-soft: #e8f7fd;
          --es-border: #DCE6EF;
          --es-bg: #eef3f8;
          --es-text: #0f2b3a;
          --es-muted: #5b7183;
          --es-radius: 14px;
          --es-shadow: 0 1px 2px rgba(16,42,60,.05), 0 8px 24px rgba(16,42,60,.06);
        }

        .edit-subject-page .es-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .edit-subject-page .es-section {
          background: #ffffff;
          border: 1px solid var(--es-border);
          border-radius: var(--es-radius);
          box-shadow: var(--es-shadow);
          padding: 1.35rem 1.5rem 1.5rem;
        }

        .edit-subject-page .es-section-head {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 0.85rem;
        }

        .edit-subject-page .es-section-icon {
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          color: var(--es-accent);
          background: var(--es-accent-soft);
          border: 1px solid #c6e7f7;
        }

        .edit-subject-page .es-section-icon--config {
          color: var(--es-navy);
          background: #eef0fe;
          border-color: #dcd9fb;
        }

        .edit-subject-page .es-section-text {
          min-width: 0;
        }

        .edit-subject-page .es-section-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--es-navy);
          line-height: 1.2;
        }

        .edit-subject-page .es-section-subtitle {
          margin: 0.15rem 0 0;
          font-size: 0.78rem;
          color: var(--es-muted);
        }

        .edit-subject-page .es-divider {
          height: 1px;
          background: var(--es-border);
          margin: 0.85rem 0 1.15rem;
        }

        .edit-subject-page .es-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem 1.25rem;
        }

        .edit-subject-page .es-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }

        .edit-subject-page .es-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--es-text);
          letter-spacing: 0.01em;
        }

        .edit-subject-page .es-input,
        .edit-subject-page .es-select {
          width: 100%;
          height: 42px;
          padding: 0 0.85rem;
          border: 1.5px solid var(--es-border);
          border-radius: 10px;
          background: #f7fafc;
          font-family: inherit;
          font-size: 0.88rem;
          color: var(--es-text);
          transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .edit-subject-page .es-input:focus,
        .edit-subject-page .es-select:focus {
          outline: none;
          border-color: var(--es-accent);
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(34, 184, 230, 0.14);
        }

        .edit-subject-page .es-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.85rem center;
          padding-right: 2.4rem;
          cursor: pointer;
        }

        .edit-subject-page .es-summary {
          margin-top: 1.25rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          background: #eef3f8;
          border: 1px solid var(--es-border);
          border-radius: 10px;
        }

        .edit-subject-page .es-summary-item {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0 0.6rem;
          border-right: 1px solid var(--es-border);
        }

        .edit-subject-page .es-summary-item:last-child {
          border-right: none;
        }

        .edit-subject-page .es-summary-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--es-muted);
        }

        .edit-subject-page .es-summary-value {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--es-navy);
          line-height: 1.1;
        }
          .edit-subject-page .es-summary-value-green {
          font-size: 1.15rem;
          font-weight: 700;
          color: green;
          line-height: 1.1;
        }

        .edit-subject-page .es-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 0.25rem;
        }

        .edit-subject-page .es-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          height: 42px;
          padding: 0 1.25rem;
          border-radius: 10px;
          font-family: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
        }

        .edit-subject-page .es-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .edit-subject-page .es-btn-back {
          background: #f1f5f9;
          color: var(--es-text);
          border-color: var(--es-border);
        }

        .edit-subject-page .es-btn-back:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .edit-subject-page .es-btn-update {
          background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(21, 128, 61, 0.28);
        }

        .edit-subject-page .es-btn-update:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(21, 128, 61, 0.36);
        }

        /* ---- Responsive ---- */
        @media (max-width: 768px) {
          .edit-subject-page .es-grid {
            grid-template-columns: 1fr;
          }

          .edit-subject-page .es-summary {
            grid-template-columns: 1fr;
          }

          .edit-subject-page .es-summary-item {
            border-right: none;
            border-bottom: 1px solid var(--es-border);
            padding-bottom: 0.5rem;
          }

          .edit-subject-page .es-summary-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }

          .edit-subject-page .es-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }

          .edit-subject-page .es-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .edit-subject-page .es-section {
            padding: 1.1rem 1.15rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

/* INPUT */
function Input({ label, ...props }) {
  return (
    <div className="es-field">
      <label className="es-label">{label}</label>
      <input className="es-input" {...props} required />
    </div>
  );
}

/* SELECT */
function Select({ label, options, ...props }) {
  const isEmpty = options.length === 0;
  return (
    <div className="es-field">
      <label className="es-label">{label}</label>
      <select
        className="es-select"
        {...props}
        disabled={isEmpty}
        required
      >
        <option value="">
          {isEmpty ? "No teachers available" : `Select ${label}`}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}