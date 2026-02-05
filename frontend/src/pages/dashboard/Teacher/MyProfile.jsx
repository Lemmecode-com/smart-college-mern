  import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUser,
  FaEnvelope,
  FaUniversity,
  FaBook,
  FaIdBadge
} from "react-icons/fa";

export default function MyProfile() {
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER")
    return <Navigate to="/teacher/dashboard" />;

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Recommended API (if exists)
        const res = await api.get("/teachers/me");
        setProfile(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
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
        <h5 className="text-muted">Loading Profile...</h5>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="alert alert-warning text-center">
        Profile data not found
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUser className="me-2 blink" />
          My Profile
        </h3>
        <p className="opacity-75 mb-0">
          View your personal and academic details
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">
          {error}
        </div>
      )}

      {/* ================= PROFILE CARD ================= */}
      <div className="row justify-content-center">
        <div className="col-md-6">

          <div className="card shadow-lg border-0 rounded-4 glass-card">
            <div className="card-body text-center">

              {/* Avatar */}
              <div
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{
                  width: 100,
                  height: 100,
                  background: "#e6f3f7",
                  fontSize: 40
                }}
              >
                👨‍🏫
              </div>

              <h4 className="fw-bold">
                {profile.fullName || profile.name}
              </h4>
              <p className="text-muted mb-4">
                Teacher
              </p>

              <hr />

              {/* DETAILS */}
              <div className="text-start mt-3">

                <p>
                  <FaIdBadge className="me-2 text-primary" />
                  <strong>Teacher ID:</strong>{" "}
                  {profile._id}
                </p>

                <p>
                  <FaEnvelope className="me-2 text-primary" />
                  <strong>Email:</strong>{" "}
                  {profile.email}
                </p>

                <p>
                  <FaUniversity className="me-2 text-primary" />
                  <strong>Department:</strong>{" "}
                  {profile.department?.name || "N/A"}
                </p>

                <p>
                  <FaBook className="me-2 text-primary" />
                  <strong>Subjects:</strong>{" "}
                  {profile.subjects?.length > 0
                    ? profile.subjects.map((s) => s.name).join(", ")
                    : "Not Assigned"}
                </p>

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
          background: rgba(255,255,255,0.95);
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
