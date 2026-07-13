import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import ApiError from "../../../components/ApiError";
import { logger } from "../../../utils/logger";

import { FaBookOpen, FaSave, FaArrowLeft } from "react-icons/fa";

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

      const departmentId = subject.department_id?._id || subject.department_id;

      const [courseRes, teacherRes] = await Promise.all([
        departmentId
          ? api.get(`/courses/department/${departmentId}`)
          : Promise.resolve({ data: [] }),
        api.get("/teachers"),
      ]);

      const teachersData = teacherRes.data.data || teacherRes.data || [];

      setFormData({
        course_id: subject.course_id?._id || subject.course_id,
        name: subject.name || "",
        code: subject.code || "",
        semester: subject.semester || "",
        credits: subject.credits || "",
        teacher_id: subject.teacher_id?._id || subject.teacher_id || "",
      });

      setCourses(courseRes.data || []);
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
      await api.put(`/subjects/${id}`, {
        ...formData,
        semester: Number(formData.semester),
        credits: Number(formData.credits),
      });

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
    return <Loading fullScreen size="lg" text="Loading subject details..." />;
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

  return (
    <div className="container-fluid">
      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4">
        <h3 className="fw-bold">
          <FaBookOpen className="me-2" />
          Edit Subject
        </h3>
        <p className="opacity-75 mb-0">Update subject details</p>
      </div>

      {error && typeof error === 'string' && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4">
          <div className="card-body p-4">
            <div className="row g-3">
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
                options={teachers.map((t) => ({
                  value: t._id,
                  label: `${t.name} (${t.designation})`,
                }))}
              />
            </div>
          </div>

          <div className="card-footer bg-white border-0 d-flex justify-content-between p-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate(`/subjects/course/${formData.course_id}`)}
            >
              <FaArrowLeft className="me-1" />
              Back
            </button>

            <button className="btn btn-success px-4" disabled={saving}>
              <FaSave className="me-1" />
              {saving ? "Updating..." : "Update Subject"}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
      `}</style>
    </div>
  );
}

/* INPUT */
function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input className="form-control" {...props} required />
    </div>
  );
}

/* SELECT */
function Select({ label, options, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <select className="form-control" {...props} required>
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}