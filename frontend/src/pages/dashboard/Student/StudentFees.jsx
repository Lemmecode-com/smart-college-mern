import { useContext, useEffect, useState } from "react";
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
  FaCalendarAlt,
  FaBell
} from "react-icons/fa";

export default function StudentFees() {
  const { user } = useContext(AuthContext);

  const [feeDash, setFeeDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [error, setError] = useState("");

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= LOAD DASHBOARD ================= */
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/student/payments/my-fee-dashboard");
      setFeeDash(res.data);
    } catch (err) {
      console.error("Fee dashboard error", err);
      setError("Unable to load fee dashboard");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PAY INSTALLMENT ================= */
  const payInstallment = async (inst) => {
    try {
      setPaying(inst._id);

      const res = await api.post(
        "/student/payments/create-order",
        { installmentName: inst.name }
      );

      // PhonePe redirect flow
      const form = document.createElement("form");
      form.method = "POST";
      form.action = res.data.paymentUrl;

      const input1 = document.createElement("input");
      input1.name = "request";
      input1.value = res.data.payload;

      const input2 = document.createElement("input");
      input2.name = "checksum";
      input2.value = res.data.checksum;

      form.appendChild(input1);
      form.appendChild(input2);

      document.body.appendChild(form);
      form.submit();

    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <div className="vh-75 d-flex justify-content-center align-items-center">
        <h5 className="text-muted">Loading Fee Dashboard...</h5>
      </div>
    );
  }

  if (!feeDash)
    return <div className="alert alert-danger text-center">{error}</div>;

  const progress =
    (feeDash.totalPaid / feeDash.totalFee) * 100;

  return (
    <div className="container-fluid fade-in">

      {/* HEADER */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4">
        <h3 className="fw-bold mb-1">
          <FaMoneyCheckAlt className="me-2" />
          Student Fees Dashboard
        </h3>
        <p className="opacity-75 mb-0">
          {feeDash.college.name} • {feeDash.course.name}
        </p>
      </div>

      {/* SUMMARY */}
      <div className="row mb-4">
        <FeeCard title="Total Fees" amount={feeDash.totalFee} icon={<FaUniversity />} color="primary" />
        <FeeCard title="Paid" amount={feeDash.totalPaid} icon={<FaCheckCircle />} color="success" />
        <FeeCard title="Pending" amount={feeDash.totalDue} icon={<FaTimesCircle />} color="danger" />
      </div>

      {/* PROGRESS */}
      <div className="progress mb-4">
        <div
          className="progress-bar bg-success"
          style={{ width: `${progress}%` }}
        >
          {progress.toFixed(0)}% Paid
        </div>
      </div>

      {/* INSTALLMENTS */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaCalendarAlt className="me-2" /> Installments
          </h5>

          <table className="table table-bordered text-center">
            <thead className="table-dark">
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Status</th>
                <th>Pay</th>
              </tr>
            </thead>
            <tbody>
              {feeDash.installments.map((i) => (
                <tr key={i._id}>
                  <td>{i.name}</td>
                  <td>₹ {i.amount}</td>
                  <td>{new Date(i.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${i.status === "PAID" ? "bg-success" : "bg-danger"}`}>
                      {i.status}
                    </span>
                  </td>
                  <td>
                    {i.status === "PAID" ? (
                      <span className="text-success">Paid</span>
                    ) : (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => payInstallment(i)}
                        disabled={paying === i._id}
                      >
                        {paying === i._id ? (
                          <FaSpinner className="spin" />
                        ) : (
                          <FaCreditCard />
                        )}
                        Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>

      <style>{`
        .gradient-header {background: linear-gradient(180deg, #0f3a4a, #134952);}
        .fade-in {animation: fade 1s;}
        .spin {animation: spin 1s linear infinite;}
        @keyframes spin {to{transform:rotate(360deg)}}
        @keyframes fade {from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
  );
}

/* ===== CARD ===== */
function FeeCard({ title, amount, icon, color }) {
  return (
    <div className="col-md-4 mb-3">
      <div className="card text-center shadow">
        <div className="card-body">
          <div className={`fs-2 text-${color}`}>{icon}</div>
          <h6>{title}</h6>
          <h3>₹ {amount}</h3>
        </div>
      </div>
    </div>
  );
}
