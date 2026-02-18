import { useContext, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaMoneyBillWave,
  FaArrowLeft,
  FaCheckCircle,
  FaSpinner,
  FaReceipt,
  FaUniversity,
  FaCreditCard,
} from "react-icons/fa";

export default function MakePayments() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // const [installmentName, setInstallmentName] = useState("");

  const [installmentName, setInstallmentName] = useState(
    location.state?.installmentName || "",
  );

  const [installmentDetails, setInstallmentDetails] = useState({
    id: location.state?.installmentId || null,
    amount: location.state?.amount || null,
    dueDate: location.state?.dueDate || null,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  useEffect(() => {
    if (!location.state?.installmentName) {
      toast.warning("No installment selected");
      navigate("/student/fees");
    }
  }, []);

  /* ======================================================
     🔹 STRIPE PAYMENT HANDLER (REAL PAYMENT)
     ====================================================== */
  const handleStripePayment = async () => {
    if (!installmentName.trim()) {
      toast.warning("Please enter installment name");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/stripe/create-checkout-session", {
        installmentName,
      });

      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      toast.error(err.response?.data?.message || "Stripe payment failed");
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     🔹 MOCK PAYMENT HANDLER (EXISTING – UNTOUCHED)
     ====================================================== */
  const handleMockPayment = async () => {
    if (!installmentName.trim()) {
      toast.warning("Please enter installment name");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const res = await api.post("/student/payments/mock-success", {
        installmentName,
      });

      setResult(res.data);
      toast.success("🎉 Mock payment successful!");
      setInstallmentName("");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Mock payment failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid py-4 fade-in">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold mb-1">
            <FaMoneyBillWave className="me-2 blink" />
            Make Payment
          </h4>
          <p className="opacity-75 mb-0">
            Secure Stripe or Mock installment payment
          </p>
        </div>

        <button className="btn btn-light" onClick={() => navigate(-1)}>
          <FaArrowLeft className="me-1" />
          Back
        </button>
      </div>

      {/* ================= FORM ================= */}
      <div className="card-body p-4 payment-card-body">
        {/* ====== HEADER ====== */}
        <div className="mb-4">
          <div className="installment-badge mb-2">
            <FaReceipt className="me-2" />
            {installmentName}
          </div>

          <h3 className="fw-bold mb-1 text-dark">
            ₹{installmentDetails.amount?.toLocaleString()}
          </h3>

          <div className="text-muted small">
            Due on{" "}
            <strong>
              {installmentDetails.dueDate
                ? new Date(installmentDetails.dueDate).toLocaleDateString(
                    "en-IN",
                  )
                : "N/A"}
            </strong>
          </div>
        </div>

        {/* ====== PAYMENT INFO BOX ====== */}
        <div className="payment-info-box mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <span>Installment</span>
            <span className="fw-semibold">{installmentName}</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <span>Amount</span>
            <span className="fw-bold text-primary">
              ₹{installmentDetails.amount?.toLocaleString()}
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <span>Status</span>
            <span className="badge bg-warning text-dark">Pending</span>
          </div>
        </div>

        <div className="d-flex flex-column align-items-center">
          {/* ====== STRIPE BUTTON ====== */}
          <button
            className="btn stripe-btn w-25 mb-3"
            onClick={handleStripePayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSpinner className="me-2 spin" />
                Redirecting to Secure Checkout...
              </>
            ) : (
              <>
                <FaCreditCard className="me-2" />
                Pay Securely with Stripe
              </>
            )}
          </button>

          {/* ====== MOCK BUTTON ====== */}
          <button
            className="btn btn-outline-success w-25 rounded-pill"
            onClick={handleMockPayment}
            disabled={loading}
          >
            <FaMoneyBillWave className="me-2" />
            Mock Pay (Test Mode)
          </button>
        </div>
      </div>

      {/* ================= RESULT (MOCK ONLY) ================= */}
      {result && result.installment && (
        <div className="row justify-content-center mt-4 slide-up">
          <div className="col-lg-7 col-md-9">
            <div className="card border-0 shadow rounded-4">
              <div className="card-body text-center">
                <FaCheckCircle size={40} className="text-success mb-2" />
                <h5 className="fw-bold">Payment Successful</h5>

                <p className="mb-1">
                  <strong>Installment:</strong> {result.installment.name}
                </p>
                <p className="mb-1">
                  <strong>Amount:</strong> ₹{result.installment.amount}
                </p>
                <p className="mb-1">
                  <strong>Status:</strong> {result.installment.status}
                </p>
                <p className="mb-2">
                  <strong>Paid At:</strong>{" "}
                  {new Date(result.installment.paidAt).toLocaleString()}
                </p>

                <hr />

                <div className="row text-center">
                  <div className="col-4">
                    <FaUniversity className="text-primary" />
                    <p className="mb-0 fw-bold">₹{result.totalFee}</p>
                    <small>Total</small>
                  </div>
                  <div className="col-4">
                    <FaCheckCircle className="text-success" />
                    <p className="mb-0 fw-bold">₹{result.paidAmount}</p>
                    <small>Paid</small>
                  </div>
                  <div className="col-4">
                    <FaMoneyBillWave className="text-danger" />
                    <p className="mb-0 fw-bold">₹{result.remainingAmount}</p>
                    <small>Remaining</small>
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() =>
                      navigate(`/student/fee-receipt/${result.installment._id}`)
                    }
                  >
                    <FaReceipt className="me-1" />
                    View Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CSS ================= */}
      <style>{`
        .gradient-header {
          background: linear-gradient(180deg, #0f3a4a, #134952);
        }
        .glass-card {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
        }
        .fade-in { animation: fade 0.6s; }
        .slide-up { animation: slideUp 0.6s; }
        .blink { animation: blink 1.5s infinite; }
        .spin { animation: spin 1s linear infinite; }

        @keyframes fade {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity:0 }
          to { transform: translateY(0); opacity:1 }
        }
        @keyframes blink {
          50% { opacity: 0.4 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }

        .payment-card-body {
  background: linear-gradient(145deg, #ffffff, #f8fbfd);
  border-radius: 20px;
}

.installment-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #0f3a4a, #1a4b6d);
  color: white;
  font-size: 14px;
  border-radius: 50px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.payment-info-box {
  background: rgba(15, 58, 74, 0.05);
  padding: 18px;
  border-radius: 14px;
  font-size: 14px;
  backdrop-filter: blur(6px);
}

.stripe-btn {
  background: linear-gradient(90deg, #635bff, #4f46e5);
  color: white;
  border: none;
  padding: 12px;
  font-weight: 600;
  border-radius: 50px;
  transition: all 0.3s ease;
  box-shadow: 0 6px 18px rgba(99, 91, 255, 0.4);
}

.stripe-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(99, 91, 255, 0.5);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

      `}</style>
    </div>
  );
}
