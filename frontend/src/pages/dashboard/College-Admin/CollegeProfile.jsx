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
  FaUsers,
  FaCheck,
  FaTimes,
  FaLink,
  FaQrcode
} from "react-icons/fa";

export default function CollegeProfile() {
  const { user } = useContext(AuthContext);

  const [college, setCollege] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // 1️⃣ College profile
      const collegeRes = await api.get("/college/my-college");

      // 2️⃣ Registered students (ADMIN API)
      const studentsRes = await api.get("/students");

      setCollege(collegeRes.data);
      setStudents(studentsRes.data?.students || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load college profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ================= ACTIONS ================= */
  const approveStudent = async (studentId) => {
    try {
      await api.put(`/students/${studentId}/approve`);
      alert("Student approved successfully");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  const rejectStudent = async (studentId) => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;

    try {
      await api.put(`/students/${studentId}/reject`, { reason });
      alert("Student rejected successfully");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed");
    }
  };

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
          College details & student approval management
        </p>
      </div>

      {/* ================= COLLEGE DETAILS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body p-4">

          <div className="text-center mb-4">
            <FaBuilding className="fs-1 text-success" />
            <h4 className="fw-bold mt-2">{college.name}</h4>
            <span
              className={`badge ${
                college.isActive ? "bg-success" : "bg-danger"
              }`}
            >
              {college.isActive ? "Active College" : "Inactive"}
            </span>
          </div>

          <div className="row g-4 text-center">
            <Info label="College Code" value={college.code} />
            <Info label="Email" value={college.email} />
            <Info label="Contact" value={college.contactNumber} />
            <Info label="Address" value={college.address} />
            <Info label="Established Year" value={college.establishedYear} />
            <Info
              label="Created On"
              value={new Date(college.createdAt).toDateString()}
            />
          </div>

          <hr />

          {/* ================= REGISTRATION ================= */}
          <div className="row text-center">
            <div className="col-md-6">
              <FaLink className="me-2 text-primary" />
              <strong>Registration Link</strong>
              <p className="small text-muted mt-1">
                {college.registrationUrl}
              </p>
            </div>

            <div className="col-md-6">
              <FaQrcode className="me-2 text-success" />
              <strong>Registration QR</strong>
              <div className="mt-2">
                {college.registrationQr && (
                  <img
                    src={`http://localhost:5000/${college.registrationQr}`}
                    alt="Registration QR"
                    height="120"
                  />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= STUDENT LIST ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body p-4">
          <h4 className="fw-bold mb-3">
            <FaUsers className="me-2 text-primary" />
            Registered Students
          </h4>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No students registered yet
                    </td>
                  </tr>
                )}

                {students.map((s) => (
                  <tr key={s._id}>
                    <td>{s.fullName}</td>
                    <td>{s.email}</td>
                    <td>{s.department_id?.name || "-"}</td>
                    <td>{s.course_id?.name || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          s.status === "APPROVED"
                            ? "bg-success"
                            : s.status === "REJECTED"
                            ? "bg-danger"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="text-center">
                      {s.status === "PENDING" ? (
                        <>
                          <button
                            className="btn btn-sm btn-success me-2"
                            onClick={() => approveStudent(s._id)}
                          >
                            <FaCheck /> Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => rejectStudent(s._id)}
                          >
                            <FaTimes /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-muted">No Action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

/* ================= REUSABLE INFO ================= */
function Info({ label, value }) {
  return (
    <div className="col-md-4 col-sm-6">
      <h6 className="text-muted">{label}</h6>
      <h5 className="fw-bold">{value || "-"}</h5>
    </div>
  );
}
