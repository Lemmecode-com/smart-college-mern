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
  FaMoneyBillWave
} from "react-icons/fa";

export default function ViewApproveStudent() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "COLLEGE_ADMIN") return <Navigate to="/dashboard" />;

  /* ================= FETCH APPROVED STUDENT ================= */
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.put(`/students/${id}/approve`);
        setStudent(res.data.student);
        setFee(res.data.fee);
      } catch (err) {
        console.error(err);
        setError("Failed to load approved student details");
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
        <h5 className="text-muted">Approving & loading student...</h5>
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
    <div className="container-fluid fade-in">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold mb-1">
            <FaUserGraduate className="me-2" />
            Student Approved
          </h3>
          <p className="opacity-75 mb-0">
            Fee allocated successfully 🎉
          </p>
        </div>
        <button className="btn btn-light" onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-1" /> Back
        </button>
      </div>

      {/* ================= STUDENT PROFILE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body p-4">

          <div className="text-center mb-4">
            <FaUserGraduate className="fs-1 text-success" />
            <h4 className="fw-bold mt-2">{student.fullName}</h4>
            <span className="badge bg-success px-3 py-2">
              <FaCheckCircle className="me-1" /> APPROVED
            </span>
          </div>

          <div className="row g-3 text-center">
            <Info label="Email" value={student.email} icon={<FaEnvelope />} />
            <Info label="Category" value={student.category} icon={<FaUserGraduate />} />
            <Info label="Admission Year" value={student.admissionYear} icon={<FaCalendarAlt />} />
            <Info
              label="Approved At"
              value={new Date(student.approvedAt).toLocaleString()}
              icon={<FaClock />}
            />
          </div>

          <hr />

          <div className="row g-3 text-center">
            <Info label="Department ID" value={student.department} icon={<FaUniversity />} />
            <Info label="Course ID" value={student.course} icon={<FaUniversity />} />
            <Info label="Status" value={student.status} icon={<FaCheckCircle />} />
          </div>
        </div>
      </div>

      {/* ================= FEE STRUCTURE ================= */}
      {fee && (
        <div className="card shadow-lg border-0 rounded-4 glass-card slide-up">
          <div className="card-body p-4">

            <h5 className="fw-bold mb-3">
              <FaMoneyBillWave className="me-2 text-success" />
              Fee Allocation
            </h5>

            <div className="row mb-3">
              <Info label="Total Fee" value={`₹ ${fee.totalFee}`} />
              <Info label="Paid Amount" value={`₹ ${fee.paidAmount}`} />
            </div>

            <div className="table-responsive">
              <table className="table table-bordered align-middle text-center">
                <thead className="table-dark">
                  <tr>
                    <th>Installment</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fee.installments.map((i) => (
                    <tr key={i._id}>
                      <td>{i.name}</td>
                      <td>₹ {i.amount}</td>
                      <td>{new Date(i.dueDate).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            i.status === "PAID"
                              ? "bg-success"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(8px);
        }
        .fade-in {animation: fade 1s;}
        .slide-up {animation: slideUp 0.6s;}
        @keyframes fade {from{opacity:0}to{opacity:1}}
        @keyframes slideUp {from{transform:translateY(20px)}to{transform:translateY(0)}}
      `}</style>
    </div>
  );
}

/* ================= REUSABLE ================= */
function Info({ label, value, icon }) {
  return (
    <div className="col-md-3 col-sm-6 text-center">
      <div className="border rounded-4 p-3 shadow-sm h-100">
        <div className="text-success fs-5 mb-1">{icon}</div>
        <h6 className="text-muted">{label}</h6>
        <h5 className="fw-bold">{value || "-"}</h5>
      </div>
    </div>
  );
}
