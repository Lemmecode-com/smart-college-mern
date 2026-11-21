import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import PageHeader from "../../../components/PageHeader";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import {
  FaBookOpen,
  FaSave,
  FaArrowLeft,
  FaExclamationTriangle,
  FaUsers,
} from "react-icons/fa";

export default function EditCourse() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD COURSE ================= */
  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setFormData(res.data.course);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      const backendMessage = err.response?.data?.message;
      const errorMessage = statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))
        ? "Authentication error occurred."
        : backendMessage || "Course not found";

      logger.error("Error fetching course:", statusCode, errorCode);
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
    fetchCourse();
  }, [id]);

  /* ================= HANDLER ================= */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /* ================= UPDATE ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const maxStudentsNum = Number(formData.maxStudents);
    if (
      formData.maxStudents === "" ||
      !Number.isInteger(maxStudentsNum) ||
      maxStudentsNum <= 0
    ) {
      setError("Maximum Students must be greater than 0");
      setSaving(false);
      return;
    }

    try {
      await api.put(`/courses/${id}`, {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        status: formData.status,
        programLevel: formData.programLevel,
        durationSemesters: Number(formData.durationSemesters),
        credits: Number(formData.credits),
        maxStudents: Number(formData.maxStudents)
      });

      navigate("/courses");
    } catch (err) {
      const statusCode = err.response?.status;
      const errorCode = err.response?.data?.code;
      if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
        logger.error("Auth error updating course:", statusCode, errorCode);
        setError({
          message: "Authentication error occurred.",
          statusCode,
          errorCode,
        });
      } else {
        setError(
          err.response?.data?.message ||
          "Failed to update course"
        );
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
          text="Loading Course Details..."
        />
      </div>
    </div>
  );
}

  if (error && typeof error === 'object') {
    return (
      <ApiError
        title="Course Loading Error"
        message={error.message}
        statusCode={error.statusCode}
        errorCode={error.errorCode}
        onRetry={fetchCourse}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (!formData) {
    return <div className="text-danger">Course not found</div>;
  }

  return (
    <div className="container-fluid pt-2 edit-course-page">
      {/* ================= BREADCRUMB ================= */}
    <div
      className="edit-course-breadcrumb"
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
            { label: "Courses", path: "/courses" },
            { label: "Edit Course" },
          ]}
        />
      </div>
    </div>

    {/* PAGE HEADER */}
    <PageHeader
      icon={FaBookOpen}
      title="Edit Course"
      subtitle="Update course details"
      actions={
        <button
          type="button"
          onClick={() => navigate("/courses")}
          aria-label="Back to courses"
          title="Back to courses"
          style={{
                    minHeight: "48px",
                    padding: "0 20px",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
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
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 4px 10px rgba(0, 0, 0, 0.15)";
            e.currentTarget.style.background =
              "rgba(255, 255, 255, 0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.background =
              "rgba(255, 255, 255, 0.12)";
          }}
        >
          <FaArrowLeft size={15} />
          <span>Back</span>
        </button>
      }
    />

      {/* ERROR */}
      {error && typeof error === 'string' && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="ec-form">
        {/* ============ COURSE INFORMATION ============ */}
        <section className="ec-section">
          <header className="ec-section-head">
            <span className="ec-section-icon"><FaBookOpen /></span>
            <div className="ec-section-text">
              <h3 className="ec-section-title">Course Information</h3>
              <p className="ec-section-subtitle">Basic course details and academic classification</p>
            </div>
          </header>
          <div className="ec-divider" />
          <div className="ec-grid">
            <Input label="Course Name" name="name" value={formData.name} onChange={handleChange} />
            <Input label="Course Code" name="code" value={formData.code} onChange={handleChange} />

            <Select label="Type" name="type" value={formData.type} onChange={handleChange}
              options={["THEORY", "PRACTICAL", "BOTH"]} />

            <Select label="Status" name="status" value={formData.status} onChange={handleChange}
              options={["ACTIVE", "INACTIVE"]} />

            <Select label="Program Level" name="programLevel" value={formData.programLevel} onChange={handleChange}
              options={["UG", "PG", "DIPLOMA", "PHD"]} />

            <div className="ec-field">
              <label className="ec-label">Program Duration (Semesters)</label>
              <input
                type="number"
                className="ec-input"
                name="durationSemesters"
                value={formData.durationSemesters}
                onChange={handleChange}
                min="1"
                max="8"
                required
              />
              {(() => {
                const semNum = Number(formData.durationSemesters);
                const years = formData.durationYears ? Number(formData.durationYears) : Math.ceil(semNum / 2);
                if (!semNum || isNaN(semNum)) return null;

                let warningMsg = null;
                if (formData.durationYears && semNum < 2 * Number(formData.durationYears)) {
                  warningMsg = `Warning: Duration (${semNum} semesters) is less than 2 × durationYears (${2 * Number(formData.durationYears)} semesters).`;
                } else if (semNum <= 2) {
                  warningMsg = `Warning: ${semNum} semester(s) (${years} year) is unusually low. Degree programs like B.Tech typically require 8 semesters (4 years). Please verify you did not enter years instead of semesters.`;
                } else if (formData.programLevel === "UG" && semNum < 6) {
                  warningMsg = `Warning: ${semNum} semester(s) is lower than typical undergraduate programs (usually 6–8 semesters).`;
                }

                if (!warningMsg) return null;
                return (
                  <div className="ec-warning">
                    <FaExclamationTriangle className="ec-warning-icon" />
                    <span>{warningMsg}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* ============ ACADEMIC CAPACITY ============ */}
        <section className="ec-section">
          <header className="ec-section-head">
            <span className="ec-section-icon ec-section-icon--capacity"><FaUsers /></span>
            <div className="ec-section-text">
              <h3 className="ec-section-title">Academic Capacity</h3>
              <p className="ec-section-subtitle">Manage course credits and student enrollment limits</p>
            </div>
          </header>
          <div className="ec-divider" />
          <div className="ec-grid">
            <Input label="Credits" type="number" name="credits" value={formData.credits} onChange={handleChange} />
            <Input label="Max Students" type="number" name="maxStudents" value={formData.maxStudents} onChange={handleChange} min="1" step="1" />
          </div>
        </section>

        {/* ============ COURSE OVERVIEW ============ */}
        <div className="ec-overview">
          <div className="ec-overview-item">
            <span className="ec-overview-label">Credits</span>
            <span className="ec-overview-value">{formData.credits ?? "—"}</span>
          </div>
          <div className="ec-overview-item">
            <span className="ec-overview-label">Program Duration</span>
            <span className="ec-overview-value">{formData.durationSemesters ? `${formData.durationSemesters} sem` : "—"}</span>
          </div>
          <div className="ec-overview-item">
            <span className="ec-overview-label">Max Student Capacity</span>
            <span className="ec-overview-value">{formData.maxStudents ?? "—"}</span>
          </div>
        </div>

        {/* ============ ACTIONS ============ */}
        <div className="ec-actions">
          <button className="ec-btn ec-btn-update" disabled={saving}>
            <FaSave />
            {saving ? "Updating..." : "Update Course"}
          </button>
        </div>
      </form>

      <style>{`
        .edit-course-page {
          --ec-navy: #0E3746;
          --ec-navy-2: #164E63;
          --ec-accent: #22B8E6;
          --ec-accent-soft: #e8f7fd;
          --ec-border: #DCE6EF;
          --ec-text: #0f2b3a;
          --ec-muted: #5b7183;
          --ec-radius: 14px;
          --ec-shadow: 0 1px 2px rgba(16,42,60,.05), 0 8px 24px rgba(16,42,60,.06);
        }

        .edit-course-page .ec-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .edit-course-page .ec-section {
          background: #ffffff;
          border: 1px solid var(--ec-border);
          border-radius: var(--ec-radius);
          box-shadow: var(--ec-shadow);
          padding: 1.35rem 1.5rem 1.5rem;
        }

        .edit-course-page .ec-section-head {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin-bottom: 0.85rem;
        }

        .edit-course-page .ec-section-icon {
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          color: var(--ec-accent);
          background: var(--ec-accent-soft);
          border: 1px solid #c6e7f7;
        }

        .edit-course-page .ec-section-icon--capacity {
          color: var(--ec-navy);
          background: #eef0fe;
          border-color: #dcd9fb;
        }

        .edit-course-page .ec-section-text {
          min-width: 0;
        }

        .edit-course-page .ec-section-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--ec-navy);
          line-height: 1.2;
        }

        .edit-course-page .ec-section-subtitle {
          margin: 0.15rem 0 0;
          font-size: 0.78rem;
          color: var(--ec-muted);
        }

        .edit-course-page .ec-divider {
          height: 1px;
          background: var(--ec-border);
          margin: 0.85rem 0 1.15rem;
        }

        .edit-course-page .ec-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem 1.25rem;
        }

        .edit-course-page .ec-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          min-width: 0;
        }

        .edit-course-page .ec-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--ec-text);
          letter-spacing: 0.01em;
        }

        .edit-course-page .ec-input,
        .edit-course-page .ec-select {
          width: 100%;
          height: 42px;
          padding: 0 0.85rem;
          border: 1.5px solid var(--ec-border);
          border-radius: 10px;
          background: #f7fafc;
          font-family: inherit;
          font-size: 0.88rem;
          color: var(--ec-text);
          transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .edit-course-page .ec-input:focus,
        .edit-course-page .ec-select:focus {
          outline: none;
          border-color: var(--ec-accent);
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(34, 184, 230, 0.14);
        }

        .edit-course-page .ec-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.85rem center;
          padding-right: 2.4rem;
          cursor: pointer;
        }

        .edit-course-page .ec-warning {
          margin-top: 0.5rem;
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          padding: 0.6rem 0.75rem;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          color: #92400e;
          font-size: 0.78rem;
          line-height: 1.45;
        }

        .edit-course-page .ec-warning-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .edit-course-page .ec-overview {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          background: #eef3f8;
          border: 1px solid var(--ec-border);
          border-radius: 10px;
        }

        .edit-course-page .ec-overview-item {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0 0.6rem;
          border-right: 1px solid var(--ec-border);
        }

        .edit-course-page .ec-overview-item:last-child {
          border-right: none;
        }

        .edit-course-page .ec-overview-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ec-muted);
        }

        .edit-course-page .ec-overview-value {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--ec-navy);
          line-height: 1.1;
        }

        .edit-course-page .ec-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 0.25rem;
        }

        .edit-course-page .ec-btn {
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

        .edit-course-page .ec-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .edit-course-page .ec-btn-update {
          background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(21, 128, 61, 0.28);
        }

        .edit-course-page .ec-btn-update:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(21, 128, 61, 0.36);
        }

        /* ---- Responsive ---- */
        @media (max-width: 768px) {
          .edit-course-page .ec-grid {
            grid-template-columns: 1fr;
          }

          .edit-course-page .ec-overview {
            grid-template-columns: 1fr;
          }

          .edit-course-page .ec-overview-item {
            border-right: none;
            border-bottom: 1px solid var(--ec-border);
            padding-bottom: 0.5rem;
          }

          .edit-course-page .ec-overview-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }

          .edit-course-page .ec-actions {
            justify-content: stretch;
          }

          .edit-course-page .ec-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .edit-course-page .ec-section {
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
    <div className="ec-field">
      <label className="ec-label">{label}</label>
      <input className="ec-input" {...props} required />
    </div>
  );
}

/* SELECT */
function Select({ label, options, ...props }) {
  return (
    <div className="ec-field">
      <label className="ec-label">{label}</label>
      <select className="ec-select" {...props}>
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
