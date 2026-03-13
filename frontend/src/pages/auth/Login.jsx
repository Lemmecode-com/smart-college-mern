import { useContext, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../auth/AuthContext";

// Icons
import { FaUser, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  /* SINGLE SOURCE OF TRUTH */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 15,
        y: (e.clientY / window.innerHeight - 0.5) * 15
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
        setError("⏳ Your account is awaiting admin approval. Please check your email for approval confirmation.");
      } else if (errorMsg.includes("rejected")) {
        setError("❌ Your account has been rejected. Please contact the admin for more information.");
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

    // backend aligned redirect
    navigate("/");
  };

  return (
    <div className="login-page-container">
      {/* Animated Background with Parallax */}
      <div
        className="login-background"
        style={{
          transform: `translate(${mousePosition.x * -0.5}px, ${mousePosition.y * -0.5}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
        <div className="bg-shape shape-3"></div>
        <div className="bg-shape shape-4"></div>
        <div className="bg-shape shape-5"></div>
        <div className="bg-shape shape-6"></div>
        <div className="bg-shape shape-7"></div>
      </div>

      <div className="login-wrapper">
        <div className={`login-card ${forgotMode ? 'forgot-mode' : 'login-mode'}`}>
          <div className="row g-0">
            {/* LEFT PANEL - Animated with Parallax */}
            <div
              className={`col-md-5 left-panel d-none d-md-flex flex-column justify-content-center text-white p-5 ${forgotMode ? 'slide-out' : 'slide-in'}`}
              style={{
                transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`,
                transition: 'transform 0.4s ease-out'
              }}
            >
              <div className="left-panel-content">
                <div className="brand-logo">
                  <div className="logo-circle">
                    <span className="logo-icon">{forgotMode ? "🔐" : "🎓"}</span>
                  </div>
                </div>
                <h2 className="fw-bold panel-title">
                  {forgotMode ? "Reset Password" : "Welcome Back"}
                </h2>
                <p className="panel-subtitle">
                  {forgotMode
                    ? "Enter your email to reset your password"
                    : "Login to access your Smart College dashboard"}
                </p>
                
                {/* Decorative Elements */}
                <div className="decorative-dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="floating-element float-1">✦</div>
              <div className="floating-element float-2">✦</div>
              <div className="floating-element float-3">✦</div>
              
              {/* Sparkle Particles */}
              <div className="sparkle" style={{ top: '25%', left: '20%', animationDelay: '0s' }}></div>
              <div className="sparkle" style={{ top: '70%', left: '30%', animationDelay: '0.5s' }}></div>
              <div className="sparkle" style={{ top: '40%', right: '25%', animationDelay: '1s' }}></div>
              <div className="sparkle" style={{ bottom: '30%', right: '15%', animationDelay: '1.5s' }}></div>
            </div>

            {/* RIGHT PANEL - Animated with Parallax */}
            <div
              className="col-md-7 right-panel bg-white p-4 p-md-5"
              style={{
                transform: `translate(${mousePosition.x * -0.2}px, ${mousePosition.y * -0.2}px)`,
                transition: 'transform 0.3s ease-out'
              }}
            >
              <div className={`form-header text-center mb-4 transition-all ${forgotMode ? 'slide-up' : 'slide-down'}`}>
                <div className="icon-wrapper">
                  <div className={`icon-circle ${forgotMode ? 'icon-purple' : 'icon-blue'}`}>
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
              </div>

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
                <div className={`form-group ${focusedField === 'email' ? 'focused' : ''} ${error ? 'error' : ''}`}>
                  <label className="form-label">
                    <FaEnvelope className="label-icon" />
                    <span>Email Address</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      className={`form-input ${focusedField === 'email' ? 'active' : ''}`}
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                      autoComplete="email"
                    />
                    <div className="input-border"></div>
                  </div>
                </div>

                {/* PASSWORD */}
                {!forgotMode && (
                  <div className={`form-group ${focusedField === 'password' ? 'focused' : ''} ${error ? 'error' : ''}`}>
                    <label className="form-label">
                      <FaLock className="label-icon" />
                      <span>Password</span>
                    </label>
                    <div className="input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`form-input ${focusedField === 'password' ? 'active' : ''}`}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField('')}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                      <Link
                        to="/forgot-password"
                        className="forgot-link"
                      >
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
                    className={`submit-btn ${loading ? 'loading' : ''}`}
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
                        <span className="btn-arrow">{forgotMode ? "→" : "→"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer Text */}
              <div className="form-footer">
                <p className="footer-text">
                  Protected by NOVAA Security
                </p>
              </div>
            </div>
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
          --primary-gradient: linear-gradient(135deg, #0a1628 0%, #0f3a4a 25%, #0c2d3a 50%, #1a4a5a 75%, #0d2137 100%);
          --primary-gradient-scroll: linear-gradient(180deg, #0a1628 0%, #0f3a4a 20%, #0c2d3a 40%, #1a4a5a 60%, #0d2137 80%, #0a1628 100%);
          --accent-gradient: linear-gradient(135deg, #3db5e6 0%, #4fc3f7 50%, #7dd3fc 100%);
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
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: var(--primary-gradient);
          background-size: 200% 200%;
          position: relative;
          overflow: hidden;
          animation: gradientShift 15s ease infinite;
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
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        /* ================= ANIMATED BACKGROUND ================= */
        .login-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        /* Enhanced bg shapes with glow effects */
        .bg-shape {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(61, 181, 230, 0.2) 0%, rgba(61, 181, 230, 0.08) 50%, transparent 100%);
          animation: float 20s infinite ease-in-out;
          filter: blur(50px);
          box-shadow: 0 0 60px rgba(61, 181, 230, 0.3), inset 0 0 40px rgba(61, 181, 230, 0.1);
        }

        .bg-shape.shape-1 {
          width: 600px;
          height: 600px;
          top: -200px;
          left: -200px;
          animation-delay: 0s;
          background: radial-gradient(circle, rgba(61, 181, 230, 0.25) 0%, rgba(79, 195, 247, 0.1) 50%, transparent 100%);
        }

        .bg-shape.shape-2 {
          width: 500px;
          height: 500px;
          bottom: -150px;
          right: -150px;
          animation-delay: 3s;
          background: radial-gradient(circle, rgba(79, 195, 247, 0.2) 0%, rgba(61, 181, 230, 0.08) 50%, transparent 100%);
        }

        .bg-shape.shape-3 {
          width: 400px;
          height: 400px;
          top: 50%;
          right: 10%;
          animation-delay: 6s;
          background: radial-gradient(circle, rgba(125, 211, 252, 0.18) 0%, rgba(61, 181, 230, 0.06) 50%, transparent 100%);
        }

        .bg-shape.shape-4 {
          width: 450px;
          height: 450px;
          bottom: 20%;
          left: 10%;
          animation-delay: 9s;
          background: radial-gradient(circle, rgba(61, 181, 230, 0.22) 0%, rgba(79, 195, 247, 0.09) 50%, transparent 100%);
        }

        .bg-shape.shape-5 {
          width: 350px;
          height: 350px;
          top: 30%;
          left: 50%;
          animation-delay: 12s;
          background: radial-gradient(circle, rgba(79, 195, 247, 0.2) 0%, rgba(125, 211, 252, 0.07) 50%, transparent 100%);
        }

        /* Additional shapes for depth */
        .bg-shape.shape-6 {
          width: 280px;
          height: 280px;
          top: 10%;
          right: 30%;
          animation-delay: 15s;
          background: radial-gradient(circle, rgba(61, 181, 230, 0.15) 0%, rgba(61, 181, 230, 0.04) 50%, transparent 100%);
          filter: blur(60px);
        }

        .bg-shape.shape-7 {
          width: 320px;
          height: 320px;
          bottom: 35%;
          left: 25%;
          animation-delay: 18s;
          background: radial-gradient(circle, rgba(79, 195, 247, 0.18) 0%, rgba(61, 181, 230, 0.05) 50%, transparent 100%);
          filter: blur(55px);
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            opacity: 0.6;
          }
          25% {
            transform: translate(40px, -50px) scale(1.15) rotate(90deg);
            opacity: 0.8;
          }
          50% {
            transform: translate(-40px, 40px) scale(0.9) rotate(180deg);
            opacity: 0.7;
          }
          75% {
            transform: translate(50px, 30px) scale(1.08) rotate(270deg);
            opacity: 0.65;
          }
        }

        /* ================= LOGIN WRAPPER ================= */
        .login-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 950px;
          animation: slideUp 1s cubic-bezier(0.19, 1, 0.22, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ================= LOGIN CARD ================= */
        .login-card {
          background: var(--bg-primary);
          border-radius: 28px;
          box-shadow: var(--shadow-2xl), var(--shadow-accent);
          overflow: hidden;
          transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
          animation: cardEntrance 1.2s cubic-bezier(0.19, 1, 0.22, 1);
        }

        @keyframes cardEntrance {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-card:hover {
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3), 0 15px 50px rgba(61, 181, 230, 0.4);
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
          transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
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
          animation: slideInLeft 0.8s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .left-panel.slide-out {
          animation: slideOutLeft 0.6s ease;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes slideOutLeft {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-30px);
          }
        }

        .left-panel-content {
          position: relative;
          z-index: 2;
        }

        .brand-logo {
          margin-bottom: 2rem;
        }

        .logo-circle {
          width: 90px;
          height: 90px;
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.2) 0%, rgba(79, 195, 247, 0.15) 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          animation: pulse 3s infinite ease-in-out;
          border: 1px solid rgba(61, 181, 230, 0.3);
          box-shadow: 0 8px 32px rgba(61, 181, 230, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .logo-icon {
          font-size: 2.8rem;
          filter: drop-shadow(0 2px 8px rgba(61, 181, 230, 0.4));
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(61, 181, 230, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 12px 48px rgba(61, 181, 230, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
          }
        }

        .panel-title {
          font-size: 2.2rem;
          margin-bottom: 1rem;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          background: linear-gradient(135deg, #ffffff 0%, #e6f2f5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
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
        }

        .dot {
          width: 10px;
          height: 10px;
          background: linear-gradient(135deg, var(--sidebar-accent) 0%, var(--sidebar-accent-light) 100%);
          border-radius: 50%;
          animation: dotPulse 2s infinite ease-in-out;
          box-shadow: 0 2px 8px rgba(61, 181, 230, 0.5);
        }

        .dot:nth-child(1) { animation-delay: 0s; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        /* Floating Elements */
        .floating-element {
          position: absolute;
          color: rgba(61, 181, 230, 0.25);
          font-size: 1.8rem;
          animation: floatElement 6s infinite ease-in-out;
          text-shadow: 0 0 10px rgba(61, 181, 230, 0.5);
          will-change: transform;
        }

        .floating-element.float-1 {
          top: 15%;
          left: 10%;
          animation-delay: 0s;
        }

        .floating-element.float-2 {
          top: 60%;
          right: 15%;
          animation-delay: 2s;
        }

        .floating-element.float-3 {
          bottom: 20%;
          left: 25%;
          animation-delay: 4s;
        }

        @keyframes floatElement {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.25;
          }
          50% {
            transform: translateY(-25px) rotate(180deg);
            opacity: 0.6;
          }
        }

        /* Particle sparkles animation */
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: rotate(180deg);
          }
        }

        .sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(61, 181, 230, 0.5) 50%, transparent 100%);
          border-radius: 50%;
          animation: sparkle 2s infinite ease-in-out;
          box-shadow: 0 0 10px rgba(61, 181, 230, 0.8), 0 0 20px rgba(61, 181, 230, 0.4);
        }

        /* ================= RIGHT PANEL ================= */
        .right-panel {
          position: relative;
        }

        .form-header {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .form-header.slide-up {
          animation: slideUpFade 0.5s ease;
        }

        .form-header.slide-down {
          animation: slideDownFade 0.5s ease;
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDownFade {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          background: var(--accent-gradient);
          box-shadow: 0 12px 40px rgba(61, 181, 230, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .icon-circle:hover {
          transform: scale(1.08) rotate(5deg);
          box-shadow: 0 16px 50px rgba(61, 181, 230, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
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
          border-radius: 14px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          animation: slideInDown 0.5s cubic-bezier(0.19, 1, 0.22, 1);
          backdrop-filter: blur(10px);
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .alert-message.animate-shake {
          animation: shake 0.5s cubic-bezier(0.19, 1, 0.22, 1);
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }

        .alert-message.animate-success {
          animation: successBounce 0.6s cubic-bezier(0.19, 1, 0.22, 1);
        }

        @keyframes successBounce {
          0% { transform: scale(0.85); opacity: 0; }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); opacity: 1; }
        }

        .alert-error {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: var(--error-color);
        }

        .alert-success {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%);
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
          border-radius: 14px;
          font-size: 1rem;
          color: var(--text-primary);
          background: var(--bg-secondary);
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .form-input:hover {
          border-color: var(--sidebar-accent);
          background: var(--bg-primary);
          box-shadow: 0 2px 12px rgba(61, 181, 230, 0.1);
        }

        .form-input.active {
          border-color: var(--sidebar-accent);
          background: var(--bg-primary);
          box-shadow: 0 0 0 5px rgba(61, 181, 230, 0.12), 0 4px 20px rgba(61, 181, 230, 0.15);
          transform: translateY(-1px);
        }

        .form-group.error .form-input {
          border-color: var(--error-color);
          background: rgba(239, 68, 68, 0.02);
        }

        .form-input:focus {
          outline: none;
        }

        .input-border {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 3px;
          background: var(--accent-gradient);
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          transform: translateX(-50%);
          border-radius: 3px;
          box-shadow: 0 0 10px rgba(61, 181, 230, 0.5);
        }

        .form-input.active ~ .input-border {
          width: 95%;
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
          transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .password-toggle:hover {
          color: var(--sidebar-accent);
          background: rgba(61, 181, 230, 0.1);
          transform: translateY(-50%) scale(1.1);
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
          transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .forgot-link:hover,
        .back-btn:hover {
          background: linear-gradient(135deg, rgba(61, 181, 230, 0.1) 0%, rgba(79, 195, 247, 0.08) 100%);
          color: var(--sidebar-accent);
          transform: translateX(3px);
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
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          box-shadow: 0 6px 20px rgba(61, 181, 230, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 35px rgba(61, 181, 230, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(-1px) scale(0.98);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn.loading {
          position: relative;
        }

        .btn-arrow {
          transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .submit-btn:hover .btn-arrow {
          transform: translateX(6px) scale(1.2);
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
        }

        .footer-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 768px) {
          .login-page-container {
            padding: 1rem;
            background: var(--primary-gradient);
            background-size: 150% 150%;
            animation: gradientShift 20s ease infinite;
          }

          .login-wrapper {
            animation: fadeInMobile 0.7s cubic-bezier(0.19, 1, 0.22, 1);
          }

          /* Disable parallax on mobile for performance */
          .left-panel,
          .right-panel,
          .login-background {
            transform: none !important;
            transition: none !important;
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

          @keyframes fadeInMobile {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
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
        }

        @media (max-width: 480px) {
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

        /* ================= UTILITY CLASSES ================= */
        .transition-all {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}
