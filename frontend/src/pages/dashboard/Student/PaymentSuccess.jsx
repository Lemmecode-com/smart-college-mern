import { useEffect, useState, useContext } from "react";
import { useSearchParams, Navigate, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
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
  FaExclamationTriangle,
  FaCreditCard,
  FaInfoCircle,
} from "react-icons/fa";

export default function PaymentSuccess() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get("session_id");
  const paymentId = searchParams.get("payment_id");
  const paymentGateway = searchParams.get("gateway") || "stripe";

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  /* ================= SECURITY - WAIT FOR AUTH LOADING ================= */
  // Wait for auth to finish loading before any redirects
  if (authLoading) {
    return <Loading fullScreen text="Verifying your session..." />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "STUDENT")
    return <Navigate to="/student/dashboard" replace />;

  /* ================= POLL FOR PAYMENT STATUS (STRIPE WEBHOOK FLOW) ================= */
  useEffect(() => {
    // Only run for Stripe payments (Razorpay has its own useEffect below)
    if (!sessionId || paymentGateway === "razorpay") {
      // Don't set error for Razorpay - it has its own flow
      if (paymentGateway !== "razorpay") {
        setError("No session ID provided");
        setLoading(false);
      }
      return;
    }

    const pollPaymentStatus = async () => {
      const maxAttempts = 15; // 30 seconds total (2s intervals)
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;

        try {
          const res = await api.get(
            `/student/payments/status?sessionId=${sessionId}`,
          );

          if (res.data.status === "PAID") {
            clearInterval(interval);
            setPayment({
              ...res.data,
              paymentGateway: res.data.paymentGateway || "STRIPE",
            });
            toast.success("Payment confirmed successfully!", {
              position: "top-right",
              autoClose: 3000,
              icon: <FaCheckCircle />,
            });
            setLoading(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setError(
              "Payment is still processing. Please check back in a few moments.",
            );
            setLoading(false);
          }
        } catch (err) {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            const errorMsg =
              err.response?.data?.message || "Payment confirmation timeout";
            setError(errorMsg);
            toast.error(errorMsg, {
              position: "top-right",
              autoClose: 5000,
              icon: <FaExclamationTriangle />,
            });
            setLoading(false);
          }
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    };

    pollPaymentStatus();
  }, [sessionId]);

  /* ================= POLL FOR PAYMENT STATUS (RAZORPAY WEBHOOK FLOW) ================= */
  useEffect(() => {
    if (paymentGateway !== "razorpay") return;

    // orderId is saved on the installment at createRazorpayOrder time
    const orderId = searchParams.get("order_id");
    if (!orderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    const pollRazorpayPaymentStatus = async () => {
      const maxAttempts = 30; // 60 seconds total (2s intervals)
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;

        try {
          const res = await api.get(
            `/student/payments/status?orderId=${orderId}&gateway=razorpay`,
          );

          if (res.data.status === "PAID") {
            clearInterval(interval);
            setPayment({
              ...res.data,
              paymentGateway: "RAZORPAY",
            });
            toast.success("Payment confirmed successfully!", {
              position: "top-right",
              autoClose: 3000,
              icon: <FaCheckCircle />,
            });
            setLoading(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setError(
              "Payment is still processing. Please check back in a few moments.",
            );
            setLoading(false);
          }
        } catch (err) {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            const errorMsg =
              err.response?.data?.message || "Payment confirmation timeout";
            setError(errorMsg);
            toast.error(errorMsg, {
              position: "top-right",
              autoClose: 5000,
              icon: <FaExclamationTriangle />,
            });
            setLoading(false);
          }
        }
      }, 2000);

      return () => clearInterval(interval);
    };

    pollRazorpayPaymentStatus();
  }, [paymentGateway, searchParams]);

  /* ================= LOADING UI ================= */
  if (loading) {
    return <Loading fullScreen size="lg" text="Confirming your payment..." />;
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
                scale: [1, 1.1, 1],
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

        {/* PAYMENT GATEWAY BADGE */}
        {paymentGateway && (
          <div className="gateway-badge-wrapper">
            <span className={`gateway-badge ${paymentGateway.toLowerCase()}`}>
              {paymentGateway === "RAZORPAY" ? (
                <>
                  <FaCreditCard /> Razorpay
                </>
              ) : paymentGateway === "STRIPE" ? (
                <>
                  <FaCreditCard /> Stripe
                </>
              ) : (
                paymentGateway
              )}
            </span>
          </div>
        )}

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
            {paymentGateway === "RAZORPAY" && payment?.paymentId && (
              <div className="razorpay-payment-id">
                <small>Payment ID: {payment.paymentId}</small>
              </div>
            )}
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
            onClick={() => {
              const installmentId =
                payment?.installment?._id ||
                window.history.state?.usr?.paymentData?.installment?._id;
              if (installmentId) {
                navigate(`/student/fee-receipt/${installmentId}`);
              } else {
                toast.error(
                  "Receipt ID not found. Please go back and try again.",
                  {
                    position: "top-right",
                    autoClose: 5000,
                    icon: <FaExclamationTriangle />,
                  },
                );
              }
            }}
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

      .gateway-badge-wrapper {
        margin-bottom: 20px;
        display: flex;
        justify-content: center;
      }

      .gateway-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .gateway-badge.razorpay {
        background: linear-gradient(135deg, #528bff, #3b82f6);
        color: white;
        box-shadow: 0 4px 12px rgba(82, 138, 255, 0.3);
      }

      .gateway-badge.stripe {
        background: linear-gradient(135deg, #635bff, #7c73ff);
        color: white;
        box-shadow: 0 4px 12px rgba(99, 91, 255, 0.3);
      }

      .razorpay-payment-id {
        margin-top: 4px;
        padding: 4px 8px;
        background: #f0f7ff;
        border-radius: 4px;
        color: #0369a1;
        font-size: 11px;
        font-family: 'Consolas', monospace;
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
