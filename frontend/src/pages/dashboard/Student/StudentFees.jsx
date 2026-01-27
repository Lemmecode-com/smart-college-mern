import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaMoneyCheckAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaFileInvoice,
  FaUniversity
} from "react-icons/fa";

export default function StudentFees() {
  const { user } = useContext(AuthContext);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= STATIC FEES DATA ================= */
  const feeData = {
    studentName: "Sagar Kokare",
    course: "Bachelor Of Arts",
    academicYear: "2024-2025",
    totalFees: 45000,
    paidAmount: 30000,
    pendingAmount: 15000,
    status: "PARTIALLY_PAID",
    installments: [
      {
        id: 1,
        title: "Admission Fee",
        amount: 15000,
        status: "PAID",
        paidOn: "2024-07-10"
      },
      {
        id: 2,
        title: "Semester 1 Fee",
        amount: 15000,
        status: "PAID",
        paidOn: "2024-10-01"
      },
      {
        id: 3,
        title: "Semester 2 Fee",
        amount: 15000,
        status: "PENDING",
        paidOn: null
      }
    ]
  };

  return (
    <div className="container-fluid">

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaMoneyCheckAlt className="me-2 blink" />
          My Fees
        </h3>
        <p className="opacity-75 mb-0">
          Fee details & payment history
        </p>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="row mb-4">

        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4 glass-card text-center">
            <div className="card-body">
              <FaUniversity size={40} className="text-primary mb-2" />
              <h6>Total Fees</h6>
              <h3 className="fw-bold">₹{feeData.totalFees}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4 glass-card text-center">
            <div className="card-body">
              <FaCheckCircle size={40} className="text-success mb-2" />
              <h6>Paid</h6>
              <h3 className="fw-bold text-success">
                ₹{feeData.paidAmount}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-lg border-0 rounded-4 glass-card text-center">
            <div className="card-body">
              <FaTimesCircle size={40} className="text-danger mb-2" />
              <h6>Pending</h6>
              <h3 className="fw-bold text-danger">
                ₹{feeData.pendingAmount}
              </h3>
            </div>
          </div>
        </div>

      </div>

      {/* ================= PAYMENT STATUS ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card mb-4">
        <div className="card-body text-center">
          <h5 className="fw-bold">Overall Status</h5>
          {feeData.pendingAmount === 0 ? (
            <span className="badge bg-success fs-6">
              <FaCheckCircle className="me-1" />
              Fully Paid
            </span>
          ) : (
            <span className="badge bg-warning text-dark fs-6">
              Partial Payment
            </span>
          )}
        </div>
      </div>

      {/* ================= INSTALLMENTS TABLE ================= */}
      <div className="card shadow-lg border-0 rounded-4 glass-card">
        <div className="card-body">

          <h5 className="fw-bold mb-3">
            <FaFileInvoice className="me-2" />
            Installment Details
          </h5>

          <table className="table table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {feeData.installments.map((i, index) => (
                <tr key={i.id}>
                  <td>{index + 1}</td>
                  <td>{i.title}</td>
                  <td>₹{i.amount}</td>
                  <td>
                    <span className={`badge ${
                      i.status === "PAID"
                        ? "bg-success"
                        : "bg-danger"
                    }`}>
                      {i.status}
                    </span>
                  </td>
                  <td>
                    {i.paidOn
                      ? new Date(i.paidOn).toDateString()
                      : "-"}
                  </td>
                  <td>
                    {i.status === "PENDING" ? (
                      <button className="btn btn-sm btn-primary">
                        Pay Now
                      </button>
                    ) : (
                      <span className="text-success fw-bold">
                        Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
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
