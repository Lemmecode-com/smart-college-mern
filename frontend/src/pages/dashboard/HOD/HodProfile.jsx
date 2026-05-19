import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import {
  FaUserTie,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaBriefcase,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaCalendarAlt
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function HodProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

   const fetchProfile = async () => {
     try {
       setLoading(true);
       const res = await api.get("/profile");
       setProfile(res.data?.teacher || null);
     } catch (error) {
       console.error("Error fetching HOD profile:", error);
       toast.error(error.response?.data?.message || "Failed to load profile");
     } finally {
       setLoading(false);
     }
   };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Profile not found.</p>
        <button className="btn btn-outline-primary mt-2" onClick={() => navigate("/hod/dashboard")}>
          <FaArrowLeft className="me-1" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="hod-profile">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1"><FaUserTie className="me-2 text-primary" />HOD Profile</h2>
          <p className="text-muted mb-0">{profile.name}</p>
        </div>
        <button className="btn btn-outline-primary" onClick={() => navigate("/hod/dashboard")}>
          <FaArrowLeft className="me-1" /> Back
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Personal Information</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <p className="mb-2"><strong>Name:</strong> {profile.name || "N/A"}</p>
              <p className="mb-2"><strong>Employee ID:</strong> {profile.employeeId || "N/A"}</p>
              <p className="mb-2"><FaEnvelope className="me-2 text-muted" />{profile.email || "N/A"}</p>
              {profile.phone && <p className="mb-2"><FaPhone className="me-2 text-muted" />{profile.phone}</p>}
            </div>
            <div className="col-md-6">
              {profile.department && (
                <>
                  <p className="mb-2"><FaLayerGroup className="me-2 text-muted" />{profile.department.name} ({profile.department.code})</p>
                </>
              )}
              {profile.specialization && <p className="mb-2"><FaGraduationCap className="me-2 text-muted" />{profile.specialization}</p>}
              {profile.qualification && <p className="mb-2"><FaBriefcase className="me-2 text-muted" />{profile.qualification}</p>}
              {profile.dateOfJoining && <p className="mb-2"><FaCalendarAlt className="me-2 text-muted" />Joined {new Date(profile.dateOfJoining).toLocaleDateString()}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
