// import { useContext, useEffect, useState } from "react";
// import { Navigate } from "react-router-dom";
// import { AuthContext } from "../../../auth/AuthContext";
// import api from "../../../api/axios";

// import {
//   FaUser,
//   FaEnvelope,
//   FaUniversity,
//   FaBook,
//   FaIdBadge
// } from "react-icons/fa";

// export default function MyProfile() {
//   const { user } = useContext(AuthContext);

//   const [profile, setProfile] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   /* ================= SECURITY ================= */
//   if (!user) return <Navigate to="/login" />;
//   if (user.role !== "TEACHER")
//     return <Navigate to="/teacher/dashboard" />;

//   /* ================= FETCH PROFILE ================= */
//   useEffect(() => {
//     const fetchProfile = async () => {
//       try {
//         // Recommended API (if exists)
//         const res = await api.get("/teachers/me");
//         setProfile(res.data);
//       } catch (err) {
//         console.error(err);
//         setError("Failed to load profile");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProfile();
//   }, []);

//   /* ================= LOADING ================= */
//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-75">
//         <h5 className="text-muted">Loading Profile...</h5>
//       </div>
//     );
//   }

//   if (!profile) {
//     return (
//       <div className="alert alert-warning text-center">
//         Profile data not found
//       </div>
//     );
//   }

//   return (
//     <div className="container-fluid">

//       {/* ================= HEADER ================= */}
//       <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
//         <h3 className="fw-bold mb-1">
//           <FaUser className="me-2 blink" />
//           My Profile
//         </h3>
//         <p className="opacity-75 mb-0">
//           View your personal and academic details
//         </p>
//       </div>

//       {error && (
//         <div className="alert alert-danger text-center">
//           {error}
//         </div>
//       )}

//       {/* ================= PROFILE CARD ================= */}
//       <div className="row justify-content-center">
//         <div className="col-md-6">

//           <div className="card shadow-lg border-0 rounded-4 glass-card">
//             <div className="card-body text-center">

//               {/* Avatar */}
//               <div
//                 className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
//                 style={{
//                   width: 100,
//                   height: 100,
//                   background: "#e6f3f7",
//                   fontSize: 40
//                 }}
//               >
//                 👨‍🏫
//               </div>

//               <h4 className="fw-bold">
//                 {profile.fullName || profile.name}
//               </h4>
//               <p className="text-muted mb-4">
//                 Teacher
//               </p>

//               <hr />

//               {/* DETAILS */}
//               <div className="text-start mt-3">

//                 <p>
//                   <FaIdBadge className="me-2 text-primary" />
//                   <strong>Teacher ID:</strong>{" "}
//                   {profile._id}
//                 </p>

//                 <p>
//                   <FaEnvelope className="me-2 text-primary" />
//                   <strong>Email:</strong>{" "}
//                   {profile.email}
//                 </p>

//                 <p>
//                   <FaUniversity className="me-2 text-primary" />
//                   <strong>Department:</strong>{" "}
//                   {profile.department?.name || "N/A"}
//                 </p>

//                 <p>
//                   <FaBook className="me-2 text-primary" />
//                   <strong>Subjects:</strong>{" "}
//                   {profile.subjects?.length > 0
//                     ? profile.subjects.map((s) => s.name).join(", ")
//                     : "Not Assigned"}
//                 </p>

//               </div>

//             </div>
//           </div>

//         </div>
//       </div>

//       {/* ================= CSS ================= */}
//       <style>
//         {`
//         .gradient-header {
//           background: linear-gradient(180deg, #0f3a4a, #134952);
//         }

//         .glass-card {
//           background: rgba(255,255,255,0.95);
//           backdrop-filter: blur(8px);
//         }

//         .blink {
//           animation: blink 1.5s infinite;
//         }

//         @keyframes blink {
//           0% {opacity:1}
//           50% {opacity:0.4}
//           100% {opacity:1}
//         }
//         `}
//       </style>
//     </div>
//   );
// }



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
  FaCheckCircle
} from "react-icons/fa";

export default function MyProfile() {
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "TEACHER") return <Navigate to="/dashboard" />;

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/teachers/my-profile");
        setProfile(res.data);
      } catch (err) {
        console.error(err);
        setError("Unable to load teacher profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* ================= STATES ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" />
          <p className="text-muted">Loading profile...</p>
        </div>
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
    <div className="container-fluid px-4">

      {/* ================= HEADER ================= */}
      <div className="profile-header shadow-sm rounded-4 p-4 mb-4 text-white">
        <h3 className="fw-bold mb-1">
          <FaUserTie className="me-2" />
          Teacher Profile
        </h3>
        <p className="mb-0 opacity-75">
          Personal & academic information
        </p>
      </div>

      {error && (
        <div className="alert alert-danger text-center">{error}</div>
      )}

      {/* ================= PROFILE CARD ================= */}
      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8">

          <div className="card profile-card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">

              {/* Avatar + Name */}
              <div className="text-center mb-4">
                <div className="avatar mx-auto mb-3">
                  👨‍🏫
                </div>

                <h4 className="fw-bold mb-0">{profile.name}</h4>
                <small className="text-muted">
                  {profile.designation}
                </small>
              </div>

              <hr />

              {/* DETAILS */}
              <div className="profile-info">

                <ProfileRow
                  icon={<FaIdBadge />}
                  label="Employee ID"
                  value={profile.employeeId}
                />

                <ProfileRow
                  icon={<FaEnvelope />}
                  label="Email"
                  value={profile.email}
                />

                <ProfileRow
                  icon={<FaUniversity />}
                  label="Department"
                  value={profile.department_id?.name || "N/A"}
                />

                <ProfileRow
                  icon={<FaGraduationCap />}
                  label="Qualification"
                  value={profile.qualification}
                />

                <ProfileRow
                  icon={<FaBriefcase />}
                  label="Experience"
                  value={`${profile.experienceYears} years`}
                />

                <ProfileRow
                  icon={<FaCheckCircle />}
                  label="Status"
                  value={
                    <span
                      className={`badge ${
                        profile.status === "ACTIVE"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {profile.status}
                    </span>
                  }
                />

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .profile-header {
          background: linear-gradient(135deg, #0f3a4a, #134952);
        }

        .profile-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
        }

        .avatar {
          width: 110px;
          height: 110px;
          background: linear-gradient(135deg, #e0f4f7, #c2e9ef);
          border-radius: 50%;
          font-size: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .profile-info p {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px dashed #e6e6e6;
          margin-bottom: 0;
        }

        .profile-info p:last-child {
          border-bottom: none;
        }

        .profile-info span {
          font-weight: 600;
        }

        .icon {
          color: #0f3a4a;
          margin-right: 10px;
        }
      `}</style>

    </div>
  );
}

/* ================= REUSABLE ROW ================= */
function ProfileRow({ icon, label, value }) {
  return (
    <p>
      <span>
        <span className="icon">{icon}</span>
        {label}
      </span>
      <span>{value}</span>
    </p>
  );
}
