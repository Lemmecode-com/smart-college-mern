import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import Breadcrumb from "../../../components/Breadcrumb";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import {
  FaBookOpen,
  FaSave,
  FaArrowLeft
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
    return <Loading fullScreen size="lg" text="Loading course details..." />;
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
    <div className="container-fluid">
      {/* ================= BREADCRUMB ================= */}
    <div
      className="edit-course-breadcrumb"
      style={{
        width: "100%",
        margin: "10px auto",
        paddingTop: "5px",
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

 <div className="page-header">
  <div className="page-header__content">

    <div className="page-header__left">

      <div className="page-header__icon-wrapper">
        <FaBookOpen />
      </div>

      <div className="page-header__info">
        <h1 className="page-header__title">
          Edit Course
        </h1>

        <p className="page-header__subtitle">
          Update course details
        </p>
      </div>

    </div>

    <div className="page-header__right">
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => navigate("/courses")}
      >
        <FaArrowLeft size={15} />
        <span>Back</span>
      </button>
    </div>

  </div>
</div>

      {/* ERROR */}
      {error && typeof error === 'string' && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4">
          <div className="card-body p-4">

            <div className="row g-3">
              <Input label="Course Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Course Code" name="code" value={formData.code} onChange={handleChange} />

              <Select label="Type" name="type" value={formData.type} onChange={handleChange}
                options={["THEORY", "PRACTICAL", "BOTH"]} />

              <Select label="Status" name="status" value={formData.status} onChange={handleChange}
                options={["ACTIVE", "INACTIVE"]} />

              <Select label="Program Level" name="programLevel" value={formData.programLevel} onChange={handleChange}
                options={["UG", "PG", "DIPLOMA", "PHD"]} />

              <Input label="Program Duration (Semesters)" type="number" name="durationSemesters" value={formData.durationSemesters} onChange={handleChange} min="1" max="8" />
              <Input label="Credits" type="number" name="credits" value={formData.credits} onChange={handleChange} />
              <Input label="Max Students" type="number" name="maxStudents" value={formData.maxStudents} onChange={handleChange} min="1" step="1" />
            </div>

          </div>

          {/* FOOTER */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between p-3">
            {/* <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/courses")}
            >
              <FaArrowLeft className="me-1" />
              Back
            </button> */}

            <button
              className="btn btn-success px-4"
              disabled={saving}
            >
              <FaSave className="me-1" />
              {saving ? "Updating..." : "Update Course"}
            </button>
          </div>
        </div>
      </form>

      {/* CSS */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% {opacity:1}
          50% {opacity:0.4}
          100% {opacity:1}
        }
          .page-header {
  width: 100%;
  margin-bottom: 1.25rem;
  padding: 1.25rem 1.5rem;

  background: #0E3746;
  border-radius: 15px;

  color: #ffffff;

  box-shadow: 0 8px 24px rgba(15, 69, 83, 0.18);
}

.page-header__content {
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 1.5rem;
}

.page-header__left {
  display: flex;
  align-items: center;

  gap: 1rem;
  min-width: 0;
}

.page-header__icon-wrapper {
  width: 52px;
  height: 52px;
  

  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.08);

  border-radius: 50%;

  color: #ffffff;
  font-size: 1.45rem;
}

.page-header__info {
  min-width: 0;
}

.page-header__title {
  margin: 0;

  color: #ffffff;

  font-size: 1.65rem;
  font-weight: 700;
  line-height: 1.2;

  letter-spacing: -0.02em;
}

.page-header__subtitle {
  margin: 0.35rem 0 0;

  color: rgba(255, 255, 255, 0.75);

  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.4;
}

.page-header__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;

  flex-shrink: 0;
}
  .btn {
  height: 42px;
  min-height: 42px;

  padding: 0 1.1rem;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  gap: 0.5rem;

  border-radius: 10px;

  font-size: 0.85rem;
  font-weight: 600;

  cursor: pointer;
  white-space: nowrap;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.btn--secondary {
  background: rgba(255, 255, 255, 0.12);

  border: 1px solid rgba(255, 255, 255, 0.22);

  color: #ffffff;
}

.btn--secondary:hover {
  background: rgba(255, 255, 255, 0.18);

  border-color: rgba(255, 255, 255, 0.28);

  color: #ffffff;

  transform: translateY(-2px);

  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.btn--secondary:active {
  transform: translateY(0);
  box-shadow: none;
}
      `}</style>
    </div>
  );
}

/* INPUT */
function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">
        {label}
      </label>
      <input
        className="form-control"
        {...props}
        required
      />
    </div>
  );
}

/* SELECT */
function Select({ label, options, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">
        {label}
      </label>
      <select className="form-control" {...props}>
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
