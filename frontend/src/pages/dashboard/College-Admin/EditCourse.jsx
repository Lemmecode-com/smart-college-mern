import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

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

  /* ================= STATE ================= */
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD COURSE ================= */
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await api.get(`/courses/${id}`);
        setFormData(res.data);
      } catch {
        setError("Course not found");
      } finally {
        setLoading(false);
      }
    };
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

    try {
      await api.put(`/courses/${id}`, {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        status: formData.status,
        programLevel: formData.programLevel,
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        maxStudents: Number(formData.maxStudents)
      });

      navigate("/courses");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to update course"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (!formData) {
    return <div className="text-danger">Course not found</div>;
  }

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4">
        <h3 className="fw-bold">
          <FaBookOpen className="blink me-2" />
          Edit Course
        </h3>
        <p className="opacity-75 mb-0">
          Update course details
        </p>
      </div>

      {/* ERROR */}
      {error && (
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

              <Input label="Semester" type="number" name="semester" value={formData.semester} onChange={handleChange} />
              <Input label="Credits" type="number" name="credits" value={formData.credits} onChange={handleChange} />
              <Input label="Max Students" type="number" name="maxStudents" value={formData.maxStudents} onChange={handleChange} />
            </div>

          </div>

          {/* FOOTER */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between p-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/courses")}
            >
              <FaArrowLeft className="me-1" />
              Back
            </button>

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
