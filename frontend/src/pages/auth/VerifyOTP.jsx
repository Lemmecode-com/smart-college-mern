import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
  FaLock,
  FaKey,
  FaArrowLeft,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaRedo
} from "react-icons/fa";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      toast.error("Email not found. Please request OTP again.");
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  const [formData, setFormData] = useState({
    email: email || "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Format timer (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/forgot-password", { email: formData.email });
      toast.success("✅ OTP resent successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      setTimer(600); // Reset timer
      setCanResend(false);
    } catch (err) {
      toast.error("❌ " + (err.response?.data?.message || "Failed to resend OTP"), {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match!");
      toast.error("❌ Passwords do not match!", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      toast.error("❌ Password must be at least 6 characters", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/verify-otp-reset", {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword,
      });

      toast.success("✅ Password reset successfully!", {
        position: "top-right",
        autoClose: 3000,
      });

      // Redirect to login after success
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to verify OTP";
      setError(errorMsg);
      toast.error("❌ " + errorMsg, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      
      <ToastContainer position="top-right" />

      <div className="card shadow-lg border-0 rounded-4" 
           style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <div className="mb-3">
            <FaKey size={48} color="#667eea" />
          </div>
          <h2 className="fw-bold mb-2" style={{ color: '#1a4b6d' }}>
            Verify OTP
          </h2>
          <p className="text-muted">
            Enter the 6-digit OTP sent to <strong>{email}</strong>
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
          {/* OTP Input */}
          <div className="mb-4">
            <label className="form-label fw-semibold">
              One-Time Password (OTP)
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaLock color="#6c757d" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Enter 6-digit OTP"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                maxLength="6"
                pattern="\d{6}"
                required
                style={{ borderLeft: 'none', letterSpacing: '5px', fontSize: '1.2rem' }}
              />
            </div>
          </div>

          {/* New Password */}
          <div className="mb-3">
            <label className="form-label fw-semibold">
              New Password
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaLock color="#6c757d" />
              </span>
              <input
                type="password"
                className="form-control border-start-0 ps-0"
                placeholder="Enter new password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                minLength="6"
                style={{ borderLeft: 'none' }}
              />
            </div>
            <small className="text-muted">
              Minimum 6 characters
            </small>
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <label className="form-label fw-semibold">
              Confirm Password
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <FaLock color="#6c757d" />
              </span>
              <input
                type="password"
                className="form-control border-start-0 ps-0"
                placeholder="Confirm new password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength="6"
                style={{ borderLeft: 'none' }}
              />
            </div>
          </div>

          {/* Timer & Resend */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="text-muted">
              <small>
                {timer > 0 ? (
                  <>OTP expires in: <strong style={{ color: timer < 60 ? '#dc3545' : '#1a4b6d' }}>
                    {formatTime(timer)}
                  </strong></>
                ) : (
                  <span style={{ color: '#dc3545' }}>OTP expired</span>
                )}
              </small>
            </div>
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none p-0"
              onClick={handleResendOTP}
              disabled={!canResend || loading}
              style={{
                color: canResend ? '#667eea' : '#6c757d',
                cursor: canResend ? 'pointer' : 'not-allowed'
              }}
            >
              <FaRedo className="me-1" />
              Resend OTP
            </button>
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
                Verifying...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                Verify & Reset Password
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
            <strong>ℹ️ Tips:</strong>
            <ul className="mb-0 mt-2">
              <li>Check spam/junk folder if OTP not in inbox</li>
              <li>OTP is case-sensitive and valid for 10 minutes</li>
              <li>Don't share your OTP with anyone</li>
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
