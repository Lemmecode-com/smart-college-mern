import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBookOpen,
  FaSave,
  FaArrowLeft,
  FaLayerGroup
} from "react-icons/fa";

export default function AddCourse() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);

  const [formData, setFormData] = useState({
    department_id: "",
    name: "",
    code: "",
    type: "THEORY",
    status: "ACTIVE",
    programLevel: "UG",
    semester: "",
    credits: "",
    maxStudents: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /* ================= LOAD DEPARTMENTS ================= */
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        setDepartments(res.data);
      } catch {
        setDepartments([]);
      } finally {
        setLoadingDeps(false);
      }
    };

    fetchDepartments();
  }, []);

  /* ================= HANDLER ================= */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.department_id) {
      setError("Please select department");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/courses", {
        department_id: formData.department_id,
        name: formData.name,
        code: formData.code,
        type: formData.type,
        status: formData.status,
        programLevel: formData.programLevel,
        semester: Number(formData.semester),
        credits: Number(formData.credits),
        maxStudents: Number(formData.maxStudents)
      });

      setSuccess(true);

      setTimeout(() => {
        navigate(`/courses/${formData.department_id}`);
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to create course"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= LOADING ================= */
  if (loadingDeps) {
    return (
      <div className="text-center mt-5">
        Loading departments...
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4">
        <h3 className="fw-bold">
          <FaBookOpen className="blink me-2" />
          Add New Course
        </h3>
        <p className="opacity-75 mb-0">
          Select department and create course
        </p>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {success && (
        <div className="alert alert-success">
          Course created successfully!
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="card glass-card shadow-lg border-0 rounded-4">
          <div className="card-body p-4">

            <div className="row g-3">

              {/* DEPARTMENT DROPDOWN */}
              <div className="col-md-12">
                <label className="form-label fw-semibold">
                  <FaLayerGroup className="me-1 text-primary" />
                  Select Department
                </label>
                <select
                  className="form-control"
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    -- Select Department --
                  </option>
                  {departments.map((dep) => (
                    <option key={dep._id} value={dep._id}>
                      {dep.name} ({dep.code})
                    </option>
                  ))}
                </select>
              </div>

              <Input label="Course Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Course Code" name="code" value={formData.code} onChange={handleChange} />

              <Select label="Type" name="type" value={formData.type} onChange={handleChange}
                options={["THEORY", "PRACTICAL", "BOTH"]} />

              <Select label="Status" name="status" value={formData.status} onChange={handleChange}
                options={["ACTIVE", "INACTIVE"]} />

              <Select label="Program Level" name="programLevel" value={formData.programLevel} onChange={handleChange}
                options={["UG", "PG", "PHD"]} />

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
              disabled={loading}
            >
              <FaSave className="me-1" />
              {loading ? "Saving..." : "Create Course"}
            </button>
          </div>
        </div>
      </form>

      {/* CSS */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.95);
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
