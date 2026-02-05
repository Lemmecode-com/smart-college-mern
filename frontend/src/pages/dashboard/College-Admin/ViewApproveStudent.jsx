// import { useContext, useEffect, useState } from "react";
// import { useParams, Navigate, useNavigate } from "react-router-dom";
// import { AuthContext } from "../../../auth/AuthContext";
// import api from "../../../api/axios";
// import {
//   FaUserGraduate,
//   FaEnvelope,
//   FaPhone,
//   FaMapMarkerAlt,
//   FaCalendarAlt,
//   FaUniversity,
//   FaArrowLeft,
//   FaCheckCircle,
//   FaClock,
// } from "react-icons/fa";

// export default function ViewApproveStudent() {
//   const { user } = useContext(AuthContext);
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [student, setStudent] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   /* ================= SECURITY ================= */
//   if (!user) return <Navigate to="/login" />;
//   if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

//   /* ================= FETCH STUDENT ================= */
//   useEffect(() => {
//     const fetchStudent = async () => {
//       try {
//         const res = await api.get(`/students/approved-stud/${id}`);
//         setStudent(res.data);
//       } catch (err) {
//         console.error(err);
//         setError("Failed to load approved student");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchStudent();
//   }, [id]);

//   /* ================= LOADING ================= */
//   if (loading) {
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-75">
//         <h5 className="text-muted">Loading Student...</h5>
//       </div>
//     );
//   }

//   if (error) {
//     return <div className="alert alert-danger text-center">{error}</div>;
//   }

//   if (!student) {
//     return (
//       <div className="alert alert-warning text-center">
//         Student not found
//       </div>
//     );
//   }

//   return (
//     <div className="container-fluid">
//       {/* ================= HEADER ================= */}
//       <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 d-flex justify-content-between align-items-center">
//         <div>
//           <h3 className="fw-bold mb-1">
//             <FaUserGraduate className="me-2" /> Approved Student Profile
//           </h3>
//           <p className="opacity-75 mb-0">
//             Complete personal & academic details
//           </p>
//         </div>
//         <button className="btn btn-light" onClick={() => navigate(-1)}>
//           <FaArrowLeft className="me-1" /> Back
//         </button>
//       </div>

//       {/* ================= PROFILE CARD ================= */}
//       <div className="card shadow-lg border-0 rounded-4 glass-card">
//         <div className="card-body p-4">
//           {/* ===== TOP ===== */}
//           <div className="text-center mb-4">
//             <FaUserGraduate className="fs-1 text-success" />
//             <h4 className="fw-bold mt-2">{student.fullName}</h4>
//             <span className="badge bg-success">
//               <FaCheckCircle className="me-1" /> APPROVED
//             </span>
//           </div>

//           {/* ===== BASIC ===== */}
//           <div className="row g-4 text-center mb-4">
//             <Info label="Email" value={student.email} icon={<FaEnvelope />} />
//             <Info
//               label="Mobile"
//               value={student.mobileNumber}
//               icon={<FaPhone />}
//             />
//             <Info
//               label="Gender"
//               value={student.gender}
//               icon={<FaUserGraduate />}
//             />
//             <Info
//               label="DOB"
//               value={new Date(student.dateOfBirth).toDateString()}
//               icon={<FaCalendarAlt />}
//             />
//           </div>

//           {/* ===== ADDRESS ===== */}
//           <h5 className="fw-bold mb-3">
//             <FaMapMarkerAlt className="me-2" /> Address
//           </h5>
//           <div className="row g-3 mb-4">
//             <Info label="Address" value={student.addressLine} />
//             <Info label="City" value={student.city} />
//             <Info label="State" value={student.state} />
//             <Info label="Pincode" value={student.pincode} />
//           </div>

//           {/* ===== ACADEMIC ===== */}
//           <h5 className="fw-bold mb-3">
//             <FaUniversity className="me-2" /> Academic Details
//           </h5>
//           <div className="row g-3 mb-4">
//             <Info label="College" value={student.college_id?.name} />
//             <Info label="College Code" value={student.college_id?.code} />
//             <Info label="Department" value={student.department_id?.name} />
//             <Info label="Course" value={student.course_id?.name} />
//             <Info label="Admission Year" value={student.admissionYear} />
//             <Info label="Semester" value={student.currentSemester} />
//           </div>

//           {/* ===== META ===== */}
//           <h5 className="fw-bold mb-3">
//             <FaClock className="me-2" /> System Info
//           </h5>
//           <div className="row g-3">
//             <Info label="Status" value={student.status} />
//             <Info label="Registered Via" value={student.registeredVia} />
//             <Info
//               label="Approved At"
//               value={new Date(student.approvedAt).toDateString()}
//             />
//             <Info
//               label="Created At"
//               value={new Date(student.createdAt).toDateString()}
//             />
//           </div>
//         </div>
//       </div>

//       {/* ================= CSS ================= */}
//       <style>{`
//         .gradient-header {
//           background: linear-gradient(180deg, #0f3a4a, #134952);
//         }
//         .glass-card {
//           background: rgba(255, 255, 255, 0.96);
//           backdrop-filter: blur(8px);
//         }
//       `}</style>
//     </div>
//   );
// }

// /* ================= REUSABLE INFO ================= */
// function Info({ label, value, icon }) {
//   return (
//     <div className="col-md-3 col-sm-6 text-center">
//       <div className="border rounded-4 p-3 shadow-sm h-100">
//         <div className="text-success fs-5 mb-1">{icon}</div>
//         <h6 className="text-muted">{label}</h6>
//         <h5 className="fw-bold">{value || "-"}</h5>
//       </div>
//     </div>
//   );
// }




import { useContext, useEffect, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import {
  FaUserGraduate,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUniversity,
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaRupeeSign,
} from "react-icons/fa";

export default function ViewApproveStudent() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH STUDENT ================= */
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/approved-stud/${id}`);
        setStudent(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load approved student");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Student...</h5>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  if (!student) {
    return (
      <div className="alert alert-warning text-center">Student not found</div>
    );
  }

  const fee = student.fee;
  const pendingAmount =
    fee?.totalFee - (fee?.paidAmount || 0);

  return (
    <div className="container-fluid">
      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold mb-1">
            <FaUserGraduate className="me-2" /> Approved Student Profile
          </h3>
          <p className="opacity-75 mb-0">
            Complete personal, academic & fee details
          </p>
        </div>
        <button className="btn btn-light" onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-1" /> Back
        </button>
      </div>

      {/* ================= PROFILE CARD ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">
          {/* ===== TOP ===== */}
          <div className="text-center mb-4">
            <FaUserGraduate className="fs-1 text-success" />
            <h4 className="fw-bold mt-2">{student.fullName}</h4>
            <span className="badge bg-success">
              <FaCheckCircle className="me-1" /> APPROVED
            </span>
          </div>

          {/* ===== BASIC ===== */}
          <div className="row g-4 text-center mb-4">
            <Info label="Email" value={student.email} icon={<FaEnvelope />} />
            <Info label="Mobile" value={student.mobileNumber} icon={<FaPhone />} />
            <Info label="Gender" value={student.gender} icon={<FaUserGraduate />} />
            <Info
              label="DOB"
              value={new Date(student.dateOfBirth).toDateString()}
              icon={<FaCalendarAlt />}
            />
          </div>

          {/* ===== ADDRESS ===== */}
          <h5 className="fw-bold mb-3">
            <FaMapMarkerAlt className="me-2" /> Address
          </h5>
          <div className="row g-3 mb-4">
            <Info label="Address" value={student.addressLine} />
            <Info label="City" value={student.city} />
            <Info label="State" value={student.state} />
            <Info label="Pincode" value={student.pincode} />
          </div>

          {/* ===== ACADEMIC ===== */}
          <h5 className="fw-bold mb-3">
            <FaUniversity className="me-2" /> Academic Details
          </h5>
          <div className="row g-3 mb-4">
            <Info label="College" value={student.college_id?.name} />
            <Info label="College Code" value={student.college_id?.code} />
            <Info label="Department" value={student.department_id?.name} />
            <Info label="Course" value={student.course_id?.name} />
            <Info label="Admission Year" value={student.admissionYear} />
            <Info label="Semester" value={student.currentSemester} />
          </div>

          {/* ===== FEE SUMMARY ===== */}
          <h5 className="fw-bold mb-3">
            <FaRupeeSign className="me-2" /> Fee Summary
          </h5>

          <div className="row g-3 mb-4">
            <Info label="Total Fee" value={`₹ ${fee?.totalFee || 0}`} />
            <Info label="Paid Amount" value={`₹ ${fee?.paidAmount || 0}`} />
            <Info label="Pending Amount" value={`₹ ${pendingAmount || 0}`} />
          </div>

          {/* ===== INSTALLMENTS ===== */}
          <h5 className="fw-bold mb-3">Installments</h5>

          {fee?.installments?.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {fee.installments.map((inst, index) => (
                    <tr key={inst._id}>
                      <td>{index + 1}</td>
                      <td>{inst.name}</td>
                      <td>₹ {inst.amount}</td>
                      <td>
                        {new Date(inst.dueDate).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            inst.status === "PAID"
                              ? "bg-success"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {inst.status}
                        </span>
                      </td>
                      <td>
                        {inst.reminderSent ? "Sent" : "Not Sent"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No installments available</p>
          )}

          {/* ===== META ===== */}
          <h5 className="fw-bold mt-4 mb-3">
            <FaClock className="me-2" /> System Info
          </h5>
          <div className="row g-3">
            <Info label="Status" value={student.status} />
            <Info label="Registered Via" value={student.registeredVia} />
            <Info
              label="Approved At"
              value={new Date(student.approvedAt).toDateString()}
            />
            <Info
              label="Created At"
              value={new Date(student.createdAt).toDateString()}
            />
          </div>
        </div>
      </div>

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
}

/* ================= REUSABLE INFO ================= */
function Info({ label, value, icon }) {
  return (
    <div className="col-md-3 col-sm-6 text-center">
      <div className="border rounded-4 p-3 shadow-sm h-100">
        {icon && <div className="text-success fs-5 mb-1">{icon}</div>}
        <h6 className="text-muted">{label}</h6>
        <h5 className="fw-bold">{value || "-"}</h5>
      </div>
    </div>
  );
}