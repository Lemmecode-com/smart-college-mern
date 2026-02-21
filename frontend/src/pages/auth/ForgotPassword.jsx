import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaEnvelope,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle
} from "react-icons/fa";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", { email });
      
      // Check if OTP was already sent
      if (response.data.otpAlreadySent) {
        toast.info("ℹ️ " + response.data.message, {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        toast.success("✅ " + response.data.message, {
          position: "top-right",
          autoClose: 5000,
        });
      }

      // Redirect to OTP verification page
      setTimeout(() => {
        navigate("/verify-otp", { state: { email } });
      }, 1500);

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to send OTP";
      const errorCode = err.response?.data?.code;
      
      // Show specific error messages
      if (errorCode === "EMAIL_NOT_FOUND") {
        setError("Please Enter Valid or Registered Email");
        /* toast.error("Email not found! Please check your email or contact admin.", {
          position: "top-right",
          autoClose: 5000,
        }); */
      } else if (errorCode === "RATE_LIMIT_EXCEEDED") {
        setError("⏰ Too many requests. Please wait 1 hour before trying again.");
        toast.error("⏰ " + errorMsg, {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        setError(errorMsg);
        toast.error("❌ " + errorMsg, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      
      <ToastContainer position="top-right" />

      <div className="card shadow-lg border-0 rounded-4" 
           style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className="mb-3">
            <FaEnvelope size={48} color="#667eea" />
          </div>
          <h2 className="fw-bold mb-2" style={{ color: '#1a4b6d' }}>
            Forgot Password?
          </h2>
          <p className="text-muted">
            No worries! Enter your email and we'll send you an OTP.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <FaExclamationCircle className="me-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label fw-semibold">
              Email Address
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaEnvelope color="#6c757d" />
              </span>
              <input
                type="email"
                className="form-control border-start-0 ps-0"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ borderLeft: 'none' }}
              />
            </div>
            <small className="text-muted">
              We'll send a 6-digit OTP to this email
            </small>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-100 py-3 fw-semibold rounded-3"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            {loading ? (
              <>
                <FaSpinner className="spin me-2" />
                Sending OTP...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                Send OTP
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="text-center mt-4">
          <Link to="/login" className="text-decoration-none d-inline-flex align-items-center">
            <FaArrowLeft className="me-2" />
            Back to Login
          </Link>
        </div>

        {/* Info Box */}
        <div className="alert alert-info mt-4 mb-0" style={{ fontSize: '0.9rem' }}>
          <small>
            <strong>ℹ️ Note:</strong>
            <ul className="mb-0 mt-2">
              <li>OTP is valid for 10 minutes only</li>
              <li>Check your spam folder if you don't see it</li>
              <li>Maximum 3 OTPs per hour</li>
            </ul>
          </small>
        </div>
      </div>

      <style>{`
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
