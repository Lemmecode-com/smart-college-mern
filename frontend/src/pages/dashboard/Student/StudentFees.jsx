import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import {
  FaMoneyCheckAlt,
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaSpinner,
  FaUserGraduate,
  FaCalendarAlt,
  FaReceipt
} from "react-icons/fa";

export default function StudentFees() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ===== STATIC (BACKEND READY) ===== */
  const feeDetails = {
    studentName: user.name || "Student",
    studentId: "STU-1023",
    courseName: "Bachelor of Arts",
    academicYear: "2024 - 2025",
    category: "OPEN",
    totalFees: 2500,
    paidFees: 1000,
    pendingFees: 1500,
    courseId: "TEMP_COURSE_ID",
    caste: "OPEN",
    installments: [
      { name: "Admission", amount: 1000, due: "2024-06-01", status: "PAID" },
      { name: "Semester 1", amount: 800, due: "2024-09-01", status: "DUE" },
      { name: "Semester 2", amount: 700, due: "2025-01-01", status: "DUE" }
    ],
    payments: [
      { id: "TXN001", date: "2024-06-01", amount: 1000, mode: "Online", status: "SUCCESS" }
    ]
  };

  const progress = (feeDetails.paidFees / feeDetails.totalFees) * 100;

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/payment/initiate", {
        courseId: feeDetails.courseId,
        caste: feeDetails.caste
      });
      setSuccess("🎉 Payment successful! Receipt will be available soon.");
    } catch {
      setError("Unable to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid fade-in">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 glow">
        <h3 className="fw-bold mb-1">
          <FaMoneyCheckAlt className="me-2 blink" />
          Student Fees Dashboard
        </h3>
        <p className="opacity-75 mb-0">Track, pay & monitor your fees</p>
      </div>

      {error && <div className="alert alert-danger shake">{error}</div>}
      {success && <div className="alert alert-success pulse">{success}</div>}

      {/* STUDENT INFO */}
      <div className="card glass-card shadow mb-4 slide-up">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaUserGraduate className="me-2" /> Student Profile
          </h5>
          <div className="row">
            <Info label="Name" value={feeDetails.studentName} />
            <Info label="ID" value={feeDetails.studentId} />
            <Info label="Course" value={feeDetails.courseName} />
            <Info label="Academic Year" value={feeDetails.academicYear} />
            <Info label="Category" value={feeDetails.category} />
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="row mb-4">
        <FeeCard title="Total Fees" amount={feeDetails.totalFees} icon={<FaUniversity />} color="primary" />
        <FeeCard title="Paid" amount={feeDetails.paidFees} icon={<FaCheckCircle />} color="success" />
        <FeeCard title="Pending" amount={feeDetails.pendingFees} icon={<FaTimesCircle />} color="danger" />
      </div>

      {/* PROGRESS */}
      <div className="progress mb-4 glow">
        <div className="progress-bar bg-success progress-animate" style={{ width: `${progress}%` }}>
          {progress.toFixed(0)}% Paid
        </div>
      </div>

      {/* INSTALLMENTS */}
      <div className="card glass-card mb-4 slide-up">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaCalendarAlt className="me-2" /> Installments
          </h5>
          <table className="table table-bordered text-center">
            <thead className="table-dark">
              <tr>
                <th>Name</th><th>Amount</th><th>Due</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {feeDetails.installments.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.name}</td>
                  <td>₹ {i.amount}</td>
                  <td>{i.due}</td>
                  <td>
                    <span className={`badge ${i.status === "PAID" ? "bg-success blink" : "bg-danger pulse"}`}>
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORY */}
      <div className="card glass-card mb-4 slide-up">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaReceipt className="me-2" /> Payment History
          </h5>
          <table className="table table-hover text-center">
            <thead>
              <tr><th>ID</th><th>Date</th><th>Amount</th><th>Mode</th><th>Status</th></tr>
            </thead>
            <tbody>
              {feeDetails.payments.map((p, i) => (
                <tr key={i}>
                  <td>{p.id}</td>
                  <td>{p.date}</td>
                  <td>₹ {p.amount}</td>
                  <td>{p.mode}</td>
                  <td><span className="badge bg-success blink">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAY */}
      <div className="text-center mb-5">
        <button
          className="btn btn-lg btn-success glow-btn"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? <FaSpinner className="spin me-2" /> : <FaCreditCard className="me-2" />}
          {loading ? "Processing..." : "Pay Now"}
        </button>
      </div>

      {/* STYLES */}
      <style>{`
        .gradient-header {background: linear-gradient(180deg, #0f3a4a, #134952);}
        .glass-card {background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);}
        .fade-in {animation: fade 1s;}
        .slide-up {animation: slideUp 0.6s;}
        .blink {animation: blink 1.5s infinite;}
        .pulse {animation: pulse 1.5s infinite;}
        .shake {animation: shake 0.3s;}
        .glow {box-shadow: 0 0 20px rgba(15,58,74,0.6);}
        .glow-btn {box-shadow: 0 0 15px #28a745;}
        .spin {animation: spin 1s linear infinite;}
        .progress-animate {animation: grow 1s;}
        @keyframes blink {50%{opacity:0.4}}
        @keyframes pulse {0%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes spin {to{transform:rotate(360deg)}}
        @keyframes fade {from{opacity:0}to{opacity:1}}
        @keyframes slideUp {from{transform:translateY(20px)}to{transform:translateY(0)}}
        @keyframes shake {25%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
        @keyframes grow {from{width:0}}
      `}</style>
    </div>
  );
}

/* ===== Reusable ===== */
function FeeCard({ title, amount, icon, color }) {
  return (
    <div className="col-md-4 mb-3 slide-up">
      <div className="card glass-card text-center">
        <div className="card-body">
          <div className={`fs-2 text-${color}`}>{icon}</div>
          <h6>{title}</h6>
          <h3>₹ {amount}</h3>
        </div>
      </div>
    </div>
  );
}
function Info({ label, value }) {
  return (
    <div className="col-md-4 mb-2">
      <strong>{label}</strong><br />{value}
    </div>
  );
}
