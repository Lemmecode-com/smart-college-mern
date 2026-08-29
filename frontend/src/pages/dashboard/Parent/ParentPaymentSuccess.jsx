import { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import "./ParentPortal.css";

import {
  FaCheckCircle,
  FaArrowLeft,
  FaExclamationTriangle,
  FaSpinner,
  FaRupeeSign,
} from "react-icons/fa";

const AUTH_ERROR_CODES = new Set([
  "TOKEN_MISSING",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_BLACKLISTED",
  "TOKEN_INVALIDATED",
  "USER_NOT_FOUND",
  "ACCOUNT_DEACTIVATED",
  "UNAUTHORIZED",
]);

export default function ParentPaymentSuccess() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No payment session found.");
      setLoading(false);
      return;
    }

    let interval;
    let attempts = 0;
    const maxAttempts = 15;
    let confirmed = false;

    const confirmPayment = async () => {
      try {
        const confirmRes = await api.post("/parent/payments/confirm", { sessionId });
        if (confirmRes.data?.installment?.status === "PAID" || confirmRes.data?.status === "PAID") {
          confirmed = true;
          clearInterval(interval);
          setPayment({
            installmentId: confirmRes.data.installmentId || confirmRes.data.installment?._id,
            amount: confirmRes.data.amount || confirmRes.data.installment?.amount,
            paidAt: confirmRes.data.paidAt || confirmRes.data.installment?.paidAt,
            transactionId: confirmRes.data.transactionId || confirmRes.data.installment?.transactionId,
            paymentGateway: confirmRes.data.paymentGateway || confirmRes.data.installment?.paymentGateway || "STRIPE",
            totalFee: confirmRes.data.totalFee,
            paidAmount: confirmRes.data.paidAmount,
            remainingAmount: confirmRes.data.remainingAmount,
          });
          toast.success("Payment confirmed successfully!", { position: "top-right", autoClose: 3000 });
          setLoading(false);
        }
      } catch {
        // Ignore confirm errors and fall back to polling
      }
    };

    const poll = async () => {
      if (confirmed) return;
      try {
        const res = await api.get(`/parent/payments/status?sessionId=${sessionId}`);
        if (res.data.status === "PAID") {
          clearInterval(interval);
          setPayment({
            installmentId: res.data.installmentId,
            amount: res.data.amount,
            paidAt: res.data.paidAt,
            transactionId: res.data.transactionId,
            paymentGateway: res.data.paymentGateway || "STRIPE",
            totalFee: res.data.totalFee,
            paidAmount: res.data.paidAmount,
            remainingAmount: res.data.remainingAmount,
          });
          toast.success("Payment confirmed successfully!", { position: "top-right", autoClose: 3000 });
          setLoading(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError("Payment is still processing. Please check back in a few moments.");
          setLoading(false);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          const statusCode = err?.response?.status;
          const errorCode = err?.response?.data?.code;
          if (statusCode === 401 || (errorCode && AUTH_ERROR_CODES.has(errorCode))) {
            setError({ message: "Session expired. Please sign in again.", statusCode, errorCode });
          } else {
            setError("Payment is still processing. Please check back in a few moments.");
          }
          setLoading(false);
        }
      }
    };

    confirmPayment();
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (authLoading) return <Loading fullScreen text="Verifying your session..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container parent-loading-container" style={{ minHeight: '50vh' }}>
          <div className="parent-loading-state">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="parent-loading-spinner" style={{ fontSize: "3rem", color: "var(--parent-primary)" }}>
              <FaSpinner />
            </motion.div>
            <h4 className="parent-mt-3" style={{ color: "var(--parent-primary)" }}>Confirming your payment...</h4>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parent-portal-wrapper">
        <div className="parent-portal-container parent-loading-container" style={{ minHeight: '50vh' }}>
          <div className="parent-error-state">
            <div className="parent-error-icon">
              <FaExclamationTriangle size={32} />
            </div>
            <h2 className="parent-error-title">Payment Status</h2>
            <p className="parent-error-message">{error.message || error}</p>
            <div className="parent-error-actions">
              <button className="parent-btn-primary" onClick={() => navigate("/dashboard/parent/children")}>
                <FaArrowLeft className="parent-me-2" /> Back to Children
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-portal-wrapper">
      <div className="parent-portal-container parent-loading-container" style={{ minHeight: '50vh' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="parent-success-card">
          <div className="parent-success-icon">
            <FaCheckCircle size={44} />
          </div>
          <h1 className="parent-success-title">Payment Successful</h1>
          <p className="parent-success-message">Your payment has been processed securely.</p>

          <div className="parent-success-grid">
            <div className="parent-success-stat">
              <small className="parent-success-stat-label">Amount Paid</small>
              <div className="parent-success-stat-value" style={{ color: "#16a34a" }}>₹{(payment?.amount || 0).toLocaleString()}</div>
            </div>
            <div className="parent-success-stat">
              <small className="parent-success-stat-label">Remaining</small>
              <div className="parent-success-stat-value" style={{ color: "#dc3545" }}>₹{(payment?.remainingAmount || 0).toLocaleString()}</div>
            </div>
          </div>

          <button className="parent-btn-outline" onClick={() => navigate("/dashboard/parent/children")}>
            <FaArrowLeft className="parent-me-1" /> Back to Children
          </button>
        </motion.div>
      </div>
    </div>
  );
}
