import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUserTie,
  FaUniversity,
  FaArrowLeft,
  FaCheckCircle
} from "react-icons/fa";

export default function AssignHod() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { departmentId } = useParams();

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= STATE ================= */
  const [department, setDepartment] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Department
        const deptRes = await api.get(`/departments/${departmentId}`);
        setDepartment(deptRes.data);

        // Teachers (same college)
        const teacherRes = await api.get("/teachers");

        // Filter teachers only of this department
        const filtered = teacherRes.data.filter(
          (t) => t.department_id?._id === departmentId
        );

        setTeachers(filtered);
      } catch (err) {
        setError("Failed to load department or teachers");
      }
    };

    fetchData();
  }, [departmentId]);

  /* ================= ASSIGN HOD ================= */
  const handleAssign = async () => {
    if (!teacherId) {
      return setError("Please select a teacher");
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.put(
        `/departments/${departmentId}/assign-hod`,
        {
          teacher_id: teacherId
        }
      );

      setSuccess(res.data.message);

      setTimeout(() => {
        navigate("/departments");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to assign HOD"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header mb-4 p-4 rounded-4 text-white">
        <h3 className="fw-bold mb-1">
          <FaUserTie className="blink me-2" />
          Assign Head Of Department
        </h3>
        <p className="opacity-75 mb-0">
          Select a teacher and assign as HOD
        </p>
      </div>

      {/* ================= ALERTS ================= */}
      {error && <div className="alert alert-danger">{error}</div>}

      {success && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <FaCheckCircle />
          {success}
        </div>
      )}

      {/* ================= CARD ================= */}
      {department && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body p-4">

            {/* Department Info */}
            <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2">
              <FaUniversity />
              Department Details
            </h5>

            <div className="row mb-4">
              <div className="col-md-6">
                <p><strong>Name:</strong> {department.name}</p>
                <p><strong>Code:</strong> {department.code}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Status:</strong> {department.status}</p>
                <p>
                  <strong>Current HOD:</strong>{" "}
                  {department.hod_id ? "Assigned" : "Not Assigned"}
                </p>
              </div>
            </div>

            {/* Teacher Dropdown */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                Select Teacher
              </label>
              <select
                className="form-select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">Select Teacher</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} - {t.designation}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ================= FOOTER ================= */}
          <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center p-3">
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate("/departments")}
            >
              <FaArrowLeft className="me-1" />
              Back
            </button>

            <button
              className="btn btn-success px-4 rounded-pill"
              disabled={loading}
              onClick={handleAssign}
            >
              {loading ? "Assigning..." : "Assign HOD"}
            </button>
          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>
        {`
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

        .form-select:focus {
          box-shadow: 0 0 0 0.2rem rgba(15,58,74,0.25);
          border-color: #0f3a4a;
        }
        `}
      </style>
    </div>
  );
}
