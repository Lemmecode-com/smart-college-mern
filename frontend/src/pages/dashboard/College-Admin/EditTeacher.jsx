import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaChalkboardTeacher,
  FaArrowLeft,
  FaSave
} from "react-icons/fa";

export default function EditTeacher() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    designation: "",
    qualification: "",
    experienceYears: "",
    department_id: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teacherRes, deptRes] = await Promise.all([
          api.get(`/teachers/${id}`),
          api.get("/departments")
        ]);

        const t = teacherRes.data;

        setFormData({
          name: t.name,
          email: t.email,
          employeeId: t.employeeId,
          designation: t.designation,
          qualification: t.qualification,
          experienceYears: t.experienceYears,
          department_id: t.department_id?._id || t.department_id
        });

        setDepartments(deptRes.data);
      } catch {
        setError("Failed to load teacher data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.put(`/teachers/${id}`, {
        ...formData,
        experienceYears: Number(formData.experienceYears)
      });

      navigate("/teachers");
    } catch (err) {
      setError(
        err.response?.data?.message || "Update failed"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white">
        <h3 className="fw-bold mb-1">
          <FaChalkboardTeacher className="blink me-2" />
          Edit Teacher
        </h3>
        <p className="opacity-75 mb-0">
          Update faculty details
        </p>
      </div>

      {/* ================= ERROR ================= */}
      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit}>
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body p-4">
            <div className="row g-3">

              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} />
              <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
              <Input label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} />
              <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} />
              <Input label="Qualification" name="qualification" value={formData.qualification} onChange={handleChange} />
              <Input label="Experience (Years)" name="experienceYears" type="number" value={formData.experienceYears} onChange={handleChange} />

              {/* Department Dropdown */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Department
                </label>
                <select
                  className="form-select"
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* ================= FOOTER ================= */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center p-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/teachers")}
            >
              <FaArrowLeft className="me-1" />
              Cancel
            </button>

            <button
              className="btn btn-primary px-4 rounded-pill"
              disabled={saving}
            >
              <FaSave className="me-1" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.85);
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
        `}
      </style>
    </div>
  );
}

/* ================= INPUT COMPONENT ================= */
function Input({ label, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label fw-semibold">{label}</label>
      <input
        className="form-control"
        {...props}
        required
      />
    </div>
  );
}
