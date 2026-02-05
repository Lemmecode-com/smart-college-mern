import { useEffect, useState, useContext } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaCheckCircle,
  FaSpinner,
  FaMoneyBillWave,
  FaArrowLeft
} from "react-icons/fa";

export default function PaymentSuccess() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= CONFIRM PAYMENT ================= */
  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const res = await api.post("/stripe/confirm-payment", {
          sessionId
        });

        setPayment(res.data);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message || "Payment confirmation failed"
        );
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) confirmPayment();
  }, [sessionId]);

  /* ================= LOADING UI ================= */
  if (loading) {
    return (
      <div className="vh-100 d-flex flex-column justify-content-center align-items-center">
        <FaSpinner className="spin text-primary mb-3" size={40} />
        <h5>Confirming your payment…</h5>
      </div>
    );
  }

  /* ================= ERROR UI ================= */
  if (error) {
    return (
      <div className="vh-100 d-flex flex-column justify-content-center align-items-center text-center">
        <h4 className="text-danger mb-2">Payment Failed</h4>
        <p>{error}</p>
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate("/student/fees")}
        >
          Go Back
        </button>
      </div>
    );
  }

  /* ================= SUCCESS UI ================= */
  return (
    <div className="container py-5 fade-in">
      <div className="card shadow-lg border-0 rounded-4 mx-auto" style={{ maxWidth: 600 }}>
        <div className="card-body text-center p-4">

          <FaCheckCircle size={50} className="text-success mb-3" />
          <h4 className="fw-bold mb-2">Payment Successful</h4>

          <p className="mb-1">
            <strong>Installment:</strong>{" "}
            {payment?.installment?.name}
          </p>

          <p className="mb-1">
            <strong>Amount Paid:</strong> ₹
            {payment?.installment?.amount}
          </p>

          <p className="mb-3">
            <strong>Paid At:</strong>{" "}
            {new Date(payment?.installment?.paidAt).toLocaleString()}
          </p>

          <hr />

          <div className="row text-center">
            <div className="col-4">
              <FaMoneyBillWave className="text-primary" />
              <p className="fw-bold mb-0">₹{payment?.totalFee}</p>
              <small>Total</small>
            </div>
            <div className="col-4">
              <FaCheckCircle className="text-success" />
              <p className="fw-bold mb-0">₹{payment?.paidAmount}</p>
              <small>Paid</small>
            </div>
            <div className="col-4">
              <FaMoneyBillWave className="text-danger" />
              <p className="fw-bold mb-0">₹{payment?.remainingAmount}</p>
              <small>Remaining</small>
            </div>
          </div>

          <div className="mt-4">
            <button
              className="btn btn-outline-secondary me-2"
              onClick={() => navigate("/student/fees")}
            >
              <FaArrowLeft className="me-1" />
              Back to Fees
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .fade-in { animation: fade 0.5s; }
        .spin { animation: spin 1s linear infinite; }

        @keyframes fade {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  );
}
