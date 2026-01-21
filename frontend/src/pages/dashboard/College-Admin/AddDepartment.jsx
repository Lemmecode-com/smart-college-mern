import { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBuilding,
  FaSave,
  FaArrowLeft,
  FaCheckCircle
} from "react-icons/fa";

export default function AddDepartment() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "ACADEMIC",
    status: "ACTIVE",
    programsOffered: [],
    startYear: "",
    sanctionedFacultyCount: "",
    sanctionedStudentIntake: ""
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckbox = (program) => {
    setFormData((prev) => ({
      ...prev,
      programsOffered: prev.programsOffered.includes(program)
        ? prev.programsOffered.filter((p) => p !== program)
        : [...prev.programsOffered, program]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await api.post("/departments", {
        ...formData,
        startYear: Number(formData.startYear),
        sanctionedFacultyCount: Number(formData.sanctionedFacultyCount),
        sanctionedStudentIntake: Number(formData.sanctionedStudentIntake)
      });

      setSuccess(res.data);

      setTimeout(() => {
        navigate("/departments");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow mb-4">
        <h3>
          <FaBuilding className="blink me-2" />
          Add New Department
        </h3>
        <p className="opacity-75 mb-0">
          Create academic department for your college
        </p>
      </div>

      {/* ALERTS */}
      {error && <div className="alert alert-danger">{error}</div>}

      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <FaCheckCircle />
          Department created successfully!
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="card glass-card shadow-lg border-0 rounded-4">
          <div className="card-body p-4">

            <div className="row g-3 mb-3">
              <Input label="Department Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Department Code" name="code" value={formData.code} onChange={handleChange} />
            </div>

            <div className="row g-3 mb-3">
              <Select label="Type" name="type" value={formData.type} onChange={handleChange}>
                <option value="ACADEMIC">Academic</option>
                <option value="ADMINISTRATIVE">Administrative</option>
              </Select>

              <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Programs Offered</label>
              <div className="d-flex gap-3">
                {["UG", "PG", "Diploma", "PhD"].map((p) => (
                  <div key={p} className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={formData.programsOffered.includes(p)}
                      onChange={() => handleCheckbox(p)}
                    />
                    <label className="form-check-label">{p}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="row g-3">
              <Input label="Start Year" type="number" name="startYear" value={formData.startYear} onChange={handleChange} />
              <Input label="Faculty Count" type="number" name="sanctionedFacultyCount" value={formData.sanctionedFacultyCount} onChange={handleChange} />
              <Input label="Student Intake" type="number" name="sanctionedStudentIntake" value={formData.sanctionedStudentIntake} onChange={handleChange} />
            </div>
          </div>

          {/* FOOTER */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between p-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/departments")}
            >
              <FaArrowLeft /> Back
            </button>

            <button
              className="btn btn-success rounded-pill px-4"
              disabled={loading}
            >
              <FaSave /> {loading ? "Saving..." : "Create"}
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

        .form-control, .form-select {
          transition: 0.3s;
        }

        .form-control:focus, .form-select:focus {
          box-shadow: 0 0 0 0.2rem rgba(15,58,74,0.25);
        }
      `}</style>
    </div>
  );
}

/* REUSABLE INPUT */
function Input({ label, ...props }) {
  return (
    <div className="col-md-4">
      <label className="form-label fw-semibold">{label}</label>
      <input className="form-control" {...props} required />
    </div>
  );
}

/* REUSABLE SELECT */
function Select({ label, children, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <select className="form-select" {...props}>
        {children}
      </select>
    </div>
  );
}
