import { useContext, useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaUserGraduate,
  FaUniversity,
  FaBook,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft
} from "react-icons/fa";

export default function ViewStudent() {
  const { user } = useContext(AuthContext);
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH STUDENT ================= */
  const fetchStudent = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/students/registered/${studentId}`);
      setStudent(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load student details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  /* ================= ACTIONS ================= */
  const approveStudent = async () => {
    try {
      await api.put(`/students/${studentId}/approve`);
      alert("Student approved successfully");
      // Navigate to Approved Students list with refresh flag
      navigate("/students/approve", { state: { refresh: true } });
    } catch (err) {
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  const rejectStudent = async () => {
    const reason = prompt("Enter rejection reason");
    if (!reason) return;

    try {
      await api.put(`/students/${studentId}/reject`, {
        reason
      });
      alert("Student rejected successfully");
      fetchStudent();
    } catch (err) {
      alert(err.response?.data?.message || "Rejection failed");
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Student Profile...</h5>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger text-center">{error}</div>;
  }

  if (!student) {
    return (
      <div className="alert alert-warning text-center">
        Student not found
      </div>
    );
  }

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3 className="fw-bold mb-1">
              <FaUserGraduate className="me-2" />
              Student Profile
            </h3>
            <p className="opacity-75 mb-0">
              Complete student details
            </p>
          </div>
          <button
            className="btn btn-light btn-sm"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Back
          </button>
        </div>
      </div>

      {/* ================= BASIC INFO ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3">Basic Information</h5>

          <div className="row g-3">
            <Info label="Full Name" value={student.fullName} />
            <Info label="Email" value={student.email} />
            <Info label="Mobile Number" value={student.mobileNumber} />
            <Info label="Gender" value={student.gender} />
            <Info
              label="Date of Birth"
              value={new Date(student.dateOfBirth).toDateString()}
            />
            <Info label="Nationality" value={student.nationality} />
            <Info label="Category" value={student.category} />
          </div>
        </div>
      </div>

      {/* ================= ACADEMIC INFO ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3">Academic Information</h5>

          <div className="row g-3">
            <Info label="College" value={student.college_id?.name} />
            <Info label="College Code" value={student.college_id?.code} />
            <Info label="Department" value={student.department_id?.name} />
            <Info label="Course" value={student.course_id?.name} />
            <Info label="Admission Year" value={student.admissionYear} />
            <Info label="Current Semester" value={student.currentSemester} />
          </div>
        </div>
      </div>

      {/* ================= ADDRESS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-3">Address Details</h5>

          <div className="row g-3">
            <Info label="Address Line" value={student.addressLine} />
            <Info label="City" value={student.city} />
            <Info label="State" value={student.state} />
            <Info label="Pincode" value={student.pincode} />
          </div>
        </div>
      </div>

      {/* ================= STATUS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body p-4 text-center">
          <h5 className="fw-bold mb-3">Student Status</h5>

          <span
            className={`badge fs-6 px-4 py-2 ${
              student.status === "APPROVED"
                ? "bg-success"
                : student.status === "REJECTED"
                ? "bg-danger"
                : "bg-warning text-dark"
            }`}
          >
            {student.status}
          </span>

          <p className="mt-2 text-muted">
            Registered Via: {student.registeredVia}
          </p>

          {student.status === "PENDING" && (
            <div className="d-flex justify-content-center gap-3 mt-3">
              <button
                className="btn btn-success"
                onClick={approveStudent}
              >
                <FaCheckCircle className="me-2" />
                Approve
              </button>

              <button
                className="btn btn-danger"
                onClick={rejectStudent}
              >
                <FaTimesCircle className="me-2" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= META ================= */}
      <div className="text-center text-muted small mb-4">
        Created on {new Date(student.createdAt).toLocaleString()}
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
        `}
      </style>
    </div>
  );
}

/* ================= REUSABLE FIELD ================= */
function Info({ label, value }) {
  return (
    <div className="col-md-4 col-sm-6">
      <h6 className="text-muted">{label}</h6>
      <h5 className="fw-bold">{value || "-"}</h5>
    </div>
  );
}
