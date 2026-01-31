import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBuilding,
  FaUsers
} from "react-icons/fa";

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH COLLEGE PROFILE ================= */
  useEffect(() => {
    const fetchCollege = async () => {
      try {
        setLoading(true);
        const res = await api.get("/college/my-college");
        setCollege(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load college profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCollege();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading College Profile...</h5>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  if (!college) {
    return (
      <div className="alert alert-warning text-center">
        College data not available
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUniversity className="me-2" />
          College Profile
        </h3>
        <p className="opacity-75 mb-0">
          Official college information
        </p>
      </div>

      {/* ================= COLLEGE DETAILS CARD ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body p-4">

          {/* College Name */}
          <div className="text-center mb-4">
            <FaBuilding className="fs-1 text-success" />
            <h4 className="fw-bold mt-2">{college.name}</h4>
            <span className={`badge ${college.isActive ? "bg-success" : "bg-danger"}`}>
              {college.isActive ? "Active College" : "Inactive"}
            </span>
          </div>

          {/* Info Grid */}
          <div className="row g-4 text-center">
            <Info icon={<FaUniversity />} label="College Code" value={college.code} />
            <Info icon={<FaEnvelope />} label="Email" value={college.email} />
            <Info icon={<FaPhoneAlt />} label="Contact" value={college.contactNumber} />
            <Info icon={<FaMapMarkerAlt />} label="Address" value={college.address} />
            <Info icon={<FaCalendarAlt />} label="Established Year" value={college.establishedYear} />
            <Info
              icon={<FaCalendarAlt />}
              label="Created On"
              value={new Date(college.createdAt).toDateString()}
            />
          </div>

          <hr />

          {/* ================= ACTION BUTTON ================= */}
          <div className="text-center mt-4">
            <button
              className="btn btn-primary btn-lg px-5"
              onClick={() => navigate("/students")}
            >
              <FaUsers className="me-2" />
              Registered Students
            </button>
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
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
        }
        `}
      </style>

    </div>
  );
}

/* ================= REUSABLE INFO COMPONENT ================= */
function Info({ icon, label, value }) {
  return (
    <div className="col-md-4 col-sm-6">
      <div className="p-3 border rounded-4 shadow-sm h-100">
        <div className="fs-4 text-success mb-1">{icon}</div>
        <h6 className="text-muted">{label}</h6>
        <h5 className="fw-bold">{value || "-"}</h5>
      </div>
    </div>
  );
}
