import { useContext, useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUserTie,
  FaEnvelope,
  FaIdBadge,
  FaBriefcase,
  FaGraduationCap,
  FaClock,
  FaBuilding,
  FaCheckCircle,
  FaArrowLeft
} from "react-icons/fa";

export default function ViewTeacher() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (!["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(user.role))
    return <Navigate to="/" />;

  /* ================= FETCH TEACHER ================= */
  const fetchTeacher = async () => {
    try {
      const res = await api.get(`/teachers/${id}`);
      setTeacher(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load teacher profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacher();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Teacher Profile...</h5>
      </div>
    );
  }

  if (error) return <div className="alert alert-danger text-center">{error}</div>;
  if (!teacher)
    return <div className="alert alert-warning text-center">No teacher found</div>;

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold mb-1">
            <FaUserTie className="me-2" />
            Teacher Full Profile
          </h3>
          <p className="opacity-75 mb-0">
            Complete faculty information
          </p>
        </div>

        <button className="btn btn-light fw-semibold" onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-2" />
          Back
        </button>
      </div>

      {/* ================= MAIN CARD ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          {/* ================= BASIC ================= */}
          <div className="text-center mb-4">
            <div className="profile-circle">
              <FaUserTie />
            </div>
            <h4 className="fw-bold mt-3">{teacher.name}</h4>
            <span
              className={`badge ${
                teacher.status === "ACTIVE" ? "bg-success" : "bg-secondary"
              }`}
            >
              <FaCheckCircle className="me-1" />
              {teacher.status}
            </span>
          </div>

          {/* ================= DETAILS GRID ================= */}
          <div className="row g-4">

            <Info icon={<FaIdBadge />} label="Employee ID" value={teacher.employeeId} />
            <Info icon={<FaEnvelope />} label="Email" value={teacher.email} />
            <Info icon={<FaBriefcase />} label="Designation" value={teacher.designation} />
            <Info icon={<FaGraduationCap />} label="Qualification" value={teacher.qualification} />
            <Info icon={<FaClock />} label="Experience (Years)" value={teacher.experienceYears} />
            <Info icon={<FaBuilding />} label="College ID" value={teacher.college_id} />
            <Info icon={<FaBuilding />} label="Department ID" value={teacher.department_id} />
            <Info icon={<FaClock />} label="Created At" value={new Date(teacher.createdAt).toLocaleString()} />
            <Info icon={<FaClock />} label="Updated At" value={new Date(teacher.updatedAt).toLocaleString()} />

          </div>

        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>
        {`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }

        .glass-card {
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(8px);
        }

        .profile-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(180deg, #0f3a4a, #134952);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 40px;
          margin: auto;
        }
        `}
      </style>
    </div>
  );
}

/* ================= REUSABLE ================= */
function Info({ label, value, icon }) {
  return (
    <div className="col-md-4 col-sm-6">
      <div className="p-3 border rounded-3 h-100 text-center shadow-sm">
        <div className="fs-4 text-primary mb-1">{icon}</div>
        <h6 className="text-muted">{label}</h6>
        <h5 className="fw-bold">{value || "-"}</h5>
      </div>
    </div>
  );
}
