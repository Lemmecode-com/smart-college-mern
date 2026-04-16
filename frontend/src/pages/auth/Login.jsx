import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";
import { motion } from "framer-motion";

// Icons
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimes,
  FaHome,
} from "react-icons/fa";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  /* SINGLE SOURCE OF TRUTH */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!email || (!forgotMode && !password)) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    /* ===== FORGOT PASSWORD (UI ONLY) ===== */
    if (forgotMode) {
      setTimeout(() => {
        setSuccessMsg("Password reset link sent to your email.");
        setLoading(false);
      }, 800);
      return;
    }

    /* ===== LOGIN ===== */
    const result = await login({ email, password });

    if (!result.success) {
      const errorMsg = result.message || "Invalid credentials";

      // Check for specific error codes from backend
      if (errorMsg.includes("awaiting admin approval")) {
        setError(
          "⏳ Your account is awaiting admin approval. Please check your email for approval confirmation.",
        );
      } else if (errorMsg.includes("rejected")) {
        setError(
          "❌ Your account has been rejected. Please contact the admin for more information.",
        );
      } else if (
        errorMsg.includes("deactivated") ||
        result.code === "ACCOUNT_DEACTIVATED"
      ) {
        setError(
          "🚫 Your account has been deactivated. Please contact your administrator to request reactivation.",
        );
      } else {
        setError(errorMsg);
      }

      setLoading(false);
      return;
    }

    // cleanup
    setPassword("");
    setError("");
    setLoading(false);

    // Redirect to dashboard decider route
    navigate("/home");
  };

  return (
    <div className="login-page-container">
      {/* Animated Background - Simplified */}
      <div className="login-background">
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
      </div>

      {/* Floating Particles - Reduced */}
      <div className="floating-particles">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="login-wrapper">
        <div
          className={`login-card ${forgotMode ? "forgot-mode" : "login-mode"}`}
        >
          <div className="row g-0">
            {/* LEFT PANEL */}
            <motion.div
              className={`col-md-5 left-panel d-none d-md-flex flex-column justify-content-center text-white p-5 ${forgotMode ? "slide-out" : "slide-in"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="left-panel-content">
                {/* Brand Logo */}
                <div className="brand-logo">
                  <div className="logo-circle">
                    <div className="logo-icon-wrapper">
                      <span className="logo-icon">
                        {forgotMode ? "🔐" : "🎓"}
                      </span>
                    </div>
                  </div>
                </div>

                <motion.h2
                  className="fw-bold panel-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {forgotMode ? "Reset Password" : "Welcome Back"}
                </motion.h2>

                <motion.p
                  className="panel-subtitle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {forgotMode
                    ? "Enter your email to reset your password"
                    : "Login to access your Smart College dashboard"}
                </motion.p>

                {/* Decorative Elements */}
                <div className="decorative-dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </motion.div>

            {/* RIGHT PANEL */}
            <motion.div
              className="col-md-7 right-panel bg-white p-4 p-md-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <motion.div
                className="form-header text-center mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="icon-wrapper">
                  <div
                    className={`icon-circle ${forgotMode ? "icon-purple" : "icon-blue"}`}
                  >
                    {forgotMode ? <FaLock size={32} /> : <FaUser size={32} />}
                  </div>
                </div>
                <h4 className="fw-bold form-title">
                  {forgotMode ? "FORGOT PASSWORD" : "LOGIN TO YOUR ACCOUNT"}
                </h4>
                <p className="form-subtitle">
                  {forgotMode
                    ? "No worries! We'll send you reset instructions."
                    : "Enter your credentials to continue"}
                </p>
              </motion.div>

              {/* Error Message with Animation */}
              {error && (
                <div className="alert-message alert-error animate-shake">
                  <FaExclamationCircle className="alert-icon" />
                  <span>{error}</span>
                  <button
                    type="button"
                    className="alert-close"
                    onClick={() => setError("")}
                  >
                    <FaTimes />
                  </button>
                </div>
              )}

              {/* Success Message with Animation */}
              {successMsg && (
                <div className="alert-message alert-success animate-success">
                  <FaCheckCircle className="alert-icon" />
                  <span>{successMsg}</span>
                  <button
                    type="button"
                    className="alert-close"
                    onClick={() => setSuccessMsg("")}
                  >
                    <FaTimes />
                  </button>
                </div>
              )}

              <form onSubmit={submitHandler} className="login-form">
                {/* EMAIL */}
                <div
                  className={`form-group ${focusedField === "email" ? "focused" : ""} ${error ? "error" : ""}`}
                >
                  <label className="form-label">
                    <FaEnvelope className="label-icon" />
                    <span>Email Address</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      className={`form-input ${focusedField === "email" ? "active" : ""}`}
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField("")}
                      autoComplete="email"
                    />
                    <div className="input-border"></div>
                  </div>
                </div>

                {/* PASSWORD */}
                {!forgotMode && (
                  <div
                    className={`form-group ${focusedField === "password" ? "focused" : ""} ${error ? "error" : ""}`}
                  >
                    <label className="form-label">
                      <FaLock className="label-icon" />
                      <span>Password</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`form-input ${focusedField === "password" ? "active" : ""}`}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField("")}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <div className="input-border"></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="form-actions">
                  <div className="action-left">
                    {!forgotMode ? (
                      <Link to="/forgot-password" className="forgot-link">
                        <FaLock className="link-icon" />
                        <span>Forgot Password?</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="back-btn"
                        onClick={() => {
                          setForgotMode(false);
                          setError("");
                          setSuccessMsg("");
                        }}
                      >
                        <FaArrowLeft className="link-icon" />
                        <span>Back to Login</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className={`submit-btn ${loading ? "loading" : ""}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{forgotMode ? "SEND RESET LINK" : "LOGIN"}</span>
                        <span className="btn-arrow">
                          {forgotMode ? "→" : "→"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer Text */}
              <motion.div
                className="form-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <p className="footer-text">
                  <FaLock className="footer-icon" /> Protected by NOVAA Security · Staging v{new Date().getFullYear()}
                </p>
                <motion.p
                  className="footer-links"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <a href="/" className="footer-link">
                    <FaHome /> Back to Home
                  </a>
                </motion.p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        /* ================= CSS VARIABLES ================= */
        :root {
          /* Sidebar-matched colors */
          --sidebar-gradient: linear-gradient(180deg, #0f3a4a 0%, #0c2d3a 100%);
          --sidebar-solid: #0f3a4a;
          --sidebar-dark: #0c2d3a;
          --sidebar-accent: #3db5e6;
          --sidebar-accent-light: #4fc3f7;
          --sidebar-text: #e6f2f5;
          --sidebar-text-muted: rgba(255, 255, 255, 0.7);

          /* Enhanced Login page theme - Deep ocean gradient */
          --primary-gradient: linear-gradient(135deg, #0a1628 0%, #0f3a4a 50%, #0c2d3a 100%);
          --primary-gradient-scroll: linear-gradient(180deg, #0a1628 0%, #0f3a4a 50%, #0c2d3a 100%);
          --accent-gradient: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 100%);
          --primary-color: #3db5e6;
          --secondary-color: #0f3a4a;
          --accent-color: #3db5e6;

          --success-color: #10b981;
          --error-color: #ef4444;
          --warning-color: #f59e0b;

          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --text-muted: #9ca3af;

          --bg-primary: #ffffff;
          --bg-secondary: #f9fafb;
          --bg-tertiary: #f3f4f6;

          --border-light: #e5e7eb;
          --border-focus: #3db5e6;

          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          --shadow-accent: 0 10px 40px rgba(61, 181, 230, 0.3);
        }

        /* ================= PAGE CONTAINER ================= */
        .login-page-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: var(--primary-gradient);
          position: fixed;
          inset: 0;
          width: 100%;
          overflow: hidden;
        }

        /* Floating Particles */
        .floating-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
        }

        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(61, 181, 230, 0.6);
          border-radius: 50%;
          animation: particleFloat 4s infinite ease-in-out;
          opacity: 0;
        }

        @keyframes particleFloat {
          0%, 100% {
            opacity: 0;
            transform: translateY(0);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-20px);
          }
        }

        /* Hide scrollbar for all browsers */
        .login-page-container::-webkit-scrollbar {
          display: none;
        }

        .login-page-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Hide body/html scrollbar */
        body, html {
          overflow: hidden;
          margin: 0;
          padding: 0;
        }

        /* ================= ANIMATED BACKGROUND ================= */
        .login-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        /* Simplified bg shapes - reduced blur and effects */
        .bg-shape {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(61, 181, 230, 0.15) 0%, rgba(61, 181, 230, 0.05) 50%, transparent 100%);
          animation: float 25s infinite ease-in-out;
          filter: blur(40px);
        }

        .bg-shape.shape-1 {
          width: 500px;
          height: 500px;
          top: -150px;
          left: -150px;
          animation-delay: 0s;
        }

        .bg-shape.shape-2 {
          width: 400px;
          height: 400px;
          bottom: -100px;
          right: -100px;
          animation-delay: 5s;
        }

        .bg-shape.shape-3 {
          width: 350px;
          height: 350px;
          top: 40%;
          left: 30%;
          animation-delay: 10s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0.5;
          }
          50% {
            transform: translate(30px, -30px);
            opacity: 0.7;
          }
        }

        /* ================= LOGIN WRAPPER ================= */
        .login-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 950px;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ================= LOGIN CARD ================= */
        .login-card {
          background: var(--bg-primary);
          border-radius: 24px;
          box-shadow: var(--shadow-2xl);
          overflow: hidden;
          transition: all 0.3s ease-out;
          animation: cardEntrance 0.6s ease-out;
        }

        @keyframes cardEntrance {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }


        .login-card.login-mode {
          transform: rotateX(0deg);
        }

        .login-card.forgot-mode {
          transform: rotateX(0deg);
        }

        /* ================= LEFT PANEL ================= */
        .left-panel {
          background: var(--sidebar-gradient);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease-out;
        }

        .left-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.1) 0%, transparent 50%, rgba(61, 181, 230, 0.05) 100%);
          z-index: 1;
          pointer-events: none;
        }

        .left-panel.slide-in {
          animation: slideInLeft 0.5s ease-out;
        }

        .left-panel.slide-out {
          animation: slideOutLeft 0.4s ease;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOutLeft {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }

        .left-panel-content {
          position: relative;
          z-index: 2;
        }

        .brand-logo {
          margin-bottom: 2rem;
          text-align: center;
        }

        .brand-name {
          font-size: 2.2rem;
          font-weight: 900;
          margin-top: 1.25rem;
          letter-spacing: 5px;
          display: inline-block;
        }

        .brand-name .nov {
          background: linear-gradient(180deg, #ffffff 0%, #b0bec5 50%, #ffffff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 10px rgba(255, 255, 255, 0.3);
        }

        .brand-name .v-letter {
          background: linear-gradient(180deg, #4fc3f7 0%, #80d8ff 50%, #29b6f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(79, 195, 247, 0.6);
          position: relative;
        }

        .brand-name .v-letter::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 3px;
          background: #80d8ff;
          border-radius: 50%;
          box-shadow: 0 0 10px #80d8ff, 0 0 20px #4fc3f7;
        }

        .brand-name .aa {
          background: linear-gradient(180deg, #80d8ff 0%, #29b6f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 15px rgba(128, 216, 255, 0.5);
        }

        .brand-name .star-accent {
          color: #80d8ff;
          font-size: 1.2rem;
          margin-left: 0.5rem;
          text-shadow: 0 0 10px rgba(128, 216, 255, 0.6);
        }

        .logo-circle {
          width: 100px;
          height: 100px;
          margin: 0 auto;
          background: linear-gradient(135deg, #0f3a4a 0%, #0c2d3a 100%);
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(79, 195, 247, 0.5);
          box-shadow: 0 8px 30px rgba(79, 195, 247, 0.3);
          position: relative;
        }

        .logo-icon-wrapper {
          position: relative;
          z-index: 1;
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(79, 195, 247, 0.4);
        }

        .logo-icon {
          font-size: 2.5rem;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
        }

        .panel-title {
          font-size: 2.2rem;
          margin-bottom: 1rem;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          color: #ffffff;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .panel-subtitle {
          font-size: 1rem;
          opacity: 0.9;
          line-height: 1.7;
          color: var(--sidebar-text);
          font-weight: 300;
        }

        .decorative-dots {
          display: flex;
          gap: 0.75rem;
          margin-top: 2.5rem;
          justify-content: center;
        }

        .dot {
          width: 10px;
          height: 10px;
          background: var(--sidebar-accent);
          border-radius: 50%;
          opacity: 0.8;
        }

        /* ================= RIGHT PANEL ================= */
        .right-panel {
          position: relative;
        }

        .form-header {
          transition: all 0.3s ease-out;
        }

        .icon-wrapper {
          margin-bottom: 1rem;
        }

        .icon-circle {
          width: 85px;
          height: 85px;
          margin: 0 auto;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.3s ease-out;
          background: var(--accent-gradient);
          box-shadow: 0 10px 30px rgba(61, 181, 230, 0.3);
        }

        .icon-circle.icon-blue {
          background: var(--accent-gradient);
        }

        .icon-circle.icon-purple {
          background: var(--accent-gradient);
        }

        .form-title {
          font-size: 1.5rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .form-subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin: 0;
        }

        /* ================= ALERT MESSAGES ================= */
        .alert-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          animation: slideInDown 0.4s ease-out;
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-message.animate-shake {
          animation: shake 0.4s ease-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25%, 75% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
        }

        .alert-message.animate-success {
          animation: successFade 0.4s ease-out;
        }

        @keyframes successFade {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: var(--error-color);
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: var(--success-color);
        }

        .alert-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .alert-message.alert-error .alert-icon {
          color: var(--error-color);
        }

        .alert-message.alert-success .alert-icon {
          color: var(--success-color);
        }

        .alert-close {
          margin-left: auto;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .alert-close:hover {
          opacity: 1;
        }

        /* ================= FORM STYLES ================= */
        .login-form {
          margin-top: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          transition: all 0.3s ease;
        }

        .form-group.focused .form-label {
          color: var(--accent-color);
        }

        .form-group.error .form-label {
          color: var(--error-color);
        }

        .label-icon {
          font-size: 0.9rem;
        }

        .input-wrapper {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1.125rem;
          border: 2px solid var(--border-light);
          border-radius: 12px;
          font-size: 1rem;
          color: var(--text-primary);
          background: var(--bg-secondary);
          transition: all 0.2s ease;
        }

        .form-input:hover {
          border-color: var(--sidebar-accent);
          background: var(--bg-primary);
        }

        .form-input.active {
          border-color: var(--sidebar-accent);
          background: var(--bg-primary);
          box-shadow: 0 0 0 3px rgba(61, 181, 230, 0.1);
        }

        .form-group.error .form-input {
          border-color: var(--error-color);
          background: rgba(239, 68, 68, 0.02);
        }

        .form-input:focus {
          outline: none;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .password-toggle:hover {
          color: var(--sidebar-accent);
          background: rgba(61, 181, 230, 0.1);
        }

        /* ================= FORM ACTIONS ================= */
        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .action-left {
          flex: 1;
        }

        .forgot-link,
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.6rem 0.875rem;
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .forgot-link:hover,
        .back-btn:hover {
          background: rgba(61, 181, 230, 0.1);
          color: var(--sidebar-accent);
        }

        .link-icon {
          font-size: 0.85rem;
        }

        /* ================= SUBMIT BUTTON ================= */
        .submit-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2.25rem;
          background: var(--accent-gradient);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(61, 181, 230, 0.3);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(61, 181, 230, 0.4);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn.loading {
          position: relative;
        }

        .btn-arrow {
          transition: transform 0.2s ease;
        }

        .submit-btn:hover .btn-arrow {
          transform: translateX(4px);
        }

        /* Loading Spinner */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ================= FORM FOOTER ================= */
        .form-footer {
          margin-top: 2rem;
          text-align: center;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-light);
        }

        .footer-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .footer-icon {
          font-size: 0.75rem;
          color: var(--primary-color);
        }

        .footer-links {
          margin-top: 1rem;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .footer-link {
          color: var(--primary-color);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .footer-link:hover {
          color: var(--sidebar-accent);
        }

        .footer-divider {
          color: var(--text-muted);
          opacity: 0.5;
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .login-page-container {
            padding: 1rem;
            background: var(--primary-gradient);
          }

          .login-wrapper {
            animation: fadeInMobile 0.5s ease-out;
          }
          .left-panel,
          .right-panel,
          .login-background {
            transform: none !important;
            transition: none !important;
          }

          /* Hide home button on mobile - show in footer instead */
          .home-button-container {
            display: none;
          }

          /* Simplified background shapes for mobile */
          .bg-shape.shape-1,
          .bg-shape.shape-2 {
            width: 250px;
            height: 250px;
          }

          .bg-shape.shape-3,
          .bg-shape.shape-4,
          .bg-shape.shape-5,
          .bg-shape.shape-6,
          .bg-shape.shape-7 {
            display: none;
          }

          /* Hide floating elements on mobile */
          .floating-element,
          .sparkle {
            display: none;
          }

          /* Hide feature highlights on mobile for cleaner UI */
          .feature-highlights {
            display: none;
          }

          @keyframes fadeInMobile {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .login-card {
            border-radius: 24px;
            animation: none;
          }

          .right-panel {
            padding: 2.5rem 1.5rem !important;
          }

          .form-title {
            font-size: 1.35rem;
          }

          .icon-circle {
            width: 75px;
            height: 75px;
          }

          .form-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .action-left {
            text-align: center;
          }

          .forgot-link,
          .back-btn {
            justify-content: center;
          }

          .submit-btn {
            width: 100%;
            justify-content: center;
          }

          .bg-shape.shape-1 {
            width: 250px;
            height: 250px;
          }

          .bg-shape.shape-2 {
            width: 200px;
            height: 200px;
          }

          .brand-name {
            font-size: 1.5rem;
            letter-spacing: 2px;
          }

          .panel-title {
            font-size: 1.5rem;
          }

          .panel-subtitle {
            font-size: 0.9rem;
          }

          .form-input {
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .panel-title {
            font-size: 1.3rem;
          }

          .panel-subtitle {
            font-size: 0.85rem;
          }

          .form-input {
            font-size: 0.9rem;
          }

          .brand-name {
            font-size: 1.3rem;
          }

          .home-button {
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
          }
        }

        /* ================= UTILITY CLASSES ================= */
        .transition-all {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}
