import { useContext, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaMoneyCheckAlt,
  FaUniversity,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaUserGraduate,
  FaCalendarAlt,
  FaReceipt,
  FaBell
} from "react-icons/fa";

export default function StudentFees() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  const loadFees = async () => {
    try {
      const res = await api.get("/student/payments/my-fee-dashboard");
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Unable to load fee dashboard");
      setError("Unable to load fee dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-75">
        <h5 className="text-muted">Loading Fees...</h5>
      </div>
    );
  }

  if (error) return <div className="alert alert-danger text-center">{error}</div>;
  if (!dashboard) return null;

  const progress = Math.round(
    (dashboard.totalPaid / dashboard.totalFee) * 100
  );

  const handleRedirectPayment = (installment) => {
    if (!installment?.name) {
      toast.warning("Invalid installment");
      return;
    }
    navigate("/student/make-payment", {
      state: { installmentName: installment.name }
    });
  };

  const isNearDue = (date) => {
    const diff = new Date(date) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="container-fluid fade-in">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 glow">
        <h3 className="fw-bold mb-1">
          <FaMoneyCheckAlt className="me-2 blink" />
          My Fees
        </h3>
        <p className="opacity-75 mb-0">
          Track and manage your college fees
        </p>
      </div>

      {/* STUDENT INFO */}
      <div className="card glass-card shadow mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaUserGraduate className="me-2" />
            Student Fee Profile
          </h5>
          <div className="row">
            <Info label="College" value={dashboard.college?.name} />
            <Info label="Course" value={dashboard.course?.name} />
            <Info label="Student ID" value={dashboard.studentId} />
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="row mb-4">
        <FeeCard title="Total Fee" amount={dashboard.totalFee} icon={<FaUniversity />} color="primary" />
        <FeeCard title="Paid" amount={dashboard.totalPaid} icon={<FaCheckCircle />} color="success" />
        <FeeCard title="Due" amount={dashboard.totalDue} icon={<FaTimesCircle />} color="danger" />
      </div>

      {/* PROGRESS */}
      <div className="progress mb-4">
        <div
          className="progress-bar bg-success progress-animate"
          style={{ width: `${progress}%` }}
        >
          {progress}% Paid
        </div>
      </div>

      {/* INSTALLMENTS */}
      <div className="card glass-card shadow mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">
            <FaCalendarAlt className="me-2" />
            Installments
          </h5>

          <table className="table table-bordered text-center align-middle">
            <thead className="table-dark">
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Reminder</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.installments?.map((i) => (
                <tr
                  key={i._id}
                  className={i.status === "PAID" ? "table-success" : ""}
                >
                  <td>{i.name}</td>
                  <td>₹ {i.amount}</td>
                  <td>{new Date(i.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${i.status === "PAID" ? "bg-success" : "bg-danger"}`}>
                      {i.status}
                    </span>
                  </td>
                  <td>
                    {i.status === "PENDING" && isNearDue(i.dueDate) && (
                      <FaBell className="text-warning blink" />
                    )}
                  </td>
                  <td>
                    {i.status === "PAID" ? (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => navigate(`/student/fee-receipt/${i._id}`)}
                      >
                        <FaReceipt /> Receipt
                      </button>
                    ) : (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleRedirectPayment(i)}
                      >
                        <FaCreditCard /> Pay
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
        .glass-card {background: rgba(255,255,255,0.96); backdrop-filter: blur(8px);}
        .fade-in {animation: fade 1s;}
        .blink {animation: blink 1.5s infinite;}
        .glow {box-shadow: 0 0 20px rgba(15,58,74,0.6);}
        .progress-animate {animation: grow 1s;}
        @keyframes blink {50%{opacity:0.4}}
        @keyframes fade {from{opacity:0}to{opacity:1}}
        @keyframes grow {from{width:0}}
      `}</style>
    </div>
  );
}

function FeeCard({ title, amount, icon, color }) {
  return (
    <div className="col-md-4 mb-3">
      <div className="card glass-card shadow text-center">
        <div className="card-body">
          <div className={`fs-2 text-${color}`}>{icon}</div>
          <h6>{title}</h6>
          <h3>₹ {amount?.toLocaleString()}</h3>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="col-md-4 mb-2">
      <strong>{label}</strong>
      <br />
      {value || "-"}
    </div>
  );
}
