import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUserTie,
  FaEnvelope,
  FaUniversity,
  FaIdBadge,
  FaGraduationCap,
  FaBriefcase,
  FaCheckCircle,
  FaBuilding
} from "react-icons/fa";

export default function MyProfile() {
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/dashboard" />;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/teachers/my-profile");
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading)
    return <div className="text-center mt-5">Loading profile...</div>;

  if (!profile)
    return (
      <div className="alert alert-warning text-center mt-4">
        Profile data not found
      </div>
    );

  return (
    <div className="container-fluid px-4">

      {/* HEADER */}
      <div className="enterprise-header p-4 rounded-4 mb-4 text-white shadow">
        <h3 className="fw-bold mb-1">{profile.name}</h3>
        <p className="mb-0 opacity-75">{profile.designation}</p>
      </div>

      <div className="row g-4">

        {/* LEFT CARD */}
        <div className="col-lg-6">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4">

              <SectionTitle title="Personal Information" />

              <ProfileRow icon={<FaIdBadge />} label="Employee ID" value={profile.employeeId} />
              <ProfileRow icon={<FaEnvelope />} label="Email" value={profile.email} />
              <ProfileRow icon={<FaUniversity />} label="Department" value={profile.department_id?.name || "N/A"} />
              <ProfileRow icon={<FaBuilding />} label="College" value={profile.college_id?.name || "N/A"} />
              <ProfileRow icon={<FaGraduationCap />} label="Qualification" value={profile.qualification} />
              <ProfileRow icon={<FaBriefcase />} label="Experience" value={`${profile.experienceYears} years`} />
              <ProfileRow
                icon={<FaCheckCircle />}
                label="Status"
                value={
                  <span className="badge bg-success">
                    {profile.status}
                  </span>
                }
              />

            </div>
          </div>
        </div>

        {/* RIGHT CARD - COURSES */}
        <div className="col-lg-6">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4">

              <SectionTitle title="Assigned Courses" />

              {profile.courses?.length === 0 ? (
                <p className="text-muted">No courses assigned</p>
              ) : (
                <ul className="list-group">
                  {profile.courses.map((course) => (
                    <li
                      key={course._id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      {course.name}
                      <span className="badge bg-primary">
                        {course.code}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* STYLES */}
      <style>{`
        .enterprise-header {
          background: linear-gradient(135deg, #0f3a4a, #134952);
        }

        .card {
          transition: 0.3s ease;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 25px rgba(0,0,0,0.15);
        }
      `}</style>

    </div>
  );
}

/* ===== COMPONENTS ===== */

function SectionTitle({ title }) {
  return (
    <h5 className="fw-bold mb-4 border-bottom pb-2">
      {title}
    </h5>
  );
}

function ProfileRow({ icon, label, value }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span>
        {icon} {label}
      </span>
      <span className="fw-semibold">{value}</span>
    </div>
  );
}
