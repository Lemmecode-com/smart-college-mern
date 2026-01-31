import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaBuilding,
  FaSave,
  FaArrowLeft,
  FaCheckCircle
} from "react-icons/fa";

export default function EditDepartment() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /* ================= FETCH DEPARTMENT ================= */
  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const res = await api.get(`/departments/${id}`);
        setFormData(res.data);
      } catch {
        setError("Failed to load department data");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, [id]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePrograms = (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      programsOffered: value.split(",")
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.put(`/departments/${id}`, {
        name: formData.name,
        code: formData.code,
        type: formData.type,
        status: formData.status,
        programsOffered: formData.programsOffered,
        startYear: Number(formData.startYear),
        sanctionedFacultyCount: Number(
          formData.sanctionedFacultyCount
        ),
        sanctionedStudentIntake: Number(
          formData.sanctionedStudentIntake
        )
      });

      setSuccess("Department updated successfully");

      setTimeout(() => {
        navigate("/departments");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Update failed"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <h5>Loading department...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* HEADER */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white">
        <h3 className="fw-bold mb-1">
          <FaBuilding className="blink me-2" />
          Edit Department
        </h3>
        <p className="opacity-75 mb-0">
          Update department information
        </p>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <FaCheckCircle />
          {success}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body p-4">

            <div className="row g-3">

              <Input
                label="Department Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />

              <Input
                label="Department Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
              />

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Type
                </label>
                <select
                  className="form-select"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="ACADEMIC">ACADEMIC</option>
                  <option value="ADMINISTRATIVE">
                    ADMINISTRATIVE
                  </option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Status
                </label>
                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <Input
                label="Programs Offered (comma separated)"
                value={formData.programsOffered.join(",")}
                onChange={handlePrograms}
              />

              <Input
                label="Start Year"
                type="number"
                name="startYear"
                value={formData.startYear}
                onChange={handleChange}
              />

              <Input
                label="Sanctioned Faculty Count"
                type="number"
                name="sanctionedFacultyCount"
                value={formData.sanctionedFacultyCount}
                onChange={handleChange}
              />

              <Input
                label="Sanctioned Student Intake"
                type="number"
                name="sanctionedStudentIntake"
                value={formData.sanctionedStudentIntake}
                onChange={handleChange}
              />

            </div>
          </div>

          {/* FOOTER */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center p-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/departments")}
            >
              <FaArrowLeft className="me-1" />
              Back
            </button>

            <button
              className="btn btn-success px-4 rounded-pill"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
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
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(10px);
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
          transition: all 0.3s ease;
        }

        .form-control:focus, .form-select:focus {
          box-shadow: 0 0 0 0.2rem rgba(15,58,74,0.25);
          border-color: #0f3a4a;
        }
      `}</style>
    </div>
  );
}

/* INPUT COMPONENT */
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
