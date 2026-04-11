import { useContext, useEffect, useState, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "../../../components/Loading";
import ConfirmModal from "../../../components/ConfirmModal";

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
  FaShieldAlt,
  FaSync,
} from "react-icons/fa";

// Razorpay script loader
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function MakePayments() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const sessionTimeoutRef = useRef(null);
  const isRequestInProgressRef = useRef(false); // Prevent duplicate payment requests

  const [installmentName, setInstallmentName] = useState(
    location.state?.installmentName || "",
  );

  const [installmentDetails, setInstallmentDetails] = useState({
    id: location.state?.installmentId || null,
    amount: location.state?.amount || null,
    dueDate: location.state?.dueDate || null,
  });

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Redirecting to Secure Checkout...",
  );
  const [result, setResult] = useState(null);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);

  /* ================= SECURITY - WAIT FOR AUTH LOADING ================= */
  // Wait for auth to finish loading before any redirects
  if (authLoading) {
    return <Loading fullScreen text="Verifying your session..." />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "STUDENT")
    return <Navigate to="/student/dashboard" replace />;

  /* ================= SESSION TIMEOUT ================= */
  useEffect(() => {
    // Check if installment data exists
    if (!location.state?.installmentName) {
      // Check if coming from Stripe redirect without state (normal flow)
      const searchParams = new URLSearchParams(location.search);
      const session_id = searchParams.get("session_id");

      // If has session_id, redirect to payment-success page to handle it
      if (session_id) {
        navigate(`/student/payment-success?session_id=${session_id}`, {
          replace: true,
        });
        return;
      }

      // No state and no session_id - show warning and redirect to fees
      toast.warning(
        "No installment selected. Please select from fee dashboard.",
        {
          position: "top-right",
          autoClose: 3000,
          icon: <FaExclamationTriangle />,
        },
      );
      navigate("/student/fees");
      return;
    }

    // Set session timeout (15 minutes for payment)
    sessionTimeoutRef.current = setTimeout(
      () => {
        toast.warning(
          "Payment session expired. Please select installment again.",
          {
            position: "top-right",
            autoClose: 5000,
            icon: <FaInfoCircle />,
          },
        );
        navigate("/student/fees");
      },
      15 * 60 * 1000,
    );

    return () => {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [location, navigate]);

  /* ======================================================
     🔹 STRIPE PAYMENT HANDLER (REAL PAYMENT)
     ====================================================== */
  const handleStripePayment = () => {
    // Prevent duplicate requests
    if (isRequestInProgressRef.current) {
      return;
    }

    // Validate installment ID
    if (!installmentDetails.id) {
      toast.error("Invalid installment. Please select from fee dashboard.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
      navigate("/student/fees");
      return;
    }

    // Validate amount
    if (!installmentDetails.amount || installmentDetails.amount <= 0) {
      toast.error("Invalid payment amount. Please contact support.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    // Validate installment name
    if (!installmentName.trim()) {
      toast.error("Installment name is required", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    // Check network status
    if (!navigator.onLine) {
      toast.error("No internet connection. Please check your network.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    // Set selected gateway and show confirmation modal
    setSelectedGateway("stripe");
    setShowConfirmModal(true);
  };

  /* ======================================================
     🔹 RAZORPAY PAYMENT HANDLER
     ====================================================== */
  const handleRazorpayPayment = async () => {
    // Prevent duplicate requests
    if (isRequestInProgressRef.current) {
      return;
    }

    // Validate installment ID
    if (!installmentDetails.id) {
      toast.error("Invalid installment. Please select from fee dashboard.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
      navigate("/student/fees");
      return;
    }

    // Validate amount
    if (!installmentDetails.amount || installmentDetails.amount <= 0) {
      toast.error("Invalid payment amount. Please contact support.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    // Validate installment name
    if (!installmentName.trim()) {
      toast.error("Installment name is required", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    // Check network status
    if (!navigator.onLine) {
      toast.error("No internet connection. Please check your network.", {
        position: "top-right",
        autoClose: 5000,
        icon: <FaExclamationTriangle />,
      });
      return;
    }

    try {
      setLoading(true);
      isRequestInProgressRef.current = true;

      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error(
          "Failed to load Razorpay. Please check your internet connection.",
        );
      }

      // Create Razorpay order
      const res = await api.post("/razorpay/create-order", {
        installmentName,
      });

      const { orderId, amount, currency, keyId } = res.data;

      // ✅ CRITICAL VALIDATION: Ensure all required fields are present
      if (!orderId) {
        throw new Error("Payment order creation failed. Please try again.");
      }

      if (!keyId) {
        throw new Error(
          "Razorpay is not configured properly. Please contact the college administrator.",
        );
      }

      if (!amount || amount <= 0) {
        throw new Error("Invalid payment amount. Please contact support.");
      }

      // Configure Razorpay options
      const options = {
        key: keyId, // ← This was undefined before the fix
        amount: amount,
        currency: currency,
        name: user.collegeName || "College Fee Payment",
        description: `Fee Payment - ${installmentName}`,
        order_id: orderId,
        handler: async (response) => {
          // ✅ WEBHOOK-DRIVEN: Don't call verify API. Just redirect to success page.
          // The webhook will mark the installment as PAID.
          // PaymentSuccess.jsx will poll for status until webhook processes it.
          setLoadingMessage("Payment successful! Confirming...");
          setLoading(true);

          // Small delay for UX, then redirect
          setTimeout(() => {
            setLoading(false);
            isRequestInProgressRef.current = false;

            // Redirect to success page — PaymentSuccess.jsx will poll for status
            navigate(
              `/student/payment-success?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}&gateway=razorpay`,
              {
                state: {
                  paymentGateway: "RAZORPAY",
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                },
              },
            );
          }, 1000);
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: user.phone || "",
        },
        theme: {
          color: "#686CE7",
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled", {
              position: "top-right",
              autoClose: 3000,
            });
            setLoading(false);
            isRequestInProgressRef.current = false;
          },
        },
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);

      // Verify Razorpay instance was created properly
      if (!rzp) {
        throw new Error(
          "Failed to initialize Razorpay checkout. Please refresh the page.",
        );
      }

      rzp.on("payment.failed", (response) => {
        const errorCode = response.error.code;
        const errorDescription = response.error.description;

        toast.error(`Payment failed: ${errorDescription}`, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaTimesCircle />,
        });

        // Log failure
        api
          .post("/razorpay/payment-failed", {
            razorpay_order_id: orderId,
            error_code: errorCode,
            error_description: errorDescription,
          })
          .catch(() => {}); // Ignore logging errors

        setLoading(false);
        isRequestInProgressRef.current = false;
      });

      rzp.open();
    } catch (err) {
      let errorMsg = "Payment initiation failed. Please try again.";

      // Extract error from standardized backend format
      // Backend sends: { success: false, error: { code, message, details } }
      if (err.response?.data?.error?.message) {
        errorMsg = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }

      const errorCode =
        err.response?.data?.error?.code ||
        err.response?.data?.code ||
        err.response?.data?.error?.code;

      // Handle specific error codes
      if (errorCode === "RAZORPAY_NOT_CONFIGURED") {
        errorMsg =
          "Razorpay is not configured for your college. Please contact the college administrator.";
      } else if (errorCode === "PAYMENT_CONFIG_ERROR") {
        errorMsg = "Payment configuration error. Please contact support.";
      } else if (errorCode === "PAYMENT_INIT_FAILED") {
        errorMsg =
          "Failed to initialize payment gateway. Please try again later.";
      } else if (errorCode === "INSTALLMENT_NOT_FOUND") {
        errorMsg =
          "This installment has already been paid or is invalid. Please refresh the page.";
      } else if (errorCode === "DECRYPTION_FAILED") {
        errorMsg = "Payment configuration error. Please contact support.";
      } else if (errorCode === "RAZORPAY_INIT_FAILED") {
        errorMsg =
          "Failed to initialize payment gateway. Please try again later.";
      } else if (errorCode === "RAZORPAY_KEY_MISSING") {
        errorMsg =
          "Razorpay configuration error. Please contact the college administrator.";
      } else if (errorCode === "RAZORPAY_CONFIG_ERROR") {
        errorMsg = "Payment configuration error. Please contact support.";
      } else if (errorCode === "COLLEGE_ID_MISSING") {
        errorMsg =
          "College information missing. Please login again or contact support.";
      } else if (errorCode === "ORDER_SAVE_FAILED") {
        errorMsg = "Failed to save payment order. Please try again.";
      } else if (errorCode === "INSTALLMENT_NOT_IN_ARRAY") {
        errorMsg = "Installment configuration error. Please contact support.";
      }

      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaTimesCircle />,
      });

      setLoading(false);
      isRequestInProgressRef.current = false;
    }
  };

  /* ======================================================
     🔹 CONFIRMED PAYMENT PROCESSING (extracted from handleStripePayment)
     ====================================================== */
  const processPayment = async () => {
    // Set flag to prevent duplicate requests
    isRequestInProgressRef.current = true;

    try {
      setLoadingMessage("Redirecting to Secure Checkout...");
      setLoading(true);
      setShowError(false);

      const res = await api.post("/stripe/create-checkout-session", {
        installmentName,
      });

      // The axios interceptor might wrap the response, so check multiple locations
      // Backend sends: { checkoutUrl, sessionId, expiresAt }
      // But interceptor might wrap it if response has success/data structure
      const checkoutUrl =
        res.data?.checkoutUrl ||
        res.data?.data?.checkoutUrl ||
        res?.checkoutUrl ||
        (typeof res.data === "string" ? res.data : null);

      if (!checkoutUrl) {
        // Check if response indicates an error (even with 200 status)
        if (res.data?.success === false) {
          throw new Error(
            res.data?.error?.message ||
              res.data?.message ||
              "Payment request was rejected by server",
          );
        }

        throw new Error("Server response was invalid. Please contact support.");
      }

      // Redirect to Stripe checkout (hard redirect - state will be lost)
      // After payment, Stripe will redirect to /student/payment-success
      window.location.href = checkoutUrl;
    } catch (err) {
      // Extract error message from various possible locations
      let errorMsg =
        err.response?.data?.error?.message || // Standardized error format
        err.response?.data?.message || // Direct error message
        err.message || // Error from throw
        "Payment initiation failed. Please try again.";

      // Handle specific error codes
      const errorCode =
        err.response?.data?.error?.code || err.response?.data?.code;

      if (errorCode === "STRIPE_NOT_CONFIGURED") {
        errorMsg =
          "Payment gateway is not configured for your college. Please contact the college administrator.";
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 8000,
          icon: <FaExclamationTriangle />,
        });
      } else if (errorCode === "PAYMENT_CONFIG_ERROR") {
        errorMsg = "Payment configuration error. Please contact support.";
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 8000,
          icon: <FaExclamationTriangle />,
        });
      } else if (errorCode === "PAYMENT_INIT_FAILED") {
        errorMsg =
          "Failed to initialize payment gateway. Please try again later.";
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 8000,
          icon: <FaExclamationTriangle />,
        });
      } else if (errorCode === "INSTALLMENT_NOT_FOUND") {
        errorMsg =
          "This installment has already been paid or is invalid. Please refresh the page.";
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 5000,
          icon: <FaExclamationTriangle />,
        });
      } else {
        toast.error(errorMsg, {
          position: "top-right",
          autoClose: 5000,
          icon: <FaTimesCircle />,
        });
      }

      setErrorMessage(errorMsg);
      setShowError(true);
      setResult({ error: true, message: errorMsg, canRetry: true });
      setLoading(false);
      isRequestInProgressRef.current = false; // Reset flag on error
    }
    // Note: setLoading(false) is not called on success because page is redirecting
    // The flag will be reset when page reloads
  };

  /* ======================================================
     🔹 MOCK PAYMENT HANDLER (DEVELOPMENT ONLY)
     ====================================================== */
  const handleMockPayment = async () => {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
      toast.error("Mock payments are only available in development mode", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaLock />,
      });
      return;
    }

    if (!installmentName.trim()) {
      toast.warning("Please enter installment name", {
        position: "top-right",
        autoClose: 3000,
        icon: <FaExclamationTriangle />,
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
        icon: <FaCheckCircle />,
      });
      setInstallmentName("");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Mock payment failed. Try again.";
      setErrorMessage(errorMsg);
      setShowError(true);
      toast.error(errorMsg, {
        position: "top-right",
        autoClose: 5000,
        icon: <FaTimesCircle />,
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
      icon: <FaInfoCircle />,
    });
  };

  return (
    <div
      className="container-fluid py-4 fade-in"
      role="main"
      aria-label="Payment page"
    >
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Skip Link for Screen Readers */}
      <a
        href="#payment-content"
        className="sr-only sr-only-focusable"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
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
            <h3>{loadingMessage}</h3>
            <p>Please do not close this window</p>
            <div className="security-badges">
              <span>
                <FaLock aria-hidden="true" /> SSL Secured
              </span>
              <span>
                <FaShieldAlt aria-hidden="true" /> PCI Compliant
              </span>
            </div>
          </div>
          <style>{`
            .payment-loading-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(15, 58, 74, 0.05) 0%, rgba(61, 181, 230, 0.1) 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 9999;
              backdrop-filter: blur(4px);
            }
            .loading-content {
              text-align: center;
              background: white;
              padding: 50px;
              border-radius: 24px;
              box-shadow: 0 20px 60px rgba(15, 58, 74, 0.15);
              max-width: 500px;
              border: 1px solid rgba(61, 181, 230, 0.2);
            }
            .loading-spinner {
              font-size: 4rem;
              color: var(--sidebar-accent);
              margin-bottom: 1.5rem;
            }
            .loading-content h3 {
              margin: 0 0 0.5rem 0;
              color: var(--sidebar-dark);
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
          <p className="opacity-75 mb-0">Secure online fee payment</p>
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
          {/* ====== PAYMENT GATEWAY SELECTION ====== */}
          <div className="text-center mb-4">
            <h6 className="text-muted mb-2 fw-semibold">
              Select Payment Method
            </h6>
            <div className="payment-methods-divider"></div>
          </div>

          {/* ====== PAYMENT GATEWAYS GRID ====== */}
          <div className="row w-100 g-3 mb-3">
            {/* ====== STRIPE ====== */}
            <div className="col-12 col-md-6">
              <button
                className="payment-gateway-btn stripe-gateway w-100"
                onClick={handleStripePayment}
                disabled={loading}
                aria-label={`Pay ${installmentDetails.amount?.toLocaleString()} rupees via Stripe`}
                aria-busy={loading}
              >
                <div className="gateway-icon-wrapper">
                  <FaCreditCard className="gateway-icon" aria-hidden="true" />
                </div>
                <div className="gateway-content">
                  <span className="gateway-name">Stripe</span>
                  <span className="gateway-desc">Card / UPI / Net Banking</span>
                </div>
                <div className="gateway-action">
                  {loading ? (
                    <FaSpinner className="spin" aria-hidden="true" />
                  ) : (
                    <FaArrowLeft className="rotate-arrow" aria-hidden="true" />
                  )}
                </div>
              </button>
            </div>

            {/* ====== RAZORPAY ====== */}
            <div className="col-12 col-md-6">
              <button
                className="payment-gateway-btn razorpay-gateway w-100"
                onClick={handleRazorpayPayment}
                disabled={loading}
                aria-label={`Pay ${installmentDetails.amount?.toLocaleString()} rupees via Razorpay`}
                aria-busy={loading}
              >
                <div className="gateway-icon-wrapper razorpay">
                  <FaMoneyBillWave
                    className="gateway-icon"
                    aria-hidden="true"
                  />
                </div>
                <div className="gateway-content">
                  <span className="gateway-name">Razorpay</span>
                  <span className="gateway-desc">UPI / Cards / Wallets</span>
                </div>
                <div className="gateway-action">
                  {loading ? (
                    <FaSpinner className="spin" aria-hidden="true" />
                  ) : (
                    <FaArrowLeft className="rotate-arrow" aria-hidden="true" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* ====== SECURITY BADGES ====== */}
          <div className="security-badges-container mt-3">
            <div className="badge-item">
              <FaLock className="badge-icon" aria-hidden="true" />
              <span className="badge-text">100% Secure</span>
            </div>
            <div className="badge-item">
              <FaShieldAlt className="badge-icon" aria-hidden="true" />
              <span className="badge-text">PCI Certified</span>
            </div>
            <div className="badge-item">
              <FaCheckCircle className="badge-icon" aria-hidden="true" />
              <span className="badge-text">Verified</span>
            </div>
          </div>
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
                  <FaTimesCircle
                    size={64}
                    className="text-danger mb-3"
                    aria-hidden="true"
                  />
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
              <div
                className="card-body text-center"
                role="status"
                aria-live="polite"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  <FaCheckCircle
                    size={50}
                    className="text-success mb-3"
                    aria-hidden="true"
                  />
                </motion.div>
                <h5 className="fw-bold text-success mb-3">
                  Payment Successful
                </h5>

                <div className="text-start mb-4">
                  <p className="mb-2">
                    <strong>Installment:</strong> {result.installment.name}
                  </p>
                  <p className="mb-2">
                    <strong>Amount:</strong> ₹
                    {result.installment.amount.toLocaleString()}
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong>{" "}
                    <span className="text-success">
                      {result.installment.status}
                    </span>
                  </p>
                  <p className="mb-3">
                    <strong>Paid At:</strong>{" "}
                    {new Date(result.installment.paidAt).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>

                <hr />

                <div className="row text-center mb-4">
                  <div className="col-4">
                    <FaUniversity
                      className="text-primary mb-2"
                      aria-hidden="true"
                    />
                    <p className="mb-0 fw-bold">
                      ₹{result.totalFee?.toLocaleString()}
                    </p>
                    <small className="text-muted">Total</small>
                  </div>
                  <div className="col-4">
                    <FaCheckCircle
                      className="text-success mb-2"
                      aria-hidden="true"
                    />
                    <p className="mb-0 fw-bold">
                      ₹{result.paidAmount?.toLocaleString()}
                    </p>
                    <small className="text-muted">Paid</small>
                  </div>
                  <div className="col-4">
                    <FaMoneyBillWave
                      className="text-danger mb-2"
                      aria-hidden="true"
                    />
                    <p className="mb-0 fw-bold">
                      ₹{result.remainingAmount?.toLocaleString()}
                    </p>
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
        /* ================= SIDEBAR-MATCHED THEME ================= */
        :root {
          --sidebar-dark: #0f3a4a;
          --sidebar-darker: #0c2d3a;
          --sidebar-accent: #3db5e6;
          --sidebar-accent-light: #4fc3f7;
          --sidebar-text: #e6f2f5;
          --sidebar-muted: rgba(255, 255, 255, 0.7);
          --sidebar-border: rgba(255, 255, 255, 0.1);
          --sidebar-hover: rgba(255, 255, 255, 0.08);
          --sidebar-active: rgba(61, 181, 230, 0.15);
        }

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

        /* ================= HEADER - SIDEBAR MATCHED ================= */
        .gradient-header {
          background: linear-gradient(180deg, var(--sidebar-dark) 0%, var(--sidebar-darker) 100%);
          position: relative;
          overflow: hidden;
        }

        .gradient-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--sidebar-accent), transparent);
        }

        .gradient-header::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(61, 181, 230, 0.1) 0%, transparent 70%);
          pointer-events: none;
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
          background: linear-gradient(145deg, #ffffff, #f0f7fa);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(15, 58, 74, 0.08);
          border: 1px solid rgba(61, 181, 230, 0.1);
        }

        .installment-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          background: linear-gradient(135deg, var(--sidebar-dark), var(--sidebar-darker));
          color: white;
          font-size: 14px;
          border-radius: 50px;
          box-shadow: 0 4px 12px rgba(15, 58, 74, 0.2);
          border: 1px solid rgba(61, 181, 230, 0.2);
        }

        .payment-info-box {
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.03), rgba(61, 181, 230, 0.05));
          padding: 18px;
          border-radius: 14px;
          font-size: 14px;
          backdrop-filter: blur(6px);
          border: 1px solid rgba(61, 181, 230, 0.15);
        }

        /* ================= PAYMENT GATEWAY BUTTONS ================= */
        .payment-methods-divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, var(--sidebar-accent), var(--sidebar-dark));
          margin: 0 auto;
          border-radius: 2px;
        }

        .payment-gateway-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: #ffffff;
          border: 2px solid rgba(15, 58, 74, 0.12);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .payment-gateway-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.04), rgba(61, 181, 230, 0.08));
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .payment-gateway-btn:hover::before {
          opacity: 1;
        }

        .payment-gateway-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(15, 58, 74, 0.12);
          border-color: var(--sidebar-accent);
        }

        .payment-gateway-btn:active {
          transform: translateY(-2px);
        }

        .payment-gateway-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Stripe Gateway */
        .stripe-gateway:hover {
          border-color: var(--sidebar-accent);
          box-shadow: 0 12px 24px rgba(61, 181, 230, 0.25);
        }

        .stripe-gateway .gateway-icon-wrapper {
          background: linear-gradient(135deg, var(--sidebar-accent), var(--sidebar-accent-light));
        }

        /* Razorpay Gateway */
        .razorpay-gateway:hover {
          border-color: var(--sidebar-accent);
          box-shadow: 0 12px 24px rgba(61, 181, 230, 0.25);
        }

        .razorpay-gateway .gateway-icon-wrapper.razorpay {
          background: linear-gradient(135deg, var(--sidebar-dark), var(--sidebar-accent));
        }

        /* Gateway Icon Wrapper */
        .gateway-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .payment-gateway-btn:hover .gateway-icon-wrapper {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(61, 181, 230, 0.3);
        }

        .gateway-icon {
          font-size: 24px;
          color: #ffffff;
        }

        /* Gateway Content */
        .gateway-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          z-index: 1;
        }

        .gateway-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--sidebar-dark);
        }

        .gateway-desc {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        /* Gateway Action */
        .gateway-action {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f7fafc, #edf2f7);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
          border: 1px solid rgba(15, 58, 74, 0.08);
        }

        .payment-gateway-btn:hover .gateway-action {
          background: linear-gradient(135deg, var(--sidebar-accent), var(--sidebar-accent-light));
          border-color: transparent;
        }

        .payment-gateway-btn:hover .gateway-action .rotate-arrow {
          transform: rotate(180deg);
          color: #ffffff;
        }

        .gateway-action .rotate-arrow {
          font-size: 18px;
          color: var(--sidebar-dark);
          transition: transform 0.3s ease;
        }

        /* Security Badges */
        .security-badges-container {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
          padding: 16px;
          background: linear-gradient(135deg, rgba(15, 58, 74, 0.03), rgba(61, 181, 230, 0.05));
          border-radius: 12px;
          border: 1px solid rgba(61, 181, 230, 0.1);
        }

        .badge-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--sidebar-dark);
          font-weight: 600;
        }

        .badge-icon {
          font-size: 16px;
          color: #38a169;
        }

        /* ================= STRIPE BUTTON - SIDEBAR THEME ================= */
        .stripe-btn {
          background: linear-gradient(135deg, var(--sidebar-accent) 0%, var(--sidebar-accent-light) 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 6px 18px rgba(61, 181, 230, 0.4);
        }

        .stripe-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(61, 181, 230, 0.5);
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
          .payment-gateway-btn {
            padding: 16px 18px;
          }
          .gateway-icon-wrapper {
            width: 48px;
            height: 48px;
          }
          .gateway-icon {
            font-size: 20px;
          }
          .gateway-name {
            font-size: 15px;
          }
          .gateway-desc {
            font-size: 12px;
          }
          .security-badges-container {
            gap: 16px;
          }
          .badge-item {
            font-size: 12px;
          }
        }
      `}</style>

      {/* ================= PAYMENT CONFIRMATION MODAL ================= */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          if (selectedGateway === "stripe") {
            processPayment();
          } else if (selectedGateway === "razorpay") {
            handleRazorpayPayment();
          }
        }}
        title="Payment Confirmation"
        message={
          <div className="text-start">
            <div className="mb-2">
              <strong>Installment:</strong> {installmentName}
            </div>
            <div className="mb-2">
              <strong>Amount:</strong> ₹
              {installmentDetails.amount?.toLocaleString()}
            </div>
            <div className="mb-2">
              <strong>Due Date:</strong>{" "}
              {installmentDetails.dueDate
                ? new Date(installmentDetails.dueDate).toLocaleDateString(
                    "en-IN",
                  )
                : "N/A"}
            </div>
            <div className="mb-3">
              <strong>Payment Method:</strong>{" "}
              <span className="badge bg-primary ms-1">
                {selectedGateway === "stripe" ? "Stripe" : "Razorpay"}
              </span>
            </div>
            <div
              className="alert alert-warning mb-0"
              style={{ fontSize: "0.9rem" }}
            >
              <FaExclamationTriangle className="me-2" />
              {selectedGateway === "stripe" ? (
                <>
                  You will be redirected to{" "}
                  <strong>Stripe's secure checkout</strong>. After payment,
                  you'll be automatically redirected back.
                </>
              ) : (
                <>
                  A <strong>secure payment modal</strong> will open. Complete
                  your payment using UPI, Card, or Net Banking.
                </>
              )}
            </div>
          </div>
        }
        type="info"
        confirmText="Proceed"
        cancelText="Cancel"
        isLoading={loading}
      />
    </div>
  );
}
