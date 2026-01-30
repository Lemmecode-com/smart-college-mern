import { useContext, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaReceipt,
  FaUniversity,
} from "react-icons/fa";

export default function PaymentHistory() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading] = useState(false);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= STATIC PAYMENT DATA =================
     🔁 Replace with API later:
     GET /api/students/payments
  */
  const payments = [
    {
      id: "PAY_001",
      academicYear: "2024-25",
      amount: 2500,
      method: "Razorpay",
      status: "SUCCESS",
      date: "2026-01-27",
    },
    {
      id: "PAY_002",
      academicYear: "2023-24",
      amount: 1800,
      method: "Razorpay",
      status: "SUCCESS",
      date: "2025-01-18",
    },
    {
      id: "PAY_003",
      academicYear: "2022-23",
      amount: 1500,
      method: "Razorpay",
      status: "FAILED",
      date: "2024-01-15",
    },
  ];

  /* ================= STATUS BADGE ================= */
  const StatusBadge = ({ status }) => {
    if (status === "SUCCESS") {
      return (
        <span className="badge bg-success">
          <FaCheckCircle className="me-1" />
          SUCCESS
        </span>
      );
    }
    if (status === "FAILED") {
      return (
        <span className="badge bg-danger">
          <FaTimesCircle className="me-1" />
          FAILED
        </span>
      );
    }
    return (
      <span className="badge bg-warning text-dark">
        <FaClock className="me-1" />
        PENDING
      </span>
    );
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Payment History...</h5>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaMoneyBillWave className="me-2 blink" />
          Payment History
        </h3>
        <p className="opacity-75 mb-0">
          View all your fee payment records
        </p>
      </div>

      {/* ================= EMPTY STATE ================= */}
      {payments.length === 0 && (
        <div className="alert alert-warning text-center">
          No payment records found.
        </div>
      )}

      {/* ================= TABLE ================= */}
      {payments.length > 0 && (
        <div className="card shadow-lg border-0 rounded-4 glass-card">
          <div className="card-body">
            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>
                    <FaUniversity className="me-1" />
                    Academic Year
                  </th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-center">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, index) => (
                  <tr key={p.id}>
                    <td>{index + 1}</td>
                    <td>{p.academicYear}</td>
                    <td>₹ {p.amount}</td>
                    <td>{p.method}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="text-center">
                      {p.status === "SUCCESS" ? (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() =>
                            navigate(
                              `/student/fee-receipt/${p.id}`
                            )
                          }
                        >
                          <FaReceipt className="me-1" />
                          View
                        </button>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
