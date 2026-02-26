import { useContext, useEffect, useState, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { motion } from "framer-motion";
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
  FaTimesCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLock,
  FaShieldAlt
} from "react-icons/fa";

export default function MakePayments() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const sessionTimeoutRef = useRef(null);

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
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* ================= SECURITY ================= */
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "STUDENT") return <Navigate to="/" />;

  /* ================= SESSION TIMEOUT ================= */
  useEffect(() => {
    // Check if installment data exists
    if (!location.state?.installmentName) {
      toast.warning("No installment selected. Please select from fee dashboard.", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />
      });
      navigate("/student/fees");
      return;
    }

    // Set session timeout (15 minutes for payment)
    sessionTimeoutRef.current = setTimeout(() => {
      toast.warning("Payment session expired. Please select installment again.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaInfoCircle />
      });
      navigate("/student/fees");
    }, 15 * 60 * 1000);

    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [location.state, navigate]);

  /* ======================================================
     🔹 STRIPE PAYMENT HANDLER (REAL PAYMENT)
     ====================================================== */
  const handleStripePayment = async () => {
    // Validate installment ID
    if (!installmentDetails.id) {
      toast.error("Invalid installment. Please select from fee dashboard.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
      navigate("/student/fees");
      return;
    }

    // Validate amount
    if (!installmentDetails.amount || installmentDetails.amount <= 0) {
      toast.error("Invalid payment amount. Please contact support.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />
      });
      return;
    }

    // Validate installment name
    if (!installmentName.trim()) {
      toast.error("Installment name is required", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />
      });
      return;
    }

    // Confirm payment with user
    const confirmed = window.confirm(
      `Payment Confirmation\n\n` +
      `Installment: ${installmentName}\n` +
      `Amount: ₹${installmentDetails.amount.toLocaleString()}\n` +
      `Due Date: ${installmentDetails.dueDate ? new Date(installmentDetails.dueDate).toLocaleDateString('en-IN') : 'N/A'}\n\n` +
      `Click OK to proceed to secure checkout.`
    );

    if (!confirmed) {
      toast.info("Payment cancelled by user", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaInfoCircle />
      });
      return;
    }

    try {
      setLoading(true);
      setShowError(false);

      const res = await api.post("/stripe/create-checkout-session", {
        installmentName,
      });

      // Redirect to Stripe checkout
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Payment initiation failed. Please try again.";
      setErrorMessage(errorMsg);
      setShowError(true);
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaTimesCircle />
      });
      setResult({ error: true, message: errorMsg, canRetry: true });
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     🔹 MOCK PAYMENT HANDLER (DEVELOPMENT ONLY)
     ====================================================== */
  const handleMockPayment = async () => {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      toast.error("Mock payments are only available in development mode", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaLock />
      });
      return;
    }

    if (!installmentName.trim()) {
      toast.warning("Please enter installment name", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setShowError(false);

      const res = await api.post("/student/payments/mock-success", {
        installmentName,
      });

      setResult(res.data);
      toast.success("🎉 Mock payment successful!", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaCheckCircle />
      });
      setInstallmentName("");
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Mock payment failed. Try again.";
      setErrorMessage(errorMsg);
      setShowError(true);
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaTimesCircle />
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= RETRY HANDLER ================= */
  const handleRetry = () => {
    setShowError(false);
    setErrorMessage("");
    setResult(null);
    toast.info("Ready to retry payment", {
      position: "top-right",
      autoClose: 2000,
      icon: <FaInfoCircle />
    });
  };

  return (
    <div className="container-fluid py-4 fade-in" role="main" aria-label="Payment page">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Skip Link for Screen Readers */}
      <a href="#payment-content" className="sr-only sr-only-focusable" style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0
      }}>
        Skip to payment content
      </a>

      {/* ================= LOADING OVERLAY ================= */}
      {loading && (
        <motion.div
          className="payment-loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="loading-content">
            <motion.div
              className="loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FaSpinner />
            </motion.div>
            <h3>Redirecting to Secure Checkout...</h3>
            <p>Please do not close this window</p>
            <div className="security-badges">
              <span><FaLock aria-hidden="true" /> SSL Secured</span>
              <span><FaShieldAlt aria-hidden="true" /> PCI Compliant</span>
            </div>
          </div>
          <style>{`
            .payment-loading-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 9999;
            }
            .loading-content {
              text-align: center;
              background: white;
              padding: 50px;
              border-radius: 24px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
              max-width: 500px;
            }
            .loading-spinner {
              font-size: 4rem;
              color: #3b82f6;
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
              font-size: 1rem;
            }
            .security-badges {
              display: flex;
              justify-content: center;
              gap: 1.5rem;
              font-size: 0.9rem;
              color: #059669;
              font-weight: 600;
            }
            .security-badges span {
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }
          `}</style>
        </motion.div>
      )}

      {/* ================= HEADER ================= */}
      <div className="gradient-header p-4 rounded-4 text-white shadow-lg mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold mb-1">
            <FaMoneyBillWave className="me-2 blink" aria-hidden="true" />
            Make Payment
          </h4>
          <p className="opacity-75 mb-0">
            Secure Stripe installment payment
          </p>
        </div>

        <button 
          className="btn btn-light" 
          onClick={() => navigate(-1)}
          aria-label="Go back to previous page"
        >
          <FaArrowLeft className="me-1" aria-hidden="true" />
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
            className="btn stripe-btn w-100 w-md-75 w-lg-50 w-xl-25 mb-3"
            onClick={handleStripePayment}
            disabled={loading}
            aria-label={`Pay ${installmentDetails.amount?.toLocaleString()} rupees via Stripe`}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <FaSpinner className="me-2 spin" aria-hidden="true" />
                Redirecting to Secure Checkout...
              </>
            ) : (
              <>
                <FaCreditCard className="me-2" aria-hidden="true" />
                Pay Securely with Stripe
              </>
            )}
          </button>

          {/* ====== MOCK BUTTON (DEV ONLY) ====== */}
          {process.env.NODE_ENV === 'development' && (
            <button
              className="btn btn-outline-success w-100 w-md-75 w-lg-50 w-xl-25 rounded-pill"
              onClick={handleMockPayment}
              disabled={loading}
              aria-label="Mock payment for testing"
              aria-busy={loading}
            >
              <FaMoneyBillWave className="me-2" aria-hidden="true" />
              Mock Pay (Test Mode)
            </button>
          )}
        </div>
      </div>

      {/* ================= ERROR STATE ================= */}
      {showError && (
        <motion.div 
          className="row justify-content-center mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="col-lg-7 col-md-9">
            <div className="card border-0 shadow rounded-4 payment-error-card">
              <div className="card-body text-center p-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <FaTimesCircle size={64} className="text-danger mb-3" aria-hidden="true" />
                </motion.div>
                <h5 className="fw-bold text-danger mb-2">Payment Failed</h5>
                <p className="text-muted mb-4">{errorMessage}</p>
                <div className="d-flex justify-content-center gap-3">
                  <button
                    className="btn btn-primary d-flex align-items-center gap-2"
                    onClick={handleRetry}
                    aria-label="Retry payment"
                  >
                    <FaSync aria-hidden="true" /> Retry Payment
                  </button>
                  <button
                    className="btn btn-outline-secondary d-flex align-items-center gap-2"
                    onClick={() => navigate("/student/fees")}
                    aria-label="Go back to fee dashboard"
                  >
                    <FaArrowLeft aria-hidden="true" /> Back to Fees
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= RESULT (MOCK ONLY) ================= */}
      {result && result.installment && !result.error && (
        <motion.div 
          className="row justify-content-center mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="col-lg-7 col-md-9">
            <div className="card border-0 shadow rounded-4 payment-success-card">
              <div className="card-body text-center" role="status" aria-live="polite">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  <FaCheckCircle size={50} className="text-success mb-3" aria-hidden="true" />
                </motion.div>
                <h5 className="fw-bold text-success mb-3">Payment Successful</h5>

                <div className="text-start mb-4">
                  <p className="mb-2">
                    <strong>Installment:</strong> {result.installment.name}
                  </p>
                  <p className="mb-2">
                    <strong>Amount:</strong> ₹{result.installment.amount.toLocaleString()}
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong> <span className="text-success">{result.installment.status}</span>
                  </p>
                  <p className="mb-3">
                    <strong>Paid At:</strong>{" "}
                    {new Date(result.installment.paidAt).toLocaleString("en-IN")}
                  </p>
                </div>

                <hr />

                <div className="row text-center mb-4">
                  <div className="col-4">
                    <FaUniversity className="text-primary mb-2" aria-hidden="true" />
                    <p className="mb-0 fw-bold">₹{result.totalFee?.toLocaleString()}</p>
                    <small className="text-muted">Total</small>
                  </div>
                  <div className="col-4">
                    <FaCheckCircle className="text-success mb-2" aria-hidden="true" />
                    <p className="mb-0 fw-bold">₹{result.paidAmount?.toLocaleString()}</p>
                    <small className="text-muted">Paid</small>
                  </div>
                  <div className="col-4">
                    <FaMoneyBillWave className="text-danger mb-2" aria-hidden="true" />
                    <p className="mb-0 fw-bold">₹{result.remainingAmount?.toLocaleString()}</p>
                    <small className="text-muted">Remaining</small>
                  </div>
                </div>

                <div className="d-flex justify-content-center gap-3">
                  <button
                    className="btn btn-outline-primary d-flex align-items-center gap-2"
                    onClick={() =>
                      navigate(`/student/fee-receipt/${result.installment._id}`)
                    }
                    aria-label="View payment receipt"
                  >
                    <FaReceipt className="me-1" aria-hidden="true" />
                    View Receipt
                  </button>
                  <button
                    className="btn btn-primary d-flex align-items-center gap-2"
                    onClick={() => navigate("/student/fees")}
                    aria-label="Go back to fee dashboard"
                  >
                    <FaCheckCircle aria-hidden="true" /> Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= CSS ================= */}
      <style>{`
        /* ================= SCREEN READER ONLY ================= */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border: 0;
        }
        .sr-only-focusable:focus {
          position: static;
          width: auto;
          height: auto;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }

        /* ================= PAYMENT CARDS ================= */
        .payment-error-card {
          border: 2px solid #dc3545 !important;
        }
        .payment-success-card {
          border: 2px solid #28a745 !important;
        }

        /* ================= HEADER ================= */
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

        /* ================= PAYMENT CARD BODY ================= */
        .payment-card-body {
          background: linear-gradient(145deg, #ffffff, #f8fbfd);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
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

        /* ================= STRIPE BUTTON ================= */
        .stripe-btn {
          background: linear-gradient(90deg, #635bff, #4f46e5);
          color: white;
          border: none;
          padding: 14px 28px;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 6px 18px rgba(99, 91, 255, 0.4);
        }

        .stripe-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(99, 91, 255, 0.5);
        }

        .stripe-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ================= SPIN ANIMATION ================= */
        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .stripe-btn {
            width: 100% !important;
          }
          .payment-info-box {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
