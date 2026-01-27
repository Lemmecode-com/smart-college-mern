import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUserGraduate,
  FaUniversity,
  FaEnvelope,
  FaPhoneAlt,
  FaCalendarAlt,
  FaBook,
  FaCheckCircle,
  FaMapMarkerAlt
} from "react-icons/fa";

export default function StudentProfile() {
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/students/my-profile");

        // SAFETY: validate shape
        if (!res.data || !res.data.student) {
          throw new Error("Invalid profile response");
        }

        setProfile(res.data);
      } catch (err) {
        console.error("PROFILE ERROR:", err);

        if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
        } else if (err.response?.status === 500) {
          setError("Server error while loading profile.");
        } else {
          setError("Failed to load student profile.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Student Profile...</h5>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="alert alert-warning text-center">
        No profile data found.
      </div>
    );
  }

  const { student, college, department, course } = profile;

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUserGraduate className="me-2 blink" />
          My Profile
        </h3>
        <p className="opacity-75 mb-0">
          Personal & Academic Information
        </p>
      </div>

      {/* ================= TOP PROFILE ================= */}
      <div className="row mb-4">
        {/* Student Card */}
        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4 glass-card text-center h-100">
            <div className="card-body">
              <FaUserGraduate size={80} className="text-primary mb-3" />
              <h4 className="fw-bold">{student.fullName}</h4>
              <p className="text-muted mb-1">{student.email}</p>
              <p className="text-muted mb-1">{student.mobileNumber}</p>

              <span className="badge bg-success px-3 py-2">
                <FaCheckCircle className="me-1" />
                {student.status}
              </span>

              <p className="text-muted mt-3">
                Registered on:{" "}
                {new Date(student.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* College */}
        <div className="col-md-8">
          <div className="card shadow-lg border-0 rounded-4 glass-card h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <FaUniversity className="me-2" />
                College Details
              </h5>

              <div className="row">
                <Info label="College Name" value={college?.name} />
                <Info label="College Code" value={college?.code} />
                <Info label="Email" value={college?.email} />
                <Info label="Contact" value={college?.contactNumber} />
                <Info label="Address" value={college?.address} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ACADEMIC + PERSONAL ================= */}
      <div className="row">
        {/* Academic */}
        <div className="col-md-6 mb-3">
          <div className="card shadow-lg border-0 rounded-4 glass-card">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <FaBook className="me-2" />
                Academic Details
              </h5>

              <div className="row">
                <Info label="Department" value={department?.name} />
                <Info label="Course" value={course?.name} />
                <Info label="Semester" value={student.currentSemester} />
                <Info label="Admission Year" value={student.admissionYear} />
              </div>
            </div>
          </div>
        </div>

        {/* Personal */}
        <div className="col-md-6 mb-3">
          <div className="card shadow-lg border-0 rounded-4 glass-card">
            <div className="card-body">
              <h5 className="fw-bold mb-3">
                <FaCalendarAlt className="me-2" />
                Personal Details
              </h5>

              <div className="row">
                <Info label="Gender" value={student.gender} />
                <Info
                  label="Date of Birth"
                  value={new Date(student.dateOfBirth).toLocaleDateString()}
                />
                <Info label="Nationality" value={student.nationality} />
                <Info label="Student ID" value={student.id} />
              </div>
            </div>
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
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(8px);
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

/* ================= REUSABLE FIELD ================= */
function Info({ label, value }) {
  return (
    <div className="col-md-6 mb-2">
      <strong>{label}:</strong>
      <br />
      {value || "N/A"}
    </div>
  );
}
