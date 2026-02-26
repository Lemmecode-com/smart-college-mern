import { useEffect, useState, useContext } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { AuthContext } from "../../../auth/AuthContext";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaCheckCircle,
  FaTimesCircle,
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
        toast.success("Payment confirmed successfully!", {
          position: "top-right",
          autoClose: 3000,
          icon: <FaCheckCircle />
        });
      } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.message || "Payment confirmation failed";
        setError(errorMsg);
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaExclamationTriangle />
        });
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) confirmPayment();
  }, [sessionId]);

  /* ================= LOADING UI ================= */
  if (loading) {
    return (
      <div className="payment-loading-wrapper">
        <ToastContainer position="top-right" />
        <motion.div
          className="loading-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="spin-icon" />
          <h3>Confirming your payment...</h3>
          <p>Please wait while we process your transaction</p>
          <div className="loading-progress-bar">
            <div className="loading-progress"></div>
          </div>
          <div className="security-badges">
            <span>🔒 Secure Payment</span>
            <span>✅ PCI Compliant</span>
          </div>
        </motion.div>
        <style>{`
          .payment-loading-wrapper {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          }
          .loading-content {
            text-align: center;
            background: white;
            padding: 50px;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          }
          .spin-icon {
            font-size: 4rem;
            color: #3b82f6;
            animation: spin 1s linear infinite;
            margin-bottom: 1.5rem;
          }
          .loading-content h3 {
            margin: 0 0 0.5rem 0;
            color: #1e293b;
            font-weight: 700;
            font-size: 1.5rem;
          }
          .loading-content p {
            color: #64748b;
            margin: 0 0 1.5rem 0;
          }
          .loading-progress-bar {
            width: 200px;
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin: 0 auto 1.5rem;
            overflow: hidden;
          }
          .loading-progress {
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #2563eb);
            animation: loading 1.5s ease-in-out infinite;
          }
          .security-badges {
            display: flex;
            justify-content: center;
            gap: 1rem;
            font-size: 0.85rem;
            color: #059669;
            font-weight: 600;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  /* ================= ERROR UI ================= */
  if (error) {
    return (
      <div className="payment-error-wrapper">
        <ToastContainer position="top-right" />
        <motion.div
          className="error-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="error-icon-wrapper">
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 0.5 }}
            >
              <FaTimesCircle className="error-icon" />
            </motion.div>
          </div>
          <h4 className="error-title">Payment Failed</h4>
          <p className="error-message">{error}</p>
          <button
            className="btn-back"
            onClick={() => navigate("/student/fees")}
          >
            <FaArrowLeft /> Go Back
          </button>
        </motion.div>
        <style>{`
          .payment-error-wrapper {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            padding: 20px;
          }
          .error-card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 15px 40px rgba(220, 53, 69, 0.2);
            width: 100%;
            max-width: 500px;
            text-align: center;
          }
          .error-icon-wrapper {
            width: 100px;
            height: 100px;
            margin: 0 auto 20px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .error-icon {
            font-size: 50px;
            color: #dc3545;
          }
          .error-title {
            margin: 0 0 10px 0;
            color: #dc3545;
            font-weight: 700;
          }
          .error-message {
            color: #6b7280;
            margin: 0 0 25px 0;
          }
          .btn-back {
            padding: 12px 24px;
            border-radius: 10px;
            border: none;
            background: linear-gradient(135deg, #0f3a4a, #1a4b6d);
            color: white;
            cursor: pointer;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
          }
          .btn-back:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(15, 58, 74, 0.4);
          }
        `}</style>
      </div>
    );
  }

  /* ================= SUCCESS UI ================= */
  return (
    <div className="payment-success-wrapper">
      <ToastContainer position="top-right" />
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
