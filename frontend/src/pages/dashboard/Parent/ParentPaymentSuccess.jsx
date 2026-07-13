import { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
        <div style={{ textAlign: "center" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ fontSize: "3rem", color: "#1a4b6d" }}>
            <FaSpinner />
          </motion.div>
          <h4 className="mt-3" style={{ color: "#1a4b6d" }}>Confirming your payment...</h4>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <FaExclamationTriangle size={48} color="#ffc107" />
          <h4 className="mt-3">Payment Status</h4>
          <p className="text-muted">{error.message || error}</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate("/dashboard/parent/children")}>
            <FaArrowLeft className="me-2" /> Back to Children
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", padding: "20px" }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ background: "white", borderRadius: "16px", padding: "40px", maxWidth: "500px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
        <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(34,197,94,0.25)" }}>
          <FaCheckCircle size={44} color="#16a34a" />
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Payment Successful</h1>
        <p style={{ color: "#64748b", margin: "0 0 20px" }}>Your payment has been processed securely.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px", textAlign: "left" }}>
          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px" }}>
            <small style={{ color: "#64748b", fontWeight: 500 }}>Amount Paid</small>
            <div style={{ fontWeight: 700, color: "#16a34a" }}>₹{(payment?.amount || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px" }}>
            <small style={{ color: "#64748b", fontWeight: 500 }}>Remaining</small>
            <div style={{ fontWeight: 700, color: "#dc3545" }}>₹{(payment?.remainingAmount || 0).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-outline-secondary" onClick={() => navigate("/dashboard/parent/children")}>
            <FaArrowLeft className="me-1" /> Back to Children
          </button>
        </div>
      </motion.div>
    </div>
  );
}
