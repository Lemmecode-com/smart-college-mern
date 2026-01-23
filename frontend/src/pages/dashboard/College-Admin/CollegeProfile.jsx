import { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUniversity,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaBuilding,
  FaClock
} from "react-icons/fa";

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN")
    return <Navigate to="/dashboard" />;

  /* ================= FETCH COLLEGE ================= */
  useEffect(() => {
    const fetchCollege = async () => {
      try {
        const res = await api.get("/college/my-college");
        setCollege(res.data);
      } catch {
        setCollege(null);
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

  if (!college) {
    return (
      <div className="alert alert-danger">
        Unable to load college profile.
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaUniversity className="blink me-2" />
          College Profile
        </h3>
        <p className="opacity-75 mb-0">
          Official college information
        </p>
      </div>

      {/* ================= PROFILE CARD ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">

          {/* TOP SECTION */}
          <div className="text-center mb-4">
            <FaBuilding className="fs-1 text-success blink-fast" />
            <h4 className="fw-bold mt-2">{college.name}</h4>
            <span className="badge bg-success">
              {college.isActive ? "Active College" : "Inactive"}
            </span>
          </div>

          <div className="row g-4">

            <ProfileItem
              icon={<FaUniversity />}
              label="College Code"
              value={college.code}
            />

            <ProfileItem
              icon={<FaEnvelope />}
              label="Email"
              value={college.email}
            />

            <ProfileItem
              icon={<FaPhoneAlt />}
              label="Contact Number"
              value={college.contactNumber}
            />

            <ProfileItem
              icon={<FaMapMarkerAlt />}
              label="Address"
              value={college.address}
            />

            <ProfileItem
              icon={<FaCalendarAlt />}
              label="Established Year"
              value={college.establishedYear}
            />

            <ProfileItem
              icon={<FaCheckCircle />}
              label="Status"
              value={college.isActive ? "Active" : "Inactive"}
            />

            <ProfileItem
              icon={<FaClock />}
              label="Created On"
              value={new Date(college.createdAt).toDateString()}
            />

            <ProfileItem
              icon={<FaBuilding />}
              label="College ID"
              value={college._id}
            />

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
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(8px);
        }

        .profile-box {
          background: white;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }

        .profile-box:hover {
          transform: translateY(-6px);
          box-shadow: 0 14px 30px rgba(0,0,0,0.15);
        }

        .blink {
          animation: blink 1.5s infinite;
        }

        .blink-fast {
          animation: blink 0.9s infinite;
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

/* ================= PROFILE ITEM ================= */
function ProfileItem({ icon, label, value }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className="profile-box text-center">
        <div className="fs-3 text-success mb-2">
          {icon}
        </div>
        <h6 className="text-muted">{label}</h6>
        <h5 className="fw-bold text-break">{value}</h5>
      </div>
    </div>
  );
}



// import { useContext, useEffect, useState } from "react";
// import { Navigate } from "react-router-dom";
// import { AuthContext } from "../../../auth/AuthContext";
// import api from "../../../api/axios";

// import {
//   FaUniversity,
//   FaEnvelope,
//   FaPhoneAlt,
//   FaMapMarkerAlt,
//   FaCalendarAlt,
//   FaCheckCircle,
//   FaBuilding,
//   FaClock,
//   FaUsers,
//   FaCheck,
//   FaTimes
// } from "react-icons/fa";

// export default function CollegeProfile() {
//   const { user } = useContext(AuthContext);
//   const [college, setCollege] = useState(null);
//   const [students, setStudents] = useState([]);
//   const [loading, setLoading] = useState(true);

//   /* ================= SECURITY ================= */
//   if (!user) return <Navigate to="/login" />;
//   if (user.role !== "COLLEGE_ADMIN")
//     return <Navigate to="/dashboard" />;

//   /* ================= FETCH DATA ================= */
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const collegeRes = await api.get("/college/my-college");
//         const studentRes = await api.get("/students/registered");

//         setCollege(collegeRes.data);
//         setStudents(studentRes.data.students || []);
//       } catch {
//         setCollege(null);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   /* ================= ACTIONS ================= */
//   const approveStudent = async (id) => {
//     await api.put(`/students/${id}/approve`);
//     alert("Student approved");
//     refreshStudents();
//   };

//   const rejectStudent = async (id) => {
//     const reason = prompt("Enter rejection reason:");
//     await api.put(`/students/${id}/reject`, {
//       reason: reason || "Not specified"
//     });
//     alert("Student rejected");
//     refreshStudents();
//   };

//   const refreshStudents = async () => {
//     const studentRes = await api.get("/students/registered");
//     setStudents(studentRes.data.students || []);
//   };

//   /* ================= LOADING ================= */
//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-75">
//         <h5 className="text-muted">Loading College Profile...</h5>
//       </div>
//     );
//   }

//   if (!college) {
//     return (
//       <div className="alert alert-danger">
//         Unable to load college profile.
//       </div>
//     );
//   }

//   return (
//     <div className="container-fluid">

//       {/* ================= HEADER ================= */}
//       <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
//         <h3 className="fw-bold mb-1">
//           <FaUniversity className="blink me-2" />
//           College Profile
//         </h3>
//         <p className="opacity-75 mb-0">
//           Official college information & student approvals
//         </p>
//       </div>

//       {/* ================= PROFILE CARD ================= */}
//       <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
//         <div className="card-body p-4">

//           <div className="text-center mb-4">
//             <FaBuilding className="fs-1 text-success blink-fast" />
//             <h4 className="fw-bold mt-2">{college.name}</h4>
//             <span className="badge bg-success">
//               {college.isActive ? "Active College" : "Inactive"}
//             </span>
//           </div>

//           <div className="row g-4">
//             <ProfileItem icon={<FaUniversity />} label="College Code" value={college.code} />
//             <ProfileItem icon={<FaEnvelope />} label="Email" value={college.email} />
//             <ProfileItem icon={<FaPhoneAlt />} label="Contact" value={college.contactNumber} />
//             <ProfileItem icon={<FaMapMarkerAlt />} label="Address" value={college.address} />
//             <ProfileItem icon={<FaCalendarAlt />} label="Established" value={college.establishedYear} />
//             <ProfileItem icon={<FaCheckCircle />} label="Status" value={college.isActive ? "Active" : "Inactive"} />
//             <ProfileItem icon={<FaClock />} label="Created On" value={new Date(college.createdAt).toDateString()} />
//             <ProfileItem icon={<FaBuilding />} label="College ID" value={college._id} />
//           </div>
//         </div>
//       </div>

//       {/* ================= STUDENT TABLE ================= */}
//       <div className="card shadow-lg border-0 rounded-4 glass-card">
//         <div className="card-body p-4">
//           <h4 className="fw-bold mb-3">
//             <FaUsers className="me-2 text-primary" />
//             Registered Students
//           </h4>

//           <div className="table-responsive">
//             <table className="table table-hover align-middle">
//               <thead className="table-dark">
//                 <tr>
//                   <th>Name</th>
//                   <th>Email</th>
//                   <th>Department</th>
//                   <th>Course</th>
//                   <th>Status</th>
//                   <th className="text-center">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {students.map((s) => (
//                   <tr key={s._id}>
//                     <td>{s.fullName}</td>
//                     <td>{s.email}</td>
//                     <td>{s.department_id?.name}</td>
//                     <td>{s.course_id?.name}</td>
//                     <td>
//                       <span className={`badge 
//                         ${s.status === "APPROVED" ? "bg-success" :
//                           s.status === "REJECTED" ? "bg-danger" :
//                           "bg-warning text-dark"}`}>
//                         {s.status}
//                       </span>
//                     </td>
//                     <td className="text-center">
//                       {s.status === "PENDING" && (
//                         <>
//                           <button
//                             className="btn btn-sm btn-success me-2"
//                             onClick={() => approveStudent(s._id)}
//                           >
//                             <FaCheck /> Approve
//                           </button>
//                           <button
//                             className="btn btn-sm btn-danger"
//                             onClick={() => rejectStudent(s._id)}
//                           >
//                             <FaTimes /> Reject
//                           </button>
//                         </>
//                       )}
//                       {s.status !== "PENDING" && (
//                         <span className="text-muted">No Action</span>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
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

//         .profile-box {
//           background: white;
//           border-radius: 16px;
//           padding: 18px;
//           box-shadow: 0 8px 20px rgba(0,0,0,0.08);
//           transition: all 0.3s ease;
//         }

//         .profile-box:hover {
//           transform: translateY(-6px);
//           box-shadow: 0 14px 30px rgba(0,0,0,0.15);
//         }

//         .blink {
//           animation: blink 1.5s infinite;
//         }

//         .blink-fast {
//           animation: blink 0.9s infinite;
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

// /* ================= PROFILE ITEM ================= */
// function ProfileItem({ icon, label, value }) {
//   return (
//     <div className="col-md-3 col-sm-6">
//       <div className="profile-box text-center">
//         <div className="fs-3 text-success mb-2">
//           {icon}
//         </div>
//         <h6 className="text-muted">{label}</h6>
//         <h5 className="fw-bold text-break">{value}</h5>
//       </div>
//     </div>
//   );
// }
