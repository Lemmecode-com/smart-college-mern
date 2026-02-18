import { useEffect, useState, useContext } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { AuthContext } from "../../../auth/AuthContext";

import {
  FaCheckCircle,
  FaSpinner,
  FaMoneyBillWave,
  FaArrowLeft,
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
          sessionId,
        });

        setPayment(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Payment confirmation failed");
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
    <div className="payment-success-wrapper">
      <div className="success-card">
        {/* SUCCESS ICON */}
        <div className="success-icon-wrapper">
          <FaCheckCircle className="success-icon" />
        </div>

        <h2 className="success-title">Payment Successful</h2>
        <p className="success-subtitle">
          Your payment has been processed securely.
        </p>

        {/* INSTALLMENT INFO */}
        <div className="payment-info">
          <div className="info-row">
            <span>Installment</span>
            <strong>{payment?.installment?.name}</strong>
          </div>

          <div className="info-row">
            <span>Amount Paid</span>
            <strong className="text-success">
              ₹{payment?.installment?.amount?.toLocaleString()}
            </strong>
          </div>

          <div className="info-row">
            <span>Paid On</span>
            <strong>
              {payment?.installment?.paidAt
                ? new Date(payment.installment.paidAt).toLocaleString("en-IN")
                : "N/A"}
            </strong>
          </div>

          <div className="info-row">
            <span>Transaction ID</span>
            <strong className="transaction-id">
              {payment?.installment?.transactionId || "N/A"}
            </strong>
          </div>
        </div>

        {/* SUMMARY BOX */}
        <div className="summary-grid">
          <div className="summary-box total">
            <h4>₹{payment?.totalFee?.toLocaleString()}</h4>
            <span>Total Fee</span>
          </div>

          <div className="summary-box paid">
            <h4>₹{payment?.paidAmount?.toLocaleString()}</h4>
            <span>Total Paid</span>
          </div>

          <div className="summary-box remaining">
            <h4>₹{payment?.remainingAmount?.toLocaleString()}</h4>
            <span>Remaining</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="action-buttons">
          <button
            className="btn-outline"
            onClick={() => navigate("/student/fees")}
          >
            <FaArrowLeft /> Back to Fees
          </button>

          <button
            className="btn-primary"
            onClick={() =>
              navigate(`/student/fee-receipt/${payment?.installment?._id}`)
            }
          >
            View Receipt
          </button>
        </div>
      </div>

      <style>{`
      .payment-success-wrapper {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #eef2f7, #d9e2ec);
        padding: 20px;
      }

      .success-card {
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(12px);
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.08);
        width: 100%;
        max-width: 620px;
        text-align: center;
        animation: fadeIn 0.6s ease-in-out;
      }

      .success-icon-wrapper {
        background: #e6f9f0;
        width: 80px;
        height: 80px;
        margin: 0 auto 15px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .success-icon {
        font-size: 40px;
        color: #16a34a;
      }

      .success-title {
        font-weight: 700;
        margin-bottom: 5px;
      }

      .success-subtitle {
        color: #6b7280;
        margin-bottom: 25px;
      }

      .payment-info {
        text-align: left;
        margin-bottom: 25px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
        font-size: 14px;
      }

      .transaction-id {
        font-size: 12px;
        color: #3b82f6;
        word-break: break-all;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 25px;
      }

      .summary-box {
        padding: 15px;
        border-radius: 12px;
        text-align: center;
        background: #f8fafc;
      }

      .summary-box h4 {
        font-weight: 700;
        margin-bottom: 5px;
      }

      .summary-box.total { background: #e0f2fe; }
      .summary-box.paid { background: #dcfce7; }
      .summary-box.remaining { background: #fee2e2; }

      .action-buttons {
        display: flex;
        justify-content: center;
        gap: 15px;
        flex-wrap: wrap;
      }

      .btn-outline {
        padding: 10px 18px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: white;
        cursor: pointer;
        font-weight: 500;
      }

      .btn-primary {
        padding: 10px 18px;
        border-radius: 8px;
        border: none;
        background: #0f172a;
        color: white;
        cursor: pointer;
        font-weight: 500;
      }

      .btn-primary:hover {
        background: #1e293b;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 600px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
    </div>
  );
}
